/**
 * Hook para verificar o status da API de sincronização
 */

import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = import.meta.env.VITE_SYNC_API_URL || 'http://localhost:3001';

async function verificarStatusApi(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(3000), // Timeout de 3 segundos
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao verificar status da API:', error);
    return false;
  }
}

export function useApiStatus() {
  return useQuery({
    queryKey: ['api-status'],
    queryFn: verificarStatusApi,
    refetchInterval: 10000, // Verifica a cada 10 segundos
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 5000,
  });
}
