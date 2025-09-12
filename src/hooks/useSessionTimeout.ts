import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';
import { getSessionConfig } from '@/config/sessionConfig';

interface SessionTimeoutConfig {
  timeoutMinutes: number; // Tempo total de inatividade
  warningMinutes: number; // Quando mostrar aviso
}

export const useSessionTimeout = (customConfig?: Partial<SessionTimeoutConfig>) => {
  const defaultConfig = getSessionConfig();
  const config = {
    timeoutMinutes: customConfig?.timeoutMinutes || defaultConfig.TIMEOUT_MINUTES,
    warningMinutes: customConfig?.warningMinutes || defaultConfig.WARNING_MINUTES
  };
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // Converter minutos para milissegundos
  const timeoutMs = config.timeoutMinutes * 60 * 1000;
  const warningMs = config.warningMinutes * 60 * 1000;

  // Resetar timers de inatividade
  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    
    // Limpar timers existentes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    // Timer para mostrar aviso
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingTime(config.warningMinutes * 60);
      
      // Countdown do aviso
      countdownRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    }, timeoutMs - warningMs);

    // Timer para logout automático
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs);

  }, [config.timeoutMinutes, config.warningMinutes, timeoutMs, warningMs]);

  // Fazer logout
  const handleLogout = useCallback(async () => {
    setShowWarning(false);
    
    // Limpar todos os timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    try {
      await signOut();
      navigate('/', { 
        replace: true,
        state: { message: defaultConfig.MESSAGES.SESSION_EXPIRED }
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Forçar redirecionamento mesmo se houver erro
      window.location.href = '/';
    }
  }, [signOut, navigate]);

  // Estender sessão
  const extendSession = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  // Eventos de atividade do usuário
  const activityEvents = defaultConfig.ACTIVITY_EVENTS;

  useEffect(() => {
    // Iniciar monitoramento
    resetTimeout();

    // Adicionar listeners de atividade
    const handleActivity = () => {
      resetTimeout();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [resetTimeout]);

  // Formatar tempo restante
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    showWarning,
    remainingTime,
    formatTime: formatTime(remainingTime),
    extendSession,
    handleLogout
  };
};