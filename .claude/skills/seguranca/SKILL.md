---
name: seguranca
description: Regras de segurança aplicáveis ao escrever código no Books SND — proibição de logar dados pessoais (PII/LGPD) no console, manuseio de secrets e variáveis de ambiente, e as duas camadas de autorização (frontend + RLS). Use ao adicionar logs, tratar erros, lidar com chaves/variáveis de ambiente, ou revisar código sob a ótica de segurança.
---

# Segurança — Books SND

## Objetivo

Impedir que código novo exponha dados pessoais no console do navegador, vaze credenciais ou dependa apenas do frontend para autorizar acesso.

## Quando utilizar

Ao escrever ou revisar qualquer `console.*`, ao lidar com variáveis de ambiente ou chaves, ao criar tela/ação que precisa de permissão, e em toda revisão de código. Para escrever políticas RLS use a skill `criar-migration`; para configurar permissão de tela use `autenticacao`.

## Regras essenciais

### 1. Nunca logar dados pessoais

O console do navegador é visível a qualquer usuário com DevTools. Logar PII é violação de LGPD, não questão de estilo.

| Método | Permitido |
|---|---|
| `console.error` | Sim — apenas `error.message` ou `error.code` |
| `console.warn` | Raro — só aviso técnico sem dado pessoal |
| `console.log` / `console.info` | Evitar — no máximo contadores |
| `console.debug` | Só com guarda `import.meta.env.DEV` e sem PII |

Nunca aparecem em log: nome, email, telefone, CPF, UUID de usuário, objeto `profile`/`user`, payload completo de query, token de sessão, mapeamento id→nome (`usersMap`, `profilesMap`), array de IDs.

```ts
// ✅
console.error('Erro ao buscar profiles:', error.message);
// ❌
console.error('Erro:', error, userData, profiles);
```

Detalhe, exemplos por camada e checklist de revisão: `references/logging-pii.md`.

### 2. Secrets

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** no frontend — só em Edge Function ou backend.
- Variáveis `VITE_*` são públicas por definição: tudo que estiver nelas chega ao bundle. A proteção real é RLS.
- Nenhuma credencial em arquivo versionado. `sync-api/.env.temp` e `sync-api/deployment/.env.production.sondalyze` estão versionados com exceção explícita no `.gitignore` — isso é um vazamento real ainda não remediado; **não replique esse padrão** em arquivo novo.
- Não commitar chave, senha ou string de conexão nem em comentário, exemplo ou teste.

### 3. Autorização em duas camadas

- **Frontend (UX)**: `ProtectedRoute` por `screenKey` para rota, `ProtectedAction` para ação pontual. Hierarquia: `edit > view > none`.
- **Postgres (barreira real)**: RLS. Toda tabela com RLS habilitado e políticas para SELECT/INSERT/UPDATE/DELETE.
- Esconder um botão no frontend **não** protege o dado. Se a tabela não tem RLS adequada, o dado está exposto via API.

### 4. Entrada de usuário

- Validar com Zod antes de enviar ao service.
- Nunca montar SQL por concatenação de string — usar o query builder do Supabase.
- Conteúdo vindo do usuário não vai para `dangerouslySetInnerHTML` sem sanitização.

## Fluxo de execução

1. Antes de adicionar `console.*`, confira a tabela acima; na dúvida, não logue.
2. Ao tocar em variável de ambiente, confirme se ela pode ser pública (`VITE_*`) ou precisa ficar no servidor.
3. Ao criar tela/ação, confirme as duas camadas: `ProtectedRoute`/`ProtectedAction` **e** RLS.
4. Antes de fechar a tarefa, rode o checklist de `references/logging-pii.md`.

## Referências relacionadas

- `references/logging-pii.md` — exemplos por camada, exceções de debug, checklist
- Skill `criar-migration`, `references/rls.md` — escrever e verificar políticas RLS
- Skill `autenticacao` — registrar tela e conceder permissão
- Agente `security-engineer` — auditoria isolada em vários arquivos
