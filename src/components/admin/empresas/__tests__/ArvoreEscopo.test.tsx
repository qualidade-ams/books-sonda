import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ArvoreEscopo } from '../ArvoreEscopo';
import type { Catalogo } from '@/types/catalogo';
import type { SolucaoDaEmpresa } from '@/types/empresas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

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
  solucoes: [
    { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    { id: 's2', codigo: 'FISCAIS', nome: 'FISCAIS', ordem: 2, ativo: true, ...autoria },
    { id: 's3', codigo: 'FINANCEIRAS', nome: 'FINANCEIRAS', ordem: 3, ativo: true, ...autoria },
  ],
  produtos: [
    produto('ce', 's1', 'CE PLUS'),
    produto('fci', 's1', 'FCI'),
    produto('prov', 's1', 'A classificar', { aClassificar: true }),
    produto('comply', 's2', 'COMPLY'),
  ],
  modulos: [modulo('cambio', 'ce', 'Câmbio'), modulo('drawback', 'ce', 'Drawback')],
};
const solucao = (codigo: string, solucaoId: string, temAms: boolean): SolucaoDaEmpresa => ({
  id: `es-${codigo}`,
  solucaoId,
  codigo,
  nome: codigo,
  temAms,
  emProjeto: false,
  justificativaProjeto: null,
});
const SOLUCOES = [solucao('COMEX', 's1', true), solucao('FISCAIS', 's2', false)];

const renderizar = (props: Partial<React.ComponentProps<typeof ArvoreEscopo>> = {}) =>
  render(
    <ArvoreEscopo
      catalogo={CATALOGO}
      solucoesEmpresa={SOLUCOES}
      cobertos={{}}
      selecao={{}}
      onChange={vi.fn()}
      {...props}
    />
  );
const caixa = (nome: string) => screen.getByRole('checkbox', { name: nome });

describe('ArvoreEscopo', () => {
  it('só soluções contratadas; sem AMS, bloqueada; "A classificar" não entra', () => {
    renderizar();
    expect(screen.queryByText('FINANCEIRAS')).not.toBeInTheDocument();
    expect(screen.getByText(/empresasCadastro.edicaoBanco.semAms/)).toBeInTheDocument();
    expect(caixa('empresasCadastro.edicaoBanco.inteiro {"produto":"COMPLY"}')).toBeDisabled();
    expect(screen.queryByText('A classificar')).not.toBeInTheDocument();
  });

  it('marcar o produto inteiro; abrir e marcar só um módulo', () => {
    const onChange = vi.fn();
    const { rerender } = renderizar({ onChange });
    fireEvent.click(caixa('empresasCadastro.edicaoBanco.inteiro {"produto":"FCI"}'));
    expect(onChange).toHaveBeenLastCalledWith({ fci: 'todos' });

    fireEvent.click(screen.getByRole('button', { name: /^CE PLUS/ }));
    fireEvent.click(caixa('Câmbio'));
    expect(onChange).toHaveBeenLastCalledWith({ ce: ['cambio'] });

    rerender(
      <ArvoreEscopo
        catalogo={CATALOGO}
        solucoesEmpresa={SOLUCOES}
        cobertos={{}}
        selecao={{ ce: ['cambio'] }}
        onChange={onChange}
      />
    );
    expect(
      screen.getByText('empresasCadastro.edicaoBanco.modulosDe {"n":1,"total":2}')
    ).toBeInTheDocument();
    expect(
      (caixa('empresasCadastro.edicaoBanco.inteiro {"produto":"CE PLUS"}') as HTMLInputElement)
        .indeterminate
    ).toBe(true);
  });

  it('o que outro banco cobre fica bloqueado, com o nome dele', () => {
    renderizar({ cobertos: { 'fci|*': 'BANCO A', 'ce|drawback': 'BANCO B' } });
    expect(caixa('empresasCadastro.edicaoBanco.inteiro {"produto":"FCI"}')).toBeDisabled();
    expect(screen.getByText(/emOutro {"banco":"BANCO A"}/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^CE PLUS/ }));
    expect(caixa('Drawback')).toBeDisabled();
    // Com um módulo em outro banco, o produto inteiro não cabe aqui
    expect(caixa('empresasCadastro.edicaoBanco.inteiro {"produto":"CE PLUS"}')).toBeDisabled();
  });
});
