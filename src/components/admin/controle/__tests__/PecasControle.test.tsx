import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IndicadoresControle } from '../IndicadoresControle';
import { ListaBancosControle } from '../ListaBancosControle';
import { NavegadorPeriodo } from '../NavegadorPeriodo';
import type { MesDoQuadro } from '@/utils/controleTela';
import type {
  BancoCadastro,
  ResultadoBancoMes,
  ResultadoUnidade,
} from '@/services/bancosHoras/motorBancosHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

const unidade = (extra: Partial<ResultadoUnidade> = {}): ResultadoUnidade => ({
  baseline: 600,
  repasseAnterior: 0,
  saldoAUtilizar: 600,
  consumo: 300,
  requerimentos: 0,
  reajustes: 0,
  consumoTotal: 300,
  saldo: 300,
  consumidoDeOutros: 0,
  cedidoAOutros: 0,
  saldoFinal: 300,
  repasse: 300,
  excedente: 0,
  valorExcedente: 0,
  taxa: null,
  ...extra,
});
const resultado = (mes: number, horas: ResultadoUnidade, extra: Partial<ResultadoBancoMes> = {}) =>
  ({
    bancoId: 'b1',
    nome: 'BANCO COMEX',
    mes: { ano: 2026, mes },
    fechado: false,
    fimPeriodo: false,
    transicaoPeriodo: false,
    percentualRepasse: 50,
    horas,
    tickets: null,
    valorAFaturar: 0,
    observacoes: [],
    alertas: [],
    ...extra,
  }) as ResultadoBancoMes;
const mes = (m: number, situacao: MesDoQuadro['situacao'], r?: ResultadoBancoMes): MesDoQuadro => ({
  mes: { ano: 2026, mes: m },
  chave: `2026-0${m}`,
  situacao,
  resultado: r,
});
const BANCO = {
  bancoId: 'b1',
  nome: 'BANCO COMEX',
  tipoContrato: 'horas',
  periodoApuracao: 3,
  padrao: false,
} as BancoCadastro;

describe('IndicadoresControle', () => {
  it('baseline com o período e o repasse; consumo comparado ao mês anterior; saldo do mês aberto', () => {
    render(
      <IndicadoresControle
        banco={BANCO}
        meses={[
          mes(7, 'fechado', resultado(7, unidade())),
          mes(8, 'aberto', resultado(8, unidade({ consumoTotal: 420 }))),
        ]}
      />
    );
    expect(
      screen.getByText(
        'controleBancoHoras.kpis.baselineRodape {"periodo":"empresasCadastro.bancos.periodo.3","n":50}'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('controleBancoHoras.kpis.consumo {"mes":"Ago/2026"}')
    ).toBeInTheDocument();
    expect(screen.getByText('+02:00')).toBeInTheDocument();
    expect(
      screen.getByText('controleBancoHoras.kpis.versus {"mes":"Jul/2026"}')
    ).toBeInTheDocument();
    expect(
      screen.getByText('controleBancoHoras.kpis.saldo {"mes":"Ago/2026"}')
    ).toBeInTheDocument();
    expect(screen.getByText('controleBancoHoras.kpis.soNoFechamento')).toBeInTheDocument();
  });

  it('período fechado com excedente: saldo final e excedente a faturar', () => {
    render(
      <IndicadoresControle
        banco={BANCO}
        meses={[
          mes(
            9,
            'fechado',
            resultado(
              9,
              unidade({ saldoFinal: -120, excedente: 120, valorExcedente: 300, taxa: 150 }),
              {
                fechado: true,
                fimPeriodo: true,
              }
            )
          ),
        ]}
      />
    );
    expect(screen.getByText('controleBancoHoras.kpis.saldoFinal')).toBeInTheDocument();
    expect(screen.getByText('controleBancoHoras.kpis.excedente')).toBeInTheDocument();
    expect(screen.getByText('controleBancoHoras.kpis.primeiroMes')).toBeInTheDocument();
  });
});

describe('ListaBancosControle', () => {
  it('um cartão por banco com o saldo do mês atual; escolher seleciona', () => {
    const onSelecionar = vi.fn();
    const padrao = { ...BANCO, bancoId: 'bp', nome: 'Banco padrão', padrao: true } as BancoCadastro;
    render(
      <ListaBancosControle
        bancos={[BANCO, padrao]}
        resultados={{ b1: resultado(10, unidade({ saldo: -90 })) }}
        mes={{ ano: 2026, mes: 10 }}
        selecionado="b1"
        onSelecionar={onSelecionar}
      />
    );
    expect(screen.getByRole('button', { name: /BANCO COMEX/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('−01:30')).toBeInTheDocument();
    expect(screen.getByText('controleBancoHoras.bancos.padrao')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Banco padrão/ }));
    expect(onSelecionar).toHaveBeenCalledWith('bp');
  });
});

describe('NavegadorPeriodo', () => {
  it('anterior e próximo entre os períodos; no primeiro não volta; no atual não avança', () => {
    const onIndice = vi.fn();
    const { rerender } = render(
      <NavegadorPeriodo
        rotulos={['Jan – Mar/2026', 'Abr – Jun/2026']}
        indice={1}
        periodicidade="Trimestral"
        onIndice={onIndice}
      />
    );
    expect(screen.getByText('Abr – Jun/2026')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /controleBancoHoras.periodo.proximo/ })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /controleBancoHoras.periodo.anterior/ }));
    expect(onIndice).toHaveBeenCalledWith(0);
    rerender(
      <NavegadorPeriodo
        rotulos={['Jan – Mar/2026', 'Abr – Jun/2026']}
        indice={0}
        periodicidade="Trimestral"
        onIndice={onIndice}
      />
    );
    expect(
      screen.getByRole('button', { name: /controleBancoHoras.periodo.anterior/ })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: /controleBancoHoras.periodo.periodoAtual/ })
    );
    expect(onIndice).toHaveBeenLastCalledWith(1);
  });
});
