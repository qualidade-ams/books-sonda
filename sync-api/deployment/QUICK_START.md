# ⚡ Quick Start - Instalação Rápida

Guia rápido para instalar Books SND Sync API no servidor Windows com Nginx e HTTPS.

---

## 🎯 Objetivo

Instalar sync-api no mesmo servidor do SQL Server para:
- ✅ Eliminar necessidade de VPN
- ✅ Adicionar HTTPS via Nginx
- ✅ Melhorar performance (conexão local ao SQL)
- ✅ Habilitar botão de sincronização em produção

---

## 📋 Pré-requisitos (5 minutos)

### 1. Instalar Node.js
```
https://nodejs.org/
Baixar versão LTS e instalar
```

### 2. Instalar Nginx
```
http://nginx.org/en/download.html
Baixar versão Windows e extrair para C:\nginx\
```

### 3. Instalar Git for Windows (para OpenSSL)
```
https://git-scm.com/download/win
Instalar com configurações padrão
```

---

## 🚀 Instalação (10 minutos)

### Passo 1: Copiar Arquivos

```powershell
# Copiar pasta sync-api para:
C:\apps\books-sonda-sync-api\
```

### Passo 2: Executar Instalação Automatizada

```powershell
# Abrir PowerShell como Administrador
cd C:\apps\books-sonda-sync-api\deployment

# Executar
.\install-all.bat
```

O script irá:
- ✅ Verificar Node.js
- ✅ Criar diretórios
- ✅ Instalar dependências
- ✅ Compilar código
- ✅ Instalar como serviço Windows
- ✅ Configurar firewall

### Passo 3: Configurar Nginx

```powershell
# 1. Copiar configuração
copy nginx.conf C:\nginx\conf\nginx.conf

# 2. Editar e ajustar domínio
notepad C:\nginx\conf\nginx.conf
# Alterar linha 52: server_name sync-api.seudominio.com.br;

# 3. Instalar como serviço
.\install-nginx-service.bat
```

### Passo 4: Configurar SSL

**Para TESTE (certificado self-signed):**
```powershell
.\generate-ssl-cert.bat
```

**Para PRODUÇÃO (Let's Encrypt):**
```powershell
# 1. Baixar win-acme
# https://www.win-acme.com/

# 2. Extrair para C:\win-acme\

# 3. Executar
cd C:\win-acme
.\wacs.exe

# 4. Seguir wizard:
#    - Create certificate (full options)
#    - Manual input
#    - Domínio: sync-api.seudominio.com.br
#    - Validação: HTTP validation
```

### Passo 5: Configurar DNS

Adicionar registro DNS:
```
Tipo: A
Nome: sync-api.seudominio.com.br
Valor: IP_DO_SERVIDOR
```

### Passo 6: Testar

```powershell
.\test-installation.bat
```

---

## ✅ Verificação

### Testar Localmente

```powershell
# API direta
curl http://localhost:3001/health

# Nginx HTTPS
curl -k https://localhost/health
```

### Testar Externamente

```powershell
# De outro PC
curl https://sync-api.seudominio.com.br/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-10T...",
  "config": {
    "server": "localhost",
    "database": "Aranda"
  }
}
```

---

## 🔄 Atualizar Frontend

Após instalação bem-sucedida:

**Arquivo: `.env.production`**
```env
VITE_SYNC_API_URL=https://sync-api.seudominio.com.br
```

Fazer deploy na Vercel.

---

## 🎉 Pronto!

Agora o botão "Sincronizar SQL Server" funcionará em produção!

```
Frontend (Vercel HTTPS)
    ↓
Nginx (HTTPS)
    ↓
sync-api (localhost:3001)
    ↓
SQL Server (localhost:10443)
```

---

## 📊 Comandos Úteis

```powershell
# Ver status dos serviços
sc query "Books SND Sync API"
sc query "Nginx"

# Reiniciar serviços
net stop "Books SND Sync API" && net start "Books SND Sync API"
net stop "Nginx" && net start "Nginx"

# Ver logs
type C:\apps\books-sonda-sync-api\logs\service.log
type C:\nginx\logs\error.log

# Testar endpoints
curl https://sync-api.seudominio.com.br/health
curl https://sync-api.seudominio.com.br/api/test-connection
```

---

## 🐛 Problemas?

### Serviço não inicia
```powershell
# Ver logs
type C:\apps\books-sonda-sync-api\logs\service.log

# Testar manualmente
cd C:\apps\books-sonda-sync-api
node dist\server.js
```

### Nginx retorna 502
```powershell
# Verificar se sync-api está rodando
sc query "Books SND Sync API"

# Testar API diretamente
curl http://localhost:3001/health
```

### Certificado SSL inválido
```powershell
# Verificar certificado
cd C:\nginx\ssl
openssl x509 -in certificate.crt -text -noout

# Testar configuração Nginx
cd C:\nginx
nginx -t
```

---

## 📖 Documentação Completa

Para mais detalhes, consulte:
- **`INSTALLATION_GUIDE.md`** - Guia completo passo a passo
- **`README.md`** - Visão geral dos arquivos

---

## 🎯 Próximos Passos

1. ✅ Monitorar logs regularmente
2. ✅ Configurar backup automático
3. ✅ Adicionar monitoramento de uptime
4. ✅ Documentar procedimentos de manutenção

---

**Tempo total de instalação: ~15 minutos**

**Desenvolvido para Books SND System**
