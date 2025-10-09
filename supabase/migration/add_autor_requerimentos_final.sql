-- Migração final para adicionar campo autor na tabela requerimentos
-- Versão simplificada que funciona com preenchimento pelo frontend

-- Adicionar colunas para autor
ALTER TABLE requerimentos 
ADD COLUMN IF NOT EXISTS autor_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS autor_nome TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN requerimentos.autor_id IS 'ID do usuário que criou o requerimento';
COMMENT ON COLUMN requerimentos.autor_nome IS 'Nome do usuário que criou o requerimento';

-- Criar índice para otimizar consultas por autor
CREATE INDEX IF NOT EXISTS idx_requerimentos_autor_id ON requerimentos(autor_id);

-- Remover triggers antigos se existirem
DROP TRIGGER IF EXISTS trigger_preencher_autor_requerimento ON requerimentos;
DROP TRIGGER IF EXISTS trigger_preencher_autor_requerimento_frontend ON requerimentos;

-- Remover funções antigas se existirem
DROP FUNCTION IF EXISTS preencher_autor_requerimento();
DROP FUNCTION IF EXISTS preencher_autor_requerimento_frontend();

-- Log da migração
DO $$
BEGIN
  -- Verificar se as colunas foram criadas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name = 'autor_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'requerimentos' 
    AND column_name = 'autor_nome'
  ) THEN
    RAISE NOTICE '✓ Migração de autor executada com sucesso!';
    RAISE NOTICE 'Colunas autor_id e autor_nome adicionadas à tabela requerimentos.';
    RAISE NOTICE 'O preenchimento do autor será feito pelo frontend automaticamente.';
  ELSE
    RAISE WARNING '⚠ Problema na migração. Verificar se as colunas foram criadas.';
  END IF;
  
  -- Tentar inserir log na tabela permission_audit_logs se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
    INSERT INTO permission_audit_logs (
      action,
      details,
      created_at
    ) VALUES (
      'MIGRATION_AUTOR_REQUERIMENTOS_FINAL',
      jsonb_build_object(
        'tabela', 'requerimentos',
        'campos_adicionados', ARRAY['autor_id', 'autor_nome'],
        'indice_criado', 'idx_requerimentos_autor_id',
        'preenchimento', 'frontend',
        'status', 'SUCCESS'
      ),
      NOW()
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Aviso: Não foi possível registrar log da migração: %', SQLERRM;
END $$;