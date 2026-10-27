import { describe, it, expect } from 'vitest';
import { matrizDaAba } from '@/utils/exportarTabela';
import type { Catalogo } from '@/types/catalogo';
import {
  destinoMudou,
  conferirMapeamentos,
  empresasAfetadas,
  exportacaoMapeamentos,
  filtrarMapeamentos,
  grupoJaMapeado,
  gruposDoBook,
  mapeamentosImportados,
  totaisDePara,
  SEM_FILTRO,
} from '../deParaTela';
import type { GrupoNaoMapeado, MapeamentoGrupo, UsoGrupo } from '@/types/dePara';

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const mapeamento = (
  id: string,
  grupoAranda: string,
  grupoBook: string,
  destino: Partial<MapeamentoGrupo>,
  classificacao: MapeamentoGrupo['classificacao']
): MapeamentoGrupo => ({
  id,
  grupoAranda,
  grupoBook,
  solucaoId: null,
  produtoId: null,
  moduloId: null,
  classificacao,
  ...autoria,
  ...destino,
});

const LISTA = [
  mapeamento(
    'g1',
    'AMS APL - CAMBIO - N2',
    'COMEX',
    { solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' },
    'modulo'
  ),
  mapeamento('g2', 'AMS APL - CE - N2', 'COMEX', { solucaoId: 's1', produtoId: 'ce' }, 'produto'),
  mapeamento('g3', 'AMS DBA', 'DBA', { solucaoId: 's1' }, 'solucao'),
  mapeamento('g4', 'DEDICADOS', 'Dedicados', {}, 'nao_se_aplica'),
];

describe('filtrarMapeamentos', () => {
  it('sem filtro, todos', () => {
    expect(filtrarMapeamentos(LISTA, SEM_FILTRO)).toHaveLength(4);
  });

  it('busca no grupo do Aranda e no do Book, sem diferenciar maiúsculas', () => {
    expect(filtrarMapeamentos(LISTA, { ...SEM_FILTRO, busca: 'cambio' }).map((m) => m.id)).toEqual([
      'g1',
    ]);
    expect(filtrarMapeamentos(LISTA, { ...SEM_FILTRO, busca: 'dedic' }).map((m) => m.id)).toEqual([
      'g4',
    ]);
  });

  it('solução, produto, módulo e situação se somam', () => {
    expect(filtrarMapeamentos(LISTA, { ...SEM_FILTRO, solucoes: ['s1'] }).map((m) => m.id)).toEqual(
      ['g1', 'g2', 'g3']
    );
    expect(filtrarMapeamentos(LISTA, { ...SEM_FILTRO, produtos: ['ce'] }).map((m) => m.id)).toEqual(
      ['g1', 'g2']
    );
    expect(
      filtrarMapeamentos(LISTA, { ...SEM_FILTRO, modulos: ['cambio'] }).map((m) => m.id)
    ).toEqual(['g1']);
    expect(
      filtrarMapeamentos(LISTA, {
        ...SEM_FILTRO,
        solucoes: ['s1'],
        situacao: ['produto', 'solucao'],
      }).map((m) => m.id)
    ).toEqual(['g2', 'g3']);
  });
});

describe('totaisDePara', () => {
  it('mapeados, com módulo, sem módulo e não mapeados', () => {
    const naoMapeados = [{ grupoAranda: 'X' }, { grupoAranda: 'Y' }] as GrupoNaoMapeado[];
    expect(totaisDePara(LISTA, naoMapeados)).toEqual({
      mapeados: 4,
      comModulo: 1,
      semModulo: 3,
      naoMapeados: 2,
    });
  });
});

describe('gruposDoBook', () => {
  it('os já usados, sem repetir, em ordem', () => {
    expect(gruposDoBook(LISTA)).toEqual(['COMEX', 'DBA', 'Dedicados']);
  });
});

describe('empresasAfetadas', () => {
  it('empresas com bancos múltiplos dos grupos escolhidos, sem repetir', () => {
    const uso: Record<string, UsoGrupo> = {
      g1: { apontamentos: 10, tickets: 1, empresasMultiplos: ['BETA', 'ALFA'] },
      g2: { apontamentos: 3, tickets: 0, empresasMultiplos: ['ALFA'] },
    };
    expect(empresasAfetadas(['g1', 'g2', 'g3'], uso)).toEqual(['ALFA', 'BETA']);
  });
});

describe('grupoJaMapeado', () => {
  it('compara sem espaços nas pontas e sem diferenciar maiúsculas', () => {
    expect(grupoJaMapeado(' ams dba ', LISTA)).toBe(true);
    expect(grupoJaMapeado('AMS NOVO', LISTA)).toBe(false);
  });
});

describe('destinoMudou', () => {
  it('qualquer nível diferente conta', () => {
    expect(destinoMudou(LISTA[0], { solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' })).toBe(
      false
    );
    expect(destinoMudou(LISTA[0], { solucaoId: 's1', produtoId: 'ce', moduloId: null })).toBe(true);
  });
});

describe('exportacaoMapeamentos', () => {
  const t = (chave: string) => chave;
  const CATALOGO = {
    solucoes: [{ id: 's1', nome: 'COMEX' }],
    produtos: [{ id: 'ce', nome: 'CE PLUS', solucaoId: 's1' }],
    modulos: [{ id: 'cambio', nome: 'Câmbio', produtoId: 'ce' }],
  } as unknown as Catalogo;
  const USO: Record<string, UsoGrupo> = {
    g1: { apontamentos: 120, tickets: 4, empresasMultiplos: [] },
  };

  it('uma linha por mapeamento, com o destino pelo nome e o uso', () => {
    const exportacao = exportacaoMapeamentos([LISTA[0], LISTA[3]], CATALOGO, USO, t);
    expect(exportacao.arquivo).toBe('deParaGrupos.exportar.arquivo');
    expect(matrizDaAba(exportacao.abas[0])).toEqual([
      [
        'deParaGrupos.lista.colunaGrupo',
        'deParaGrupos.lista.colunaBook',
        'deParaGrupos.destino.solucao',
        'deParaGrupos.destino.produto',
        'deParaGrupos.destino.modulo',
        'fase3Comum.situacao',
        'deParaGrupos.lista.colunaApontamentos',
        'deParaGrupos.exportar.tickets',
      ],
      [
        'AMS APL - CAMBIO - N2',
        'COMEX',
        'COMEX',
        'CE PLUS',
        'Câmbio',
        'deParaGrupos.classificacao.modulo',
        120,
        4,
      ],
      ['DEDICADOS', 'Dedicados', '', '', '', 'deParaGrupos.classificacao.nao_se_aplica', 0, 0],
    ]);
  });
});

describe('importação de mapeamentos', () => {
  const t = (chave: string, valores?: Record<string, unknown>) =>
    valores ? `${chave} ${JSON.stringify(valores)}` : chave;
  const CATALOGO = {
    solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ativo: true }],
    produtos: [{ id: 'ce', nome: 'CE PLUS', solucaoId: 's1', ativo: true }],
    modulos: [{ id: 'cambio', nome: 'Câmbio', produtoId: 'ce', ativo: true }],
  } as unknown as Catalogo;
  const linha = (
    n: number,
    grupo: string,
    book: string,
    solucao = '',
    produto = '',
    modulo = ''
  ) => ({
    linha: n,
    valores: { grupo, book, solucao, produto, modulo },
  });
  const LINHAS = [
    linha(2, 'AMS NOVO', 'COMEX - Novo', 'comex', 'ce plus'),
    linha(3, 'ams apl - cambio - n2', 'COMEX', 'COMEX', 'CE PLUS', 'Câmbio'),
    linha(4, 'AMS DBA', 'DBA'),
    linha(5, 'AMS X', '', 'FISCAL'),
    linha(6, 'AMS Y', 'B', 'COMEX', 'NADA'),
    linha(7, 'AMS Z', 'B', '', 'CE PLUS'),
    linha(8, 'AMS W', 'B', 'COMEX', 'CE PLUS', 'SVA'),
    linha(9, 'ams novo', 'B'),
    linha(10, '', 'B'),
  ];

  it('confere: o destino pelo nome no catálogo; o grupo sem diferenciar maiúsculas', () => {
    expect(
      conferirMapeamentos(LINHAS, LISTA, CATALOGO, t).map((l) => [l.situacao, l.erros])
    ).toEqual([
      ['novo', undefined],
      ['igual', undefined],
      ['atualiza', undefined],
      [
        'erro',
        [
          'deParaGrupos.importar.erros.bookVazio',
          'deParaGrupos.importar.erros.solucaoNaoExiste {"nome":"FISCAL"}',
        ],
      ],
      ['erro', ['deParaGrupos.importar.erros.produtoNaoExiste {"nome":"NADA","solucao":"COMEX"}']],
      ['erro', ['deParaGrupos.importar.erros.produtoSemSolucao']],
      ['erro', ['deParaGrupos.importar.erros.moduloNaoExiste {"nome":"SVA","produto":"CE PLUS"}']],
      ['erro', ['deParaGrupos.importar.erros.repetido {"linha":2}']],
      ['erro', ['deParaGrupos.importar.erros.grupoVazio']],
    ]);
  });

  it('o que gravar: os novos sem id e os que mudam com o id do mapeamento', () => {
    const conferidas = conferirMapeamentos(LINHAS, LISTA, CATALOGO, t);
    expect(
      mapeamentosImportados(
        conferidas.filter((l) => l.situacao === 'novo' || l.situacao === 'atualiza'),
        LISTA,
        CATALOGO
      )
    ).toEqual([
      {
        grupoAranda: 'AMS NOVO',
        grupoBook: 'COMEX - Novo',
        destino: { solucaoId: 's1', produtoId: 'ce', moduloId: null },
      },
      {
        id: 'g3',
        grupoAranda: 'AMS DBA',
        grupoBook: 'DBA',
        destino: { solucaoId: null, produtoId: null, moduloId: null },
      },
    ]);
  });
});
