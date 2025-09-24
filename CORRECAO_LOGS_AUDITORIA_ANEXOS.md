# Correção dos Logs de Auditoria - Sistema de Anexos

## Problema Identificado

Durante a execução das migrações do sistema de anexos para disparos personalizados, foi identificado um erro relacionado à tabela de logs de auditoria:

```
ERROR: 42703: column "user_id" of relation "logs_sistema" does not exist
QUERY: INSERT INTO logs_sistema ( user_id, action, table_name, details, created_at ) VALUES ( NULL, 'MIGRATION', 'historico_disparos', jsonb_build_object( 'tipo_operacao', 'adicao_suporte_anexos', 'colunas_adicionadas', ARRAY['anexo_id', 'anexo_processado'] ), NOW() )
```

## Causa do Problema

O sistema estava tentando inserir logs na tabela `logs_sistema` que não existe ou não possui a estrutura esperada. Após análise do código, foi identificado que o sistema utiliza a tabela `permission_audit_logs` para auditoria.

## Solução Implementada

### 1. Correção da Migração `anexos_temporarios_migration.sql`

**Antes:**
```sql
-- Log da operação de limpeza
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_sistema') THEN
  INSERT INTO logs_sistema (
    user_id,
    action,
    table_name,
    details,
    created_at
  ) VALUES (
    NULL, -- Sistema automático
    'CLEANUP',
    'anexos_temporarios',
    jsonb_build_object(
      'registros_removidos', registros_removidos,
      'tipo_operacao', 'limpeza_automatica'
    ),
    NOW()
  );
END IF;
```

**Depois:**
```sql
-- Log da operação de limpeza (opcional - apenas se tabela permission_audit_logs existir)
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
  INSERT INTO permission_audit_logs (
    changed_by,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changed_at
  ) VALUES (
    NULL, -- Sistema automático
    'DELETE',
    'anexos_temporarios',
    NULL, -- Limpeza geral
    jsonb_build_object('registros_removidos', registros_removidos),
    jsonb_build_object(
      'operation_type', 'limpeza_automatica',
      'registros_removidos', registros_removidos
    ),
    NOW()
  );
END IF;
```

### 2. Correção da Migração `historico_disparos_anexos_extension.sql`

**Antes:**
```sql
-- Log da migração
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'logs_sistema') THEN
  INSERT INTO logs_sistema (
    user_id,
    action,
    table_name,
    details,
    created_at
  ) VALUES (
    NULL,
    'MIGRATION',
    'historico_disparos',
    jsonb_build_object(
      'tipo_operacao', 'adicao_suporte_anexos',
      'colunas_adicionadas', ARRAY['anexo_id', 'anexo_processado']
    ),
    NOW()
  );
END IF;
```

**Depois:**
```sql
-- Log da migração (opcional - apenas se tabela permission_audit_logs existir)
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'permission_audit_logs') THEN
  INSERT INTO permission_audit_logs (
    changed_by,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    changed_at
  ) VALUES (
    NULL, -- Sistema automático
    'UPDATE',
    'historico_disparos',
    NULL, -- Migração geral
    jsonb_build_object('anexo_id', NULL, 'anexo_processado', NULL),
    jsonb_build_object(
      'anexo_id', 'COLUMN_ADDED',
      'anexo_processado', 'COLUMN_ADDED',
      'migration_type', 'adicao_suporte_anexos'
    ),
    NOW()
  );
END IF;
```

## Estrutura da Tabela `permission_audit_logs`

A tabela correta de auditoria possui a seguinte estrutura:

```sql
permission_audit_logs (
  id UUID PRIMARY KEY,
  changed_by UUID, -- ID do usuário que fez a alteração (NULL para sistema)
  action VARCHAR, -- Tipo de ação (INSERT, UPDATE, DELETE)
  table_name VARCHAR, -- Nome da tabela afetada
  record_id VARCHAR, -- ID do registro afetado (NULL para operações gerais)
  old_values JSONB, -- Valores antigos
  new_values JSONB, -- Valores novos
  changed_at TIMESTAMP -- Data/hora da alteração
)
```

## Benefícios da Correção

1. **Compatibilidade**: As migrações agora usam a tabela de auditoria correta do sistema
2. **Logs Estruturados**: Os logs seguem o padrão estabelecido com campos `old_values` e `new_values`
3. **Robustez**: Verificação condicional evita erros se a tabela de auditoria não existir
4. **Rastreabilidade**: Operações de limpeza e migração são registradas adequadamente

## Arquivos Corrigidos

1. **`supabase/migration/anexos_temporarios_migration.sql`**
   - Correção da função `limpar_anexos_expirados()`
   - Uso da tabela `permission_audit_logs` em vez de `logs_sistema`

2. **`supabase/migration/historico_disparos_anexos_extension.sql`**
   - Correção do log de migração
   - Estrutura adequada para auditoria de alterações de schema

3. **`.kiro/steering/estrutura.md`**
   - Atualização da documentação para refletir as correções

## Próximos Passos

Com essas correções, as migrações do sistema de anexos devem executar sem erros. Os logs de auditoria serão registrados corretamente na tabela `permission_audit_logs`, permitindo rastreamento adequado das operações de limpeza automática e alterações de schema.

## Verificação

Para verificar se as correções funcionaram:

```sql
-- Executar a função de limpeza manualmente
SELECT limpar_anexos_expirados();

-- Verificar se os logs foram registrados
SELECT * FROM permission_audit_logs 
WHERE table_name = 'anexos_temporarios' 
ORDER BY changed_at DESC 
LIMIT 5;
```