/**
 * Configuração inteligente da API baseada no ambiente
 */

/**
 * Detecta se a aplicação está rodando em HTTPS
 */
function isHttpsEnvironment(): boolean {
  return window.location.protocol === 'https:';
}

/**
 * Detecta se está em ambiente de desenvolvimento
 */
function isDevelopment(): boolean {
  return import.meta.env.DEV || window.location.hostname === 'localhost';
}

/**
 * Obtém a URL base da API com protocolo correto
 */
export function getApiBaseUrl(): string {
  // Se há uma URL configurada explicitamente, use ela
  if (import.meta.env.VITE_SYNC_API_URL) {
    return import.meta.env.VITE_SYNC_API_URL;
  }

  // Configuração automática baseada no ambiente
  const baseHost = 'SAPSERVDB.sondait.com.br:3001';
  
  if (isDevelopment()) {
    // Em desenvolvimento, pode usar HTTP
    return `http://${baseHost}`;
  } else if (isHttpsEnvironment()) {
    // Em produção com HTTPS, deve usar HTTPS
    return `https://${baseHost}`;
  } else {
    // Fallback para HTTP
    return `http://${baseHost}`;
  }
}

/**
 * Configuração de fetch com tratamento de Mixed Content
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    // Se falhar por Mixed Content, tenta com protocolo alternativo
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('Tentativa de fetch falhou, possivelmente por Mixed Content. URL:', url);
      
      // Se a URL atual é HTTP e estamos em HTTPS, tenta HTTPS
      if (url.startsWith('http://') && isHttpsEnvironment()) {
        const httpsUrl = url.replace('http://', 'https://');
        console.log('Tentando com HTTPS:', httpsUrl);
        return await fetch(httpsUrl, options);
      }
    }
    
    throw error;
  }
}

/**
 * Informações sobre a configuração atual
 */
export function getApiConfigInfo() {
  return {
    apiUrl: getApiBaseUrl(),
    isHttps: isHttpsEnvironment(),
    isDev: isDevelopment(),
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    configuredUrl: import.meta.env.VITE_SYNC_API_URL || 'não configurada'
  };
}