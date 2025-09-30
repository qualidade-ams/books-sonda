# Sistema de Erros Customizados - Requerimentos

Este documento descreve como usar as classes de erro customizadas do sistema de requerimentos, que foram implementadas para atender aos requirements 9.1-9.9 do sistema.

## Visão Geral

O sistema de erros customizados para requerimentos fornece:

- **Classes de erro específicas** com códigos estruturados
- **Mensagens user-friendly** em português
- **Integração com sistema de toast notifications** (Sonner)
- **Validação automática** de formulários e dados
- **Tratamento de erros** padronizado e consistente
- **Logs estruturados** para debugging e auditoria

## Estrutura dos Arquivos

```
src/errors/
├── requerimentosErrors.ts          # Classes de erro principais
├── __tests__/
│   └── requerimentosErrors.test.ts # Testes das classes de erro
└── README_REQUERIMENTOS_ERRORS.md  # Esta documentação

src/utils/
├── requerimentosErrorHandler.ts           # Utilitário de tratamento de erros
└── __tests__/
    └── requerimentosErrorHandler.test.ts  # Testes do error handler
```

## Classes Principais

### 1. RequerimentoError

Classe base para todos os erros do sistema de requerimentos.

```typescript
import { RequerimentoError } from '@/errors/requerimentosErrors';

const error = new RequerimentoError(
  'Campo "Chamado" é obrigatório',
  'CHAMADO_REQUIRED',
  { field: 'chamado' },
  { operation: 'create' }
);

// Propriedades disponíveis
console.log(error.code);        // 'CHAMADO_REQUIRED'
console.log(error.message);     // 'Campo "Chamado" é obrigatório'
console.log(error.timestamp);   // Date object
console.log(error.details);     // { field: 'chamado' }
console.log(error.context);     // { operation: 'create' }

// Métodos utilitários
console.log(error.isTemporary());              // false
console.log(error.requiresAdminNotification()); // false
console.log(error.getSeverity());              // 'error'
console.log(error.getRecoveryStrategy());      // 'manual'
```

### 2. RequerimentoErrorFactory

Factory para criar erros específicos com contexto apropriado.

```typescript
import { RequerimentoErrorFactory } from '@/errors/requerimentosErrors';

// Erros de campos obrigatórios (Requirements 9.1-9.9)
const chamadoError = RequerimentoErrorFactory.chamadoRequired();
const clienteError = RequerimentoErrorFactory.clienteRequired();
const moduloError = RequerimentoErrorFactory.moduloRequired();

// Erros de validação de formato
const formatError = RequerimentoErrorFactory.chamadoInvalidFormat('ABC@123');
const lengthError = RequerimentoErrorFactory.descricaoTooLong(600);

// Erros de requerimento
const notFoundError = RequerimentoErrorFactory.requerimentoNotFound('123');
const duplicateError = RequerimentoErrorFactory.requerimentoDuplicateChamado('RF-123');

// Erros de faturamento
const noReqError = RequerimentoErrorFactory.faturamentoNoRequerimentos(12, 2024);
const emailError = RequerimentoErrorFactory.faturamentoDestinatariosInvalid(['invalid-email']);
```

### 3. RequerimentoValidator

Classe para validação de dados com retorno de erros estruturados.

```typescript
import { RequerimentoValidator } from '@/errors/requerimentosErrors';

// Validar dados do formulário
const formData = {
  chamado: 'RF-123456',
  cliente_id: 'client-123',
  modulo: 'Comply',
  descricao: 'Descrição válida',
  // ... outros campos
};

const errors = RequerimentoValidator.validateFormData(formData);
if (errors.length > 0) {
  errors.forEach(error => {
    console.log(error.code, error.message);
  });
}

// Validar lista de emails
const emails = ['test@example.com', 'invalid-email'];
const emailErrors = RequerimentoValidator.validateEmailList(emails);
```

## Utilitário de Tratamento de Erros

### RequerimentosErrorManager

Classe principal para tratamento e exibição de erros.

