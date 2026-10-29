import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import BookConsumoBancos from '../BookConsumoBancos';
import type { LinhaConsumoBook } from '@/services/bookConsumoBancosService';
import type { ResultadoBancoMes, ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
// O gráfico não interessa aqui e não mede tamanho no jsdom
vi.mock('recharts', () => {
  const Vazio = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Vazio,
    LineChart: Vazio,
    Line: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
  };
});

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

const unidade = (v: Partial<ResultadoUnidade>): ResultadoUnidade => ({
  baseline: h(80),
  repasseAnterior: 0,
  saldoAUtilizar: h(80),
  consumo: 0,
  requerimentos: 0,
  reajustes: 0,
  consumoTotal: 0,
  saldo: 0,
  consumidoDeOutros: 0,
  cedidoAOutros: 0,
  saldoFinal: 0,
  repasse: 0,
  excedente: 0,
  valorExcedente: 0,
  taxa: 245.9,
  ...v,
});

const resultado = (horas: ResultadoUnidade | null, tickets: ResultadoUnidade | null = null) =>
  ({ percentualRepasse: 50, horas, tickets }) as ResultadoBancoMes;

function linha(
  v: Partial<LinhaConsumoBook['dados']> = {},
  outros: Partial<LinhaConsumoBook> = {}
): LinhaConsumoBook {
  return {
    banco_id: 'b1',
    empresa_id: 'e1',
    ordem: 1,
    nome_banco: 'Banco COMEX',
    nome_empresa: 'EMPRESA ALFA',
    fechamento_id: 'f1',
    dados: {
      mes: { mes: 9, ano: 2026 },
      tipoContrato: 'horas',
      meses: [
        {
          mes: { mes: 8, ano: 2026 },
          situacao: 'fechado',
          resultado: resultado(
            unidade({
              consumo: h(66),
              consumoTotal: h(66),
              saldo: h(14),
              saldoFinal: h(14),
              repasse: h(7),
            })
          ),
        },
        {
          mes: { mes: 9, ano: 2026 },
          situacao: 'fechado',
          resultado: resultado(
            unidade({
              repasseAnterior: h(7),
              saldoAUtilizar: h(87),
              consumo: h(60, 45),
              requerimentos: h(10),
              consumoTotal: h(70, 45),
              saldo: h(16, 15),
              cedidoAOutros: h(6, 30),
              saldoFinal: h(9, 45),
              repasse: h(4, 53),
            })
          ),
        },
        { mes: { mes: 10, ano: 2026 }, situacao: 'futuro', resultado: null },
      ],
      historico: [],
      requerimentos: [
        {
          chamado: 'RF-100231',
          titulo: 'Ajuste',
          modulo: 'Câmbio',
          mes: { mes: 9, ano: 2026 },
          minutos: h(10),
          tickets: 0,
          situacao: 'enviado',
        },
      ],
      reajustes: [],
      observacoes: [
        { mes: { mes: 9, ano: 2026 }, texto: '06:30 horas cedidas ao Banco FISCAL' },
      ] as any,
      porTipo: {
        incidente: { minutos: h(18, 30), tickets: 0 },
        solicitacao: { minutos: h(42, 15), tickets: 0 },
      },
      ...v,
    },
    ...outros,
  };
}

describe('BookConsumoBancos', () => {
  it('título com o banco e o período; cards do mês do Book', () => {
    render(<BookConsumoBancos banco={linha()} empresaDoBook="e1" />);

    expect(screen.getByRole('heading', { level: 2, name: /Banco COMEX/ })).toBeInTheDocument();
    expect(screen.getByText(/books.bookContent.bankPeriod {/)).toHaveTextContent('Ago/26');
    // Consumo total do mês = chamados + requerimentos
    expect(screen.getByTestId('card-consumo-total')).toHaveTextContent('70:45');
    expect(screen.getByTestId('card-incidente')).toHaveTextContent('18:30');
    expect(screen.getByTestId('card-solicitacao')).toHaveTextContent('42:15');
    expect(screen.getByText('RF-100231')).toBeInTheDocument();
  });

  it('quadro do período: valores do snapshot, consumo entre bancos e mês sem resultado', () => {
    render(<BookConsumoBancos banco={linha()} empresaDoBook="e1" />);
    const quadro = screen.getByRole('table');

    const entreBancos = within(quadro)
      .getByText('books.bookContent.crossBankConsumption')
      .closest('tr')!;
    expect(entreBancos).toHaveTextContent('-06:30');
    const saldo = within(quadro).getByText('books.bookContent.balance').closest('tr')!;
    expect(saldo).toHaveTextContent('09:45');
    expect(saldo).toHaveTextContent('—');
    expect(screen.getByText(/06:30 horas cedidas ao Banco FISCAL/)).toBeInTheDocument();
  });

  it('sem consumo entre bancos no período: a linha não aparece', () => {
    const semTransferencia = linha();
    semTransferencia.dados.meses[1].resultado!.horas!.cedidoAOutros = 0;
    render(<BookConsumoBancos banco={semTransferencia} empresaDoBook="e1" />);
    expect(screen.queryByText('books.bookContent.crossBankConsumption')).not.toBeInTheDocument();
  });

  it('banco de consolidada: mostra a empresa dona dele (D-15)', () => {
    render(
      <BookConsumoBancos
        banco={linha({}, { empresa_id: 'e2', nome_empresa: 'ALFA FILIAL' })}
        empresaDoBook="e1"
      />
    );
    expect(screen.getByText(/ALFA FILIAL/)).toBeInTheDocument();
  });

  it('contrato por tickets: quantidades, sem formato de horas', () => {
    const tickets = linha({ tipoContrato: 'tickets' });
    tickets.dados.meses = [
      {
        mes: { mes: 9, ano: 2026 },
        situacao: 'fechado',
        resultado: resultado(
          null,
          unidade({ baseline: 20, consumo: 7, consumoTotal: 7, saldo: 13, saldoFinal: 13 })
        ),
      },
    ];
    render(<BookConsumoBancos banco={tickets} empresaDoBook="e1" />);
    expect(screen.getByTestId('card-consumo-total')).toHaveTextContent('7');
    expect(screen.getByText('books.bookContent.contractedTickets')).toBeInTheDocument();
  });
});
