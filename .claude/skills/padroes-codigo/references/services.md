# Services

Local: `src/services/<dominio>Service.ts`. Um service por domínio; services muito grandes são divididos por subdomínio (ex.: `bancoHorasAlocacoesService`, `bancoHorasExcedentesService`).

## Template

```ts
import { supabase } from '@/integrations/supabase/client';
import type { BookData, CreateBookInput } from '@/types/books';

class BooksService {
  async getByPeriodo(periodo: string): Promise<BookData[]> {
    const { data, error } = await supabase
      .from('books')
      .select('id, empresa_id, periodo, status, created_at')
      .eq('periodo', periodo)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Falha ao buscar books: ${error.message}`);
    return data as BookData[];
  }

  async create(input: CreateBookInput): Promise<BookData> {
    const { data, error } = await supabase
      .from('books')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar book: ${error.message}`);
    return data as BookData;
  }

  async update(id: string, input: Partial<CreateBookInput>): Promise<BookData> {
    const { data, error } = await supabase
      .from('books')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar book: ${error.message}`);
    return data as BookData;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw new Error(`Falha ao excluir book: ${error.message}`);
  }
}

export const booksService = new BooksService();
```

## Regras

- **Singleton exportado**, nunca a classe.
- Mensagem de erro sempre em português, descritiva e com `error.message` — nunca o objeto de erro inteiro (regra de PII, ver skill `seguranca`).
- `select()` com colunas explícitas quando a tabela é larga; `select('*')` só quando realmente precisa de tudo.
- Nada de N+1: se precisa de dados relacionados, use join do PostgREST — `select('*, empresas(nome)')` — em vez de um `await` por linha.
- Retorno sempre tipado; nunca `Promise<any>`.
- Se o service precisa de privilégio administrativo, a operação vai para uma Edge Function (a `SUPABASE_SERVICE_ROLE_KEY` nunca aparece no frontend).

## Paginação

```ts
async listar(page: number, pageSize = 50): Promise<{ items: BookData[]; total: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('books')
    .select('*', { count: 'exact' })
    .range(from, to)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Falha ao listar books: ${error.message}`);
  return { items: data as BookData[], total: count ?? 0 };
}
```

## Filtros opcionais

```ts
async buscar(filtros: { periodo?: string; status?: string }): Promise<BookData[]> {
  let query = supabase.from('books').select('*');

  if (filtros.periodo) query = query.eq('periodo', filtros.periodo);
  if (filtros.status) query = query.eq('status', filtros.status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`Falha ao buscar books: ${error.message}`);
  return data as BookData[];
}
```

## Service com cache interno

Se o service mantém cache in-memory (Map, array), ele **precisa** ser registrado para limpeza no logout — ver `cache.md`.

## Arquivos a não engordar

`booksDataCollectorService.ts` e `booksDisparoService.ts` já passam de 2.000 linhas. Lógica nova relacionada a eles deve ir para um arquivo novo e ser importada, não anexada.

Antes de criar um service novo de PDF: já existem quatro (`booksPDFService`, `booksPDFServiceV2`, `booksPDFServicePuppeteer`, `puppeteerPDFService`). Confirme qual está em uso.
