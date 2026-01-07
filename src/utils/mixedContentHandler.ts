/**
 * Handler para problemas de Mixed Content em produção
 * 
 * Em produção HTTPS, requisições HTTP são bloqueadas pelo navegador.
 * Este módulo implementa soluções alternativas.
 */

/**
 * Detecta se estamos em ambiente HTTPS
 */
function isHttpsEnvironment(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:';
}

/**
 * Detecta se a URL é HTTP
 */
function isHttpUrl(url: string): boolean {
  return url.startsWith('http://');
}

/**
 * Cria uma requisição via proxy para contornar Mixed Content
 * 
 * Opções:
 * 1. Usar um proxy CORS público (não recomendado para produção)
 * 2. Usar um proxy próprio
 * 3. Usar uma função serverless como proxy
 */
async function fetchViaProxy(url: string, options?: RequestInit): Promise<Response> {
  // Opção 1: Proxy CORS público (apenas para desenvolvimento/teste)
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  
  console.warn('🔄 Usando proxy para contornar Mixed Content:', url);
  
  try {
    const response = await fetch(proxyUrl, {
      ...options,
      // Remove headers que podem causar problemas no proxy
      headers: {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) || {})
      }
    });
    
    // Simula a resposta original
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error('❌ Proxy também falhou:', error);
    throw error;
  }
}

/**
 * Fetch inteligente que lida com Mixed Content
 */
export async function smartFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    // Primeira tentativa: requisição direta
    return await fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      // Se estamos em HTTPS e a URL é HTTP, pode ser Mixed Content
      if (isHttpsEnvironment() && isHttpUrl(url)) {
        console.warn('🚨 Possível problema de Mixed Content detectado');
        console.warn('📍 Ambiente HTTPS tentando acessar:', url);
        
        // Tenta usar proxy como fallback
        try {
          return await fetchViaProxy(url, options);
        } catch (proxyError) {
          console.error('❌ Todas as tentativas falharam');
          console.error('Original error:', error);
          console.error('Proxy error:', proxyError);
          
          // Lança o erro original
          throw error;
        }
      }
    }
    
    throw error;
  }
}

/**
 * Informações sobre o problema de Mixed Content
 */
export function getMixedContentInfo() {
  return {
    isHttpsEnvironment: isHttpsEnvironment(),
    currentProtocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    mixedContentBlocked: isHttpsEnvironment(),
    recommendation: isHttpsEnvironment() 
      ? 'Configure HTTPS no servidor da API ou use um proxy'
      : 'Ambiente HTTP - sem problemas de Mixed Content'
  };
}