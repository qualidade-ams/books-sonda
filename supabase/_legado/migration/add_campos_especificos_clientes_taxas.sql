-- Migração para adicionar campos específicos por cliente na tabela taxas_clientes
-- Campos condicionais que aparecem baseado no nome_abreviado da empresa

-- Adicionar colunas para campos específicos de clientes
ALTER TABLE taxas_clientes 
ADD COLUMN IF NOT EXISTS valor_ticket DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS valor_ticket_excedente DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_excedente_simples DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_excedente_complexo DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_excedente_1 DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_excedente_2 DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS ticket_excedente DECIMAL(10,2);

-- Adicionar comentários para documentar o uso de cada campo
COMMENT ON COLUMN taxas_clientes.valor_ticket IS 'Valor do Ticket - usado por VOTORANTIM e CSN';
COMMENT ON COLUMN taxas_clientes.valor_ticket_excedente IS 'Valor do Ticket Excedente - usado por VOTORANTIM e CSN';
COMMENT ON COLUMN taxas_clientes.ticket_excedente_simples IS 'Ticket Excedente - Ticket Simples - usado por EXXONMOBIL';
COMMENT ON COLUMN taxas_clientes.ticket_excedente_complexo IS 'Ticket Excedente - Ticket Complexo - usado por EXXONMOBIL';
COMMENT ON COLUMN taxas_clientes.ticket_excedente_1 IS 'Ticket Base - usado por CHIESI';
COMMENT ON COLUMN taxas_clientes.ticket_excedente_2 IS 'Ticket Excedente - usado por CHIESI';
COMMENT ON COLUMN taxas_clientes.ticket_excedente IS 'Ticket Excedente - usado por NIDEC';

-- Verificar se as colunas foram criadas
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_name = 'taxas_clientes' 
    AND column_name IN (
        'valor_ticket', 
        'valor_ticket_excedente', 
        'ticket_excedente_simples', 
        'ticket_excedente_complexo',
        'ticket_excedente_1',
        'ticket_excedente_2',
        'ticket_excedente'
    );
    
    IF col_count = 7 THEN
        RAISE NOTICE '✅ Todos os 7 campos específicos por cliente foram criados com sucesso!';
        RAISE NOTICE '   - valor_ticket (VOTORANTIM, CSN)';
        RAISE NOTICE '   - valor_ticket_excedente (VOTORANTIM, CSN)';
        RAISE NOTICE '   - ticket_excedente_simples (EXXONMOBIL)';
        RAISE NOTICE '   - ticket_excedente_complexo (EXXONMOBIL)';
        RAISE NOTICE '   - ticket_excedente_1 (CHIESI - Ticket Base)';
        RAISE NOTICE '   - ticket_excedente_2 (CHIESI - Ticket Excedente)';
        RAISE NOTICE '   - ticket_excedente (NIDEC)';
    ELSE
        RAISE WARNING '⚠ Apenas % de 7 campos foram criados', col_count;
    END IF;
END $$;