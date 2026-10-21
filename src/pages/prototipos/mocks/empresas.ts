// Dados FICTÍCIOS do protótipo de Empresas (DS v2). Nenhum nome, e-mail ou dado real de cliente.
// O catálogo (Solução › Produto › Módulo) está em catalogo.ts.
import { idProduto, idModulo, type SolucaoCodigo } from './catalogo';

export type { SolucaoCodigo };
export type ModeloCalculo = 'legado' | 'multiplo' | 'liberada';

export interface EmpresaListaMock {
  id: string;
  nomeAbreviado: string;
  nomeCompleto: string;
  status: 'ativo' | 'inativo';
  temAms: boolean;
  emProjeto: boolean;
  /** A empresa contrata soluções (decisão de 21/10/2026) */
  solucoes: SolucaoCodigo[];
  /** Soluções com AMS; temAms = alguma solução com AMS */
  solucoesAms: SolucaoCodigo[];
  /** Soluções em projeto, com a justificativa; emProjeto = alguma solução em projeto */
  projetos: ProjetosMock;
  modelo: ModeloCalculo;
  bancos: number;
  /** RN-35: informações novas ainda não preenchidas */
  pendente: boolean;
  emailCs: string;
  emailComercial: string;
  /** Nome vindo do cadastro de usuários (profiles.full_name) pelo e-mail; '' = e-mail sem cadastro */
  nomeCs: string;
  nomeComercial: string;
  observacao: string;
}

/** Solução em projeto → breve justificativa (o "em projeto" é por solução) */
export type ProjetosMock = Partial<Record<SolucaoCodigo, string>>;

type EmpresaBase = Omit<
  EmpresaListaMock,
  | 'emailCs'
  | 'emailComercial'
  | 'nomeCs'
  | 'nomeComercial'
  | 'observacao'
  | 'solucoesAms'
  | 'projetos'
>;

/** Nomes fictícios dos responsáveis (Customer Success e Comercial) */
const NOMES_CS = ['Ana Teste', 'Bruno Teste', 'Carla Teste', 'Diego Teste'];
const NOMES_COMERCIAL = ['Eduardo Teste', 'Fernanda Teste', 'Gustavo Teste'];

/** Observações fictícias (no legado, aparecem no ícone ao lado do nome) */
const OBSERVACOES: Record<string, string> = {
  alfa: 'Cliente com janela de atualização trimestral.',
  delta: 'Aguardando renovação do contrato GALLERY.',
  iota: 'Book enviado também para a matriz.',
};

/** Justificativas fictícias dos produtos em projeto */
const PROJETOS: Record<string, ProjetosMock> = {
  alfa: { FISCAIS: 'Implantação do GALLERY em andamento, previsão de conclusão em 03/2027.' },
  gama: { FISCAIS: 'Migração do COMPLY para a nova versão.' },
  iota: { FISCAIS: 'Projeto de reforma tributária em execução.' },
};

