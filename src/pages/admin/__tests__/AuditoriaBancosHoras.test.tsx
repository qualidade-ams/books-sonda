import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import AuditoriaBancosHoras from '../AuditoriaBancosHoras';
import type { FiltrosAuditoria, RegistroAuditoria } from '@/types/auditoria';

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

const registro = (id: number, extra: Partial<RegistroAuditoria> = {}): RegistroAuditoria => ({
  id,
  em: '2026-10-21T13:12:00Z',
  usuarioId: 'u1',
  usuario: 'Pessoa A',
  origem: 'app',
  tabela: 'bancos_horas',
  area: 'bancos',
  registroId: `r${id}`,
  empresaId: 'e1',
  empresa: 'EMPRESA ALFA',
  bancoId: 'b1',
  banco: 'Banco FISCAL',
  acao: 'update',
  campos: [{ campo: 'ordem', antes: 3, depois: 2 }],
  dados: { nome: 'Banco FISCAL', ordem: 2 },
  motivo: null,
  ...extra,
});

const estado = {
  registros: [
    registro(1),
    registro(2, {
      usuarioId: null,
      usuario: null,
      origem: 'sincronizacao',
      tabela: 'empresas',
      area: 'empresas',
      empresaId: 'e2',
      empresa: 'EMPRESA BETA',
      bancoId: null,
      banco: null,
      campos: [
        { campo: 'email_comercial', antes: 'antigo@exemplo.com', depois: 'novo@exemplo.com' },
      ],
      dados: { nome_abreviado: 'EMPRESA BETA' },
    }),
  ],
  temMais: false,
  carregarMais: vi.fn(),
  recarregar: vi.fn(),
  isCarregandoMais: false,
  isLoading: false,
  error: null as Error | null,
};
const filtrosPedidos: FiltrosAuditoria[] = [];
vi.mock('@/hooks/useAuditoria', () => ({
  useAuditoria: (filtros: FiltrosAuditoria) => {
    filtrosPedidos.push(filtros);
    return estado;
  },
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const renderizar = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <AuditoriaBancosHoras />
      </TooltipProvider>
    </MemoryRouter>
  );
const ultimoFiltro = () => filtrosPedidos[filtrosPedidos.length - 1];

describe('AuditoriaBancosHoras', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filtrosPedidos.length = 0;
    estado.temMais = false;
    estado.error = null;
  });

  it('lista as alterações com quem, registro, área e ação; começa nos últimos 30 dias', () => {
    renderizar();
    const lista = screen.getByRole('list', { name: 'auditoriaBancosHoras.lista' });
    expect(within(lista).getByText('Pessoa A')).toBeInTheDocument();
    expect(
      within(lista).getByText('auditoriaBancosHoras.quemAutomatico.sincronizacao')
    ).toBeInTheDocument();
    expect(within(lista).getByRole('button', { name: 'Banco FISCAL' })).toBeInTheDocument();
    expect(within(lista).getByText(/auditoriaBancosHoras.areas.empresas/)).toBeInTheDocument();
    expect(within(lista).getByText('ordem: 3 → 2')).toBeInTheDocument();

    const { desde, ate } = ultimoFiltro();
    expect(desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dias = (Date.parse(ate!) - Date.parse(desde!)) / 86_400_000;
    expect(dias).toBe(30);
  });

  it('a busca filtra as alterações carregadas', () => {
    renderizar();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'novo@exemplo' } });
    const lista = screen.getByRole('list', { name: 'auditoriaBancosHoras.lista' });
    expect(within(lista).queryByText('Pessoa A')).not.toBeInTheDocument();
    expect(within(lista).getByRole('button', { name: 'EMPRESA BETA' })).toBeInTheDocument();
  });

  it('os filtros da lista vão para a consulta', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'ds.filters' }));
    fireEvent.click(screen.getByRole('button', { name: /auditoriaBancosHoras.filtros.area/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /auditoriaBancosHoras.areas.reajustes/ }));
    expect(ultimoFiltro().areas).toEqual(['reajustes']);

    fireEvent.click(screen.getByRole('button', { name: /auditoriaBancosHoras.filtros.empresa/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'EMPRESA BETA' }));
    expect(ultimoFiltro().empresaIds).toEqual(['e2']);
  });

  it('indicador de feitas na tela filtra pela origem', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /auditoriaBancosHoras.indicadores.tela/ }));
    expect(ultimoFiltro().origens).toEqual(['app']);
  });

  it('abre o detalhe e leva ao histórico do registro; "ver todas" volta', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'Banco FISCAL' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /auditoriaBancosHoras.detalhe.verHistorico/ })
    );
    expect(ultimoFiltro().registroId).toBe('r1');
    expect(screen.getByText(/auditoriaBancosHoras.historicoDe/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'auditoriaBancosHoras.verTodas' }));
    expect(ultimoFiltro().registroId).toBeUndefined();
  });

  it('carrega mais quando há outra página', () => {
    estado.temMais = true;
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'auditoriaBancosHoras.carregarMais' }));
    expect(estado.carregarMais).toHaveBeenCalled();
  });

  it('erro: tenta de novo', () => {
    estado.error = new Error('sem rede');
    renderizar();
    expect(screen.getByText('auditoriaBancosHoras.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(estado.recarregar).toHaveBeenCalled();
  });
});
