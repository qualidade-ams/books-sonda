-- Script para atualizar requerimentos existentes com autor
-- Este script deve ser executado no banco de dados para corrigir requerimentos sem autor

-- PASSO 1: Verificar quantos requerimentos não têm autor
SELECT 
    COUNT(*) as total_requerimentos,
    COUNT(CASE WHEN autor_id IS NULL THEN 1 END) as total_sem_autor,
    COUNT(CASE WHEN autor_id IS NOT NULL THEN 1 END) as total_com_autor
FROM requerimentos;

-- PASSO 2: Ver alguns exemplos de requerimentos sem autor
SELECT 
    id,
    chamado,
    autor_id,
    autor_nome,
    created_at
FROM requerimentos 
WHERE autor_id IS NULL
ORDER BY created_at DESC 
LIMIT 5;

-- PASSO 3: Listar usuários disponíveis para escolher um autor
SELECT 
    au.id,
    au.email,
    p.full_name,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at
LIMIT 10;

-- PASSO 4: Opção 1 - Se você souber qual usuário criou os requerimentos
-- Substitua 'USER_ID_AQUI' pelo ID do usuário correto da consulta acima
/*
UPDATE requerimentos 
SET 
    autor_id = 'USER_ID_AQUI',
    autor_nome = 'Nome do Usuário'
WHERE autor_id IS NULL;
*/

-- Opção 2: Se você quiser atribuir a um usuário administrador padrão
-- Primeiro, vamos ver as tabelas disponíveis para grupos
-- Verificar se existe user_groups ou permission_groups
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%group%';

-- Encontrar um usuário administrador (ajustar conforme sua estrutura)
SELECT 
    au.id,
    au.email,
    p.full_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email ILIKE '%admin%' 
   OR p.full_name ILIKE '%admin%'
   OR au.email ILIKE '%administrador%'
LIMIT 5;

-- Opção 3: Criar um usuário "Sistema" para requerimentos órfãos
-- (Execute apenas se não existir)
/*
INSERT INTO profiles (id, full_name, email, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Sistema - Requerimentos Legados',
    'sistema@empresa.com',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Depois atualizar os requerimentos órfãos
UPDATE requerimentos 
SET 
    autor_id = (SELECT id FROM profiles WHERE email = 'sistema@empresa.com'),
    autor_nome = 'Sistema - Requerimentos Legados'
WHERE autor_id IS NULL;
*/

-- Verificar o resultado após a atualização
SELECT 
    COUNT(*) as total_sem_autor,
    COUNT(CASE WHEN autor_id IS NOT NULL THEN 1 END) as total_com_autor
FROM requerimentos;

-- Mostrar alguns exemplos dos requerimentos atualizados
SELECT 
    id,
    chamado,
    autor_id,
    autor_nome,
    created_at
FROM requerimentos 
ORDER BY created_at DESC 
LIMIT 10;