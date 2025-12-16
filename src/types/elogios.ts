// =====================================================
// TIPOS: SISTEMA DE ELOGIOS
// =====================================================

export type StatusElogio = 'registrado' | 'compartilhado' | 'arquivado' | 'enviado';
export type TipoAtualizacaoElogio = 'criacao' | 'atualizacao' | 'compartilhamento' | 'arquivamento' | 'envio';

// Interface principal do Elogio
export interface Elogio {
  id: string;
  pesquisa_id: string;
  chamado?: string;
  empresa_id?: string;
  data_resposta?: string;
  observacao?: string;
  acao_tomada?: string;
  compartilhado_com?: string;
  status: StatusElogio;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

// Interface do histórico
export interface ElogioHistorico {
  id: string;
  elogio_id: string;
  data_atualizacao: string;
  usuario_id?: string;
  usuario_nome?: string;
  descricao_atualizacao: string;
  tipo_atualizacao?: TipoAtualizacaoElogio;
  criado_em: string;
}

// Interface estendida com dados da pesquisa
export interface ElogioCompleto extends Elogio {
  pesquisa?: {
    id: string;
    empresa: string;
    cliente: string;
    email_cliente?: string;
    prestador?: string;
    categoria?: string;
    grupo?: string;
    tipo_caso?: string;
    nro_caso?: string;
    comentario_pesquisa?: string;
    resposta?: string;
    data_resposta?: string;
    origem?: 'sql_server' | 'manual';
  };
}

// Interface para formulário de criação
export interface ElogioFormData {
  // Campos da pesquisa de satisfação
  empresa: string;
  cliente: string;
  email_cliente?: string;
  prestador?: string;
  categoria?: string;
  grupo?: string;
  tipo_caso?: string;
  nro_caso?: string;
  data_resposta?: Date | string;
  resposta: string;
  comentario_pesquisa?: string;
  
  // Campos específicos do elogio
  observacao?: string;
  acao_tomada?: string;
  compartilhado_com?: string;
  status?: StatusElogio;
}

// Interface para filtros
export interface FiltrosElogio {
  busca?: string;
  status?: StatusElogio[];
  empresa?: string;
  dataInicio?: string;
  dataFim?: string;
  mes?: number; // Mês da data de resposta
  ano?: number; // Ano da data de resposta
}

// Interface para estatísticas
export interface EstatisticasElogio {
  total: number;
  registrados: number;
  compartilhados: number;
  arquivados: number;
}

// Opções para selects
export const STATUS_ELOGIO_OPTIONS = [
  { value: 'registrado', label: 'Registrado' },
  { value: 'compartilhado', label: 'Compartilhado' },
  { value: 'arquivado', label: 'Arquivado' },
  { value: 'enviado', label: 'Enviado por Email' },
] as const;
