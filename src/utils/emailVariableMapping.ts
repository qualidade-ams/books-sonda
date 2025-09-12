/**
 * Sistema de mapeamento de variáveis para templates de email
 * Mapeia dados do formulário para variáveis utilizadas nos templates
 */

export interface FormularioData {
  // Dados básicos do formulário
  localizacao?: string;
  segmento?: string;
  escopo?: string[];
  escopoInbound?: string[];
  escopoOutbound?: string[];
  modelosNotas?: string[];
  cenariosNegocio?: string[];
  qtdEmpresas?: number;
  qtdUfs?: number;
  volumetria?: string;
  modalidade?: string;
  tempoContrato?: number; // em meses

  // Campos de quantidade específicos do Comply e-DOCS
  quantidadeNotasServicoMensal?: number;
  quantidadePrefeiturasOutbound?: number;
  quantidadeConcessionarias?: number;
  quantidadeFaturas?: number;

  // Valores totais (a serem definidos)
  valorLicencaUso?: number;
  valorManutencao?: number;
  valorSuporte?: number;

  // Valores específicos do Comply e-DOCS
  valorManutencaoEDocs?: number;
  valorLicencaUsoEDocs?: number;
  valorSaasED?: number;
  valorSSEDMensal?: number;

  // Valores SaaS específicos para e-DOCS
  hostingED?: number;
  devOpsED?: number;
  setupED?: number;

  // Valores SaaS
  hosting?: number;
  devOps?: number;
  setup?: number;
  valorSaas?: number;
  valorSSMensal?: number;
  valorSPMensal?: number;
  valorTotalMensalSaas?: number;

  // Outros dados existentes
  razaoSocial?: string;
  cnpj?: string;
  responsavel?: string;
  email?: string;

  // Novas variáveis do sistema
  horasAtendimento?: number;
  valorBAEDMensal?: number;
  mensagemBuscaAtiva?: string;
}

export interface VariaveisCalculadas {
  // Variáveis básicas
  localizacao: string;
  segmento: string;
  escopo: string;
  escopoInbound: string;
  escopoOutbound: string;
  modelosNotas: string;
  cenariosNegocio: string;
  qtdEmpresas: string;
  qtdUfs: string;
  volumetria: string;
  modalidade: string;
  tempoContrato: string;

  // Valores totais
  valorLicencaUso: string;
  valorManutencao: string;
  valorSuporte: string;

  // Valores específicos do Comply e-DOCS
  valorManutencaoEDocs: string;
  valorLicencaUsoEDocs: string;
  valorSaasED: string;
  valorSSEDMensal: string;
  valorMAEDMensal: string;
  valorTotalEDMensal: string;
  valorSSTotalEDMensal: string;

  // Valores SaaS específicos para e-DOCS
  hostingED: string;
  devOpsED: string;
  setupED: string;

  // Valores SaaS
  hosting: string;
  devOps: string;
  setup: string;
  valorSaas: string;
  valorSSMensal: string;
  valorTotalMensalSaas: string;

  // Valores mensais calculados
  valorLUMensal: string;
  valorMAMensal: string;
  valorSPMensal: string;
  valorTotalMensal: string;

  // Dados existentes
  razaoSocial: string;
  cnpj: string;
  responsavel: string;
  email: string;

  // Novas variáveis do sistema
  data: string;
  horasAtendimento: string;
  valorBAEDMensal: string;
  mensagemBuscaAtiva: string;
}

/**
 * Formata valor monetário para exibição
 */
