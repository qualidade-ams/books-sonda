---
name: deploy
description: Deploy workflow for Books SND covering the Vercel frontend/serverless auto-deploy, Supabase migrations and Edge Functions, rollback procedures, and post-deploy monitoring checklist. Use when the user asks to deploy, ship, or release a change, or needs to roll back a bad deploy.
---

# Deploy

## Deploy automático (Vercel)

Frontend + serverless functions:
1. Push para uma branch → preview deploy automático.
2. Merge para `main` → deploy de produção automático.
3. Vercel executa `npm run build` e publica `dist/`.

### Verificação pré-deploy

- [ ] `npm run build` sucede localmente sem erros
- [ ] `npm run lint` sem erro novo (o projeto tem ~11 erros pré-existentes conhecidos e ~890 warnings — não é meta zerar isso num deploy normal, é não aumentar)
- [ ] `npm run typecheck` sem erros
- [ ] `npm run test:run` verde
- [ ] Variáveis de ambiente configuradas no Vercel Dashboard
- [ ] Nenhum `console.log` com dados sensíveis (ver regra de logging em `CLAUDE.md`)
- [ ] CI (`.github/workflows/ci.yml`) verde no PR antes do merge

## Deploy de migrations (Supabase)

1. Desenvolver a migration seguindo a skill `criar-migration`.
2. Testar em ambiente de dev/branch antes de produção.
3. Aplicar em produção (via MCP do Supabase, se conectado, ou CLI/SQL Editor). Projeto: `qiahexepsdggkzgmklhq`.
4. Verificar Security Advisors após aplicação.
5. Regenerar types (`src/integrations/supabase/types.ts`) se o schema mudou.

### Checklist de migration em produção

- [ ] Testada em dev/branch
- [ ] Backup do Supabase disponível (automático, diário)
- [ ] Migration reversível (tem `DROP IF EXISTS` correspondente)
- [ ] Não quebra dados existentes
- [ ] Aplicada em horário de baixo uso, quando possível

## Deploy de Edge Functions

Via MCP (se disponível) ou `supabase functions deploy`, sempre com `verify_jwt: true` exceto para webhooks públicos.

## Rollback

**Frontend**: Vercel mantém deploys anteriores — rollback instantâneo pelo Dashboard, ou reverter o commit e dar push em `main`.

**Database**: Supabase mantém backups diários. Para migrations simples, aplique a migration reversa (`DROP`/`ALTER`). Para mudanças complexas, restaure o backup pelo Dashboard.

## Monitoramento pós-deploy

1. Logs das Vercel Functions (erros 500)
2. Logs do Supabase (queries lentas, erros de RLS)
3. Testar manualmente os fluxos críticos: login/logout, geração de book, envio de elogios, consulta de banco de horas
4. Checar Security e Performance Advisors do Supabase
