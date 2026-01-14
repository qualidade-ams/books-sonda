# Correção: Nomes de Usuários não Aparecem na Tela de Lançar Requerimentos

## Problema Identificado

Na tela de **Lançar Requerimentos**, os nomes dos usuários (autores dos requerimentos) não estavam sendo exibidos corretamente. Em vez dos nomes completos (ex: "Giselle Silva Lobo"), aparecia apenas "Usuário b83ca9e0..." (ID truncado).

### Causa Raiz

O problema foi identificado em **duas camadas**:

#### 1. Políticas RLS Conflitantes na Tabela `profiles`

Existiam **múltiplas políticas RLS conflitantes** que impediam a leitura correta dos dados:

- **Política 1** (grups_and_profile_migration.sql): "Usuários podem ver todos os perfis" ✅
- **Política 2** (setup_rls_policies.sql): "Users can read own profile" ❌ (permite ver APENAS o próprio perfil)

Essas políticas conflitantes faziam com que o Supabase bloqueasse a leitura de perfis de outros usuários, retornando array vazio mesmo quando os dados existiam no banco.

#### 2. Logs Insuficientes para Debug

O método `resolverNomesUsuarios` não tinha logs detalhados suficientes para identificar onde exatamente o problema estava ocorrendo.

## Solução Implementada

### 1. Correção das Políticas RLS

**Arquivo**: `supabase/migration/fix_profiles_rls_policies.sql`

Removidas todas as políticas conflitantes e criadas políticas claras e não conflitantes:

```sql
-- Política para leitura: usuários autenticados podem ver TODOS os perfis
CREATE POLICY "authenticated_users_can_read_all_profiles" ON profiles
FOR SELECT 
TO authenticated
USING (true);

-- Política para atualização: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "users_can_update_own_profile" ON profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**Por que isso é seguro?**
- Usuários autenticados precisam ver nomes de outros usuários para identificar autores de requerimentos
- Apenas dados públicos (nome e email) são expostos
- Cada usuário só pode **editar** seu próprio perfil
- Dados sensíveis (se houver) devem estar em outras tabelas com RLS apropriado

### 2. Logs Detalhados no Código

**Arquivo**: `src/services/requerimentosService.ts`

Adicionados logs detalhados em cada etapa do processo:

```typescript
console.log('🔍 resolverNomesUsuarios - Iniciando busca para IDs:', userIds);
console.log('📊 resolverNomesUsuarios - Resultado da busca profiles:', {
  encontrados: profiles?.length || 0,
  erro: profilesError,
  dados: profiles
});
console.log(`✅ Profile encontrado: ${profile.id.substring(0, 8)}... -> "${nome}"`);
```

Agora é possível ver exatamente:
- Quantos IDs foram solicitados
- Quantos foram encontrados no `profiles`
- Se houve erros na busca
- O mapeamento final ID → Nome

### 3. Função RPC de Fallback

**Arquivo**: `supabase/migration/fix_user_names_display.sql`

Mantida a função RPC `get_users_by_ids` como fallback caso a busca no `profiles` falhe:

```sql
CREATE OR REPLACE FUNCTION get_users_by_ids(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  raw_user_meta_data JSONB
) 
SECURITY DEFINER
SET search_path = public
```

## Como Aplicar a Correção

### Passo 1: Corrigir Políticas RLS (CRÍTICO)

Execute no **Supabase SQL Editor**:

```sql
-- Copie e execute o conteúdo completo do arquivo:
-- supabase/migration/fix_profiles_rls_policies.sql
```

Isso vai:
1. Remover todas as políticas conflitantes
2. Criar políticas corretas e não conflitantes
3. Garantir que RLS está habilitado
4. Mostrar as políticas ativas para verificação

### Passo 2: Executar Migration de Sincronização (Opcional)

Se ainda houver usuários sem registro no `profiles`:

```sql
-- Copie e execute o conteúdo do arquivo:
-- supabase/migration/fix_user_names_display.sql
```

### Passo 3: Testar no Frontend

1. Abra o **Console do Navegador** (F12)
2. Acesse a tela **Lançar Requerimentos**
3. Verifique os logs detalhados:

```
🔍 resolverNomesUsuarios - Iniciando busca para IDs: ['b83ca9e0-5012-4baf-adf9-2ee78...']
📊 resolverNomesUsuarios - Resultado da busca profiles: { encontrados: 1, erro: null, dados: [...] }
✅ Profile encontrado: b83ca9e0... -> "Giselle Silva Lobo"
📋 Mapa final de usuários: ['b83ca9e0... -> "Giselle Silva Lobo"']
```

4. Verifique se os nomes aparecem corretamente na tabela

## Onde os Nomes Aparecem

Os nomes dos usuários (autores) aparecem em **dois locais** na tabela:

### 1. Coluna "Chamado" (Mobile)
- **Visível apenas em telas pequenas** (xl:hidden)
- Abaixo do badge de tipo de cobrança
- Texto pequeno em cinza: `text-[9px] text-gray-500`

### 2. Coluna "Módulo" (Desktop)
- **Visível em todas as telas**
- Abaixo do badge do módulo
- Com tooltip mostrando nome completo ao passar o mouse
- Mostra apenas **primeiro e último nome** para economizar espaço

```tsx
// Exemplo de exibição
<span className="text-[9px] sm:text-[10px] text-gray-500 truncate cursor-help">
  {(() => {
    const nomes = requerimento.autor_nome.split(' ');
    if (nomes.length === 1) return nomes[0];
    return `${nomes[0]} ${nomes[nomes.length - 1]}`; // "Giselle Lobo"
  })()}