const BASE_LISTA: EmpresaBase[] = [
  {
    id: 'alfa',
    nomeAbreviado: 'EMPRESA ALFA',
    nomeCompleto: 'EMPRESA ALFA INDÚSTRIA E COMÉRCIO S.A.',
    status: 'ativo',
    emProjeto: true,
    temAms: true,
    solucoes: ['COMEX', 'FISCAIS'],
    modelo: 'legado',
    bancos: 3,
    pendente: false,
  },
  {
    id: 'beta',
    nomeAbreviado: 'EMPRESA BETA',
    nomeCompleto: 'EMPRESA BETA PARTICIPAÇÕES LTDA',
    status: 'ativo',
    emProjeto: false,
    temAms: true,
    solucoes: ['FISCAIS'],
    modelo: 'legado',
    bancos: 1,
    pendente: true,
  },
  {
    id: 'gama',
    nomeAbreviado: 'EMPRESA GAMA',
    nomeCompleto: 'EMPRESA GAMA MINERAÇÃO S.A.',
    status: 'ativo',
    emProjeto: true,
    temAms: true,
    solucoes: ['COMEX', 'FISCAIS'],
    modelo: 'liberada',
    bancos: 2,
    pendente: false,
  },
  {
    id: 'delta',
    nomeAbreviado: 'EMPRESA DELTA',
    nomeCompleto: 'EMPRESA DELTA ENERGIA S.A.',
    status: 'ativo',
    emProjeto: false,
    temAms: true,
    solucoes: ['FISCAIS'],
    modelo: 'legado',
    bancos: 1,
    pendente: true,
  },
  {
    id: 'epsilon',
    nomeAbreviado: 'EMPRESA ÉPSILON',
    nomeCompleto: 'EMPRESA ÉPSILON QUÍMICA LTDA',
    status: 'ativo',
    emProjeto: false,
    temAms: true,
    solucoes: ['FISCAIS'],
    modelo: 'multiplo',
    bancos: 2,
    pendente: false,
  },
  {
    id: 'zeta',
    nomeAbreviado: 'EMPRESA ZETA',
    nomeCompleto: 'EMPRESA ZETA FARMACÊUTICA S.A.',
    status: 'ativo',
    emProjeto: false,
    temAms: false,
    solucoes: ['COMEX'],
    modelo: 'legado',
    bancos: 0,
    pendente: true,
  },
  {
    id: 'eta',
    nomeAbreviado: 'EMPRESA ETA',
    nomeCompleto: 'EMPRESA ETA ALIMENTOS LTDA',
    status: 'inativo',
    emProjeto: false,
    temAms: true,
    solucoes: ['FISCAIS'],
    modelo: 'legado',
    bancos: 1,
    pendente: false,
  },
  {
    id: 'teta',
    nomeAbreviado: 'EMPRESA TETA',
    nomeCompleto: 'EMPRESA TETA VAREJO S.A.',
    status: 'ativo',
    emProjeto: false,
    temAms: true,
    solucoes: ['COMEX', 'FISCAIS'],
    modelo: 'legado',
    bancos: 1,
    pendente: false,
  },
  {
    id: 'iota',
    nomeAbreviado: 'EMPRESA IOTA',
    nomeCompleto: 'EMPRESA IOTA AUTOPEÇAS LTDA',
    status: 'ativo',
    emProjeto: true,
    temAms: true,
    solucoes: ['FISCAIS'],
    modelo: 'legado',
    bancos: 1,
    pendente: true,
  },
  {
    id: 'kapa',
    nomeAbreviado: 'EMPRESA KAPA',
    nomeCompleto: 'EMPRESA KAPA SIDERURGIA S.A.',
    status: 'inativo',
    emProjeto: false,
    temAms: false,
    solucoes: ['COMEX'],
    modelo: 'legado',
    bancos: 0,
    pendente: false,
  },
];

export const EMPRESAS_LISTA_MOCK: EmpresaListaMock[] = BASE_LISTA.map((e, i) => ({
  ...e,
  emailCs: `cs.${e.id}@exemplo.com`,
  // Opcional no cadastro: algumas empresas ficam sem
  emailComercial: i % 3 === 2 ? '' : `comercial.${e.id}@exemplo.com`,
  // Um e-mail sem cadastro de usuário mostra o próprio e-mail no lugar do nome
  nomeCs: i === 4 ? '' : NOMES_CS[i % NOMES_CS.length],
  nomeComercial: i % 3 === 2 ? '' : NOMES_COMERCIAL[i % NOMES_COMERCIAL.length],
  observacao: OBSERVACOES[e.id] ?? '',
  projetos: PROJETOS[e.id] ?? {},
  // Gama tem AMS só em parte das soluções, para mostrar o caso misto
  solucoesAms: !e.temAms ? [] : e.id === 'gama' ? ['FISCAIS'] : e.solucoes,
}));

export const TOTAIS_EMPRESAS_MOCK = { total: 190, ativas: 151, inativas: 39, pendentes: 47 };

// ---------------------------------------------------------------------------
// Detalhe da Empresa Alfa
// ---------------------------------------------------------------------------

