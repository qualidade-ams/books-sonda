# Endpoints Necessários para a API de Sincronização

## Status Atual da API

✅ **API Online**: `http://SAPSERVDB.sondait.com.br:3001`

### Endpoints Funcionando:
- ✅ `GET /health` - Health check da API
- ✅ `GET /api/test-connection` - Teste de conexão com SQL Server

### Endpoints Faltantes:
- ❌ `POST /api/sync-pesquisas` - Sincronização de pesquisas de satisfação
- ❌ `POST /api/sync-especialistas` - Sincronização de especialistas

## Implementação Necessária

### 1. Endpoint: `POST /api/sync-pesquisas`

**Descrição**: Sincroniza dados de pesquisas de satisfação do SQL Server para o Supabase.

**Request**:
```http
POST /api/sync-pesquisas
Content-Type: application/json
```

**Response**:
```json
{
  "sucesso": true,
  "total_processados": 150,
  "novos": 25,
  "atualizados": 10,
  "erros": 0,
  "mensagens": [
    "Sincronização concluída com sucesso",
    "25 novos registros inseridos",
    "10 registros atualizados"
  ],
  "detalhes_erros": []
}
```

**Lógica**:
1. Conectar ao SQL Server
2. Buscar dados da tabela de pesquisas
3. Comparar com dados existentes no Supabase
4. Inserir/atualizar registros conforme necessário
5. Retornar estatísticas da operação

### 2. Endpoint: `POST /api/sync-especialistas`

**Descrição**: Sincroniza dados de especialistas da tabela `AMSespecialistas` do SQL Server.

**Request**:
```http
POST /api/sync-especialistas
Content-Type: application/json
```

**Response**:
```json
{
  "sucesso": true,
  "total_processados": 45,
  "novos": 5,
  "atualizados": 2,
  "removidos": 0,
  "erros": 0,
  "mensagens": [
    "Sincronização de especialistas concluída",
    "5 novos especialistas adicionados",
    "2 especialistas atualizados"
  ],
  "detalhes_erros": []
}
```

**Campos da tabela AMSespecialistas**:
- `user_name` - Nome do usuário/especialista
- `user_email` - Email do especialista
- Outros campos conforme estrutura da tabela

## Configuração do SQL Server

A API já tem conexão funcionando com o SQL Server (confirmado pelo endpoint `/api/test-connection`).

### Tabelas a serem sincronizadas:
1. **Pesquisas de Satisfação** - tabela principal de pesquisas
2. **AMSespecialistas** - tabela de especialistas

## Estrutura de Resposta Padrão

Todos os endpoints de sincronização devem seguir esta estrutura:

```typescript
interface ResultadoSincronizacao {
  sucesso: boolean;
  total_processados: number;
  novos: number;
  atualizados: number;
  removidos?: number; // Opcional, apenas para especialistas
  erros: number;
  mensagens: string[];
  detalhes_erros: string[];
}
```

## Tratamento de Erros

### Cenários de Erro:
1. **Conexão com SQL Server falha**
2. **Conexão com Supabase falha**
3. **Erro de validação de dados**
4. **Timeout de operação**

### Response de Erro:
```json
{
  "sucesso": false,
  "total_processados": 0,
  "novos": 0,
  "atualizados": 0,
  "erros": 1,
  "mensagens": [
    "Erro ao conectar com SQL Server"
  ],
  "detalhes_erros": [
    "Connection timeout after 30 seconds"
  ]
}
```

## Configuração do Frontend

O frontend já está configurado para usar estes endpoints:

```typescript
// .env.local
VITE_SYNC_API_URL=http://SAPSERVDB.sondait.com.br:3001

// Serviços já implementados:
- sqlServerSyncPesquisasService.ts
- sqlServerSyncEspecialistasService.ts
```

## Próximos Passos

1. **Implementar endpoints na API Node.js**
2. **Testar sincronização com dados reais**
3. **Configurar logs detalhados**
4. **Implementar retry automático em caso de falha**
5. **Adicionar validação de dados**

## Teste dos Endpoints

Após implementação, use o componente de diagnóstico no frontend:
- Acesse a página "Lançar Pesquisas"
- Clique em "Diagnóstico API"
- Execute o diagnóstico completo

Ou use o script de teste:
```bash
node test-api-connection.js
```