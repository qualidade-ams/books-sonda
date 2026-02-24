-- ============================================
-- TEMPLATE: ADICIONAR CAMPOS FALTANTES À TABELA PESQUISAS_SATISFACAO
-- ============================================
-- Este é um template. Substitua os campos de exemplo pelos campos reais
-- identificados pelo script de comparação.
--
-- IMPORTANTE: 
-- 1. Renomeie este arquivo para incluir timestamp (ex: 20260224000001_add_missing_fields_pesquisas.sql)
-- 2. Substitua os campos de exemplo pelos campos reais
-- 3. Ajuste os tipos de dados conforme necessário
-- 4. Teste em desenvolvimento antes de aplicar em produção
-- ============================================

-- Verificar campos existentes antes de adicionar
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'pesquisas_satisfacao';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CAMPOS EXISTENTES: %', v_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ADICIONAR NOVOS CAMPOS
-- ============================================
-- Substitua os exemplos abaixo pelos campos reais identificados

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS servico VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS nome_pesquisa VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS data_fechamento__date_hour_minute_second_ TIMESTAMP WITH TIME ZONE ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS data_ultima_modificacao__year_ TIMESTAMP WITH TIME ZONE ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS autor_notificacao VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS estado VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS descricao VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS pesquisa_recebida VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS pergunta VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS sequenciapregunta VARCHAR(-1) ;

ALTER TABLE pesquisas_satisfacao
ADD COLUMN IF NOT EXISTS log TIMESTAMP WITH TIME ZONE ;

-- ============================================
-- ADICIONAR COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================
-- Documente o propósito de cada campo

COMMENT ON COLUMN pesquisas_satisfacao.campo_texto_exemplo IS 
'Descrição do campo (origem: AMSpesquisa.Nome_Campo_SQL_Server)';

COMMENT ON COLUMN pesquisas_satisfacao.campo_numero_exemplo IS 
'Descrição do campo numérico (origem: AMSpesquisa.Outro_Campo)';

COMMENT ON COLUMN pesquisas_satisfacao.campo_data_exemplo IS 
'Data de algum evento (origem: AMSpesquisa.Data_Campo)';

COMMENT ON COLUMN pesquisas_satisfacao.campo_boolean_exemplo IS 
'Flag booleana (origem: AMSpesquisa.Flag_Campo)';

COMMENT ON COLUMN pesquisas_satisfacao.campo_texto_longo_exemplo IS 
'Campo de texto longo (origem: AMSpesquisa.Descricao_Campo)';

-- ============================================
-- CRIAR ÍNDICES (OPCIONAL)
-- ============================================
-- Adicione índices se os campos forem usados em filtros ou ordenação

-- Exemplo: Índice para campo de data
CREATE INDEX IF NOT EXISTS idx_pesquisas_campo_data_exemplo 
ON pesquisas_satisfacao(campo_data_exemplo) 
WHERE campo_data_exemplo IS NOT NULL;

-- Exemplo: Índice para campo de texto (busca)
CREATE INDEX IF NOT EXISTS idx_pesquisas_campo_texto_exemplo 
ON pesquisas_satisfacao(campo_texto_exemplo) 
WHERE campo_texto_exemplo IS NOT NULL;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
-- Verificar se os campos foram adicionados com sucesso

DO $$
DECLARE
    v_count INTEGER;
    v_campos_adicionados TEXT[];
BEGIN
    -- Lista de campos que deveriam ter sido adicionados
    v_campos_adicionados := ARRAY[
        'campo_texto_exemplo',
        'campo_numero_exemplo',
        'campo_data_exemplo',
        'campo_boolean_exemplo',
        'campo_texto_longo_exemplo'
    ];
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO DE CAMPOS ADICIONADOS';
    RAISE NOTICE '========================================';
    
    -- Verificar cada campo
    FOR i IN 1..array_length(v_campos_adicionados, 1) LOOP
        SELECT COUNT(*) INTO v_count
        FROM information_schema.columns
        WHERE table_name = 'pesquisas_satisfacao' 
            AND column_name = v_campos_adicionados[i];
        
        IF v_count > 0 THEN
            RAISE NOTICE '✅ Campo % adicionado com sucesso', v_campos_adicionados[i];
        ELSE
            RAISE WARNING '❌ Campo % NÃO foi adicionado', v_campos_adicionados[i];
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- CONSULTA DE VALIDAÇÃO
-- ============================================
-- Verificar estrutura completa dos novos campos

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pesquisas_satisfacao' 
    AND column_name IN (
        'campo_texto_exemplo',
        'campo_numero_exemplo',
        'campo_data_exemplo',
        'campo_boolean_exemplo',
        'campo_texto_longo_exemplo'
    )
ORDER BY column_name;

-- ============================================
-- TESTE DE DADOS
-- ============================================
-- Verificar se os campos estão acessíveis

SELECT 
    COUNT(*) as total_registros,
    COUNT(campo_texto_exemplo) as com_campo_texto,
    COUNT(campo_numero_exemplo) as com_campo_numero,
    COUNT(campo_data_exemplo) as com_campo_data,
    COUNT(campo_boolean_exemplo) as com_campo_boolean,
    COUNT(campo_texto_longo_exemplo) as com_campo_texto_longo
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ Migration concluída com sucesso!' as status;
SELECT 'Próximo passo: Atualizar código de sincronização em sync-api/src/server.ts' as proxima_acao;

-- ============================================
-- ROLLBACK (SE NECESSÁRIO)
-- ============================================
-- Descomente as linhas abaixo APENAS se precisar reverter as mudanças
-- ATENÇÃO: Isso irá REMOVER os campos e seus dados!

/*
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS campo_texto_exemplo;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS campo_numero_exemplo;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS campo_data_exemplo;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS campo_boolean_exemplo;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS campo_texto_longo_exemplo;

SELECT '⚠️ Rollback executado - campos removidos' as status;
*/

-- ============================================
-- MAPEAMENTO DE TIPOS SQL SERVER → POSTGRESQL
-- ============================================
/*
SQL Server          →  PostgreSQL
-----------------------------------------
varchar(n)          →  VARCHAR(n)
nvarchar(n)         →  VARCHAR(n)
text                →  TEXT
ntext               →  TEXT
char(n)             →  CHAR(n)
nchar(n)            →  CHAR(n)
int                 →  INTEGER
bigint              →  BIGINT
smallint            →  SMALLINT
tinyint             →  SMALLINT
bit                 →  BOOLEAN
decimal(p,s)        →  DECIMAL(p,s)
numeric(p,s)        →  NUMERIC(p,s)
float               →  DOUBLE PRECISION
real                →  REAL
money               →  DECIMAL(19,4)
smallmoney          →  DECIMAL(10,4)
datetime            →  TIMESTAMP WITH TIME ZONE
datetime2           →  TIMESTAMP WITH TIME ZONE
smalldatetime       →  TIMESTAMP WITH TIME ZONE
date                →  DATE
time                →  TIME
datetimeoffset      →  TIMESTAMP WITH TIME ZONE
uniqueidentifier    →  UUID
xml                 →  XML
binary              →  BYTEA
varbinary           →  BYTEA
image               →  BYTEA
*/
