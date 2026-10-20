-- Migration para sistema de jobs e notificações
-- Criado em: 2024-12-09

-- Tabela de jobs para agendamento e execução
CREATE TABLE IF NOT EXISTS jobs_queue (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('monthly_books_dispatch', 'retry_failed_dispatch', 'cleanup_old_data')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_at TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_jobs_queue_status_scheduled ON jobs_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_type ON jobs_queue(type);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_created_at ON jobs_queue(created_at);

-- Tabela de notificações para administradores
CREATE TABLE IF NOT EXISTS admin_notifications (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('critical_error', 'system_failure', 'configuration_issue', 'performance_degradation', 'security_alert', 'maintenance_required')),
  title VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  source VARCHAR(100) NOT NULL,
  context JSONB,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para notificações
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON admin_notifications(severity);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON admin_notifications(created_at);

-- Tabela de configurações do sistema de jobs
CREATE TABLE IF NOT EXISTS job_configurations (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO job_configurations (key, value, description) VALUES
('scheduler_enabled', 'true', 'Habilita/desabilita o scheduler de jobs'),
('max_concurrent_jobs', '3', 'Número máximo de jobs executando simultaneamente'),
('poll_interval_ms', '30000', 'Intervalo de polling em milissegundos'),
('retry_max_attempts', '3', 'Número máximo de tentativas para retry'),
('retry_backoff_multiplier', '2', 'Multiplicador para backoff exponencial'),
('retry_initial_delay_ms', '5000', 'Delay inicial para retry em milissegundos'),
('retry_max_delay_ms', '300000', 'Delay máximo para retry em milissegundos'),
('cleanup_old_jobs_after_days', '30', 'Dias para manter jobs antigos'),
('notification_enabled', 'true', 'Habilita/desabilita notificações para administradores'),
('notification_channels', '["console", "in_app"]', 'Canais de notificação habilitados'),
('notification_rate_limit_minutes', '5', 'Rate limit para notificações em minutos')
ON CONFLICT (key) DO NOTHING;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_jobs_queue_updated_at 
    BEFORE UPDATE ON jobs_queue 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_configurations_updated_at 
    BEFORE UPDATE ON job_configurations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para limpeza automática de jobs antigos
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS INTEGER AS $$
DECLARE
    cleanup_days INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Buscar configuração de dias para limpeza
    SELECT (value::text)::integer INTO cleanup_days 
    FROM job_configurations 
    WHERE key = 'cleanup_old_jobs_after_days';
    
    -- Usar padrão se não encontrar configuração
    IF cleanup_days IS NULL THEN
        cleanup_days := 30;
    END IF;
    
    -- Deletar jobs antigos completados, falhados ou cancelados
    DELETE FROM jobs_queue 
    WHERE created_at < NOW() - INTERVAL '1 day' * cleanup_days
    AND status IN ('completed', 'failed', 'cancelled');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de jobs
CREATE OR REPLACE FUNCTION get_job_statistics()
RETURNS TABLE (
    total_jobs BIGINT,
    pending_jobs BIGINT,
    running_jobs BIGINT,
    completed_jobs BIGINT,
    failed_jobs BIGINT,
    cancelled_jobs BIGINT,
    recent_failures BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
        COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_jobs,
        COUNT(*) FILTER (WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours') as recent_failures
    FROM jobs_queue;
END;
$$ LANGUAGE plpgsql;

-- Função para agendar disparo mensal automático
CREATE OR REPLACE FUNCTION schedule_monthly_dispatch(
    target_month INTEGER,
    target_year INTEGER,
    schedule_date TIMESTAMP DEFAULT NULL
)
RETURNS VARCHAR(255) AS $$
DECLARE
    job_id VARCHAR(255);
    scheduled_at TIMESTAMP;
BEGIN
    -- Gerar ID único para o job
    job_id := 'job_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || substr(md5(random()::text), 1, 9);
    
    -- Usar data fornecida ou calcular próxima data de disparo
    IF schedule_date IS NOT NULL THEN
        scheduled_at := schedule_date;
    ELSE
        -- Agendar para o primeiro dia do mês às 9:00 AM
        scheduled_at := DATE_TRUNC('month', MAKE_DATE(target_year, target_month, 1)) + INTERVAL '9 hours';
    END IF;
    
    -- Inserir job na fila
    INSERT INTO jobs_queue (
        id,
        type,
        status,
        scheduled_at,
        attempts,
        max_attempts,
        payload,
        created_at,
        updated_at
    ) VALUES (
        job_id,
        'monthly_books_dispatch',
        'pending',
        scheduled_at,
        0,
        3,
        jsonb_build_object('mes', target_month, 'ano', target_year),
        NOW(),
        NOW()
    );
    
    RETURN job_id;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE jobs_queue IS 'Fila de jobs para execução assíncrona de tarefas do sistema';
COMMENT ON TABLE admin_notifications IS 'Notificações para administradores do sistema';
COMMENT ON TABLE job_configurations IS 'Configurações do sistema de jobs';

COMMENT ON COLUMN jobs_queue.type IS 'Tipo do job: monthly_books_dispatch, retry_failed_dispatch, cleanup_old_data';
COMMENT ON COLUMN jobs_queue.status IS 'Status do job: pending, running, completed, failed, cancelled';
COMMENT ON COLUMN jobs_queue.payload IS 'Dados necessários para execução do job';
COMMENT ON COLUMN jobs_queue.result IS 'Resultado da execução do job';

COMMENT ON COLUMN admin_notifications.type IS 'Tipo da notificação: critical_error, system_failure, etc.';
COMMENT ON COLUMN admin_notifications.severity IS 'Severidade: critical, error, warning, info';
COMMENT ON COLUMN admin_notifications.context IS 'Contexto adicional da notificação';