```typescript
import { RequerimentosErrorManager } from '@/utils/requerimentosErrorHandler';

// Tratar erro e exibir toast notification
try {
  // Operação que pode falhar
} catch (error) {
  RequerimentosErrorManager.handleError(error, 'Contexto da operação');
}

// Validar formulário e mostrar erros
const isValid = RequerimentosErrorManager.validateAndShowErrors(formData);
if (!isValid) {
  return; // Erros foram exibidos automaticamente
}

// Validar emails para faturamento
const emailsValid = RequerimentosErrorManager.validateEmailsAndShowErrors(emails);

// Mostrar sucesso
RequerimentosErrorManager.showSuccess('Requerimento salvo!', 'Dados salvos com sucesso');

// Mostrar confirmação
RequerimentosErrorManager.showConfirmation(
  'Confirmar exclusão',
  'Esta ação não pode ser desfeita',
  () => deleteRequerimento(),
  () => console.log('Cancelado')
);

// Gerenciar progresso de operação longa
const toastId = RequerimentosErrorManager.showProgress('Salvando...', 'Aguarde');
try {
  await saveRequerimento();
  RequerimentosErrorManager.updateProgressToSuccess(toastId, 'Salvo!', 'Requerimento salvo com sucesso');
} catch (error) {
  RequerimentosErrorManager.updateProgressToError(toastId, error, 'Salvamento');
}
```

### Funções de Conveniência

Para uso direto nos componentes:

```typescript
import {
  handleRequerimentoError,
  validateRequerimentoForm,
  validateFaturamentoEmails,
  showRequerimentoSuccess,
  showRequerimentoConfirmation,
  manageRequerimentoProgress,
  RequerimentoErrors
} from '@/utils/requerimentosErrorHandler';

// Em um componente React
const handleSubmit = async (data) => {
  // Validar dados
  if (!validateRequerimentoForm(data)) {
    return; // Erros exibidos automaticamente
  }

  // Gerenciar progresso
  const progress = manageRequerimentoProgress();
  const toastId = progress.start('Salvando requerimento...');

  try {
    await saveRequerimento(data);
    progress.success(toastId, 'Requerimento salvo!');
  } catch (error) {
    progress.error(toastId, error, 'Salvamento de requerimento');
  }
};

// Usar factory de erros
const handleCustomError = () => {
  const error = RequerimentoErrors.requerimentoNotFound('123');
  handleRequerimentoError(error, 'Busca de requerimento');
};
```

## Códigos de Erro

### Campos Obrigatórios (Requirements 9.1-9.9)
- `CHAMADO_REQUIRED` - Campo "Chamado" é obrigatório
- `CLIENTE_REQUIRED` - Campo "Cliente" é obrigatório
- `MODULO_REQUIRED` - Campo "Módulo" é obrigatório
- `DESCRICAO_REQUIRED` - Campo "Descrição" é obrigatório
- `DATA_ENVIO_REQUIRED` - Campo "Data de Envio" é obrigatório
- `DATA_APROVACAO_REQUIRED` - Campo "Data de Aprovação" é obrigatório
- `HORAS_REQUIRED` - Pelo menos um dos campos de horas é obrigatório
- `LINGUAGEM_REQUIRED` - Campo "Linguagem" é obrigatório
- `TIPO_COBRANCA_REQUIRED` - Campo "Tipo de Cobrança" é obrigatório
- `MES_COBRANCA_REQUIRED` - Campo "Mês de Cobrança" é obrigatório

### Validações de Formato
- `CHAMADO_INVALID_FORMAT` - Formato do chamado inválido
- `DESCRICAO_TOO_LONG` - Descrição excede 500 caracteres
- `OBSERVACAO_TOO_LONG` - Observação excede 1000 caracteres
- `HORAS_INVALID_VALUE` - Valor de horas inválido
- `MES_COBRANCA_INVALID_RANGE` - Mês deve estar entre 1 e 12

### Erros de Requerimento
- `REQUERIMENTO_NOT_FOUND` - Requerimento não encontrado
- `REQUERIMENTO_ALREADY_SENT` - Já enviado para faturamento
- `REQUERIMENTO_DUPLICATE_CHAMADO` - Chamado duplicado

