# Registro de cache

Todo cache novo precisa ser registrado em `src/services/clearAllAppCache.ts` — fonte única de verdade da limpeza no logout. Cache não registrado vaza dados de um usuário para a sessão do próximo.

## O que registrar

| Tipo de cache | Onde registrar |
|---|---|
| `localStorage` com chave fixa | array `LOCAL_STORAGE_KEYS` |
| `localStorage` com chave dinâmica | array `LOCAL_STORAGE_PREFIXES` |
| Cache in-memory em service singleton | `registerCacheCleanup()` no fim do arquivo do service |
| `sessionStorage` | nada — `sessionStorage.clear()` já roda no logout |
| TanStack Query | nada — `queryClient.clear()` já roda no logout |
| Serviço que usa `cacheManager` internamente | nada — coberto por `cacheManager.clear()` |

## Chave fixa

```ts
const LOCAL_STORAGE_KEYS = [
  'last_activity',
  'sidebar-expanded-sections',
  'admin-sidebar-collapsed',
  'theme',
  'fontSize',
  'minha_nova_chave',  // ← adicionar aqui
] as const;
```

## Prefixo dinâmico

Para chaves geradas em tempo de execução (`relatorio_cache_jan`, `relatorio_cache_fev`):

```ts
const LOCAL_STORAGE_PREFIXES = [
  'cache_',
  'query_',
  'sidebar_',
  'anexo_cache_',
  'anexo_metadata_',
  'accessibility_',
  'meu_prefixo_',  // ← adicionar aqui
] as const;
```

## Cache in-memory em service

O método de limpeza é público na classe, e o registro fica logo após a exportação do singleton:

```ts
import { registerCacheCleanup } from '@/services/clearAllAppCache';

class MeuServico {
  private cache = new Map<string, unknown>();

  /** Limpa cache interno. Chamado pelo clearAllAppCache no logout. */
  resetInternalCache(): void {
    this.cache.clear();
  }
}

export const meuServico = new MeuServico();

registerCacheCleanup(() => meuServico.resetInternalCache());
```

## Já registrados

| Serviço | Tipo | Como é limpo |
|---|---|---|
| `cacheManager` | in-memory (Map) | `cacheManager.clear()` direto |
| `anexoCache` | in-memory + `anexo_cache_*`, `anexo_metadata_*` | `anexoCache.clear()` direto |
| `jobConfigurationService` | in-memory (Map) | `registerCacheCleanup` → `resetInternalCache()` |
| `elogiosTemplateService` | array estático | `registerCacheCleanup` → `clearEmpresasCache()` |
| `booksDataCollectorService` | in-memory (Map) | `registerCacheCleanup` → `resetInternalCache()` |
| `anexoAuditService` | in-memory (Map) | `registerCacheCleanup` → `limparCacheMetricas()` |
| `clientBooksCacheService` | usa `cacheManager` | coberto por `cacheManager.clear()` |

## Onde `clearAllAppCache` é chamado

`useAuth.tsx` → `signOut()` · `useCacheManager.ts` → `clearAllCache()` · `useSessionPersistence.ts` → `forceLogout()` · `CacheInitializer` na primeira sessão autenticada.
