/**
 * Requerimentos exibidos nas abas do book (aba "Requerimentos Faturados").
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

interface Consulta {
  tabela: string;
  chamadas: [string, any[]][];
}

const estado = vi.hoisted(() => ({
  respostas: {} as Record<string, { data: any; error: any }>,
  consultas: [] as any[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const from = (tabela: string) => {
    const consulta = { tabela, chamadas: [] as [string, any[]][] };
    estado.consultas.push(consulta);
    const builder: any = new Proxy(
      {},
      {
        get(_alvo, prop: string) {
          if (prop === 'then') {
            const resultado = estado.respostas[tabela] ?? { data: [], error: null };
            return (ok: any, falha: any) => Promise.resolve(resultado).then(ok, falha);
          }
          return (...args: any[]) => {
            consulta.chamadas.push([prop, args]);
            return builder;
          };
        },
      }
    );
    return builder;
  };
  return { supabase: { from } };
});

import {
  buscarRequerimentosEmDesenvolvimentoParaBook,
  buscarRequerimentosFaturadosParaBook,
  formatarRequerimentoParaBook,
  paginarRequerimentosBook,
} from '../requerimentosBookService';

const EMPRESA_ID = 'emp-1';

const REQ_FATURADO = {
  id: 'req-1',
  chamado: 'RF-9175039',
  cliente_id: EMPRESA_ID,
  modulo: 'Comply',
  descricao: 'Ajuste no layout da nota fiscal',
  tipo_cobranca: 'Banco de Horas',
  status: 'faturado',
  horas_funcional: '1.50',
  horas_tecnico: '60.00',
  data_envio: '2026-06-11',
  mes_cobranca: '09/2026',
  valor_total_funcional: null,
  valor_total_tecnico: null,
};

const consultaDe = (tabela: string): Consulta => estado.consultas.find((c) => c.tabela === tabela);
const filtrosDe = (c: Consulta) => c.chamadas.filter(([m]) => m !== 'select');

describe('requerimentosBookService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    estado.consultas = [];
    estado.respostas = {
      empresas_clientes: { data: { nome_abreviado: 'SAINT GOBAIN' }, error: null },
      apontamentos_tickets_aranda: {
        data: [{ nro_solicitacao: '9175039', ticket_externo: ' RITMSD2242075 ' }],
        error: null,
      },
    };
  });

  afterEach(() => vi.restoreAllMocks());

  describe('formatarRequerimentoParaBook', () => {
    it('formata horas em HH:MM, data dd/mm/aaaa e leva a descrição', () => {
      const linha = formatarRequerimentoParaBook(REQ_FATURADO, {
        nomeCliente: 'SAINT GOBAIN',
        ticketExterno: 'RITMSD2242075',
        status: 'Faturado',
      });

      expect(linha).toEqual({
        id: 'req-1',
        numero_chamado: 'RF-9175039',
        ticket_externo: 'RITMSD2242075',
        cliente: 'SAINT GOBAIN',
        modulo: 'Comply',
        descricao: 'Ajuste no layout da nota fiscal',
        tipo_cobranca: 'Banco de Horas',
        horas_funcional: '01:30',
        horas_tecnica: '60:00',
        total_horas: '61:30',
        data_envio: '11/06/2026',
        status: 'Faturado',
        valor_total: undefined,
        periodo_cobranca: '09/2026',
      });
    });

    it('aceita horas no formato HH:MM e campos vazios', () => {
      const linha = formatarRequerimentoParaBook(
        { id: 'req-2', horas_funcional: '02:15', horas_tecnico: null, data_envio: null },
        { nomeCliente: 'X', ticketExterno: '', status: 'Faturado' }
      );

      expect(linha).toMatchObject({
        numero_chamado: '--',
        modulo: '--',
        descricao: '',
        horas_funcional: '02:15',
        horas_tecnica: '00:00',
        total_horas: '02:15',
        data_envio: '--',
      });
    });
  });

  describe('buscarRequerimentosFaturadosParaBook', () => {
    it('busca os requerimentos de Banco de Horas faturados com mês de cobrança do book', async () => {
      estado.respostas.requerimentos = { data: [REQ_FATURADO], error: null };

      await buscarRequerimentosFaturadosParaBook(EMPRESA_ID, 9, 2026);

      expect(filtrosDe(consultaDe('requerimentos'))).toEqual([
        ['eq', ['cliente_id', EMPRESA_ID]],
        ['eq', ['mes_cobranca', '09/2026']],
        ['eq', ['tipo_cobranca', 'Banco de Horas']],
        ['in', ['status', ['enviado_faturamento', 'faturado', 'concluido']]],
        ['order', ['chamado', { ascending: true }]],
      ]);
    });

    it('devolve as linhas formatadas com status "Faturado", nome abreviado da empresa e ticket externo', async () => {
      estado.respostas.requerimentos = { data: [REQ_FATURADO], error: null };

      const linhas = await buscarRequerimentosFaturadosParaBook(EMPRESA_ID, 9, 2026);

      expect(linhas).toHaveLength(1);
      expect(linhas[0]).toMatchObject({
        numero_chamado: 'RF-9175039',
        ticket_externo: 'RITMSD2242075',
        cliente: 'SAINT GOBAIN',
        descricao: 'Ajuste no layout da nota fiscal',
        total_horas: '61:30',
        status: 'Faturado',
        periodo_cobranca: '09/2026',
      });
    });

    it('devolve lista vazia sem consultar tickets quando não há faturados', async () => {
      estado.respostas.requerimentos = { data: [], error: null };

      const linhas = await buscarRequerimentosFaturadosParaBook(EMPRESA_ID, 9, 2026);

      expect(linhas).toEqual([]);
      expect(consultaDe('apontamentos_tickets_aranda')).toBeUndefined();
    });

    it('propaga o erro da consulta de requerimentos', async () => {
      estado.respostas.requerimentos = { data: null, error: { message: 'falhou', code: '500' } };

      await expect(buscarRequerimentosFaturadosParaBook(EMPRESA_ID, 9, 2026)).rejects.toMatchObject(
        {
          message: 'falhou',
        }
      );
    });
  });

  describe('buscarRequerimentosEmDesenvolvimentoParaBook', () => {
    const REQ_LANCADO = {
      ...REQ_FATURADO,
      status: 'lancado',
      data_envio: '2026-09-25',
      mes_cobranca: null,
    };

    it('busca os requerimentos de Banco de Horas lançados com data de envio até o fim do mês do book', async () => {
      estado.respostas.requerimentos = { data: [REQ_LANCADO], error: null };

      await buscarRequerimentosEmDesenvolvimentoParaBook(EMPRESA_ID, 9, 2026);

      expect(filtrosDe(consultaDe('requerimentos'))).toEqual([
        ['eq', ['cliente_id', EMPRESA_ID]],
        ['eq', ['tipo_cobranca', 'Banco de Horas']],
        ['eq', ['status', 'lancado']],
        ['lte', ['data_envio', '2026-09-30']],
        ['order', ['chamado', { ascending: true }]],
      ]);
    });

    it('devolve as linhas com status "Em desenvolvimento" e a descrição', async () => {
      estado.respostas.requerimentos = { data: [REQ_LANCADO], error: null };

      const linhas = await buscarRequerimentosEmDesenvolvimentoParaBook(EMPRESA_ID, 9, 2026);

      expect(linhas).toEqual([
        expect.objectContaining({
          numero_chamado: 'RF-9175039',
          cliente: 'SAINT GOBAIN',
          descricao: 'Ajuste no layout da nota fiscal',
          data_envio: '25/09/2026',
          status: 'Em desenvolvimento',
        }),
      ]);
    });

    it('descarta requerimento com data de envio em mês posterior ao do book', async () => {
      estado.respostas.requerimentos = {
        data: [REQ_LANCADO, { ...REQ_LANCADO, id: 'req-futuro', data_envio: '2026-10-02' }],
        error: null,
      };

      const linhas = await buscarRequerimentosEmDesenvolvimentoParaBook(EMPRESA_ID, 9, 2026);

      expect(linhas.map((l) => l.id)).toEqual(['req-1']);
    });

    it('propaga o erro da consulta de requerimentos', async () => {
      estado.respostas.requerimentos = { data: null, error: { message: 'falhou', code: '500' } };

      await expect(
        buscarRequerimentosEmDesenvolvimentoParaBook(EMPRESA_ID, 9, 2026)
      ).rejects.toMatchObject({ message: 'falhou' });
    });
  });

  describe('paginarRequerimentosBook', () => {
    const linhas = Array.from({ length: 23 }, (_, i) => ({ id: `r${i}` })) as any[];

    it('divide em páginas de 11 linhas', () => {
      const paginas = paginarRequerimentosBook(linhas);

      expect(paginas.map((p) => p.length)).toEqual([11, 11, 1]);
      expect(paginas[2][0].id).toBe('r22');
    });

    it('lista vazia não gera página', () => {
      expect(paginarRequerimentosBook([])).toEqual([]);
    });
  });
});
