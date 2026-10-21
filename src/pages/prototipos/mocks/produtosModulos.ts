// Dados FICTÍCIOS do protótipo de Produtos e Módulos (DS v2). Os nomes de produto e módulo são do
// catálogo (produtos / produto_modulos), que não identificam clientes; os grupos do Aranda seguem o
// padrão "AMS APL - <MÓDULO> - N2" da Especificação. Bancos e empresas são fictícios.
import { MODULOS_MOCK, type ProdutoCodigo } from './empresas';

/** Tabela `produtos` (Fase 1) */
export interface ProdutoMock {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  ordem: number;
  ativo: boolean;
}

/** Banco ativo que tem o módulo (ou o produto inteiro) no escopo */
export interface UsoEmBancoMock {
  empresa: string;
  banco: string;
  /** true = o banco marcou o produto inteiro, e não o módulo */
  produtoInteiro: boolean;
}

/** Tabela `produto_modulos` (Fase 1), com o que a tela calcula ao redor */
export interface ModuloMock {
  id: string;
  produtoId: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  /** grupos_aranda.grupo_aranda com modulo_id = este módulo */
  grupos: string[];
  usos: UsoEmBancoMock[];
}

/** Tabela `grupos_aranda` (Fase 1), resumida ao que a tela de Produtos e Módulos mostra */
export interface GrupoArandaMock {
  grupo: string;
  grupoBook: string;
  produtoId: string | null;
  moduloId: string | null;
  classificacao: 'modulo' | 'sem_modulo' | 'nao_se_aplica';
}

/**
 * Tabela `modulos_requerimento_produto` (Fase 1). Os valores de requerimentos.modulo são uma lista
 * fixa no código (requerimentosSchemas.ts): a tela só muda para onde cada um aponta.
 */
export interface ModuloRequerimentoMock {
  /** Valor de requerimentos.modulo */
  moduloRequerimento: string;
  produtoId: string;
  /** null = produto inteiro */
  moduloId: string | null;
  /** Requerimentos de Banco de Horas nos últimos 6 meses com este módulo */
  requerimentos6m: number;
}

export const PRODUTOS_MOCK: ProdutoMock[] = [
  {
    id: 'p-comex',
    codigo: 'COMEX',
    nome: 'COMEX',
    descricao: 'Comércio exterior',
    ordem: 1,
    ativo: true,
  },
  { id: 'p-fiscal', codigo: 'FISCAL', nome: 'FISCAL', descricao: 'Fiscal', ordem: 2, ativo: true },
  {
    id: 'p-gallery',
    codigo: 'GALLERY',
    nome: 'GALLERY',
    descricao: 'Fiscal Gallery',
    ordem: 3,
    ativo: true,
  },
];

const ID_PRODUTO: Record<ProdutoCodigo, string> = {
  COMEX: 'p-comex',
  FISCAL: 'p-fiscal',
  GALLERY: 'p-gallery',
};

/** "Catálogo de Produtos" → "CATALOGO DE PRODUTOS" (o Aranda grava sem acento) */
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

const slug = (t: string) =>
  semAcento(t)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

/** Módulos sem nenhum grupo do Aranda: nenhuma hora chega a eles pelo de-para */
const SEM_GRUPO = new Set(['FISCAL|SAAS', 'FISCAL|Técnico', 'COMEX|TP One', 'GALLERY|Federal']);
/** Módulos com dois níveis de atendimento (N1 e N2) no Aranda */
const DOIS_NIVEIS = new Set(['COMEX|Câmbio', 'COMEX|Importação', 'FISCAL|COMPLY e-DOCS']);
/** Módulos inativos no catálogo */
const INATIVOS = new Set(['COMEX|ICS Inativos', 'FISCAL|ICS Inativos', 'GALLERY|ICS Inativos']);

/** Bancos fictícios que usam o módulo no escopo */
const USOS: Record<string, UsoEmBancoMock[]> = {
  'FISCAL|COMPLY e-DOCS': [
    { empresa: 'EMPRESA ALFA', banco: 'FISCAL – e-DOCS', produtoInteiro: false },
    { empresa: 'EMPRESA GAMA', banco: 'Banco e-DOCS', produtoInteiro: false },
    { empresa: 'EMPRESA TETA', banco: 'Banco FISCAL', produtoInteiro: true },
  ],
  'COMEX|Câmbio': [
    { empresa: 'EMPRESA ALFA', banco: 'Banco COMEX', produtoInteiro: true },
    { empresa: 'EMPRESA ÉPSILON', banco: 'Câmbio e Drawback', produtoInteiro: false },
  ],
  'COMEX|Drawback': [
    { empresa: 'EMPRESA ALFA', banco: 'Banco COMEX', produtoInteiro: true },
    { empresa: 'EMPRESA ÉPSILON', banco: 'Câmbio e Drawback', produtoInteiro: false },
  ],
  'FISCAL|ICS Inativos': [{ empresa: 'EMPRESA TETA', banco: 'Banco FISCAL', produtoInteiro: true }],
};

