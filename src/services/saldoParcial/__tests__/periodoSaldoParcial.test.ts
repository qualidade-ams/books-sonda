import { describe, it, expect } from 'vitest';
import {
  calcularMesesDoPeriodo,
  filtrarRequerimentosDoPeriodo,
  filtrarRequerimentosEmDesenvolvimento,
  filtrarObservacoesDoPeriodo,
  mesReferenciaSaldoParcial
} from '../periodoSaldoParcial';

const emSaoPaulo = (ano: number, mes: number, dia: number, hora: number) =>
  new Date(Date.UTC(ano, mes - 1, dia, hora + 3, 0, 0));

const req = (sobrescritas: Record<string, unknown>) => ({
  chamado: 'RF-1',
  mes_cobranca: '10/2026',
  enviado_faturamento: true,
  status: 'enviado_faturamento',
  tipo_cobranca: 'Banco de Horas',
  data_envio: '2026-10-01',
  ...sobrescritas
}) as any;

describe('periodoSaldoParcial', () => {
  describe('calcularMesesDoPeriodo', () => {
    it('sem vigência usa 3 meses sequenciais a partir do mês informado', () => {
      expect(calcularMesesDoPeriodo({ inicio_vigencia: null, periodo_apuracao: null }, { mes: 11, ano: 2026 })).toEqual([
        { mes: 11, ano: 2026 },
        { mes: 12, ano: 2026 },
        { mes: 1, ano: 2027 }
      ]);
    });

    it('alinha o período ao início da vigência (trimestre começando em agosto)', () => {
      const empresa = { inicio_vigencia: '2025-08-01', periodo_apuracao: 3 };
      expect(calcularMesesDoPeriodo(empresa, { mes: 10, ano: 2026 })).toEqual([
        { mes: 8, ano: 2026 },
        { mes: 9, ano: 2026 },
        { mes: 10, ano: 2026 }
      ]);
      expect(calcularMesesDoPeriodo(empresa, { mes: 11, ano: 2026 })).toEqual([
        { mes: 11, ano: 2026 },
        { mes: 12, ano: 2026 },
        { mes: 1, ano: 2027 }
      ]);
    });

    it('período mensal devolve só o próprio mês', () => {
      expect(calcularMesesDoPeriodo({ inicio_vigencia: '2024-01-01', periodo_apuracao: 1 }, { mes: 10, ano: 2026 }))
        .toEqual([{ mes: 10, ano: 2026 }]);
    });
  });

  describe('filtrarRequerimentosDoPeriodo', () => {
    const meses = [{ mes: 10, ano: 2026 }, { mes: 11, ano: 2026 }];

    it('mantém só Banco de Horas enviados para faturamento no período', () => {
      const lista = [
        req({ chamado: 'OK-1' }),
        req({ chamado: 'OK-2', status: 'faturado', mes_cobranca: '11/2026' }),
        req({ chamado: 'FORA-PERIODO', mes_cobranca: '09/2026' }),
        req({ chamado: 'NAO-ENVIADO', enviado_faturamento: false }),
        req({ chamado: 'STATUS', status: 'lancado' }),
        req({ chamado: 'COBRANCA', tipo_cobranca: 'Faturado' })
      ];
      expect(filtrarRequerimentosDoPeriodo(lista, meses).map(r => r.chamado)).toEqual(['OK-1', 'OK-2']);
    });
  });

  describe('filtrarRequerimentosEmDesenvolvimento', () => {
    const meses = [{ mes: 8, ano: 2026 }, { mes: 9, ano: 2026 }, { mes: 10, ano: 2026 }];

    it('mantém lançados não enviados com data de envio até o fim do período (ou sem data)', () => {
      const lista = [
        req({ chamado: 'DENTRO', status: 'lancado', enviado_faturamento: false, data_envio: '2026-10-20' }),
        req({ chamado: 'SEM-DATA', status: 'lancado', enviado_faturamento: false, data_envio: null }),
        req({ chamado: 'DEPOIS', status: 'lancado', enviado_faturamento: false, data_envio: '2026-11-02' }),
        req({ chamado: 'ENVIADO', status: 'lancado', enviado_faturamento: true }),
        req({ chamado: 'OUTRO-STATUS', status: 'faturado', enviado_faturamento: false })
      ];
      expect(filtrarRequerimentosEmDesenvolvimento(lista, meses).map(r => r.chamado)).toEqual(['DENTRO', 'SEM-DATA']);
    });
  });

  describe('filtrarObservacoesDoPeriodo', () => {
    it('mantém as observações dos meses do período e converte para o formato do e-mail', () => {
      const unificadas = [
        { observacao: 'Dentro', tipo: 'manual', mes: 10, ano: 2026, usuario_nome: 'Fulano', created_at: '2026-10-01' },
        { observacao: 'Fora', tipo: 'manual', mes: 7, ano: 2026, usuario_nome: 'Fulano', created_at: '2026-07-01' },
        { observacao: 'Ajuste', tipo: 'ajuste', tipo_ajuste: 'entrada', valor_horas: '02:00', mes: 9, ano: 2026 }
      ] as any[];

      const resultado = filtrarObservacoesDoPeriodo(unificadas, [{ mes: 9, ano: 2026 }, { mes: 10, ano: 2026 }]);

      expect(resultado.map(o => o.texto)).toEqual(['Dentro', 'Ajuste']);
      expect(resultado[1]).toMatchObject({ tipo: 'ajuste', tipo_ajuste: 'entrada', valor_horas: '02:00', mes: 9, ano: 2026 });
    });

    it('sem meses de período mantém todas', () => {
      const unificadas = [{ observacao: 'A', tipo: 'manual', mes: 1, ano: 2020 }] as any[];
      expect(filtrarObservacoesDoPeriodo(unificadas, [])).toHaveLength(1);
    });
  });

  describe('mesReferenciaSaldoParcial', () => {
    it('é o mês de ontem no horário de São Paulo', () => {
      expect(mesReferenciaSaldoParcial(emSaoPaulo(2026, 10, 15, 8))).toEqual({ mes: 10, ano: 2026 });
      expect(mesReferenciaSaldoParcial(emSaoPaulo(2026, 10, 1, 8))).toEqual({ mes: 9, ano: 2026 });
      expect(mesReferenciaSaldoParcial(emSaoPaulo(2027, 1, 1, 8))).toEqual({ mes: 12, ano: 2026 });
    });
  });
});
