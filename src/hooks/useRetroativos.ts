import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { retroativosService } from '@/services/retroativosService';
import type { SituacaoRetroativo } from '@/types/retroativos';

const CHAVE = ['retroativos-bh'];
/** Decidir resolve o aviso "Apontamento retroativo pendente" no sino (gatilho no banco) */
const CHAVE_SINO = ['notificacoes'];

/** Tela Apontamentos Retroativos (modelo novo, por banco) */
export function useRetroativos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: CHAVE,
    queryFn: () => retroativosService.listar(),
    staleTime: 5 * 60 * 1000,
  });
  const retroativos = useMemo(() => query.data ?? [], [query.data]);

  const contagem = useMemo(() => {
    const total: Record<SituacaoRetroativo, number> = {
      pendente: 0,
      aprovado: 0,
      aplicado: 0,
      descartado: 0,
    };
    for (const r of retroativos) total[r.situacao] += 1;
    return total;
  }, [retroativos]);

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: CHAVE });
    queryClient.invalidateQueries({ queryKey: CHAVE_SINO });
  };

  const decidir = useMutation({
    mutationFn: ({
      retroativoId,
      decisao,
      justificativa,
    }: {
      retroativoId: string;
      decisao: 'aprovar' | 'descartar';
      justificativa: string;
    }) => retroativosService.decidir(retroativoId, decisao, justificativa),
    onSuccess: (_r, { decisao }) =>
      toast(
        decisao === 'aprovar'
          ? {
              title: 'Apontamento retroativo aprovado',
              description: 'Entra na retificação do Book do mês.',
            }
          : { title: 'Apontamento retroativo descartado' }
      ),
    onError: (err: Error) =>
      toast({
        title: 'Erro ao decidir o apontamento retroativo',
        description: err.message,
        variant: 'destructive',
      }),
    onSettled: recarregar,
  });

  const registrarAviso = useMutation({
    mutationFn: ({ retroativoId, itemIds }: { retroativoId: string; itemIds: string[] }) =>
      retroativosService.registrarAviso(retroativoId, itemIds),
    onError: (err: Error) =>
      toast({
        title: 'Erro ao registrar o aviso aos consultores',
        description: err.message,
        variant: 'destructive',
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });

  return {
    retroativos,
    contagem,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    decidir: decidir.mutateAsync,
    registrarAviso: registrarAviso.mutateAsync,
    emailsDosConsultores: (nomes: string[]) => retroativosService.emailsDosConsultores(nomes),
    isSalvando: decidir.isPending || registrarAviso.isPending,
  };
}
