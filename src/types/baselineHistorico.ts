/**
 * Tipos TypeScript para o sistema de histórico de baseline
 * 
 * Este arquivo define as interfaces e tipos para gerenciar
 * o histórico temporal de baseline de horas e tickets contratados.
 */

/**
 * Registro de histórico de baseline
 */
export interface BaselineHistorico {
  id: string;
  empresa_id: string;
  baseline_horas: number;
  baseline_tickets: number | null;
  data_inicio: string; // ISO date string (YYYY-MM-DD)
  data_fim: string | null; // ISO date string (YYYY-MM-DD) ou null para vigência atual
  motivo: string | null;
  observacao: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Dados para inserir novo registro de baseline
 */
export interface BaselineHistoricoInsert {
  empresa_id: string;
  baseline_horas: number;
  baseline_tickets?: number | null;
  data_inicio: string; // ISO date string (YYYY-MM-DD)
  data_fim?: string | null; // ISO date string (YYYY-MM-DD)
  motivo?: string | null;
  observacao?: string | null;
  created_by?: string | null;
}

/**
 * Dados para atualizar registro de baseline
 */
export interface BaselineHistoricoUpdate {
  baseline_horas?: number;
  baseline_tickets?: number | null;
  data_inicio?: string;
  data_fim?: string | null;
  motivo?: string | null;
  observacao?: string | null;
  updated_by?: string | null;
}

/**
 * Baseline vigente retornado pela função get_baseline_vigente
 */
export interface BaselineVigente {
  baseline_horas: number;
  baseline_tickets: number | null;
  data_inicio: string;
  data_fim: string | null;
  motivo: string | null;
}

/**
 * Motivos predefinidos para mudança de baseline
 */
export enum MotivoMudancaBaseline {
  RENOVACAO_CONTRATUAL = 'Renovação Contratual',
  RENEGOCIACAO = 'Renegociação',
  AJUSTE_CONTRATUAL = 'Ajuste Contratual',
  CORRECAO = 'Correção',
  ADITIVO = 'Aditivo Contratual',
  REDUCAO = 'Redução de Escopo',
  AMPLIACAO = 'Ampliação de Escopo',
  OUTRO = 'Outro'
}

/**
 * Opções para o select de motivos
 */
export const MOTIVOS_MUDANCA_OPTIONS = [
  { value: MotivoMudancaBaseline.RENOVACAO_CONTRATUAL, label: 'Renovação Contratual' },
  { value: MotivoMudancaBaseline.RENEGOCIACAO, label: 'Renegociação' },
  { value: MotivoMudancaBaseline.AJUSTE_CONTRATUAL, label: 'Ajuste Contratual' },
  { value: MotivoMudancaBaseline.ADITIVO, label: 'Aditivo Contratual' },
  { value: MotivoMudancaBaseline.AMPLIACAO, label: 'Ampliação de Escopo' },
  { value: MotivoMudancaBaseline.REDUCAO, label: 'Redução de Escopo' },
  { value: MotivoMudancaBaseline.CORRECAO, label: 'Correção' },
  { value: MotivoMudancaBaseline.OUTRO, label: 'Outro' }
];

/**
 * Dados do formulário de criação/edição de baseline
 */
export interface BaselineFormData {
  baseline_horas: string; // String para input, será convertido para number
  baseline_tickets: string; // String para input, será convertido para number
  data_inicio: string; // ISO date string
  motivo: string;
  observacao: string;
}

/**
 * Histórico de baseline com informações da empresa
 */
export interface BaselineHistoricoComEmpresa extends BaselineHistorico {
  empresas_clientes?: {
    id: string;
    nome_completo: string;
    nome_abreviado: string;
  };
}

/**
 * Estatísticas do histórico de baseline
 */
export interface BaselineHistoricoStats {
  total_mudancas: number;
  baseline_atual: number;
  baseline_inicial: number;
  variacao_percentual: number;
  ultima_mudanca: string | null; // ISO date string
}

/**
 * Filtros para busca de histórico
 */
export interface BaselineHistoricoFiltros {
  empresa_id?: string;
  data_inicio?: string;
  data_fim?: string;
  motivo?: string;
  apenas_vigentes?: boolean;
}

/**
 * Resultado da validação de vigência
 */
export interface ValidacaoVigencia {
  valido: boolean;
  erro?: string;
  conflitos?: BaselineHistorico[];
}