### Erros de Faturamento
- `FATURAMENTO_NO_REQUERIMENTOS` - Nenhum requerimento para faturar
- `FATURAMENTO_DESTINATARIOS_REQUIRED` - Lista de destinatários obrigatória
- `FATURAMENTO_DESTINATARIOS_INVALID` - Emails inválidos na lista

## Integração com Componentes

### Exemplo em Formulário de Requerimento

```typescript
import React from 'react';
import { useForm } from 'react-hook-form';
import { validateRequerimentoForm, showRequerimentoSuccess } from '@/utils/requerimentosErrorHandler';

const RequerimentoForm = () => {
  const { handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    // Validação automática com exibição de erros
    if (!validateRequerimentoForm(data)) {
      return;
    }

    try {
      await saveRequerimento(data);
      showRequerimentoSuccess('Requerimento salvo!', 'Dados salvos com sucesso');
    } catch (error) {
      handleRequerimentoError(error, 'Salvamento de requerimento');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Campos do formulário */}
    </form>
  );
};
```

### Exemplo em Hook Customizado

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { handleRequerimentoError, showRequerimentoSuccess } from '@/utils/requerimentosErrorHandler';

export const useRequerimentos = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createRequerimento,
    onSuccess: () => {
      showRequerimentoSuccess('Requerimento criado!');
      queryClient.invalidateQueries({ queryKey: ['requerimentos'] });
    },
    onError: (error) => {
      handleRequerimentoError(error, 'Criação de requerimento');
    }
  });

  return { createMutation };
};
```

## Configuração de Toast Notifications

O sistema usa o Sonner para toast notifications com configurações específicas:

- **Erros críticos**: 10 segundos de duração, botão "Reportar"
- **Erros normais**: 7 segundos de duração
- **Warnings**: 5 segundos de duração
- **Sucessos**: 4 segundos de duração
- **Múltiplos erros**: Resumo com botão "Ver detalhes"

## Logs e Auditoria

Todos os erros são automaticamente logados com informações estruturadas:

```typescript
{
  name: 'RequerimentoError',
  message: 'Campo "Chamado" é obrigatório',
  code: 'CHAMADO_REQUIRED',
  timestamp: '2024-01-01T10:00:00.000Z',
  details: { field: 'chamado' },
  context: { operation: 'create' },
  stack: '...'
}
```

## Testes

O sistema inclui testes abrangentes:

```bash
# Executar testes das classes de erro
npm run test -- src/errors/__tests__/requerimentosErrors.test.ts

# Executar testes do error handler
npm run test -- src/utils/__tests__/requerimentosErrorHandler.test.ts
```

## Extensibilidade

Para adicionar novos tipos de erro:

1. **Adicionar código de erro** em `RequerimentoErrorCode`
2. **Implementar factory method** em `RequerimentoErrorFactory`
3. **Adicionar mensagem user-friendly** em `getUserFriendlyMessage`
4. **Configurar estratégia de recuperação** se necessário
5. **Adicionar testes** para o novo tipo de erro

## Boas Práticas

1. **Sempre use as classes de erro customizadas** em vez de `Error` genérico
2. **Forneça contexto adequado** nos detalhes e contexto do erro
3. **Use os utilitários de tratamento** para consistência
4. **Valide dados antes de operações** usando os validators
5. **Teste cenários de erro** nos seus componentes
6. **Monitore logs de erro** para identificar padrões

## Troubleshooting

### Erro não é exibido ao usuário
- Verifique se o código do erro está em `shouldShowToUser`
- Confirme se está usando `handleRequerimentoError` corretamente

### Toast não aparece
- Verifique se o Sonner está configurado na aplicação
- Confirme se não há conflitos com outros sistemas de notificação

### Validação não funciona
- Verifique se os dados estão no formato esperado
- Confirme se todos os campos obrigatórios estão sendo validados

### Logs não aparecem
- Verifique o console do navegador para logs de erro
- Confirme se o nível de log está configurado corretamente