</span>
```

## Logs de Debug

### Logs de Sucesso (Esperado)

```
🔍 resolverNomesUsuarios - Iniciando busca para IDs: ['b83ca9e0-5012-4baf-adf9-2ee78...']
📊 resolverNomesUsuarios - Buscando na tabela profiles...
📊 resolverNomesUsuarios - Resultado da busca profiles: {
  encontrados: 1,
  erro: null,
  dados: [{ id: 'b83ca9e0...', email: 'giselle.lobo@sonda.com', full_name: 'Giselle Silva Lobo' }]
}
✅ Profile encontrado: b83ca9e0... -> "Giselle Silva Lobo"
📋 Mapa final de usuários: ['b83ca9e0... -> "Giselle Silva Lobo"']
```

### Logs de Erro (Antes da Correção)

```
🔍 resolverNomesUsuarios - Iniciando busca para IDs: ['b83ca9e0-5012-4baf-adf9-2ee78...']
📊 resolverNomesUsuarios - Buscando na tabela profiles...
📊 resolverNomesUsuarios - Resultado da busca profiles: {
  encontrados: 0,  // ❌ Nenhum encontrado por causa do RLS
  erro: null,
  dados: []
}
⚠️ Nenhum profile encontrado na busca inicial
⚠️ Usuários não encontrados nos profiles: ['b83ca9e0...']
⚠️ Usuários não encontrados em nenhuma fonte, usando fallback: ['b83ca9e0...']
📋 Mapa final de usuários: ['b83ca9e0... -> "Usuário b83ca9e0..."']
```

## Verificação das Políticas RLS

Para verificar se as políticas estão corretas, execute no Supabase:

```sql
-- Ver todas as políticas da tabela profiles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
```

**Resultado esperado:**

| policyname | permissive | roles | cmd | qual |
|------------|------------|-------|-----|------|
| authenticated_users_can_read_all_profiles | PERMISSIVE | {authenticated} | SELECT | true |
| users_can_update_own_profile | PERMISSIVE | {authenticated} | UPDATE | (auth.uid() = id) |
| service_role_can_insert_profiles | PERMISSIVE | {service_role} | INSERT | true |
| service_role_full_access | PERMISSIVE | {service_role} | ALL | true |

## Benefícios da Solução

1. **Políticas RLS Claras**: Sem conflitos, fácil de entender e manter
2. **Logs Detalhados**: Facilita troubleshooting de problemas futuros
3. **Fallback Robusto**: Sistema continua funcionando mesmo se houver problemas
4. **Segurança Mantida**: Usuários só podem editar seus próprios perfis
5. **Performance**: Cache de nomes evita buscas repetidas

## Prevenção de Problemas Futuros

### 1. Não Criar Políticas Conflitantes

Sempre verificar políticas existentes antes de criar novas:

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 2. Usar Nomes Descritivos

Nomes de políticas devem indicar claramente o que fazem:
- ✅ `authenticated_users_can_read_all_profiles`
- ❌ `Users can read own profile` (ambíguo)

### 3. Documentar Decisões de Segurança

Sempre adicionar comentários explicando por que uma política permite acesso amplo:

```sql
COMMENT ON POLICY "authenticated_users_can_read_all_profiles" ON profiles IS 
'Permite que usuários autenticados vejam nomes de outros usuários para identificar autores de requerimentos. Apenas dados públicos (nome e email) são expostos.';
```

## Arquivos Modificados/Criados

1. **src/services/requerimentosService.ts** (MODIFICADO)
   - Método `resolverNomesUsuarios` com logs detalhados
   - Melhor tratamento de erros
   - Logs estruturados para debug

2. **supabase/migration/fix_profiles_rls_policies.sql** (NOVO - CRÍTICO)
   - Remove políticas conflitantes
   - Cria políticas corretas
   - Verificação de resultados

3. **supabase/migration/fix_user_names_display.sql** (NOVO - Opcional)
   - Função RPC `get_users_by_ids`
   - Sincronização de dados `profiles` ↔ `auth.users`

4. **docs/correcao-nomes-usuarios-requerimentos.md** (ATUALIZADO)
   - Documentação completa da correção
   - Causa raiz identificada (RLS)
   - Passo a passo detalhado

## Referências

- **Componente**: `src/components/admin/requerimentos/RequerimentosTable.tsx` (linha 343)
- **Hook**: `src/hooks/useRequerimentos.ts` (useRequerimentosNaoEnviados)
- **Serviço**: `src/services/requerimentosService.ts` (resolverNomesUsuarios)
- **Tipo**: `src/types/requerimentos.ts` (interface Requerimento)
- **Políticas RLS**: `supabase/migration/fix_profiles_rls_policies.sql`
