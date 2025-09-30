-- =====================================================
-- Sistema de Requerimentos - Migração de Permissões
-- =====================================================
-- Registro das telas no sistema de permissões e
-- configuração de permissões para grupo administrador
-- =====================================================

-- Registrar telas do sistema de requerimentos
INSERT INTO screens (key, name, description, category, route) VALUES
('lancar_requerimentos', 'Lançar Requerimentos', 'Tela para lançamento de novos requerimentos de especificações funcionais', 'requerimentos', '/admin/lancar-requerimentos'),
('faturar_requerimentos', 'Faturar Requerimentos', 'Tela para faturamento e envio de relatórios de requerimentos aprovados', 'requerimentos', '/admin/faturar-requerimentos')
ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    route = EXCLUDED.route;

-- Configurar permissões padrão para grupo admin
-- Atribuir permissões de edição para administradores em todas as novas telas
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, s.key, 'edit'
FROM user_groups ug 
CROSS JOIN screens s
WHERE ug.is_default_admin = true 
AND s.key IN ('lancar_requerimentos', 'faturar_requerimentos')
ON CONFLICT (group_id, screen_key) DO UPDATE SET 
    permission_level = 'edit';

-- Log da migração de permissões (comentado - tabela de logs não existe)
-- INSERT INTO permission_audit_logs (...) - Removido pois tabela não existe

-- Verificação das novas telas registradas
DO $$
BEGIN
  -- Verificar se as telas foram registradas
  IF EXISTS (SELECT 1 FROM screens WHERE key IN ('lancar_requerimentos', 'faturar_requerimentos')) THEN
    RAISE NOTICE 'Telas do sistema de requerimentos registradas com sucesso';
  ELSE
    RAISE EXCEPTION 'Erro: Telas não foram registradas corretamente';
  END IF;
  
  -- Verificar se as permissões foram configuradas
  IF EXISTS (
    SELECT 1 FROM screen_permissions sp
    JOIN user_groups ug ON sp.group_id = ug.id
    JOIN screens s ON sp.screen_key = s.key
    WHERE s.key IN ('lancar_requerimentos', 'faturar_requerimentos')
    AND ug.is_default_admin = true
  ) THEN
    RAISE NOTICE 'Permissões configuradas com sucesso para grupo administrador';
  ELSE
    RAISE NOTICE 'Aviso: Permissões não foram configuradas - verifique se existe grupo administrador padrão';
  END IF;
  
  RAISE NOTICE 'Migração de permissões do sistema de requerimentos concluída!';
END $$;

-- Exibir telas registradas
SELECT 'TELAS REGISTRADAS' as status, key, name, description, category, route
FROM screens 
WHERE key IN ('lancar_requerimentos', 'faturar_requerimentos')
ORDER BY key;

-- Exibir permissões configuradas
SELECT 'PERMISSÕES CONFIGURADAS' as status, ug.name as grupo, s.key as tela, sp.permission_level as nivel
FROM screen_permissions sp
JOIN user_groups ug ON sp.group_id = ug.id
JOIN screens s ON sp.screen_key = s.key
WHERE s.key IN ('lancar_requerimentos', 'faturar_requerimentos')
ORDER BY ug.name, s.key;