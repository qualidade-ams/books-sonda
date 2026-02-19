-- ============================================
-- MIGRATION - Conversão de Timezone
-- ============================================
-- 
-- Este script converte todos os campos TIMESTAMP sem timezone
-- para TIMESTAMP WITH TIME ZONE
--
-- ⚠️ IMPORTANTE: Executar 001_backup_timezone_migration.sql ANTES
--
-- Data: 18/02/2026
-- Autor: Sistema Books SND
-- ============================================

-- Verificar se backup existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backups'
  ) THEN
    RAISE EXCEPTION '❌ ERRO: Schema backups não existe! Execute 001_backup_timezone_migration.sql primeiro';
  END IF;
  
  RAISE NOTICE '✅ Schema backups encontrado';
END $$;

-- ============================================
-- CONVERSÃO DOS CAMPOS
-- ============================================

-- 1. admin_notifications
ALTER TABLE admin_notifications 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE admin_notifications 
  ALTER COLUMN read_at TYPE TIMESTAMP WITH TIME ZONE 
  USING read_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN admin_notifications.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN admin_notifications.read_at IS 
'Data de leitura (UTC, exibir em America/Sao_Paulo)';

-- 2. anexos_temporarios
ALTER TABLE anexos_temporarios 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE anexos_temporarios 
  ALTER COLUMN data_expiracao TYPE TIMESTAMP WITH TIME ZONE 
  USING data_expiracao AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE anexos_temporarios 
  ALTER COLUMN data_processamento TYPE TIMESTAMP WITH TIME ZONE 
  USING data_processamento AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE anexos_temporarios 
  ALTER COLUMN data_upload TYPE TIMESTAMP WITH TIME ZONE 
  USING data_upload AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE anexos_temporarios 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN anexos_temporarios.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN anexos_temporarios.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 3. baseline_historico
ALTER TABLE baseline_historico 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE baseline_historico 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN baseline_historico.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN baseline_historico.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 4. clientes
ALTER TABLE clientes 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE clientes 
  ALTER COLUMN data_status TYPE TIMESTAMP WITH TIME ZONE 
  USING data_status AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE clientes 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN clientes.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN clientes.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 5. controle_mensal
ALTER TABLE controle_mensal 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE controle_mensal 
  ALTER COLUMN data_processamento TYPE TIMESTAMP WITH TIME ZONE 
  USING data_processamento AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN controle_mensal.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';

-- 6. empresa_grupos
ALTER TABLE empresa_grupos 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN empresa_grupos.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';

-- 7. empresa_produtos
ALTER TABLE empresa_produtos 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN empresa_produtos.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';

-- 8. empresas_clientes
ALTER TABLE empresas_clientes 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE empresas_clientes 
  ALTER COLUMN data_status TYPE TIMESTAMP WITH TIME ZONE 
  USING data_status AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE empresas_clientes 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN empresas_clientes.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN empresas_clientes.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 9. grupo_emails
ALTER TABLE grupo_emails 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN grupo_emails.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';

-- 10. grupos_responsaveis
ALTER TABLE grupos_responsaveis 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE grupos_responsaveis 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN grupos_responsaveis.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN grupos_responsaveis.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 11. historico_disparos
ALTER TABLE historico_disparos 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE historico_disparos 
  ALTER COLUMN data_agendamento TYPE TIMESTAMP WITH TIME ZONE 
  USING data_agendamento AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE historico_disparos 
  ALTER COLUMN data_disparo TYPE TIMESTAMP WITH TIME ZONE 
  USING data_disparo AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN historico_disparos.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';

-- 12. job_configurations
ALTER TABLE job_configurations 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE job_configurations 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN job_configurations.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN job_configurations.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 13. jobs_queue
ALTER TABLE jobs_queue 
  ALTER COLUMN completed_at TYPE TIMESTAMP WITH TIME ZONE 
  USING completed_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE jobs_queue 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE jobs_queue 
  ALTER COLUMN scheduled_at TYPE TIMESTAMP WITH TIME ZONE 
  USING scheduled_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE jobs_queue 
  ALTER COLUMN started_at TYPE TIMESTAMP WITH TIME ZONE 
  USING started_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE jobs_queue 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN jobs_queue.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN jobs_queue.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 14. logs_sistema
ALTER TABLE logs_sistema 
  ALTER COLUMN data_operacao TYPE TIMESTAMP WITH TIME ZONE 
  USING data_operacao AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN logs_sistema.data_operacao IS 
'Data da operação (UTC, exibir em America/Sao_Paulo)';

