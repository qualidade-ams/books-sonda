-- =====================================================
-- SCRIPT SIMPLIFICADO PARA CRIAR BASELINE_HISTORICO
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. LIMPAR OBJETOS EXISTENTES (se houver)
DROP POLICY IF EXISTS "authenticated_select_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_insert_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_update_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_delete_baseline_historico" ON baseline_historico;
DROP TRIGGER IF EXISTS trigger_encerrar_baseline_anterior ON baseline_historico;
DROP TRIGGER IF EXISTS trigger_update_baseline_historico_timestamp ON baseline_historico;
DROP FUNCTION IF EXISTS encerrar_baseline_anterior();
DROP FUNCTION IF EXISTS update_baseline_historico_timestamp();
DROP FUNCTION IF EXISTS user_can_access_baseline_historico();
DROP FUNCTION IF EXISTS get_baseline_vigente(UUID, DATE);
DROP FUNCTION IF EXISTS get_baseline_horas_vigente(UUID, DATE);
DROP INDEX IF EXISTS idx_baseline_historico_empresa;
DROP INDEX IF EXISTS idx_baseline_historico_vigencia;
DROP INDEX IF EXISTS idx_baseline_historico_empresa_vigencia;
DROP INDEX IF EXISTS idx_baseline_historico_vigencia_ativa;
DROP TABLE IF EXISTS baseline_historico CASCADE;

-- 2. CRIAR TABELA
CREATE TABLE baseline_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  baseline_horas DECIMAL(10,2) NOT NULL CHECK (baseline_horas >= 0),
  baseline_tickets INTEGER CHECK (baseline_tickets >= 0),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  motivo TEXT,
  observacao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  CONSTRAINT check_vigencia_valida CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- 3. CRIAR ÍNDICES
CREATE INDEX idx_baseline_historico_empresa ON baseline_historico(empresa_id);
CREATE INDEX idx_baseline_historico_vigencia ON baseline_historico(data_inicio, data_fim);
CREATE INDEX idx_baseline_historico_empresa_vigencia ON baseline_historico(empresa_id, data_inicio, data_fim);
CREATE UNIQUE INDEX idx_baseline_historico_vigencia_ativa ON baseline_historico(empresa_id) WHERE data_fim IS NULL;

-- 4. COMENTÁRIOS
COMMENT ON TABLE baseline_historico IS 'Histórico de vigências de baseline de horas e tickets contratados por empresa';
COMMENT ON COLUMN baseline_historico.data_inicio IS 'Data de início da vigência (inclusive)';
COMMENT ON COLUMN baseline_historico.data_fim IS 'Data de fim da vigência (inclusive). NULL indica vigência atual/ativa';

