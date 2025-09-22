# Correção do Cache do Histórico e Relatório Mensal

## Problema Identificado
O relatório mensal não atualizava automaticamente após o envio de books, sendo necessário pressionar Ctrl+F5 para forçar a atualização dos dados. Isso acontecia devido a configurações de cache muito conservadoras no TanStack Query.

## Soluções Implementadas

### 1. Redução do Tempo de Cache (staleTime)
**Arquivo:** `src/hooks/useHistorico.ts`

**Antes:**
```typescript
staleTime: 1000 * 60 * 2, // 2 minutos
staleTime: 1000 * 60 * 5, // 5 minutos
```

**Depois:**
```typescript
staleTime: 1000 * 30, // ✅ 30 segundos
```

### 2. Habilitação de Refetch Automático
**Arquivo:** `src/hooks/useHistorico.ts`

**Adicionado:**
```typescript
refetchOnWindowFocus: true, // ✅ Refetch ao focar na janela
refetchInterval: 1000 * 60, // ✅ Refetch automático a cada 1 minuto
```

### 3. Invalidação Agressiva de Cache nos Disparos
**Arquivos:** 
- `src/hooks/useControleDisparos.ts`
- `src/hooks/useControleDisparosPersonalizados.ts`

**Implementada função para invalidar todos os caches relacionados:**
```typescript
const invalidateAllCaches = () => {
  queryClient.invalidateQueries({ queryKey: ['controle-disparos'] });
  queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
  queryClient.invalidateQueries({ queryKey: ['relatorio-mensal'] });
  queryClient.invalidateQueries({ queryKey: ['estatisticas-performance'] });
  queryClient.invalidateQueries({ queryKey: ['empresas-sem-books'] });
  queryClient.invalidateQueries({ queryKey: ['clientes-com-falhas'] });
};
```

### 4. Nova Função de Invalidação no Hook de Histórico
**Arquivo:** `src/hooks/useHistorico.ts`

**Adicionada função para invalidação externa:**
```typescript
const invalidateHistoricoCache = () => {
  queryClient.invalidateQueries({ queryKey: ['historico-disparos'] });
  queryClient.invalidateQueries({ queryKey: ['relatorio-mensal'] });
  queryClient.invalidateQueries({ queryKey: ['estatisticas-performance'] });
  queryClient.invalidateQueries({ queryKey: ['empresas-sem-books'] });
  queryClient.invalidateQueries({ queryKey: ['clientes-com-falhas'] });
};
```

### 5. Melhoria no Hook de Controle de Disparos
**Arquivo:** `src/hooks/useControleDisparos.ts`

**Configurações otimizadas:**
```typescript
staleTime: 1000 * 60 * 1, // ✅ 1 minuto (era 5 minutos)
refetchOnWindowFocus: true, // ✅ Habilitado
```

## Estratégias de Cache Implementadas

### Cache Inteligente
- **Dados Dinâmicos:** 30 segundos de cache para histórico e relatórios
- **Dados Estáticos:** Mantido cache mais longo para dados que mudam pouco
- **Refetch Automático:** A cada 1 minuto para dados críticos

### Invalidação Cascata
Quando um disparo é executado, invalida automaticamente:
1. Cache de controle de disparos
2. Cache de histórico de disparos
3. Cache de relatório mensal
4. Cache de estatísticas de performance
5. Cache de empresas sem books
6. Cache de clientes com falhas

### Refetch Inteligente
- **Window Focus:** Atualiza dados ao focar na janela
- **Interval:** Atualização automática em background
- **Manual:** Botão de atualizar mantido para controle do usuário

## Benefícios da Implementação

### ✅ **Atualização Automática**
- Dados atualizados automaticamente após disparos
- Não é mais necessário Ctrl+F5

### ✅ **Performance Balanceada**
- Cache otimizado para reduzir requisições desnecessárias
- Atualização rápida quando necessário

### ✅ **Experiência do Usuário**
- Interface sempre atualizada
- Feedback visual imediato após ações

### ✅ **Confiabilidade**
- Múltiplas camadas de atualização
- Fallback manual sempre disponível

## Configurações Finais

### Tempos de Cache
- **Histórico/Relatórios:** 30 segundos
- **Controle de Disparos:** 1 minuto
- **Estatísticas:** 30 segundos

### Estratégias de Refetch
- **Window Focus:** Habilitado para todos os dados críticos
- **Interval:** 1 minuto para dados dinâmicos
- **Invalidação:** Automática após todas as operações de disparo

### Queries Invalidadas Automaticamente
1. `['controle-disparos']`
2. `['controle-disparos-personalizados']`
3. `['historico-disparos']`
4. `['relatorio-mensal']`
5. `['estatisticas-performance']`
6. `['empresas-sem-books']`
7. `['clientes-com-falhas']`

## Resultado
O sistema agora atualiza automaticamente o relatório mensal e histórico após o envio de books, eliminando a necessidade de refresh manual (Ctrl+F5) e proporcionando uma experiência mais fluida e confiável para o usuário.

## Arquivos Modificados
- `src/hooks/useHistorico.ts` - Cache otimizado e refetch automático
- `src/hooks/useControleDisparos.ts` - Invalidação agressiva de cache
- `src/hooks/useControleDisparosPersonalizados.ts` - Invalidação agressiva de cache

## Teste
Para testar a correção:
1. Acesse a página "Histórico e Relatórios"
2. Gere um relatório mensal
3. Vá para a página de "Disparos" e envie books
4. Retorne ao relatório - deve atualizar automaticamente
5. Ou aguarde até 1 minuto para atualização automática