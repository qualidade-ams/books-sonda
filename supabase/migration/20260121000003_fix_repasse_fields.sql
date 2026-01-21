-- =====================================================
-- MIGRAÇÃO: Correção dos Campos de Repasse
-- Data: 2026-01-21
-- Descrição: Separar corretamente os conceitos de:
--           1. Percentual de Repasse Mensal (mês a mês dentro do período)
--           2. Percentual de Repasse Especial (entre vigências)
-- =====================================================

-- =====================================================
-- PARTE 1: ADICIONAR NOVO CAMPO percentual_repasse_especial
-- =====================================================

-- Adicionar campo para repasse especial (entre vigências)
ALTER TABLE empresas_clientes 
  ADD COLUMN IF NOT EXISTS percentual_repasse_especial INTEGER 
  CHECK (percentual_repasse_especial BETWEEN 0 AND 100);

-- Comentário explicativo
COMMENT ON COLUMN empresas_clientes.percentual_repasse_especial IS 'Percentual de repasse entre vigências (0-100%). Usado quando possui_repasse_especial = true. Define quanto do saldo positivo será repassado de uma vigência para outra baseado em ciclos_para_zerar.';

-- =====================================================
-- PARTE 2: ATUALIZAR COMENTÁRIO DO CAMPO EXISTENTE
-- =====================================================

-- Atualizar comentário do percentual_repasse_mensal para deixar claro seu propósito
COMMENT ON COLUMN empresas_clientes.percentual_repasse_mensal IS 'Percentual de repasse mensal (0-100%). Define quanto do saldo positivo será repassado para o próximo mês DENTRO do Período de Apuração (mês a mês).';

-- =====================================================
-- PARTE 3: MIGRAR DADOS EXISTENTES (SE HOUVER)
-- =====================================================

-- Se houver empresas com possui_repasse_especial = true,
-- copiar o valor de percentual_repasse_mensal para percentual_repasse_especial
UPDATE empresas_clientes
SET percentual_repasse_especial = percentual_repasse_mensal
WHERE possui_repasse_especial = true
  AND percentual_repasse_mensal IS NOT NULL
  AND percentual_repasse_especial IS NULL;

-- =====================================================
-- PARTE 4: VALIDAÇÃO E VERIFICAÇÃO
-- =====================================================

DO $$
DECLARE
    empresas_com_repasse INTEGER;
    empresas_migradas INTEGER;
BEGIN
    -- Contar empresas com repasse especial
    SELECT COUNT(*) INTO empresas_com_repasse
    FROM empresas_clientes
    WHERE possui_repasse_especial = true;
    
    -- Contar empresas migradas
    SELECT COUNT(*) INTO empresas_migradas
    FROM empresas_clientes
    WHERE possui_repasse_especial = true
      AND percentual_repasse_especial IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 RESULTADO DA MIGRAÇÃO DE CAMPOS DE REPASSE';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Campo percentual_repasse_especial criado com sucesso';
    RAISE NOTICE '';
    RAISE NOTICE '📈 ESTATÍSTICAS:';
    RAISE NOTICE '   - Empresas com repasse especial: %', empresas_com_repasse;
    RAISE NOTICE '   - Empresas migradas: %', empresas_migradas;
    RAISE NOTICE '';
    RAISE NOTICE '📋 CAMPOS ATUALIZADOS:';
    RAISE NOTICE '';
    RAISE NOTICE '   1️⃣ percentual_repasse_mensal:';
    RAISE NOTICE '      → Repasse mês a mês DENTRO do Período de Apuração';
    RAISE NOTICE '      → Exemplo: Se 50%%, metade do saldo vai para o próximo mês';
    RAISE NOTICE '';
    RAISE NOTICE '   2️⃣ percentual_repasse_especial (NOVO):';
    RAISE NOTICE '      → Repasse entre vigências (baseado em ciclos_para_zerar)';
    RAISE NOTICE '      → Exemplo: Se 30%%, 30%% do saldo vai para a próxima vigência';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 PRÓXIMOS PASSOS:';
    RAISE NOTICE '   1. Atualizar formulário frontend para incluir novo campo';
    RAISE NOTICE '   2. Atualizar validações do schema Zod';
    RAISE NOTICE '   3. Atualizar lógica de cálculo de repasse';
    RAISE NOTICE '   4. Testar fluxo completo de repasse';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
END $$;
