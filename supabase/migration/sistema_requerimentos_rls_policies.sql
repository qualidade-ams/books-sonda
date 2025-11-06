-- =====================================================
-- Sistema de Requerimentos - Políticas RLS
-- =====================================================
-- Configuração de Row Level Security para controle de
-- acesso baseado em permissões de grupo
-- =====================================================

-- Habilitar RLS na tabela requerimentos
ALTER TABLE requerimentos ENABLE ROW LEVEL SECURITY;

-- Política para SELECT (visualização)
-- Permite acesso se o usuário tem permissão nas telas relacionadas
CREATE POLICY "requerimentos_select_policy" ON requerimentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      JOIN screens s ON sp.screen_key = s.key
      WHERE uga.user_id = auth.uid()
        AND s.key IN ('lancar_requerimentos', 'faturar_requerimentos')
        AND sp.permission_level IN ('view', 'edit')
    )
  );

-- Política para INSERT (criação)
-- Permite inserção se o usuário tem permissão de edição na tela "Lançar Requerimentos"
CREATE POLICY "requerimentos_insert_policy" ON requerimentos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      JOIN screens s ON sp.screen_key = s.key
      WHERE uga.user_id = auth.uid()
        AND s.key = 'lancar_requerimentos'
        AND sp.permission_level = 'edit'
    )
  );

-- Política para UPDATE (atualização)
-- Permite atualização se o usuário tem permissão de edição nas telas relacionadas
CREATE POLICY "requerimentos_update_policy" ON requerimentos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      JOIN screens s ON sp.screen_key = s.key
      WHERE uga.user_id = auth.uid()
        AND s.key IN ('lancar_requerimentos', 'faturar_requerimentos')
        AND sp.permission_level = 'edit'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      JOIN screens s ON sp.screen_key = s.key
      WHERE uga.user_id = auth.uid()
        AND s.key IN ('lancar_requerimentos', 'faturar_requerimentos')
        AND sp.permission_level = 'edit'
    )
  );

-- Política para DELETE (exclusão)
-- Permite exclusão apenas se o usuário tem permissão de edição na tela "Lançar Requerimentos"
-- e o requerimento ainda não foi enviado para faturamento
CREATE POLICY "requerimentos_delete_policy" ON requerimentos
  FOR DELETE
  USING (
    enviado_faturamento = false
    AND EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      JOIN screens s ON sp.screen_key = s.key
      WHERE uga.user_id = auth.uid()
        AND s.key = 'lancar_requerimentos'
        AND sp.permission_level = 'edit'
    )
  );

-- Política específica para operações de faturamento
-- Permite atualização de campos relacionados ao faturamento apenas para usuários
-- com permissão na tela "Enviar Requerimentos"
CREATE POLICY "requerimentos_faturamento_policy" ON requerimentos
  FOR UPDATE
  USING (
    -- Permite atualização de campos de faturamento
    EXISTS (
      SELECT 1 
      FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      JOIN screens s ON sp.screen_key = s.key
      WHERE uga.user_id = auth.uid()
        AND s.key = 'faturar_requerimentos'
        AND sp.permission_level = 'edit'
    )
  );

-- Função para verificar permissões específicas do sistema de requerimentos
CREATE OR REPLACE FUNCTION check_requerimentos_permission(screen_key_param TEXT, required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    JOIN screens s ON sp.screen_key = s.key
    WHERE uga.user_id = auth.uid()
      AND s.key = screen_key_param
      AND (
        (required_level = 'view' AND sp.permission_level IN ('view', 'edit')) OR
        (required_level = 'edit' AND sp.permission_level = 'edit')
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários nas políticas
COMMENT ON POLICY "requerimentos_select_policy" ON requerimentos IS 
  'Permite visualização de requerimentos para usuários com permissão nas telas relacionadas';

COMMENT ON POLICY "requerimentos_insert_policy" ON requerimentos IS 
  'Permite criação de requerimentos para usuários com permissão de edição na tela Lançar Requerimentos';

COMMENT ON POLICY "requerimentos_update_policy" ON requerimentos IS 
  'Permite atualização de requerimentos para usuários com permissão de edição nas telas relacionadas';

COMMENT ON POLICY "requerimentos_delete_policy" ON requerimentos IS 
  'Permite exclusão de requerimentos não enviados para faturamento por usuários com permissão na tela Lançar Requerimentos';

COMMENT ON POLICY "requerimentos_faturamento_policy" ON requerimentos IS 
  'Política específica para operações de faturamento na tela Enviar Requerimentos';

-- Log da migração de RLS (comentado - tabela de logs não existe)
-- INSERT INTO permission_audit_logs (...) - Removido pois tabela não existe

-- Verificação das políticas RLS
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policies_count INTEGER;
BEGIN
  -- Verificar se RLS está habilitado
  SELECT relrowsecurity INTO rls_enabled 
  FROM pg_class 
  WHERE relname = 'requerimentos';
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'Erro: RLS não foi habilitado na tabela requerimentos';
  END IF;
  
  -- Verificar se as políticas foram criadas
  SELECT COUNT(*) INTO policies_count 
  FROM pg_policies 
  WHERE tablename = 'requerimentos';
  
  IF policies_count < 4 THEN
    RAISE EXCEPTION 'Erro: Nem todas as políticas RLS foram criadas. Encontradas: %', policies_count;
  END IF;
  
  RAISE NOTICE 'Políticas RLS configuradas com sucesso. RLS habilitado: %, Políticas criadas: %', 
    rls_enabled, policies_count;
    
  RAISE NOTICE 'Migração de políticas RLS do sistema de requerimentos concluída!';
END $$;