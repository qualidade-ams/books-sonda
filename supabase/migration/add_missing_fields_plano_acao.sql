-- =====================================================
-- MIGRAÇÃO: Adicionar campos faltantes na tabela planos_acao
-- =====================================================
-- Descrição: Adiciona campos que estão sendo usados no código
--            mas não existem na tabela do banco de dados
-- Data: 2025-12-10
-- =====================================================

-- Passo 1: Adicionar campo chamado (se não existir)
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS chamado TEXT;

-- Passo 2: Adicionar campo comentario_cliente (se não existir)
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS comentario_cliente TEXT;

-- Passo 3: Adicionar campo empresa_id (se não existir)
ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS empresa_id UUID;

-- Passo 4: Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'planos_acao' 
AND column_name IN ('chamado', 'comentario_cliente', 'empresa_id')
ORDER BY column_name;

-- Passo 5: Comentários explicativos
COMMENT ON COLUMN planos_acao.chamado IS 'Número do chamado relacionado ao plano de ação';
COMMENT ON COLUMN planos_acao.comentario_cliente IS 'Comentário ou feedback do cliente sobre o problema';
COMMENT ON COLUMN planos_acao.empresa_id IS 'ID da empresa relacionada ao plano de ação';

-- Passo 6: Verificação final
DO $$
DECLARE
  campos_adicionados INTEGER;
BEGIN
  SELECT COUNT(*) INTO campos_adicionados 
  FROM information_schema.columns 
  WHERE table_name = 'planos_acao' 
  AND column_name IN ('chamado', 'comentario_cliente', 'empresa_id');
  
  RAISE NOTICE '✅ Migração concluída:';
  RAISE NOTICE '   - Campos adicionados/verificados: %', campos_adicionados;
  RAISE NOTICE '   - Tabela planos_acao atualizada com sucesso';
END $$;