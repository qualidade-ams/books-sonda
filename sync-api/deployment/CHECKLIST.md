# ✅ Checklist de Instalação e Configuração

Use este checklist para garantir que todos os passos foram executados corretamente.

---

## 📋 Pré-Instalação

### Software Necessário

- [ ] **Node.js LTS** instalado
  ```powershell
  node --version  # Deve retornar v18.x ou superior
  npm --version
  ```

- [ ] **Nginx** baixado e extraído em `C:\nginx\`
  ```powershell
  dir C:\nginx\nginx.exe  # Deve existir
  ```

- [ ] **Git for Windows** instalado (para OpenSSL)
  ```powershell
  openssl version  # Deve retornar versão do OpenSSL
  ```

### Permissões

- [ ] Acesso de **Administrador** no servidor
- [ ] Permissões para criar serviços Windows
- [ ] Acesso ao SQL Server com usuário `amsconsulta`

---

## 🚀 Instalação

### Passo 1: Preparar Arquivos

- [ ] Pasta `sync-api` copiada para `C:\apps\books-sonda-sync-api\`
- [ ] Arquivo `.env` criado e configurado
  ```powershell
  type C:\apps\books-sonda-sync-api\.env  # Deve existir
  ```

### Passo 2: Instalar sync-api

- [ ] Dependências instaladas
  ```powershell
  cd C:\apps\books-sonda-sync-api
  npm install  # Sem erros
  ```

- [ ] Código compilado
  ```powershell
  npm run build  # Sem erros
  dir dist\server.js  # Deve existir
  ```

- [ ] Serviço Windows instalado
  ```powershell
  sc query "Books SND Sync API"  # Deve mostrar RUNNING
  ```

- [ ] Firewall configurado (porta 3001)
  ```powershell
  netsh advfirewall firewall show rule name="Books SND Sync API"
  ```

### Passo 3: Configurar Nginx

- [ ] Arquivo `nginx.conf` copiado para `C:\nginx\conf\nginx.conf`
- [ ] `server_name` ajustado no `nginx.conf`
  ```powershell
  findstr "server_name" C:\nginx\conf\nginx.conf
  # Deve mostrar seu domínio
  ```

- [ ] Configuração testada
  ```powershell
  cd C:\nginx
  nginx -t  # Deve retornar "syntax is ok"
  ```

- [ ] Serviço Windows instalado
  ```powershell
  sc query "Nginx"  # Deve mostrar RUNNING
  ```

- [ ] Firewall configurado (portas 80 e 443)
  ```powershell
  netsh advfirewall firewall show rule name="Nginx HTTP"
  netsh advfirewall firewall show rule name="Nginx HTTPS"
  ```

### Passo 4: Configurar SSL

#### Opção A: Self-Signed (Teste)

- [ ] Certificado gerado
  ```powershell
  dir C:\nginx\ssl\certificate.crt  # Deve existir
  dir C:\nginx\ssl\private.key      # Deve existir
  ```

- [ ] Certificado válido
  ```powershell
  openssl x509 -in C:\nginx\ssl\certificate.crt -text -noout
  # Deve mostrar informações do certificado
  ```

#### Opção B: Let's Encrypt (Produção)

- [ ] win-acme instalado em `C:\win-acme\`
- [ ] Certificado gerado via win-acme
- [ ] Certificado renovação automática configurada
- [ ] Caminhos atualizados no `nginx.conf`

#### Opção C: Certificado Comercial

- [ ] Certificado obtido do administrador
- [ ] Arquivos copiados para `C:\nginx\ssl\`
- [ ] Caminhos atualizados no `nginx.conf`

### Passo 5: Configurar DNS

- [ ] Registro DNS criado
  ```
  Tipo: A
  Nome: sync-api.seudominio.com.br
  Valor: IP_DO_SERVIDOR
  ```

- [ ] DNS propagado
  ```powershell
  nslookup sync-api.seudominio.com.br
  # Deve retornar IP correto
  ```

---

## ✅ Testes

### Testes Locais

- [ ] **API direta (HTTP)**
  ```powershell
  curl http://localhost:3001/health
  # Deve retornar: {"status":"ok",...}
  ```

- [ ] **Nginx local (HTTPS)**
  ```powershell
  curl -k https://localhost/health
  # Deve retornar: {"status":"ok",...}
  ```

- [ ] **Conexão SQL Server**
  ```powershell
  curl http://localhost:3001/api/test-connection
  # Deve retornar: {"success":true,...}
  ```

### Testes Externos

- [ ] **Health check externo**
  ```powershell
  # De outro PC
  curl https://sync-api.seudominio.com.br/health
  # Deve retornar: {"status":"ok",...}
  ```

- [ ] **Sincronização de pesquisas**
  ```powershell
  curl -X POST https://sync-api.seudominio.com.br/api/sync-pesquisas
  # Deve retornar resultado da sincronização
  ```

- [ ] **Certificado SSL válido**
  - Abrir `https://sync-api.seudominio.com.br/health` no navegador
  - Verificar cadeado verde (sem avisos)

