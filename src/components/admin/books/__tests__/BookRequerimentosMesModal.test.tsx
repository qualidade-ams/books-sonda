/**
 * Modal "Requerimentos de <mês>" da página de Consumo do book (clique num mês do gráfico).
 */

import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, opcoes?: Record<string, unknown>) =>
      opcoes?.month !== undefined ? `${chave}:${opcoes.month}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

import BookRequerimentosMesModal from '../BookRequerimentosMesModal';
import type { RequerimentoDescontadoData } from '@/types/books';

const REQ_A: RequerimentoDescontadoData = {
  id: 'req-1',
  numero_chamado: 'RF-9440912',
  cliente: 'emp-1',
  modulo: 'Comex',
  tipo_cobranca: 'Banco de Horas',
  horas_funcional: '9.50',
  horas_tecnica: '8.00',
  total_horas: '17.5',
  tickets: 5,
  periodo_cobranca: '10/2026',
};

const REQ_B: RequerimentoDescontadoData = {
  ...REQ_A,
  id: 'req-2',
  numero_chamado: 'RF-9440913',
  horas_funcional: '1.00',
  horas_tecnica: '1.50',
  total_horas: '2.5',
  tickets: 2,
};

const renderizar = (props: Partial<Parameters<typeof BookRequerimentosMesModal>[0]> = {}) =>
  render(
    <BookRequerimentosMesModal
      aberto
      onOpenChange={() => undefined}
      mes="OUT"
      carregando={false}
      requerimentos={[REQ_A, REQ_B]}
      emTickets={false}
      {...props}
    />
  );

const cartaoDe = (chamado: string) =>
  screen.getByText(chamado).closest<HTMLElement>('div.rounded-lg')!;

describe('BookRequerimentosMesModal', () => {
  it('mostra o título com o mês', () => {
    renderizar();

    expect(screen.getByText('books.bookContent.requirementsOfMonth:OUT')).toBeInTheDocument();
  });

  describe('contrato de tickets', () => {
    it('mostra a quantidade de tickets de cada requerimento, não as horas', () => {
      renderizar({ emTickets: true });

      const cartao = cartaoDe('RF-9440912');
      expect(
        within(cartao).getByText('books.bookContent.requirementsTicketsColumn')
      ).toBeInTheDocument();
      expect(within(cartao).getByText('5')).toBeInTheDocument();
      expect(within(cartao).queryByText('books.bookContent.functionalH')).not.toBeInTheDocument();
      expect(within(cartao).queryByText('17.5')).not.toBeInTheDocument();
    });

    it('no rodapé soma os tickets, sem total de horas', () => {
      renderizar({ emTickets: true });

      const total = screen.getByText('books.bookContent.requirementsTicketsTotal').parentElement!;
      expect(within(total).getByText('7')).toBeInTheDocument();
      expect(screen.queryByText('books.bookContent.totalHours')).not.toBeInTheDocument();
    });
  });

  describe('contrato de horas', () => {
    it('mostra as horas de cada requerimento e o total de horas', () => {
      renderizar();

      const cartao = cartaoDe('RF-9440912');
      expect(within(cartao).getByText('9.50')).toBeInTheDocument();
      expect(within(cartao).getByText('8.00')).toBeInTheDocument();
      expect(within(cartao).getByText('17.5')).toBeInTheDocument();
      expect(
        within(cartao).queryByText('books.bookContent.requirementsTicketsColumn')
      ).not.toBeInTheDocument();

      const total = screen.getByText('books.bookContent.totalHours').parentElement!;
      expect(within(total).getByText(/20\.00/)).toBeInTheDocument();
    });
  });

  it('mostra o total de requerimentos', () => {
    renderizar();

    const total = screen.getByText('books.bookContent.totalRequirements').parentElement!;
    expect(within(total).getByText('2')).toBeInTheDocument();
  });

  it('sem requerimentos, mostra a mensagem de vazio', () => {
    renderizar({ requerimentos: [] });

    expect(screen.getByText('books.bookContent.noRequirementsMonth')).toBeInTheDocument();
  });

  it('carregando, mostra a mensagem de carregamento', () => {
    renderizar({ carregando: true });

    expect(screen.getByText('books.bookContent.loadingRequirements')).toBeInTheDocument();
  });
});
