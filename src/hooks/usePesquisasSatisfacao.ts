/**
 * Hook principal para gerenciamento de pesquisas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { 
  Pesquisa, 
  PesquisaFormData, 
  Filtrospesquisas, 
  Estatisticaspesquisas 
} from '@/types/pesquisasSatisfacao';
import * as pesquisasService from '@/services/pesquisasSatisfacaoService';

// ============================================
// QUERY KEYS
// ============================================

const QUERY_KEYS = {
  pesquisas: (filtros?: Filtrospesquisas) => ['pesquisas', filtros],
  pesquisa: (id: string) => ['pesquisas', id],
  estatisticas: (filtros?: FiltrosPesquisas) => ['pesquisas-estatisticas', filtros],
  empresas: ['pesquisas-empresas'],
  categorias: ['pesquisas-categorias'],
  grupos: ['pesquisas-grupos']
};

// ============================================
// QUERIES
// ============================================

/**
 * Hook para buscar pesquisas com filtros
 */
export function usePesquisasSatisfacao(filtros?: FiltrosPesquisas) {
  return useQuery({
    queryKey: QUERY_KEYS.pesquisas(filtros),
    queryFn: () => pesquisasService.buscarPesquisas(filtros),
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 60000 // 1 minuto
  });
}

/**
 * Hook para buscar pesquisa por ID
 */
export function usePesquisa(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.pesquisa(id),
    queryFn: () => pesquisasService.buscarPesquisaPorId(id),
    enabled: !!id,
    staleTime: 30000
  });
}

/**
 * Hook para estatísticas
 */
export function useEstatisticasPesquisas(filtros?: FiltrosPesquisas) {
  return useQuery({
    queryKey: QUERY_KEYS.estatisticas(filtros),
    queryFn: () => pesquisasService.obterEstatisticas(filtros),
    staleTime: 30000
  });
}

/**
 * Hook para buscar empresas
 */
export function useEmpresasPesquisas() {
  return useQuery({
    queryKey: QUERY_KEYS.empresas,
    queryFn: () => pesquisasService.buscarEmpresas(),
    staleTime: 300000 // 5 minutos
  });
}

/**
 * Hook para buscar categorias
 */
export function useCategoriasPesquisas() {
  return useQuery({
    queryKey: QUERY_KEYS.categorias,
    queryFn: () => pesquisasService.buscarCategorias(),
    staleTime: 300000
  });
}

/**
 * Hook para buscar grupos
 */
export function useGruposPesquisas() {
  return useQuery({
    queryKey: QUERY_KEYS.grupos,
    queryFn: () => pesquisasService.buscarGrupos(),
    staleTime: 300000
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Hook para criar pesquisa
 */
export function useCriarPesquisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dados: PesquisaFormData) => pesquisasService.criarPesquisa(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      toast.success('Pesquisa criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar pesquisa:', error);
      toast.error(`Erro ao criar pesquisa: ${error.message}`);
    }
  });
}

/**
 * Hook para atualizar pesquisa
 */
export function useAtualizarPesquisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<PesquisaFormData> }) =>
      pesquisasService.atualizarPesquisa(id, dados),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pesquisa(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      toast.success('Pesquisa atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar pesquisa:', error);
      toast.error(`Erro ao atualizar pesquisa: ${error.message}`);
    }
  });
}

/**
 * Hook para excluir pesquisa
 */
export function useExcluirPesquisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pesquisasService.excluirPesquisa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      toast.success('Pesquisa excluído com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir pesquisa:', error);
      toast.error(`Erro ao excluir pesquisa: ${error.message}`);
    }
  });
}

/**
 * Hook para marcar pesquisas como enviados
 */
export function useMarcarComoEnviados() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => pesquisasService.marcarComoEnviados(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      toast.success(`${ids.length} pesquisa(s) marcado(s) como enviado(s)!`);
    },
    onError: (error: Error) => {
      console.error('Erro ao marcar pesquisas como enviados:', error);
      toast.error(`Erro ao marcar como enviados: ${error.message}`);
    }
  });
}

/**
 * Hook para excluir múltiplos pesquisas
 */
export function useExcluirPesquisasEmLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => pesquisasService.excluirPesquisasEmLote(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      toast.success(`${ids.length} pesquisa(s) excluído(s) com sucesso!`);
    },
    onError: (error: Error) => {
      console.error('Erro ao excluir pesquisas em lote:', error);
      toast.error(`Erro ao excluir em lote: ${error.message}`);
    }
  });
}
