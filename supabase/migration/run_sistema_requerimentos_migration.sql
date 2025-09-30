-- =====================================================
-- Sistema de Requerimentos - Script de Migração Completa
-- =====================================================
-- Este script executa todas as migrações necessárias
-- para configurar a infraestrutura do sistema de requerimentos
-- =====================================================

-- Log do início da migração (comentado - tabela de logs não existe)
-- INSERT INTO permission_audit_logs (...) - Removido pois tabela não existe

RAISE NOTICE '=== INICIANDO MIGRAÇÃO DO SISTEMA DE REQUERIMENTOS ===';
RAISE NOTICE 'Data/Hora: %', NOW();
RAISE NOTICE '';

-- =====================================================
-- ETAPA 1: Criar tabela requerimentos
-- =====================================================
RAISE NOTICE 'ETAPA 1: Criando tabela requerimentos...';

-- Incluir conteúdo da migração principal
\i sistema_requerimentos_migration.sql

RAISE NOTICE '✓ Tabela requerimentos criada com sucesso';
RAISE NOTICE '';

-- =====================================================
-- ETAPA 2: Configurar permissões
-- =====================================================
RAISE NOTICE 'ETAPA 2: Configurando sistema de permissões...';

-- Incluir conteúdo da migração de permissões
\i sistema_requerimentos_permissions_migration.sql

RAISE NOTICE '✓ Sistema de permissões configurado com sucesso';
RAISE NOTICE '';

-- =====================================================
-- ETAPA 3: Configurar políticas RLS
-- =====================================================
RAISE NOTICE 'ETAPA 3: Configurando políticas de segurança (RLS)...';

-- Incluir conteúdo da migração de RLS
\i sistema_requerimentos_rls_policies.sql

RAISE NOTICE '✓ Políticas RLS configuradas com sucesso';
RAISE NOTICE '';

-- =====================================================
-- ETAPA 4: Executar testes de validação
-- =====================================================
RAISE NOTICE 'ETAPA 4: Executando testes de validação...';

-- Incluir conteúdo dos testes de validação
\i sistema_requerimentos_validation_test.sql

RAISE NOTICE '';

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Log do fim da migração (comentado - tabela de logs não existe)
-- INSERT INTO permission_audit_logs (...) - Removido pois tabela não existe

RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA ===';
RAISE NOTICE 'Sistema de requerimentos configurado e pronto para uso.';
RAISE NOTICE '';
RAISE NOTICE 'Próximos passos:';
RAISE NOTICE '1. Implementar tipos TypeScript e schemas de validação';
RAISE NOTICE '2. Criar serviços de requerimentos';
RAISE NOTICE '3. Implementar componentes React';
RAISE NOTICE '4. Configurar rotas e navegação';
RAISE NOTICE '';
RAISE NOTICE 'Data/Hora de conclusão: %', NOW();