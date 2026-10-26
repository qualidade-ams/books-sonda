import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { chaveMes, controleBancoHorasService } from '@/services/controleBancoHorasService';
import { controleLancamentosService } from '@/services/controleLancamentosService';
import { controleHistoricoService } from '@/services/controleHistoricoService';
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
  return {
    toast,
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

export function useRequerimentosControle(empresaId: string | undefined, meses: MesAno[]) {
  const { toast, recarregar, avisarErro } = useAvisos();
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
        title: 'Banco dos requerimentos alterado',
        description: 'Vale a partir do próximo recálculo; meses fechados não mudam.',
      }),
    onError: avisarErro('Erro ao trocar o banco dos requerimentos'),
    onSettled: recarregar,
  });

  return {
    requerimentos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    salvarAjustes: salvarAjustes.mutateAsync,
    isSalvando: salvarAjustes.isPending,
  };
}

/** Reajustes e observações do banco no período */
export function useLancamentosControle(bancoId: string | undefined, meses: MesAno[]) {
  const { toast, recarregar, avisarErro } = useAvisos();
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
    onSuccess: () => toast({ title: 'Reajuste lançado' }),
    onError: avisarErro('Erro ao lançar o reajuste'),
    onSettled: recarregar,
  });
  const inativarReajuste = useMutation({
    mutationFn: ({ reajusteId, motivo }: { reajusteId: string; motivo: string }) =>
      controleLancamentosService.inativarReajuste(reajusteId, motivo),
    onSuccess: () => toast({ title: 'Reajuste inativado' }),
    onError: avisarErro('Erro ao inativar o reajuste'),
    onSettled: recarregar,
  });
  const salvarObservacao = useMutation({
    mutationFn: (input: ObservacaoInput) => controleLancamentosService.salvarObservacao(input),
    onSuccess: () => toast({ title: 'Observação salva' }),
    onError: avisarErro('Erro ao salvar a observação'),
    onSettled: recarregar,
  });
  const excluirObservacao = useMutation({
    mutationFn: (observacaoId: string) =>
      controleLancamentosService.excluirObservacao(observacaoId),
    onSuccess: () => toast({ title: 'Observação excluída' }),
    onError: avisarErro('Erro ao excluir a observação'),
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
  };
}
