import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import Empresas from '../Empresas';
import EmpresaDetalhe from '../EmpresaDetalhe';
import type { EmpresaDetalhe as Detalhe, EmpresaLista } from '@/types/empresas';

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
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const lista = (id: string, extra: Partial<EmpresaLista> = {}): EmpresaLista => ({
  id,
  nomeAbreviado: id.toUpperCase(),
  nomeCompleto: `${id.toUpperCase()} LTDA`,
  status: 'ativo',
  modelo: 'legado',
  solucoes: [],
  temAms: false,
  emProjeto: false,
  pendencias: [],
  emailCs: null,
  emailComercial: null,
  nomeCs: null,
  nomeComercial: null,
  observacao: null,
  ...extra,
});
const listaHook = {
  empresas: [lista('alfa'), lista('beta', { pendencias: ['ramo'] })],
  totais: { total: 2, ativas: 2, inativas: 0, pendentes: 1 },
  isLoading: false,
  error: null as Error | null,
  recarregar: vi.fn(),
};
const DETALHE = {
  id: 'alfa',
  nomeAbreviado: 'ALFA',
  nomeCompleto: 'ALFA LTDA',
  grupoEmpresarial: null,
  status: 'ativo',
  modelo: 'multiplo',
  vigenciaInicio: null,
  vigenciaFim: null,
  emailCs: null,
  emailComercial: null,
  emailTm: null,
  observacao: null,
  emProjeto: false,
  idAranda: null,
  solucoes: [
    {
      id: 'es1',
      solucaoId: 's1',
      codigo: 'COMEX',
      nome: 'COMEX',
      temAms: true,
      emProjeto: false,
      justificativaProjeto: null,
    },
  ],
  anexos: [
    { id: 'a1', nome: 'contrato.pdf', tamanhoBytes: 1, storagePath: 'empresas/alfa/contrato.pdf' },
  ],
  organizacoes: [],
  informacoes: {
    ramoId: null,
    ramoSecundarioId: null,
    descricaoAtividade: null,
    fiscal: {
      modalidade: null,
      edocs24x7: null,
      atualizacaoContratada: null,
      atualizacoesPorAno: null,
      dba: null,
      minutosAtendimento: null,
      minutosMonitoramento: null,
      bancoDados: null,
    },
  },
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
} as unknown as Detalhe;
const detalheHook = {
  empresa: DETALHE as Detalhe | null,
  isLoading: false,
  error: null as Error | null,
  salvarSolucoes: vi.fn(async () => undefined),
  salvarInformacoes: vi.fn(async () => undefined),
  isSalvando: false,
};
const downloadAnexo = vi.fn();
let permissoes: string[] = [];
vi.mock('@/hooks/useEmpresasCadastro', () => ({
  useEmpresasCadastro: () => listaHook,
  useEmpresaCadastro: () => detalheHook,
}));
vi.mock('@/hooks/useEmpresaAnexos', () => ({ useEmpresaAnexos: () => ({ downloadAnexo }) }));
vi.mock('@/hooks/useRamosAtividade', () => ({
  useRamosAtividade: () => ({ ramos: [{ id: 'r1', nome: 'Agronegócio', ativo: true }] }),
}));
const BANCO_PADRAO = {
  id: 'bp',
  empresaId: 'alfa',
  ordem: 1,
  ativo: true,
  visivelCliente: true,
  espelhaLegado: false,
  nome: 'Banco padrão',
  descricao: null,
  padrao: true,
  tipoContrato: 'horas',
  periodoApuracao: 1,
  inicioVigencia: '2026-01-01',
  fimVigencia: null,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  filtroIc: null,
  escopo: [],
  baselines: [],
  repasses: [],
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
};
const bancosHook = {
  bancos: [BANCO_PADRAO],
  isLoading: false,
  error: null,
  criar: vi.fn(async () => 'novo'),
  salvar: vi.fn(async () => undefined),
  reordenar: vi.fn(async () => undefined),
  inativar: vi.fn(async () => undefined),
  reativar: vi.fn(async () => undefined),
  novaVigencia: vi.fn(async () => undefined),
  recarregar: vi.fn(),
  isSalvando: false,
};
vi.mock('@/hooks/useBancosHorasCadastro', () => ({ useBancosHorasCadastro: () => bancosHook }));
vi.mock('@/hooks/useNomesUsuarios', () => ({ useNomesUsuarios: () => ({}) }));
vi.mock('@/hooks/useCatalogo', () => ({
  useCatalogo: () => ({ solucoes: [], produtos: [], modulos: [], isLoading: false, error: null }),
}));
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: (tela: string, nivel: string) => permissoes.includes(`${tela}:${nivel}`),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  permissoes = ['empresas:edit', 'bancos_horas_parametros:edit'];
  Object.assign(detalheHook, { empresa: DETALHE, isLoading: false, error: null });
});

const renderizar = (rota: string) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <TooltipProvider>
        <Routes>
          <Route path="/admin/empresas" element={<Empresas />} />
          <Route path="/admin/empresas/:empresaId" element={<EmpresaDetalhe />} />
        </Routes>
      </TooltipProvider>
    </MemoryRouter>
  );

