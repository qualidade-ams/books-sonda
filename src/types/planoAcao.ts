// =====================================================
// TIPOS: SISTEMA DE PLANO DE AÇÃO
// =====================================================

export type PrioridadePlano = 'baixa' | 'media' | 'alta' | 'critica';
export type StatusPlano = 'aberto' | 'em_andamento' | 'aguardando_retorno' | 'concluido' | 'cancelado';
export type MeioContato = 'whatsapp' | 'email' | 'ligacao';
export type RetornoCliente = 'aguardando' | 'respondeu' | 'solicitou_mais_informacoes';
export type StatusFinal = 'resolvido' | 'nao_resolvido' | 'resolvido_parcialmente';
export type TipoAtualizacao = 'criacao' | 'atualizacao' | 'contato' | 'conclusao' | 'reabertura' | 'cancelamento';

// Interface principal do Plano de Ação
export interface PlanoAcao {
  id: string;
  pesquisa_id: string;
  chamado?: string;
  empresa_id?: string;
  data_resposta?: string; // Data de resposta da pesquisa (copiada para facilitar filtros)
  comentario_cliente?: string; // NOVO: Comentário do cliente (antigo descricao_acao_corretiva)
  descricao_acao_corretiva: string; // NOVO: Descrição da ação corretiva (campo em branco)
  acao_preventiva?: string;
  prioridade: PrioridadePlano;
  status_plano: StatusPlano;
  data_inicio: string;
  data_conclusao?: string;
  data_primeiro_contato?: string;
  meio_contato?: MeioContato;
  resumo_comunicacao?: string;
  retorno_cliente?: RetornoCliente;
  status_final?: StatusFinal;
  data_fechamento?: string;
  justificativa_cancelamento?: string;
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

// Interface do histórico
export interface PlanoAcaoHistorico {
  id: string;
  plano_acao_id: string;
  data_atualizacao: string;
  usuario_id?: string;
  usuario_nome?: string;
  descricao_atualizacao: string;
  tipo_atualizacao?: TipoAtualizacao;
  criado_em: string;
}

// Interface estendida com dados da pesquisa
export interface PlanoAcaoCompleto extends PlanoAcao {
  pesquisa?: {
    id: string;
    empresa: string;
    cliente: string;
    tipo_caso?: string;
    nro_caso?: string;
    comentario_pesquisa?: string;
    resposta?: string;
  };
}

// Interface para formulário de criação
export interface PlanoAcaoFormData {
  pesquisa_id: string;
  chamado?: string;
  empresa_id?: string;
  comentario_cliente?: string; // NOVO: Comentário do cliente
  descricao_acao_corretiva: string; // NOVO: Descrição da ação corretiva (campo em branco)
  acao_preventiva?: string;
  prioridade: PrioridadePlano;
  status_plano?: StatusPlano;
  data_inicio: string;
  data_conclusao?: string;
  data_primeiro_contato?: string;
  meio_contato?: MeioContato;
  resumo_comunicacao?: string;
  retorno_cliente?: RetornoCliente;
  status_final?: StatusFinal;
  justificativa_cancelamento?: string;
}

// Interface para filtros
export interface FiltrosPlanoAcao {
  busca?: string;
  prioridade?: PrioridadePlano[];
  status?: StatusPlano[];
  empresa?: string;
  dataInicio?: string;
  dataFim?: string;
  mes?: number; // Mês da data de resposta da pesquisa
  ano?: number; // Ano da data de resposta da pesquisa
}

// Interface para estatísticas
export interface EstatisticasPlanoAcao {
  total: number;
  abertos: number;
  em_andamento: number;
  aguardando_retorno: number;
  concluidos: number;
  cancelados: number;
  tempo_medio_resolucao: number; // em dias
  por_prioridade: {
    baixa: number;
    media: number;
    alta: number;
    critica: number;
  };
  por_mes?: Array<{
    mes: number;
    mesNome: string;
    abertos: number;
    em_andamento: number;
    aguardando_retorno: number;
    concluidos: number;
    cancelados: number;
    total: number;
  }>;
}

// Opções para selects
export const PRIORIDADE_OPTIONS: { value: PrioridadePlano; label: string }[] = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export const STATUS_PLANO_OPTIONS: { value: StatusPlano; label: string }[] = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'aguardando_retorno', label: 'Aguardando Retorno' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const MEIO_CONTATO_OPTIONS: { value: MeioContato; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'ligacao', label: 'Ligação' },
];

export const RETORNO_CLIENTE_OPTIONS: { value: RetornoCliente; label: string }[] = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'solicitou_mais_informacoes', label: 'Solicitou Mais Informações' },
];

export const STATUS_FINAL_OPTIONS: { value: StatusFinal; label: string }[] = [
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'nao_resolvido', label: 'Não Resolvido' },
  { value: 'resolvido_parcialmente', label: 'Resolvido Parcialmente' },
];

// Função para obter cor por prioridade
export function getCorPrioridade(prioridade: PrioridadePlano): string {
  const cores = {
    baixa: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    alta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    critica: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return cores[prioridade];
}

// Função para obter cor por status
export function getCorStatus(status: StatusPlano): string {
  const cores = {
    aberto: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
    em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    aguardando_retorno: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    concluido: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };
  return cores[status];
}
