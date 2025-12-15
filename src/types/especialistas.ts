/**
 * Tipos e interfaces para o Sistema de Especialistas/Consultores
 */

// ============================================
// ENUMS
// ============================================

export type OrigemEspecialista = 'sql_server' | 'manual';
export type StatusEspecialista = 'ativo' | 'inativo';

// ============================================
// INTERFACE PRINCIPAL
// ============================================

export interface Especialista {
  id: string;
  
  // Controle de origem
  origem: OrigemEspecialista;
  id_externo: string | null;
  
  // Dados do SQL Server (AMSespecialistas)
  codigo: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  departamento: string | null;
  empresa: string | null;
  especialidade: string | null;
  nivel: string | null;
  observacoes: string | null;
  
  // Controle
  status: StatusEspecialista;
  
  // Auditoria
  autor_id: string | null;
  autor_nome: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// TIPOS PARA FORMULÁRIOS
// ============================================

export interface EspecialistaFormData {
  // Campos obrigatórios
  nome: string;
  
  // Campos opcionais
  codigo?: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  empresa?: string;
  especialidade?: string;
  nivel?: string;
  observacoes?: string;
  status?: StatusEspecialista;
}

// ============================================
// TIPOS PARA OPERAÇÕES DE BANCO
// ============================================

export interface EspecialistaInsert extends Omit<Especialista, 'id' | 'created_at' | 'updated_at'> {}

export interface EspecialistaUpdate extends Partial<Omit<Especialista, 'id' | 'created_at' | 'updated_at' | 'origem' | 'id_externo'>> {}

// ============================================
// TIPOS PARA FILTROS
// ============================================

export interface FiltrosEspecialistas {
  busca?: string;
  origem?: OrigemEspecialista | 'todos';
  status?: StatusEspecialista | 'todos';
  empresa?: string;
  departamento?: string;
  especialidade?: string;
  nivel?: string;
}

// ============================================
// TIPOS PARA ESTATÍSTICAS
// ============================================

export interface EstatisticasEspecialistas {
  total: number;
  ativos: number;
  inativos: number;
  sql_server: number;
  manuais: number;
  por_empresa: Record<string, number>;
  por_departamento: Record<string, number>;
  por_especialidade: Record<string, number>;
}

// ============================================
// TIPOS PARA SINCRONIZAÇÃO SQL SERVER
// ============================================

export interface DadosEspecialistaSqlServer {
  user_id: number;
  user_name: string;
  user_email: string;
  user_active: boolean;
  // Campo único para identificação
  id_unico?: string;
}

export interface ResultadoSincronizacaoEspecialistas {
  sucesso: boolean;
  total_processados: number;
  novos: number;
  atualizados: number;
  removidos: number;
  erros: number;
  mensagens: string[];
  detalhes_erros?: Array<{
    registro: Partial<DadosEspecialistaSqlServer>;
    erro: string;
  }>;
}

// ============================================
// CONSTANTES
// ============================================

export const ORIGEM_ESPECIALISTA_OPTIONS = [
  { value: 'todos', label: 'Todas as Origens' },
  { value: 'sql_server', label: 'SQL Server' },
  { value: 'manual', label: 'Manual' }
] as const;

export const STATUS_ESPECIALISTA_OPTIONS = [
  { value: 'todos', label: 'Todos os Status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' }
] as const;

// ============================================
// TIPOS PARA EXPORTAÇÃO
// ============================================

export interface DadosExportacaoEspecialistas {
  especialistas: Especialista[];
  filtros: FiltrosEspecialistas;
  estatisticas: EstatisticasEspecialistas;
}