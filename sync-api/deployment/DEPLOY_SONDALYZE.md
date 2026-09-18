# 🚀 Deploy da Sync API em Produção — sondalyze.com.br

Guia consolidado para colocar a **sync-api** em produção no **servidor Windows interno** (mesmo servidor do SQL Server), exposta por HTTPS via Nginx no subdomínio `sync-api.sondalyze.com.br`.

> **Arquitetura (Opção A):**
> `Frontend (https://sondalyze.com.br)` → `Nginx HTTPS (443)` → `sync-api (localhost:3001)` → `SQL Server (localhost)` + `Supabase`

> ⚠️ **A homologação NÃO é afetada.** Ela continua usando `.env.local` com `VITE_SYNC_API_URL=http://localhost:3001`. Nada neste guia altera o ambiente de homologação/dev.

---

## 0. Pré-requisitos

- Acesso **Administrador** ao servidor Windows onde roda o SQL Server
- Node.js LTS 18+ instalado ([nodejs.org](https://nodejs.org/))
- Nginx para Windows ([nginx.org](http://nginx.org/en/download.html))
- Git for Windows (traz o OpenSSL) ([git-scm.com](https://git-scm.com/download/win))
- Capacidade de criar registro DNS `A` para `sync-api.sondalyze.com.br`
- Portas 80 e 443 liberadas no firewall/entrada de rede para o servidor

---

## 1. Confirmar dados do ambiente (ANTES de começar)

Dois valores precisam ser confirmados no servidor:

| Item | Valor sugerido | Como confirmar |
|------|----------------|----------------|
| Porta do SQL Server (local) | `10443` | `Test-NetConnection -ComputerName localhost -Port 10443` (teste também 1433) |
| Senha do usuário `amsconsulta` | (a senha real) | Com o DBA / administrador do SQL |

> O projeto tem histórico com a porta **10443**. Se o teste acima falhar nela, tente **1433**.

---

## 2. Copiar a sync-api para o servidor

```powershell
# Criar estrutura
mkdir C:\apps\books-sonda-sync-api
mkdir C:\apps\books-sonda-sync-api\logs

# Copiar o conteúdo da pasta sync-api do repositório para:
# C:\apps\books-sonda-sync-api\
# (via RDP, compartilhamento de rede, git clone, etc.)
```

---

## 3. Configurar o `.env` de produção

```powershell
cd C:\apps\books-sonda-sync-api

# Usar o modelo específico de produção do sondalyze
copy deployment\.env.production.sondalyze .env

# Editar e preencher os valores reais
notepad .env
```

No `.env`, ajustar:

- `SQL_PORT` → confirmar `10443` ou `1433` (conforme passo 1)
- `SQL_PASSWORD` → **senha real** do `amsconsulta` (substituir o placeholder)
- `SUPABASE_SERVICE_KEY` → **service key real** do Supabase (substituir o placeholder)

> A `SUPABASE_SERVICE_KEY` é secreta e dá acesso administrativo ao banco. Nunca a exponha no frontend nem a comite.

---

## 4. Instalar dependências e compilar

```powershell
cd C:\apps\books-sonda-sync-api

npm install
npm run build   # gera dist/server.js
```

Teste rápido antes de virar serviço:

```powershell
node dist\server.js
# Em outro terminal:
curl http://localhost:3001/health
curl http://localhost:3001/api/test-connection
# Ctrl+C para parar o teste
```

Se `/api/test-connection` retornar `success: true`, o acesso ao SQL Server está ok.

---

## 5. Instalar como serviço Windows

```powershell
npm install -g node-windows
node deployment\install-service.js

# Verificar
sc query "Books SND Sync API"
```

O serviço fica configurado para iniciar automaticamente com o Windows.

---

## 6. Firewall

```powershell
# HTTP e HTTPS (Nginx) - expostos externamente
netsh advfirewall firewall add rule name="Nginx HTTP" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Nginx HTTPS" dir=in action=allow protocol=TCP localport=443
```

> **Não** exponha a porta **3001** externamente. A sync-api deve ser acessível apenas pelo Nginx (localhost). Se houver uma regra antiga abrindo a 3001, remova-a.

---

## 7. Instalar e configurar o Nginx

```powershell
# 1. Extrair Nginx para C:\nginx\

# 2. Copiar a configuração (já vem com server_name sync-api.sondalyze.com.br)
copy C:\apps\books-sonda-sync-api\deployment\nginx.conf C:\nginx\conf\nginx.conf

# 3. Testar a configuração
cd C:\nginx
nginx -t
```

---

## 8. Certificado SSL

### Opção recomendada — Let's Encrypt (win-acme)

```powershell
# Baixar win-acme: https://www.win-acme.com/
cd C:\win-acme
.\wacs.exe
# Wizard:
#   - Create certificate (full options)
#   - Manual input → domínio: sync-api.sondalyze.com.br
#   - Validação: HTTP (a porta 80 precisa estar acessível externamente)
#   - Salvar em C:\nginx\ssl\ (certificate.crt / private.key)
```

### Alternativa — Certificado comercial da Sonda

Copie os arquivos para `C:\nginx\ssl\certificate.crt` e `C:\nginx\ssl\private.key` (ou ajuste os caminhos no `nginx.conf`).

### Apenas para teste — Self-signed

```powershell
cd C:\apps\books-sonda-sync-api\deployment
.\generate-ssl-cert.bat   # CN já configurado para sync-api.sondalyze.com.br
```

> Self-signed gera aviso de segurança no navegador. Não use em produção real.

Após ter os certificados:

```powershell
cd C:\nginx
nginx -t          # validar
nginx -s reload   # aplicar (ou 'start nginx' se ainda não estiver rodando)
```

---

## 9. DNS

Criar registro no provedor do domínio `sondalyze.com.br`:

```
Tipo:  A
Nome:  sync-api        (resulta em sync-api.sondalyze.com.br)
Valor: IP_PUBLICO_DO_SERVIDOR
TTL:   3600
```

Validar a propagação:

```powershell
nslookup sync-api.sondalyze.com.br
```

---

## 10. Testes de aceitação (do servidor e de fora)

```powershell
# Local (no servidor)
curl http://localhost:3001/health
curl -k https://localhost/health

# Externo (de outra máquina)
curl https://sync-api.sondalyze.com.br/health
curl https://sync-api.sondalyze.com.br/api/test-connection
```

Resposta esperada do `/health`:

```json
{ "status": "ok", "config": { "server": "localhost", "database": "Aranda" } }
```

No navegador, abrir `https://sync-api.sondalyze.com.br/health` e conferir o cadeado válido (sem aviso de certificado).

---

## 11. Publicar o frontend com a nova URL

O arquivo `.env.production` do frontend já foi atualizado para:

```env
VITE_SYNC_API_URL=https://sync-api.sondalyze.com.br
```

Basta fazer o deploy do frontend na Vercel (ou garantir que a variável `VITE_SYNC_API_URL` esteja com esse valor no ambiente de produção da Vercel). Confira também a variável no painel da Vercel, pois ela pode sobrescrever o arquivo.

Após publicar, valide na tela de diagnóstico da aplicação (componente `DiagnosticoApi`) que a URL exibida é `https://sync-api.sondalyze.com.br`.

---

## 12. Validar a sincronização ponta a ponta

Pela interface do Books SND (módulo Pesquisas), rode uma sincronização e confirme que os dados chegam ao Supabase. Ou via curl:

```powershell
curl -X POST https://sync-api.sondalyze.com.br/api/sync-pesquisas
curl https://sync-api.sondalyze.com.br/api/validate-sync
```

---

## 🔐 Recomendações de segurança

1. **Rotacionar a senha do SQL `amsconsulta`.** O arquivo `sync-api/.env.temp` esteve versionado no histórico do git com a senha em texto plano. Remover do índice (já feito) não apaga o histórico — a forma segura é trocar a senha no SQL Server e atualizar o `.env` do servidor.
2. **Rotacionar a `SUPABASE_SERVICE_KEY`** se houver qualquer suspeita de que tenha sido versionada ou compartilhada.
3. Manter a porta **3001 fechada** para acesso externo (somente Nginx acessa via localhost).
4. Restringir o CORS: hoje o `nginx.conf` usa `Access-Control-Allow-Origin: *`. Depois de estabilizar, considere trocar por `https://sondalyze.com.br` (e a origem da homologação, se aplicável).
5. Proteger o `.env` do servidor: `icacls C:\apps\books-sonda-sync-api\.env` — apenas Administradores devem ter acesso.

---

## 🔁 Comandos de operação do dia a dia

```powershell
# Sync API
net start "Books SND Sync API"
net stop "Books SND Sync API"
sc query "Books SND Sync API"
type C:\apps\books-sonda-sync-api\logs\service.log

# Nginx
cd C:\nginx
start nginx
nginx -s reload
nginx -s stop
type C:\nginx\logs\error.log
```

---

## ↩️ Rollback rápido

Se algo der errado após apontar o frontend para a nova API, é possível voltar temporariamente para a URL anterior (Render) alterando a variável na Vercel:

```env
VITE_SYNC_API_URL=https://sync-api-p3jr.onrender.com
```

e refazendo o deploy. Isso não afeta a homologação.

---

**Arquivos deste deploy:**
- `deployment/.env.production.sondalyze` — modelo do `.env` de produção
- `deployment/nginx.conf` — configuração do Nginx (server_name já ajustado)
- `deployment/generate-ssl-cert.bat` — geração de certificado self-signed (CN ajustado)
- `deployment/install-service.js` — instalação do serviço Windows
- `.env.production` (raiz do projeto) — `VITE_SYNC_API_URL` do frontend
