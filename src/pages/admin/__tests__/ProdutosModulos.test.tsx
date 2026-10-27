import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import ProdutosModulos from '../ProdutosModulos';
import type { Catalogo } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';
import { exportarTabela, matrizDaAba } from '@/utils/exportarTabela';
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
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useUltimaAlteracao', () => ({ useUltimaAlteracao: () => undefined }));

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const produto = (id: string, nome: string, ordem: number, extra = {}) => ({
  id,
  solucaoId: 's1',
  codigo: id,
  nome,
  descricao: null,
  ordem,
  ativo: true,
  aClassificar: false,
  ...autoria,
  ...extra,
});
const modulo = (id: string, produtoId: string, nome: string) => ({
  id,
  produtoId,
  nome,
  descricao: null,
  ordem: 1,
  ativo: true,
  ...autoria,
});
const CATALOGO: Catalogo = {
  solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria }],
  produtos: [
    produto('ce', 'CE PLUS', 1),
    produto('fci', 'FCI', 2),
    produto('prov', 'A classificar', 3, { aClassificar: true }),
  ],
  modulos: [modulo('cambio', 'ce', 'Câmbio'), modulo('solto', 'prov', 'Solto')],
};
const MAPEAMENTOS = [
  {
    id: 'g1',
    grupoAranda: 'AMS APL - CAMBIO - N2',
    grupoBook: 'B',
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
    ...autoria,
  },
] as MapeamentoGrupo[];

const catalogo = {
  solucoes: CATALOGO.solucoes,
  produtos: CATALOGO.produtos,
  modulos: CATALOGO.modulos,
  usos: [],
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  salvarSolucao: vi.fn(async () => undefined),
  salvarProduto: vi.fn(async () => undefined),
  reordenarProdutos: vi.fn(async () => undefined),
  salvarModulo: vi.fn(async () => undefined),
  moverModulo: vi.fn(async () => ({ provisorioInativado: true })),
  importar: vi.fn(async () => undefined),
  isSalvando: false,
};
const requerimentos = {
  modulosRequerimento: [{ id: 'r1', moduloRequerimento: 'Comex', produtoId: 'ce', moduloId: null }],
  isLoading: false,
  error: null,
  salvar: vi.fn(async () => undefined),
  isSalvando: false,
};
const dePara = {
  mapeamentos: MAPEAMENTOS,
  isLoading: false,
  error: null,
  atribuirDestino: vi.fn(async () => undefined),
};
let permissoes: string[] = [];
vi.mock('@/hooks/useCatalogo', () => ({
  useCatalogo: () => catalogo,
  useModulosRequerimento: () => requerimentos,
}));
vi.mock('@/hooks/useDePara', () => ({ useDePara: () => dePara }));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));

window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
// O Radix (Select e menu) usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});
beforeEach(() => {
  vi.clearAllMocks();
  permissoes = ['produtos_modulos:edit', 'de_para_grupos:edit'];
  Object.assign(catalogo, { ...CATALOGO, isLoading: false, error: null });
});

const renderizar = () =>
  render(
    <TooltipProvider>
      <ProdutosModulos />
    </TooltipProvider>
  );

