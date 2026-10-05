import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClienteForm from '../ClienteForm';

const empresas = [
  { id: 'empresa-1', nome_abreviado: 'EMPRESA 1', status: 'ativo' }
] as any[];

const dadosEdicao = {
  nomeCompleto: 'Contato Teste',
  email: 'contato@empresa.com',
  funcao: '',
  empresaId: 'empresa-1',
  status: 'ativo' as const,
  descricaoStatus: '',
  principalContato: false
};

describe('ClienteForm - finalidade de envio', () => {
  it('exibe o campo Finalidade de Envio', () => {
    render(<ClienteForm mode="create" empresas={empresas} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('Finalidade de Envio *')).toBeInTheDocument();
  });

  it('envia "book" por padrão quando o contato não tem finalidade definida', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ClienteForm mode="edit" initialData={dadosEdicao} empresas={empresas} onSubmit={onSubmit} onCancel={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].finalidadeEnvio).toBe('book');
  });

  it('preserva a finalidade do contato ao salvar a edição', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <ClienteForm
        mode="edit"
        initialData={{ ...dadosEdicao, finalidadeEnvio: 'saldo_parcial' }}
        empresas={empresas}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    // O Radix também renderiza um <select> nativo oculto, por isso o texto aparece mais de uma vez
    expect(screen.getAllByText('Saldo Parcial').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].finalidadeEnvio).toBe('saldo_parcial');
  });
});
