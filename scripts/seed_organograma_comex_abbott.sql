-- Script de Seed: Organograma Comex ABBOTT
-- Data: 2026-03-03
-- Descrição: Popula o organograma com a estrutura do Comex ABBOTT

-- ============================================================================
-- IMPORTANTE: Execute o script de diagnóstico primeiro!
-- scripts/diagnostico_organograma.sql
-- ============================================================================

-- ============================================================================
-- PASSO 1: Limpar dados existentes (CUIDADO EM PRODUÇÃO!)
-- ============================================================================
-- Descomente apenas se quiser limpar dados existentes:
-- DELETE FROM organizacao_produto;
-- DELETE FROM organizacao_estrutura;

-- ============================================================================
-- PASSO 2: Inserir Diretor (1º NÍVEL)
-- ============================================================================
INSERT INTO organizacao_estrutura (id, nome, cargo, departamento, email, telefone)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'João Silva', 'Diretor', 'Diretoria Geral', 'joao.silva@sonda.com', '(11) 98765-4321')
ON CONFLICT (id) DO NOTHING;

-- Vincular Diretor ao produto COMEX
INSERT INTO organizacao_produto (pessoa_id, produto, superior_id)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'COMEX', NULL)
ON CONFLICT (pessoa_id, produto) DO NOTHING;

-- ============================================================================
-- PASSO 3: Inserir Gerentes (2º NÍVEL)
-- ============================================================================
INSERT INTO organizacao_estrutura (id, nome, cargo, departamento, email, telefone)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'Maria Santos', 'Gerente', 'Gerência Comex', 'maria.santos@sonda.com', '(11) 98765-4322'),
  ('00000000-0000-0000-0000-000000000003', 'Pedro Oliveira', 'Gerente', 'Gerência Operacional', 'pedro.oliveira@sonda.com', '(11) 98765-4323')
ON CONFLICT (id) DO NOTHING;

-- Vincular Gerentes ao produto COMEX (superior: Diretor)
INSERT INTO organizacao_produto (pessoa_id, produto, superior_id)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'COMEX', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'COMEX', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (pessoa_id, produto) DO NOTHING;

-- ============================================================================
-- PASSO 4: Inserir Coordenadores (3º NÍVEL)
-- ============================================================================
INSERT INTO organizacao_estrutura (id, nome, cargo, departamento, email, telefone)
VALUES 
  ('00000000-0000-0000-0000-000000000004', 'Ana Costa', 'Coordenador', 'Coordenação Comex - Importação', 'ana.costa@sonda.com', '(11) 98765-4324'),
  ('00000000-0000-0000-0000-000000000005', 'Carlos Ferreira', 'Coordenador', 'Coordenação Comex - Exportação', 'carlos.ferreira@sonda.com', '(11) 98765-4325'),
  ('00000000-0000-0000-0000-000000000006', 'Juliana Lima', 'Coordenador', 'Coordenação Comex - Drawback', 'juliana.lima@sonda.com', '(11) 98765-4326')
ON CONFLICT (id) DO NOTHING;

