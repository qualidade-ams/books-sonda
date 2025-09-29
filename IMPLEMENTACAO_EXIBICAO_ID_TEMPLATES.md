# Implementação da Exibição de IDs de Templates

## Funcionalidade Implementada

Adicionada a exibição dos IDs dos templates na interface de gerenciamento de templates de e-mail para facilitar a importação Excel de empresas.

## Modificações Realizadas

### 1. Exibição do ID do Template

**Arquivo:** `src/components/admin/email/GerenciadorTemplatesEmail.tsx`

#### Adicionado:
- **Campo "ID para Importação"** em cada template
- **Botão de cópia** com ícone para copiar o ID
- **Feedback visual** com toast de confirmação
- **Seção de ajuda** explicando como usar os IDs

#### Funcionalidades:
```typescript
// Função para copiar ID com feedback
const handleCopyId = async (templateId: string, templateName: string) => {
  try {
    await navigator.clipboard.writeText(templateId);
    toast({
      title: "ID copiado!",
      description: `ID do template "${templateName}" copiado para a área de transferência.`,
    });
  } catch (error) {
    toast({
      title: "Erro ao copiar",
      description: "Não foi possível copiar o ID. Tente selecionar e copiar manualmente.",
      variant: "destructive",
    });
  }
};
```

### 2. Interface Visual

#### Elementos Adicionados:
- **Código formatado** com fundo cinza para destacar o ID
- **Botão de cópia** com ícone `Copy` do Lucide React
- **Tooltip** explicativo no hover
- **Seleção automática** do texto do ID

#### Exemplo Visual:
```
ID para Importação: [61f7591a-7552-4f76-964e-6b26b814f526] [📋]
```

### 3. Seção de Ajuda

Adicionada seção informativa no topo da página:

```jsx
<Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
  <CardContent className="p-4">
    <div className="flex items-start gap-3">
      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
      <div>
        <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
          Importação Excel - Templates
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
          Para usar templates personalizados na importação Excel de empresas:
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>Templates padrão:</strong> Use "portugues" ou "ingles"</li>
          <li>• <strong>Templates personalizados:</strong> Copie o ID exibido abaixo de cada template</li>
          <li>• <strong>Cole o ID</strong> na coluna "Template Padrão" do arquivo Excel</li>
        </ul>
      </div>
    </div>
  </CardContent>
</Card>
```

## Como Usar

### Para Templates Padrão:
1. No Excel, use diretamente:
   - `"portugues"` ou `"português"` ou `"pt"`
   - `"ingles"` ou `"inglês"` ou `"english"` ou `"en"`

### Para Templates Personalizados:
1. Acesse **Configurações → Template E-mails**
2. Localize o template desejado
3. Clique no botão **📋** ao lado do ID
4. Cole o ID copiado na coluna "Template Padrão" do Excel

### Exemplo de Uso:

#### Template Personalizado:
- **Nome:** "Template Book Novo Nordisk"
- **ID:** `61f7591a-7552-4f76-964e-6b26b814f526`

#### No Excel:
```
Template Padrão: 61f7591a-7552-4f76-964e-6b26b814f526
```

## Benefícios

1. **Facilidade de Uso**: IDs visíveis e copiáveis diretamente na interface
2. **Redução de Erros**: Eliminação de digitação manual de IDs longos
3. **Feedback Imediato**: Confirmação visual quando o ID é copiado
4. **Documentação Integrada**: Instruções claras na própria interface
5. **Compatibilidade**: Funciona com templates padrão e personalizados

## Compatibilidade

- ✅ **Templates Padrão**: `'portugues'`, `'ingles'`
- ✅ **Templates Personalizados**: IDs UUID completos
- ✅ **Importação Excel**: Mapeamento automático para IDs corretos
- ✅ **Interface**: Exibição clara e funcional
- ✅ **Acessibilidade**: Tooltips e feedback adequados

## Testes Recomendados

1. **Visualização**: Verificar se os IDs aparecem corretamente
2. **Cópia**: Testar o botão de copiar em diferentes templates
3. **Importação**: Usar IDs copiados na importação Excel
4. **Feedback**: Verificar toasts de confirmação
5. **Responsividade**: Testar em diferentes tamanhos de tela

Esta implementação resolve completamente a necessidade de visualizar e usar IDs de templates na importação Excel, proporcionando uma experiência de usuário fluida e intuitiva.