/**
 * Orquestrador da sincronização SQL Server → Supabase.
 *
 * Executa, na mesma ordem que o frontend fazia, as etapas selecionadas e
 * registra tudo em `sync_execucoes`. É a única porta de entrada para
 * execuções manuais (tela "Sincronização SQL Server") e agendadas.
 *
 * Só uma execução por vez (o sync-api roda em instância única): uma nova
 * chamada manual durante uma execução volta como "ocupado"; uma agendada é
 * registrada como "ignorada".
 */

import type sql from 'mssql';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TabelasSync {
  pesquisas?: boolean;
  especialistas?: boolean;
  apontamentos?: boolean;
  tickets?: boolean;
  codigoResolucao?: boolean;
  /** padrão: true */
  detectarInconsistencias?: boolean;
  /** padrão: true (só roda quando apontamentos é sincronizado) */
  ajustesRetroativos?: boolean;
  /** YYYY-MM-DD; só para pesquisas. Vazio = incremental */
  dataInicial?: string | null;
}

export interface EtapasSync {
  pesquisas(pool: sql.ConnectionPool, dataInicial?: string | null): Promise<any>;
  especialistas(pool: sql.ConnectionPool): Promise<any>;
  apontamentos(pool: sql.ConnectionPool): Promise<any>;
  tickets(pool: sql.ConnectionPool): Promise<any>;
  codigoResolucao(pool: sql.ConnectionPool): Promise<any>;
  validacao(pool: sql.ConnectionPool): Promise<any>;
  inconsistencias(): Promise<any>;
  ajustesRetroativos(): Promise<any[]>;
}

export interface DependenciasOrquestrador {
  supabase: SupabaseClient;
  abrirPool(): Promise<{ pool: sql.ConnectionPool; fechar(): Promise<void> }>;
  etapas: EtapasSync;
  /** Intervalo de gravação parcial dos logs; 0 desliga (só grava no fim) */
  intervaloGravacaoLogsMs?: number;
}

export interface ParametrosExecucao {
  tabelas: TabelasSync;
  origem: 'manual' | 'agendado';
  agendamentoId?: string | null;
  usuarioId?: string | null;
}

export type InicioExecucao =
  | { status: 'iniciada'; execucaoId: string; conclusao: Promise<StatusExecucao> }
  | { status: 'ocupado' }
  | { status: 'ignorada'; execucaoId: string | null };

export type StatusExecucao = 'sucesso' | 'parcial' | 'erro';

interface EntradaLog {
  em: string;
  nivel: 'info' | 'erro';
  mensagem: string;
}

const ETAPAS_TABELA = ['pesquisas', 'especialistas', 'apontamentos', 'tickets', 'codigoResolucao'] as const;
type EtapaTabela = (typeof ETAPAS_TABELA)[number];

const ROTULOS: Record<string, string> = {
  pesquisas: 'Pesquisas (AMSpesquisa)',
  especialistas: 'Especialistas (AMSespecialistas)',
  apontamentos: 'Apontamentos (AMSapontamento)',
  tickets: 'Tickets (AMSticketsabertos)',
  codigoResolucao: 'Código de resolução (AMScodigoresolucao_Modificacao)',
  validacao: 'Validação SQL Server x Supabase',
  inconsistencias: 'Detecção de inconsistências',
  ajustesRetroativos: 'Ajustes retroativos do banco de horas',
};

// Tabelas com linha em sync_metadata (usada em "última sincronização")
const TABELAS_METADATA: EtapaTabela[] = ['pesquisas', 'especialistas', 'apontamentos', 'tickets'];

const MAX_MENSAGENS_POR_ETAPA = 50;

const mensagemDeErro = (e: unknown) => (e instanceof Error ? e.message : String(e ?? 'Erro desconhecido'));

function resumirEtapaTabela(r: any) {
  return {
    sucesso: !!r?.sucesso,
    processados: r?.total_processados ?? 0,
    novos: r?.inseridos ?? r?.novos ?? r?.sincronizados ?? 0,
    atualizados: r?.atualizados ?? 0,
    erros: r?.erros ?? 0,
    mensagens: (r?.mensagens || []).slice(0, MAX_MENSAGENS_POR_ETAPA),
  };
}

