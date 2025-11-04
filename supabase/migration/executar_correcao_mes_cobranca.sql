-- Script para executar a correção da constraint mes_cobranca
-- Execute este script no Supabase SQL Editor

-- Remover a constraint atual que força formato obrigatório
ALTER TABLE requerimentos 
DROP CONSTRAINT IF EXISTS mes_cobranca_format_check;

-- Adicionar nova constraint que permite valores vazios/null OU formato válido
ALTER TABLE requerimentos 
ADD CONSTRAINT mes_cobranca_format_check 
CHECK (
  mes_cobranca IS NULL OR 
  mes_cobranca = '' OR 
  mes_cobranca ~ '^(0[1-9]|1[0-2])\/\d{4}$'
);

-- Verificar se a constraint foi aplicada
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'mes_cobranca_format_check';

-- Exibir mensagem de sucesso
SELECT 'Constraint mes_cobranca_format_check atualizada com sucesso! Campo agora aceita valores vazios.' as resultado;