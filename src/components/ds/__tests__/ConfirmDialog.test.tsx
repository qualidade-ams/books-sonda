import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('ConfirmDialog', () => {
  it('mostra título, consequência e lista de efeitos', () => {
    render(
      <ConfirmDialog
        aberto
        onOpenChange={vi.fn()}
        titulo="Voltar para legado?"
        descricao="A empresa volta a usar o cálculo atual."
        consequencias={['Os bancos deixam de aparecer no Book', 'O histórico é mantido']}
        rotuloConfirmar="Voltar para legado"
        onConfirmar={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog', { name: 'Voltar para legado?' })).toBeInTheDocument();
    expect(screen.getByText('A empresa volta a usar o cálculo atual.')).toBeInTheDocument();
    expect(screen.getByText('O histórico é mantido')).toBeInTheDocument();
  });

  it('confirma direto quando não exige justificativa', () => {
    const onConfirmar = vi.fn();
    render(
      <ConfirmDialog
        aberto
        onOpenChange={vi.fn()}
        titulo="Liberar?"
        rotuloConfirmar="Liberar"
        onConfirmar={onConfirmar}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Liberar' }));
    expect(onConfirmar).toHaveBeenCalledWith(undefined);
  });

  it('só habilita a confirmação depois de preencher a justificativa', () => {
    const onConfirmar = vi.fn();
    render(
      <ConfirmDialog
        aberto
        onOpenChange={vi.fn()}
        titulo="Descartar ajuste?"
        rotuloConfirmar="Descartar"
        tom="perigo"
        justificativa={{ rotulo: 'Justificativa' }}
        onConfirmar={onConfirmar}
      />
    );
    const confirmar = screen.getByRole('button', { name: 'Descartar' });
    expect(confirmar).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Justificativa' }), {
      target: { value: '   ' },
    });
    expect(confirmar).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Justificativa' }), {
      target: { value: 'Lançamento duplicado' },
    });
    fireEvent.click(confirmar);
    expect(onConfirmar).toHaveBeenCalledWith('Lançamento duplicado');
  });

  it('desabilita os botões enquanto processa', () => {
    render(
      <ConfirmDialog
        aberto
        onOpenChange={vi.fn()}
        titulo="Liberar?"
        rotuloConfirmar="Liberar"
        onConfirmar={vi.fn()}
        processando
      />
    );
    expect(screen.getByRole('button', { name: /Liberar/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ds.cancel' })).toBeDisabled();
  });
});
