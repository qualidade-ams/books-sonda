# Implementação da Extensão da Tabela historico_disparos para Suporte a Anexos

## Resumo da Implementação

Esta implementação estende a tabela `historico_disparos` para suportar anexos no sistema de disparos personalizados, conforme especificado na tarefa 2.2 do plano de implementação.

## Alterações Realizadas

### 1. Migração do Banco de Dados

**Arquivo:** `supabase/migration/historico_disparos_anexos_extension.sql`

- ✅ Adicionadas colunas `anexo_id` e `anexo_processado` à tabela `historico_disparos`
- ✅ Criado relacionamento com a tabela `anexos_temporarios`
- ✅ Implementados índices otimizados para consultas de anexos
- ✅ Criadas funções SQL para sincronização automática de status
- ✅ Implementadas funções para consulta de histórico com anexos
- ✅ Adicionadas funções para estatísticas de anexos por período

#### Colunas Adicionadas:
```sql
anexo_id UUID REFERENCES anexos_temporarios(id) ON DELETE SET NULL
anexo_processado BOOLEAN DEFAULT FALSE
```

#### Índices Criados:
- `idx_historico_disparos_anexo_id`
- `idx_historico_disparos_anexo_processado`
- `idx_historico_disparos_empresa_anexo`

#### Funções SQL Implementadas:
- `sync_anexo_status_historico()` - Sincronização automática de status
- `buscar_historico_com_anexos()` - Consulta otimizada com JOIN
- `estatisticas_anexos_periodo()` - Estatísticas de uso de anexos

### 2. Atualização dos Tipos TypeScript

**Arquivo:** `src/integrations/supabase/types.ts`

- ✅ Adicionadas colunas `anexo_id` e `anexo_processado` nos tipos Row, Insert e Update
- ✅ Adicionado relacionamento com `anexos_temporarios`

**Arquivo:** `src/types/clientBooks.ts`

- ✅ Atualizada interface `HistoricoDisparoComAnexo` para incluir dados completos do anexo

### 3. Extensão dos Serviços

**Arquivo:** `src/services/historicoService.ts`

Novos métodos implementados:

#### `buscarHistoricoComAnexos()`
```typescript
async buscarHistoricoComAnexos(
  empresaId?: string,
  mesReferencia?: Date,
  limit: number = 50,
  offset: number = 0
): Promise<any[]>
```
- Utiliza a função SQL `buscar_historico_com_anexos` para consultas otimizadas
- Retorna histórico com informações completas dos anexos

#### `buscarEstatisticasAnexos()`
```typescript
async buscarEstatisticasAnexos(dataInicio: Date, dataFim: Date): Promise<{
  totalAnexos: number;
  anexosProcessados: number;
  anexosComErro: number;
  anexosPendentes: number;
  tamanhoTotalMb: number;
  empresasComAnexos: number;
}>
```
- Utiliza a função SQL `estatisticas_anexos_periodo`
- Retorna métricas de uso de anexos por período

**Arquivo:** `src/services/booksDisparoService.ts`

Novos métodos implementados:

#### `registrarHistoricoComAnexo()`
```typescript
async registrarHistoricoComAnexo(
  empresaId: string,
  clienteId: string,
  templateId: string,
  status: StatusDisparo,
  anexoId?: string,
  dadosAdicionais?: {
    assunto?: string;
    emailsCC?: string[];
    erroDetalhes?: string;
    dataDisparo?: string;
  }
): Promise<void>
```
- Registra histórico de disparo com suporte a anexos
- Inclui automaticamente as novas colunas `anexo_id` e `anexo_processado`

#### `atualizarStatusAnexoHistorico()`
```typescript
async atualizarStatusAnexoHistorico(
  historicoId: string,
  anexoProcessado: boolean,
  erroDetalhes?: string
): Promise<void>
```
- Atualiza o status de processamento do anexo no histórico
- Permite registrar detalhes de erro quando necessário

### 4. Testes Implementados

**Arquivo:** `src/test/integration/historicoDisparosAnexos.test.ts`
- ✅ Testes de tipos TypeScript para as novas colunas
- ✅ Validação de interfaces e tipos de dados
- ✅ Verificação de compatibilidade com anexos opcionais

