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
    // Em desenvolvimento, sempre HTTP
    return `http://${baseHost}`;
  } else {
    // Em produção, usa HTTP por enquanto (servidor não suporta HTTPS)
    // TODO: Quando o servidor suportar HTTPS, mudar para:
    return isHttpsEnvironment() ? `https://${baseHost}` : `http://${baseHost}`;
    //return `http://${baseHost}`;
  }
}

/**
 * Configuração de fetch com fallback automático HTTP/HTTPS
 */
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    // Primeira tentativa com a URL fornecida
    return await fetch(url, options);
  } catch (error) {
    // Se falhar e for erro de SSL/protocolo, tenta com protocolo alternativo
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('🔄 Fetch falhou, tentando protocolo alternativo. URL original:', url);
      
      let alternativeUrl: string;
      
      if (url.startsWith('https://')) {
        // Se HTTPS falhou, tenta HTTP
        alternativeUrl = url.replace('https://', 'http://');
        console.log('🔄 Tentando HTTP:', alternativeUrl);
      } else if (url.startsWith('http://')) {
        // Se HTTP falhou, tenta HTTPS
        alternativeUrl = url.replace('http://', 'https://');
        console.log('🔄 Tentando HTTPS:', alternativeUrl);
      } else {
        // Se não tem protocolo, adiciona http
        alternativeUrl = `http://${url}`;
        console.log('🔄 Tentando com HTTP:', alternativeUrl);
      }
      
      try {
        const response = await fetch(alternativeUrl, options);
        console.log('✅ Fallback bem-sucedido:', alternativeUrl);
        return response;
      } catch (fallbackError) {
        console.error('❌ Fallback também falhou:', fallbackError);
        throw error; // Lança o erro original
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