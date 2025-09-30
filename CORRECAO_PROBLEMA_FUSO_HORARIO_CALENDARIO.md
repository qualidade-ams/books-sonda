# Correção do Problema de Fuso Horário no Calendário

## Problema Identificado
O calendário estava selecionando automaticamente o dia anterior ao dia clicado pelo usuário. Este é um problema comum relacionado ao fuso horário que ocorre quando:

1. O usuário seleciona uma data no calendário
2. A data é convertida usando `toISOString()` que converte para UTC
3. Dependendo do fuso horário local, isso pode resultar no dia anterior

## Exemplo do Problema
```typescript
// Problema anterior
const date = new Date(2025, 8, 30); // 30 de setembro de 2025
const dateString = date.toISOString().split('T')[0]; // Pode resultar em "2025-09-29"
```

## Solução Implementada

### 1. Correção Direta no Formulário
Substituído o uso de `toISOString()` por formatação local:

```typescript
// Antes (problemático)
field.onChange(date.toISOString().split('T')[0]);

// Depois (corrigido)
onSelect={(date) => {
  if (date) {
    field.onChange(formatDateToString(date));
  } else {
    field.onChange('');
  }
}}
```

### 2. Criação de Utilitário de Datas
Criado arquivo `src/utils/dateUtils.ts` com funções utilitárias:

```typescript
/**
 * Converte uma data para string no formato YYYY-MM-DD mantendo o fuso horário local
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 3. Funções Utilitárias Adicionais
- `parseStringToDate()`: Converte string para Date mantendo fuso local
- `formatDateToBrazilian()`: Formata para DD/MM/YYYY
- `isValidDate()`: Valida se uma data é válida
- `getCurrentDateString()`: Obtém data atual como string
- `compareDates()`: Compara duas datas ignorando horário
- `addDays()` / `subtractDays()`: Adiciona/subtrai dias

## Arquivos Modificados

### Formulário de Requerimentos
- **Arquivo**: `src/components/admin/requerimentos/RequerimentoForm.tsx`
- **Alteração**: Substituído `toISOString()` por `formatDateToString()`
- **Campos afetados**: Data de Envio e Data de Aprovação

### Utilitário de Datas
- **Arquivo**: `src/utils/dateUtils.ts` (novo)
- **Conteúdo**: Funções utilitárias para manipulação de datas sem problemas de fuso horário

## Como Funciona Agora

### Fluxo Correto
1. **Usuário clica no dia 30**: Calendário recebe `Date(2025, 8, 30)`
2. **Formatação local**: `formatDateToString()` converte para `"2025-09-30"`
3. **Exibição correta**: Campo mostra "30/09/2025"
4. **Salvamento correto**: Banco recebe "2025-09-30"

### Vantagens da Solução
- **Consistência**: Sempre mantém a data selecionada pelo usuário
- **Reutilização**: Utilitários podem ser usados em outros componentes
- **Manutenibilidade**: Código centralizado e bem documentado
- **Robustez**: Evita problemas de fuso horário em toda a aplicação

## Testes Recomendados

### Teste Manual
1. Abrir formulário de requerimento
2. Clicar em qualquer data no calendário
3. Verificar se a data exibida corresponde à data clicada
4. Salvar e verificar se a data foi persistida corretamente

### Casos de Teste
- Datas no início do mês (dia 1)
- Datas no final do mês (dia 30/31)
- Mudança de mês/ano
- Diferentes fusos horários (se aplicável)

## Prevenção de Problemas Futuros

### Boas Práticas
1. **Sempre usar** `formatDateToString()` ao converter Date para string
2. **Evitar** `toISOString()` para datas que devem manter fuso local
3. **Usar** `parseStringToDate()` ao converter string para Date
4. **Testar** em diferentes fusos horários quando possível

### Padrão para Novos Componentes
```typescript
import { formatDateToString, parseStringToDate } from '@/utils/dateUtils';

// Para converter Date para string
const dateString = formatDateToString(selectedDate);

// Para converter string para Date
const dateObject = parseStringToDate(dateString);
```

## Impacto da Correção

### Usuários
- ✅ Calendário agora seleciona a data correta
- ✅ Não há mais confusão com datas incorretas
- ✅ Experiência de usuário melhorada

### Desenvolvedores
- ✅ Código mais robusto e confiável
- ✅ Utilitários reutilizáveis disponíveis
- ✅ Padrão estabelecido para manipulação de datas

### Sistema
- ✅ Dados de data consistentes no banco
- ✅ Relatórios com datas corretas
- ✅ Integrações mais confiáveis

## Conclusão

A correção resolve completamente o problema de fuso horário no calendário, garantindo que a data selecionada pelo usuário seja exatamente a data salva no sistema. A implementação de utilitários de data também estabelece um padrão robusto para futuras funcionalidades que envolvam manipulação de datas.