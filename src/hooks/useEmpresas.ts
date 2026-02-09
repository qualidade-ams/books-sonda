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
    // Criar chave mais específica para garantir que mudanças nos filtros sejam detectadas
    return [
      baseKey, 
      filtros?.busca || '',
      filtros?.status || [],
      filtros?.produtos || [],
      filtros?.temAms,
      filtros?.emProjeto // NOVO: Incluir filtro emProjeto na chave de cache
    ] as const;
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
        (filtros.status && filtros.status.length > 0) ||
        (filtros.temAms !== undefined) ||
        (filtros.emProjeto !== undefined) // NOVO: Incluir filtro emProjeto
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
    staleTime: filtros && (
      (filtros.busca && filtros.busca.trim()) ||
      (filtros.produtos && filtros.produtos.length > 0) ||
      (filtros.status && filtros.status.length > 0) ||
      (filtros.temAms !== undefined) ||
      (filtros.emProjeto !== undefined) // NOVO: Incluir filtro emProjeto
    ) ? 0 : 5 * 60 * 1000, // 0 quando há filtros, 5 minutos quando não há
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnMount: true, // Sempre refetch ao montar quando há filtros
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
    mutationFn: async (data: EmpresaFormData) => {
      console.log('🚀 [useEmpresas] Mutation iniciada');
      console.log('🚀 [useEmpresas] Dados recebidos pela mutation:', {
        nomeAbreviado: data.nomeAbreviado,
        baselineSegmentado: data.baselineSegmentado,
        segmentacaoConfig: data.segmentacaoConfig,
        empresasSegmentadas: data.segmentacaoConfig?.empresas?.length || 0,
        dadosCompletos: data
      });
      
      try {
        console.log('🚀 [useEmpresas] Chamando empresasClientesService.criarEmpresa...');
        const result = await empresasClientesService.criarEmpresa(data);
        console.log('✅ [useEmpresas] Empresa criada com sucesso:', result);
        return result;
      } catch (error) {
        console.error('❌ [useEmpresas] Erro ao criar empresa:', error);
        console.error('❌ [useEmpresas] Detalhes do erro:', {
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
        throw error;
      }
    },
    onSuccess: async (_, data) => {
      // ✅ NOVO: Limpeza agressiva de cache para garantir atualização imediata
      await clientBooksCacheService.clearAllCache();
      
      // Invalidar todas as queries relacionadas a empresas
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });
      await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      // ✅ NOVO: Forçar refetch imediato da query atual
      await queryClient.refetchQueries({ queryKey: cacheKey });

      // ✅ NOVO: Verificar vigência automaticamente se foi definida uma vigência final
      if (data.vigenciaFinal) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const vigenciaFinal = new Date(data.vigenciaFinal);
        vigenciaFinal.setHours(0, 0, 0, 0);
        
        // Se a vigência final é anterior a hoje, executar verificação automática
        if (vigenciaFinal < hoje) {
          try {
            // Importar o serviço de vigência dinamicamente para evitar dependência circular
            const { vigenciaService } = await import('@/services/vigenciaService');
            const empresasInativadas = await vigenciaService.executarVerificacaoManual();
            
            if (empresasInativadas > 0) {
              toast.success(`Empresa criada! ${empresasInativadas} empresa(s) com vigência vencida foram automaticamente inativadas.`);
              
              // Recarregar dados após inativação automática
              await queryClient.invalidateQueries({ queryKey: ['empresas'] });
            } else {
              toast.success('Empresa criada com sucesso!');
            }
          } catch (error) {
            console.error('Erro na verificação automática de vigência:', error);
            toast.success('Empresa criada com sucesso!');
            toast.warning('Não foi possível executar verificação automática de vigência. Verifique manualmente na tela de Monitoramento.');
          }
        } else {
          toast.success('Empresa criada com sucesso!');
        }
      } else {
        toast.success('Empresa criada com sucesso!');
      }
    },
    onError: (error: any) => {
      console.error('❌ [useEmpresas] onError da createMutation chamado');
      console.error('❌ [useEmpresas] Erro capturado:', {
        message: error?.message || 'Erro desconhecido',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
      toast.error(error.message || 'Erro ao criar empresa');
    },
  });

  // Mutation para atualizar empresa com invalidação otimizada
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmpresaFormData> }) => {
      console.log('🔄 [useEmpresas] Mutation de atualização iniciada');
      console.log('🔄 [useEmpresas] Dados recebidos pela mutation:', {
        id,
        nomeAbreviado: data.nomeAbreviado,
        baselineSegmentado: data.baselineSegmentado,
        segmentacaoConfig: data.segmentacaoConfig,
        empresasSegmentadas: data.segmentacaoConfig?.empresas?.length || 0,
        dadosCompletos: data
      });
      
      try {
        console.log('🔄 [useEmpresas] Chamando empresasClientesService.atualizarEmpresa...');
        const result = await empresasClientesService.atualizarEmpresa(id, data);
        console.log('✅ [useEmpresas] Empresa atualizada com sucesso:', result);
        return result;
      } catch (error) {
        console.error('❌ [useEmpresas] Erro ao atualizar empresa:', error);
        console.error('❌ [useEmpresas] Detalhes do erro:', {
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          error
        });
        throw error;
      }
    },
    onSuccess: async (result, { id, data }) => {
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

      // ✅ ADICIONADO: Invalidar cache de clientes para refletir inativações
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });

      // Mensagem base de sucesso
      let mensagemSucesso = 'Empresa atualizada com sucesso!';

      // Se clientes foram inativados, adicionar à mensagem
      if (result.clientesInativados > 0) {
        mensagemSucesso = `Empresa inativada com sucesso! ${result.clientesInativados} cliente(s) também foram inativados automaticamente.`;
      }

      // ✅ NOVO: Verificar vigência automaticamente se foi definida uma vigência final
      if (data.vigenciaFinal) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const vigenciaFinal = new Date(data.vigenciaFinal);
        vigenciaFinal.setHours(0, 0, 0, 0);
        
        // Se a vigência final é anterior a hoje, executar verificação automática
        if (vigenciaFinal < hoje) {
          try {
            // Importar o serviço de vigência dinamicamente para evitar dependência circular
            const { vigenciaService } = await import('@/services/vigenciaService');
            const empresasInativadas = await vigenciaService.executarVerificacaoManual();
            
            if (empresasInativadas > 0) {
              toast.success(`${mensagemSucesso} ${empresasInativadas} empresa(s) com vigência vencida foram automaticamente inativadas.`);
              
              // Recarregar dados após inativação automática
              await queryClient.invalidateQueries({ queryKey: ['empresas'] });
              await queryClient.refetchQueries({ queryKey: cacheKey });
            } else {
              toast.success(mensagemSucesso);
            }
          } catch (error) {
            console.error('Erro na verificação automática de vigência:', error);
            toast.success(mensagemSucesso);
            toast.warning('Não foi possível executar verificação automática de vigência. Verifique manualmente na tela de Monitoramento.');
          }
        } else {
          toast.success(mensagemSucesso);
        }
      } else {
        toast.success(mensagemSucesso);
      }

      // Forçar refetch para garantir dados atualizados
      await queryClient.refetchQueries({ queryKey: cacheKey });
    },
    onError: (error: any) => {
      console.error('❌ [useEmpresas] onError da updateMutation chamado');
      console.error('❌ [useEmpresas] Erro capturado:', {
        message: error?.message || 'Erro desconhecido',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        error
      });
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
    onSuccess: async (result, { ids, status }) => {
      // Invalidar cache para todas as empresas afetadas
      ids.forEach(id => clientBooksCacheService.invalidateEmpresaCache(id));
      await queryClient.invalidateQueries({ queryKey: ['empresas'] });

      // ✅ ADICIONADO: Invalidar cache da tela de controle de disparos
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      await queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });

      // ✅ ADICIONADO: Invalidar cache de clientes para refletir inativações
      await queryClient.invalidateQueries({ queryKey: ['clientes'] });

      setSelectedEmpresas([]);

      // Mensagem de sucesso com informação sobre clientes inativados
      if (status === 'inativo' && result.clientesInativados > 0) {
        toast.success(`Status das empresas alterado com sucesso! ${result.clientesInativados} cliente(s) também foram inativados automaticamente.`);
      } else {
        toast.success('Status das empresas alterado com sucesso!');
      }
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