-- Script: Verificar permissões do usuário atual
-- Data: 2026-02-26
-- Descrição: Verifica se o usuário logado tem permissão para organograma

-- Verificar usuário atual
SELECT 
  'Usuário Atual' as info,
  auth.uid() as user_id,
  (SELECT email FROM profiles WHERE id = auth.uid()) as email;

-- Verificar grupos do usuário
SELECT 
  'Grupos do Usuário' as info,
  ug.id as group_id,
  ug.name as group_name
FROM user_group_assignments uga
JOIN user_groups ug ON uga.group_id = ug.id
WHERE uga.user_id = auth.uid();

-- Verificar permissões de organograma
SELECT 
  'Permissões de Organograma' as info,
  ug.name as group_name,
  sp.screen_key,
  sp.permission_level
FROM user_group_assignments uga
JOIN user_groups ug ON uga.group_id = ug.id
JOIN screen_permissions sp ON sp.group_id = ug.id
WHERE uga.user_id = auth.uid()
  AND sp.screen_key = 'organograma';

-- Testar função de permissão
SELECT 
  'Teste de Permissão' as info,
  user_has_organograma_permission('view') as has_view,
  user_has_organograma_permission('edit') as has_edit;

-- Se não tiver permissão, conceder para o grupo do usuário
DO $$
DECLARE
  user_group_id UUID;
BEGIN
  -- Buscar primeiro grupo do usuário
  SELECT uga.group_id INTO user_group_id
  FROM user_group_assignments uga
  WHERE uga.user_id = auth.uid()
  LIMIT 1;
  
  IF user_group_id IS NOT NULL THEN
    -- Conceder permissão de edição
    INSERT INTO screen_permissions (group_id, screen_key, permission_level)
    VALUES (user_group_id, 'organograma', 'edit')
    ON CONFLICT (group_id, screen_key) 
    DO UPDATE SET permission_level = 'edit';
    
    RAISE NOTICE '✅ Permissão de edição concedida ao seu grupo!';
  ELSE
    RAISE NOTICE '⚠️ Usuário não está em nenhum grupo. Adicione o usuário a um grupo primeiro.';
  END IF;
END $$;
