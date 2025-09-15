import type { Database } from '@/integrations/supabase/types';

// Tipos base das tabelas
export type EmpresaCliente = Database['public']['Tables']['empresas_clientes']['Row'];
export type EmpresaClienteInsert = Database['public']['Tables']['empresas_clientes']['Insert'];
export type EmpresaClienteUpdate = Database['public']['Tables']['empresas_clientes']['Update'];

export type Colaborador = Database['public']['Tables']['colaboradores']['Row'];
export type ColaboradorInsert = Database['public']['Tables']['colaboradores']['Insert'];
export type ColaboradorUpdate = Database['public']['Tables']['colaboradores']['Update'];

export type GrupoResponsavel = Database['public']['Tables']['grupos_responsaveis']['Row'];
export type GrupoResponsavelInsert = Database['public']['Tables']['grupos_responsaveis']['Insert'];
export type GrupoResponsavelUpdate = Database['public']['Tables']['grupos_responsaveis']['Update'];

export type GrupoEmail = Database['public']['Tables']['grupo_emails']['Row'];
export type GrupoEmailInsert = Database['public']['Tables']['grupo_emails']['Insert'];

export type EmpresaProduto = Database['public']['Tables']['empresa_produtos']['Row'];
export type EmpresaProdutoInsert = Database['public']['Tables']['empresa_produtos']['Insert'];

export type HistoricoDisparo = Database['public']['Tables']['historico_disparos']['Row'];
export type HistoricoDisparoInsert = Database['public']['Tables']['historico_disparos']['Insert'];
export type HistoricoDisparoUpdate = Database['public']['Tables']['historico_disparos']['Update'];

export type ControleMensal = Database['public']['Tables']['controle_mensal']['Row'];
export type ControleMensalInsert = Database['public']['Tables']['controle_mensal']['Insert'];
export type ControleMensalUpdate = Database['public']['Tables']['controle_mensal']['Update'];

// Enums
export type StatusEmpresa = 'ativo' | 'inativo' | 'suspenso';
export type StatusColaborador = 'ativo' | 'inativo';
export type TemplatePadrao = 'portugues' | 'ingles';
export type Produto = 'CE_PLUS' | 'FISCAL' | 'GALLERY';
export type StatusDisparo = 'enviado' | 'falhou' | 'agendado' | 'cancelado';
export type StatusControleMensal = 'pendente' | 'enviado' | 'falhou' | 'agendado';

// Interfaces para formulários
export interface EmpresaFormData {
  nomeCompleto: string;
  nomeAbreviado: string;
  linkSharepoint?: string;
  templatePadrao: string; // Pode ser 'portugues', 'ingles' ou ID do template personalizado
  status: StatusEmpresa;
  descricaoStatus?: string;
  emailGestor?: string;
  produtos: Produto[];
  grupos: string[];
}

export interface ColaboradorFormData {
  nomeCompleto: string;
  email: string;
  funcao?: string;
  empresaId: string;
  status: StatusColaborador;
  descricaoStatus?: string;
  principalContato: boolean;
}

export interface GrupoFormData {
  nome: string;
  descricao?: string;
  emails: GrupoEmailFormData[];
}

export interface GrupoEmailFormData {
  email: string;
  nome?: string;
}

// Interfaces estendidas com relacionamentos
export interface EmpresaClienteCompleta extends EmpresaCliente {
  produtos?: EmpresaProduto[];
  colaboradores?: Colaborador[];
  grupos?: {
    grupo_id: string;
    grupos_responsaveis?: GrupoResponsavel;
  }[];
}

export interface GrupoResponsavelCompleto extends GrupoResponsavel {
  emails: GrupoEmail[];
}

export interface ColaboradorCompleto extends Colaborador {
  empresa: EmpresaCliente;
}

// Filtros para listagens
export interface EmpresaFiltros {
  status?: StatusEmpresa[];
  produtos?: Produto[];
  busca?: string;
}

export interface ColaboradorFiltros {
  empresaId?: string;
  status?: StatusColaborador[];
  busca?: string;
}

// Opções para selects
export interface SelectOption {
  value: string;
  label: string;
}

export const PRODUTOS_OPTIONS: SelectOption[] = [
  { value: 'CE_PLUS', label: 'CE Plus' },
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'GALLERY', label: 'Gallery' }
];

export const STATUS_EMPRESA_OPTIONS: SelectOption[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'suspenso', label: 'Suspenso' }
];

export const STATUS_COLABORADOR_OPTIONS: SelectOption[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' }
];

export const TEMPLATE_PADRAO_OPTIONS: SelectOption[] = [
  { value: 'portugues', label: 'Português' },
  { value: 'ingles', label: 'Inglês' }
];

export const STATUS_DISPARO_OPTIONS: SelectOption[] = [
  { value: 'enviado', label: 'Enviado' },
  { value: 'falhou', label: 'Falhou' },
  { value: 'agendado', label: 'Agendado' },
  { value: 'cancelado', label: 'Cancelado' }
];

export const STATUS_CONTROLE_MENSAL_OPTIONS: SelectOption[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'falhou', label: 'Falhou' },
  { value: 'agendado', label: 'Agendado' }
];

// Interfaces para sistema de disparos
export interface DisparoResult {
  sucesso: number;
  falhas: number;
  total: number;
  detalhes: DisparoDetalhe[];
}

export interface DisparoDetalhe {
  empresaId: string;
  colaboradorId: string;
  status: StatusDisparo;
  erro?: string;
  emailsEnviados: string[];
}

export interface StatusMensal {
  empresaId: string;
  empresa: EmpresaCliente;
  status: StatusControleMensal;
  dataProcessamento?: Date;
  observacoes?: string;
  colaboradoresAtivos: number;
  emailsEnviados: number;
}

export interface AgendamentoDisparo {
  empresaId: string;
  colaboradorIds: string[];
  dataAgendamento: Date;
  templateId?: string;
  observacoes?: string;
}

export interface HistoricoDisparoCompleto extends HistoricoDisparo {
  empresa?: EmpresaCliente;
  colaborador?: Colaborador;
}

export interface ControleMensalCompleto extends ControleMensal {
  empresa: EmpresaCliente;
}

// Filtros para disparos
export interface HistoricoFiltros {
  mes?: number;
  ano?: number;
  empresaId?: string;
  colaboradorId?: string;
  status?: StatusDisparo[];
  dataInicio?: Date;
  dataFim?: Date;
}

export interface ControleMensalFiltros {
  mes?: number;
  ano?: number;
  status?: StatusControleMensal[];
  empresaIds?: string[];
}

// Interfaces para histórico e relatórios
export interface RelatorioMetricas {
  totalEmpresas: number;
  empresasAtivas: number;
  totalColaboradores: number;
  colaboradoresAtivos: number;
  emailsEnviadosMes: number;
  emailsFalharamMes: number;
  taxaSucessoMes: number;
  empresasSemBooks: EmpresaCliente[];
}

export interface RelatorioDetalhado {
  mes: number;
  ano: number;
  metricas: RelatorioMetricas;
  historico: HistoricoDisparoCompleto[];
  controlesMensais: ControleMensalCompleto[];
}

export interface FiltrosAvancados extends HistoricoFiltros {
  incluirInativos?: boolean;
  apenasComFalhas?: boolean;
  apenasComSucesso?: boolean;
  empresasIds?: string[];
  colaboradoresIds?: string[];
}

export interface ExportacaoConfig {
  formato: 'csv' | 'excel' | 'pdf';
  incluirDetalhes: boolean;
  incluirMetricas: boolean;
  filtros: FiltrosAvancados;
}