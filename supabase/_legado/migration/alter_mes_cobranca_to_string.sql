-- Migração para alterar o campo mes_cobranca de number para string (formato MM/YYYY)
-- Permite seleção de mês e ano, incluindo anos futuros

-- 1. Adicionar nova coluna temporária
ALTER TABLE requerimentos 
ADD COLUMN mes_cobranca_temp VARCHAR(7);

-- 2. Migrar dados existentes (converter número do mês para formato MM/YYYY)
UPDATE requerimentos 
SET mes_cobranca_temp = LPAD(mes_cobranca::text, 2, '0') || '/' || EXTRACT(YEAR FROM created_at)::text
WHERE mes_cobranca IS NOT NULL;

-- 3. Remover coluna antiga
ALTER TABLE requerimentos 
DROP COLUMN mes_cobranca;

-- 4. Renomear coluna temporária
ALTER TABLE requerimentos 
RENAME COLUMN mes_cobranca_temp TO mes_cobranca;

-- 5. Adicionar constraint para validar formato MM/YYYY
ALTER TABLE requerimentos 
ADD CONSTRAINT mes_cobranca_format_check 
CHECK (mes_cobranca ~ '^(0[1-9]|1[0-2])\/\d{4}$');

-- 6. Adicionar comentário explicativo
COMMENT ON COLUMN requerimentos.mes_cobranca IS 'Mês e ano de cobrança no formato MM/YYYY (ex: 09/2025)';

-- 7. Recriar índices se necessário
CREATE INDEX IF NOT EXISTS idx_requerimentos_mes_cobranca ON requerimentos(mes_cobranca);

-- 8. Log da migração
INSERT INTO permission_audit_logs (
  user_id,
  action,
  resource_type,
  resource_id,
  details,
  ip_address,
  user_agent
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'MIGRATION',
  'DATABASE',
  'requerimentos.mes_cobranca',
  'Alterado campo mes_cobranca de number para string (formato MM/YYYY) para permitir seleção de mês e ano incluindo anos futuros',
  '127.0.0.1',
  'Database Migration Script'
) ON CONFLICT DO NOTHING;