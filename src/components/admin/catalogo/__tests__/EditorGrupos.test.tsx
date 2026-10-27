import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EditorGrupos } from '../EditorGrupos';
import type { Catalogo } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const CATALOGO: Catalogo = {
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
    {
      id: 'drawback',
      produtoId: 'ce',
      nome: 'Drawback',
      descricao: null,
      ordem: 2,
      ativo: true,
      ...autoria,
    },
  ],
};
const mapa = (
  id: string,
  grupoAranda: string,
  extra: Partial<MapeamentoGrupo>
): MapeamentoGrupo => ({
  id,
  grupoAranda,
  grupoBook: 'B',
  solucaoId: null,
  produtoId: null,
  moduloId: null,
  classificacao: 'nao_se_aplica',
  ...autoria,
  ...extra,
});
const MAPEAMENTOS = [
  mapa('g1', 'AMS APL - CAMBIO - N2', {
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'cambio',
    classificacao: 'modulo',
  }),
  mapa('g2', 'AMS APL - DRAWBACK - N2', {
    solucaoId: 's1',
    produtoId: 'ce',
    moduloId: 'drawback',
    classificacao: 'modulo',
  }),
  mapa('g3', 'AMS T&M', {}),
];

function renderizar(grupos: string[], onChange = vi.fn()) {
  render(
    <EditorGrupos
      alvo={{ tipo: 'modulo', id: 'cambio' }}
      catalogo={CATALOGO}
      mapeamentos={MAPEAMENTOS}
      inicial={['AMS APL - CAMBIO - N2']}
      grupos={grupos}
      onChange={onChange}
      vazioTexto="Sem grupo"
      ajuda="Ajuda"
    />
  );
  return onChange;
}

describe('EditorGrupos', () => {
  it('lista os grupos e desvincula', () => {
    const onChange = renderizar(['AMS APL - CAMBIO - N2']);
    expect(screen.getByText('AMS APL - CAMBIO - N2')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'produtosModulos.grupos.desvincularGrupo {"grupo":"AMS APL - CAMBIO - N2"}',
      })
    );
    expect(onChange).toHaveBeenCalledWith([]);
    // Sem mudança ainda, sem o aviso de mover horas
    expect(screen.queryByText('produtosModulos.grupos.podeMoverTitulo')).not.toBeInTheDocument();
  });

  it('vincular mostra de onde o grupo sai e só oferece os que não estão na lista', () => {
    const onChange = renderizar(['AMS APL - CAMBIO - N2']);
    fireEvent.click(screen.getByRole('button', { name: /produtosModulos.grupos.vincular/ }));
    const lista = screen.getByRole('list', { name: 'produtosModulos.grupos.lista' });
    expect(within(lista).queryByText('AMS APL - CAMBIO - N2')).not.toBeInTheDocument();
    expect(
      within(lista).getByText(
        /produtosModulos.grupos.emModulo \{"produto":"CE PLUS","modulo":"Drawback"\}/
      )
    ).toBeInTheDocument();
    expect(within(lista).getByText(/produtosModulos.grupos.saiParaCa/)).toBeInTheDocument();
    // Grupo em "não se aplica" não sai de lugar nenhum
    expect(within(lista).getByText('produtosModulos.grupos.semSolucao')).toBeInTheDocument();

    fireEvent.click(within(lista).getByText('AMS T&M'));
    expect(onChange).toHaveBeenCalledWith(['AMS APL - CAMBIO - N2', 'AMS T&M']);
  });

  it('a busca filtra os grupos oferecidos', () => {
    renderizar([]);
    fireEvent.click(screen.getByRole('button', { name: /produtosModulos.grupos.vincular/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'produtosModulos.grupos.buscar' }), {
      target: { value: 'drawback' },
    });
    const lista = screen.getByRole('list', { name: 'produtosModulos.grupos.lista' });
    expect(within(lista).getAllByRole('button')).toHaveLength(1);
  });

  it('lista diferente da inicial avisa que pode mover horas; vazia mostra o aviso de sem grupo', () => {
    renderizar([]);
    expect(screen.getByText('produtosModulos.grupos.podeMoverTitulo')).toBeInTheDocument();
    expect(screen.getByText('Sem grupo')).toBeInTheDocument();
  });
});
