import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));

vi.mock('@/hooks/useSyncAgendamentos', () => ({
  useEmpresasBook: () => ({
    empresas: [
      { id: 'e1', nome: 'VOTORANTIM' },
      { id: 'e2', nome: 'HYPERA PHARMA' },
    ],
    isLoading: false,
    error: null,
  }),
}));

import { GerarBooksAgoraModal } from '../GerarBooksAgoraModal';

describe('GerarBooksAgoraModal', () => {
  beforeEach(() => vi.clearAllMocks());

  function renderizar() {
    const onConfirmar = vi.fn();
    render(<GerarBooksAgoraModal open onOpenChange={() => {}} onConfirmar={onConfirmar} />);
    return { onConfirmar };
  }

  const confirmar = () => screen.getByRole('button', { name: 'sincronizacaoSql.books.confirmarGerar' });

  it('padrão gera todas as empresas liberadas', () => {
    const { onConfirmar } = renderizar();
    expect(screen.getByText('sincronizacaoSql.books.confirmarTitulo')).toBeInTheDocument();

    fireEvent.click(confirmar());
    expect(onConfirmar).toHaveBeenCalledWith([]);
  });

  it('gera só as empresas escolhidas', () => {
    const { onConfirmar } = renderizar();

    fireEvent.click(screen.getByLabelText('sincronizacaoSql.empresas.selecionadas'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'VOTORANTIM' }));
    fireEvent.click(confirmar());

    expect(onConfirmar).toHaveBeenCalledWith(['e1']);
  });

  it('não confirma "somente selecionadas" sem empresa', () => {
    const { onConfirmar } = renderizar();

    fireEvent.click(screen.getByLabelText('sincronizacaoSql.empresas.selecionadas'));

    expect(confirmar()).toBeDisabled();
    fireEvent.click(confirmar());
    expect(onConfirmar).not.toHaveBeenCalled();
  });
});
