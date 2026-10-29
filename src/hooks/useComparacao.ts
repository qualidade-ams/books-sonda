import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { textoDoErro } from '@/errors/erroTraduzivel';
import { comparacaoService } from '@/services/comparacaoService';
import { bookConsumoBancosService } from '@/services/bookConsumoBancosService';
import { enviarSaldoParcialDeTeste } from '@/services/saldoParcial/envioTeste';
import { grupoDaComparacao } from '@/utils/comparacaoTela';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { GrupoComparacao } from '@/types/comparacao';

const CHAVE = ['comparacao-bh'];

/** Recálculo pedido ao sync-api: a empresa e o que ela tinha antes */
interface Recalculo {
  empresaId: string;
  calculadoEm: string | null;
  erroEm: string | null;
}

/** Tela Comparação Legado x Novo (Fase 4) */
export function useComparacao({ intervaloRecalculoMs = 10_000 } = {}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [recalculo, setRecalculo] = useState<Recalculo | null>(null);

  const query = useQuery({
    queryKey: CHAVE,
    queryFn: () => comparacaoService.listar(),
    staleTime: 5 * 60 * 1000,
    // O sync-api responde na hora e calcula em segundo plano: acompanha até o resultado chegar
    refetchInterval: recalculo ? intervaloRecalculoMs : false,
  });
  const empresas = useMemo(() => query.data ?? [], [query.data]);

  const contagem = useMemo(() => {
    const total: Record<GrupoComparacao, number> = {
      conferem: 0,
      explicada: 0,
      divergente: 0,
      validada: 0,
      liberada: 0,
    };
    for (const e of empresas) {
      const grupo = grupoDaComparacao(e);
      if (grupo) total[grupo] += 1;
    }
    return total;
  }, [empresas]);

  // Fim do recálculo: chegou cálculo novo ou erro novo da empresa
  useEffect(() => {
    if (!recalculo) return;
    const atual = empresas.find((e) => e.empresaId === recalculo.empresaId);
    if (!atual) return;
    if (atual.erroEm && atual.erroEm !== recalculo.erroEm) {
      setRecalculo(null);
      toast({
        title: t('avisos.comparacao.erroRecalcular'),
        description: atual.erro ?? undefined,
        variant: 'destructive',
      });
    } else if (atual.calculadoEm !== recalculo.calculadoEm) {
      setRecalculo(null);
      toast({ title: t('avisos.comparacao.recalculada') });
      queryClient.invalidateQueries({ queryKey: [...CHAVE, 'meses', recalculo.empresaId] });
    }
  }, [empresas, recalculo, toast, t, queryClient]);

  const validar = useMutation({
    mutationFn: ({
      empresaId,
      validar,
      motivo,
    }: {
      empresaId: string;
      validar: boolean;
      motivo?: string;
    }) => comparacaoService.validar(empresaId, validar, motivo),
    onSuccess: (_r, { validar }) =>
      toast({
        title: t(validar ? 'avisos.comparacao.validada' : 'avisos.comparacao.validacaoDesfeita'),
      }),
    onError: (err: Error) =>
      toast({
        title: t('avisos.comparacao.erroValidar'),
        description: textoDoErro(err, t),
        variant: 'destructive',
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE, exact: true }),
  });

  const recalcular = useMutation({
    mutationFn: (empresaId: string) => comparacaoService.recalcular(empresaId),
    onSuccess: (_r, empresaId) => {
      const antes = empresas.find((e) => e.empresaId === empresaId);
      setRecalculo({
        empresaId,
        calculadoEm: antes?.calculadoEm ?? null,
        erroEm: antes?.erroEm ?? null,
      });
      toast({
        title: t('avisos.comparacao.recalculando'),
        description: t('avisos.comparacao.recalculandoDescricao'),
      });
    },
    onError: (err: Error) =>
      toast({
        title: t('avisos.comparacao.erroRecalcular'),
        description: textoDoErro(err, t),
        variant: 'destructive',
      }),
  });

  // Fase 5: a lista e os meses mudam (grupo, validação desfeita na volta)
  const liberar = useMutation({
    mutationFn: (empresaId: string) => comparacaoService.liberar(empresaId),
    onSuccess: () => toast({ title: t('avisos.comparacao.liberada') }),
    onError: (err: Error) =>
      toast({
        title: t('avisos.comparacao.erroLiberar'),
        description: textoDoErro(err, t),
        variant: 'destructive',
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });

  const voltar = useMutation({
    mutationFn: ({ empresaId, motivo }: { empresaId: string; motivo: string }) =>
      comparacaoService.voltar(empresaId, motivo),
    onSuccess: () => toast({ title: t('avisos.comparacao.voltouParaLegado') }),
    onError: (err: Error) =>
      toast({
        title: t('avisos.comparacao.erroVoltar'),
        description: textoDoErro(err, t),
        variant: 'destructive',
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });

  // Teste antes de liberar (P7): só para quem pediu, sem histórico
  const enviarSaldoParcialTeste = useMutation({
    mutationFn: ({ empresaId, empresaNome }: { empresaId: string; empresaNome: string }) =>
      enviarSaldoParcialDeTeste(empresaId, empresaNome),
    onSuccess: () =>
      toast({
        title: t('avisos.comparacao.saldoTesteEnviado'),
        description: t('avisos.comparacao.saldoTesteEnviadoDescricao'),
      }),
    onError: (err: Error) =>
      toast({
        title: t('avisos.comparacao.erroSaldoTeste'),
        description: textoDoErro(err, t),
        variant: 'destructive',
      }),
  });

  return {
    empresas,
    contagem,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    /** Tentar de novo depois de erro ao carregar */
    recarregar: query.refetch,
    validar: validar.mutateAsync,
    recalcular: recalcular.mutateAsync,
    /** Empresa com recálculo em andamento no sync-api */
    recalculando: recalculo?.empresaId ?? null,
    liberar: liberar.mutateAsync,
    voltar: voltar.mutateAsync,
    enviarSaldoParcialTeste: enviarSaldoParcialTeste.mutateAsync,
    enviandoSaldoParcialTeste: enviarSaldoParcialTeste.isPending,
    isSalvando: validar.isPending || recalcular.isPending || liberar.isPending || voltar.isPending,
  };
}

/** Book de teste (P7): os blocos por banco do mês, calculados agora, sem gravar */
export function useBookDeTeste(empresaId: string | null, mes: MesAno | null) {
  const query = useQuery({
    queryKey: [...CHAVE, 'book-teste', empresaId, mes?.ano, mes?.mes],
    queryFn: () => bookConsumoBancosService.previa(empresaId!, mes!),
    enabled: !!empresaId && !!mes,
    staleTime: 0,
  });
  return {
    bancos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
  };
}

/** Reajustes e observações do Controle novo que a volta para o legado copia (P4) */
export function useLancamentosParaLegado(empresaId: string | null) {
  const query = useQuery({
    queryKey: [...CHAVE, 'lancamentos-legado', empresaId],
    queryFn: () => comparacaoService.lancamentosParaLegado(empresaId!),
    enabled: !!empresaId,
    staleTime: 0,
  });
  return {
    lancamentos: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/** Meses comparados da empresa aberta no detalhe */
export function useMesesComparacao(empresaId: string | null) {
  const query = useQuery({
    queryKey: [...CHAVE, 'meses', empresaId],
    queryFn: () => comparacaoService.meses(empresaId!),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });
  return {
    meses: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
  };
}
