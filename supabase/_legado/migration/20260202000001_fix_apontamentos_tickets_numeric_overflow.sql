-- =====================================================
-- FIX: Corrigir overflow numérico em apontamentos_tickets_aranda
-- =====================================================
-- Data: 2026-02-02
-- Descrição: Ajustar precisão dos campos numéricos que estão causando overflow
-- =====================================================

-- Verificar se a tabela existe antes de fazer alterações
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apontamentos_tickets_aranda') THEN
        RAISE NOTICE 'Tabela apontamentos_tickets_aranda encontrada. Ajustando campos numéricos...';
        
        -- Ajustar campo tempo_gasto_minutos
        -- De: numeric(10, 6) - máximo 9999.999999
        -- Para: numeric(15, 6) - máximo 999999999.999999
        ALTER TABLE public.apontamentos_tickets_aranda 
        ALTER COLUMN tempo_gasto_minutos TYPE numeric(15, 6);
        
        -- Ajustar campo tempo_real_tda
        -- De: numeric(10, 6) - máximo 9999.999999  
        -- Para: numeric(15, 6) - máximo 999999999.999999
        ALTER TABLE public.apontamentos_tickets_aranda 
        ALTER COLUMN tempo_real_tda TYPE numeric(15, 6);
        
        -- Ajustar campo tempo_restante_tds_em_minutos se necessário
        -- De: numeric(10, 2) - máximo 99999999.99
        -- Para: numeric(15, 2) - máximo 9999999999999.99
        ALTER TABLE public.apontamentos_tickets_aranda 
        ALTER COLUMN tempo_restante_tds_em_minutos TYPE numeric(15, 2);
        
        RAISE NOTICE 'Campos numéricos ajustados com sucesso!';
        RAISE NOTICE '- tempo_gasto_minutos: numeric(15, 6)';
        RAISE NOTICE '- tempo_real_tda: numeric(15, 6)';
        RAISE NOTICE '- tempo_restante_tds_em_minutos: numeric(15, 2)';
        
    ELSE
        RAISE NOTICE 'Tabela apontamentos_tickets_aranda não encontrada. Criando com campos corrigidos...';
    END IF;
END $$;

