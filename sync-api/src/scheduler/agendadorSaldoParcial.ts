/**
 * Agendador do envio automático do Saldo Parcial (tela "Envio Automático de Saldo Parcial").
 *
 * A cada ciclo (60s) lê `banco_horas_envio_agendamentos` ativos, calcula
 * `proxima_execucao` quando está vazia (agendamento novo ou regra alterada — o trigger
 * do banco zera o campo) e executa os vencidos: para cada cliente vinculado, envia o
 * Saldo Parcial aos contatos com finalidade "saldo_parcial" ou "ambos" + CC do agendamento.
 *
 * - Sem duplicidade: antes de enviar, reserva a execução em `banco_horas_envio_execucoes`
 *   (chave única empresa + instante agendado). Se já existe, o cliente é pulado.
 * - Execução perdida (serviço desligado): roda uma vez ao voltar; a próxima é calculada
 *   a partir de agora (não acumula atrasos).
 * - Erro em um cliente não interrompe os demais.
 * - Grava só a quantidade de destinatários, nunca os e-mails (LGPD).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularProximaExecucao, validarRegra, RegraRecorrencia } from './recorrencia';

export const INTERVALO_CICLO_SALDO_PARCIAL_MS = 60_000;
/** Pausa entre clientes para respeitar o limite de execuções simultâneas do Power Automate */
export const INTERVALO_ENTRE_ENVIOS_MS = 10_000;

const FINALIDADES_SALDO_PARCIAL = ['saldo_parcial', 'ambos'];
const CODIGO_VIOLACAO_UNICA = '23505';

export interface DependenciasAgendadorSaldoParcial {
  supabase: SupabaseClient;
  /** Envia o Saldo Parcial da empresa (pacote vendor/saldoParcial.cjs) */
  executarEnvio(empresaId: string, destinatarios: string[], emailsCc: string[]): Promise<{ enviados: number }>;
  agora?: () => Date;
  intervaloEntreEnviosMs?: number;
}

export interface OpcoesExecucao {
  origem: 'agendado' | 'manual';
  /** Instante agendado (agendado) — no manual é o momento do clique */
  executadoPara?: string;
  disparadoPor?: string | null;
}

export interface ResumoExecucao {
  sucesso: number;
  erro: number;
  semDestinatarios: number;
  ignorados: number;
}

