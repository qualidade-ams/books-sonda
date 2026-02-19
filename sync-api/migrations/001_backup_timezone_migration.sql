-- ============================================
-- BACKUP - Migration de Timezone
-- ============================================
-- 
-- Este script cria backup de todas as tabelas que serão modificadas
-- EXECUTAR ANTES da migration principal
--
-- Data: 18/02/2026
-- Autor: Sistema Books SND
-- ============================================

-- Criar schema para backups se não existir
CREATE SCHEMA IF NOT EXISTS backups;

-- Adicionar comentário
COMMENT ON SCHEMA backups IS 'Schema para armazenar backups temporários de migrations';

-- ============================================
-- BACKUP DAS TABELAS
-- ============================================

-- 1. admin_notifications
DROP TABLE IF EXISTS backups.admin_notifications_backup CASCADE;
CREATE TABLE backups.admin_notifications_backup AS 
SELECT * FROM admin_notifications;

COMMENT ON TABLE backups.admin_notifications_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 2. anexos_temporarios
DROP TABLE IF EXISTS backups.anexos_temporarios_backup CASCADE;
CREATE TABLE backups.anexos_temporarios_backup AS 
SELECT * FROM anexos_temporarios;

COMMENT ON TABLE backups.anexos_temporarios_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 3. baseline_historico
DROP TABLE IF EXISTS backups.baseline_historico_backup CASCADE;
CREATE TABLE backups.baseline_historico_backup AS 
SELECT * FROM baseline_historico;

COMMENT ON TABLE backups.baseline_historico_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 4. clientes
DROP TABLE IF EXISTS backups.clientes_backup CASCADE;
CREATE TABLE backups.clientes_backup AS 
SELECT * FROM clientes;

COMMENT ON TABLE backups.clientes_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 5. controle_mensal
DROP TABLE IF EXISTS backups.controle_mensal_backup CASCADE;
CREATE TABLE backups.controle_mensal_backup AS 
SELECT * FROM controle_mensal;

COMMENT ON TABLE backups.controle_mensal_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 6. empresa_grupos
DROP TABLE IF EXISTS backups.empresa_grupos_backup CASCADE;
CREATE TABLE backups.empresa_grupos_backup AS 
SELECT * FROM empresa_grupos;

COMMENT ON TABLE backups.empresa_grupos_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 7. empresa_produtos
DROP TABLE IF EXISTS backups.empresa_produtos_backup CASCADE;
CREATE TABLE backups.empresa_produtos_backup AS 
SELECT * FROM empresa_produtos;

COMMENT ON TABLE backups.empresa_produtos_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 8. empresas_clientes
DROP TABLE IF EXISTS backups.empresas_clientes_backup CASCADE;
CREATE TABLE backups.empresas_clientes_backup AS 
SELECT * FROM empresas_clientes;

COMMENT ON TABLE backups.empresas_clientes_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 9. grupo_emails
DROP TABLE IF EXISTS backups.grupo_emails_backup CASCADE;
CREATE TABLE backups.grupo_emails_backup AS 
SELECT * FROM grupo_emails;

COMMENT ON TABLE backups.grupo_emails_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 10. grupos_responsaveis
DROP TABLE IF EXISTS backups.grupos_responsaveis_backup CASCADE;
CREATE TABLE backups.grupos_responsaveis_backup AS 
SELECT * FROM grupos_responsaveis;

COMMENT ON TABLE backups.grupos_responsaveis_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 11. historico_disparos
DROP TABLE IF EXISTS backups.historico_disparos_backup CASCADE;
CREATE TABLE backups.historico_disparos_backup AS 
SELECT * FROM historico_disparos;

COMMENT ON TABLE backups.historico_disparos_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 12. job_configurations
DROP TABLE IF EXISTS backups.job_configurations_backup CASCADE;
CREATE TABLE backups.job_configurations_backup AS 
SELECT * FROM job_configurations;

COMMENT ON TABLE backups.job_configurations_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 13. jobs_queue
DROP TABLE IF EXISTS backups.jobs_queue_backup CASCADE;
CREATE TABLE backups.jobs_queue_backup AS 
SELECT * FROM jobs_queue;

COMMENT ON TABLE backups.jobs_queue_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 14. logs_sistema
DROP TABLE IF EXISTS backups.logs_sistema_backup CASCADE;
CREATE TABLE backups.logs_sistema_backup AS 
SELECT * FROM logs_sistema;

COMMENT ON TABLE backups.logs_sistema_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 15. pesquisas_satisfacao
DROP TABLE IF EXISTS backups.pesquisas_satisfacao_backup CASCADE;
CREATE TABLE backups.pesquisas_satisfacao_backup AS 
SELECT * FROM pesquisas_satisfacao;

COMMENT ON TABLE backups.pesquisas_satisfacao_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 16. plano_acao_historico
DROP TABLE IF EXISTS backups.plano_acao_historico_backup CASCADE;
CREATE TABLE backups.plano_acao_historico_backup AS 
SELECT * FROM plano_acao_historico;

COMMENT ON TABLE backups.plano_acao_historico_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 17. planos_acao
DROP TABLE IF EXISTS backups.planos_acao_backup CASCADE;
CREATE TABLE backups.planos_acao_backup AS 
SELECT * FROM planos_acao;

COMMENT ON TABLE backups.planos_acao_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- 18. requerimentos
DROP TABLE IF EXISTS backups.requerimentos_backup CASCADE;
CREATE TABLE backups.requerimentos_backup AS 
SELECT * FROM requerimentos;

COMMENT ON TABLE backups.requerimentos_backup IS 
'Backup criado em 18/02/2026 antes da migration de timezone';

