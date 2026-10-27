import { describe, it, expect } from 'vitest';
import { matrizDaAba } from '@/utils/exportarTabela';
import type { Catalogo } from '@/types/catalogo';
import {
  destinoMudou,
  empresasAfetadas,
  exportacaoMapeamentos,
  filtrarMapeamentos,
  grupoJaMapeado,
  gruposDoBook,
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
