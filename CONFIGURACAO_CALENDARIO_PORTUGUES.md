# Configuração de Calendários em Português

## Alterações Realizadas

### 1. Componente Calendar (src/components/ui/calendar.tsx)

Adicionada configuração de localização portuguesa ao componente base `Calendar`:

```typescript
import { ptBR } from "date-fns/locale";

// No componente DayPicker:
<DayPicker
  showOutsideDays={showOutsideDays}
  className={cn("p-3", className)}
  locale={ptBR}  // ← Adicionado
  classNames={{
    // ... resto das configurações
  }}
  // ...
/>
```

### 2. Configurações Existentes

O projeto já possui as seguintes configurações de localização:

- **HTML**: `<html lang="pt-BR">` no `index.html`
- **date-fns**: Uso do `ptBR` para formatação de datas nos formulários
- **Formatação**: Uso de `toLocaleDateString('pt-BR')` em vários serviços

### 3. Componentes Afetados

Os seguintes componentes agora exibem calendários em português:

- **RequerimentoForm**: Campos "Data de Envio do Orçamento" e "Data de Aprovação do Orçamento"
- **Qualquer outro componente** que use o componente `Calendar` base

### 4. Funcionalidades

Com essas alterações, os calendários agora exibem:

- **Nomes dos meses em português**: Janeiro, Fevereiro, Março, etc.
- **Nomes dos dias da semana em português**: Dom, Seg, Ter, Qua, Qui, Sex, Sáb
- **Formatação de datas brasileira**: DD/MM/YYYY
- **Primeira semana começando no domingo** (padrão brasileiro)

### 5. Inputs HTML5 de Data

Os inputs HTML5 do tipo `date` (como os filtros de data) respeitam automaticamente a configuração do navegador e o atributo `lang="pt-BR"` do HTML.

### 6. Testes

Para verificar se as alterações funcionaram:

1. Acesse qualquer formulário com campos de data (ex: Lançar Requerimentos)
2. Clique no ícone de calendário nos campos de data
3. Verifique se os nomes dos meses e dias estão em português

### 7. Compatibilidade

- ✅ **React Day Picker**: Configurado com locale ptBR
- ✅ **date-fns**: Já configurado para português brasileiro
- ✅ **HTML5 date inputs**: Respeitam configuração do navegador
- ✅ **Formatação de datas**: Padrão brasileiro DD/MM/YYYY

## Arquivos Modificados

- `src/components/ui/calendar.tsx`: Adicionada configuração `locale={ptBR}`

## Dependências

- `date-fns`: Biblioteca já instalada
- `react-day-picker`: Biblioteca já instalada

## Observações

- As alterações são retrocompatíveis
- Não afetam a funcionalidade existente
- Melhoram a experiência do usuário brasileiro
- Seguem as boas práticas de internacionalização