---

## 🔄 Configuração do Frontend

- [ ] Arquivo `.env.production` atualizado
  ```env
  VITE_SYNC_API_URL=https://sync-api.seudominio.com.br
  ```

- [ ] Deploy realizado na Vercel
- [ ] Botão "Sincronizar SQL Server" habilitado
- [ ] Sincronização funcionando em produção

---

## 🔒 Segurança

### Firewall

- [ ] Apenas portas necessárias abertas (80, 443)
- [ ] Porta 3001 (sync-api) **fechada** para acesso externo
- [ ] Porta 10443 (SQL Server) **fechada** para acesso externo

### Certificados

- [ ] Certificado SSL válido (não self-signed em produção)
- [ ] Chave privada protegida (permissões restritas)
- [ ] Renovação automática configurada (Let's Encrypt)

### Credenciais

- [ ] Arquivo `.env` protegido
  ```powershell
  icacls C:\apps\books-sonda-sync-api\.env
  # Apenas Administradores devem ter acesso
  ```

- [ ] Senha SQL Server forte
- [ ] Service Key do Supabase protegida

### Nginx

- [ ] Rate limiting configurado
- [ ] Security headers configurados
- [ ] CORS configurado corretamente
- [ ] Logs habilitados

---

## 📊 Monitoramento

### Logs

- [ ] Logs da sync-api acessíveis
  ```powershell
  type C:\apps\books-sonda-sync-api\logs\service.log
  ```

- [ ] Logs do Nginx acessíveis
  ```powershell
  type C:\nginx\logs\access.log
  type C:\nginx\logs\error.log
  ```

- [ ] Rotação de logs configurada (opcional)

### Serviços

- [ ] Serviços configurados para iniciar automaticamente
  ```powershell
  sc qc "Books SND Sync API"  # START_TYPE: AUTO_START
  sc qc "Nginx"               # START_TYPE: AUTO_START
  ```

- [ ] Serviços rodando
  ```powershell
  sc query "Books SND Sync API"  # STATE: RUNNING
  sc query "Nginx"               # STATE: RUNNING
  ```

### Health Checks

- [ ] Endpoint `/health` respondendo
- [ ] Endpoint `/api/test-connection` respondendo
- [ ] Tempo de resposta aceitável (< 1s)

---

## 📝 Documentação

- [ ] Credenciais documentadas (em local seguro)
- [ ] Procedimentos de backup documentados
- [ ] Procedimentos de atualização documentados
- [ ] Contatos de suporte documentados

---

## 🎯 Pós-Instalação

### Backup

- [ ] Backup da configuração realizado
  ```powershell
  copy C:\apps\books-sonda-sync-api\.env C:\backup\
  copy C:\nginx\conf\nginx.conf C:\backup\
  copy C:\nginx\ssl\* C:\backup\ssl\
  ```

### Monitoramento

- [ ] Alertas configurados (opcional)
- [ ] Dashboard de monitoramento (opcional)
- [ ] Uptime monitoring (opcional)

### Manutenção

- [ ] Procedimento de atualização testado
- [ ] Procedimento de rollback testado
- [ ] Backup automático configurado (opcional)

---

## ✅ Checklist Final

Antes de considerar a instalação completa:

- [ ] ✅ Todos os testes locais passando
- [ ] ✅ Todos os testes externos passando
- [ ] ✅ Frontend em produção funcionando
- [ ] ✅ Botão de sincronização habilitado
- [ ] ✅ Sincronização funcionando corretamente
- [ ] ✅ Certificado SSL válido
- [ ] ✅ Logs acessíveis e sem erros
- [ ] ✅ Serviços configurados para auto-start
- [ ] ✅ Firewall configurado corretamente
- [ ] ✅ Backup realizado
- [ ] ✅ Documentação completa

---

## 🎉 Instalação Completa!

Se todos os itens acima estão marcados, a instalação está completa e funcionando corretamente.

### Próximos Passos

1. Monitorar logs nas primeiras 24h
2. Testar sincronização em horários de pico
3. Configurar alertas de monitoramento
4. Treinar equipe nos procedimentos de manutenção

---

## 📞 Suporte

Se algum item não estiver marcado:

1. Consultar `INSTALLATION_GUIDE.md` para detalhes
2. Executar `test-installation.bat` para diagnóstico
3. Verificar logs para identificar erros
4. Consultar `TROUBLESHOOTING.md` para soluções

---

**Desenvolvido para Books SND System**
