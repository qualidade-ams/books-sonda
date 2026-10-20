/**
 * Notificações do sino (tabela notificacoes).
 * Só aparecem para quem tem permissão de Edição na tela da notificação (RLS).
 */

export type TipoNotificacao =
  | 'book_precisa_retificacao'
  | 'ajuste_retroativo_pendente'
  | 'saldo_parcial_falha'
  | 'geracao_books_falha';

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  screen_key: string;
  titulo: string;
  mensagem: string;
  link: string | null;
  empresa_id: string | null;
  created_at: string;
  updated_at: string;
  /** false também quando a notificação foi atualizada depois da leitura (ex.: nova falha) */
  lida: boolean;
}
