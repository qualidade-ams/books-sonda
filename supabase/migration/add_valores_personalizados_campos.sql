-- =====================================================
-- MIGRAÇÃO: ADICIONAR CAMPOS PARA VALORES PERSONALIZADOS
-- =====================================================
-- Adiciona campos para armazenar valores personalizados na tabela valores_taxas_funcoes
-- Permite que taxas personalizadas tenham valores específicos para cada período
-- Suporta tanto valores remotos quanto locais personalizados

-- Adicionar campos para valores personalizados
ALTER TABLE valores_taxas_funcoes 
ADD COLUMN IF NOT EXISTS valor_17h30_19h30 DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS valor_apos_19h30 DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS valor_fim_semana DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS valor_adicional DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS valor_standby DECIMAL(10, 2);

-- Comentários explicativos
COMMENT ON COLUMN valores_taxas_funcoes.valor_17h30_19h30 IS 'Valor personalizado para Seg-Sex 17h30-19h30 (para taxas personalizadas - remota e local)';
COMMENT ON COLUMN valores_taxas_funcoes.valor_apos_19h30 IS 'Valor personalizado para Seg-Sex após 19h30 (para taxas personalizadas - remota e local)';
COMMENT ON COLUMN valores_taxas_funcoes.valor_fim_semana IS 'Valor personalizado para Sáb/Dom/Feriados (para taxas personalizadas - remota e local)';
COMMENT ON COLUMN valores_taxas_funcoes.valor_adicional IS 'Valor personalizado para Hora Adicional (apenas para taxas personalizadas remotas)';
COMMENT ON COLUMN valores_taxas_funcoes.valor_standby IS 'Valor personalizado para Stand By (apenas para taxas personalizadas remotas)';

-- Verificar se as colunas foram criadas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'valores_taxas_funcoes' 
    AND column_name = 'valor_17h30_19h30'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'valores_taxas_funcoes' 
    AND column_name = 'valor_apos_19h30'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'valores_taxas_funcoes' 
    AND column_name = 'valor_fim_semana'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'valores_taxas_funcoes' 
    AND column_name = 'valor_adicional'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'valores_taxas_funcoes' 
    AND column_name = 'valor_standby'
  ) THEN
    RAISE NOTICE '✓ Todos os campos para valores personalizados foram adicionados à tabela valores_taxas_funcoes';
    RAISE NOTICE '  - valor_17h30_19h30: Para valores Seg-Sex 17h30-19h30 (remota e local)';
    RAISE NOTICE '  - valor_apos_19h30: Para valores Seg-Sex após 19h30 (remota e local)';
    RAISE NOTICE '  - valor_fim_semana: Para valores Sáb/Dom/Feriados (remota e local)';
    RAISE NOTICE '  - valor_adicional: Para valores Hora Adicional (apenas remota)';
    RAISE NOTICE '  - valor_standby: Para valores Stand By (apenas remota)';
  ELSE
    RAISE WARNING '⚠ Falha ao adicionar alguns campos para valores personalizados';
  END IF;
END $$;