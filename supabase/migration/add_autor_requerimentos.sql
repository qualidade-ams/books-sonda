-- Migração para adicionar campo autor na tabela requerimentos
-- Data: 2025-01-15
-- Descrição: Adiciona campo para identificar o usuário que criou o requerimento
-- 
-- Esta migração adiciona:
-- 1. Campo autor_id referenciando auth.users
-- 2. Campo autor_nome para cache do nome do usuário
-- 3. Índice para otimização de consultas
-- 4. Trigger para preencher automaticamente o autor

-- Adicionar colunas para autor
ALTER TABLE requerimentos 
ADD COLUMN IF NOT EXISTS autor_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS autor_nome TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN requerimentos.autor_id IS 'ID do usuário que criou o requerimento';
COMMENT ON COLUMN requerimentos.autor_nome IS 'Nome do usuário que criou o requerimento (cache)';

-- Criar índice para otimizar consultas por autor
CREATE INDEX IF NOT EXISTS idx_requerimentos_autor_id ON requerimentos(autor_id);

-- Função para preencher autor automaticamente
CREATE OR REPLACE FUNCTION preencher_autor_requerimento()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  user_name TEXT;
BEGIN
  -- Apenas preencher autor na criação (INSERT)
  IF TG_OP = 'INSERT' THEN
    -- Tentar obter usuário atual
    current_user_id := auth.uid();
    
    -- Se não há usuário autenticado, tentar usar o usuário da sessão atual
    IF current_user_id IS NULL THEN
      -- Tentar obter de outras formas (session, etc.)
      SELECT auth.uid() INTO current_user_id;
    END IF;
    
    -- Se ainda não temos usuário, usar um padrão baseado no contexto
    IF current_user_id IS NULL THEN
      -- Para desenvolvimento/teste, usar um usuário padrão ou sistema
      NEW.autor_id := NULL;
      NEW.autor_nome := 'Sistema';
      RAISE NOTICE 'Usuário não autenticado, usando "Sistema" como autor';
    ELSE
      -- Usuário autenticado encontrado
      NEW.autor_id := current_user_id;
      
      -- Buscar nome do usuário na tabela profiles
      SELECT COALESCE(full_name, email) INTO user_name
      FROM profiles 
      WHERE id = current_user_id;
      
      -- Se não encontrar na profiles, buscar no auth.users
      IF user_name IS NULL OR user_name = '' THEN
        SELECT 
          COALESCE(
            raw_user_meta_data->>'full_name',
            raw_user_meta_data->>'name',
            email,
            'Usuário ' || LEFT(current_user_id::text, 8)
          ) INTO user_name
        FROM auth.users 
        WHERE id = current_user_id;
      END IF;
      
      -- Se ainda não temos nome, usar um padrão
      IF user_name IS NULL OR user_name = '' THEN
        user_name := 'Usuário ' || LEFT(current_user_id::text, 8);
      END IF;
      
      NEW.autor_nome := user_name;
      RAISE NOTICE 'Autor preenchido: ID=%, Nome=%', NEW.autor_id, NEW.autor_nome;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para preencher autor automaticamente
DROP TRIGGER IF EXISTS trigger_preencher_autor_requerimento ON requerimentos;
CREATE TRIGGER trigger_preencher_autor_requerimento
  BEFORE INSERT ON requerimentos
  FOR EACH ROW
  EXECUTE FUNCTION preencher_autor_requerimento();

-- Atualizar registros existentes com autor (se possível identificar)
-- Nota: Para registros existentes, não é possível identificar o autor original
-- Eles ficarão com autor_id e autor_nome NULL até serem editados

-- Log da migração
DO $$
BEGIN
  -- Tentar inserir log na tabela permission_audit_logs se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
    INSERT INTO permission_audit_logs (
      action,
      details,
      created_at
    ) VALUES (
      'MIGRATION_AUTOR_REQUERIMENTOS',
      jsonb_build_object(
        'tabela', 'requerimentos',
        'campos_adicionados', ARRAY['autor_id', 'autor_nome'],
        'trigger_criado', 'trigger_preencher_autor_requerimento',
        'funcao_criada', 'preencher_autor_requerimento',
        'indice_criado', 'idx_requerimentos_autor_id',
        'status', 'SUCCESS'
      ),
      NOW()
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Continuar sem log se houver erro
    RAISE NOTICE 'Aviso: Não foi possível registrar log da migração: %', SQLERRM;
END $$;

-- Verificar estrutura criada
DO $$
DECLARE
  campo_count INTEGER;
  trigger_count INTEGER;
  function_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Verificar colunas adicionadas
  SELECT COUNT(*) INTO campo_count
  FROM information_schema.columns 
  WHERE table_name = 'requerimentos' 
  AND column_name IN ('autor_id', 'autor_nome');
  
  -- Verificar trigger criado
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name = 'trigger_preencher_autor_requerimento';
  
  -- Verificar função criada
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_name = 'preencher_autor_requerimento';
  
  -- Verificar índice criado
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE tablename = 'requerimentos' 
  AND indexname = 'idx_requerimentos_autor_id';
  
  -- Exibir resultado da verificação
  RAISE NOTICE 'Migração de autor concluída:';
  RAISE NOTICE '- Campos adicionados: % de 2', campo_count;
  RAISE NOTICE '- Triggers criados: % de 1', trigger_count;
  RAISE NOTICE '- Funções criadas: % de 1', function_count;
  RAISE NOTICE '- Índices criados: % de 1', index_count;
  
  IF campo_count = 2 AND trigger_count = 1 AND function_count = 1 AND index_count = 1 THEN
    RAISE NOTICE '✓ Migração de autor executada com sucesso!';
  ELSE
    RAISE WARNING '⚠ Migração de autor pode ter problemas. Verificar manualmente.';
  END IF;
END $$;