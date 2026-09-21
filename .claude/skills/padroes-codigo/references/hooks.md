# Hooks (TanStack Query)

Local: `src/hooks/use<Dominio>.ts`. O hook é a única ponte entre página e service.

## Template

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { booksService } from '@/services/booksService';
import type { CreateBookInput } from '@/types/books';

export function useBooks(periodo?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['books', periodo],
    queryFn: () => booksService.getByPeriodo(periodo!),
    staleTime: 5 * 60 * 1000,
    enabled: !!periodo,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateBookInput) => booksService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast({ title: 'Book criado com sucesso' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao criar book', description: err.message, variant: 'destructive' });
    },
  });

  return {
    books: data ?? [],
    isLoading,
    error,
    createBook: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
```

## Regras

- **`queryKey` hierárquico e descritivo**: `['books']` para a lista toda, `['books', periodo]` para o recorte, `['books', 'detail', id]` para um item. Invalidar `['books']` invalida os filhos.
- Toda `useMutation` invalida as queries afetadas em `onSuccess` e mostra toast em `onError`.
- `enabled` para não disparar query com parâmetro indefinido.
- `staleTime` explícito em dados que não mudam a cada segundo (padrão do projeto: 5 min).
- O hook **não** tem `try/catch` — o erro vem do service e o TanStack Query o expõe em `error`.
- Retorne nomes de domínio (`books`, `createBook`, `isCreating`), não `data`/`mutate` crus.
- Nunca logar o objeto retornado pela query (regra de PII — ver skill `seguranca`).

## Invalidação cruzada

Quando a mutation afeta outro domínio, invalide os dois:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['requerimentos'] });
  queryClient.invalidateQueries({ queryKey: ['faturamento'] });
},
```

Consulte `.claude/references/dominios.md` (seção "Dependências entre domínios") para saber o que mais precisa ser invalidado.

## Hooks utilitários já existentes

Antes de escrever um genérico, veja se já existe:

| Hook | Uso |
|---|---|
| `useToast` | notificações (preferir a `sonner` em código novo) |
| `useConfirmDialog` | confirmação imperativa |
| `useDebounce` | atraso em campo de busca |
| `useLocalStorage` | persistência local |
| `useCacheManager` | limpeza de cache |
| `useAuth` | sessão e usuário |
| `usePermissions` | nível de permissão por tela |

## Mutation com estado otimista

Use só quando a latência atrapalha a UX; caso contrário, invalidar é suficiente.

```ts
const updateMutation = useMutation({
  mutationFn: ({ id, input }) => booksService.update(id, input),
  onMutate: async ({ id, input }) => {
    await queryClient.cancelQueries({ queryKey: ['books'] });
    const previous = queryClient.getQueryData(['books']);
    queryClient.setQueryData(['books'], (old: BookData[] = []) =>
      old.map((b) => (b.id === id ? { ...b, ...input } : b)),
    );
    return { previous };
  },
  onError: (err, _vars, context) => {
    queryClient.setQueryData(['books'], context?.previous);
    toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['books'] }),
});
```
