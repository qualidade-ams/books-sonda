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
 */
export function useSincronizarSqlServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sqlServerSyncService.sincronizarDados(),
    onSuccess: (resultado) => {
      // Invalidar todas as queries relacionadas a pesquisas
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ultimaSincronizacao });

      if (resultado.sucesso) {
        toast.success(
          `Sincronização concluída! ${resultado.novos} novos, ${resultado.atualizados} atualizados`,
          { duration: 5000 }
        );
      } else {
        toast.warning(
          `Sincronização com erros: ${resultado.erros} falhas`,
          { duration: 5000 }
        );
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
