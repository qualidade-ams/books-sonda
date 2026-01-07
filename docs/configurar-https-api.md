# Configurar HTTPS na API de Sincronização

## 🚨 Problema Identificado

**Mixed Content Error**: A aplicação em produção roda em HTTPS, mas a API está configurada para HTTP, causando bloqueio pelo navegador.

```
Mixed Content: The page at 'https://...' was loaded over HTTPS, 
but requested an insecure resource 'http://SAPSERVDB.sondait.com.br:3001'. 
This request has been blocked; the content must be served over HTTPS.
```

## ✅ Soluções Implementadas no Frontend

### 1. Configuração Inteligente de Protocolo
- ✅ Detecção automática de ambiente (dev/prod)
- ✅ Seleção automática de protocolo (HTTP/HTTPS)
- ✅ Fallback inteligente em caso de erro
- ✅ Arquivo `.env.production` para configuração específica

### 2. Tratamento de Erros Melhorado
- ✅ Detecção específica de Mixed Content
- ✅ Mensagens de erro mais claras
- ✅ Tentativa automática de protocolo alternativo

## 🔧 Configuração Necessária no Servidor

### **Opção 1: Proxy Reverso com Nginx (Recomendado)**

#### 1.1. Instalar Certificado SSL
```bash
# Usando Let's Encrypt (gratuito)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d SAPSERVDB.sondait.com.br
```

#### 1.2. Configurar Nginx
```nginx
# /etc/nginx/sites-available/api-sync
server {
    listen 443 ssl http2;
    server_name SAPSERVDB.sondait.com.br;
    
    # Certificados SSL (gerados pelo certbot)
    ssl_certificate /etc/letsencrypt/live/SAPSERVDB.sondait.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SAPSERVDB.sondait.com.br/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Proxy para a API Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name SAPSERVDB.sondait.com.br;
    return 301 https://$server_name$request_uri;
}
```

#### 1.3. Ativar Configuração
```bash
sudo ln -s /etc/nginx/sites-available/api-sync /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Opção 2: HTTPS Direto na API Node.js**

#### 2.1. Gerar/Obter Certificados SSL
```bash
# Opção A: Let's Encrypt (recomendado)
sudo certbot certonly --standalone -d SAPSERVDB.sondait.com.br

# Opção B: Certificado auto-assinado (apenas para teste)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

#### 2.2. Modificar API Node.js
```javascript
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();

// Configurar rotas da API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test-connection', (req, res) => {
  // Lógica de teste de conexão SQL Server
  res.json({ success: true, message: 'Conexão OK' });
});

// Configuração HTTPS
const httpsOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/SAPSERVDB.sondait.com.br/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/SAPSERVDB.sondait.com.br/fullchain.pem')
};

// Iniciar servidor HTTPS
https.createServer(httpsOptions, app).listen(3001, () => {
  console.log('🚀 API rodando em HTTPS na porta 3001');
  console.log('🔒 Certificado SSL carregado com sucesso');
});

// Opcional: Redirecionar HTTP para HTTPS
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(301, { 
    Location: `https://${req.headers.host}${req.url}` 
  });
  res.end();
}).listen(80, () => {
  console.log('🔄 Redirecionamento HTTP -> HTTPS ativo na porta 80');
});
```

### **Opção 3: Usar Cloudflare (Mais Simples)**

#### 3.1. Configurar DNS no Cloudflare
1. Adicionar domínio `SAPSERVDB.sondait.com.br` no Cloudflare
2. Configurar registro A apontando para o IP do servidor
3. Ativar proxy (nuvem laranja)

#### 3.2. Configurar SSL/TLS
1. SSL/TLS → Overview → Full (strict)
2. Edge Certificates → Always Use HTTPS: ON
3. Edge Certificates → Automatic HTTPS Rewrites: ON

#### 3.3. Manter API em HTTP (Cloudflare faz o proxy)
A API pode continuar rodando em HTTP na porta 3001, pois o Cloudflare fará o proxy HTTPS.

## 🧪 Testar Configuração

### 1. Teste Manual
```bash
# Testar HTTPS
curl -k http://SAPSERVDB.sondait.com.br:3001/health

# Verificar certificado
openssl s_client -connect SAPSERVDB.sondait.com.br:3001 -servername SAPSERVDB.sondait.com.br
```

### 2. Teste no Frontend
1. Fazer deploy da aplicação com as correções
2. Acessar página "Lançar Pesquisas"
3. Clicar em "Diagnóstico API"
4. Verificar se todos os testes passam

### 3. Verificar Logs
```bash
# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs da API Node.js
pm2 logs api-sync
```

## 📋 Checklist de Implementação

### Servidor:
- [ ] Certificado SSL instalado
- [ ] Nginx configurado (se usando proxy)
- [ ] API modificada para HTTPS (se não usando proxy)
- [ ] Firewall configurado (portas 80, 443)
- [ ] Teste de conectividade HTTPS funcionando

### Frontend:
- [x] Configuração inteligente de protocolo implementada
- [x] Tratamento de Mixed Content implementado
- [x] Arquivo `.env.production` criado
- [x] Componente de diagnóstico atualizado
- [ ] Deploy em produção realizado
- [ ] Teste completo em produção

## 🚀 Deploy e Verificação

### 1. Build e Deploy
```bash
# Build com configuração de produção
npm run build

# Deploy (exemplo com Vercel)
vercel --prod
```

### 2. Verificação Final
1. ✅ Aplicação carrega sem erros de Mixed Content
2. ✅ Diagnóstico da API mostra todos os testes OK
3. ✅ Sincronização funciona corretamente
4. ✅ Logs não mostram erros de conectividade

## 📞 Suporte

Se precisar de ajuda com a configuração:

1. **Logs detalhados**: Use o componente de diagnóstico para gerar relatório
2. **Teste de conectividade**: Verifique se a API responde via HTTPS
3. **Certificados**: Verifique se os certificados SSL estão válidos
4. **Firewall**: Confirme que as portas 80 e 443 estão abertas

---

**Nota**: A configuração com Nginx (Opção 1) é a mais recomendada para produção, pois oferece melhor performance, cache e flexibilidade.