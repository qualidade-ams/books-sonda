// Planilhas FICTÍCIAS já conferidas, para o protótipo da importação em lote de cada tela nova.
import type { ColunaImportacao, LinhaImportacao } from '../compartilhado/importacao';

type Importacao = {
  colunas: ColunaImportacao[];
  linhas: LinhaImportacao[];
  regras: string[];
};

const l = (
  linha: number,
  situacao: LinhaImportacao['situacao'],
  valores: Record<string, string>,
  erros?: string[]
): LinhaImportacao => ({ linha, situacao, valores, erros });

export const IMPORTACAO_EMPRESAS: Importacao = {
  colunas: [
    { id: 'abreviado', rotulo: 'Nome abreviado', obrigatoria: true },
    { id: 'completo', rotulo: 'Nome completo', obrigatoria: true },
    { id: 'solucoes', rotulo: 'Soluções', obrigatoria: true },
    { id: 'cs', rotulo: 'E-mail do Customer Success', obrigatoria: true },
    { id: 'ramo', rotulo: 'Ramo de atividade' },
  ],
  regras: [
    'A empresa é encontrada pelo nome abreviado; se já existir, a linha atualiza o cadastro.',
    'Soluções separadas por vírgula: COMEX, FISCAIS, FINANCEIRAS.',
    'O ramo precisa estar cadastrado em Ramos de Atividade.',
  ],
  linhas: [
    l(2, 'novo', {
      abreviado: 'EMPRESA ÔMEGA',
      completo: 'EMPRESA ÔMEGA LOGÍSTICA S.A.',
      solucoes: 'COMEX',
      cs: 'cs.omega@exemplo.com',
      ramo: 'Varejo',
    }),
    l(3, 'atualiza', {
      abreviado: 'EMPRESA ALFA',
      completo: 'EMPRESA ALFA INDÚSTRIA E COMÉRCIO S.A.',
      solucoes: 'COMEX, FISCAIS',
      cs: 'cs.alfa@exemplo.com',
      ramo: 'Químico e Petroquímico',
    }),
    l(4, 'igual', {
      abreviado: 'EMPRESA BETA',
      completo: 'EMPRESA BETA PARTICIPAÇÕES LTDA',
      solucoes: 'FISCAIS',
      cs: 'cs.beta@exemplo.com',
      ramo: '',
    }),
    l(
      5,
      'erro',
      {
        abreviado: 'EMPRESA SIGMA',
        completo: 'EMPRESA SIGMA S.A.',
        solucoes: 'FISCAL',
        cs: 'cs.sigma@exemplo',
        ramo: '',
      },
      ['Solução "FISCAL" não existe (use FISCAIS).', 'E-mail do Customer Success inválido.']
    ),
    l(
      6,
      'erro',
      {
        abreviado: 'EMPRESA TAU',
        completo: 'EMPRESA TAU MINERAÇÃO LTDA',
        solucoes: 'FISCAIS',
        cs: 'cs.tau@exemplo.com',
        ramo: 'Agronegócio',
      },
      ['Ramo "Agronegócio" não está cadastrado.']
    ),
  ],
};

export const IMPORTACAO_CATALOGO: Importacao = {
  colunas: [
    { id: 'solucao', rotulo: 'Solução', obrigatoria: true },
    { id: 'produto', rotulo: 'Produto', obrigatoria: true },
    { id: 'modulo', rotulo: 'Módulo' },
    { id: 'descricao', rotulo: 'Descrição' },
  ],
  regras: [
    'A solução precisa existir. Produto e módulo que não existem são criados.',
    'Linha sem módulo cria ou atualiza só o produto.',
    'A ordem das linhas vira a ordem dos produtos e módulos novos.',
  ],
  linhas: [
    l(2, 'novo', {
      solucao: 'FINANCEIRAS',
      produto: 'FC',
      modulo: 'Conciliação Bancária',
      descricao: '',
    }),
    l(3, 'novo', {
      solucao: 'FINANCEIRAS',
      produto: 'FC',
      modulo: 'Previsão de Caixa',
      descricao: '',
    }),
    l(4, 'novo', {
      solucao: 'FISCAIS',
      produto: 'COMPLY',
      modulo: 'ETL',
      descricao: 'Extração e carga',
    }),
    l(5, 'atualiza', {
      solucao: 'COMEX',
      produto: 'CE PLUS',
      modulo: '',
      descricao: 'Comércio exterior — importação e exportação',
    }),
    l(6, 'igual', { solucao: 'COMEX', produto: 'CE PLUS', modulo: 'Câmbio', descricao: '' }),
    l(7, 'erro', { solucao: 'FISCAL', produto: 'COMPLY', modulo: 'SVA', descricao: '' }, [
      'Solução "FISCAL" não existe (use FISCAIS).',
    ]),
    l(8, 'erro', { solucao: 'FISCAIS', produto: 'COMPLY', modulo: 'ETL', descricao: '' }, [
      'Módulo repetido na planilha (linha 4).',
    ]),
  ],
};

