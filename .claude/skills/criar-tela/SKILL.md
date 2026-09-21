---
name: criar-tela
description: Step-by-step workflow for adding a new administrative screen/page in Books SND, including database registration, service, hook, page, route, permissions, and sidebar entry. Use when the user asks to create a new admin page/screen.
---

# Criar Nova Tela Administrativa

Fluxo completo para criar uma página administrativa nova no Books SND, do banco até o menu. Passos 1-2 casam com o agente `database-engineer`, 3-4 com `backend-engineer`, 5-7 com `frontend-engineer` — delegue se a tarefa for grande o bastante para valer o isolamento de contexto, senão siga direto.

## 1. Registrar a tela no banco de dados

```sql
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'chave_da_tela',           -- snake_case, único
  'Nome da Tela',
  'Descrição da funcionalidade',
  'Categoria',                -- Ex: Administração, Operações
  '/admin/caminho-da-tela'
) ON CONFLICT (key) DO NOTHING;

-- Conceder permissão para Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'chave_da_tela', 'edit'
FROM user_groups ug WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = EXCLUDED.permission_level;
```

## 2. Estrutura de dados (se necessário)

- Criar tabela(s) com o template padrão (veja a skill `criar-migration`)
- Definir políticas RLS
- Criar tipos em `src/types/`

## 3. Criar service (TDD — teste antes do código, ver `CLAUDE.md`)

1. Escreva `src/services/__tests__/[dominio]Service.test.ts` cobrindo o CRUD (cenário feliz + erro) e rode: deve falhar (service ainda não existe).
2. Implemente `src/services/[dominio]Service.ts` só o suficiente para os testes passarem — tipagem completa, tratamento de erros. Template do service: skill `padroes-codigo`, `references/services.md`.

## 4. Criar hook (TDD)

1. Escreva `src/hooks/__tests__/use[Dominio].test.ts`, confirme que falha.
2. Implemente `src/hooks/use[Dominio].ts` até o teste passar — template em skill `padroes-codigo`, `references/hooks.md`.

## 5. Criar página

`src/pages/admin/[NomePagina].tsx`, seguindo obrigatoriamente:

```tsx
import AdminLayout from '@/components/admin/LayoutAdmin';

function NomePagina() {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Header: título + subtítulo + botões de ação */}
          {/* Cards de estatísticas (opcional) */}
          {/* Card principal com filtros + tabela ou form */}
        </div>
      </div>
    </AdminLayout>
  );
}

export default NomePagina;
```

Classes exatas de header, cards, filtros, tabela, formulário e modal: skill `design-system` (abra só a referência do elemento que a tela usa).

## 6. Registrar rota em `src/App.tsx`

```tsx
import NomePagina from './pages/admin/NomePagina';

<Route
  path="/admin/caminho-da-tela"
  element={
    <ProtectedRoute screenKey="chave_da_tela">
      <NomePagina />
    </ProtectedRoute>
  }
/>
```

## 7. Adicionar no menu

Atualize `src/components/admin/Sidebar.tsx` com o item de menu e um ícone Lucide adequado, se a tela deve aparecer na navegação.

## 8. Verificação final

- [ ] Tela acessível apenas com a permissão adequada
- [ ] Layout segue o design system (`px-6`, `sonda-blue`, etc.)
- [ ] Estados de loading, empty e error tratados
- [ ] Responsividade OK
- [ ] Testes de service e hook escritos antes da implementação (não depois) e `npm run test:run` verde
- [ ] `npm run build` sem erros

## Estrutura de arquivos resultante

```
src/
├── types/[dominio].ts
├── services/[dominio]Service.ts
├── hooks/use[Dominio].ts
├── pages/admin/[NomePagina].tsx
└── components/admin/[dominio]/   (se necessário)
```

## Referências relacionadas

`CLAUDE.md` · `.claude/references/dominios.md` (checar se o domínio já existe) · skill `design-system` · skill `padroes-codigo` · skill `criar-migration` · skill `autenticacao` · skill `testes`
