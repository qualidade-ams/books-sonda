import { describe, it, expect } from 'vitest';
import {
  SEM_FILTRO_RETROATIVOS,
  filtrarRetroativos,
  opcoesDosRetroativos,
} from '../retroativosTela';
import type { ItemRetroativo, Retroativo } from '@/types/retroativos';

const item = (id: string, extra: Partial<ItemRetroativo> = {}): ItemRetroativo => ({
  id,
  tipo: 'apontamento',
  itemId: `ap-${id}`,
  chamado: `CH-${id}`,
  tarefa: `T-${id}`,
  consultor: 'Ana Souza',
  dataAtividade: '2026-09-10',
  lancadoEm: '2026-10-05T12:00:00Z',
  statusChamado: 'Closed',
  minutos: 60,
  tickets: 0,
  aviso: null,
  ...extra,
});

const retroativo = (id: string, extra: Partial<Retroativo> = {}): Retroativo => ({
  id,
  empresaId: 'e1',
  empresa: 'ALFA',
  bancoId: 'b1',
  banco: 'BANCO COMEX',
  mes: { ano: 2026, mes: 9 },
  consumoAntesMinutos: 600,
  consumoDepoisMinutos: 660,
  consumoAntesTickets: 0,
  consumoDepoisTickets: 0,
  detectadoEm: '2026-10-05T12:00:00Z',
  atualizadoEm: '2026-10-05T12:00:00Z',
  situacao: 'pendente',
  decisao: null,
  retificacao: null,
  itens: [item('1')],
  ...extra,
});

const LISTA = [
  retroativo('r1'),
  retroativo('r2', {
    empresaId: 'e2',
    empresa: 'BETA PARTICIPAÇÕES',
    banco: 'Banco padrão',
    itens: [item('2', { consultor: 'Bruno Lima', chamado: 'RF-900' })],
  }),
  retroativo('r3', { situacao: 'aprovado' }),
];

describe('filtrarRetroativos', () => {
  it('pela situação da aba', () => {
    expect(filtrarRetroativos(LISTA, 'pendente', SEM_FILTRO_RETROATIVOS).map((r) => r.id)).toEqual([
      'r1',
      'r2',
    ]);
    expect(filtrarRetroativos(LISTA, 'aprovado', SEM_FILTRO_RETROATIVOS).map((r) => r.id)).toEqual([
      'r3',
    ]);
  });

  it('busca em empresa, banco, chamado e tarefa, sem acento nem caixa', () => {
    const busca = (texto: string) =>
      filtrarRetroativos(LISTA, 'pendente', { ...SEM_FILTRO_RETROATIVOS, busca: texto }).map(
        (r) => r.id
      );
    expect(busca('participacoes')).toEqual(['r2']);
    expect(busca('padrão')).toEqual(['r2']);
    expect(busca('rf-900')).toEqual(['r2']);
    expect(busca('t-1')).toEqual(['r1']);
  });

  it('por empresa e por consultor de algum apontamento', () => {
    expect(
      filtrarRetroativos(LISTA, 'pendente', { ...SEM_FILTRO_RETROATIVOS, empresas: ['e2'] }).map(
        (r) => r.id
      )
    ).toEqual(['r2']);
    expect(
      filtrarRetroativos(LISTA, 'pendente', {
        ...SEM_FILTRO_RETROATIVOS,
        consultores: ['Ana Souza'],
      }).map((r) => r.id)
    ).toEqual(['r1']);
  });
});

describe('opcoesDosRetroativos', () => {
  it('empresas e consultores únicos, em ordem alfabética', () => {
    expect(
      opcoesDosRetroativos([
        ...LISTA,
        retroativo('r4', { itens: [item('4', { consultor: null })] }),
      ])
    ).toEqual({
      empresas: [
        { valor: 'e1', rotulo: 'ALFA' },
        { valor: 'e2', rotulo: 'BETA PARTICIPAÇÕES' },
      ],
      consultores: ['Ana Souza', 'Bruno Lima'],
    });
  });
});
