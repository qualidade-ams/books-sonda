import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { BookConsumoBancosService } from '../bookConsumoBancosService';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { ResultadoBancoMes, ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';
import type { ChamadoDoBanco, SaldoParcialBanco } from '../controleSaldoParcialService';

// ---------------------------------------------------------------------------
// Book de Setembro/2026 da EMPRESA ALFA (e1), liberada; período Jul a Set
// ---------------------------------------------------------------------------

const SET: MesAno = { mes: 9, ano: 2026 };
const mes = (m: number, ano = 2026): MesAno => ({ mes: m, ano });

const unidade = (consumo: number, requerimentos = 0): ResultadoUnidade =>
  ({ consumo, requerimentos, saldo: 0, repasse: 0 }) as ResultadoUnidade;
const resultado = (bancoId: string, m: MesAno, consumo: number, requerimentos = 0) =>
  ({
    bancoId,
    mes: m,
    fechado: true,
    horas: unidade(consumo, requerimentos),
    tickets: null,
  }) as ResultadoBancoMes;

const bancoSaldoParcial = (bancoId: string, nome: string): SaldoParcialBanco => ({
  bancoId,
  nome,
  tipoContrato: 'horas',
  consomeOutrosBancos: false,
  meses: [
    {
      mes: mes(7),
      chave: '2026-07',
      situacao: 'fechado',
      resultado: resultado(bancoId, mes(7), 600),
    },
    {
      mes: mes(8),
      chave: '2026-08',
      situacao: 'fechado',
      resultado: resultado(bancoId, mes(8), 700),
    },
    { mes: mes(9), chave: '2026-09', situacao: 'fechado', resultado: undefined },
  ],
  requerimentos: [
    {
      chamado: 'RF-1',
      titulo: 'Agosto',
      modulo: 'Câmbio',
      mes: mes(8),
      minutos: 60,
      tickets: 0,
      situacao: 'enviado',
    },
    {
      chamado: 'RF-2',
      titulo: 'Setembro',
      modulo: 'Câmbio',
      mes: SET,
      minutos: 120,
      tickets: 0,
      situacao: 'enviado',
    },
  ] as SaldoParcialBanco['requerimentos'],
  reajustes: [],
  observacoes: [
    { mes: SET, texto: 'Observação para o cliente' },
  ] as SaldoParcialBanco['observacoes'],
});

const chamado = (m: MesAno, tipoChamado: ChamadoDoBanco['tipoChamado'], minutos: number) =>
  ({ mes: m, fonte: 'apontamento', tipoChamado, minutos, tickets: 0 }) as ChamadoDoBanco;

function cenario() {
  const fake = criarSupabaseEmMemoria(
    {
      empresas: [
        {
          id: 'e1',
          nome_abreviado: 'EMPRESA ALFA',
          modelo_calculo: 'multiplo',
          empresa_consolidadora_id: null,
        },
        {
          id: 'e2',
          nome_abreviado: 'ALFA FILIAL',
          modelo_calculo: 'multiplo',
          empresa_consolidadora_id: 'e1',
        },
        {
          id: 'e3',
          nome_abreviado: 'ALFA LEGADO',
          modelo_calculo: 'legado',
          empresa_consolidadora_id: 'e1',
        },
      ],
    },
    {
      gravar_consumo_bancos_do_book: () => 2,
      consumo_bancos_do_book: () => [{ ordem: 1, banco_id: 'b1', dados: { mes: SET } }],
    }
  );
  const saldoParcial = {
    bancos: vi.fn(async (empresaId: string) =>
      empresaId === 'e1'
        ? [bancoSaldoParcial('b1', 'Banco COMEX')]
        : empresaId === 'e2'
          ? [bancoSaldoParcial('b9', 'Banco da Filial')]
          : [bancoSaldoParcial('b-legado', 'Não entra')]
    ),
    chamados: vi.fn(async (_e: string, bancos: SaldoParcialBanco[]) =>
      Object.fromEntries(
        bancos.map((b) => [
          b.bancoId,
          [
            chamado(mes(8), 'IM', 999),
            chamado(SET, 'IM', 90),
            chamado(SET, 'RF', 30),
            chamado(SET, 'PM', 15),
          ],
        ])
      )
    ),
  };
  const controle = {
    // Histórico: 6 meses até o mês do Book
    quadro: vi.fn(async (_e: string, meses: MesAno[]) =>
      Object.fromEntries(
        meses.map((m) => [
          `${m.ano}-${String(m.mes).padStart(2, '0')}`,
          { bancos: [resultado('b1', m, m.mes * 10, m.mes), resultado('b9', m, m.mes, 0)] },
        ])
      )
    ),
  };
  const servico = new BookConsumoBancosService(fake as any, saldoParcial as any, controle as any);
  return { fake, saldoParcial, controle, servico };
}

describe('BookConsumoBancosService.montar', () => {
  it('um bloco por banco que o cliente vê, com o período, o histórico e o mês do Book', async () => {
    const { servico, saldoParcial, controle } = cenario();
    const linhas = await servico.montar('e1', SET, { b1: 'f-set' });

    expect(saldoParcial.bancos).toHaveBeenCalledWith('e1', SET);
    const [b1] = linhas;
    expect(b1).toMatchObject({
      banco_id: 'b1',
      ordem: 1,
      nome_banco: 'Banco COMEX',
      nome_empresa: 'EMPRESA ALFA',
      fechamento_id: 'f-set',
    });
    expect(b1.dados.mes).toEqual(SET);
    expect(b1.dados.tipoContrato).toBe('horas');
    // Meses do período inteiro, como o Book do legado; o resultado do motor de cada um
    expect(
      b1.dados.meses.map((m) => [m.mes.mes, m.situacao, m.resultado?.horas?.consumo ?? null])
    ).toEqual([
      [7, 'fechado', 600],
      [8, 'fechado', 700],
      [9, 'fechado', null],
    ]);
    // Requerimentos só do mês do Book; reajustes e observações do período
    expect(b1.dados.requerimentos.map((r) => r.chamado)).toEqual(['RF-2']);
    expect(b1.dados.observacoes).toEqual([{ mes: SET, texto: 'Observação para o cliente' }]);

    // Gráfico: 6 meses até o do Book
    expect(controle.quadro).toHaveBeenCalledWith('e1', [
      mes(4),
      mes(5),
      mes(6),
      mes(7),
      mes(8),
      SET,
    ]);
    expect(b1.dados.historico.map((h) => [h.mes.mes, h.minutos, h.requerimentosMinutos])).toEqual([
      [4, 40, 4],
      [5, 50, 5],
      [6, 60, 6],
      [7, 70, 7],
      [8, 80, 8],
      [9, 90, 9],
    ]);

    // Incidente (IM) e solicitação (RF) do mês do Book
    expect(b1.dados.porTipo).toEqual({
      incidente: { minutos: 90, tickets: 0 },
      solicitacao: { minutos: 30, tickets: 0 },
    });
  });

  it('bancos das consolidadas liberadas entram depois, com o nome da empresa (D-15)', async () => {
    const { servico, saldoParcial } = cenario();
    const linhas = await servico.montar('e1', SET, {});

    expect(linhas.map((l) => [l.banco_id, l.ordem, l.nome_empresa])).toEqual([
      ['b1', 1, 'EMPRESA ALFA'],
      ['b9', 2, 'ALFA FILIAL'],
    ]);
    // A consolidada em Legado fica de fora: o modelo novo dela não foi validado
    expect(saldoParcial.bancos).not.toHaveBeenCalledWith('e3', SET);
    expect(linhas[1].fechamento_id).toBeNull();
  });
});

describe('BookConsumoBancosService: gravar e ler', () => {
  it('grava e lê pelas funções da migration 28', async () => {
    const { servico, fake } = cenario();
    await servico.gravar('book1', []);
    const doBook = await servico.doBook('book1');

    expect(fake.chamadasRpc).toEqual([
      { nome: 'gravar_consumo_bancos_do_book', args: { p_book_id: 'book1', p_bancos: [] } },
      { nome: 'consumo_bancos_do_book', args: { p_book_id: 'book1' } },
    ]);
    expect(doBook).toEqual([{ ordem: 1, banco_id: 'b1', dados: { mes: SET } }]);
  });
});

describe('BookConsumoBancosService.abasDoExcel', () => {
  it('resumo e uma aba por banco (da empresa e das consolidadas liberadas), só com os chamados do mês do Book', async () => {
    const { servico } = cenario();
    const abas = await servico.abasDoExcel('e1', SET);

    expect(abas.map((a) => a.nome)).toEqual(['Resumo', 'Banco COMEX', 'Banco da Filial']);
    const comex = XLSX.utils.sheet_to_csv(abas[1].sheet);
    // Setembro: 90 + 30 + 15 min; agosto (999 min) não entra no detalhamento do Book de setembro
    expect(comex).toContain('01:30');
    expect(comex).not.toContain('16:39');
  });
});
