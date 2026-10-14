-- Migração para adicionar campos de valor/hora na tabela requerimentos
-- Data: 2025-01-15
-- Descrição: Adiciona campos para valor/hora funcional e técnico para tipos de cobrança específicos
-- 
-- Esta migração adiciona:
-- 1. Campos de valor por hora (funcional e técnico)
-- 2. Campos de valor total calculado automaticamente
-- 3. Trigger para cálculo automático dos valores
-- 4. Função para obter estatísticas de valores
-- 5. Índices para otimização de consultas
--
-- Tipos de cobrança afetados: Faturado, Hora Extra, Sobreaviso, Bolsão Enel

-- Adicionar colunas para valor/hora
ALTER TABLE requerimentos 
ADD COLUMN valor_hora_funcional DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN valor_hora_tecnico DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN valor_total_funcional DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN valor_total_tecnico DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN valor_total_geral DECIMAL(10,2) DEFAULT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN requerimentos.valor_hora_funcional IS 'Valor por hora funcional (para tipos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)';
COMMENT ON COLUMN requerimentos.valor_hora_tecnico IS 'Valor por hora técnico (para tipos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)';
COMMENT ON COLUMN requerimentos.valor_total_funcional IS 'Valor total funcional (horas_funcional * valor_hora_funcional)';
COMMENT ON COLUMN requerimentos.valor_total_tecnico IS 'Valor total técnico (horas_tecnico * valor_hora_tecnico)';
COMMENT ON COLUMN requerimentos.valor_total_geral IS 'Valor total geral (valor_total_funcional + valor_total_tecnico)';

-- Criar função para calcular valores totais automaticamente
CREATE OR REPLACE FUNCTION calcular_valores_requerimento()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se o tipo de cobrança requer cálculo de valores
  IF NEW.tipo_cobranca IN ('Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel') THEN
    -- Calcular valor total funcional
    IF NEW.valor_hora_funcional IS NOT NULL AND NEW.horas_funcional IS NOT NULL THEN
      NEW.valor_total_funcional := NEW.horas_funcional * NEW.valor_hora_funcional;
    ELSE
      NEW.valor_total_funcional := NULL;
    END IF;
    
    -- Calcular valor total técnico
    IF NEW.valor_hora_tecnico IS NOT NULL AND NEW.horas_tecnico IS NOT NULL THEN
      NEW.valor_total_tecnico := NEW.horas_tecnico * NEW.valor_hora_tecnico;
    ELSE
      NEW.valor_total_tecnico := NULL;
    END IF;
    
    -- Calcular valor total geral
    NEW.valor_total_geral := COALESCE(NEW.valor_total_funcional, 0) + COALESCE(NEW.valor_total_tecnico, 0);
    
    -- Se valor total geral for 0, definir como NULL
    IF NEW.valor_total_geral = 0 THEN
      NEW.valor_total_geral := NULL;
    END IF;
  ELSE
    -- Para outros tipos de cobrança, limpar os valores
    NEW.valor_hora_funcional := NULL;
    NEW.valor_hora_tecnico := NULL;
    NEW.valor_total_funcional := NULL;
    NEW.valor_total_tecnico := NULL;
    NEW.valor_total_geral := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para calcular valores automaticamente
DROP TRIGGER IF EXISTS trigger_calcular_valores_requerimento ON requerimentos;
CREATE TRIGGER trigger_calcular_valores_requerimento
  BEFORE INSERT OR UPDATE ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_valores_requerimento();

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_requerimentos_tipo_cobranca_valores 
ON requerimentos(tipo_cobranca) 
WHERE valor_total_geral IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_requerimentos_valor_total_geral 
ON requerimentos(valor_total_geral) 
WHERE valor_total_geral IS NOT NULL;

