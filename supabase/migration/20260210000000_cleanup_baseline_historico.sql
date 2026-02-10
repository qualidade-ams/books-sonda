-- Script de Limpeza para Baseline Histórico
-- Execute APENAS se precisar limpar uma instalação parcial anterior

-- Remover políticas RLS
DROP POLICY IF EXISTS "authenticated_select_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_insert_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_update_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_delete_baseline_historico" ON baseline_historico;

-- Remover triggers
DROP TRIGGER IF EXISTS trigger_encerrar_baseline_anterior ON baseline_historico;
DROP TRIGGER IF EXISTS trigger_update_baseline_historico_timestamp ON baseline_historico;

-- Remover funções
DROP FUNCTION IF EXISTS encerrar_baseline_anterior();
DROP FUNCTION IF EXISTS update_baseline_historico_timestamp();
DROP FUNCTION IF EXISTS user_can_access_baseline_historico();
DROP FUNCTION IF EXISTS get_baseline_vigente(UUID, DATE);
DROP FUNCTION IF EXISTS get_baseline_horas_vigente(UUID, DATE);

-- Remover índices
DROP INDEX IF EXISTS idx_baseline_historico_empresa;
DROP INDEX IF EXISTS idx_baseline_historico_vigencia;
DROP INDEX IF EXISTS idx_baseline_historico_empresa_vigencia;
DROP INDEX IF EXISTS idx_baseline_historico_vigencia_ativa;

-- Remover tabela
DROP TABLE IF EXISTS baseline_historico CASCADE;

-- Mensagem de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Limpeza concluída! Agora execute a migration principal: 20260210000001_create_baseline_historico.sql';
END $$;