-- 15. pesquisas_satisfacao
ALTER TABLE pesquisas_satisfacao 
  ALTER COLUMN data_encaminhamento TYPE TIMESTAMP WITH TIME ZONE 
  USING data_encaminhamento AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE pesquisas_satisfacao 
  ALTER COLUMN data_envio TYPE TIMESTAMP WITH TIME ZONE 
  USING data_envio AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE pesquisas_satisfacao 
  ALTER COLUMN data_resposta TYPE TIMESTAMP WITH TIME ZONE 
  USING data_resposta AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN pesquisas_satisfacao.data_envio IS 
'Data de envio (UTC, exibir em America/Sao_Paulo)';

-- 16. plano_acao_historico
ALTER TABLE plano_acao_historico 
  ALTER COLUMN criado_em TYPE TIMESTAMP WITH TIME ZONE 
  USING criado_em AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE plano_acao_historico 
  ALTER COLUMN data_atualizacao TYPE TIMESTAMP WITH TIME ZONE 
  USING data_atualizacao AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN plano_acao_historico.criado_em IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';

-- 17. planos_acao
ALTER TABLE planos_acao 
  ALTER COLUMN atualizado_em TYPE TIMESTAMP WITH TIME ZONE 
  USING atualizado_em AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE planos_acao 
  ALTER COLUMN criado_em TYPE TIMESTAMP WITH TIME ZONE 
  USING criado_em AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE planos_acao 
  ALTER COLUMN data_fechamento TYPE TIMESTAMP WITH TIME ZONE 
  USING data_fechamento AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN planos_acao.criado_em IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN planos_acao.atualizado_em IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- 18. requerimentos
ALTER TABLE requerimentos 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE 
  USING created_at AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE requerimentos 
  ALTER COLUMN data_envio_faturamento TYPE TIMESTAMP WITH TIME ZONE 
  USING data_envio_faturamento AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE requerimentos 
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE 
  USING updated_at AT TIME ZONE 'America/Sao_Paulo';

COMMENT ON COLUMN requerimentos.created_at IS 
'Data de criação (UTC, exibir em America/Sao_Paulo)';
COMMENT ON COLUMN requerimentos.updated_at IS 
'Data de atualização (UTC, exibir em America/Sao_Paulo)';

-- ============================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================

-- Verificar se todos os campos foram convertidos
SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN data_type = 'timestamp with time zone' THEN '✅ CONVERTIDO'
    WHEN data_type = 'timestamp without time zone' THEN '❌ ERRO - NÃO CONVERTIDO'
    ELSE data_type
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'admin_notifications', 'anexos_temporarios', 'baseline_historico',
    'clientes', 'controle_mensal', 'empresa_grupos', 'empresa_produtos',
    'empresas_clientes', 'grupo_emails', 'grupos_responsaveis',
    'historico_disparos', 'job_configurations', 'jobs_queue',
    'logs_sistema', 'pesquisas_satisfacao', 'plano_acao_historico',
    'planos_acao', 'requerimentos'
  )
  AND data_type LIKE '%timestamp%'
ORDER BY table_name, column_name;

-- Registrar migration no log
INSERT INTO logs_sistema (
  operacao,
  detalhes,
  data_operacao
) VALUES (
  'MIGRATION',
  'Migration de timezone aplicada - 18 tabelas, 44 campos convertidos',
  NOW()
);

-- Mensagem final
DO $$
DECLARE
  campos_sem_timezone INTEGER;
BEGIN
  -- Contar campos que ainda estão sem timezone
  SELECT COUNT(*) INTO campos_sem_timezone
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN (
      'admin_notifications', 'anexos_temporarios', 'baseline_historico',
      'clientes', 'controle_mensal', 'empresa_grupos', 'empresa_produtos',
      'empresas_clientes', 'grupo_emails', 'grupos_responsaveis',
      'historico_disparos', 'job_configurations', 'jobs_queue',
      'logs_sistema', 'pesquisas_satisfacao', 'plano_acao_historico',
      'planos_acao', 'requerimentos'
    )
    AND data_type = 'timestamp without time zone';
  
  IF campos_sem_timezone > 0 THEN
    RAISE EXCEPTION '❌ ERRO: % campos ainda sem timezone! Verificar migration', campos_sem_timezone;
  ELSE
    RAISE NOTICE '✅ Migration concluída com sucesso!';
    RAISE NOTICE 'Total de tabelas: 18';
    RAISE NOTICE 'Total de campos convertidos: 44';
    RAISE NOTICE 'Próximo passo: Executar 003_fix_triggers_timezone.sql';
  END IF;
END $$;
