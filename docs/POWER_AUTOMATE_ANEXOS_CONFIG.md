# Configuração do Power Automate - Sistema de Anexos

## Visão Geral

Este documento fornece instruções completas para configurar o Power Automate para processar anexos no sistema de disparos personalizados. O sistema envia webhooks com dados estruturados dos anexos que devem ser baixados e anexados aos e-mails.

## Estrutura do Payload Estendido

### Payload Completo com Anexos

```json
{
  "empresa": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nome": "Empresa Exemplo Ltda",
    "email_gestor": "gestor@empresa.com",
    "cnpj": "12.345.678/0001-90",
    "grupo_responsavel": "Grupo A"
  },
  "clientes": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "nome": "João Silva",
      "email": "joao@empresa.com",
      "cargo": "Gerente",
      "departamento": "Vendas"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "nome": "Maria Santos",
      "email": "maria@empresa.com",
      "cargo": "Analista",
      "departamento": "Marketing"
    }
  ],
  "template": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "nome": "Template Personalizado Empresa",
    "conteudo": "<html>...</html>",
    "variaveis": {
      "empresa.nome": "Empresa Exemplo Ltda",
      "empresa.cnpj": "12.345.678/0001-90",
      "disparo.mesNome": "Janeiro",
      "disparo.mesNomeEn": "January",
      "disparo.ano": "2025",
      "sistema.mesNomeAtual": "Fevereiro",
      "sistema.mesNomeAtualEn": "February"
    }
  },
  "anexos": {
    "totalArquivos": 3,
    "tamanhoTotal": 5242880,
    "arquivos": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "url": "https://xyzcompany.supabase.co/storage/v1/object/anexos-temporarios/empresa-exemplo/2025-02/temp/relatorio_mensal_20250201_abc123.pdf",
        "nome": "Relatório Mensal Janeiro.pdf",
        "tipo": "application/pdf",
        "tamanho": 2097152,
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "dataExpiracao": "2025-02-02T10:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "url": "https://xyzcompany.supabase.co/storage/v1/object/anexos-temporarios/empresa-exemplo/2025-02/temp/planilha_dados_20250201_def456.xlsx",
        "nome": "Dados Complementares.xlsx",
        "tipo": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "tamanho": 1572864,
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "dataExpiracao": "2025-02-02T10:00:00Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440006",
        "url": "https://xyzcompany.supabase.co/storage/v1/object/anexos-temporarios/empresa-exemplo/2025-02/temp/documento_adicional_20250201_ghi789.docx",
        "nome": "Documento Adicional.docx",
        "tipo": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "tamanho": 1572864,
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "dataExpiracao": "2025-02-02T10:00:00Z"
      }
    ]
  },
  "metadados": {
    "mes_referencia": "2025-01",
    "data_disparo": "2025-02-01T10:00:00Z",
    "tipo_disparo": "personalizado",
    "webhook_version": "2.0"
  }
}
```

### Estrutura dos Objetos

#### Objeto `anexos`
```json
{
  "totalArquivos": 3,           // Número total de arquivos
  "tamanhoTotal": 5242880,     // Tamanho total em bytes
  "arquivos": [...]            // Array de objetos de arquivo
}
```

#### Objeto `arquivo` (dentro de `anexos.arquivos`)
```json
{
  "id": "uuid",                // ID único do anexo
  "url": "string",             // URL temporária para download
  "nome": "string",            // Nome original do arquivo
  "tipo": "string",            // Tipo MIME do arquivo
  "tamanho": 1234567,          // Tamanho em bytes
  "token": "string",           // Token JWT para autenticação
  "dataExpiracao": "ISO8601"   // Data de expiração do token
}
```

## Configuração do Fluxo no Power Automate

### 1. Trigger - Receber Webhook

