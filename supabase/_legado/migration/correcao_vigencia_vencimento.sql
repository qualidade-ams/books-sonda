-- Correção da lógica de vigência vencida
-- Agora considera vencido apenas no dia seguinte ao vencimento
-- Data: 18/09/2025

-- Atualizar função para inativação automática por vigência
CREATE OR REPLACE FUNCTION inativar_empresas_vencidas()
RETURNS INTEGER AS $$
DECLARE
    empresas_inativadas INTEGER := 0;
BEGIN
    -- Atualizar status das empresas com vigência vencida
    -- Considera vencido apenas no dia SEGUINTE ao vencimento
    UPDATE empresas_clientes 
    SET 
        status = 'inativo',
        data_status = NOW(),
        descricao_status = 'Inativado automaticamente por vigência vencida em ' || vigencia_final::text,
        updated_at = NOW()
    WHERE 
        vigencia_final IS NOT NULL 
        AND vigencia_final < CURRENT_DATE  -- Vencido no dia seguinte
        AND status = 'ativo';
    
    GET DIAGNOSTICS empresas_inativadas = ROW_COUNT;
    
    -- Log da operação
    INSERT INTO logs_sistema (
        operacao, 
        detalhes, 
        data_operacao
    ) VALUES (
        'inativacao_automatica_vigencia',
        'Inativadas ' || empresas_inativadas || ' empresas por vigência vencida',
        NOW()
    );
    
    RETURN empresas_inativadas;
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo
COMMENT ON FUNCTION inativar_empresas_vencidas() IS 
'Inativa automaticamente empresas com vigência vencida. 
Considera vencido apenas no dia seguinte ao vencimento (vigencia_final < CURRENT_DATE).
Exemplo: Se vigência vence em 18/09/2025, será inativada apenas em 19/09/2025.';