import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { EdicaoModulo, EdicaoProduto, EdicaoSolucao } from '../Edicoes';
import type { Catalogo, UsoEmBanco } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
vi.mock('@/hooks/useUltimaAlteracao', () => ({ useUltimaAlteracao: () => 'Última alteração' }));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
// O Radix Select usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const CATALOGO: Catalogo = {
  solucoes: [
    { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    { id: 's2', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: true, ...autoria },
  ],
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
};
const MAPEAMENTOS: MapeamentoGrupo[] = [
  {
    id: 'g1',
    grupoAranda: 'AMS APL - CAMBIO - N2',
    grupoBook: 'B',
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
    vinculos: [{ solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' }],
    ...autoria,
  },
];
const USOS: UsoEmBanco[] = [
  { produtoId: 'ce', moduloId: 'cambio', bancoId: 'b1', banco: 'Banco COMEX', empresa: 'ALFA' },
];

const comuns = {
  catalogo: CATALOGO,
  mapeamentos: MAPEAMENTOS,
  usos: USOS,
  podeEditarGrupos: true,
  onFechar: vi.fn(),
};

function renderizar(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('EdicaoModulo', () => {
  it('novo: exige nome único no produto e manda o módulo, sem grupos', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(<EdicaoModulo {...comuns} modulo={null} produtoId="ce" onSalvar={onSalvar} />);
    const criar = screen.getByRole('button', { name: 'produtosModulos.edicao.modulo.criar' });
    expect(criar).toBeDisabled();
    expect(screen.queryByText('produtosModulos.edicao.modulo.grupos')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/produtosModulos.edicao.modulo.nome/), {
      target: { value: 'câmbio' },
    });
    expect(
      screen.getByText(
        'produtosModulos.edicao.modulo.nomeRepetido {"nome":"câmbio","produto":"CE PLUS"}'
      )
    ).toBeInTheDocument();
    expect(criar).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/produtosModulos.edicao.modulo.nome/), {
      target: { value: ' Exportação ' },
    });
    fireEvent.click(criar);
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        { produtoId: 'ce', nome: 'Exportação', descricao: null, ativo: true },
        { vincular: [], desvincular: [] }
      )
    );
  });

  it('editar: desvincular grupo vai junto ao salvar', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(
      <EdicaoModulo {...comuns} modulo={CATALOGO.modulos[0]} produtoId="ce" onSalvar={onSalvar} />
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'produtosModulos.grupos.desvincularGrupo {"grupo":"AMS APL - CAMBIO - N2"}',
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        { id: 'cambio', produtoId: 'ce', nome: 'Câmbio', descricao: null, ativo: true },
        { vincular: [], desvincular: ['g1'] }
      )
    );
  });

  it('inativar módulo que um banco ativo usa pede confirmação', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(
      <EdicaoModulo {...comuns} modulo={CATALOGO.modulos[0]} produtoId="ce" onSalvar={onSalvar} />
    );
    fireEvent.click(screen.getByRole('switch', { name: 'produtosModulos.edicao.modulo.ativo' }));
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.salvar' }));
    expect(onSalvar).not.toHaveBeenCalled();
    expect(
      screen.getByRole('alertdialog', {
        name: 'produtosModulos.edicao.inativarTitulo {"nome":"Câmbio"}',
      })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.inativar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ ativo: false }), {
        vincular: [],
        desvincular: [],
      })
    );
  });

  it('sem Edição no De-para, os grupos ficam só para leitura', () => {
    renderizar(
      <EdicaoModulo
        {...comuns}
        podeEditarGrupos={false}
        modulo={CATALOGO.modulos[0]}
        produtoId="ce"
        onSalvar={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /desvincularGrupo/ })).not.toBeInTheDocument();
    expect(screen.getByText('produtosModulos.grupos.soLeitura')).toBeInTheDocument();
  });
});

describe('EdicaoProduto', () => {
  it('novo: nome único na solução; solução escolhida vai no produto', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(<EdicaoProduto {...comuns} produto={null} solucaoId="s1" onSalvar={onSalvar} />);
    fireEvent.change(screen.getByLabelText(/produtosModulos.edicao.produto.nome/), {
      target: { value: 'ce plus' },
    });
    expect(
      screen.getByText(
        'produtosModulos.edicao.produto.nomeRepetido {"nome":"ce plus","solucao":"COMEX"}'
      )
    ).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(/produtosModulos.edicao.produto.solucao/));
    await userEvent.click(screen.getByRole('option', { name: 'FISCAIS' }));
    fireEvent.click(screen.getByRole('button', { name: 'produtosModulos.edicao.produto.criar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        { solucaoId: 's2', nome: 'ce plus', descricao: null, ativo: true },
        { vincular: [], desvincular: [] }
      )
    );
  });
});

describe('EdicaoSolucao', () => {
  it('nova: código em maiúsculas, sem espaço e único; nome único', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(<EdicaoSolucao {...comuns} solucao={null} onSalvar={onSalvar} />);
    fireEvent.change(screen.getByLabelText(/produtosModulos.edicao.solucao.codigo/), {
      target: { value: 'co mex' },
    });
    expect(screen.getByLabelText(/produtosModulos.edicao.solucao.codigo/)).toHaveValue('COMEX');
    expect(screen.getByText('produtosModulos.edicao.solucao.codigoRepetido')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/produtosModulos.edicao.solucao.codigo/), {
      target: { value: 'financeiras' },
    });
    fireEvent.change(screen.getByLabelText(/produtosModulos.edicao.solucao.nome/), {
      target: { value: 'financeiras' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'produtosModulos.edicao.solucao.criar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith(
        { codigo: 'FINANCEIRAS', nome: 'FINANCEIRAS', ativo: true },
        { vincular: [], desvincular: [] }
      )
    );
  });

  it('editar: o código não muda', () => {
    renderizar(<EdicaoSolucao {...comuns} solucao={CATALOGO.solucoes[0]} onSalvar={vi.fn()} />);
    expect(screen.getByLabelText(/produtosModulos.edicao.solucao.codigo/)).toBeDisabled();
    expect(screen.getByText('produtosModulos.edicao.solucao.codigoNaoMuda')).toBeInTheDocument();
  });
});
