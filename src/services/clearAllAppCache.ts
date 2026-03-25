/**
 * Serviço centralizado de limpeza completa de cache da aplicação.
 *
 * ⚠️ IMPORTANTE: Ao adicionar uma nova funcionalidade que use cache
 * (localStorage, sessionStorage, in-memory, etc.), registre a chave
 * ou prefixo aqui para garantir que seja limpa no logout/login.
 *
 * Para caches in-memory de serviços singleton, use registerCacheCleanup()
 * para registrar a função de limpeza sem precisar importar o serviço aqui.
 *
 * Veja: .kiro/steering/cache-registry.md
 */

import { cacheManager } from '@/services/cacheManager';
import { anexoCache } from '@/utils/anexoCache';

// ─── Registro de callbacks de limpeza ────────────────────────────────
// Serviços com cache in-memory próprio registram sua limpeza aqui.
// Isso evita importações circulares e mantém o acoplamento baixo.
const cleanupCallbacks: Array<() => void> = [];

/**
 * Registra uma função de limpeza de cache que será chamada no logout.
 * Use isso em serviços singleton que possuem cache in-memory próprio.
 *
 * @example
 * // No seu serviço:
 * import { registerCacheCleanup } from '@/services/clearAllAppCache';
 * class MeuServico {
 *   private cache = new Map();
 *   constructor() {
 *     registerCacheCleanup(() => this.cache.clear());
 *   }
 * }
 */
export function registerCacheCleanup(callback: () => void): void {
  cleanupCallbacks.push(callback);
}

// ─── Chaves e prefixos de localStorage ───────────────────────────────
// REGISTRE NOVAS CHAVES AQUI ao criar funcionalidades com cache.

const LOCAL_STORAGE_KEYS = [
  // Sessão e atividade
  'last_activity',

  // Sidebar / UI
  'sidebar-expanded-sections',
  'admin-sidebar-collapsed',

  // Tema
  'theme',

  // Acessibilidade
  'fontSize',
] as const;

const LOCAL_STORAGE_PREFIXES = [
  // Cache genérico
  'cache_',
  'query_',

  // Sidebar
  'sidebar_',

  // Anexos
  'anexo_cache_',
  'anexo_metadata_',

  // Acessibilidade
  'accessibility_',
] as const;

// ─── Função principal ────────────────────────────────────────────────

/**
 * Limpa TODOS os caches da aplicação de forma abrangente.
 * Chamado no logout e pode ser chamado manualmente.
 *
 * @param queryClient - React Query client (opcional)
 * @param options.isLogout - Se true, limpa sessionStorage inteiro (incluindo Supabase).
 *                           Se false (padrão), preserva a sessão do Supabase.
 */
export function clearAllAppCache(
  queryClient?: { clear: () => void },
  options?: { isLogout?: boolean }
): boolean {
  const isLogout = options?.isLogout ?? false;
  try {
    console.info('🧹 [clearAllAppCache] Iniciando limpeza completa de cache...');

    // 1. React Query cache
    if (queryClient) {
      queryClient.clear();
    }

    // 2. In-memory caches principais (singletons conhecidos)
    cacheManager.clear();
    anexoCache.clear();

    // 3. Callbacks registrados por serviços com cache próprio
    for (const cb of cleanupCallbacks) {
      try {
        cb();
      } catch (err) {
        console.warn('⚠️ Erro em callback de limpeza de cache:', err);
      }
    }

    // 4. localStorage — chaves específicas
    for (const key of LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    // 5. localStorage — por prefixo (cobre chaves dinâmicas)
    const allLocalKeys = Object.keys(localStorage);
    for (const key of allLocalKeys) {
      const shouldRemove =
        LOCAL_STORAGE_PREFIXES.some(prefix => key.startsWith(prefix)) ||
        key.includes('_cache');
      if (shouldRemove) {
        localStorage.removeItem(key);
      }
    }

    // 6. sessionStorage — limpar chaves de cache, preservando a sessão do Supabase
    //    O Supabase usa sessionStorage para armazenar o token (chaves começam com "sb-").
    //    No logout, limpa tudo. Fora do logout, preserva as chaves do Supabase.
    if (isLogout) {
      sessionStorage.clear();
    } else {
      const allSessionKeys = Object.keys(sessionStorage);
      for (const key of allSessionKeys) {
        if (key.startsWith('sb-')) {
          continue;
        }
        sessionStorage.removeItem(key);
      }
    }

    console.info('🧹 [clearAllAppCache] Limpeza completa finalizada');
    return true;
  } catch (error) {
    console.error('❌ [clearAllAppCache] Erro durante limpeza:', error);
    return false;
  }
}