-- Função para obter estatísticas de valores por tipo de cobrança
CREATE OR REPLACE FUNCTION obter_estatisticas_valores_requerimentos(
  p_mes_cobranca INTEGER DEFAULT NULL,
  p_tipo_cobranca TEXT DEFAULT NULL
)
RETURNS TABLE(
  tipo_cobranca TEXT,
  quantidade_requerimentos BIGINT,
  total_horas_funcional BIGINT,
  total_horas_tecnico BIGINT,
  total_horas_geral BIGINT,
  valor_total_funcional DECIMAL(12,2),
  valor_total_tecnico DECIMAL(12,2),
  valor_total_geral DECIMAL(12,2),
  valor_medio_hora_funcional DECIMAL(10,2),
  valor_medio_hora_tecnico DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.tipo_cobranca::TEXT,
    COUNT(*)::BIGINT as quantidade_requerimentos,
    SUM(r.horas_funcional)::BIGINT as total_horas_funcional,
    SUM(r.horas_tecnico)::BIGINT as total_horas_tecnico,
    SUM(r.horas_total)::BIGINT as total_horas_geral,
    SUM(r.valor_total_funcional)::DECIMAL(12,2) as valor_total_funcional,
    SUM(r.valor_total_tecnico)::DECIMAL(12,2) as valor_total_tecnico,
    SUM(r.valor_total_geral)::DECIMAL(12,2) as valor_total_geral,
    AVG(r.valor_hora_funcional)::DECIMAL(10,2) as valor_medio_hora_funcional,
    AVG(r.valor_hora_tecnico)::DECIMAL(10,2) as valor_medio_hora_tecnico
  FROM requerimentos r
  WHERE 
    (p_mes_cobranca IS NULL OR r.mes_cobranca = p_mes_cobranca)
    AND (p_tipo_cobranca IS NULL OR r.tipo_cobranca = p_tipo_cobranca)
    AND r.tipo_cobranca IN ('Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel')
  GROUP BY r.tipo_cobranca
  ORDER BY r.tipo_cobranca;
END;
$$ LANGUAGE plpgsql;

-- Log da migração
DO $$
BEGIN
  -- Tentar inserir log na tabela permission_audit_logs se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
    INSERT INTO permission_audit_logs (
      action,
      details,
      created_at
    ) VALUES (
      'MIGRATION_VALOR_HORA_REQUERIMENTOS',
      jsonb_build_object(
        'tabela', 'requerimentos',
        'campos_adicionados', ARRAY['valor_hora_funcional', 'valor_hora_tecnico', 'valor_total_funcional', 'valor_total_tecnico', 'valor_total_geral'],
        'trigger_criado', 'trigger_calcular_valores_requerimento',
        'funcao_criada', 'calcular_valores_requerimento',
        'funcao_estatisticas', 'obter_estatisticas_valores_requerimentos',
        'tipos_cobranca_afetados', ARRAY['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'],
        'status', 'SUCCESS'
      ),
      NOW()
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Continuar sem log se houver erro
    RAISE NOTICE 'Aviso: Não foi possível registrar log da migração: %', SQLERRM;
END $$;

-- Verificar estrutura criada
DO $$
DECLARE
  campo_count INTEGER;
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Verificar colunas adicionadas
  SELECT COUNT(*) INTO campo_count
  FROM information_schema.columns 
  WHERE table_name = 'requerimentos' 
  AND column_name IN ('valor_hora_funcional', 'valor_hora_tecnico', 'valor_total_funcional', 'valor_total_tecnico', 'valor_total_geral');
  
  -- Verificar trigger criado
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_calcular_valores_requerimento';
  
  -- Verificar função criada
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_name = 'calcular_valores_requerimento';
  
  -- Exibir resultado da verificação
  RAISE NOTICE 'Migração concluída:';
  RAISE NOTICE '- Campos adicionados: % de 5', campo_count;
  RAISE NOTICE '- Triggers criados: % de 1', trigger_count;
  RAISE NOTICE '- Funções criadas: % de 2', function_count;
  
  IF campo_count = 5 AND trigger_count = 1 AND function_count >= 1 THEN
    RAISE NOTICE '✓ Migração executada com sucesso!';
  ELSE
    RAISE WARNING '⚠ Migração pode ter problemas. Verificar manualmente.';
  END IF;
END $$;