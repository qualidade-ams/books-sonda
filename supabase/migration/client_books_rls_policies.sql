-- Políticas RLS para Sistema de Gerenciamento de Clientes e Books
-- Implementação de Row Level Security para controle de acesso

-- Habilitar RLS em todas as tabelas
ALTER TABLE empresas_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_disparos ENABLE ROW LEVEL SECURITY;
ALTER TABLE controle_mensal ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar se o usuário tem permissão para uma tela específica
CREATE OR REPLACE FUNCTION has_screen_permission(screen_key_param TEXT, required_level TEXT DEFAULT 'view')
RETURNS BOOLEAN AS $$
DECLARE
    user_permission TEXT;
BEGIN
    -- Verificar se o usuário está autenticado
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Buscar o nível de permissão do usuário para a tela específica
    SELECT sp.permission_level INTO user_permission
    FROM screen_permissions sp
    JOIN user_group_assignments uga ON sp.group_id = uga.group_id
    WHERE uga.user_id = auth.uid()
      AND sp.screen_key = screen_key_param
    ORDER BY 
      CASE sp.permission_level 
        WHEN 'edit' THEN 3
        WHEN 'view' THEN 2
        WHEN 'none' THEN 1
        ELSE 0
      END DESC
    LIMIT 1;
    
    -- Se não encontrou permissão, retornar false
    IF user_permission IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se o nível de permissão é suficiente
    RETURN CASE 
        WHEN required_level = 'edit' THEN user_permission = 'edit'
        WHEN required_level = 'view' THEN user_permission IN ('view', 'edit')
        ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para empresas_clientes
CREATE POLICY "Usuários podem visualizar empresas se têm permissão" ON empresas_clientes
    FOR SELECT USING (has_screen_permission('empresas_clientes', 'view'));

CREATE POLICY "Usuários podem inserir empresas se têm permissão de edição" ON empresas_clientes
    FOR INSERT WITH CHECK (has_screen_permission('empresas_clientes', 'edit'));

CREATE POLICY "Usuários podem atualizar empresas se têm permissão de edição" ON empresas_clientes
    FOR UPDATE USING (has_screen_permission('empresas_clientes', 'edit'));

CREATE POLICY "Usuários podem deletar empresas se têm permissão de edição" ON empresas_clientes
    FOR DELETE USING (has_screen_permission('empresas_clientes', 'edit'));

-- Políticas para empresa_produtos
CREATE POLICY "Usuários podem visualizar produtos de empresas se têm permissão" ON empresa_produtos
    FOR SELECT USING (has_screen_permission('empresas_clientes', 'view'));

CREATE POLICY "Usuários podem inserir produtos de empresas se têm permissão de edição" ON empresa_produtos
    FOR INSERT WITH CHECK (has_screen_permission('empresas_clientes', 'edit'));

CREATE POLICY "Usuários podem atualizar produtos de empresas se têm permissão de edição" ON empresa_produtos
    FOR UPDATE USING (has_screen_permission('empresas_clientes', 'edit'));

CREATE POLICY "Usuários podem deletar produtos de empresas se têm permissão de edição" ON empresa_produtos
    FOR DELETE USING (has_screen_permission('empresas_clientes', 'edit'));

-- Políticas para grupos_responsaveis
CREATE POLICY "Usuários podem visualizar grupos se têm permissão" ON grupos_responsaveis
    FOR SELECT USING (has_screen_permission('grupos_responsaveis', 'view'));

CREATE POLICY "Usuários podem inserir grupos se têm permissão de edição" ON grupos_responsaveis
    FOR INSERT WITH CHECK (has_screen_permission('grupos_responsaveis', 'edit'));

CREATE POLICY "Usuários podem atualizar grupos se têm permissão de edição" ON grupos_responsaveis
    FOR UPDATE USING (has_screen_permission('grupos_responsaveis', 'edit'));

CREATE POLICY "Usuários podem deletar grupos se têm permissão de edição" ON grupos_responsaveis
    FOR DELETE USING (has_screen_permission('grupos_responsaveis', 'edit'));

-- Políticas para grupo_emails
CREATE POLICY "Usuários podem visualizar e-mails de grupos se têm permissão" ON grupo_emails
    FOR SELECT USING (has_screen_permission('grupos_responsaveis', 'view'));

CREATE POLICY "Usuários podem inserir e-mails de grupos se têm permissão de edição" ON grupo_emails
    FOR INSERT WITH CHECK (has_screen_permission('grupos_responsaveis', 'edit'));

