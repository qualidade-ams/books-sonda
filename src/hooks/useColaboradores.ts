import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { colaboradoresService, ColaboradorError } from '@/services/colaboradoresService';
import type {
  ColaboradorCompleto,
  ColaboradorFormData,
  ColaboradorFiltros,
} from '@/types/clientBooksTypes';

/**
 * Hook para gerenciamento de colaboradores
 */
export const useColaboradores = (filtros?: ColaboradorFiltros) => {
  const queryClient = useQueryClient();
  const [filtrosAtivos, setFiltrosAtivos] = useState<ColaboradorFiltros>(filtros || {});

  // Query para listar colaboradores
  const {
    data: colaboradores = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['colaboradores', filtrosAtivos],
    queryFn: () => colaboradoresService.listarColaboradores(filtrosAtivos),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para criar colaborador
  const criarMutation = useMutation({
    mutationFn: (data: ColaboradorFormData) => colaboradoresService.criarColaborador(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Colaborador criado com sucesso!');
    },
    onError: (error: ColaboradorError) => {
      toast.error(`Erro ao criar colaborador: ${error.message}`);
    },
  });

  // Mutation para atualizar colaborador
  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ColaboradorFormData> }) =>
      colaboradoresService.atualizarColaborador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Colaborador atualizado com sucesso!');
    },
    onError: (error: ColaboradorError) => {
      toast.error(`Erro ao atualizar colaborador: ${error.message}`);
    },
  });

  // Mutation para atualizar status
  const atualizarStatusMutation = useMutation({
    mutationFn: ({ id, status, descricao }: { id: string; status: string; descricao: string }) =>
      colaboradoresService.atualizarStatus(id, status, descricao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: ColaboradorError) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Mutation para deletar colaborador
  const deletarMutation = useMutation({
    mutationFn: (id: string) => colaboradoresService.deletarColaborador(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Colaborador excluído com sucesso!');
    },
    onError: (error: ColaboradorError) => {
      toast.error(`Erro ao excluir colaborador: ${error.message}`);
    },
  });

  // Função para atualizar filtros
  const atualizarFiltros = (novosFiltros: ColaboradorFiltros) => {
    setFiltrosAtivos(novosFiltros);
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltrosAtivos({});
  };

  return {
    // Dados
    colaboradores,
    isLoading,
    error,
    filtrosAtivos,

    // Ações
    refetch,
    atualizarFiltros,
    limparFiltros,

    // Mutations
    criarColaborador: criarMutation.mutateAsync,
    atualizarColaborador: atualizarMutation.mutateAsync,
    atualizarStatus: atualizarStatusMutation.mutateAsync,
    deletarColaborador: deletarMutation.mutateAsync,

    // Estados das mutations
    isCriando: criarMutation.isPending,
    isAtualizando: atualizarMutation.isPending,
    isAtualizandoStatus: atualizarStatusMutation.isPending,
    isDeletando: deletarMutation.isPending,
  };
};

/**
 * Hook para obter um colaborador específico
 */
export const useColaborador = (id: string) => {
  const {
    data: colaborador,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => colaboradoresService.obterColaboradorPorId(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    colaborador,
    isLoading,
    error,
  };
};

/**
 * Hook para colaboradores de uma empresa específica
 */
export const useColaboradoresPorEmpresa = (empresaId: string) => {
  const {
    data: colaboradores = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['colaboradores', 'empresa', empresaId],
    queryFn: () => colaboradoresService.listarPorEmpresa(empresaId),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    colaboradores,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Hook para obter principal contato de uma empresa
 */
export const usePrincipalContato = (empresaId: string) => {
  const {
    data: principalContato,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['principal-contato', empresaId],
    queryFn: () => colaboradoresService.obterPrincipalContato(empresaId),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    principalContato,
    isLoading,
    error,
  };
};