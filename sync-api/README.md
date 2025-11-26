# API de Sincronização de Pesquisas - SQL Server

API Node.js para sincronizar pesquisas do SQL Server (Aranda) para o Supabase.

## ⚠️ IMPORTANTE: VPN Necessária

**O SQL Server está em uma rede privada e requer conexão VPN ativa!**

Antes de usar esta API:
1. ✅ Conectar à VPN da empresa
2. ✅ Verificar conectividade: `ping 172.26.2.136`
3. ✅ Então iniciar a API

📖 Ver `INSTRUCOES_VPN_SQL_SERVER.md` para detalhes completos.

---

## 📋 Configuração

### 1. Instalar Dependências

```bash
cd sync-api
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# SQL Server Configuration
SQL_SERVER=172.26.2.136
SQL_DATABASE=Aranda
SQL_USER=amsconsulta
SQL_PASSWORD=ams@2023
SQL_TABLE=AMSpesquisa

# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key-aqui

# API Configuration
PORT=3001
NODE_ENV=development
```

## 🚀 Executar

### Desenvolvimento

```bash
npm run dev
```

### Produção

```bash
# Build
npm run build

# Start
npm start
```

A API estará disponível em `http://localhost:3001`

## 📡 Endpoints

### 1. Health Check

```bash
GET /health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-25T10:00:00.000Z",
  "config": {
    "server": "172.26.2.136",
    "database": "Aranda",
    "table": "AMSpesquisa"
  }
}
```

### 2. Testar Conexão SQL Server

```bash
GET /api/test-connection
```

**Resposta:**
```json
{
  "success": true,
  "message": "Conexão estabelecida com sucesso",
  "version": "Microsoft SQL Server 2019..."
}
```

### 3. Sincronizar Pesquisas

```bash
POST /api/sync-pesquisas
```

**Resposta:**
```json
{
  "sucesso": true,
  "total_processados": 150,
  "novos": 10,
  "atualizados": 140,
  "erros": 0,
  "mensagens": [
    "Iniciando sincronização com SQL Server...",
    "Conectado ao SQL Server",
    "150 registros encontrados no SQL Server",
    "Sincronização concluída: 10 novos, 140 atualizados, 0 erros"
  ],
  "detalhes_erros": []
}
```

### 4. Estatísticas

```bash
GET /api/stats
```

**Resposta:**
```json
{
  "total": 150,
  "sql_server": 140,
  "manuais": 10
}
```

## 🔧 Estrutura da Tabela SQL Server

A API espera que a tabela `AMSpesquisa` tenha as seguintes colunas:

```sql
- empresa (VARCHAR)
- Categoria (VARCHAR)
- Grupo (VARCHAR)
- Cliente (VARCHAR)
- Email_Cliente (VARCHAR)
- Prestador (VARCHAR)
- Nro_caso (VARCHAR)
- Tipo_Caso (VARCHAR)
- Ano_Abertura (INT)
- Mes_abertura (INT)
- Data_Resposta (DATETIME)
- Resposta (TEXT)
- Comentario_Pesquisa (TEXT)
```

## 🔒 Segurança

### Firewall

Certifique-se de que o servidor onde a API roda tem acesso ao SQL Server:

```bash
# Testar conectividade
telnet 172.26.2.136 1433
```

### Permissões SQL Server

O usuário `amsconsulta` precisa de permissão de leitura na tabela:

```sql
GRANT SELECT ON AMSpesquisa TO amsconsulta;
```

## 📊 Monitoramento

### Logs

A API registra logs detalhados no console:

```
Iniciando sincronização de pesquisas...
Conectado ao SQL Server
150 registros encontrados
Sincronização concluída: { novos: 10, atualizados: 140, erros: 0 }
```

### Erros Comuns

#### 1. Erro de Conexão

```
Error: Failed to connect to SQL Server
```

**Solução:**
- Verificar se o SQL Server está acessível
- Verificar firewall
- Verificar credenciais

#### 2. Timeout

```
Error: Request timeout
```

**Solução:**
- Aumentar timeout na configuração
- Verificar performance do SQL Server
- Adicionar índices na tabela

## 🔄 Integração com Frontend

No projeto principal, configure a URL da API:

```env
# .env.local
VITE_SYNC_API_URL=http://localhost:3001
```

Para produção, use a URL do servidor:

```env
VITE_SYNC_API_URL=https://api.seudominio.com
```

## 🐳 Deploy com Docker (Opcional)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

```bash
# Build
docker build -t pesquisas-sync-api .

# Run
docker run -p 3001:3001 --env-file .env pesquisas-sync-api
```

## 📝 Logs de Sincronização

A API registra cada sincronização no Supabase (opcional):

```typescript
// Adicionar em server.ts
await supabase.from('logs_sincronizacao').insert({
  tipo: 'pesquisas_sql_server',
  status: resultado.sucesso ? 'sucesso' : 'erro',
  total_processados: resultado.total_processados,
  novos: resultado.novos,
  atualizados: resultado.atualizados,
  erros: resultado.erros,
  data_execucao: new Date().toISOString()
});
```

## 🔧 Troubleshooting

### API não inicia

```bash
# Verificar porta em uso
lsof -i :3001

# Matar processo
kill -9 <PID>
```

### Erro de módulo não encontrado

```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro de TypeScript

```bash
# Rebuild
npm run build
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs da API
2. Testar endpoint `/health`
3. Testar endpoint `/api/test-connection`
4. Verificar configurações do SQL Server

---

**Desenvolvido para Books SND System**