```json
{
  "method": "POST",
  "schema": {
    "type": "object",
    "properties": {
      "empresa": { "type": "object" },
      "clientes": { "type": "array" },
      "template": { "type": "object" },
      "anexos": {
        "type": "object",
        "properties": {
          "totalArquivos": { "type": "integer" },
          "tamanhoTotal": { "type": "integer" },
          "arquivos": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "id": { "type": "string" },
                "url": { "type": "string" },
                "nome": { "type": "string" },
                "tipo": { "type": "string" },
                "tamanho": { "type": "integer" },
                "token": { "type": "string" },
                "dataExpiracao": { "type": "string" }
              }
            }
          }
        }
      },
      "metadados": { "type": "object" }
    }
  }
}
```

### 2. Condição - Verificar se Há Anexos

```
Condição: anexos is not equal to null
E
Condição: anexos['totalArquivos'] is greater than 0
```

### 3. Loop - Processar Cada Anexo

**Apply to each**: `anexos['arquivos']`

#### 3.1. Variáveis do Loop
```
- anexoId: items('Apply_to_each')['id']
- anexoUrl: items('Apply_to_each')['url']
- anexoNome: items('Apply_to_each')['nome']
- anexoTipo: items('Apply_to_each')['tipo']
- anexoToken: items('Apply_to_each')['token']
```

#### 3.2. HTTP Request - Download do Arquivo

```json
{
  "method": "GET",
  "uri": "@{variables('anexoUrl')}",
  "headers": {
    "Authorization": "Bearer @{variables('anexoToken')}",
    "Accept": "@{variables('anexoTipo')}"
  }
}
```

#### 3.3. Tratamento de Resposta

**Condição de Sucesso**: `outputs('HTTP_Download')['statusCode']` equals `200`

**Se Sucesso**:
- Armazenar conteúdo: `body('HTTP_Download')`
- Adicionar à lista de anexos válidos

**Se Falha**:
- Registrar erro no log
- Continuar com próximo anexo

### 4. Processamento do Template

```json
{
  "templateHtml": "@{triggerBody()['template']['conteudo']}",
  "variaveis": "@{triggerBody()['template']['variaveis']}"
}
```

#### 4.1. Substituição de Variáveis

**Apply to each**: `triggerBody()['template']['variaveis']`

```
Replace: @{variables('templateHtml')}
Find: {{@{items('Apply_to_each_2')['key']}}}
Replace with: @{items('Apply_to_each_2')['value']}
```

### 5. Envio do E-mail

#### 5.1. Configuração Básica

```json
{
  "To": "@{join(triggerBody()['clientes'], ';')}",
  "Subject": "Book Personalizado - @{triggerBody()['empresa']['nome']} - @{triggerBody()['metadados']['mes_referencia']}",
  "Body": "@{variables('templateProcessado')}",
  "IsHtml": true
}
```

#### 5.2. Anexar Arquivos

**Apply to each**: `variables('anexosValidos')`

```json
{
  "Name": "@{items('Apply_to_each_3')['nome']}",
  "ContentBytes": "@{items('Apply_to_each_3')['conteudo']}"
}
```

### 6. Confirmação de Processamento

#### 6.1. HTTP Response - Sucesso

```json
{
  "statusCode": 200,
  "body": {
    "sucesso": true,
    "empresaId": "@{triggerBody()['empresa']['id']}",
    "totalAnexos": "@{triggerBody()['anexos']['totalArquivos']}",
    "anexosProcessados": "@{length(variables('anexosValidos'))}",
    "anexosFalharam": "@{sub(triggerBody()['anexos']['totalArquivos'], length(variables('anexosValidos')))}",
    "dataProcessamento": "@{utcNow()}",
    "detalhes": {
      "anexosProcessados": "@{variables('anexosValidos')}",
      "erros": "@{variables('errosAnexos')}"
    }
  }
}
```

#### 6.2. HTTP Response - Erro

```json
{
  "statusCode": 400,
  "body": {
    "sucesso": false,
    "empresaId": "@{triggerBody()['empresa']['id']}",
    "erro": "@{variables('erroProcessamento')}",
    "dataProcessamento": "@{utcNow()}",
    "detalhes": "@{variables('detalhesErro')}"
  }
}
```

## Tratamento de Erros e Validações

### 1. Validações de Entrada

#### 1.1. Verificar Estrutura do Payload