CREATE POLICY "Usuários podem atualizar e-mails de grupos se têm permissão de edição" ON grupo_emails
    FOR UPDATE USING (has_screen_permission('grupos_responsaveis', 'edit'));

CREATE POLICY "Usuários podem deletar e-mails de grupos se têm permissão de edição" ON grupo_emails
    FOR DELETE USING (has_screen_permission('grupos_responsaveis', 'edit'));

-- Políticas para empresa_grupos
CREATE POLICY "Usuários podem visualizar relacionamento empresa-grupos se têm permissão" ON empresa_grupos
    FOR SELECT USING (
        has_screen_permission('empresas_clientes', 'view') OR 
        has_screen_permission('grupos_responsaveis', 'view')
    );

CREATE POLICY "Usuários podem inserir relacionamento empresa-grupos se têm permissão de edição" ON empresa_grupos
    FOR INSERT WITH CHECK (
        has_screen_permission('empresas_clientes', 'edit') OR 
        has_screen_permission('grupos_responsaveis', 'edit')
    );

CREATE POLICY "Usuários podem atualizar relacionamento empresa-grupos se têm permissão de edição" ON empresa_grupos
    FOR UPDATE USING (
        has_screen_permission('empresas_clientes', 'edit') OR 
        has_screen_permission('grupos_responsaveis', 'edit')
    );

CREATE POLICY "Usuários podem deletar relacionamento empresa-grupos se têm permissão de edição" ON empresa_grupos
    FOR DELETE USING (
        has_screen_permission('empresas_clientes', 'edit') OR 
        has_screen_permission('grupos_responsaveis', 'edit')
    );

-- Políticas para colaboradores
CREATE POLICY "Usuários podem visualizar colaboradores se têm permissão" ON colaboradores
    FOR SELECT USING (has_screen_permission('colaboradores', 'view'));

CREATE POLICY "Usuários podem inserir colaboradores se têm permissão de edição" ON colaboradores
    FOR INSERT WITH CHECK (has_screen_permission('colaboradores', 'edit'));

CREATE POLICY "Usuários podem atualizar colaboradores se têm permissão de edição" ON colaboradores
    FOR UPDATE USING (has_screen_permission('colaboradores', 'edit'));

CREATE POLICY "Usuários podem deletar colaboradores se têm permissão de edição" ON colaboradores
    FOR DELETE USING (has_screen_permission('colaboradores', 'edit'));

-- Políticas para historico_disparos
CREATE POLICY "Usuários podem visualizar histórico se têm permissão" ON historico_disparos
    FOR SELECT USING (has_screen_permission('historico_books', 'view'));

CREATE POLICY "Usuários podem inserir no histórico se têm permissão de edição" ON historico_disparos
    FOR INSERT WITH CHECK (has_screen_permission('historico_books', 'edit'));

CREATE POLICY "Usuários podem atualizar histórico se têm permissão de edição" ON historico_disparos
    FOR UPDATE USING (has_screen_permission('historico_books', 'edit'));

CREATE POLICY "Usuários podem deletar do histórico se têm permissão de edição" ON historico_disparos
    FOR DELETE USING (has_screen_permission('historico_books', 'edit'));

-- Políticas para controle_mensal
CREATE POLICY "Usuários podem visualizar controle mensal se têm permissão" ON controle_mensal
    FOR SELECT USING (has_screen_permission('controle_disparos', 'view'));

CREATE POLICY "Usuários podem inserir controle mensal se têm permissão de edição" ON controle_mensal
    FOR INSERT WITH CHECK (has_screen_permission('controle_disparos', 'edit'));

CREATE POLICY "Usuários podem atualizar controle mensal se têm permissão de edição" ON controle_mensal
    FOR UPDATE USING (has_screen_permission('controle_disparos', 'edit'));

CREATE POLICY "Usuários podem deletar controle mensal se têm permissão de edição" ON controle_mensal
    FOR DELETE USING (has_screen_permission('controle_disparos', 'edit'));

-- Política especial para permitir que o sistema (service role) acesse todas as tabelas
-- Isso é necessário para operações automáticas como disparos de e-mail
CREATE POLICY "Service role tem acesso completo" ON empresas_clientes
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON empresa_produtos
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON grupos_responsaveis
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON grupo_emails
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON empresa_grupos
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON colaboradores
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON historico_disparos
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role tem acesso completo" ON controle_mensal
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Comentários para documentação das políticas
COMMENT ON FUNCTION has_screen_permission IS 'Função para verificar se o usuário tem permissão para acessar uma tela específica';