/** Identidade (tabela `empresas` da Fase 1). Datas no formato do input date (AAAA-MM-DD). */
export const IDENTIDADE_ALFA_MOCK = {
  nomeAbreviado: 'EMPRESA ALFA',
  nomeCompleto: 'EMPRESA ALFA INDÚSTRIA E COMÉRCIO S.A.',
  /** Opcional; '' = sem grupo */
  grupoEmpresarial: 'GRUPO ÔMEGA',
  status: 'Ativa',
  temAms: true,
  emProjeto: true,
  vigenciaInicio: '2026-01-01',
  vigenciaFim: '',
  solucoes: ['COMEX', 'FISCAIS'] as SolucaoCodigo[],
  solucoesAms: ['COMEX', 'FISCAIS'] as SolucaoCodigo[],
  projetos: PROJETOS.alfa,
  emailCustomerSuccess: 'cs.alfa@exemplo.com',
  emailComercial: 'comercial.alfa@exemplo.com',
  emailTm: '',
  observacao: 'Cliente com janela de atualização trimestral.',
  /** ids de GRUPOS_RESPONSAVEIS_MOCK: os e-mails desses grupos vão em CC em todo disparo do Book */
  grupos: ['g1', 'g3'],
  anexos: [
    { id: 'a1', nome: 'Proposta comercial 2026.pdf', tamanho: '1,2 MB' },
    { id: 'a2', nome: 'Matriz de escalonamento.xlsx', tamanho: '84 KB' },
  ] as AnexoMock[],
};
export type IdentidadeMock = typeof IDENTIDADE_ALFA_MOCK;

export interface AnexoMock {
  id: string;
  nome: string;
  tamanho: string;
}

/** Cadastro próprio (Grupos de Responsáveis); nomes fictícios */
export const GRUPOS_RESPONSAVEIS_MOCK = [
  { id: 'g1', nome: 'Gestão AMS', descricao: 'Gerentes de serviço AMS' },
  { id: 'g2', nome: 'Qualidade', descricao: 'Equipe de qualidade dos Books' },
  { id: 'g3', nome: 'Diretoria de Operações', descricao: '' },
  { id: 'g4', nome: 'Comercial Sul', descricao: 'Executivos de conta da região Sul' },
];

/** Regras do legado (empresaAnexosService.ts): até 5 arquivos, 10 MB cada */
export const LIMITE_ANEXOS = {
  quantidade: 5,
  megabytes: 10,
  tipos: 'PDF, Office, imagem, TXT, CSV, ZIP, RAR ou MSG',
};

export const RAMOS_MOCK = [
  'Alimentos e Bebidas',
  'Energia',
  'Farmacêutico',
  'Mineração',
  'Químico e Petroquímico',
  'Varejo',
];

/** Grupos empresariais já usados em outras empresas: sugestões ao digitar, para não repetir com outra grafia */
export const GRUPOS_EMPRESARIAIS_MOCK = ['GRUPO ÔMEGA', 'GRUPO SIGMA', 'GRUPO LAMBDA'];

export const ORGANIZACOES_ALFA_MOCK = ['EMPRESA ALFA INDUSTRIA E COMERCIO S.A.'];

/** Organizações já ligadas a outras empresas (um nome pertence a uma única empresa) */
export const ORGANIZACOES_DE_OUTRAS_MOCK: Record<string, string> = {
  'EMPRESA BETA PARTICIPACOES LTDA': 'EMPRESA BETA',
};

export interface ContratoFiscalMock {
  modalidade: 'saas' | 'on_premise' | null;
  edocs24x7: boolean | null;
  atualizacao: boolean | null;
  atualizacoesAno: number | null;
  /** Padrão: nao_contratado */
  dba: 'atendimento' | 'monitoramento' | 'ambos' | 'nao_contratado';
  /** Horas por mês, HH:MM ('' = não informado) */
  horasAtendimento: string;
  horasMonitoramento: string;
  bancoDados: 'sql_server' | 'oracle' | null;
}

