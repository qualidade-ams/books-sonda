# Resolver Erro 406 e Problemas de Conectividade

## 🚨 Problemas Identificados

Baseado nos logs fornecidos:

1. **Erro 406 (Not Acceptable)** no Supabase:
   ```
   GET https://qiahexepsdggkzgmklhq.supabase.co/rest/v1/pesquisas_satisfacao?select=created_at&origem=eq.sql_server&order=created_at.desc&limit=1 406
   ```

2. **Erro de Conexão** com API local:
   ```
   GET http://localhost:3001/health net::ERR_CONNECTION_REFUSED
   ```

3. **Timeout** no fallback da API

## ⚡ Correção Imediata

### Passo 1: Corrigir Vulnerabilidades de Segurança

Execute primeiro o script de correção de emergência:

```sql
-- Execute no SQL Editor do Supabase
\i supabase/scripts/emergency_security_fix.sql
```

### Passo 2: Corrigir Especificamente o Erro 406

Execute o script específico para a tabela `pesquisas_satisfacao`:

```sql
-- Execute no SQL Editor do Supabase  
\i supabase/scripts/fix_pesquisas_satisfacao_406.sql
```

### Passo 3: Verificar Correção das Funções

Execute a verificação simples:

```sql
-- Execute no SQL Editor do Supabase
\i supabase/scripts/check_vulnerabilities_simple.sql
```

## 🔍 Diagnóstico dos Problemas

### Erro 406 - Causas Possíveis:

1. **Tabela Inexistente**: A tabela `pesquisas_satisfacao` pode não existir
2. **RLS Mal Configurado**: Tabela com RLS habilitado mas sem políticas
3. **Funções de Permissão Vulneráveis**: Funções como `has_screen_permission` sem `search_path`
4. **Políticas RLS Inseguras**: Políticas que bloqueiam acesso legítimo

### API Local (localhost:3001):

1. **Servidor Não Iniciado**: A API local não está rodando
2. **Porta Ocupada**: Conflito de porta
3. **Configuração Incorreta**: Problemas na configuração da API

## 🛠️ Soluções Específicas

### Para Erro 406:

```sql
-- 1. Verificar se tabela existe
SELECT * FROM information_schema.tables WHERE table_name = 'pesquisas_satisfacao';

-- 2. Se não existir, será criada pelo script fix_pesquisas_satisfacao_406.sql

-- 3. Verificar RLS
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'pesquisas_satisfacao';

-- 4. Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'pesquisas_satisfacao';

-- 5. Testar query que estava falhando
SELECT created_at FROM pesquisas_satisfacao WHERE origem = 'sql_server' ORDER BY created_at DESC LIMIT 1;
```

### Para API Local:

```bash
# 1. Verificar se há processo rodando na porta 3001
netstat -ano | findstr :3001

# 2. Iniciar a API local (se existir)
npm run api:start
# ou
yarn api:start

# 3. Verificar configuração da API no código
# Procurar por arquivos de configuração da API local
```

## 📋 Checklist de Resolução

### ✅ Segurança:
- [ ] Script `emergency_security_fix.sql` executado
- [ ] Todas as funções SECURITY DEFINER têm `search_path = public`
- [ ] Query de verificação retorna 0 vulnerabilidades

### ✅ Tabela pesquisas_satisfacao:
- [ ] Script `fix_pesquisas_satisfacao_406.sql` executado
- [ ] Tabela existe e tem estrutura adequada
- [ ] RLS configurado com políticas seguras
- [ ] Query de teste funciona sem erro 406

### ✅ Conectividade:
- [ ] Erro 406 resolvido no Supabase
- [ ] API local funcionando (se necessária)
- [ ] Aplicação consegue conectar normalmente

## 🧪 Testes de Validação

### Teste 1: Verificar Supabase
```sql
-- Deve retornar dados sem erro 406
SELECT COUNT(*) FROM pesquisas_satisfacao;
```

### Teste 2: Verificar API Local
```bash
# Deve retornar status 200
curl http://localhost:3001/health
```

### Teste 3: Verificar Aplicação
- Recarregar a página da aplicação
- Verificar se não há mais erros 406 no console
- Testar funcionalidades que usam `pesquisas_satisfacao`

## 🚨 Se os Problemas Persistirem

### 1. Logs Detalhados:
- Verificar logs completos no Dashboard do Supabase
- Verificar console do navegador para erros específicos
- Verificar logs da API local (se existir)

### 2. Configuração de Rede:
- Verificar se não há proxy/firewall bloqueando
- Testar conectividade direta com o Supabase
- Verificar configuração de CORS

### 3. Rollback Temporário:
```sql
-- Se necessário, desabilitar RLS temporariamente
ALTER TABLE pesquisas_satisfacao DISABLE ROW LEVEL SECURITY;

-- Reabilitar após correção
ALTER TABLE pesquisas_satisfacao ENABLE ROW LEVEL SECURITY;
```

## 📞 Suporte Adicional

Se os problemas persistirem após seguir este guia:

1. **Execute todos os scripts na ordem**
2. **Documente os erros específicos** que ainda ocorrem
3. **Verifique logs do Supabase Dashboard**
4. **Teste com usuário diferente** se possível

---

**Status Esperado Após Correção**: ✅ Conectividade restaurada, erro 406 resolvido, sistema funcionando normalmente.