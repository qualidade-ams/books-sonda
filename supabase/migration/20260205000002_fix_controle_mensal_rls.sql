-- Migration: Corrigir RLS da tabela controle_mensal
-- Data: 2026-02-05
-- Descrição: Adicionar políticas RLS mais permissivas para controle_mensal
--            para permitir acesso a usuários autenticados

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Usuários podem visualizar controle mensal se têm permissão" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários podem inserir controle mensal se têm permissão de edição" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários podem atualizar controle mensal se têm permissão de edição" ON controle_mensal;
DROP POLICY IF EXISTS "Usuários podem deletar controle mensal se têm permissão de edição" ON controle_mensal;

-- Criar políticas mais permissivas para usuários autenticados
-- Permitir SELECT para todos os usuários autenticados
CREATE POLICY "Usuários autenticados podem visualizar controle mensal" ON controle_mensal
    FOR SELECT 
    TO authenticated
    USING (true);

-- Permitir INSERT para usuários com permissão de edição
CREATE POLICY "Usuários com permissão podem inserir controle mensal" ON controle_mensal
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        has_screen_permission('controle_disparos', 'edit') OR
        has_screen_permission('geracao_books', 'edit')
    );

-- Permitir UPDATE para usuários com permissão de edição
CREATE POLICY "Usuários com permissão podem atualizar controle mensal" ON controle_mensal
    FOR UPDATE 
    TO authenticated
    USING (
        has_screen_permission('controle_disparos', 'edit') OR
        has_screen_permission('geracao_books', 'edit')
    );

-- Permitir DELETE para usuários com permissão de edição
CREATE POLICY "Usuários com permissão podem deletar controle mensal" ON controle_mensal
    FOR DELETE 
    TO authenticated
    USING (
        has_screen_permission('controle_disparos', 'edit') OR
        has_screen_permission('geracao_books', 'edit')
    );

-- Comentários
COMMENT ON POLICY "Usuários autenticados podem visualizar controle mensal" ON controle_mensal IS 
'Permite que todos os usuários autenticados visualizem o controle mensal';

COMMENT ON POLICY "Usuários com permissão podem inserir controle mensal" ON controle_mensal IS 
'Permite inserção para usuários com permissão de edição em controle_disparos ou geracao_books';

COMMENT ON POLICY "Usuários com permissão podem atualizar controle mensal" ON controle_mensal IS 
'Permite atualização para usuários com permissão de edição em controle_disparos ou geracao_books';

COMMENT ON POLICY "Usuários com permissão podem deletar controle mensal" ON controle_mensal IS 
'Permite exclusão para usuários com permissão de edição em controle_disparos ou geracao_books';