/** Valores que o Contrato FISCAL assume quando o cliente ainda não tem a informação (16/10/2026) */
export const CONTRATO_FISCAL_PADRAO: ContratoFiscalMock = {
  modalidade: 'on_premise',
  edocs24x7: false,
  atualizacao: false,
  atualizacoesAno: null,
  dba: 'nao_contratado',
  horasAtendimento: '',
  horasMonitoramento: '',
  bancoDados: 'sql_server',
};

/** Preenche com o padrão o que ainda não foi informado */
export const comPadraoFiscal = (c: ContratoFiscalMock): ContratoFiscalMock => ({
  ...c,
  modalidade: c.modalidade ?? CONTRATO_FISCAL_PADRAO.modalidade,
  edocs24x7: c.edocs24x7 ?? CONTRATO_FISCAL_PADRAO.edocs24x7,
  atualizacao: c.atualizacao ?? CONTRATO_FISCAL_PADRAO.atualizacao,
  bancoDados: c.bancoDados ?? CONTRATO_FISCAL_PADRAO.bancoDados,
});

/** A Empresa Alfa ainda não tem o Contrato FISCAL informado: a tela mostra o padrão */
export const CONTRATO_FISCAL_ALFA_MOCK: ContratoFiscalMock = {
  modalidade: null,
  edocs24x7: null,
  atualizacao: null,
  atualizacoesAno: null,
  dba: 'nao_contratado',
  horasAtendimento: '',
  horasMonitoramento: '',
  bancoDados: null,
};

export interface ContatoMock {
  id: string;
  nome: string;
  email: string;
  finalidade: 'Book' | 'Saldo Parcial' | 'Book e Saldo Parcial';
  principal: boolean;
  ativo: boolean;
}

export const CONTATOS_ALFA_MOCK: ContatoMock[] = [
  {
    id: 'c1',
    nome: 'Contato Teste Um',
    email: 'contato.um@exemplo.com',
    finalidade: 'Book e Saldo Parcial',
    principal: true,
    ativo: true,
  },
  {
    id: 'c2',
    nome: 'Contato Teste Dois',
    email: 'contato.dois@exemplo.com',
    finalidade: 'Book',
    principal: false,
    ativo: true,
  },
  {
    id: 'c3',
    nome: 'Contato Teste Três',
    email: 'contato.tres@exemplo.com',
    finalidade: 'Saldo Parcial',
    principal: false,
    ativo: true,
  },
  {
    id: 'c4',
    nome: 'Contato Teste Quatro',
    email: 'contato.quatro@exemplo.com',
    finalidade: 'Book',
    principal: false,
    ativo: false,
  },
];

export type TipoBookMock = 'nao_tem_book' | 'qualidade' | 'outros';

export const BOOK_ALFA_MOCK = {
  tipoBook: 'qualidade' as TipoBookMock,
  template: 'portugues',
  sharepoint: 'https://exemplo.sharepoint.com/sites/empresa-alfa',
  bookPersonalizado: false,
  anexo: true,
  consolidadoraId: '',
  metaSla: '95',
  qtdMinimaSla: '10',
};
export type BookMock = typeof BOOK_ALFA_MOCK;

/** Templates do Book: os dois fixos do legado mais os de email_templates */
export const TEMPLATES_BOOK_MOCK = [
  { valor: 'portugues', rotulo: 'Template Book Português' },
  { valor: 'ingles', rotulo: 'Template Book Inglês' },
  { valor: 'tpl-personalizado', rotulo: 'Template personalizado (exemplo)' },
];

// ---------------------------------------------------------------------------
// Bancos de horas
// ---------------------------------------------------------------------------

/** O escopo marca produtos inteiros ou módulos; a solução só agrupa (decisão de 21/10/2026) */
export interface EscopoMock {
  produtoId: string;
  /** ids dos módulos; vazio = produto inteiro */
  modulos: string[];
}