-- ============================================
-- VERIFICAÇÃO DOS BACKUPS
-- ============================================

-- Contar registros em cada backup
SELECT 
  'admin_notifications' as tabela,
  (SELECT COUNT(*) FROM admin_notifications) as original,
  (SELECT COUNT(*) FROM backups.admin_notifications_backup) as backup,
  CASE 
    WHEN (SELECT COUNT(*) FROM admin_notifications) = (SELECT COUNT(*) FROM backups.admin_notifications_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END as status
UNION ALL
SELECT 
  'anexos_temporarios',
  (SELECT COUNT(*) FROM anexos_temporarios),
  (SELECT COUNT(*) FROM backups.anexos_temporarios_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM anexos_temporarios) = (SELECT COUNT(*) FROM backups.anexos_temporarios_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'baseline_historico',
  (SELECT COUNT(*) FROM baseline_historico),
  (SELECT COUNT(*) FROM backups.baseline_historico_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM baseline_historico) = (SELECT COUNT(*) FROM backups.baseline_historico_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'clientes',
  (SELECT COUNT(*) FROM clientes),
  (SELECT COUNT(*) FROM backups.clientes_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM clientes) = (SELECT COUNT(*) FROM backups.clientes_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'controle_mensal',
  (SELECT COUNT(*) FROM controle_mensal),
  (SELECT COUNT(*) FROM backups.controle_mensal_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM controle_mensal) = (SELECT COUNT(*) FROM backups.controle_mensal_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'empresa_grupos',
  (SELECT COUNT(*) FROM empresa_grupos),
  (SELECT COUNT(*) FROM backups.empresa_grupos_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM empresa_grupos) = (SELECT COUNT(*) FROM backups.empresa_grupos_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'empresa_produtos',
  (SELECT COUNT(*) FROM empresa_produtos),
  (SELECT COUNT(*) FROM backups.empresa_produtos_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM empresa_produtos) = (SELECT COUNT(*) FROM backups.empresa_produtos_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'empresas_clientes',
  (SELECT COUNT(*) FROM empresas_clientes),
  (SELECT COUNT(*) FROM backups.empresas_clientes_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM empresas_clientes) = (SELECT COUNT(*) FROM backups.empresas_clientes_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'grupo_emails',
  (SELECT COUNT(*) FROM grupo_emails),
  (SELECT COUNT(*) FROM backups.grupo_emails_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM grupo_emails) = (SELECT COUNT(*) FROM backups.grupo_emails_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'grupos_responsaveis',
  (SELECT COUNT(*) FROM grupos_responsaveis),
  (SELECT COUNT(*) FROM backups.grupos_responsaveis_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM grupos_responsaveis) = (SELECT COUNT(*) FROM backups.grupos_responsaveis_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'historico_disparos',
  (SELECT COUNT(*) FROM historico_disparos),
  (SELECT COUNT(*) FROM backups.historico_disparos_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM historico_disparos) = (SELECT COUNT(*) FROM backups.historico_disparos_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'job_configurations',
  (SELECT COUNT(*) FROM job_configurations),
  (SELECT COUNT(*) FROM backups.job_configurations_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM job_configurations) = (SELECT COUNT(*) FROM backups.job_configurations_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'jobs_queue',
  (SELECT COUNT(*) FROM jobs_queue),
  (SELECT COUNT(*) FROM backups.jobs_queue_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM jobs_queue) = (SELECT COUNT(*) FROM backups.jobs_queue_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'logs_sistema',
  (SELECT COUNT(*) FROM logs_sistema),
  (SELECT COUNT(*) FROM backups.logs_sistema_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM logs_sistema) = (SELECT COUNT(*) FROM backups.logs_sistema_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'pesquisas_satisfacao',
  (SELECT COUNT(*) FROM pesquisas_satisfacao),
  (SELECT COUNT(*) FROM backups.pesquisas_satisfacao_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM pesquisas_satisfacao) = (SELECT COUNT(*) FROM backups.pesquisas_satisfacao_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'plano_acao_historico',
  (SELECT COUNT(*) FROM plano_acao_historico),
  (SELECT COUNT(*) FROM backups.plano_acao_historico_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM plano_acao_historico) = (SELECT COUNT(*) FROM backups.plano_acao_historico_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'planos_acao',
  (SELECT COUNT(*) FROM planos_acao),
  (SELECT COUNT(*) FROM backups.planos_acao_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM planos_acao) = (SELECT COUNT(*) FROM backups.planos_acao_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END
UNION ALL
SELECT 
  'requerimentos',
  (SELECT COUNT(*) FROM requerimentos),
  (SELECT COUNT(*) FROM backups.requerimentos_backup),
  CASE 
    WHEN (SELECT COUNT(*) FROM requerimentos) = (SELECT COUNT(*) FROM backups.requerimentos_backup)
    THEN '✅ OK'
    ELSE '❌ ERRO'
  END;

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- 
-- Todos os status devem ser ✅ OK
-- Se algum status for ❌ ERRO, NÃO prossiga com a migration
--
-- ============================================

-- Registrar backup no log
INSERT INTO logs_sistema (
  operacao,
  detalhes,
  data_operacao
) VALUES (
  'BACKUP',
  'Backup criado antes da migration de timezone - 18 tabelas',
  NOW()
);

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '✅ Backup concluído com sucesso!';
  RAISE NOTICE 'Schema: backups';
  RAISE NOTICE 'Total de tabelas: 18';
  RAISE NOTICE 'Próximo passo: Executar 002_apply_timezone_migration.sql';
END $$;
