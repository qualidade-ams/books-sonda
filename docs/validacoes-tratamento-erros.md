# Validações e Tratamento de Erros - Sistema Client Books

## Visão Geral

Este documento descreve a implementação completa do sistema de validações e tratamento de erros para o sistema de gerenciamento de clientes e books, incluindo schemas Zod, classes de erro customizadas, estratégias de recuperação e fallbacks.

## Componentes Implementados

### 1. Schemas de Validação (Zod)

**Arquivo:** `src/schemas/clientBooksSchemas.ts`

#### Schemas Principais:
- **empresaFormSchema**: Validação completa para formulários de empresa
- **colaboradorFormSchema**: Validação para formulários de colaborador  
- **grupoFormSchema**: Validação para grupos responsáveis
- **agendamentoDisparoSchema**: Validação para agendamento de disparos
- **historicoFiltrosSchema**: Validação para filtros de histórico
- **excelImportSchema**: Validação para importação de arquivos Excel

#### Características:
- Validação de tipos e formatos
- Mensagens de erro em português
- Validações condicionais (ex: descrição obrigatória para status inativo)
- Validação de relacionamentos (UUIDs, emails únicos)
- Sanitização automática de dados

#### Exemplo de Uso:
```typescript
import { empresaFormSchema } from '@/schemas/clientBooksSchemas';

const result = empresaFormSchema.safeParse(formData);
if (!result.success) {
  // Tratar erros de validação
  console.log(result.error.issues);
}
```

### 2. Classes de Erro Customizadas

**Arquivo:** `src/errors/clientBooksErrors.ts`

#### ClientBooksError
Classe base para todos os erros do sistema com:
- Códigos de erro específicos
- Contexto e detalhes estruturados
- Classificação de severidade
- Estratégias de recuperação automática
- Logs estruturados

#### Códigos de Erro por Categoria:
- **Empresa**: `EMPRESA_NOT_FOUND`, `EMPRESA_DUPLICATE_NAME`, etc.
- **Colaborador**: `COLABORADOR_NOT_FOUND`, `COLABORADOR_DUPLICATE_EMAIL`, etc.
- **Grupo**: `GRUPO_NOT_FOUND`, `GRUPO_HAS_ASSOCIATED_COMPANIES`, etc.
- **Disparo**: `DISPARO_FAILED`, `DISPARO_NO_ACTIVE_COLLABORATORS`, etc.
- **Sistema**: `DATABASE_CONNECTION_FAILED`, `NETWORK_ERROR`, etc.

#### ClientBooksErrorFactory
Factory para criar erros específicos com contexto apropriado:
```typescript
// Exemplo de uso
throw ClientBooksErrorFactory.empresaNotFound('123');
throw ClientBooksErrorFactory.colaboradorDuplicateEmail('test@test.com', 'empresa-id');
```

### 3. Sistema de Recuperação de Erros

**Arquivo:** `src/utils/errorRecovery.ts`

#### Funcionalidades:
- **Retry com Backoff Exponencial**: Tentativas automáticas com delay crescente
- **Fallbacks**: Estratégias alternativas quando operação principal falha
- **Circuit Breaker**: Prevenção de cascata de falhas
- **Sanitização de Dados**: Limpeza automática de dados de entrada
- **Validação de Integridade**: Verificações adicionais de consistência

#### Configurações por Operação:
```typescript
const OPERATION_RETRY_CONFIGS = {
  database: { maxRetries: 3, baseDelay: 500 },
  email: { maxRetries: 5, baseDelay: 2000 },
  import: { maxRetries: 2, baseDelay: 1000 }
};
```

### 4. Gerenciador de Erros Centralizado

**Arquivo:** `src/utils/clientBooksErrorHandler.ts`

#### ClientBooksErrorManager
Gerenciador centralizado que:
- Trata erros automaticamente
- Exibe notificações apropriadas ao usuário
- Notifica administradores para erros críticos
- Executa operações com recuperação automática

#### Decorador @withErrorHandling
Decorador para métodos de serviço que aplica tratamento automático:
```typescript
@withErrorHandling('empresa_create', { 
  showSuccessMessage: true, 
  useRetry: true 
})
async criarEmpresa(data: EmpresaFormData): Promise<EmpresaCliente> {
  // Implementação do método
}
```

#### Hook useErrorHandler
Hook React para componentes:
```typescript
const { handleError, executeWithErrorHandling } = useErrorHandler();

// Uso em componentes
const handleSubmit = async (data) => {
  await executeWithErrorHandling(
    () => empresasService.criarEmpresa(data),
    { operationName: 'criar_empresa', showSuccessMessage: true }
  );
};
```

### 5. Validadores de Operação

**Arquivo:** `src/utils/clientBooksErrorHandler.ts`

#### OperationValidators
Validadores específicos para cada tipo de operação:
- **empresa**: create, update, delete
- **colaborador**: create, update
- **grupo**: create, delete
- **disparo**: send, schedule

