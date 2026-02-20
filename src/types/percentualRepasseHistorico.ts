/**
 * Tipos para o sistema de histórico de percentual de repasse
 * 
 * Gerencia vigências temporais de percentual de repasse mensal
 * para suportar renovações e renegociações contratuais
 */

export interface PercentualRepasseHistorico {
  id: string;
  empresa_id: string;
  percentual: number;
  data_inicio: string; // ISO date string
  data_fim: string | null; // ISO date string ou null para vigência ativa
  motivo: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PercentualRepasseVigente {
  percentual: number;
  data_inicio: string;
  data_fim: string | null;
  motivo: string | null;
}

export interface CreatePercentualRepasseHistoricoInput {
  empresa_id: string;
  percentual: number;
  data_inicio: string;
  motivo?: string;
  observacao?: string;
}

export interface UpdatePercentualRepasseHistoricoInput {
  percentual?: number;
  data_inicio?: string;
  data_fim?: string | null;
  motivo?: string;
  observacao?: string;
}

export const MOTIVOS_PERCENTUAL_REPASSE = [
  'Renovação Contratual',
  'Renegociação',
  'Ajuste Comercial',
  'Correção',
  'Reajuste Anual',
  'Mudança de Escopo',
  'Outro'
] as const;

export type MotivoPercentualRepasse = typeof MOTIVOS_PERCENTUAL_REPASSE[number];
