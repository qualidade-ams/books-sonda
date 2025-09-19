-- Correção do trigger de validação de vigências
-- Ajustar para ser consistente com a nova lógica de vencimento
-- Data: 18/09/2025

-- Atualizar função de validação de vigências
CREATE OR REPLACE FUNCTION validar_vigencias()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar se vigência inicial não é posterior à final
    IF NEW.vigencia_inicial IS NOT NULL AND NEW.vigencia_final IS NOT NULL THEN
        IF NEW.vigencia_inicial > NEW.vigencia_final THEN
            RAISE EXCEPTION 'A vigência inicial não pode ser posterior à vigência final';
        END IF;
    END IF;
    
    -- Se está definindo uma vigência final vencida (anterior ao dia atual) e status é ativo, alertar
    -- Agora considera vencido apenas no dia seguinte ao vencimento
    IF NEW.vigencia_final IS NOT NULL AND NEW.vigencia_final < CURRENT_DATE AND NEW.status = 'ativo' THEN
        -- Permitir, mas registrar no log
        BEGIN
            INSERT INTO logs_sistema (
                operacao, 
                detalhes, 
                data_operacao
            ) VALUES (
                'vigencia_passado_definida',
                'Empresa ' || NEW.nome_completo || ' (ID: ' || NEW.id || ') teve vigência final definida no passado: ' || NEW.vigencia_final,
                NOW()
            );
        EXCEPTION
            WHEN OTHERS THEN
                -- Se não conseguir logar, continuar normalmente
                NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo
COMMENT ON FUNCTION validar_vigencias() IS 
'Valida vigências antes de inserir/atualizar empresas.
- Vigência inicial não pode ser posterior à final
- Loga quando vigência final está no passado (vencida)
- Considera vencido apenas quando vigencia_final < CURRENT_DATE (dia seguinte ao vencimento)';