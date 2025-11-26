-- ============================================
-- MIGRAÇÃO COMPLETA: PESQUISAS → PESQUISAS DE SATISFAÇÃO
-- ============================================
-- Este script renomeia toda a estrutura de pesquisas para pesquisas_satisfacao

-- 1. Renomear tabela principal
ALTER TABLE pesquisas RENAME TO pesquisas_satisfacao;

-- 2. Renomear ENUMs
ALTER TYPE origem_pesquisa_enum RENAME TO origem_pesquisa_enum;
ALTER TYPE status_pesquisa_enum RENAME TO status_pesquisa_enum;

-- 3. Renomear índices
ALTER INDEX IF EXISTS idx_pesquisas_origem RENAME TO idx_pesquisas_origem;
ALTER INDEX IF EXISTS idx_pesquisas_status RENAME TO idx_pesquisas_status;
ALTER INDEX IF EXISTS idx_pesquisas_empresa RENAME TO idx_pesquisas_empresa;
ALTER INDEX IF EXISTS idx_pesquisas_cliente RENAME TO idx_pesquisas_cliente;
ALTER INDEX IF EXISTS idx_pesquisas_id_externo RENAME TO idx_pesquisas_id_externo;
ALTER INDEX IF EXISTS idx_pesquisas_empresa_id RENAME TO idx_pesquisas_empresa_id;
ALTER INDEX IF EXISTS idx_pesquisas_cliente_id RENAME TO idx_pesquisas_cliente_id;
ALTER INDEX IF EXISTS idx_pesquisas_data_resposta RENAME TO idx_pesquisas_data_resposta;
ALTER INDEX IF EXISTS idx_pesquisas_ano_mes RENAME TO idx_pesquisas_ano_mes;
ALTER INDEX IF EXISTS idx_pesquisas_created_at RENAME TO idx_pesquisas_created_at;

-- 4. Renomear função e trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_pesquisas_updated_at') THEN
    ALTER FUNCTION update_pesquisas_updated_at() RENAME TO update_pesquisas_updated_at;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trigger_update_pesquisas_updated_at ON pesquisas_satisfacao;
CREATE TRIGGER trigger_update_pesquisas_updated_at
    BEFORE UPDATE ON pesquisas_satisfacao
    FOR EACH ROW
    EXECUTE FUNCTION update_pesquisas_updated_at();

-- 5. Atualizar telas primeiro (screens tem screen_key como PK)
UPDATE screens SET screen_key = 'lancar_pesquisas' WHERE screen_key = 'lancar_pesquisas';
UPDATE screens SET screen_key = 'enviar_pesquisas' WHERE screen_key = 'enviar_pesquisas';

-- 6. Atualizar permissões (agora que as telas foram atualizadas)
UPDATE screen_permissions SET screen_key = 'lancar_pesquisas' WHERE screen_key = 'lancar_pesquisas';
UPDATE screen_permissions SET screen_key = 'enviar_pesquisas' WHERE screen_key = 'enviar_pesquisas';

-- 7. Remover políticas RLS antigas
DROP POLICY IF EXISTS "service_role_all_pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "users_select_pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "users_insert_pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "users_update_pesquisas" ON pesquisas_satisfacao;
DROP POLICY IF EXISTS "users_delete_pesquisas" ON pesquisas_satisfacao;

-- 8. Criar novas políticas RLS
CREATE POLICY "service_role_all_pesquisas" ON pesquisas_satisfacao
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_select_pesquisas" ON pesquisas_satisfacao
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level IN ('view', 'edit')
  )
);

CREATE POLICY "users_insert_pesquisas" ON pesquisas_satisfacao
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

CREATE POLICY "users_update_pesquisas" ON pesquisas_satisfacao
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level = 'edit'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas')
      AND sp.permission_level = 'edit'
  )
);

CREATE POLICY "users_delete_pesquisas" ON pesquisas_satisfacao
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_group_assignments uga
    JOIN screen_permissions sp ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = 'lancar_pesquisas'
      AND sp.permission_level = 'edit'
  )
);

-- Verificação final
SELECT 
  'pesquisas_satisfacao' as tabela,
  COUNT(*) as total_registros
FROM pesquisas_satisfacao;

SELECT 
  'Políticas RLS' as tipo,
  COUNT(*) as total
FROM pg_policies 
WHERE tablename = 'pesquisas_satisfacao';

SELECT 
  'Permissões atualizadas' as tipo,
  COUNT(*) as total
FROM screen_permissions 
WHERE screen_key IN ('lancar_pesquisas', 'enviar_pesquisas');

SELECT '✅ Migração concluída com sucesso!' as status;
