import type { Database } from '@/integrations/supabase/types';

// Tipos base das tabelas
export type EmpresaCliente = Database['public']['Tables']['empresas_clientes']['Row'];
export type EmpresaClienteInsert = Database['public']['Tables']['empresas_clientes']['Insert'];
export type EmpresaClienteUpdate = Database['public']['Tables']['empresas_clientes']['Update'];

export type Cliente = Database['public']['Tables']['clientes']['Row'];
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert'];
export type ClienteUpdate = Database['public']['Tables']['clientes']['Update'];

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

// Tipos para sistema de anexos
export type AnexoTemporario = {
  id: string;
  empresa_id: string;
  nome_original: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  url_temporaria: string;
  url_permanente?: string;
  status: 'pendente' | 'enviando' | 'processado' | 'erro';
  token_acesso: string;
  data_upload: string;
  data_expiracao: string;
  data_processamento?: string;
  erro_detalhes?: string;
  created_at: string;
  updated_at: string;
};

export type AnexoTemporarioInsert = Omit<AnexoTemporario, 'id' | 'created_at' | 'updated_at' | 'data_upload' | 'data_expiracao'>;
export type AnexoTemporarioUpdate = Partial<Omit<AnexoTemporario, 'id' | 'created_at' | 'updated_at'>>;

// Enums
export type StatusEmpresa = 'ativo' | 'inativo' | 'suspenso';
export type StatusCliente = 'ativo' | 'inativo';
export type TemplatePadrao = 'portugues' | 'ingles';
export type Produto = 'COMEX' | 'FISCAL' | 'GALLERY';
export type StatusDisparo = 'enviado' | 'falhou' | 'agendado' | 'cancelado';
export type StatusControleMensal = 'pendente' | 'enviado' | 'falhou' | 'agendado';
export type TipoBook = 'nao_tem_book' | 'outros' | 'qualidade';
export type TipoCobranca = 'banco_horas' | 'ticket' | 'outros';
export type StatusAnexo = 'pendente' | 'enviando' | 'processado' | 'erro';

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
  temAms?: boolean;
  tipoBook?: TipoBook;
  tipoCobranca?: TipoCobranca;
  vigenciaInicial?: string;
  vigenciaFinal?: string;
  bookPersonalizado?: boolean;
  anexo?: boolean;
  observacao?: string;
}

export interface ClienteFormData {
  nomeCompleto: string;
  email: string;
  funcao?: string;
  empresaId: string;
  status: StatusCliente;
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

// Interfaces para sistema de anexos
export interface AnexoData {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  status: StatusAnexo;
  empresaId: string;
  dataUpload: Date;
  dataExpiracao: Date;
}

export interface AnexoWebhookData {
  url: string;
  nome: string;
  tipo: string;
  tamanho: number;
  token: string;
}

export interface AnexosSummary {
  totalArquivos: number;
  tamanhoTotal: number;
  tamanhoLimite: number;
  podeAdicionar: boolean;
}

export interface AnexosSummaryWebhook {
  totalArquivos: number;
  tamanhoTotal: number;
  arquivos: AnexoWebhookData[];
}

// Interfaces estendidas com relacionamentos
export interface EmpresaClienteCompleta extends EmpresaCliente {
  produtos?: EmpresaProduto[];
  grupos?: {
    grupo_id: string;
    grupos_responsaveis?: GrupoResponsavel;
  }[];
}

export interface GrupoResponsavelCompleto extends GrupoResponsavel {
  emails: GrupoEmail[];
}

export interface ClienteCompleto extends Cliente {
  empresa: EmpresaCliente;
}

// Filtros para listagens
export interface EmpresaFiltros {
  status?: StatusEmpresa[];
  produtos?: Produto[];
  busca?: string;
  temAms?: boolean;
}

export interface ClienteFiltros {
  empresaId?: string;
  status?: StatusCliente[];
  busca?: string;
}

// Opções para selects
export interface SelectOption {
  value: string;
  label: string;
}

export const PRODUTOS_OPTIONS: SelectOption[] = [
  { value: 'COMEX', label: 'Comex' },
  { value: 'FISCAL', label: 'Fiscal' },
  { value: 'GALLERY', label: 'Gallery' }
];

export const STATUS_EMPRESA_OPTIONS: SelectOption[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'suspenso', label: 'Suspenso' }
];

export const STATUS_CLIENTE_OPTIONS: SelectOption[] = [
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

export const TIPO_BOOK_OPTIONS: SelectOption[] = [
  { value: 'nao_tem_book', label: 'Não tem Book' },
  { value: 'outros', label: 'Outros' },
  { value: 'qualidade', label: 'Qualidade' }
];

export const TIPO_COBRANCA_OPTIONS: SelectOption[] = [
  { value: 'banco_horas', label: 'Banco de Horas' },
  { value: 'ticket', label: 'Ticket' },
  { value: 'outros', label: 'Outros' }
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
  clienteId: string;
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
  clientesAtivos: number;
  emailsEnviados: number;
}

export interface AgendamentoDisparo {
  empresaId: string;
  clienteIds: string[];
  dataAgendamento: Date;
  templateId?: string;
  observacoes?: string;
}

export interface DisparoComAnexos {
  empresaId: string;
  clientes: Cliente[];
  emailsCC: string[];
  anexos?: AnexoWebhookData[];
}

export interface HistoricoDisparoCompleto extends HistoricoDisparo {
  empresas_clientes?: EmpresaCliente;
  clientes?: Cliente;
  anexo?: AnexoTemporario;
}

export interface HistoricoDisparoComAnexo extends HistoricoDisparo {
  anexo?: {
    id: string;
    nome_original: string;
    tamanho_bytes: number;
    status: StatusAnexo;
    url_temporaria?: string;
    data_upload: string;
    data_expiracao: string;
  };
}

export interface ControleMensalCompleto extends ControleMensal {
  empresa: EmpresaCliente;
}

// Filtros para disparos
export interface HistoricoFiltros {
  mes?: number;
  ano?: number;
  empresaId?: string;
  clienteId?: string;
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
  totalClientes: number;
  clientesAtivos: number;
  emailsEnviadosMes: number;
  emailsFalharamMes: number;
  taxaSucessoMes: number;
  empresasSemBooks: EmpresaCliente[];
  empresasComBooks: EmpresaCliente[];
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
  clientesIds?: string[];
}

export interface ExportacaoConfig {
  formato: 'csv' | 'excel' | 'pdf';
  incluirDetalhes: boolean;
  incluirMetricas: boolean;
  filtros: FiltrosAvancados;
}