```json
{
  "condition": "@and(not(empty(triggerBody()['empresa'])), not(empty(triggerBody()['clientes'])), not(empty(triggerBody()['template'])))",
  "ifFalse": {
    "response": {
      "statusCode": 400,
      "body": {
        "erro": "Payload inválido - campos obrigatórios ausentes",
        "camposObrigatorios": ["empresa", "clientes", "template"]
      }
    }
  }
}
```

#### 1.2. Validar Anexos (se presentes)

```json
{
  "condition": "@and(not(empty(triggerBody()['anexos'])), greater(triggerBody()['anexos']['totalArquivos'], 0))",
  "ifTrue": {
    "validarAnexos": true
  },
  "ifFalse": {
    "pularAnexos": true
  }
}
```

### 2. Tratamento de Erros de Download

#### 2.1. Timeout de Download

```json
{
  "timeout": "PT2M",
  "retryPolicy": {
    "type": "fixed",
    "count": 3,
    "interval": "PT30S"
  }
}
```

#### 2.2. Erros de Autenticação

**Status Code 401/403**:
```json
{
  "erro": "Token de acesso inválido ou expirado",
  "anexoId": "@{variables('anexoId')}",
  "acao": "Pular anexo e continuar processamento"
}
```

#### 2.3. Arquivo Não Encontrado

**Status Code 404**:
```json
{
  "erro": "Arquivo não encontrado no storage",
  "anexoId": "@{variables('anexoId')}",
  "url": "@{variables('anexoUrl')}",
  "acao": "Pular anexo e continuar processamento"
}
```

#### 2.4. Arquivo Muito Grande

**Status Code 413**:
```json
{
  "erro": "Arquivo excede limite de tamanho",
  "anexoId": "@{variables('anexoId')}",
  "tamanho": "@{variables('anexoTamanho')}",
  "acao": "Pular anexo e continuar processamento"
}
```

### 3. Estratégias de Recuperação

#### 3.1. Retry com Backoff

```json
{
  "retryPolicy": {
    "type": "exponential",
    "count": 3,
    "interval": "PT10S",
    "maximumInterval": "PT1M",
    "minimumInterval": "PT5S"
  }
}
```

#### 3.2. Fallback - Envio Sem Anexos

```json
{
  "condition": "@equals(length(variables('anexosValidos')), 0)",
  "ifTrue": {
    "enviarSemAnexos": true,
    "adicionarObservacao": "E-mail enviado sem anexos devido a falhas no download"
  }
}
```

#### 3.3. Partial Success

```json
{
  "condition": "@and(greater(length(variables('anexosValidos')), 0), less(length(variables('anexosValidos')), triggerBody()['anexos']['totalArquivos']))",
  "ifTrue": {
    "enviarComAnexosParciais": true,
    "adicionarObservacao": "Alguns anexos não puderam ser processados"
  }
}
```

## Configurações de Segurança

### 1. Validação de Token JWT

#### 1.1. Verificar Assinatura

```json
{
  "headers": {
    "Authorization": "Bearer @{variables('anexoToken')}",
    "X-Requested-With": "PowerAutomate",
    "User-Agent": "PowerAutomate-BookSystem/2.0"
  }
}
```

#### 1.2. Verificar Expiração

```json
{
  "condition": "@greater(ticks(variables('anexoDataExpiracao')), ticks(utcNow()))",
  "ifFalse": {
    "erro": "Token expirado",
    "acao": "Pular anexo"
  }
}
```

### 2. Whitelist de Domínios

```json
{
  "condition": "@contains(variables('anexoUrl'), 'supabase.co')",
  "ifFalse": {
    "erro": "URL não autorizada",
    "acao": "Bloquear download"
  }
}
```

### 3. Validação de Tipo MIME

```json
{
  "tiposPermitidos": [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  "condition": "@contains(variables('tiposPermitidos'), variables('anexoTipo'))"
}
```

## Monitoramento e Logs

### 1. Logs de Processamento

#### 1.1. Log de Início

