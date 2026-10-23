import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MoverModulo, PainelProduto, PainelSolucao } from '../Paineis';
import type { Catalogo, UsoEmBanco } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
// O Radix (Select e menu) usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const produto = (id: string, nome: string, extra = {}) => ({
  id,
  solucaoId: 's1',
  codigo: id.toUpperCase(),
  nome,
  descricao: null,
  ordem: 1,
  ativo: true,
  aClassificar: false,
  ...autoria,
  ...extra,
});
const modulo = (id: string, produtoId: string, nome: string, ativo = true) => ({
  id,
  produtoId,
  nome,
  descricao: null,
  ordem: 1,
  ativo,
  ...autoria,
});
const grupo = (
  id: string,
  nome: string,
  destino: Partial<MapeamentoGrupo>,
  classificacao: string
) =>
  ({
    id,
    grupoAranda: nome,
    grupoBook: 'B',
    solucaoId: 's1',
    produtoId: null,
    moduloId: null,
    classificacao,
    ...autoria,
    ...destino,
  }) as MapeamentoGrupo;

const CATALOGO: Catalogo = {
  solucoes: [{ id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria }],
  produtos: [
    produto('ce', 'CE PLUS'),
    produto('fci', 'FCI'),
    produto('velho', 'LEGADO', { ativo: false }),
    produto('prov', 'A classificar', { aClassificar: true }),
  ],
  modulos: [
    modulo('cambio', 'ce', 'Câmbio'),
    modulo('drawback', 'ce', 'Drawback'),
    modulo('antigo', 'ce', 'Antigo', false),
    modulo('solto', 'prov', 'Solto'),
  ],
};
const MAPEAMENTOS = [
  grupo('g1', 'AMS APL - CAMBIO - N2', { produtoId: 'ce', moduloId: 'cambio' }, 'modulo'),
  grupo('g2', 'AMS APL - CE - N2', { produtoId: 'ce' }, 'produto'),
  grupo('g3', 'AMS DBA', {}, 'solucao'),
];
const USOS: UsoEmBanco[] = [
  { produtoId: 'ce', moduloId: null, bancoId: 'b1', banco: 'Banco COMEX', empresa: 'ALFA' },
];
const comuns = { catalogo: CATALOGO, mapeamentos: MAPEAMENTOS, usos: USOS };

const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('PainelSolucao', () => {
  const props = {
    ...comuns,
    solucao: CATALOGO.solucoes[0],
    podeEditar: true,
    onAbrirProduto: vi.fn(),
    onEditarSolucao: vi.fn(),
    onEditarProduto: vi.fn(),
    onAlterarStatusProduto: vi.fn(),
  };

  it('lista os produtos da solução, com módulos, grupos e bancos; a linha abre o produto', () => {
    const onAbrirProduto = vi.fn();
    renderizar(<PainelSolucao {...props} onAbrirProduto={onAbrirProduto} />);
    const lista = screen.getByRole('list', {
      name: 'produtosModulos.arvore.produtosDe {"solucao":"COMEX"}',
    });
    expect(within(lista).getByText('AMS APL - CE - N2')).toBeInTheDocument();
    expect(within(lista).getByText('fase3Comum.bancos.um {"n":1}')).toBeInTheDocument();
    expect(within(lista).getAllByText('produtosModulos.solucao.semModulos')).toHaveLength(2);
    fireEvent.click(within(lista).getByText('FCI'));
    expect(onAbrirProduto).toHaveBeenCalledWith('fci');
  });

  it('mostra os grupos de serviço e, para quem edita, editar e novo produto', () => {
    const onEditarProduto = vi.fn();
    renderizar(<PainelSolucao {...props} onEditarProduto={onEditarProduto} />);
    expect(screen.getByText('AMS DBA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'produtosModulos.novoProduto' }));
    expect(onEditarProduto).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole('button', { name: 'produtosModulos.solucao.editar' })
    ).toBeInTheDocument();
  });

  it('só visualiza: sem botões de edição', () => {
    renderizar(<PainelSolucao {...props} podeEditar={false} />);
    expect(
      screen.queryByRole('button', { name: 'produtosModulos.novoProduto' })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fase3Comum.acoesDe/ })).not.toBeInTheDocument();
  });
});

