// Tipos compartilhados para o sistema de aprovação
import type { FormularioType } from './formTypes';

export interface Quote {
  id: string;
  form_data: any;
  product_type: 'book';
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at: string; // Obrigatório para Quote
  approval_quote_id?: string;
  // Campos específicos para o Book
  valor_mensal?: number | null;
}

export interface PendingQuote {
  id: string;
  form_data: any;
  product_type: 'book';
  submitted_at: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string; // Opcional para PendingQuote
  approval_quote_id?: string;
  // Campos específicos para o Book
  valor_mensal?: number | null;
}

export interface EmailTemplate {
  id: string;
  nome: string;
  assunto: string;
  corpo: string;
  descricao?: string | null;
  tipo?: string | null;
  ativo: boolean;
  vinculado_formulario: boolean;
  formulario?: FormularioType | null;
  modalidade?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApprovalSettings {
  id: string;
  email_notifications: boolean;
  approver_email: string;
  auto_approval_domains: string[];
  created_at?: string;
  updated_at?: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export interface ApprovalHistoryResult {
  quotes: PendingQuote[];
  total: number;
  hasMore: boolean;
}

// Tipos auxiliares para os componentes
export interface RejectModalState {
  open: boolean;
  quoteId: string;
  reason: string;
  isProcessing: boolean;
}

export interface DetailsModalState {
  open: boolean;
  quote: Quote | null;
  readOnly: boolean;
}

export interface ApprovalStats {
  pending: number;
  processed: number;
}

// Configuração para estados vazios
export interface EmptyStateConfig {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  iconColor: string;
}

// Função para converter PendingQuote para Quote
export function pendingQuoteToQuote(pendingQuote: PendingQuote): Quote {
  return {
    ...pendingQuote,
    updated_at: pendingQuote.updated_at || pendingQuote.created_at || new Date().toISOString()
  };
}

// Função para verificar se é um Quote válido
export function isQuote(quote: PendingQuote | Quote): quote is Quote {
  return 'updated_at' in quote && typeof quote.updated_at === 'string';
}