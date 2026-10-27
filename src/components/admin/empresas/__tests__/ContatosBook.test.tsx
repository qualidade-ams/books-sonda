import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaContatos } from '../AbaContatos';
import { AbaBook } from '../AbaBook';
import type { BookEmpresa, Contato } from '@/types/empresas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

const CONTATOS: Contato[] = [
  {
    id: 'c1',
    nome: 'Pessoa A',
    email: 'a@cliente.com',
    finalidade: 'Book',
    principal: true,
    ativo: true,
  },
  {
    id: 'c2',
    nome: 'Pessoa B',
    email: 'b@cliente.com',
    finalidade: 'Saldo Parcial',
    principal: false,
    ativo: false,
  },
];
const BOOK: BookEmpresa = {
  tipoBook: 'qualidade',
  templatePadrao: 't-123',
  linkSharepoint: 'https://sharepoint.com/alfa',
  bookPersonalizado: false,
  bookAnexo: true,
  consolidadora: { id: 'e2', nomeAbreviado: 'BETA' },
  metaSlaPercentual: 95,
  quantidadeMinimaChamadosSla: null,
};
const renderizar = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <TooltipProvider>{ui}</TooltipProvider>
    </MemoryRouter>
  );

describe('AbaContatos', () => {
  it('lista os contatos, com o principal e a situação; o atalho só para quem edita', () => {
    const { unmount } = renderizar(<AbaContatos empresaId="e1" contatos={CONTATOS} podeEditar />);
    const lista = within(screen.getByRole('list', { name: 'empresasCadastro.contatos.titulo' }));
    expect(lista.getByLabelText('empresasCadastro.contatos.principal')).toBeInTheDocument();
    expect(lista.getByText('b@cliente.com')).toBeInTheDocument();
    expect(lista.getByText('fase3Comum.inativo')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'empresasCadastro.editarNaTelaAtual' })
    ).toHaveAttribute('href', '/admin/empresas-clientes?editar=e1');
    unmount();
    renderizar(<AbaContatos empresaId="e1" contatos={[]} podeEditar={false} />);
    expect(screen.getByText('empresasCadastro.contatos.nenhum')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('AbaBook', () => {
  it('Book de Qualidade: template pelo nome, SharePoint, opções e SLA', () => {
    renderizar(
      <AbaBook
        empresaId="e1"
        book={BOOK}
        temAms
        nomeTemplate="Template Samarco"
        podeEditar={false}
      />
    );
    expect(screen.getByText('empresasCadastro.book.tipo.qualidade')).toBeInTheDocument();
    expect(screen.getByText('Template Samarco')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://sharepoint.com/alfa' })).toHaveAttribute(
      'href',
      'https://sharepoint.com/alfa'
    );
    expect(screen.getByText('BETA')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('sem AMS, não há Book; sem Book, nem template nem opções', () => {
    const { unmount } = renderizar(
      <AbaBook empresaId="e1" book={BOOK} temAms={false} podeEditar={false} />
    );
    expect(screen.getByText('empresasCadastro.book.semAms')).toBeInTheDocument();
    expect(screen.queryByText('empresasCadastro.book.templatePadrao')).not.toBeInTheDocument();
    unmount();
    renderizar(
      <AbaBook empresaId="e1" book={{ ...BOOK, tipoBook: 'nao_tem_book' }} temAms podeEditar />
    );
    expect(screen.queryByText('empresasCadastro.book.linkSharepoint')).not.toBeInTheDocument();
    expect(screen.queryByText('empresasCadastro.book.consolidadora')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'empresasCadastro.editarNaTelaAtual' })
    ).toHaveAttribute('href', '/admin/empresas-clientes?editar=e1');
  });
});
