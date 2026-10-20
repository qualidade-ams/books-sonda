-- Migração para renomear CE Plus para Comex
-- Data: 2024-01-01
-- Descrição: Altera todas as referências de CE_PLUS para COMEX no sistema

-- IMPORTANTE: Execute primeiro o script verificar_dados_ce_plus.sql para ver o que será alterado

BEGIN;

-- Verificar dados existentes antes da migração
DO $$
DECLARE
  produtos_ce_plus_count INTEGER;
  grupos_ce_plus_count INTEGER;
  constraint_exists BOOLEAN;
BEGIN
  -- Verificar quantos produtos CE_PLUS existem
  SELECT COUNT(*) INTO produtos_ce_plus_count FROM empresa_produtos WHERE produto = 'CE_PLUS';
  
  -- Verificar quantos grupos CE Plus existem
  SELECT COUNT(*) INTO grupos_ce_plus_count FROM grupos_responsaveis WHERE nome = 'CE Plus';
  
  -- Verificar se a constraint existe
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'empresa_produtos_produto_check'
  ) INTO constraint_exists;
  
  RAISE NOTICE 'Iniciando migração CE Plus -> Comex:';
  RAISE NOTICE '- Produtos CE_PLUS encontrados: %', produtos_ce_plus_count;
  RAISE NOTICE '- Grupos CE Plus encontrados: %', grupos_ce_plus_count;
  RAISE NOTICE '- Constraint existe: %', constraint_exists;
END $$;

-- 1. Primeiro, remover a constraint temporariamente para evitar conflitos
ALTER TABLE empresa_produtos DROP CONSTRAINT IF EXISTS empresa_produtos_produto_check;

-- 2. Atualizar registros existentes na tabela empresa_produtos
UPDATE empresa_produtos SET produto = 'COMEX' WHERE produto = 'CE_PLUS';

-- 3. Recriar a constraint com os novos valores
ALTER TABLE empresa_produtos ADD CONSTRAINT empresa_produtos_produto_check 
  CHECK (produto IN ('COMEX', 'FISCAL', 'GALLERY'));

-- 4. Atualizar constraint da tabela requerimentos (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requerimentos') THEN
    ALTER TABLE requerimentos DROP CONSTRAINT IF EXISTS valid_modulo;
    ALTER TABLE requerimentos ADD CONSTRAINT valid_modulo 
      CHECK (modulo IN ('Comex','Comply', 'Comply e-DOCS', 'Gallery', 'pw.SATI', 'pw.SPED', 'pw.SATI/pw.SPED'));
    
    -- Atualizar registros existentes na tabela requerimentos
    UPDATE requerimentos SET modulo = 'Comex' WHERE modulo = 'CE Plus';
  END IF;
END $$;

-- 5. Atualizar nome do grupo responsável
UPDATE grupos_responsaveis 
SET nome = 'Comex', 
    descricao = 'Grupo responsável pelo produto Comex',
    updated_at = NOW()
WHERE nome = 'CE Plus';

-- 6. Log da migração
DO $$
BEGIN
  -- Tentar inserir log na tabela permission_audit_logs se existir
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
    INSERT INTO permission_audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      changed_by,
      changed_at
    ) VALUES (
      'sistema',
      gen_random_uuid(),
      'UPDATE',
      jsonb_build_object(
        'migration', 'rename_ce_plus_to_comex',
        'descricao', 'Migração automática: Renomeado CE Plus para Comex em todo o sistema',
        'tabelas_afetadas', ARRAY['empresa_produtos', 'grupos_responsaveis', 'requerimentos'],
        'alteracoes', jsonb_build_object(
          'produtos', 'CE_PLUS -> COMEX',
          'grupos', 'CE Plus -> Comex',
          'requerimentos_modulo', 'CE Plus -> Comex'
        ),
        'status', 'SUCCESS'
      ),
      NULL, -- Sistema não tem usuário
      NOW()
    );
    RAISE NOTICE 'Log de migração inserido com sucesso';
  ELSE
    RAISE NOTICE 'Tabela permission_audit_logs não existe - log ignorado';
  END IF;
END $$;

-- 7. Verificar resultados da migração
DO $$
DECLARE
  produtos_antigos_count INTEGER;
  produtos_novos_count INTEGER;
  grupos_count INTEGER;
  requerimentos_count INTEGER := 0;
  requerimentos_antigos_count INTEGER := 0;
BEGIN
  -- Verificar se ainda existem produtos com valor antigo
  SELECT COUNT(*) INTO produtos_antigos_count FROM empresa_produtos WHERE produto = 'CE_PLUS';
  
  -- Contar produtos atualizados
  SELECT COUNT(*) INTO produtos_novos_count FROM empresa_produtos WHERE produto = 'COMEX';
  
  -- Contar grupos atualizados
  SELECT COUNT(*) INTO grupos_count FROM grupos_responsaveis WHERE nome = 'Comex';
  
  -- Contar requerimentos atualizados (se a tabela existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'requerimentos') THEN
    SELECT COUNT(*) INTO requerimentos_antigos_count FROM requerimentos WHERE modulo = 'CE Plus';
    SELECT COUNT(*) INTO requerimentos_count FROM requerimentos WHERE modulo = 'Comex';
  END IF;
  
  RAISE NOTICE 'Migração CE Plus -> Comex concluída:';
  RAISE NOTICE '- Produtos CE_PLUS restantes: %', produtos_antigos_count;
  RAISE NOTICE '- Produtos COMEX atualizados: %', produtos_novos_count;
  RAISE NOTICE '- Grupos atualizados: %', grupos_count;
  RAISE NOTICE '- Requerimentos CE Plus restantes: %', requerimentos_antigos_count;
  RAISE NOTICE '- Requerimentos Comex atualizados: %', requerimentos_count;
  
  -- Alertar se ainda existem registros antigos
  IF produtos_antigos_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: Ainda existem % produtos com valor CE_PLUS!', produtos_antigos_count;
  END IF;
  
  IF requerimentos_antigos_count > 0 THEN
    RAISE WARNING 'ATENÇÃO: Ainda existem % requerimentos com módulo CE Plus!', requerimentos_antigos_count;
  END IF;
  
  -- Verificar se a migração foi bem-sucedida
  IF produtos_antigos_count = 0 AND requerimentos_antigos_count = 0 THEN
    RAISE NOTICE '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
  ELSE
    RAISE WARNING '⚠️ MIGRAÇÃO PARCIAL - Verifique os registros restantes!';
  END IF;
END $$;

COMMIT;