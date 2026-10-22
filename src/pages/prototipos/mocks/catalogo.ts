// Catálogo FICTÍCIO compartilhado pelos protótipos do DS v2: Solução › Produto › Módulo (decisão de
// 21/10/2026) e os grupos do Aranda ligados a cada nível. Soluções, produtos e módulos são os nomes
// informados pelo usuário (não identificam clientes); os grupos seguem o padrão "AMS APL - <X> - N2"
// da Especificação. Contagens, datas, bancos e empresas são fictícios.

export type SolucaoCodigo = 'COMEX' | 'FISCAIS' | 'FINANCEIRAS';

/** A empresa contrata soluções; AMS e Em projeto são por solução */
export interface SolucaoMock {
  id: string;
  codigo: SolucaoCodigo;
  nome: string;
  ordem: number;
  ativo: boolean;
}

export interface ProdutoMock {
  id: string;
  solucaoId: string;
  nome: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
}

/** Banco ativo que tem o produto ou o módulo no escopo */
export interface UsoEmBancoMock {
  empresa: string;
  banco: string;
  /** true = o banco marcou o produto inteiro, e não o módulo */
  produtoInteiro: boolean;
}

export interface ModuloMock {
  id: string;
  produtoId: string;
  nome: string;
  descricao: string;
  ativo: boolean;
}

/**
 * Onde o grupo do Aranda está ligado, e por isso para onde vão as horas:
 * modulo → banco que cobre o módulo ou o produto inteiro · produto → banco que cobre o produto
 * inteiro · solucao (grupos de serviço: DBA, Técnico…) e nao_se_aplica (DEDICADOS, T&M…) → sempre
 * o Banco padrão. Sem banco que cubra, o Banco padrão.
 */
export type Classificacao = 'modulo' | 'produto' | 'solucao' | 'nao_se_aplica';

export interface GrupoArandaMock {
  id: string;
  grupoAranda: string;
  grupoBook: string;
  solucaoId: string | null;
  produtoId: string | null;
  moduloId: string | null;
  classificacao: Classificacao;
  /** Apontamentos e tickets dos últimos 6 meses com este grupo */
  apontamentos6m: number;
  /** Empresas com bancos múltiplos que têm apontamentos deste grupo */
  empresasMultiplos: string[];
  alteradoEm: string; // DD/MM/AAAA
  alteradoPor: string;
}

/** Grupo que aparece nos apontamentos ou tickets e não está no de-para */
export interface NaoMapeadoMock {
  grupoAranda: string;
  apontamentos: number;
  empresas: string[];
  primeiroApontamento: string; // DD/MM/AAAA
}

/**
 * Tabela `modulos_requerimento_produto`. Os valores de requerimentos.modulo são uma lista fixa no
 * código (requerimentosSchemas.ts): a tela só muda para onde cada um aponta.
 */
export interface ModuloRequerimentoMock {
  moduloRequerimento: string;
  produtoId: string;
  /** null = produto inteiro */
  moduloId: string | null;
  requerimentos6m: number;
}

/* ------------------------------------------------------------------ */
/* Soluções, produtos e módulos                                         */
/* ------------------------------------------------------------------ */

export const SOLUCOES_MOCK: SolucaoMock[] = [
  { id: 's-comex', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true },
  { id: 's-fiscais', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: true },
  { id: 's-financeiras', codigo: 'FINANCEIRAS', nome: 'FINANCEIRAS', ordem: 3, ativo: true },
];

const slug = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Solução › produto › módulos (vazio = produto sem módulos: o grupo liga direto no produto) */
const ESTRUTURA: Record<SolucaoCodigo, [string, string[]][]> = {
  COMEX: [
    ['CE PLUS', ['Câmbio', 'Drawback', 'Exportação', 'Importação']],
    ['CE PLUS RECOF', []],
    ['CATÁLOGO DE PRODUTOS', []],
    ['FCI', []],
  ],
  FISCAIS: [
    [
      'COMPLY',
      [
        'Cadastros Básicos',
        'Calculadora de Ajustes',
        'Calendário Fiscal',
        'CIAP',
        'Conciliação',
        'Contabilização',
        'FUST_FUNTEL',
        'Indiretos',
        'Infraestrutura',
        'Integração - Extração e Interface',
        'Integração - Extratores SAP',
        'Monitor NF-e',
        'Obrigações Estaduais',
        'Obrigações Federais',
        'Obrigações Municipais',
        'Oil & Gás',
        'Relatórios',
        'Retidos',
        'SPED',
        'TSC - Tributação Sobre Consumo',
      ],
    ],
    ['COMPLY e-DOCS', []],
    [
      'GALLERY',
      [
        'EFD Contribuições',
        'EFD ICMS/IPI',
        'Federal',
        'Indiretos',
        'Infraestrutura',
        'IRPJ/CSLL',
        'Obrigações Estaduais',
        'Obrigações Federais',
        'Obrigações Municipais',
        'PIS/COFINS',
        'Retidos',
        'SPED ECD',
        'SPED ECF',
        'SPED REINF',
      ],
    ],
    ['SATI', []],
  ],
  FINANCEIRAS: [
    ['FC', []],
    ['SAPC', []],
    ['VENDOR', []],
  ],
};

