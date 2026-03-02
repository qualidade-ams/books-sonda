-- ============================================================================
-- COPIE TUDO DAQUI ATÉ O FINAL E COLE NO SUPABASE SQL EDITOR
-- ============================================================================

-- Remover políticas antigas (todas as variações possíveis)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'banco_horas_calculos'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON banco_horas_calculos', pol.policyname);
  END LOOP;
END $$;

-- Garantir RLS habilitado
ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

-- Criar políticas corretas
CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos FOR DELETE TO authenticated USING (true);

CREATE POLICY "service_role_all_banco_horas_calculos"
  ON banco_horas_calculos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Verificar políticas criadas
SELECT '✅ POLÍTICAS CRIADAS:' as status;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'banco_horas_calculos' ORDER BY policyname;

-- Deletar cálculos antigos
DELETE FROM banco_horas_calculos WHERE empresa_id = '32d36d53-92ff-4b9e-bc96-575b73c787ac';

-- Verificar deleção
SELECT '✅ CÁLCULOS DELETADOS:' as status;
SELECT COUNT(*) as calculos_restantes FROM banco_horas_calculos WHERE empresa_id = '32d36d53-92ff-4b9e-bc96-575b73c787ac';

SELECT '🎉 PRONTO! Agora pressione Ctrl+Shift+R no navegador' as proxima_acao;
