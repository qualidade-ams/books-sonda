-- =====================================================
-- Adicionar política para usuários anônimos lerem especialistas
-- =====================================================

-- Política para permitir que usuários anônimos leiam especialistas
CREATE POLICY "especialistas_anon_read"
ON especialistas
FOR SELECT TO anon
USING (true);

-- Verificação
SELECT 
    'Política anônima criada' as status,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE tablename = 'especialistas';