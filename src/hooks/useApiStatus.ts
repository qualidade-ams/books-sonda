/**
 * Hook para verificar o status da API de sincronização
 */

import { useQuery } from '@tanstack/react-query';
import { getApiBaseUrl, safeFetch } from '@/utils/apiConfig';

const API_BASE_URL = getApiBaseUrl();

async function verificarStatusApi(): Promise<boolean> {
  try {
    const response = await safeFetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // Timeout de 5 segundos
    });
    
    return response.ok;
  } catch (error) {
    // Log apenas em desenvolvimento e não repetidamente
    if (import.meta.env.DEV && !window.__apiErrorLogged) {
      console.warn('API de sincronização não disponível:', API_BASE_URL);
      window.__apiErrorLogged = true;
    }
    return false;
  }
}

export function useApiStatus() {
  return useQuery({
    queryKey: ['api-status'],
    queryFn: verificarStatusApi,
    refetchInterval: 30000, // Verifica a cada 30 segundos (reduzido de 10s)
    refetchOnWindowFocus: false, // Não verifica ao focar na janela
    retry: 1,
    staleTime: 15000, // Considera dados válidos por 15 segundos
  });
}
