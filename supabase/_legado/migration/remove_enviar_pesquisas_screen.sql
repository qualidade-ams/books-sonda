-- =====================================================
-- MIGRAÇÃO: REMOVER TELA ENVIAR PESQUISAS
-- =====================================================
-- Remove a tela "Enviar Pesquisas" do sistema de permissões
-- =====================================================

-- =====================================================
-- 1. REMOVER PERMISSÕES DA TELA
-- =====================================================

DO $$
BEGIN
  -- Deletar permissões associadas à tela
  DELETE FROM screen_permissions 
  WHERE screen_key = 'enviar_pesquisas';
  
  RAISE NOTICE '✅ Permissões da tela "Enviar Pesquisas" removidas';
END $$;

-- =====================================================
-- 2. REMOVER TELA DO SISTEMA
-- =====================================================

DO $$
DECLARE
  v_screen_exists BOOLEAN;
BEGIN
  -- Verificar se a tela existe
  SELECT EXISTS (
    SELECT 1 FROM screens WHERE key = 'enviar_pesquisas'
  ) INTO v_screen_exists;

  IF v_screen_exists THEN
    -- Deletar tela
    DELETE FROM screens WHERE key = 'enviar_pesquisas';
    
    RAISE NOTICE '✅ Tela "Enviar Pesquisas" removida do sistema';
  ELSE
    RAISE NOTICE '⚠️  Tela "Enviar Pesquisas" não encontrada no sistema';
  END IF;
END $$;

-- =====================================================
-- 3. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se a tela foi removida
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM screens WHERE key = 'enviar_pesquisas') 
    THEN '❌ Tela ainda existe'
    ELSE '✅ Tela removida com sucesso'
  END as status;

-- Verificar se ainda existem permissões
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM screen_permissions WHERE screen_key = 'enviar_pesquisas') 
    THEN '❌ Permissões ainda existem'
    ELSE '✅ Permissões removidas com sucesso'
  END as status_permissoes;

-- =====================================================
-- LOG DE EXECUÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Tela Enviar Pesquisas removida';
  RAISE NOTICE '🗑️  Screen Key: enviar_pesquisas';
  RAISE NOTICE '🗑️  Rota: /admin/enviar-pesquisas';
  RAISE NOTICE '========================================';
END $$;
