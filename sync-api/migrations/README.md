# Migrations - Correção de Políticas RLS Duplicadas

## 🚨 Problema Identificado

Erro 406 (Not Acceptable) nas requisições ao Supabase para as tabelas:
- `banco_horas_calculos`
- `banco_horas_calculos_segmentados`

**Causa**: Políticas RLS duplicadas causando conflito de permissões.

## 📋 Ordem de Execução

Execute os scripts na seguinte ordem no **Supabase SQL Editor**:

### 1. Diagnóstico (Opcional)
```sql
-- Executar primeiro para ver o estado atual
\i sync-api/verificar-politicas-duplicadas.sql
```

### 2. Correção - banco_horas_calculos
```sql
-- Corrige políticas RLS da tabela principal
\i sync-api/migrations/002_fix_banco_horas_calculos_rls_duplicates.sql
```

### 3. Correção - banco_horas_calculos_segmentados
```sql
-- Corrige políticas RLS da tabela segmentada
\i sync-api/migrations/003_fix_banco_horas_segmentados_rls_duplicates.sql
```

### 4. Validação Final
```sql
-- Valida se as correções foram aplicadas corretamente
\i sync-api/validar-rls-completo.sql
```

## ✅ Resultado Esperado

Após executar as migrations, você deve ver:

### Tabela: banco_horas_calculos
- ✅ 4 políticas criadas (SELECT, INSERT, UPDATE, DELETE)
- ✅ 0 duplicatas
- ✅ RLS habilitado
- ✅ Permissões GRANT configuradas

### Tabela: banco_horas_calculos_segmentados
- ✅ 4 políticas criadas (SELECT, INSERT, UPDATE, DELETE)
- ✅ 0 duplicatas
- ✅ RLS habilitado
- ✅ Permissões GRANT configuradas

## 🔍 Como Validar

Execute o script de validação completa:

```sql
\i sync-api/validar-rls-completo.sql
```

**Status esperado**: `✅ PERFEITO` para ambas as tabelas

## 📝 Políticas Criadas

### banco_horas_calculos
1. `authenticated_select_banco_horas_calculos` - Permite SELECT para usuários autenticados
2. `authenticated_insert_banco_horas_calculos` - Permite INSERT para usuários autenticados
3. `authenticated_update_banco_horas_calculos` - Permite UPDATE para usuários autenticados
4. `authenticated_delete_banco_horas_calculos` - Permite DELETE para usuários autenticados

### banco_horas_calculos_segmentados
1. `authenticated_select_banco_horas_segmentados` - Permite SELECT para usuários autenticados
2. `authenticated_insert_banco_horas_segmentados` - Permite INSERT para usuários autenticados
3. `authenticated_update_banco_horas_segmentados` - Permite UPDATE para usuários autenticados
4. `authenticated_delete_banco_horas_segmentados` - Permite DELETE para usuários autenticados

## 🎯 Otimizações Aplicadas

Seguindo o padrão `security-validation.md`:

1. **Performance**: Uso de `(SELECT auth.uid())` em vez de `auth.uid()` direto
2. **Segurança**: RLS habilitado em todas as tabelas
3. **Limpeza**: Remoção de TODAS as políticas antigas antes de criar novas
4. **Validação**: Verificação automática de duplicatas após criação

## 🚨 Troubleshooting

### Se ainda houver erro 406:

1. **Verificar políticas duplicadas**:
```sql
SELECT tablename, cmd, COUNT(*) 
FROM pg_policies 
WHERE tablename IN ('banco_horas_calculos', 'banco_horas_calculos_segmentados')
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
```

2. **Limpar cache do Supabase**:
   - Vá para o Dashboard do Supabase
   - Settings → API → Restart API

3. **Verificar permissões do usuário**:
```sql
SELECT * FROM auth.users WHERE id = auth.uid();
```

4. **Verificar se o usuário está autenticado**:
   - Verifique se o token JWT está válido
   - Verifique se o header `Authorization: Bearer <token>` está presente

## 📚 Referências

- **Steering**: `.kiro/steering/security-validation.md`
- **Padrão de Políticas RLS**: Seção "Checklist de Migration de Políticas RLS"
- **Otimizações de Performance**: Seção "🚀 OTIMIZAÇÕES DE PERFORMANCE"

## 🔄 Rollback (Se Necessário)

Se precisar reverter as mudanças:

```sql
-- Remover políticas criadas
DROP POLICY IF EXISTS "authenticated_select_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_calculos" ON banco_horas_calculos;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_calculos" ON banco_horas_calculos;

DROP POLICY IF EXISTS "authenticated_select_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
DROP POLICY IF EXISTS "authenticated_insert_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
DROP POLICY IF EXISTS "authenticated_update_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
DROP POLICY IF EXISTS "authenticated_delete_banco_horas_segmentados" ON banco_horas_calculos_segmentados;
```

## ✨ Próximos Passos

Após aplicar as migrations:

1. ✅ Testar requisições no frontend
2. ✅ Verificar se erro 406 foi resolvido
3. ✅ Monitorar logs do Supabase
4. ✅ Documentar mudanças no changelog

---

**Data de Criação**: 2026-02-18  
**Autor**: Kiro Architect  
**Versão**: 1.0.0
