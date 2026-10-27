import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { chaveMes, controleBancoHorasService } from '@/services/controleBancoHorasService';
import { controleLancamentosService } from '@/services/controleLancamentosService';
import { controleHistoricoService } from '@/services/controleHistoricoService';
import {
  controleSaldoParcialService,
  type SaldoParcialBanco,
} from '@/services/controleSaldoParcialService';
import {
  enviarSaldoParcialControle,
  type EnvioControleInput,
} from '@/services/saldoParcial/envioControle';
import { mesAtual } from '@/services/bancosHoras/periodos';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type {
  AjusteRequerimento,
  NovoReajusteInput,
  ObservacaoInput,
} from '@/types/controleBancoHoras';

/**
 * Tela Controle de Banco de Horas. Toda gravação recarrega o Controle inteiro:
 * um reajuste ou uma troca de banco muda o quadro calculado.
 */
const CHAVE = 'controle-bh';
const UM_MINUTO = 60 * 1000;

const chaveMeses = (meses: MesAno[]) => meses.map(chaveMes).join(',');

function useAvisos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  return {
    toast,
    t,
    recarregar: () => queryClient.invalidateQueries({ queryKey: [CHAVE] }),
    avisarErro: (titulo: string) => (err: Error) =>
      toast({ title: titulo, description: err.message, variant: 'destructive' }),
  };
}

