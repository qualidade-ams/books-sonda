-- =====================================================
-- MIGRAÇÃO: Adicionar data_resposta na tabela planos_acao
-- =====================================================
-- Descrição: Adiciona o campo data_resposta na tabela planos_acao
--            para facilitar filtros por mês/ano sem necessidade de JOIN
-- Data: 2025-11-27
-- =====================================================

-- Passo 1: Adicionar coluna data_resposta
ALTER TABLE planos_acao
ADD COLUMN IF NOT EXISTS data_resposta DATE;

-- Passo 2: Comentário explicativo
COMMENT ON COLUMN planos_acao.data_resposta IS 'Data de resposta da pesquisa relacionada (copiada para facilitar filtros)';

-- Passo 3: Preencher data_resposta com dados existentes das pesquisas
UPDATE planos_acao pa
SET data_resposta = ps.data_resposta
FROM pesquisas_satisfacao ps
WHERE pa.pesquisa_id = ps.id
  AND pa.data_resposta IS NULL
  AND ps.data_resposta IS NOT NULL;

-- Passo 4: Criar índice para otimizar consultas por data
CREATE INDEX IF NOT EXISTS idx_planos_acao_data_resposta 
ON planos_acao(data_resposta);

-- Passo 5: Criar índice composto para filtros por mês/ano
CREATE INDEX IF NOT EXISTS idx_planos_acao_data_resposta_status 
ON planos_acao(data_resposta, status_plano);

-- Passo 6: Criar função para atualizar data_resposta automaticamente
CREATE OR REPLACE FUNCTION atualizar_data_resposta_plano_acao()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar data_resposta da pesquisa relacionada
  SELECT data_resposta INTO NEW.data_resposta
  FROM pesquisas_satisfacao
  WHERE id = NEW.pesquisa_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Passo 7: Criar trigger para preencher data_resposta automaticamente
DROP TRIGGER IF EXISTS trigger_atualizar_data_resposta_plano_acao ON planos_acao;

CREATE TRIGGER trigger_atualizar_data_resposta_plano_acao
  BEFORE INSERT OR UPDATE OF pesquisa_id ON planos_acao
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_data_resposta_plano_acao();

-- Passo 8: Verificação final
DO $$
DECLARE
  total_planos INTEGER;
  planos_com_data INTEGER;
  planos_sem_data INTEGER;
BEGIN
  -- Contar totais
  SELECT COUNT(*) INTO total_planos FROM planos_acao;
  SELECT COUNT(*) INTO planos_com_data FROM planos_acao WHERE data_resposta IS NOT NULL;
  SELECT COUNT(*) INTO planos_sem_data FROM planos_acao WHERE data_resposta IS NULL;
  
  -- Exibir resultados
  RAISE NOTICE '✅ Migração concluída com sucesso!';
  RAISE NOTICE '📊 Total de planos de ação: %', total_planos;
  RAISE NOTICE '✅ Planos com data_resposta: %', planos_com_data;
  RAISE NOTICE '⚠️  Planos sem data_resposta: %', planos_sem_data;
  
  IF planos_sem_data > 0 THEN
    RAISE NOTICE '💡 Planos sem data_resposta podem estar vinculados a pesquisas sem data ou pesquisas inexistentes';
  END IF;
END $$;
