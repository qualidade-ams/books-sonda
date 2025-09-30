# Implementação do Sistema de Tickets para Banco de Horas

## Resumo
Implementação completa do sistema de tickets para o tipo de cobrança "Banco de Horas" no sistema de requerimentos, permitindo controle granular de tickets por requerimento.

## Funcionalidades Implementadas

### 1. Campos de Banco de Dados
- **tem_ticket**: Campo booleano que indica se o requerimento possui tickets
- **quantidade_tickets**: Campo inteiro para armazenar a quantidade de tickets (1-9999)
- **Constraint de consistência**: Garante que quantidade_tickets só seja preenchida quando tem_ticket=true

### 2. Validações de Negócio
- Campos de ticket só são habilitados para tipo de cobrança "Banco de Horas"
- Quando "Ticket" está marcado, quantidade de tickets é obrigatória
- Quantidade deve ser um número inteiro entre 1 e 9999
- Quando "Ticket" está desmarcado, quantidade deve ser nula

### 3. Interface do Usuário

#### Formulário de Requerimentos
- **Seção "Controle de Tickets"**: Aparece apenas quando tipo de cobrança é "Banco de Horas"
- **Checkbox "Ticket"**: Habilita/desabilita o controle de tickets
- **Campo "Quantidade de Tickets"**: Aparece apenas quando checkbox está marcado
- **Validação em tempo real**: Limpa quantidade automaticamente ao desmarcar checkbox

#### Visualização em Cards
- **Indicador visual**: Emoji 🎫 aparece no badge do tipo de cobrança quando há tickets
- **Tooltip informativo**: Mostra quantidade de tickets ao passar o mouse sobre o emoji

### 4. Estrutura Técnica

#### Migração de Banco de Dados
```sql
-- Arquivo: supabase/migration/add_ticket_fields_requerimentos.sql
ALTER TABLE requerimentos 
ADD COLUMN tem_ticket BOOLEAN DEFAULT FALSE,
ADD COLUMN quantidade_tickets INTEGER DEFAULT NULL;

-- Constraint de consistência
ALTER TABLE requerimentos 
ADD CONSTRAINT check_ticket_consistency 
CHECK (
  (tem_ticket = FALSE AND quantidade_tickets IS NULL) OR
  (tem_ticket = TRUE AND quantidade_tickets IS NOT NULL AND quantidade_tickets > 0)
);
```

#### Tipos TypeScript
```typescript
// Adicionado em src/types/requerimentos.ts
export interface Requerimento {
  // ... outros campos
  tem_ticket?: boolean;
  quantidade_tickets?: number;
}

// Função utilitária
export const permiteTickets = (tipoCobranca: TipoCobrancaType): boolean => {
  return tipoCobranca === 'Banco de Horas';
};
```

#### Schema de Validação Zod
```typescript
// Adicionado em src/schemas/requerimentosSchemas.ts
tem_ticket: z.boolean().optional(),
quantidade_tickets: z
  .number({
    invalid_type_error: 'Quantidade deve ser um número inteiro'
  })
  .int('Quantidade deve ser um número inteiro')
  .min(1, 'Quantidade deve ser maior que zero')
  .max(9999, 'Quantidade não pode exceder 9999')
  .optional()

// Validação customizada de consistência
.refine((data) => {
  if (data.tipo_cobranca === 'Banco de Horas' && data.tem_ticket === true) {
    if (!data.quantidade_tickets || data.quantidade_tickets <= 0) {
      return false;
    }
  }
  
  if (data.tem_ticket !== true && data.quantidade_tickets) {
    return false;
  }
  
  return true;
}, {
  message: 'Quando "Ticket" está marcado, é obrigatório informar a quantidade de tickets',
  path: ['quantidade_tickets']
})
```

### 5. Regras de Negócio

#### Quando Exibir Campos de Ticket
- **Condição**: `tipo_cobranca === 'Banco de Horas'`
- **Comportamento**: Seção "Controle de Tickets" aparece automaticamente

#### Validações de Consistência
1. **tem_ticket = false**: quantidade_tickets deve ser null/undefined
2. **tem_ticket = true**: quantidade_tickets deve ser > 0 e <= 9999
3. **Outros tipos de cobrança**: Campos de ticket não são exibidos nem salvos

#### Comportamento da Interface
1. **Ao selecionar "Banco de Horas"**: Seção de tickets aparece
2. **Ao marcar checkbox "Ticket"**: Campo quantidade aparece
3. **Ao desmarcar checkbox**: Campo quantidade é limpo automaticamente
4. **Ao mudar tipo de cobrança**: Campos de ticket são resetados

### 6. Testes Implementados

#### Casos de Teste Cobertos
```javascript
// Banco de Horas sem ticket
{
  tipo_cobranca: 'Banco de Horas',
  tem_ticket: false,
  quantidade_tickets: null
}

// Banco de Horas com ticket
{
  tipo_cobranca: 'Banco de Horas',
  tem_ticket: true,
  quantidade_tickets: 5
}

// Validação de quantidades (1-9999)
// Outros tipos não permitem tickets
```

### 7. Arquivos Modificados

#### Backend/Serviços
- `supabase/migration/add_ticket_fields_requerimentos.sql` - Nova migração
- `src/types/requerimentos.ts` - Tipos atualizados
- `src/schemas/requerimentosSchemas.ts` - Validações
- `src/services/requerimentosService.ts` - CRUD atualizado

#### Frontend/Componentes
- `src/components/admin/requerimentos/RequerimentoForm.tsx` - Formulário
- `src/components/admin/requerimentos/RequerimentoCard.tsx` - Visualização

#### Testes
- `test_alteracoes_requerimentos.js` - Testes atualizados

### 8. Como Usar

#### Para o Usuário Final
1. Criar/editar requerimento
2. Selecionar tipo de cobrança "Banco de Horas"
3. Marcar checkbox "Ticket" se aplicável
4. Informar quantidade de tickets (1-9999)
5. Salvar requerimento

#### Para Desenvolvedores
```typescript
// Verificar se tipo permite tickets
import { permiteTickets } from '@/types/requerimentos';

if (permiteTickets(requerimento.tipo_cobranca)) {
  // Exibir campos de ticket
}

// Validar dados antes de salvar
const schema = requerimentoFormSchema;
const result = schema.safeParse(formData);
```

### 9. Benefícios da Implementação

#### Controle Granular
- Permite rastreamento preciso de tickets por requerimento
- Diferenciação entre requerimentos com e sem tickets
- Validações robustas garantem consistência dos dados

#### Experiência do Usuário
- Interface intuitiva e condicional
- Validações em tempo real
- Feedback visual claro (emoji 🎫)

#### Manutenibilidade
- Código bem estruturado e tipado
- Testes abrangentes
- Documentação completa

### 10. Próximos Passos Sugeridos

#### Relatórios
- Adicionar filtros por tickets nos relatórios
- Estatísticas de uso de tickets
- Análise de produtividade por ticket

#### Integrações
- Exportação de dados incluindo informações de tickets
- APIs para consulta de tickets
- Dashboards específicos para Banco de Horas

#### Melhorias de UX
- Histórico de alterações de tickets
- Notificações para tickets críticos
- Bulk edit para tickets em lote

## Conclusão

A implementação do sistema de tickets para Banco de Horas foi concluída com sucesso, fornecendo uma solução robusta, bem testada e fácil de usar. O sistema mantém a consistência dos dados através de validações em múltiplas camadas (banco, backend e frontend) e oferece uma experiência de usuário intuitiva e eficiente.