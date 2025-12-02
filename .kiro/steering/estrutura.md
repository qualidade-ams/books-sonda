# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Adição do arquivo `install-windows-service.bat` como wrapper simplificado para instalação do serviço Windows, com validação automática de diretório.

---

## Observação Importante
Este arquivo contém a descrição completa da estrutura do projeto. Devido ao tamanho extenso, recomenda-se usar a busca (Ctrl+F) para localizar arquivos específicos.

---

## Diretório `sync-api/`

API de sincronização de pesquisas do SQL Server para Supabase, configurada para rodar como serviço Windows.

### Arquivos de Instalação e Configuração

#### `EXECUTAR_PRIMEIRO.bat`
Script batch que deve ser executado como Administrador ANTES da instalação do serviço Windows. Desbloqueia todos os arquivos PowerShell (*.ps1) no diretório, removendo a restrição de segurança do Windows que impede a execução de scripts baixados da internet. Este é o primeiro passo necessário para a instalação bem-sucedida do serviço.

**Funcionalidades:**
- Verifica se está sendo executado como Administrador
- Desbloqueia todos os arquivos `.ps1` usando `Unblock-File`
- Fornece feedback visual do processo
- Orienta o usuário para o próximo passo (executar `install-windows-service.bat`)

#### `install-windows-service.bat`
Script batch wrapper que facilita a execução do script PowerShell de instalação. Serve como ponto de entrada simplificado para usuários que preferem executar arquivos .bat ao invés de comandos PowerShell diretamente.

**Funcionalidades:**
- Verifica se está sendo executado como Administrador
- Muda automaticamente para o diretório do script
- Valida se o arquivo `package.json` existe no diretório correto
- Executa o script PowerShell `install-windows-service.ps1` com política de execução bypass
- Fornece mensagens de erro claras se executado no diretório errado

**Uso:**
```batch
# Clicar com botão direito e selecionar "Executar como Administrador"
# ou via linha de comando:
install-windows-service.bat
```

#### `install-windows-service.ps1`
Script PowerShell para instalação do Sync-API como serviço Windows nativo, sem necessidade de ferramentas adicionais como PM2 ou NSSM.

**Funcionalidades:**
- Verifica pré-requisitos (Node.js, permissões de Administrador)
- Instala dependências e compila o projeto
- Cria e configura o serviço Windows
- Configura recuperação automática em caso de falha
- Configura firewall para porta 3001
- Testa a API após instalação

#### `manage-service.ps1`
Script PowerShell interativo para gerenciamento do serviço após instalação.

**Funcionalidades:**
- Menu interativo com opções de gerenciamento
- Iniciar/Parar/Reiniciar serviço
- Ver status e logs
- Testar API
- Atualizar aplicação
- Remover serviço

#### `INSTALACAO_SIMPLES.md`
Guia de instalação simplificado em formato markdown, focado em instalação rápida em 2 passos.

**Conteúdo:**
- Instruções passo a passo para instalação
- Comandos para gerenciamento do serviço
- Troubleshooting de problemas comuns
- Checklist de verificação
- Documentação dos endpoints da API

#### `INSTALACAO_SERVIDOR.md`
Guia completo de instalação com todas as opções e detalhes técnicos.

#### `GUIA_RAPIDO.md`
Referência rápida para operações comuns do serviço.

#### `.env` e `.env.example`
Arquivos de configuração de variáveis de ambiente para conexão com SQL Server e Supabase.

#### `package.json`
Configuração do projeto Node.js com dependências e scripts.

#### `tsconfig.json`
Configuração do compilador TypeScript.

#### `ecosystem.config.js`
Configuração do PM2 (alternativa ao serviço Windows nativo).

### Diretório `src/`
Código-fonte TypeScript da API.

#### `server.ts`
Servidor Express principal com endpoints para sincronização de pesquisas.

---

## Fluxo de Instalação Recomendado

### Opção 1: Usando arquivos .bat (Mais Simples)

1. **Executar `EXECUTAR_PRIMEIRO.bat`** como Administrador
   - Desbloqueia os scripts PowerShell
   
2. **Executar `install-windows-service.bat`** como Administrador
   - Wrapper que chama o script PowerShell de instalação
   - Valida o diretório automaticamente
   
3. **Usar `manage-service.ps1`** para gerenciamento contínuo
   - Operações do dia a dia

### Opção 2: Usando PowerShell diretamente

1. **Executar `EXECUTAR_PRIMEIRO.bat`** como Administrador
   - Desbloqueia os scripts PowerShell
   
2. **Executar `install-windows-service.ps1`** como Administrador
   - Instala e configura o serviço Windows diretamente
   
3. **Usar `manage-service.ps1`** para gerenciamento contínuo
   - Operações do dia a dia

---

[O restante do conteúdo permanece inalterado - apenas atualizando as linhas específicas relacionadas ao faturamentoExportUtils.ts]
