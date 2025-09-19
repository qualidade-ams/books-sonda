# Correção: Cache Dinâmico e Filtros de Empresas

## Problemas Identificados

### 1. Cache Não Dinâmico
- Alterações na empresa não refletiam imediatamente em outras telas
- Era necessário Ctrl+F5 para limpar cache e ver mudanças
- Exemplo: Alterar "Tipo de Book" para "Não tem Book" não removia empresa da tela de Disparos

### 2. Filtro de AMS
- Empresas com "Tem AMS = Não" deveriam ser filtradas da tela de Disparos
- Filtro já existia no backend mas cache não era invalidado

## Soluções Implementadas

### 1. Invalidação de Cache Cross-Screen

#### Problema:
```typescript
// ❌ ANTES: Invalidava apenas cache de empresas
onSuccess: async (_, { id }) => {
  await queryClient.invalidateQueries({ queryKey: ['empresas'] });
  await queryClient.invalidateQueries({ queryKey: ['empresa', id] });
  await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });
}
```

#### Solução:
```typescript
// ✅ DEPOIS: Invalida cache de todas as telas relacionadas
onSuccess: async (_, { id }) => {
  // Cache de empresas
  await queryClient.invalidateQueries({ queryKey: ['empresas'] });
  await queryClient.invalidateQueries({ queryKey: ['empresa', id] });
  await queryClient.invalidateQueries({ queryKey: ['empresas-stats'] });
  
  // ✅ ADICIONADO: Cache da tela de controle de disparos
  await queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
  
  // ✅ ADICIONADO: Cache de histórico de disparos
  await queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
}
```

### 2. Mutations Atualizadas

#### Todas as mutations de empresa agora invalidam cache cross-screen:

1. **Criar Empresa** (`createMutation`)
2. **Atualizar Empresa** (`updateMutation`)
3. **Deletar Empresa** (`deleteMutation`)
4. **Alteração em Lote** (`batchUpdateMutation`)
5. **Importação de Empresas** (`importarEmpresasMutation`)

### 3. Cache Mais Responsivo

#### Configuração Otimizada:
```typescript
// ✅ ANTES: Cache longo, sem refetch automático
staleTime: 1000 * 60 * 5, // 5 minutos
refetchOnWindowFocus: false,

// ✅ DEPOIS: Cache mais curto, refetch automático
staleTime: 1000 * 60 * 1, // 1 minuto
refetchOnWindowFocus: true, // Refetch ao focar na janela
```

### 4. Filtros Corretos no Backend

#### Filtro de AMS e Tipo de Book:
```sql
-- ✅ JÁ IMPLEMENTADO: Filtro correto no serviço
.or('tem_ams.eq.true,tipo_book.eq.qualidade')
```

**Empresas que aparecem na tela de Disparos:**
- ✅ `tem_ams = true` (independente do tipo de book)
- ✅ `tipo_book = 'qualidade'` (independente do AMS)
- ❌ `tem_ams = false` E `tipo_book != 'qualidade'`

## Fluxo de Invalidação Implementado

### Cenário: Usuário edita empresa

1. **Usuário altera empresa** (ex: "Tem AMS" de Sim → Não)
2. **Mutation executa** com sucesso
3. **Cache invalidado automaticamente**:
   - ✅ Tela de Empresas Clientes
   - ✅ Tela de Controle de Disparos
   - ✅ Tela de Histórico
   - ✅ Estatísticas
4. **Dados recarregados** automaticamente
5. **Interface atualizada** imediatamente

### Resultado:
- ✅ **Sem Ctrl+F5**: Mudanças aparecem automaticamente
- ✅ **Tempo Real**: Interface sempre sincronizada
- ✅ **Filtros Corretos**: Empresas aparecem/desaparecem conforme regras

## Arquivos Modificados

### 1. `src/hooks/useEmpresas.ts`
- ✅ **createMutation**: Invalida cache de disparos
- ✅ **updateMutation**: Invalida cache de disparos e histórico
- ✅ **deleteMutation**: Invalida cache de disparos
- ✅ **batchUpdateMutation**: Invalida cache de disparos
- ✅ **importarEmpresasMutation**: Invalida cache de disparos

### 2. `src/hooks/useControleDisparos.ts`
- ✅ **staleTime**: Reduzido de 5min → 1min
- ✅ **refetchOnWindowFocus**: Habilitado para true

## Regras de Negócio Implementadas

### Empresas na Tela de Disparos:

#### ✅ **Aparecem**:
- Empresas com `tem_ams = true` (qualquer tipo de book)
- Empresas com `tipo_book = 'qualidade'` (qualquer AMS)
- Empresas com `status = 'ativo'`
- Empresas com clientes ativos

#### ❌ **Não Aparecem**:
- Empresas com `tem_ams = false` E `tipo_book != 'qualidade'`
- Empresas com `status != 'ativo'`
- Empresas sem clientes ativos

### Exemplos Práticos:

| Tem AMS | Tipo Book | Aparece na Tela? |
|---------|-----------|------------------|
| ✅ Sim  | Qualidade | ✅ **SIM** |
| ✅ Sim  | Outros    | ✅ **SIM** |
| ✅ Sim  | Não tem   | ✅ **SIM** |
| ❌ Não  | Qualidade | ✅ **SIM** |
| ❌ Não  | Outros    | ❌ **NÃO** |
| ❌ Não  | Não tem   | ❌ **NÃO** |

## Benefícios da Correção

### 1. **Experiência do Usuário**
- ✅ Interface sempre atualizada
- ✅ Sem necessidade de refresh manual
- ✅ Mudanças refletem imediatamente

### 2. **Consistência de Dados**
- ✅ Todas as telas sincronizadas
- ✅ Filtros aplicados corretamente
- ✅ Cache invalidado automaticamente

### 3. **Performance Otimizada**
- ✅ Cache mais responsivo (1min vs 5min)
- ✅ Refetch automático ao focar janela
- ✅ Invalidação seletiva e eficiente

### 4. **Manutenibilidade**
- ✅ Lógica centralizada de invalidação
- ✅ Código mais robusto e previsível
- ✅ Fácil adicionar novas telas

## Teste da Correção

### Cenário de Teste:
1. **Abrir tela de Empresas Clientes**
2. **Abrir tela de Controle de Disparos** (em outra aba)
3. **Editar empresa**: Alterar "Tem AMS" de Sim → Não
4. **Salvar alterações**
5. **Verificar tela de Disparos**: Empresa deve sumir automaticamente
6. **Sem Ctrl+F5**: Mudança deve ser imediata

### Resultado Esperado:
- ✅ **Antes**: Empresa aparecia na tela de Disparos
- ✅ **Depois**: Empresa desaparece automaticamente
- ✅ **Sem refresh**: Mudança instantânea

## Status da Correção

✅ **CONCLUÍDO** - Cache dinâmico implementado
- Invalidação cross-screen funcionando
- Filtros de AMS e Tipo de Book aplicados corretamente
- Cache mais responsivo (1 minuto)
- Interface sempre sincronizada
- Experiência do usuário melhorada significativamente

## Próximos Passos (Opcionais)

1. **Monitorar Performance**: Verificar impacto da invalidação frequente
2. **Otimizar Queries**: Considerar subscription em tempo real
3. **Feedback Visual**: Adicionar indicadores de sincronização
4. **Logs de Debug**: Monitorar invalidações de cache