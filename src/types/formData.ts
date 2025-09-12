
export interface Step1Data {
  crm?: string;
  razaoSocial: string;
  cnpj: string;
  municipio: string;
  uf: string;
  responsavel: string;
  email: string;
}

export interface Step2Data {
  segmento: 'industria' | 'varejo' | 'utilities' | 'servico' | '';
  escopoInbound: string[];
  escopoOutbound: string[];
  modelosNotas: string[];
  cenariosNegocio: string[];
  outrosCenarioNegocio?: string;
  quantidadeEmpresas: number;
  quantidadeUfs: number;
  quantidadePrefeituras?: number;
  quantidadeNotasServicoMensal?: number;
  quantidadePrefeiturasOutbound?: number;
  quantidadeConcessionarias?: number;
  quantidadeFaturas?: number;
  volumetriaNotas: string;
  modalidade: 'on-premise' | 'saas' | '';
  prazoContratacao: number;
}

export interface FormData extends Step1Data, Step2Data {
  step: number;
  completed: boolean;
}

export interface QuoteCalculation {
  baseValue: number;
  segments: Record<string, number>;
  scopes: Record<string, number>;
  volume: Record<string, number>;
  modality: Record<string, number>;
  term: Record<string, number>;
  finalValue: number;
}
