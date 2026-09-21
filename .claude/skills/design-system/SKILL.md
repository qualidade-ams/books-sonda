---
name: design-system
description: Padrões visuais do Books SND (cores Sonda, tipografia, espaçamento) e os templates reais de layout de página, filtros, formulários, tabelas, modais e feedback. Use ao criar ou revisar qualquer tela, componente ou elemento de UI, e quando precisar das classes Tailwind exatas de um componente.
---

# Design System — Books SND

## Objetivo

Garantir que toda UI nova seja indistinguível da existente: mesmas cores, mesmo espaçamento, mesmas classes Tailwind.

## Quando utilizar

Ao criar tela ou componente novo, ao revisar UI, ou sempre que a resposta exigir as classes exatas de um elemento. Para o fluxo completo de criar uma tela (banco → rota → menu), use a skill `criar-tela`; esta aqui é só a parte visual.

## Regras essenciais (decore estas, não precisa abrir referência)

- **Shell de página**: `<AdminLayout>` → `<div className="min-h-screen bg-bg-secondary">` → `<div className="px-6 py-6 space-y-8">`. **Nunca** `container mx-auto px-4` — causa espaçamento lateral excessivo, é erro recorrente no projeto.
- **Cores** (definidas em `tailwind.config.ts`): `sonda-blue` #2563eb, hover `sonda-dark-blue` #1d4ed8, `sonda-light-blue` #3b82f6, `sonda-accent-blue` #60a5fa. Estados: verde #10B981, amarelo #F59E0B, vermelho #EF4444.
- **Botão primário**: `className="bg-sonda-blue hover:bg-sonda-dark-blue"`. Secundário: `variant="outline"`. Destrutivo: `variant="destructive"`.
- **Foco de input/select**: `focus:ring-sonda-blue focus:border-sonda-blue`. Estado de erro: `border-red-500 focus:ring-red-500 focus:border-red-500` + `<p className="text-sm text-red-500">`.
- **Tipografia** (Inter): H1 `text-3xl font-bold tracking-tight`, H2 `text-2xl font-semibold`, H3 `text-xl font-semibold`, H4 `text-lg font-medium`, body `text-base`, auxiliar `text-sm`, label/meta `text-xs`.
- **Espaçamento**: entre seções `space-y-8`; dentro de card `space-y-6`; grid `gap-4` (ou `gap-3 lg:gap-4` em cards de estatística).
- **Bordas/sombras**: `rounded-lg`, `shadow-sm` em cards, `border-gray-200`.
- Componentes base vêm de `src/components/ui/` (shadcn/ui). Existem wrappers prontos: `page-header.tsx`, `stats-card.tsx`, `empty-state.tsx`, `filter-bar.tsx` — use antes de montar do zero.
- Toda tela precisa tratar **loading, vazio e erro**. Lista/tabela em branco sem contexto é bug de UX.
- Responsivo mobile-first: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `flex-col sm:flex-row`, tabela com `overflow-x-auto`.

## Fluxo de execução

1. Identifique quais elementos a tarefa envolve.
2. Abra **somente** a(s) referência(s) correspondente(s) na tabela abaixo.
3. Copie o template e adapte — não invente variação de classe.
4. Se houver tela parecida já pronta, leia-a e siga o que ela faz (ex.: `GeracaoBooks.tsx`, `ControleBancoHoras.tsx`).

## Referências relacionadas

| Preciso de… | Abrir |
|---|---|
| Shell de página, header, cards de estatística, cards de conteúdo, botões, tabs, navegação por período | `references/layout.md` |
| Barra de filtros expansível e cada tipo de campo de filtro | `references/filtros.md` |
| Formulário, campos, validação visual, react-hook-form + Zod | `references/formularios.md` |
| Tabela, cabeçalho, seleção múltipla, botões de ação, paginação | `references/tabelas.md` |
| Dialog simples, com formulário, com tabs, AlertDialog de confirmação | `references/modais.md` |
| Badges, toasts, alerts, loading, skeleton, estado vazio | `references/feedback.md` |

Tela viva com todos os componentes renderizados: `/admin/design-system` (`src/pages/admin/DesignSystem.tsx`).
