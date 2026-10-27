/**
 * Orquestrador da sincronização SQL Server → Supabase.
 *
 * Executa, na mesma ordem que o frontend fazia, as etapas selecionadas e
 * registra tudo em `sync_execucoes`. É a única porta de entrada para
 * execuções manuais (tela "Sincronização SQL Server") e agendadas.
 *
 * Também executa a geração automática de books (tipo "books"), que divide a
 * mesma trava: sincronização e geração de books nunca rodam juntas.
 *
 * Só uma execução por vez (o sync-api roda em instância única): uma nova
 * chamada manual durante uma execução volta como "ocupado"; uma agendada é
 * registrada como "ignorada" (o agendador já espera a execução terminar antes
 * de disparar, então isso só acontece numa corrida).
 */

import type sql from 'mssql';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface TabelasSync {
  pesquisas?: boolean;
  especialistas?: boolean;
  apontamentos?: boolean;
  tickets?: boolean;
  codigoResolucao?: boolean;
  /** padrão: true. Ignorado (sempre roda) quando apontamentos, tickets ou codigoResolucao é sincronizado */
  detectarInconsistencias?: boolean;
  /** padrão: true (só roda quando apontamentos é sincronizado) */
  ajustesRetroativos?: boolean;
  /** YYYY-MM-DD; para pesquisas e tickets. Vazio = incremental */
  dataInicial?: string | null;
}

export interface EtapasSync {
  pesquisas(pool: sql.ConnectionPool, dataInicial?: string | null): Promise<any>;
  especialistas(pool: sql.ConnectionPool): Promise<any>;
  apontamentos(pool: sql.ConnectionPool): Promise<any>;
  tickets(pool: sql.ConnectionPool, dataInicial?: string | null): Promise<any>;
  codigoResolucao(pool: sql.ConnectionPool): Promise<any>;
  validacao(pool: sql.ConnectionPool): Promise<any>;
  inconsistencias(): Promise<any>;
  ajustesRetroativos(): Promise<any[]>;
}

/** sincronizacao = sync SQL Server; books = geração e envio automático de books para a Qualidade */
export type TipoExecucao = 'sincronizacao' | 'books';

/** Resultado da geração automática de books (devolvido pelo pacote vendor/geracaoBooks.cjs) */
export interface ResumoGeracaoBooks {
  mes: number;
  ano: number;
  /** empresas processadas (liberadas e ainda não enviadas) */
  total: number;
  gerados: number;
  erros: number;
  /** já enviadas, ainda não liberadas no dia ou fora da seleção */
  pulados: number;
  /** quantidade de empresas escolhidas; null = todas */
  selecionadas?: number | null;
  empresas: { empresa: string; sucesso: boolean; erro?: string }[];
}

export interface ContextoGeracaoBooks {
  /** Gravado como "enviado por" no book (usuário do clique ou criador do agendamento) */
  responsavelId: string | null;
  /** Empresas escolhidas no agendamento ou no "Gerar books agora"; vazio = todas */
  empresaIds: string[];
  log(mensagem: string, nivel?: 'info' | 'erro'): void;
}

export interface DependenciasOrquestrador {
  supabase: SupabaseClient;
  abrirPool(): Promise<{ pool: sql.ConnectionPool; fechar(): Promise<void> }>;
  etapas: EtapasSync;
  /** Geração automática de books; ausente quando o servidor não tem o pacote configurado */
  gerarBooks?: (contexto: ContextoGeracaoBooks) => Promise<ResumoGeracaoBooks>;
  /** Confere se o banco réplica foi atualizado (abre/resolve a notificação no sino); só na sincronização */
  verificarReplica?: (pool: sql.ConnectionPool) => Promise<{ atrasada: boolean; mensagem: string | null; tabelas: any[] }>;
  /** Intervalo de gravação parcial dos logs; 0 desliga (só grava no fim) */
  intervaloGravacaoLogsMs?: number;
}

