import { describe, it, expect } from 'vitest';
import { matrizDaAba } from '@/utils/exportarTabela';
import {
  SEM_FILTRO_RETROATIVOS,
  exportacaoRetroativos,
  filtrarRetroativos,
  montarEnvelopes,
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

describe('montarEnvelopes', () => {
  const sel = (id: string, consultor: string | null) => ({
    id,
    retroativoId: 'r1',
    itemId: `ap-${id}`,
    empresa: 'ALFA',
    chamado: `CH-${id}`,
    tarefa: null,
    consultor,
    minutos: 60,
    mes: { ano: 2026, mes: 9 },
  });

  it('um envelope por consultor, com o e-mail do cadastro; sem consultor, sem e-mail', () => {
    const envelopes = montarEnvelopes(
      [sel('1', 'Bruno Lima'), sel('2', 'Ana Souza'), sel('3', 'Ana Souza'), sel('4', null)],
      { 'Ana Souza': 'ana@sonda.com', 'Bruno Lima': null },
      'Sem consultor'
    );
    expect(envelopes.map((e) => [e.consultor, e.email, e.itens.map((i) => i.itemId)])).toEqual([
      ['Ana Souza', 'ana@sonda.com', ['ap-2', 'ap-3']],
      ['Bruno Lima', null, ['ap-1']],
      ['Sem consultor', null, ['ap-4']],
    ]);
  });
});

describe('exportacaoRetroativos', () => {
  const t = (chave: string) => chave;
  it('uma linha por apontamento ou ticket, com o retroativo de que faz parte', () => {
    const exportacao = exportacaoRetroativos(
      [
        retroativo('r1', {
          situacao: 'descartado',
          decisao: {
            em: '2026-10-06T12:00:00Z',
            porId: null,
            por: null,
            justificativa: 'Relançar',
          },
          itens: [
            item('1', { minutos: -90 }),
            item('2', {
              tipo: 'ticket',
              minutos: 0,
              tickets: 1,
              dataAtividade: null,
              tarefa: null,
            }),
          ],
        }),
      ],
      t,
      'pt-BR'
    );
    expect(exportacao.arquivo).toBe('apontamentosRetroativos.exportar.arquivo');
    const [cabecalho, ...linhas] = matrizDaAba(exportacao.abas[0]);
    expect(cabecalho).toEqual([
      'apontamentosRetroativos.exportar.colunas.empresa',
      'apontamentosRetroativos.exportar.colunas.banco',
      'apontamentosRetroativos.exportar.colunas.mes',
      'fase3Comum.situacao',
      'apontamentosRetroativos.exportar.colunas.tipo',
      'apontamentosRetroativos.exportar.colunas.chamado',
      'apontamentosRetroativos.exportar.colunas.tarefa',
      'apontamentosRetroativos.colunas.consultor',
      'apontamentosRetroativos.colunas.dataAtividade',
      'apontamentosRetroativos.colunas.dataSistema',
      'apontamentosRetroativos.colunas.status',
      'apontamentosRetroativos.exportar.colunas.horas',
      'apontamentosRetroativos.exportar.colunas.tickets',
      'apontamentosRetroativos.exportar.colunas.justificativa',
    ]);
    expect(linhas).toEqual([
      [
        'ALFA',
        'BANCO COMEX',
        'Set/2026',
        'apontamentosRetroativos.situacoes.descartado',
        'apontamentosRetroativos.exportar.tipo.apontamento',
        'CH-1',
        'T-1',
        'Ana Souza',
        '2026-09-10',
        '2026-10-05 09:00',
        'Closed',
        '-01:30',
        0,
        'Relançar',
      ],
      [
        'ALFA',
        'BANCO COMEX',
        'Set/2026',
        'apontamentosRetroativos.situacoes.descartado',
        'apontamentosRetroativos.exportar.tipo.ticket',
        'CH-2',
        '',
        'Ana Souza',
        '',
        '2026-10-05 09:00',
        'Closed',
        '00:00',
        1,
        'Relançar',
      ],
    ]);
  });
});
