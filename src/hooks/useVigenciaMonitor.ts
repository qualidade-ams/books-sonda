/**
 * Hook para monitoramento de vigências de contratos
 * Fornece funcionalidades para verificar e gerenciar vigências vencidas
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vigenciaService, VigenciaStatus, VigenciaStats } from '@/services/vigenciaService';
import { toast } from 'sonner';

export interface UseVigenciaMonitorOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableNotifications?: boolean;
  notificationMode?: 'auto' | 'manual' | 'none';
}

export function useVigenciaMonitor(options: UseVigenciaMonitorOptions = {}) {
  const {
    autoRefresh = true,
    refreshInterval = 10 * 60 * 1000, // 10 minutos (menos frequente)
    enableNotifications = true,
    notificationMode = 'auto'
  } = options;

  const queryClient = useQueryClient();
  const [ultimaVerificacao, setUltimaVerificacao] = useState<Date | null>(null);

  // Query para status de vigências
  const {
    data: statusVigencias,
    isLoading: carregandoStatus,
    error: erroStatus,
    refetch: recarregarStatus
  } = useQuery({
    queryKey: ['vigencias-status'],
    queryFn: () => vigenciaService.consultarStatusVigencias(),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Query para estatísticas
  const {
    data: estatisticas,
    isLoading: carregandoEstatisticas,
    refetch: recarregarEstatisticas
  } = useQuery({
    queryKey: ['vigencias-estatisticas'],
    queryFn: () => vigenciaService.obterEstatisticasVigencia(),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 8 * 60 * 1000, // 8 minutos
  });

  // Query para logs
  const {
    data: logs,
    isLoading: carregandoLogs,
    refetch: recarregarLogs
  } = useQuery({
    queryKey: ['vigencias-logs'],
    queryFn: () => vigenciaService.obterLogsInativacao(20),
    refetchInterval: autoRefresh ? refreshInterval * 2 : false, // Menos frequente
    staleTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutation para inativação automática
  const inativacaoAutomatica = useMutation({
    mutationFn: () => vigenciaService.executarInativacaoAutomatica(),
    onSuccess: (empresasInativadas) => {
      setUltimaVerificacao(new Date());
      
      if (empresasInativadas > 0) {
        toast.success(
          `Inativação automática concluída: ${empresasInativadas} empresa(s) inativada(s)`,
          { duration: 5000 }
        );
      } else {
        toast.info('Verificação concluída: nenhuma empresa precisou ser inativada');
      }

      // Recarregar dados
      queryClient.invalidateQueries({ queryKey: ['vigencias-status'] });
      queryClient.invalidateQueries({ queryKey: ['vigencias-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['vigencias-logs'] });
    },
    onError: (error) => {
      console.error('Erro na inativação automática:', error);
      toast.error('Erro ao executar inativação automática');
    }
  });

  // Mutation para verificar empresa específica
  const verificarEmpresa = useMutation({
    mutationFn: (empresaId: string) => vigenciaService.verificarEmpresaEspecifica(empresaId),
    onSuccess: (foiInativada, empresaId) => {
      if (foiInativada) {
        toast.success('Empresa inativada por vigência vencida');
        queryClient.invalidateQueries({ queryKey: ['vigencias-status'] });
        queryClient.invalidateQueries({ queryKey: ['vigencias-estatisticas'] });
      } else {
        toast.info('Empresa verificada: vigência ainda válida ou não definida');
      }
    },
    onError: (error) => {
      console.error('Erro ao verificar empresa:', error);
      toast.error('Erro ao verificar empresa específica');
    }
  });

  // Função para executar verificação manual
  const executarVerificacaoManual = useCallback(async () => {
    try {
      await inativacaoAutomatica.mutateAsync();
    } catch (error) {
      console.error('Erro na verificação manual:', error);
    }
  }, [inativacaoAutomatica]);

  // Função para verificar empresa específica
  const verificarEmpresaEspecifica = useCallback(async (empresaId: string) => {
    try {
      await verificarEmpresa.mutateAsync(empresaId);
    } catch (error) {
      console.error('Erro ao verificar empresa específica:', error);
    }
  }, [verificarEmpresa]);

  // Função para recarregar todos os dados
  const recarregarTodos = useCallback(async () => {
    await Promise.all([
      recarregarStatus(),
      recarregarEstatisticas(),
      recarregarLogs()
    ]);
  }, [recarregarStatus, recarregarEstatisticas, recarregarLogs]);

  // Função para dispensar notificações
  const dispensarNotificacoes = useCallback(() => {
    setNotificacoesExibidas({ vencidas: true, vencendoBreve: true });
  }, []);

  // Calcular resumo das vigências
  const resumoVigencias = useMemo(() => {
    if (!statusVigencias) return null;

    const vencidas = statusVigencias.filter(v => v.status_vigencia === 'VENCIDA');
    const vencendoBreve = statusVigencias.filter(v => v.status_vigencia === 'VENCE_BREVE');
    const ok = statusVigencias.filter(v => v.status_vigencia === 'OK');

    return {
      total: statusVigencias.length,
      vencidas: vencidas.length,
      vencendoBreve: vencendoBreve.length,
      ok: ok.length,
      empresasVencidas: vencidas,
      empresasVencendoBreve: vencendoBreve
    };
  }, [statusVigencias]);

  // Estado para controlar se já mostrou notificações nesta sessão
  const [notificacoesExibidas, setNotificacoesExibidas] = useState<{
    vencidas: boolean;
    vencendoBreve: boolean;
  }>({ vencidas: false, vencendoBreve: false });

  // Notificações automáticas para vigências críticas (apenas uma vez por sessão)
  useEffect(() => {
    if (!enableNotifications || !resumoVigencias || notificationMode === 'none') return;

    const { vencidas, vencendoBreve } = resumoVigencias;

    // Mostrar notificação de vigências vencidas apenas uma vez
    if (vencidas > 0 && !notificacoesExibidas.vencidas) {
      toast.warning(
        `Atenção: ${vencidas} empresa(s) com vigência vencida`,
        { 
          duration: 8000,
          action: {
            label: 'Verificar',
            onClick: executarVerificacaoManual
          }
        }
      );
      setNotificacoesExibidas(prev => ({ ...prev, vencidas: true }));
    }

    // Mostrar notificação de vigências vencendo apenas uma vez
    if (vencendoBreve > 0 && !notificacoesExibidas.vencendoBreve) {
      toast.info(
        `Aviso: ${vencendoBreve} empresa(s) com vigência vencendo em até 30 dias`,
        { duration: 6000 }
      );
      setNotificacoesExibidas(prev => ({ ...prev, vencendoBreve: true }));
    }

    // Reset das notificações se não há mais problemas
    if (vencidas === 0 && notificacoesExibidas.vencidas) {
      setNotificacoesExibidas(prev => ({ ...prev, vencidas: false }));
    }
    if (vencendoBreve === 0 && notificacoesExibidas.vencendoBreve) {
      setNotificacoesExibidas(prev => ({ ...prev, vencendoBreve: false }));
    }
  }, [resumoVigencias, enableNotifications, executarVerificacaoManual, notificacoesExibidas]);

  // Função para validar vigências
  const validarVigencias = useCallback((vigenciaInicial?: string, vigenciaFinal?: string) => {
    return vigenciaService.validarVigencias(vigenciaInicial, vigenciaFinal);
  }, []);

  // Função para calcular dias restantes
  const calcularDiasRestantes = useCallback((vigenciaFinal: string) => {
    return vigenciaService.calcularDiasRestantes(vigenciaFinal);
  }, []);

  return {
    // Dados
    statusVigencias,
    estatisticas,
    logs,
    resumoVigencias,
    ultimaVerificacao,

    // Estados de carregamento
    carregando: carregandoStatus || carregandoEstatisticas,
    carregandoStatus,
    carregandoEstatisticas,
    carregandoLogs,
    executandoVerificacao: inativacaoAutomatica.isPending,
    verificandoEmpresa: verificarEmpresa.isPending,

    // Erros
    erro: erroStatus,
    erroStatus,

    // Ações
    executarVerificacaoManual,
    verificarEmpresaEspecifica,
    recarregarTodos,
    recarregarStatus,
    recarregarEstatisticas,
    recarregarLogs,
    dispensarNotificacoes,

    // Utilitários
    validarVigencias,
    calcularDiasRestantes
  };
}

// Hook simplificado para uso em componentes que só precisam de estatísticas
export function useVigenciaStats() {
  const { estatisticas, carregandoEstatisticas, recarregarEstatisticas } = useVigenciaMonitor({
    autoRefresh: true,
    enableNotifications: false,
    notificationMode: 'none',
    refreshInterval: 15 * 60 * 1000 // 15 minutos para estatísticas
  });

  return {
    estatisticas,
    carregando: carregandoEstatisticas,
    recarregar: recarregarEstatisticas
  };
}

// Hook para validação de formulários
export function useVigenciaValidation() {
  const validarVigencias = useCallback((vigenciaInicial?: string, vigenciaFinal?: string) => {
    return vigenciaService.validarVigencias(vigenciaInicial, vigenciaFinal);
  }, []);

  const calcularDiasRestantes = useCallback((vigenciaFinal: string) => {
    return vigenciaService.calcularDiasRestantes(vigenciaFinal);
  }, []);

  return {
    validarVigencias,
    calcularDiasRestantes
  };
}