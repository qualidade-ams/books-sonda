-- =====================================================
-- Verificar Triggers de Auditoria em Todas as Tabelas
-- =====================================================

SELECT 
    '========================================' AS info
UNION ALL
SELECT 'TRIGGERS DE AUDITORIA POR TABELA' AS info
UNION ALL
SELECT '========================================' AS info;

-- Verificar triggers para cada tabela
SELECT 
    c.relname AS tabela,
    t.tgname AS trigger_name,
    CASE t.tgenabled
        WHEN 'O' THEN '✅ HABILITADO'
        WHEN 'D' THEN '❌ DESABILITADO'
        ELSE '⚠️ DESCONHECIDO'
    END AS status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname IN (
    'user_groups',
    'screen_permissions', 
    'user_group_assignments',
    'empresas_clientes',
    'clientes',
    'grupos_responsaveis',
    'email_templates',
    'historico_disparos',
    'requerimentos',
    'profiles'
)
AND t.tgname LIKE 'audit_%'
ORDER BY c.relname, t.tgname;

-- Resumo
SELECT 
    '========================================' AS info
UNION ALL
SELECT 'RESUMO' AS info
UNION ALL
SELECT '========================================' AS info;

SELECT 
    c.relname AS tabela,
    COUNT(CASE WHEN t.tgname LIKE 'audit_%' THEN 1 END) AS triggers_auditoria,
    CASE 
        WHEN COUNT(CASE WHEN t.tgname LIKE 'audit_%' THEN 1 END) >= 2 THEN '✅ OK'
        WHEN COUNT(CASE WHEN t.tgname LIKE 'audit_%' THEN 1 END) = 1 THEN '⚠️ INCOMPLETO'
        ELSE '❌ SEM TRIGGERS'
    END AS status
FROM pg_class c
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND t.tgname LIKE 'audit_%'
WHERE c.relname IN (
    'user_groups',
    'screen_permissions',
    'user_group_assignments',
    'empresas_clientes',
    'clientes',
    'grupos_responsaveis',
    'email_templates',
    'historico_disparos',
    'requerimentos',
    'profiles'
)
GROUP BY c.relname
ORDER BY c.relname;
