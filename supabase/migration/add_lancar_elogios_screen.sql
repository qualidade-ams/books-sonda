-- Migração para adicionar tela de Validar Elogios ao sistema de permissões

-- Registrar a tela no sistema
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'lancar_elogios',
  'Elogios',
  'Gerenciamento de pesquisas positivas (elogios)',
  'pesquisas',
  '/admin/lancar-elogios'
)
ON CONFLICT (key) DO UPDATE
SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  route = EXCLUDED.route;

-- Configurar permissão de edição para o grupo administrador
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, s.key, 'edit'
FROM user_groups ug 
CROSS JOIN screens s
WHERE ug.is_default_admin = true 
AND s.key = 'lancar_elogios'
ON CONFLICT (group_id, screen_key) DO UPDATE SET 
    permission_level = 'edit';

-- Verificar configuração
DO $$
BEGIN
  -- Verificar se a tela foi registrada
  IF EXISTS (SELECT 1 FROM screens WHERE key = 'lancar_elogios') THEN
    RAISE NOTICE '✓ Tela Elogios registrada com sucesso';
  ELSE
    RAISE WARNING '✗ Erro: Tela não foi registrada';
  END IF;

  -- Verificar se a permissão foi configurada
  IF EXISTS (
    SELECT 1 FROM screen_permissions sp
    JOIN user_groups ug ON sp.group_id = ug.id
    JOIN screens s ON sp.screen_key = s.key
    WHERE s.key = 'lancar_elogios'
    AND ug.is_default_admin = true
  ) THEN
    RAISE NOTICE '✓ Permissão configurada com sucesso para grupo administrador';
  ELSE
    RAISE WARNING '✗ Aviso: Permissão não foi configurada (grupo administrador pode não existir)';
  END IF;
END $$;