export function useControleEmpresas() {
  const query = useQuery({
    queryKey: [CHAVE, 'empresas'],
    queryFn: () => controleBancoHorasService.empresas(),
    staleTime: 5 * UM_MINUTO,
  });
  return {
    empresas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

export function useControleBancos(empresaId: string | undefined) {
  const query = useQuery({
    queryKey: [CHAVE, 'bancos', empresaId],
    queryFn: () => controleBancoHorasService.bancos(empresaId!),
    enabled: !!empresaId,
    staleTime: 5 * UM_MINUTO,
  });
  return {
    bancos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/** Meses do período calculados pelo motor; o consumo muda com a sincronização */
export function useQuadroControle(empresaId: string | undefined, meses: MesAno[]) {
  const query = useQuery({
    queryKey: [CHAVE, 'quadro', empresaId, chaveMeses(meses)],
    queryFn: () => controleBancoHorasService.quadro(empresaId!, meses),
    enabled: !!empresaId && meses.length > 0,
    staleTime: UM_MINUTO,
  });
  return {
    quadro: query.data ?? {},
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
  };
}

/** Quadro de qualquer período, sob demanda (exportar todos os bancos); mesmo cache do quadro da tela */
export function useBuscarQuadro(empresaId: string | undefined) {
  const queryClient = useQueryClient();
  return useCallback(
    (meses: MesAno[]) =>
      queryClient.fetchQuery({
        queryKey: [CHAVE, 'quadro', empresaId, chaveMeses(meses)],
        queryFn: () => controleBancoHorasService.quadro(empresaId!, meses),
        staleTime: UM_MINUTO,
      }),
    [queryClient, empresaId]
  );
}

export function useRequerimentosControle(empresaId: string | undefined, meses: MesAno[]) {
  const { toast, t, recarregar, avisarErro } = useAvisos();
  const query = useQuery({
    queryKey: [CHAVE, 'requerimentos', empresaId, chaveMeses(meses)],
    queryFn: () => controleBancoHorasService.requerimentos(empresaId!, meses),
    enabled: !!empresaId && meses.length > 0,
    staleTime: UM_MINUTO,
  });

  const salvarAjustes = useMutation({
    mutationFn: ({ ajustes, motivo }: { ajustes: AjusteRequerimento[]; motivo: string }) =>
      controleLancamentosService.salvarAjustesRequerimentos(ajustes, motivo),
    onSuccess: () =>
      toast({
        title: t('avisos.controle.bancoRequerimentosAlterado'),
        description: t('avisos.controle.valeProximoRecalculo'),
      }),
    onError: avisarErro(t('avisos.controle.erroBancoRequerimentos')),
    onSettled: recarregar,
  });

  return {
    requerimentos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
    salvarAjustes: salvarAjustes.mutateAsync,
    isSalvando: salvarAjustes.isPending,
  };
}

/** Reajustes e observações do banco no período */
export function useLancamentosControle(bancoId: string | undefined, meses: MesAno[]) {
  const { toast, t, recarregar, avisarErro } = useAvisos();
  const habilitado = !!bancoId && meses.length > 0;

  const reajustes = useQuery({
    queryKey: [CHAVE, 'reajustes', bancoId, chaveMeses(meses)],
    queryFn: () => controleLancamentosService.reajustes(bancoId!, meses),
    enabled: habilitado,
    staleTime: 5 * UM_MINUTO,
  });
  const observacoes = useQuery({
    queryKey: [CHAVE, 'observacoes', bancoId, chaveMeses(meses)],
    queryFn: () => controleLancamentosService.observacoes(bancoId!, meses),
    enabled: habilitado,
    staleTime: 5 * UM_MINUTO,
  });

  const lancarReajuste = useMutation({
    mutationFn: (input: NovoReajusteInput) => controleLancamentosService.lancarReajuste(input),
    onSuccess: () => toast({ title: t('avisos.controle.reajusteLancado') }),
    onError: avisarErro(t('avisos.controle.erroLancarReajuste')),
    onSettled: recarregar,
  });
  const inativarReajuste = useMutation({
    mutationFn: ({ reajusteId, motivo }: { reajusteId: string; motivo: string }) =>
      controleLancamentosService.inativarReajuste(reajusteId, motivo),
    onSuccess: () => toast({ title: t('avisos.controle.reajusteInativado') }),
    onError: avisarErro(t('avisos.controle.erroInativarReajuste')),
    onSettled: recarregar,
  });
  const salvarObservacao = useMutation({
    mutationFn: (input: ObservacaoInput) => controleLancamentosService.salvarObservacao(input),
    onSuccess: () => toast({ title: t('avisos.controle.observacaoSalva') }),
    onError: avisarErro(t('avisos.controle.erroSalvarObservacao')),
    onSettled: recarregar,
  });
  const excluirObservacao = useMutation({
    mutationFn: (observacaoId: string) =>
      controleLancamentosService.excluirObservacao(observacaoId),
    onSuccess: () => toast({ title: t('avisos.controle.observacaoExcluida') }),
    onError: avisarErro(t('avisos.controle.erroExcluirObservacao')),
    onSettled: recarregar,
  });

  return {
    reajustes: reajustes.data ?? [],
    observacoes: observacoes.data ?? [],
    isLoading: reajustes.isLoading || observacoes.isLoading,
    error: (reajustes.error || observacoes.error) as Error | null,
    recarregar: () => Promise.all([reajustes.refetch(), observacoes.refetch()]),
    lancarReajuste: lancarReajuste.mutateAsync,
    inativarReajuste: inativarReajuste.mutateAsync,
    salvarObservacao: salvarObservacao.mutateAsync,
    excluirObservacao: excluirObservacao.mutateAsync,
    isSalvando:
      lancarReajuste.isPending ||
      inativarReajuste.isPending ||
      salvarObservacao.isPending ||
      excluirObservacao.isPending,
  };
}

export function useHistoricoControle(bancoId: string | undefined) {
  const query = useQuery({
    queryKey: [CHAVE, 'historico', bancoId],
    queryFn: () => controleHistoricoService.historico(bancoId!),
    enabled: !!bancoId,
    staleTime: 5 * UM_MINUTO,
  });
  return {
    eventos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
  };
}

const SEM_BANCOS: SaldoParcialBanco[] = [];

/** Envio do Saldo Parcial pelo Controle: os bancos que o cliente vê e o idioma do e-mail */
export function useSaldoParcialControle(empresaId: string | undefined, aberto: boolean) {
  const { toast, t, avisarErro } = useAvisos();
  const query = useQuery({
    queryKey: [CHAVE, 'saldo-parcial', empresaId],
    queryFn: async () => {
      const [bancos, idioma] = await Promise.all([
        controleSaldoParcialService.bancos(empresaId!, mesAtual()),
        controleSaldoParcialService.idiomaDoEmail(empresaId!),
      ]);
      return { bancos, idioma };
    },
    enabled: !!empresaId && aberto,
    staleTime: UM_MINUTO,
  });
  const enviar = useMutation({
    mutationFn: (input: EnvioControleInput) => enviarSaldoParcialControle(input),
    onSuccess: () => toast({ title: t('avisos.controle.saldoParcialEnviado') }),
    onError: avisarErro(t('avisos.controle.erroSaldoParcial')),
  });

  return {
    bancos: query.data?.bancos ?? SEM_BANCOS,
    idioma: query.data?.idioma ?? ('pt-BR' as const),
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
    enviar: enviar.mutateAsync,
    isEnviando: enviar.isPending,
  };
}
