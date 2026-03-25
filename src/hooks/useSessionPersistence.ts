import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { clearAllAppCache } from '@/services/clearAllAppCache';

/**
 * Hook para gerenciar a persistência de sessão
 * Detecta quando o usuário fecha o navegador ou desliga o computador
 */
export const useSessionPersistence = () => {
  const { signOut } = useAuth();

  useEffect(() => {
    // Função para limpar sessão quando necessário
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Marcar que o usuário está saindo
      sessionStorage.setItem('user_leaving', 'true');
      
      // Opcional: mostrar confirmação (alguns navegadores ignoram isso)
      // event.preventDefault();
      // event.returnValue = '';
    };

    // Função para detectar se o usuário voltou após fechar o navegador
    const handlePageLoad = () => {
      const userWasLeaving = sessionStorage.getItem('user_leaving');
      const lastActivity = localStorage.getItem('last_activity');
      const sessionStart = sessionStorage.getItem('session_start');
      
      // Se não há registro de início de sessão, criar um
      if (!sessionStart) {
        sessionStorage.setItem('session_start', Date.now().toString());
      }
      
      // Se o usuário estava saindo e voltou, verificar se deve manter a sessão
      if (userWasLeaving) {
        const now = Date.now();
        const lastActivityTime = lastActivity ? parseInt(lastActivity) : 0;
        const timeDiff = now - lastActivityTime;
        
        // Se passou mais de 30 minutos desde a última atividade, fazer logout
        if (timeDiff > 30 * 60 * 1000) { // 30 minutos
          signOut().catch(console.error);
        }
        
        // Limpar flag
        sessionStorage.removeItem('user_leaving');
      }
    };

    // Função para atualizar última atividade
    const updateLastActivity = () => {
      localStorage.setItem('last_activity', Date.now().toString());
    };

    // Eventos de atividade
    const activityEvents = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Adicionar listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('load', handlePageLoad);
    
    // Adicionar listeners de atividade
    activityEvents.forEach(event => {
      document.addEventListener(event, updateLastActivity, true);
    });

    // Executar verificação inicial
    handlePageLoad();
    updateLastActivity();

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handlePageLoad);
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateLastActivity, true);
      });
    };
  }, [signOut]);

  // Função para forçar logout (pode ser chamada externamente)
  const forceLogout = async () => {
    try {
      await signOut();
      // signOut já chama clearAllAppCache internamente
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
      // Garantir limpeza mesmo com erro
      clearAllAppCache(undefined, { isLogout: true });
      window.location.href = '/';
    }
  };

  return {
    forceLogout
  };
};