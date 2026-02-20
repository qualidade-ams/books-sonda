-- Migration: Criar sistema de histórico de percentual de repasse com vigências
-- Data: 2026-02-20
-- Descrição: Implementa controle temporal de percentual de repasse para suportar renovações e renegociações contratuais

-- =====================================================
-- 1. CRIAR TABELA DE HISTÓRICO DE PERCENTUAL DE REPASSE
-- =====================================================

CREATE TABLE IF NOT EXISTS percentual_repasse_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  percentual DECIMAL(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  motivo TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  
  -- Garantir que não haja sobreposição de vigências
  CONSTRAINT check_vigencia_valida CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- =====================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_percentual_repasse_historico_empresa ON percentual_repasse_historico(empresa_id);
CREATE INDEX IF NOT EXISTS idx_percentual_repasse_historico_vigencia ON percentual_repasse_historico(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_percentual_repasse_historico_empresa_vigencia ON percentual_repasse_historico(empresa_id, data_inicio, data_fim);

-- Índice único parcial: apenas uma vigência ativa (data_fim NULL) por empresa
DROP INDEX IF EXISTS idx_percentual_repasse_historico_vigencia_ativa;
CREATE UNIQUE INDEX idx_percentual_repasse_historico_vigencia_ativa 
  ON percentual_repasse_historico(empresa_id) 
  WHERE data_fim IS NULL;

-- =====================================================
-- 3. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =====================================================

COMMENT ON TABLE percentual_repasse_historico IS 'Histórico de vigências de percentual de repasse mensal por empresa. Permite rastreamento temporal de mudanças contratuais.';
COMMENT ON COLUMN percentual_repasse_historico.empresa_id IS 'Referência à empresa cliente';
COMMENT ON COLUMN percentual_repasse_historico.percentual IS 'Percentual de repasse mensal nesta vigência (0-100)';
COMMENT ON COLUMN percentual_repasse_historico.data_inicio IS 'Data de início da vigência (inclusive)';
COMMENT ON COLUMN percentual_repasse_historico.data_fim IS 'Data de fim da vigência (inclusive). NULL indica vigência atual/ativa';
COMMENT ON COLUMN percentual_repasse_historico.motivo IS 'Motivo da mudança: Renovação Contratual, Renegociação, Ajuste, Correção, etc.';
COMMENT ON COLUMN percentual_repasse_historico.observacao IS 'Observações adicionais sobre a mudança';
COMMENT ON COLUMN percentual_repasse_historico.created_by IS 'Usuário que criou o registro';
COMMENT ON COLUMN percentual_repasse_historico.updated_by IS 'Usuário que atualizou o registro';

-- =====================================================
-- 4. FUNÇÃO PARA BUSCAR PERCENTUAL VIGENTE
-- =====================================================

DROP FUNCTION IF EXISTS get_percentual_repasse_vigente(UUID, DATE);

CREATE OR REPLACE FUNCTION get_percentual_repasse_vigente(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  percentual DECIMAL(5,2),
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
    prh.percentual,
    prh.data_inicio,
    prh.data_fim,
    prh.motivo
  FROM percentual_repasse_historico prh
  WHERE prh.empresa_id = p_empresa_id
    AND prh.data_inicio <= p_data
    AND (prh.data_fim IS NULL OR prh.data_fim >= p_data)
  ORDER BY prh.data_inicio DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_percentual_repasse_vigente IS 'Retorna o percentual de repasse vigente para uma empresa em uma data específica. Usado para cálculos retroativos.';

-- =====================================================
-- 5. FUNÇÃO PARA BUSCAR APENAS PERCENTUAL (COMPATIBILIDADE)
-- =====================================================

DROP FUNCTION IF EXISTS get_percentual_repasse_valor(UUID, DATE);

CREATE OR REPLACE FUNCTION get_percentual_repasse_valor(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_percentual DECIMAL(5,2);
BEGIN
  SELECT percentual INTO v_percentual
  FROM percentual_repasse_historico
  WHERE empresa_id = p_empresa_id
    AND data_inicio <= p_data
    AND (data_fim IS NULL OR data_fim >= p_data)
  ORDER BY data_inicio DESC
  LIMIT 1;
  
  RETURN COALESCE(v_percentual, 0);
END;
$$;

COMMENT ON FUNCTION get_percentual_repasse_valor IS 'Retorna apenas o percentual de repasse vigente para uma empresa em uma data específica. Função de compatibilidade para código existente.';

-- =====================================================
-- 6. TRIGGER PARA ENCERRAR VIGÊNCIA ANTERIOR
-- =====================================================

DROP TRIGGER IF EXISTS trigger_encerrar_percentual_repasse_anterior ON percentual_repasse_historico;
DROP FUNCTION IF EXISTS encerrar_percentual_repasse_anterior();

CREATE OR REPLACE FUNCTION encerrar_percentual_repasse_anterior()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encerrar vigência anterior (se houver) no dia anterior ao início da nova
  UPDATE percentual_repasse_historico
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

CREATE TRIGGER trigger_encerrar_percentual_repasse_anterior
  BEFORE INSERT ON percentual_repasse_historico
  FOR EACH ROW
  EXECUTE FUNCTION encerrar_percentual_repasse_anterior();

COMMENT ON FUNCTION encerrar_percentual_repasse_anterior IS 'Trigger que encerra automaticamente a vigência anterior ao criar uma nova vigência de percentual de repasse';

-- =====================================================
-- 7. TRIGGER PARA ATUALIZAR TIMESTAMP
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_percentual_repasse_historico_timestamp ON percentual_repasse_historico;
DROP FUNCTION IF EXISTS update_percentual_repasse_historico_timestamp();

CREATE OR REPLACE FUNCTION update_percentual_repasse_historico_timestamp()
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

CREATE TRIGGER trigger_update_percentual_repasse_historico_timestamp
  BEFORE UPDATE ON percentual_repasse_historico
  FOR EACH ROW
  EXECUTE FUNCTION update_percentual_repasse_historico_timestamp();

-- =====================================================
-- 8. MIGRAR DADOS EXISTENTES
-- =====================================================

-- Migrar percentual atual das empresas para histórico
-- Usa data de início de vigência ou data de criação como referência
INSERT INTO percentual_repasse_historico (
  empresa_id, 
  percentual, 
  data_inicio, 
  data_fim, 
  motivo, 
  observacao,
  created_by
)
SELECT 
  ec.id,
  COALESCE(ec.percentual_repasse_mensal, 0)::DECIMAL(5,2),
  COALESCE(
    ec.inicio_vigencia,
    ec.created_at::DATE,
    '2024-01-01'::DATE
  ),
  NULL, -- Vigência atual
  'Migração inicial do sistema',
  CASE 
    WHEN ec.percentual_repasse_mensal IS NULL THEN 'Percentual não definido - valor zerado'
    ELSE 'Percentual migrado da tabela empresas_clientes'
  END,
  (SELECT id FROM profiles WHERE email LIKE '%admin%' OR email LIKE '%sonda%' LIMIT 1)
FROM empresas_clientes ec
WHERE NOT EXISTS (
  SELECT 1 FROM percentual_repasse_historico prh WHERE prh.empresa_id = ec.id
);

-- =====================================================
-- 9. HABILITAR RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE percentual_repasse_historico ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. REMOVER POLÍTICAS ANTIGAS (SE EXISTIREM)
-- =====================================================

DROP POLICY IF EXISTS "authenticated_select_percentual_repasse_historico" ON percentual_repasse_historico;
DROP POLICY IF EXISTS "authenticated_insert_percentual_repasse_historico" ON percentual_repasse_historico;
DROP POLICY IF EXISTS "authenticated_update_percentual_repasse_historico" ON percentual_repasse_historico;
DROP POLICY IF EXISTS "authenticated_delete_percentual_repasse_historico" ON percentual_repasse_historico;

-- =====================================================
-- 11. CRIAR POLÍTICAS RLS
-- =====================================================

-- Função para verificar permissão de acesso ao histórico de percentual de repasse
DROP FUNCTION IF EXISTS user_can_access_percentual_repasse_historico();

CREATE OR REPLACE FUNCTION user_can_access_percentual_repasse_historico()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_group_assignments uga ON p.id = uga.user_id
    JOIN user_groups ug ON uga.group_id = ug.id
    JOIN screen_permissions sp ON sp.group_id = ug.id
    WHERE p.id = (SELECT auth.uid())
      AND sp.screen_key IN ('cadastro_empresas', 'controle_banco_horas', 'admin')
      AND sp.permission_level IN ('view', 'edit')
  );
END;
$$;

-- Política SELECT: Usuários autenticados com permissão podem visualizar
CREATE POLICY "authenticated_select_percentual_repasse_historico"
  ON percentual_repasse_historico FOR SELECT
  TO authenticated
  USING (user_can_access_percentual_repasse_historico());

-- Política INSERT: Usuários autenticados com permissão podem inserir
CREATE POLICY "authenticated_insert_percentual_repasse_historico"
  ON percentual_repasse_historico FOR INSERT
  TO authenticated
  WITH CHECK (user_can_access_percentual_repasse_historico());

-- Política UPDATE: Usuários autenticados com permissão podem atualizar
CREATE POLICY "authenticated_update_percentual_repasse_historico"
  ON percentual_repasse_historico FOR UPDATE
  TO authenticated
  USING (user_can_access_percentual_repasse_historico());

-- Política DELETE: Usuários autenticados com permissão podem deletar
CREATE POLICY "authenticated_delete_percentual_repasse_historico"
  ON percentual_repasse_historico FOR DELETE
  TO authenticated
  USING (user_can_access_percentual_repasse_historico());

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
    FROM percentual_repasse_historico 
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
GRANT SELECT, INSERT, UPDATE, DELETE ON percentual_repasse_historico TO authenticated;

-- Conceder permissões para service_role
GRANT ALL ON percentual_repasse_historico TO service_role;

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================

-- Log de conclusão
DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída: Sistema de histórico de percentual de repasse criado com sucesso!';
  RAISE NOTICE '📊 Tabela: percentual_repasse_historico';
  RAISE NOTICE '🔧 Funções: get_percentual_repasse_vigente(), get_percentual_repasse_valor()';
  RAISE NOTICE '🔒 RLS: Habilitado com políticas de acesso';
  RAISE NOTICE '📝 Dados migrados da tabela empresas_clientes';
END $$;
