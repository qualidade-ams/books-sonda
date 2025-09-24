-- Script de debug para testar a tabela anexos_temporarios

-- 1. Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'anexos_temporarios'
) as tabela_existe;

-- 2. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'anexos_temporarios'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'anexos_temporarios';

-- 4. Verificar se RLS está habilitado
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE tablename = 'anexos_temporarios';

-- 5. Testar inserção simples (usando uma empresa existente)
-- Primeiro, vamos ver se temos empresas
SELECT id, nome_completo FROM empresas_clientes LIMIT 3;

-- 6. Verificar buckets do Supabase Storage
SELECT name, id, public FROM storage.buckets WHERE name LIKE '%anexo%';

-- 7. Verificar se existem registros na tabela
SELECT COUNT(*) as total_registros FROM anexos_temporarios;

-- 8. Se houver registros, mostrar alguns exemplos
SELECT id, empresa_id, nome_original, status, data_upload
FROM anexos_temporarios
ORDER BY data_upload DESC
LIMIT 5;