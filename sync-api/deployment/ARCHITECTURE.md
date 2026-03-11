# 🏗️ Arquitetura da Solução

Documentação da arquitetura completa da instalação da sync-api no servidor Windows.

---

## 📊 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVIDOR WINDOWS                         │
│                  (172.26.2.136 ou similar)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │ SQL Server   │                                          │
│  │ Port: 10443  │                                          │
│  └──────┬───────┘                                          │
│         │ localhost                                        │
│         ↓                                                  │
│  ┌──────────────┐                                          │
│  │  sync-api    │                                          │
│  │  Port: 3001  │                                          │
│  │  (Node.js)   │                                          │
│  └──────┬───────┘                                          │
│         │ localhost                                        │
│         ↓                                                  │
│  ┌──────────────┐                                          │
│  │    Nginx     │                                          │
│  │  Port: 443   │ ← HTTPS                                 │
│  │  (SSL/TLS)   │                                          │
│  └──────┬───────┘                                          │
│         │                                                  │
└─────────┼──────────────────────────────────────────────────┘
          │ HTTPS
          │ sync-api.seudominio.com.br
          ↓
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET / WAN                           │
└─────────────────────────────────────────────────────────────┘
          ↑ HTTPS
          │
┌─────────┴───────┐
│  Frontend       │
│  (Vercel)       │
│  HTTPS          │
└─────────────────┘
```

---

## 🔄 Fluxo de Dados

### 1. Sincronização (Backend)

```
[Frontend Vercel]
    ↓ HTTPS POST /api/sync-pesquisas
[Nginx :443]
    ↓ HTTP (localhost)
[sync-api :3001]
    ↓ SQL (localhost:10443)
[SQL Server]
    ↓ Dados
[sync-api]
    ↓ INSERT/UPDATE
[Supabase Database]
    ↓ Resposta
[sync-api]
    ↓ JSON
[Nginx]
    ↓ HTTPS
[Frontend Vercel]
```

### 2. Consulta de Dados (Frontend)

```
[Frontend Vercel]
    ↓ HTTPS
[Supabase Database]
    ↓ Dados
[Frontend Vercel]
```

**Nota:** Frontend consulta dados diretamente do Supabase, não da sync-api.

---

## 🔐 Camadas de Segurança

### Camada 1: Firewall do Servidor

```
┌─────────────────────────────────────┐
│         Firewall Windows            │
├─────────────────────────────────────┤
│ ✅ Porta 443 (HTTPS) - Aberta      │
│ ✅ Porta 80 (HTTP) - Aberta        │
│ ❌ Porta 3001 (sync-api) - Fechada │
│ ❌ Porta 10443 (SQL) - Fechada     │
└─────────────────────────────────────┘
```

### Camada 2: Nginx (Reverse Proxy)

```
┌─────────────────────────────────────┐
│              Nginx                  │
├─────────────────────────────────────┤
│ ✅ SSL/TLS (HTTPS)                 │
│ ✅ Rate Limiting                   │
│ ✅ CORS Headers                    │
│ ✅ Security Headers                │
│ ✅ Request Filtering               │
└─────────────────────────────────────┘
```

### Camada 3: sync-api (Aplicação)

```
┌─────────────────────────────────────┐
│            sync-api                 │
├─────────────────────────────────────┤
│ ✅ Validação de Dados              │
│ ✅ Autenticação Supabase           │
│ ✅ Tratamento de Erros             │
│ ✅ Logging                         │
└─────────────────────────────────────┘
```

### Camada 4: SQL Server

```
┌─────────────────────────────────────┐
│           SQL Server                │
├─────────────────────────────────────┤
│ ✅ Autenticação SQL                │
│ ✅ Permissões de Leitura           │
│ ✅ Conexão Local Apenas            │
└─────────────────────────────────────┘
```

---

## 📁 Estrutura de Diretórios

### Servidor Windows

```
C:\
├── apps\
│   └── books-sonda-sync-api\
│       ├── dist\                    # Código compilado
│       │   └── server.js
│       ├── node_modules\            # Dependências
│       ├── logs\                    # Logs da aplicação
│       │   └── service.log
│       ├── deployment\              # Scripts de instalação
│       │   ├── install-all.bat
│       │   ├── nginx.conf
│       │   └── ...
│       ├── .env                     # Configuração (PROTEGER!)
│       └── package.json
│
└── nginx\
    ├── conf\
    │   └── nginx.conf               # Configuração Nginx
    ├── logs\
    │   ├── access.log               # Logs de acesso
    │   └── error.log                # Logs de erro
    ├── ssl\
    │   ├── certificate.crt          # Certificado SSL
    │   └── private.key              # Chave privada (PROTEGER!)
    └── nginx.exe
