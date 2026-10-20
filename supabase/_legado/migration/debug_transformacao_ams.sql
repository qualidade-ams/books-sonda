-- ============================================
-- DEBUG: VERIFICAR REGISTROS QUE PRECISAM DE TRANSFORMAÇÃO AMS
-- ============================================

-- 1. Verificar registros com cliente contendo "AMS"
SELECT 
    'Registros com cliente contendo AMS:' as info,
    COUNT(*) as total
FROM pesquisas_satisfacao 
WHERE cliente LIKE '%AMS%';

-- 2. Mostrar alguns exemplos
SELECT 
    id,
    empresa,
    cliente,
    solicitante,
    CASE 
        WHEN cliente LIKE '%AMS%' AND solicitante IS NOT NULL AND solicitante != '' 
        THEN 'PODE TRANSFORMAR'
        WHEN cliente LIKE '%AMS%' AND (solicitante IS NULL OR solicitante = '')
        THEN 'SEM SOLICITANTE'
        ELSE 'NÃO PRECISA'
    END as status_transformacao
FROM pesquisas_satisfacao 
WHERE cliente LIKE '%AMS%'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se já existem registros transformados
SELECT 
    'Registros já transformados (SONDA INTERNO):' as info,
    COUNT(*) as total
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO';

-- 4. Mostrar registros SONDA INTERNO
SELECT 
    id,
    empresa,
    cliente,
    solicitante,
    created_at
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO'
ORDER BY created_at DESC
LIMIT 5;