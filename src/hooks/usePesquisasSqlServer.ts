/**
 * Hook para sincronização com SQL Server
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sqlServerSyncService from '@/services/sqlServerSyncPesquisasService';

// ============================================
// QUERY KEYS
// ============================================

const QUERY_KEYS = {
  ultimaSincronizacao: ['sql-server-ultima-sincronizacao'],
  ultimasSincronizacoesPorTabela: ['sql-server-ultimas-sincronizacoes-por-tabela']
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

/**
 * Hook para verificar última sincronização de cada tabela individualmente
 */
export function useUltimasSincronizacoesPorTabela() {
  return useQuery({
    queryKey: QUERY_KEYS.ultimasSincronizacoesPorTabela,
    queryFn: () => sqlServerSyncService.verificarUltimasSincronizacoesPorTabela(),
    staleTime: 60000, // 1 minuto
    refetchInterval: 300000 // 5 minutos
  });
}

// ============================================
// MUTATIONS
// ============================================

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
