-- =====================================================
-- MIGRAÇÃO: Adicionar comentario_cliente na tabela planos_acao
-- =====================================================
-- Descrição: Adiciona o campo comentario_cliente para armazenar
--            o comentário do cliente separadamente da ação corretiva
-- Data: 2025-12-10
-- =====================================================

-- Passo 1: Adicionar coluna comentario_cliente
ALTER TABLE planos_acao
ADD COLUMN IF NOT EXISTS comentario_cliente TEXT;

-- Passo 2: Comentário explicativo
COMMENT ON COLUMN planos_acao.comentario_cliente IS 'Comentário ou feedback do cliente sobre o problema (antigo descricao_acao_corretiva)';

-- Passo 3: Migrar dados existentes
-- Copiar o conteúdo atual de descricao_acao_corretiva para comentario_cliente
-- e limpar descricao_acao_corretiva para que possa ser preenchida com a nova ação
UPDATE planos_acao
SET comentario_cliente = descricao_acao_corretiva,
    descricao_acao_corretiva = ''
WHERE comentario_cliente IS NULL;

-- Passo 4: Preencher comentario_cliente com dados das pesquisas quando disponível
UPDATE planos_acao pa
SET comentario_cliente = COALESCE(ps.comentario_pesquisa, pa.comentario_cliente)
FROM pesquisas_satisfacao ps
WHERE pa.pesquisa_id = ps.id
  AND ps.comentario_pesquisa IS NOT NULL
  AND ps.comentario_pesquisa != '';

-- Passo 5: Verificar migração
DO $$
DECLARE
  total_planos INTEGER;
  planos_com_comentario INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_planos FROM planos_acao;
  SELECT COUNT(*) INTO planos_com_comentario FROM planos_acao WHERE comentario_cliente IS NOT NULL AND comentario_cliente != '';
  
  RAISE NOTICE '✅ Migração concluída:';
  RAISE NOTICE '   - Total de planos: %', total_planos;
  RAISE NOTICE '   - Planos com comentário do cliente: %', planos_com_comentario;
  RAISE NOTICE '   - Campo comentario_cliente adicionado com sucesso';
END $$;