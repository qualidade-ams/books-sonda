-- =====================================================
-- MIGRAÇÃO: Adicionar status 'enviado' para elogios
-- =====================================================
-- Descrição: Atualiza constraint de status da tabela elogios
--            para incluir o status 'enviado' usado quando
--            elogios são enviados por email
-- Data: 2025-12-16
-- =====================================================

-- Passo 1: Remover constraint existente
ALTER TABLE elogios DROP CONSTRAINT IF EXISTS elogios_status_check;

-- Passo 2: Adicionar nova constraint com status 'enviado'
ALTER TABLE elogios ADD CONSTRAINT elogios_status_check 
  CHECK (status IN ('registrado', 'compartilhado', 'arquivado', 'enviado'));

-- Passo 3: Atualizar comentário da coluna
COMMENT ON COLUMN elogios.status IS 'Status do elogio: registrado, compartilhado, arquivado, enviado';

-- Passo 4: Atualizar constraint do histórico para incluir 'envio'
ALTER TABLE elogios_historico DROP CONSTRAINT IF EXISTS elogios_historico_tipo_atualizacao_check;

ALTER TABLE elogios_historico ADD CONSTRAINT elogios_historico_tipo_atualizacao_check
  CHECK (tipo_atualizacao IN ('criacao', 'atualizacao', 'compartilhamento', 'arquivamento', 'envio'));

-- Passo 5: Atualizar comentário do tipo de atualização
COMMENT ON COLUMN elogios_historico.tipo_atualizacao IS 'Tipo de atualização: criacao, atualizacao, compartilhamento, arquivamento, envio';

-- Passo 6: Verificação
DO $$
BEGIN
  -- Verificar se a constraint foi criada corretamente
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'elogios_status_check' 
    AND check_clause LIKE '%enviado%'
  ) THEN
    RAISE NOTICE '✅ Constraint de status atualizada com sucesso!';
    RAISE NOTICE '📋 Status permitidos: registrado, compartilhado, arquivado, enviado';
  ELSE
    RAISE NOTICE '❌ Erro ao atualizar constraint de status';
  END IF;
  
  -- Verificar constraint do histórico
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'elogios_historico_tipo_atualizacao_check' 
    AND check_clause LIKE '%envio%'
  ) THEN
    RAISE NOTICE '✅ Constraint de tipo de atualização atualizada com sucesso!';
  ELSE
    RAISE NOTICE '❌ Erro ao atualizar constraint de tipo de atualização';
  END IF;
END $$;