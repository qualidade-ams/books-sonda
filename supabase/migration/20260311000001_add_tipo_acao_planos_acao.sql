-- =====================================================
-- MIGRAÇÃO: ADICIONAR TIPO DE AÇÃO AO PLANO DE AÇÃO
-- =====================================================
-- Adiciona campo tipo_acao para diferenciar entre:
-- - NC (Não Conformidade): Requer ação corretiva obrigatória
-- - OM (Oportunidade de Melhoria): Requer ação preventiva obrigatória
-- =====================================================

-- 1. Adicionar coluna tipo_acao
ALTER TABLE planos_acao 
ADD COLUMN IF NOT EXISTS tipo_acao VARCHAR(2) 
CHECK (tipo_acao IN ('NC', 'OM'));

-- 2. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_planos_acao_tipo_acao ON planos_acao(tipo_acao);

-- 3. Comentários explicativos
COMMENT ON COLUMN planos_acao.tipo_acao IS 'Tipo de ação: NC (Não Conformidade) ou OM (Oportunidade de Melhoria)';

-- 4. Atualizar registros existentes (opcional - definir como NC por padrão)
UPDATE planos_acao 
SET tipo_acao = 'NC' 
WHERE tipo_acao IS NULL;

-- 5. Verificação
SELECT 
  'planos_acao' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'planos_acao' 
  AND column_name = 'tipo_acao';

-- =====================================================
-- LOG DE EXECUÇÃO
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Campo tipo_acao adicionado à tabela planos_acao';
  RAISE NOTICE '✅ Índice criado para performance';
  RAISE NOTICE '✅ Comentários adicionados';
  RAISE NOTICE '📊 Migração concluída com sucesso!';
END $$;
