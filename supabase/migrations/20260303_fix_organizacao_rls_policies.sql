-- Migration: Adicionar políticas RLS de leitura pública para organograma
-- Data: 2026-03-03
-- Problema: Organograma não aparece no PDF porque não há políticas para anon
-- Solução: Adicionar políticas de leitura pública (anon) mantendo as existentes (authenticated)

-- ============================================================================
-- IMPORTANTE: NÃO REMOVER POLÍTICAS EXISTENTES
-- As políticas authenticated_*_organizacao* já existem e usam permissões
-- Vamos ADICIONAR políticas para anon (chave publishable) sem remover as existentes
-- ============================================================================

-- ============================================================================
-- TABELA: organizacao_estrutura
-- ============================================================================

-- Adicionar política de leitura pública para anon (PDFs)
DROP POLICY IF EXISTS "anon_select_organizacao_estrutura" ON organizacao_estrutura;

CREATE POLICY "anon_select_organizacao_estrutura"
  ON organizacao_estrutura FOR SELECT
  TO anon
  USING (true);

COMMENT ON POLICY "anon_select_organizacao_estrutura" ON organizacao_estrutura IS 
  'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';

-- ============================================================================
-- TABELA: organizacao_produto (se existir)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizacao_produto'
  ) THEN
    -- Adicionar política de leitura pública para anon
    DROP POLICY IF EXISTS "anon_select_organizacao_produto" ON organizacao_produto;

    CREATE POLICY "anon_select_organizacao_produto"
      ON organizacao_produto FOR SELECT
      TO anon
      USING (true);

    COMMENT ON POLICY "anon_select_organizacao_produto" ON organizacao_produto IS 
      'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';

    RAISE NOTICE '✅ Política RLS de leitura pública criada para organizacao_produto';
  ELSE
    RAISE NOTICE 'ℹ️  Tabela organizacao_produto não existe (sistema antigo)';
  END IF;
END $$;

-- ============================================================================
-- TABELA: organizacao_multiplos_superiores (se existir)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'organizacao_multiplos_superiores'
  ) THEN
    -- Adicionar política de leitura pública para anon
    DROP POLICY IF EXISTS "anon_select_organizacao_multiplos_superiores" ON organizacao_multiplos_superiores;

    CREATE POLICY "anon_select_organizacao_multiplos_superiores"
      ON organizacao_multiplos_superiores FOR SELECT
      TO anon
      USING (true);

    COMMENT ON POLICY "anon_select_organizacao_multiplos_superiores" ON organizacao_multiplos_superiores IS 
      'Leitura pública para anon (chave publishable). Necessário para geração de PDFs.';

    RAISE NOTICE '✅ Política RLS de leitura pública criada para organizacao_multiplos_superiores';
  ELSE
    RAISE NOTICE 'ℹ️  Tabela organizacao_multiplos_superiores não existe';
  END IF;
END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  anon_policy_count INTEGER;
BEGIN
  -- Contar todas as políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename IN ('organizacao_estrutura', 'organizacao_produto', 'organizacao_multiplos_superiores')
    AND schemaname = 'public';
  
  -- Contar políticas para anon
  SELECT COUNT(*) INTO anon_policy_count
  FROM pg_policies
  WHERE tablename IN ('organizacao_estrutura', 'organizacao_produto', 'organizacao_multiplos_superiores')
    AND schemaname = 'public'
    AND 'anon' = ANY(roles);
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total de políticas RLS para organograma: %', policy_count;
  RAISE NOTICE '✅ Políticas para anon (chave publishable): %', anon_policy_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Políticas adicionadas:';
  RAISE NOTICE '   - anon_select_organizacao_estrutura (SELECT para anon)';
  RAISE NOTICE '   - anon_select_organizacao_produto (SELECT para anon, se existir)';
  RAISE NOTICE '   - anon_select_organizacao_multiplos_superiores (SELECT para anon, se existir)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Políticas authenticated_* mantidas (não foram removidas)';
  RAISE NOTICE '✅ Organograma agora funciona com chave publishable em PDFs!';
END $$;
