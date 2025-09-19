import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { empresasClientesService } from '@/services/empresasClientesService';
import { clientBooksCacheService } from '@/services/clientBooksCache';
import { PaginationUtils, type PaginationParams } from '@/utils/paginationUtils';
import type {
  EmpresaClienteCompleta,
  EmpresaFormData,
  EmpresaFiltros
} from '@/types/clientBooks';

/**
 * Hook para gerenciamento de empresas clientes com paginação e cache otimizado
 */
export const useEmpresas = (
  filtros?: EmpresaFiltros,
  paginationParams?: PaginationParams
) => {
  const queryClient = useQueryClient();
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);

  // Validar parâmetros de paginação
  const validatedParams = useMemo(() => {
    if (!paginationParams) return undefined;
    return PaginationUtils.validatePaginationParams(paginationParams, 'empresas');
  }, [paginationParams]);

  // Gerar chave de cache otimizada
  const cacheKey = useMemo(() => {
    const baseKey = 'empresas';
    if (validatedParams) {
      const generatedKey = PaginationUtils.generateCacheKey(baseKey, validatedParams, filtros);
      // Garantir que sempre retorne um array
      return Array.isArray(generatedKey) ? generatedKey : [generatedKey];
    }
    return [baseKey, filtros] as const;
  }, [filtros, validatedParams]);

  // Query para listar empresas com cache otimizado
  const {
    data: empresasResult,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      // Verificar se há filtros ativos (sempre buscar do banco quando há filtros)
      const hasActiveFilters = filtros && (
        (filtros.busca && filtros.busca.trim()) ||
        (filtros.produtos && filtros.produtos.length > 0) ||
        (filtros.status && filtros.status.length > 0)
      );

      // Tentar buscar do cache primeiro APENAS se não há filtros e não há paginação
      if (!validatedParams && !hasActiveFilters) {
        const cached = await clientBooksCacheService.getTodasEmpresas();
        if (cached) {
          return cached;
        }
      }

      // Buscar do banco de dados
      const result = await empresasClientesService.listarEmpresasPaginado(
        filtros,
        validatedParams
      );

      // Cachear resultado se não for paginado E não há filtros ativos
      if (!validatedParams && !hasActiveFilters) {
        // Verificar se é resultado paginado ou array direto
        const dataToCache = 'data' in result ? result.data : result;
        await clientBooksCacheService.cacheTodasEmpresas(dataToCache);
      }

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Extrair dados baseado no tipo de resultado
  const empresas = useMemo(() => {
    if (!empresasResult) return [];

    // Se é resultado paginado
    if ('data' in empresasResult && 'pagination' in empresasResult) {
      return empresasResult.data;
    }

    // Se é array direto
    return empresasResult as EmpresaClienteCompleta[];
  }, [empresasResult]);

  const paginationInfo = useMemo(() => {
    if (empresasResult && 'pagination' in empresasResult) {
      return empresasResult.pagination;
    }
    return undefined;
  }, [empresasResult]);

  // Mutation para criar empresa com invalidação de cache otimizada
  const createMutation = useMutation({
    mutationFn: (data: EmpresaFormData) => empresasClientesService.criarEmpresa(data),
    onSuccess: async () => {
      // Invalidar cache específico
      clientBooksCacheService.invalidateEmpresaCache('');
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });
      await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });

      // ✅ ADICIONADO: Invalidar cache da tela de controle de disparos
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      toast.success('Empresa criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar empresa');
    },
  });

  // Mutation para atualizar empresa com invalidação otimizada
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpresaFormData> }) =>
      empresasClientesService.atualizarEmpresa(id, data),
    onSuccess: async (_, { id }) => {
      // Invalidar cache específico da empresa
      clientBooksCacheService.invalidateEmpresaCache(id);

      // Invalidar e recarregar queries de empresas
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });
      await queryClient.invalidateQueries({ queryKey: ['empresa', id] });
      await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });

      // ✅ ADICIONADO: Invalidar cache da tela de controle de disparos
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      // ✅ ADICIONADO: Invalidar cache de histórico de disparos
      await queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });

      // Forçar refetch para garantir dados atualizados
      await queryClient.refetchQueries({ queryKey: cacheKey });

      toast.success('Empresa atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar empresa');
    },
  });

  // Mutation para deletar empresa com invalidação otimizada
  const deleteMutation = useMutation({
    mutationFn: (id: string) => empresasClientesService.deletarEmpresa(id),
    onSuccess: async (_, id) => {
      // Invalidar cache específico da empresa
      clientBooksCacheService.invalidateEmpresaCache(id);
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });
      queryClient.removeQueries({ queryKey: ['empresa', id] });
      await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });

      // ✅ ADICIONADO: Invalidar cache da tela de controle de disparos
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      toast.success('Empresa deletada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao deletar empresa');
    },
  });

  // Mutation para alteração em lote com invalidação otimizada
  const batchUpdateMutation = useMutation({
    mutationFn: ({ ids, status, descricao }: { ids: string[]; status: string; descricao: string }) =>
      empresasClientesService.alterarStatusLote(ids, status, descricao),
    onSuccess: async (_, { ids }) => {
      // Invalidar cache para todas as empresas afetadas
      ids.forEach(id => clientBooksCacheService.invalidateEmpresaCache(id));
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });

      // ✅ ADICIONADO: Invalidar cache da tela de controle de disparos
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      setSelectedEmpresas([]);
      toast.success('Status das empresas alterado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar status das empresas');
    },
  });

  // Funções auxiliares
  const criarEmpresa = useCallback((data: EmpresaFormData) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  const atualizarEmpresa = useCallback((id: string, data: Partial<EmpresaFormData>) => {
    return updateMutation.mutateAsync({ id, data });
  }, [updateMutation]);

  const deletarEmpresa = useCallback((id: string) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  // Mutation para importação em lote
  const importarEmpresasMutation = useMutation({
    mutationFn: async (empresas: EmpresaFormData[]) => {
      const resultados = [];
      for (const empresa of empresas) {
        try {
          const resultado = await empresasClientesService.criarEmpresa(empresa);
          resultados.push(resultado);
        } catch (error) {
          console.error(`Erro ao importar empresa ${empresa.nomeCompleto}:`, error);
          throw error;
        }
      }
      return resultados;
    },
    onSuccess: async () => {
      clientBooksCacheService.invalidateEmpresaCache('');
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });
      await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });

      // ✅ ADICIONADO: Invalidar cache da tela de controle de disparos
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      await queryClient.refetchQueries({ queryKey: ['empresas'] });
      //toast.success('Empresas importadas com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao importar empresas:', error);
      toast.error('Erro ao importar empresas');
    },
  });

  const importarEmpresas = useCallback((data: EmpresaFormData[]) => {
    return importarEmpresasMutation.mutateAsync(data);
  }, [importarEmpresasMutation]);

  const alterarStatusLote = useCallback((ids: string[], status: string, descricao: string) => {
    return batchUpdateMutation.mutateAsync({ ids, status, descricao });
  }, [batchUpdateMutation]);

  const toggleEmpresaSelection = useCallback((empresaId: string) => {
    setSelectedEmpresas(prev =>
      prev.includes(empresaId)
        ? prev.filter(id => id !== empresaId)
        : [...prev, empresaId]
    );
  }, []);

  const selectAllEmpresas = useCallback(() => {
    setSelectedEmpresas(empresas.map(empresa => empresa.id));
  }, [empresas]);

  const clearSelection = useCallback(() => {
    setSelectedEmpresas([]);
  }, []);

  // Função para forçar refresh limpando cache
  const forceRefresh = useCallback(async () => {
    // Limpar cache de empresas
    clientBooksCacheService.invalidateEmpresaCache('');
    // Invalidar queries do React Query
    queryClient.invalidateQueries({ queryKey: ['empresas'] });
    // Refetch
    await refetch();
  }, [queryClient, refetch]);

  return {
    // Dados
    empresas,
    selectedEmpresas,
    pagination: paginationInfo,

    // Estados
    isLoading,
    error,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBatchUpdating: batchUpdateMutation.isPending,
    isImporting: importarEmpresasMutation.isPending,

    // Ações
    criarEmpresa,
    atualizarEmpresa,
    deletarEmpresa,
    importarEmpresas,
    alterarStatusLote,
    refetch,
    forceRefresh,

    // Seleção
    toggleEmpresaSelection,
    selectAllEmpresas,
    clearSelection,
  };
};

/**
 * Hook para obter uma empresa específica por ID
 */
export const useEmpresa = (id: string) => {
  return useQuery({
    queryKey: ['empresa', id],
    queryFn: () => empresasClientesService.obterEmpresaPorId(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};