export function criarOrquestradorSync(deps: DependenciasOrquestrador) {
  const { supabase, etapas } = deps;
  const intervaloLogs = deps.intervaloGravacaoLogsMs ?? 3000;
  let ocupado = false;

  async function registrarIgnorada(params: ParametrosExecucao): Promise<string | null> {
    const agora = new Date().toISOString();
    const { data } = await (supabase as any)
      .from('sync_execucoes')
      .insert({
        agendamento_id: params.agendamentoId || null,
        origem: params.origem,
        disparado_por: params.usuarioId || null,
        tabelas: params.tabelas,
        status: 'ignorada',
        iniciado_em: agora,
        finalizado_em: agora,
        resultado: { motivo: 'Outra sincronização já estava em andamento' },
      })
      .select('id')
      .single();
    return data?.id ?? null;
  }

  async function iniciar(params: ParametrosExecucao): Promise<InicioExecucao> {
    if (ocupado) {
      if (params.origem === 'manual') return { status: 'ocupado' };
      return { status: 'ignorada', execucaoId: await registrarIgnorada(params) };
    }

    // Trava antes de qualquer await para não abrir janela de corrida
    ocupado = true;

    try {
      const { data, error } = await (supabase as any)
        .from('sync_execucoes')
        .insert({
          agendamento_id: params.agendamentoId || null,
          origem: params.origem,
          disparado_por: params.usuarioId || null,
          tabelas: params.tabelas,
          status: 'executando',
        })
        .select('id')
        .single();

      if (error || !data?.id) throw new Error(error?.message || 'Falha ao registrar execução');

      const execucaoId: string = data.id;
      const conclusao = executar(execucaoId, params.tabelas).finally(() => {
        ocupado = false;
      });
      return { status: 'iniciada', execucaoId, conclusao };
    } catch (e) {
      ocupado = false;
      throw e;
    }
  }

  async function executar(execucaoId: string, tabelas: TabelasSync): Promise<StatusExecucao> {
    const logs: EntradaLog[] = [];
    const resultado: Record<string, any> = {};

    const log = (mensagem: string, nivel: EntradaLog['nivel'] = 'info') => {
      logs.push({ em: new Date().toISOString(), nivel, mensagem });
      (nivel === 'erro' ? console.error : console.log)(`[SYNC-JOB] ${mensagem}`);
    };

    const gravarLogs = async () => {
      try {
        await (supabase as any).from('sync_execucoes').update({ logs }).eq('id', execucaoId);
      } catch {
        /* gravação parcial de log não pode derrubar a execução */
      }
    };

    const timerLogs = intervaloLogs > 0 ? setInterval(gravarLogs, intervaloLogs) : null;

    let conexao: Awaited<ReturnType<DependenciasOrquestrador['abrirPool']>> | null = null;
    let status: StatusExecucao = 'erro';

    try {
      log('Iniciando sincronização');
      conexao = await deps.abrirPool();
      log('Conectado ao SQL Server');
      const pool = conexao.pool;

      const rodar = async (chave: string, fn: () => Promise<any>, resumir: (r: any) => any) => {
        log(`${ROTULOS[chave]}: iniciando`);
        const inicio = Date.now();
        try {
          const r = resumir(await fn());
          resultado[chave] = { ...r, duracao_ms: Date.now() - inicio };
          log(`${ROTULOS[chave]}: ${r.sucesso ? 'concluído' : 'concluído com erros'}`, r.sucesso ? 'info' : 'erro');
        } catch (e) {
          resultado[chave] = { sucesso: false, erro: mensagemDeErro(e), duracao_ms: Date.now() - inicio };
          log(`${ROTULOS[chave]}: falhou — ${mensagemDeErro(e)}`, 'erro');
        }
      };

      for (const chave of ETAPAS_TABELA) {
        if (!tabelas[chave]) continue;
        const fn =
          chave === 'pesquisas'
            ? () => etapas.pesquisas(pool, tabelas.dataInicial || undefined)
            : () => etapas[chave](pool);
        await rodar(chave, fn, resumirEtapaTabela);
        await atualizarMetadata(chave, resultado[chave]);
      }

      await rodar('validacao', () => etapas.validacao(pool), (r) => ({
        sucesso: true,
        resumo: r?.resumo ?? null,
        tabelas: r?.tabelas ?? null,
      }));

      if (tabelas.detectarInconsistencias !== false) {
        await rodar('inconsistencias', () => etapas.inconsistencias(), (r) => ({
          sucesso: !!r?.sucesso,
          total_detectadas: r?.total_detectadas ?? 0,
          novas: r?.novas ?? 0,
          resolvidas: r?.resolvidas ?? 0,
          mantidas: r?.mantidas ?? 0,
        }));
      }

      if (tabelas.apontamentos && tabelas.ajustesRetroativos !== false) {
        await rodar('ajustesRetroativos', () => etapas.ajustesRetroativos(), (r) => ({
          sucesso: true,
          total: Array.isArray(r) ? r.length : 0,
        }));
      }

      status = calcularStatus(tabelas, resultado);
      log(`Sincronização finalizada: ${status}`, status === 'erro' ? 'erro' : 'info');
    } catch (e) {
      status = 'erro';
      resultado.erro = mensagemDeErro(e);
      log(`Sincronização interrompida: ${mensagemDeErro(e)}`, 'erro');
    } finally {
      if (timerLogs) clearInterval(timerLogs);
      if (conexao) {
        try {
          await conexao.fechar();
        } catch {
          /* ignore */
        }
      }
      await (supabase as any)
        .from('sync_execucoes')
        .update({ status, resultado, logs, finalizado_em: new Date().toISOString() })
        .eq('id', execucaoId);
    }

    return status;
  }

  async function atualizarMetadata(tabela: EtapaTabela, r: any) {
    if (!TABELAS_METADATA.includes(tabela) || !r) return;
    try {
      const agora = new Date().toISOString();
      await (supabase as any).from('sync_metadata').upsert(
        {
          tabela,
          ultima_execucao: agora,
          resultado: r.sucesso ? 'sucesso' : 'erro',
          registros_processados: r.processados || 0,
          registros_novos: r.novos || 0,
          registros_atualizados: r.atualizados || 0,
          registros_erros: r.erros || 0,
          updated_at: agora,
        },
        { onConflict: 'tabela' }
      );
    } catch (e) {
      console.error(`[SYNC-JOB] Erro ao atualizar sync_metadata (${tabela}):`, mensagemDeErro(e));
    }
  }

  return {
    iniciar,
    emExecucao: () => ocupado,
  };
}

/** sucesso = tudo ok; erro = todas as tabelas selecionadas falharam; parcial = o resto */
function calcularStatus(tabelas: TabelasSync, resultado: Record<string, any>): StatusExecucao {
  const executadas = Object.values(resultado).filter((r) => r && typeof r === 'object' && 'sucesso' in r);
  if (executadas.every((r) => r.sucesso)) return 'sucesso';

  const selecionadas = ETAPAS_TABELA.filter((t) => tabelas[t]);
  const base = selecionadas.length > 0 ? selecionadas.map((t) => resultado[t]) : executadas;
  if (base.every((r) => !r?.sucesso)) return 'erro';

  return 'parcial';
}
