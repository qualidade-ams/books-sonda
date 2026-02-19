-- ============================================
-- ROLLBACK - Migration de Timezone
-- ============================================
-- 
-- Este script reverte a migration de timezone
-- restaurando os dados dos backups
--
-- ⚠️ ATENÇÃO: Use apenas se houver problemas graves
-- ⚠️ Todos os dados inseridos APÓS o backup serão PERDIDOS
--
-- Data: 18/02/2026
-- Autor: Sistema Books SND
-- ============================================

-- Confirmação de segurança
DO $$
BEGIN
  RAISE NOTICE '⚠️⚠️⚠️ ATENÇÃO ⚠️⚠️⚠️';
  RAISE NOTICE 'Este script vai REVERTER a migration de timezone';
  RAISE NOTICE 'Todos os dados inseridos APÓS o backup serão PERDIDOS';
  RAISE NOTICE '';
  RAISE NOTICE 'Se você tem certeza, comente a linha RAISE EXCEPTION abaixo';
  RAISE NOTICE 'e execute novamente';
  RAISE NOTICE '';
  
  -- Descomente a linha abaixo para permitir rollback
  RAISE EXCEPTION 'Rollback bloqueado por segurança. Leia as instruções acima.';
END $$;

-- ============================================
-- VERIFICAR SE BACKUPS EXISTEM
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'backups'
  ) THEN
    RAISE EXCEPTION '❌ ERRO: Schema backups não existe! Não é possível fazer rollback';
  END IF;
  
  RAISE NOTICE '✅ Schema backups encontrado';
END $$;

-- ============================================
-- RESTAURAR DADOS DOS BACKUPS
-- ============================================

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- 1. admin_notifications
TRUNCATE TABLE admin_notifications CASCADE;
INSERT INTO admin_notifications SELECT * FROM backups.admin_notifications_backup;

-- 2. anexos_temporarios
TRUNCATE TABLE anexos_temporarios CASCADE;
INSERT INTO anexos_temporarios SELECT * FROM backups.anexos_temporarios_backup;

-- 3. baseline_historico
TRUNCATE TABLE baseline_historico CASCADE;
INSERT INTO baseline_historico SELECT * FROM backups.baseline_historico_backup;

-- 4. clientes
TRUNCATE TABLE clientes CASCADE;
INSERT INTO clientes SELECT * FROM backups.clientes_backup;

-- 5. controle_mensal
TRUNCATE TABLE controle_mensal CASCADE;
INSERT INTO controle_mensal SELECT * FROM backups.controle_mensal_backup;

-- 6. empresa_grupos
TRUNCATE TABLE empresa_grupos CASCADE;
INSERT INTO empresa_grupos SELECT * FROM backups.empresa_grupos_backup;

-- 7. empresa_produtos
TRUNCATE TABLE empresa_produtos CASCADE;
INSERT INTO empresa_produtos SELECT * FROM backups.empresa_produtos_backup;

-- 8. empresas_clientes
TRUNCATE TABLE empresas_clientes CASCADE;
INSERT INTO empresas_clientes SELECT * FROM backups.empresas_clientes_backup;

-- 9. grupo_emails
TRUNCATE TABLE grupo_emails CASCADE;
INSERT INTO grupo_emails SELECT * FROM backups.grupo_emails_backup;

-- 10. grupos_responsaveis
TRUNCATE TABLE grupos_responsaveis CASCADE;
INSERT INTO grupos_responsaveis SELECT * FROM backups.grupos_responsaveis_backup;

-- 11. historico_disparos
TRUNCATE TABLE historico_disparos CASCADE;
INSERT INTO historico_disparos SELECT * FROM backups.historico_disparos_backup;

-- 12. job_configurations
TRUNCATE TABLE job_configurations CASCADE;
INSERT INTO job_configurations SELECT * FROM backups.job_configurations_backup;

-- 13. jobs_queue
TRUNCATE TABLE jobs_queue CASCADE;
INSERT INTO jobs_queue SELECT * FROM backups.jobs_queue_backup;

-- 14. logs_sistema
TRUNCATE TABLE logs_sistema CASCADE;
INSERT INTO logs_sistema SELECT * FROM backups.logs_sistema_backup;

-- 15. pesquisas_satisfacao
TRUNCATE TABLE pesquisas_satisfacao CASCADE;
INSERT INTO pesquisas_satisfacao SELECT * FROM backups.pesquisas_satisfacao_backup;

-- 16. plano_acao_historico
TRUNCATE TABLE plano_acao_historico CASCADE;
INSERT INTO plano_acao_historico SELECT * FROM backups.plano_acao_historico_backup;

-- 17. planos_acao
TRUNCATE TABLE planos_acao CASCADE;
INSERT INTO planos_acao SELECT * FROM backups.planos_acao_backup;

-- 18. requerimentos
TRUNCATE TABLE requerimentos CASCADE;
INSERT INTO requerimentos SELECT * FROM backups.requerimentos_backup;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- ============================================
-- VERIFICAÇÃO PÓS-ROLLBACK
-- ============================================

-- Verificar contagem de registros
SELECT 
  'admin_notifications' as tabela,
  (SELECT COUNT(*) FROM admin_notifications) as atual,
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

-- Registrar rollback no log
INSERT INTO logs_sistema (
  operacao,
  detalhes,
  data_operacao
) VALUES (
  'ROLLBACK',
  'Rollback da migration de timezone executado - 18 tabelas restauradas',
  NOW()
);

-- Mensagem final
DO $$
BEGIN
  RAISE NOTICE '✅ Rollback concluído!';
  RAISE NOTICE 'Dados restaurados dos backups';
  RAISE NOTICE 'Total de tabelas: 18';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE 'Dados inseridos APÓS o backup foram PERDIDOS';
  RAISE NOTICE 'Verifique se o sistema está funcionando corretamente';
END $$;
