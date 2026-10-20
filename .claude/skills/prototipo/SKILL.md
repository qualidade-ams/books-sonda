---
name: prototipo
description: Cria protótipo visual navegável de uma tela do Books SND com os componentes reais do design system (AdminLayout, shadcn/ui, classes Sonda) e dados fictícios, numa rota só de desenvolvimento (/prototipos/:slug). Use quando o usuário pedir protótipo, mock, rascunho ou "como ficaria" uma tela antes de implementá-la, ou quiser validar layout sem banco/service.
---

# Protótipo Visual

## Objetivo

Mostrar como uma tela vai ficar **antes** de implementá-la, com fidelidade total ao sistema: mesmos componentes, mesmas classes, mesmo shell. Quando aprovado, o JSX é reaproveitado na tela real — só o mock é trocado pelo hook.

## Quando utilizar

Pedidos de protótipo, mock, wireframe navegável, "como ficaria a tela X", ou para alinhar layout com o usuário antes de `criar-tela` / `criar-feature`. Para implementar a tela de verdade, use `criar-tela`.

## Como funciona (já pronto, não recriar)

- Rota `/prototipos` (lista) e `/prototipos/:slug`, registrada em `src/App.tsx` **só quando `import.meta.env.DEV`** — não existe no bundle de produção.
- Protegida por `ProtectedRoute screenKey="design_system"`: não registrar nada em `screens`/`screen_permissions`.
- `src/pages/Prototipos.tsx` descobre os arquivos sozinho via `import.meta.glob('./prototipos/*.tsx')`. Slug = nome do arquivo em kebab-case (`ListaContratos.tsx` → `/prototipos/lista-contratos`).
- Painel flutuante (canto inferior direito) alterna o estado passado ao protótipo: `dados | carregando | vazio | erro` (tipo `PrototipoProps` em `@/utils/prototipos`).
- Referência completa: `src/pages/prototipos/Exemplo.tsx` + `mocks/exemplo.ts`.

## Regras

1. **Onde**: `src/pages/prototipos/<NomeTela>.tsx` (PascalCase, export default recebendo `{ estado }: PrototipoProps`). Dados em `src/pages/prototipos/mocks/<nomeTela>.ts`.
2. **Proibido no protótipo**: Supabase, services, hooks de dados, migrations, mudança em Sidebar ou em `screens`. Só componentes, mocks e `useState` local.
3. **Fidelidade**: carregue a skill `design-system` e use os templates dela sem variar classes. Shell obrigatório: `<AdminLayout>` → `min-h-screen bg-bg-secondary` → `px-6 py-6 space-y-8`. Prefira os wrappers de `components/ui` (`stats-card`, `filter-bar`, `empty-state`, `page-header`).
4. **Os 4 estados** precisam ser tratados a partir de `estado` (vazio com ação, erro com "tentar novamente", carregando com Skeleton).
5. **Dados fictícios**: nada de nome, email ou dado real de cliente/usuário (LGPD — skill `seguranca`). Use "Empresa Alfa", "Usuário Teste" etc. Mocks tipados com a mesma forma que o tipo real de `src/types/` terá, para a promoção ser só trocar a fonte.
6. **TDD**: protótipo é descartável e **não** exige teste — exceção restrita a `src/pages/prototipos/`. Ao promover para tela real, o TDD volta a valer integralmente.
7. Interação (abrir modal, trocar aba, filtrar a lista mock) pode ser feita com estado local; não simule chamadas assíncronas.

## Fluxo de execução

1. Entenda a tela: objetivo, dados exibidos, ações. Se houver tela parecida (ver `.claude/references/dominios.md`), leia-a e siga o mesmo padrão.
2. Carregue a skill `design-system` e abra só as referências dos elementos envolvidos.
3. Copie `Exemplo.tsx` para `<NomeTela>.tsx`, crie o mock e monte a tela.
4. `npm run typecheck` (o protótipo compila junto com o app).
5. Rode `npm run dev` e informe a URL `http://localhost:8080/prototipos/<slug>` (requer login com acesso à tela Design System). Se houver ferramenta de navegador disponível, tire prints dos 4 estados para o usuário.
6. Opcional: peça revisão ao agente `ui-ux-engineer`.
7. Itere com o usuário até aprovar.

## Promover para tela real

Siga `criar-tela` (com TDD): mova o JSX para `src/pages/admin/<NomeTela>.tsx`, substitua `estado`/mock por `isLoading`/`error`/`data` do hook e **apague** o protótipo e o mock. Protótipo de tela já implementada não deve ficar no repositório.