const DESCRICOES: Record<string, string> = {
  'CE PLUS': 'Comércio exterior',
  'COMPLY e-DOCS': 'Documentos fiscais eletrônicos',
  FC: 'Fluxo de caixa',
};

const idSolucao = (c: SolucaoCodigo) => SOLUCOES_MOCK.find((s) => s.codigo === c)!.id;
export const idProduto = (nome: string) => `p-${slug(nome)}`;
export const idModulo = (produto: string, nome: string) => `m-${slug(produto)}-${slug(nome)}`;

export const PRODUTOS_MOCK: ProdutoMock[] = (
  Object.entries(ESTRUTURA) as [SolucaoCodigo, [string, string[]][]][]
).flatMap(([solucao, produtos]) =>
  produtos.map(([nome], i) => ({
    id: idProduto(nome),
    solucaoId: idSolucao(solucao),
    nome,
    descricao: DESCRICOES[nome] ?? '',
    ordem: i + 1,
    ativo: true,
  }))
);

export const MODULOS_MOCK: ModuloMock[] = Object.values(ESTRUTURA).flatMap((produtos) =>
  produtos.flatMap(([produto, modulos]) =>
    modulos.map((nome) => ({
      id: idModulo(produto, nome),
      produtoId: idProduto(produto),
      nome,
      descricao: '',
      // Fictício: um módulo inativo para mostrar o estado
      ativo: nome !== 'Calculadora de Ajustes',
    }))
  )
);

/** Bancos fictícios que usam cada produto ou módulo no escopo (chave: id do produto ou do módulo) */
export const USOS_MOCK: Record<string, UsoEmBancoMock[]> = {
  [idProduto('CE PLUS')]: [{ empresa: 'EMPRESA ALFA', banco: 'Banco COMEX', produtoInteiro: true }],
  [idProduto('CE PLUS RECOF')]: [
    { empresa: 'EMPRESA ALFA', banco: 'Banco COMEX', produtoInteiro: true },
  ],
  [idProduto('COMPLY e-DOCS')]: [
    { empresa: 'EMPRESA ALFA', banco: 'FISCAL – e-DOCS', produtoInteiro: true },
    { empresa: 'EMPRESA GAMA', banco: 'Banco e-DOCS', produtoInteiro: true },
  ],
  [idModulo('CE PLUS', 'Câmbio')]: [
    { empresa: 'EMPRESA ÉPSILON', banco: 'Câmbio e Drawback', produtoInteiro: false },
  ],
  [idModulo('CE PLUS', 'Drawback')]: [
    { empresa: 'EMPRESA ÉPSILON', banco: 'Câmbio e Drawback', produtoInteiro: false },
  ],
  [idModulo('COMPLY', 'SPED')]: [
    { empresa: 'EMPRESA TETA', banco: 'Banco SPED', produtoInteiro: false },
  ],
};

/** Bancos que alcançam o módulo: os que o marcaram e os que marcaram o produto inteiro */
export const usosDoModulo = (m: ModuloMock) => [
  ...(USOS_MOCK[m.id] ?? []),
  ...(USOS_MOCK[m.produtoId] ?? []),
];

/* ------------------------------------------------------------------ */
/* Grupos do Aranda (de-para)                                           */
/* ------------------------------------------------------------------ */

const EMPRESAS = ['EMPRESA ALFA', 'EMPRESA GAMA', 'EMPRESA ÉPSILON', 'EMPRESA TETA'];

/** Contagem pseudoaleatória, estável entre recargas */
const numero = (texto: string, max: number) =>
  [...texto].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 9973, 7) % max;

const semAcento = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();

const prefixo = (solucao: string) =>
  ({ 's-comex': 'COMEX', 's-fiscais': 'FISCAL', 's-financeiras': 'FINANCEIRAS' })[solucao];

function grupo(
  nomeGrupo: string,
  book: string,
  alvo: { solucaoId?: string; produtoId?: string; moduloId?: string },
  classificacao: Classificacao
): GrupoArandaMock {
  const produto = PRODUTOS_MOCK.find((p) => p.id === alvo.produtoId);
  return {
    id: `g-${slug(nomeGrupo)}`,
    grupoAranda: nomeGrupo,
    grupoBook: book,
    solucaoId: alvo.solucaoId ?? produto?.solucaoId ?? null,
    produtoId: alvo.produtoId ?? null,
    moduloId: alvo.moduloId ?? null,
    classificacao,
    apontamentos6m: numero(nomeGrupo, 240),
    empresasMultiplos: EMPRESAS.slice(0, numero(nomeGrupo, 3)),
    alteradoEm: numero(nomeGrupo, 5) === 0 ? '14/10/2026' : '15/10/2026',
    alteradoPor: numero(nomeGrupo, 5) === 0 ? 'Usuário Teste' : 'Carga inicial',
  };
}

