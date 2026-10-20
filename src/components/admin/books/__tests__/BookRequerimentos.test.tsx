import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));

import BookRequerimentos from '../BookRequerimentos';

const LINHAS = [
  {
    id: 'r1',
    numero_chamado: 'RF-9175039',
    ticket_externo: 'RITMSD2242075',
    cliente: 'SAINT GOBAIN',
    modulo: 'Comply',
    descricao: 'Ajuste no layout da nota fiscal',
    tipo_cobranca: 'Banco de Horas',
    horas_funcional: '00:00',
    horas_tecnica: '60:00',
    total_horas: '60:00',
    data_envio: '11/06/2026',
    status: 'Faturado',
    periodo_cobranca: '09/2026',
  },
  {
    id: 'r2',
    numero_chamado: 'RF-8925032',
    cliente: 'SAINT GOBAIN',
    modulo: 'Comply',
    tipo_cobranca: 'Banco de Horas',
    horas_funcional: '00:00',
    horas_tecnica: '24:00',
    total_horas: '24:00',
    status: 'Faturado',
  },
];

describe('BookRequerimentos', () => {
  it('exibe a coluna Descrição com a descrição de cada requerimento', () => {
    render(<BookRequerimentos data={LINHAS} />);

    expect(screen.getByText('books.bookContent.requirementsDescriptionColumn')).toBeInTheDocument();
    expect(screen.getByText('Ajuste no layout da nota fiscal')).toBeInTheDocument();
  });

  it('mantém os textos de "em desenvolvimento" por padrão', () => {
    render(<BookRequerimentos data={LINHAS} />);

    expect(
      screen.getAllByText('books.bookContent.requirementsInDevelopmentTitle').length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('books.bookContent.requirementsInDevelopmentStatus')
    ).toBeInTheDocument();
  });

  it('variante "faturado" usa título, subtítulo e status de compensados', () => {
    render(<BookRequerimentos data={LINHAS} variante="faturado" empresaNome="SAINT GOBAIN" />);

    expect(
      screen.getAllByText('books.bookContent.requirementsCompensatedTitle').length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText('books.bookContent.requirementsCompensatedSubtitle')
    ).toBeInTheDocument();
    expect(screen.getByText('books.bookContent.requirementsCompensatedStatus')).toBeInTheDocument();
    expect(
      screen.queryByText('books.bookContent.requirementsInDevelopmentTitle')
    ).not.toBeInTheDocument();
  });

  it('variante "faturado" não tem a coluna Status', () => {
    render(<BookRequerimentos data={LINHAS} variante="faturado" />);

    expect(
      screen.queryByText('books.bookContent.requirementsStatusColumn')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Faturado')).not.toBeInTheDocument();
  });

  it('variante "faturado" usa o badge azul padrão no tipo de cobrança e no módulo', () => {
    render(<BookRequerimentos data={LINHAS} variante="faturado" />);

    const badges = [...screen.getAllByText('Banco de Horas'), ...screen.getAllByText('Comply')];
    badges.forEach((badge) => {
      expect(badge).toHaveClass('bg-primary');
      expect(badge.className).not.toContain('orange');
    });
  });

  it('variante "desenvolvimento" mantém a coluna Status e os badges laranja', () => {
    render(<BookRequerimentos data={LINHAS} />);

    expect(screen.getByText('books.bookContent.requirementsStatusColumn')).toBeInTheDocument();
    expect(screen.getAllByText('Comply')[0]).toHaveClass('bg-orange-100');
  });

  it('soma o total de horas de todos os requerimentos', () => {
    render(<BookRequerimentos data={LINHAS} variante="faturado" />);

    const cards = screen.getByText(
      'books.bookContent.requirementsInDevelopmentHours'
    ).parentElement!;
    expect(within(cards).getByText('84:00')).toBeInTheDocument();
  });
});