describe('Empresas (lista)', () => {
  it('indicadores; "Informações pendentes" filtra; a linha abre o detalhe', () => {
    renderizar('/admin/empresas');
    const tabela = () =>
      within(screen.getByRole('list', { name: 'empresasCadastro.lista.rotulo' }));
    fireEvent.click(screen.getByRole('button', { name: /empresasCadastro.indicadores.pendentes/ }));
    expect(tabela().queryByText('ALFA LTDA')).not.toBeInTheDocument();
    fireEvent.click(tabela().getByText('BETA LTDA'));
    expect(screen.getByRole('heading', { name: 'ALFA' })).toBeInTheDocument();
  });

  it('quem edita tem "Nova empresa na tela atual"; quem só vê, não', () => {
    const { unmount } = renderizar('/admin/empresas');
    expect(screen.getByRole('link', { name: /empresasCadastro.novaNaTelaAtual/ })).toHaveAttribute(
      'href',
      '/admin/empresas-clientes'
    );
    unmount();
    permissoes = ['empresas:view'];
    renderizar('/admin/empresas');
    expect(
      screen.queryByRole('link', { name: /empresasCadastro.novaNaTelaAtual/ })
    ).not.toBeInTheDocument();
  });
});

describe('Empresas (detalhe)', () => {
  it('cabeçalho com situação e modelo; voltar leva à lista', () => {
    renderizar('/admin/empresas/alfa');
    expect(screen.getByRole('heading', { name: 'ALFA' })).toBeInTheDocument();
    expect(screen.getByText('empresasCadastro.situacao.ativa')).toBeInTheDocument();
    expect(screen.getByText('empresasCadastro.detalhe.seloModelo.multiplo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'empresasCadastro.detalhe.voltar' }));
    expect(screen.getByRole('list', { name: 'empresasCadastro.lista.rotulo' })).toBeInTheDocument();
  });

  it('AMS e projetos salva pelo hook e volta para a empresa', async () => {
    renderizar('/admin/empresas/alfa');
    fireEvent.click(
      screen.getByRole('button', { name: 'empresasCadastro.identidade.amsEProjetos' })
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'empresasCadastro.ams.amsEm {"solucao":"COMEX"}' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(detalheHook.salvarSolucoes).toHaveBeenCalledWith([
        { id: 'es1', temAms: false, emProjeto: false, justificativaProjeto: null },
      ])
    );
    await waitFor(() => expect(screen.getByRole('heading', { name: 'ALFA' })).toBeInTheDocument());
  });

  it('a aba Informações abre primeiro e salva pelo hook', async () => {
    renderizar('/admin/empresas/alfa');
    expect(screen.getByRole('tab', { name: /empresasCadastro.abas.informacoes/ })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'empresasCadastro.informacoes.novaOrganizacao' }),
      {
        target: { value: 'alfa sa' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'empresasCadastro.informacoes.adicionar' }));
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() =>
      expect(detalheHook.salvarInformacoes).toHaveBeenCalledWith(
        expect.objectContaining({ organizacoes: ['ALFA SA'] })
      )
    );
  });

  it('aba Bancos de Horas: editar o banco salva pelo hook e volta para a empresa', async () => {
    renderizar('/admin/empresas/alfa');
    fireEvent.click(screen.getByRole('tab', { name: /empresasCadastro.abas.bancos/ }));
    expect(screen.getByRole('article', { name: 'Banco padrão' })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'empresasCadastro.bancos.editarBanco {"nome":"Banco padrão"}',
      })
    );
    fireEvent.change(
      screen.getByLabelText(/empresasCadastro.edicaoBanco.descricao/, { selector: 'input' }),
      {
        target: { value: 'Recebe o resto' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(bancosHook.salvar).toHaveBeenCalledWith({
        bancoId: 'bp',
        parametros: expect.objectContaining({
          descricao: 'Recebe o resto',
          padrao: true,
          escopo: [],
        }),
      })
    );
    await waitFor(() =>
      expect(screen.getByRole('article', { name: 'Banco padrão' })).toBeInTheDocument()
    );
  });

  it('sem Edição nos bancos, a aba só mostra', () => {
    permissoes = ['empresas:edit'];
    renderizar('/admin/empresas/alfa');
    fireEvent.click(screen.getByRole('tab', { name: /empresasCadastro.abas.bancos/ }));
    expect(screen.queryByRole('button', { name: /editarBanco/ })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'empresasCadastro.bancos.novo' })
    ).not.toBeInTheDocument();
  });

  it('baixar anexo usa o download dos anexos da empresa', () => {
    renderizar('/admin/empresas/alfa');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'empresasCadastro.identidade.baixar {"nome":"contrato.pdf"}',
      })
    );
    expect(downloadAnexo).toHaveBeenCalledWith(
      expect.objectContaining({
        storage_path: 'empresas/alfa/contrato.pdf',
        nome_original: 'contrato.pdf',
      })
    );
  });

  it('só visualiza: selo e sem edição', () => {
    permissoes = ['empresas:view'];
    renderizar('/admin/empresas/alfa');
    expect(screen.getByText('empresasCadastro.detalhe.somenteVisualizacao')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'empresasCadastro.identidade.amsEProjetos' })
    ).not.toBeInTheDocument();
  });

  it('carregando, erro e não encontrada', () => {
    Object.assign(detalheHook, { isLoading: true, empresa: null });
    const a = renderizar('/admin/empresas/alfa');
    expect(
      screen.getByRole('status', { name: 'empresasCadastro.detalhe.carregando' })
    ).toBeInTheDocument();
    a.unmount();
    Object.assign(detalheHook, { isLoading: false, error: new Error('x') });
    const b = renderizar('/admin/empresas/alfa');
    expect(screen.getByText('empresasCadastro.detalhe.erro')).toBeInTheDocument();
    b.unmount();
    Object.assign(detalheHook, { error: null, empresa: null });
    renderizar('/admin/empresas/alfa');
    expect(screen.getByText('empresasCadastro.detalhe.naoEncontrada')).toBeInTheDocument();
  });
});
