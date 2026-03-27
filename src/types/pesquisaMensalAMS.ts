/**
 * Tipos para Pesquisa Mensal AMS
 */

export interface PesquisaMensalAMS {
  id: string;
  identificador_questionario: string;
  nome_questionario: string;
  mes_referencia: number;
  inicio_real_questionario: string | null;
  nome_respondente: string | null;
  email_respondente: string | null;
  cliente: string | null;
  cliente_foco: boolean;
  vertical: string | null;
  unidade_negocio: string | null;
  nota: number | null;
  comentario: string | null;
  inicio_resposta: string | null;
  termino_resposta: string | null;
  situacao_resposta: string | null;
  incompleto: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  ano_referencia: number | null;
}

export interface PesquisaMensalAMSFormData {
  identificador_questionario: string;
  nome_questionario: string;
  mes_referencia: number;
  inicio_real_questionario?: string;
  nome_respondente?: string;
  email_respondente?: string;
  cliente?: string;
  cliente_foco: boolean;
  vertical?: string;
  unidade_negocio?: string;
  nota?: number;
  comentario?: string;
  inicio_resposta?: string;
  termino_resposta?: string;
  situacao_resposta?: string;
  incompleto: boolean;
  ano_referencia?: number;
}

export interface FiltrosPesquisaAMS {
  busca?: string;
  cliente?: string;
  vertical?: string;
  unidade_negocio?: string;
  situacao_resposta?: string;
  mes?: number;
  ano?: number;
}

export interface EstatisticasAMS {
  total: number;
  completas: number;
  incompletas: number;
  cliente_foco: number;
  media_nota: number;
}

export const MESES_NOMES: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro',
};
