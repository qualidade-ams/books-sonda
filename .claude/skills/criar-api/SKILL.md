---
name: criar-api
description: Workflow for creating a new Vercel Serverless Function or Supabase Edge Function in Books SND, including which one to pick and the request/response templates used in this codebase. Use when the user asks to add a new API endpoint or serverless function.
---

# Criar Nova API (Serverless Function)

Casa com o agente `backend-engineer` — delegue para ele se a API for complexa ou envolver múltiplas integrações externas.

**TDD**: extraia a lógica de negócio do handler para uma função/service testável (ex.: `processOperation` no template abaixo) e escreva o teste dela primeiro — o `handler` em si (parsing de request/response) é fino o bastante para não precisar de teste unitário isolado, mas a lógica que ele chama, sim.

## Quando usar cada opção

| Cenário | Solução |
|---------|---------|
| Heavy compute (PDF, imagens) | Vercel Serverless (Node.js + Puppeteer) |
| Operações admin (criar usuário) | Supabase Edge Function (Deno + `service_role`) |
| CRUD simples | Supabase direto via client JS (sem API própria) |
| Integração externa | Vercel Serverless ou Edge Function |

## Vercel Serverless Function

Estrutura: `api/[dominio]/[acao].ts` (ex.: `api/pdf/generate.ts`).

```typescript
import type { IncomingMessage, ServerResponse } from 'http';

interface RequestBody {
  // shape do body
}

export default async function handler(
  req: IncomingMessage & { body: RequestBody; method?: string },
  res: ServerResponse
) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body: RequestBody = req.body;
    if (!body.requiredField) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Campo obrigatório' }));
      return;
    }

    const result = await processOperation(body);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data: result }));
  } catch (error) {
    console.error('Erro:', error instanceof Error ? error.message : error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Erro interno',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    }));
  }
}
```

## Supabase Edge Function

Deploy: se houver MCP do Supabase conectado, use a ferramenta de deploy equivalente com `project_id: "qiahexepsdggkzgmklhq"`, `verify_jwt: true` (sempre `true` exceto para webhooks públicos). Caso contrário, use `supabase functions deploy` via CLI.

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const body = await req.json();
    // lógica da função...

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
```

## Checklist

- [ ] Método HTTP correto (POST para mutations, GET para queries)
- [ ] Validação de input completa
- [ ] CORS headers em Edge Functions
- [ ] Autenticação verificada (`verify_jwt` ou checagem manual do header)
- [ ] Erros tratados com mensagens claras, sem expor detalhes internos sensíveis
- [ ] Timeout configurado para chamadas a serviços externos
- [ ] Nenhuma `service_role_key` exposta na resposta ou em logs