-- Vincular Coordenadores ao produto COMEX (superior: Gerente Maria Santos)
INSERT INTO organizacao_produto (pessoa_id, produto, superior_id)
VALUES 
  ('00000000-0000-0000-0000-000000000004', 'COMEX', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000005', 'COMEX', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000006', 'COMEX', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (pessoa_id, produto) DO NOTHING;

-- ============================================================================
-- PASSO 5: Inserir Central Escalação (4º NÍVEL)
-- ============================================================================
INSERT INTO organizacao_estrutura (id, nome, cargo, departamento, email, telefone)
VALUES 
  ('00000000-0000-0000-0000-000000000007', 'Central Escalação Comex', 'Central Escalação', 'Central de Atendimento Comex', 'central.comex@sonda.com', '(11) 98765-4327')
ON CONFLICT (id) DO NOTHING;

-- Vincular Central Escalação ao produto COMEX (superior: Coordenador Ana Costa)
INSERT INTO organizacao_produto (pessoa_id, produto, superior_id)
VALUES 
  ('00000000-0000-0000-0000-000000000007', 'COMEX', '00000000-0000-0000-0000-000000000004')
ON CONFLICT (pessoa_id, produto) DO NOTHING;

-- ============================================================================
-- PASSO 6: Verificar dados inseridos
-- ============================================================================
DO $
DECLARE
  total_pessoas INTEGER;
  total_comex INTEGER;
  total_diretores INTEGER;
  total_gerentes INTEGER;
  total_coordenadores INTEGER;
  total_central INTEGER;
BEGIN
  -- Contar pessoas
  SELECT COUNT(*) INTO total_pessoas FROM organizacao_estrutura;
  SELECT COUNT(*) INTO total_comex FROM organizacao_produto WHERE produto = 'COMEX';
  
  -- Contar por cargo
  SELECT COUNT(*) INTO total_diretores FROM organizacao_estrutura WHERE cargo = 'Diretor';
  SELECT COUNT(*) INTO total_gerentes FROM organizacao_estrutura WHERE cargo = 'Gerente';
  SELECT COUNT(*) INTO total_coordenadores FROM organizacao_estrutura WHERE cargo = 'Coordenador';
  SELECT COUNT(*) INTO total_central FROM organizacao_estrutura WHERE cargo = 'Central Escalação';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SEED EXECUTADO COM SUCESSO!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Estatísticas:';
  RAISE NOTICE '   - Total de pessoas: %', total_pessoas;
  RAISE NOTICE '   - Pessoas no COMEX: %', total_comex;
  RAISE NOTICE '';
  RAISE NOTICE '👥 Por cargo:';
  RAISE NOTICE '   - Diretores: %', total_diretores;
  RAISE NOTICE '   - Gerentes: %', total_gerentes;
  RAISE NOTICE '   - Coordenadores: %', total_coordenadores;
  RAISE NOTICE '   - Central Escalação: %', total_central;
  RAISE NOTICE '';
  RAISE NOTICE '🌳 Estrutura hierárquica criada:';
  RAISE NOTICE '   1º NÍVEL: Diretor (João Silva)';
  RAISE NOTICE '   2º NÍVEL: Gerentes (Maria Santos, Pedro Oliveira)';
  RAISE NOTICE '   3º NÍVEL: Coordenadores (Ana Costa, Carlos Ferreira, Juliana Lima)';
  RAISE NOTICE '   4º NÍVEL: Central Escalação (Central Escalação Comex)';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  
  IF total_pessoas < 7 THEN
    RAISE WARNING '⚠️ AVISO: Nem todas as pessoas foram inseridas. Verifique conflitos de ID.';
  END IF;
  
  IF total_comex < 7 THEN
    RAISE WARNING '⚠️ AVISO: Nem todos os vínculos COMEX foram criados. Verifique a tabela organizacao_produto.';
  END IF;
END $;

-- ============================================================================
-- PASSO 7: Exibir hierarquia criada
-- ============================================================================
SELECT 
  '🌳 Hierarquia COMEX ABBOTT' as titulo,
  CASE oe.cargo
    WHEN 'Diretor' THEN '1º NÍVEL'
    WHEN 'Gerente' THEN '2º NÍVEL'
    WHEN 'Coordenador' THEN '3º NÍVEL'
    WHEN 'Central Escalação' THEN '4º NÍVEL'
  END as nivel,
  oe.nome,
  oe.cargo,
  oe.departamento,
  COALESCE(
    (SELECT nome FROM organizacao_estrutura WHERE id = op.superior_id),
    'Sem superior'
  ) as superior
FROM organizacao_estrutura oe
LEFT JOIN organizacao_produto op ON oe.id = op.pessoa_id AND op.produto = 'COMEX'
ORDER BY 
  CASE oe.cargo
    WHEN 'Diretor' THEN 1
    WHEN 'Gerente' THEN 2
    WHEN 'Coordenador' THEN 3
    WHEN 'Central Escalação' THEN 4
  END,
  oe.nome;

-- ============================================================================
-- PRÓXIMOS PASSOS
-- ============================================================================
-- 1. Execute o script de diagnóstico novamente para verificar:
--    psql -f scripts/diagnostico_organograma.sql
--
-- 2. Verifique se o organograma aparece na interface web
--
-- 3. Se ainda não aparecer, verifique:
--    - Permissões do usuário (screen_permissions)
--    - Políticas RLS (pg_policies)
--    - Console do navegador para erros JavaScript
--
-- 4. Para adicionar mais pessoas, use o mesmo padrão:
--    a) INSERT INTO organizacao_estrutura (dados da pessoa)
--    b) INSERT INTO organizacao_produto (vincular ao produto e superior)
-- ============================================================================
