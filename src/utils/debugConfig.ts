/**
 * Configuração de debug e logs para desenvolvimento
 */

// Configuração global de logs
export const DEBUG_CONFIG = {
  // Logs gerais
  enableGeneralLogs: false,
  
  // Logs de API
  enableApiLogs: false,
  
  // Logs de realtime
  enableRealtimeLogs: false,
  
  // Logs de queries/mutations
  enableQueryLogs: false,
  
  // Logs de filtros e dados
  enableDataLogs: false,
  
  // Logs de performance
  enablePerformanceLogs: false,
} as const;

/**
 * Função helper para logs condicionais
 */
export function debugLog(category: keyof typeof DEBUG_CONFIG, ...args: any[]) {
  if (import.meta.env.DEV && DEBUG_CONFIG[category]) {
    console.log(...args);
  }
}

/**
 * Função helper para logs de erro (sempre habilitados)
 */
export function debugError(...args: any[]) {
  console.error(...args);
}

/**
 * Função helper para logs de warning (sempre habilitados)
 */
export function debugWarn(...args: any[]) {
  console.warn(...args);
}

/**
 * Função para habilitar/desabilitar logs em tempo de execução
 */
export function setDebugConfig(config: Partial<typeof DEBUG_CONFIG>) {
  Object.assign(DEBUG_CONFIG, config);
}

// Adicionar ao window para debug no console
if (import.meta.env.DEV) {
  (window as any).__debugConfig = {
    config: DEBUG_CONFIG,
    setConfig: setDebugConfig,
    enableAll: () => setDebugConfig({
      enableGeneralLogs: true,
      enableApiLogs: true,
      enableRealtimeLogs: true,
      enableQueryLogs: true,
      enableDataLogs: true,
      enablePerformanceLogs: true,
    }),
    disableAll: () => setDebugConfig({
      enableGeneralLogs: false,
      enableApiLogs: false,
      enableRealtimeLogs: false,
      enableQueryLogs: false,
      enableDataLogs: false,
      enablePerformanceLogs: false,
    })
  };
}