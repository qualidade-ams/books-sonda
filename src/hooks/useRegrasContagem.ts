import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { regrasContagemService } from '@/services/regrasContagemService';
import type { SalvarRegrasInput } from '@/types/regrasContagem';

const CHAVE = ['regras-contagem'];

/** Tela Regras de contagem: filtros do consumo e códigos de resolução */
export function useRegrasContagem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: CHAVE,
    queryFn: () => regrasContagemService.carregar(),
    staleTime: 5 * 60 * 1000,
  });

  const salvar = useMutation({
    mutationFn: (input: SalvarRegrasInput) => regrasContagemService.salvar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAVE });
      toast({
        title: 'Regras de contagem salvas',
        description: 'Valem a partir do próximo recálculo; meses fechados não mudam.',
      });
    },
    onError: (err: Error) =>
      toast({
        title: 'Erro ao salvar as regras de contagem',
        description: err.message,
        variant: 'destructive',
      }),
  });

  return {
    regras: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    salvar: salvar.mutateAsync,
    isSalvando: salvar.isPending,
  };
}
