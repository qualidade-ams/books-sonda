import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { consultoresCoordenadoresService } from '@/services/consultoresCoordenadoresService';

const CHAVE = ['consultores-coordenadores'];

/** Tela "Consultores x Coordenadores": lista, responsáveis do organograma e gravação do vínculo */
export function useConsultoresCoordenadores() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const consultoresQuery = useQuery({
    queryKey: [...CHAVE, 'consultores'],
    queryFn: () => consultoresCoordenadoresService.listarConsultores(),
    staleTime: 5 * 60 * 1000,
  });

  const responsaveisQuery = useQuery({
    queryKey: [...CHAVE, 'responsaveis'],
    queryFn: () => consultoresCoordenadoresService.listarResponsaveis(),
    staleTime: 5 * 60 * 1000,
  });

  const definirMutation = useMutation({
    mutationFn: ({
      especialistaId,
      coordenadorId,
    }: {
      especialistaId: string;
      coordenadorId: string | null;
    }) => consultoresCoordenadoresService.definirCoordenador(especialistaId, coordenadorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAVE });
      toast({ title: 'Coordenador atualizado' });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao salvar coordenador',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  return {
    consultores: consultoresQuery.data ?? [],
    responsaveis: responsaveisQuery.data ?? [],
    isLoading: consultoresQuery.isLoading || responsaveisQuery.isLoading,
    error: (consultoresQuery.error || responsaveisQuery.error) as Error | null,
    definirCoordenador: definirMutation.mutateAsync,
    isSalvando: definirMutation.isPending,
  };
}

/**
 * Busca consultores com o email do coordenador para montar destinatário e CC do email de
 * inconsistências. Sempre vai ao banco: o vínculo pode ter mudado desde a última abertura.
 */
export function useBuscarEspecialistasParaEmail() {
  const queryClient = useQueryClient();

  return useCallback(
    () =>
      queryClient.fetchQuery({
        queryKey: [...CHAVE, 'email'],
        queryFn: () => consultoresCoordenadoresService.listarEspecialistasParaEmail(),
        staleTime: 0,
      }),
    [queryClient]
  );
}
