# Guia de Seleção de Templates para Empresas

## Visão Geral

A funcionalidade de seleção de templates permite que cada empresa cliente tenha um template personalizado para o envio de books, além dos templates padrão do sistema (Português e Inglês).

## Como Funciona

### 1. Templates Disponíveis

**Templates Padrão:**
- **Português (Padrão)**: Template padrão do sistema em português
- **Inglês (Padrão)**: Template padrão do sistema em inglês

**Templates Personalizados:**
- Templates criados na seção "Configuração de E-mail"
- Apenas templates ativos e vinculados ao formulário "book" aparecem na lista
- Cada template pode ter modalidade específica (mensal, semanal, etc.)

### 2. Cadastro de Empresa

No formulário de cadastro/edição de empresa:

1. **Campo Template Padrão**: Selecione o template que será usado para enviar books desta empresa
2. **Prévia do Template**: Visualize detalhes do template selecionado em tempo real
3. **Validação**: O sistema valida se o template selecionado existe e está ativo

### 3. Visualização na Lista

Na tabela de empresas, uma nova coluna "Template" mostra:
- Badge com o nome do template selecionado
- Ícone de e-mail para identificação visual
- Cores diferentes para templates padrão (cinza) e personalizados (azul)

## Estrutura Técnica

### Banco de Dados

```sql
-- Campo template_padrao na tabela empresas_clientes
ALTER TABLE empresas_clientes 
ALTER COLUMN template_padrao TYPE VARCHAR(255);

-- Remove constraint que limitava apenas 'portugues' e 'ingles'
-- Agora aceita também UUIDs de templates personalizados
```

### Componentes Criados

1. **`useBookTemplates`**: Hook especializado para templates de books
2. **`TemplatePreview`**: Componente de prévia do template selecionado
3. **Atualização do `EmpresaForm`**: Integração com seleção de templates
4. **Atualização da `EmpresasTable`**: Exibição do template na listagem

### Tipos de Dados

```typescript
interface BookTemplateOption {
  value: string;           // 'portugues', 'ingles' ou UUID do template
  label: string;           // Nome exibido
  description?: string;    // Descrição do template
  isDefault?: boolean;     // Se é template padrão do sistema
}
```

## Fluxo de Uso

### Para Administradores

1. **Criar Templates Personalizados**:
   - Acesse "Configuração de E-mail"
   - Crie novos templates com formulário = "book"
   - Ative os templates desejados

2. **Configurar Empresas**:
   - No cadastro de empresa, selecione o template desejado
   - Visualize a prévia para confirmar o template correto
   - Salve a configuração

3. **Monitorar Uso**:
   - Na lista de empresas, veja qual template cada empresa usa
   - Identifique empresas usando templates padrão vs personalizados

### Para o Sistema de Envio

O sistema de envio de books agora:
1. Verifica o `template_padrao` da empresa
2. Se for 'portugues' ou 'ingles', usa template padrão
3. Se for UUID, busca o template personalizado na tabela `email_templates`
4. Aplica o template encontrado no envio do e-mail

## Validações e Tratamento de Erros

### Validações Implementadas

- **Template obrigatório**: Não permite salvar empresa sem template
- **Template ativo**: Apenas templates ativos aparecem na lista
- **Template válido**: Verifica se template personalizado existe
- **Formulário correto**: Apenas templates do tipo "book"

### Tratamento de Erros

- **Template não encontrado**: Exibe badge de erro na tabela
- **Template inativo**: Remove da lista de opções
- **Fallback**: Em caso de erro, usa template padrão português

## Migração de Dados Existentes

Para empresas já cadastradas:
- Mantém valores 'portugues' e 'ingles' existentes
- Não requer migração de dados
- Compatibilidade total com sistema anterior

## Testes

### Testes Unitários

- **`useBookTemplates.test.ts`**: Testa lógica do hook
- **`TemplatePreview.test.tsx`**: Testa componente de prévia
- Cobertura de cenários de erro e edge cases

### Testes de Integração

- Fluxo completo de cadastro com template personalizado
- Validação de templates inativos
- Comportamento com templates inexistentes

## Considerações de Performance

- **Cache de templates**: Hook usa cache interno para evitar re-renders
- **Lazy loading**: Templates carregados apenas quando necessário
- **Otimização de queries**: Filtros aplicados no banco de dados

## Próximos Passos

1. **Relatórios**: Adicionar métricas de uso por template
2. **Backup**: Sistema de backup para templates personalizados
3. **Versionamento**: Controle de versões de templates
4. **Agendamento**: Templates específicos por período/data

## Troubleshooting

### Problemas Comuns

**Template não aparece na lista:**
- Verifique se está ativo
- Confirme se formulário = "book"
- Verifique permissões de acesso

**Erro ao salvar empresa:**
- Confirme se template existe
- Verifique conexão com banco
- Valide formato do UUID (para templates personalizados)

**Prévia não carrega:**
- Verifique se template tem conteúdo
- Confirme se não há erros de HTML no template
- Teste com template padrão primeiro