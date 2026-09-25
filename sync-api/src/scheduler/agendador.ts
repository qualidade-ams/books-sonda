/**
 * Agendador da sincronização: a cada ciclo (60s) lê `sync_agendamentos`
 * ativos, calcula `proxima_execucao` quando está vazia (agendamento novo ou
 * regra alterada — o trigger do banco zera o campo) e dispara no orquestrador
 * o agendamento vencido mais antigo.
 *
 * - Execução perdida (serviço desligado): roda uma vez ao voltar e o próximo
 *   horário é calculado a partir de agora (não acumula atrasos).
 * - Sincronização em andamento: o vencido espera o próximo ciclo.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { calcularProximaExecucao, validarRegra, RegraRecorrencia } from './recorrencia';
import type { InicioExecucao, ParametrosExecucao } from './orquestradorSync';

interface OrquestradorLike {
  iniciar(params: ParametrosExecucao): Promise<InicioExecucao>;
  emExecucao(): boolean;
}

export interface DependenciasAgendador {
  supabase: SupabaseClient;
  orquestrador: OrquestradorLike;
  agora?: () => Date;
}

export const INTERVALO_CICLO_MS = 60_000;

export function criarAgendador(deps: DependenciasAgendador) {
  const db = deps.supabase as any;
  const agora = deps.agora ?? (() => new Date());
  let timer: NodeJS.Timeout | null = null;
  let emCiclo = false;

  const atualizar = (id: string, dados: Record<string, any>) =>
    db.from('sync_agendamentos').update(dados).eq('id', id);

  async function ciclo(): Promise<void> {
    const { data: agendamentos, error } = await db.from('sync_agendamentos').select('*').eq('ativo', true);

    if (error) {
      console.error('[AGENDADOR] Erro ao ler agendamentos:', error.message);
      return;
    }

    const instante = agora();
    const vencidos: any[] = [];

    for (const ag of agendamentos || []) {
      if (validarRegra(ag as RegraRecorrencia).length > 0) {
        console.error(`[AGENDADOR] Agendamento ${ag.id} com regra inválida, ignorado`);
        continue;
      }

      if (!ag.proxima_execucao) {
        const proxima = calcularProximaExecucao(ag as RegraRecorrencia, instante);
        if (proxima) await atualizar(ag.id, { proxima_execucao: proxima.toISOString() });
        continue;
      }

      if (new Date(ag.proxima_execucao).getTime() <= instante.getTime()) vencidos.push(ag);
    }

    if (vencidos.length === 0) return;

    if (deps.orquestrador.emExecucao()) {
      console.log(`[AGENDADOR] ${vencidos.length} agendamento(s) vencido(s) aguardando a sincronização em andamento`);
      return;
    }

    // Um por ciclo: o orquestrador só executa uma sincronização por vez
    vencidos.sort((a, b) => new Date(a.proxima_execucao).getTime() - new Date(b.proxima_execucao).getTime());
    const ag = vencidos[0];

    const proxima = calcularProximaExecucao(ag as RegraRecorrencia, instante);
    await atualizar(ag.id, {
      proxima_execucao: proxima ? proxima.toISOString() : null,
      ultima_execucao: instante.toISOString(),
      ultimo_status: 'executando',
    });

    console.log(`[AGENDADOR] Disparando agendamento ${ag.id}`);

    try {
      const inicio = await deps.orquestrador.iniciar({
        tabelas: ag.tabelas || {},
        origem: 'agendado',
        agendamentoId: ag.id,
      });

      if (inicio.status === 'iniciada') {
        inicio.conclusao
          .then((status) => atualizar(ag.id, { ultimo_status: status }))
          .catch((e) => {
            console.error('[AGENDADOR] Erro na execução agendada:', e instanceof Error ? e.message : e);
            return atualizar(ag.id, { ultimo_status: 'erro' });
          });
      } else {
        await atualizar(ag.id, { ultimo_status: 'ignorada' });
      }
    } catch (e) {
      console.error('[AGENDADOR] Falha ao iniciar execução:', e instanceof Error ? e.message : e);
      await atualizar(ag.id, { ultimo_status: 'erro' });
    }
  }

  /** Execuções que ficaram "executando" quando o serviço caiu */
  async function recuperarInterrompidas(): Promise<void> {
    const { error } = await db
      .from('sync_execucoes')
      .update({ status: 'interrompida', finalizado_em: agora().toISOString() })
      .eq('status', 'executando');
    if (error) console.error('[AGENDADOR] Erro ao recuperar execuções interrompidas:', error.message);
  }

  async function cicloSeguro() {
    if (emCiclo) return;
    emCiclo = true;
    try {
      await ciclo();
    } catch (e) {
      console.error('[AGENDADOR] Erro no ciclo:', e instanceof Error ? e.message : e);
    } finally {
      emCiclo = false;
    }
  }

  async function iniciar(intervaloMs = INTERVALO_CICLO_MS) {
    if (timer) return;
    await recuperarInterrompidas();
    await cicloSeguro();
    timer = setInterval(cicloSeguro, intervaloMs);
    console.log(`[AGENDADOR] Iniciado (ciclo de ${Math.round(intervaloMs / 1000)}s)`);
  }

  function parar() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  return { ciclo, recuperarInterrompidas, iniciar, parar, ativo: () => timer !== null };
}