-- 5. FUNÇÃO PARA BUSCAR BASELINE VIGENTE
CREATE OR REPLACE FUNCTION get_baseline_vigente(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  baseline_horas DECIMAL(10,2),
  baseline_tickets INTEGER,
  data_inicio DATE,
  data_fim DATE,
  motivo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bh.baseline_horas,
    bh.baseline_tickets,
    bh.data_inicio,
    bh.data_fim,
    bh.motivo
  FROM baseline_historico bh
  WHERE bh.empresa_id = p_empresa_id
    AND bh.data_inicio <= p_data
    AND (bh.data_fim IS NULL OR bh.data_fim >= p_data)
  ORDER BY bh.data_inicio DESC
  LIMIT 1;
END;
$$;

-- 6. FUNÇÃO PARA BUSCAR APENAS HORAS
CREATE OR REPLACE FUNCTION get_baseline_horas_vigente(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_baseline DECIMAL(10,2);
BEGIN
  SELECT baseline_horas INTO v_baseline
  FROM baseline_historico
  WHERE empresa_id = p_empresa_id
    AND data_inicio <= p_data
    AND (data_fim IS NULL OR data_fim >= p_data)
  ORDER BY data_inicio DESC
  LIMIT 1;
  
  RETURN COALESCE(v_baseline, 0);
END;
$$;

-- 7. TRIGGER PARA ENCERRAR VIGÊNCIA ANTERIOR
CREATE OR REPLACE FUNCTION encerrar_baseline_anterior()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE baseline_historico
  SET 
    data_fim = NEW.data_inicio - INTERVAL '1 day',
    updated_at = NOW(),
    updated_by = NEW.created_by
  WHERE empresa_id = NEW.empresa_id
    AND data_fim IS NULL
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_encerrar_baseline_anterior
  BEFORE INSERT ON baseline_historico
  FOR EACH ROW
  EXECUTE FUNCTION encerrar_baseline_anterior();

-- 8. TRIGGER PARA ATUALIZAR TIMESTAMP
CREATE OR REPLACE FUNCTION update_baseline_historico_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_baseline_historico_timestamp
  BEFORE UPDATE ON baseline_historico
  FOR EACH ROW
  EXECUTE FUNCTION update_baseline_historico_timestamp();

-- 9. MIGRAR DADOS EXISTENTES
INSERT INTO baseline_historico (
  empresa_id, 
  baseline_horas, 
  baseline_tickets,
  data_inicio, 
  data_fim, 
  motivo, 
  observacao,
  created_by
)
SELECT 
  ec.id,
  COALESCE(
    CASE 
      WHEN ec.baseline_horas_mensal IS NOT NULL 
      THEN EXTRACT(EPOCH FROM ec.baseline_horas_mensal) / 3600.0
      ELSE 0
    END,
    0
  )::DECIMAL(10,2),
  ec.baseline_tickets_mensal,
  COALESCE(
    ec.inicio_vigencia,
    ec.created_at::DATE,
    '2024-01-01'::DATE
  ),
  NULL,
  'Migração inicial do sistema',
  CASE 
    WHEN ec.baseline_horas_mensal IS NULL THEN 'Baseline não definido - valor zerado'
    ELSE 'Baseline migrado da tabela empresas_clientes'
  END,
  (SELECT id FROM profiles WHERE email LIKE '%admin%' OR email LIKE '%sonda%' LIMIT 1)
FROM empresas_clientes ec
WHERE NOT EXISTS (
  SELECT 1 FROM baseline_historico bh WHERE bh.empresa_id = ec.id
);

-- 10. HABILITAR RLS
ALTER TABLE baseline_historico ENABLE ROW LEVEL SECURITY;

-- 11. FUNÇÃO DE PERMISSÃO
CREATE OR REPLACE FUNCTION user_can_access_baseline_historico()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_group_assignments uga
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE uga.user_id = (SELECT auth.uid())
      AND sp.screen_key IN ('cadastro_empresas', 'controle_banco_horas', 'admin')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

-- 12. REMOVER POLÍTICAS ANTIGAS
DROP POLICY IF EXISTS "authenticated_select_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_insert_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_update_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_delete_baseline_historico" ON baseline_historico;

-- 13. CRIAR POLÍTICAS RLS
CREATE POLICY "authenticated_select_baseline_historico"
  ON baseline_historico FOR SELECT
  TO authenticated
  USING (user_can_access_baseline_historico());

CREATE POLICY "authenticated_insert_baseline_historico"
  ON baseline_historico FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_baseline_historico());

CREATE POLICY "authenticated_update_baseline_historico"
  ON baseline_historico FOR UPDATE
  TO authenticated
  USING (user_can_access_baseline_historico());

CREATE POLICY "authenticated_delete_baseline_historico"
  ON baseline_historico FOR DELETE
  TO authenticated
  USING (user_can_access_baseline_historico());

-- 14. GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE, DELETE ON baseline_historico TO authenticated;
GRANT ALL ON baseline_historico TO service_role;

-- 15. VERIFICAÇÃO FINAL
DO $$
DECLARE
  duplicate_count INTEGER;
  total_records INTEGER;
BEGIN
  -- Verificar duplicatas
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT empresa_id, COUNT(*) as total
    FROM baseline_historico 
    WHERE data_fim IS NULL
    GROUP BY empresa_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Contar registros migrados
  SELECT COUNT(*) INTO total_records FROM baseline_historico;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: % empresas com múltiplas vigências ativas!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ Migração concluída com sucesso!';
    RAISE NOTICE '📊 Total de registros: %', total_records;
    RAISE NOTICE '🔒 RLS habilitado';
    RAISE NOTICE '✅ Sem duplicatas detectadas';
  END IF;
END $$;
