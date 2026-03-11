# 📦 Deployment - Books SND Sync API

Arquivos de configuração para instalação da sync-api no servidor Windows com Nginx e HTTPS.

---

## 📁 Arquivos Incluídos

### Configuração

- **`nginx.conf`** - Configuração completa do Nginx com HTTPS e reverse proxy
- **`.env.production`** - Variáveis de ambiente para produção

### Scripts de Instalação

- **`install-all.bat`** - Instalação automatizada completa
- **`install-service.js`** - Instalar sync-api como serviço Windows
- **`uninstall-service.js`** - Desinstalar serviço Windows
- **`install-nginx-service.bat`** - Instalar Nginx como serviço Windows
- **`generate-ssl-cert.bat`** - Gerar certificado SSL self-signed (teste)
- **`test-installation.bat`** - Testar instalação completa

### Documentação

- **`INSTALLATION_GUIDE.md`** - Guia completo de instalação passo a passo

---

## 🚀 Instalação Rápida

### 1. Preparar Servidor

```powershell
# Instalar Node.js LTS
# https://nodejs.org/

# Instalar Nginx
# http://nginx.org/en/download.html
# Extrair para C:\nginx\

# Instalar Git for Windows (inclui OpenSSL)
# https://git-scm.com/download/win
```

### 2. Copiar Arquivos

```powershell
# Copiar pasta sync-api para:
C:\apps\books-sonda-sync-api\
```

### 3. Executar Instalação

```powershell
# Abrir PowerShell como Administrador
cd C:\apps\books-sonda-sync-api\deployment

# Executar instalação automatizada
.\install-all.bat
```

### 4. Configurar Nginx

```powershell
# Copiar configuração
copy nginx.conf C:\nginx\conf\nginx.conf

# Editar e ajustar server_name
notepad C:\nginx\conf\nginx.conf

# Instalar como serviço
.\install-nginx-service.bat
```

### 5. Configurar SSL

**Opção A: Teste (Self-Signed)**
```powershell
.\generate-ssl-cert.bat
```

**Opção B: Produção (Let's Encrypt)**
```powershell
# Baixar win-acme: https://www.win-acme.com/
cd C:\win-acme
.\wacs.exe
```

### 6. Testar

```powershell
.\test-installation.bat
```

---

## 📋 Checklist de Instalação

- [ ] Node.js instalado
- [ ] Nginx instalado em `C:\nginx\`
- [ ] Arquivos copiados para `C:\apps\books-sonda-sync-api\`
- [ ] `.env` configurado com credenciais corretas
- [ ] Serviço sync-api instalado e rodando
- [ ] Nginx configurado com `server_name` correto
- [ ] Certificado SSL configurado
- [ ] Serviço Nginx instalado e rodando
- [ ] Firewall configurado (portas 80, 443, 3001)
- [ ] DNS configurado
- [ ] Testes passando

---

## 🔧 Comandos Úteis

### Sync API

```powershell
# Iniciar
net start "Books SND Sync API"

# Parar
net stop "Books SND Sync API"

# Status
sc query "Books SND Sync API"

# Logs
type C:\apps\books-sonda-sync-api\logs\service.log
```

### Nginx

```powershell
# Iniciar
cd C:\nginx
start nginx

# Parar
nginx -s stop

# Recarregar
nginx -s reload

# Testar configuração
nginx -t

# Logs
type C:\nginx\logs\error.log
```

---

## 🌐 Endpoints

Após instalação:

- **Health Check**: `https://sync-api.seudominio.com.br/health`
- **Testar Conexão SQL**: `https://sync-api.seudominio.com.br/api/test-connection`
- **Sincronizar Pesquisas**: `POST https://sync-api.seudominio.com.br/api/sync-pesquisas`
- **Estatísticas**: `https://sync-api.seudominio.com.br/api/stats`

---

## 📖 Documentação Completa

Ver **`INSTALLATION_GUIDE.md`** para:
- Instalação manual passo a passo
- Troubleshooting detalhado
- Configuração avançada
- Checklist de segurança

---

## 🔒 Segurança

### Produção

- ✅ Use certificado SSL válido (Let's Encrypt ou comercial)
- ✅ Configure firewall corretamente
- ✅ Proteja arquivo `.env` com credenciais
- ✅ Monitore logs regularmente
- ✅ Mantenha Nginx e Node.js atualizados

### Teste/Desenvolvimento

- ⚠️ Certificado self-signed é aceitável
- ⚠️ Pode usar em rede interna apenas

---

## 📞 Suporte

Problemas? Consulte:

1. **Logs**:
   - Sync API: `C:\apps\books-sonda-sync-api\logs\service.log`
   - Nginx: `C:\nginx\logs\error.log`

2. **Teste de instalação**:
   ```powershell
   .\test-installation.bat
   ```

3. **Documentação completa**: `INSTALLATION_GUIDE.md`

---

**Desenvolvido para Books SND System**
