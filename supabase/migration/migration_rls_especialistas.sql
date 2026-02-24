-- ============================================
-- Migration: Configurar RLS para tabela especialistas
-- Data: 24/02/2026
-- Descrição: Habilita Row Level Security e cria políticas
--            para permitir acesso seguro aos especialistas
-- ============================================

-- 1. Habilitar RLS na tabela especialistas
ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas se existirem (para evitar duplicação)
DROP POLICY IF EXISTS "Usuários autenticados podem ver especialistas ativos" ON especialistas;
DROP POLICY IF EXISTS "Administradores podem ver todos os especialistas" ON especialistas;
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os especialistas" ON especialistas;

-- 3. Política para permitir leitura de todos os especialistas para usuários autenticados
-- IMPORTANTE: Esta política permite que qualquer usuário autenticado veja todos os especialistas
-- Se você precisar de controle mais granular, ajuste a política conforme necessário
CREATE POLICY "Usuários autenticados podem ver todos os especialistas"
ON especialistas
FOR SELECT
TO authenticated
USING (true);

-- 4. Política alternativa (comentada) - Apenas especialistas ativos
-- Descomente esta e comente a política acima se quiser restringir apenas a especialistas ativos
/*
CREATE POLICY "Usuários autenticados podem ver especialistas ativos"
ON especialistas
FOR SELECT
TO authenticated
USING (status = 'ativo');
*/

-- 5. Política alternativa (comentada) - Apenas administradores veem todos
-- Descomente esta se quiser que apenas administradores vejam todos os especialistas
/*
CREATE POLICY "Administradores podem ver todos os especialistas"
ON especialistas
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = auth.uid()
    AND ug.name = 'Administradores'
  )
);
*/

-- 6. Verificar se as políticas foram criadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'especialistas'
ORDER BY policyname;

-- 7. Verificar se RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'especialistas';

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 
-- 1. A política padrão permite que QUALQUER usuário autenticado
--    veja TODOS os especialistas. Isso é necessário para que
--    os hooks funcionem corretamente.
--
-- 2. Se você precisar de controle mais granular (ex: apenas
--    administradores podem ver todos, outros usuários apenas
--    os ativos), descomente as políticas alternativas acima.
--
-- 3. Após aplicar esta migration, reinicie o servidor de
--    desenvolvimento para que as mudanças tenham efeito.
--
-- 4. Teste o acesso com diferentes usuários para garantir
--    que as políticas estão funcionando corretamente.
--
-- ============================================
