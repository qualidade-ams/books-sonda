/**
 * Tipos para o Relatório de Indicadores por Empresa
 * Totalizadores: Chamados Abertos, Fechados, SLA, Backlog, Horas/Tickets, Pesquisas
 *
 * IMPORTANTE: Os dados vêm dos snapshots dos books gerados (tabela books),
 * não de consultas em tempo real. Refletem os valores congelados na geração.
 */

/**
 * Dados de indicadores de uma empresa para o período (snapshot do book)
 */
export interface IndicadoresEmpresa {
  empresa_id: string;
  empresa: string; // nome_abreviado
  empresa_nome_completo: string;
  chamados_abertos: number;
  chamados_fechados: number;
  sla_percentual: number | null; // null se não tiver incidentes
  sla_violados: number; // quantidade de chamados violados (0 se nenhum)
  backlog: number;
  pesquisas_enviadas: number;
  pesquisas_respondidas: number;
  pesquisas_nao_respondidas: number;
}

/**
 * Totais consolidados de todos os indicadores
 */
export interface IndicadoresTotais {
  total_abertos: number;
  total_fechados: number;
  sla_medio: number | null;
  total_violados: number;
  total_backlog: number;
  total_pesquisas_enviadas: number;
  total_pesquisas_respondidas: number;
  total_pesquisas_nao_respondidas: number;
}

/**
 * Tipo de aba do relatório de indicadores
 */
export type AbaRelatorioIndicador =
  | 'chamados_abertos'
  | 'chamados_fechados'
  | 'sla'
  | 'backlog'
  | 'horas_tickets'
  | 'pesquisas_enviadas'
  | 'pesquisas_respondidas'
  | 'pesquisas_nao_respondidas';

/**
 * Labels das abas
 */
export const ABA_LABELS: Record<AbaRelatorioIndicador, string> = {
  chamados_abertos: 'Chamados Abertos',
  chamados_fechados: 'Chamados Fechados',
  sla: 'SLA (%)',
  backlog: 'Backlog',
  horas_tickets: 'Horas/Tickets',
  pesquisas_enviadas: 'Pesquisas Enviadas',
  pesquisas_respondidas: 'Pesquisas Respondidas',
  pesquisas_nao_respondidas: 'Enviadas e Não Respondidas',
};
