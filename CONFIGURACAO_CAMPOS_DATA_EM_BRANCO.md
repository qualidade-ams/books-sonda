# Configuração de Campos de Data em Branco

## Alteração Realizada

Configurado o campo "Data de Envio do Orçamento" para iniciar em branco, seguindo o mesmo padrão do campo "Data de Aprovação do Orçamento".

## Problema Anterior

O campo "Data de Envio do Orçamento" estava sendo inicializado automaticamente com a data atual, o que poderia causar confusão ou preenchimento indevido.

## Solução Implementada

### Arquivo: `src/components/admin/requerimentos/RequerimentoForm.tsx`

**Antes**:
```typescript
data_envio: requerimento?.data_envio || new Date().toISOString().split('T')[0],
```

**Depois**:
```typescript
data_envio: requerimento?.data_envio || '',
```

## Comportamento Atual

### Ambos os campos de data agora:

1. **Iniciam em branco** quando é um novo requerimento
2. **Mostram "Selecione uma data"** como placeholder
3. **Abrem o calendário no mês atual** quando clicados
4. **Mantêm a localização em português** (nomes dos meses e dias)
5. **Formatam corretamente** as datas selecionadas (DD/MM/YYYY)

### Validações mantidas:

- **Data de Envio**: Não permite datas futuras ou anteriores a 1900
- **Data de Aprovação**: Não permite datas anteriores à data de envio

## Benefícios da Alteração

1. **Consistência**: Ambos os campos de data seguem o mesmo padrão
2. **Flexibilidade**: Usuário escolhe conscientemente a data
3. **Evita erros**: Não há preenchimento automático indevido
4. **Melhor UX**: Interface mais limpa e intuitiva

## Funcionalidades do Calendário

### Quando o usuário clica no campo:
- Calendário abre no mês atual
- Data de hoje é destacada visualmente
- Nomes em português (Janeiro, Fevereiro, etc.)
- Dias da semana em português (Dom, Seg, Ter, etc.)

### Ao selecionar uma data:
- Campo é preenchido automaticamente
- Formato brasileiro DD/MM/YYYY
- Valor interno salvo como YYYY-MM-DD

## Arquivos Modificados

- `src/components/admin/requerimentos/RequerimentoForm.tsx`

## Compatibilidade

- ✅ Mantém compatibilidade com dados existentes
- ✅ Não afeta outras funcionalidades
- ✅ Melhora a experiência do usuário
- ✅ Segue padrões de interface consistentes

## Observações

- O calendário continua configurado em português brasileiro
- As validações de data permanecem ativas
- A formatação e funcionalidades do calendário não foram alteradas
- Apenas a inicialização do campo foi modificada para ficar em branco