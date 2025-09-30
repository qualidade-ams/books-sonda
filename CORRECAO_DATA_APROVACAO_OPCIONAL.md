# Correção: Data de Aprovação Opcional

## Problema Identificado
O sistema estava apresentando erro ao tentar criar requerimentos:
```
Erro ao criar requerimento: Error: Dados inválidos: Data de aprovação é obrigatória
```

## Causa Raiz
O problema tinha duas origens:

### 1. **Validação Incorreta no Serviço**
A função `validarDadosRequerimento` estava incorretamente exigindo a data de aprovação como obrigatória:

```typescript
// ❌ Código problemático
if (!isUpdate || data.data_aprovacao !== undefined) {
  if (!data.data_aprovacao) {
    errors.push('Data de aprovação é obrigatória');
  }
}
```

### 2. **Estrutura do Banco de Dados**
A migração original definiu `data_aprovacao` como `NOT NULL`:

```sql
-- ❌ Definição problemática
data_aprovacao DATE NOT NULL,
```

### 3. **Tratamento de String Vazia**
O formulário enviava string vazia `''` mas o serviço não tratava adequadamente para converter em `null`.

## Soluções Implementadas

### 1. **Correção da Validação do Serviço**
Removida a validação obrigatória da data de aprovação:

```typescript
// ✅ Correção aplicada
// Data de aprovação é opcional - não validar se obrigatória
// Apenas validar se fornecida e se é válida em relação à data de envio
```

### 2. **Migração do Banco de Dados**
Criada migração para tornar o campo opcional:

```sql
-- ✅ Migração: fix_data_aprovacao_optional.sql
ALTER TABLE requerimentos 
ALTER COLUMN data_aprovacao DROP NOT NULL;

COMMENT ON COLUMN requerimentos.data_aprovacao IS 'Data de aprovação do orçamento (opcional)';
```

### 3. **Tratamento de Dados no Serviço**
Ajustado o tratamento para converter string vazia em `null`:

```typescript
// ✅ Correção na criação
data_aprovacao: data.data_aprovacao?.trim() || null,

// ✅ Correção na atualização
if (data.data_aprovacao !== undefined) 
  updateData.data_aprovacao = data.data_aprovacao?.trim() || null;
```

## Validações Mantidas

### 1. **Schema Zod**
O schema já estava correto, permitindo valores opcionais:

```typescript
// ✅ Schema correto
data_aprovacao: dataOpcionalSchema, // z.string().optional().or(z.literal(''))
```

### 2. **Validação de Consistência**
Mantida a validação de que data de aprovação deve ser >= data de envio (quando fornecida):

```typescript
// ✅ Validação mantida
if (data.data_envio && data.data_aprovacao) {
  const dataEnvio = new Date(data.data_envio);
  const dataAprovacao = new Date(data.data_aprovacao);
  
  if (dataAprovacao < dataEnvio) {
    errors.push('Data de aprovação não pode ser anterior à data de envio');
  }
}
```

## Comportamento Esperado

### Cenários Válidos
1. **Sem data de aprovação**: Campo vazio → `null` no banco ✅
2. **Com data de aprovação**: Data válida → data no banco ✅
3. **Data de aprovação >= data de envio**: Validação passa ✅
4. **Data de aprovação < data de envio**: Erro de validação ❌

### Interface do Usuário
- Campo "Data de Aprovação do Orçamento" é opcional
- Descrição: "Campo opcional. Deve ser igual ou posterior à data de envio."
- Input nativo de data com validação de min/max

## Arquivos Modificados

### Serviço
- **Arquivo**: `src/services/requerimentosService.ts`
- **Alterações**:
  - Removida validação obrigatória de `data_aprovacao`
  - Adicionado tratamento para converter string vazia em `null`
  - Mantida validação de consistência entre datas

### Migração
- **Arquivo**: `supabase/migration/fix_data_aprovacao_optional.sql` (novo)
- **Alterações**:
  - `ALTER COLUMN data_aprovacao DROP NOT NULL`
  - Comentário atualizado
  - Log de auditoria

### Schema (já estava correto)
- **Arquivo**: `src/schemas/requerimentosSchemas.ts`
- **Status**: ✅ Já permitia valores opcionais

### Formulário (já estava correto)
- **Arquivo**: `src/components/admin/requerimentos/RequerimentoForm.tsx`
- **Status**: ✅ Já inicializava como string vazia

## Testes Recomendados

### Casos de Teste
1. **Criar requerimento sem data de aprovação**
   - Deixar campo vazio
   - Salvar
   - ✅ Deve funcionar normalmente

2. **Criar requerimento com data de aprovação**
   - Preencher data >= data de envio
   - Salvar
   - ✅ Deve funcionar normalmente

3. **Validação de consistência**
   - Preencher data de aprovação < data de envio
   - Tentar salvar
   - ❌ Deve mostrar erro de validação

4. **Editar requerimento**
   - Alterar data de aprovação
   - Salvar
   - ✅ Deve funcionar normalmente

## Execução da Migração

Para aplicar a correção no banco de dados:

```sql
-- Executar a migração
\i supabase/migration/fix_data_aprovacao_optional.sql
```

Ou via interface do Supabase:
1. Abrir SQL Editor
2. Executar o conteúdo do arquivo `fix_data_aprovacao_optional.sql`

## Verificação da Correção

### Verificar Estrutura do Banco
```sql
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_name = 'requerimentos' 
AND column_name = 'data_aprovacao';

-- Resultado esperado: is_nullable = 'YES'
```

### Testar Inserção
```sql
-- Deve funcionar sem erro
INSERT INTO requerimentos (
  chamado, cliente_id, modulo, descricao, 
  data_envio, data_aprovacao, -- NULL aqui
  horas_funcional, horas_tecnico, 
  linguagem, tipo_cobranca, mes_cobranca
) VALUES (
  'TEST-001', 'uuid-cliente', 'Comply', 'Teste',
  '2025-01-15', NULL, -- ✅ NULL permitido
  8, 2, 'Funcional', 'Banco de Horas', 1
);
```

## Conclusão

A correção resolve completamente o problema de data de aprovação obrigatória, permitindo que os usuários criem requerimentos sem precisar informar a data de aprovação, conforme especificado nos requisitos do sistema. A validação de consistência entre as datas foi mantida para garantir a integridade dos dados.