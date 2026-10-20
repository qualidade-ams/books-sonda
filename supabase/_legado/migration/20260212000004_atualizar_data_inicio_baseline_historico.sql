-- Migration: Atualizar data_inicio da tabela baseline_historico
-- Data: 2026-02-12
-- Descrição: Atualiza o campo data_inicio da tabela baseline_historico para que fique
--            com a mesma data do campo inicio_vigencia da tabela empresas_clientes

-- ============================================================================
-- PASSO 1: Verificar dados ANTES da atualização
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO ANTES DA ATUALIZAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Mostrar registros que serão atualizados
SELECT 
  bh.id as baseline_historico_id,
  bh.empresa_id,
  ec.nome_abreviado as empresa,
  bh.data_inicio as data_inicio_atual,
  ec.inicio_vigencia as inicio_vigencia_empresa,
  CASE 
    WHEN bh.data_inicio = ec.inicio_vigencia THEN '✅ JÁ ESTÁ CORRETO'
    WHEN bh.data_inicio IS NULL THEN '⚠️ DATA_INICIO É NULL'
    WHEN ec.inicio_vigencia IS NULL THEN '⚠️ INICIO_VIGENCIA É NULL'
    ELSE '🔄 SERÁ ATUALIZADO'
  END as status
FROM baseline_historico bh
INNER JOIN empresas_clientes ec ON bh.empresa_id = ec.id
ORDER BY ec.nome_abreviado, bh.data_inicio;

-- Estatísticas
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN bh.data_inicio = ec.inicio_vigencia THEN 1 END) as ja_corretos,
  COUNT(CASE WHEN bh.data_inicio IS NULL THEN 1 END) as data_inicio_null,
  COUNT(CASE WHEN ec.inicio_vigencia IS NULL THEN 1 END) as inicio_vigencia_null,
  COUNT(CASE 
    WHEN bh.data_inicio IS NOT NULL 
    AND ec.inicio_vigencia IS NOT NULL 
    AND bh.data_inicio != ec.inicio_vigencia 
    THEN 1 
  END) as serao_atualizados
FROM baseline_historico bh
INNER JOIN empresas_clientes ec ON bh.empresa_id = ec.id;

-- ============================================================================
-- PASSO 2: Executar a atualização
-- ============================================================================

DO $$
DECLARE
  registros_atualizados INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'EXECUTANDO ATUALIZAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Atualizar data_inicio com a data de inicio_vigencia da empresa
  UPDATE baseline_historico bh
  SET data_inicio = ec.inicio_vigencia
  FROM empresas_clientes ec
  WHERE bh.empresa_id = ec.id
    AND ec.inicio_vigencia IS NOT NULL  -- Só atualizar se a empresa tem vigência definida
    AND (
      bh.data_inicio IS NULL  -- Atualizar se data_inicio é NULL
      OR bh.data_inicio != ec.inicio_vigencia  -- Ou se é diferente da vigência
    );
  
  GET DIAGNOSTICS registros_atualizados = ROW_COUNT;
  
  RAISE NOTICE '✅ Atualização concluída!';
  RAISE NOTICE '📊 Total de registros atualizados: %', registros_atualizados;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PASSO 3: Verificar dados DEPOIS da atualização
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICAÇÃO DEPOIS DA ATUALIZAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

-- Mostrar registros após atualização
SELECT 
  bh.id as baseline_historico_id,
  bh.empresa_id,
  ec.nome_abreviado as empresa,
  bh.data_inicio as data_inicio_atualizada,
  ec.inicio_vigencia as inicio_vigencia_empresa,
  CASE 
    WHEN bh.data_inicio = ec.inicio_vigencia THEN '✅ CORRETO'
    WHEN bh.data_inicio IS NULL THEN '⚠️ DATA_INICIO É NULL'
    WHEN ec.inicio_vigencia IS NULL THEN '⚠️ INICIO_VIGENCIA É NULL'
    ELSE '❌ AINDA DIFERENTE'
  END as status
FROM baseline_historico bh
INNER JOIN empresas_clientes ec ON bh.empresa_id = ec.id
ORDER BY ec.nome_abreviado, bh.data_inicio;

-- Estatísticas finais
SELECT 
  COUNT(*) as total_registros,
  COUNT(CASE WHEN bh.data_inicio = ec.inicio_vigencia THEN 1 END) as corretos,
  COUNT(CASE WHEN bh.data_inicio IS NULL THEN 1 END) as data_inicio_null,
  COUNT(CASE WHEN ec.inicio_vigencia IS NULL THEN 1 END) as inicio_vigencia_null,
  COUNT(CASE 
    WHEN bh.data_inicio IS NOT NULL 
    AND ec.inicio_vigencia IS NOT NULL 
    AND bh.data_inicio != ec.inicio_vigencia 
    THEN 1 
  END) as ainda_diferentes
FROM baseline_historico bh
INNER JOIN empresas_clientes ec ON bh.empresa_id = ec.id;

-- ============================================================================
-- PASSO 4: Comentários e documentação
-- ============================================================================

COMMENT ON COLUMN baseline_historico.data_inicio IS 
'Data de início da vigência do baseline. Deve corresponder ao inicio_vigencia da empresa.';

-- ============================================================================
-- OBSERVAÇÕES IMPORTANTES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'OBSERVAÇÕES IMPORTANTES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '1. Este script atualiza APENAS registros onde:';
  RAISE NOTICE '   - A empresa tem inicio_vigencia definido (NOT NULL)';
  RAISE NOTICE '   - O data_inicio é NULL OU diferente do inicio_vigencia';
  RAISE NOTICE '';
  RAISE NOTICE '2. Registros onde inicio_vigencia é NULL NÃO são atualizados';
  RAISE NOTICE '';
  RAISE NOTICE '3. Se houver registros "ainda_diferentes", verifique:';
  RAISE NOTICE '   - Se a empresa tem inicio_vigencia definido';
  RAISE NOTICE '   - Se há alguma constraint impedindo a atualização';
  RAISE NOTICE '';
  RAISE NOTICE '4. Para executar novamente, basta rodar este script';
  RAISE NOTICE '';
END $$;