**Arquivo:** `src/services/__tests__/historicoAnexosService.test.ts`
- ✅ Testes unitários para `historicoService.buscarHistoricoComAnexos()`
- ✅ Testes unitários para `historicoService.buscarEstatisticasAnexos()`
- ✅ Testes unitários para `booksDisparoService.registrarHistoricoComAnexo()`
- ✅ Testes unitários para `booksDisparoService.atualizarStatusAnexoHistorico()`
- ✅ Cobertura de cenários de sucesso e erro

## Funcionalidades Implementadas

### 1. Relacionamento com Anexos
- A tabela `historico_disparos` agora pode referenciar anexos via `anexo_id`
- Relacionamento opcional (permite NULL) para manter compatibilidade

### 2. Controle de Status de Processamento
- Campo `anexo_processado` indica se o anexo foi processado pelo Power Automate
- Sincronização automática via triggers SQL

### 3. Consultas Otimizadas
- Função SQL `buscar_historico_com_anexos` para consultas com JOIN otimizado
- Índices específicos para melhorar performance de consultas de anexos

### 4. Estatísticas e Métricas
- Função SQL para calcular estatísticas de uso de anexos
- Métricas por período: total, processados, com erro, pendentes, tamanho total

### 5. Integração com Serviços Existentes
- Métodos auxiliares no `booksDisparoService` para registrar histórico com anexos
- Compatibilidade total com fluxos existentes (anexos são opcionais)

## Requisitos Atendidos

### Requisito 2.3 - Integração com Webhook do Power Automate
- ✅ Campo `anexo_id` permite rastrear qual anexo foi enviado no webhook
- ✅ Campo `anexo_processado` permite confirmar processamento pelo Power Automate
- ✅ Triggers automáticos sincronizam status entre tabelas

### Requisito 8.3 - Histórico e Auditoria
- ✅ Todos os disparos com anexos são registrados no histórico
- ✅ Status de processamento é rastreado e auditado
- ✅ Funções SQL permitem consultas detalhadas para auditoria

## Compatibilidade

### Retrocompatibilidade
- ✅ Todas as funcionalidades existentes continuam funcionando
- ✅ Colunas de anexo são opcionais (permitem NULL)
- ✅ Disparos sem anexos não são afetados

### Migração de Dados Existentes
- ✅ Dados existentes na tabela `historico_disparos` não são afetados
- ✅ Novas colunas têm valores padrão apropriados
- ✅ Índices são criados sem impacto em dados existentes

## Próximos Passos

Esta implementação prepara a base para as próximas tarefas do sistema de anexos:

1. **Tarefa 3.1** - Implementar `AnexoService` com operações básicas
2. **Tarefa 4.1** - Criar componente `AnexoUpload` 
3. **Tarefa 6.1** - Integrar anexos na tela de disparos personalizados
4. **Tarefa 7.1** - Modificar `BooksDisparoService` para processar anexos

## Verificação da Implementação

Para verificar se a implementação está funcionando:

1. **Executar testes:**
   ```bash
   npm run test -- src/test/integration/historicoDisparosAnexos.test.ts --run
   npm run test -- src/services/__tests__/historicoAnexosService.test.ts --run
   ```

2. **Verificar tipos TypeScript:**
   - Os tipos devem compilar sem erros
   - Intellisense deve mostrar as novas colunas `anexo_id` e `anexo_processado`

3. **Testar métodos dos serviços:**
   ```typescript
   // Exemplo de uso
   await booksDisparoService.registrarHistoricoComAnexo(
     'empresa-id',
     'cliente-id', 
     'template-id',
     'enviado',
     'anexo-id'
   );
   ```

## Status da Tarefa

✅ **CONCLUÍDA** - Tarefa 2.2 "Estender tabela historico_disparos para suportar anexos"

- ✅ Campos `anexo_id` e `anexo_processado` adicionados
- ✅ Relacionamento com `anexos_temporarios` criado
- ✅ Migração implementada e testada
- ✅ Tipos TypeScript atualizados
- ✅ Serviços estendidos com novos métodos
- ✅ Testes implementados e passando
- ✅ Documentação completa

A implementação está pronta para integração com as próximas tarefas do sistema de anexos.