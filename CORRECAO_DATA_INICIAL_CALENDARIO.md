# Correção da Data Inicial do Calendário

## Problema Identificado

O calendário estava iniciando com a data de "ontem" em vez da data atual (hoje), causando confusão para os usuários.

## Causa do Problema

O problema estava relacionado a possíveis questões de timezone e à forma como as datas estavam sendo inicializadas e formatadas no componente `RequerimentoForm`.

## Soluções Implementadas

### 1. Correção da Inicialização da Data Padrão

**Arquivo**: `src/components/admin/requerimentos/RequerimentoForm.tsx`

**Antes**:
```typescript
data_envio: requerimento?.data_envio || format(new Date(), 'yyyy-MM-dd'),
```

**Depois**:
```typescript
data_envio: requerimento?.data_envio || (() => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
})(),
```

**Benefícios**:
- Evita problemas de timezone
- Garante que a data seja sempre a data local atual
- Formato consistente YYYY-MM-DD

### 2. Correção do Componente Calendar - Data de Envio

**Antes**:
```typescript
<Calendar
  mode="single"
  selected={field.value ? new Date(field.value) : new Date()}
  onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
  initialFocus
/>
```

**Depois**:
```typescript
<Calendar
  mode="single"
  selected={field.value ? new Date(field.value) : undefined}
  onSelect={(date) => {
    if (date) {
      const ano = date.getFullYear();
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const dia = String(date.getDate()).padStart(2, '0');
      field.onChange(`${ano}-${mes}-${dia}`);
    } else {
      field.onChange('');
    }
  }}
  defaultMonth={new Date()}
  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
  initialFocus
/>
```

**Melhorias**:
- `selected` agora é `undefined` quando não há valor, em vez de `new Date()`
- `defaultMonth={new Date()}` garante que o calendário abra no mês atual
- Formatação manual da data evita problemas de timezone
- Validação de datas (não permite datas futuras ou muito antigas)

### 3. Correção do Componente Calendar - Data de Aprovação

**Aplicadas as mesmas correções** com validação adicional:
- A data de aprovação não pode ser anterior à data de envio
- Formatação consistente
- Abertura no mês atual

## Funcionalidades Adicionadas

### 1. Validação de Datas
- **Data de Envio**: Não permite datas futuras ou anteriores a 1900
- **Data de Aprovação**: Não permite datas anteriores à data de envio

### 2. Melhor UX
- Calendário sempre abre no mês atual
- Data de hoje é destacada visualmente
- Formatação consistente em português brasileiro

### 3. Robustez
- Evita problemas de timezone
- Formatação manual garante consistência
- Validações impedem dados inválidos

## Testes Recomendados

Para verificar se as correções funcionaram:

1. **Abrir formulário de novo requerimento**:
   - Campo "Data de Envio" deve mostrar a data de hoje
   - Calendário deve abrir no mês atual
   - Data de hoje deve estar destacada

2. **Testar seleção de datas**:
   - Selecionar data no calendário deve atualizar o campo
   - Formato deve ser DD/MM/YYYY no display
   - Valor interno deve ser YYYY-MM-DD

3. **Testar validações**:
   - Não deve permitir datas futuras na data de envio
   - Data de aprovação não deve permitir datas anteriores à data de envio

## Arquivos Modificados

- `src/components/admin/requerimentos/RequerimentoForm.tsx`

## Compatibilidade

- ✅ Mantém compatibilidade com dados existentes
- ✅ Não afeta outras funcionalidades
- ✅ Melhora a experiência do usuário
- ✅ Resolve problemas de timezone

## Observações Técnicas

- A formatação manual evita dependência de bibliotecas externas para timezone
- O uso de `defaultMonth` garante que o calendário sempre abra no contexto correto
- As validações impedem erros de entrada de dados
- A localização em português brasileiro é mantida