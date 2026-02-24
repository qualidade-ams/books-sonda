-- ============================================
-- SCRIPT PARA COMPARAR ESTRUTURAS DAS TABELAS
-- AMSpesquisa (SQL Server) vs pesquisas_satisfacao (Supabase)
-- ============================================

-- PARTE 1: Estrutura da tabela pesquisas_satisfacao no Supabase
-- Execute este script no Supabase SQL Editor

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'pesquisas_satisfacao'
ORDER BY ordinal_position;

-- ============================================
-- PARTE 2: Estrutura da tabela AMSpesquisa no SQL Server
-- Execute este script no SQL Server Management Studio ou via API
-- ============================================

/*
SELECT 
    COLUMN_NAME as column_name,
    DATA_TYPE as data_type,
    CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
    IS_NULLABLE as is_nullable,
    COLUMN_DEFAULT as column_default
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'AMSpesquisa'
ORDER BY ORDINAL_POSITION;
*/

-- ============================================
-- CAMPOS ATUALMENTE MAPEADOS NO SYNC (server.ts)
-- ============================================
/*
Campos do SQL Server (AMSpesquisa) que estão sendo sincronizados:
1. Empresa
2. Categoria
3. Grupo
4. Cliente
5. Email_Cliente
6. Prestador
7. Solicitante
8. Nro_Caso
9. Tipo_Caso
10. Ano_Abertura
11. Mes_abertura
12. Data_Resposta (Date-Hour-Minute-Second)
13. Resposta
14. Comentario_Pesquisa

Campos do Supabase (pesquisas_satisfacao) que recebem os dados:
1. empresa
2. categoria
3. grupo
4. cliente
5. email_cliente
6. prestador
7. solicitante
8. nro_caso
9. tipo_caso
10. ano_abertura
11. mes_abertura
12. data_resposta
13. resposta
14. comentario_pesquisa
15. status (enum: pendente, enviado_plano_acao, enviado_elogios)
16. origem (fixo: 'sql_server')
17. id_externo (gerado)
18. autor_id (null)
19. autor_nome (fixo: 'SQL Server Sync')
*/
