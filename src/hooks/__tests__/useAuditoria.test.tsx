import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAuditoria } from '../useAuditoria';
import { auditoriaService } from '@/services/auditoriaService';

vi.mock('@/services/auditoriaService', () => ({
  auditoriaService: { buscar: vi.fn() },
}));

const service = auditoriaService as unknown as Record<string, ReturnType<typeof vi.fn>>;

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

describe('useAuditoria', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.buscar.mockImplementation(async (f: { antesDe?: string }) =>
      f.antesDe
        ? { registros: [{ id: 1, em: '2026-10-01T00:00:00Z' }], temMais: false }
        : {
            registros: [
              { id: 3, em: '2026-10-03T00:00:00Z' },
              { id: 2, em: '2026-10-02T00:00:00Z' },
            ],
            temMais: true,
          }
    );
  });

  it('busca com os filtros e junta as páginas a partir do último registro', async () => {
    const { wrapper } = criarWrapper();
    const filtros = { desde: '2026-10-01', areas: ['Reajustes'] };
    const { result } = renderHook(() => useAuditoria(filtros), { wrapper });

    await waitFor(() => expect(result.current.registros).toHaveLength(2));
    expect(service.buscar).toHaveBeenCalledWith(filtros);
    expect(result.current.temMais).toBe(true);

    await act(() => result.current.carregarMais());
    await waitFor(() => expect(result.current.registros.map((r) => r.id)).toEqual([3, 2, 1]));
    expect(service.buscar).toHaveBeenLastCalledWith({
      ...filtros,
      antesDe: '2026-10-02T00:00:00Z',
    });
    expect(result.current.temMais).toBe(false);
  });

  it('expõe o erro', async () => {
    service.buscar.mockRejectedValue(new Error('Falha ao carregar a auditoria: sem rede'));
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useAuditoria({}), { wrapper });
    await waitFor(() =>
      expect(result.current.error?.message).toBe('Falha ao carregar a auditoria: sem rede')
    );
  });

  it('recarregar busca de novo', async () => {
    const { wrapper } = criarWrapper();
    const { result } = renderHook(() => useAuditoria({}), { wrapper });
    await waitFor(() => expect(result.current.registros).toHaveLength(2));
    await act(() => result.current.recarregar());
    expect(service.buscar).toHaveBeenCalledTimes(2);
  });
});
