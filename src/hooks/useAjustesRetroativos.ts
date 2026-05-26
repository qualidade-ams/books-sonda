/**
 * Hook para gerenciamento de ajustes retroativos do banco de horas
 * 
 * Fornece queries e mutations para:
 * - Listar ajustes pendentes e histórico
 * - Aprovar ajustes (gera reajuste automático)
 * - Descartar ajustes (com justificativa)
 * - Contar pendentes (para badge de notificação)
 * 
 * @module hooks/useAjustesRetroativos
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  bancoHorasQuarentenaService,
  type AjusteRetroativo,
  type AprovarAjusteInput,
  type DescartarAjusteInput
} from '@/services/bancoHorasQuarentenaService';

/**
 * Hook para listar ajustes retroativos com filtros
 */
export const useAjustesRetroativos = (filtros?: {
  empresaId?: string;
  status?: string;
  mesReferencia?: number;
  anoReferencia?: number;
}) => {
  const queryClient = useQueryClient();

  const {
    data: ajustes,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['ajustes-retroativos', filtros],
    queryFn: () => bancoHorasQuarentenaService.listarAjustes(filtros),
    staleTime: 30000, // 30 segundos
  });

  return { ajustes: ajustes || [], isLoading, error, refetch };
};

/**
 * Hook para contar ajustes pendentes (badge de notificação)
 */
export const useAjustesPendentesCount = () => {
  const { data: count } = useQuery({
    queryKey: ['ajustes-retroativos-count'],
    queryFn: () => bancoHorasQuarentenaService.contarPendentes(),
    staleTime: 60000, // 1 minuto
    refetchInterval: 120000, // Atualiza a cada 2 minutos
  });

  return count || 0;
};

/**
 * Hook para aprovar um ajuste retroativo
 */
export const useAprovarAjuste = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AprovarAjusteInput) =>
      bancoHorasQuarentenaService.aprovarAjuste(input),
    onSuccess: () => {
      toast.success('Ajuste aprovado com sucesso! Reajuste gerado automaticamente.');
      queryClient.invalidateQueries({ queryKey: ['ajustes-retroativos'] });
      queryClient.invalidateQueries({ queryKey: ['ajustes-retroativos-count'] });
      queryClient.invalidateQueries({ queryKey: ['banco-horas-calculo'] });
      queryClient.invalidateQueries({ queryKey: ['banco-horas-reajustes'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao aprovar ajuste: ${error.message}`);
    }
  });
};

/**
 * Hook para descartar um ajuste retroativo
 */
export const useDescartarAjuste = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DescartarAjusteInput) =>
      bancoHorasQuarentenaService.descartarAjuste(input),
    onSuccess: () => {
      toast.success('Ajuste descartado com sucesso.');
      queryClient.invalidateQueries({ queryKey: ['ajustes-retroativos'] });
      queryClient.invalidateQueries({ queryKey: ['ajustes-retroativos-count'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao descartar ajuste: ${error.message}`);
    }
  });
};

/**
 * Hook para executar detecção de extemporâneos manualmente
 */
export const useDetectarExtemporaneos = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { empresaId: string; mes: number; ano: number }) =>
      bancoHorasQuarentenaService.executarDeteccaoCompleta(
        params.empresaId,
        params.mes,
        params.ano
      ),
    onSuccess: (ajustes) => {
      if (ajustes.length > 0) {
        toast.warning(`${ajustes.length} ajuste(s) retroativo(s) detectado(s) e enviado(s) para quarentena.`);
      } else {
        toast.success('Nenhuma diferença detectada.');
      }
      queryClient.invalidateQueries({ queryKey: ['ajustes-retroativos'] });
      queryClient.invalidateQueries({ queryKey: ['ajustes-retroativos-count'] });
    },
    onError: (error: any) => {
      toast.error(`Erro na detecção: ${error.message}`);
    }
  });
};
