---
name: corrigir-bug
description: Diagnosis and fix workflow for bugs in Books SND, including a quick symptom-to-cause lookup table (blank screen, data not loading, permission denied, stale data, broken layout). Use when the user reports something broken or behaving unexpectedly.
---

# Correção de Bug

## 1. Diagnóstico

- [ ] Reproduzir o bug (entender os passos exatos)
- [ ] Identificar o domínio afetado (ver `.claude/references/dominios.md`)
- [ ] Verificar logs (console do browser, Supabase, Vercel)
- [ ] Identificar a camada com problema: UI? Hook? Service? Banco?
- [ ] Checar se é regressão de uma mudança recente (`git log`/`git blame` na área afetada)

## 2. Análise de causa raiz

- [ ] Ler o código da área afetada
- [ ] Verificar erro de tipo TypeScript
- [ ] Verificar se a query retorna os dados esperados
- [ ] Verificar se RLS está bloqueando acesso indevidamente
- [ ] Verificar se o cache do TanStack Query está stale
- [ ] Verificar se a permissão está configurada (`screens`/`screen_permissions`)

## 3. Reproduzir o bug com um teste (Red — TDD obrigatório, ver `CLAUDE.md`)

- [ ] Escrever um teste na camada correta (service/hook, ver skill `testes`) que reproduz o bug e rodar: ele **deve falhar** da mesma forma que o bug se manifesta
- [ ] Se o bug não for razoavelmente testável de forma automatizada (ex.: puramente visual/CSS), documentar por que e seguir sem esse teste — é a exceção, não a regra

## 4. Implementar a correção (Green)

- [ ] Corrigir na camada correta — não aplicar "band-aid" na UI quando o problema é no service/banco
- [ ] Manter consistência com os padrões existentes (`CLAUDE.md`)
- [ ] Tratar edge cases relacionados
- [ ] Não introduzir efeitos colaterais novos
- [ ] O teste do passo 3 agora passa

## 5. Validação

- [ ] Bug original corrigido (teste de regressão verde)
- [ ] `npm run test:run` inteiro verde (cenários relacionados não quebraram)
- [ ] `npm run build` sem erros
- [ ] Sem warnings novos no console

## 6. Prevenção

- [ ] O teste de regressão do passo 3 permanece no repositório
- [ ] Se o bug revelou um gap nos padrões do projeto, considerar atualizar `CLAUDE.md` ou a skill correspondente em `.claude/skills/`

## Tabela de localização rápida

| Sintoma | Causa provável | Onde olhar | Agente para investigação profunda |
|---------|-----------------|------------|-------------------------------------|
| Tela em branco | Error boundary, crash de componente | Console do browser | frontend-engineer |
| Dados não carregam | `queryKey` errada, RLS, erro no service | Hook + Service + logs do Supabase | backend-engineer / database-engineer |
| Permissão negada | `screenKey` incorreto, grupo sem permissão | `PermissionsContext` + `screen_permissions` | auth-engineer |
| Ação não funciona | Mutation falhando, RLS bloqueando INSERT/UPDATE | Network tab + logs do Supabase | database-engineer |
| Dados desatualizados | Cache stale, query não invalidada | TanStack Query DevTools | frontend-engineer |
| Layout quebrado | CSS conflitante, responsividade | DevTools em modo mobile | ui-ux-engineer |