Exemplo:
```typescript
const errors = OperationValidators.empresa.create(empresaData);
if (errors.length > 0) {
  // Tratar erros de validação
}
```

## Integração com Serviços Existentes

### Exemplo: EmpresasClientesService

O serviço foi atualizado para usar o novo sistema:

```typescript
@withErrorHandling('empresa_create', { 
  showSuccessMessage: true, 
  useRetry: true 
})
async criarEmpresa(data: EmpresaFormData): Promise<EmpresaCliente> {
  // Validação com Zod
  const validationResult = empresaFormSchema.safeParse(data);
  if (!validationResult.success) {
    throw ClientBooksErrorFactory.validationError(/*...*/);
  }

  // Sanitização
  const sanitizedData = DataSanitizer.sanitizeEmpresaData(data);

  // Validação de integridade
  const integrityErrors = await DataIntegrityValidator.validateEmpresaIntegrity(sanitizedData);
  if (integrityErrors.length > 0) {
    throw ClientBooksErrorFactory.validationError(/*...*/);
  }

  // Operação principal com tratamento automático de erros
  // ...
}
```

## Estratégias de Recuperação

### 1. Retry Automático
- Erros temporários (conexão, timeout) são automaticamente repetidos
- Backoff exponencial com jitter para evitar thundering herd
- Configuração específica por tipo de operação

### 2. Fallbacks
- Templates padrão quando template específico não encontrado
- Notificação alternativa quando envio de email falha
- Cache local quando banco de dados indisponível

### 3. Circuit Breaker
- Previne cascata de falhas
- Abre circuito após threshold de falhas
- Transição automática para half-open após timeout

### 4. Sanitização e Validação
- Limpeza automática de dados (trim, lowercase)
- Validação de integridade antes de operações críticas
- Prevenção de erros através de validação proativa

## Testes Implementados

### 1. Schemas de Validação
**Arquivo:** `src/schemas/__tests__/clientBooksSchemas.test.ts`
- 29 testes cobrindo todos os schemas
- Validação de casos válidos e inválidos
- Testes de utilitários de validação

### 2. Classes de Erro
**Arquivo:** `src/errors/__tests__/clientBooksErrors.test.ts`
- 23 testes cobrindo todas as funcionalidades
- Testes de factory methods
- Validação de classificações de erro

### 3. Sistema de Recuperação
**Arquivo:** `src/utils/__tests__/errorRecovery.test.ts`
- 31 testes cobrindo retry, fallback, circuit breaker
- Testes de sanitização e validação de integridade
- Simulação de cenários de falha

## Benefícios da Implementação

### 1. Robustez
- Sistema resiliente a falhas temporárias
- Recuperação automática sem intervenção manual
- Prevenção de cascata de erros

### 2. Experiência do Usuário
- Mensagens de erro claras em português
- Notificações apropriadas para cada tipo de erro
- Ações recomendadas para resolução

### 3. Manutenibilidade
- Códigos de erro padronizados
- Logs estruturados para debugging
- Separação clara de responsabilidades

### 4. Monitoramento
- Notificações automáticas para administradores
- Métricas de falhas e recuperação
- Rastreamento de circuit breakers

## Uso em Componentes React

### Exemplo com Hook:
```typescript
import { useErrorHandler } from '@/utils/clientBooksErrorHandler';

function EmpresaForm() {
  const { executeWithErrorHandling, validateBeforeOperation } = useErrorHandler();

  const handleSubmit = async (data: EmpresaFormData) => {
    // Validação prévia
    const validation = validateBeforeOperation(data, OperationValidators.empresa.create);
    if (!validation.isValid) return;

    // Execução com tratamento automático
    await executeWithErrorHandling(
      () => empresasService.criarEmpresa(data),
      {
        operationName: 'criar_empresa',
        showSuccessMessage: true,
        successMessage: 'Empresa criada com sucesso!'
      }
    );
  };

  // ...
}
```

## Configuração e Personalização

### Configurações de Retry:
```typescript
// Personalizar configuração para operação específica
const customConfig = {
  maxRetries: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryCondition: (error) => error.isTemporary()
};
```

### Fallbacks Customizados:
```typescript
const fallbacks = [
  () => getDefaultTemplate(),
  () => sendNotificationToAdmin(),
  () => logErrorAndContinue()
];
```

## Conclusão

O sistema de validações e tratamento de erros implementado fornece uma base sólida e robusta para o sistema de gerenciamento de clientes e books, garantindo:

- **Confiabilidade**: Recuperação automática de falhas temporárias
- **Usabilidade**: Mensagens claras e ações recomendadas
- **Manutenibilidade**: Código organizado e testado
- **Monitoramento**: Logs estruturados e notificações automáticas

A implementação segue as melhores práticas de desenvolvimento e está totalmente integrada com o sistema existente, proporcionando uma experiência consistente e confiável para os usuários.