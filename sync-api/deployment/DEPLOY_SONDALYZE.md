# 🚀 Deploy da Sync API em Produção — sondalyze.com.br

Guia consolidado para colocar a **sync-api** em produção no **servidor Windows interno** (mesmo servidor do SQL Server), exposta por HTTPS no subdomínio `sync-api.sondalyze.com.br` via **Cloudflare Tunnel**.

> **Arquitetura:**
> `Frontend (https://sondalyze.com.br)` → `Cloudflare Edge (HTTPS)` → `cloudflared (túnel outbound)` → `sync-api (localhost:3001)` → `SQL Server (localhost)` + `Supabase`

> ℹ️ **Por que Cloudflare Tunnel em vez de Nginx + Let's Encrypt?** O túnel é uma conexão de **saída** iniciada pelo próprio servidor — não precisa de IP público estático, nem de portas 80/443 abertas na entrada, nem de certificado gerenciado manualmente. A Cloudflare já entrega HTTPS válido na borda. O fluxo antigo (Nginx + win-acme + registro DNS `A` manual) continua documentado em `ARCHITECTURE.md` como alternativa, caso o túnel não possa ser usado.

> ⚠️ **A homologação NÃO é afetada.** Ela continua usando `.env.local` com `VITE_SYNC_API_URL=http://localhost:3001`. Nada neste guia altera o ambiente de homologação/dev.

---

## 0. Pré-requisitos

