// Tipos específicos para o Sistema de Gerenciamento de Clientes e Books

import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Tipos base das tabelas
export type EmpresaCliente = Tables<'empresas_clientes'>;
export type EmpresaClienteInsert = TablesInsert<'empresas_clientes'>;
export type EmpresaClienteUpdate = TablesUpdate<'empresas_clientes'>;

export type EmpresaProduto = Tables<'empresa_produtos'>;
export type EmpresaProdutoInsert = TablesInsert<'empresa_produtos'>;
export type EmpresaProdutoUpdate = TablesUpdate<'empresa_produtos'>;

export type GrupoResponsavel = Tables<'grupos_responsaveis'>;
export type GrupoResponsavelInsert = TablesInsert<'grupos_responsaveis'>;
export type GrupoResponsavelUpdate = TablesUpdate<'grupos_responsaveis'>;

export type GrupoEmail = Tables<'grupo_emails'>;
export type GrupoEmailInsert = TablesInsert<'grupo_emails'>;
export type GrupoEmailUpdate = TablesUpdate<'grupo_emails'>;

export type EmpresaGrupo = Tables<'empresa_grupos'>;
export type EmpresaGrupoInsert = TablesInsert<'empresa_grupos'>;
export type EmpresaGrupoUpdate = TablesUpdate<'empresa_grupos'>;

export type Cliente = Tables<'clientes'>;
export type ClienteInsert = TablesInsert<'clientes'>;
export type ClienteUpdate = TablesUpdate<'clientes'>;

export type HistoricoDisparo = Tables<'historico_disparos'>;
export type HistoricoDisparoInsert = TablesInsert<'historico_disparos'>;
export type HistoricoDisparoUpdate = TablesUpdate<'historico_disparos'>;

export type ControleMensal = Tables<'controle_mensal'>;
export type ControleMensalInsert = TablesInsert<'controle_mensal'>;
export type ControleMensalUpdate = TablesUpdate<'controle_mensal'>;

// Enums e constantes
export const EMPRESA_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo',
  SUSPENSO: 'suspenso'
} as const;

export const Cliente_STATUS = {
  ATIVO: 'ativo',
  INATIVO: 'inativo'
} as const;

export const TEMPLATE_PADRAO = {
  PORTUGUES: 'portugues',
  INGLES: 'ingles'
} as const;

export const PRODUTOS = {
  CE_PLUS: 'CE_PLUS',
  FISCAL: 'FISCAL',
  GALLERY: 'GALLERY'
} as const;

export const DISPARO_STATUS = {
  ENVIADO: 'enviado',
  FALHOU: 'falhou',
  AGENDADO: 'agendado',
  CANCELADO: 'cancelado'
} as const;

export const CONTROLE_STATUS = {
  PENDENTE: 'pendente',
  ENVIADO: 'enviado',
  FALHOU: 'falhou',
  AGENDADO: 'agendado'
} as const;

// Tipos derivados e interfaces estendidas
export interface EmpresaClienteCompleta extends EmpresaCliente {
  produtos: EmpresaProduto[];
  grupos: GrupoResponsavel[];
  clientes: Cliente[];
}

export interface ClienteCompleto extends Cliente {
  empresa: EmpresaCliente;
}

export interface GrupoResponsavelCompleto extends GrupoResponsavel {
  emails: GrupoEmail[];
}

export interface HistoricoDisparoCompleto extends HistoricoDisparo {
  empresa?: EmpresaCliente;
  cliente?: Cliente;
}

// Interfaces para formulários
export interface EmpresaFormData {
  nomeCompleto: string;
  nomeAbreviado: string;
  linkSharepoint?: string;
  templatePadrao: TemplatePadrao;
  status: EmpresaStatus;
  descricaoStatus?: string;
  emailGestor?: string;
  produtos: Produto[];
  grupos: string[];
  bookPersonalizado?: boolean;
  anexo?: boolean;
  vigenciaInicial?: string;
  vigenciaFinal?: string;
}

export interface ClienteFormData {
  nomeCompleto: string;
  email: string;
  funcao?: string;
  empresaId: string;
  status: ClienteStatus;
  descricaoStatus?: string;
  principalContato: boolean;
}

export interface GrupoFormData {
  nome: string;
  descricao?: string;
  emails: Array<{
    email: string;
    nome?: string;
  }>;
}

// Interfaces para filtros
export interface EmpresaFiltros {
  status?: EmpresaStatus[];
  produtos?: Produto[];
  busca?: string;
}

export interface ClienteFiltros {
  empresaId?: string;
  status?: ClienteStatus[];
  busca?: string;
}

export interface HistoricoFiltros {
  empresaId?: string;
  clienteId?: string;
  status?: keyof typeof DISPARO_STATUS;
  dataInicio?: string;
  dataFim?: string;
  mes?: number;
  ano?: number;
}

// Interfaces para resultados de operações
export interface ImportResult {
  sucesso: number;
  erros: number;
  detalhes: Array<{
    linha: number;
    erro?: string;
    dados?: any;
  }>;
}

export interface DisparoResult {
  totalEmpresas: number;
  sucessos: number;
  falhas: number;
  detalhes: Array<{
    empresaId: string;
    clienteId: string;
    status: keyof typeof DISPARO_STATUS;
    erro?: string;
  }>;
}

export interface StatusMensal {
  empresaId: string;
  empresa: EmpresaCliente;
  status: keyof typeof CONTROLE_STATUS;
  dataProcessamento?: string;
  observacoes?: string;
}

// Interfaces para variáveis de template
export interface TemplateVariables {
  empresa: EmpresaCliente;
  cliente: Cliente;
  disparo: {
    mes: number;
    ano: number;
    dataDisparo: Date;
  };
}

// Opções para selects
export interface SelectOption {
  value: string;
  label: string;
}

export const STATUS_EMPRESA_OPTIONS: SelectOption[] = [
  { value: EMPRESA_STATUS.ATIVO, label: 'Ativo' },
  { value: EMPRESA_STATUS.INATIVO, label: 'Inativo' },
  { value: EMPRESA_STATUS.SUSPENSO, label: 'Suspenso' }
];

export const STATUS_Cliente_OPTIONS: SelectOption[] = [
  { value: Cliente_STATUS.ATIVO, label: 'Ativo' },
  { value: Cliente_STATUS.INATIVO, label: 'Inativo' }
];

export const TEMPLATE_PADRAO_OPTIONS: SelectOption[] = [
  { value: TEMPLATE_PADRAO.PORTUGUES, label: 'Português' },
  { value: TEMPLATE_PADRAO.INGLES, label: 'Inglês' }
];

export const PRODUTOS_OPTIONS: SelectOption[] = [
  { value: PRODUTOS.CE_PLUS, label: 'CE Plus' },
  { value: PRODUTOS.FISCAL, label: 'Fiscal' },
  { value: PRODUTOS.GALLERY, label: 'Gallery' }
];

// Tipos para validação
export type EmpresaStatus = typeof EMPRESA_STATUS[keyof typeof EMPRESA_STATUS];
export type ClienteStatus = typeof Cliente_STATUS[keyof typeof Cliente_STATUS];
export type TemplatePadrao = typeof TEMPLATE_PADRAO[keyof typeof TEMPLATE_PADRAO];
export type Produto = typeof PRODUTOS[keyof typeof PRODUTOS];
export type DisparoStatus = typeof DISPARO_STATUS[keyof typeof DISPARO_STATUS];
export type ControleStatus = typeof CONTROLE_STATUS[keyof typeof CONTROLE_STATUS];