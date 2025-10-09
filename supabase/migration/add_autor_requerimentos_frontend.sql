-- Migração alternativa: Autor preenchido pelo frontend
-- Esta versão não depende de auth.uid() e permite que o frontend controle o autor

-- Adicionar colunas para autor
ALTER TABLE requerimentos 
ADD COLUMN IF NOT EXISTS autor_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS autor_nome TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN requerimentos.autor_id IS 'ID do usuário que criou o requerimento';
COMMENT ON COLUMN requerimentos.autor_nome IS 'Nome do usuário que criou o requerimento (preenchido pelo frontend)';

-- Criar índice para otimizar consultas por autor
CREATE INDEX IF NOT EXISTS idx_requerimentos_autor_id ON requerimentos(autor_id);

-- Função simplificada que permite preenchimento manual
CREATE OR REPLACE FUNCTION preencher_autor_requerimento_frontend()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas preencher autor na criação (INSERT) se não foi fornecido
  IF TG_OP = 'INSERT' THEN
    -- Se o autor não foi fornecido pelo frontend, usar valor padrão
    IF NEW.autor_nome IS NULL OR NEW.autor_nome = '' THEN
      NEW.autor_nome := 'Sistema';
      RAISE NOTICE 'Autor não fornecido pelo frontend, usando "Sistema"';
    END IF;
    
    -- Log para debug
    RAISE NOTICE 'Requerimento criado - Autor: ID=%, Nome=%', NEW.autor_id, NEW.autor_nome;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_preencher_autor_requerimento ON requerimentos;

-- Criar novo trigger
CREATE TRIGGER trigger_preencher_autor_requerimento_frontend
  BEFORE INSERT ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION preencher_autor_requerimento_frontend();

-- Log da migração
DO $$
BEGIN
  RAISE NOTICE '✓ Migração de autor (versão frontend) executada com sucesso!';
  RAISE NOTICE 'O autor agora deve ser preenchido pelo frontend na criação de requerimentos.';
END $$;