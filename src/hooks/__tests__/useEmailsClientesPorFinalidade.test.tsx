import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEmailsClientesPorFinalidade } from '../useClientes';
import { clientesService } from '@/services/clientesService';

vi.mock('@/services/clientesService', () => ({
  clientesService: { listarEmailsPorFinalidade: vi.fn() }
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useEmailsClientesPorFinalidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna os e-mails dos contatos com as finalidades informadas', async () => {
    (clientesService.listarEmailsPorFinalidade as any).mockResolvedValue(['a@cliente.com']);

    const { result } = renderHook(
      () => useEmailsClientesPorFinalidade('empresa-1', ['saldo_parcial', 'ambos']),
      { wrapper }
    );

    await waitFor(() => expect(result.current.emails).toEqual(['a@cliente.com']));
    expect(clientesService.listarEmailsPorFinalidade).toHaveBeenCalledWith('empresa-1', ['saldo_parcial', 'ambos']);
  });

  it('não consulta quando não há empresa', () => {
    const { result } = renderHook(
      () => useEmailsClientesPorFinalidade(undefined, ['saldo_parcial', 'ambos']),
      { wrapper }
    );

    expect(result.current.emails).toEqual([]);
    expect(clientesService.listarEmailsPorFinalidade).not.toHaveBeenCalled();
  });
});
