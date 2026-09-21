---
name: autenticacao
description: Operational guide for adding permissions to a new screen, protecting routes/actions, checking permissions programmatically, and troubleshooting access-denied issues in Books SND's RBAC system. Use when granting screen access, wiring ProtectedRoute/ProtectedAction, or diagnosing a permission bug.
---

# Autenticação e Permissões

Casa com o agente `auth-engineer` para investigações mais profundas (ex.: bug de sessão intermitente).

## Adicionar permissão para uma tela nova

### 1. Registrar a screen no banco

```sql
INSERT INTO screens (key, name, description, category, route)
VALUES ('nova_tela', 'Nome da Tela', 'Descrição', 'Categoria', '/admin/nova-tela')
ON CONFLICT (key) DO NOTHING;
```

### 2. Conceder permissão

```sql
-- Administradores (edit)
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'nova_tela', 'edit'
FROM user_groups ug WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = EXCLUDED.permission_level;

-- Outros grupos (view)
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'nova_tela', 'view'
FROM user_groups ug WHERE ug.name = 'Operadores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = EXCLUDED.permission_level;
```

### 3. Proteger a rota no frontend

```tsx
<Route path="/admin/nova-tela" element={
  <ProtectedRoute screenKey="nova_tela">
    <NovaTela />
  </ProtectedRoute>
} />
```

### 4. Proteger ações sensíveis

```tsx
<ProtectedAction screenKey="nova_tela" requiredLevel="edit">
  <Button onClick={handleDelete}>Excluir</Button>
</ProtectedAction>
```

## Verificar permissões programaticamente

```typescript
const { hasPermission } = usePermissions();

if (hasPermission('nova_tela', 'view')) { /* ... */ }
if (hasPermission('nova_tela', 'edit')) { /* ... */ }
```

## Criar novo grupo de usuários

1. Inserir na tabela `user_groups`.
2. Definir `screen_permissions` para o grupo.
3. Atribuir usuários ao grupo via `user_group_assignments`.

## Troubleshooting

| Problema | Causa provável | Solução |
|----------|-----------------|---------|
| Tela não aparece | `screenKey` não registrado | `INSERT` na tabela `screens` |
| Access denied | Grupo sem permissão | `INSERT` em `screen_permissions` |
| Permissões não atualizam | Cache stale | Chamar `refreshPermissions()` |
| Loop de redirect | `isReady` false | Verificar inicialização do `AuthProvider` |
