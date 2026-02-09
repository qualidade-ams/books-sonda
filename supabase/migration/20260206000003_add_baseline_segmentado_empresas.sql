-- Migration: Adicionar campos para baseline segmentado nas empresas
-- Data: 2026-02-06
-- Descrição: Permite configurar segmentação de baseline por empresa com filtros por item_configuracao

-- Adicionar campos na tabela empresas_clientes
ALTER TABLE empresas_clientes 
ADD COLUMN IF NOT EXISTS baseline_segmentado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS segmentacao_config JSONB DEFAULT NULL;

-- Comentários explicativos
COMMENT ON COLUMN empresas_clientes.baseline_segmentado IS 'Define se a empresa possui baseline segmentado entre múltiplas empresas';
COMMENT ON COLUMN empresas_clientes.segmentacao_config IS 'Configuração JSON com empresas segmentadas, percentuais e filtros. Formato: {"empresas": [{"nome": "EMPRESA1", "percentual": 60, "filtro_tipo": "contem", "filtro_valor": "PALAVRA"}]}';

-- Criar índice para melhorar performance de queries com JSONB
CREATE INDEX IF NOT EXISTS idx_empresas_segmentacao_config ON empresas_clientes USING GIN (segmentacao_config);

-- Função de validação para garantir que percentuais somam 100%
CREATE OR REPLACE FUNCTION public.validar_segmentacao_baseline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_percentual DECIMAL(5,2);
  empresa_record JSONB;
BEGIN
  -- Se baseline_segmentado está ativo, validar configuração
  IF NEW.baseline_segmentado = TRUE THEN
    -- Verificar se segmentacao_config existe
    IF NEW.segmentacao_config IS NULL OR NEW.segmentacao_config->>'empresas' IS NULL THEN
      RAISE EXCEPTION 'Configuração de segmentação é obrigatória quando baseline_segmentado está ativo';
    END IF;

    -- Calcular soma dos percentuais
    total_percentual := 0;
    FOR empresa_record IN SELECT * FROM jsonb_array_elements(NEW.segmentacao_config->'empresas')
    LOOP
      total_percentual := total_percentual + (empresa_record->>'percentual')::DECIMAL(5,2);
    END LOOP;

    -- Validar se soma é 100%
    IF total_percentual != 100 THEN
      RAISE EXCEPTION 'A soma dos percentuais deve ser exatamente 100%%. Soma atual: %', total_percentual;
    END IF;

    -- Validar se há pelo menos 2 empresas
    IF jsonb_array_length(NEW.segmentacao_config->'empresas') < 2 THEN
      RAISE EXCEPTION 'É necessário configurar pelo menos 2 empresas para segmentação';
    END IF;

    -- Validar campos obrigatórios de cada empresa
    FOR empresa_record IN SELECT * FROM jsonb_array_elements(NEW.segmentacao_config->'empresas')
    LOOP
      IF empresa_record->>'nome' IS NULL OR empresa_record->>'nome' = '' THEN
        RAISE EXCEPTION 'Nome da empresa segmentada é obrigatório';
      END IF;
      
      IF empresa_record->>'percentual' IS NULL THEN
        RAISE EXCEPTION 'Percentual é obrigatório para cada empresa segmentada';
      END IF;
      
      IF empresa_record->>'filtro_tipo' IS NULL OR empresa_record->>'filtro_tipo' = '' THEN
        RAISE EXCEPTION 'Tipo de filtro é obrigatório para cada empresa segmentada';
      END IF;
      
      IF empresa_record->>'filtro_valor' IS NULL OR empresa_record->>'filtro_valor' = '' THEN
        RAISE EXCEPTION 'Valor do filtro é obrigatório para cada empresa segmentada';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para validação
DROP TRIGGER IF EXISTS trigger_validar_segmentacao_baseline ON empresas_clientes;
CREATE TRIGGER trigger_validar_segmentacao_baseline
  BEFORE INSERT OR UPDATE ON empresas_clientes
  FOR EACH ROW
  EXECUTE FUNCTION validar_segmentacao_baseline();

-- Exemplo de configuração válida (comentário para referência)
/*
Exemplo de JSON válido para segmentacao_config:

{
  "empresas": [
    {
      "nome": "NÍQUEL",
      "percentual": 60,
      "filtro_tipo": "contem",
      "filtro_valor": "NIQUEL",
      "ordem": 1
    },
    {
      "nome": "IOB",
      "percentual": 40,
      "filtro_tipo": "nao_contem",
      "filtro_valor": "NIQUEL",
      "ordem": 2
    }
  ]
}

Tipos de filtro suportados:
- "contem": item_configuracao ILIKE '%valor%'
- "nao_contem": item_configuracao NOT ILIKE '%valor%'
- "igual": item_configuracao = 'valor'
- "diferente": item_configuracao != 'valor'
- "comeca_com": item_configuracao ILIKE 'valor%'
- "termina_com": item_configuracao ILIKE '%valor'
*/

-- Verificar se migration foi aplicada com sucesso
DO $$
BEGIN
  RAISE NOTICE '✅ Migration aplicada com sucesso!';
  RAISE NOTICE '📋 Campos adicionados: baseline_segmentado, segmentacao_config';
  RAISE NOTICE '🔒 Trigger de validação criado: trigger_validar_segmentacao_baseline';
  RAISE NOTICE '📊 Índice GIN criado para performance de queries JSONB';
END $$;
