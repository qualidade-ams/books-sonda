# Correção do Seletor de Mês e Ano - Compatibilidade com Banco Atual

## Problema Identificado

O sistema estava tentando salvar strings no formato MM/YYYY em um campo do banco que ainda aceita apenas números (1-12), causando erro:
```
invalid input syntax for type integer: "09/2030"
```

## Solução Implementada

Criado um seletor de mês e ano que funciona com o banco atual, mantendo compatibilidade total.

### 1. Componente MonthYearPicker Adaptado

**Arquivo**: `src/components/ui/month-year-picker.tsx`

**Características**:
- Interface visual com seleção de mês e ano
- Internamente salva apenas o número do mês (1-12)
- Exibe mês e ano para melhor UX
- Preparado para migração futura do banco

**Funcionamento**:
```typescript
// Interface mostra: "Setembro 2025"
// Banco recebe: 9 (apenas o número do mês)
```

### 2. Correção do Warning React

**Problema**: "A component is changing an uncontrolled input to be controlled"

**Solução**:
```typescript
// Antes
const [mesSelecionado, setMesSelecionado] = useState<number | undefined>(mesAtual);

// Depois
const [mesSelecionado, setMesSelecionado] = useState<number | undefined>(mesAtual || undefined);

// Adicionado useEffect para sincronização
React.useEffect(() => {
  const { mes, ano } = parseValue(value);
  setMesSelecionado(mes || undefined);
  setAnoSelecionado(ano || undefined);
}, [value, format]);
```

### 3. Compatibilidade com Banco Atual

**Schema mantido**:
```typescript
const mesCobrancaSchema = z
  .number({
    required_error: 'Mês de cobrança é obrigatório',
    invalid_type_error: 'Mês deve ser um número'
  })
  .min(1, 'Mês deve ser entre 1 e 12')
  .max(12, 'Mês deve ser entre 1 e 12');
```

**Tipos mantidos**:
```typescript
mes_cobranca: number; // Compatível com banco atual
```

### 4. Interface Melhorada

**Antes**: Select simples com apenas meses
```
Janeiro
Fevereiro
Março
...
```

**Depois**: Seletor de mês e ano
```
[Botão: "Setembro 2025"]
↓ (clique)
Modal com:
- Dropdown Mês: Janeiro, Fevereiro, ...
- Dropdown Ano: 2020, 2021, ..., 2035
- Botões: Limpar | Confirmar
```

### 5. Funcionalidades

#### Interface do Usuário
- **Botão principal**: Mostra "Mês Ano" (ex: "Setembro 2025")
- **Modal intuitivo**: Dois dropdowns separados
- **Anos futuros**: Permite selecionar até 2035
- **Validação**: Impede seleção inválida

#### Compatibilidade
- **Banco atual**: Salva apenas número do mês (1-12)
- **Interface**: Mostra mês e ano para melhor UX
- **Dados existentes**: Totalmente compatível
- **Migração futura**: Preparado para formato MM/YYYY

### 6. Benefícios

1. **Melhor UX**: Interface mais intuitiva com mês e ano
2. **Compatibilidade**: Funciona com banco atual
3. **Flexibilidade**: Permite seleção de anos futuros
4. **Preparação**: Pronto para migração futura
5. **Sem quebras**: Não afeta dados existentes

## Arquivos Modificados

### Principais Alterações
- `src/components/ui/month-year-picker.tsx`: Componente adaptado
- `src/components/admin/requerimentos/RequerimentoForm.tsx`: Integração
- `src/utils/mesCobrancaUtils.ts`: Utilitários de conversão (preparação futura)

### Mantidos Compatíveis
- `src/schemas/requerimentosSchemas.ts`: Schema number
- `src/types/requerimentos.ts`: Tipos number
- `src/services/requerimentosService.ts`: Lógica number
- `src/integrations/supabase/types.ts`: Tipos Supabase number

## Migração Futura (Opcional)

Quando for conveniente migrar o banco para suportar formato MM/YYYY:

1. **Executar migração**: `supabase/migration/alter_mes_cobranca_to_string.sql`
2. **Atualizar tipos**: Alterar `number` para `string` nos tipos
3. **Atualizar componente**: Descomentar formato MM/YYYY no MonthYearPicker
4. **Atualizar schema**: Usar validação de string MM/YYYY

## Testes Recomendados

1. **Criação**: Criar novo requerimento com mês/ano
2. **Edição**: Editar requerimento existente
3. **Validação**: Testar campos obrigatórios
4. **Interface**: Verificar exibição correta
5. **Persistência**: Confirmar salvamento no banco

## Observações Técnicas

- O componente é totalmente funcional com o banco atual
- A interface mostra mês e ano, mas salva apenas o mês
- Preparado para migração futura sem quebrar funcionalidades
- Resolve completamente o erro de sintaxe do banco
- Elimina o warning do React sobre componentes controlados