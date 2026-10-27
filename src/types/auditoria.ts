/**
 * Auditoria do banco de horas e dos cadastros novos (Modelagem_Fase3.md, seção 9):
 * leitura de auditoria_alteracoes, com nomes legíveis.
 */

export type AcaoAuditoria = 'insert' | 'update' | 'delete';
export type OrigemAuditoria = 'app' | 'sincronizacao' | 'carga' | 'sistema';

export interface CampoAlterado {
  campo: string;
  antes: unknown;
  depois: unknown;
}

export interface RegistroAuditoria {
  id: number;
  em: string;
  usuarioId: string | null;
  /** Nome pelo cadastro de usuários; nulo sem permissão, sem cadastro ou sem usuário */
  usuario: string | null;
  origem: OrigemAuditoria;
  tabela: string;
  /** Chave do agrupamento das tabelas na tela; tabela sem área vem pelo próprio nome */
  area: string;
  registroId: string;
  empresaId: string | null;
  empresa: string | null;
  bancoId: string | null;
  banco: string | null;
  acao: AcaoAuditoria;
  campos: CampoAlterado[];
  /** Linha inteira depois (ou antes, na exclusão), para identificar o registro */
  dados: Record<string, unknown> | null;
  motivo: string | null;
}

export interface FiltrosAuditoria {
  /** AAAA-MM-DD, inclusive, no horário de Brasília */
  desde?: string;
  ate?: string;
  empresaIds?: string[];
  bancoIds?: string[];
  /** Chaves das áreas (AREAS do service) */
  areas?: string[];
  acoes?: AcaoAuditoria[];
  origens?: OrigemAuditoria[];
  usuarioIds?: string[];
  /** Todo o histórico de um registro */
  registroId?: string;
  /** Paginação: só registros anteriores a este momento (o "em" do último da página) */
  antesDe?: string;
}

export interface PaginaAuditoria {
  registros: RegistroAuditoria[];
  /** Há mais registros depois desta página */
  temMais: boolean;
}