```json
{
  "timestamp": "@{utcNow()}",
  "evento": "inicio_processamento",
  "empresaId": "@{triggerBody()['empresa']['id']}",
  "totalAnexos": "@{triggerBody()['anexos']['totalArquivos']}",
  "tamanhoTotal": "@{triggerBody()['anexos']['tamanhoTotal']}"
}
```

#### 1.2. Log por Anexo

```json
{
  "timestamp": "@{utcNow()}",
  "evento": "processamento_anexo",
  "anexoId": "@{variables('anexoId')}",
  "nome": "@{variables('anexoNome')}",
  "tamanho": "@{variables('anexoTamanho')}",
  "status": "sucesso|falha",
  "tempoDownload": "@{variables('tempoDownload')}",
  "erro": "@{variables('erroAnexo')}"
}
```

#### 1.3. Log de Conclusão

```json
{
  "timestamp": "@{utcNow()}",
  "evento": "conclusao_processamento",
  "empresaId": "@{triggerBody()['empresa']['id']}",
  "anexosProcessados": "@{length(variables('anexosValidos'))}",
  "anexosFalharam": "@{length(variables('anexosComErro'))}",
  "tempoTotal": "@{variables('tempoTotal')}",
  "emailEnviado": "@{variables('emailEnviado')}"
}
```

### 2. Métricas de Performance

#### 2.1. Tempo de Download por Arquivo

```json
{
  "inicioDownload": "@{utcNow()}",
  "fimDownload": "@{utcNow()}",
  "duracao": "@{sub(ticks(variables('fimDownload')), ticks(variables('inicioDownload')))}"
}
```

#### 2.2. Taxa de Sucesso

```json
{
  "totalAnexos": "@{triggerBody()['anexos']['totalArquivos']}",
  "anexosSucesso": "@{length(variables('anexosValidos'))}",
  "taxaSucesso": "@{div(length(variables('anexosValidos')), triggerBody()['anexos']['totalArquivos'])}"
}
```

## Códigos de Resposta

### Códigos de Sucesso

| Código | Descrição | Ação |
|--------|-----------|-------|
| 200 | Processamento completo com sucesso | Todos os anexos processados |
| 206 | Processamento parcial | Alguns anexos falharam |

### Códigos de Erro

| Código | Descrição | Ação Recomendada |
|--------|-----------|------------------|
| 400 | Payload inválido | Verificar estrutura do JSON |
| 401 | Token de autenticação inválido | Verificar configuração de tokens |
| 403 | Acesso negado | Verificar permissões |
| 404 | Arquivo não encontrado | Verificar se arquivo ainda existe |
| 408 | Timeout de download | Tentar novamente |
| 413 | Arquivo muito grande | Verificar limites de tamanho |
| 429 | Muitas requisições | Implementar rate limiting |
| 500 | Erro interno do servidor | Verificar logs do sistema |

## Exemplo de Fluxo Completo

### 1. Recebimento do Webhook

```json
POST /webhook/books-personalizados
Content-Type: application/json

{
  "empresa": { ... },
  "clientes": [ ... ],
  "template": { ... },
  "anexos": {
    "totalArquivos": 2,
    "tamanhoTotal": 3145728,
    "arquivos": [ ... ]
  }
}
```

### 2. Processamento dos Anexos

```
Para cada anexo em anexos.arquivos:
  1. Validar token e URL
  2. Fazer download com autenticação
  3. Verificar integridade do arquivo
  4. Adicionar à lista de anexos válidos
```

### 3. Envio do E-mail

```
1. Processar template HTML
2. Substituir variáveis
3. Configurar destinatários
4. Anexar arquivos válidos
5. Enviar e-mail
```

### 4. Resposta de Confirmação

```json
HTTP 200 OK
Content-Type: application/json

{
  "sucesso": true,
  "empresaId": "550e8400-e29b-41d4-a716-446655440000",
  "totalAnexos": 2,
  "anexosProcessados": 2,
  "anexosFalharam": 0,
  "dataProcessamento": "2025-02-01T10:05:30Z"
}
```

## Troubleshooting

