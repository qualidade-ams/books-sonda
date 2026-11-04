# consulta-empresas

Leitura da tabela `empresas` para sistemas externos. Devolve só `nome_completo`, `nome_abreviado` e `status`.

## Chamada

```
GET https://qiahexepsdggkzgmklhq.supabase.co/functions/v1/consulta-empresas
x-api-key: <chave>
```

Filtro opcional: `?status=ativo` ou `?status=inativo`.

Resposta `200`, ordenada por `nome_abreviado`:

```json
{ "data": [{ "nome_completo": "...", "nome_abreviado": "...", "status": "ativo" }] }
```

| Código | Quando                                            |
| ------ | ------------------------------------------------- |
| 400    | `status` diferente de `ativo`/`inativo`           |
| 401    | header `x-api-key` ausente ou errado              |
| 405    | método diferente de `GET`                         |
| 500    | secret não configurado ou falha na consulta       |

## Publicação

O acesso é pela chave própria, então a função sobe **sem** verificação de JWT:

```bash
supabase secrets set EMPRESAS_LEITURA_API_KEY=<chave gerada>
supabase functions deploy consulta-empresas --no-verify-jwt
```

Gerar a chave (32 bytes aleatórios): `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.

Para revogar ou trocar a chave, basta rodar de novo o `secrets set` com outro valor. Não há redeploy.

A chave não vai para o git, para o frontend nem para variáveis `VITE_*`. Entregue ao outro sistema por canal seguro.

A lógica fica em `logica.ts` (sem dependência de Deno) e é testada no Vitest em `__tests__/logica.test.ts`.
