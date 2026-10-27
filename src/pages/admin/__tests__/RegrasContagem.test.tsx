import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import RegrasContagem from '../RegrasContagem';
import type { RegrasContagem as Regras } from '@/types/regrasContagem';
import userEvent from '@testing-library/user-event';
import { exportarTabela } from '@/utils/exportarTabela';
import { lerPlanilha } from '@/utils/importarPlanilha';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/utils/exportarTabela', async (original) => ({
  ...(await original<typeof import('@/utils/exportarTabela')>()),
  exportarTabela: vi.fn(async () => undefined),
}));
vi.mock('@/utils/importarPlanilha', async (original) => ({
  ...(await original<typeof import('@/utils/importarPlanilha')>()),
  lerPlanilha: vi.fn(),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const REGRAS: Regras = {
  filtros: {
    gruposQueContam: ['AMS APL'],
    tiposChamado: ['IM', 'RF', 'PM'],
    ignorarAtividadeInterna: true,
    itensExcluidos: [],
    soTicketsFechados: true,
  },
  codigos: [
    {
      codigo: 'Banco=S|SLA=N',
      contaHoras: true,
      contaTickets: true,
      apontamentos6m: 10,
      tickets6m: 2,
    },
  ],
  codigosSemRegra: [
    { codigo: 'Novo=S', apontamentos6m: 4, tickets6m: 1, primeiraOcorrencia: '2026-10-01' },
  ],
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
};
const hook = {
  regras: REGRAS as Regras | null,
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  salvar: vi.fn(async () => undefined),
  isSalvando: false,
};
let permissoes: string[] = [];
vi.mock('@/hooks/useRegrasContagem', () => ({ useRegrasContagem: () => hook }));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
beforeEach(() => {
  vi.clearAllMocks();
  permissoes = ['regras_contagem:edit'];
  Object.assign(hook, { regras: REGRAS, isLoading: false, error: null });
});

const renderizar = () =>
  render(
    <TooltipProvider>
      <RegrasContagem />
    </TooltipProvider>
  );
const aba = (nome: string) => fireEvent.click(screen.getByRole('tab', { name: new RegExp(nome) }));

describe('RegrasContagem', () => {
  it('carregando e erro', () => {
    Object.assign(hook, { isLoading: true, regras: null });
    const { unmount } = renderizar();
    expect(screen.getByRole('status', { name: 'regrasContagem.carregando' })).toBeInTheDocument();
    unmount();

    Object.assign(hook, { isLoading: false, error: new Error('x') });
    renderizar();
    expect(screen.getByText('regrasContagem.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(hook.recarregar).toHaveBeenCalled();
  });

  it('incluir um código sem regra leva para a lista e sai dos sem regra', () => {
    renderizar();
    aba('regrasContagem.abas.semRegra');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'regrasContagem.semRegra.incluirCodigo {"codigo":"Novo=S"}',
      })
    );
    const lista = within(screen.getByRole('list', { name: 'regrasContagem.codigos.titulo' }));
    expect(lista.getByText('Novo=S')).toBeInTheDocument();
    expect(
      lista.getByText('regrasContagem.codigos.uso {"apontamentos":4,"tickets":1}')
    ).toBeInTheDocument();
    expect(screen.getByText('RegrasContagem.mudancas.incluidos.um {"n":1}')).toBeInTheDocument();
    aba('regrasContagem.abas.semRegra');
    expect(screen.getByText('regrasContagem.semRegra.vazio')).toBeInTheDocument();
  });

  it('salvar pede o motivo e manda só o que mudou', async () => {
    renderizar();
    aba('regrasContagem.abas.filtros');
    fireEvent.click(screen.getByRole('switch', { name: 'regrasContagem.filtros.tickets' }));
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'regrasContagem.confirmar.titulo' });
    expect(within(dialogo).getByText('RegrasContagem.mudancas.filtros')).toBeInTheDocument();
    const salvar = within(dialogo).getByRole('button', { name: 'ds.formulario.salvar' });
    expect(salvar).toBeDisabled();
    fireEvent.change(within(dialogo).getByLabelText(/regrasContagem.confirmar.motivo/), {
      target: { value: 'Tickets abertos passam a contar' },
    });
    fireEvent.click(salvar);
    await waitFor(() =>
      expect(hook.salvar).toHaveBeenCalledWith({
        motivo: 'Tickets abertos passam a contar',
        filtros: { ...REGRAS.filtros, soTicketsFechados: false },
      })
    );
  });

  it('sem nenhum grupo, não salva', () => {
    renderizar();
    aba('regrasContagem.abas.filtros');
    fireEvent.click(screen.getByRole('button', { name: /ds.formulario.remover/ }));
    expect(screen.getByText('regrasContagem.mudancas.naoPode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'fase3Comum.salvar' })).toBeDisabled();
  });

  it('descartar volta ao salvo', () => {
    renderizar();
    aba('regrasContagem.abas.semRegra');
    fireEvent.click(screen.getByRole('button', { name: /incluirCodigo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.descartar' }));
    expect(screen.queryByRole('button', { name: 'fase3Comum.salvar' })).not.toBeInTheDocument();
    aba('regrasContagem.abas.semRegra');
    expect(screen.getByRole('button', { name: /incluirCodigo/ })).toBeInTheDocument();
  });

  it('só visualiza: nada editável', () => {
    permissoes = ['regras_contagem:view'];
    renderizar();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    aba('regrasContagem.abas.semRegra');
    expect(screen.queryByRole('button', { name: /incluirCodigo/ })).not.toBeInTheDocument();
  });

  it('exporta as regras gravadas, também para quem só consulta', async () => {
    permissoes = ['regras_contagem:view'];
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'ds.exportar.botao' }));
    expect(screen.getByText('regrasContagem.exportar.descricao')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.excel' }));
    const [exportacao, formato] = vi.mocked(exportarTabela).mock.calls[0];
    expect(formato).toBe('xlsx');
    expect(exportacao.abas.map((a) => a.linhas.length)).toEqual([1, 1, 5]);
  });

  it('importa códigos: o motivo leva o nome do arquivo e os códigos vão como a lista completa', async () => {
    vi.mocked(lerPlanilha).mockResolvedValue([
      [
        'regrasContagem.codigos.colunaCodigo',
        'regrasContagem.codigos.colunaHoras',
        'regrasContagem.codigos.colunaTickets',
      ],
      ['Treinamento', 'Sim', 'Não'],
      ['Banco=S|SLA=N', 'Sim', 'Não'],
    ]);
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.botao' }));
    expect(
      screen.getByRole('heading', { name: 'regrasContagem.importar.titulo' })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
      target: { files: [new File(['x'], 'codigos.xlsx')] },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'ds.importar.importarN.varios {"n":2}' })
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ds.importar.botao' })
    );
    await waitFor(() =>
      expect(hook.salvar).toHaveBeenCalledWith({
        motivo: 'regrasContagem.importar.motivo {"arquivo":"codigos.xlsx"}',
        codigos: [
          { codigo: 'Banco=S|SLA=N', contaHoras: true, contaTickets: false },
          { codigo: 'Treinamento', contaHoras: true, contaTickets: false },
        ],
      })
    );
  });

  it('importar: só quem edita, e não com alterações pendentes', () => {
    const { unmount } = renderizar();
    aba('regrasContagem.abas.filtros');
    fireEvent.click(screen.getByRole('switch', { name: 'regrasContagem.filtros.tickets' }));
    expect(screen.getByRole('button', { name: 'ds.importar.botao' })).toBeDisabled();
    unmount();
    permissoes = ['regras_contagem:view'];
    renderizar();
    expect(screen.queryByRole('button', { name: 'ds.importar.botao' })).not.toBeInTheDocument();
  });
});
