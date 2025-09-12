------------------------------------------------------
-- 1. Desabilitar RLS temporariamente
------------------------------------------------------
ALTER TABLE IF EXISTS user_group_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS screen_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS screens DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS permission_audit_logs DISABLE ROW LEVEL SECURITY;

------------------------------------------------------
-- 2. Criar tabela profiles se não existir
------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO profiles (id, email, full_name)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as full_name
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

------------------------------------------------------
-- 3. Estrutura de grupos, telas, permissões e atribuições
------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_default_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS screens (
    key VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    route VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS screen_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
    screen_key VARCHAR(50) REFERENCES screens(key) ON DELETE CASCADE,
    permission_level VARCHAR(10) CHECK (permission_level IN ('none', 'view', 'edit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(group_id, screen_key)
);

CREATE TABLE IF NOT EXISTS user_group_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES user_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id)
);

------------------------------------------------------
-- 4. Tabela de auditoria
------------------------------------------------------
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_table_record ON permission_audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_changed_by ON permission_audit_logs(changed_by);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_changed_at ON permission_audit_logs(changed_at);

------------------------------------------------------
-- 5. Funções de auditoria
------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    changed_by_value UUID;
BEGIN
    IF TG_TABLE_NAME NOT IN ('user_groups', 'screen_permissions', 'user_group_assignments') THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    changed_by_value := auth.uid();

    INSERT INTO permission_audit_logs (
        table_name, record_id, action, old_values, new_values, changed_by, ip_address, user_agent
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP IN ('DELETE','UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
        changed_by_value,
        inet_client_addr(),
        COALESCE(current_setting('request.headers', true)::json->>'user-agent','Unknown')
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        BEGIN NEW.created_by := COALESCE(NEW.created_by, auth.uid()); EXCEPTION WHEN undefined_column THEN NULL; END;
    END IF;
    BEGIN NEW.updated_by := auth.uid(); EXCEPTION WHEN undefined_column THEN NULL; END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_user_groups_trigger ON user_groups;
DROP TRIGGER IF EXISTS audit_screen_permissions_trigger ON screen_permissions;
DROP TRIGGER IF EXISTS audit_user_group_assignments_trigger ON user_group_assignments;

CREATE TRIGGER audit_user_groups_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_groups
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_screen_permissions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON screen_permissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_group_assignments_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_group_assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER set_user_groups_audit_fields
    BEFORE INSERT OR UPDATE ON user_groups
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER set_screen_permissions_audit_fields
    BEFORE INSERT OR UPDATE ON screen_permissions
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

CREATE TRIGGER set_user_group_assignments_audit_fields
    BEFORE INSERT OR UPDATE ON user_group_assignments
    FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

------------------------------------------------------
-- 6. Dados iniciais: grupo admin e telas
------------------------------------------------------
INSERT INTO user_groups (name, description, is_default_admin) 
VALUES ('Administradores', 'Grupo padrão com acesso total ao sistema', true)
ON CONFLICT (name) DO NOTHING;

-- Remover telas públicas
DELETE FROM screen_permissions WHERE screen_key IN ('orcamento','orcamento-fiscal');
DELETE FROM screens WHERE key IN ('orcamento','orcamento-fiscal');

-- Inserir telas administrativas
INSERT INTO screens (key, name, description, category, route) VALUES
('dashboard','Dashboard','Painel principal administrativo','admin','/admin/dashboard'),
('email-config','Configuração de Email','Configuração de templates e envio de emails','admin','/admin/email-config'),
('user-config','Configuração de Usuários','Gerenciamento de usuários do sistema','admin','/admin/user-config'),
('grupos','Grupos de Usuários','Gerenciamento de grupos de usuários e permissões','admin','/admin/grupos'),
('usuarios-grupos','Atribuir Usuários','Atribuição de usuários aos grupos de permissão','admin','/admin/usuarios-grupos'),
('audit-logs','Logs de Auditoria','Visualização de logs de auditoria do sistema de permissões','admin','/admin/audit-logs')
ON CONFLICT (key) DO NOTHING;

-- Atribuir usuários ao grupo admin
INSERT INTO user_group_assignments (user_id, group_id, assigned_by)
SELECT u.id, ug.id, u.id
FROM auth.users u CROSS JOIN user_groups ug
WHERE ug.is_default_admin = true
ON CONFLICT (user_id) DO UPDATE SET group_id = EXCLUDED.group_id;

-- Permissões totais ao admin
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, s.key, 'edit'
FROM user_groups ug CROSS JOIN screens s
WHERE ug.is_default_admin = true
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = 'edit';

------------------------------------------------------
-- 7. Políticas RLS simplificadas
------------------------------------------------------
-- Profiles
CREATE POLICY "Usuários podem ver todos os perfis" ON profiles
    FOR SELECT USING ((SELECT auth.role() AS role) = 'authenticated');
CREATE POLICY "Usuários podem atualizar próprio perfil" ON profiles
    FOR UPDATE USING ((SELECT auth.uid() AS uid) = id);

-- User Groups
CREATE POLICY "Usuários autenticados podem ver grupos" ON user_groups
    FOR SELECT USING ((SELECT auth.role() AS role) = 'authenticated');
CREATE POLICY "Usuários autenticados podem gerenciar grupos" ON user_groups
    FOR ALL USING ((SELECT auth.role() AS role) = 'authenticated');

-- Screens
CREATE POLICY "Usuários autenticados podem ver telas" ON screens
    FOR SELECT USING ((SELECT auth.role() AS role) = 'authenticated');
CREATE POLICY "Usuários autenticados podem gerenciar telas" ON screens
    FOR ALL USING ((SELECT auth.role() AS role) = 'authenticated');

-- Screen Permissions
CREATE POLICY "Usuários autenticados podem ver permissões" ON screen_permissions
    FOR SELECT USING ((SELECT auth.role() AS role) = 'authenticated');
CREATE POLICY "Usuários autenticados podem gerenciar permissões" ON screen_permissions
    FOR ALL USING ((SELECT auth.role() AS role) = 'authenticated');

-- User Group Assignments
CREATE POLICY "Usuários autenticados podem ver atribuições" ON user_group_assignments
    FOR SELECT USING ((SELECT auth.role() AS role) = 'authenticated');
CREATE POLICY "Usuários autenticados podem gerenciar atribuições" ON user_group_assignments
    FOR ALL USING ((SELECT auth.role() AS role) = 'authenticated');

-- Audit Logs (somente admins podem ver)
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Administradores podem ver audit logs" ON permission_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_group_assignments uga
            JOIN user_groups ug ON uga.group_id = ug.id
            WHERE uga.user_id = auth.uid() AND ug.is_default_admin = true
        )
    );
