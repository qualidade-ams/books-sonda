-- =====================================================
-- MIGRATION: Adicionar campo "causa" na tabela planos_acao
-- =====================================================
-- Descrição: Adiciona campo obrigatório "causa" para descrever a causa do problema
--            quando a data de conclusão estiver preenchida
-- Data: 2026-03-02
-- =====================================================

-- PASSO 1: Adicionar coluna causa (TEXT, opcional inicialmente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'planos_acao' 
    AND column_name = 'causa'
  ) THEN
    ALTER TABLE planos_acao 
    ADD COLUMN causa TEXT;
    
    RAISE NOTICE '✅ Coluna "causa" adicionada com sucesso';
  ELSE
    RAISE NOTICE '⚠️ Coluna "causa" já existe';
  END IF;
END $$;

-- PASSO 2: Adicionar comentário explicativo
COMMENT ON COLUMN planos_acao.causa IS 'Descrição da causa raiz do problema identificado na pesquisa de satisfação. Campo obrigatório quando data_conclusao estiver preenchida.';

-- PASSO 3: Criar função de validação para garantir que causa seja preenchida quando data_conclusao existir
CREATE OR REPLACE FUNCTION public.validar_causa_plano_acao()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Se data_conclusao estiver preenchida, causa é obrigatória
  IF NEW.data_conclusao IS NOT NULL AND (NEW.causa IS NULL OR TRIM(NEW.causa) = '') THEN
    RAISE EXCEPTION 'Campo "causa" é obrigatório quando a data de conclusão está preenchida';
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validar_causa_plano_acao() IS 'Valida que o campo causa seja preenchido quando data_conclusao existir';

-- PASSO 4: Criar trigger para validação
DROP TRIGGER IF EXISTS trigger_validar_causa_plano_acao ON planos_acao;

CREATE TRIGGER trigger_validar_causa_plano_acao
  BEFORE INSERT OR UPDATE ON planos_acao
  FOR EACH ROW
  EXECUTE FUNCTION validar_causa_plano_acao();

COMMENT ON TRIGGER trigger_validar_causa_plano_acao ON planos_acao IS 'Trigger que valida o preenchimento do campo causa quando data_conclusao existir';

-- PASSO 5: Mensagem de sucesso
DO $$
BEGIN
  RAISE NOTICE '🎯 Migration concluída com sucesso!';
  RAISE NOTICE '   ✅ Campo "causa" adicionado';
  RAISE NOTICE '   ✅ Função de validação criada';
  RAISE NOTICE '   ✅ Trigger de validação configurado';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Regra de validação:';
  RAISE NOTICE '   - Campo "causa" é obrigatório quando "data_conclusao" estiver preenchida';
  RAISE NOTICE '   - Validação ocorre automaticamente via trigger';
END $$;
