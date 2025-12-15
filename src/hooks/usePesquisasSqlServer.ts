/**
 * Hook para sincronização com SQL Server
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sqlServerSyncService from '@/services/sqlServerSyncPesquisasService';

// ============================================
// QUERY KEYS
// ============================================

const QUERY_KEYS = {
  ultimaSincronizacao: ['sql-server-ultima-sincronizacao']
};

// ============================================
// QUERIES
// ============================================

/**
 * Hook para verificar última sincronização
 */
export function useUltimaSincronizacao() {
  return useQuery({
    queryKey: QUERY_KEYS.ultimaSincronizacao,
    queryFn: () => sqlServerSyncService.verificarUltimaSincronizacao(),
    staleTime: 60000, // 1 minuto
    refetchInterval: 300000 // 5 minutos
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Hook para sincronizar dados do SQL Server
 * AGORA INCLUI: Pesquisas + Especialistas
 */
export function useSincronizarSqlServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sqlServerSyncService.sincronizarDados(),
    onSuccess: (resultado) => {
      // Invalidar todas as queries relacionadas a pesquisas E especialistas
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['especialistas-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ultimaSincronizacao });
      queryClient.invalidateQueries({ queryKey: ['ultima-sincronizacao-especialistas'] });

      // Mostrar resultado das pesquisas
      if (resultado.sucesso) {
        toast.success(
          `Pesquisas sincronizadas! ${resultado.novos} novos, ${resultado.atualizados} atualizados`,
          { duration: 4000 }
        );
      } else {
        toast.warning(
          `Pesquisas com erros: ${resultado.erros} falhas`,
          { duration: 4000 }
        );
      }

      // Mostrar resultado dos especialistas
      if (resultado.especialistas) {
        if (resultado.especialistas.sucesso) {
          toast.success(
            `Especialistas sincronizados! ${resultado.especialistas.novos} novos, ${resultado.especialistas.atualizados} atualizados, ${resultado.especialistas.removidos} removidos`,
            { duration: 4000 }
          );
        } else {
          toast.warning(
            `Especialistas com erros: ${resultado.especialistas.erros} falhas`,
            { duration: 4000 }
          );
        }
      }

      // Exibir mensagens detalhadas
      resultado.mensagens.forEach(msg => {
        console.log('📊 Sincronização:', msg);
      });

      // Exibir erros se houver
      if (resultado.detalhes_erros && resultado.detalhes_erros.length > 0) {
        console.error('❌ Erros na sincronização:', resultado.detalhes_erros);
      }
    },
    onError: (error: Error) => {
      console.error('Erro ao sincronizar com SQL Server:', error);
      toast.error(`Erro na sincronização: ${error.message}`);
    }
  });
}

/**
 * Hook para testar conexão com SQL Server
 */
export function useTestarConexaoSqlServer() {
  return useMutation({
    mutationFn: () => sqlServerSyncService.testarConexao(),
    onSuccess: (sucesso) => {
      if (sucesso) {
        toast.success('Conexão com SQL Server estabelecida!');
      } else {
        toast.error('Falha ao conectar com SQL Server');
      }
    },
    onError: (error: Error) => {
      console.error('Erro ao testar conexão:', error);
      toast.error(`Erro ao testar conexão: ${error.message}`);
    }
  });
}

/**
 * Hook para configurar SQL Server
 */
export function useConfigurarSqlServer() {
  return useMutation({
    mutationFn: (config: {
      server: string;
      database: string;
      user: string;
      password: string;
      table: string;
    }) => {
      sqlServerSyncService.configurarSqlServer(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Configuração SQL Server atualizada!');
    },
    onError: (error: Error) => {
      console.error('Erro ao configurar SQL Server:', error);
      toast.error(`Erro na configuração: ${error.message}`);
    }
  });
}
