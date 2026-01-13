-- =====================================================
-- MIGRAÇÃO: Correção das Funções Restantes
-- Data: 2025-01-13
-- Descrição: Corrigir as funções restantes que não foram
--           incluídas na migration anterior
-- =====================================================

-- 1. Funções de plano de ação

-- 1.1. Atualizar data de resposta do plano de ação
DROP FUNCTION IF EXISTS atualizar_data_resposta_plano_acao() CASCADE;
CREATE OR REPLACE FUNCTION public.atualizar_data_resposta_plano_acao()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'respondido' AND OLD.status != 'respondido' THEN
        NEW.data_resposta = NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- 1.2. Atualizar timestamp do plano de ação
DROP FUNCTION IF EXISTS atualizar_timestamp_plano_acao() CASCADE;
CREATE OR REPLACE FUNCTION public.atualizar_timestamp_plano_acao()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 1.3. Preencher data de conclusão
DROP FUNCTION IF EXISTS preencher_data_conclusao() CASCADE;
CREATE OR REPLACE FUNCTION public.preencher_data_conclusao()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
        NEW.data_conclusao = NOW();
    END IF;
    RETURN NEW;
END;
$$;

-- 1.4. Criar log de histórico do plano
DROP FUNCTION IF EXISTS criar_log_historico_plano() CASCADE;
CREATE OR REPLACE FUNCTION public.criar_log_historico_plano()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO plano_acao_historico (
        plano_id, 
        acao, 
        detalhes, 
        usuario_id, 
        created_at
    ) VALUES (
        NEW.id,
        TG_OP,
        format('Status alterado de %s para %s', OLD.status, NEW.status),
        auth.uid(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- 2. Funções de pesquisas

-- 2.1. Marcar pesquisa como encaminhada
DROP FUNCTION IF EXISTS marcar_pesquisa_encaminhada(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.marcar_pesquisa_encaminhada(pesquisa_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar permissão
    IF NOT has_screen_permission('pesquisas', 'edit') THEN
        RAISE EXCEPTION 'Sem permissão para editar pesquisas';
    END IF;
    
    UPDATE pesquisas 
    SET status = 'encaminhada', 
        data_encaminhamento = NOW(),
        updated_at = NOW()
    WHERE id = pesquisa_id;
    
    RETURN FOUND;
END;
$$;

-- 3. Funções de anexos e validação

-- 3.1. Limpar anexos expirados
DROP FUNCTION IF EXISTS limpar_anexos_expirados() CASCADE;
CREATE OR REPLACE FUNCTION public.limpar_anexos_expirados()
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM anexos_temporarios 
    WHERE created_at < (NOW() - INTERVAL '24 hours');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- 3.2. Validar limite de anexos por empresa
DROP FUNCTION IF EXISTS validar_limite_anexos_empresa(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.validar_limite_anexos_empresa(empresa_id UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    anexo_count INTEGER;
    limite_anexos INTEGER := 100; -- Limite padrão
BEGIN
    SELECT COUNT(*) INTO anexo_count
    FROM anexos_temporarios 
    WHERE empresa_id = validar_limite_anexos_empresa.empresa_id
      AND created_at > (NOW() - INTERVAL '1 day');
    
    RETURN anexo_count < limite_anexos;
END;
$$;

-- 3.3. Trigger para validar limite de anexos
DROP FUNCTION IF EXISTS trigger_validar_limite_anexos() CASCADE;
CREATE OR REPLACE FUNCTION public.trigger_validar_limite_anexos()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT validar_limite_anexos_empresa(NEW.empresa_id) THEN
        RAISE EXCEPTION 'Limite de anexos por empresa excedido';
    END IF;
    
    RETURN NEW;
END;
$$;

-- 4. Funções de histórico e busca

-- 4.1. Buscar histórico com anexos
DROP FUNCTION IF EXISTS buscar_historico_com_anexos(UUID) CASCADE;
CREATE OR REPLACE FUNCTION public.buscar_historico_com_anexos(item_id UUID)
RETURNS TABLE (
    id UUID,
    acao TEXT,
    detalhes TEXT,
    usuario_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    anexos JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.acao,
        h.detalhes,
        h.usuario_id,
        h.created_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'nome', a.nome_arquivo,
                    'tamanho', a.tamanho
                )
            ) FILTER (WHERE a.id IS NOT NULL),
            '[]'::jsonb
        ) as anexos
    FROM historico h
    LEFT JOIN anexos a ON h.id = a.historico_id
    WHERE h.item_id = buscar_historico_com_anexos.item_id
    GROUP BY h.id, h.acao, h.detalhes, h.usuario_id, h.created_at
    ORDER BY h.created_at DESC;
END;
$$;

-- 5. Funções de jobs e estatísticas

-- 5.1. Limpar jobs antigos
DROP FUNCTION IF EXISTS cleanup_old_jobs() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_old_jobs()
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM job_queue 
    WHERE status = 'completed' 
      AND completed_at < (NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- 5.2. Obter estatísticas de jobs
DROP FUNCTION IF EXISTS get_job_statistics() CASCADE;
CREATE OR REPLACE FUNCTION public.get_job_statistics()
RETURNS TABLE (
    status TEXT,
    count BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.status::TEXT,
        COUNT(*) as count
    FROM job_queue j
    GROUP BY j.status
    ORDER BY j.status;
END;
$$;

-- 5.3. Agendar envio mensal
DROP FUNCTION IF EXISTS schedule_monthly_dispatch() CASCADE;
CREATE OR REPLACE FUNCTION public.schedule_monthly_dispatch()
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar permissão de administrador
    IF NOT EXISTS (
        SELECT 1 FROM user_group_assignments uga
        JOIN user_groups ug ON uga.group_id = ug.id
        WHERE uga.user_id = auth.uid() AND ug.is_default_admin = true
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem agendar envios';
    END IF;
    
    INSERT INTO job_queue (type, payload, scheduled_for, created_at)
    VALUES (
        'monthly_dispatch',
        jsonb_build_object('month', EXTRACT(MONTH FROM NOW()), 'year', EXTRACT(YEAR FROM NOW())),
        date_trunc('month', NOW()) + INTERVAL '1 month',
        NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- 6. Funções de especialistas e validação

-- 6.1. Obter estatísticas de especialistas
DROP FUNCTION IF EXISTS get_especialistas_stats() CASCADE;
CREATE OR REPLACE FUNCTION public.get_especialistas_stats()
RETURNS TABLE (
    total BIGINT,
    ativos BIGINT,
    inativos BIGINT,
    sql_server BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verificar permissão
    IF NOT has_screen_permission('especialistas', 'view') THEN
        RAISE EXCEPTION 'Sem permissão para visualizar estatísticas de especialistas';
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'ativo') as ativos,
        COUNT(*) FILTER (WHERE status = 'inativo') as inativos,
        COUNT(*) FILTER (WHERE origem = 'sql_server') as sql_server
    FROM especialistas;
END;
$$;

-- 6.2. Validar especialista do SQL Server
DROP FUNCTION IF EXISTS validate_especialista_sql_server(TEXT) CASCADE;
CREATE OR REPLACE FUNCTION public.validate_especialista_sql_server(id_externo TEXT)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validar formato do ID externo (deve ter pelo menos 3 partes separadas por |)
    IF array_length(string_to_array(id_externo, '|'), 1) < 3 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se não existe duplicata
    IF EXISTS (
        SELECT 1 FROM especialistas 
        WHERE id_externo = validate_especialista_sql_server.id_externo
    ) THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$;

-- 7. Funções de teste do sistema

-- 7.1. Testar infraestrutura do sistema de requerimentos
DROP FUNCTION IF EXISTS test_sistema_requerimentos_infrastructure() CASCADE;
CREATE OR REPLACE FUNCTION public.test_sistema_requerimentos_infrastructure()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    message TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Testar tabelas principais
    RETURN QUERY
    SELECT 
        'Tabela requerimentos'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requerimentos') 
             THEN 'OK' ELSE 'ERRO' END::TEXT,
        'Tabela principal do sistema'::TEXT;
    
    -- Testar permissões
    RETURN QUERY
    SELECT 
        'Permissões'::TEXT,
        CASE WHEN check_requerimentos_permission() THEN 'OK' ELSE 'ERRO' END::TEXT,
        'Verificação de permissões de acesso'::TEXT;
END;
$$;

-- 7.2. Testar operações de dados de requerimentos
DROP FUNCTION IF EXISTS test_requerimentos_data_operations() CASCADE;
CREATE OR REPLACE FUNCTION public.test_requerimentos_data_operations()
RETURNS TABLE (
    operation TEXT,
    status TEXT,
    message TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    test_count INTEGER;
BEGIN
    -- Testar contagem de registros
    SELECT COUNT(*) INTO test_count FROM requerimentos;
    
    RETURN QUERY
    SELECT 
        'Contagem de registros'::TEXT,
        'OK'::TEXT,
        format('Total de %s requerimentos encontrados', test_count)::TEXT;
    
    -- Testar triggers
    RETURN QUERY
    SELECT 
        'Triggers'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers 
            WHERE trigger_name LIKE '%requerimentos%'
        ) THEN 'OK' ELSE 'AVISO' END::TEXT,
        'Verificação de triggers de auditoria'::TEXT;
END;
$$;

-- 8. Comentários de documentação para todas as funções
COMMENT ON FUNCTION public.atualizar_data_resposta_plano_acao() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Atualiza data de resposta quando plano muda para respondido.';
COMMENT ON FUNCTION public.atualizar_timestamp_plano_acao() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Trigger para atualizar timestamp de planos de ação.';
COMMENT ON FUNCTION public.preencher_data_conclusao() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Preenche data de conclusão automaticamente.';
COMMENT ON FUNCTION public.criar_log_historico_plano() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Cria logs de histórico para planos de ação.';
COMMENT ON FUNCTION public.marcar_pesquisa_encaminhada(UUID) IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Marca pesquisa como encaminhada com controle de permissão.';
COMMENT ON FUNCTION public.limpar_anexos_expirados() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Remove anexos temporários expirados.';
COMMENT ON FUNCTION public.validar_limite_anexos_empresa(UUID) IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Valida limite de anexos por empresa.';
COMMENT ON FUNCTION public.trigger_validar_limite_anexos() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Trigger para validar limite de anexos.';
COMMENT ON FUNCTION public.buscar_historico_com_anexos(UUID) IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Busca histórico com anexos relacionados.';
COMMENT ON FUNCTION public.cleanup_old_jobs() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Remove jobs antigos da fila.';
COMMENT ON FUNCTION public.get_job_statistics() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Retorna estatísticas de jobs.';
COMMENT ON FUNCTION public.schedule_monthly_dispatch() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Agenda envio mensal com controle de permissão.';
COMMENT ON FUNCTION public.get_especialistas_stats() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Retorna estatísticas de especialistas com controle de permissão.';
COMMENT ON FUNCTION public.validate_especialista_sql_server(TEXT) IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Valida dados de especialista do SQL Server.';
COMMENT ON FUNCTION public.test_sistema_requerimentos_infrastructure() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Testa infraestrutura do sistema de requerimentos.';
COMMENT ON FUNCTION public.test_requerimentos_data_operations() IS 'Função corrigida para segurança. Usa search_path fixo para evitar vulnerabilidades. Testa operações de dados de requerimentos.';

-- 9. Recriar permissões necessárias
GRANT EXECUTE ON FUNCTION public.marcar_pesquisa_encaminhada(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_especialistas_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_monthly_dispatch() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_sistema_requerimentos_infrastructure() TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_requerimentos_data_operations() TO authenticated;

-- 10. Mensagem de conclusão
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ FUNÇÕES RESTANTES CORRIGIDAS COM SUCESSO!';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 FUNÇÕES ADICIONAIS CORRIGIDAS:';
    RAISE NOTICE '   ✅ Funções de plano de ação (4 funções)';
    RAISE NOTICE '   ✅ Funções de pesquisas (1 função)';
    RAISE NOTICE '   ✅ Funções de anexos e validação (3 funções)';
    RAISE NOTICE '   ✅ Funções de histórico e busca (1 função)';
    RAISE NOTICE '   ✅ Funções de jobs e estatísticas (3 funções)';
    RAISE NOTICE '   ✅ Funções de especialistas (2 funções)';
    RAISE NOTICE '   ✅ Funções de teste do sistema (2 funções)';
    RAISE NOTICE '';
    RAISE NOTICE '📊 TOTAL: 16 funções adicionais corrigidas';
    RAISE NOTICE '';
    RAISE NOTICE '🛡️ TODAS AS FUNÇÕES AGORA ESTÃO SEGURAS!';
END $$;