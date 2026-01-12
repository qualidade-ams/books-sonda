-- ============================================
-- TESTE: CRIAR REGISTRO MANUAL PARA TESTAR TRANSFORMAÇÃO
-- ============================================

-- Inserir um registro de teste com cliente contendo "AMS"
INSERT INTO pesquisas_satisfacao (
    origem,
    empresa,
    cliente,
    solicitante,
    comentario_pesquisa,
    status,
    autor_nome
) VALUES (
    'manual',
    'TESTE EMPRESA',
    'TESTE-AMS',
    'João da Silva Teste',
    'Teste de transformação AMS',
    'pendente',
    'Sistema Teste'
);

-- Verificar se o registro foi inserido
SELECT 
    id,
    empresa,
    cliente,
    solicitante,
    created_at
FROM pesquisas_satisfacao 
WHERE cliente = 'TESTE-AMS'
ORDER BY created_at DESC
LIMIT 1;