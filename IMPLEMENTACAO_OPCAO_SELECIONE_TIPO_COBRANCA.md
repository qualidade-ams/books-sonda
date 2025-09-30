# Implementação da Opção "Selecione" no Tipo de Cobrança

## Funcionalidade Implementada

Adicionada a opção "Selecione" como primeira opção no campo "Tipo de Cobrança" com comportamento específico para criação e envio de requerimentos.

## Características da Implementação

### 1. **Nova Opção "Selecione"**
- ✅ Adicionada como primeira opção na lista
- ✅ Definida como valor padrão para novos requerimentos
- ✅ Cor cinza clara para indicar estado não selecionado

### 2. **Comportamento da Seção "Valores por Hora"**
- ✅ **Oculta quando "Selecione" está selecionado**
- ✅ **Visível normalmente** para outros tipos que requerem valor/hora
- ✅ Lógica condicional: `tipoCobranca !== 'Selecione' && requerValorHora(tipoCobranca)`

### 3. **Validação no Envio para Faturamento**
- ✅ **Criação permitida** com "Selecione"
- ✅ **Envio bloqueado** se ainda for "Selecione"
- ✅ Mensagem de erro específica: "É necessário selecionar um tipo de cobrança válido antes de enviar para faturamento"

### 4. **Sistema de Cores Atualizado**
- ✅ Cor específica para "Selecione": cinza claro (#9CA3AF)
- ✅ Integração completa com sistema de cores existente
- ✅ Suporte a todos os componentes (badges, cards, botões)

## Arquivos Modificados

### 1. **Tipos e Constantes**
**`src/types/requerimentos.ts`**
```typescript
// Adicionado "Selecione" como primeiro tipo
export type TipoCobrancaType = 'Selecione' | 'Banco de Horas' | ...

// Adicionado às opções do select
export const TIPO_COBRANCA_OPTIONS = [
  { value: 'Selecione', label: 'Selecione' },
  // ... outros tipos
];
```

### 2. **Schema de Validação**
**`src/schemas/requerimentosSchemas.ts`**
```typescript
// Permitido "Selecione" na validação do schema
const tipoCobrancaSchema = z.enum([
  'Selecione',
  'Banco de Horas', 
  // ... outros tipos
]);
```

### 3. **Componente de Formulário**
**`src/components/admin/requerimentos/RequerimentoForm.tsx`**
```typescript
// Valor padrão alterado para "Selecione"
tipo_cobranca: requerimento?.tipo_cobranca || 'Selecione',

// Lógica condicional para mostrar campos de valor
const mostrarCamposValor = useMemo(() => {
  return tipoCobranca !== 'Selecione' && requerValorHora(tipoCobranca);
}, [tipoCobranca]);

// Cor específica para "Selecione"
'Selecione': 'bg-gray-50 text-gray-500 border-gray-200',
```

### 4. **Serviço de Validação**
**`src/services/requerimentosService.ts`**
```typescript
// Validação no envio para faturamento
if (requerimento.tipo_cobranca === 'Selecione') {
  throw new Error('É necessário selecionar um tipo de cobrança válido antes de enviar para faturamento');
}
```

### 5. **Sistema de Cores**
**`src/utils/requerimentosColors.ts`**
```typescript
// Cores específicas para "Selecione"
'Selecione': {
  bg: 'bg-gray-25',
  border: 'border-gray-100',
  text: 'text-gray-400',
  badge: 'bg-gray-300',
  hover: 'hover:bg-gray-50',
  ring: 'ring-gray-100'
},

// Cor hexadecimal para gráficos
'Selecione': '#9CA3AF', // gray-400
```

## Fluxo de Trabalho

### 1. **Criação de Requerimento**
```
1. Usuário abre formulário → "Selecione" aparece como padrão
2. Seção "Valores por Hora" fica oculta
3. Usuário pode salvar requerimento normalmente
4. Badge cinza indica estado não finalizado
```

### 2. **Edição de Requerimento**
```
1. Usuário edita requerimento existente
2. Deve escolher tipo específico de cobrança
3. Seção "Valores por Hora" aparece se necessário
4. Badge muda de cor conforme tipo selecionado
```

### 3. **Envio para Faturamento**
```
1. Usuário tenta enviar para faturamento
2. Sistema valida se tipo não é "Selecione"
3. Se válido → Envia normalmente
4. Se inválido → Mostra erro e bloqueia envio
```

## Benefícios da Implementação

### 1. **Melhor UX**
- ✅ Estado inicial claro e intuitivo
- ✅ Campos desnecessários ficam ocultos
- ✅ Validação clara no momento certo

### 2. **Fluxo de Trabalho Flexível**
- ✅ Permite salvar rascunhos incompletos
- ✅ Força completude antes do faturamento
- ✅ Não quebra funcionalidades existentes

### 3. **Validação Inteligente**
- ✅ Validação contextual (criação vs envio)
- ✅ Mensagens de erro específicas
- ✅ Prevenção de dados inconsistentes

### 4. **Compatibilidade Total**
- ✅ Funciona com dados existentes
- ✅ Não afeta requerimentos já criados
- ✅ Sistema de cores integrado

## Testes Recomendados

### 1. **Criação de Requerimento**
- [ ] Verificar se "Selecione" aparece como padrão
- [ ] Confirmar que seção "Valores por Hora" fica oculta
- [ ] Testar salvamento com "Selecione"

### 2. **Seleção de Tipos**
- [ ] Testar mudança para cada tipo de cobrança
- [ ] Verificar aparição/ocultação da seção de valores
- [ ] Confirmar cores corretas para cada tipo

### 3. **Validação de Envio**
- [ ] Tentar enviar requerimento com "Selecione"
- [ ] Verificar mensagem de erro específica
- [ ] Confirmar que envio é bloqueado

### 4. **Envio Múltiplo**
- [ ] Testar envio múltiplo com mix de tipos
- [ ] Verificar se requerimentos com "Selecione" são rejeitados
- [ ] Confirmar que outros são enviados normalmente

## Status da Implementação

✅ **Tipos atualizados**
✅ **Schema validação**
✅ **Componente formulário**
✅ **Serviço validação**
✅ **Sistema de cores**
✅ **Build bem-sucedido**
✅ **Documentação completa**

A funcionalidade está completamente implementada e pronta para uso!