/** Módulos sem nenhum grupo do Aranda: nenhuma hora chega a eles pelo de-para */
const MODULOS_SEM_GRUPO = new Set([
  idModulo('COMPLY', 'Calendário Fiscal'),
  idModulo('COMPLY', 'Oil & Gás'),
  idModulo('GALLERY', 'Federal'),
]);
/** Módulos com dois níveis de atendimento (N1 e N2) no Aranda */
const DOIS_NIVEIS = new Set([idModulo('CE PLUS', 'Câmbio'), idModulo('COMPLY', 'SPED')]);

const gruposDeModulo = MODULOS_MOCK.filter((m) => !MODULOS_SEM_GRUPO.has(m.id)).flatMap((m) => {
  const produto = PRODUTOS_MOCK.find((p) => p.id === m.produtoId)!;
  const base = `AMS ${produto.nome === 'GALLERY' ? 'GALLERY' : 'APL'} - ${semAcento(m.nome)}`;
  const book = `${prefixo(produto.solucaoId)} - ${m.nome}`;
  const niveis = DOIS_NIVEIS.has(m.id) ? ['N1', 'N2'] : ['N2'];
  return niveis.map((n) =>
    grupo(`${base} - ${n}`, book, { produtoId: m.produtoId, moduloId: m.id }, 'modulo')
  );
});

/** Produtos sem módulos: os grupos ligam direto no produto */
const gruposDeProduto = [
  grupo(
    'AMS APL - RECOF - N2',
    'COMEX - RECOF',
    { produtoId: idProduto('CE PLUS RECOF') },
    'produto'
  ),
  grupo(
    'AMS APL - CATALOGO DE PRODUTOS - N2',
    'COMEX - Catálogo de Produtos',
    { produtoId: idProduto('CATÁLOGO DE PRODUTOS') },
    'produto'
  ),
  grupo('AMS APL - FCI - N2', 'COMEX - FCI', { produtoId: idProduto('FCI') }, 'produto'),
  grupo(
    'AMS APL - E-DOCS - N2',
    'FISCAL - COMPLY e-DOCS',
    { produtoId: idProduto('COMPLY e-DOCS') },
    'produto'
  ),
  grupo(
    'AMS APL - E-DOCS - N1',
    'FISCAL - COMPLY e-DOCS',
    { produtoId: idProduto('COMPLY e-DOCS') },
    'produto'
  ),
  grupo('AMS APL - SATI - N2', 'FISCAL - SATI', { produtoId: idProduto('SATI') }, 'produto'),
  grupo(
    'AMS APL - FLUXO DE CAIXA - N2',
    'FINANCEIRAS - Fluxo de Caixa',
    { produtoId: idProduto('FC') },
    'produto'
  ),
  grupo('AMS APL - SAPC - N2', 'FINANCEIRAS - SAPC', { produtoId: idProduto('SAPC') }, 'produto'),
  grupo(
    'AMS APL - VENDOR - N2',
    'FINANCEIRAS - VENDOR',
    { produtoId: idProduto('VENDOR') },
    'produto'
  ),
  // Grupos gerais do produto, sem módulo
  grupo('AMS APL - COMEX - N1', 'COMEX - Geral', { produtoId: idProduto('CE PLUS') }, 'produto'),
  grupo('AMS APL - FISCAL - N1', 'FISCAL - Geral', { produtoId: idProduto('COMPLY') }, 'produto'),
];

/** Grupos de serviço: ligados só à solução, horas sempre para o Banco padrão (decisão de 21/10/2026) */
const gruposDeServico = [
  ...['DBA', 'TECNICO', 'ATUALIZACAO AMBIENTES', 'SAAS', 'ORCAMENTOS', 'ICS INATIVOS'].map((s) =>
    grupo(
      `AMS APL - ${s} - N2`,
      `FISCAL - ${s[0]}${s.slice(1).toLowerCase()}`,
      { solucaoId: 's-fiscais' },
      'solucao'
    )
  ),
  ...['ORCAMENTOS COMEX', 'ICS INATIVOS COMEX'].map((s) =>
    grupo(
      `AMS APL - ${s} - N2`,
      `COMEX - ${s.replace(' COMEX', '')[0]}${s.replace(' COMEX', '').slice(1).toLowerCase()}`,
      { solucaoId: 's-comex' },
      'solucao'
    )
  ),
];

