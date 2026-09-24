import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { InconsistenciaChamado } from '@/types/inconsistenciasChamados';

vi.mock('@/services/inconsistenciasChamadosService', () => ({
  inconsistenciasChamadosService: {
    buscarTarefasAntesDaTroca: vi.fn(),
  },
}));

import { inconsistenciasChamadosService } from '@/services/inconsistenciasChamadosService';
import { useTarefasAntesDaTroca } from '../useInconsistenciasChamados';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const troca = {
  id: 'inc-1',
  nro_chamado: 'RF 123',
  tipo_inconsistencia: 'troca_codigo_resolucao',
  data_atividade: '2026-10-02T14:30:00Z',
} as InconsistenciaChamado;

describe('useTarefasAntesDaTroca', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('busca as tarefas quando a inconsistência é de troca de código de resolução', async () => {
    const dados = { tarefas: [], total_minutos: 0, total_horas: '00:00' };
    (inconsistenciasChamadosService.buscarTarefasAntesDaTroca as any).mockResolvedValue(dados);

    const { result } = renderHook(() => useTarefasAntesDaTroca(troca), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(inconsistenciasChamadosService.buscarTarefasAntesDaTroca).toHaveBeenCalledWith(troca);
    expect(result.current.dados).toEqual(dados);
  });

  it('não busca para outros tipos nem sem inconsistência selecionada', () => {
    renderHook(() => useTarefasAntesDaTroca({ ...troca, tipo_inconsistencia: 'mes_diferente' }), { wrapper });
    renderHook(() => useTarefasAntesDaTroca(null), { wrapper });

    expect(inconsistenciasChamadosService.buscarTarefasAntesDaTroca).not.toHaveBeenCalled();
  });
});
