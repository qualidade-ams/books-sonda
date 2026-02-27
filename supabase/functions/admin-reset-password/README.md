# Edge Function: admin-reset-password

Esta Edge Function permite que administradores resetem a senha de usuários no sistema Books SND.

## Funcionalidades

- Verifica se o usuário que está fazendo a requisição tem permissões de administrador
- Valida a nova senha (mínimo 6 caracteres)
- Impede que o usuário resete a própria senha por esta função
- Usa a API Admin do Supabase para resetar a senha de forma segura

## Deploy

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login no Supabase

```bash
supabase login
```

### 3. Link com o projeto

```bash
supabase link --project-ref SEU_PROJECT_REF
```

### 4. Deploy da função

```bash
supabase functions deploy admin-reset-password
```

### 5. Configurar variáveis de ambiente (se necessário)

As seguintes variáveis são automaticamente disponibilizadas pelo Supabase:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## Uso

A função é chamada automaticamente pelo serviço `userManagementService.ts` quando um administrador tenta resetar a senha de um usuário através da interface de gerenciamento de usuários.

### Endpoint

```
POST https://SEU_PROJECT_REF.supabase.co/functions/v1/admin-reset-password
```

### Headers

```
Authorization: Bearer SEU_ACCESS_TOKEN
Content-Type: application/json
```

### Body

```json
{
  "userId": "uuid-do-usuario",
  "newPassword": "nova-senha-minimo-6-caracteres"
}
```

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Senha resetada com sucesso",
  "userId": "uuid-do-usuario"
}
```

### Resposta de Erro

```json
{
  "success": false,
  "error": "Mensagem de erro"
}
```

## Segurança

- Requer autenticação via token JWT
- Verifica permissões de administrador antes de executar
- Usa Service Role Key apenas no backend (Edge Function)
- Não permite que o usuário resete a própria senha
- Valida força da senha

## Permissões Necessárias

O usuário que faz a requisição deve ter uma das seguintes permissões:

1. Pertencer ao grupo "Administradores", "Admin" ou "Administrador"
2. Ter permissão de nível "admin" ou "edit" na tela "cadastro-usuarios"

## Logs

A função registra logs detalhados no console do Supabase:
- ✅ Senha resetada com sucesso
- ❌ Erros de autenticação, permissão ou validação

## Troubleshooting

### Erro: "Não autenticado"
- Verifique se o token JWT está sendo enviado corretamente no header Authorization

### Erro: "Você não tem permissão para resetar senhas de usuários"
- Verifique se o usuário pertence ao grupo de administradores
- Verifique as permissões na tabela `screen_permissions`

### Erro: "Senha deve ter pelo menos 6 caracteres"
- A senha fornecida é muito curta. Use pelo menos 6 caracteres.

### Erro: "Não é possível resetar a própria senha por esta função"
- Use a opção de alterar senha no perfil do usuário em vez desta função.