export const IMPORTACAO_DE_PARA: Importacao = {
  colunas: [
    { id: 'grupo', rotulo: 'Grupo do Aranda', obrigatoria: true },
    { id: 'book', rotulo: 'Grupo do Book', obrigatoria: true },
    { id: 'solucao', rotulo: 'Solução' },
    { id: 'produto', rotulo: 'Produto' },
    { id: 'modulo', rotulo: 'Módulo' },
  ],
  regras: [
    'O grupo é encontrado pelo nome exato do Aranda; se já estiver mapeado, a linha atualiza o mapeamento.',
    'Sem produto, o grupo é de serviço da solução; sem solução, "não se aplica". Os dois vão para o Banco padrão.',
    'Solução, produto e módulo precisam existir em Produtos e Módulos.',
  ],
  linhas: [
    l(2, 'novo', {
      grupo: 'AMS APL - CIAP - N3',
      book: 'FISCAL - CIAP',
      solucao: 'FISCAIS',
      produto: 'COMPLY',
      modulo: 'CIAP',
    }),
    l(3, 'atualiza', {
      grupo: 'AMS APL - ETL - N2',
      book: 'FISCAL - ETL',
      solucao: 'FISCAIS',
      produto: 'COMPLY',
      modulo: '',
    }),
    l(4, 'atualiza', {
      grupo: 'AMS APL - DBA - N2',
      book: 'FISCAL - Dba',
      solucao: 'FISCAIS',
      produto: '',
      modulo: '',
    }),
    l(5, 'igual', {
      grupo: 'AMS APL - CAMBIO - N2',
      book: 'COMEX - Câmbio',
      solucao: 'COMEX',
      produto: 'CE PLUS',
      modulo: 'Câmbio',
    }),
    l(
      6,
      'erro',
      {
        grupo: 'AMS APL - SVA - N2',
        book: 'FISCAL - SVA',
        solucao: 'FISCAIS',
        produto: 'COMPLY',
        modulo: 'SVA',
      },
      ['Módulo "SVA" não existe em COMPLY.']
    ),
    l(
      7,
      'erro',
      { grupo: 'AMS APL - LEGEM - N2', book: '', solucao: 'COMEX', produto: 'CE PLUS', modulo: '' },
      ['Grupo do Book é obrigatório.']
    ),
  ],
};

export const IMPORTACAO_RAMOS: Importacao = {
  colunas: [{ id: 'nome', rotulo: 'Ramo de atividade', obrigatoria: true }],
  regras: [
    'Um ramo por linha, na ordem em que devem aparecer.',
    'Ramos que já existem (sem diferenciar maiúsculas) são ignorados.',
  ],
  linhas: [
    l(2, 'novo', { nome: 'Agronegócio' }),
    l(3, 'novo', { nome: 'Logística' }),
    l(4, 'igual', { nome: 'Varejo' }),
    l(5, 'erro', { nome: 'agronegócio' }, ['Repetido na planilha (linha 2).']),
    l(6, 'erro', { nome: '' }, ['Nome vazio.']),
  ],
};

export const IMPORTACAO_CODIGOS: Importacao = {
  colunas: [
    { id: 'codigo', rotulo: 'Código de resolução', obrigatoria: true },
    { id: 'horas', rotulo: 'Conta horas', obrigatoria: true },
    { id: 'tickets', rotulo: 'Conta tickets', obrigatoria: true },
  ],
  regras: [
    'O código é comparado exatamente como vem do Aranda, inclusive os espaços.',
    'Conta horas e Conta tickets: Sim ou Não. Pelo menos um precisa ser Sim.',
    'Se o código já estiver na lista, a linha atualiza as duas colunas.',
  ],
  linhas: [
    l(2, 'novo', { codigo: 'Treinamento (Banco=N |SLA=N)', horas: 'Sim', tickets: 'Não' }),
    l(3, 'atualiza', { codigo: 'Nota Publicada (Banco=S| SLA=N)', horas: 'Sim', tickets: 'Sim' }),
    l(4, 'igual', { codigo: 'Consultoria', horas: 'Sim', tickets: 'Sim' }),
    l(5, 'erro', { codigo: 'Melhoria (Banco=N |SLA=S)', horas: 'Talvez', tickets: 'Não' }, [
      'Conta horas: use Sim ou Não.',
    ]),
    l(6, 'erro', { codigo: 'Cancelado pelo solicitante', horas: 'Não', tickets: 'Não' }, [
      'Pelo menos um precisa ser Sim; para não contar, deixe o código fora da lista.',
    ]),
  ],
};