```

---

## 🔧 Componentes e Responsabilidades

### SQL Server
- **Função**: Banco de dados fonte
- **Porta**: 10443 (interna)
- **Acesso**: Apenas localhost
- **Dados**: Tabelas AMSpesquisa, AMSespecialistas, etc.

### sync-api (Node.js)
- **Função**: API de sincronização
- **Porta**: 3001 (interna)
- **Acesso**: Apenas localhost (via Nginx)
- **Responsabilidades**:
  - Conectar ao SQL Server
  - Buscar dados
  - Transformar dados
  - Sincronizar com Supabase
  - Fornecer endpoints REST

### Nginx
- **Função**: Reverse proxy e SSL termination
- **Portas**: 80 (HTTP), 443 (HTTPS)
- **Acesso**: Internet/WAN
- **Responsabilidades**:
  - Fornecer HTTPS
  - Proxy reverso para sync-api
  - Rate limiting
  - Segurança (headers, CORS)
  - Logging

### Supabase
- **Função**: Banco de dados destino
- **Acesso**: Internet (HTTPS)
- **Responsabilidades**:
  - Armazenar dados sincronizados
  - Fornecer API para frontend
  - Autenticação
  - Real-time subscriptions

---

## 🚀 Fluxo de Deploy

### 1. Preparação

```
[Desenvolvedor]
    ↓ git push
[GitHub]
    ↓ download
[Servidor Windows]
```

### 2. Instalação

```
[Scripts de Instalação]
    ↓
[npm install]
    ↓
[npm run build]
    ↓
[Instalar Serviço Windows]
    ↓
[Configurar Nginx]
    ↓
[Configurar SSL]
    ↓
[Iniciar Serviços]
```

### 3. Verificação

```
[Test Scripts]
    ↓
[Health Checks]
    ↓
[Testes de Integração]
    ↓
[Monitoramento]
```

---

## 📊 Monitoramento

### Logs

```
┌─────────────────────────────────────┐
│            Logs                     │
├─────────────────────────────────────┤
│ sync-api:                           │
│   C:\apps\...\logs\service.log     │
│                                     │
│ Nginx:                              │
│   C:\nginx\logs\access.log         │
│   C:\nginx\logs\error.log          │
│                                     │
│ Windows Event Viewer:               │
│   Application Logs                  │
│   System Logs                       │
└─────────────────────────────────────┘
```

### Health Checks

```
┌─────────────────────────────────────┐
│         Health Checks               │
├─────────────────────────────────────┤
│ API:                                │
│   GET /health                       │
│   GET /api/test-connection          │
│                                     │
│ Nginx:                              │
│   GET /nginx-status (localhost)     │
│                                     │
│ Serviços Windows:                   │
│   sc query "Books SND Sync API"     │
│   sc query "Nginx"                  │
└─────────────────────────────────────┘
```

---

## 🔄 Processo de Atualização

### 1. Backup

```powershell
# Backup de configuração
copy C:\apps\books-sonda-sync-api\.env C:\backup\.env.backup
copy C:\nginx\conf\nginx.conf C:\backup\nginx.conf.backup
```

### 2. Parar Serviços

```powershell
net stop "Books SND Sync API"
net stop "Nginx"
```

### 3. Atualizar Código

```powershell
cd C:\apps\books-sonda-sync-api
git pull
npm install
npm run build
```

### 4. Reiniciar Serviços

```powershell
net start "Books SND Sync API"
net start "Nginx"
```

### 5. Verificar

```powershell
.\deployment\test-installation.bat
```

---

## 🎯 Vantagens desta Arquitetura

| Vantagem | Descrição |
|----------|-----------|
| **Performance** | Conexão local ao SQL Server (sem latência de rede) |
| **Segurança** | SQL Server não exposto à internet |
| **Simplicidade** | Sem necessidade de VPN em produção |
| **Escalabilidade** | Nginx pode fazer load balancing se necessário |
| **Confiabilidade** | Serviços Windows com auto-restart |
| **Manutenibilidade** | Logs centralizados e fácil troubleshooting |
| **HTTPS** | Certificado SSL válido via Let's Encrypt |

---

## 📈 Métricas de Performance

### Latência Esperada

```
┌─────────────────────────────────────┐
│         Latência (ms)               │
├─────────────────────────────────────┤
│ sync-api → SQL Server:    < 5ms     │
│ Nginx → sync-api:         < 1ms     │
│ Frontend → Nginx:         50-200ms  │
│ sync-api → Supabase:      100-300ms │
└─────────────────────────────────────┘
```

### Throughput

```
┌─────────────────────────────────────┐
│         Throughput                  │
├─────────────────────────────────────┤
│ Requisições/segundo:      ~100      │
│ Sincronizações/hora:      ~240      │
│ Registros/sincronização:  ~500      │
└─────────────────────────────────────┘
```

---

## 🔮 Evolução Futura

### Possíveis Melhorias

1. **Load Balancing**
   - Múltiplas instâncias da sync-api
   - Nginx como load balancer

2. **Cache**
   - Redis para cache de consultas
   - Reduzir carga no SQL Server

3. **Monitoramento Avançado**
   - Prometheus + Grafana
   - Alertas automáticos

4. **Backup Automático**
   - Backup diário da configuração
   - Snapshot do banco de dados

5. **CI/CD**
   - Deploy automatizado
   - Testes automatizados

---

**Desenvolvido para Books SND System**