-- Criar tabela com campos corrigidos se não existir
CREATE TABLE IF NOT EXISTS public.apontamentos_tickets_aranda (
    id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    nro_solicitacao character varying(50) NOT NULL,
    cod_tipo character varying(50) NULL,
    ticket_externo character varying(100) NULL,
    numero_pai character varying(50) NULL,
    caso_pai character varying(100) NULL,
    organizacao character varying(100) NULL,
    empresa character varying(100) NULL,
    cliente character varying(100) NULL,
    usuario_final character varying(100) NULL,
    resumo text NULL,
    descricao text NULL,
    autor character varying(100) NULL,
    solicitante character varying(100) NULL,
    nome_grupo character varying(100) NULL,
    nome_responsavel character varying(100) NULL,
    categoria character varying(100) NULL,
    item_configuracao character varying(200) NULL,
    data_abertura timestamp with time zone NULL,
    data_solucao timestamp with time zone NULL,
    data_fechamento timestamp with time zone NULL,
    data_ultima_modificacao timestamp with time zone NULL,
    ultima_modificacao text NULL,
    data_prevista_entrega timestamp with time zone NULL,
    data_aprovacao timestamp with time zone NULL,
    data_real_entrega timestamp with time zone NULL,
    data_ultima_nota timestamp with time zone NULL,
    data_ultimo_comentario timestamp with time zone NULL,
    status character varying(50) NULL,
    prioridade character varying(50) NULL,
    urgencia character varying(50) NULL,
    impacto character varying(50) NULL,
    chamado_reaberto character varying(50) NULL,
    criado_via character varying(50) NULL,
    relatado text NULL,
    solucao text NULL,
    causa_raiz text NULL,
    desc_ultima_nota text NULL,
    desc_ultimo_comentario text NULL,
    log text NULL,
    tempo_gasto_dias character varying(50) NULL,
    tempo_gasto_horas character varying(50) NULL,
    tempo_gasto_minutos numeric(15, 6) NULL, -- ✅ CORRIGIDO: era (10, 6)
    cod_resolucao character varying(50) NULL,
    violacao_sla character varying(50) NULL,
    tda_cumprido character varying(50) NULL,
    tds_cumprido character varying(50) NULL,
    data_prevista_tda timestamp with time zone NULL,
    data_prevista_tds timestamp with time zone NULL,
    tempo_restante_tda character varying(50) NULL,
    tempo_restante_tds character varying(50) NULL,
    tempo_restante_tds_em_minutos numeric(15, 2) NULL, -- ✅ CORRIGIDO: era (10, 2)
    tempo_real_tda numeric(15, 6) NULL, -- ✅ CORRIGIDO: era (10, 6)
    total_orcamento numeric(15, 2) NULL,
    data_sincronizacao timestamp with time zone NULL DEFAULT now(),
    created_at timestamp with time zone NULL DEFAULT now(),
    updated_at timestamp with time zone NULL DEFAULT now(),
    source_updated_at timestamp with time zone NULL,
    synced_at timestamp with time zone NULL,
    CONSTRAINT apontamentos_tickets_aranda_pkey PRIMARY KEY (id),
    CONSTRAINT unique_ticket_aranda UNIQUE (nro_solicitacao, data_abertura)
) TABLESPACE pg_default;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_tickets_aranda_nro_solicitacao 
ON public.apontamentos_tickets_aranda USING btree (nro_solicitacao) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_empresa 
ON public.apontamentos_tickets_aranda USING btree (empresa) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_data_abertura 
ON public.apontamentos_tickets_aranda USING btree (data_abertura DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_status 
ON public.apontamentos_tickets_aranda USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_grupo 
ON public.apontamentos_tickets_aranda USING btree (nome_grupo) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_responsavel 
ON public.apontamentos_tickets_aranda USING btree (nome_responsavel) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_data_sincronizacao 
ON public.apontamentos_tickets_aranda USING btree (data_sincronizacao DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_empresa_periodo 
ON public.apontamentos_tickets_aranda USING btree (empresa, data_abertura DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_cod_resolucao 
ON public.apontamentos_tickets_aranda USING btree (cod_resolucao) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_source_updated_at 
ON public.apontamentos_tickets_aranda USING btree (source_updated_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_tickets_aranda_synced_at 
ON public.apontamentos_tickets_aranda USING btree (synced_at DESC) TABLESPACE pg_default;

-- Criar função para trigger se não existir
CREATE OR REPLACE FUNCTION update_apontamentos_tickets_aranda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_update_apontamentos_tickets_aranda_updated_at ON apontamentos_tickets_aranda;
CREATE TRIGGER trigger_update_apontamentos_tickets_aranda_updated_at 
    BEFORE UPDATE ON apontamentos_tickets_aranda 
    FOR EACH ROW 
    EXECUTE FUNCTION update_apontamentos_tickets_aranda_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.apontamentos_tickets_aranda IS 'Tabela para armazenar dados de tickets/apontamentos do sistema Aranda';
COMMENT ON COLUMN public.apontamentos_tickets_aranda.tempo_gasto_minutos IS 'Tempo gasto em minutos (numeric 15,6 para suportar valores grandes)';
COMMENT ON COLUMN public.apontamentos_tickets_aranda.tempo_real_tda IS 'Tempo real TDA (numeric 15,6 para suportar valores grandes)';
COMMENT ON COLUMN public.apontamentos_tickets_aranda.tempo_restante_tds_em_minutos IS 'Tempo restante TDS em minutos (numeric 15,2 para suportar valores grandes)';

-- Verificação final
DO $$
DECLARE
    campo_info RECORD;
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DOS CAMPOS CORRIGIDOS ===';
    
    FOR campo_info IN 
        SELECT column_name, data_type, numeric_precision, numeric_scale
        FROM information_schema.columns 
        WHERE table_name = 'apontamentos_tickets_aranda' 
        AND column_name IN ('tempo_gasto_minutos', 'tempo_real_tda', 'tempo_restante_tds_em_minutos')
        ORDER BY column_name
    LOOP
        RAISE NOTICE 'Campo: % | Tipo: % | Precisão: % | Escala: %', 
            campo_info.column_name, 
            campo_info.data_type, 
            campo_info.numeric_precision, 
            campo_info.numeric_scale;
    END LOOP;
    
    RAISE NOTICE '=== CORREÇÃO CONCLUÍDA ===';
END $$;