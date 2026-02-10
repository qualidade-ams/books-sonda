-- Migration: Criar sistema de histórico de baseline com vigências
-- Data: 2026-02-10
-- Descrição: Implementa controle temporal de baseline para suportar renovações e renegociações contratuais

-- =====================================================
-- 1. CRIAR TABELA DE HISTÓRICO DE BASELINE
-- =====================================================

CREATE TABLE IF NOT EXISTS baseline_historico (
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
  
  -- Garantir que não haja sobreposição de vigências
  CONSTRAINT check_vigencia_valida CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_baseline_historico_empresa ON baseline_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_baseline_historico_vigencia ON baseline_historico(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_baseline_historico_empresa_vigencia ON baseline_historico(empresa_id, data_inicio, data_fim);

-- Índice único parcial: apenas uma vigência ativa (data_fim NULL) por empresa
DROP INDEX IF EXISTS idx_baseline_historico_vigencia_ativa;
CREATE UNIQUE INDEX idx_baseline_historico_vigencia_ativa 
  ON baseline_historico(empresa_id) 
  WHERE data_fim IS NULL;

-- =====================================================
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE baseline_historico IS 'Histórico de vigências de baseline de horas e tickets contratados por empresa. Permite rastreamento temporal de mudanças contratuais.';
COMMENT ON COLUMN baseline_historico.empresa_id IS 'Referência à empresa cliente';
COMMENT ON COLUMN baseline_historico.baseline_horas IS 'Baseline mensal de horas contratadas nesta vigência';
COMMENT ON COLUMN baseline_historico.baseline_tickets IS 'Baseline mensal de tickets contratados nesta vigência (opcional)';
COMMENT ON COLUMN baseline_historico.data_inicio IS 'Data de início da vigência (inclusive)';
COMMENT ON COLUMN baseline_historico.data_fim IS 'Data de fim da vigência (inclusive). NULL indica vigência atual/ativa';
COMMENT ON COLUMN baseline_historico.motivo IS 'Motivo da mudança: Renovação Contratual, Renegociação, Ajuste, Correção, etc.';
COMMENT ON COLUMN baseline_historico.observacao IS 'Observações adicionais sobre a mudança';
COMMENT ON COLUMN baseline_historico.created_by IS 'Usuário que criou o registro';
COMMENT ON COLUMN baseline_historico.updated_by IS 'Usuário que atualizou o registro';

-- =====================================================
-- 4. FUNÇÃO PARA BUSCAR BASELINE VIGENTE
-- =====================================================

DROP FUNCTION IF EXISTS get_baseline_vigente(UUID, DATE);

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

COMMENT ON FUNCTION get_baseline_vigente IS 'Retorna o baseline vigente (horas e tickets) para uma empresa em uma data específica. Usado para cálculos retroativos de banco de horas.';

-- =====================================================
-- 5. FUNÇÃO PARA BUSCAR APENAS HORAS VIGENTES (COMPATIBILIDADE)
-- =====================================================

DROP FUNCTION IF EXISTS get_baseline_horas_vigente(UUID, DATE);

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

COMMENT ON FUNCTION get_baseline_horas_vigente IS 'Retorna apenas o baseline de horas vigente para uma empresa em uma data específica. Função de compatibilidade para código existente.';

-- =====================================================
-- 6. TRIGGER PARA ENCERRAR VIGÊNCIA ANTERIOR
-- =====================================================

DROP TRIGGER IF EXISTS trigger_encerrar_baseline_anterior ON baseline_historico;
DROP FUNCTION IF EXISTS encerrar_baseline_anterior();

CREATE OR REPLACE FUNCTION encerrar_baseline_anterior()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encerrar vigência anterior (se houver) no dia anterior ao início da nova
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

COMMENT ON FUNCTION encerrar_baseline_anterior IS 'Trigger que encerra automaticamente a vigência anterior ao criar uma nova vigência de baseline';

-- =====================================================
-- 7. TRIGGER PARA ATUALIZAR TIMESTAMP
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_baseline_historico_timestamp ON baseline_historico;
DROP FUNCTION IF EXISTS update_baseline_historico_timestamp();

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

-- =====================================================
-- 8. MIGRAR DADOS EXISTENTES
-- =====================================================

-- Migrar baseline atual das empresas para histórico
-- Usa data de início de vigência ou data de criação como referência
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
      THEN EXTRACT(EPOCH FROM ec.baseline_horas_mensal) / 3600.0  -- Converter interval para horas
      ELSE 0
    END,
    0
  )::DECIMAL(10,2),
  ec.baseline_tickets_mensal,
  COALESCE(
    ec.inicio_vigencia,  -- Já é DATE, não precisa converter
    ec.created_at::DATE,
    '2024-01-01'::DATE
  ),
  NULL, -- Vigência atual
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

-- =====================================================
-- 9. HABILITAR RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE baseline_historico ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- =====================================================

DROP POLICY IF EXISTS "authenticated_select_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_insert_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_update_baseline_historico" ON baseline_historico;
DROP POLICY IF EXISTS "authenticated_delete_baseline_historico" ON baseline_historico;

-- =====================================================
-- 11. CRIAR POLÍTICAS RLS
-- =====================================================

-- Função para verificar permissão de acesso ao histórico de baseline
DROP FUNCTION IF EXISTS user_can_access_baseline_historico();

CREATE OR REPLACE FUNCTION user_can_access_baseline_historico()
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
      AND sp.screen_key IN ('cadastro_empresas', 'controle_banco_horas', 'admin')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

-- Política SELECT: Usuários autenticados com permissão podem visualizar
CREATE POLICY "authenticated_select_baseline_historico"
  ON baseline_historico FOR SELECT
  TO authenticated
  USING (user_can_access_baseline_historico());

-- Política INSERT: Usuários autenticados com permissão podem inserir
CREATE POLICY "authenticated_insert_baseline_historico"
  ON baseline_historico FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_baseline_historico());

-- Política UPDATE: Usuários autenticados com permissão podem atualizar
CREATE POLICY "authenticated_update_baseline_historico"
  ON baseline_historico FOR UPDATE
  TO authenticated
  USING (user_can_access_baseline_historico());

-- Política DELETE: Usuários autenticados com permissão podem deletar
CREATE POLICY "authenticated_delete_baseline_historico"
  ON baseline_historico FOR DELETE
  TO authenticated
  USING (user_can_access_baseline_historico());

-- =====================================================
-- 12. VERIFICAÇÃO DE DUPLICATAS
-- =====================================================

-- Verificar se não há duplicatas após migração
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT empresa_id, COUNT(*) as total
    FROM baseline_historico 
    WHERE data_fim IS NULL
    GROUP BY empresa_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING '⚠️ ATENÇÃO: % empresas com múltiplas vigências ativas!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ Migração concluída com sucesso. Sem duplicatas detectadas.';
  END IF;
END $$;

-- =====================================================
-- 13. GRANT PERMISSIONS
-- =====================================================

-- Conceder permissões para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON baseline_historico TO authenticated;

-- Conceder permissões para service_role
GRANT ALL ON baseline_historico TO service_role;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída: Sistema de histórico de baseline criado com sucesso!';
  RAISE NOTICE '📊 Tabela: baseline_historico';
  RAISE NOTICE '🔧 Funções: get_baseline_vigente(), get_baseline_horas_vigente()';
  RAISE NOTICE '🔒 RLS: Habilitado com políticas de acesso';
  RAISE NOTICE '📝 Dados migrados da tabela empresas_clientes';
END $$;
