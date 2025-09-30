import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { faturamentoService } from '@/services/faturamentoService';
import type { 
  RelatorioFaturamento, 
  EstatisticasFaturamento, 
  EmailFaturamento 
} from '@/services/faturamentoService';

// Query keys para cache
export const FATURAMENTO_QUERY_KEYS = {
  all: ['faturamento'] as const,
  relatorio: (mes: number, ano: number) => [...FATURAMENTO_QUERY_KEYS.all, 'relatorio', mes, ano] as const,
  estatisticas: (mesInicio: number, anoInicio: number, mesFim: number, anoFim: number) => 
    [...FATURAMENTO_QUERY_KEYS.all, 'estatisticas', mesInicio, anoInicio, mesFim, anoFim] as const,
  requerimentos: (mes: number, ano: number) => 
    [...FATURAMENTO_QUERY_KEYS.all, 'requerimentos', mes, ano] as const,
};

/**
 * Hook para gerar relatório de faturamento
 */
export function useRelatorioFaturamento(mes: number, ano: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: FATURAMENTO_QUERY_KEYS.relatorio(mes, ano),
    queryFn: () => faturamentoService.gerarRelatorioFaturamento(mes, ano),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    enabled: mes >= 1 && mes <= 12 && ano > 0,
  });
}

/**
 * Hook para buscar requerimentos para faturamento
 */
export function useRequerimentosFaturamento(mes: number, ano: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: FATURAMENTO_QUERY_KEYS.requerimentos(mes, ano),
    queryFn: () => faturamentoService.buscarRequerimentosParaFaturamento(mes, ano),
    staleTime: 1000 * 60 * 2, // 2 minutos
    gcTime: 1000 * 60 * 5, // 5 minutos
    enabled: mes >= 1 && mes <= 12 && ano > 0,
  });
}

/**
 * Hook para buscar estatísticas de faturamento por período
 */
export function useEstatisticasFaturamento(
  mesInicio: number,
  anoInicio: number,
  mesFim: number,
  anoFim: number
) {
  return useQuery({
    queryKey: FATURAMENTO_QUERY_KEYS.estatisticas(mesInicio, anoInicio, mesFim, anoFim),
    queryFn: () => faturamentoService.buscarEstatisticasFaturamento(mesInicio, anoInicio, mesFim, anoFim),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
    enabled: mesInicio >= 1 && mesInicio <= 12 && 
             mesFim >= 1 && mesFim <= 12 && 
             anoInicio > 0 && anoFim > 0,
  });
}

/**
 * Hook para disparar faturamento por email
 */
export function useDispararFaturamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (emailFaturamento: EmailFaturamento) => 
      faturamentoService.dispararFaturamento(emailFaturamento),
    onSuccess: (resultado, emailFaturamento) => {
      if (resultado.success) {
        toast.success(
          resultado.message || 'Faturamento disparado com sucesso!',
          {
            description: `Enviado para: ${emailFaturamento.destinatarios.join(', ')}`,
            duration: 5000,
          }
        );

        // Invalidar cache relacionado (opcional, pois não afeta os dados)
        queryClient.invalidateQueries({
          queryKey: FATURAMENTO_QUERY_KEYS.all,
        });
      } else {
        toast.error(
          resultado.error || 'Erro ao disparar faturamento',
          {
            description: 'Verifique os dados e tente novamente',
            duration: 8000,
          }
        );
      }
    },
    onError: (error: Error) => {
      console.error('Erro na mutation de disparo de faturamento:', error);
      toast.error('Erro inesperado ao disparar faturamento', {
        description: error.message,
        duration: 8000,
      });
    },
  });
}

/**
 * Hook para marcar requerimentos como faturados
 */
export function useMarcarComoFaturados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requerimentoIds: string[]) => 
      faturamentoService.marcarComoFaturados(requerimentoIds),
    onSuccess: (resultado, requerimentoIds) => {
      if (resultado.success) {
        toast.success(
          resultado.message || 'Requerimentos marcados como faturados!',
          {
            description: `${requerimentoIds.length} requerimento(s) atualizado(s)`,
            duration: 5000,
          }
        );

        // Invalidar todas as queries relacionadas
        queryClient.invalidateQueries({
          queryKey: FATURAMENTO_QUERY_KEYS.all,
        });

        // Invalidar também as queries de requerimentos
        queryClient.invalidateQueries({
          queryKey: ['requerimentos'],
        });
      } else {
        toast.error(
          resultado.error || 'Erro ao marcar requerimentos como faturados',
          {
            description: 'Verifique os dados e tente novamente',
            duration: 8000,
          }
        );
      }
    },
    onError: (error: Error) => {
      console.error('Erro na mutation de marcar como faturados:', error);
      toast.error('Erro inesperado ao marcar requerimentos', {
        description: error.message,
        duration: 8000,
      });
    },
  });
}

/**
 * Hook para gerar template HTML de faturamento
 */
export function useTemplateEmailFaturamento() {
  return {
    gerarTemplate: (relatorio: RelatorioFaturamento) => {
      try {
        return faturamentoService.criarTemplateEmailFaturamento(relatorio);
      } catch (error) {
        console.error('Erro ao gerar template de email:', error);
        toast.error('Erro ao gerar template de email', {
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          duration: 5000,
        });
        return '';
      }
    }
  };
}

/**
 * Hook combinado para operações de faturamento
 */
export function useFaturamento(mes?: number, ano?: number) {
  const mesAtual = mes || new Date().getMonth() + 1;
  const anoAtual = ano || new Date().getFullYear();

  const relatorio = useRelatorioFaturamento(mesAtual, anoAtual);
  const requerimentos = useRequerimentosFaturamento(mesAtual, anoAtual);
  const dispararFaturamento = useDispararFaturamento();
  const marcarComoFaturados = useMarcarComoFaturados();
  const templateEmail = useTemplateEmailFaturamento();

  return {
    // Queries
    relatorio,
    requerimentos,
    
    // Mutations
    dispararFaturamento,
    marcarComoFaturados,
    
    // Utilities
    templateEmail,
    
    // Estados combinados
    isLoading: relatorio.isLoading || requerimentos.isLoading,
    isError: relatorio.isError || requerimentos.isError,
    error: relatorio.error || requerimentos.error,
    
    // Dados combinados
    data: {
      relatorio: relatorio.data,
      requerimentos: requerimentos.data,
    },
    
    // Métodos de refetch
    refetch: () => {
      relatorio.refetch();
      requerimentos.refetch();
    },
  };
}