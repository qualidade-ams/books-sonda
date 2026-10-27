import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaModulosRequerimento } from '../AbaModulosRequerimento';
import type { Catalogo, ModuloRequerimento } from '@/types/catalogo';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
// O Radix Select usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const produto = (id: string, solucaoId: string, nome: string, extra = {}) => ({
  id,
  solucaoId,
  codigo: id,
  nome,
  descricao: null,
  ordem: 1,
  ativo: true,
  aClassificar: false,
  ...autoria,
  ...extra,
});
const CATALOGO: Catalogo = {
  solucoes: [
    { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    { id: 's2', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: true, ...autoria },
  ],
  produtos: [
    produto('ce', 's1', 'CE PLUS'),
    produto('prov', 's1', 'A classificar', { aClassificar: true }),
    produto('velho', 's1', 'LEGADO', { ativo: false }),
    produto('comply', 's2', 'COMPLY'),
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
const LINHAS: ModuloRequerimento[] = [
  { id: 'r1', moduloRequerimento: 'Comex', produtoId: 'ce', moduloId: null },
  { id: 'r2', moduloRequerimento: 'Comply', produtoId: 'comply', moduloId: null },
];
const comuns = {
  catalogo: CATALOGO,
  linhas: LINHAS,
  carregando: false,
  erro: null,
  onTentarNovamente: vi.fn(),
};
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

describe('AbaModulosRequerimento', () => {
  it('só visualiza: solução › produto › módulo', () => {
    renderizar(<AbaModulosRequerimento {...comuns} podeEditar={false} onSalvar={vi.fn()} />);
    expect(screen.getByText('Comex')).toBeInTheDocument();
    expect(screen.getByText('CE PLUS')).toBeInTheDocument();
    expect(screen.getAllByText('› produtosModulos.requerimentos.todosModulos')).toHaveLength(2);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('produto por solução, sem "A classificar" e inativos; trocar o produto volta para todos os módulos', async () => {
    const onSalvar = vi.fn(async () => undefined);
    renderizar(
      <AbaModulosRequerimento
        {...comuns}
        linhas={[{ ...LINHAS[0], moduloId: 'cambio' }]}
        podeEditar
        onSalvar={onSalvar}
      />
    );
    expect(
      screen.getByRole('combobox', {
        name: 'produtosModulos.requerimentos.moduloDe {"modulo":"Comex"}',
      })
    ).toHaveTextContent('Câmbio');
    await userEvent.click(
      screen.getByRole('combobox', {
        name: 'produtosModulos.requerimentos.produtoDe {"modulo":"Comex"}',
      })
    );
    expect(screen.getByRole('group', { name: 'FISCAIS' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'A classificar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'LEGADO' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'COMPLY' }));
    expect(
      screen.getByRole('combobox', {
        name: 'produtosModulos.requerimentos.moduloDe {"modulo":"Comex"}',
      })
    ).toBeDisabled();

    expect(screen.getByText('fase3Comum.valeMesesAbertos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.salvar' }));
    await waitFor(() =>
      expect(onSalvar).toHaveBeenCalledWith([{ id: 'r1', produtoId: 'comply', moduloId: null }])
    );
  });

  it('descartar volta ao que estava', async () => {
    renderizar(<AbaModulosRequerimento {...comuns} podeEditar onSalvar={vi.fn()} />);
    await userEvent.click(
      screen.getByRole('combobox', {
        name: 'produtosModulos.requerimentos.moduloDe {"modulo":"Comex"}',
      })
    );
    await userEvent.click(screen.getByRole('option', { name: 'Câmbio' }));
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.descartar' }));
    expect(screen.queryByText('fase3Comum.valeMesesAbertos')).not.toBeInTheDocument();
    expect(
      screen.getByRole('combobox', {
        name: 'produtosModulos.requerimentos.moduloDe {"modulo":"Comex"}',
      })
    ).toHaveTextContent('produtosModulos.requerimentos.todosModulos');
  });

  it('erro ao carregar, com tentar novamente', () => {
    const onTentarNovamente = vi.fn();
    renderizar(
      <AbaModulosRequerimento
        {...comuns}
        erro={new Error('x')}
        podeEditar
        onSalvar={vi.fn()}
        onTentarNovamente={onTentarNovamente}
      />
    );
    expect(screen.getByText('produtosModulos.requerimentos.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
