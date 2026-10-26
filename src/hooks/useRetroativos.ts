import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { retroativosService } from '@/services/retroativosService';
import {
  pedirRegularizacao,
  type EnvelopeRegularizacao,
} from '@/services/retroativos/envioRegularizacao';
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

  const regularizacao = useMutation({
    mutationFn: (input: { envelopes: EnvelopeRegularizacao[]; copia: string[] }) =>
      pedirRegularizacao(input),
    onSuccess: ({ enviados, semEmail, falhas }) => {
      if (enviados.length)
        toast({
          title: `E-mails enviados a ${enviados.length} ${enviados.length === 1 ? 'consultor' : 'consultores'}`,
        });
      if (semEmail.length || falhas.length)
        toast({
          title: 'Alguns consultores não receberam',
          description: [
            ...semEmail.map((c) => `${c}: sem e-mail no cadastro de especialistas`),
            ...falhas.map((f) => `${f.consultor}: ${f.erro}`),
          ].join(' · '),
          variant: 'destructive',
        });
    },
    onError: (err: Error) =>
      toast({
        title: 'Erro ao pedir a regularização aos consultores',
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
    /** Tentar de novo depois de erro ao carregar */
    recarregar: query.refetch,
    decidir: decidir.mutateAsync,
    registrarAviso: registrarAviso.mutateAsync,
    emailsDosConsultores: (nomes: string[]) => retroativosService.emailsDosConsultores(nomes),
    pedirRegularizacao: regularizacao.mutateAsync,
    isSalvando: decidir.isPending || registrarAviso.isPending || regularizacao.isPending,
  };
}

const SEM_EMAILS: Record<string, string | null> = {};

/** E-mail de cada consultor (cadastro de especialistas), com a tela de envio aberta */
export function useEmailsConsultores(nomes: string[], aberto: boolean) {
  const chave = [...nomes].sort().join('|');
  const query = useQuery({
    queryKey: [...CHAVE, 'emails', chave],
    queryFn: () => retroativosService.emailsDosConsultores(nomes),
    enabled: aberto && nomes.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  return {
    emails: query.data ?? SEM_EMAILS,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
