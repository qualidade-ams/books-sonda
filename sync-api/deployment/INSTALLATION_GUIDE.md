# 📦 Guia de Instalação Completo - Books SND Sync API

Este guia detalha a instalação da sync-api no servidor Windows com SQL Server, incluindo configuração de Nginx com HTTPS.

---

## 📋 Pré-requisitos

### Software Necessário

- ✅ **Windows Server** (2016 ou superior)
- ✅ **Node.js LTS** (18.x ou superior) - [Download](https://nodejs.org/)
- ✅ **Nginx para Windows** - [Download](http://nginx.org/en/download.html)
- ✅ **Git for Windows** (inclui OpenSSL) - [Download](https://git-scm.com/download/win)
- ✅ **SQL Server** já instalado e acessível

### Permissões

- ✅ Acesso de **Administrador** no servidor
- ✅ Permissões para criar serviços Windows
- ✅ Acesso ao SQL Server (usuário `amsconsulta`)

---

## 🚀 Instalação Rápida (Automatizada)

### Passo 1: Preparar Arquivos

```powershell
# 1. Copiar pasta sync-api para o servidor
# Via RDP, FTP, ou compartilhamento de rede

# 2. Extrair para:
C:\apps\books-sonda-sync-api\
```

### Passo 2: Executar Instalação Automatizada

```powershell
# Abrir PowerShell como Administrador
cd C:\apps\books-sonda-sync-api\deployment

# Executar instalação
.\install-all.bat
```

O script irá:
1. ✅ Verificar Node.js
2. ✅ Criar diretórios
3. ✅ Instalar dependências
4. ✅ Compilar TypeScript
5. ✅ Instalar como serviço Windows
6. ✅ Configurar firewall

### Passo 3: Instalar Nginx

```powershell
# 1. Baixar Nginx
# http://nginx.org/en/download.html

# 2. Extrair para C:\nginx\

# 3. Copiar configuração
copy C:\apps\books-sonda-sync-api\deployment\nginx.conf C:\nginx\conf\nginx.conf

# 4. Editar nginx.conf e ajustar server_name
notepad C:\nginx\conf\nginx.conf
# Alterar: server_name sync-api.seudominio.com.br;

# 5. Instalar Nginx como serviço
cd C:\apps\books-sonda-sync-api\deployment
.\install-nginx-service.bat
```

### Passo 4: Configurar SSL

#### Opção A: Certificado Self-Signed (Teste)

```powershell
cd C:\apps\books-sonda-sync-api\deployment
.\generate-ssl-cert.bat
```

⚠️ **Apenas para testes!** Navegadores mostrarão aviso de segurança.

#### Opção B: Let's Encrypt (Produção) ⭐ RECOMENDADO

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
#    - Certificado será salvo automaticamente em C:\nginx\ssl\
```

#### Opção C: Certificado Comercial

```powershell
# 1. Obter certificado do administrador de rede
# 2. Copiar arquivos para C:\nginx\ssl\
#    - certificate.crt
#    - private.key
# 3. Atualizar caminhos no nginx.conf
```

### Passo 5: Testar Instalação

```powershell
cd C:\apps\books-sonda-sync-api\deployment
.\test-installation.bat
```

---

## 🔧 Instalação Manual (Passo a Passo)

### 1. Instalar Node.js

```powershell
# Baixar e instalar Node.js LTS
# https://nodejs.org/

# Verificar instalação
node --version
npm --version
```

### 2. Preparar Diretórios

```powershell
# Criar estrutura de diretórios
mkdir C:\apps\books-sonda-sync-api
mkdir C:\apps\books-sonda-sync-api\logs

# Copiar arquivos da sync-api
# (via RDP, FTP, ou compartilhamento de rede)
```

### 3. Configurar Ambiente

```powershell
cd C:\apps\books-sonda-sync-api

# Copiar arquivo de configuração
copy deployment\.env.production .env

# Editar configuração
notepad .env

# Ajustar valores:
# - SQL_SERVER=localhost (pois está no mesmo servidor)
# - SQL_PASSWORD=sua_senha
# - SUPABASE_SERVICE_KEY=sua_chave
```

### 4. Instalar Dependências

```powershell
cd C:\apps\books-sonda-sync-api

# Instalar dependências
npm install

# Compilar TypeScript
npm run build
```

### 5. Instalar como Serviço Windows

```powershell
# Instalar node-windows globalmente
npm install -g node-windows

# Instalar serviço
node deployment\install-service.js

# Verificar status
sc query "Books SND Sync API"
```

### 6. Configurar Firewall

```powershell
# Abrir porta 3001 (API)
netsh advfirewall firewall add rule name="Books SND Sync API" dir=in action=allow protocol=TCP localport=3001

# Abrir porta 80 (HTTP)
netsh advfirewall firewall add rule name="Nginx HTTP" dir=in action=allow protocol=TCP localport=80

# Abrir porta 443 (HTTPS)
netsh advfirewall firewall add rule name="Nginx HTTPS" dir=in action=allow protocol=TCP localport=443
```

### 7. Instalar e Configurar Nginx

```powershell
# Baixar Nginx
# http://nginx.org/en/download.html

# Extrair para C:\nginx\

# Copiar configuração
copy C:\apps\books-sonda-sync-api\deployment\nginx.conf C:\nginx\conf\nginx.conf

# Editar configuração
notepad C:\nginx\conf\nginx.conf
# Ajustar: server_name sync-api.seudominio.com.br;

# Testar configuração
cd C:\nginx
nginx -t

# Instalar como serviço
cd C:\apps\books-sonda-sync-api\deployment
.\install-nginx-service.bat
```

### 8. Configurar DNS

Adicionar registro DNS:

```
Tipo: A
Nome: sync-api.seudominio.com.br
Valor: IP_PUBLICO_DO_SERVIDOR
TTL: 3600
```

**Para rede interna apenas:**
- Adicionar entrada no arquivo `hosts` dos clientes
- Ou configurar DNS interno da empresa

### 9. Testar Instalação

```powershell
# Testar API local
curl http://localhost:3001/health

# Testar Nginx local
curl -k https://localhost/health

# Testar externamente (de outro PC)
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

Após instalação bem-sucedida, atualizar configuração do frontend:

**Arquivo: `.env.production`**

```env
# Configuração do Supabase
VITE_SUPABASE_URL=https://qiahexepsdggkzgmklhq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_RFyt_JWwjtthTkDBiKE9vA_RIGt4KUD

# URL da API de sincronização - HTTPS via Nginx
VITE_SYNC_API_URL=https://sync-api.seudominio.com.br
```

Fazer deploy do frontend na Vercel com nova configuração.

---

## 📊 Comandos Úteis

### Gerenciar Sync API

```powershell
# Iniciar serviço
net start "Books SND Sync API"

# Parar serviço
net stop "Books SND Sync API"

# Reiniciar serviço
net stop "Books SND Sync API" && net start "Books SND Sync API"

# Ver status
sc query "Books SND Sync API"

# Ver logs
type C:\apps\books-sonda-sync-api\logs\service.log
```

### Gerenciar Nginx

```powershell
# Iniciar
cd C:\nginx
start nginx

# Parar
nginx -s stop

# Reiniciar
nginx -s reload

# Testar configuração
nginx -t

# Ver logs de acesso
type C:\nginx\logs\access.log

# Ver logs de erro
type C:\nginx\logs\error.log
```

### Testar Endpoints

```powershell
# Health check
curl https://sync-api.seudominio.com.br/health

# Testar conexão SQL
curl https://sync-api.seudominio.com.br/api/test-connection

# Sincronizar pesquisas
curl -X POST https://sync-api.seudominio.com.br/api/sync-pesquisas

# Ver estatísticas
curl https://sync-api.seudominio.com.br/api/stats
```

---

## 🐛 Troubleshooting

### Problema: Serviço não inicia

```powershell
# Ver logs do serviço
type C:\apps\books-sonda-sync-api\logs\service.log

# Verificar se porta 3001 está em uso
netstat -ano | findstr :3001

# Testar manualmente
cd C:\apps\books-sonda-sync-api
node dist\server.js
```

### Problema: Nginx retorna 502 Bad Gateway

```powershell
# Verificar se sync-api está rodando
sc query "Books SND Sync API"

# Testar API diretamente
curl http://localhost:3001/health

# Ver logs do Nginx
type C:\nginx\logs\error.log
```

### Problema: Certificado SSL inválido

```powershell
# Verificar certificado
cd C:\nginx\ssl
openssl x509 -in certificate.crt -text -noout

# Verificar chave privada
openssl rsa -in private.key -check

# Testar configuração SSL do Nginx
cd C:\nginx
nginx -t
```

### Problema: Erro de conexão SQL Server

```powershell
# Testar conectividade
Test-NetConnection -ComputerName localhost -Port 10443

# Verificar credenciais no .env
notepad C:\apps\books-sonda-sync-api\.env

# Testar conexão via API
curl http://localhost:3001/api/test-connection
```

---

## 🔒 Checklist de Segurança

- [ ] Firewall configurado (apenas portas necessárias)
- [ ] Certificado SSL válido (não self-signed em produção)
- [ ] Credenciais SQL em arquivo `.env` protegido
- [ ] Nginx atualizado para última versão
- [ ] Rate limiting configurado no Nginx
- [ ] Logs monitorados regularmente
- [ ] Backup da configuração
- [ ] DNS configurado corretamente
- [ ] Serviços configurados para iniciar automaticamente

---

## 📞 Suporte

Para problemas ou dúvidas:

1. Verificar logs:
   - Sync API: `C:\apps\books-sonda-sync-api\logs\service.log`
   - Nginx: `C:\nginx\logs\error.log`

2. Executar teste de instalação:
   ```powershell
   cd C:\apps\books-sonda-sync-api\deployment
   .\test-installation.bat
   ```

3. Consultar documentação:
   - Nginx: http://nginx.org/en/docs/
   - Node.js: https://nodejs.org/docs/
   - win-acme: https://www.win-acme.com/manual/getting-started

---

**Desenvolvido para Books SND System**
