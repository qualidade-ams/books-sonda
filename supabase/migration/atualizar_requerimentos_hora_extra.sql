-- =====================================================
-- Script: Atualizar requerimentos existentes com Hora Extra
-- Descrição: Define valor padrão para requerimentos antigos sem tipo_hora_extra
-- Data: 2024-12-08
-- =====================================================

-- Verificar quantos requerimentos precisam ser atualizados
DO $$
DECLARE
  total_sem_tipo INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO total_sem_tipo
  FROM requerimentos
  WHERE tipo_cobranca = 'Hora Extra'
  AND tipo_hora_extra IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ANÁLISE ===';
  RAISE NOTICE 'Requerimentos com Hora Extra sem tipo_hora_extra: %', total_sem_tipo;
  
  IF total_sem_tipo > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Atenção: % requerimentos serão atualizados', total_sem_tipo;
    RAISE NOTICE 'Valor padrão que será definido: 17h30-19h30 (Seg-Sex 17h30-19h30)';
    RAISE NOTICE '';
    RAISE NOTICE 'Se você deseja usar outro valor padrão, edite o script antes de executar a atualização.';
  ELSE
    RAISE NOTICE '✅ Nenhum requerimento precisa ser atualizado';
  END IF;
END $$;

-- Listar requerimentos que serão atualizados (para revisão)
SELECT 
  id,
  chamado,
  tipo_cobranca,
  tipo_hora_extra,
  created_at
FROM requerimentos
WHERE tipo_cobranca = 'Hora Extra'
AND tipo_hora_extra IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- ATENÇÃO: Descomente o bloco abaixo para executar a atualização
-- =====================================================

/*
-- Atualizar requerimentos com valor padrão
UPDATE requerimentos
SET tipo_hora_extra = '17h30-19h30'  -- Valor padrão: Seg-Sex 17h30-19h30
WHERE tipo_cobranca = 'Hora Extra'
AND tipo_hora_extra IS NULL;

-- Verificar resultado
DO $$
DECLARE
  total_atualizados INTEGER;
BEGIN
  GET DIAGNOSTICS total_atualizados = ROW_COUNT;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RESULTADO ===';
  RAISE NOTICE '✅ % requerimentos atualizados com sucesso!', total_atualizados;
  RAISE NOTICE 'Valor definido: 17h30-19h30 (Seg-Sex 17h30-19h30)';
END $$;
*/

-- =====================================================
-- OPÇÕES DE VALOR PADRÃO
-- =====================================================
-- Se você deseja usar outro valor padrão, substitua '17h30-19h30' por:
-- 
-- '17h30-19h30'  → Seg-Sex 17h30-19h30
-- 'apos_19h30'   → Seg-Sex Após 19h30
-- 'fim_semana'   → Sáb/Dom/Feriados
-- =====================================================

RAISE NOTICE '';
RAISE NOTICE '=== INSTRUÇÕES ===';
RAISE NOTICE '1. Revise a lista de requerimentos acima';
RAISE NOTICE '2. Se estiver correto, descomente o bloco UPDATE';
RAISE NOTICE '3. Execute o script novamente';
