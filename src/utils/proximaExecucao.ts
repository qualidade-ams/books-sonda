/**
 * Próxima execução de um agendamento calculada no navegador, com o MESMO código
 * do agendador do sync-api (sync-api/src/scheduler/recorrencia.ts, lógica pura sem
 * dependências). Serve para a tela mostrar o próximo envio logo após salvar: o banco
 * zera proxima_execucao quando a regra muda e o agendador só recalcula no ciclo seguinte.
 */

import { calcularProximaExecucao, validarRegra } from '../../sync-api/src/scheduler/recorrencia';
import type { RegraRecorrencia } from '@/types/syncAgendamentos';

export function preverProximaExecucao(agendamento: RegraRecorrencia & { ativo: boolean }, agora: Date = new Date()): string | null {
  if (!agendamento.ativo || validarRegra(agendamento).length > 0) return null;
  return calcularProximaExecucao(agendamento, agora)?.toISOString() ?? null;
}
