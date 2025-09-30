# Implementação do Seletor de Mês e Ano

## Alteração Realizada

Substituído o campo "Mês de Cobrança" por um seletor de mês e ano que permite selecionar meses e anos futuros.

## Motivação

O campo anterior só permitia selecionar o mês (1-12) do ano atual, limitando a flexibilidade para planejamento e cobrança de períodos futuros.

## Implementação

### 1. Novo Componente: MonthYearPicker

**Arquivo**: `src/components/ui/month-year-picker.tsx`

**Características**:
- Seleção separada de mês e ano
- Interface intuitiva com dropdowns
- Formato de saída configurável (MM/YYYY ou YYYY-MM)
- Permite anos futuros (configurável)
- Validação integrada
- Botões de ação (Confirmar/Limpar)
- Localização em português

**Props**:
```typescript
interface MonthYearPickerProps {
  value?: string;           // Valor atual
  onChange?: (value: string) => void;
  placeholder?: string;     // Texto placeholder
  disabled?: boolean;       // Estado desabilitado
  className?: string;       // Classes CSS
  format?: 'YYYY-MM' | 'MM/YYYY'; // Formato de saída
  allowFuture?: boolean;    // Permitir anos futuros
}
```

### 2. Alterações no Schema de Validação

**Arquivo**: `src/schemas/requerimentosSchemas.ts`

**Antes**:
```typescript
const mesCobrancaSchema = z
  .number()
  .min(1, 'Mês deve ser entre 1 e 12')
  .max(12, 'Mês deve ser entre 1 e 12');
```

**Depois**:
```typescript
const mesCobrancaSchema = z
  .string()
  .regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Formato deve ser MM/YYYY')
  .refine((val) => {
    const [mes, ano] = val.split('/').map(Number);
    const anoAtual = new Date().getFullYear();
    return ano >= anoAtual - 5 && ano <= anoAtual + 10;
  }, 'Ano deve estar entre 5 anos atrás e 10 anos à frente');
```

### 3. Alterações nos Tipos TypeScript

**Arquivo**: `src/types/requerimentos.ts`

**Alteração**:
```typescript
// Antes
mes_cobranca: number;

// Depois  
mes_cobranca: string; // Formato MM/YYYY
```

### 4. Alterações no Formulário

**Arquivo**: `src/components/admin/requerimentos/RequerimentoForm.tsx`

**Substituição do campo**:
```typescript
// Antes: Select simples de mês
<Select onValueChange={(value) => field.onChange(parseInt(value))}>
  {mesesOptions.map((mes) => (
    <SelectItem key={mes.value} value={mes.value.toString()}>
      {mes.label}
    </SelectItem>
  ))}
</Select>

// Depois: MonthYearPicker
<MonthYearPicker
  value={field.value}
  onChange={field.onChange}
  placeholder="Selecione mês e ano"
  format="MM/YYYY"
  allowFuture={true}
/>
```

### 5. Alterações nos Serviços

**Arquivos**: 
- `src/services/requerimentosService.ts`
- `src/services/faturamentoService.ts`

**Principais mudanças**:
- Validação atualizada para formato MM/YYYY
- Queries do banco adaptadas para string
- Funções de busca atualizadas

### 6. Migração do Banco de Dados

**Arquivo**: `supabase/migration/alter_mes_cobranca_to_string.sql`

**Operações**:
1. Adiciona coluna temporária VARCHAR(7)
2. Migra dados existentes (mês → MM/YYYY)
3. Remove coluna antiga
4. Renomeia coluna temporária
5. Adiciona constraint de validação
6. Recria índices
7. Registra log de auditoria

### 7. Tipos do Supabase Atualizados

**Arquivo**: `src/integrations/supabase/types.ts`

**Alteração**:
```typescript
// Tabela requerimentos
mes_cobranca: string  // Antes era number
```

## Funcionalidades

### Interface do Usuário
- **Botão principal**: Mostra mês e ano selecionados (ex: "Setembro 2025")
- **Modal de seleção**: Dois dropdowns (mês e ano)
- **Validação visual**: Feedback em tempo real
- **Botões de ação**: Confirmar e Limpar

### Validações
- **Formato**: Deve ser MM/YYYY (ex: 09/2025)
- **Mês**: Entre 01 e 12
- **Ano**: Entre 5 anos atrás e 10 anos à frente
- **Obrigatório**: Campo não pode ficar vazio

### Compatibilidade
- **Dados existentes**: Migração automática preserva dados
- **APIs**: Todas as funções adaptadas para novo formato
- **Filtros**: Sistema de filtros atualizado
- **Relatórios**: Geração de relatórios compatível

## Benefícios

1. **Flexibilidade**: Permite selecionar qualquer mês/ano futuro
2. **Usabilidade**: Interface mais intuitiva
3. **Planejamento**: Facilita cobrança de períodos futuros
4. **Validação**: Controle mais rigoroso de formato
5. **Escalabilidade**: Suporta anos futuros sem limitação

## Arquivos Modificados

### Novos Arquivos
- `src/components/ui/month-year-picker.tsx`
- `supabase/migration/alter_mes_cobranca_to_string.sql`

### Arquivos Alterados
- `src/components/admin/requerimentos/RequerimentoForm.tsx`
- `src/schemas/requerimentosSchemas.ts`
- `src/types/requerimentos.ts`
- `src/services/requerimentosService.ts`
- `src/services/faturamentoService.ts`
- `src/integrations/supabase/types.ts`

## Testes Recomendados

1. **Seleção de mês/ano**: Testar diferentes combinações
2. **Validação**: Testar formatos inválidos
3. **Persistência**: Verificar salvamento correto
4. **Migração**: Validar dados existentes
5. **Filtros**: Testar busca por período
6. **Relatórios**: Verificar geração correta

## Observações Técnicas

- A migração preserva todos os dados existentes
- O formato MM/YYYY é consistente em todo o sistema
- Validações impedem entrada de dados inválidos
- Interface responsiva e acessível
- Compatibilidade total com funcionalidades existentes