### Problemas Comuns

#### 1. Anexos não são baixados

**Sintomas**: E-mail enviado sem anexos
**Causas possíveis**:
- Token expirado
- URL inválida
- Problemas de rede

**Soluções**:
- Verificar logs de download
- Validar configuração de tokens
- Implementar retry com backoff

#### 2. Timeout no download

**Sintomas**: Erro 408 ou timeout
**Causas possíveis**:
- Arquivo muito grande
- Conexão lenta
- Servidor sobrecarregado

**Soluções**:
- Aumentar timeout para 5 minutos
- Implementar download em chunks
- Adicionar retry exponencial

#### 3. Erro de autenticação

**Sintomas**: Erro 401/403
**Causas possíveis**:
- Token JWT inválido
- Token expirado
- Configuração incorreta

**Soluções**:
- Verificar geração de tokens
- Validar chave secreta
- Implementar renovação automática

#### 4. E-mail não enviado

**Sintomas**: Erro no envio final
**Causas possíveis**:
- Anexos muito grandes
- Limite de e-mail excedido
- Configuração SMTP incorreta

**Soluções**:
- Verificar tamanho total dos anexos
- Implementar compressão
- Configurar fallback sem anexos

### Logs de Debug

#### Habilitar Logs Detalhados

```json
{
  "settings": {
    "logging": {
      "level": "verbose",
      "includeHeaders": true,
      "includeBody": false,
      "logRetries": true
    }
  }
}
```

#### Verificar Logs Específicos

```
1. Logs de recebimento do webhook
2. Logs de download de cada anexo
3. Logs de processamento de template
4. Logs de envio de e-mail
5. Logs de resposta final
```

## Configurações Avançadas

### 1. Rate Limiting

```json
{
  "concurrency": {
    "runs": 10,
    "maximumWaitingRuns": 50
  },
  "runtimeConfiguration": {
    "concurrency": {
      "repetitions": 5
    }
  }
}
```

### 2. Retry Personalizado

```json
{
  "retryPolicy": {
    "type": "exponential",
    "count": 5,
    "interval": "PT10S",
    "maximumInterval": "PT5M",
    "minimumInterval": "PT5S"
  }
}
```

### 3. Timeout Configurável

```json
{
  "timeout": "PT10M",
  "operationOptions": {
    "DisableAsyncPattern": false,
    "IncludeAuthorizationHeadersInWebhookPayload": false
  }
}
```

## Checklist de Implementação

### Configuração Inicial
- [ ] Criar fluxo no Power Automate
- [ ] Configurar trigger de webhook
- [ ] Definir schema de entrada
- [ ] Configurar variáveis globais

### Processamento de Anexos
- [ ] Implementar loop para anexos
- [ ] Configurar download com autenticação
- [ ] Adicionar tratamento de erros
- [ ] Implementar retry com backoff

### Envio de E-mail
- [ ] Configurar processamento de template
- [ ] Implementar substituição de variáveis
- [ ] Configurar anexação de arquivos
- [ ] Testar envio completo

### Monitoramento
- [ ] Configurar logs detalhados
- [ ] Implementar métricas de performance
- [ ] Configurar alertas de erro
- [ ] Testar cenários de falha

### Testes
- [ ] Testar com 1 anexo
- [ ] Testar com múltiplos anexos
- [ ] Testar cenários de erro
- [ ] Testar timeout e retry
- [ ] Validar resposta de confirmação

## Suporte e Manutenção

### Contatos
- **Equipe de Desenvolvimento**: dev@empresa.com
- **Suporte Técnico**: suporte@empresa.com
- **Documentação**: docs.empresa.com/power-automate

### Atualizações
- Versão atual: 2.0
- Última atualização: 2025-02-01
- Próxima revisão: 2025-03-01

### Recursos Adicionais
- [Documentação do Power Automate](https://docs.microsoft.com/power-automate/)
- [Guia de Webhooks](https://docs.microsoft.com/power-automate/triggers-introduction)
- [Tratamento de Erros](https://docs.microsoft.com/power-automate/error-handling)