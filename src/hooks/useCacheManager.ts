import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cacheManager } from '@/services/cacheManager';
import { toast } from 'sonner';

/**
 * Hook para gerenciamento avançado de cache
 * Fornece funcionalidades para limpeza, invalidação e monitoramento de cache
 */
export const useCacheManager = () => {
  const queryClient = useQueryClient();

  /**
   * Limpa todo o cache do sistema
   */
  const clearAllCache = useCallback(async () => {
    try {
      console.info('🧹 Limpando todo o cache do sistema...');
      
      // Limpar React Query cache
      await queryClient.clear();
      
      // Limpar cache do sistema
      cacheManager.clear();
      
      // Limpar localStorage relacionado ao cache
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('query_') ||
        key.includes('_cache') ||
        key.startsWith('sidebar_')
      );
      
      localStorageKeys.forEach(key => localStorage.removeItem(key));
      
      // Limpar sessionStorage relacionado ao cache (exceto cache_initialized)
      const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('cache_') || 
        key.startsWith('query_') ||
        key.includes('_cache')
      ).filter(key => key !== 'cache_initialized');
      
      sessionStorageKeys.forEach(key => sessionStorage.removeItem(key));
      
      console.info('✅ Cache limpo com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
      return false;
    }
  }, [queryClient]);

  /**
   * Invalida cache específico por padrão de chave
   */
  const invalidateCache = useCallback(async (pattern: string | string[]) => {
    try {
      const patterns = Array.isArray(pattern) ? pattern : [pattern];
      
      for (const p of patterns) {
        // Invalidar no React Query
        await queryClient.invalidateQueries({ queryKey: [p] });
        
        // Invalidar no cache do sistema
        cacheManager.invalidatePattern(p);
      }
      
      console.info(`✅ Cache invalidado para padrões: ${patterns.join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao invalidar cache:', error);
      return false;
    }
  }, [queryClient]);

  /**
   * Limpa cache específico de uma funcionalidade
   */
  const clearFeatureCache = useCallback(async (feature: string) => {
    try {
      console.info(`🧹 Limpando cache da funcionalidade: ${feature}`);
      
      // Padrões comuns de cache por funcionalidade
      const patterns = [
        feature,
        `${feature}-*`,
        `*-${feature}`,
        `*${feature}*`
      ];
      
      // Invalidar no React Query
      for (const pattern of patterns) {
        await queryClient.invalidateQueries({ 
          predicate: (query) => {
            const key = query.queryKey.join('-').toLowerCase();
            return key.includes(feature.toLowerCase());
          }
        });
      }
      
      // Invalidar no cache do sistema
      cacheManager.invalidatePattern(new RegExp(feature, 'i'));
      
      console.info(`✅ Cache da funcionalidade ${feature} limpo`);
      return true;
    } catch (error) {
      console.error(`❌ Erro ao limpar cache da funcionalidade ${feature}:`, error);
      return false;
    }
  }, [queryClient]);

  /**
   * Obtém estatísticas do cache
   */
  const getCacheStats = useCallback(() => {
    const systemStats = cacheManager.getStats();
    const queryStats = queryClient.getQueryCache().getAll().length;
    
    return {
      system: systemStats,
      reactQuery: {
        totalQueries: queryStats,
        activeQueries: queryClient.getQueryCache().getAll().filter(q => q.state.status === 'success').length,
        errorQueries: queryClient.getQueryCache().getAll().filter(q => q.state.status === 'error').length,
        loadingQueries: queryClient.getQueryCache().getAll().filter(q => q.state.status === 'pending').length
      }
    };
  }, [queryClient]);

  /**
   * Força refresh de dados específicos
   */
  const forceRefresh = useCallback(async (queryKeys: string[]) => {
    try {
      console.info(`🔄 Forçando refresh para: ${queryKeys.join(', ')}`);
      
      for (const key of queryKeys) {
        await queryClient.refetchQueries({ queryKey: [key] });
      }
      
      console.info('✅ Refresh concluído');
      return true;
    } catch (error) {
      console.error('❌ Erro ao forçar refresh:', error);
      return false;
    }
  }, [queryClient]);



  /**
   * Limpa cache de funcionalidades específicas do sistema
   */
  const clearSystemFeatureCache = useCallback(async (features: string[]) => {
    try {
      console.info(`🧹 Limpando cache das funcionalidades: ${features.join(', ')}`);
      
      const featurePatterns = [
        'empresas',
        'clientes', 
        'grupos',
        'disparos',
        'historico',
        'templates',
        'requerimentos',
        'anexos',
        'vigencias'
      ];
      
      const selectedPatterns = features.length > 0 ? features : featurePatterns;
      
      for (const feature of selectedPatterns) {
        await clearFeatureCache(feature);
      }
      
      console.info('✅ Cache das funcionalidades limpo');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar cache das funcionalidades:', error);
      return false;
    }
  }, [clearFeatureCache]);

  return {
    // Funções principais
    clearAllCache,
    invalidateCache,
    clearFeatureCache,
    clearSystemFeatureCache,
    forceRefresh,
    
    // Monitoramento
    getCacheStats,
    
    // Utilitários
    queryClient,
    cacheManager
  };
};

export default useCacheManager;