export interface ParametrosExecucao {
  /** padrão: sincronizacao */
  tipo?: TipoExecucao;
  tabelas: TabelasSync;
  origem: 'manual' | 'agendado';
  agendamentoId?: string | null;
  usuarioId?: string | null;
  /** Só para books: quem fica como "enviado por" quando não há usuário (agendado) */
  responsavelId?: string | null;
  /** Só para books: restringe a estas empresas (vazio = todas) */
  empresaIds?: string[];
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

/** Tabelas de onde detectar_inconsistencias() lê os dados gravados em inconsistencias_chamados */
const ETAPAS_ORIGEM_INCONSISTENCIAS: EtapaTabela[] = ['apontamentos', 'tickets', 'codigoResolucao'];

const ROTULOS: Record<string, string> = {
  pesquisas: 'Pesquisas (AMSpesquisa)',
  especialistas: 'Especialistas (AMSespecialistas)',
  apontamentos: 'Apontamentos (AMSapontamento)',
  tickets: 'Tickets (AMSticketsabertos)',
  codigoResolucao: 'Código de resolução (AMScodigoresolucao_Modificacao)',
  validacao: 'Validação SQL Server x Supabase',
  inconsistencias: 'Detecção de inconsistências',
  ajustesRetroativos: 'Ajustes retroativos do banco de horas',
  gerarBooks: 'Geração de books',
};

// Tabelas com linha em sync_metadata (usada em "última sincronização")
const TABELAS_METADATA: EtapaTabela[] = ['pesquisas', 'especialistas', 'apontamentos', 'tickets'];

const MAX_MENSAGENS_POR_ETAPA = 50;

const mensagemDeErro = (e: unknown) => (e instanceof Error ? e.message : String(e ?? 'Erro desconhecido'));

/** Mensagem que explica por que a etapa terminou com erro (a última que fala em erro, ou a última) */
function motivoDaFalha(bruto: any): string | null {
  const mensagens: string[] = Array.isArray(bruto?.mensagens) ? bruto.mensagens.filter(Boolean) : [];
  if (mensagens.length === 0) return null;
  const comErro = mensagens.filter((m) => /erro|falh|timeout/i.test(m));
  return (comErro.length ? comErro[comErro.length - 1] : mensagens[mensagens.length - 1]).slice(0, 500);
}

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
        tipo: params.tipo ?? 'sincronizacao',
        agendamento_id: params.agendamentoId || null,
        origem: params.origem,
        disparado_por: params.usuarioId || null,
        tabelas: params.tabelas,
        status: 'ignorada',
        iniciado_em: agora,
        finalizado_em: agora,
        resultado: { motivo: 'Outra execução já estava em andamento' },
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
      const tipo = params.tipo ?? 'sincronizacao';
      const { data, error } = await (supabase as any)
        .from('sync_execucoes')
        .insert({
          tipo,
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
      const execucao =
        tipo === 'books'
          ? executarBooks(execucaoId, params.usuarioId ?? params.responsavelId ?? null, params.empresaIds ?? [])
          : executar(execucaoId, params.tabelas);
      const conclusao = execucao.finally(() => {
        ocupado = false;
      });
      return { status: 'iniciada', execucaoId, conclusao };
    } catch (e) {
      ocupado = false;
      throw e;
    }
  }

  /** Logs da execução, gravados periodicamente em sync_execucoes enquanto ela roda */
  function criarRegistroLogs(execucaoId: string) {
    const logs: EntradaLog[] = [];

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

    return { logs, log, gravarLogs };
  }

  async function finalizar(execucaoId: string, status: StatusExecucao, resultado: Record<string, any>, logs: EntradaLog[]) {
    await (supabase as any)
      .from('sync_execucoes')
      .update({ status, resultado, logs, finalizado_em: new Date().toISOString() })
      .eq('id', execucaoId);
  }

  async function executarBooks(execucaoId: string, responsavelId: string | null, empresaIds: string[]): Promise<StatusExecucao> {
    const { logs, log, gravarLogs } = criarRegistroLogs(execucaoId);
    const resultado: Record<string, any> = {};
    const timerLogs = intervaloLogs > 0 ? setInterval(gravarLogs, intervaloLogs) : null;
    const inicio = Date.now();
    let status: StatusExecucao = 'erro';

    try {
      log(`${ROTULOS.gerarBooks}: iniciando`);
      if (!deps.gerarBooks) throw new Error('Geração automática de books não configurada neste servidor');

      const r = await deps.gerarBooks({ responsavelId, empresaIds, log });
      status = r.erros === 0 ? 'sucesso' : r.gerados === 0 ? 'erro' : 'parcial';
      resultado.gerarBooks = { ...r, sucesso: r.erros === 0, duracao_ms: Date.now() - inicio };
      log(
        `${ROTULOS.gerarBooks}: ${r.gerados} gerado(s) e enviado(s), ${r.erros} com erro, ${r.pulados} pulado(s)`,
        r.erros === 0 ? 'info' : 'erro'
      );
    } catch (e) {
      status = 'erro';
      resultado.gerarBooks = { sucesso: false, erro: mensagemDeErro(e), duracao_ms: Date.now() - inicio };
      log(`${ROTULOS.gerarBooks}: falhou — ${mensagemDeErro(e)}`, 'erro');
    } finally {
      if (timerLogs) clearInterval(timerLogs);
      await finalizar(execucaoId, status, resultado, logs);
    }

    return status;
  }

