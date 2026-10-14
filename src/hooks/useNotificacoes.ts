import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { notificacoesService } from '@/services/notificacoesService';

const QUERY_KEY = ['notificacoes'];

/**
 * Notificações abertas do sino. A lista chega já filtrada pela RLS (só telas em
 * que o usuário tem Edição) e é recarregada pelo Realtime a cada mudança.
 */
export function useNotificacoes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const habilitado = !!user;

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => notificacoesService.listarAbertas(),
    staleTime: 5 * 60 * 1000,
    enabled: habilitado,
  });

  useEffect(() => {
    if (!habilitado) return;
    return notificacoesService.assinarMudancas(() => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    });
  }, [habilitado, queryClient]);

  const marcarMutation = useMutation({
    mutationFn: (ids: string[]) => notificacoesService.marcarComoLidas(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao marcar notificação como lida', description: err.message, variant: 'destructive' });
    },
  });

  const notificacoes = habilitado ? (data ?? []) : [];
  const idsNaoLidas = notificacoes.filter((n) => !n.lida).map((n) => n.id);

  return {
    notificacoes,
    naoLidas: idsNaoLidas.length,
    isLoading,
    error,
    marcarComoLida: (id: string) => marcarMutation.mutateAsync([id]),
    marcarTodasComoLidas: () => marcarMutation.mutateAsync(idsNaoLidas),
    isMarcando: marcarMutation.isPending,
  };
}
