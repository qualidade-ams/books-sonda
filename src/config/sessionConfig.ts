// Configurações de sessão e timeout
export const SESSION_CONFIG = {
  // Tempo total de inatividade antes do logout (em minutos)
  TIMEOUT_MINUTES: 10,
  
  // Tempo antes do timeout para mostrar aviso (em minutos)
  WARNING_MINUTES: 2,
  
  // Eventos que resetam o timer de inatividade
  ACTIVITY_EVENTS: [
    'mousedown',
    'mousemove', 
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ],
  
  // Mensagens
  MESSAGES: {
    SESSION_EXPIRED: 'Sessão expirada por inatividade. Faça login novamente.',
    SESSION_WARNING: 'Sua sessão expirará em breve por inatividade.',
    SESSION_EXTENDED: 'Sessão renovada com sucesso.'
  }
} as const;

// Configurações alternativas para diferentes ambientes
export const SESSION_CONFIGS = {
  // Desenvolvimento - timeout mais longo
  development: {
    ...SESSION_CONFIG,
    TIMEOUT_MINUTES: 60, // 1 hora
    WARNING_MINUTES: 5,  // 5 minutos de aviso
  },
  
  // Produção - timeout padrão
  production: {
    ...SESSION_CONFIG,
    TIMEOUT_MINUTES: 10, // 15 minutos (mais restritivo)
    WARNING_MINUTES: 2,  // 2 minutos de aviso
  },
  
  // Ambiente de alta segurança - timeout mais curto
  secure: {
    ...SESSION_CONFIG,
    TIMEOUT_MINUTES: 10, // 10 minutos
    WARNING_MINUTES: 1,  // 1 minuto de aviso
  }
} as const;

// Função para obter configuração baseada no ambiente
export const getSessionConfig = () => {
  const env = import.meta.env.MODE as keyof typeof SESSION_CONFIGS;
  return SESSION_CONFIGS[env] || SESSION_CONFIGS.production;
};