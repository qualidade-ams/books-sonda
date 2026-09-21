---
name: testes
description: Guide for writing and running Vitest tests in Books SND — service, hook, and component test patterns, Supabase mocking, and the test structure/commands used in this repo. Use when the user asks to add or run tests for a service, hook, or component.
---

# Testes

**Neste projeto o teste vem antes da implementação (TDD obrigatório, ver `CLAUDE.md`)** — os exemplos abaixo mostram o formato do teste, mas na prática você os escreve e roda (confirmando que falham) *antes* de o código de `booksService`/`useBooks`/`FilterBar` existir, não depois.

Casa com o agente `qa-engineer` — delegue quando quiser escrever uma suíte de testes maior isoladamente, sem misturar com o trabalho de implementação da feature.

## Estrutura

```
src/
├── test/setup.ts                    # Setup global do Vitest
├── services/__tests__/              # Testes de services
├── hooks/__tests__/                 # Testes de hooks
└── components/__tests__/            # Testes de componentes (quando há lógica relevante)
```

## Comandos

```bash
npm run test        # Watch mode (desenvolvimento)
npm run test:run    # Execução única (CI)
```

## Teste de service (prioridade alta — lógica de negócio isolada)

```typescript
import { describe, it, expect } from 'vitest';
import { booksService } from '@/services/booksService';

describe('BooksService', () => {
  describe('getByPeriodo', () => {
    it('retorna books do período solicitado', async () => {
      const result = await booksService.getByPeriodo('2026-01');
      expect(result).toBeInstanceOf(Array);
    });

    it('lança erro para período vazio', async () => {
      await expect(booksService.getByPeriodo('')).rejects.toThrow();
    });
  });
});
```

## Teste de hook (prioridade média)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { useBooks } from '@/hooks/useBooks';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useBooks', () => {
  it('retorna lista de books', async () => {
    const { result } = renderHook(() => useBooks('2026-01'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.books).toBeInstanceOf(Array);
  });
});
```

## Teste de componente (prioridade baixa — só com lógica significativa)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FilterBar from '@/components/admin/FilterBar';

describe('FilterBar', () => {
  it('chama onSearch ao digitar', () => {
    const onSearch = vi.fn();
    render(<FilterBar onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar...'), { target: { value: 'teste' } });
    expect(onSearch).toHaveBeenCalledWith('teste');
  });
});
```

## Mock do Supabase

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
        }),
      }),
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
  },
}));
```

## Checklist

- [ ] Teste escrito e rodado (falhando) **antes** do código de implementação existir
- [ ] Cenário feliz coberto
- [ ] Cenários de erro cobertos
- [ ] Sem dependência de dados de produção
- [ ] Mocks adequados para dependências externas
- [ ] Testes determinísticos (não flaky)
- [ ] Execução rápida (suite completa < 30s)

## Referências relacionadas

Skill `padroes-codigo` (template de service/hook e mock do Supabase em `references/services.md`/`references/hooks.md`) · agente `qa-engineer` para escrever uma suíte maior isoladamente.
