import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { regrasContagemService } from '@/services/regrasContagemService';
import type { SalvarRegrasInput } from '@/types/regrasContagem';

const CHAVE = ['regras-contagem'];

/** Tela Regras de contagem: filtros do consumo e códigos de resolução */
export function useRegrasContagem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

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
        title: t('avisos.regras.salvas'),
        description: t('avisos.regras.valemProximoRecalculo'),
      });
    },
    onError: (err: Error) =>
      toast({
        title: t('avisos.regras.erroSalvar'),
        description: err.message,
        variant: 'destructive',
      }),
  });

  return {
    regras: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
    salvar: salvar.mutateAsync,
    isSalvando: salvar.isPending,
  };
}