CREATE POLICY "System pode inserir audit logs" ON permission_audit_logs
    FOR INSERT WITH CHECK (true);

------------------------------------------------------
-- 8. Índices
------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_group_assignments_user_id ON user_group_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_assignments_group_id ON user_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_screen_permissions_group_id ON screen_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_screen_permissions_screen_key ON screen_permissions(screen_key);

------------------------------------------------------
-- 9. Funções auxiliares de permissões
------------------------------------------------------
-- get_user_permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE (screen_key VARCHAR(50), permission_level VARCHAR(10), group_name VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT sp.screen_key, sp.permission_level, ug.name
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON ug.id = sp.group_id
    WHERE uga.user_id = user_uuid;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- user_has_permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, screen_key_param VARCHAR(50), required_level VARCHAR(10))
RETURNS BOOLEAN AS $$
DECLARE user_permission VARCHAR(10);
BEGIN
    SELECT sp.permission_level INTO user_permission
    FROM user_group_assignments uga
    JOIN screen_permissions sp ON uga.group_id = sp.group_id
    WHERE uga.user_id = user_uuid AND sp.screen_key = screen_key_param;

    IF user_permission IS NULL THEN RETURN FALSE; END IF;

    CASE required_level
        WHEN 'view' THEN RETURN user_permission IN ('view','edit');
        WHEN 'edit' THEN RETURN user_permission = 'edit';
        ELSE RETURN FALSE;
    END CASE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- user_is_admin