export const MODULOS_CATALOGO_MOCK: ModuloMock[] = (
  Object.entries(MODULOS_MOCK) as [ProdutoCodigo, string[]][]
).flatMap(([produto, nomes]) =>
  nomes.map((nome) => {
    const chave = `${produto}|${nome}`;
    const base = `AMS APL - ${semAcento(nome)}`;
    const grupos = SEM_GRUPO.has(chave)
      ? []
      : DOIS_NIVEIS.has(chave)
        ? [`${base} - N1`, `${base} - N2`]
        : [`${base} - N2`];
    return {
      id: `m-${slug(produto)}-${slug(nome)}`,
      produtoId: ID_PRODUTO[produto],
      nome,
      descricao: nome === 'COMPLY e-DOCS' ? 'Documentos fiscais eletrônicos' : '',
      ativo: !INATIVOS.has(chave),
      grupos:
        produto === 'GALLERY' ? grupos.map((g) => g.replace('AMS APL', 'AMS GALLERY')) : grupos,
      usos: USOS[chave] ?? [],
    };
  })
);

/** Grupos ligados só ao produto (classificação "sem módulo"): vão para o banco do produto inteiro */
export const GRUPOS_SEM_MODULO_MOCK: GrupoArandaMock[] = [
  {
    grupo: 'AMS APL - COMEX - N1',
    grupoBook: 'COMEX - Geral',
    produtoId: 'p-comex',
    moduloId: null,
    classificacao: 'sem_modulo',
  },
  {
    grupo: 'AMS APL - FISCAL - N1',
    grupoBook: 'FISCAL - Geral',
    produtoId: 'p-fiscal',
    moduloId: null,
    classificacao: 'sem_modulo',
  },
];

/** Grupos que ainda não têm módulo nem produto: candidatos ao "+ Vincular grupo" */
export const GRUPOS_LIVRES_MOCK: GrupoArandaMock[] = [
  {
    grupo: 'AMS APL - REINF - N3',
    grupoBook: 'FISCAL - REINF',
    produtoId: null,
    moduloId: null,
    classificacao: 'nao_se_aplica',
  },
  {
    grupo: 'AMS APL - CAMBIO - N3',
    grupoBook: 'COMEX - Câmbio',
    produtoId: null,
    moduloId: null,
    classificacao: 'nao_se_aplica',
  },
  {
    grupo: 'AMS DEDICADOS - SUSTENTACAO',
    grupoBook: 'Dedicados',
    produtoId: null,
    moduloId: null,
    classificacao: 'nao_se_aplica',
  },
];

const moduloId = (produto: ProdutoCodigo, nome: string) => `m-${slug(produto)}-${slug(nome)}`;

export const MODULOS_REQUERIMENTO_MOCK: ModuloRequerimentoMock[] = [
  { moduloRequerimento: 'Comex', produtoId: 'p-comex', moduloId: null, requerimentos6m: 42 },
  { moduloRequerimento: 'Comply', produtoId: 'p-fiscal', moduloId: null, requerimentos6m: 37 },
  {
    moduloRequerimento: 'Comply e-DOCS',
    produtoId: 'p-fiscal',
    moduloId: moduloId('FISCAL', 'COMPLY e-DOCS'),
    requerimentos6m: 18,
  },
  { moduloRequerimento: 'pw.SATI', produtoId: 'p-fiscal', moduloId: null, requerimentos6m: 9 },
  { moduloRequerimento: 'pw.SPED', produtoId: 'p-fiscal', moduloId: null, requerimentos6m: 11 },
  {
    moduloRequerimento: 'pw.SATI/pw.SPED',
    produtoId: 'p-fiscal',
    moduloId: null,
    requerimentos6m: 4,
  },
  { moduloRequerimento: 'Gallery', produtoId: 'p-gallery', moduloId: null, requerimentos6m: 15 },
];
