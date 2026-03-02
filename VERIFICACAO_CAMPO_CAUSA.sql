-- =====================================================
-- VERIFICAÇÃO: Campo "causa" no Plano de Ação
-- =====================================================
-- Execute estes comandos após rodar a migration para verificar
-- se tudo foi implementado corretamente
-- =====================================================

-- ✅ VERIFICAÇÃO 1: Coluna "causa" foi criada?
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'planos_acao' 
  AND column_name = 'causa';

-- Resultado esperado:
-- column_name | data_type | is_nullable | column_default
-- ------------|-----------|-------------|---------------
-- causa       | text      | YES         | NULL


-- ✅ VERIFICAÇÃO 2: Função de validação foi criada?
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_name = 'validar_causa_plano_acao';

-- Resultado esperado:
-- routine_name              | routine_type | security_type
-- --------------------------|--------------|---------------
-- validar_causa_plano_acao  | FUNCTION     | DEFINER


-- ✅ VERIFICAÇÃO 3: Trigger foi criado?
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_validar_causa_plano_acao';

-- Resultado esperado:
-- trigger_name                      | event_manipulation | event_object_table | action_timing
-- ----------------------------------|--------------------|--------------------|---------------
-- trigger_validar_causa_plano_acao  | INSERT             | planos_acao        | BEFORE
-- trigger_validar_causa_plano_acao  | UPDATE             | planos_acao        | BEFORE


-- ✅ VERIFICAÇÃO 4: Comentário da coluna foi adicionado?
SELECT 
  col_description('planos_acao'::regclass, 
    (SELECT ordinal_position 
     FROM information_schema.columns 
     WHERE table_name = 'planos_acao' 
       AND column_name = 'causa')
  ) as column_comment;

-- Resultado esperado:
-- column_comment
-- -------------------------------------------------------------------------
-- Descrição da causa raiz do problema identificado na pesquisa de 
-- satisfação. Campo obrigatório quando data_conclusao estiver preenchida.


-- =====================================================
-- TESTES DE VALIDAÇÃO
-- =====================================================

-- 🧪 TESTE 1: Inserir plano SEM data_conclusao (deve FUNCIONAR)
-- Causa é opcional quando não há data de conclusão
INSERT INTO planos_acao (
  pesquisa_id,
  descricao_acao_corretiva,
  prioridade,
  status_plano,
  data_inicio
) VALUES (
  (SELECT id FROM pesquisas_satisfacao LIMIT 1), -- Pega primeira pesquisa
  'Ação corretiva de teste',
  'media',
  'aberto',
  CURRENT_DATE
);
-- ✅ Deve inserir com sucesso (causa fica NULL)

-- Limpar teste
DELETE FROM planos_acao 
WHERE descricao_acao_corretiva = 'Ação corretiva de teste';


-- 🧪 TESTE 2: Inserir plano COM data_conclusao MAS SEM causa (deve FALHAR)
-- Causa é obrigatória quando há data de conclusão
INSERT INTO planos_acao (
  pesquisa_id,
  descricao_acao_corretiva,
  prioridade,
  status_plano,
  data_inicio,
  data_conclusao
) VALUES (
  (SELECT id FROM pesquisas_satisfacao LIMIT 1),
  'Ação corretiva de teste 2',
  'media',
  'concluido',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days'
);
-- ❌ Deve FALHAR com erro:
-- ERROR: Campo "causa" é obrigatório quando a data de conclusão está preenchida


-- 🧪 TESTE 3: Inserir plano COM data_conclusao E COM causa (deve FUNCIONAR)
-- Validação deve passar
INSERT INTO planos_acao (
  pesquisa_id,
  descricao_acao_corretiva,
  prioridade,
  status_plano,
  data_inicio,
  data_conclusao,
  causa
) VALUES (
  (SELECT id FROM pesquisas_satisfacao LIMIT 1),
  'Ação corretiva de teste 3',
  'media',
  'concluido',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  'Falha no processo de comunicação interna entre equipes'
);
-- ✅ Deve inserir com sucesso

-- Limpar teste
DELETE FROM planos_acao 
WHERE descricao_acao_corretiva = 'Ação corretiva de teste 3';


