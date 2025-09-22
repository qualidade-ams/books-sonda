import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { historicoService } from '@/services/historicoService';
import type {
  HistoricoDisparoCompleto,
  FiltrosAvancados,
  RelatorioDetalhado,
  ExportacaoConfig,
  EmpresaCliente
} from '@/types/clientBooks';

export const useHistorico = (filtros: FiltrosAvancados) => {
  const queryClient = useQueryClient();

  // Query para buscar histórico detalhado
  const {
    data: historico = [],
    isLoading: isLoadingHistorico,
    error: errorHistorico,
    refetch: refetchHistorico
  } = useQuery({
    queryKey: ['historico-disparos', filtros],
    queryFn: () => historicoService.buscarHistoricoDetalhado(filtros),
    staleTime: 1000 * 30, // ✅ REDUZIDO: 30 segundos (era 2 minutos)
    refetchOnWindowFocus: true, // ✅ HABILITADO: Refetch ao focar na janela
    refetchInterval: 1000 * 60, // ✅ NOVO: Refetch automático a cada 1 minuto
    enabled: true
  });

  // Query para relatório mensal (só executa quando mês e ano estão definidos)
  const {
    data: relatorioMensal,
    isLoading: isLoadingRelatorio,
    error: errorRelatorio,
    refetch: refetchRelatorio
  } = useQuery({
    queryKey: ['relatorio-mensal', filtros.mes, filtros.ano],
    queryFn: () => historicoService.gerarRelatorioMensal(filtros.mes!, filtros.ano!),
    staleTime: 1000 * 30, // ✅ REDUZIDO: 30 segundos (era 5 minutos)
    refetchOnWindowFocus: true, // ✅ HABILITADO: Refetch ao focar na janela
    refetchInterval: 1000 * 60, // ✅ NOVO: Refetch automático a cada 1 minuto
    enabled: !!(filtros.mes && filtros.ano)
  });

  // Query para estatísticas de performance
  const {
    data: estatisticasPerformance,
    isLoading: isLoadingEstatisticas,
    error: errorEstatisticas
  } = useQuery({
    queryKey: ['estatisticas-performance', filtros.dataInicio, filtros.dataFim],
    queryFn: () => {
      const dataInicio = filtros.dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 dias atrás
      const dataFim = filtros.dataFim || new Date();
      return historicoService.buscarEstatisticasPerformance(dataInicio, dataFim);
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });

  // Query para empresas sem books (só executa quando mês e ano estão definidos)
  const {
    data: empresasSemBooks = [],
    isLoading: isLoadingEmpresasSemBooks
  } = useQuery({
    queryKey: ['empresas-sem-books', filtros.mes, filtros.ano],
    queryFn: () => historicoService.identificarEmpresasSemBooks(filtros.mes!, filtros.ano!),
    staleTime: 1000 * 60 * 10, // 10 minutos
    refetchOnWindowFocus: false,
    enabled: !!(filtros.mes && filtros.ano)
  });

  // Query para clientes com falhas
  const {
    data: clientesComFalhas = [],
    isLoading: isLoadingClientesFalhas
  } = useQuery({
    queryKey: ['clientes-com-falhas'],
    queryFn: () => historicoService.buscarClientesComFalhas(10, 3), // Top 10, últimos 3 meses
    staleTime: 1000 * 60 * 15, // 15 minutos
    refetchOnWindowFocus: false
  });

  // Mutation para buscar histórico com novos filtros
  const {
    mutateAsync: buscarHistorico,
    isPending: isBuscandoHistorico
  } = useMutation({
    mutationFn: (novosFiltros: FiltrosAvancados) =>
      historicoService.buscarHistoricoDetalhado(novosFiltros),
    onSuccess: (data, variables) => {
      // Atualizar cache com novos dados
      queryClient.setQueryData(['historico-disparos', variables], data);
    },
    onError: (error) => {
      console.error('Erro ao buscar histórico:', error);
    }
  });

  // Mutation para gerar relatório mensal
  const {
    mutateAsync: gerarRelatorio,
    isPending: isGerandoRelatorio
  } = useMutation({
    mutationFn: ({ mes, ano }: { mes: number; ano: number }) =>
      historicoService.gerarRelatorioMensal(mes, ano),
    onSuccess: (data, variables) => {
      // Atualizar cache do relatório
      queryClient.setQueryData(['relatorio-mensal', variables.mes, variables.ano], data);
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['empresas-sem-books', variables.mes, variables.ano] });
    },
    onError: (error) => {
      console.error('Erro ao gerar relatório:', error);
    }
  });

  // Mutation para exportar dados
  const {
    mutateAsync: exportarDados,
    isPending: isExportando
  } = useMutation({
    mutationFn: (config: ExportacaoConfig) =>
      historicoService.exportarDados(config),
    onError: (error) => {
      console.error('Erro ao exportar dados:', error);
    }
  });

  // Mutation para buscar histórico de empresa específica
  const {
    mutateAsync: buscarHistoricoEmpresa,
    isPending: isBuscandoHistoricoEmpresa
  } = useMutation({
    mutationFn: ({ empresaId, meses }: { empresaId: string; meses?: number }) =>
      historicoService.buscarHistoricoEmpresa(empresaId, meses),
    onError: (error) => {
      console.error('Erro ao buscar histórico da empresa:', error);
    }
  });

  // Funções wrapper para facilitar o uso
  const handleBuscarHistorico = async (novosFiltros: FiltrosAvancados): Promise<HistoricoDisparoCompleto[]> => {
    return await buscarHistorico(novosFiltros);
  };

  const handleGerarRelatorio = async (mes: number, ano: number): Promise<RelatorioDetalhado> => {
    return await gerarRelatorio({ mes, ano });
  };

  const handleExportarDados = async (config: ExportacaoConfig) => {
    return await exportarDados(config);
  };

  const handleBuscarHistoricoEmpresa = async (empresaId: string, meses?: number) => {
    return await buscarHistoricoEmpresa({ empresaId, meses });
  };

  // Função para invalidar cache de histórico (pode ser chamada de outros hooks)
  const invalidateHistoricoCache = () => {
    queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
    queryClient.invalidateQueries({ queryKey: ['relatorio-mensal'] });
    queryClient.invalidateQueries({ queryKey: ['estatisticas-performance'] });
    queryClient.invalidateQueries({ queryKey: ['empresas-sem-books'] });
    queryClient.invalidateQueries({ queryKey: ['clientes-com-falhas'] });
  };

  // Função para atualizar todos os dados
  const refetch = () => {
    refetchHistorico();
    if (filtros.mes && filtros.ano) {
      refetchRelatorio();
    }
    queryClient.invalidateQueries({ queryKey: ['estatisticas-performance'] });
    queryClient.invalidateQueries({ queryKey: ['empresas-sem-books'] });
    queryClient.invalidateQueries({ queryKey: ['clientes-com-falhas'] });
  };

  // Estados de loading combinados
  const isLoading = isLoadingHistorico || isLoadingRelatorio || isLoadingEstatisticas;

  // Erros combinados
  const error = errorHistorico || errorRelatorio || errorEstatisticas;

  return {
    // Data
    historico,
    relatorioMensal,
    estatisticasPerformance,
    empresasSemBooks,
    clientesComFalhas,
    
    // Loading states
    isLoading,
    isLoadingHistorico,
    isLoadingRelatorio,
    isLoadingEstatisticas,
    isLoadingEmpresasSemBooks,
    isLoadingClientesFalhas,
    isBuscandoHistorico,
    isGerandoRelatorio,
    isExportando,
    isBuscandoHistoricoEmpresa,
    
    // Error
    error,
    errorHistorico,
    errorRelatorio,
    errorEstatisticas,
    
    // Actions
    buscarHistorico: handleBuscarHistorico,
    gerarRelatorio: handleGerarRelatorio,
    exportarDados: handleExportarDados,
    buscarHistoricoEmpresa: handleBuscarHistoricoEmpresa,
    invalidateHistoricoCache,
    refetch,
  };
};