const formatarValorMonetario = (valor: number): string => {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Mapeia valores de segmento para exibição
 */
const mapearSegmento = (segmento: string): string => {
  const mapeamento: { [key: string]: string } = {
    'industria': 'Indústria, Varejo ou Outros',
    'utilities': 'Utilities (Serviços Públicos - Energia, Água, Gás, Saneamento)',
    'servico': 'Serviço'
  };

  return mapeamento[segmento] || segmento;
};

/**
 * Mapeia valores de escopo para exibição
 */
const mapearEscopo = (escopo: string[]): string => {
  if (!escopo || escopo.length === 0) return '';

  const mapeamento: { [key: string]: string } = {
    'apuracao_icms': 'Fiscal',
    'apuracao_ipi': 'Fiscal',
    'apuracao_pis_cofins': 'Fiscal',
    'sped_fiscal': 'Fiscal',
    'sped_contabil': 'Contábil',
    'reinf': 'SPED REINF',
    'dctf': 'Fiscal',
    'gias': 'Fiscal',
    'substituicao_tributaria': 'Fiscal',
    'diferencial_aliquota': 'Fiscal',
    'bloco_k': 'Bloco K'
  };

  // Mapear escopos e remover duplicatas
  const escoposMapeados = escopo
    .map(item => mapeamento[item] || item)
    .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicatas

  if (escoposMapeados.length === 1) {
    return escoposMapeados[0];
  }

  return escoposMapeados.join('\n');
};

/**
 * Mapeia valores de escopo Inbound para exibição
 */
const mapearEscopoInbound = (escopoInbound: string[], dados?: FormularioData): string => {
  if (!escopoInbound || escopoInbound.length === 0) return '';

  // Verificar se os dados já estão mapeados (vêm do approvalService)
  const jaMapeado = escopoInbound.some(item =>
    item.includes('(') || item.includes('NF-e') || item.includes('CT-e') || item.includes('NFS-e')
  );

  if (jaMapeado) {
    console.log('🔍 Dados já mapeados pelo approvalService, retornando diretamente');
    return escopoInbound.join('\n');
  }

  // Ordem correta conforme o formulário
  const ordemCorreta = ['nfe', 'nfse', 'cte', 'cteo', 'faturas'];

  const mapeamento: { [key: string]: string } = {
    'nfe': 'NF-e (Nota Fiscal Eletrônica)',
    'nfse': 'NFS-e (Nota Fiscal de Serviço Eletrônica)',
    'cte': 'CT-e (Conhecimento de Transporte Eletrônico)',
    'cteo': 'CT-e OS (Conhecimento de transporte eletrônico - outros serviços)',
    'faturas': 'Faturas de Concessionárias'
  };

  // Ordenar conforme a ordem do formulário
  const escopoOrdenado = ordemCorreta.filter(item => escopoInbound.includes(item));

  const escoposMapeados = escopoOrdenado.map(item => {
    let itemMapeado = mapeamento[item] || item;

    // Debug para verificar se os dados estão chegando
    console.log(`🔍 Processando ${item}, dados:`, dados);

    // Adicionar informações condicionais para campos específicos
    if (dados) {
      if (item === 'nfse' && dados.quantidadeNotasServicoMensal && dados.quantidadeNotasServicoMensal > 0) {
        console.log(`✅ Adicionando notas de serviço mensal Inbound: ${dados.quantidadeNotasServicoMensal}`);
        itemMapeado += `\n&nbsp;&nbsp;&nbsp;<strong>→ Quantidade de Notas de Serviço Mensal:</strong> ${dados.quantidadeNotasServicoMensal}`;
      }

      if (item === 'faturas') {
        console.log(`🔍 Processando faturas, concessionárias: ${dados.quantidadeConcessionarias}, faturas: ${dados.quantidadeFaturas}`);
        const detalhes = [];
        if (dados.quantidadeConcessionarias && dados.quantidadeConcessionarias > 0) {
          console.log(`✅ Adicionando concessionárias: ${dados.quantidadeConcessionarias}`);
          detalhes.push(`&nbsp;&nbsp;&nbsp;<strong>→ Quantidade de Concessionárias:</strong> ${dados.quantidadeConcessionarias}`);
        }
        if (dados.quantidadeFaturas && dados.quantidadeFaturas > 0) {
          console.log(`✅ Adicionando faturas: ${dados.quantidadeFaturas}`);
          detalhes.push(`&nbsp;&nbsp;&nbsp;<strong>→ Quantidade de Faturas:</strong> ${dados.quantidadeFaturas}`);
        }
        if (detalhes.length > 0) {
          console.log(`✅ Detalhes adicionados:`, detalhes);
          itemMapeado += `:\n${detalhes.join('\n')}`;
        }
      }
    }

    console.log(`📄 Item final: "${itemMapeado}"`);
    return itemMapeado;
  });

  if (escoposMapeados.length === 1) {
    return escoposMapeados[0];
  }

  return escoposMapeados.join('\n');
};

/**
 * Mapeia valores de escopo Outbound para exibição
 */
const mapearEscopoOutbound = (escopoOutbound: string[], dados?: FormularioData): string => {
  if (!escopoOutbound || escopoOutbound.length === 0) return '';

  // Verificar se os dados já estão mapeados (vêm do approvalService)
  const jaMapeado = escopoOutbound.some(item =>
    item.includes('(') || item.includes('NF-e') || item.includes('CT-e') || item.includes('NFS-e')
  );

  if (jaMapeado) {
    console.log('🔍 Dados Outbound já mapeados pelo approvalService, retornando diretamente');
    return escopoOutbound.join('\n');
  }

  // Ordem correta conforme o formulário
  const ordemCorreta = ['nfe', 'nfse', 'cte', 'cteo'];

  const mapeamento: { [key: string]: string } = {
    'nfe': 'NF-e (Nota Fiscal Eletrônica)',
    'nfse': 'NFS-e (Nota Fiscal de Serviço Eletrônica)',
    'cte': 'CT-e (Conhecimento de Transporte Eletrônico)',
    'cteo': 'CT-e OS (Conhecimento de transporte eletrônico - outros serviços)'
  };

  // Ordenar conforme a ordem do formulário
  const escopoOrdenado = ordemCorreta.filter(item => escopoOutbound.includes(item));

  const escoposMapeados = escopoOrdenado.map(item => {
    let itemMapeado = mapeamento[item] || item;

    // Debug para verificar se os dados estão chegando
    console.log(`🔍 Processando Outbound ${item}, dados:`, dados);

    // Adicionar informações condicionais para campos específicos
    if (dados) {
      if (item === 'nfse' && dados.quantidadePrefeiturasOutbound && dados.quantidadePrefeiturasOutbound > 0) {
        console.log(`✅ Adicionando prefeituras Outbound: ${dados.quantidadePrefeiturasOutbound}`);
        itemMapeado += `\n&nbsp;&nbsp;&nbsp;<strong>→ Quantidade de Prefeituras:</strong> ${dados.quantidadePrefeiturasOutbound}`;
      }
    }

    console.log(`📄 Item Outbound final: "${itemMapeado}"`);
    return itemMapeado;
  });

  if (escoposMapeados.length === 1) {
    return escoposMapeados[0];
  }

  return escoposMapeados.join('\n');
};

/**
 * Mapeia valores de modelos de notas para exibição
 */
const mapearModelosNotas = (modelosNotas: string[]): string => {
  if (!modelosNotas || modelosNotas.length === 0) return '';

  // Verificar se os dados já estão mapeados (vêm do approvalService)
  const jaMapeado = modelosNotas.some(item =>
    item.includes('NF-e') || item.includes('CT-e') || item.includes('NFS-e') || item.includes('Faturas')
  );

  if (jaMapeado) {
    console.log('🔍 Modelos de notas já mapeados pelo approvalService, retornando diretamente');
    return modelosNotas.join(', ');
  }

  const mapeamento: { [key: string]: string } = {
    'nfe': 'NF-e',
    'cte': 'CT-e/CT-e OS',
    'nfse': 'NFS-e',
    'faturas': 'Faturas de Concessionárias'
  };

  const modelosMapeados = modelosNotas.map(item => mapeamento[item] || item);

  if (modelosMapeados.length === 1) {
    return modelosMapeados[0];
  }

  return modelosMapeados.join(', ');
};

/**
 * Mapeia valores de cenários de negócio para exibição
 */
const mapearCenariosNegocio = (cenariosNegocio: string[]): string => {
  if (!cenariosNegocio || cenariosNegocio.length === 0) return '';

  // Verificar se os dados já estão mapeados (vêm do approvalService)
  const jaMapeado = cenariosNegocio.some(item =>
    item.includes('Industrialização') || item.includes('Consumo') || item.includes('Ativo') || item.includes('Frete') || item.includes('Serviços') || item.includes('Outros')
  );

  if (jaMapeado) {
    console.log('🔍 Cenários de negócio já mapeados pelo approvalService, retornando diretamente');
    return cenariosNegocio.join(', ');
  }

  const mapeamento: { [key: string]: string } = {
    'industrializacao': 'Industrialização',
    'consumo': 'Consumo',
    'ativo_imobilizado': 'Ativo Imobilizado',
    'frete': 'Frete',
    'servicos': 'Serviços',
    'outros': 'Outros'
  };

  const cenariosMapeados = cenariosNegocio.map(item => mapeamento[item] || item);

  if (cenariosMapeados.length === 1) {
    return cenariosMapeados[0];
  }

  return cenariosMapeados.join(', ');
};

/**
 * Mapeia valores de modalidade para exibição
 */
const mapearModalidade = (modalidade: string): string => {
  const mapeamento: { [key: string]: string } = {
    'on-premise': 'On-premise (Instalação local)',
    'saas': 'SaaS (Software as a Service)'
  };

  return mapeamento[modalidade] || modalidade;
};

/**
 * Calcula valores mensais baseados nos valores totais e tempo de contrato
 */
const calcularValoresMensais = (
  valorTotal: number,
  tempoContrato: number
): number => {
  if (!tempoContrato || tempoContrato <= 0) return 0;
  return valorTotal / tempoContrato;
};

/**
 * Mapeia dados do formulário para variáveis do template
 */
export const mapearVariaveisTemplate = (dados: FormularioData): VariaveisCalculadas => {
  // Valores específicos do Comply Fiscal
  const valorLicencaUso = dados.valorLicencaUso || 0;
  const valorManutencao = dados.valorManutencao || 0;
  const valorSuporte = dados.valorSuporte || 0;
  const tempoContrato = dados.tempoContrato || 1;
  const hosting = dados.hosting || 0;
  const devOps = dados.devOps || 0;
  const setup = dados.setup || 0;
  const valorSaas = dados.valorSaas || 0;
  // Valores mensais
  const valorSSMensal = valorSaas / tempoContrato; // Calcula o valor mensal do SaaS

  const valorLUMensal = calcularValoresMensais(valorLicencaUso, tempoContrato);
  const valorMAMensal = calcularValoresMensais(valorManutencao, tempoContrato);
  const valorSPMensal = calcularValoresMensais(valorSuporte, tempoContrato);
  const valorTotalMensal = valorMAMensal + valorSPMensal; // Total = MA + SP (sem LU)

  // Calcular valorTotalMensalSaas após valorSPMensal estar disponível
  const valorTotalMensalSaas = valorSSMensal + valorSPMensal; // valorSSMensal + valorSPMensal

  // Valores específicos do Comply e-DOCS
  const valorManutencaoEDocs = dados.valorManutencaoEDocs || 0;
  const valorLicencaUsoEDocs = dados.valorLicencaUsoEDocs || 0;
  const valorSaasED = dados.valorSaasED || 0;
  const valorSSEDMensal = dados.valorSSEDMensal || 0;
  const hostingED = dados.hostingED || 0;
  const devOpsED = dados.devOpsED || 0;
  const setupED = dados.setupED || 0;
  const valorBAEDMensal = dados.valorBAEDMensal || 0;
  const mensagemBuscaAtiva = dados.mensagemBuscaAtiva || '';

  // Valores mensais
  const valorMAEDMensal = calcularValoresMensais(valorManutencaoEDocs, tempoContrato);
  const valorTotalEDMensal = valorMAEDMensal + valorBAEDMensal + valorSPMensal; // Total ED = MA ED + BA ED + SP (sem LU)
  
  // Nova variável: valorSSTotalEDMensal = valorSSEDMensal + valorBAEDMensal + valorSPMensal
  const valorSSTotalEDMensal = valorSSEDMensal + valorBAEDMensal + valorSPMensal;

  return {
    // Variáveis básicas
    localizacao: dados.localizacao || '',
    segmento: mapearSegmento(dados.segmento || ''),
    escopo: mapearEscopo(dados.escopo || []),
    escopoInbound: mapearEscopoInbound(dados.escopoInbound || [], dados),
    escopoOutbound: mapearEscopoOutbound(dados.escopoOutbound || [], dados),
    modelosNotas: mapearModelosNotas(dados.modelosNotas || []),
    cenariosNegocio: mapearCenariosNegocio(dados.cenariosNegocio || []),
    qtdEmpresas: String(dados.qtdEmpresas || 0),
    qtdUfs: String(dados.qtdUfs || 0),
    volumetria: dados.volumetria || '',
    modalidade: mapearModalidade(dados.modalidade || ''),
    tempoContrato: String(tempoContrato),

    // Valores totais formatados
    valorLicencaUso: formatarValorMonetario(valorLicencaUso),
    valorManutencao: formatarValorMonetario(valorManutencao),
    valorSuporte: formatarValorMonetario(valorSuporte),

    // Valores específicos do Comply e-DOCS formatados
    valorManutencaoEDocs: formatarValorMonetario(valorManutencaoEDocs),
    valorLicencaUsoEDocs: formatarValorMonetario(valorLicencaUsoEDocs),
    valorSaasED: formatarValorMonetario(valorSaasED),
    valorSSEDMensal: formatarValorMonetario(valorSSEDMensal),
    valorMAEDMensal: formatarValorMonetario(valorMAEDMensal),
    valorTotalEDMensal: formatarValorMonetario(valorTotalEDMensal),
    valorSSTotalEDMensal: formatarValorMonetario(valorSSTotalEDMensal),

    // Valores SaaS específicos para e-DOCS formatados
    hostingED: formatarValorMonetario(hostingED),
    devOpsED: formatarValorMonetario(devOpsED),
    setupED: formatarValorMonetario(setupED),

    // Valores SaaS formatados
    hosting: formatarValorMonetario(hosting),
    devOps: formatarValorMonetario(devOps),
    setup: formatarValorMonetario(setup),
    valorSaas: formatarValorMonetario(valorSaas),
    valorSSMensal: formatarValorMonetario(valorSSMensal),
    valorTotalMensalSaas: formatarValorMonetario(valorTotalMensalSaas),

    // Valores mensais formatados
    valorLUMensal: formatarValorMonetario(valorLUMensal),
    valorMAMensal: formatarValorMonetario(valorMAMensal),
    valorSPMensal: formatarValorMonetario(valorSPMensal),
    valorTotalMensal: formatarValorMonetario(valorTotalMensal),

    // Dados existentes
    razaoSocial: dados.razaoSocial || '',
    cnpj: dados.cnpj || '',
    responsavel: dados.responsavel || '',
    email: dados.email || '',

    // Novas variáveis do sistema
    data: new Date().toLocaleDateString('pt-BR'), // DD/MM/YYYY
    horasAtendimento: `${dados.horasAtendimento || 0} horas/mês`,
    valorBAEDMensal: formatarValorMonetario(valorBAEDMensal),
    mensagemBuscaAtiva: mensagemBuscaAtiva,
  };
};

/**
 * Substitui variáveis no template com os valores mapeados
 */
export const substituirVariaveisTemplate = (
  template: string,
  variaveis: VariaveisCalculadas
): string => {
  let templateProcessado = template;

  // Substituir cada variável no template
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const regex = new RegExp(`{{${chave}}}`, 'g');

    // Normalizar valor para evitar diferenças entre ambientes
    let valorProcessado = valor;

    // Garantir que o valor seja uma string
    if (typeof valorProcessado !== 'string') {
      valorProcessado = String(valorProcessado || '');
    }

    // Escapar caracteres especiais para HTML se necessário
    if (/<[^>]+>/.test(template)) {
      // É um template HTML
      if (valor.includes('\n')) {
        // Apenas escopoInbound, escopoOutbound e escopo usam quebras de linha (<br>)
        if (chave === 'escopoInbound' || chave === 'escopoOutbound' || chave === 'escopo') {
          valorProcessado = valor.replace(/\n/g, '<br>');
        }
        // modelosNotas e cenariosNegocio usam vírgulas (já vêm formatados corretamente)
        else if (chave === 'modelosNotas' || chave === 'cenariosNegocio') {
          // Manter como está (vírgulas)
          valorProcessado = valor;
        }
        // Outras variáveis com \n também usam <br>
        else {
          valorProcessado = valor.replace(/\n/g, '<br>');
        }
      }

      // Processar entidades HTML antes de escapar caracteres especiais
      valorProcessado = valorProcessado
        .replace(/&nbsp;/g, '\u00A0')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        // Restaurar tags HTML permitidas que escapamos acidentalmente
        .replace(/&lt;br&gt;/g, '<br>')
        .replace(/&lt;strong&gt;/g, '<strong>')
        .replace(/&lt;\/strong&gt;/g, '</strong>');
    }

    templateProcessado = templateProcessado.replace(regex, valorProcessado);
  });

  return templateProcessado;
};