const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function criarAgendadorSaldoParcial(deps: DependenciasAgendadorSaldoParcial) {
  const db = deps.supabase as any;
  const agora = deps.agora ?? (() => new Date());
  const intervaloEntreEnvios = deps.intervaloEntreEnviosMs ?? INTERVALO_ENTRE_ENVIOS_MS;
  let timer: NodeJS.Timeout | null = null;
  let emCiclo = false;

  const atualizarAgendamento = (id: string, dados: Record<string, any>) =>
    db.from('banco_horas_envio_agendamentos').update(dados).eq('id', id);

  const atualizarExecucao = (id: string, dados: Record<string, any>) =>
    db.from('banco_horas_envio_execucoes').update(dados).eq('id', id);

  async function buscarDestinatarios(empresaId: string): Promise<string[]> {
    const { data, error } = await db
      .from('clientes')
      .select('email')
      .eq('empresa_id', empresaId)
      .eq('status', 'ativo')
      .in('finalidade_envio', FINALIDADES_SALDO_PARCIAL);
    if (error) throw new Error(`Erro ao buscar contatos de Saldo Parcial: ${error.message}`);
    return (data || []).map((c: { email: string }) => c.email).filter(Boolean);
  }

  /** Envia o Saldo Parcial de todos os clientes do agendamento */
  async function executarAgendamento(ag: any, opcoes: OpcoesExecucao): Promise<ResumoExecucao> {
    const resumo: ResumoExecucao = { sucesso: 0, erro: 0, semDestinatarios: 0, ignorados: 0 };
    const executadoPara = opcoes.executadoPara ?? agora().toISOString();
    const empresas: string[] = (ag.empresas || []).map((e: { empresa_id: string }) => e.empresa_id);
    const emailsCc: string[] = ag.emails_cc || [];

    for (let i = 0; i < empresas.length; i++) {
      const empresaId = empresas[i];

      // Reserva: a chave única (empresa_id, executado_para) impede envio em dobro
      const { data: reserva, error: erroReserva } = await db
        .from('banco_horas_envio_execucoes')
        .insert({
          agendamento_id: ag.id,
          empresa_id: empresaId,
          origem: opcoes.origem,
          disparado_por: opcoes.disparadoPor ?? null,
          executado_para: executadoPara,
          status: 'executando'
        })
        .select('id')
        .single();

      if (erroReserva || !reserva) {
        if (erroReserva?.code !== CODIGO_VIOLACAO_UNICA) {
          console.error(`[SALDO PARCIAL] Erro ao registrar execução da empresa ${empresaId}:`, erroReserva?.message);
        }
        resumo.ignorados++;
        continue;
      }

      try {
        const destinatarios = await buscarDestinatarios(empresaId);
        if (destinatarios.length === 0) {
          await atualizarExecucao(reserva.id, {
            status: 'sem_destinatarios',
            qtd_destinatarios: 0,
            qtd_emails: 0,
            finalizado_em: agora().toISOString()
          });
          resumo.semDestinatarios++;
          continue;
        }

        const { enviados } = await deps.executarEnvio(empresaId, destinatarios, emailsCc);
        await atualizarExecucao(reserva.id, {
          status: 'sucesso',
          qtd_destinatarios: destinatarios.length,
          qtd_emails: enviados,
          finalizado_em: agora().toISOString()
        });
        resumo.sucesso++;
      } catch (e) {
        const mensagem = e instanceof Error ? e.message : String(e);
        console.error(`[SALDO PARCIAL] Falha no envio da empresa ${empresaId}:`, mensagem);
        await atualizarExecucao(reserva.id, { status: 'erro', erro: mensagem, finalizado_em: agora().toISOString() });
        resumo.erro++;
      }

      if (intervaloEntreEnvios > 0 && i < empresas.length - 1) await esperar(intervaloEntreEnvios);
    }

    return resumo;
  }

  /** Status agregado do agendamento a partir do resumo dos clientes */
  function statusDoResumo(resumo: ResumoExecucao): string {
    if (resumo.erro > 0 && resumo.sucesso === 0 && resumo.semDestinatarios === 0) return 'erro';
    if (resumo.erro > 0) return 'parcial';
    return 'sucesso';
  }

  async function ciclo(): Promise<void> {
    const { data: agendamentos, error } = await db
      .from('banco_horas_envio_agendamentos')
      .select('*, empresas:banco_horas_envio_agendamento_empresas(empresa_id)')
      .eq('ativo', true);

    if (error) {
      console.error('[SALDO PARCIAL] Erro ao ler agendamentos:', error.message);
      return;
    }

    const instante = agora();
    const vencidos: any[] = [];

    for (const ag of agendamentos || []) {
      if (validarRegra(ag as RegraRecorrencia).length > 0) {
        console.error(`[SALDO PARCIAL] Agendamento ${ag.id} com regra inválida, ignorado`);
        continue;
      }

      if (!ag.proxima_execucao) {
        const proxima = calcularProximaExecucao(ag as RegraRecorrencia, instante);
        if (proxima) await atualizarAgendamento(ag.id, { proxima_execucao: proxima.toISOString() });
        continue;
      }

      if (new Date(ag.proxima_execucao).getTime() <= instante.getTime()) vencidos.push(ag);
    }

    vencidos.sort((a, b) => new Date(a.proxima_execucao).getTime() - new Date(b.proxima_execucao).getTime());

    for (const ag of vencidos) {
      // A próxima execução é gravada antes de enviar: se o serviço cair no meio,
      // a reserva por cliente evita reenvio do que já saiu.
      const proxima = calcularProximaExecucao(ag as RegraRecorrencia, instante);
      await atualizarAgendamento(ag.id, {
        proxima_execucao: proxima ? proxima.toISOString() : null,
        ultima_execucao: instante.toISOString(),
        ultimo_status: 'executando'
      });

      console.log(`[SALDO PARCIAL] Executando agendamento ${ag.id} (${(ag.empresas || []).length} cliente(s))`);
      const resumo = await executarAgendamento(ag, { origem: 'agendado', executadoPara: ag.proxima_execucao });
      await atualizarAgendamento(ag.id, { ultimo_status: statusDoResumo(resumo) });
    }
  }

  /** Execuções que ficaram "executando" quando o serviço caiu */
  async function recuperarInterrompidas(): Promise<void> {
    const { error } = await db
      .from('banco_horas_envio_execucoes')
      .update({ status: 'interrompida', finalizado_em: agora().toISOString() })
      .eq('status', 'executando');
    if (error) console.error('[SALDO PARCIAL] Erro ao recuperar execuções interrompidas:', error.message);
  }

  async function cicloSeguro() {
    if (emCiclo) return;
    emCiclo = true;
    try {
      await ciclo();
    } catch (e) {
      console.error('[SALDO PARCIAL] Erro no ciclo:', e instanceof Error ? e.message : e);
    } finally {
      emCiclo = false;
    }
  }

  async function iniciar(intervaloMs = INTERVALO_CICLO_SALDO_PARCIAL_MS) {
    if (timer) return;
    await recuperarInterrompidas();
    await cicloSeguro();
    timer = setInterval(cicloSeguro, intervaloMs);
    console.log(`[SALDO PARCIAL] Agendador iniciado (ciclo de ${Math.round(intervaloMs / 1000)}s)`);
  }

  function parar() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { ciclo, executarAgendamento, recuperarInterrompidas, iniciar, parar, ativo: () => timer !== null };
}
