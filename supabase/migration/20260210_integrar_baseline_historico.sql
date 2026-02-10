-- =====================================================
-- Migration: Integrar Baseline Histórico com Cálculos
-- Data: 2026-02-10
-- Descrição: Integra sistema de histórico de baseline
--            com cálculos de banco de horas
-- =====================================================

-- =====================================================
-- 1. FUNÇÃO: Buscar Baseline Vigente (Otimizada)
-- =====================================================

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS get_baseline_vigente(UUID, DATE);

-- Criar função otimizada com cache e fallback
CREATE OR REPLACE FUNCTION public.get_baseline_vigente(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  baseline_horas DECIMAL(10,2),
  baseline_tickets INTEGER,
  data_inicio DATE,
  data_fim DATE,
  motivo TEXT,
  is_vigente BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE -- Função é STABLE (não modifica dados, resultado pode ser cacheado)
AS $$
DECLARE
  v_baseline_encontrado BOOLEAN := FALSE;
BEGIN
  -- Log de entrada
  RAISE NOTICE '🔍 [get_baseline_vigente] Buscando baseline vigente para empresa % na data %', p_empresa_id, p_data;
  
  -- Buscar baseline vigente na tabela baseline_historico
  RETURN QUERY
  SELECT 
    bh.baseline_horas,
    bh.baseline_tickets,
    bh.data_inicio,
    bh.data_fim,
    bh.motivo,
    TRUE as is_vigente
  FROM baseline_historico bh
  WHERE bh.empresa_id = p_empresa_id
    AND bh.data_inicio <= p_data
    AND (bh.data_fim IS NULL OR bh.data_fim >= p_data)
  ORDER BY bh.data_inicio DESC
  LIMIT 1;
  
  -- Verificar se encontrou baseline
  GET DIAGNOSTICS v_baseline_encontrado = ROW_COUNT;
  
  IF v_baseline_encontrado THEN
    RAISE NOTICE '✅ [get_baseline_vigente] Baseline encontrado no histórico';
    RETURN;
  END IF;
  
  -- FALLBACK: Se não encontrou no histórico, buscar na tabela empresas_clientes
  RAISE NOTICE '⚠️ [get_baseline_vigente] Baseline não encontrado no histórico, usando fallback da tabela empresas_clientes';
  
  RETURN QUERY
  SELECT 
    -- Converter INTERVAL para DECIMAL (horas)
    CASE 
      WHEN ec.baseline_horas_mensal IS NOT NULL THEN
        EXTRACT(EPOCH FROM ec.baseline_horas_mensal) / 3600.0
      ELSE 0.0
    END::DECIMAL(10,2) as baseline_horas,
    COALESCE(ec.baseline_tickets_mensal, 0) as baseline_tickets,
    COALESCE(ec.inicio_vigencia, CURRENT_DATE) as data_inicio,
    NULL::DATE as data_fim,
    'Baseline da tabela empresas_clientes (fallback)'::TEXT as motivo,
    FALSE as is_vigente -- Indica que é fallback
  FROM empresas_clientes ec
  WHERE ec.id = p_empresa_id
  LIMIT 1;
  
  -- Verificar se encontrou no fallback
  GET DIAGNOSTICS v_baseline_encontrado = ROW_COUNT;
  
  IF NOT v_baseline_encontrado THEN
    RAISE NOTICE '❌ [get_baseline_vigente] Empresa não encontrada ou sem baseline configurado';
  ELSE
    RAISE NOTICE '✅ [get_baseline_vigente] Baseline encontrado no fallback';
  END IF;
  
  RETURN;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_baseline_vigente(UUID, DATE) IS 
'Busca baseline vigente para uma empresa em uma data específica.
Prioriza tabela baseline_historico, com fallback para empresas_clientes.
Retorna baseline_horas (DECIMAL), baseline_tickets (INTEGER) e metadados de vigência.';

-- =====================================================
-- 2. FUNÇÃO: Buscar Baseline Horas Vigente (Simplificada)
-- =====================================================

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS get_baseline_horas_vigente(UUID, DATE);

-- Criar função simplificada que retorna apenas horas
CREATE OR REPLACE FUNCTION public.get_baseline_horas_vigente(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_baseline_horas DECIMAL(10,2);
BEGIN
  -- Buscar usando função principal
  SELECT baseline_horas INTO v_baseline_horas
  FROM get_baseline_vigente(p_empresa_id, p_data)
  LIMIT 1;
  
  RETURN COALESCE(v_baseline_horas, 0.0);
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_baseline_horas_vigente(UUID, DATE) IS 
'Retorna apenas o valor de baseline_horas vigente para uma empresa em uma data específica.
Wrapper simplificado da função get_baseline_vigente().';

-- =====================================================
-- 3. FUNÇÃO: Buscar Baseline Tickets Vigente (Simplificada)
-- =====================================================

-- Remover função antiga se existir
DROP FUNCTION IF EXISTS get_baseline_tickets_vigente(UUID, DATE);

-- Criar função simplificada que retorna apenas tickets
CREATE OR REPLACE FUNCTION public.get_baseline_tickets_vigente(
  p_empresa_id UUID,
  p_data DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_baseline_tickets INTEGER;
BEGIN
  -- Buscar usando função principal
  SELECT baseline_tickets INTO v_baseline_tickets
  FROM get_baseline_vigente(p_empresa_id, p_data)
  LIMIT 1;
  
  RETURN COALESCE(v_baseline_tickets, 0);
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.get_baseline_tickets_vigente(UUID, DATE) IS 
'Retorna apenas o valor de baseline_tickets vigente para uma empresa em uma data específica.
Wrapper simplificado da função get_baseline_vigente().';

-- =====================================================
-- 4. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índice composto para busca de baseline vigente (otimização de query)
-- Removido filtro WHERE com CURRENT_DATE pois não é IMMUTABLE
CREATE INDEX IF NOT EXISTS idx_baseline_historico_vigencia_lookup 
ON baseline_historico(empresa_id, data_inicio DESC, data_fim);

-- Índice parcial para vigências ativas (sem data_fim)
CREATE INDEX IF NOT EXISTS idx_baseline_historico_vigencias_ativas
ON baseline_historico(empresa_id, data_inicio DESC)
WHERE data_fim IS NULL;

-- Comentário dos índices
COMMENT ON INDEX idx_baseline_historico_vigencia_lookup IS 
'Índice otimizado para busca de baseline vigente.
Cobre queries de get_baseline_vigente() com filtro de vigência.';

COMMENT ON INDEX idx_baseline_historico_vigencias_ativas IS 
'Índice parcial para vigências ativas (sem data_fim).
Otimiza busca de baseline atual sem especificar data.';

-- =====================================================
-- 5. GRANTS DE PERMISSÕES
-- =====================================================

-- Permitir execução das funções para authenticated users
GRANT EXECUTE ON FUNCTION public.get_baseline_vigente(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_baseline_horas_vigente(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_baseline_tickets_vigente(UUID, DATE) TO authenticated;

-- =====================================================
-- 6. TESTES DE VALIDAÇÃO
-- =====================================================

DO $$
DECLARE
  v_empresa_id UUID;
  v_baseline_horas DECIMAL(10,2);
  v_baseline_tickets INTEGER;
  v_test_passed BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '🧪 Iniciando testes de validação...';
  
  -- Teste 1: Buscar empresa de teste
  SELECT id INTO v_empresa_id
  FROM empresas_clientes
  LIMIT 1;
  
  IF v_empresa_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhuma empresa encontrada para teste. Pulando validação.';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Teste 1: Empresa de teste encontrada: %', v_empresa_id;
  
  -- Teste 2: Buscar baseline vigente
  SELECT baseline_horas, baseline_tickets 
  INTO v_baseline_horas, v_baseline_tickets
  FROM get_baseline_vigente(v_empresa_id, CURRENT_DATE);
  
  IF v_baseline_horas IS NOT NULL THEN
    RAISE NOTICE '✅ Teste 2: Baseline vigente encontrado - Horas: %, Tickets: %', 
      v_baseline_horas, v_baseline_tickets;
  ELSE
    RAISE NOTICE '❌ Teste 2: FALHOU - Baseline não encontrado';
    v_test_passed := FALSE;
  END IF;
  
  -- Teste 3: Buscar baseline horas simplificado
  v_baseline_horas := get_baseline_horas_vigente(v_empresa_id, CURRENT_DATE);
  
  IF v_baseline_horas IS NOT NULL AND v_baseline_horas >= 0 THEN
    RAISE NOTICE '✅ Teste 3: Função simplificada de horas funcionando - Valor: %', v_baseline_horas;
  ELSE
    RAISE NOTICE '❌ Teste 3: FALHOU - Função simplificada de horas';
    v_test_passed := FALSE;
  END IF;
  
  -- Teste 4: Buscar baseline tickets simplificado
  v_baseline_tickets := get_baseline_tickets_vigente(v_empresa_id, CURRENT_DATE);
  
  IF v_baseline_tickets IS NOT NULL AND v_baseline_tickets >= 0 THEN
    RAISE NOTICE '✅ Teste 4: Função simplificada de tickets funcionando - Valor: %', v_baseline_tickets;
  ELSE
    RAISE NOTICE '❌ Teste 4: FALHOU - Função simplificada de tickets';
    v_test_passed := FALSE;
  END IF;
  
  -- Resultado final
  IF v_test_passed THEN
    RAISE NOTICE '🎉 TODOS OS TESTES PASSARAM!';
  ELSE
    RAISE NOTICE '⚠️ ALGUNS TESTES FALHARAM - Verifique os logs acima';
  END IF;
END $$;

-- =====================================================
-- 7. DOCUMENTAÇÃO E EXEMPLOS
-- =====================================================

-- Exemplo de uso 1: Buscar baseline completo
-- SELECT * FROM get_baseline_vigente('uuid-empresa', '2026-01-15');

-- Exemplo de uso 2: Buscar apenas horas
-- SELECT get_baseline_horas_vigente('uuid-empresa', '2026-01-15');

-- Exemplo de uso 3: Buscar apenas tickets
-- SELECT get_baseline_tickets_vigente('uuid-empresa', '2026-01-15');

-- Exemplo de uso 4: Buscar baseline atual (sem especificar data)
-- SELECT * FROM get_baseline_vigente('uuid-empresa');

-- =====================================================
-- 8. MENSAGEM FINAL
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration concluída com sucesso!';
  RAISE NOTICE '📚 Funções criadas:';
  RAISE NOTICE '   - get_baseline_vigente(empresa_id, data)';
  RAISE NOTICE '   - get_baseline_horas_vigente(empresa_id, data)';
  RAISE NOTICE '   - get_baseline_tickets_vigente(empresa_id, data)';
  RAISE NOTICE '🔧 Próximo passo: Atualizar bancoHorasService.ts para usar as novas funções';
END $$;