- Acesso **Administrador** ao servidor Windows onde roda o SQL Server
- Node.js LTS 18+ instalado ([nodejs.org](https://nodejs.org/))
- Conta Cloudflare com a zona `sondalyze.com.br` já ativa (nameservers apontando para a Cloudflare)
- `cloudflared` para Windows ([github.com/cloudflare/cloudflared/releases](https://github.com/cloudflare/cloudflared/releases))
- Git for Windows (traz o OpenSSL, útil para outras ferramentas) ([git-scm.com](https://git-scm.com/download/win))

Não é preciso: IP público estático, portas 80/443 abertas para a internet, ou certificado SSL manual.

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

## 5. Instalar a sync-api como serviço Windows

```powershell
npm install -g node-windows
node deployment\install-service.js

# Verificar
sc query "Books SND Sync API"
```

O serviço fica configurado para iniciar automaticamente com o Windows.

---

## 6. Firewall

Não é necessário abrir nenhuma porta de entrada. O túnel é 100% outbound — o servidor só precisa conseguir *sair* para a internet na porta 443 (o que normalmente já está liberado).

```powershell
# Se existirem regras antigas do fluxo Nginx (portas 80/443/3001 de ENTRADA), remova-as:
netsh advfirewall firewall show rule name="Nginx HTTP"
netsh advfirewall firewall show rule name="Nginx HTTPS"
netsh advfirewall firewall delete rule name="Nginx HTTP"
netsh advfirewall firewall delete rule name="Nginx HTTPS"
```

> A porta **3001** nunca deve ficar acessível de fora do servidor — nem pelo Nginx, nem diretamente. Só o `cloudflared`, rodando no mesmo servidor, fala com ela via `localhost`.

---

## 7. Instalar e configurar o Cloudflare Tunnel

```powershell
# 1. Baixar cloudflared-windows-amd64.exe em:
#    https://github.com/cloudflare/cloudflared/releases
# 2. Renomear para cloudflared.exe e colocar em C:\cloudflared\
```

No painel [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks → Tunnels**:

1. **Create a tunnel** → tipo `Cloudflared` → nome, ex.: `books-sonda-sync-api`
2. Copiar o **token** de instalação exibido na tela (string longa gerada para esse túnel)
3. Em **Public Hostname**, adicionar:
   - **Subdomain**: `sync-api`
   - **Domain**: `sondalyze.com.br`
   - **Service**: `HTTP` → `localhost:3001`
4. Salvar. A Cloudflare cria automaticamente o registro DNS (`CNAME` apontando para o túnel) — não é preciso mexer em DNS manualmente.

Instalar o conector como serviço Windows, para iniciar junto com o boot igual à sync-api:

```powershell
cd C:\cloudflared
.\cloudflared.exe service install <TOKEN-copiado-no-passo-2>

# Verificar
sc query Cloudflared
```

---

## 8. Testes de aceitação (do servidor e de fora)

```powershell
# Local (no servidor)
curl http://localhost:3001/health

# Externo (de outra máquina, sem VPN)
curl https://sync-api.sondalyze.com.br/health
curl https://sync-api.sondalyze.com.br/api/test-connection
```

Resposta esperada do `/health`:

```json
{ "status": "ok", "config": { "server": "localhost", "database": "Aranda" } }
```

No navegador, abrir `https://sync-api.sondalyze.com.br/health` e conferir o cadeado válido — o certificado é emitido pela própria Cloudflare, sem aviso de segurança.

---

## 9. Publicar o frontend com a nova URL

O arquivo `.env.production` do frontend já foi atualizado para:

```env
VITE_SYNC_API_URL=https://sync-api.sondalyze.com.br
```

Basta fazer o deploy do frontend na Vercel (ou garantir que a variável `VITE_SYNC_API_URL` esteja com esse valor no ambiente de produção da Vercel). Confira também a variável no painel da Vercel, pois ela pode sobrescrever o arquivo.

Após publicar, valide na tela de diagnóstico da aplicação (componente `DiagnosticoApi`) que a URL exibida é `https://sync-api.sondalyze.com.br`.

---

## 10. Validar a sincronização ponta a ponta

Pela interface do Books SND (módulo Pesquisas), rode uma sincronização e confirme que os dados chegam ao Supabase. Ou via curl:

```powershell
curl -X POST https://sync-api.sondalyze.com.br/api/sync-pesquisas
curl https://sync-api.sondalyze.com.br/api/validate-sync
```

---

## 🔐 Recomendações de segurança

1. **Rotacionar a senha do SQL `amsconsulta`.** O arquivo `sync-api/.env.temp` esteve versionado no histórico do git com a senha em texto plano. Remover do índice (já feito) não apaga o histórico — a forma segura é trocar a senha no SQL Server e atualizar o `.env` do servidor.
2. **Rotacionar a `SUPABASE_SERVICE_KEY`** se houver qualquer suspeita de que tenha sido versionada ou compartilhada.
3. Manter a porta **3001 fechada** para acesso externo (somente o `cloudflared`, no mesmo servidor, acessa via `localhost`).
4. **Restringir o CORS**: hoje a sync-api usa `app.use(cors())` sem restrição de origem (`sync-api/src/server.ts`). Depois de estabilizar, considere restringir para `https://sondalyze.com.br` (e a origem da homologação, se aplicável).
5. Proteger o `.env` do servidor: `icacls C:\apps\books-sonda-sync-api\.env` — apenas Administradores devem ter acesso.
6. Restringir quem pode editar o túnel e o Public Hostname no painel Cloudflare Zero Trust (acesso equivalente a controlar para onde o tráfego de `sync-api.sondalyze.com.br` é roteado).

---

## 🔁 Comandos de operação do dia a dia

```powershell
# Sync API
net start "Books SND Sync API"
net stop "Books SND Sync API"
sc query "Books SND Sync API"
type C:\apps\books-sonda-sync-api\logs\service.log

# Cloudflare Tunnel
sc query Cloudflared
net start Cloudflared
net stop Cloudflared
```

---

## ↩️ Rollback rápido

Se algo der errado após apontar o frontend para a nova API, é possível voltar temporariamente para a URL anterior (Render) alterando a variável na Vercel:

```env
VITE_SYNC_API_URL=https://sync-api-p3jr.onrender.com
```

e refazendo o deploy. Isso não afeta a homologação.

Se o problema for especificamente no túnel (não na sync-api), basta parar o serviço `Cloudflared` — o hostname `sync-api.sondalyze.com.br` volta a responder erro 502 pela Cloudflare, sem impacto no restante da rede do servidor.

---

**Arquivos deste deploy:**
- `deployment/.env.production.sondalyze` — modelo do `.env` de produção
- `deployment/install-service.js` — instalação do serviço Windows da sync-api
- `.env.production` (raiz do projeto) — `VITE_SYNC_API_URL` do frontend
- `deployment/nginx.conf`, `deployment/generate-ssl-cert.bat` — fluxo alternativo (Nginx + Let's Encrypt/self-signed), mantidos como *fallback* caso o Cloudflare Tunnel não possa ser usado; ver `ARCHITECTURE.md`
