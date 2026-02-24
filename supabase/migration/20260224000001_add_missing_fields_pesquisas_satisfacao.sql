-- ============================================
-- ADICIONAR CAMPOS FALTANTES À TABELA PESQUISAS_SATISFACAO
-- ============================================
-- Campos identificados na comparação com AMSpesquisa (SQL Server)
-- Data: 24/02/2026
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
    RAISE NOTICE 'CAMPOS EXISTENTES ANTES DA MIGRATION: %', v_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- ADICIONAR NOVOS CAMPOS
-- ============================================

-- Campo: Servico
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS servico TEXT;

-- Campo: Nome_Pesquisa
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS nome_pesquisa TEXT;

-- Campo: Data_Fechamento (Date-Hour-Minute-Second)
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS data_fechamento TIMESTAMP WITH TIME ZONE;

-- Campo: Data_Ultima_Modificacao (Year)
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS data_ultima_modificacao TIMESTAMP WITH TIME ZONE;

-- Campo: Autor_Notificacao
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS autor_notificacao TEXT;

-- Campo: Estado
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS estado TEXT;

-- Campo: Descricao
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- Campo: Pesquisa_Recebida
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS pesquisa_recebida TEXT;

-- Campo: Pergunta
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS pergunta TEXT;

-- Campo: SequenciaPregunta (corrigido de "sequenciapregunta")
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS sequencia_pergunta TEXT;

-- Campo: LOG
ALTER TABLE pesquisas_satisfacao 
ADD COLUMN IF NOT EXISTS log TIMESTAMP WITH TIME ZONE;

-- ============================================
-- ADICIONAR COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================

COMMENT ON COLUMN pesquisas_satisfacao.servico IS 
'Serviço relacionado à pesquisa (origem: AMSpesquisa.Servico)';

COMMENT ON COLUMN pesquisas_satisfacao.nome_pesquisa IS 
'Nome da pesquisa (origem: AMSpesquisa.Nome_Pesquisa)';

COMMENT ON COLUMN pesquisas_satisfacao.data_fechamento IS 
'Data de fechamento da pesquisa (origem: AMSpesquisa.Data_Fechamento)';

COMMENT ON COLUMN pesquisas_satisfacao.data_ultima_modificacao IS 
'Data da última modificação (origem: AMSpesquisa.Data_Ultima_Modificacao)';

COMMENT ON COLUMN pesquisas_satisfacao.autor_notificacao IS 
'Autor da notificação (origem: AMSpesquisa.Autor_Notificacao)';

COMMENT ON COLUMN pesquisas_satisfacao.estado IS 
'Estado da pesquisa (origem: AMSpesquisa.Estado)';

COMMENT ON COLUMN pesquisas_satisfacao.descricao IS 
'Descrição da pesquisa (origem: AMSpesquisa.Descricao)';

COMMENT ON COLUMN pesquisas_satisfacao.pesquisa_recebida IS 
'Indicador se pesquisa foi recebida (origem: AMSpesquisa.Pesquisa_Recebida)';

COMMENT ON COLUMN pesquisas_satisfacao.pergunta IS 
'Pergunta da pesquisa (origem: AMSpesquisa.Pergunta)';

COMMENT ON COLUMN pesquisas_satisfacao.sequencia_pergunta IS 
'Sequência da pergunta (origem: AMSpesquisa.SequenciaPregunta)';

COMMENT ON COLUMN pesquisas_satisfacao.log IS 
'Log de auditoria (origem: AMSpesquisa.LOG)';

-- ============================================
-- CRIAR ÍNDICES (OPCIONAL - PARA PERFORMANCE)
-- ============================================

-- Índice para data_fechamento (usado em filtros)
CREATE INDEX IF NOT EXISTS idx_pesquisas_data_fechamento 
ON pesquisas_satisfacao(data_fechamento) 
WHERE data_fechamento IS NOT NULL;

-- Índice para estado (usado em filtros)
CREATE INDEX IF NOT EXISTS idx_pesquisas_estado 
ON pesquisas_satisfacao(estado) 
WHERE estado IS NOT NULL;