export interface BancoCadastroMock {
  id: string;
  nome: string;
  descricao: string;
  padrao: boolean;
  ativo: boolean;
  tipoContrato: 'horas' | 'tickets' | 'ambos';
  periodoApuracao: number;
  inicioVigencia: string; // MM/AAAA
  /** MM/AAAA; '' = sem data de fim */
  fimVigencia: string;
  diaInicioApuracao: number;
  /** 0 = último dia do mês */
  diaFimApuracao: number;
  taxaProduto: 'OUTROS' | 'GALLERY';
  taxaTipoHora: 'excedente' | 'normal';
  baseline: { valor: string; desde: string };
  repasse: { percentual: number; desde: string };
  repassePorPeriodo: { duracao: number; periodos: number; dentro: number; entre: number } | null;
  escopo: EscopoMock[];
  filtroIc: { operador: 'contem' | 'igual'; valor: string } | null;
  consomeOutros: boolean;
}

export const BANCOS_ALFA_MOCK: BancoCadastroMock[] = [
  {
    id: 'comex',
    nome: 'Banco COMEX',
    descricao: 'Contrato COMEX renovado em 2026.',
    padrao: false,
    ativo: true,
    tipoContrato: 'ambos',
    periodoApuracao: 3,
    inicioVigencia: '01/2026',
    fimVigencia: '',
    diaInicioApuracao: 1,
    diaFimApuracao: 0,
    taxaProduto: 'OUTROS',
    taxaTipoHora: 'excedente',
    baseline: { valor: '40:00', desde: '01/2026' },
    repasse: { percentual: 50, desde: '01/2026' },
    repassePorPeriodo: null,
    // Sem marcar a solução: os produtos COMEX, um a um
    escopo: [
      { produtoId: idProduto('CE PLUS'), modulos: [] },
      { produtoId: idProduto('CE PLUS RECOF'), modulos: [] },
      { produtoId: idProduto('CATÁLOGO DE PRODUTOS'), modulos: [] },
      { produtoId: idProduto('FCI'), modulos: [] },
    ],
    filtroIc: null,
    consomeOutros: false,
  },
  {
    id: 'edocs',
    nome: 'FISCAL – e-DOCS',
    descricao: 'Horas dedicadas ao COMPLY e-DOCS e ao Monitor NF-e.',
    padrao: false,
    ativo: true,
    tipoContrato: 'horas',
    periodoApuracao: 6,
    inicioVigencia: '01/2026',
    fimVigencia: '06/2027',
    diaInicioApuracao: 1,
    diaFimApuracao: 0,
    taxaProduto: 'OUTROS',
    taxaTipoHora: 'excedente',
    baseline: { valor: '20:00', desde: '01/2026' },
    repasse: { percentual: 100, desde: '01/2026' },
    repassePorPeriodo: null,
    escopo: [
      { produtoId: idProduto('COMPLY e-DOCS'), modulos: [] },
      { produtoId: idProduto('COMPLY'), modulos: [idModulo('COMPLY', 'Monitor NF-e')] },
    ],
    filtroIc: null,
    consomeOutros: true,
  },
  {
    id: 'fiscal',
    nome: 'Banco FISCAL',
    descricao: 'Demais produtos FISCAIS e grupos de serviço.',
    padrao: true,
    ativo: true,
    tipoContrato: 'horas',
    periodoApuracao: 6,
    inicioVigencia: '01/2026',
    fimVigencia: '',
    diaInicioApuracao: 1,
    diaFimApuracao: 0,
    taxaProduto: 'OUTROS',
    taxaTipoHora: 'excedente',
    baseline: { valor: '60:00', desde: '01/2026' },
    repasse: { percentual: 50, desde: '01/2026' },
    repassePorPeriodo: null,
    escopo: [],
    filtroIc: null,
    consomeOutros: false,
  },
];

export const HISTORICO_BASELINE_MOCK = [
  {
    desde: '07/2026',
    ate: null,
    valor: '60:00',
    motivo: 'Renovação do contrato',
    por: 'Usuário Teste',
    em: '01/07/2026',
  },
  {
    desde: '01/2026',
    ate: '06/2026',
    valor: '50:00',
    motivo: 'Carga inicial',
    por: 'Sistema',
    em: '15/10/2026',
  },
];
