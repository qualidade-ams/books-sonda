# Guia de Migração: CE Plus → Comex

## Problemas Identificados e Corrigidos

### 1. Constraint Violation
O erro `ERROR: 23514: check constraint "empresa_produtos_produto_check" of relation "empresa_produtos" is violated by some row` indica que existem registros na tabela `empresa_produtos` com o valor `CE_PLUS` que violam a constraint quando tentamos alterá-la.

### 2. Coluna Inexistente no Log
O erro `ERROR: 42703: column "user_id" of relation "permission_audit_logs" does not exist` indica que a tabela de auditoria não tem a coluna `user_id`, mas sim `changed_by`.

## Soluções Implementadas
Criei uma migração mais robusta que:
1. Remove temporariamente a constraint
2. Atualiza os dados existentes
3. Recria a constraint com os novos valores
4. Corrige o log de auditoria para usar a estrutura correta da tabela `permission_audit_logs`
5. Corrige a sintaxe dos blocos `DO $$` no PostgreSQL

## Passos para Executar a Migração

### 1. Verificação Prévia (RECOMENDADO)
Primeiro, execute o script de verificação para ver exatamente quais dados serão alterados:

```sql
\i supabase/migration/verificar_dados_ce_plus.sql
```

Este script mostrará:
- Quantos produtos `CE_PLUS` existem
- Quantos grupos `CE Plus` existem  
- Quantos requerimentos `CE Plus` existem
- Detalhes dos registros que serão alterados
- Status da constraint atual

### 2. Backup (ALTAMENTE RECOMENDADO)
Faça backup das tabelas que serão alteradas:

```sql
-- Backup da tabela empresa_produtos
CREATE TABLE empresa_produtos_backup AS SELECT * FROM empresa_produtos;

-- Backup da tabela grupos_responsaveis  
CREATE TABLE grupos_responsaveis_backup AS SELECT * FROM grupos_responsaveis;

-- Backup da tabela requerimentos (se existir)
CREATE TABLE requerimentos_backup AS SELECT * FROM requerimentos WHERE modulo = 'CE Plus';
```

### 3. Executar a Migração
Execute o script de migração corrigido:

```sql
\i supabase/migration/rename_ce_plus_to_comex.sql
```

### 4. Verificar Resultados
O script mostrará automaticamente:
- Quantos registros foram atualizados
- Se ainda restam registros antigos
- Status final da migração

### 5. Validação Manual (Opcional)
Verifique manualmente se tudo foi migrado corretamente:

```sql
-- Verificar se não restam produtos CE_PLUS
SELECT COUNT(*) FROM empresa_produtos WHERE produto = 'CE_PLUS';
-- Resultado esperado: 0

-- Verificar produtos COMEX criados
SELECT COUNT(*) FROM empresa_produtos WHERE produto = 'COMEX';

-- Verificar grupos
SELECT nome FROM grupos_responsaveis WHERE nome IN ('CE Plus', 'Comex');
-- Resultado esperado: apenas 'Comex'

-- Verificar constraint
SELECT consrc FROM pg_constraint WHERE conname = 'empresa_produtos_produto_check';
-- Resultado esperado: CHECK ((produto)::text = ANY ((ARRAY['COMEX'::character varying, 'FISCAL'::character varying, 'GALLERY'::character varying])::text[]))
```

## Rollback (Se Necessário)
Se algo der errado, você pode reverter usando os backups:

```sql
-- Restaurar empresa_produtos
TRUNCATE empresa_produtos;
INSERT INTO empresa_produtos SELECT * FROM empresa_produtos_backup;

-- Restaurar grupos_responsaveis
UPDATE grupos_responsaveis SET nome = 'CE Plus', descricao = 'Grupo responsável pelo produto CE Plus' WHERE nome = 'Comex';

-- Restaurar constraint original
ALTER TABLE empresa_produtos DROP CONSTRAINT IF EXISTS empresa_produtos_produto_check;
ALTER TABLE empresa_produtos ADD CONSTRAINT empresa_produtos_produto_check 
  CHECK (produto IN ('CE_PLUS', 'FISCAL', 'GALLERY'));
```

## Arquivos Criados/Modificados

### Scripts de Migração:
- `supabase/migration/rename_ce_plus_to_comex.sql` - Migração principal (corrigida)
- `supabase/migration/verificar_dados_ce_plus.sql` - Script de verificação prévia

### Código-fonte:
- Todos os arquivos TypeScript foram atualizados para usar "COMEX" e "Comex"
- Testes atualizados
- Documentação atualizada

## Notas Importantes

1. **Transação**: A migração usa `BEGIN/COMMIT` para garantir atomicidade
2. **Ordem**: Remove constraint → Atualiza dados → Recria constraint
3. **Verificação**: Logs detalhados mostram o progresso e resultados
4. **Segurança**: Script de verificação prévia para evitar surpresas
5. **Backup**: Sempre faça backup antes de executar

## Próximos Passos Após Migração

1. Deploy do código atualizado
2. Testar funcionalidades relacionadas a produtos
3. Verificar importação Excel (deve aceitar formatos antigos)
4. Testar sistema de requerimentos
5. Remover backups após confirmação de sucesso

A migração está agora muito mais robusta e segura! 🚀