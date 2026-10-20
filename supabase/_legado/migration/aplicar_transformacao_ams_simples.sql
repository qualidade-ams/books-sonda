-- ============================================
-- APLICAR TRANSFORMAÇÃO AMS - VERSÃO SIMPLES
-- ============================================

-- Aplicar transformação para todos os registros onde:
-- 1. Cliente contém "AMS" 
-- 2. Solicitante não está vazio
-- 3. Empresa ainda não é "SONDA INTERNO"

UPDATE pesquisas_satisfacao 
SET 
    empresa = 'SONDA INTERNO',
    cliente = solicitante
WHERE 
    cliente LIKE '%AMS%' 
    AND solicitante IS NOT NULL 
    AND solicitante != ''
    AND empresa != 'SONDA INTERNO';

-- Verificar resultado
SELECT 
    'Registros transformados:' as resultado,
    COUNT(*) as total
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO';

-- Mostrar alguns exemplos
SELECT 
    empresa,
    cliente,
    solicitante
FROM pesquisas_satisfacao 
WHERE empresa = 'SONDA INTERNO'
LIMIT 5;