-- Índice para data_ultima_modificacao (usado em ordenação)
CREATE INDEX IF NOT EXISTS idx_pesquisas_data_ultima_modificacao 
ON pesquisas_satisfacao(data_ultima_modificacao) 
WHERE data_ultima_modificacao IS NOT NULL;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

DO $$
DECLARE
    v_count INTEGER;
    v_campos_adicionados TEXT[];
    v_campo TEXT;
BEGIN
    -- Lista de campos que deveriam ter sido adicionados
    v_campos_adicionados := ARRAY[
        'servico',
        'nome_pesquisa',
        'data_fechamento',
        'data_ultima_modificacao',
        'autor_notificacao',
        'estado',
        'descricao',
        'pesquisa_recebida',
        'pergunta',
        'sequencia_pergunta',
        'log'
    ];
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICAÇÃO DE CAMPOS ADICIONADOS';
    RAISE NOTICE '========================================';
    
    -- Verificar cada campo
    FOREACH v_campo IN ARRAY v_campos_adicionados
    LOOP
        SELECT COUNT(*) INTO v_count
        FROM information_schema.columns
        WHERE table_name = 'pesquisas_satisfacao' 
            AND column_name = v_campo;
        
        IF v_count > 0 THEN
            RAISE NOTICE '✅ Campo % adicionado com sucesso', v_campo;
        ELSE
            RAISE WARNING '❌ Campo % NÃO foi adicionado', v_campo;
        END IF;
    END LOOP;
    
    -- Contar total de campos após migration
    SELECT COUNT(*) INTO v_count
    FROM information_schema.columns
    WHERE table_name = 'pesquisas_satisfacao';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TOTAL DE CAMPOS APÓS MIGRATION: %', v_count;
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- CONSULTA DE VALIDAÇÃO
-- ============================================

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pesquisas_satisfacao' 
    AND column_name IN (
        'servico',
        'nome_pesquisa',
        'data_fechamento',
        'data_ultima_modificacao',
        'autor_notificacao',
        'estado',
        'descricao',
        'pesquisa_recebida',
        'pergunta',
        'sequencia_pergunta',
        'log'
    )
ORDER BY column_name;

-- ============================================
-- TESTE DE DADOS
-- ============================================

SELECT 
    COUNT(*) as total_registros,
    COUNT(servico) as com_servico,
    COUNT(nome_pesquisa) as com_nome_pesquisa,
    COUNT(data_fechamento) as com_data_fechamento,
    COUNT(data_ultima_modificacao) as com_data_ultima_modificacao,
    COUNT(autor_notificacao) as com_autor_notificacao,
    COUNT(estado) as com_estado,
    COUNT(descricao) as com_descricao,
    COUNT(pesquisa_recebida) as com_pesquisa_recebida,
    COUNT(pergunta) as com_pergunta,
    COUNT(sequencia_pergunta) as com_sequencia_pergunta,
    COUNT(log) as com_log
FROM pesquisas_satisfacao
WHERE origem = 'sql_server';

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT '✅ Migration concluída com sucesso!' as status;
SELECT 'Próximo passo: Atualizar código de sincronização em sync-api/src/server.ts' as proxima_acao;
SELECT '11 campos adicionados: servico, nome_pesquisa, data_fechamento, data_ultima_modificacao, autor_notificacao, estado, descricao, pesquisa_recebida, pergunta, sequencia_pergunta, log' as campos_adicionados;

-- ============================================
-- ROLLBACK (SE NECESSÁRIO)
-- ============================================
-- Descomente as linhas abaixo APENAS se precisar reverter as mudanças
-- ATENÇÃO: Isso irá REMOVER os campos e seus dados!

/*
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS servico;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS nome_pesquisa;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS data_fechamento;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS data_ultima_modificacao;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS autor_notificacao;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS estado;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS descricao;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS pesquisa_recebida;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS pergunta;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS sequencia_pergunta;
ALTER TABLE pesquisas_satisfacao DROP COLUMN IF EXISTS log;

DROP INDEX IF EXISTS idx_pesquisas_data_fechamento;
DROP INDEX IF EXISTS idx_pesquisas_estado;
DROP INDEX IF EXISTS idx_pesquisas_data_ultima_modificacao;

SELECT '⚠️ Rollback executado - campos removidos' as status;
*/
