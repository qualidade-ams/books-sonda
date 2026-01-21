-- =====================================================
-- Migration: RLS Policies para Sistema de Banco de Horas
-- Data: 2026-01-21
-- Descrição: Implementa políticas de segurança (RLS) para todas as tabelas do sistema de banco de horas
-- Requisitos: 13.5, 13.6, 13.8
-- =====================================================

-- Habilitar RLS em todas as tabelas de banco de horas
ALTER TABLE banco_horas_alocacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_calculos_segmentados ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_reajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_versoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE banco_horas_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTE 1: Políticas para banco_horas_alocacoes
-- =====================================================

-- Leitura: Usuários autenticados podem visualizar alocações
CREATE POLICY "Authenticated users can view alocacoes" ON banco_horas_alocacoes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Apenas administradores podem criar alocações
CREATE POLICY "Admins can insert alocacoes" ON banco_horas_alocacoes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Atualização: Apenas administradores podem atualizar alocações
CREATE POLICY "Admins can update alocacoes" ON banco_horas_alocacoes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Deleção: Apenas administradores podem deletar alocações (soft delete via ativo=false)
CREATE POLICY "Admins can delete alocacoes" ON banco_horas_alocacoes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- =====================================================
-- PARTE 2: Políticas para banco_horas_calculos
-- =====================================================

-- Leitura: Usuários autenticados podem visualizar cálculos
-- Requisito 13.5: Leitura de cálculos para usuários autorizados
CREATE POLICY "Authenticated users can view calculos" ON banco_horas_calculos
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Apenas administradores podem criar cálculos
CREATE POLICY "Admins can insert calculos" ON banco_horas_calculos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Atualização: Apenas administradores podem atualizar cálculos
CREATE POLICY "Admins can update calculos" ON banco_horas_calculos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Deleção: Proibida (imutabilidade de versões)
-- Não criamos policy de DELETE para garantir imutabilidade

-- =====================================================
-- PARTE 3: Políticas para banco_horas_calculos_segmentados
-- =====================================================

-- Leitura: Usuários autenticados podem visualizar cálculos segmentados
CREATE POLICY "Authenticated users can view calculos_segmentados" ON banco_horas_calculos_segmentados
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Apenas administradores podem criar cálculos segmentados
CREATE POLICY "Admins can insert calculos_segmentados" ON banco_horas_calculos_segmentados
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Atualização: Apenas administradores podem atualizar cálculos segmentados
CREATE POLICY "Admins can update calculos_segmentados" ON banco_horas_calculos_segmentados
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Deleção: Proibida (imutabilidade)
-- Não criamos policy de DELETE

-- =====================================================
-- PARTE 4: Políticas para banco_horas_reajustes
-- =====================================================

-- Leitura: Usuários autenticados podem visualizar reajustes
-- MAS observacao_privada só é visível para administradores (tratado no frontend)
CREATE POLICY "Authenticated users can view reajustes" ON banco_horas_reajustes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Apenas administradores podem criar reajustes
-- Requisito 13.6: Criação de reajustes apenas para administradores
CREATE POLICY "Admins can insert reajustes" ON banco_horas_reajustes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Atualização: Apenas administradores podem atualizar reajustes (para soft delete via ativo=false)
CREATE POLICY "Admins can update reajustes" ON banco_horas_reajustes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Deleção: Proibida (rastreabilidade)
-- Não criamos policy de DELETE para garantir rastreabilidade completa

-- =====================================================
-- PARTE 5: Políticas para banco_horas_versoes
-- =====================================================

-- Leitura: Usuários autenticados podem visualizar histórico de versões
CREATE POLICY "Authenticated users can view versoes" ON banco_horas_versoes
  FOR SELECT
  USING ((SELECT auth.uid()) IS NOT NULL);

-- Inserção: Apenas administradores podem criar versões (via sistema)
CREATE POLICY "Admins can insert versoes" ON banco_horas_versoes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Atualização: Proibida (imutabilidade de versões)
-- Não criamos policy de UPDATE

-- Deleção: Proibida (preservação de histórico)
-- Não criamos policy de DELETE

-- =====================================================
-- PARTE 6: Políticas para banco_horas_audit_log
-- =====================================================

-- Leitura: Apenas administradores podem visualizar audit log
-- Requisito 13.8: Audit log apenas para administradores
CREATE POLICY "Admins can view audit_log" ON banco_horas_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN user_groups ug ON p.group_id = ug.id
      WHERE p.id = (SELECT auth.uid())
        AND ug.name = 'Administradores'
    )
  );

-- Inserção: Sistema pode inserir logs (via triggers ou service role)
CREATE POLICY "System can insert audit_log" ON banco_horas_audit_log
  FOR INSERT
  WITH CHECK (true); -- Permite inserção via triggers e service role

-- Atualização: Proibida (imutabilidade de logs)
-- Não criamos policy de UPDATE

-- Deleção: Proibida (preservação de auditoria)
-- Não criamos policy de DELETE

-- =====================================================
-- PARTE 7: Comentários e Documentação
-- =====================================================

COMMENT ON POLICY "Authenticated users can view alocacoes" ON banco_horas_alocacoes IS 
  'Permite que usuários autenticados visualizem alocações de banco de horas';

COMMENT ON POLICY "Admins can insert alocacoes" ON banco_horas_alocacoes IS 
  'Apenas administradores podem criar novas alocações';

COMMENT ON POLICY "Authenticated users can view calculos" ON banco_horas_calculos IS 
  'Requisito 13.5: Usuários autorizados podem visualizar cálculos mensais';

COMMENT ON POLICY "Admins can insert reajustes" ON banco_horas_reajustes IS 
  'Requisito 13.6: Apenas administradores podem criar reajustes manuais';

COMMENT ON POLICY "Admins can view audit_log" ON banco_horas_audit_log IS 
  'Requisito 13.8: Audit log restrito a administradores para garantir segurança';

-- =====================================================
-- PARTE 8: Verificação e Logs
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies para Banco de Horas criadas com sucesso';
  RAISE NOTICE '📋 Tabelas protegidas:';
  RAISE NOTICE '   - banco_horas_alocacoes (4 policies)';
  RAISE NOTICE '   - banco_horas_calculos (3 policies)';
  RAISE NOTICE '   - banco_horas_calculos_segmentados (3 policies)';
  RAISE NOTICE '   - banco_horas_reajustes (3 policies)';
  RAISE NOTICE '   - banco_horas_versoes (2 policies)';
  RAISE NOTICE '   - banco_horas_audit_log (2 policies)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Regras de Segurança:';
  RAISE NOTICE '   ✓ Leitura: Usuários autenticados';
  RAISE NOTICE '   ✓ Criação de reajustes: Apenas administradores';
  RAISE NOTICE '   ✓ Audit log: Apenas administradores';
  RAISE NOTICE '   ✓ Versões: Imutáveis (sem UPDATE/DELETE)';
  RAISE NOTICE '   ✓ Observações privadas: Controle no frontend';
END $$;
