-- ============================================
-- TRANSFORMAÇÃO AMS FINAL - APLICAR EM TODOS OS REGISTROS
-- ============================================

-- PASSO 1: Verificar registros antes da transformação
SELECT 
    'ANTES DA TRANSFORMAÇÃO - Registros com AMS:' as status,
    COUNT(*) as total
FROM pesquisas_satisfacao 
WHERE cliente LIKE '%AMS%';

-- PASSO 2: Aplicar transformação
-- Regra: Se cliente contém "AMS" E solicitante não está vazio
-- Então: empresa = "SONDA INTERNO" E cliente = solicitante
UPDATE pesquisas_satisfacao 
SET 
    empresa = 'SONDA INTERNO',
    cliente = solicitante,
    updated_at = NOW()
WHERE 
    cliente LIKE '%AMS%' 
    AND solicitante IS NOT NULL 
    AND solicitante != ''
    AND solicitante != cliente; -- Evitar loops

-- PASSO 3: Verificar resultado
SELECT 
    'APÓS TRANSFORMAÇÃO - Registros SONDA INTERNO:' as status,
    COUNT(*) as total
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO';

-- PASSO 4: Mostrar exemplos transformados
SELECT 
    'EXEMPLOS TRANSFORMADOS:' as titulo,
    empresa,
    cliente,
    solicitante
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO'
ORDER BY updated_at DESC
LIMIT 10;

-- PASSO 5: Verificar se ainda há registros AMS não transformados
SELECT 
    'REGISTROS AMS NÃO TRANSFORMADOS:' as titulo,
    COUNT(*) as total,
    STRING_AGG(DISTINCT 
        CASE 
            WHEN solicitante IS NULL THEN 'Solicitante NULL'
            WHEN solicitante = '' THEN 'Solicitante vazio'
            WHEN solicitante = cliente THEN 'Solicitante igual ao cliente'
            ELSE 'Outro motivo'
        END, 
        ', '
    ) as motivos
FROM pesquisas_satisfacao 
WHERE cliente LIKE '%AMS%' 
    AND empresa != 'SONDA INTERNO';

SELECT '✅ Transformação AMS concluída!' as resultado;