# 📚 Índice de Documentação - Deployment

Guia completo de todos os arquivos de configuração e documentação para instalação da sync-api.

---

## 🎯 Por Onde Começar?

### Para Instalação Rápida
👉 **`QUICK_START.md`** - Guia rápido de 15 minutos

### Para Instalação Detalhada
👉 **`INSTALLATION_GUIDE.md`** - Guia completo passo a passo

### Para Entender a Arquitetura
👉 **`ARCHITECTURE.md`** - Diagramas e explicações técnicas

### Para Verificar Instalação
👉 **`CHECKLIST.md`** - Checklist completo de verificação

---

## 📁 Arquivos de Configuração

### `nginx.conf`
**Descrição:** Configuração completa do Nginx com HTTPS e reverse proxy

**Uso:**
```powershell
copy nginx.conf C:\nginx\conf\nginx.conf
notepad C:\nginx\conf\nginx.conf  # Ajustar server_name
```

**Principais configurações:**
- Reverse proxy para sync-api (porta 3001)
- SSL/TLS com certificados
- Rate limiting (10 req/s)
- CORS headers
- Security headers
- Logging

---

### `.env.production`
**Descrição:** Variáveis de ambiente para produção

**Uso:**
```powershell
copy .env.production C:\apps\books-sonda-sync-api\.env
notepad C:\apps\books-sonda-sync-api\.env  # Ajustar credenciais
```

**Principais variáveis:**
- `SQL_SERVER=localhost` (conexão local)
- `SQL_PORT=10443`
- `SUPABASE_URL` e `SUPABASE_SERVICE_KEY`
- `PORT=3001`

---

## 🔧 Scripts de Instalação

### `install-all.bat`
**Descrição:** Script de instalação automatizada completa

**Uso:**
```powershell
# Executar como Administrador
.\install-all.bat
```

**O que faz:**
1. Verifica Node.js
2. Cria diretórios
3. Instala dependências
4. Compila TypeScript
5. Instala serviço Windows
6. Configura firewall

---

### `install-service.js`
**Descrição:** Instala sync-api como serviço Windows

**Uso:**
```powershell
npm install -g node-windows
node install-service.js
```

**Resultado:**
- Serviço "Books SND Sync API" criado
- Configurado para iniciar automaticamente
- Logs em `C:\apps\books-sonda-sync-api\logs\service.log`

---

### `uninstall-service.js`
**Descrição:** Remove serviço Windows da sync-api

**Uso:**
```powershell
node uninstall-service.js
```

---

### `install-nginx-service.bat`
**Descrição:** Instala Nginx como serviço Windows

**Uso:**
```powershell
# Executar como Administrador
.\install-nginx-service.bat
```

**O que faz:**
1. Para Nginx se estiver rodando
2. Cria serviço Windows
3. Configura firewall (portas 80 e 443)
4. Inicia serviço

---

### `generate-ssl-cert.bat`
**Descrição:** Gera certificado SSL self-signed para testes

**Uso:**
```powershell
.\generate-ssl-cert.bat
```

**Resultado:**
- `C:\nginx\ssl\certificate.crt`
- `C:\nginx\ssl\private.key`

⚠️ **Apenas para testes!** Use Let's Encrypt em produção.

---

### `test-installation.bat`
**Descrição:** Testa instalação completa

**Uso:**
```powershell
.\test-installation.bat
```

**Verifica:**
1. Serviço sync-api rodando
2. Serviço Nginx rodando
3. API local respondendo
4. Nginx local respondendo
5. Conexão SQL Server
6. Portas abertas

---

## 📖 Documentação

### `README.md`
**Descrição:** Visão geral dos arquivos de deployment

**Conteúdo:**
- Lista de arquivos
- Instalação rápida
- Comandos úteis
- Endpoints disponíveis

---

### `QUICK_START.md`
**Descrição:** Guia de instalação rápida (15 minutos)

**Conteúdo:**
- Pré-requisitos
- 6 passos de instalação
- Verificação
- Comandos úteis
- Troubleshooting básico

**Ideal para:** Quem já conhece o sistema e quer instalar rapidamente.

---

### `INSTALLATION_GUIDE.md`
**Descrição:** Guia completo de instalação passo a passo

**Conteúdo:**
- Instalação automatizada
- Instalação manual detalhada
- Configuração de SSL (3 opções)
- Configuração de DNS
- Atualização do frontend
- Comandos úteis
- Troubleshooting detalhado
- Checklist de segurança

**Ideal para:** Primeira instalação ou instalação em ambiente crítico.

---

### `ARCHITECTURE.md`
**Descrição:** Documentação da arquitetura completa

**Conteúdo:**
- Diagramas de arquitetura
- Fluxo de dados
- Camadas de segurança
- Estrutura de diretórios
- Componentes e responsabilidades
- Fluxo de deploy
- Monitoramento
- Processo de atualização
- Métricas de performance
- Evolução futura

**Ideal para:** Entender como tudo funciona e planejar melhorias.

---

### `CHECKLIST.md`
**Descrição:** Checklist completo de instalação e configuração

