export interface Step1DataFiscal {
  crm?: string;
  razaoSocial: string;
  cnpj: string;
  municipio: string;
  uf: string;
  responsavel: string;
  email: string;
}

export interface Step2DataFiscal {
  segmento: 'industria' | 'varejo' | 'outros' | 'utilities' | 'servico' | '';
  escopo: string[];
  quantidadeEmpresas: number;
  quantidadeUfs: number;
  volumetriaNotas: string;
  modalidade: 'on-premise' | 'saas' | '';
  prazoContratacao: number;
}

export interface FormDataFiscal extends Step1DataFiscal, Step2DataFiscal {
  step: number;
  completed: boolean;
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}