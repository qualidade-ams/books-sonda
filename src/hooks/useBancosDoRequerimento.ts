import { useQuery } from '@tanstack/react-query';
import { requerimentoBancoService } from '@/services/requerimentoBancoService';

export const BANCOS_DO_REQUERIMENTO_KEY = ['requerimento-bancos'] as const;

/**
 * Bancos que o requerimento pode escolher. Lista vazia = empresa no legado
 * (o formulário fica como antes). Na edição, traz o banco já escolhido.
 */
export function useBancosDoRequerimento(empresaId: string | undefined, requerimentoId?: string) {
  const query = useQuery({
    queryKey: [...BANCOS_DO_REQUERIMENTO_KEY, empresaId, requerimentoId ?? null],
    queryFn: () => requerimentoBancoService.bancosDisponiveis(empresaId!, requerimentoId),
    enabled: !!empresaId,
    staleTime: 60 * 1000,
  });
  const bancos = query.data ?? [];
  return {
    bancos,
    liberada: bancos.length > 0,
    bancoEscolhidoId: bancos.find((b) => b.escolhido)?.id,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}
