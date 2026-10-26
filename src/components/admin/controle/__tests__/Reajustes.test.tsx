import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaReajustes } from '../AbaReajustes';
import { LancarReajuste } from '../LancarReajuste';
import type { MesDoQuadro } from '@/utils/controleTela';
import type { ReajusteControle } from '@/types/controleBancoHoras';
import type { ResultadoBancoMes } from '@/services/bancosHoras/motorBancosHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => ({ u1: 'Pessoa A' }) }));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const reajuste = (id: string, extra: Partial<ReajusteControle> = {}): ReajusteControle => ({
  id,
  bancoId: 'b1',
  mes: { ano: 2026, mes: 8 },
  tipo: 'saida',
  minutos: 90,
  tickets: 0,
  justificativa: 'Atendimento presencial',
  anotacaoInterna: null,
  origem: 'manual',
  ativo: true,
  motivoInativacao: null,
  inativadoEm: null,
  criadoEm: '2026-08-10T15:00:00Z',
  criadoPor: 'u1',
  aguardandoRetificacao: false,
  ...extra,
});
const REAJUSTES = [
  reajuste('r1', { anotacaoInterna: 'Combinado com o gestor' }),
  reajuste('r2', {
    tipo: 'entrada',
    minutos: 30,
    aguardandoRetificacao: true,
    mes: { ano: 2026, mes: 7 },
  }),
  reajuste('r3', { ativo: false, motivoInativacao: 'Duplicado' }),
];
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('AbaReajustes', () => {
  const props = {
    reajustes: REAJUSTES,
    tipoContrato: 'horas' as const,
    carregando: false,
    erro: null,
    podeEditar: true,
    onLancar: vi.fn(),
    onInativar: vi.fn(async () => undefined),
    onTentarNovamente: vi.fn(),
  };
  const lista = () =>
    within(screen.getByRole('list', { name: 'controleBancoHoras.reajustes.rotulo' }));

  it('sinal pelo efeito, anotação interna, quem lançou e a situação', () => {
    renderizar(<AbaReajustes {...props} />);
    expect(lista().getAllByText('+01:30')).toHaveLength(2);
    expect(lista().getByText('−00:30')).toBeInTheDocument();
    expect(lista().getByText('Combinado com o gestor')).toBeInTheDocument();
    expect(lista().getAllByText('Pessoa A').length).toBeGreaterThan(0);
    expect(lista().getByText('controleBancoHoras.reajustes.aguardando')).toBeInTheDocument();
    expect(
      lista().getByText('controleBancoHoras.reajustes.inativadoPor {"motivo":"Duplicado"}')
    ).toBeInTheDocument();
  });

  it('inativar pede o motivo; inativo não tem menu; quem só vê não lança', async () => {
    const onInativar = vi.fn(async () => undefined);
    const { unmount } = renderizar(<AbaReajustes {...props} onInativar={onInativar} />);
    expect(
      screen.getAllByRole('button', { name: /controleBancoHoras.reajustes.acoesDe/ })
    ).toHaveLength(2);
    await userEvent.click(
      screen.getAllByRole('button', { name: /controleBancoHoras.reajustes.acoesDe/ })[0]
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'controleBancoHoras.reajustes.inativar' })
    );
    const dialogo = within(screen.getByRole('alertdialog'));
    fireEvent.change(dialogo.getByLabelText(/controleBancoHoras.reajustes.motivo/), {
      target: { value: 'Duplicado' },
    });
    fireEvent.click(dialogo.getByRole('button', { name: 'controleBancoHoras.reajustes.inativar' }));
    await waitFor(() => expect(onInativar).toHaveBeenCalledWith(REAJUSTES[0], 'Duplicado'));
    unmount();
    renderizar(<AbaReajustes {...props} podeEditar={false} />);
    expect(
      screen.queryByRole('button', { name: 'controleBancoHoras.reajustes.lancar' })
    ).not.toBeInTheDocument();
  });
});

describe('LancarReajuste', () => {
  const unidade = (saldo: number) => ({ saldo }) as ResultadoBancoMes['horas'];
  const mes = (m: number, situacao: MesDoQuadro['situacao']): MesDoQuadro => ({
    mes: { ano: 2026, mes: m },
    chave: `2026-0${m}`,
    situacao,
    resultado: { horas: unidade(240), tickets: null } as ResultadoBancoMes,
  });
  const MESES = [mes(7, 'fechado'), mes(8, 'aberto'), mes(9, 'futuro')];
  const BANCO = { bancoId: 'b1', nome: 'BANCO COMEX', tipoContrato: 'horas' as const };

  it('abre no mês do quadro; somar ao consumo reduz o saldo; lança como saída', async () => {
    const onLancar = vi.fn(async () => undefined);
    const onFechar = vi.fn();
    renderizar(
      <LancarReajuste
        banco={BANCO}
        meses={MESES}
        rotuloPeriodo="Jul – Set/2026"
        mesInicial={{ ano: 2026, mes: 8 }}
        onFechar={onFechar}
        onLancar={onLancar}
      />
    );
    expect(
      screen.getByRole('combobox', { name: /controleBancoHoras.lancar.mes/ })
    ).toHaveTextContent('Ago/2026');
    const lancar = screen.getByRole('button', { name: 'controleBancoHoras.lancar.titulo' });
    expect(lancar).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'controleBancoHoras.lancar.somar' }));
    fireEvent.change(
      screen.getByLabelText(/controleBancoHoras.lancar.horas/, { selector: 'input' }),
      { target: { value: '01:00' } }
    );
    expect(
      screen.getByText(
        'controleBancoHoras.lancar.efeitoTexto {"mes":"Ago/2026","de":"04:00","para":"03:00"}'
      )
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/controleBancoHoras.lancar.motivo/), {
      target: { value: ' Atendimento ' },
    });
    fireEvent.click(lancar);
    await waitFor(() =>
      expect(onLancar).toHaveBeenCalledWith({
        bancoId: 'b1',
        mes: { ano: 2026, mes: 8 },
        tipo: 'saida',
        minutos: 60,
        tickets: 0,
        justificativa: 'Atendimento',
        anotacaoInterna: null,
      })
    );
    await waitFor(() => expect(onFechar).toHaveBeenCalled());
  });

  it('mês fechado avisa que aguarda a retificação do Book', async () => {
    renderizar(
      <LancarReajuste
        banco={BANCO}
        meses={MESES}
        rotuloPeriodo="x"
        mesInicial={{ ano: 2026, mes: 7 }}
        onFechar={vi.fn()}
        onLancar={vi.fn()}
      />
    );
    fireEvent.change(
      screen.getByLabelText(/controleBancoHoras.lancar.horas/, { selector: 'input' }),
      { target: { value: '00:30' } }
    );
    expect(
      screen.getByText('controleBancoHoras.lancar.fechadoTitulo {"mes":"Jul/2026"}')
    ).toBeInTheDocument();
  });

  it('banco de tickets pede só os tickets', () => {
    renderizar(
      <LancarReajuste
        banco={{ ...BANCO, tipoContrato: 'tickets' }}
        meses={MESES}
        rotuloPeriodo="x"
        onFechar={vi.fn()}
        onLancar={vi.fn()}
      />
    );
    expect(
      screen.queryByLabelText(/controleBancoHoras.lancar.horas/, { selector: 'input' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText(/controleBancoHoras.lancar.tickets/, { selector: 'input' })
    ).toBeInTheDocument();
  });
});
