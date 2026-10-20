-- Migration: Garantir que tela GERACAO_BOOKS existe e tem permissões
-- Data: 2026-03-03
-- Problema: Usuários não conseguem acessar books por falta de permissão

-- ============================================================================
-- PASSO 1: Garantir que a tela existe e normalizar o key
-- ============================================================================

DO $$
DECLARE
  screen_exists BOOLEAN;
  screen_key_found TEXT;
BEGIN
  -- Buscar tela com case-insensitive
  SELECT key INTO screen_key_found 
  FROM screens 
  WHERE key ILIKE 'geracao_books' 
  LIMIT 1;
  
  IF screen_key_found IS NOT NULL THEN
    RAISE NOTICE '✅ Tela encontrada com key: %', screen_key_found;
    
    -- Se não for exatamente 'GERACAO_BOOKS', normalizar
    IF screen_key_found != 'GERACAO_BOOKS' THEN
      -- Abordagem: Criar nova tela, migrar permissões, deletar antiga
      
      -- 1. Criar tela com key correto (se não existir)
      INSERT INTO screens (key, name, description, category, route)
      VALUES (
        'GERACAO_BOOKS',
        'Geração de Books',
        'Tela para geração e gerenciamento de books',
        'Books',
        '/admin/geracao-books'
      )
      ON CONFLICT (key) DO NOTHING;
      
      -- 2. Migrar permissões para o novo key
      UPDATE screen_permissions 
      SET screen_key = 'GERACAO_BOOKS' 
      WHERE screen_key = screen_key_found;
      
      -- 3. Deletar tela antiga
      DELETE FROM screens WHERE key = screen_key_found;
      
      RAISE NOTICE '✅ Key normalizado de % para GERACAO_BOOKS', screen_key_found;
    ELSE
      RAISE NOTICE '✅ Key já está correto: GERACAO_BOOKS';
    END IF;
  ELSE
    -- Criar tela se não existir
    INSERT INTO screens (key, name, description, category, route)
    VALUES (
      'GERACAO_BOOKS',
      'Geração de Books',
      'Tela para geração e gerenciamento de books',
      'Books',
      '/admin/geracao-books'
    )
    ON CONFLICT (key) DO NOTHING;
    
    RAISE NOTICE '✅ Tela GERACAO_BOOKS criada';
  END IF;
END $$;

-- ============================================================================
-- PASSO 2: Garantir permissões para Administradores
-- ============================================================================

DO $$
BEGIN
  -- Conceder permissão de edição para Administradores
  INSERT INTO screen_permissions (group_id, screen_key, permission_level)
  SELECT ug.id, 'GERACAO_BOOKS', 'edit'
  FROM user_groups ug 
  WHERE ug.name = 'Administradores'
  ON CONFLICT (group_id, screen_key) 
  DO UPDATE SET permission_level = EXCLUDED.permission_level;

  RAISE NOTICE '✅ Permissão concedida para Administradores';
END $$;

-- ============================================================================
-- PASSO 3: Atualizar função para usar key correto
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_books_permission(required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role sempre tem acesso
  IF current_setting('role', true) = 'service_role' THEN
    RETURN true;
  END IF;

  -- Verificar se usuário tem permissão na tela 'GERACAO_BOOKS'
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key = 'GERACAO_BOOKS'  -- ✅ Key correto em maiúsculas
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$;

COMMENT ON FUNCTION public.user_has_books_permission(TEXT) IS 
'Verifica se usuário autenticado tem permissão específica na tela GERACAO_BOOKS. Usa SECURITY DEFINER e search_path fixo para segurança.';

DO $$
BEGIN
  RAISE NOTICE '✅ Função user_has_books_permission atualizada';
END $$;

-- ============================================================================
-- PASSO 4: Verificação final
-- ============================================================================

DO $$
DECLARE
  admin_group_id UUID;
  has_permission BOOLEAN;
BEGIN
  -- Pegar ID do grupo Administradores
  SELECT id INTO admin_group_id FROM user_groups WHERE name = 'Administradores';
  
  -- Verificar se tem permissão
  SELECT EXISTS (
    SELECT 1 FROM screen_permissions 
    WHERE group_id = admin_group_id 
      AND screen_key = 'GERACAO_BOOKS'
      AND permission_level = 'edit'
  ) INTO has_permission;
  
  IF has_permission THEN
    RAISE NOTICE '✅ Administradores têm permissão edit em GERACAO_BOOKS';
  ELSE
    RAISE WARNING '⚠️ Administradores NÃO têm permissão em GERACAO_BOOKS!';
  END IF;
END $$;

-- ============================================================================
-- LOGS FINAIS
-- ============================================================================

-- Listar telas relacionadas a books
SELECT 
  key,
  name,
  description,
  category
FROM screens
WHERE key ILIKE '%books%'
ORDER BY key;

-- Listar permissões de GERACAO_BOOKS
SELECT 
  ug.name as group_name,
  sp.screen_key,
  sp.permission_level
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
WHERE sp.screen_key = 'GERACAO_BOOKS'
ORDER BY ug.name;
