# Implementação do Serviço de Disparo com Anexos

## Resumo da Implementação

Foi implementada com sucesso a extensão do `BooksDisparoService` para suportar anexos em disparos personalizados, conforme especificado na tarefa 7 do plano de implementação.

## Funcionalidades Implementadas

### 7.1 Modificação do BooksDisparoService para incluir anexos

✅ **Busca de anexos da empresa antes do disparo**
- Método `buscarAnexosEmpresa()` implementado
- Filtra anexos com status 'pendente'
- Gera tokens JWT para cada anexo
- Atualiza status para 'enviando' durante o processo

✅ **Geração de tokens de acesso para cada arquivo**
- Integração com `anexoTokenService`
- Tokens JWT únicos por arquivo
- Expiração de 24 horas
- Validação de segurança

✅ **Inclusão de dados dos anexos no payload do webhook**
- Estrutura `AnexosSummaryWebhook` implementada
- Dados incluem: URL, nome, tipo, tamanho e token
- Contadores de arquivos e tamanho total
- Integração com `emailService`

### 7.2 Implementação do controle de estado dos anexos

✅ **Atualização de status durante o processo de disparo**
- Estados: pendente → enviando → processado/erro
- Logs detalhados para cada mudança de status
- Timestamps de processamento
- Detalhes de erro quando aplicável

✅ **Registro no histórico com informações sobre anexos processados**
- Campo `anexo_id` no histórico de disparos
- Campo `anexo_processado` para controle de status
- Detalhes dos anexos nos logs de erro
- Contadores de arquivos e tamanho nos detalhes

✅ **Movimentação de arquivos para storage permanente após confirmação**
- Método `processarConfirmacaoAnexo()` implementado
- Move arquivos processados para bucket permanente
- Limpeza automática de arquivos temporários
- Tratamento de erros robusto

## Métodos Implementados

### Métodos Principais

1. **`buscarAnexosEmpresa(empresaId: string)`**
   - Busca anexos pendentes da empresa
   - Gera tokens de acesso
   - Atualiza status para 'enviando'
   - Registra eventos de auditoria

2. **`enviarEmailConsolidadoComAnexos()`**
   - Versão estendida do método de envio
   - Inclui dados de anexos no payload
   - Controle de estado durante envio
   - Tratamento de erros específico para anexos

3. **`processarConfirmacaoAnexo()`**
   - Processa callback do Power Automate
   - Atualiza status final dos anexos
   - Move arquivos para storage permanente
   - Registra eventos de auditoria

### Métodos Auxiliares

4. **`atualizarStatusAnexoComLog()`**
   - Atualiza status com logs detalhados
   - Salva detalhes de erro no banco
   - Timestamps automáticos

5. **`registrarEventoAnexos()`**
   - Sistema de auditoria para anexos
   - Logs estruturados para troubleshooting
   - Rastreamento de eventos por empresa

6. **`obterStatusAnexosEmpresa()`**
   - Dashboard de status dos anexos
   - Contadores por status
   - Detalhes individuais de cada anexo

7. **`limparAnexosOrfaos()`**
   - Limpeza de anexos sem referência
   - Prevenção de vazamentos de storage
   - Execução automática ou manual

## Integração com Webhook

### Estrutura do Payload Estendido

```json
{
  "empresa": { ... },
  "clientes": [ ... ],
  "template": { ... },
  "anexos": {
    "totalArquivos": 2,
    "tamanhoTotal": 2097152,
    "arquivos": [
      {
        "url": "https://storage.supabase.co/anexos/temp/arquivo.pdf",
        "nome": "Relatório Mensal.pdf",
        "tipo": "application/pdf",
        "tamanho": 1048576,
        "token": "jwt-token-para-autenticacao"
      }
    ]
  }
}
```

### Fluxo de Processamento

1. **Preparação**: Anexos são buscados e tokens gerados
2. **Envio**: Dados incluídos no payload do webhook
3. **Processamento**: Power Automate baixa arquivos usando tokens
4. **Confirmação**: Callback confirma processamento
5. **Finalização**: Arquivos movidos para storage permanente

## Controle de Estado Detalhado

### Estados dos Anexos

- **pendente**: Arquivo carregado, aguardando disparo
- **enviando**: Incluído no webhook, aguardando processamento
- **processado**: Confirmado pelo Power Automate, movido para permanente
- **erro**: Falha em qualquer etapa do processo

### Logs de Auditoria

- Preparação para disparo
- Envio ao Power Automate
- Confirmação de processamento
- Movimentação para storage permanente
- Erros e recuperação

## Tratamento de Erros

### Cenários Cobertos

1. **Falha na geração de tokens**: Anexo marcado como erro
2. **Falha no envio do e-mail**: Todos os anexos marcados como erro
3. **Timeout do Power Automate**: Sistema de retry e limpeza
4. **Arquivos corrompidos**: Validação e rejeição
5. **Anexos órfãos**: Limpeza automática

### Estratégias de Recuperação

- Logs detalhados para troubleshooting
- Status granular para identificar ponto de falha
- Limpeza automática de recursos
- Não bloqueio do disparo principal por falhas de anexo

## Compatibilidade

### Backward Compatibility

- Método `enviarEmailConsolidado()` mantido para compatibilidade
- Empresas sem anexos funcionam normalmente
- Nenhuma quebra de funcionalidade existente

### Forward Compatibility

- Estrutura extensível para novos tipos de anexo
- Sistema de tokens preparado para diferentes provedores
- Hooks para integração com outros sistemas

## Próximos Passos

1. **Implementar callback do Power Automate** para confirmação real
2. **Adicionar métricas de performance** para monitoramento
3. **Criar dashboard de anexos** para administradores
4. **Implementar compressão automática** para arquivos grandes
5. **Adicionar suporte a mais tipos de arquivo** conforme necessário

## Arquivos Modificados

- `src/services/booksDisparoService.ts` - Funcionalidade principal
- `src/types/clientBooks.ts` - Interfaces para anexos
- `src/services/__tests__/booksDisparoServiceAnexos.test.ts` - Testes unitários

## Requisitos Atendidos

- ✅ **Requisito 3.1**: Buscar anexos da empresa antes do disparo
- ✅ **Requisito 3.2**: Gerar tokens de acesso para cada arquivo  
- ✅ **Requisito 3.3**: Incluir dados dos anexos no payload do webhook
- ✅ **Requisito 4.1**: Atualizar status dos anexos durante o processo de disparo
- ✅ **Requisito 4.2**: Registrar no histórico informações sobre anexos processados
- ✅ **Requisito 4.3**: Mover arquivos para storage permanente após confirmação
- ✅ **Requisito 8.3**: Sistema de auditoria e logs para anexos

A implementação está completa e pronta para integração com o Power Automate.