# Solução para Mixed Content - API de Sincronização

## Problema

Em produção HTTPS (`https://books-sonda.vercel.app`), o navegador bloqueia requisições HTTP para a API (`http://SAPSERVDB.sondait.com.br:3001`) devido à política de Mixed Content.

### Erros Observados
- `ERR_SSL_PROTOCOL_ERROR`
- `ERR_CONNECTION_RESET`
- `Failed to fetch`
- `Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'`

## Soluções Implementadas

### 1. SafeFetch com Fallback Automático
```typescript
// src/utils/apiConfig.ts
export async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    // Tenta protocolo alternativo automaticamente
    if (url.startsWith('https://')) {
      return await fetch(url.replace('https://', 'http://'), options);
    } else if (url.startsWith('http://')) {
      return await fetch(url.replace('http://', 'https://'), options);
    }
    throw error;
  }
}
```

### 2. Configuração Inteligente de Protocolo
```typescript
export function getApiBaseUrl(): string {
  const baseHost = 'SAPSERVDB.sondait.com.br:3001';
  
  if (isDevelopment()) {
    return `http://${baseHost}`;
  } else {
    // Em produção, usa HTTP (servidor não suporta HTTPS ainda)
    return `http://${baseHost}`;
  }
}
```

### 3. Handler de Mixed Content (Experimental)
```typescript
// src/utils/mixedContentHandler.ts
export async function smartFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (isHttpsEnvironment() && isHttpUrl(url)) {
      // Usa proxy para contornar Mixed Content
      return await fetchViaProxy(url, options);
    }
    throw error;
  }
}
```

## Soluções Permanentes Recomendadas

### Opção 1: Configurar HTTPS no Servidor da API ⭐ RECOMENDADO
```bash
# No servidor SAPSERVDB.sondait.com.br
# 1. Instalar certificado SSL (Let's Encrypt)
sudo certbot --nginx -d SAPSERVDB.sondait.com.br

# 2. Configurar NGINX para HTTPS na porta 3001
server {
    listen 3001 ssl;
    server_name SAPSERVDB.sondait.com.br;
    
    ssl_certificate /etc/letsencrypt/live/SAPSERVDB.sondait.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SAPSERVDB.sondait.com.br/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000; # API interna
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Opção 2: Proxy Reverso na Aplicação
```typescript
// vercel.json
{
  "rewrites": [
    {
      "source": "/api/sync/:path*",
      "destination": "http://SAPSERVDB.sondait.com.br:3001/api/:path*"
    }
  ]
}
```

### Opção 3: Função Serverless como Proxy
```typescript
// api/sync-proxy.ts (Vercel Function)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiUrl = `http://SAPSERVDB.sondait.com.br:3001/api/${path}`;
  
  const response = await fetch(apiUrl, {
    method: req.method,
    headers: req.headers,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
```

## Status Atual

✅ **Implementado:**
- SafeFetch com fallback automático
- Configuração inteligente de protocolo
- Logs detalhados para debugging
- Handler experimental de Mixed Content

⏳ **Pendente:**
- Configuração HTTPS no servidor da API
- Implementação de proxy definitivo

## Teste da Solução

```bash
# Executar script de teste
node test-api-ssl.js

# Ou testar manualmente
curl -k http://SAPSERVDB.sondait.com.br:3001/health
curl -k https://SAPSERVDB.sondait.com.br:3001/health
```

## Monitoramento

O diagnóstico da API mostra:
- ✅ Status da conexão
- 🔍 Protocolo utilizado
- ⚠️ Problemas de Mixed Content
- 📊 Tempos de resposta

Acesse: **Admin → Lançar Pesquisas → Diagnóstico da API**