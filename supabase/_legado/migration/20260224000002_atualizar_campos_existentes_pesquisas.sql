-- ============================================
-- ATUALIZAR CAMPOS NOVOS EM REGISTROS EXISTENTES
-- ============================================
-- Este script atualiza os 11 novos campos em registros que já existem
-- no Supabase, buscando os dados do SQL Server através da API de sincronização
--
-- IMPORTANTE: Este script deve ser executado APÓS a API estar rodando
-- com as mudanças no código TypeScript
-- ============================================

-- Verificar quantos registros precisam ser atualizados
DO $$
DECLARE
    v_total INTEGER;
    v_com_servico INTEGER;
    v_sem_servico INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server';
    
    SELECT COUNT(*) INTO v_com_servico
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server'
        AND servico IS NOT NULL;
    
    SELECT COUNT(*) INTO v_sem_servico
    FROM pesquisas_satisfacao
    WHERE origem = 'sql_server'
        AND servico IS NULL;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ANÁLISE DE REGISTROS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de registros: %', v_total;
    RAISE NOTICE 'Com servico preenchido: %', v_com_servico;
    RAISE NOTICE 'Sem servico (precisam atualizar): %', v_sem_servico;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- OPÇÃO 1: ATUALIZAÇÃO VIA API (RECOMENDADO)
-- ============================================
-- A melhor forma é usar a API de sincronização que já está configurada
-- Execute este comando no terminal:
--
-- curl -X POST http://localhost:3001/api/sync-pesquisas-full
--
-- Isso irá:
-- 1. Buscar TODOS os registros do SQL Server
-- 2. Atualizar os registros existentes no Supabase
-- 3. Preservar todos os outros campos
-- 4. Preencher os 11 novos campos

-- ============================================
-- OPÇÃO 2: ATUALIZAÇÃO MANUAL (SE NECESSÁRIO)
-- ============================================
-- Se você tiver acesso direto ao SQL Server e quiser fazer manualmente,
-- pode usar este template para cada registro:

/*
-- Template de atualização manual (exemplo)
UPDATE pesquisas_satisfacao
SET 
    servico = 'Valor do SQL Server',
    nome_pesquisa = 'Valor do SQL Server',
    data_fechamento = '2026-01-15 10:30:00+00'::TIMESTAMPTZ,
    data_ultima_modificacao = '2026-01-20 14:45:00+00'::TIMESTAMPTZ,
    autor_notificacao = 'Valor do SQL Server',
    estado = 'Valor do SQL Server',
    descricao = 'Valor do SQL Server',
    pesquisa_recebida = 'Valor do SQL Server',
    pergunta = 'Valor do SQL Server',
    sequencia_pergunta = 'Valor do SQL Server',
    log = '2026-01-25 09:15:00+00'::TIMESTAMPTZ
WHERE id_externo = 'ID_UNICO_DO_REGISTRO'
    AND origem = 'sql_server';
*/

-- ============================================
-- VERIFICAÇÃO APÓS ATUALIZAÇÃO
-- ============================================
-- Execute esta query após a atualização para verificar o resultado

SELECT 
    COUNT(*) as total_registros,
    COUNT(servico) as com_servico,
    COUNT(nome_pesquisa) as com_nome_pesquisa,
    COUNT(data_fechamento) as com_data_fechamento,
    COUNT(data_ultima_modificacao) as com_data_ultima_modificacao,
    COUNT(autor_notificacao) as com_autor_notificacao,
    COUNT(estado) as com_estado,
    COUNT(descricao) as com_descricao,
    COUNT(pesquisa_recebida) as com_pesquisa_recebida,
    COUNT(pergunta) as com_pergunta,
    COUNT(sequencia_pergunta) as com_sequencia_pergunta,
    COUNT(log) as com_log,
    ROUND(COUNT(servico)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) as percentual_preenchido
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- ============================================
-- AMOSTRA DE REGISTROS ATUALIZADOS
-- ============================================
-- Visualizar alguns registros para confirmar atualização

SELECT 
    nro_caso,
    cliente,
    servico,
    nome_pesquisa,
    data_fechamento,
    estado,
    descricao,
    created_at,
    updated_at
FROM pesquisas_satisfacao
WHERE origem = 'sql_server'
ORDER BY updated_at DESC
LIMIT 10;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '⚠️ ATENÇÃO: Para atualizar os registros existentes, execute a sincronização completa via API' as aviso;
SELECT 'Comando: curl -X POST http://localhost:3001/api/sync-pesquisas-full' as comando_recomendado;
SELECT 'Isso irá atualizar TODOS os registros preservando os dados existentes' as observacao;
