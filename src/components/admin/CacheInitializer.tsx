import { useEffect } from 'react';
import { useCacheManager } from '@/hooks/useCacheManager';
import { toast } from 'sonner';

/**
 * Componente para limpeza inicial de cache quando o usuário acessa o sistema
 * Garante que os dados estejam sempre atualizados na primeira sessão
 */
export const CacheInitializer = () => {
  const { clearAllCache, getCacheStats } = useCacheManager();

  useEffect(() => {
    const initializeCache = async () => {
      try {
        console.info('🧹 Iniciando limpeza de cache inicial...');
        
        // Obter estatísticas antes da limpeza
        const statsBefore = getCacheStats();
        console.debug('📊 Estatísticas antes da limpeza:', statsBefore);
        
        // Executar limpeza completa
        const success = await clearAllCache();
        
        if (success) {
          console.info('✅ Limpeza de cache inicial concluída com sucesso');
          
          // Toast discreto para feedback (apenas em desenvolvimento)
          if (process.env.NODE_ENV === 'development') {
            toast.success('Cache limpo - dados atualizados', {
              duration: 2000,
              position: 'bottom-right'
            });
          }
        } else {
          throw new Error('Falha na limpeza de cache');
        }
        
      } catch (error) {
        console.error('❌ Erro durante limpeza inicial de cache:', error);
        
        // Toast de erro apenas em desenvolvimento
        if (process.env.NODE_ENV === 'development') {
          toast.error('Erro na limpeza de cache', {
            duration: 3000,
            position: 'bottom-right'
          });
        }
      }
    };

    // Executar limpeza apenas uma vez por sessão
    const cacheInitialized = sessionStorage.getItem('cache_initialized');
    
    if (!cacheInitialized) {
      initializeCache();
      sessionStorage.setItem('cache_initialized', 'true');
      
      // Marcar timestamp da inicialização
      sessionStorage.setItem('cache_initialized_at', new Date().toISOString());
    } else {
      // Log para debug - mostrar quando foi inicializado
      const initializedAt = sessionStorage.getItem('cache_initialized_at');
      if (initializedAt) {
        console.debug(`ℹ️ Cache já inicializado em: ${initializedAt}`);
      }
    }
  }, [clearAllCache, getCacheStats]);

  // Componente não renderiza nada
  return null;
};

export default CacheInitializer;