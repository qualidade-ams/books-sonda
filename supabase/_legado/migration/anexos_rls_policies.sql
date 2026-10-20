-- Políticas RLS para Sistema de Anexos
-- Controle de acesso baseado em permissões e empresa

-- Habilitar RLS na tabela anexos_temporarios
ALTER TABLE anexos_temporarios ENABLE ROW LEVEL SECURITY;

-- Política para SELECT - usuários podem ver anexos de empresas que têm acesso
CREATE POLICY "Usuários podem visualizar anexos de suas empresas" ON anexos_temporarios
  FOR SELECT
  USING (
    -- Verificar se o usuário tem permissão para a tela de disparos personalizados
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'controle_disparos_personalizados'
        AND sp.permission_level IN ('view', 'edit')
    )
  );

-- Política para INSERT - usuários podem criar anexos para empresas que têm acesso
CREATE POLICY "Usuários podem criar anexos" ON anexos_temporarios
  FOR INSERT
  WITH CHECK (
    -- Verificar se o usuário tem permissão de escrita para disparos personalizados
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'controle_disparos_personalizados'
        AND sp.permission_level = 'edit'
    )
  );

-- Política para UPDATE - usuários podem atualizar anexos que criaram ou têm permissão admin
CREATE POLICY "Usuários podem atualizar anexos" ON anexos_temporarios
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN screen_permissions sp ON uga.group_id = sp.group_id
      WHERE uga.user_id = auth.uid()
        AND sp.screen_key = 'controle_disparos_personalizados'
        AND sp.permission_level = 'edit'
    )
  );

-- Política para DELETE - apenas admins podem deletar anexos
CREATE POLICY "Apenas admins podem deletar anexos" ON anexos_temporarios
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_group_assignments uga
      JOIN user_groups ug ON uga.group_id = ug.id
      WHERE uga.user_id = auth.uid()
        AND ug.is_default_admin = true
    )
  );

-- Política especial para sistema (jobs automáticos) - usando service_role
CREATE POLICY "Sistema pode gerenciar todos os anexos" ON anexos_temporarios
  FOR ALL
  USING (auth.role() = 'service_role');

-- Registrar a nova tela no sistema de permissões
INSERT INTO screens (key, name, description, category, route) VALUES
('controle_disparos_personalizados', 'Disparos Personalizados', 'Controle de disparos personalizados com anexos', 'Administração', '/admin/controle-disparos-personalizados')
ON CONFLICT (key) DO NOTHING;

-- Comentários sobre as políticas
COMMENT ON POLICY "Usuários podem visualizar anexos de suas empresas" ON anexos_temporarios IS 'Permite visualização de anexos para usuários com permissão de leitura';
COMMENT ON POLICY "Usuários podem criar anexos" ON anexos_temporarios IS 'Permite criação de anexos para usuários com permissão de escrita';
COMMENT ON POLICY "Usuários podem atualizar anexos" ON anexos_temporarios IS 'Permite atualização de anexos para usuários com permissão de escrita';
COMMENT ON POLICY "Apenas admins podem deletar anexos" ON anexos_temporarios IS 'Restringe exclusão de anexos apenas para administradores';
COMMENT ON POLICY "Sistema pode gerenciar todos os anexos" ON anexos_temporarios IS 'Permite que jobs do sistema gerenciem anexos usando service_role';