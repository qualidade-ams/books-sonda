import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageHeader } from '@/components/ds/PageHeader';
import { useMediaQuery } from '@/hooks/useMediaQuery';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: vi.fn() }));
const mockedMedia = vi.mocked(useMediaQuery);

const acoes = (recalcular = vi.fn(), historico = vi.fn()) => [
  { rotulo: 'Histórico', onClick: historico },
  { rotulo: 'Enviar Saldo Parcial', onClick: vi.fn() },
  { rotulo: 'Recalcular', onClick: recalcular, primaria: true },
];

describe('PageHeader', () => {
  beforeEach(() => mockedMedia.mockReset());

  it('mostra o título como cabeçalho principal e a descrição', () => {
    mockedMedia.mockReturnValue(true);
    render(<PageHeader titulo="Controle de Banco de Horas" descricao="Acompanhamento mensal" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Controle de Banco de Horas' })
    ).toBeInTheDocument();
    expect(screen.getByText('Acompanhamento mensal')).toBeInTheDocument();
  });

  it('no desktop mostra todas as ações como botões', () => {
    mockedMedia.mockReturnValue(true);
    const recalcular = vi.fn();
    render(<PageHeader titulo="Controle" acoes={acoes(recalcular)} />);
    expect(screen.getByRole('button', { name: 'Histórico' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar Saldo Parcial' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recalcular' }));
    expect(recalcular).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'ds.moreActions' })).not.toBeInTheDocument();
  });

  it('no celular mantém a ação primária e agrupa as demais em "Mais ações"', () => {
    mockedMedia.mockReturnValue(false);
    render(<PageHeader titulo="Controle" acoes={acoes()} />);
    expect(screen.getByRole('button', { name: 'Recalcular' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Histórico' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ds.moreActions' })).toBeInTheDocument();
  });

  it('no celular não mostra "Mais ações" quando só existe a ação primária', () => {
    mockedMedia.mockReturnValue(false);
    render(
      <PageHeader
        titulo="Controle"
        acoes={[{ rotulo: 'Recalcular', onClick: vi.fn(), primaria: true }]}
      />
    );
    expect(screen.queryByRole('button', { name: 'ds.moreActions' })).not.toBeInTheDocument();
  });
});
