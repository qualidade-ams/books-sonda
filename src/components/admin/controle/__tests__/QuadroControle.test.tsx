import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { QuadroControle } from '../QuadroControle';
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
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));

const unidade = (extra: Partial<ResultadoUnidade> = {}): ResultadoUnidade => ({
  baseline: 600,
  repasseAnterior: 0,
  saldoAUtilizar: 600,
  consumo: 300,
  requerimentos: 60,
  reajustes: 0,
  consumoTotal: 360,
  saldo: 240,
  consumidoDeOutros: 0,
  cedidoAOutros: 0,
  saldoFinal: 240,
  repasse: 240,
  excedente: 0,
  valorExcedente: 0,
  taxa: null,
  ...extra,
});
const resultado = (mes: number, extra: Partial<ResultadoBancoMes> = {}): ResultadoBancoMes => ({
  bancoId: 'b1',
  nome: 'BANCO COMEX',
  mes: { ano: 2026, mes },
  fechado: false,
  fimPeriodo: false,
  transicaoPeriodo: false,
  percentualRepasse: 100,
  horas: unidade(),
  tickets: null,
  valorAFaturar: 0,
  observacoes: [],
  alertas: [],
  ...extra,
});
const mes = (m: number, situacao: MesDoQuadro['situacao'], r?: ResultadoBancoMes): MesDoQuadro => ({
  mes: { ano: 2026, mes: m },
  chave: `2026-${String(m).padStart(2, '0')}`,
  situacao,
  resultado: r,
});
const BANCO = { bancoId: 'b1', nome: 'BANCO COMEX', tipoContrato: 'horas' } as BancoCadastro;
const MESES = [
  mes(7, 'fechado', resultado(7, { fechado: true })),
  mes(8, 'aberto', resultado(8, { horas: unidade({ reajustes: 30, consumo: 400 }) })),
  mes(9, 'futuro', resultado(9)),
];
const props = {
  banco: BANCO,
  meses: MESES,
  rotuloPeriodo: 'Jul – Set/2026',
  podeEditar: true,
  onReajuste: vi.fn(),
};
const tabela = () =>
  within(
    screen.getByRole('table', { name: 'controleBancoHoras.quadro.rotulo {"banco":"BANCO COMEX"}' })
  );
const linha = (rotulo: string | RegExp) => within(tabela().getByRole('row', { name: rotulo }));

beforeEach(() => vi.clearAllMocks());

describe('QuadroControle', () => {
  it('meses nas colunas e as linhas do cálculo, em HH:MM', () => {
    render(<QuadroControle {...props} />);
    expect(tabela().getByRole('columnheader', { name: 'Ago/2026' })).toHaveAttribute(
      'aria-current',
      'date'
    );
    expect(linha(/controleBancoHoras.quadro.chamados/).getAllByText('05:00')).toHaveLength(2);
    expect(linha(/controleBancoHoras.quadro.chamados/).getByText('06:40')).toBeInTheDocument();
    expect(linha(/controleBancoHoras.quadro.repasse /).getAllByText('04:00')).toHaveLength(3);
    expect(
      screen.getByText('controleBancoHoras.quadro.legendaProjecao {"mes":"Ago/2026"}')
    ).toBeInTheDocument();
  });

  it('reajuste do mês abre o lançamento; quem só vê enxerga só o valor', () => {
    const onReajuste = vi.fn();
    const { unmount } = render(<QuadroControle {...props} onReajuste={onReajuste} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'controleBancoHoras.quadro.lancarReajuste {"mes":"Ago/2026"}',
      })
    );
    expect(onReajuste).toHaveBeenCalledWith({ ano: 2026, mes: 8 });
    unmount();
    render(<QuadroControle {...props} podeEditar={false} />);
    expect(screen.queryByRole('button', { name: /lancarReajuste/ })).not.toBeInTheDocument();
    expect(linha(/controleBancoHoras.quadro.reajustes/).getByText('+00:30')).toBeInTheDocument();
  });

  it('banco de horas e tickets troca a cobrança mostrada', () => {
    const ambos = { ...BANCO, tipoContrato: 'ambos' } as BancoCadastro;
    const comTickets = MESES.map((m) => ({
      ...m,
      resultado: m.resultado && {
        ...m.resultado,
        tickets: unidade({ baseline: 10, consumo: 4, saldo: 6 }),
      },
    }));
    render(<QuadroControle {...props} banco={ambos} meses={comTickets} />);
    fireEvent.click(screen.getByRole('radio', { name: 'controleBancoHoras.quadro.tickets' }));
    const t = within(
      screen.getByRole('table', {
        name: 'controleBancoHoras.quadro.rotuloTickets {"banco":"BANCO COMEX"}',
      })
    );
    expect(
      within(t.getByRole('row', { name: /controleBancoHoras.quadro.baseline/ })).getAllByText('10')
    ).toHaveLength(3);
  });

  it('no fechamento: consumo entre bancos, excedente e a mensagem para copiar', () => {
    const escrever = vi.fn(async () => undefined);
    Object.assign(navigator, { clipboard: { writeText: escrever } });
    const fechamento = resultado(9, {
      fechado: true,
      fimPeriodo: true,
      horas: unidade({
        consumidoDeOutros: 60,
        saldoFinal: -120,
        excedente: 120,
        valorExcedente: 300,
        taxa: 150,
      }),
      observacoes: [{ origem: 'consumo_entre_bancos', texto: 'Consumiu 01:00 do Banco padrão' }],
      alertas: ['Sem taxa vigente'],
    });
    render(
      <QuadroControle {...props} meses={[MESES[0], MESES[1], mes(9, 'fechado', fechamento)]} />
    );
    expect(
      tabela().getByRole('row', { name: /controleBancoHoras.quadro.consumidoDeOutros/ })
    ).toBeInTheDocument();
    expect(
      tabela().getByRole('row', { name: /controleBancoHoras.quadro.valorFaturar/ })
    ).toHaveTextContent('R$');
    expect(screen.getByText('Consumiu 01:00 do Banco padrão')).toBeInTheDocument();
    expect(screen.getByText('Sem taxa vigente')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /controleBancoHoras.quadro.copiarMensagem/ })
    );
    expect(escrever).toHaveBeenCalledWith(
      expect.stringContaining('controleBancoHoras.quadro.mensagemExcedente')
    );
  });
});
