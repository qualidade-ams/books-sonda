-- ============================================================================
-- Script de Correção de Problemas de Segurança
-- Execute este script no Supabase SQL Editor
-- ============================================================================

-- PROBLEMA 1: Função sem SECURITY DEFINER
DROP FUNCTION IF EXISTS public.update_de_para_categoria_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_de_para_categoria_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_de_para_categoria_updated_at ON de_para_categoria;

CREATE TRIGGER trigger_update_de_para_categoria_updated_at
  BEFORE UPDATE ON de_para_categoria
  FOR EACH ROW
  EXECUTE FUNCTION update_de_para_categoria_updated_at();

-- PROBLEMA 2: Políticas RLS permissivas
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;

ALTER TABLE banco_horas_calculos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_banco_horas_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_groups ug ON p.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN (
        'controle_banco_horas',
        'banco_horas_alocacoes',
        'banco_horas_visao_consolidada',
        'banco_horas_visao_segmentada'
      )
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

CREATE POLICY "authenticated_select_banco_horas_calculos"
  ON banco_horas_calculos FOR SELECT TO authenticated
  USING (user_has_banco_horas_permission());

CREATE POLICY "authenticated_insert_banco_horas_calculos"
  ON banco_horas_calculos FOR INSERT TO authenticated
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_update_banco_horas_calculos"
  ON banco_horas_calculos FOR UPDATE TO authenticated
  USING (user_has_banco_horas_permission())
  WITH CHECK (user_has_banco_horas_permission());

CREATE POLICY "authenticated_delete_banco_horas_calculos"
  ON banco_horas_calculos FOR DELETE TO authenticated
  USING (user_has_banco_horas_permission());

-- Verificação
SELECT 'Correções aplicadas com sucesso!' as status;
