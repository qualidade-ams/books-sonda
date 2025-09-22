import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksDisparoService } from '@/services/booksDisparoService';
import type {
  StatusMensal,
  AgendamentoDisparo,
  DisparoResult
} from '@/types/clientBooks';

export const useControleDisparosPersonalizados = (mes: number, ano: number) => {
  const queryClient = useQueryClient();

  // Query para buscar status mensal de empresas personalizadas
  const {
    data: statusMensal = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['controle-disparos-personalizados', mes, ano],
    queryFn: () => booksDisparoService.obterStatusMensalPersonalizados(mes, ano),
    staleTime: 1000 * 60 * 1, // 1 minuto
    refetchOnWindowFocus: true, // Refetch ao focar na janela
  });

  // Função para invalidar todos os caches relacionados
  const invalidateAllCaches = () => {
    queryClient.invalidateQueries({ queryKey: ['controle-disparos-personalizados'] });
    queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
    queryClient.invalidateQueries({ queryKey: ['relatorio-mensal'] });
    queryClient.invalidateQueries({ queryKey: ['estatisticas-performance'] });
    queryClient.invalidateQueries({ queryKey: ['empresas-sem-books'] });
    queryClient.invalidateQueries({ queryKey: ['clientes-com-falhas'] });
  };

  // Mutation para disparo por empresas selecionadas
  const {
    mutateAsync: dispararSelecionados,
    isPending: isDisparandoSelecionados
  } = useMutation({
    mutationFn: ({ mes, ano, empresaIds, forceResend = false }: { mes: number; ano: number; empresaIds: string[]; forceResend?: boolean }) =>
      booksDisparoService.dispararEmpresasPersonalizadasSelecionadas(mes, ano, empresaIds, { forceResend }),
    onSuccess: () => {
      invalidateAllCaches();
    },
    onError: (error) => {
      console.error('Erro no disparo personalizado por seleção:', error);
    }
  });

  // Mutation para disparo mensal personalizado
  const {
    mutateAsync: dispararBooksPersonalizados,
    isPending: isDisparando
  } = useMutation({
    mutationFn: ({ mes, ano }: { mes: number; ano: number }) =>
      booksDisparoService.dispararBooksPersonalizados(mes, ano),
    onSuccess: () => {
      invalidateAllCaches();
    },
    onError: (error) => {
      console.error('Erro no disparo personalizado mensal:', error);
    }
  });

  // Mutation para reenvio de falhas personalizadas
  const {
    mutateAsync: reenviarFalhas,
    isPending: isReenviando
  } = useMutation({
    mutationFn: ({ mes, ano }: { mes: number; ano: number }) =>
      booksDisparoService.reenviarFalhasPersonalizadas(mes, ano),
    onSuccess: () => {
      invalidateAllCaches();
    },
    onError: (error) => {
      console.error('Erro no reenvio de falhas personalizadas:', error);
    }
  });

  // Mutation para agendamento (reutiliza o método existente)
  const {
    mutateAsync: agendarDisparo,
    isPending: isAgendando
  } = useMutation({
    mutationFn: (agendamento: AgendamentoDisparo) =>
      booksDisparoService.agendarDisparo(agendamento),
    onSuccess: () => {
      invalidateAllCaches();
    },
    onError: (error) => {
      console.error('Erro no agendamento personalizado:', error);
    }
  });

  // Funções wrapper para facilitar o uso
  const handleDispararBooksPersonalizados = async (mes: number, ano: number): Promise<DisparoResult> => {
    return await dispararBooksPersonalizados({ mes, ano });
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
    dispararBooksPersonalizados: handleDispararBooksPersonalizados,
    reenviarFalhas: handleReenviarFalhas,
    agendarDisparo: handleAgendarDisparo,
    dispararSelecionados: handleDispararSelecionados,
    reenviarSelecionados: handleReenviarSelecionados,
    refetch,
  };
};