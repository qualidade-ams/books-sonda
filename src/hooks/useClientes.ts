import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { clientesService, ClienteError } from '@/services/clientesService';
import type {
  ClienteCompleto,
  ClienteFormData,
  ClienteFiltros,
} from '@/types/clientBooksTypes';

/**
 * Hook para gerenciamento de clientes
 */
export const useClientes = (filtros?: ClienteFiltros) => {
  const queryClient = useQueryClient();
  const [filtrosAtivos, setFiltrosAtivos] = useState<ClienteFiltros>(filtros || {});

  // Query para listar clientes
  const {
    data: clientes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clientes', filtrosAtivos],
    queryFn: () => clientesService.listarClientes(filtrosAtivos),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para criar cliente
  const criarMutation = useMutation({
    mutationFn: (data: ClienteFormData) => clientesService.criarCliente(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error: ClienteError) => {
      toast.error(`Erro ao criar cliente: ${error.message}`);
    },
  });

  // Mutation para atualizar cliente
  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClienteFormData> }) =>
      clientesService.atualizarCliente(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente atualizado com sucesso!');
    },
    onError: (error: ClienteError) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });

  // Mutation para atualizar status
  const atualizarStatusMutation = useMutation({
    mutationFn: ({ id, status, descricao }: { id: string; status: string; descricao: string }) =>
      clientesService.atualizarStatus(id, status, descricao),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: ClienteError) => {
      toast.error(`Erro ao atualizar status: ${error.message}`);
    },
  });

  // Mutation para deletar cliente
  const deletarMutation = useMutation({
    mutationFn: (id: string) => clientesService.deletarCliente(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente excluído com sucesso!');
    },
    onError: (error: ClienteError) => {
      toast.error(`Erro ao excluir cliente: ${error.message}`);
    },
  });

  // Função para atualizar filtros
  const atualizarFiltros = (novosFiltros: ClienteFiltros) => {
    setFiltrosAtivos(novosFiltros);
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltrosAtivos({});
  };

  return {
    // Dados
    clientes,
    isLoading,
    error,
    filtrosAtivos,

    // Ações
    refetch,
    atualizarFiltros,
    limparFiltros,

    // Mutations
    criarCliente: criarMutation.mutateAsync,
    atualizarCliente: atualizarMutation.mutateAsync,
    atualizarStatus: atualizarStatusMutation.mutateAsync,
    deletarCliente: deletarMutation.mutateAsync,

    // Estados das mutations
    isCriando: criarMutation.isPending,
    isAtualizando: atualizarMutation.isPending,
    isAtualizandoStatus: atualizarStatusMutation.isPending,
    isDeletando: deletarMutation.isPending,
  };
};

/**
 * Hook para obter um cliente específico
 */
export const useCliente = (id: string) => {
  const {
    data: cliente,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesService.obterClientePorId(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    cliente,
    isLoading,
    error,
  };
};

/**
 * Hook para clientes de uma empresa específica
 */
export const useClientesPorEmpresa = (empresaId: string) => {
  const {
    data: clientes = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['clientes', 'empresa', empresaId],
    queryFn: () => clientesService.listarPorEmpresa(empresaId),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    clientes,
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
    queryFn: () => clientesService.obterPrincipalContato(empresaId),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    principalContato,
    isLoading,
    error,
  };
};