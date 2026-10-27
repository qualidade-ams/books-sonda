import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import RamosAtividade from '../RamosAtividade';
import type { RamoAtividade } from '@/types/ramosAtividade';
import { exportarTabela } from '@/utils/exportarTabela';
import { lerPlanilha } from '@/utils/importarPlanilha';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
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

const ramo = (id: string, nome: string, extra: Partial<RamoAtividade> = {}): RamoAtividade => ({
  id,
  nome,
  ordem: 1,
  ativo: true,
  empresasPrincipal: 0,
  empresasSecundario: 0,
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
  ...extra,
});
const RAMOS = [
  ramo('r1', 'Agronegócio', { empresasPrincipal: 3 }),
  ramo('r2', 'Varejo', { ativo: false }),
];

const hook = {
  ramos: RAMOS,
  totalEmpresas: 10,
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  salvar: vi.fn(async () => undefined),
  isSalvando: false,
};
let permissoes: string[] = [];
vi.mock('@/hooks/useRamosAtividade', () => ({ useRamosAtividade: () => hook }));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));

// O Radix (menu) usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
beforeEach(() => {
  vi.clearAllMocks();
  permissoes = ['ramos_atividade:edit'];
  Object.assign(hook, { ramos: RAMOS, isLoading: false, error: null });
});

const lista = () => within(screen.getByRole('list', { name: 'ramosAtividade.lista.titulo' }));
const incluir = (nome: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'ramosAtividade.lista.novo' }), {
    target: { value: nome },
  });
  fireEvent.click(screen.getByRole('button', { name: 'ramosAtividade.lista.incluir' }));
};

describe('RamosAtividade', () => {
  it('carregando, erro e vazio', () => {
    hook.isLoading = true;
    const { unmount } = render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    expect(
      screen.getByRole('status', { name: 'ramosAtividade.lista.carregando' })
    ).toBeInTheDocument();
    unmount();

    Object.assign(hook, { isLoading: false, error: new Error('x') });
    const segundo = render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(hook.recarregar).toHaveBeenCalled();
    segundo.unmount();

    Object.assign(hook, { error: null, ramos: [] });
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    expect(screen.getByText('ramosAtividade.lista.vazioTitulo')).toBeInTheDocument();
  });

  it('incluir: exige nome que não repete; o novo fica pendente até salvar', () => {
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'ramosAtividade.lista.incluir' }));
    expect(screen.getByText('ramosAtividade.lista.digiteNome')).toBeInTheDocument();
    incluir('agronegócio');
    expect(screen.getByText('ramosAtividade.lista.repetido')).toBeInTheDocument();
    incluir('Saúde');
    expect(lista().getByText('Saúde')).toBeInTheDocument();
    expect(lista().getByText('ramosAtividade.selo.novo')).toBeInTheDocument();
    expect(screen.getByText('RamosAtividade.mudancas.incluidos.um {"n":1}')).toBeInTheDocument();
  });

  it('inativar um ramo em uso e salvar: confirma com a consequência e grava o rascunho', async () => {
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"Agronegócio"}' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'fase3Comum.inativar' }));
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    const dialogo = screen.getByRole('alertdialog', { name: 'ramosAtividade.confirmar.titulo' });
    expect(
      within(dialogo).getByText(
        'ramosAtividade.confirmar.inativadosEmUso.um {"n":1,"nomes":"Agronegócio","empresas":"ramosAtividade.empresas.varios {\\"n\\":3}"}'
      )
    ).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(hook.salvar).toHaveBeenCalledWith([
        { id: 'r1', nome: 'Agronegócio', ativo: false },
        { id: 'r2', nome: 'Varejo', ativo: false },
      ])
    );
  });

  it('descartar volta ao que está salvo', async () => {
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    incluir('Saúde');
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.descartar' }));
    expect(lista().queryByText('Saúde')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'fase3Comum.salvar' })).not.toBeInTheDocument();
  });

  it('o indicador de inativos filtra, e com filtro não se reordena', () => {
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /ramosAtividade.indicadores.inativos/ }));
    expect(lista().queryByText('Agronegócio')).not.toBeInTheDocument();
    expect(lista().getByText('Varejo')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'fase3Comum.reordenar {"nome":"Varejo"}' })
    ).toBeDisabled();
  });

  it('só visualiza: sem incluir, reordenar ou menu', () => {
    permissoes = ['ramos_atividade:view'];
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    expect(
      screen.queryByRole('textbox', { name: 'ramosAtividade.lista.novo' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fase3Comum.reordenar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fase3Comum.acoesDe/ })).not.toBeInTheDocument();
  });

  it('exporta os ramos gravados com a busca aplicada, também para quem só consulta', async () => {
    permissoes = ['ramos_atividade:view'];
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'ramosAtividade.lista.buscar' }), {
      target: { value: 'agro' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'ds.exportar.botao' }));
    expect(screen.getByText('ramosAtividade.exportar.descricao.um {"n":1}')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.pdf' }));

    expect(exportarTabela).toHaveBeenCalledWith(
      expect.objectContaining({ arquivo: 'ramosAtividade.exportar.arquivo' }),
      'pdf'
    );
    const [exportacao] = vi.mocked(exportarTabela).mock.calls[0];
    expect((exportacao.abas[0].linhas as RamoAtividade[]).map((r) => r.nome)).toEqual([
      'Agronegócio',
    ]);
  });

  it('importa ramos novos no fim da lista; o que já existe é ignorado', async () => {
    vi.mocked(lerPlanilha).mockResolvedValue([
      ['ramosAtividade.exportar.colunas.ramo'],
      ['Logística'],
      ['varejo'],
    ]);
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.botao' }));
    expect(
      screen.getByRole('heading', { name: 'ramosAtividade.importar.titulo' })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
      target: { files: [new File(['x'], 'ramos.xlsx')] },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'ds.importar.importarN.um {"n":1}' })
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ds.importar.botao' })
    );
    await waitFor(() =>
      expect(hook.salvar).toHaveBeenCalledWith([
        { id: 'r1', nome: 'Agronegócio', ativo: true },
        { id: 'r2', nome: 'Varejo', ativo: false },
        { nome: 'Logística', ativo: true },
      ])
    );
    expect(screen.getByRole('list', { name: 'ramosAtividade.lista.titulo' })).toBeInTheDocument();
  });

  it('importar: só quem edita, e não com alterações pendentes', () => {
    const { unmount } = render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    incluir('Novo ramo');
    expect(screen.getByRole('button', { name: 'ds.importar.botao' })).toBeDisabled();
    unmount();
    permissoes = ['ramos_atividade:view'];
    render(
      <TooltipProvider>
        <RamosAtividade />
      </TooltipProvider>
    );
    expect(screen.queryByRole('button', { name: 'ds.importar.botao' })).not.toBeInTheDocument();
  });
});
