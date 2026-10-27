import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import DeParaGrupos from '../DeParaGrupos';
import type { MapeamentoGrupo } from '@/types/dePara';
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
vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/hooks/useUltimaAlteracao', async (original) => ({
  ...(await original<typeof import('@/hooks/useUltimaAlteracao')>()),
  useUltimaAlteracao: () => undefined,
}));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => ({}) }));

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const mapeamento = (id: string, grupoAranda: string, extra: Partial<MapeamentoGrupo>) =>
  ({
    id,
    grupoAranda,
    grupoBook: 'COMEX',
    solucaoId: null,
    produtoId: null,
    moduloId: null,
    classificacao: 'nao_se_aplica',
    ...autoria,
    ...extra,
  }) as MapeamentoGrupo;
const MAPEAMENTOS = [
  mapeamento('g1', 'AMS APL - CAMBIO - N2', {
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
  }),
  mapeamento('g2', 'DEDICADOS', {}),
];

const dePara = {
  mapeamentos: MAPEAMENTOS,
  uso: {},
  naoMapeados: [
    {
      grupoAranda: 'AMS NOVO',
      apontamentos: 5,
      tickets: 0,
      empresas: ['ALFA'],
      primeiraOcorrencia: '2026-10-01',
    },
  ],
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
  salvar: vi.fn(async () => undefined),
  atribuirDestino: vi.fn(async () => undefined),
  excluir: vi.fn(async () => undefined),
  importar: vi.fn(async () => undefined),
  isSalvando: false,
};
const catalogo = {
  solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria }],
  produtos: [
    {
      id: 'ce',
      solucaoId: 's1',
      codigo: 'CE',
      nome: 'CE PLUS',
      descricao: null,
      ordem: 1,
      ativo: true,
      aClassificar: false,
      ...autoria,
    },
  ],
  modulos: [
    {
      id: 'cambio',
      produtoId: 'ce',
      nome: 'Câmbio',
      descricao: null,
      ordem: 1,
      ativo: true,
      ...autoria,
    },
  ],
  isLoading: false,
  error: null,
  recarregar: vi.fn(),
};
let permissoes: string[] = [];
vi.mock('@/hooks/useDePara', () => ({ useDePara: () => dePara }));
vi.mock('@/hooks/useCatalogo', () => ({ useCatalogo: () => catalogo }));
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
  permissoes = ['de_para_grupos:edit'];
  dePara.error = null;
});

const renderizar = () =>
  render(
    <TooltipProvider>
      <DeParaGrupos />
    </TooltipProvider>
  );
const lista = () => within(screen.getByRole('list', { name: 'deParaGrupos.lista.rotulo' }));

describe('DeParaGrupos', () => {
  it('mostra os indicadores e os mapeamentos', () => {
    renderizar();
    expect(screen.getByText('deParaGrupos.indicadores.semModulo')).toBeInTheDocument();
    expect(lista().getByText('AMS APL - CAMBIO - N2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /deParaGrupos.novoMapeamento/ })).toBeInTheDocument();
  });

  it('o indicador "Sem módulo" filtra a lista', () => {
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: /deParaGrupos.indicadores.semModulo/ }));
    expect(lista().queryByText('AMS APL - CAMBIO - N2')).not.toBeInTheDocument();
    expect(lista().getByText('DEDICADOS')).toBeInTheDocument();
  });

  it('mapear um grupo da aba de não mapeados grava pelo hook', async () => {
    renderizar();
    fireEvent.click(screen.getByRole('tab', { name: /deParaGrupos.abas.naoMapeados/ }));
    fireEvent.click(
      screen.getByRole('button', {
        name: 'deParaGrupos.naoMapeados.mapearGrupo {"grupo":"AMS NOVO"}',
      })
    );
    fireEvent.change(
      screen.getByLabelText(/deParaGrupos.edicao.grupoBook/, { selector: 'input' }),
      { target: { value: 'Novo' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'deParaGrupos.edicao.mapear' }));
    await waitFor(() =>
      expect(dePara.salvar).toHaveBeenCalledWith({
        grupoAranda: 'AMS NOVO',
        grupoBook: 'Novo',
        destino: { solucaoId: null, produtoId: null, moduloId: null },
      })
    );
  });

  it('atribuir em lote e excluir chamam o hook', async () => {
    renderizar();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'deParaGrupos.lista.selecionar {"grupo":"DEDICADOS"}' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'deParaGrupos.lista.atribuir' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'deParaGrupos.lista.atribuir',
      })
    );
    await waitFor(() =>
      expect(dePara.atribuirDestino).toHaveBeenCalledWith({
        ids: ['g2'],
        destino: { solucaoId: null, produtoId: null, moduloId: null },
      })
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"DEDICADOS"}' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'deParaGrupos.lista.excluir' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'deParaGrupos.lista.excluir',
      })
    );
    await waitFor(() => expect(dePara.excluir).toHaveBeenCalledWith('g2'));
  });

  it('erro: tentar novamente recarrega', () => {
    dePara.error = new Error('falhou');
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(dePara.recarregar).toHaveBeenCalled();
  });

  it('só visualiza: sem novo mapeamento', () => {
    permissoes = ['de_para_grupos:view'];
    renderizar();
    expect(
      screen.queryByRole('button', { name: /deParaGrupos.novoMapeamento/ })
    ).not.toBeInTheDocument();
  });

  it('exporta os mapeamentos com a busca aplicada, também para quem só consulta', async () => {
    permissoes = ['de_para_grupos:view'];
    renderizar();
    fireEvent.change(screen.getByRole('searchbox', { name: 'deParaGrupos.lista.buscar' }), {
      target: { value: 'cambio' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'ds.exportar.botao' }));
    expect(screen.getByText('deParaGrupos.exportar.descricao.um {"n":1}')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ds.exportar.excel' }));
    const [exportacao] = vi.mocked(exportarTabela).mock.calls[0];
    expect((exportacao.abas[0].linhas as MapeamentoGrupo[]).map((m) => m.id)).toEqual(['g1']);
  });

  it('importa mapeamentos com o destino pelo nome; avisa que pode mover horas', async () => {
    vi.mocked(lerPlanilha).mockResolvedValue([
      [
        'deParaGrupos.lista.colunaGrupo',
        'deParaGrupos.lista.colunaBook',
        'deParaGrupos.destino.solucao',
        'deParaGrupos.destino.produto',
        'deParaGrupos.destino.modulo',
      ],
      ['AMS NOVO', 'COMEX - Novo', 'COMEX', 'CE PLUS', ''],
      ['DEDICADOS', 'COMEX', '', '', ''],
    ]);
    renderizar();
    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.botao' }));
    fireEvent.change(screen.getByLabelText(/ds.importar.escolher/), {
      target: { files: [new File(['x'], 'de-para.xlsx')] },
    });
    expect(await screen.findByText('deParaGrupos.importar.aviso.titulo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ds.importar.importarN.um {"n":1}' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'ds.importar.botao' })
    );
    await waitFor(() =>
      expect(dePara.importar).toHaveBeenCalledWith([
        {
          grupoAranda: 'AMS NOVO',
          grupoBook: 'COMEX - Novo',
          destino: { solucaoId: 's1', produtoId: 'ce', moduloId: null },
        },
      ])
    );
  });

  it('só visualiza: sem importar', () => {
    permissoes = ['de_para_grupos:view'];
    renderizar();
    expect(screen.queryByRole('button', { name: 'ds.importar.botao' })).not.toBeInTheDocument();
  });
});
