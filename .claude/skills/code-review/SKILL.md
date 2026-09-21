---
name: code-review
description: Code review checklist for Books SND covering architecture/layering, TypeScript, React/TanStack Query patterns, design system consistency, security, database/RLS, and general quality — with approval-tier guidance. Use when reviewing a diff, PR, or finished change in this repo.
---

# Code Review

Para uma revisão isolada e mais rigorosa (sem o viés de quem escreveu o código), delegue ao agente `cto-agent` (arquitetura/consistência geral) ou `security-engineer` (foco em segurança).

`npm run lint` funciona (flat config em `eslint.config.js`), mas o baseline atual tem ~11 erros e ~890 warnings pré-existentes (a maior parte `no-unused-vars`/`exhaustive-deps`, condizente com o TS relaxado do projeto — ver `CLAUDE.md`). Não trate "lint não subiu warning novo" como suficiente; rode `npm run lint` e confira que sua mudança não aumentou a contagem de erros. `npm run format:check` ainda não está no CI porque o repo nunca rodou Prettier (676 arquivos pendentes) — formatação é aplicada automaticamente nos arquivos tocados via Husky/lint-staged no commit.

## 1. Arquitetura e organização

- [ ] Código na camada correta (`Page → Hook → Service → Supabase`)
- [ ] Responsabilidades separadas (UI sem lógica de negócio)
- [ ] Imports na ordem padronizada (ver `CLAUDE.md`)
- [ ] Nomenclatura segue as convenções (PascalCase/camelCase)
- [ ] Arquivo no diretório correto (`types/`, `services/`, `hooks/`, etc.)

## 2. TypeScript

- [ ] Props de componentes tipadas com `interface`
- [ ] Retorno de função pública tipado, sem `any`
- [ ] Types em `src/types/`, não inline
- [ ] Uso correto de `interface` vs `type`

## 3. React e performance

- [ ] `useEffect` com cleanup quando necessário
- [ ] `useMemo`/`useCallback` onde há ganho real
- [ ] `key` única em listas
- [ ] Sem re-renders desnecessários
- [ ] Estado no nível correto (local vs. context vs. query)

## 4. TanStack Query

- [ ] `queryKey` descritivo e hierárquico
- [ ] `staleTime`/`gcTime` adequados
- [ ] Mutations invalidam as queries relacionadas
- [ ] `enabled` para queries condicionais
- [ ] `onError` tratado

## 5. Design system e UI

- [ ] Cores do design system Sonda
- [ ] Layout `px-6 py-6 space-y-8`
- [ ] Componentes shadcn/ui utilizados
- [ ] Estados de loading, empty e error
- [ ] Responsividade mobile-first

## 6. Segurança

- [ ] `ProtectedRoute` com `screenKey` na rota
- [ ] `ProtectedAction` em ações sensíveis
- [ ] Input validado com Zod antes do envio
- [ ] Nenhum dado sensível logado
- [ ] `service_role_key` fora do frontend

## 7. Banco de dados (se houver migration)

- [ ] RLS habilitado
- [ ] Políticas completas e sem duplicatas
- [ ] `(SELECT auth.uid())` nas políticas
- [ ] Funções com `SECURITY DEFINER SET search_path`
- [ ] `TIMESTAMPTZ DEFAULT NOW()`
- [ ] Índices em campos de busca/filtro

## 8. TDD

- [ ] Existe teste cobrindo a mudança (service/hook, e componente se houver lógica relevante)
- [ ] O teste falha se a mudança de implementação for revertida (ou seja, ele realmente testa o comportamento, não é um teste vazio) — se em dúvida, comente a implementação temporariamente e confirme que o teste quebra
- [ ] Se não há teste e a mudança tem lógica não-trivial, isso é motivo de reprovação, não um "nice to have"

## 9. Qualidade geral

- [ ] Sem `console.log` de debug esquecido
- [ ] Tratamento de erro (try/catch + toast)
- [ ] `npm run build` sucede
- [ ] `npm run lint` não introduziu erro novo (warnings pré-existentes são esperados, ver nota acima)

## Critério de profundidade da revisão

- **Aprovação imediata**: typo, doc, patch de dependência.
- **Revisão leve** (passagem única pelo checklist): bugfix pontual, melhoria de UI sem lógica nova, refactor sem mudança de comportamento.
- **Revisão completa** (checklist inteiro): feature nova, mudança no banco, mudança em auth/permissões, alteração em serverless function.
