import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArvoreCatalogo } from '../ArvoreCatalogo';
import type { Catalogo } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const produto = (id: string, solucaoId: string, nome: string, ordem: number, extra = {}) => ({
  id,
  solucaoId,
  codigo: id.toUpperCase(),
  nome,
  descricao: null,
  ordem,
  ativo: true,
  aClassificar: false,
  ...autoria,
  ...extra,
});
const modulo = (id: string, produtoId: string, ativo = true) => ({
  id,
  produtoId,
  nome: id,
  descricao: null,
  ordem: 1,
  ativo,
  ...autoria,
});

const CATALOGO: Catalogo = {
  solucoes: [
    { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    { id: 's2', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: false, ...autoria },
  ],
  produtos: [
    produto('fci', 's1', 'FCI', 2),
    produto('ce', 's1', 'CE PLUS', 1),
    produto('prov', 's1', 'A classificar', 3, { aClassificar: true }),
    produto('comply', 's2', 'COMPLY', 1),
  ],
  modulos: [
    modulo('cambio', 'ce'),
    modulo('drawback', 'ce'),
    modulo('velho', 'ce', false),
    modulo('solto', 'prov'),
  ],
};
const MAPEAMENTOS = [
  {
    id: 'g1',
    grupoAranda: 'G1',
    grupoBook: 'B',
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
    ...autoria,
  },
] as MapeamentoGrupo[];

const comuns = {
  catalogo: CATALOGO,
  mapeamentos: MAPEAMENTOS,
  podeEditar: true,
  carregando: false,
  onSelecionar: vi.fn(),
  onReordenar: vi.fn(),
};

describe('ArvoreCatalogo', () => {
  it('carregando, mostra o esqueleto', () => {
    render(<ArvoreCatalogo {...comuns} carregando selecao={{ tipo: 'solucao', id: 's1' }} />);
    expect(
      screen.getByRole('status', { name: 'produtosModulos.arvore.carregando' })
    ).toBeInTheDocument();
  });

  it('cartão da solução com produtos, módulos ativos, sem grupo e a classificar', () => {
    render(<ArvoreCatalogo {...comuns} selecao={{ tipo: 'solucao', id: 's2' }} />);
    const comex = screen.getByRole('button', { name: /^COMEX/ });
    expect(comex).toHaveTextContent('produtosModulos.arvore.produtos.varios {"n":3}');
    expect(comex).toHaveTextContent('produtosModulos.arvore.modulos.varios {"n":3}');
    expect(comex).toHaveTextContent('produtosModulos.arvore.semGrupo {"n":2}');
    expect(comex).toHaveTextContent('produtosModulos.arvore.aClassificar {"n":1}');
    expect(screen.getByRole('button', { name: /^FISCAIS/ })).toHaveTextContent(
      'fase3Comum.inativa'
    );
  });

  it('abre a solução da seleção, com os produtos na ordem e o aviso de módulo sem grupo', () => {
    render(<ArvoreCatalogo {...comuns} selecao={{ tipo: 'produto', id: 'ce' }} />);
    const lista = screen.getByRole('list', {
      name: 'produtosModulos.arvore.produtosDe {"solucao":"COMEX"}',
    });
    const nomes = within(lista)
      .getAllByRole('button', { name: /^(CE PLUS|FCI|A classificar)/ })
      .map((b) => b.textContent);
    expect(nomes[0]).toMatch(/^CE PLUS/);
    expect(nomes[1]).toMatch(/^FCI/);
    const ce = within(lista).getByRole('button', { name: /^CE PLUS/ });
    expect(ce).toHaveAttribute('aria-current', 'true');
    expect(ce).toHaveTextContent('produtosModulos.arvore.modulos.varios {"n":2}');
    expect(
      within(ce).getByLabelText('produtosModulos.arvore.modulosSemGrupo.um {"n":1}')
    ).toBeInTheDocument();
    expect(within(lista).getByRole('button', { name: /^FCI/ })).toHaveTextContent(
      'produtosModulos.arvore.semModulos'
    );
    expect(screen.queryByRole('list', { name: /FISCAIS/ })).not.toBeInTheDocument();
  });

  it('clicar escolhe a solução (e abre) ou o produto', () => {
    const onSelecionar = vi.fn();
    render(
      <ArvoreCatalogo
        {...comuns}
        onSelecionar={onSelecionar}
        selecao={{ tipo: 'produto', id: 'ce' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^FISCAIS/ }));
    expect(onSelecionar).toHaveBeenCalledWith({ tipo: 'solucao', id: 's2' });
    expect(
      screen.getByRole('list', { name: 'produtosModulos.arvore.produtosDe {"solucao":"FISCAIS"}' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^FCI/ }));
    expect(onSelecionar).toHaveBeenCalledWith({ tipo: 'produto', id: 'fci' });
  });

  it('a alça de reordenar só aparece para quem edita', () => {
    const { rerender } = render(
      <ArvoreCatalogo {...comuns} selecao={{ tipo: 'produto', id: 'ce' }} />
    );
    expect(
      screen.getByRole('button', { name: 'fase3Comum.reordenar {"nome":"CE PLUS"}' })
    ).toBeInTheDocument();
    rerender(
      <ArvoreCatalogo {...comuns} podeEditar={false} selecao={{ tipo: 'produto', id: 'ce' }} />
    );
    expect(screen.queryByRole('button', { name: /fase3Comum.reordenar/ })).not.toBeInTheDocument();
  });
});
