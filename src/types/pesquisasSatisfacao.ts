/**
 * Tipos e interfaces para o Sistema de Pesquisas
 */

// ============================================
// ENUMS
// ============================================

export type OrigemPesquisa = 'sql_server' | 'manual';
export type StatusPesquisa = 'pendente' | 'enviado_plano_acao' | 'enviado_elogios';

// ============================================
// INTERFACE PRINCIPAL
// ============================================

export interface Pesquisa {
  id: string;
  
  // Controle de origem
  origem: OrigemPesquisa;
  id_externo: string | null;
  
  // Dados do SQL Server
  empresa: string;
  categoria: string | null;
  grupo: string | null;
  cliente: string;
  email_cliente: string | null;
  prestador: string | null;
  solicitante: string | null; // NOVO CAMPO ADICIONADO
  nro_caso: string | null;
  tipo_caso: string | null;
  ano_abertura: number | null;
  mes_abertura: number | null;
  data_resposta: string | null; // ISO string
  resposta: string | null;
  comentario_pesquisa: string | null;
  
  // Relacionamentos (opcional)
  empresa_id: string | null;
  cliente_id: string | null;
  
  // Controle de envio
  status: StatusPesquisa;
  data_envio: string | null; // ISO string
  
  // Auditoria
  autor_id: string | null;
  autor_nome: string | null;
  observacao: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// TIPOS PARA FORMULÁRIOS
// ============================================

export interface PesquisaFormData {
  // Campos obrigatórios
  empresa: string;
  cliente: string;
  
  // Campos opcionais
  categoria?: string;
  grupo?: string;
  email_cliente?: string;
  prestador?: string;
  solicitante?: string; // NOVO CAMPO ADICIONADO
  nro_caso?: string;
  tipo_caso?: string;
  ano_abertura?: number;
  mes_abertura?: number;
  data_resposta?: Date | null;
  resposta?: string;
  comentario_pesquisa?: string;
  observacao?: string;
  
  // Especialistas/Consultores
  especialistas_ids?: string[]; // Array de IDs dos especialistas selecionados
  
  // Relacionamentos
  empresa_id?: string;
  cliente_id?: string;
}

// ============================================
// TIPOS PARA OPERAÇÕES DE BANCO
// ============================================

export interface PesquisaInsert extends Omit<Pesquisa, 'id' | 'created_at' | 'updated_at'> {}

export interface PesquisaUpdate extends Partial<Omit<Pesquisa, 'id' | 'created_at' | 'updated_at' | 'origem' | 'id_externo'>> {}

// ============================================
// TIPOS PARA FILTROS
// ============================================

export interface FiltrosPesquisas {
  busca?: string;
  origem?: OrigemPesquisa | 'todos';
  status?: StatusPesquisa | 'todos';
  resposta?: string;
  empresa?: string;
  categoria?: string;
  grupo?: string;
  ano_abertura?: number;
  mes_abertura?: number;
  mes?: number | 'todos'; // Mês da data de resposta
  ano?: number | 'todos'; // Ano da data de resposta
  data_inicio?: string;
  data_fim?: string;
}

// ============================================
// TIPOS PARA ESTATÍSTICAS
// ============================================

export interface EstatisticasPesquisas {
  total: number;
  pendentes: number;
  enviados: number;
  sql_server: number;
  manuais: number;
  por_empresa: Record<string, number>;
  por_categoria: Record<string, number>;
  por_mes: Record<string, number>;
}

// ============================================
// TIPOS PARA SINCRONIZAÇÃO SQL SERVER
// ============================================

export interface DadosSqlServer {
  empresa: string;
  Categoria: string;
  Grupo: string;
  Cliente: string;
  Email_Cliente: string;
  Prestador: string;
  Solicitante: string; // NOVO CAMPO ADICIONADO
  Nro_caso: string;
  Tipo_Caso: string;
  Ano_Abertura: number;
  Mes_abertura: number;
  Data_Resposta: Date;
  Resposta: string;
  Comentario_Pesquisa: string;
  // Campo único para identificação
  id_unico?: string;
}

export interface ResultadoSincronizacao {
  sucesso: boolean;
  total_processados: number;
  novos: number;
  atualizados: number;
  erros: number;
  mensagens: string[];
  detalhes_erros?: Array<{
    registro: Partial<DadosSqlServer>;
    erro: string;
  }>;
}

// ============================================
// CONSTANTES
// ============================================

export const ORIGEM_PESQUISA_OPTIONS = [
  { value: 'todos', label: 'Todas as Origens' },
  { value: 'sql_server', label: 'SQL Server' },
  { value: 'manual', label: 'Manual' }
] as const;

export const STATUS_PESQUISA_OPTIONS = [
  { value: 'todos', label: 'Todos os Status' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado', label: 'Enviado' }
] as const;

export const RESPOSTA_PESQUISA_OPTIONS = [
  { value: 'todas', label: 'Todas as Respostas' },
  { value: 'Muito Insatisfeito', label: 'Muito Insatisfeito' },
  { value: 'Insatisfeito', label: 'Insatisfeito' },
  { value: 'Neutro', label: 'Neutro' },
  { value: 'Satisfeito', label: 'Satisfeito' },
  { value: 'Muito Satisfeito', label: 'Muito Satisfeito' }
] as const;

export const MESES_OPTIONS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
] as const;

// ============================================
// TIPOS PARA EXPORTAÇÃO
// ============================================

export interface DadosExportacaoPesquisas {
  pesquisas: Pesquisa[];
  filtros: FiltrosPesquisas;
  estatisticas: EstatisticasPesquisas;
}