/** Grupos sem solução (DEDICADOS, T&M…): sempre para o Banco padrão */
const gruposNaoSeAplica = [
  ['AMS BPO - N2', 'BPO'],
  ['AMS CUSTOMER SUCCESS', 'Customer Success'],
  ['AMS DEDICADOS - SUSTENTACAO', 'Dedicados'],
  ['AMS PROJETO', 'Projeto'],
  ['AMS QUALIDADE', 'Qualidade AMS'],
  ['AMS T&M', 'T&M'],
].map(([g, b]) => grupo(g, b, {}, 'nao_se_aplica'));

export const GRUPOS_ARANDA_MOCK: GrupoArandaMock[] = [
  ...gruposDeModulo,
  ...gruposDeProduto,
  ...gruposDeServico,
  ...gruposNaoSeAplica,
].sort((a, b) => a.grupoAranda.localeCompare(b.grupoAranda));

export const gruposDoModulo = (moduloId: string) =>
  GRUPOS_ARANDA_MOCK.filter((g) => g.moduloId === moduloId).map((g) => g.grupoAranda);
export const gruposSoDoProduto = (produtoId: string) =>
  GRUPOS_ARANDA_MOCK.filter((g) => g.produtoId === produtoId && !g.moduloId).map(
    (g) => g.grupoAranda
  );
export const gruposDaSolucao = (solucaoId: string) =>
  GRUPOS_ARANDA_MOCK.filter((g) => g.classificacao === 'solucao' && g.solucaoId === solucaoId).map(
    (g) => g.grupoAranda
  );

export const NAO_MAPEADOS_MOCK: NaoMapeadoMock[] = [
  {
    grupoAranda: 'AMS APL - CIAP - N3',
    apontamentos: 14,
    empresas: ['EMPRESA ALFA', 'EMPRESA GAMA', 'EMPRESA TETA'],
    primeiroApontamento: '02/09/2026',
  },
  {
    grupoAranda: 'AMS APL - CAMBIO - N3',
    apontamentos: 6,
    empresas: ['EMPRESA ÉPSILON'],
    primeiroApontamento: '18/09/2026',
  },
  {
    grupoAranda: 'AMS GALLERY - SPED ECF - N1',
    apontamentos: 3,
    empresas: ['EMPRESA IOTA'],
    primeiroApontamento: '07/10/2026',
  },
];

/** Grupos do Book já usados: sugestões ao digitar, para não criar o mesmo nome com outra grafia */
export const GRUPOS_BOOK_MOCK = [...new Set(GRUPOS_ARANDA_MOCK.map((g) => g.grupoBook))].sort();

/* ------------------------------------------------------------------ */
/* Módulos de requerimento                                              */
/* ------------------------------------------------------------------ */

export const MODULOS_REQUERIMENTO_MOCK: ModuloRequerimentoMock[] = [
  {
    moduloRequerimento: 'Comex',
    produtoId: idProduto('CE PLUS'),
    moduloId: null,
    requerimentos6m: 42,
  },
  {
    moduloRequerimento: 'Comply',
    produtoId: idProduto('COMPLY'),
    moduloId: null,
    requerimentos6m: 37,
  },
  {
    moduloRequerimento: 'Comply e-DOCS',
    produtoId: idProduto('COMPLY e-DOCS'),
    moduloId: null,
    requerimentos6m: 18,
  },
  {
    moduloRequerimento: 'pw.SATI',
    produtoId: idProduto('SATI'),
    moduloId: null,
    requerimentos6m: 9,
  },
  {
    moduloRequerimento: 'pw.SPED',
    produtoId: idProduto('COMPLY'),
    moduloId: idModulo('COMPLY', 'SPED'),
    requerimentos6m: 11,
  },
  {
    moduloRequerimento: 'pw.SATI/pw.SPED',
    produtoId: idProduto('SATI'),
    moduloId: null,
    requerimentos6m: 4,
  },
  {
    moduloRequerimento: 'Gallery',
    produtoId: idProduto('GALLERY'),
    moduloId: null,
    requerimentos6m: 15,
  },
];

/* ------------------------------------------------------------------ */
/* Nomes                                                                */
/* ------------------------------------------------------------------ */

export const nomeSolucao = (id: string | null) =>
  SOLUCOES_MOCK.find((s) => s.id === id)?.nome ?? null;
export const nomeProduto = (id: string | null) =>
  PRODUTOS_MOCK.find((p) => p.id === id)?.nome ?? null;
export const nomeModulo = (id: string | null) =>
  MODULOS_MOCK.find((m) => m.id === id)?.nome ?? null;
export const solucaoDoProduto = (produtoId: string) =>
  PRODUTOS_MOCK.find((p) => p.id === produtoId)?.solucaoId ?? null;
