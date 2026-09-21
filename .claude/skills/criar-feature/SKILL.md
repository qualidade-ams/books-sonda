---
name: criar-feature
description: Step-by-step workflow for implementing a new feature end-to-end in Books SND — from domain analysis through data modeling, service/hook layer, UI, security, and QA validation. Use when the user asks to add a new feature or capability that spans multiple layers (not just a single file tweak).
---

# Criar Nova Feature

Fluxo padronizado para implementar uma funcionalidade nova no Books SND com qualidade, segurança e consistência.

Antes de começar, tenha claro: requisitos definidos, domínio de negócio identificado, e impacto avaliado em outros módulos (consulte `.claude/references/dominios.md`).

**TDD é obrigatório neste projeto (ver `CLAUDE.md`)**: em cada camada abaixo que tem lógica testável (service, hook), escreva o teste primeiro, confirme que falha, só então implemente. Não implemente uma camada inteira e escreva os testes no final.

## 1. Análise e planejamento

- [ ] Identificar o domínio afetado (Books, Banco de Horas, Elogios, Pesquisas, Requerimentos, etc. — ver `.claude/references/dominios.md`)
- [ ] Verificar se a feature afeta mais de um domínio (se sim, considere delegar ao agente `cto-agent` para coordenar)
- [ ] Listar tabelas/serviços impactados
- [ ] Definir o approach: nova tabela? novo service? extensão de um existente?
- [ ] Verificar se há specs relacionadas em `.kiro/specs/` para atualizar

## 2. Modelagem de dados (se necessário)

Delegue ou aplique como o agente `database-engineer` (veja `.claude/agents/database-engineer.md`):
- [ ] Criar/alterar tabelas com o template padrão
- [ ] Definir índices necessários
- [ ] Criar políticas RLS completas
- [ ] Configurar trigger de `updated_at`
- [ ] Aplicar migration e verificar segurança (advisors/queries de verificação)

## 3. Backend / service layer (TDD)

Como o agente `backend-engineer`. Templates: skill `padroes-codigo` (`references/services.md`, `references/hooks.md`):
- [ ] Definir tipos em `src/types/`
- [ ] **Red** — escrever o teste do service em `src/services/__tests__/` (cenário feliz + ao menos um erro), rodar e confirmar que falha
- [ ] **Green** — implementar o service em `src/services/` (select específico, sem N+1, erros com mensagem descritiva) só até o teste passar
- [ ] **Red** — escrever o teste do hook em `src/hooks/__tests__/`, confirmar que falha
- [ ] **Green** — criar o hook em `src/hooks/` com TanStack Query até o teste passar
- [ ] **Refactor** — limpar mantendo `npm run test:run` verde

## 4. Frontend / UI

Como o agente `frontend-engineer`. Componente com lógica significativa (validação condicional, cálculo, branching) também segue Red/Green; UI puramente declarativa pode pular teste de componente (ver skill `testes`):
- [ ] Criar página em `src/pages/admin/`
- [ ] Seguir o design system (skill `design-system` — abrir só a referência do elemento usado)
- [ ] Implementar estados: loading, empty, error, success
- [ ] Adicionar rota protegida em `src/App.tsx`
- [ ] Registrar a tela (`screens`) e conceder permissão (`screen_permissions`) no banco

## 5. Segurança

Como o agente `security-engineer`. Regras detalhadas: skill `seguranca`:
- [ ] `ProtectedRoute` com `screenKey` adequado, `ProtectedAction` em ações sensíveis
- [ ] RLS validado para a(s) tabela(s) envolvidas
- [ ] Validação de input com Zod
- [ ] Nenhum dado sensível logado no console

## 6. Validação final

Como o agente `qa-engineer` — a essa altura os testes unitários já existem e passam (passos 3-4); este passo é a validação exploratória/manual que teste automatizado isolado não cobre:
- [ ] `npm run test:run` — suíte inteira verde
- [ ] Cenário feliz funciona de ponta a ponta
- [ ] Edge cases não cobertos por teste unitário tratados
- [ ] Diferentes níveis de permissão testados manualmente
- [ ] Responsividade OK
- [ ] `npm run build` sem erros

## Resultado esperado

Código seguindo os padrões do projeto, migration aplicada (se aplicável), UI consistente com o design system, permissões configuradas, sem vulnerabilidades de segurança conhecidas.

## Referências

`CLAUDE.md` · `.claude/references/estrutura.md` · skill `padroes-codigo` · skill `design-system` · skill `criar-migration` (`references/rls.md`)