/**
 * Lista todas as variáveis disponíveis para uso nos templates
 */
export const obterVariaveisDisponiveis = (): { [categoria: string]: string[] } => {
  return {
    'Dados Básicos': [
      'localizacao',
      'segmento',
      'escopo',
      'escopoInbound',
      'escopoOutbound',
      'modelosNotas',
      'cenariosNegocio',
      'qtdEmpresas',
      'qtdUfs',
      'volumetria',
      'modalidade',
      'tempoContrato'
    ],
    'Valores Totais': [
      'valorLicencaUso',
      'valorManutencao',
      'valorSuporte',
      'valorManutencaoEDocs',
      'valorLicencaUsoEDocs'
    ],
    'Valores SaaS': [
      'hosting',
      'devOps',
      'setup',
      'valorSaas',
      'valorSSMensal',
      'valorTotalMensalSaas'
    ],
    'Valores SaaS e-DOCS': [
      'hostingED',
      'devOpsED',
      'setupED',
      'valorSaasED',
      'valorSSEDMensal'
    ],
    'Valores Mensais': [
      'valorLUMensal',
      'valorMAMensal',
      'valorSPMensal',
      'valorTotalMensal',
      'valorMAEDMensal',
      'valorTotalEDMensal'
    ],
    'Dados da Empresa': [
      'razaoSocial',
      'cnpj',
      'responsavel',
      'email'
    ],
    'Sistema': [
      'data',
      'horasAtendimento',
      'valorBAEDMensal',
      'mensagemBuscaAtiva'
    ]
  };
};

/**
 * Valida se todas as variáveis no template têm valores correspondentes
 */
export const validarVariaveisTemplate = (
  template: string,
  variaveis: VariaveisCalculadas
): { valido: boolean; variaveisNaoEncontradas: string[] } => {
  const regex = /{{(\w+)}}/g;
  const variaveisEncontradas = new Set<string>();
  const variaveisNaoEncontradas: string[] = [];

  let match;
  while ((match = regex.exec(template)) !== null) {
    const nomeVariavel = match[1];
    variaveisEncontradas.add(nomeVariavel);

    if (!(nomeVariavel in variaveis)) {
      variaveisNaoEncontradas.push(nomeVariavel);
    }
  }

  return {
    valido: variaveisNaoEncontradas.length === 0,
    variaveisNaoEncontradas
  };
};