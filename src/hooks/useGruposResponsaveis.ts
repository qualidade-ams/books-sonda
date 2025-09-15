import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  gruposResponsaveisService, 
  GrupoResponsavelError 
} from '@/services/gruposResponsaveisService';
import { clientBooksCacheService } from '@/services/clientBooksCache';
import { performanceOptimizationService } from '@/services/performanceOptimizationService';
import {
  GrupoResponsavelCompleto,
  GrupoFormData,
  GrupoEmail
} from '@/types/clientBooksTypes';

/**
 * Hook para gerenciamento de grupos responsáveis
 */
export function useGruposResponsaveis() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Query para listar grupos com cache otimizado
  const {
    data: grupos = [],
    isLoading: isLoadingGrupos,
    error: errorGrupos,
    refetch: refetchGrupos
  } = useQuery({
    queryKey: ['grupos-responsaveis'],
    queryFn: () => performanceOptimizationService.monitorQuery(
      'grupos_list',
      () => gruposResponsaveisService.listarGrupos(),
      {
        enableCache: true,
        cacheKey: 'grupos_responsaveis_all',
        ttl: 30 * 60 // 30 minutos - grupos mudam raramente
      }
    ),
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
  });

  // Mutation para criar grupo com invalidação otimizada
  const createGrupoMutation = useMutation({
    mutationFn: (data: GrupoFormData) => gruposResponsaveisService.criarGrupo(data),
    onSuccess: () => {
      // Invalidar cache específico
      clientBooksCacheService.invalidateGruposCache();
      queryClient.invalidateQueries({ queryKey: ['grupos-responsaveis'] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error: GrupoResponsavelError) => {
      toast.error(`Erro ao criar grupo: ${error.message}`);
    },
  });

  // Mutation para atualizar grupo
  const updateGrupoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GrupoFormData> }) =>
      gruposResponsaveisService.atualizarGrupo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-responsaveis'] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error: GrupoResponsavelError) => {
      toast.error(`Erro ao atualizar grupo: ${error.message}`);
    },
  });

  // Mutation para deletar grupo
  const deleteGrupoMutation = useMutation({
    mutationFn: (id: string) => gruposResponsaveisService.deletarGrupo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-responsaveis'] });
      toast.success('Grupo deletado com sucesso!');
    },
    onError: (error: GrupoResponsavelError) => {
      toast.error(`Erro ao deletar grupo: ${error.message}`);
    },
  });

  // Mutation para adicionar e-mail ao grupo
  const addEmailMutation = useMutation({
    mutationFn: ({ grupoId, email, nome }: { grupoId: string; email: string; nome?: string }) =>
      gruposResponsaveisService.adicionarEmailAoGrupo(grupoId, email, nome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-responsaveis'] });
      toast.success('E-mail adicionado com sucesso!');
    },
    onError: (error: GrupoResponsavelError) => {
      toast.error(`Erro ao adicionar e-mail: ${error.message}`);
    },
  });

  // Mutation para remover e-mail do grupo
  const removeEmailMutation = useMutation({
    mutationFn: ({ grupoId, emailId }: { grupoId: string; emailId: string }) =>
      gruposResponsaveisService.removerEmailDoGrupo(grupoId, emailId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-responsaveis'] });
      toast.success('E-mail removido com sucesso!');
    },
    onError: (error: GrupoResponsavelError) => {
      toast.error(`Erro ao remover e-mail: ${error.message}`);
    },
  });

  // Mutation para criar grupos padrão
  const createGruposPadraoMutation = useMutation({
    mutationFn: () => gruposResponsaveisService.criarGruposPadrao(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grupos-responsaveis'] });
      toast.success('Grupos padrão criados com sucesso!');
    },
    onError: (error: GrupoResponsavelError) => {
      toast.error(`Erro ao criar grupos padrão: ${error.message}`);
    },
  });

  // Função para obter grupo por ID
  const obterGrupoPorId = useCallback(async (id: string): Promise<GrupoResponsavelCompleto | null> => {
    try {
      setIsLoading(true);
      return await gruposResponsaveisService.obterGrupoPorId(id);
    } catch (error) {
      const grupoError = error as GrupoResponsavelError;
      toast.error(`Erro ao obter grupo: ${grupoError.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para obter grupos por empresa
  const obterGruposPorEmpresa = useCallback(async (empresaId: string): Promise<GrupoResponsavelCompleto[]> => {
    try {
      setIsLoading(true);
      return await gruposResponsaveisService.obterGruposPorEmpresa(empresaId);
    } catch (error) {
      const grupoError = error as GrupoResponsavelError;
      toast.error(`Erro ao obter grupos da empresa: ${grupoError.message}`);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para associar grupo à empresa
  const associarGrupoEmpresa = useCallback(async (grupoId: string, empresaId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await gruposResponsaveisService.associarGrupoEmpresa(grupoId, empresaId);
      toast.success('Grupo associado à empresa com sucesso!');
      return true;
    } catch (error) {
      const grupoError = error as GrupoResponsavelError;
      toast.error(`Erro ao associar grupo: ${grupoError.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Função para desassociar grupo da empresa
  const desassociarGrupoEmpresa = useCallback(async (grupoId: string, empresaId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await gruposResponsaveisService.desassociarGrupoEmpresa(grupoId, empresaId);
      toast.success('Grupo desassociado da empresa com sucesso!');
      return true;
    } catch (error) {
      const grupoError = error as GrupoResponsavelError;
      toast.error(`Erro ao desassociar grupo: ${grupoError.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    // Dados
    grupos,
    
    // Estados de loading
    isLoading: isLoading || isLoadingGrupos,
    isLoadingGrupos,
    isCreating: createGrupoMutation.isPending,
    isUpdating: updateGrupoMutation.isPending,
    isDeleting: deleteGrupoMutation.isPending,
    isAddingEmail: addEmailMutation.isPending,
    isRemovingEmail: removeEmailMutation.isPending,
    isCreatingPadrao: createGruposPadraoMutation.isPending,
    
    // Erros
    error: errorGrupos,
    
    // Funções de mutação
    criarGrupo: createGrupoMutation.mutateAsync,
    atualizarGrupo: updateGrupoMutation.mutateAsync,
    deletarGrupo: deleteGrupoMutation.mutateAsync,
    adicionarEmail: addEmailMutation.mutateAsync,
    removerEmail: removeEmailMutation.mutateAsync,
    criarGruposPadrao: createGruposPadraoMutation.mutateAsync,
    
    // Funções de consulta
    obterGrupoPorId,
    obterGruposPorEmpresa,
    associarGrupoEmpresa,
    desassociarGrupoEmpresa,
    
    // Funções de controle
    refetch: refetchGrupos,
  };
}

/**
 * Hook para obter um grupo específico por ID
 */
export function useGrupoResponsavel(id: string | null) {
  return useQuery({
    queryKey: ['grupo-responsavel', id],
    queryFn: () => id ? gruposResponsaveisService.obterGrupoPorId(id) : null,
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para obter grupos associados a uma empresa
 */
export function useGruposPorEmpresa(empresaId: string | null) {
  return useQuery({
    queryKey: ['grupos-por-empresa', empresaId],
    queryFn: () => empresaId ? gruposResponsaveisService.obterGruposPorEmpresa(empresaId) : [],
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}