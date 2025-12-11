// =====================================================
// TIPOS: CONTATOS DO PLANO DE AÇÃO
// =====================================================

/**
 * Tipos de meio de contato disponíveis
 */
export type MeioContatoType = 'whatsapp' | 'email' | 'ligacao';

/**
 * Status do retorno do cliente
 */
export type RetornoClienteType = 'aguardando' | 'respondeu' | 'solicitou_mais_informacoes';

/**
 * Interface base do contato do plano de ação
 */
export interface PlanoAcaoContato {
  id: string;
  plano_acao_id: string;
  data_contato: string; // Data no formato YYYY-MM-DD
  meio_contato: MeioContatoType;
  resumo_comunicacao: string;
  retorno_cliente?: RetornoClienteType | null;
  observacoes?: string | null;
  criado_por?: string | null;
  criado_em: string;
  atualizado_em: string;
}

/**
 * Interface para dados do formulário de contato
 */
export interface PlanoAcaoContatoFormData {
  data_contato: string;
  meio_contato: MeioContatoType;
  resumo_comunicacao: string;
  retorno_cliente?: RetornoClienteType | null;
  observacoes?: string;
}

/**
 * Constantes para opções de select
 */
export const MEIO_CONTATO_CONTATOS_OPTIONS = [
  { value: 'whatsapp' as const, label: 'WhatsApp' },
  { value: 'email' as const, label: 'E-mail' },
  { value: 'ligacao' as const, label: 'Ligação' },
];

export const RETORNO_CLIENTE_CONTATOS_OPTIONS = [
  { value: 'aguardando' as const, label: 'Aguardando' },
  { value: 'respondeu' as const, label: 'Respondeu' },
  { value: 'solicitou_mais_informacoes' as const, label: 'Solicitou Mais Informações' },
];

/**
 * Função utilitária para obter label do meio de contato
 */
export function getMeioContatoLabel(meio: MeioContatoType): string {
  const option = MEIO_CONTATO_CONTATOS_OPTIONS.find(opt => opt.value === meio);
  return option?.label || meio;
}

/**
 * Função utilitária para obter label do retorno do cliente
 */
export function getRetornoClienteLabel(retorno: RetornoClienteType): string {
  const option = RETORNO_CLIENTE_CONTATOS_OPTIONS.find(opt => opt.value === retorno);
  return option?.label || retorno;
}

/**
 * Função utilitária para obter ícone do meio de contato
 */
export function getMeioContatoIcon(meio: MeioContatoType): string {
  switch (meio) {
    case 'whatsapp':
      return '📱';
    case 'email':
      return '📧';
    case 'ligacao':
      return '📞';
    default:
      return '💬';
  }
}