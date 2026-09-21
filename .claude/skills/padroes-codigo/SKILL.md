---
name: padroes-codigo
description: Templates canônicos das camadas de código do Books SND — service singleton com Supabase, hook TanStack Query, tratamento de erro, validação Zod e registro de cache. Use ao escrever ou revisar qualquer service, hook, tipo ou tratamento de erro, e quando precisar da ordem de imports ou das convenções de nome.
---

# Padrões de código — Books SND

## Objetivo

Que todo service e hook novo seja escrito com a mesma forma dos 93 services e 104 hooks já existentes.

## Quando utilizar

Ao criar ou alterar arquivo em `src/services/`, `src/hooks/`, `src/types/` ou `src/utils/`. Para o fluxo end-to-end de uma feature use `criar-feature`; esta skill é a forma do código dentro de cada camada.

## Regras essenciais

- **Fluxo de camadas**: `Page → Hook → Service → Supabase`. Componente **nunca** importa `supabase` direto.
- Service é **classe singleton**: `export const xService = new XService()`.
- Service **lança** erro com mensagem descritiva; hook **captura** e mostra toast. Nunca engolir erro silenciosamente.
- Hook usa TanStack Query com `queryKey` hierárquico (`['books', periodo]`); toda `useMutation` invalida as queries relacionadas em `onSuccess` e mostra toast em `onError`.
- Validação de formulário sempre Zod + React Hook Form.
- **Nunca** `any` em retorno de função pública. Props de componente sempre tipadas com `interface`.
- Página é `function` declarada com `export default`; componente menor pode ser arrow function.
- `try/catch` fica no service, não no hook.
- Nenhum texto de UI hardcoded espalhado — use constante ou variável.

### Ordem de imports (obrigatória)

```ts
// 1. React e libs externas
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
// 2. Ícones
import { FileText, Plus } from 'lucide-react';
// 3. UI genérica
import { Button } from '@/components/ui/button';
// 4. Componentes de domínio
import AdminLayout from '@/components/admin/LayoutAdmin';
// 5. Hooks
import { useBooks } from '@/hooks/useBooks';
// 6. Services
import { booksService } from '@/services/booksService';
// 7. Types
import type { BookData } from '@/types/books';
// 8. Utils
import { formatDate } from '@/utils/formatters';
```

Convenções de nome de arquivo e símbolo: `.claude/references/estrutura.md`.

## Fluxo de execução

1. Antes de criar arquivo novo, cheque `.claude/references/dominios.md` — se o domínio já tem service/hook, estenda em vez de criar paralelo.
2. Escreva o teste primeiro (TDD é obrigatório — ver skill `testes`).
3. Abra só a referência da camada que vai escrever.
4. Implemente seguindo o template.
5. `npm run test:run` e `npm run typecheck`.

## Referências relacionadas

| Preciso de… | Abrir |
|---|---|
| Template de service, queries Supabase, paginação, performance | `references/services.md` |
| Template de hook TanStack Query, query/mutation, invalidação | `references/hooks.md` |
| Erros, try/catch, tipos e validação Zod | `references/erros-e-validacao.md` |
| Registrar cache novo (localStorage, in-memory) para limpeza no logout | `references/cache.md` |

Regras de log e PII ao tratar erro: skill `seguranca`.