describe('ProdutosModulos', () => {
  it('carregando, mostra o esqueleto da árvore', () => {
    catalogo.isLoading = true;
    renderizar();
    expect(
      screen.getByRole('status', { name: 'produtosModulos.arvore.carregando' })
    ).toBeInTheDocument();
  });

  it('erro ao carregar, com tentar novamente', () => {
    catalogo.error = new Error('falhou');
    renderizar();
    expect(screen.getByText('produtosModulos.erroCatalogo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(catalogo.recarregar).toHaveBeenCalled();
  });

  it('sem soluções, convida a criar a primeira', () => {
    catalogo.solucoes = [];
    renderizar();
    expect(screen.getByText('produtosModulos.vazio.titulo')).toBeInTheDocument();
  });

  it('abre no primeiro produto, com os indicadores e as ações de quem edita', () => {
    renderizar();
    expect(screen.getByText('produtosModulos.indicadores.modulosSemGrupo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CE PLUS' })).toBeInTheDocument();
    expect(screen.getByText('Câmbio')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /produtosModulos.novaSolucao/ }).length
    ).toBeGreaterThan(0);
  });

  it('só visualiza: sem botões de criar', () => {
    permissoes = ['produtos_modulos:view'];
    renderizar();
    expect(
      screen.queryByRole('button', { name: /produtosModulos.novaSolucao/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /produtosModulos.novoModulo/ })
    ).not.toBeInTheDocument();
  });

  it('salvar o módulo grava o módulo e leva o grupo desvinculado para o produto', async () => {
    renderizar();
    fireEvent.click(screen.getByText('Câmbio'));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'produtosModulos.grupos.desvincularGrupo {"grupo":"AMS APL - CAMBIO - N2"}',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(dePara.atribuirDestino).toHaveBeenCalledWith({
        ids: ['g1'],
        destino: { solucaoId: 's1', produtoId: 'ce', moduloId: null },
      })
    );
    expect(catalogo.salvarModulo).toHaveBeenCalledWith({
      id: 'cambio',
      produtoId: 'ce',
      nome: 'Câmbio',
      descricao: null,
      ativo: true,
    });
  });

  it('inativar um produto pela solução pede confirmação', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /^COMEX/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"FCI"}' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'fase3Comum.inativar' }));
    const dialogo = screen.getByRole('alertdialog', {
      name: 'produtosModulos.edicao.inativarTitulo {"nome":"FCI"}',
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'fase3Comum.inativar' }));
    await waitFor(() =>
      expect(catalogo.salvarProduto).toHaveBeenCalledWith({
        id: 'fci',
        solucaoId: 's1',
        nome: 'FCI',
        descricao: null,
        ativo: false,
      })
    );
  });

  it('move um módulo "A classificar" para o produto escolhido', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /^A classificar/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"Solto"}' })
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'produtosModulos.produto.moverPara' })
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'produtosModulos.mover.destino' }));
    await userEvent.click(screen.getByRole('option', { name: 'FCI' }));
    await userEvent.click(screen.getByRole('button', { name: 'produtosModulos.mover.confirmar' }));
    await waitFor(() =>
      expect(catalogo.moverModulo).toHaveBeenCalledWith({ moduloId: 'solto', produtoId: 'fci' })
    );
  });

  it('na aba de requerimentos, salva cada correspondência alterada', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: 'produtosModulos.abas.requerimentos' }));
    await userEvent.click(
      screen.getByRole('combobox', {
        name: 'produtosModulos.requerimentos.moduloDe {"modulo":"Comex"}',
      })
    );
    await userEvent.click(screen.getByRole('option', { name: 'Câmbio' }));
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() =>
      expect(requerimentos.salvar).toHaveBeenCalledWith({
        id: 'r1',
        produtoId: 'ce',
        moduloId: 'cambio',
      })
    );
  });

  it('exporta o catálogo inteiro, também para quem só consulta', async () => {
    permissoes = ['produtos_modulos:view'];
    renderizar();
    await userEvent.click(screen.getByRole('button', { name: 'ds.exportar.botao' }));
    expect(screen.getByText('produtosModulos.exportar.descricao')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.pdf' }));
    const [exportacao, formato] = vi.mocked(exportarTabela).mock.calls[0];
    expect(formato).toBe('pdf');
    // 3 produtos e 2 módulos, depois do cabeçalho
    expect(matrizDaAba(exportacao.abas[0])).toHaveLength(6);
  });

  it('importa o catálogo: produto e módulo novos na solução que existe', async () => {
    vi.mocked(lerPlanilha).mockResolvedValue([
      [
        'produtosModulos.exportar.colunas.solucao',
        'produtosModulos.exportar.colunas.produto',
        'produtosModulos.exportar.colunas.modulo',
        'produtosModulos.exportar.colunas.descricao',
      ],
      ['COMEX', 'CE PLUS', 'Drawback', ''],
      ['COMEX', 'CE PLUS', 'Câmbio', ''],
    ]);
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.botao' }));
    expect(
      screen.getByRole('heading', { name: 'produtosModulos.importar.titulo' })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
      target: { files: [new File(['x'], 'catalogo.xlsx')] },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'ds.importar.importarN.um {"n":1}' })
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ds.importar.botao' })
    );
    await waitFor(() =>
      expect(catalogo.importar).toHaveBeenCalledWith([
        { solucaoId: 's1', produto: 'CE PLUS', modulo: 'Drawback', descricao: null },
      ])
    );
  });

  it('só visualiza: sem importar', () => {
    permissoes = ['produtos_modulos:view'];
    renderizar();
    expect(screen.queryByRole('button', { name: 'ds.importar.botao' })).not.toBeInTheDocument();
  });
});
