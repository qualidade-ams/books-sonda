import { render, screen, fireEvent } from '@testing-library/react';
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
vi.mock('@/hooks/useControleBancoHoras', () => ({
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
});
