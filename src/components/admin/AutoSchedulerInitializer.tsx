/**
 * Componente para inicialização automática do job scheduler
 * Garante que o scheduler seja iniciado quando a aplicação carrega
 * APENAS se o usuário estiver autenticado
 */

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { jobSchedulerService } from '@/services/jobSchedulerService';

export function AutoSchedulerInitializer() {
  const { user, isReady } = useAuth();

  useEffect(() => {
    // Aguardar até que a autenticação esteja pronta
    if (!isReady) {
      return;
    }

    // Só iniciar o scheduler se o usuário estiver autenticado
    if (!user) {
      console.log('⏸️ Job scheduler não iniciado - usuário não autenticado');
      return;
    }

    // Verificar se o scheduler já está rodando
    const status = jobSchedulerService.getStatus();
    
    if (!status.isRunning) {
      console.log('🔄 Inicializando job scheduler automaticamente...');
      
      // Aguardar um pouco para garantir que a aplicação carregou completamente
      const timer = setTimeout(() => {
        try {
          jobSchedulerService.start();
          console.log('✅ Job scheduler iniciado com sucesso');
        } catch (error) {
          console.error('❌ Erro ao iniciar job scheduler:', error);
        }
      }, 2000);

      return () => clearTimeout(timer);
    } else {
      console.log('✅ Job scheduler já está em execução');
    }
  }, [user, isReady]);

  // Este componente não renderiza nada
  return null;
}