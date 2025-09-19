# Correção: Template Padrão Não Está Sendo Exibido

## Problema Identificado

O campo "Template Padrão" no formulário de empresa estava aparecendo vazio, sem opções para seleção. O select estava renderizado mas não mostrava as opções "Português" e "Inglês" que deveriam estar disponíveis.

## Causa Raiz

No hook `useBookTemplates`, apenas templates personalizados estavam sendo incluídos nas opções. Os templates padrão do sistema ("Português" e "Inglês") não estavam sendo adicionados à lista de opções disponíveis.

### Código Problemático (Antes):
```typescript
useEffect(() => {
  const options: BookTemplateOption[] = [];

  // ❌ PROBLEMA: Apenas templates personalizados
  const bookTemplates = templates.filter(
    template =>
      template.ativo &&
      template.formulario === 'book'
  );

  bookTemplates.forEach(template => {
    options.push({
      value: template.id,
      label: template.nome,
      description: template.descricao || 'Template personalizado',
      isDefault: false
    });
  });

  setBookTemplateOptions(options);
}, [templates]);
```

## Solução Implementada

### Código Corrigido (Depois):
```typescript
useEffect(() => {
  const options: BookTemplateOption[] = [];

  // ✅ ADICIONADO: Templates padrão do sistema primeiro
  options.push(
    {
      value: 'portugues',
      label: 'Template Book Português',
      description: 'Template Book Mensal',
      isDefault: true
    },
    {
      value: 'ingles',
      label: 'Template Book Inglês',
      description: 'Template Book Mensal',
      isDefault: true
    }
  );

  // ✅ MANTIDO: Templates personalizados ativos para books
  const bookTemplates = templates.filter(
    template =>
      template.ativo &&
      template.formulario === 'book'
  );

  bookTemplates.forEach(template => {
    options.push({
      value: template.id,
      label: template.nome,
      description: template.descricao || 'Template personalizado',
      isDefault: false
    });
  });

  setBookTemplateOptions(options);
}, [templates]);
```

## Estrutura das Opções Implementada

### Templates Padrão (Sempre Disponíveis):
1. **Template Book Português**
   - `value: 'portugues'`
   - `label: 'Template Book Português'`
   - `description: 'Template Book Mensal'`
   - `isDefault: true`

2. **Template Book Inglês**
   - `value: 'ingles'`
   - `label: 'Template Book Inglês'`
   - `description: 'Template Book Mensal'`
   - `isDefault: true`

### Templates Personalizados (Dinâmicos):
- Carregados do banco de dados
- Filtrados por: `ativo = true` e `formulario = 'book'`
- `isDefault: false`

## Resultado Visual

### Antes da Correção:
```
┌─────────────────────────────┐
│ Template Padrão *           │
│ ┌─────────────────────────┐ │
│ │ Selecione o template  ▼ │ │ ← Select vazio
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### Depois da Correção:
```
┌─────────────────────────────┐
│ Template Padrão *           │
│ ┌─────────────────────────┐ │
│ │ Selecione o template  ▼ │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Template Book Português │ │ ← Opções disponíveis
│ │ Template Book Inglês    │ │
│ │ [Templates Personalizados]│
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Funcionalidades Mantidas

### Hook `useBookTemplates` - Métodos Disponíveis:
- ✅ `bookTemplateOptions` - Lista completa de opções
- ✅ `loading` - Estado de carregamento
- ✅ `getTemplateById(id)` - Buscar template específico
- ✅ `isDefaultTemplate(id)` - Verificar se é template padrão
- ✅ `getCustomTemplates()` - Apenas templates personalizados
- ✅ `getDefaultTemplates()` - Apenas templates padrão

### Compatibilidade:
- ✅ Funciona com empresas existentes
- ✅ Valor padrão 'portugues' mantido
- ✅ Templates personalizados continuam funcionando
- ✅ Integração com sistema de cache preservada

## Ordem de Prioridade das Opções

1. **Templates Padrão** (sempre primeiro)
   - Template Book Português
   - Template Book Inglês

2. **Templates Personalizados** (ordem do banco)
   - Templates ativos para formulário 'book'
   - Ordenados conforme retornados do banco

## Arquivo Modificado

### `src/hooks/useBookTemplates.ts`
- ✅ Adicionados templates padrão na lista de opções
- ✅ Mantida funcionalidade de templates personalizados
- ✅ Preservados todos os métodos auxiliares
- ✅ Compatibilidade com código existente

## Benefícios da Correção

1. **Funcionalidade Restaurada**: Campo Template Padrão agora funciona
2. **Opções Completas**: Templates padrão e personalizados disponíveis
3. **Experiência do Usuário**: Interface consistente e funcional
4. **Compatibilidade**: Não quebra funcionalidades existentes
5. **Flexibilidade**: Suporte a templates padrão e personalizados

## Validação da Correção

### Cenários Testados:
- ✅ **Criação de Empresa**: Templates aparecem no select
- ✅ **Edição de Empresa**: Valor atual é carregado corretamente
- ✅ **Templates Padrão**: "Português" e "Inglês" sempre disponíveis
- ✅ **Templates Personalizados**: Carregados dinamicamente do banco
- ✅ **Valor Padrão**: 'portugues' selecionado por padrão

### Fluxo Completo:
1. Usuário abre formulário de empresa
2. Campo "Template Padrão" mostra opções disponíveis
3. Usuário pode selecionar template padrão ou personalizado
4. Valor é salvo corretamente no banco
5. Na edição, valor correto é carregado

## Status da Correção

✅ **CONCLUÍDO** - Template Padrão funcionando
- Opções de template sendo exibidas corretamente
- Templates padrão sempre disponíveis
- Templates personalizados carregados dinamicamente
- Compatibilidade com sistema existente mantida
- Experiência do usuário restaurada