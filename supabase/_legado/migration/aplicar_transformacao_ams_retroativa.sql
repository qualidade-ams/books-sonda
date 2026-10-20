-- ============================================
-- APLICAR TRANSFORMAÇÃO AMS RETROATIVA
-- ============================================
-- Este script aplica a transformação AMS nos dados já existentes

-- Verificar registros que precisam de transformação
SELECT 
    id,
    empresa,
    cliente,
    solicitante,
    CASE 
        WHEN cliente LIKE '%AMS%' AND solicitante IS NOT NULL AND solicitante != '' 
        THEN 'PRECISA TRANSFORMAR'
        ELSE 'OK'
    END as status_transformacao
FROM pesquisas_satisfacao 
WHERE cliente LIKE '%AMS%'
ORDER BY created_at DESC;

-- Aplicar transformação para registros com cliente contendo "AMS"
UPDATE pesquisas_satisfacao 
SET 
    empresa = 'SONDA INTERNO',
    cliente = solicitante
WHERE 
    cliente LIKE '%AMS%' 
    AND solicitante IS NOT NULL 
    AND solicitante != ''
    AND empresa != 'SONDA INTERNO'; -- Evitar atualizar registros já transformados

-- Verificar quantos registros foram atualizados
SELECT 
    COUNT(*) as total_transformados
FROM pesquisas_satisfacao 
WHERE 
    empresa = 'SONDA INTERNO' 
    AND solicitante IS NOT NULL 
    AND solicitante != '';

-- Mostrar alguns exemplos dos registros transformados
SELECT 
    id,
    empresa,
    cliente,
    solicitante,
    created_at
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO'
ORDER BY created_at DESC
LIMIT 10;

SELECT '✅ Transformação AMS aplicada retroativamente!' as status;