  async function executar(execucaoId: string, tabelas: TabelasSync): Promise<StatusExecucao> {
    const { logs, log, gravarLogs } = criarRegistroLogs(execucaoId);
    const resultado: Record<string, any> = {};

    const timerLogs = intervaloLogs > 0 ? setInterval(gravarLogs, intervaloLogs) : null;

    let conexao: Awaited<ReturnType<DependenciasOrquestrador['abrirPool']>> | null = null;
    let status: StatusExecucao = 'erro';

    try {
      log('Iniciando sincronização');
      conexao = await deps.abrirPool();
      log('Conectado ao SQL Server');
      const pool = conexao.pool;

      if (deps.verificarReplica) await verificarReplica(pool, log, resultado);

      const rodar = async (chave: string, fn: () => Promise<any>, resumir: (r: any) => any) => {
        log(`${ROTULOS[chave]}: iniciando`);
        const inicio = Date.now();
        try {
          const bruto = await fn();
          const r = resumir(bruto);
          if (!r.sucesso && !r.erro) {
            const motivo = motivoDaFalha(bruto);
            if (motivo) r.erro = motivo;
          }
          resultado[chave] = { ...r, duracao_ms: Date.now() - inicio };
          log(
            r.sucesso
              ? `${ROTULOS[chave]}: concluído`
              : `${ROTULOS[chave]}: concluído com erros${r.erro ? ` — ${r.erro}` : ''}`,
            r.sucesso ? 'info' : 'erro'
          );
        } catch (e) {
          resultado[chave] = { sucesso: false, erro: mensagemDeErro(e), duracao_ms: Date.now() - inicio };
          log(`${ROTULOS[chave]}: falhou — ${mensagemDeErro(e)}`, 'erro');
        }
      };

      for (const chave of ETAPAS_TABELA) {
        if (!tabelas[chave]) continue;
        const fn =
          chave === 'pesquisas' || chave === 'tickets'
            ? () => etapas[chave](pool, tabelas.dataInicial || undefined)
            : () => etapas[chave](pool);
        await rodar(chave, fn, resumirEtapaTabela);
        await atualizarMetadata(chave, resultado[chave]);
      }

      await rodar('validacao', () => etapas.validacao(pool), (r) => ({
        sucesso: true,
        resumo: r?.resumo ?? null,
        tabelas: r?.tabelas ?? null,
      }));

      // As inconsistências guardam dados dessas tabelas: se uma delas foi sincronizada,
      // a detecção roda mesmo desmarcada, para a auditoria não ficar desatualizada.
      const sincronizouOrigemInconsistencias = ETAPAS_ORIGEM_INCONSISTENCIAS.some((t) => tabelas[t]);
      if (tabelas.detectarInconsistencias !== false || sincronizouOrigemInconsistencias) {
        await rodar('inconsistencias', () => etapas.inconsistencias(), (r) => ({
          sucesso: !!r?.sucesso,
          total_detectadas: r?.total_detectadas ?? 0,
          novas: r?.novas ?? 0,
          resolvidas: r?.resolvidas ?? 0,
          mantidas: r?.mantidas ?? 0,
          atualizadas: r?.atualizadas ?? 0,
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
      await finalizar(execucaoId, status, resultado, logs);
    }

    return status;
  }

  /** Só avisa: nem atraso nem falha da verificação mudam o status da sincronização (por isso sem `sucesso`) */
  async function verificarReplica(
    pool: sql.ConnectionPool,
    log: (mensagem: string, nivel?: EntradaLog['nivel']) => void,
    resultado: Record<string, any>
  ) {
    try {
      const r = await deps.verificarReplica!(pool);
      resultado.verificacaoReplica = { atrasada: r.atrasada, tabelas: r.tabelas };
      if (r.atrasada) log(`Banco réplica desatualizado: ${r.mensagem}`, 'erro');
      else log('Banco réplica em dia');
    } catch (e) {
      resultado.verificacaoReplica = { erro: mensagemDeErro(e) };
      log(`Verificação do banco réplica falhou — ${mensagemDeErro(e)}`, 'erro');
    }
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
