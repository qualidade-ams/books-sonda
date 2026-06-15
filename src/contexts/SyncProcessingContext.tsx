/**
 * SyncProcessingContext
 * 
 * Context global que gerencia a sincronização com SQL Server em background.
 * Permite que a sincronização continue mesmo ao navegar entre páginas.
 * 
 * Funcionalidades:
 * - Sincronização assíncrona em background (não depende da página montada)
 * - Indicador global de progresso flutuante (lado direito)
 * - Logs detalhados visíveis após conclusão
 * - Registro de última execução por tabela
 * - Notificações de conclusão/erro
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as sqlServerSyncService from '@/services/sqlServerSyncPesquisasService';
import { atualizarSyncMetadata } from '@/services/sqlServerSyncPesquisasService';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TabelasSincronizacao {
  pesquisas: boolean;
  especialistas: boolean;
  apontamentos: boolean;
  tickets: boolean;
  dataInicial?: string;
}

export interface SyncResultado {
  sucesso: boolean;
  total_processados: number;
  novos: number;
  atualizados: number;
  erros: number;
  mensagens: string[];
  totais_reais_banco?: {
    pesquisas: number;
    especialistas: number;
    apontamentos: number;
    tickets: number;
  };
  especialistas?: {
    sucesso: boolean;
    total_processados: number;
    novos: number;
    atualizados: number;
    removidos: number;
    erros: number;
    mensagens: string[];
    selecionado?: boolean;
  };
  apontamentos?: {
    sucesso: boolean;
    total_processados: number;
    novos: number;
    atualizados: number;
    erros: number;
    mensagens: string[];
    selecionado?: boolean;
  };
  tickets?: {
    sucesso: boolean;
    total_processados: number;
    novos: number;
    atualizados: number;
    erros: number;
    mensagens: string[];
    selecionado?: boolean;
  };
  detalhes_erros?: string[];
}

export interface UltimaExecucaoTabela {
  pesquisas: string | null;
  especialistas: string | null;
  apontamentos: string | null;
  tickets: string | null;
}

export interface SyncProgress {
  isProcessing: boolean;
  tabelasSelecionadas: TabelasSincronizacao | null;
  currentMessage: string;
  progress: number;
  resultado: SyncResultado | null;
  concluido: boolean;
  logs: string[];
  completedAt: string | null;
}

interface SyncProcessingContextType {
  syncProgress: SyncProgress;
  isSyncing: boolean;
  ultimaExecucao: UltimaExecucaoTabela;
  startSync: (tabelas: TabelasSincronizacao) => void;
  resetSync: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const SyncProcessingContext = createContext<SyncProcessingContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gerarMensagensProgresso(tabelas: TabelasSincronizacao): string[] {
  const mensagens = ['Conectando ao SQL Server...'];
  
  if (tabelas.pesquisas) {
    mensagens.push('Sincronizando pesquisas (AMSpesquisa)...');
    mensagens.push('Processando dados de pesquisas...');
  }
  
  if (tabelas.especialistas) {
    mensagens.push('Sincronizando especialistas (AMSespecialistas)...');
    mensagens.push('Processando dados de especialistas...');
  }
  
  if (tabelas.apontamentos) {
    mensagens.push('Sincronizando apontamentos (AMSapontamento)...');
    mensagens.push('Processando dados de apontamentos...');
  }
  
  if (tabelas.tickets) {
    mensagens.push('Sincronizando tickets (AMSticketsabertos)...');
    mensagens.push('Processando dados de tickets...');
  }
  
  mensagens.push('Finalizando sincronização...');
  return mensagens;
}

function gerarDescricaoSincronizacao(tabelas: TabelasSincronizacao): string {
  const tabelasAtivas = [];
  if (tabelas.pesquisas) tabelasAtivas.push('pesquisas');
  if (tabelas.especialistas) tabelasAtivas.push('especialistas');
  if (tabelas.apontamentos) tabelasAtivas.push('apontamentos');
  if (tabelas.tickets) tabelasAtivas.push('tickets');

  if (tabelasAtivas.length === 0) return 'Nenhuma tabela selecionada';
  if (tabelasAtivas.length === 1) return `Sincronizando ${tabelasAtivas[0]}`;
  if (tabelasAtivas.length === 2) return `Sincronizando ${tabelasAtivas[0]} e ${tabelasAtivas[1]}`;

  const ultimaTabela = tabelasAtivas.pop();
  return `Sincronizando ${tabelasAtivas.join(', ')} e ${ultimaTabela}`;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const SyncProcessingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    isProcessing: false,
    tabelasSelecionadas: null,
    currentMessage: '',
    progress: 0,
    resultado: null,
    concluido: false,
    logs: [],
    completedAt: null,
  });

  const [ultimaExecucao, setUltimaExecucao] = useState<UltimaExecucaoTabela>({
    pesquisas: null,
    especialistas: null,
    apontamentos: null,
    tickets: null,
  });

  const isProcessingRef = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Adiciona uma mensagem ao log
   */
  const addLog = (mensagem: string) => {
    setSyncProgress(prev => ({
      ...prev,
      logs: [...prev.logs, `[${new Date().toLocaleTimeString('pt-BR')}] ${mensagem}`],
    }));
  };

  /**
   * Inicia a sincronização em background.
   */
  const startSync = useCallback((tabelas: TabelasSincronizacao) => {
    if (isProcessingRef.current) {
      toast({
        title: 'Sincronização em andamento',
        description: 'Aguarde a sincronização atual terminar antes de iniciar outra.',
        variant: 'destructive',
      });
      return;
    }

    isProcessingRef.current = true;

    const tabelasAtivas = [];
    if (tabelas.pesquisas) tabelasAtivas.push('Pesquisas');
    if (tabelas.especialistas) tabelasAtivas.push('Especialistas');
    if (tabelas.apontamentos) tabelasAtivas.push('Apontamentos');
    if (tabelas.tickets) tabelasAtivas.push('Tickets');

    setSyncProgress({
      isProcessing: true,
      tabelasSelecionadas: tabelas,
      currentMessage: 'Conectando ao SQL Server...',
      progress: 0,
      resultado: null,
      concluido: false,
      logs: [`[${new Date().toLocaleTimeString('pt-BR')}] Iniciando sincronização: ${tabelasAtivas.join(', ')}`],
      completedAt: null,
    });

    // Iniciar progresso simulado (a API não retorna progresso parcial)
    const mensagens = gerarMensagensProgresso(tabelas);
    const totalMensagens = mensagens.length;
    let currentProgress = 0;
    let mensagemIndex = 0;

    progressIntervalRef.current = setInterval(() => {
      const incremento = 90 / (totalMensagens * 8);
      currentProgress += incremento;

      const novoIndex = Math.floor((currentProgress / 90) * totalMensagens);
      if (novoIndex < totalMensagens && novoIndex !== mensagemIndex) {
        mensagemIndex = novoIndex;
        const novaMensagem = mensagens[mensagemIndex];
        setSyncProgress(prev => ({
          ...prev,
          currentMessage: novaMensagem,
          logs: [...prev.logs, `[${new Date().toLocaleTimeString('pt-BR')}] ${novaMensagem}`],
        }));
      }

      if (currentProgress >= 90) {
        currentProgress = 90;
        setSyncProgress(prev => ({
          ...prev,
          progress: 90,
          currentMessage: 'Finalizando sincronização...',
        }));
      } else {
        setSyncProgress(prev => ({
          ...prev,
          progress: currentProgress,
        }));
      }
    }, 200);

    // Executar a sincronização real
    executarSync(tabelas);
  }, []);

  /**
   * Executa a sincronização e atualiza o estado ao concluir.
   */
  const executarSync = async (tabelas: TabelasSincronizacao) => {
    try {
      console.log('🔄 [SyncProcessingContext] Iniciando sincronização com tabelas:', tabelas);
      
      const resultado = await sqlServerSyncService.sincronizarDados(tabelas);

      // Parar progresso simulado
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['especialistas-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['apontamentos-aranda'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-apontamentos'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-aranda'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['sql-server-ultima-sincronizacao'] });
      queryClient.invalidateQueries({ queryKey: ['ultima-sincronizacao-especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['sql-server-ultimas-sincronizacoes-por-tabela'] });

      // Registrar data de execução por tabela
      const agora = new Date().toISOString();
      setUltimaExecucao(prev => ({
        pesquisas: tabelas.pesquisas ? agora : prev.pesquisas,
        especialistas: tabelas.especialistas ? agora : prev.especialistas,
        apontamentos: tabelas.apontamentos ? agora : prev.apontamentos,
        tickets: tabelas.tickets ? agora : prev.tickets,
      }));

      // Atualizar sync_metadata no banco (persistente)
      if (tabelas.pesquisas) {
        atualizarSyncMetadata('pesquisas', {
          sucesso: resultado.sucesso,
          processados: resultado.total_processados,
          novos: resultado.novos,
          atualizados: resultado.atualizados,
          erros: resultado.erros,
        });
      }
      if (tabelas.especialistas && resultado.especialistas) {
        atualizarSyncMetadata('especialistas', {
          sucesso: resultado.especialistas.sucesso,
          processados: resultado.especialistas.total_processados,
          novos: resultado.especialistas.novos,
          atualizados: resultado.especialistas.atualizados,
          erros: resultado.especialistas.erros,
        });
      }
      if (tabelas.apontamentos && resultado.apontamentos) {
        atualizarSyncMetadata('apontamentos', {
          sucesso: resultado.apontamentos.sucesso,
          processados: resultado.apontamentos.total_processados,
          novos: resultado.apontamentos.novos,
          atualizados: resultado.apontamentos.atualizados,
          erros: resultado.apontamentos.erros,
        });
      }
      if (tabelas.tickets && resultado.tickets) {
        atualizarSyncMetadata('tickets', {
          sucesso: resultado.tickets.sucesso,
          processados: resultado.tickets.total_processados,
          novos: resultado.tickets.novos,
          atualizados: resultado.tickets.atualizados,
          erros: resultado.tickets.erros,
        });
      }

      // Montar logs finais
      const logsConclusao: string[] = [];
      const timestampLog = `[${new Date().toLocaleTimeString('pt-BR')}]`;
      
      logsConclusao.push(`${timestampLog} ✅ Sincronização concluída`);
      
      if (tabelas.pesquisas) {
        logsConclusao.push(`${timestampLog} 📊 Pesquisas: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.erros} erros`);
      }
      if (tabelas.especialistas && resultado.especialistas) {
        logsConclusao.push(`${timestampLog} 👥 Especialistas: ${resultado.especialistas.novos} novos, ${resultado.especialistas.atualizados} atualizados, ${resultado.especialistas.removidos || 0} removidos`);
      }
      if (tabelas.apontamentos && resultado.apontamentos) {
        logsConclusao.push(`${timestampLog} 📝 Apontamentos: ${resultado.apontamentos.novos} novos, ${resultado.apontamentos.atualizados} atualizados`);
      }
      if (tabelas.tickets && resultado.tickets) {
        logsConclusao.push(`${timestampLog} 🎫 Tickets: ${resultado.tickets.novos} novos, ${resultado.tickets.atualizados} atualizados`);
      }

      // Adicionar mensagens detalhadas do resultado
      if (resultado.mensagens && resultado.mensagens.length > 0) {
        resultado.mensagens.forEach(msg => {
          logsConclusao.push(`${timestampLog} ℹ️ ${msg}`);
        });
      }

      // Atualizar estado com resultado
      setSyncProgress(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        currentMessage: 'Sincronização concluída!',
        resultado: resultado as SyncResultado,
        concluido: true,
        logs: [...prev.logs, ...logsConclusao],
        completedAt: agora,
      }));

      // Toast de sucesso
      const descricao = gerarDescricaoSincronizacao(tabelas);
      if (resultado.sucesso) {
        toast({
          title: 'Sincronização concluída',
          description: `${descricao} finalizada com sucesso. ${resultado.novos} novos, ${resultado.atualizados} atualizados.`,
        });
      } else {
        toast({
          title: 'Sincronização com erros',
          description: `${descricao} finalizada com ${resultado.erros} erro(s).`,
          variant: 'destructive',
        });
      }

      console.log('✅ [SyncProcessingContext] Sincronização concluída:', resultado);
    } catch (error) {
      // Parar progresso simulado
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }

      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      const timestampLog = `[${new Date().toLocaleTimeString('pt-BR')}]`;

      setSyncProgress(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        currentMessage: 'Erro na sincronização',
        resultado: {
          sucesso: false,
          total_processados: 0,
          novos: 0,
          atualizados: 0,
          erros: 1,
          mensagens: [errorMsg],
        },
        concluido: true,
        logs: [...prev.logs, `${timestampLog} ❌ Erro: ${errorMsg}`],
        completedAt: new Date().toISOString(),
      }));

      toast({
        title: 'Erro na sincronização',
        description: `Falha ao sincronizar: ${errorMsg}`,
        variant: 'destructive',
      });

      console.error('❌ [SyncProcessingContext] Erro na sincronização:', error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  /**
   * Reseta o estado (fecha o indicador após conclusão).
   */
  const resetSync = useCallback(() => {
    if (!isProcessingRef.current) {
      setSyncProgress({
        isProcessing: false,
        tabelasSelecionadas: null,
        currentMessage: '',
        progress: 0,
        resultado: null,
        concluido: false,
        logs: [],
        completedAt: null,
      });
    }
  }, []);

  return (
    <SyncProcessingContext.Provider value={{
      syncProgress,
      isSyncing: syncProgress.isProcessing,
      ultimaExecucao,
      startSync,
      resetSync,
    }}>
      {children}
    </SyncProcessingContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSyncProcessing() {
  const context = useContext(SyncProcessingContext);
  if (!context) {
    throw new Error('useSyncProcessing deve ser usado dentro de SyncProcessingProvider');
  }
  return context;
}