CREATE OR REPLACE FUNCTION user_is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = user_uuid AND ug.is_default_admin = true
    );
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_user_group
CREATE OR REPLACE FUNCTION get_user_group(user_uuid UUID)
RETURNS TABLE (group_id UUID, group_name VARCHAR(100), group_description TEXT, is_admin BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT ug.id, ug.name, ug.description, ug.is_default_admin
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    WHERE uga.user_id = user_uuid;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_delete_group
CREATE OR REPLACE FUNCTION can_delete_group(group_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE is_admin BOOLEAN; user_count INTEGER;
BEGIN
    SELECT is_default_admin INTO is_admin FROM user_groups WHERE id = group_uuid;
    IF is_admin = true THEN RETURN FALSE; END IF;
    SELECT COUNT(*) INTO user_count FROM user_group_assignments WHERE group_id = group_uuid;
    RETURN user_count = 0;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- assign_user_to_group
CREATE OR REPLACE FUNCTION assign_user_to_group(user_uuid UUID, group_uuid UUID, assigned_by_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM user_groups WHERE id = group_uuid) THEN
        RAISE EXCEPTION 'Grupo não encontrado';
    END IF;
    DELETE FROM user_group_assignments WHERE user_id = user_uuid;
    INSERT INTO user_group_assignments (user_id, group_id, assigned_by) VALUES (user_uuid, group_uuid, assigned_by_uuid);
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_user_group
CREATE OR REPLACE FUNCTION create_user_group(group_name VARCHAR(100), group_description TEXT, created_by_uuid UUID)
RETURNS UUID AS $$
DECLARE new_group_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM user_groups WHERE name = group_name) THEN
        RAISE EXCEPTION 'Já existe um grupo com este nome';
    END IF;
    INSERT INTO user_groups (name, description, is_default_admin, created_by) VALUES (group_name, group_description, false, created_by_uuid)
    RETURNING id INTO new_group_id;
    RETURN new_group_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_group_permissions
CREATE OR REPLACE FUNCTION update_group_permissions(group_uuid UUID, permissions_json JSONB)
RETURNS BOOLEAN AS $$
DECLARE permission_record RECORD;
BEGIN
    DELETE FROM screen_permissions WHERE group_id = group_uuid;
    FOR permission_record IN 
        SELECT (value->>'screen_key')::VARCHAR(50) as screen_key, (value->>'permission_level')::VARCHAR(10) as permission_level
        FROM jsonb_array_elements(permissions_json)
    LOOP
        IF EXISTS (SELECT 1 FROM screens WHERE key = permission_record.screen_key) THEN
            INSERT INTO screen_permissions (group_id, screen_key, permission_level)
            VALUES (group_uuid, permission_record.screen_key, permission_record.permission_level);
        END IF;
    END LOOP;
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder EXECUTE
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID,VARCHAR(50),VARCHAR(10)) TO authenticated;
GRANT EXECUTE ON FUNCTION user_is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_user_to_group(UUID,UUID,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_group(VARCHAR(100),TEXT,UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_group_permissions(UUID,JSONB) TO authenticated;

------------------------------------------------------
-- 10. Trigger para novos usuários -> profiles
------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

------------------------------------------------------
-- 11. Reabilitar RLS
------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_group_assignments ENABLE ROW LEVEL SECURITY;

------------------------------------------------------
-- 12. Verificação final
------------------------------------------------------
SELECT 'VERIFICAÇÃO FINAL' as status, COUNT(*) as total_usuarios FROM auth.users;
SELECT 'USUÁRIOS COM GRUPOS' as status, u.email, ug.name as grupo, COUNT(sp.id) as total_permissoes
FROM auth.users u
JOIN user_group_assignments uga ON u.id = uga.user_id
JOIN user_groups ug ON uga.group_id = ug.id
LEFT JOIN screen_permissions sp ON ug.id = sp.group_id
GROUP BY u.email, ug.name
ORDER BY u.email;
