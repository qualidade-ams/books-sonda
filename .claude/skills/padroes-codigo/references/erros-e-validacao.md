# Erros, tipos e validação

## Onde cada coisa acontece

| Camada | Responsabilidade |
|---|---|
| Service | `try/catch` se precisar de tratamento específico; sempre `throw new Error('mensagem descritiva')` |
| Hook | não trata; expõe `error` e mostra toast em `onError` da mutation |
| Página | renderiza estado de erro; não faz `try/catch` de rede |

## Service

```ts
class ExampleService {
  async riskyOperation(): Promise<Result> {
    try {
      const { data, error } = await supabase.from('table').select('*');
      if (error) throw new Error(`Falha ao carregar registros: ${error.message}`);
      return data;
    } catch (error) {
      // Só error.message — nunca o objeto inteiro (pode conter PII)
      console.error('ExampleService.riskyOperation:', (error as Error).message);
      throw error; // re-throw para o hook capturar
    }
  }
}
```

O `catch` só se justifica quando há log ou conversão de erro. Se for apenas re-lançar, deixe o erro subir.

## Classes de erro do domínio

`src/errors/` tem erros tipados do projeto (ex.: `PermissionErrors`). Use-os quando a página precisa distinguir o tipo de falha (permissão negada vs. registro não encontrado) em vez de comparar strings de mensagem.

## Error boundaries e retry

| Recurso | Papel |
|---|---|
| `GlobalErrorBoundary` | captura erro não tratado em qualquer ponto da árvore |
| `PermissionErrorBoundary` | trata especificamente falha de acesso |
| `retryWithBackoff` | reexecuta operação de rede com backoff |

Ficam em `src/components/errors/` e `src/utils/`. Uma página nova não precisa montar boundary próprio — os globais já cobrem; só adicione um local se a falha daquela subárvore precisar de tratamento diferente.

## Tipos

```ts
// Interface para shape de objeto
interface BookData {
  id: string;
  empresa_id: string;
  periodo: string;
  status: 'rascunho' | 'gerado' | 'enviado';
  created_at: string;
}

// Type para union e primitivo derivado
type PermissionLevel = 'view' | 'edit' | 'none';
```

Prefira union type a `enum`. Tipos de domínio ficam em `src/types/<dominio>.ts`; os tipos gerados do banco ficam em `src/integrations/supabase/types.ts` e não são editados à mão.

O TypeScript deste projeto é **propositalmente relaxado** (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`). Não assuma inferência estrita nem tente "corrigir" isso em massa sem alinhar antes.

## Validação Zod

```ts
import { z } from 'zod';

const bookSchema = z.object({
  empresa_id: z.string().uuid('Empresa inválida'),
  periodo: z.string().min(1, 'Período obrigatório'),
  template_id: z.string().uuid().optional(),
  observacoes: z.string().max(500, 'Máximo de 500 caracteres').optional(),
});

type BookFormData = z.infer<typeof bookSchema>;
```

- Schemas compartilhados em `src/schemas/`; schema usado por uma tela só pode ficar no topo do arquivo dela.
- Mensagens em português, específicas do campo.
- Derive o tipo do schema com `z.infer` em vez de escrever a interface duas vezes.
- Validação de formulário não substitui validação no banco: constraints e RLS continuam sendo a barreira real.

Uso do schema com React Hook Form: skill `design-system`, `references/formularios.md`.
