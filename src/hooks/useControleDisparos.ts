import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksDisparoService } from '@/services/booksDisparoService';
import type {
  StatusMensal,
  AgendamentoDisparo,
  DisparoResult
} from '@/types/clientBooks';

export const useControleDisparos = (mes: number, ano: number) => {
  const queryClient = useQueryClient();

  // Query para buscar status mensal
  const {
    data: statusMensal = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['controle-disparos', mes, ano],
    queryFn: () => booksDisparoService.obterStatusMensal(mes, ano),
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false,
  });

  // Mutation para disparo por empresas selecionadas
  const {
    mutateAsync: dispararSelecionados,
    isPending: isDisparandoSelecionados
  } = useMutation({
    mutationFn: ({ mes, ano, empresaIds, forceResend = false }: { mes: number; ano: number; empresaIds: string[]; forceResend?: boolean }) =>
      booksDisparoService.dispararEmpresasSelecionadas(mes, ano, empresaIds, { forceResend }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
    },
    onError: (error) => {
      console.error('Erro no disparo por seleção:', error);
    }
  });

  // Mutation para disparo mensal
  const {
    mutateAsync: dispararBooksMensal,
    isPending: isDisparando
  } = useMutation({
    mutationFn: ({ mes, ano }: { mes: number; ano: number }) =>
      booksDisparoService.dispararBooksMensal(mes, ano),
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
    },
    onError: (error) => {
      console.error('Erro no disparo mensal:', error);
    }
  });

  // Mutation para reenvio de falhas
  const {
    mutateAsync: reenviarFalhas,
    isPending: isReenviando
  } = useMutation({
    mutationFn: ({ mes, ano }: { mes: number; ano: number }) =>
      booksDisparoService.reenviarFalhas(mes, ano),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
    },
    onError: (error) => {
      console.error('Erro no reenvio de falhas:', error);
    }
  });

  // Mutation para agendamento
  const {
    mutateAsync: agendarDisparo,
    isPending: isAgendando
  } = useMutation({
    mutationFn: (agendamento: AgendamentoDisparo) =>
      booksDisparoService.agendarDisparo(agendamento),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
      queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
    },
    onError: (error) => {
      console.error('Erro no agendamento:', error);
    }
  });

  // Funções wrapper para facilitar o uso
  const handleDispararBooksMensal = async (mes: number, ano: number): Promise<DisparoResult> => {
    return await dispararBooksMensal({ mes, ano });
  };

  const handleReenviarFalhas = async (mes: number, ano: number): Promise<DisparoResult> => {
    return await reenviarFalhas({ mes, ano });
  };

  const handleAgendarDisparo = async (agendamento: AgendamentoDisparo): Promise<void> => {
    return await agendarDisparo(agendamento);
  };

  const handleDispararSelecionados = async (mes: number, ano: number, empresaIds: string[]): Promise<DisparoResult> => {
    return await dispararSelecionados({ mes, ano, empresaIds, forceResend: false });
  };

  const handleReenviarSelecionados = async (mes: number, ano: number, empresaIds: string[]): Promise<DisparoResult> => {
    return await dispararSelecionados({ mes, ano, empresaIds, forceResend: true });
  };

  return {
    // Data
    statusMensal,
    
    // Loading states
    isLoading,
    isDisparando,
    isReenviando,
    isDisparandoSelecionados,
    isAgendando,
    
    // Error
    error,
    
    // Actions
    dispararBooksMensal: handleDispararBooksMensal,
    reenviarFalhas: handleReenviarFalhas,
    agendarDisparo: handleAgendarDisparo,
    dispararSelecionados: handleDispararSelecionados,
    reenviarSelecionados: handleReenviarSelecionados,
    refetch,
  };
};