**Conteúdo:**
- Pré-instalação (software, permissões)
- Instalação (5 passos)
- Testes (locais e externos)
- Configuração do frontend
- Segurança (firewall, certificados, credenciais)
- Monitoramento (logs, serviços, health checks)
- Documentação
- Pós-instalação (backup, manutenção)
- Checklist final

**Ideal para:** Garantir que nada foi esquecido durante a instalação.

---

### `INDEX.md` (este arquivo)
**Descrição:** Índice de toda a documentação

**Conteúdo:**
- Guia de navegação
- Descrição de todos os arquivos
- Casos de uso
- Fluxo de trabalho recomendado

---

## 🎯 Casos de Uso

### Caso 1: Primeira Instalação

**Fluxo recomendado:**
1. Ler `QUICK_START.md` para visão geral
2. Seguir `INSTALLATION_GUIDE.md` passo a passo
3. Usar `CHECKLIST.md` para verificar
4. Executar `test-installation.bat`

---

### Caso 2: Instalação Rápida (Já Conhece o Sistema)

**Fluxo recomendado:**
1. Ler `QUICK_START.md`
2. Executar `install-all.bat`
3. Executar `install-nginx-service.bat`
4. Configurar SSL
5. Executar `test-installation.bat`

---

### Caso 3: Troubleshooting

**Fluxo recomendado:**
1. Executar `test-installation.bat`
2. Verificar logs:
   - `C:\apps\books-sonda-sync-api\logs\service.log`
   - `C:\nginx\logs\error.log`
3. Consultar `INSTALLATION_GUIDE.md` seção "Troubleshooting"
4. Verificar `CHECKLIST.md` para itens não marcados

---

### Caso 4: Entender Arquitetura

**Fluxo recomendado:**
1. Ler `ARCHITECTURE.md` completo
2. Ver diagramas de fluxo
3. Entender camadas de segurança
4. Revisar componentes e responsabilidades

---

### Caso 5: Atualização do Sistema

**Fluxo recomendado:**
1. Fazer backup (ver `CHECKLIST.md` seção "Backup")
2. Parar serviços
3. Atualizar código
4. Executar `npm run build`
5. Reiniciar serviços
6. Executar `test-installation.bat`

---

## 📊 Matriz de Documentos

| Documento | Tempo de Leitura | Nível | Quando Usar |
|-----------|------------------|-------|-------------|
| `README.md` | 5 min | Básico | Visão geral |
| `QUICK_START.md` | 10 min | Básico | Instalação rápida |
| `INSTALLATION_GUIDE.md` | 30 min | Intermediário | Primeira instalação |
| `ARCHITECTURE.md` | 20 min | Avançado | Entender sistema |
| `CHECKLIST.md` | 15 min | Básico | Verificar instalação |
| `INDEX.md` | 10 min | Básico | Navegar documentação |

---

## 🔄 Fluxo de Trabalho Recomendado

### Para Administrador de Sistemas

```
1. Ler QUICK_START.md (10 min)
   ↓
2. Preparar servidor (instalar Node.js, Nginx)
   ↓
3. Executar install-all.bat
   ↓
4. Configurar Nginx (ajustar server_name)
   ↓
5. Configurar SSL (Let's Encrypt)
   ↓
6. Executar test-installation.bat
   ↓
7. Verificar CHECKLIST.md
   ↓
8. Atualizar frontend (.env.production)
   ↓
9. Testar em produção
```

### Para Desenvolvedor

```
1. Ler ARCHITECTURE.md (20 min)
   ↓
2. Entender fluxo de dados
   ↓
3. Revisar nginx.conf
   ↓
4. Revisar .env.production
   ↓
5. Testar localmente
   ↓
6. Fazer deploy
```

### Para Suporte

```
1. Executar test-installation.bat
   ↓
2. Verificar logs
   ↓
3. Consultar INSTALLATION_GUIDE.md (Troubleshooting)
   ↓
4. Verificar CHECKLIST.md
   ↓
5. Resolver problema
```

---

## 📞 Suporte

### Documentação Adicional

- **Nginx**: http://nginx.org/en/docs/
- **Node.js**: https://nodejs.org/docs/
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **win-acme**: https://www.win-acme.com/manual/

### Logs

- Sync API: `C:\apps\books-sonda-sync-api\logs\service.log`
- Nginx: `C:\nginx\logs\error.log`
- Windows Event Viewer: Application Logs

### Comandos de Diagnóstico

```powershell
# Status dos serviços
sc query "Books SND Sync API"
sc query "Nginx"

# Testar endpoints
curl http://localhost:3001/health
curl https://localhost/health

# Ver logs
type C:\apps\books-sonda-sync-api\logs\service.log
type C:\nginx\logs\error.log
```

---

## 🎉 Conclusão

Esta documentação cobre todos os aspectos da instalação e configuração da sync-api no servidor Windows com Nginx e HTTPS.

**Tempo total estimado:**
- Leitura da documentação: 1-2 horas
- Instalação: 15-30 minutos
- Testes e verificação: 15 minutos

**Total: 2-3 horas** (primeira vez)

Instalações subsequentes: **15-20 minutos**

---

**Desenvolvido para Books SND System**
**Versão: 1.0**
**Data: Março 2026**
