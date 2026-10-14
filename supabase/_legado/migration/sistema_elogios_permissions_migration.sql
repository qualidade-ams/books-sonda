-- =====================================================
-- MIGRAÇÃO: Permissões do Sistema de Pesquisas
-- Descrição: Registro das telas no sistema de permissões
-- Data: 2025-11-25
-- =====================================================

-- Passo 1: Registrar tela "Lançar Pesquisas"
DO $$
DECLARE
    v_screen_key VARCHAR(50);
BEGIN
    -- Verificar se a tela já existe
    SELECT key INTO v_screen_key
    FROM screens
    WHERE key = 'lancar_pesquisas';
    
    IF v_screen_key IS NULL THEN
        -- Inserir nova tela
        INSERT INTO screens (key, name, description)
        VALUES (
            'lancar_pesquisas',
            'Lançar Pesquisas',
            'Tela para lançamento e gerenciamento de pesquisas de clientes'
        );
        
        RAISE NOTICE '✓ Tela "Lançar Pesquisas" registrada com key: lancar_pesquisas';
    ELSE
        RAISE NOTICE '⚠ Tela "Lançar Pesquisas" já existe com key: %', v_screen_key;
    END IF;
END $$;

-- Passo 2: Registrar tela "Enviar Pesquisas"
DO $$
DECLARE
    v_screen_key VARCHAR(50);
BEGIN
    -- Verificar se a tela já existe
    SELECT key INTO v_screen_key
    FROM screens
    WHERE key = 'enviar_pesquisas';
    
    IF v_screen_key IS NULL THEN
        -- Inserir nova tela
        INSERT INTO screens (key, name, description)
        VALUES (
            'enviar_pesquisas',
            'Enviar Pesquisas',
            'Tela para envio de pesquisas por email'
        );
        
        RAISE NOTICE '✓ Tela "Enviar Pesquisas" registrada com key: enviar_pesquisas';
    ELSE
        RAISE NOTICE '⚠ Tela "Enviar Pesquisas" já existe com key: %', v_screen_key;
    END IF;
END $$;

-- Passo 3: Configurar permissões para grupo Administrador
DO $$
DECLARE
    v_admin_group_id UUID;
    v_screen_lancar_key VARCHAR(50);
    v_screen_enviar_key VARCHAR(50);
BEGIN
    -- Buscar grupo administrador
    SELECT id INTO v_admin_group_id
    FROM user_groups
    WHERE name = 'Administrador'
    LIMIT 1;
    
    IF v_admin_group_id IS NULL THEN
        RAISE NOTICE '⚠ Grupo Administrador não encontrado. Permissões não configuradas.';
        RETURN;
    END IF;
    
    -- Buscar keys das telas
    SELECT key INTO v_screen_lancar_key FROM screens WHERE key = 'lancar_pesquisas';
    SELECT key INTO v_screen_enviar_key FROM screens WHERE key = 'enviar_pesquisas';
    
    -- Configurar permissão para "Lançar Pesquisas"
    IF NOT EXISTS (
        SELECT 1 FROM screen_permissions
        WHERE group_id = v_admin_group_id AND screen_key = v_screen_lancar_key
    ) THEN
        INSERT INTO screen_permissions (group_id, screen_key, permission_level)
        VALUES (v_admin_group_id, v_screen_lancar_key, 'edit');
        RAISE NOTICE '✓ Permissão de edição configurada para "Lançar Pesquisas"';
    ELSE
        RAISE NOTICE '⚠ Permissão para "Lançar Pesquisas" já existe';
    END IF;
    
    -- Configurar permissão para "Enviar Pesquisas"
    IF NOT EXISTS (
        SELECT 1 FROM screen_permissions
        WHERE group_id = v_admin_group_id AND screen_key = v_screen_enviar_key
    ) THEN
        INSERT INTO screen_permissions (group_id, screen_key, permission_level)
        VALUES (v_admin_group_id, v_screen_enviar_key, 'edit');
        RAISE NOTICE '✓ Permissão de edição configurada para "Enviar Pesquisas"';
    ELSE
        RAISE NOTICE '⚠ Permissão para "Enviar Pesquisas" já existe';
    END IF;
END $$;

-- Passo 4: Verificar configuração
DO $$
DECLARE
    v_screen_count INTEGER;
    v_permission_count INTEGER;
    rec RECORD;
BEGIN
    -- Contar telas registradas
    SELECT COUNT(*) INTO v_screen_count
    FROM screens
    WHERE key IN ('lancar_pesquisas', 'enviar_pesquisas');
    
    RAISE NOTICE '📊 Total de telas registradas: %', v_screen_count;
    
    -- Contar permissões configuradas
    SELECT COUNT(*) INTO v_permission_count
    FROM screen_permissions sp
    WHERE sp.screen_key IN ('lancar_pesquisas', 'enviar_pesquisas');
    
    RAISE NOTICE '📊 Total de permissões configuradas: %', v_permission_count;
    
    -- Exibir status das telas
    RAISE NOTICE '--- Status das Telas ---';
    FOR rec IN (
        SELECT 
            s.key as screen_key,
            s.name as screen_name,
            COUNT(sp.group_id) as permission_count
        FROM screens s
        LEFT JOIN screen_permissions sp ON s.key = sp.screen_key
        WHERE s.key IN ('lancar_pesquisas', 'enviar_pesquisas')
        GROUP BY s.key, s.name
    ) LOOP
        RAISE NOTICE '  • % (%): % permissões', rec.screen_name, rec.screen_key, rec.permission_count;
    END LOOP;
END $$;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
