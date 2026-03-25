---
inclusion: auto
---

# Registro de Cache — Regra Obrigatória

## Regra

Sempre que uma nova funcionalidade for criada ou modificada e utilizar **qualquer tipo de cache** (localStorage, sessionStorage, cache in-memory, React Query, etc.), o desenvolvedor **DEVE** registrar as chaves ou a função de limpeza no arquivo centralizado:

**`src/services/clearAllAppCache.ts`**

Este arquivo é a **fonte única de verdade** para limpeza de cache no logout/login.

---

## Como registrar por tipo de cache

### 1. Chaves fixas de localStorage → `LOCAL_STORAGE_KEYS`

```ts
const LOCAL_STORAGE_KEYS = [
  'last_activity',
  'sidebar-expanded-sections',
  'admin-sidebar-collapsed',
  'theme',
  'fontSize',
  'minha_nova_chave',  // ← ADICIONAR AQUI
] as const;
```

### 2. Prefixos dinâmicos de localStorage → `LOCAL_STORAGE_PREFIXES`

Use quando a chave é gerada dinamicamente (ex: `relatorio_cache_jan`, `relatorio_cache_fev`).

```ts
const LOCAL_STORAGE_PREFIXES = [
  'cache_',
  'query_',
  'sidebar_',
  'anexo_cache_',
  'anexo_metadata_',
  'accessibility_',
  'meu_prefixo_',  // ← ADICIONAR AQUI
] as const;
```

### 3. Cache in-memory em serviço singleton → `registerCacheCleanup()`

Se a nova funcionalidade criar um cache in-memory em um serviço singleton (Map, array, objeto), use `registerCacheCleanup()` no final do arquivo do serviço, logo após a exportação do singleton.

```ts
// No final do arquivo do serviço:
import { registerCacheCleanup } from '@/services/clearAllAppCache';

export const meuServico = new MeuServico();

// Registrar limpeza de cache no logout
registerCacheCleanup(() => meuServico.resetInternalCache());
```

O método de limpeza deve ser público na classe:

```ts
class MeuServico {
  private cache = new Map<string, any>();

  /** Limpa cache interno. Chamado pelo clearAllAppCache no logout. */
  resetInternalCache(): void {
    this.cache.clear();
  }
}
```

### 4. sessionStorage

Não precisa registrar — `sessionStorage.clear()` já limpa tudo no logout.

### 5. React Query

Não precisa registrar — `queryClient.clear()` já limpa todas as queries no logout.

---

## Serviços já registrados

| Serviço | Tipo de cache | Como é limpo |
|---------|--------------|--------------|
| `cacheManager` | In-memory (Map) | `cacheManager.clear()` direto |
| `anexoCache` | In-memory + localStorage (`anexo_cache_*`, `anexo_metadata_*`) | `anexoCache.clear()` direto |
| `jobConfigurationService` | In-memory (Map) | `registerCacheCleanup` → `resetInternalCache()` |
| `elogiosTemplateService` | Estático (array) | `registerCacheCleanup` → `clearEmpresasCache()` |
| `booksDataCollectorService` | In-memory (Map) | `registerCacheCleanup` → `resetInternalCache()` |
| `anexoAuditService` | In-memory (Map) | `registerCacheCleanup` → `limparCacheMetricas()` |
| `clientBooksCacheService` | Usa `cacheManager` internamente | Coberto pelo `cacheManager.clear()` |

---

## Onde `clearAllAppCache` é chamado

- **Logout** — `useAuth.tsx` → `signOut()`
- **Limpeza manual** — `useCacheManager.ts` → `clearAllCache()`
- **Force logout** — `useSessionPersistence.ts` → `forceLogout()`
- **CacheInitializer** — via `useCacheManager` na primeira sessão autenticada

---

## Checklist ao criar funcionalidade com cache

- [ ] Identifiquei o tipo de cache usado (localStorage, sessionStorage, in-memory, React Query)
- [ ] Se localStorage com chave fixa → adicionei em `LOCAL_STORAGE_KEYS`
- [ ] Se localStorage com chave dinâmica → adicionei prefixo em `LOCAL_STORAGE_PREFIXES`
- [ ] Se cache in-memory em singleton → adicionei `registerCacheCleanup()` no serviço
- [ ] Se usa `cacheManager` ou `queryClient` internamente → já está coberto automaticamente
- [ ] sessionStorage e React Query → cobertos automaticamente, sem ação necessária
