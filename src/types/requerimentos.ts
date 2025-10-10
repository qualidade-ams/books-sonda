// Tipos e interfaces para o Sistema de Requerimentos

export interface Requerimento {
  id: string;
  chamado: string;
  cliente_id: string;
  cliente_nome?: string; // Join com empresas_clientes
  modulo: ModuloType;
  descricao: string;
  data_envio: string;
  data_aprovacao?: string; // Opcional
  horas_funcional: number | string; // Suporta formato HH:MM
  horas_tecnico: number | string; // Suporta formato HH:MM
  horas_total: number | string;
  linguagem: LinguagemType;
  tipo_cobranca: TipoCobrancaType;
  mes_cobranca: string; // Formato MM/YYYY
  observacao?: string;
  // Campos de valor/hora (para tipos específicos)
  valor_hora_funcional?: number;
  valor_hora_tecnico?: number;
  valor_total_funcional?: number;
  valor_total_tecnico?: number;
  valor_total_geral?: number;
  // Campos de ticket (para Banco de Horas)
  tem_ticket?: boolean;
  quantidade_tickets?: number;
  // Campos de anexo
  anexos?: any[];
  // Campos de autor
  autor_id?: string;
  autor_nome?: string;
  status: StatusRequerimento;
  enviado_faturamento: boolean;
  data_envio_faturamento?: string;
  created_at: string;
  updated_at: string;
}

// Tipos para opções de select
export type ModuloType = 'Comex' |'Comply' | 'Comply e-DOCS' | 'pw.SATI' | 'pw.SPED' | 'pw.SATI/pw.SPED';
export type LinguagemType = 'ABAP' | 'DBA' | 'Funcional' | 'PL/SQL' | 'Técnico';
export type TipoCobrancaType = 'Selecione' | 'Banco de Horas' | 'Cobro Interno' | 'Contrato' | 'Faturado' | 'Hora Extra' | 'Sobreaviso' | 'Reprovado' | 'Bolsão Enel';
export type TipoCobrancaFaturamentoType = Exclude<TipoCobrancaType, 'Selecione'>; // Tipo para faturamento sem 'Selecione'
export type StatusRequerimento = 'lancado' | 'enviado_faturamento' | 'faturado';

// Constantes para opções de select
export const MODULO_OPTIONS: { value: ModuloType; label: string }[] = [
  { value: 'Comex', label: 'Comex' },
  { value: 'Comply', label: 'Comply' },
  { value: 'Comply e-DOCS', label: 'Comply e-DOCS' },
  { value: 'pw.SATI', label: 'pw.SATI' },
  { value: 'pw.SPED', label: 'pw.SPED' },
  { value: 'pw.SATI/pw.SPED', label: 'pw.SATI/pw.SPED' }
];

export const LINGUAGEM_OPTIONS: { value: LinguagemType; label: string }[] = [
  { value: 'ABAP', label: 'ABAP' },
  { value: 'DBA', label: 'DBA' },
  { value: 'Funcional', label: 'Funcional' },
  { value: 'PL/SQL', label: 'PL/SQL' },
  { value: 'Técnico', label: 'Técnico' }
];

export const TIPO_COBRANCA_OPTIONS: { value: TipoCobrancaType; label: string }[] = [
  { value: 'Selecione', label: 'Selecione' },
  { value: 'Banco de Horas', label: 'Banco de Horas' },
  { value: 'Cobro Interno', label: 'Cobro Interno' },
  { value: 'Contrato', label: 'Contrato' },
  { value: 'Faturado', label: 'Faturado' },
  { value: 'Hora Extra', label: 'Hora Extra' },
  { value: 'Sobreaviso', label: 'Sobreaviso' },
  { value: 'Reprovado', label: 'Reprovado' },
  { value: 'Bolsão Enel', label: 'Bolsão Enel' }
];

// Tipos de cobrança que requerem campos de valor/hora
export const TIPOS_COM_VALOR_HORA: TipoCobrancaType[] = [
  'Faturado',
  'Hora Extra', 
  'Sobreaviso',
  'Bolsão Enel'
];

// Função utilitária para verificar se tipo requer valor/hora
export const requerValorHora = (tipoCobranca: TipoCobrancaType): boolean => {
  return TIPOS_COM_VALOR_HORA.includes(tipoCobranca);
};

// Função utilitária para verificar se tipo permite tickets
export const permiteTickets = (tipoCobranca: TipoCobrancaType): boolean => {
  return tipoCobranca === 'Banco de Horas';
};

// Interface para dados do formulário
export interface RequerimentoFormData {
  chamado: string;
  cliente_id: string;
  modulo: ModuloType;
  descricao: string;
  data_envio: string;
  data_aprovacao?: string; // Opcional
  horas_funcional: number | string; // Suporta formato HH:MM
  horas_tecnico: number | string; // Suporta formato HH:MM
  linguagem: LinguagemType;
  tipo_cobranca: TipoCobrancaType;
  mes_cobranca: string; // Formato MM/YYYY
  observacao?: string;
  // Campos de valor/hora (condicionais)
  valor_hora_funcional?: number;
  valor_hora_tecnico?: number;
  // Campos de ticket (para Banco de Horas)
  tem_ticket?: boolean;
  quantidade_tickets?: number;
  // Campos de autor (preenchidos automaticamente)
  autor_id?: string;
  autor_nome?: string;
}

// Interface para dados de faturamento
export interface FaturamentoData {
  requerimentos: Requerimento[];
  totais: {
    [key in TipoCobrancaType]: {
      quantidade: number;
      horas_total: number;
    };
  };
}

// Interface para email de faturamento
export interface EmailFaturamento {
  destinatarios: string[];
  destinatariosCC?: string[];
  assunto: string;
  corpo: string;
  anexos?: any[];
}

// Interface para cliente (empresas_clientes)
export interface ClienteRequerimento {
  id: string;
  nome_abreviado: string;
}

// Interface para estatísticas
export interface EstatisticasRequerimentos {
  total_requerimentos: number;
  total_horas: number;
  requerimentos_por_status: {
    [key in StatusRequerimento]: number;
  };
  requerimentos_por_tipo_cobranca: {
    [key in TipoCobrancaType]: number;
  };
  horas_por_tipo_cobranca: {
    [key in TipoCobrancaType]: number;
  };
}

// Interface para filtros
export interface FiltrosRequerimentos {
  busca?: string;
  modulo?: ModuloType | ModuloType[]; // Suporte a múltipla seleção
  linguagem?: LinguagemType | LinguagemType[]; // Suporte a múltipla seleção
  status?: StatusRequerimento;
  tipo_cobranca?: TipoCobrancaType | TipoCobrancaType[]; // Suporte a múltipla seleção
  mes_cobranca?: string; // Formato MM/YYYY
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
}