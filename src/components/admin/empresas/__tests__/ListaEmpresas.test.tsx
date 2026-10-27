import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ListaEmpresas } from '../ListaEmpresas';
import { SEM_FILTRO_EMPRESAS } from '@/utils/empresasTela';
import type { EmpresaLista } from '@/types/empresas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const empresa = (id: string, extra: Partial<EmpresaLista> = {}): EmpresaLista => ({
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
const ALFA = empresa('alfa', {
  solucoes: [
    {
      id: 'a1',
      solucaoId: 's1',
      codigo: 'COMEX',
      nome: 'COMEX',
      temAms: true,
      emProjeto: false,
      justificativaProjeto: null,
    },
    {
      id: 'a2',
      solucaoId: 's2',
      codigo: 'FISCAIS',
      nome: 'FISCAIS',
      temAms: false,
      emProjeto: true,
      justificativaProjeto: 'Implantação',
    },
  ],
  temAms: true,
  emProjeto: true,
  pendencias: ['ramo', 'contrato_fiscal'],
  emailCs: 'cs@sonda.com',
  nomeCs: 'Pessoa CS',
  emailComercial: 'comercial@sonda.com',
});
const props = {
  empresas: [ALFA, empresa('beta', { status: 'inativo' })],
  carregando: false,
  erro: null,
  podeEditar: true,
  filtro: SEM_FILTRO_EMPRESAS,
  onFiltro: vi.fn(),
  onAbrir: vi.fn(),
  onTentarNovamente: vi.fn(),
};
const renderizar = (extra = {}) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <ListaEmpresas {...props} {...extra} />
      </TooltipProvider>
    </MemoryRouter>
  );
const lista = () => within(screen.getByRole('list', { name: 'empresasCadastro.lista.rotulo' }));

describe('ListaEmpresas', () => {
  it('linha com situação, soluções, AMS e responsáveis; a linha abre a empresa', () => {
    const onAbrir = vi.fn();
    renderizar({ onAbrir });
    expect(
      lista().getByRole('img', {
        name: 'empresasCadastro.situacao.pendente {"pendencias":"empresasCadastro.pendencia.ramo, empresasCadastro.pendencia.contrato_fiscal"}',
      })
    ).toBeInTheDocument();
    expect(
      lista().getByRole('img', { name: 'empresasCadastro.situacao.inativa' })
    ).toBeInTheDocument();
    expect(lista().getByText('ALFA LTDA')).toBeInTheDocument();
    expect(lista().getByText('COMEX')).toBeInTheDocument();
    expect(lista().getByText('empresasCadastro.lista.sim')).toBeInTheDocument();
    expect(lista().getByText('Pessoa CS')).toBeInTheDocument();
    // Sem cadastro de usuário para o e-mail, mostra o próprio e-mail
    expect(lista().getByText('comercial@sonda.com')).toBeInTheDocument();
    fireEvent.click(lista().getByText('BETA LTDA'));
    expect(onAbrir).toHaveBeenCalledWith('beta');
  });

  it('copiar o e-mail não abre a empresa', () => {
    const onAbrir = vi.fn();
    renderizar({ onAbrir });
    fireEvent.click(
      lista().getByRole('button', {
        name: 'empresasCadastro.lista.copiarEmail {"nome":"Pessoa CS","email":"cs@sonda.com"}',
      })
    );
    expect(onAbrir).not.toHaveBeenCalled();
  });

  it('a busca e os filtros vão para a tela; sem resultado, oferece limpar', () => {
    const onFiltro = vi.fn();
    renderizar({ onFiltro, empresas: [], filtro: { ...SEM_FILTRO_EMPRESAS, busca: 'zzz' } });
    expect(screen.getByText('empresasCadastro.lista.nenhumaNoFiltro')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: 'empresasCadastro.lista.buscar' }), {
      target: { value: 'alf' },
    });
    expect(onFiltro).toHaveBeenLastCalledWith({ ...SEM_FILTRO_EMPRESAS, busca: 'alf' });
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.limparFiltros' }));
    expect(onFiltro).toHaveBeenLastCalledWith(SEM_FILTRO_EMPRESAS);
  });

  it('o filtro aplicado de fora já mostra os filtros abertos', () => {
    renderizar({ filtro: { ...SEM_FILTRO_EMPRESAS, soPendentes: true } });
    expect(
      screen.getByRole('button', { name: 'ds.filtros.ativos {"quantidade":1}' })
    ).toHaveAttribute('aria-expanded', 'true');
    expect(lista().queryByText('BETA LTDA')).not.toBeInTheDocument();
  });

  it('quem edita tem o atalho para a tela atual; quem só vê, não', async () => {
    const { unmount } = renderizar();
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"ALFA"}' })
    );
    expect(
      screen.getByRole('menuitem', { name: 'empresasCadastro.editarNaTelaAtual' })
    ).toHaveAttribute('href', '/admin/empresas-clientes?editar=alfa');
    unmount();
    renderizar({ podeEditar: false });
    expect(screen.queryByRole('button', { name: /fase3Comum.acoesDe/ })).not.toBeInTheDocument();
  });

  it('erro ao carregar, com tentar novamente', () => {
    const onTentarNovamente = vi.fn();
    renderizar({ erro: new Error('x'), onTentarNovamente });
    expect(screen.getByText('empresasCadastro.lista.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
