import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterAll, beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import ControleBancosHoras from '../ControleBancosHoras';
import type { BancoCadastro } from '@/services/bancosHoras/motorBancosHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const banco = (bancoId: string, nome: string, extra: Partial<BancoCadastro> = {}) =>
  ({
    bancoId,
    nome,
    ordem: 1,
    padrao: false,
    ativo: true,
    tipoContrato: 'horas',
    periodoApuracao: 3,
    inicioVigencia: { ano: 2026, mes: 1 },
    fimVigencia: null,
    escopo: [],
    filtroIc: null,
    ...extra,
  }) as BancoCadastro;

const empresas = {
  empresas: [
    { id: 'alfa', nome: 'ALFA', modelo: 'liberada', bancosAtivos: 2 },
    { id: 'beta', nome: 'BETA', modelo: 'legado', bancosAtivos: 1 },
  ],
  isLoading: false,
  error: null,
};
const bancosPorEmpresa: Record<string, BancoCadastro[]> = {
  alfa: [
    banco('b1', 'BANCO COMEX', { ordem: 1 }),
    banco('bp', 'Banco padrão', { ordem: 2, padrao: true }),
  ],
  beta: [],
};
const mesesPedidos: string[][] = [];
const lancamentos = {
  reajustes: [],
  observacoes: [],
  isLoading: false,
  error: null,
  lancarReajuste: vi.fn(async () => undefined),
  inativarReajuste: vi.fn(async () => undefined),
  salvarObservacao: vi.fn(async () => undefined),
  excluirObservacao: vi.fn(async () => undefined),
};
let permissoes: string[] = [];
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => ({}) }));
// Desktop: o quadro mostra o período inteiro, não um mês por vez
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
vi.mock('@/hooks/useControleBancoHoras', () => ({
  useLancamentosControle: () => lancamentos,
  useControleEmpresas: () => empresas,
  useControleBancos: (empresaId: string) => ({
    bancos: bancosPorEmpresa[empresaId] ?? [],
    isLoading: false,
    error: null,
  }),
  useQuadroControle: (_empresaId: string, meses: { ano: number; mes: number }[]) => {
    mesesPedidos.push(meses.map((m) => `${m.ano}-${m.mes}`));
    return { quadro: {}, isLoading: false, error: null, recarregar: vi.fn() };
  },
}));

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
afterAll(() => vi.useRealTimers());
beforeEach(() => {
  mesesPedidos.length = 0;
  permissoes = ['bancos_horas_controle:edit'];
  lancamentos.lancarReajuste.mockClear();
});

const renderizar = (rota = '/admin/bancos-horas') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <TooltipProvider>
        <ControleBancosHoras />
      </TooltipProvider>
    </MemoryRouter>
  );

describe('ControleBancosHoras', () => {
  it('abre na primeira empresa, no primeiro banco e no período atual', () => {
    renderizar();
    expect(screen.getByRole('combobox', { name: 'controleBancoHoras.empresa' })).toHaveTextContent(
      'ALFA'
    );
    expect(screen.getByRole('heading', { name: 'BANCO COMEX' })).toBeInTheDocument();
    expect(screen.getByText('Out – Dez/2026')).toBeInTheDocument();
    expect(mesesPedidos).toContainEqual(['2026-10', '2026-11', '2026-12']);
    expect(mesesPedidos).toContainEqual(['2026-10']);
  });

  it('trocar de banco e voltar um período', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /Banco padrão/ }));
    expect(screen.getByRole('heading', { name: 'Banco padrão' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /controleBancoHoras.periodo.anterior/ }));
    expect(screen.getByText('Jul – Set/2026')).toBeInTheDocument();
  });

  it('empresa ainda no cálculo atual: aviso de modo sombra e sem bancos, o convite para cadastrar', async () => {
    renderizar('/admin/bancos-horas?empresa=beta');
    expect(
      screen.getByText('controleBancoHoras.legado.titulo {"empresa":"BETA"}')
    ).toBeInTheDocument();
    expect(screen.getByText('controleBancoHoras.vazioTitulo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('combobox', { name: 'controleBancoHoras.empresa' }));
    await userEvent.click(screen.getByRole('option', { name: 'ALFA' }));
    expect(screen.getByRole('heading', { name: 'BANCO COMEX' })).toBeInTheDocument();
  });

  it('o botão do quadro abre o lançamento no mês escolhido e volta ao lançar', async () => {
    renderizar();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'controleBancoHoras.quadro.lancarReajuste {"mes":"Nov/2026"}',
      })
    );
    expect(
      screen.getByRole('combobox', { name: /controleBancoHoras.lancar.mes/ })
    ).toHaveTextContent('Nov/2026');
    fireEvent.change(
      screen.getByLabelText(/controleBancoHoras.lancar.horas/, { selector: 'input' }),
      { target: { value: '02:00' } }
    );
    fireEvent.change(
      screen.getByLabelText(/controleBancoHoras.lancar.motivo/, { selector: 'textarea' }),
      { target: { value: 'Atendimento' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'controleBancoHoras.lancar.titulo' }));
    await waitFor(() =>
      expect(lancamentos.lancarReajuste).toHaveBeenCalledWith(
        expect.objectContaining({ bancoId: 'b1', mes: { ano: 2026, mes: 11 }, minutos: 120 })
      )
    );
    expect(await screen.findByRole('heading', { name: 'BANCO COMEX' })).toBeInTheDocument();
  });

  it('aba Reajustes; quem só vê não lança, nem pelo quadro', () => {
    permissoes = ['bancos_horas_controle:view'];
    renderizar();
    expect(
      screen.queryByRole('button', { name: /controleBancoHoras.quadro.lancarReajuste/ })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'controleBancoHoras.secoes.reajustes' }));
    expect(screen.getByText('controleBancoHoras.reajustes.vazio')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'controleBancoHoras.reajustes.lancar' })
    ).not.toBeInTheDocument();
  });

  it('aba Observações grava no banco escolhido', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'controleBancoHoras.secoes.observacoes' }));
    expect(screen.getByText('controleBancoHoras.observacoes.vazio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'controleBancoHoras.observacoes.nova' }));
    fireEvent.change(screen.getByLabelText(/controleBancoHoras.observacoes.texto/), {
      target: { value: 'Cliente pediu revisão' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() =>
      expect(lancamentos.salvarObservacao).toHaveBeenCalledWith({
        bancoId: 'b1',
        mes: { ano: 2026, mes: 10 },
        texto: 'Cliente pediu revisão',
      })
    );
  });
});
