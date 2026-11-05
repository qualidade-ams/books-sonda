import { useQuery } from '@tanstack/react-query';
import {
  requerimentoBancoService,
  type Destino,
  type OpcaoDestino,
} from '@/services/requerimentoBancoService';

export const DESTINOS_DO_REQUERIMENTO_KEY = ['requerimento-destinos'] as const;

const SEM_DE_PARA: Record<string, Destino> = {};
const SEM_OPCOES: OpcaoDestino[] = [];

/**
 * Produtos/módulos que o requerimento pode escolher, com o banco de cada um.
 * liberada = false: empresa no legado (o formulário fica como antes). Na
 * edição, traz o destino já escolhido.
 */
export function useDestinosDoRequerimento(empresaId: string | undefined, requerimentoId?: string) {
  const query = useQuery({
    queryKey: [...DESTINOS_DO_REQUERIMENTO_KEY, empresaId, requerimentoId ?? null],
    queryFn: () => requerimentoBancoService.destinos(empresaId!, requerimentoId),
    enabled: !!empresaId,
    staleTime: 60 * 1000,
  });
  return {
    opcoes: query.data?.opcoes ?? SEM_OPCOES,
    liberada: !!query.data?.liberada,
    escolhido: query.data?.escolhido ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}

/** De-para do campo Módulo antigo para produto/módulo; só busca quando pedido */
export function useProdutosDosModulosLegados(ativo: boolean): Record<string, Destino> {
  const query = useQuery({
    queryKey: [...DESTINOS_DO_REQUERIMENTO_KEY, 'modulos-legados'],
    queryFn: () => requerimentoBancoService.produtosDosModulosLegados(),
    enabled: ativo,
    staleTime: 5 * 60 * 1000,
  });
  return query.data ?? SEM_DE_PARA;
}
