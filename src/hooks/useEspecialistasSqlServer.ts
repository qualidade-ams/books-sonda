/**
 * Hook para gerenciamento de sincronização de especialistas com SQL Server
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as sqlServerSyncEspecialistasService from '@/services/sqlServerSyncEspecialistasService';

// ============================================
// QUERIES
// ============================================

/**
 * Hook para verificar última sincronização de especialistas
 */
export function useUltimaSincronizacaoEspecialistas() {
  return useQuery({
    queryKey: ['ultima-sincronizacao-especialistas'],
    queryFn: sqlServerSyncEspecialistasService.verificarUltimaSincronizacaoEspecialistas,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para testar conexão com tabela AMSespecialistas
 */
export function useTestarConexaoEspecialistas() {
  return useQuery({
    queryKey: ['testar-conexao-especialistas'],
    queryFn: sqlServerSyncEspecialistasService.testarConexaoEspecialistas,
    enabled: false, // Só executa quando chamado manualmente
    retry: false
  });
}

/**
 * Hook para obter estrutura da tabela AMSespecialistas
 */
export function useEstruturaEspecialistas() {
  return useQuery({
    queryKey: ['estrutura-especialistas'],
    queryFn: sqlServerSyncEspecialistasService.obterEstruturaEspecialistas,
    enabled: false, // Só executa quando chamado manualmente
    retry: false
  });
}

// ============================================
// MUTATIONS
// ============================================

/**
 * Hook para sincronizar especialistas do SQL Server
 */
export function useSincronizarEspecialistas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sqlServerSyncEspecialistasService.sincronizarEspecialistas,
    onSuccess: (resultado) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['ultima-sincronizacao-especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['estatisticas-especialistas'] });

      // Mostrar resultado
      if (resultado.sucesso) {
        toast.success(
          `Sincronização concluída: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.removidos} removidos`,
          {
            description: resultado.mensagens.join('. '),
            duration: 5000
          }
        );
      } else {
        toast.error('Erro na sincronização de especialistas', {
          description: resultado.mensagens.join('. '),
          duration: 8000
        });
      }
    },
    onError: (error) => {
      console.error('Erro na sincronização de especialistas:', error);
      toast.error('Erro ao sincronizar especialistas', {
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        duration: 8000
      });
    }
  });
}

/**
 * Hook para configurar SQL Server para especialistas
 */
export function useConfigurarSqlServerEspecialistas() {
  return useMutation({
    mutationFn: (config: {
      server: string;
      database: string;
      user: string;
      password: string;
      table: string;
    }) => {
      sqlServerSyncEspecialistasService.configurarSqlServer(config);
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success('Configuração SQL Server atualizada para especialistas');
    },
    onError: (error) => {
      console.error('Erro ao configurar SQL Server:', error);
      toast.error('Erro ao configurar SQL Server para especialistas');
    }
  });
}