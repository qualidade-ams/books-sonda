/**
 * Hook para buscar requerimentos em desenvolvimento (não enviados)
 * 
 * Busca requerimentos que têm mes_cobranca preenchido mas ainda não foram enviados.
 * Estes requerimentos NÃO são contabilizados no banco de horas, mas são exibidos
 * como "em desenvolvimento" para informar que as horas ainda serão descontadas.
 * 
 * @module hooks/useBancoHorasRequerimentosEmDesenvolvimento
 */

import { useQuery } from '@tanstack/react-query';
import { bancoHorasIntegracaoService } from '@/services/bancoHorasIntegracaoService';

/**
 * Hook para buscar requerimentos em desenvolvimento
 * 
 * @param empresaId - ID da empresa cliente
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @returns Query com dados de requerimentos em desenvolvimento
 */
export function useBancoHorasRequerimentosEmDesenvolvimento(
  empresaId: string | undefined,
  mes: number,
  ano: number
) {
  return useQuery({
    queryKey: ['banco-horas-requerimentos-em-desenvolvimento', empresaId, mes, ano],
    queryFn: async () => {
      if (!empresaId) {
        return { horas: '00:00', tickets: 0 };
      }
      
      return await bancoHorasIntegracaoService.buscarRequerimentosEmDesenvolvimento(
        empresaId,
        mes,
        ano
      );
    },
    enabled: !!empresaId,
    staleTime: 1000 * 30, // 30 segundos
    gcTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60, // Atualizar a cada 1 minuto
    refetchOnWindowFocus: true, // Atualizar quando focar na janela
  });
}
