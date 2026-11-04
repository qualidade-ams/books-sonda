/**
 * Card "Requerimentos Descontados" da página de Consumo do book.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, opcoes?: Record<string, unknown>) =>
      opcoes?.count !== undefined ? `${chave}:${opcoes.count}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

import BookRequerimentosDescontados from '../BookRequerimentosDescontados';
import type { RequerimentoDescontadoData } from '@/types/books';

const REQ: RequerimentoDescontadoData = {
  id: 'req-1',
  numero_chamado: 'RF-9440912',
  cliente: 'emp-1',
  modulo: 'Comex',
  tipo_cobranca: 'Banco de Horas',
  total_horas: '17:30:00',
  tickets: 5,
  periodo_cobranca: '10/2026',
};

const linhaDe = (chamado: string) => screen.getByText(chamado).closest<HTMLElement>('div.rounded')!;

describe('BookRequerimentosDescontados', () => {
  it('contrato de tickets: mostra a quantidade de tickets, não as horas', () => {
    render(<BookRequerimentosDescontados requerimentos={[REQ]} emTickets />);

    const linha = linhaDe('RF-9440912');
    expect(within(linha).getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('17:30:00')).not.toBeInTheDocument();
  });

  it('contrato de horas: mostra as horas do requerimento', () => {
    render(<BookRequerimentosDescontados requerimentos={[REQ]} emTickets={false} />);

    expect(within(linhaDe('RF-9440912')).getByText('17:30:00')).toBeInTheDocument();
  });

  it('mostra o módulo, o ticket externo e o total de requerimentos', () => {
    render(
      <BookRequerimentosDescontados
        requerimentos={[{ ...REQ, ticket_externo: 'EXT-1' }]}
        emTickets={false}
      />
    );

    expect(screen.getByText('Comex')).toBeInTheDocument();
    expect(screen.getByText('EXT-1')).toBeInTheDocument();
    expect(screen.getByText('books.bookContent.totalRequirements')).toBeInTheDocument();
  });

  it('lista no máximo 6 e avisa quantos ficaram de fora', () => {
    const muitos = Array.from({ length: 8 }, (_, i) => ({
      ...REQ,
      id: `r${i}`,
      numero_chamado: `RF-${i}`,
    }));

    render(<BookRequerimentosDescontados requerimentos={muitos} emTickets={false} />);

    expect(screen.queryByText('RF-6')).not.toBeInTheDocument();
    expect(screen.getByText('books.bookContent.additionalRequirements:2')).toBeInTheDocument();
  });

  it('sem requerimentos mostra o aviso de lista vazia', () => {
    render(<BookRequerimentosDescontados requerimentos={[]} emTickets={false} />);

    expect(screen.getByText('books.bookContent.noDiscountedRequirements')).toBeInTheDocument();
    expect(screen.queryByText('books.bookContent.totalRequirements')).not.toBeInTheDocument();
  });
});
