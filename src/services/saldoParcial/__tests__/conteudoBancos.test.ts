import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx-js-style';
import { gerarHtmlTabelasBancos, montarWorkbookBancos } from '../conteudoBancos';
import type { SaldoParcialBanco, ChamadoDoBanco } from '@/services/controleSaldoParcialService';
import type { ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';
import type { MesAno } from '@/services/bancosHoras/calculo';

const t = (chave: string, valores?: Record<string, unknown>) =>
  valores ? `${chave} ${JSON.stringify(valores)}` : chave;
const opcoes = { t, idioma: 'pt-BR' };

const unidade = (saldo: number, extra: Partial<ResultadoUnidade> = {}): ResultadoUnidade =>
  ({
    baseline: 600,
    repasseAnterior: 0,
    saldoAUtilizar: 600,
    consumo: 300,
    requerimentos: 120,
    reajustes: 30,
    consumoTotal: 450,
    saldo,
    consumidoDeOutros: 0,
    cedidoAOutros: 0,
    saldoFinal: saldo,
    repasse: 0,
    excedente: 0,
    valorExcedente: 0,
    taxa: null,
    ...extra,
  }) as ResultadoUnidade;

const mes = (
  m: number,
  situacao: 'fechado' | 'aberto' | 'futuro',
  horas: ResultadoUnidade | null,
  tickets: ResultadoUnidade | null = null
) => ({
  mes: { ano: 2026, mes: m } as MesAno,
  chave: `2026-${String(m).padStart(2, '0')}`,
  situacao,
  resultado: { percentualRepasse: 100, horas, tickets } as any,
});

const BANCOS: SaldoParcialBanco[] = [
  {
    bancoId: 'b1',
    nome: 'BANCO COMEX',
    tipoContrato: 'horas',
    consomeOutrosBancos: true,
    meses: [
      mes(9, 'fechado', unidade(150)),
      mes(10, 'aberto', unidade(-90)),
      // Mês que ainda não começou: vai a projeção, marcada
      mes(11, 'futuro', unidade(777, { baseline: 777 })),
    ],
    requerimentos: [
      {
        chamado: 'RQ-1',
        titulo: '<b>Relatório</b>',
        modulo: 'Comex',
        mes: { ano: 2026, mes: 10 },
        minutos: 120,
        tickets: 0,
        situacao: 'desenvolvimento',
      },
    ],
    reajustes: [
      {
        mes: { ano: 2026, mes: 9 },
        tipo: 'saida',
        minutos: 30,
        tickets: 0,
        justificativa: 'Visita presencial',
      },
    ],
    observacoes: [{ mes: { ano: 2026, mes: 10 }, texto: 'Janela de atualização' }],
  },
  {
    bancoId: 'b2',
    nome: 'BANCO TICKETS',
    tipoContrato: 'tickets',
    consomeOutrosBancos: false,
    meses: [mes(10, 'aberto', null, unidade(4, { baseline: 10 }))],
    requerimentos: [],
    reajustes: [],
    observacoes: [],
  },
];

describe('gerarHtmlTabelasBancos', () => {
  const html = gerarHtmlTabelasBancos(BANCOS, opcoes);

  it('um bloco por banco, na ordem, com o período', () => {
    expect(html.indexOf('BANCO COMEX')).toBeLessThan(html.indexOf('BANCO TICKETS'));
    expect(html).toContain('controleBancoHoras.saldoParcial.periodo {"periodo":"Set – Nov/2026"}');
  });

  it('quadro do banco com as linhas da tela; mês futuro com a projeção, marcado', () => {
    expect(html).toContain('controleBancoHoras.quadro.baseline');
    expect(html).toContain('controleBancoHoras.quadro.repasse {"n":100}');
    expect(html).toContain('10:00');
    expect(html).toContain('−01:30');
    expect(html).toContain('12:57');
    expect(html).toContain('Nov/2026 (controleBancoHoras.quadro.projetado)');
    expect(html).not.toContain('Out/2026 (controleBancoHoras.quadro.projetado)');
  });

  it('banco de tickets mostra a quantidade', () => {
    const bloco = html.slice(html.indexOf('BANCO TICKETS'));
    expect(bloco).toContain('>10<');
    expect(bloco).not.toContain('controleBancoHoras.saldoParcial.requerimentos');
  });

  it('requerimentos, reajustes e observações, com o texto escapado', () => {
    expect(html).toContain('RQ-1');
    expect(html).toContain('&lt;b&gt;Relatório&lt;/b&gt;');
    expect(html).not.toContain('<b>Relatório</b>');
    expect(html).toContain('controleBancoHoras.saldoParcial.desenvolvimento');
    expect(html).toContain('+00:30');
    expect(html).toContain('Visita presencial');
    expect(html).toContain('Janela de atualização');
  });

  it('saldo negativo de quem consome dos outros: avisa a cobertura no fim do período', () => {
    expect(html).toContain('controleBancoHoras.saldoParcial.saldoNegativo {"mes":"Nov/2026"}');
    expect(gerarHtmlTabelasBancos([BANCOS[0]], opcoes)).not.toContain('saldoNegativo');
  });
});

describe('montarWorkbookBancos', () => {
  const CHAMADOS: Record<string, ChamadoDoBanco[]> = {
    b1: [
      {
        mes: { ano: 2026, mes: 10 },
        fonte: 'apontamento',
        chamado: 'CH-1',
        tarefa: 'T-1',
        data: '2026-10-02T15:00:00Z',
        grupo: 'G-COMEX',
        itemConfiguracao: 'IC-1',
        analista: 'Analista A',
        solicitante: 'Solicitante A',
        descricaoTarefa: 'Ajuste',
        descricaoChamado: 'Relatório com erro',
        solucaoChamado: 'Corrigido',
        minutos: 90,
        tickets: 0,
      },
    ],
    b2: [],
  };
  const wb = montarWorkbookBancos(BANCOS, CHAMADOS, opcoes);
  const linhas = (aba: string) =>
    XLSX.utils.sheet_to_json<string[]>(wb.Sheets[aba], { header: 1, raw: false, defval: '' });

  it('uma aba de resumo e uma por banco', () => {
    // Nome de aba vai até 31 caracteres: a chave do teste é cortada
    const RESUMO = 'controleBancoHoras.saldoParcial.abaResumo'.slice(0, 31);
    expect(wb.SheetNames).toEqual([RESUMO, 'BANCO COMEX', 'BANCO TICKETS']);
    const resumo = linhas(RESUMO);
    expect(resumo[1]).toEqual(expect.arrayContaining(['BANCO COMEX', 'Set – Nov/2026', '−01:30']));
  });

  it('a aba do banco traz o quadro e os chamados, com data em Brasília e o total', () => {
    const aba = linhas('BANCO COMEX').map((l) => l.join('|'));
    expect(
      aba.some((l) => l.includes('controleBancoHoras.quadro.baseline') && l.includes('10:00'))
    ).toBe(true);
    expect(
      aba.some((l) => l.includes('controleBancoHoras.quadro.baseline') && l.includes('12:57'))
    ).toBe(true);
    expect(aba.some((l) => l.includes('Nov/2026 (controleBancoHoras.quadro.projetado)'))).toBe(
      true
    );
    const chamado = aba.find((l) => l.includes('CH-1'))!;
    expect(chamado).toContain('02/10/2026');
    expect(chamado).toContain('01:30');
    expect(chamado).toContain('Relatório com erro');
    expect(
      aba.some((l) => l.includes('controleBancoHoras.saldoParcial.total') && l.includes('01:30'))
    ).toBe(true);
  });

  it('nome de aba sem caracteres proibidos, até 31 e sem repetir', () => {
    const nomes = montarWorkbookBancos(
      [
        {
          ...BANCOS[1],
          bancoId: 'x1',
          nome: 'Banco: horas/tickets [especial] com nome muito longo',
        },
        {
          ...BANCOS[1],
          bancoId: 'x2',
          nome: 'Banco: horas/tickets [especial] com nome muito longo',
        },
      ],
      {},
      opcoes
    ).SheetNames.slice(1);
    expect(nomes.every((n) => n.length <= 31 && !/[:\\/?*[\]]/.test(n))).toBe(true);
    expect(new Set(nomes).size).toBe(2);
  });
});