describe('PainelProduto', () => {
  const props = {
    ...comuns,
    produto: CATALOGO.produtos[0],
    podeEditar: true,
    soSemGrupo: false,
    onSoSemGrupo: vi.fn(),
    onEditarProduto: vi.fn(),
    onEditarModulo: vi.fn(),
    onAlterarStatus: vi.fn(),
    onMover: vi.fn(),
  };
  const modulosNaTela = () =>
    within(
      screen.getByRole('list', { name: 'produtosModulos.produto.modulosDe {"produto":"CE PLUS"}' })
    );

  it('mostra os módulos ativos; a linha abre a edição', () => {
    const onEditarModulo = vi.fn();
    renderizar(<PainelProduto {...props} onEditarModulo={onEditarModulo} />);
    expect(modulosNaTela().getByText('Câmbio')).toBeInTheDocument();
    expect(modulosNaTela().queryByText('Antigo')).not.toBeInTheDocument();
    fireEvent.click(modulosNaTela().getByText('Drawback'));
    expect(onEditarModulo).toHaveBeenCalledWith(CATALOGO.modulos[1]);
  });

  it('busca pelo nome do grupo e filtra os sem grupo', () => {
    const { rerender } = renderizar(<PainelProduto {...props} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'produtosModulos.produto.buscar' }), {
      target: { value: 'cambio - n2' },
    });
    expect(modulosNaTela().getByText('Câmbio')).toBeInTheDocument();
    expect(modulosNaTela().queryByText('Drawback')).not.toBeInTheDocument();
    rerender(
      <TooltipProvider>
        <PainelProduto {...props} soSemGrupo />
      </TooltipProvider>
    );
    fireEvent.change(screen.getByRole('searchbox', { name: 'produtosModulos.produto.buscar' }), {
      target: { value: '' },
    });
    expect(modulosNaTela().getByText('Drawback')).toBeInTheDocument();
    expect(modulosNaTela().queryByText('Câmbio')).not.toBeInTheDocument();
  });

  it('produto sem módulos explica e leva aos grupos do produto', () => {
    const onEditarProduto = vi.fn();
    renderizar(
      <PainelProduto {...props} produto={CATALOGO.produtos[1]} onEditarProduto={onEditarProduto} />
    );
    expect(screen.getByText('produtosModulos.produto.semModulosTitulo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'produtosModulos.produto.verGrupos' }));
    expect(onEditarProduto).toHaveBeenCalled();
  });

  it('"A classificar": avisa, não cria módulo e oferece mover', async () => {
    const onMover = vi.fn();
    renderizar(<PainelProduto {...props} produto={CATALOGO.produtos[3]} onMover={onMover} />);
    expect(screen.getByText('produtosModulos.produto.aClassificar')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'produtosModulos.novoModulo' })
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"Solto"}' })
    );
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'produtosModulos.produto.moverPara' })
    );
    expect(onMover).toHaveBeenCalledWith(CATALOGO.modulos[3]);
  });
});

describe('MoverModulo', () => {
  it('oferece só produtos ativos da mesma solução e confirma o escolhido', async () => {
    const onConfirmar = vi.fn();
    renderizar(
      <MoverModulo
        catalogo={CATALOGO}
        modulo={CATALOGO.modulos[3]}
        onFechar={vi.fn()}
        onConfirmar={onConfirmar}
      />
    );
    const mover = screen.getByRole('button', { name: 'produtosModulos.mover.confirmar' });
    expect(mover).toBeDisabled();
    await userEvent.click(screen.getByRole('combobox', { name: 'produtosModulos.mover.destino' }));
    expect(screen.queryByRole('option', { name: 'LEGADO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'A classificar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'FCI' }));
    await userEvent.click(mover);
    expect(onConfirmar).toHaveBeenCalledWith('fci');
  });

  it('sem produto que receba, avisa', () => {
    const soProvisorio = { ...CATALOGO, produtos: [CATALOGO.produtos[3]] };
    renderizar(
      <MoverModulo
        catalogo={soProvisorio}
        modulo={CATALOGO.modulos[3]}
        onFechar={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(screen.getByText('produtosModulos.mover.nenhumDestino')).toBeInTheDocument();
  });
});