-- 🧪 TESTE 4: Atualizar plano existente adicionando data_conclusao SEM causa (deve FALHAR)
-- Primeiro criar um plano sem conclusão
INSERT INTO planos_acao (
  pesquisa_id,
  descricao_acao_corretiva,
  prioridade,
  status_plano,
  data_inicio
) VALUES (
  (SELECT id FROM pesquisas_satisfacao LIMIT 1),
  'Ação corretiva de teste 4',
  'media',
  'aberto',
  CURRENT_DATE
) RETURNING id;

-- Agora tentar adicionar data_conclusao sem causa
UPDATE planos_acao
SET data_conclusao = CURRENT_DATE + INTERVAL '7 days'
WHERE descricao_acao_corretiva = 'Ação corretiva de teste 4';
-- ❌ Deve FALHAR com erro:
-- ERROR: Campo "causa" é obrigatório quando a data de conclusão está preenchida

-- Limpar teste
DELETE FROM planos_acao 
WHERE descricao_acao_corretiva = 'Ação corretiva de teste 4';


-- 🧪 TESTE 5: Atualizar plano existente adicionando data_conclusao COM causa (deve FUNCIONAR)
-- Primeiro criar um plano sem conclusão
INSERT INTO planos_acao (
  pesquisa_id,
  descricao_acao_corretiva,
  prioridade,
  status_plano,
  data_inicio
) VALUES (
  (SELECT id FROM pesquisas_satisfacao LIMIT 1),
  'Ação corretiva de teste 5',
  'media',
  'aberto',
  CURRENT_DATE
);

-- Agora adicionar data_conclusao COM causa
UPDATE planos_acao
SET 
  data_conclusao = CURRENT_DATE + INTERVAL '7 days',
  causa = 'Falta de treinamento adequado da equipe',
  status_plano = 'concluido'
WHERE descricao_acao_corretiva = 'Ação corretiva de teste 5';
-- ✅ Deve atualizar com sucesso

-- Limpar teste
DELETE FROM planos_acao 
WHERE descricao_acao_corretiva = 'Ação corretiva de teste 5';


-- =====================================================
-- CONSULTAS ÚTEIS
-- =====================================================

-- 📊 Contar planos com e sem causa
SELECT 
  COUNT(*) as total_planos,
  COUNT(causa) as planos_com_causa,
  COUNT(*) - COUNT(causa) as planos_sem_causa,
  COUNT(data_conclusao) as planos_concluidos,
  COUNT(CASE WHEN data_conclusao IS NOT NULL AND causa IS NULL THEN 1 END) as planos_concluidos_sem_causa
FROM planos_acao;


-- 📋 Listar planos concluídos sem causa (precisam ser revisados)
SELECT 
  id,
  pesquisa_id,
  descricao_acao_corretiva,
  data_inicio,
  data_conclusao,
  status_plano,
  causa
FROM planos_acao
WHERE data_conclusao IS NOT NULL 
  AND (causa IS NULL OR TRIM(causa) = '')
ORDER BY data_conclusao DESC;


-- 📈 Estatísticas de preenchimento do campo causa
SELECT 
  status_plano,
  COUNT(*) as total,
  COUNT(causa) as com_causa,
  COUNT(*) - COUNT(causa) as sem_causa,
  ROUND(COUNT(causa)::numeric / COUNT(*)::numeric * 100, 2) as percentual_preenchimento
FROM planos_acao
GROUP BY status_plano
ORDER BY status_plano;


-- =====================================================
-- ROLLBACK (se necessário)
-- =====================================================
-- ⚠️ ATENÇÃO: Execute apenas se precisar reverter a migration

-- Remover trigger
-- DROP TRIGGER IF EXISTS trigger_validar_causa_plano_acao ON planos_acao;

-- Remover função
-- DROP FUNCTION IF EXISTS public.validar_causa_plano_acao();

-- Remover coluna
-- ALTER TABLE planos_acao DROP COLUMN IF EXISTS causa;

-- RAISE NOTICE '⚠️ Migration revertida - campo "causa" removido';
