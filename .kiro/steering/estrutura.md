# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Implementado sistema completo de histórico de contatos múltiplos para planos de ação, substituindo o sistema de contato único. Criada tabela `plano_acao_contatos` com funcionalidades de CRUD completo, interface expansível e integração nas abas de visualização.

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

## Diretório Principal do Projeto

### `RESUMO_IMPLEMENTACAO_CAMPOS_ESPECIFICOS.md`
Documento de resumo completo da implementação de campos específicos por cliente no sistema de taxas, detalhando todas as etapas realizadas, correções aplicadas e status final da funcionalidade.

**Funcionalidades documentadas:**
- **Status da implementação**: Documentação completa do status "IMPLEMENTAÇÃO COMPLETA" com todos os requisitos atendidos
- **Objetivo e escopo**: Descrição detalhada dos campos dinâmicos por cliente (VOTORANTIM, EXXONMOBIL, CHIESI, CSN, NIDEC)
- **Implementações realizadas**: Lista completa de todas as implementações:
  - Migração do banco de dados (`add_campos_especificos_clientes_taxas.sql`)
  - Tipos TypeScript (`src/types/taxasClientes.ts`)
  - Serviço de backend (`src/services/taxasClientesService.ts`)
  - Interface frontend (`src/components/admin/taxas/TaxaForm.tsx`)
- **Testes realizados**: Documentação dos testes executados incluindo correção de labels CHIESI
- **Correções aplicadas**: Lista de problemas identificados e resolvidos:
  - Erro `toISOString` corrigido com optional chaining
  - Labels CHIESI corrigidos para "Ticket Base" e "Ticket Excedente"
  - Validação robusta implementada
  - CRUD completo implementado
- **Próximos passos**: Instruções para execução da migração e testes de validação
- **Mapeamento de campos**: Tabela completa com mapeamento de campos por cliente
- **Arquivos modificados**: Lista de todos os arquivos alterados na implementação

**Integração:**
- Serve como documentação técnica completa da funcionalidade
- Referência para manutenção futura e troubleshooting
- Guia para validação e testes da implementação
- Documentação de correções aplicadas durante o desenvolvimento

### `test_campos_especificos.js`
Script de teste JavaScript para verificar a implementação das funções utilitárias de campos específicos por cliente no sistema de taxas.

**Funcionalidades principais:**
- **Simulação de funções utilitárias**: Implementa versões de teste das funções `getCamposEspecificosPorCliente()` e `clienteTemCamposEspecificos()`
- **Teste de mapeamento por cliente**: Valida configuração de campos específicos para cada cliente (VOTORANTIM, EXXONMOBIL, CHIESI, CSN, NIDEC)
- **Validação de estrutura**: Verifica se cada cliente retorna os campos corretos com labels e placeholders apropriados
- **Teste de fallback**: Confirma que clientes não configurados retornam array vazio
- **Output formatado**: Exibe resultados de teste com emojis e formatação clara no console

**Clientes testados:**
- **VOTORANTIM**: `valor_ticket`, `valor_ticket_excedente`
- **EXXONMOBIL**: `ticket_excedente_simples`, `ticket_excedente_complexo`
- **CHIESI**: `ticket_excedente_1`, `ticket_excedente_2`
- **CSN**: `valor_ticket`, `valor_ticket_excedente`
- **NIDEC**: `ticket_excedente`
- **OUTRO_CLIENTE**: Teste de fallback (sem campos específicos)

**Estrutura de retorno testada:**
```javascript
{
  campo: 'nome_do_campo',
  label: 'Label Amigável',
  placeholder: 'Ex: 150,00'
}
```

**Como executar:**
```bash
node test_campos_especificos.js
```

**Integração:**
- Complementa a migração `add_campos_especificos_clientes_taxas.sql`
- Valida implementação das funções utilitárias antes da integração no frontend
- Serve como documentação executável dos campos específicos por cliente

### `test_taxa_validation.js`
Script de teste JavaScript para validação do formulário de taxas de clientes, simulando o comportamento do React Hook Form e validações do componente `TaxaForm.tsx`.

**Funcionalidades principais:**
- **Simulação de handleSubmit**: Implementa versão de teste da função `handleSubmit` do formulário de taxas
- **Validação de campos obrigatórios**: Testa validação de `vigencia_inicio` e `tipo_produto`
- **Conversão de cliente**: Simula conversão de nome abreviado para UUID da empresa
- **Formatação de dados**: Testa formatação completa dos dados como no formulário real
- **Campos específicos por cliente**: Inclui campos condicionais (valor_ticket, ticket_excedente, etc.)
- **Cenários de teste múltiplos**: 4 cenários de teste cobrindo casos válidos e inválidos

**Dados de teste:**
- **Dados completos válidos**: Formulário preenchido corretamente com cliente VOTORANTIM
- **Cliente não encontrado**: Teste com cliente inexistente
- **Vigência início undefined**: Teste de validação de campo obrigatório
- **Tipo produto undefined**: Teste de validação de campo obrigatório

**Estrutura de dados testada:**
```javascript
{
  cliente_id: 'VOTORANTIM', // Nome abreviado (convertido para UUID)
  vigencia_inicio: new Date('2024-01-01'),
  vigencia_fim: new Date('2024-12-31'),
  tipo_produto: 'GALLERY',
  valores_remota: { funcional: 150, tecnico: 180, dba: 220, gestor: 250 },
  valores_local: { funcional: 165, tecnico: 198, dba: 242, gestor: 275 },
  valor_ticket: 100.50, // Campo específico VOTORANTIM
  valor_ticket_excedente: 150.75 // Campo específico VOTORANTIM
}
```

**Como executar:**
```bash
node test_taxa_validation.js
```

**Integração:**
- Valida lógica de validação do componente `TaxaForm.tsx`
- Testa conversão de dados antes do envio ao serviço `taxasClientesService.ts`
- Complementa testes de campos específicos por cliente
- Serve como documentação executável do fluxo de validação do formulário

### `test_final_campos_especificos.js`
Script de teste final JavaScript para verificar a implementação completa dos campos específicos por cliente no sistema de taxas, validando as funções utilitárias e mapeamento de campos condicionais.

**Funcionalidades principais:**
- **Simulação de funções utilitárias**: Implementa versões de teste das funções `getCamposEspecificosPorCliente()` e `clienteTemCamposEspecificos()`
- **Teste completo de mapeamento**: Valida configuração de campos específicos para todos os clientes suportados (VOTORANTIM, EXXONMOBIL, CHIESI, CSN, NIDEC)
- **Validação de estrutura de retorno**: Verifica se cada cliente retorna os campos corretos com labels e placeholders apropriados
- **Teste de fallback**: Confirma que clientes não configurados retornam array vazio
- **Output formatado com emojis**: Exibe resultados de teste com emojis visuais e formatação clara no console
- **Resumo da implementação**: Lista todos os arquivos e componentes envolvidos na funcionalidade
- **Guia de próximos passos**: Instruções claras para finalizar a implementação

**Clientes testados e seus campos:**
- **VOTORANTIM**: `valor_ticket`, `valor_ticket_excedente`
- **EXXONMOBIL**: `ticket_excedente_simples`, `ticket_excedente_complexo`
- **CHIESI**: `ticket_excedente_1`, `ticket_excedente_2`
- **CSN**: `valor_ticket`, `valor_ticket_excedente`
- **NIDEC**: `ticket_excedente`
- **OUTRO_CLIENTE**: Teste de fallback (sem campos específicos)

**Estrutura de retorno testada:**
```javascript
{
  campo: 'nome_do_campo',
  label: 'Label Amigável',
  placeholder: 'Ex: 150,00'
}
```

**Como executar:**
```bash
node test_final_campos_especificos.js
```

**Integração:**
- Valida implementação completa das funções utilitárias de campos específicos
- Complementa a migração `add_campos_especificos_clientes_taxas.sql`
- Serve como documentação executável dos campos específicos por cliente
- Fornece checklist completo para finalização da implementação
- Guia para limpeza dos arquivos de teste após validação

### `test_chiesi_labels.js`
Script de teste JavaScript específico para verificar se as correções de labels para o cliente CHIESI foram implementadas corretamente no sistema de campos específicos por cliente.

**Funcionalidades principais:**
- **Teste focado em CHIESI**: Validação específica dos campos e labels do cliente CHIESI
- **Simulação de funções utilitárias**: Implementa versões de teste das funções `getCamposEspecificosPorCliente()` e `clienteTemCamposEspecificos()`
- **Validação de labels corretos**: Verifica se os labels foram corrigidos para "Ticket Base" e "Ticket Excedente"
- **Teste de estrutura**: Confirma que os campos `ticket_excedente_1` e `ticket_excedente_2` estão mapeados corretamente
- **Output detalhado**: Exibe resultados de teste com emojis visuais e feedback claro sobre sucesso/falha
- **Guia de próximos passos**: Instruções para executar migração e testar no sistema

**Campos testados para CHIESI:**
- **ticket_excedente_1**: Label "Ticket Base" (corrigido)
- **ticket_excedente_2**: Label "Ticket Excedente" (corrigido)

**Validações realizadas:**
- Verifica se os campos corretos são retornados
- Valida se os labels estão com os nomes corretos
- Confirma estrutura de retorno esperada
- Testa função de verificação de existência de campos

**Como executar:**
```bash
node test_chiesi_labels.js
```

**Integração:**
- Complementa os testes gerais de campos específicos
- Foca especificamente nas correções para CHIESI
- Valida implementação antes da migração no banco
- Serve como documentação das correções aplicadas

### `src/pages/admin/`

Páginas administrativas do sistema Books SND.

#### `LancarElogios.tsx`
Página principal para gerenciamento e visualização de elogios (pesquisas de satisfação positivas), com funcionalidades de listagem, filtros, paginação, navegação temporal e CRUD completo.

**Funcionalidades principais:**
- **Navegação temporal**: Navegação por período (mês/ano) com botões anterior/próximo para visualizar elogios de diferentes períodos
- **Listagem completa**: Tabela com todos os elogios do período selecionado, exibindo empresa, cliente, chamado, data resposta, comentário e resposta
- **Filtros avançados**: Sistema de filtros expansível com busca por empresa e cliente
- **Seleção múltipla**: Checkboxes para seleção individual ou em massa de elogios
- **Paginação flexível**: Controle de itens por página (25, 50, 100, 500, Todos) com navegação entre páginas
- **Estatísticas visuais**: Cards com estatísticas do período (total, registrados, compartilhados, arquivados)
- **Modal de edição**: Dialog para visualização detalhada dos dados do elogio organizado em seções
- **CRUD completo**: Criação, edição e exclusão de elogios via modais com formulário dedicado (ElogioForm)
- **Integração com envio**: Botão de ação rápida para navegar para a página de envio de elogios
- **Limpeza de cache**: Limpa cache de pesquisas ao entrar na tela para garantir dados atualizados

**Hooks utilizados:**
- `useElogios(filtros)`: Busca elogios filtrados por período (mês/ano) e busca textual
- `useEstatisticasElogios(filtros)`: Obtém estatísticas agregadas do período
- `useCacheManager()`: Gerencia limpeza de cache de pesquisas
- `useEmpresas()`: Busca lista de empresas disponíveis no sistema
- `useCriarElogio()`: Hook para criação de novos elogios
- `useAtualizarElogio()`: Hook para atualização de elogios existentes
- `useDeletarElogio()`: Hook para exclusão de elogios

**Componentes UI principais:**
- **Tabela de elogios**: Exibição com colunas (checkbox, chamado, empresa, data resposta, cliente, comentário, resposta, ações)
- **Cards de navegação**: Card com navegação de período e exibição do mês/ano atual
- **Cards de estatísticas**: 4 cards exibindo total, registrados, compartilhados e arquivados
- **Painel de filtros**: Área expansível com campo de busca e botão de limpar filtros
- **Modal de visualização**: Dialog grande (max-w-4xl) com layout organizado em seções:
  - **Dados Principais**: Empresa e Cliente (campos desabilitados)
  - **Informações do Caso**: Tipo do chamado e número do chamado (campos desabilitados)
  - **Feedback do Cliente**: Resposta, data da resposta, comentário da pesquisa e observação (campos desabilitados)
- **Modal de criação/edição**: Dialog com formulário completo usando componente `ElogioForm`
- **Modal de confirmação de envio em lote**: AlertDialog para confirmar operação de envio em lote de elogios, exibindo:
  - Título: "Confirmar Envio de Elogios"
  - Descrição: Quantidade de elogios selecionados (ex: "Deseja enviar 5 elogios para a tela de Enviar Elogios?")
  - Botões: Cancelar e OK (azul Sonda: bg-blue-600 hover:bg-blue-700)
  - Acionado antes de executar `handleConfirmarEnvioLote()`
- **Botão de adicionar**: Botão flutuante com ícone Plus para criar novo elogio
- **Controles de paginação**: Select de itens por página, navegação entre páginas e contador de registros

**Estados gerenciados:**
- `mesSelecionado`, `anoSelecionado`: Controle do período visualizado
- `filtros`: Objeto com filtros aplicados (busca, mes, ano)
- `selecionados`: Array de IDs dos elogios selecionados
- `elogioVisualizando`: Elogio atualmente sendo visualizado no modal
- `modalVisualizarAberto`: Controle de abertura do modal de edição
- `modalConfirmacaoEnvioAberto`: Controle de abertura do modal de confirmação de envio em lote
- `paginaAtual`, `itensPorPagina`: Controle de paginação
- `mostrarFiltros`: Controle de expansão do painel de filtros

**Funções principais:**
- `navegarMesAnterior()`, `navegarMesProximo()`: Navegação entre períodos com ajuste automático de ano
- `handleVisualizar(elogio)`: Abre modal de edição com dados do elogio selecionado
- `handleSelecionarTodos(selecionado)`: Seleciona ou desmarca todos os elogios da página
- `handleSelecionarItem(id)`: Alterna seleção de um elogio específico
- `handleFiltroChange(campo, valor)`: Atualiza filtros e reseta paginação
- `limparFiltros()`: Remove todos os filtros aplicados
- `handleAlterarItensPorPagina(valor)`: Ajusta quantidade de itens por página
- `handlePaginaAnterior()`, `handleProximaPagina()`: Navegação entre páginas
- `obterDadosEmpresa(nomeCompleto)`: Busca empresa pelo nome completo ou abreviado e retorna objeto com `{ nome: string, encontrada: boolean }` para exibição e validação visual
- `handleEnviarElogioIndividual(id)`: Atualiza status de um elogio individual para "compartilhado" e recarrega dados
- `handleEnviarElogiosLote()`: Abre modal de confirmação para envio em lote de elogios selecionados
- `handleConfirmarEnvioLote()`: Atualiza status de múltiplos elogios selecionados para "compartilhado" em lote após confirmação do usuário

**Estrutura da tabela:**
- **Coluna Checkbox**: Seleção individual com checkbox no cabeçalho para selecionar todos
- **Coluna Chamado**: Exibe ícone Database, tipo do caso (IM/PR/RF) e número do chamado em fonte mono
- **Coluna Empresa**: Nome da empresa com validação visual - exibe em vermelho se a empresa não for encontrada no cadastro (usando `obterDadosEmpresa()`)
- **Coluna Data Resposta**: Data e hora formatadas em pt-BR (DD/MM/YYYY HH:MM)
- **Coluna Cliente**: Nome do cliente com truncamento
- **Coluna Comentário**: Comentário da pesquisa com line-clamp-2 (máximo 2 linhas)
- **Coluna Resposta**: Badge verde com nível de satisfação
- **Coluna Ações**: Botões de editar (abre modal), excluir (TODO) e ir para enviar elogios

**Modal de edição (estrutura):**
- **Seção Dados Principais**: Grid 2 colunas com campos Empresa e Cliente
- **Seção Informações do Caso**: Grid 2 colunas com Tipo do Chamado e Número do Chamado
- **Seção Feedback do Cliente**: Grid 2 colunas com Resposta e Data da Resposta, seguido de textareas para Comentário da Pesquisa e Observação (exibidos condicionalmente)
- Todos os campos são desabilitados (disabled) para visualização apenas
- Textareas com altura mínima de 100px e fundo cinza claro

**Paginação:**
- Select com opções: 25, 50, 100, 500, Todos
- Navegação com botões anterior/próximo
- Indicador de página atual e total de páginas
- Contador de registros exibidos (ex: "1-25 de 150 elogios")
- Botões desabilitados quando não há mais páginas

**Formatação de dados:**
- Datas formatadas em pt-BR com hora (DD/MM/YYYY HH:MM)
- Ajuste de timezone adicionando 'T00:00:00' à data antes de converter
- Truncamento de textos longos com classes Tailwind (truncate, line-clamp-2)
- Badge verde para resposta de satisfação

**Integrações:**
- Sistema de cache (limpeza ao montar componente)
- Navegação para página de envio de elogios via React Router
- Componentes UI do shadcn/ui (Table, Card, Dialog, Badge, Checkbox, Select)

**Tipos utilizados:**
- `ElogioCompleto`: Tipo completo do elogio com dados da pesquisa relacionada (inclui campo `origem` para identificar fonte dos dados: 'sql_server' ou 'manual')
- `FiltrosElogio`: Filtros para busca (busca, mes, ano)

**Componentes importados:**
- `ElogioForm` - Formulário de cadastro/edição de elogios importado de `@/components/admin/elogios`
- Ícone `Plus` do lucide-react para botão de adicionar

**Melhorias recentes:**
- Modal de visualização transformado em modal de edição com layout organizado em seções
- Campos agrupados logicamente (Dados Principais, Informações do Caso, Feedback do Cliente)
- Todos os campos desabilitados para visualização apenas
- Textareas para comentários e observações com melhor legibilidade
- Labels descritivas para cada campo
- Layout responsivo com grid adaptativo (1 coluna em mobile, 2 em desktop)
- Altura máxima do modal (90vh) com scroll interno
- **Importados hooks de CRUD**: `useCriarElogio`, `useAtualizarElogio`, `useDeletarElogio` para operações completas
- **Importado componente ElogioForm**: Formulário dedicado para criação e edição de elogios
- **Preparação para CRUD completo**: Estrutura pronta para implementar criação, edição e exclusão de elogios
- **Validação visual de empresas**: Implementada função `obterDadosEmpresa()` que retorna objeto com nome da empresa e flag `encontrada`, permitindo destacar em vermelho empresas não cadastradas no sistema
- **Funcionalidade de envio individual**: Implementada função `handleEnviarElogioIndividual()` que atualiza o status de um elogio para "compartilhado" e recarrega os dados automaticamente
- **Funcionalidade de envio em lote**: Implementada função `handleEnviarElogiosLote()` que abre modal de confirmação, e `handleConfirmarEnvioLote()` que executa o envio múltiplo de elogios selecionados, atualizando todos para status "compartilhado" com feedback de sucesso/erro
- **Feedback aprimorado ao usuário**: Substituídos `alert()` por notificações toast (sonner) para melhor experiência:
  - Toast de sucesso ao enviar elogio individual com mensagem específica
  - Toast de erro ao falhar envio individual
  - Toast de warning ao tentar enviar sem seleção
  - Toast de sucesso ao enviar em lote com contador de elogios enviados
  - Toast de erro ao falhar envio em lote
- **Estilo visual consistente**: Botão de envio em lote atualizado para usar estilo azul Sonda (bg-blue-600 hover:bg-blue-700) ao invés de verde, mantendo consistência com a identidade visual da marca e alinhamento com outros botões de ação do sistema

---

#### `EnviarElogios.tsx`
Página completa para gerenciamento e envio de elogios por email, permitindo seleção, visualização e disparo de relatórios formatados de elogios recebidos de clientes.

**Funcionalidades principais:**
- **Navegação temporal**: Navegação por período (mês/ano) com botões anterior/próximo para visualizar elogios de diferentes períodos
- **Filtro automático por status**: Exibe apenas elogios com status "compartilhado" (já enviados da página LancarElogios)
- **Seleção de elogios**: Seleção individual ou em massa (selecionar todos) de elogios via checkboxes
- **Geração de relatório**: Geração automática de relatório HTML formatado com estilo da marca Sonda
- **Configuração de email**: Interface completa para configuração de email (destinatários, CC, assunto, corpo, anexos)
- **Gerenciamento de anexos**: Suporte a múltiplos anexos com limite de 25MB total, exibição de tamanho e remoção individual
- **Preview em tempo real**: Preview do relatório HTML antes do envio dentro do modal com scroll independente
- **Validação robusta**: Validação de emails com regex, verificação de campos obrigatórios
- **Extração inteligente**: Extração automática de emails de texto colado (suporta múltiplos formatos e separadores)
- **Estatísticas visuais**: Cards com estatísticas do período (total, registrados, compartilhados)
- **Controle de acesso**: Integração com sistema de permissões via `ProtectedAction` (screenKey: "lancar_elogios")
- **Confirmação de envio**: Dialog de confirmação com resumo antes do envio final

**Hooks utilizados:**
- `useElogios(filtros)`: Busca elogios filtrados por período (mês/ano)
- `useEstatisticasElogios(filtros)`: Obtém estatísticas agregadas do período
- `useEmpresas()`: Busca lista de empresas disponíveis no sistema para validação e exibição

**Serviços utilizados:**
- `emailService`: Serviço para envio de emails (importado de `@/services/emailService`)

**Ícones utilizados (lucide-react):**
- `Mail`, `Send`, `Paperclip`, `X`, `FileText`, `Calendar`, `ChevronLeft`, `ChevronRight`, `CheckSquare`, `Square`, `TrendingUp`, `Database`

**Componentes UI principais:**
- **Botão Disparar Elogios**: Botão azul Sonda (bg-blue-600 hover:bg-blue-700) no cabeçalho da página que exibe contador de elogios selecionados e abre modal de configuração de email
- **Tabela de elogios**: Exibição de elogios com colunas otimizadas e checkboxes para seleção:
  - **Coluna Checkbox**: Seleção individual com checkbox no cabeçalho para selecionar todos
  - **Coluna Chamado** (120px): Exibe ícone Database, tipo do caso (IM/PR/RF) e número do chamado em fonte mono com fundo cinza
  - **Coluna Empresa** (180px): Nome da empresa com validação visual - exibe em vermelho se não encontrada no cadastro (usando `obterDadosEmpresa()`)
  - **Coluna Data Resposta** (120px): Data formatada em pt-BR (DD/MM/YYYY) com estilo muted
  - **Coluna Cliente** (150px): Nome do cliente com truncamento
  - **Coluna Comentário** (200px): Comentário da pesquisa com line-clamp-2 (máximo 2 linhas)
  - **Coluna Resposta** (140px): Badge verde com nível de satisfação e whitespace-nowrap
- **Cards de navegação**: Card com navegação de período e exibição do mês/ano atual
- **Cards de estatísticas**: 4 cards exibindo total, registrados, compartilhados e período
- **Modal de email**: Dialog grande (max-w-7xl) com formulário completo de configuração de email, incluindo:
  - Campo de destinatários com textarea e suporte a colar múltiplos emails
  - Campo de CC (cópia) com textarea e suporte a colar múltiplos emails
  - Campo de assunto
  - Seção de anexos com botão de adicionar arquivos e lista de arquivos anexados
  - Preview do relatório HTML com scroll independente (max-height: 600px)
  - Informações do período e quantidade de elogios selecionados no preview
  - Botão "Enviar" azul Sonda (bg-blue-600 hover:bg-blue-700) no rodapé do modal
- **Dialog de confirmação**: AlertDialog com resumo do envio (destinatários, período, quantidade) e botão de confirmação final

**Estados gerenciados:**
- `mesSelecionado`, `anoSelecionado`: Controle do período visualizado
- `elogiosSelecionados`: Array de IDs dos elogios selecionados
- `destinatarios`, `destinatariosCC`: Arrays de emails para envio
- `destinatariosTexto`, `destinatariosCCTexto`: Strings com emails separados por ponto e vírgula
- `assuntoEmail`, `corpoEmail`: Conteúdo do email
- `anexos`: Array de arquivos anexados (File[])
- `modalEmailAberto`, `confirmacaoAberta`: Controle de modais
- `enviandoEmail`: Estado de loading durante envio

**Funções principais:**
- `gerarRelatorioElogios()`: Gera HTML formatado do relatório com todos os elogios selecionados, organizando em linhas de 4 cards com divisores decorativos entre linhas
- `handleAbrirModalEmail()`: Valida seleção e abre modal com relatório pré-gerado
- `extrairEmails(texto)`: Extrai emails de texto usando regex avançado
- `handleColarEmails(texto, tipo)`: Processa texto colado e extrai emails automaticamente
- `handleAdicionarAnexos()`: Gerencia upload de anexos com validação de tamanho (aceita .pdf, .doc, .docx, .xls, .xlsx, .txt, .jpg, .jpeg, .png)
- `handleRemoverAnexo(index)`: Remove anexo específico da lista
- `formatarTamanhoArquivo(bytes)`: Converte bytes para formato legível (Bytes, KB, MB)
- `isFormularioValido()`: Valida formulário completo antes de habilitar envio
- `validarFormularioEmail()`: Validação detalhada com mensagens de erro específicas
- `handleDispararEmail()`: Executa envio do email (TODO: implementar serviço real)
- `navegarMesAnterior()`, `navegarMesProximo()`: Navegação entre períodos
- `handleSelecionarElogio()`, `handleSelecionarTodos()`: Gerenciamento de seleção
- `formatarData(data)`: Formata datas para exibição em formato brasileiro (DD/MM/YYYY)
- `obterDadosEmpresa(nomeCompleto)`: Busca empresa pelo nome completo ou abreviado e retorna objeto com `{ nome: string, encontrada: boolean }` para exibição e validação visual

**Formato do relatório HTML (Design Moderno Sonda):**
- **Estrutura completa HTML5** com DOCTYPE, meta charset UTF-8 e viewport para responsividade
- **Imagem de cabeçalho**: Banner superior com URL absoluta `http://books-sonda.vercel.app/images/header-elogios.png` (carregada diretamente do servidor)
- **Seção de título**: Área dedicada após o header com:
  - Título principal: "ELOGIOS AOS COLABORADORES DE SOLUÇÕES DE NEGÓCIOS" em duas linhas
  - Subtítulo com mês em caixa alta (ex: "DEZEMBRO")
  - Estilização com cores e tipografia da marca Sonda
  - **Espaçamento otimizado**: Padding de 24px 48px (reduzido de 40px para melhor proporção)
  - **Tipografia ajustada**: 
    - Título principal: 16px (reduzido de 22px para melhor proporção visual) com letter-spacing 0.5px
    - Mês: 18px (reduzido de 24px) com letter-spacing 1px
    - Margem entre título e mês: 8px (reduzido de 16px)
- **Container principal**: Max-width 1200px com fundo branco e padding de 40px 48px
- **Layout em linhas**: Elogios organizados em linhas de 4 cards cada usando `display: table`
- **Cards de elogios** com estrutura vertical:
  - Nome do consultor/prestador em azul (#0066FF), negrito e caixa alta (campo `prestador` da pesquisa)
  - Resposta de satisfação (se houver)
  - Comentário da pesquisa (se houver)
  - Informações do cliente e empresa em negrito preto
- **Divisores entre linhas**: Linha horizontal preta (1px) com aspas decorativas alternadas:
  - Linhas pares: Aspas azuis (#0066FF) à direita
  - Linhas ímpares: Aspas rosas (#FF0066) à esquerda
  - Aspas grandes (40px) posicionadas sobre a linha divisória
- **Imagem de rodapé**: Banner inferior com URL absoluta `http://books-sonda.vercel.app/images/rodape-elogios.png` (carregada diretamente do servidor)
- **CSS inline otimizado** para compatibilidade com clientes de email
- **Layout responsivo**: Adapta para 1 coluna em mobile (max-width: 600px)
- **Paleta de cores Sonda**: Azul (#0066FF), Rosa (#FF0066), Preto (#000000), Cinza (#f3f4f6)
- **Imagens**: Header e Footer com URLs absolutas (carregadas diretamente do servidor Vercel)

**Validações implementadas:**
- Pelo menos um destinatário obrigatório
- Formato de email válido (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Assunto obrigatório
- Limite de 25MB para anexos totais
- Pelo menos um elogio selecionado para envio
- Validação de tipos de arquivo aceitos

**Tratamento de erros:**
- Mensagens de erro via toast (sonner)
- Estados de loading durante operações assíncronas
- Validação antes de cada ação crítica
- Feedback visual de sucesso/erro
- Mensagens específicas para cada tipo de erro

**Integrações:**
- Sistema de permissões (ProtectedAction)
- Sistema de notificações (toast/sonner)
- Hooks customizados de elogios
- Componentes UI do shadcn/ui

**Tipos utilizados:**
- `ElogioCompleto`: Tipo completo do elogio com dados da pesquisa (inclui campo `origem` para identificar fonte dos dados: 'sql_server' ou 'manual')
- `FiltrosElogio`: Filtros para busca (mês, ano)

**Melhorias recentes:**
- **Estilo visual consistente**: Aplicado estilo azul Sonda (bg-blue-600 hover:bg-blue-700 rounded-2xl) em todos os botões de ação principais (Disparar Elogios, Enviar e Confirmar Envio) para manter consistência com a identidade visual da marca
- **Reorganização de colunas**: Ordem otimizada para melhor fluxo de leitura (Chamado → Empresa → Data → Cliente → Comentário → Resposta)
- **Larguras fixas**: Colunas com larguras definidas para melhor controle de layout e responsividade
- **Validação visual de empresas**: Implementada função `obterDadosEmpresa()` que destaca em vermelho empresas não cadastradas no sistema
- **Formatação aprimorada**: 
  - Chamado exibido com tipo do caso (IM/PR/RF) em fonte mono com fundo cinza
  - Data com estilo muted para melhor hierarquia visual
  - Badge de resposta com whitespace-nowrap para evitar quebra de linha
  - Textos responsivos com classes sm:text-sm para adaptação mobile
- **Melhor truncamento**: Cliente e comentário com truncamento apropriado para evitar overflow
- **Redesign completo do relatório HTML**: 
  - Substituído design inline por layout com imagens de header/footer
  - Implementado sistema de linhas com 4 cards por linha usando `display: table`
  - Adicionados divisores decorativos entre linhas com aspas alternadas (azul/rosa)
  - Alterado campo exibido de `cliente` para `prestador` (consultor que recebeu o elogio)
  - Melhorada estrutura dos cards com nome do prestador, resposta, comentário e informações do cliente/empresa
  - Layout mais limpo e profissional compatível com clientes de email
- **Otimização de imagens no email**: 
  - **Header e Footer**: URLs absolutas apontando para servidor Vercel (`http://books-sonda.vercel.app/images/`)
  - Imagens carregadas diretamente do servidor para reduzir tamanho do email
  - Melhor compatibilidade com clientes de email modernos que permitem imagens externas HTTPS
- **Seção de título adicionada**: 
  - Nova seção após o header com título principal e mês em destaque
  - Melhora a apresentação visual e contexto do relatório
  - Título em duas linhas: "ELOGIOS AOS COLABORADORES" / "DE SOLUÇÕES DE NEGÓCIOS"
  - Mês exibido em caixa alta (ex: "DEZEMBRO") para fácil identificação do período
- **Responsividade aprimorada no relatório HTML**:
  - Adicionados estilos responsivos para a seção de título em dispositivos móveis (max-width: 600px)
  - Redução de padding (24px 16px) e tamanho de fonte (título: 20px, mês: 16px) em telas pequenas
  - Melhor adaptação do layout para visualização em smartphones e tablets
  - Garantia de legibilidade e usabilidade em todos os dispositivos
- **Otimização da seção de título (Desktop)**:
  - **Espaçamento reduzido**: Padding ajustado de 40px para 24px (vertical) mantendo 48px (horizontal) para melhor proporção visual
  - **Tipografia refinada**: 
    - Título principal reduzido de 32px para 16px com letter-spacing de 0.5px para melhor proporção visual
    - Mês reduzido de 24px para 18px com letter-spacing de 1px (antes 2px)
    - Margem entre título e mês reduzida de 16px para 8px
  - **Resultado**: Seção de título mais compacta e elegante, melhor integração visual com o restante do email

**Melhorias futuras (TODOs):**
- Implementar serviço real de envio de email para elogios
- Integração com backend para disparo efetivo de emails

---

#### `CadastroTaxasClientes.tsx`
Página completa para gerenciamento de taxas de clientes, incluindo cadastro, edição, visualização e configuração de taxas padrão com histórico de parametrizações.

**Funcionalidades principais:**
- **CRUD completo de taxas**: Criação, edição, visualização e exclusão de taxas por cliente
- **Gestão de vigências**: Controle de períodos de vigência (início e fim) com validação de status
- **Taxas por tipo de produto**: Suporte a GALLERY e OUTROS (COMEX, FISCAL)
- **Valores diferenciados**: Tabelas separadas para hora remota e hora local
- **Cálculo automático**: Valores calculados automaticamente com base em regras de negócio (horários, dias da semana, stand-by)
- **Taxa padrão**: Configuração de taxas padrão para clientes sem AMS
- **Histórico de parametrizações**: Visualização do histórico de taxas padrão por tipo de produto
- **Interface com abas**: Organização em abas para melhor navegação (Configuração e Histórico)
- **Ordenação de colunas**: Sistema de ordenação clicável em todas as colunas da tabela com indicadores visuais (setas)

**Hooks utilizados:**
- `useTaxas()`: Busca todas as taxas cadastradas
- `useCriarTaxa()`: Hook para criação de novas taxas
- `useAtualizarTaxa()`: Hook para atualização de taxas existentes
- `useDeletarTaxa()`: Hook para exclusão de taxas
- `useCriarTaxaPadrao()`: Hook para criação de taxas padrão
- `useMemo`: Otimização de performance para ordenação de dados

**Ícones utilizados (lucide-react):**
- `Plus`, `Edit`, `Trash2`, `Eye`, `ArrowUpDown`, `ArrowUp`, `ArrowDown`

**Componentes UI principais:**
- **Tabela de taxas**: Listagem com colunas (Cliente, Tipo Produto, Vigência Início, Vigência Fim, Status, Ações)
- **Modal de criação/edição**: Dialog grande (max-w-7xl) com formulário completo usando componente `TaxaForm`
- **Modal de visualização**: Dialog com tabelas detalhadas de valores remotos e locais
- **Modal de taxa padrão**: Dialog com sistema de abas duplo:
  - **Aba Configuração**: Formulário para criar nova taxa padrão usando `TaxaPadraoForm`
  - **Aba Histórico**: Visualização do histórico com sub-abas por tipo de produto (GALLERY / COMEX, FISCAL) usando `TaxaPadraoHistorico`

**Estados gerenciados:**
- `modalAberto`: Controle do modal de criação/edição
- `taxaEditando`: Taxa sendo editada (null para criação)
- `taxaVisualizando`: Taxa sendo visualizada
- `modalVisualizarAberto`: Controle do modal de visualização
- `modalTaxaPadraoAberto`: Controle do modal de taxa padrão
- `tipoProdutoTaxaPadrao`: Tipo de produto selecionado no histórico ('GALLERY' | 'OUTROS')
- `ordenacao`: Estado de ordenação contendo campo e direção ('asc' | 'desc')

**Funções principais:**
- `handleNovaTaxa()`: Abre modal para criar nova taxa
- `handleAbrirTaxaPadrao()`: Abre modal de configuração de taxa padrão
- `handleSalvarTaxaPadrao(dados)`: Salva nova taxa padrão
- `handleEditarTaxa(taxa)`: Abre modal de edição com dados da taxa
- `handleVisualizarTaxa(taxa)`: Abre modal de visualização com detalhes completos
- `handleDeletarTaxa(id)`: Exclui taxa com confirmação
- `handleSubmit(dados)`: Salva taxa (criação ou edição)
- `verificarVigente(vigenciaInicio, vigenciaFim)`: Verifica se taxa está vigente na data atual
- `handleOrdenar(campo)`: Alterna ordenação da coluna clicada (ascendente → descendente → neutro)
- `taxasOrdenadas`: Computed value (useMemo) que retorna taxas ordenadas conforme estado de ordenação

**Estrutura da tabela principal:**
- **Coluna Cliente**: Nome abreviado do cliente (ordenável)
- **Coluna Tipo Produto**: Badge azul para GALLERY, outline para OUTROS (exibe nomes dos produtos quando OUTROS) (ordenável)
- **Coluna Vigência Início**: Data formatada em pt-BR (DD/MM/YYYY) (ordenável)
- **Coluna Vigência Fim**: Data formatada ou "Indefinida" (ordenável)
- **Coluna Status**: Badge verde para "Vigente", cinza para "Não Vigente" (ordenável)
- **Coluna Ações**: Botões de visualizar, editar e excluir

**Sistema de ordenação:**
- Todas as colunas (exceto Ações) possuem ordenação clicável
- Indicadores visuais de ordenação:
  - `ArrowUpDown`: Coluna não ordenada (estado neutro)
  - `ArrowUp`: Ordenação ascendente ativa
  - `ArrowDown`: Ordenação descendente ativa
- Ordenação por cliente: alfabética (A-Z / Z-A)
- Ordenação por tipo de produto: alfabética (GALLERY antes de OUTROS)
- Ordenação por datas: cronológica (mais antiga → mais recente / mais recente → mais antiga)
- Ordenação por status: alfabética (Não Vigente antes de Vigente)
- Implementação otimizada com `useMemo` para evitar re-renderizações desnecessárias

**Modal de visualização (estrutura):**
- **Informações Gerais**: Grid 2x2 com Cliente, Tipo de Produto, Vigência Início e Vigência Fim
- **Tabela de Valores Remotos**: Tabela completa com 7 colunas:
  - Função
  - Seg-Sex 08h30-17h30 (valor base)
  - Seg-Sex 17h30-19h30 (calculado)
  - Seg-Sex Após 19h30 (calculado)
  - Sáb/Dom/Feriados (calculado)
  - Hora Adicional - Excedente do Banco (calculado)
  - Stand By (calculado)
- **Tabela de Valores Locais**: Tabela com 5 colunas (sem Hora Adicional e Stand By):
  - Função
  - Seg-Sex 08h30-17h30 (valor base)
  - Seg-Sex 17h30-19h30 (calculado)
  - Seg-Sex Após 19h30 (calculado)
  - Sáb/Dom/Feriados (calculado)

**Modal de taxa padrão (estrutura com abas):**
- **Aba Configuração**: 
  - Formulário completo para criar nova taxa padrão
  - Componente `TaxaPadraoForm` com todos os campos necessários
- **Aba Histórico de Parametrizações**:
  - Sub-abas por tipo de produto (GALLERY / COMEX, FISCAL)
  - Componente `TaxaPadraoHistorico` exibindo histórico filtrado por tipo
  - Visualização de todas as parametrizações anteriores

**Cálculo de valores:**
- Utiliza função `calcularValores()` de `@/types/taxasClientes`
- Valores calculados automaticamente com base no valor base e função
- Regras de negócio aplicadas para diferentes horários e dias
- Valores formatados em pt-BR com 2 casas decimais

**Funções por tipo de produto:**
- Utiliza função `getFuncoesPorProduto()` de `@/types/taxasClientes`
- GALLERY: Funções específicas para produto Gallery
- OUTROS: Funções para COMEX e FISCAL

**Formatação de dados:**
- Datas formatadas em pt-BR (DD/MM/YYYY) usando date-fns
- Valores monetários formatados com `toLocaleString('pt-BR')`
- Ajuste de timezone adicionando 'T00:00:00' às datas
- Badges coloridos para status e tipos de produto

**Validações:**
- Confirmação antes de excluir taxa
- Verificação de vigência baseada na data atual
- Validação de campos obrigatórios via formulário

**Tratamento de erros:**
- Try-catch em operações assíncronas
- Logs de erro no console
- Refetch automático após operações bem-sucedidas

**Integrações:**
- Sistema de taxas via hooks customizados
- Componentes de formulário (`TaxaForm`, `TaxaPadraoForm`, `TaxaPadraoHistorico`)
- Componentes UI do shadcn/ui (Table, Card, Dialog, Badge, Tabs, Button)
- Integração com tipos e funções de cálculo de `@/types/taxasClientes`

**Tipos utilizados:**
- `TaxaClienteCompleta`: Tipo completo da taxa com dados do cliente
- `TaxaFormData`: Dados do formulário de taxa
- `TaxaPadraoData`: Dados do formulário de taxa padrão

**Componentes importados:**
- `TaxaForm` - Formulário de cadastro/edição de taxas
- `TaxaPadraoForm` - Formulário de configuração de taxa padrão
- `TaxaPadraoHistorico` - Componente de visualização do histórico de taxas padrão

**Melhorias recentes:**
- **Reorganização do modal de taxa padrão**: Implementado sistema de abas duplo para separar Configuração e Histórico
- **Aba de Configuração**: Formulário isolado para criar nova taxa padrão sem poluição visual do histórico
- **Aba de Histórico**: Visualização dedicada do histórico com sub-abas por tipo de produto (GALLERY / COMEX, FISCAL)
- **Melhor UX**: Separação clara entre ação de configurar (criar nova) e consultar histórico
- **Navegação intuitiva**: Abas principais (Configuração/Histórico) e sub-abas (GALLERY/OUTROS) para organização hierárquica
- **Sistema de ordenação completo**: Implementada ordenação clicável em todas as colunas da tabela com indicadores visuais (setas) e otimização de performance via `useMemo`

**Estilo visual:**
- Tabelas com cabeçalho azul Sonda (#0066FF)
- Linhas alternadas (zebra striping) para melhor legibilidade
- Células calculadas com fundo azul claro (bg-blue-50)
- Valores base em negrito para destaque
- Bordas arredondadas nas tabelas
- Layout responsivo com scroll horizontal quando necessário

---

#### `AuditLogs.tsx`
Página completa para visualização e análise de logs de auditoria do sistema, com filtros avançados, busca textual, paginação e exportação para Excel/PDF.

**Funcionalidades principais:**
- **Visualização de logs**: Listagem completa de todas as alterações no sistema com detalhes
- **Filtros avançados**: Sistema de filtros por tabela, ação, período e busca textual
- **Estatísticas visuais**: Cards com resumo de alterações dos últimos 30 dias
- **Paginação inteligente**: Navegação por páginas com indicadores visuais e elipses
- **Exportação de dados**: Exportação de logs para Excel e PDF com formatação
- **Busca em tempo real**: Busca textual em múltiplos campos (tabela, ação, usuário, email)
- **Formatação assíncrona**: Renderização otimizada de alterações usando componente assíncrono
- **Badges coloridos**: Indicadores visuais para tipos de ação (Criado, Atualizado, Excluído)

**Hooks utilizados:**
- `useState` - Gerenciamento de estado local (logs, filtros, paginação, loading)
- `useEffect` - Carregamento de dados ao montar e quando filtros mudam
- `useToast` - Notificações de sucesso/erro nas exportações

**Ícones utilizados (lucide-react):**
- `Filter`, `RefreshCw`, `User`, `Clock`, `Database`, `Search`, `Download`, `FileText`, `FileSpreadsheet`, `ChevronDown`

**Componentes principais:**

**AuditLogChanges (componente interno):**
- Renderiza alterações de forma assíncrona para melhor performance
- Carrega formatação de alterações via `auditService.formatChanges()`
- Exibe estado de loading e tratamento de erros

**AuditLogExportButtons (componente interno):**
- Dropdown menu com opções de exportação (Excel e PDF)
- Validação de dados antes de exportar
- Estados de loading durante exportação
- Notificações via toast para feedback ao usuário
- Importação dinâmica de utilitários de exportação

**Cards de estatísticas:**
- **Total de Alterações**: Contador geral de mudanças nos últimos 30 dias
- **Grupos Alterados**: Alterações na tabela `user_groups`
- **Permissões Alteradas**: Alterações na tabela `screen_permissions`
- **Atribuições Alteradas**: Alterações na tabela `user_group_assignments`

**Painel de filtros (expansível):**
- **Buscar**: Campo de busca textual com ícone
- **Tabela**: Select com todas as tabelas auditadas:
  - Grupos de Usuários (`user_groups`)
  - Permissões de Tela (`screen_permissions`)
  - Atribuições de Usuários (`user_group_assignments`)
  - Usuários do Sistema (`profiles`)
  - Empresas Clientes (`empresas_clientes`)
  - Cadastro de Clientes (`clientes`)
  - Grupos Responsáveis (`grupos_responsaveis`)
  - Templates de Email (`email_templates`)
  - Disparos de Books (`historico_disparos`)
  - Requerimentos (`requerimentos`)
  - **Taxas de Clientes** (`taxas_clientes`) - NOVO
  - **Taxas Padrão** (`taxas_padrao`) - NOVO
- **Ação**: Select com tipos de ação (Criado, Atualizado, Excluído)
- **Período**: Dois campos de data (de/até) para filtrar por intervalo

**Estados gerenciados:**
- `logs`: Array de logs de auditoria com dados do usuário
- `summary`: Resumo estatístico de alterações
- `loading`: Estado de carregamento de dados
- `filters`: Objeto com filtros aplicados (table_name, action, date_from, date_to)
- `currentPage`: Página atual da paginação
- `totalCount`: Total de registros encontrados
- `showFilters`: Controle de expansão do painel de filtros
- `searchTerm`: Termo de busca textual

**Funções principais:**
- `loadAuditLogs()`: Carrega logs com filtros e paginação aplicados
- `loadSummary()`: Carrega estatísticas de auditoria
- `handleFilterChange(key, value)`: Atualiza filtros e reseta paginação
- `clearFilters()`: Remove todos os filtros aplicados
- `getActionBadgeVariant(action)`: Retorna variante do badge baseado na ação
- `getActionLabel(action)`: Converte ação técnica para label amigável

**Estrutura dos logs:**
Cada log exibe:
- **Badge de ação**: Colorido conforme tipo (INSERT=azul, UPDATE=cinza, DELETE=vermelho)
- **Nome da tabela**: Nome amigável em português via `auditService.getTableDisplayName()`
- **Data/hora**: Formatada em pt-BR (DD/MM/YYYY HH:mm:ss)
- **Alterações**: Descrição formatada das mudanças (renderizada assincronamente)
- **Usuário**: Nome e email do usuário que executou a ação

**Sistema de paginação:**
- Exibição de 20 logs por página
- Navegação com botões Anterior/Próxima
- Números de página clicáveis com elipses para muitas páginas
- Lógica inteligente de exibição:
  - Sempre mostra primeira e última página
  - Mostra páginas ao redor da página atual
  - Usa elipses (...) quando há muitas páginas
  - Destaca página atual com variant "default"

**Busca textual:**
Busca em tempo real nos seguintes campos:
- Nome técnico da tabela
- Tipo de ação
- Nome do usuário
- Email do usuário
- Nome amigável da tabela (em português)

**Exportação de dados:**

**Exportação para Excel:**
- Exporta até 1000 logs com filtros aplicados
- Utiliza `exportAuditLogsToExcel()` de `@/utils/auditLogsExportUtils`
- Formatação automática de colunas e dados
- Notificação de sucesso com quantidade exportada

**Exportação para PDF:**
- Gera relatório detalhado com até 1000 logs
- Utiliza `exportAuditLogsToPDF()` de `@/utils/auditLogsExportUtils`
- Inclui estatísticas do resumo no relatório
- Formatação profissional para impressão

**Validações:**
- Verifica se há dados antes de exportar
- Notifica usuário se não houver logs para exportar
- Tratamento de erros com mensagens específicas

**Tratamento de erros:**
- Try-catch em todas as operações assíncronas
- Logs de erro no console para debugging
- Notificações via toast para feedback ao usuário
- Estados de loading durante operações

**Integrações:**
- `auditService` - Serviço principal de auditoria
- `@/utils/auditLogsExportUtils` - Utilitários de exportação (importação dinâmica)
- Componentes UI do shadcn/ui (Card, Button, Input, Select, Badge, DropdownMenu)
- Sistema de notificações via toast

**Tipos utilizados:**
- `AuditLogWithUser` - Log de auditoria com dados do usuário
- `AuditLogFilters` - Filtros para busca de logs
- `AuditLogSummary` - Resumo estatístico de alterações
- `PermissionAuditLog` - Log de auditoria de permissões

**Melhorias recentes:**
- **Adicionados filtros para taxas**: Incluídas opções "Taxas de Clientes" e "Taxas Padrão" no select de tabelas para permitir auditoria completa do módulo de taxas
- **Mapeamento de nomes amigáveis**: Integração com `auditService.getTableDisplayName()` para exibir nomes em português
- **Suporte completo a auditoria de taxas**: Rastreamento de todas as operações CRUD em taxas de clientes e taxas padrão

**Estilo visual:**
- Cards de estatísticas com ícones e cores consistentes
- Badges coloridos para tipos de ação (azul, cinza, vermelho)
- Bordas arredondadas nos logs individuais
- Layout responsivo com grid adaptativo
- Botões de paginação com destaque para página atual
- Dropdown menu para exportação com ícones

**Uso típico:**
1. Usuário acessa a página de logs de auditoria
2. Visualiza estatísticas gerais nos cards superiores
3. Expande filtros para buscar logs específicos
4. Aplica filtros por tabela (ex: "Taxas de Clientes"), ação e período
5. Navega entre páginas de resultados
6. Exporta logs filtrados para Excel ou PDF

---

### `src/components/admin/taxas/`

Componentes relacionados ao gerenciamento de taxas de clientes.

#### `TaxaForm.tsx`
Formulário completo para cadastro e edição de taxas de clientes, com cálculo automático de valores, gestão de vigências, suporte a reajustes e campos específicos por cliente.

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de taxas com todos os campos necessários
- **Integração com empresas**: Select dinâmico com lista de empresas ordenadas alfabeticamente
- **Gestão de produtos**: Carregamento automático dos produtos do cliente selecionado
- **Seleção de datas**: Calendários interativos para vigência início e fim
- **Cálculo automático**: Valores calculados em tempo real com base em regras de negócio
- **Modo Personalizado**: Flag "Personalizado" que permite edição manual de TODOS os campos das tabelas (valores calculados tornam-se editáveis)
- **Suporte a reajuste**: Campo de taxa de reajuste (%) disponível apenas em modo edição e quando não estiver em modo personalizado
- **Tabelas interativas**: Edição inline de valores base com formatação monetária (todos os campos editáveis em modo personalizado)
- **Taxa padrão automática**: Preenchimento automático com taxa padrão para clientes sem AMS
- **Vigência automática**: Sugestão de vigência de 1 ano menos 1 dia ao selecionar data início (ex: início 01/01/2024 → fim 31/12/2024)
- **Interface limpa**: Visual simplificado sem indicadores redundantes de cálculo automático
- **Campos específicos por cliente**: Suporte a campos condicionais que aparecem baseado no nome abreviado da empresa (ex: valor_ticket para VOTORANTIM, ticket_excedente_simples para EXXONMOBIL)

**Props do componente:**
- `taxa?: TaxaClienteCompleta | null` - Taxa existente para edição (opcional)
- `onSubmit: (dados: TaxaFormData) => void` - Callback executado ao submeter o formulário
- `onCancel: () => void` - Callback para cancelar a operação
- `isLoading?: boolean` - Estado de loading durante operações assíncronas

**Hooks utilizados:**
- `useForm` (React Hook Form) - Gerenciamento do estado do formulário
- `useEmpresas()` - Busca lista de empresas para o select

**Campos do formulário:**

**Seção: Dados Principais**
- `cliente_id` (obrigatório) - Select com empresas ordenadas alfabeticamente (desabilitado em edição)
- `tipo_produto` (obrigatório) - Select com tipos de produto baseado nos produtos do cliente (GALLERY ou OUTROS)
- `vigencia_inicio` (obrigatório) - Calendário para data de início da vigência
- `vigencia_fim` - Calendário para data de fim da vigência (opcional, indefinida se não preenchido)
- `tipo_calculo_adicional` - Select com tipo de cálculo para hora adicional (Normal ou Média)
- `personalizado` - Checkbox para habilitar modo personalizado (edição manual de todos os campos)
- `taxa_reajuste` - Campo numérico para percentual de reajuste (visível apenas em edição e quando não estiver em modo personalizado)

**Seção: Valores Hora Remota**
Tabela com 7 colunas para edição de valores remotos:
- **Função**: Nome da função (Funcional, Técnico, ABAP, DBA, Gestor)
- **Seg-Sex 08h30-17h30**: Valor base editável com formatação monetária
- **Seg-Sex 17h30-19h30**: Valor calculado automaticamente (editável em modo personalizado)
- **Seg-Sex Após 19h30**: Valor calculado automaticamente (editável em modo personalizado)
- **Sáb/Dom/Feriados**: Valor calculado automaticamente (editável em modo personalizado)
- **Hora Adicional (Excedente do Banco)**: Valor calculado automaticamente (editável em modo personalizado)
- **Stand By**: Valor calculado automaticamente (editável em modo personalizado)

**Seção: Valores Hora Local**
Tabela com 5 colunas para edição de valores locais:
- **Função**: Nome da função (Funcional, Técnico, ABAP, DBA, Gestor)
- **Seg-Sex 08h30-17h30**: Valor base editável com formatação monetária
- **Seg-Sex 17h30-19h30**: Valor calculado automaticamente (editável em modo personalizado)
- **Seg-Sex Após 19h30**: Valor calculado automaticamente (editável em modo personalizado)
- **Sáb/Dom/Feriados**: Valor calculado automaticamente (editável em modo personalizado)

**Estados gerenciados:**
- `tipoProdutoSelecionado`: Tipo de produto selecionado (GALLERY ou OUTROS)
- `tipoCalculoAdicional`: Tipo de cálculo para hora adicional ('normal' ou 'media')
- `produtosCliente`: Array de produtos do cliente selecionado
- `clienteSelecionado`: Nome abreviado do cliente selecionado
- `valoresEditando`: Objeto com valores sendo editados (para formatação inline)
- `valoresOriginais`: Valores originais da taxa (para cálculo de reajuste)
- `personalizado`: Flag booleana indicando se o modo personalizado está ativo

**Valores observados (form.watch):**
- `funcionalRemoto`, `tecnicoRemoto`, `abapRemoto`, `dbaRemoto`, `gestorRemoto`: Valores remotos por função observados em tempo real
- `personalizado`: Flag de modo personalizado observada para controle de comportamento
- `valoresRemota`: Objeto completo de valores remotos observado
- **Debug logging**: Console logs detalhados (🔍 [DEBUG]) dos valores observados para facilitar troubleshooting e desenvolvimento

**Comportamento:**
- **Modo criação**: Formulário em branco para nova taxa
- **Modo edição**: Formulário preenchido com dados da taxa existente
- **Modo personalizado**: Quando checkbox "Personalizado" está marcado:
  - Todos os campos das tabelas (incluindo calculados) tornam-se editáveis
  - Campo de taxa de reajuste fica desabilitado
  - Valores não são calculados automaticamente
  - Usuário tem controle total sobre todos os valores
- **Carregamento de produtos**: Ao selecionar cliente, carrega produtos automaticamente
- **Seleção automática**: Se cliente tem apenas um produto, seleciona automaticamente
- **Taxa padrão**: Se cliente não tem AMS, preenche com taxa padrão do tipo de produto
- **Cálculo de reajuste**: Ao informar taxa de reajuste, recalcula valores e vigências automaticamente (não disponível em modo personalizado)
- **Vigência sugerida**: Ao selecionar data início, sugere data fim 1 ano à frente
- **Edição inline**: Campos de valor base com formatação monetária e seleção automática ao focar (todos os campos em modo personalizado)
- **Recálculo automático de valores locais**: Quando não está em modo personalizado, ao editar um valor remoto (onBlur), recalcula automaticamente os valores locais correspondentes usando `calcularValoresLocaisAutomaticos()` com delay de 100ms

**Funções principais:**
- `formatarMoeda(valor)`: Formata número para formato monetário brasileiro (0,00)
- `converterMoedaParaNumero(valor)`: Converte string monetária para número
- `calcularValoresExibicao(valores, tipo)`: Calcula todos os valores derivados para exibição com diferenciação automática entre valores remotos e locais
- `handleSubmit(data)`: Processa e submete dados do formulário
- `getCamposEspecificosPorCliente(nomeAbreviado)`: Retorna configuração de campos específicos baseado no nome abreviado do cliente
- `clienteTemCamposEspecificos(nomeAbreviado)`: Verifica se cliente possui campos específicos configurados

**Cálculo automático de valores:**
- Utiliza função `calcularValores()` de `@/types/taxasClientes` com parâmetro `isLocal` para diferenciação entre valores remotos e locais
- **Cálculo diferenciado por tipo**: Valores locais calculados automaticamente com 10% a mais que os remotos usando parâmetro `isLocal = true`
- Utiliza função `calcularValoresLocaisAutomaticos()` de `@/types/taxasClientes` para cálculo automático de valores locais (10% a mais dos valores remotos)
- Valores calculados em tempo real conforme usuário edita valores base
- Regras de negócio aplicadas para diferentes horários e dias
- Suporte a dois tipos de cálculo para hora adicional (normal ou média)

**Funções por tipo de produto:**
- Utiliza função `getFuncoesPorProduto()` de `@/types/taxasClientes`
- GALLERY: Funções específicas para produto Gallery
- OUTROS: Funções para COMEX e FISCAL

**Campos específicos por cliente:**
- Utiliza função `getCamposEspecificosPorCliente()` para obter configuração de campos específicos baseado no nome abreviado do cliente
- Utiliza função `clienteTemCamposEspecificos()` para verificar se cliente possui campos específicos configurados
- Suporte a campos condicionais que aparecem baseado no cliente selecionado:
  - **VOTORANTIM e CSN**: valor_ticket, valor_ticket_excedente
  - **EXXONMOBIL**: ticket_excedente_simples, ticket_excedente_complexo
  - **CHIESI**: ticket_excedente_1 (Ticket Base), ticket_excedente_2 (Ticket Excedente)
  - **NIDEC**: ticket_excedente

**Formatação de dados:**
- Valores monetários formatados em pt-BR com 2 casas decimais
- Datas formatadas em pt-BR (DD/MM/YYYY) usando date-fns
- Ajuste de timezone adicionando 'T00:00:00' às datas
- Edição inline com formatação automática ao focar/desfocar

**Validações:**
- Cliente obrigatório
- Tipo de produto obrigatório (validação explícita com setError)
- Vigência início obrigatória (validação explícita com setError)
- Validação de formato de valores monetários

**Integração:**
- Utilizado na página `CadastroTaxasClientes.tsx`
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Integra-se com serviço de taxas padrão para preenchimento automático
- Utiliza funções de cálculo de `@/types/taxasClientes` (`calcularValores`, `getFuncoesPorProduto`, `calcularValoresLocaisAutomaticos`)
- Validação consistente com tipos definidos em `@/types/taxasClientes`
- Exportado via `src/components/admin/taxas/index.ts`

**Componentes UI utilizados:**
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription` - Componentes de formulário do shadcn/ui
- `Input` - Campos de texto e numéricos
- `Checkbox` - Checkbox para modo personalizado
- `Select` - Seleção de opções
- `Calendar` - Seletor de data com locale pt-BR
- `Popover` - Container para o calendário
- `Button` - Botões de ação

**Tipos utilizados:**
- `TaxaClienteCompleta` - Tipo completo da taxa com dados do cliente
- `TaxaFormData` - Dados do formulário validados
- `TipoProduto` - Tipo de produto ('GALLERY' | 'OUTROS')

**Melhorias recentes:**
- **Validação explícita de campos obrigatórios**: Implementada validação manual com `form.setError()` para campos críticos:
  - **vigencia_inicio**: Validação explícita com mensagem "Vigência início é obrigatória" e retorno early para evitar processamento com dados inválidos
  - **tipo_produto**: Validação explícita com mensagem "Tipo de produto é obrigatório" e retorno early para garantir integridade dos dados
  - **Melhor UX**: Usuário recebe feedback específico sobre campos obrigatórios não preenchidos
  - **Prevenção de erros**: Evita tentativas de processamento com dados incompletos
  - **Validação robusta**: Complementa validação do schema Zod com verificações específicas no momento do submit
- **Interface visual simplificada**: Removido indicador visual redundante "🔄 Calculado automaticamente (+10%)" da seção de Valores Hora Local para interface mais limpa e menos poluída visualmente, mantendo funcionalidade de cálculo automático intacta
- **Recálculo automático de valores locais no onBlur**: Implementada funcionalidade que recalcula automaticamente os valores locais quando usuário edita um valor remoto:
  - Dispara no evento `onBlur` dos campos de valor base remoto
  - Só executa quando não está em modo personalizado
  - Usa `setTimeout` com delay de 100ms para garantir que o valor foi salvo no formulário
  - Obtém valores remotos atuais via `form.getValues('valores_remota')`
  - Calcula novos valores locais usando `calcularValoresLocaisAutomaticos()`
  - Atualiza formulário via `form.setValue('valores_local', valoresLocaisCalculados)`
  - Logging detalhado (🔄 [ON BLUR]) para debug do processo
  - Melhora UX ao manter sincronização automática entre valores remotos e locais durante edição
- **Debug logging de valores observados**: Adicionado console log detalhado (🔍 [DEBUG]) dos valores observados via form.watch para facilitar troubleshooting:
  - Log de todos os valores remotos por função (funcionalRemoto, tecnicoRemoto, abapRemoto, dbaRemoto, gestorRemoto)
  - Log da flag personalizado para rastrear mudanças de modo
  - Log do objeto completo valoresRemota para debug de estrutura
  - Facilita identificação de problemas com reatividade do formulário e cálculos automáticos
- **Correção de typo em variável**: Corrigido nome da variável de `abaprRemoto` para `abapRemoto` no monitoramento de campos específicos para garantir consistência e legibilidade do código
- **Validação de valores antes do cálculo automático**: Implementada verificação inteligente no useEffect de cálculo automático de valores locais:
  - Verifica se há valores válidos (> 0) em pelo menos uma função antes de calcular valores locais
  - Evita cálculos desnecessários quando todos os valores remotos estão zerados
  - Logging aprimorado mostrando valores remotos e locais calculados para debug
  - Melhora performance ao evitar operações desnecessárias
  - Garante que valores locais só sejam calculados quando há dados válidos para processar
- **Cálculo diferenciado de valores locais implementado**: Atualizada função `calcularValoresExibicao()` para usar parâmetro `isLocal` na função `calcularValores()`:
  - Valores remotos calculados com `isLocal = false` (comportamento padrão)
  - Valores locais calculados com `isLocal = true` (aplica automaticamente 10% a mais no valor base)
  - Elimina necessidade de cálculo manual separado para valores locais
  - Garante consistência na aplicação da regra de 10% a mais para valores locais
  - Simplifica lógica de cálculo usando função unificada
- **Modo Personalizado implementado**: Adicionado checkbox "Personalizado" que permite edição manual de todos os campos das tabelas
  - Quando marcado, todos os valores (incluindo calculados) tornam-se editáveis
  - Campo de taxa de reajuste desabilitado em modo personalizado
  - Valores personalizados salvos em campos separados (`valores_remota_personalizados`, `valores_local_personalizados`)
- **Migração de banco de dados**: Criada migração `add_personalizado_field_taxas.sql` para adicionar coluna `personalizado` (boolean) na tabela `taxas_clientes`
- **Correção no Select de cliente**: Adicionado fallback para string vazia (`value={field.value || ""}`) para evitar warning de componente não controlado
- **Simplificação do SelectValue**: Removida exibição manual do valor selecionado, deixando o componente gerenciar automaticamente a substituição do placeholder
- **Melhor controle de estado**: Garantia de que o Select sempre tem um valor válido (string vazia quando não selecionado)

**Estilo visual:**
- Tabelas com cabeçalho azul Sonda (#0066FF)
- Linhas alternadas (zebra striping) para melhor legibilidade
- Células calculadas com fundo azul claro (bg-blue-50)
- Valores base editáveis com destaque
- Bordas arredondadas nas tabelas
- Layout responsivo com larguras fixas de colunas
- Inputs de valor com alinhamento à direita

---

#### `TaxaPadraoHistorico.tsx`
Componente para visualização e gerenciamento do histórico de taxas padrão, com funcionalidades de listagem, edição, visualização e exclusão de parametrizações anteriores.

**Funcionalidades principais:**
- **Listagem de histórico**: Exibição de todas as taxas padrão cadastradas filtradas por tipo de produto
- **Visualização detalhada**: Modal com visualização completa dos valores remotos e locais
- **Edição de taxas**: Modal de edição com formulário completo usando `TaxaPadraoForm`
- **Exclusão de taxas**: Remoção de taxas padrão com confirmação
- **Status de vigência**: Cálculo automático do status (Vigente, Futura, Expirada, Indefinido)
- **Formatação de dados**: Datas e valores monetários formatados em pt-BR
- **Interface compacta**: Tabela simplificada com colunas essenciais (Cliente, Tipo Produto, Vigências, Status, Ações)

**Props do componente:**
- `tipoProduto: 'GALLERY' | 'OUTROS'` - Tipo de produto para filtrar o histórico

**Hooks utilizados:**
- `useHistoricoTaxasPadrao(tipoProduto)` - Busca histórico de taxas padrão filtrado por tipo
- `useAtualizarTaxaPadrao()` - Hook para atualização de taxas padrão
- `useDeletarTaxaPadrao()` - Hook para exclusão de taxas padrão

**Ícones utilizados (lucide-react):**
- `Eye` - Visualizar taxa
- `Edit` - Editar taxa
- `Trash2` - Excluir taxa

**Componentes UI principais:**
- **Tabela de histórico**: Listagem compacta com 6 colunas:
  - **Cliente**: Exibe "Taxa Padrão" em negrito
  - **Tipo Produto**: Badge azul para GALLERY, outline para OUTROS (exibe "COMEX, FISCAL")
  - **Vigência Início**: Data formatada em pt-BR (DD/MM/YYYY)
  - **Vigência Fim**: Data formatada ou "Indefinida"
  - **Status**: Badge colorido (verde para Vigente, cinza para Expirada, secondary para Futura)
  - **Ações**: Botões compactos (8x8) de visualizar, editar e excluir
- **Modal de edição**: Dialog grande (max-w-7xl) com formulário completo usando `TaxaPadraoForm`
- **Modal de visualização**: Dialog grande com informações gerais e tabelas de valores

**Estados gerenciados:**
- `taxaEditando`: Taxa sendo editada (null quando não há edição)
- `taxaVisualizando`: Taxa sendo visualizada (null quando modal fechado)
- `modalEditarAberto`: Controle de abertura do modal de edição
- `modalVisualizarAberto`: Controle de abertura do modal de visualização

**Funções principais:**
- `handleEditar(taxa)`: Abre modal de edição com dados da taxa selecionada
- `handleVisualizar(taxa)`: Abre modal de visualização com detalhes completos
- `handleDeletar(id)`: Exclui taxa com confirmação via `window.confirm`
- `handleSubmitEdicao(dados)`: Salva alterações da taxa editada
- `getStatusVigencia(inicio, fim)`: Calcula status da vigência baseado nas datas
- `formatarMoeda(valor)`: Formata número para formato monetário brasileiro (0,00)
- `formatarData(data)`: Formata data para exibição em pt-BR (DD/MM/YYYY)

**Estrutura da tabela:**
- **Coluna Cliente**: Exibe "Taxa Padrão" em negrito para todas as linhas (cabeçalho atualizado de "Tipo" para "Cliente")
- **Coluna Tipo Produto**: Badge com cores da marca Sonda:
  - GALLERY: Badge azul (#0066FF) com texto branco
  - OUTROS: Badge outline com borda azul e texto azul, exibe "COMEX, FISCAL"
- **Coluna Vigência Início**: Data formatada com tratamento de timezone
- **Coluna Vigência Fim**: Data formatada ou "Indefinida" se não houver
- **Coluna Status**: Badge colorido baseado no status calculado:
  - Vigente: Badge verde (bg-green-600)
  - Futura: Badge secondary
  - Expirada: Badge outline
  - Indefinido: Badge outline
- **Coluna Ações**: Três botões compactos (h-8 w-8) com gap reduzido (gap-1):
  - Visualizar: Botão ghost com ícone Eye
  - Editar: Botão ghost com ícone Edit
  - Excluir: Botão ghost vermelho (text-red-600 hover:text-red-700 hover:bg-red-50) com ícone Trash2

**Modal de visualização (estrutura):**
- **Informações Gerais**: Grid 2x2 com:
  - Tipo (exibe "Taxa Padrão")
  - Tipo de Produto (GALLERY ou COMEX, FISCAL)
  - Vigência Início
  - Vigência Fim
- **Tabela de Valores Remotos**: Tabela com 2 colunas (Função e Valor Base):
  - Funcional
  - Técnico
  - ABAP - PL/SQL (apenas para OUTROS)
  - DBA
  - Gestor
- **Tabela de Valores Locais**: Tabela com 2 colunas (Função e Valor Base):
  - Funcional
  - Técnico
  - ABAP - PL/SQL (apenas para OUTROS)
  - DBA
  - Gestor

**Cálculo de status de vigência:**
- **Vigente**: Data início <= hoje E (sem data fim OU data fim >= hoje)
- **Futura**: Data início > hoje
- **Expirada**: Data fim < hoje
- **Indefinido**: Datas inválidas ou não fornecidas

**Formatação de dados:**
- Datas formatadas em pt-BR (DD/MM/YYYY) usando date-fns com locale ptBR
- Valores monetários formatados com `toLocaleString('pt-BR')` com 2 casas decimais
- Ajuste de timezone adicionando 'T00:00:00' às datas string
- Tratamento de erros com fallbacks ("Data inválida", "Indefinida")

**Validações:**
- Confirmação antes de excluir taxa via `window.confirm`
- Verificação de datas válidas antes de calcular status
- Tratamento de erros em formatação de datas e cálculos

**Tratamento de erros:**
- Try-catch em cálculo de status de vigência
- Try-catch em formatação de datas
- Logs de erro no console para debugging
- Fallbacks para valores inválidos

**Estados de carregamento:**
- Exibe "Carregando histórico..." durante busca de dados
- Exibe mensagem quando não há taxas cadastradas para o tipo de produto
- Loading state nos botões durante operações assíncronas

**Integrações:**
- Utilizado na página `CadastroTaxasClientes.tsx` dentro da aba "Histórico de Parametrizações"
- Integra-se com hooks de taxas padrão (`useHistoricoTaxasPadrao`, `useAtualizarTaxaPadrao`, `useDeletarTaxaPadrao`)
- Utiliza componente `TaxaPadraoForm` para edição
- Componentes UI do shadcn/ui (Table, Dialog, Badge, Button)
- Exportado via `src/components/admin/taxas/index.ts`

**Tipos utilizados:**
- `TaxaPadraoCompleta` - Tipo completo da taxa padrão com todos os campos
- `TaxaPadraoData` - Dados do formulário de taxa padrão

**Melhorias recentes:**
- **Simplificação da tabela**: Removidas colunas de valores específicos, mantendo apenas informações essenciais (Cliente, Tipo Produto, Vigências, Status, Ações)
- **Interface mais limpa**: Tabela compacta focada em navegação e ações rápidas
- **Botões compactos**: Reduzido tamanho dos botões de ação (h-8 w-8) e gap entre eles (gap-1)
- **Melhor hierarquia visual**: Cliente em negrito, badges coloridos para tipo de produto e status
- **Estilo consistente**: Badges com cores da marca Sonda (#0066FF) para melhor identidade visual
- **Botão de exclusão destacado**: Cor vermelha com hover states apropriados para ação destrutiva

**Estilo visual:**
- Tabela com bordas arredondadas (rounded-md border)
- Badges coloridos com cores da marca Sonda
- Botões de ação compactos e alinhados ao centro
- Modal de visualização com seções bem definidas
- Layout responsivo com scroll vertical quando necessário (max-h-[90vh])

---

### `src/components/admin/plano-acao/`

Componentes relacionados ao gerenciamento de planos de ação.

#### `PlanoAcaoForm.tsx`
Formulário completo para cadastro e edição de planos de ação, com validação via Zod, integração com React Hook Form e sistema de histórico de contatos múltiplos.

#### `ContatosList.tsx`
Componente completo para listagem e gerenciamento de contatos com clientes em planos de ação, permitindo registro detalhado de comunicações e acompanhamento de retornos.

**Funcionalidades principais:**
- **Listagem de contatos**: Exibição de todos os contatos registrados para um plano de ação específico
- **Interface expansível**: Cards colapsáveis com resumo na visualização compacta e detalhes completos na expansão
- **CRUD completo**: Criação, edição e exclusão de contatos via modais
- **Histórico cronológico**: Contatos ordenados por data com metadados de criação e atualização
- **Indicadores visuais**: Ícones específicos por meio de contato (📱 WhatsApp, 📧 Email, 📞 Ligação)
- **Estados vazios**: Mensagens informativas quando não há contatos registrados
- **Confirmação de exclusão**: Dialog de confirmação antes de remover contatos

**Props do componente:**
- `planoAcaoId: string` - UUID do plano de ação para buscar contatos relacionados

**Hooks utilizados:**
- `useContatosPlanoAcao(planoAcaoId)` - Busca lista de contatos do plano
- `useCriarContato()` - Hook para criação de novos contatos
- `useAtualizarContato()` - Hook para atualização de contatos existentes
- `useDeletarContato()` - Hook para exclusão de contatos

**Estados gerenciados:**
- `expandedContatos: Set<string>` - Controle de expansão de cards individuais
- `modalNovoContato: boolean` - Controle do modal de criação
- `contatoEditando: PlanoAcaoContato | null` - Contato sendo editado
- `contatoParaDeletar: string | null` - ID do contato para confirmação de exclusão

**Estrutura visual:**
- **Cabeçalho**: Título com contador de contatos e botão "Novo Contato" (azul Sonda)
- **Cards expansíveis**: Cada contato em card com Collapsible do shadcn/ui:
  - **Header compacto**: Ícone do meio de contato, data, resumo truncado, badge de retorno e botões de ação
  - **Conteúdo expandido**: Resumo completo, retorno do cliente, observações e metadados
- **Estado vazio**: Card com ícone MessageSquare e mensagem explicativa
- **Modais**: Dialog para criação/edição usando componente `ContatoForm`
- **Confirmação**: AlertDialog para exclusão com botão vermelho

**Integração:**
- Utiliza componente `ContatoForm` para formulários de criação e edição
- Integra-se com tipos `PlanoAcaoContato` e `PlanoAcaoContatoFormData`
- Utiliza funções utilitárias `getMeioContatoLabel()`, `getRetornoClienteLabel()` e `getMeioContatoIcon()`
- Formatação de datas com date-fns e locale pt-BR

#### `ContatoForm.tsx`
Formulário completo para cadastro e edição de contatos com clientes em planos de ação, com validação via Zod e campos específicos para registro de comunicações.

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de contatos com validação robusta
- **Validação via Zod**: Schema `contatoFormSchema` com validações específicas
- **Campos organizados**: Layout responsivo com grid adaptativo
- **Valores padrão inteligentes**: Data atual e WhatsApp como meio padrão
- **Validação contextual**: Resumo obrigatório com mínimo de 10 caracteres

**Props do componente:**
- `contato?: PlanoAcaoContato` - Contato existente para edição (opcional)
- `onSubmit: (dados: PlanoAcaoContatoFormData) => void` - Callback de submissão
- `onCancel: () => void` - Callback de cancelamento
- `isLoading?: boolean` - Estado de loading durante operações

**Campos do formulário:**
- `data_contato` (obrigatório) - Data do contato (input date)
- `meio_contato` (obrigatório) - Select com opções: WhatsApp, E-mail, Ligação
- `resumo_comunicacao` (obrigatório) - Textarea com mínimo 10 caracteres
- `retorno_cliente` (opcional) - Select com status: Aguardando, Respondeu, Solicitou Mais Informações
- `observacoes` (opcional) - Textarea para observações adicionais

**Validações implementadas:**
- Data do contato obrigatória
- Meio de contato obrigatório (enum)
- Resumo com mínimo de 10 caracteres
- Retorno do cliente opcional mas tipado
- Observações opcionais

**Integração:**
- Utilizado pelo componente `ContatosList` em modais de criação e edição
- Integra-se com tipos `PlanoAcaoContato` e `PlanoAcaoContatoFormData`
- Utiliza constantes `MEIO_CONTATO_CONTATOS_OPTIONS` e `RETORNO_CLIENTE_CONTATOS_OPTIONS`

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de planos de ação com todos os campos necessários
- **Validação robusta**: Validação de dados usando Zod schema com validação condicional
- **Integração com empresas**: Select dinâmico com lista de empresas ordenadas alfabeticamente
- **Inicialização inteligente**: Preenche campos iniciais com dados da pesquisa via defaultValues do useForm
- **Campos condicionais**: Exibe campos específicos baseados no status do plano
- **Validação contextual**: Campos obrigatórios mudam baseado no status final selecionado
- **Organização em seções**: Interface dividida em seções lógicas (Informações Básicas, Ação Corretiva, Contato, Conclusão)

**Props do componente:**
- `plano?: PlanoAcaoCompleto` - Plano existente para edição (opcional)
- `pesquisaId: string` - UUID da pesquisa de satisfação relacionada
- `onSubmit: (dados: PlanoAcaoFormData) => void` - Callback executado ao submeter o formulário
- `onCancel: () => void` - Callback para cancelar a operação
- `isLoading?: boolean` - Estado de loading durante operações assíncronas

**Campos do formulário:**

**Seção: Informações Básicas**
- `chamado` - Número do chamado (preenchido automaticamente da pesquisa)
- `empresa_id` - Select com empresas ordenadas alfabeticamente

**Seção: Ação Corretiva**
- `comentario_cliente` - Comentário do cliente (campo habilitado, somente leitura, preenchido automaticamente da pesquisa)
- `descricao_acao_corretiva` - Descrição da ação corretiva (obrigatório, mínimo 10 caracteres)
- `acao_preventiva` - Ação preventiva para evitar recorrência

**Seção: Prioridade e Status**
- `prioridade` - Nível de prioridade (baixa, media, alta, critica)
- `status_plano` - Status atual do plano
- `data_inicio` - Data de início do plano (obrigatório)
- `justificativa_cancelamento` - Justificativa quando status é "cancelado" (condicional)

**Seção: Contato com Cliente**
- `data_primeiro_contato` - Data do primeiro contato
- `meio_contato` - Meio de contato utilizado (WhatsApp, Email, Ligação)
- `retorno_cliente` - Status do retorno do cliente
- `resumo_comunicacao` - Resumo da comunicação

**Seção: Conclusão**
- `data_conclusao` - Data de conclusão do plano
- `status_final` - Status final da resolução (resolvido, não resolvido, parcialmente resolvido)

**Validações condicionais:**
- **Status cancelado**: Justificativa obrigatória
- **Status final preenchido**: Data de conclusão obrigatória
- **Casos resolvidos**: Campos de contato obrigatórios (data, meio, retorno)
- **Mudança automática**: Status muda para "concluído" quando status final é definido

**Comportamento:**
- **Modo criação**: Formulário em branco com valores padrão
- **Modo edição**: Formulário preenchido com dados do plano existente
- **Inicialização automática**: Campos preenchidos via defaultValues com dados da pesquisa relacionada
- **Validação em tempo real**: Campos obrigatórios mudam baseado no status selecionado

**Integração:**
- Utilizado em páginas de gerenciamento de planos de ação
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Validação consistente com tipos definidos em `@/types/planoAcao`
- Exportado via `src/components/admin/plano-acao/index.ts`

**Melhorias recentes:**
- **Sistema de contatos múltiplos implementado**: Substituído sistema de contato único por histórico completo de contatos múltiplos:
  - **Seção de contatos removida**: Removida seção "Contato com Cliente" do formulário principal
  - **Lista de contatos integrada**: Adicionado componente `ContatosList` que exibe histórico de contatos quando editando plano existente
  - **Validações atualizadas**: Removidas validações condicionais de campos de contato único do schema Zod
  - **Interface limpa**: Formulário mais focado nas informações principais do plano de ação
- **Campo comentario_cliente habilitado**: Removido comentário temporário e habilitado campo `comentario_cliente` após execução da migração `add_comentario_cliente_simple.sql`, permitindo armazenamento de comentários específicos do cliente separadamente da descrição da ação corretiva
- **Remoção do bloco informativo temporário**: Removido bloco azul que exibia o comentário da pesquisa como informação apenas, já que o campo `comentario_cliente` agora está funcional e pode ser editado diretamente no formulário
- **Remoção do useEffect de preenchimento automático**: Simplificada inicialização do formulário usando apenas defaultValues do useForm, eliminando lógica complexa de preenchimento automático via useEffect
- **Inicialização mais estável**: Campos agora são preenchidos diretamente na criação do formulário, evitando re-renderizações desnecessárias
- **Melhor performance**: Eliminado useEffect que causava atualizações após montagem do componente
- **Código mais limpo**: Reduzida complexidade do código removendo lógica de busca e mapeamento de empresas

---

#### `PlanoAcaoDetalhes.tsx`
Componente de visualização detalhada de planos de ação, organizado em abas para melhor navegação e apresentação das informações.

**Funcionalidades principais:**
- **Interface com abas**: Organização em 4 abas principais (Informações, Contato, Resultado, Histórico)
- **Visualização completa**: Exibição de todos os dados do plano de ação e pesquisa relacionada
- **Badges coloridos**: Indicadores visuais para prioridade e status com cores específicas
- **Formatação de datas**: Datas formatadas em pt-BR com locale apropriado
- **Estados vazios**: Mensagens e ícones informativos quando não há dados para exibir
- **Histórico de atualizações**: Timeline com todas as alterações do plano

**Props do componente:**
- `plano: PlanoAcaoCompleto` - Plano de ação completo com dados da pesquisa relacionada
- `historico?: PlanoAcaoHistorico[]` - Array opcional com histórico de atualizações do plano

**Estrutura das abas:**

**Aba "Informações":**
- **Card "Informações da Pesquisa"**: Dados da pesquisa relacionada (empresa, cliente, chamado, resposta)
- **Comentário do Cliente**: Exibe `comentario_cliente` (campo direto do plano) ou fallback para `pesquisa.comentario_pesquisa`
- **Card "Ações Planejadas"**: Ação corretiva (obrigatória) e ação preventiva (opcional)
- **Card "Status do Plano"**: Prioridade, status, data início e data conclusão (se houver)

**Aba "Contato":**
- **Card "Contato com Cliente"**: Data do primeiro contato, meio de contato, retorno do cliente e resumo da comunicação
- **Estado vazio**: Ícone e mensagem quando não há contatos registrados

**Aba "Resultado":**
- **Card "Resultado Final"**: Status final e data de fechamento
- **Estado vazio**: Ícone e mensagem quando plano ainda não foi concluído

**Aba "Histórico":**
- **Timeline de atualizações**: Lista cronológica de todas as alterações com usuário, data/hora e tipo de atualização
- **Estado vazio**: Ícone e mensagem quando não há histórico disponível

**Ícones utilizados (lucide-react):**
- `FileText`, `MessageCircle`, `Target`, `History` - Ícones das abas
- `Calendar`, `User`, `CheckCircle2`, `Clock` - Ícones de informações
- `Phone`, `Mail`, `MessageSquare` - Ícones de contato

**Componentes UI utilizados:**
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` - Sistema de abas
- `Card`, `CardContent`, `CardHeader`, `CardTitle` - Cards de conteúdo
- `Badge` - Indicadores de prioridade e status
- `Separator` - Separadores visuais no histórico

**Formatação de dados:**
- Datas formatadas em pt-BR (DD/MM/YYYY) usando date-fns com locale ptBR
- Datas com hora formatadas como "DD/MM/YYYY às HH:mm"
- Capitalização automática de textos (prioridade, status, meio de contato)
- Substituição de underscores por espaços em textos de enum

**Melhorias recentes:**
- **Priorização do campo comentario_cliente**: Modificada lógica de exibição do comentário para priorizar o campo `comentario_cliente` (campo direto do plano) sobre `pesquisa.comentario_pesquisa` (campo da pesquisa relacionada)
- **Fallback inteligente**: Mantido fallback para `pesquisa.comentario_pesquisa` quando `comentario_cliente` não estiver disponível
- **Compatibilidade**: Suporte a ambos os campos garante funcionamento com dados existentes e novos

**Integração:**
- Utilizado em páginas de gerenciamento de planos de ação
- Integra-se com tipos `PlanoAcaoCompleto` e `PlanoAcaoHistorico` de `@/types/planoAcao`
- Utiliza funções `getCorPrioridade()` e `getCorStatus()` para cores dos badges
- Exportado via `src/components/admin/plano-acao/index.ts`

**Melhorias recentes:**
- **Integração com sistema de contatos múltiplos**: Aba "Contato" agora exibe o componente `ContatosList` ao invés de campos de contato único
- **Interface simplificada**: Removidos campos individuais de contato (data_primeiro_contato, meio_contato, resumo_comunicacao, retorno_cliente)
- **Histórico completo**: Usuários podem visualizar todos os contatos registrados em formato expansível

**Uso típico:**
```typescript
<PlanoAcaoDetalhes
  plano={planoCompleto}
  historico={historicoAtualizacoes}
/>
```

#### `ContatoForm.tsx`
Formulário dedicado para cadastro e edição de contatos individuais do plano de ação, com validação via Zod e integração com React Hook Form.

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de contatos individuais com todos os campos necessários
- **Validação robusta**: Validação de dados usando Zod schema com campos obrigatórios e opcionais
- **Seleção de datas**: Calendário interativo para data do contato
- **Meios de contato**: Select com opções (WhatsApp, E-mail, Ligação)
- **Status de retorno**: Select com status do retorno do cliente (Aguardando, Respondeu, Solicitou Mais Informações)
- **Campos de texto**: Resumo da comunicação (obrigatório) e observações (opcional)

**Props do componente:**
- `contato?: PlanoAcaoContato` - Contato existente para edição (opcional)
- `onSubmit: (dados: PlanoAcaoContatoFormData) => void` - Callback executado ao submeter o formulário
- `onCancel: () => void` - Callback para cancelar a operação
- `isLoading?: boolean` - Estado de loading durante operações assíncronas

**Campos do formulário:**
- `data_contato` (obrigatório) - Data do contato com o cliente
- `meio_contato` (obrigatório) - Meio utilizado (whatsapp, email, ligacao)
- `resumo_comunicacao` (obrigatório) - Resumo do que foi conversado (mínimo 10 caracteres)
- `retorno_cliente` (opcional) - Status do retorno do cliente
- `observacoes` (opcional) - Observações adicionais sobre o contato

**Integração:**
- Utilizado pelo componente `ContatosList` em modais de criação e edição
- Integra-se com tipos `PlanoAcaoContato` e `PlanoAcaoContatoFormData` de `@/types/planoAcaoContatos`
- Validação via schema Zod com mensagens de erro em português
- Exportado via `src/components/admin/plano-acao/index.ts`

#### `ContatosList.tsx`
Componente de lista expansível para gerenciamento completo do histórico de contatos de um plano de ação, com funcionalidades de CRUD e interface colapsável.

**Funcionalidades principais:**
- **Lista expansível**: Contatos exibidos em cards colapsáveis com resumo na linha principal
- **CRUD completo**: Criar, visualizar, editar e excluir contatos com confirmação
- **Interface intuitiva**: Cards com ícones visuais por meio de contato e badges de status
- **Modais integrados**: Formulários de criação e edição em modais responsivos
- **Confirmação de exclusão**: AlertDialog para confirmar remoção de contatos
- **Estados vazios**: Mensagens informativas quando não há contatos registrados
- **Controle de expansão**: Sistema de expansão individual por contato com ícones visuais

**Props do componente:**
- `planoAcaoId: string` - UUID do plano de ação para buscar contatos relacionados

**Hooks utilizados:**
- `useContatosPlanoAcao(planoAcaoId)` - Busca contatos do plano de ação
- `useCriarContato()` - Hook para criação de novos contatos
- `useAtualizarContato()` - Hook para atualização de contatos existentes
- `useDeletarContato()` - Hook para exclusão de contatos

**Estados gerenciados:**
- `expandedContatos: Set<string>` - IDs dos contatos expandidos
- `modalNovoContato: boolean` - Controle do modal de criação
- `contatoEditando: PlanoAcaoContato | null` - Contato sendo editado
- `contatoParaDeletar: string | null` - ID do contato para exclusão

**Estrutura visual:**
- **Cabeçalho**: Título com contador de contatos e botão "Novo Contato" (azul Sonda)
- **Cards colapsáveis**: Cada contato em card individual com:
  - **Linha principal**: Ícone do meio de contato, data, resumo truncado, badge de retorno, botões de ação
  - **Conteúdo expandido**: Resumo completo, retorno do cliente, observações, metadados de criação/atualização
- **Estado vazio**: Card com ícone e mensagem quando não há contatos
- **Modais**: Formulários de criação/edição em dialogs responsivos (max-w-2xl)

**Funcionalidades de expansão:**
- `toggleExpansao(contatoId)` - Alterna expansão de contato específico
- Ícones visuais: ChevronRight (fechado) / ChevronDown (aberto)
- Múltiplos contatos podem estar expandidos simultaneamente
- Estado de expansão mantido durante operações CRUD

**Integração:**
- Utilizado nos componentes `PlanoAcaoForm` e `PlanoAcaoDetalhes`
- Integra-se com serviços de contatos via hooks customizados
- Utiliza componentes `ContatoForm` para modais de criação/edição
- Componentes UI do shadcn/ui (Card, Dialog, AlertDialog, Badge, Collapsible)
- Exportado via `src/components/admin/plano-acao/index.ts`

**Tipos utilizados:**
- `PlanoAcaoContato` - Tipo completo do contato
- `PlanoAcaoContatoFormData` - Dados do formulário de contato
- Funções utilitárias de `@/types/planoAcaoContatos` para labels e ícones

---

### `src/components/admin/pesquisas-satisfacao/`

Componentes relacionados ao gerenciamento de pesquisas de satisfação.

#### `PesquisaForm.tsx`
Formulário completo para cadastro e edição de pesquisas de satisfação, com validação via Zod e integração com React Hook Form.

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de pesquisas de satisfação com todos os campos necessários
- **Validação robusta**: Validação de dados usando Zod schema (`getPesquisaFormSchema()`) com validação condicional para pesquisas manuais
- **Integração com empresas**: Select dinâmico com lista de empresas ordenadas alfabeticamente
- **Seleção de datas**: Calendário interativo para seleção de data/hora de resposta
- **Categorização**: Campos para categoria, grupo e tipo de chamado
- **Feedback do cliente**: Campos para resposta (satisfação) e comentários
- **Organização em seções**: Interface dividida em seções lógicas (Dados Principais, Categorização, Caso, Feedback)

**Props do componente:**
- `pesquisa?: Pesquisa | null` - Pesquisa existente para edição (opcional)
- `onSubmit: (dados: PesquisaFormData) => void` - Callback executado ao submeter o formulário
- `onCancel: () => void` - Callback para cancelar a operação
- `isLoading?: boolean` - Estado de loading durante operações assíncronas

**Hooks utilizados:**
- `useForm` (React Hook Form) - Gerenciamento do estado do formulário
- `useEmpresas()` - Busca lista de empresas para o select

**Campos do formulário:**

**Seção: Dados Principais**
- `empresa` (obrigatório) - Select com empresas ordenadas alfabeticamente
- `cliente` (obrigatório) - Nome do cliente
- `email_cliente` - Email do cliente (validação de formato)
- `prestador` - Nome do consultor/prestador

**Seção: Categorização**
- `categoria` - Categoria do atendimento
- `grupo` - Grupo responsável

**Seção: Informações do Caso**
- `tipo_caso` - Select com tipos de chamado (IM - Incidente, PR - Problema, RF - Requisição)
- `nro_caso` - Número do chamado

**Seção: Feedback do Cliente**
- `resposta` - Select com níveis de satisfação (Muito Satisfeito, Satisfeito, Neutro, Insatisfeito, Muito Insatisfeito)
- `data_resposta` - Calendário para seleção de data/hora da resposta
- `comentario_pesquisa` - Textarea para comentários da pesquisa
- `observacao` - Textarea para observações internas

**Componentes UI utilizados:**
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` - Componentes de formulário do shadcn/ui
- `Input` - Campos de texto
- `Textarea` - Campos de texto multilinha
- `Select` - Seleção de opções
- `Calendar` - Seletor de data
- `Popover` - Container para o calendário
- `Button` - Botões de ação

**Validação:**
- Schema Zod (`getPesquisaFormSchema()`) aplicado via `zodResolver` com validação condicional baseada na origem da pesquisa
- Validação automática de campos obrigatórios
- Validação de formato de email
- Mensagens de erro contextuais via `FormMessage`

**Comportamento:**
- **Modo criação**: Formulário em branco para nova pesquisa
- **Modo edição**: Formulário preenchido com dados da pesquisa existente via `useEffect`
- **Reset automático**: Formulário é resetado quando a prop `pesquisa` muda
- **Desabilitação durante loading**: Botões desabilitados durante operações assíncronas

**Opções de tipo de chamado:**
```typescript
[
  { value: 'IM', label: 'IM - Incidente' },
  { value: 'PR', label: 'PR - Problema' },
  { value: 'RF', label: 'RF - Requisição' }
]
```

**Opções de resposta (satisfação):**
```typescript
[
  { value: 'Muito Satisfeito', label: 'Muito Satisfeito' },
  { value: 'Satisfeito', label: 'Satisfeito' },
  { value: 'Neutro', label: 'Neutro' },
  { value: 'Insatisfeito', label: 'Insatisfeito' },
  { value: 'Muito Insatisfeito', label: 'Muito Insatisfeito' }
]
```

**Tipos utilizados:**
- `Pesquisa` - Tipo completo da pesquisa de satisfação
- `PesquisaFormData` - Dados do formulário validados pelo schema Zod
- `getPesquisaFormSchema()` - Função que retorna o schema de validação Zod apropriado (base ou manual)

**Validação condicional de comentário:**
- **Pesquisas manuais**: Campo "Comentário da Pesquisa" é obrigatório com asterisco vermelho (*) e placeholder explicativo
- **Pesquisas do SQL Server**: Campo "Comentário da Pesquisa" permanece opcional
- **Lógica**: Usa `getPesquisaFormSchema(isPesquisaManual)` para aplicar schema correto baseado na origem
- **Justificativa**: Pesquisas manuais precisam de contexto/justificativa, enquanto pesquisas sincronizadas já têm dados estruturados

**Melhorias recentes:**
- **Correção final de Select de Grupo**: Removido fallback `|| ''` do campo `value` do Select de Grupo, completando o padrão de correção já aplicado em outros Selects do componente (Categoria, Tipo de Caso, Resposta) para evitar warnings de componente não controlado
- **Correção de inicialização de campos opcionais**: Substituídas strings vazias (`''`) por `undefined` para campos opcionais (categoria, grupo, tipo_caso, resposta) na inicialização do formulário, garantindo melhor compatibilidade com validação Zod e evitando valores inválidos em campos de seleção
- **Correção de limpeza de campos**: Atualizada lógica de limpeza do campo `grupo` para usar `undefined` ao invés de string vazia (`''`), mantendo consistência com a inicialização de campos opcionais e evitando valores inválidos em Selects
- Removido indicador de origem (SQL Server/Manual) para simplificar a interface
- Removidas variáveis não utilizadas (`isOrigemSqlServer`, `anosDisponiveis`, `MESES_OPTIONS`)
- Interface mais limpa e focada nos dados essenciais
- Corrigido bug no Select de empresa: adicionado fallback para string vazia e exibição explícita do valor selecionado no SelectValue para garantir que o placeholder seja substituído corretamente quando uma empresa é selecionada
- Incluída dependência `empresas` no array de dependências do `useEffect` para garantir re-renderização quando a lista de empresas for carregada
- Melhorada sincronização entre dados da pesquisa e lista de empresas disponíveis
- **Implementado mapeamento inteligente de empresas**: Busca automática da empresa pelo nome completo ou abreviado ao editar pesquisa, garantindo compatibilidade com dados vindos do SQL Server (que usam nome completo) e dados manuais (que usam nome abreviado)
- Removidos logs de debug após validação do funcionamento do mapeamento de empresas

**Integração:**
- Utilizado em páginas de gerenciamento de pesquisas de satisfação
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Validação consistente com schemas definidos em `src/schemas/pesquisasSatisfacaoSchemas.ts`

**Mapeamento de empresas (edição):**
- Ao editar uma pesquisa, o componente tenta encontrar a empresa correspondente na lista de empresas disponíveis
- Busca por correspondência exata em `nome_completo` ou `nome_abreviado`
- Se encontrar, usa o `nome_abreviado` (padrão do sistema)
- Se não encontrar, mantém o valor original da pesquisa
- Garante compatibilidade entre pesquisas sincronizadas do SQL Server e pesquisas criadas manualmente

---

#### `PesquisasTable.tsx`
Componente de tabela para listagem e gerenciamento de pesquisas de satisfação, com funcionalidades de seleção múltipla, validação visual de empresas e ações CRUD.

**Funcionalidades principais:**
- **Listagem completa**: Exibição de todas as pesquisas com dados formatados e organizados
- **Seleção múltipla**: Checkboxes para seleção individual ou em massa de pesquisas
- **Validação visual de empresas**: Destaque em vermelho para empresas não cadastradas (apenas para pesquisas do SQL Server)
- **Indicadores de origem**: Ícones visuais diferenciando pesquisas do SQL Server (Database) e manuais (FileEdit)
- **Badges coloridos**: Indicadores visuais para níveis de satisfação (do pior ao melhor)
- **Tooltips informativos**: Informações adicionais ao passar o mouse sobre empresas e comentários
- **Ações CRUD**: Botões para editar, excluir e enviar pesquisas
- **Dialog de confirmação**: Confirmação antes de excluir pesquisa

**Props do componente:**
- `pesquisas: Pesquisa[]` - Array de pesquisas a serem exibidas
- `selecionados: string[]` - Array de IDs das pesquisas selecionadas
- `onSelecionarTodos: (selecionado: boolean) => void` - Callback para selecionar/desmarcar todas
- `onSelecionarItem: (id: string) => void` - Callback para alternar seleção de item individual
- `onEditar: (pesquisa: Pesquisa) => void` - Callback para editar pesquisa
- `onExcluir: (id: string) => void` - Callback para excluir pesquisa
- `onEnviar: (pesquisa: Pesquisa) => void` - Callback para enviar pesquisa
- `isLoading?: boolean` - Estado de loading durante operações

**Hooks utilizados:**
- `useState` - Gerenciamento de estado local (pesquisa para excluir)
- `useMemo` - Otimização de performance para mapa de empresas
- `useEmpresas()` - Busca lista de empresas cadastradas no sistema

**Ícones utilizados (lucide-react):**
- `Database` - Indica pesquisa sincronizada do SQL Server
- `FileEdit` - Indica pesquisa cadastrada manualmente
- `Edit` - Botão de editar
- `Trash2` - Botão de excluir
- `Send` - Botão de enviar

**Estrutura da tabela:**
- **Coluna Checkbox**: Seleção individual com checkbox no cabeçalho para selecionar todos
- **Coluna Chamado** (120px): Exibe ícone de origem (Database/FileEdit), tipo do caso (IM/PR/RF) e número do chamado em fonte mono
- **Coluna Empresa** (180px): Nome da empresa com validação visual:
  - **Empresas cadastradas**: Exibe nome abreviado com tooltip mostrando nome completo
  - **Empresas não cadastradas (SQL Server)**: Exibe em vermelho com tooltip de alerta
  - **Empresas não cadastradas (Manual)**: Exibe normalmente sem destaque vermelho
- **Coluna Data Resposta** (120px): Data e hora formatadas em pt-BR (DD/MM/YYYY às HH:mm)
- **Coluna Cliente** (150px): Nome do cliente com quebra de linha automática
- **Coluna Comentário** (200px): Comentário da pesquisa com line-clamp-2 e tooltip com texto completo
- **Coluna Resposta** (140px): Badge colorido com nível de satisfação:
  - Muito Insatisfeito: Badge vermelho (bg-red-600)
  - Insatisfeito: Badge laranja (bg-orange-500)
  - Neutro: Badge amarelo (bg-yellow-500)
  - Satisfeito: Badge azul (bg-blue-500)
  - Muito Satisfeito: Badge verde (bg-green-600)
- **Coluna Ações** (120px): Três botões compactos (8x8):
  - Editar: Botão outline com ícone Edit
  - Excluir: Botão outline vermelho com ícone Trash2
  - Enviar: Botão outline azul com ícone Send (desabilitado se não houver resposta)

**Validação visual de empresas:**
A função `validarEmpresa()` implementa lógica inteligente para destacar empresas não cadastradas:
1. Normaliza nome da empresa (trim + uppercase) para comparação
2. Busca empresa no mapa de empresas cadastradas
3. Retorna objeto com:
   - `encontrada`: boolean indicando se empresa existe no cadastro
   - `nomeExibir`: nome abreviado (se encontrada) ou nome original
   - `nomeCompleto`: nome completo da empresa
4. **Lógica de exibição**:
   - Se empresa encontrada: exibe nome abreviado com tooltip do nome completo
   - Se não encontrada E origem SQL Server: exibe em vermelho com tooltip de alerta
   - Se não encontrada E origem manual: exibe normalmente sem destaque

**Mapa de empresas (otimização):**
- Criado via `useMemo` para evitar recálculos desnecessários
- Estrutura: `Map<string, { nomeCompleto: string; nomeAbreviado: string }>`
- Chave: nome completo normalizado (trim + uppercase)
- Permite busca rápida O(1) ao validar empresas

**Estados gerenciados:**
- `pesquisaParaExcluir`: ID da pesquisa selecionada para exclusão (controla dialog de confirmação)

**Funções principais:**
- `validarEmpresa(nomeEmpresa)`: Valida e formata nome da empresa, retornando objeto com status e nomes
- `formatarData(data)`: Formata data para exibição em pt-BR (DD/MM/YYYY às HH:mm)
- `getBadgeResposta(resposta)`: Retorna badge colorido baseado no nível de satisfação
- `handleExcluirClick(id)`: Abre dialog de confirmação de exclusão
- `handleConfirmarExclusao()`: Executa exclusão após confirmação

**Badges de resposta (hierarquia de cores):**
```typescript
// Do pior para o melhor:
Muito Insatisfeito → Vermelho (bg-red-600)
Insatisfeito → Laranja (bg-orange-500)
Neutro → Amarelo (bg-yellow-500)
Satisfeito → Azul (bg-blue-500)
Muito Satisfeito → Verde (bg-green-600)
```

**Componentes UI utilizados:**
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` - Componentes de tabela do shadcn/ui
- `Checkbox` - Seleção de pesquisas
- `Badge` - Indicadores de resposta
- `Button` - Botões de ação
- `AlertDialog` - Confirmação de exclusão
- `Tooltip` - Informações adicionais

**Tratamento de casos especiais:**
- **Sem pesquisas**: Exibe mensagem "Nenhum pesquisa encontrado"
- **Sem chamado**: Exibe apenas ícone de origem + traço (-)
- **Sem comentário**: Exibe traço (-)
- **Sem resposta**: Exibe traço (-) e desabilita botão de enviar
- **Resposta não reconhecida**: Exibe badge outline com texto original

**Melhorias recentes:**
- **Validação inteligente de empresas**: Implementada lógica que só destaca em vermelho empresas não cadastradas quando a origem é SQL Server, evitando alertas desnecessários para lançamentos manuais
- **Diferenciação visual de origem**: Adicionados ícones Database (SQL Server) e FileEdit (Manual) para identificar rapidamente a fonte dos dados
- **Tooltips informativos**: Empresas cadastradas mostram nome completo no tooltip, empresas não cadastradas (SQL Server) mostram alerta
- **Mapa de empresas otimizado**: Uso de `useMemo` para criar mapa de busca rápida, melhorando performance
- **Badges hierárquicos**: Sistema de cores consistente do pior (vermelho) ao melhor (verde) nível de satisfação

**Integração:**
- Utilizado em páginas de gerenciamento de pesquisas de satisfação
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Recebe callbacks para operações CRUD da página pai
- Exportado via `src/components/admin/pesquisas-satisfacao/index.ts`

**Tipos utilizados:**
- `Pesquisa` - Tipo completo da pesquisa de satisfação (inclui campo `origem`)

**Uso típico:**
```typescript
<PesquisasTable
  pesquisas={pesquisas}
  selecionados={selecionados}
  onSelecionarTodos={handleSelecionarTodos}
  onSelecionarItem={handleSelecionarItem}
  onEditar={handleEditar}
  onExcluir={handleExcluir}
  onEnviar={handleEnviar}
  isLoading={isLoading}
/>
```

---

### `src/components/admin/elogios/`

Componentes relacionados ao gerenciamento de elogios (pesquisas de satisfação positivas).

#### `ElogioForm.tsx`
Formulário completo de cadastro e edição de elogios, baseado na estrutura do `PesquisaForm.tsx` mas adaptado para o contexto de elogios (pesquisas de satisfação positivas).

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de elogios com todos os campos necessários
- **Integração com empresas**: Select dinâmico com lista de empresas ordenadas alfabeticamente
- **Seleção de datas**: Calendário interativo para seleção de data/hora de resposta
- **Categorização**: Campos para categoria, grupo e tipo de chamado
- **Feedback do cliente**: Campos para resposta (satisfação) e comentários
- **Organização em seções**: Interface dividida em 4 seções lógicas (Dados Principais, Categorização, Informações do Caso, Feedback do Cliente)
- **Mapeamento inteligente de empresas**: Busca automática da empresa pelo nome completo ou abreviado ao editar elogio

**Props do componente:**
- `elogio?: ElogioCompleto | null` - Elogio existente para edição (opcional)
- `onSubmit: (dados: ElogioFormData) => void` - Callback executado ao submeter o formulário
- `onCancel: () => void` - Callback para cancelar a operação
- `isLoading?: boolean` - Estado de loading durante operações assíncronas

**Interface ElogioFormData:**
```typescript
{
  empresa: string;              // Obrigatório
  cliente: string;              // Obrigatório
  email_cliente?: string;       // Opcional
  prestador?: string;           // Opcional (consultor/prestador)
  categoria?: string;           // Opcional
  grupo?: string;               // Opcional
  tipo_caso?: string;           // Opcional (IM/PR/RF)
  nro_caso?: string;            // Opcional (número do chamado)
  data_resposta?: Date;         // Opcional
  resposta: string;             // Obrigatório (nível de satisfação)
  comentario_pesquisa?: string; // Opcional
  observacao?: string;          // Opcional
}
```

**Campos do formulário:**

**Seção: Dados Principais**
- `empresa` (obrigatório) - Select com empresas ordenadas alfabeticamente
- `cliente` (obrigatório) - Nome do cliente
- `email_cliente` - Email do cliente
- `prestador` - Nome do consultor/prestador

**Seção: Categorização**
- `categoria` - Categoria do atendimento
- `grupo` - Grupo responsável

**Seção: Informações do Caso**
- `tipo_caso` - Select com tipos de chamado (IM - Incidente, PR - Problema, RF - Requisição)
- `nro_caso` - Número do chamado

**Seção: Feedback do Cliente**
- `resposta` - Select com níveis de satisfação positivos (Muito Satisfeito, Satisfeito)
- `data_resposta` - Calendário para seleção de data/hora da resposta
- `comentario_pesquisa` - Textarea para comentários da pesquisa
- `observacao` - Textarea para observações internas

**Hooks utilizados:**
- `useForm` (React Hook Form) - Gerenciamento do estado do formulário
- `useEmpresas()` - Busca lista de empresas para o select

**Componentes UI utilizados:**
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` - Componentes de formulário do shadcn/ui
- `Input` - Campos de texto
- `Textarea` - Campos de texto multilinha (4 linhas)
- `Select` - Seleção de opções
- `Calendar` - Seletor de data com locale pt-BR
- `Popover` - Container para o calendário
- `Button` - Botões de ação

**Opções de tipo de chamado:**
```typescript
[
  { value: 'IM', label: 'IM - Incidente' },
  { value: 'PR', label: 'PR - Problema' },
  { value: 'RF', label: 'RF - Requisição' }
]
```

**Opções de resposta (satisfação):**
```typescript
[
  { value: 'Muito Satisfeito', label: 'Muito Satisfeito' },
  { value: 'Satisfeito', label: 'Satisfeito' }
]
```

**Comportamento:**
- **Modo criação**: Formulário em branco para novo elogio com resposta padrão "Muito Satisfeito"
- **Modo edição**: Formulário preenchido com dados do elogio existente via `useEffect`
- **Reset automático**: Formulário é resetado quando a prop `elogio` ou lista de `empresas` muda
- **Desabilitação durante loading**: Botões desabilitados durante operações assíncronas
- **Mapeamento de empresas**: Ao editar, busca empresa por nome completo ou abreviado para compatibilidade com dados do SQL Server

**Tipos utilizados:**
- `ElogioCompleto` - Tipo completo do elogio importado de `@/types/elogios` (inclui campo `origem` para identificar fonte dos dados: 'sql_server' ou 'manual')
- `ElogioFormData` - Interface local para dados do formulário

**Bibliotecas utilizadas:**
- `react-hook-form` - Gerenciamento de formulários
- `date-fns` - Manipulação de datas com locale pt-BR
- `lucide-react` - Ícones (CalendarIcon)

**Integração:**
- Utilizado em páginas de gerenciamento de elogios (LancarElogios.tsx)
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Validação consistente com tipos definidos em `@/types/elogios`
- Exportado via `src/components/admin/elogios/index.ts`

**Diferenças em relação ao PesquisaForm:**
- Opções de resposta limitadas a níveis positivos (Muito Satisfeito, Satisfeito)
- Resposta padrão definida como "Muito Satisfeito"
- Focado em elogios (pesquisas de satisfação positivas)
- Sem validação Zod (validação básica via React Hook Form)

#### `index.ts`
Arquivo de exportação dos componentes do diretório de elogios.

**Exportações:**
- `ElogioForm` - Formulário de cadastro/edição de elogios

---


## Diretório `src/services/`

Serviços de lógica de negócio e integração com APIs.

### `requerimentosService.ts`
Serviço principal para gerenciamento completo de requerimentos, incluindo CRUD, validações de negócio e formatação de dados.

**Funcionalidades principais:**
- CRUD completo de requerimentos (criar, buscar, atualizar, deletar)
- Validações de negócio e integridade de dados
- Conversão automática de horas entre formatos decimal e HH:MM
- Resolução de nomes de usuários (autores) a partir de IDs
- Formatação de requerimentos para exibição
- Busca de requerimentos enviados com filtros
- Integração com tabelas relacionadas (empresas_clientes, profiles)
- Cálculo de estatísticas de requerimentos
- Suporte a campos condicionais (tipo_hora_extra, horas_analise_ef)

**Métodos principais:**
- `criarRequerimento(data: RequerimentoFormData): Promise<Requerimento>` - Cria novo requerimento com validações
- `atualizarRequerimento(id: string, data: Partial<RequerimentoFormData>): Promise<Requerimento>` - Atualiza requerimento existente com suporte a campos condicionais
- `buscarRequerimentosEnviados()` - Busca requerimentos com formatação automática de horas
- `formatarRequerimento(req)` - Converte horas decimais para formato HH:MM para exibição
- `resolverNomesUsuarios(userIds: string[])` - Resolve nomes de autores a partir de IDs
- `validarDadosRequerimento(data)` - Valida dados antes de salvar
- `verificarClienteExiste(clienteId)` - Verifica existência de cliente

**Campos condicionais suportados:**
- `tipo_hora_extra` - Tipo de hora extra (Simples/Dobrada) quando tipo_cobranca = "Hora Extra"
- `quantidade_tickets` - Quantidade de tickets relacionados (automático baseado na empresa)
- **NOTA**: `horas_analise_ef` é usado apenas na criação de requerimentos de análise EF, não sendo atualizado posteriormente

**Integração com utilitários:**
- Utiliza `horasUtils.ts` para conversão entre formatos de horas (decimal ↔ HH:MM)
- Utiliza `mesCobrancaUtils.ts` para conversão de mês de cobrança

**Melhorias recentes:**
- **Suporte a tipo_hora_extra**: Adicionado tratamento do campo `tipo_hora_extra` na atualização de requerimentos, permitindo salvar tipo de hora extra (Simples/Dobrada) com valor null quando não aplicável
- **Suporte a quantidade_tickets**: Adicionado tratamento do campo `quantidade_tickets` na atualização, permitindo salvar quantidade de tickets com valor null quando não aplicável
- **Simplificação do método de atualização**: Removida lógica de conversão de `horas_analise_ef` do método `atualizarRequerimento()` pois este campo é usado apenas na criação de requerimentos de análise EF, não sendo atualizado posteriormente
- Adicionada formatação automática de horas na busca de requerimentos enviados
- Implementada conversão de horas decimais para formato HH:MM antes de retornar dados
- Garantia de que todos os requerimentos retornados têm horas no formato correto para exibição
- Refatoração para aplicar `formatarRequerimento()` em todos os requerimentos buscados

**Fluxo de formatação:**
1. Busca requerimentos do banco (horas em formato decimal)
2. Resolve nomes dos autores via IDs
3. Aplica `formatarRequerimento()` para converter horas decimais → HH:MM
4. Retorna dados formatados prontos para exibição

**Fluxo de atualização com campos condicionais:**
1. Recebe dados do formulário (pode incluir tipo_hora_extra e quantidade_tickets)
2. Permite valores null para campos condicionais quando não aplicáveis
3. Atualiza requerimento no banco com todos os campos fornecidos
4. **NOTA**: Campo `horas_analise_ef` não é atualizado via este método pois é usado apenas na criação de requerimentos de análise EF

**Tipos utilizados:**
- `Requerimento` - Tipo completo do requerimento
- `RequerimentoFormData` - Dados do formulário de criação/edição
- `FiltrosRequerimentos` - Filtros para busca
- `StatusRequerimento` - Status possíveis do requerimento

---

### `elogiosService.ts`
Serviço completo para gerenciamento de elogios (pesquisas de satisfação positivas), incluindo CRUD, filtros avançados e estatísticas.

**Funcionalidades principais:**
- CRUD completo de elogios (criar, buscar, atualizar, deletar)
- Busca de elogios com filtros avançados (status, período, busca textual)
- Integração com tabela de pesquisas de satisfação
- Cálculo de estatísticas de elogios por status
- Filtros por mês/ano da data de resposta
- Busca textual em múltiplos campos (empresa, cliente, número do caso, observação)

**Métodos principais:**
- `buscarElogios(filtros?: FiltrosElogio): Promise<ElogioCompleto[]>` - Busca elogios com filtros opcionais, retorna dados completos incluindo pesquisa relacionada
- `buscarElogioPorId(id: string): Promise<ElogioCompleto | null>` - Busca elogio específico por ID com dados da pesquisa
- `criarElogio(dados: ElogioFormData): Promise<Elogio>` - Cria novo elogio e pesquisa de satisfação vinculada
- `atualizarElogio(id: string, dados: Partial<ElogioFormData>): Promise<Elogio>` - Atualiza elogio e pesquisa relacionada
- `deletarElogio(id: string): Promise<void>` - Remove elogio do sistema
- `obterEstatisticas(filtros?: FiltrosElogio): Promise<EstatisticasElogio>` - Calcula estatísticas agregadas (total, registrados, compartilhados, arquivados)

**Campos da pesquisa vinculada:**
- `empresa` - Nome da empresa
- `cliente` - Nome do cliente
- `email_cliente` - Email do cliente
- `prestador` - Nome do consultor/prestador
- `categoria` - Categoria do atendimento
- `grupo` - Grupo responsável
- `tipo_caso` - Tipo do chamado (IM/PR/RF)
- `nro_caso` - Número do chamado
- `comentario_pesquisa` - Comentário da pesquisa
- `resposta` - Nível de satisfação
- `data_resposta` - Data/hora da resposta
- `origem` - Origem dos dados ('sql_server' para sincronização ou 'manual' para cadastro manual)

**Filtros disponíveis (FiltrosElogio):**
- `status` - Array de status para filtrar (registrado, compartilhado, arquivado)
- `dataInicio` - Data inicial do período
- `dataFim` - Data final do período
- `busca` - Busca textual em empresa, cliente, número do caso e observação
- `empresa` - Filtro específico por nome da empresa
- `mes` - Mês da data de resposta (1-12)
- `ano` - Ano da data de resposta

**Fluxo de criação:**
1. Cria pesquisa de satisfação com origem 'manual'
2. Vincula elogio à pesquisa criada
3. Define status inicial como 'registrado'
4. Registra usuário criador (criado_por)
5. Retorna elogio criado

**Fluxo de atualização:**
1. Busca elogio atual para obter pesquisa_id
2. Atualiza campos da pesquisa vinculada (se fornecidos)
3. Atualiza campos do elogio (observação, chamado, data_resposta, status)
4. Retorna elogio atualizado

**Tipos utilizados:**
- `Elogio` - Tipo base do elogio
- `ElogioCompleto` - Elogio com dados da pesquisa relacionada
- `ElogioFormData` - Dados do formulário de criação/edição
- `FiltrosElogio` - Filtros para busca
- `EstatisticasElogio` - Estatísticas agregadas (total, registrados, compartilhados, arquivados)

**Integração:**
- Utilizado pelos hooks `useElogios`, `useCriarElogio`, `useAtualizarElogio`, `useDeletarElogio`
- Integra-se com tabela `elogios` e `pesquisas_satisfacao` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`

**Melhorias recentes:**
- Adicionados campos `email_cliente`, `prestador`, `categoria` e `grupo` na busca de elogios para suportar formulário completo
- Implementada atualização completa de todos os campos da pesquisa vinculada
- Melhorada sincronização entre elogio e pesquisa de satisfação
- **Campo origem adicionado**: Novo campo `origem` ('sql_server' | 'manual') permite identificar a fonte dos dados da pesquisa, facilitando rastreamento e tratamento diferenciado entre pesquisas sincronizadas do SQL Server e cadastradas manualmente

---

### `planoAcaoService.ts`
Serviço completo para gerenciamento de planos de ação, incluindo CRUD, filtros avançados, histórico de atualizações e estatísticas com logging aprimorado de erros.

### `planoAcaoContatosService.ts`
Serviço dedicado para gerenciamento de contatos múltiplos dos planos de ação, incluindo CRUD completo e estatísticas de contatos.

**Funcionalidades principais:**
- CRUD completo de contatos (criar, buscar, atualizar, deletar)
- Busca de contatos por plano de ação ordenados por data (mais recente primeiro)
- Integração com sistema de autenticação para rastreamento de criador
- Cálculo de estatísticas de contatos (total, por meio de contato, por retorno)
- Logging detalhado para troubleshooting e debug

**Métodos principais:**
- `buscarContatosPlanoAcao(planoAcaoId: string): Promise<PlanoAcaoContato[]>` - Busca todos os contatos de um plano ordenados por data
- `buscarContatoPorId(id: string): Promise<PlanoAcaoContato | null>` - Busca contato específico por ID
- `criarContato(planoAcaoId: string, dados: PlanoAcaoContatoFormData): Promise<PlanoAcaoContato>` - Cria novo contato vinculado ao plano
- `atualizarContato(id: string, dados: Partial<PlanoAcaoContatoFormData>): Promise<PlanoAcaoContato>` - Atualiza contato existente
- `deletarContato(id: string): Promise<void>` - Remove contato do sistema
- `obterEstatisticasContatos(planoAcaoId: string)` - Calcula estatísticas agregadas dos contatos do plano

**Estrutura de retorno das estatísticas:**
```typescript
{
  total: number;
  por_meio: {
    whatsapp: number;
    email: number;
    ligacao: number;
  };
  por_retorno: {
    aguardando: number;
    respondeu: number;
    solicitou_mais_informacoes: number;
  };
  ultimo_contato: PlanoAcaoContato | null;
}
```

**Integração:**
- Utilizado pelos hooks `useContatosPlanoAcao`, `useCriarContato`, `useAtualizarContato`, `useDeletarContato`
- Integra-se com tabela `plano_acao_contatos` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`
- Utilizado pelos componentes `ContatosList` e `ContatoForm`

### `planoAcaoContatosService.ts`
Serviço completo para gerenciamento de contatos com clientes em planos de ação, permitindo registro detalhado de comunicações e acompanhamento de retornos.

**Funcionalidades principais:**
- CRUD completo de contatos (criar, buscar, atualizar, deletar)
- Busca de contatos por plano de ação com ordenação cronológica
- Registro de meio de contato (WhatsApp, Email, Ligação)
- Acompanhamento de retorno do cliente (aguardando, respondeu, solicitou mais informações)
- Estatísticas de contatos por meio e tipo de retorno
- Integração com sistema de autenticação para rastreamento de usuário criador
- Logging detalhado para debug e auditoria

**Métodos principais:**
- `buscarContatosPlanoAcao(planoAcaoId)` - Busca todos os contatos de um plano ordenados por data
- `buscarContatoPorId(id)` - Busca contato específico por ID
- `criarContato(planoAcaoId, dados)` - Cria novo registro de contato
- `atualizarContato(id, dados)` - Atualiza contato existente
- `deletarContato(id)` - Remove contato do sistema
- `obterEstatisticasContatos(planoAcaoId)` - Calcula estatísticas de contatos (total, por meio, por retorno, último contato)

**Integração:**
- Utiliza tabela `plano_acao_contatos` criada pela migração `create_plano_acao_contatos.sql`
- Integra-se com sistema de autenticação via `supabase.auth.getUser()`
- Suporta relacionamento CASCADE DELETE com planos de ação
- Utilizado por componentes de gerenciamento de planos de ação para histórico de comunicações

**Funcionalidades principais:**
- CRUD completo de contatos (criar, buscar, atualizar, deletar)
- Busca de contatos por plano de ação com ordenação cronológica
- Registro de meio de contato (WhatsApp, Email, Ligação)
- Acompanhamento de retorno do cliente (aguardando, respondeu, solicitou mais informações)
- Estatísticas de contatos por meio e tipo de retorno
- Integração com sistema de autenticação para rastreamento de usuário criador
- Logging detalhado para debug e auditoria

**Métodos principais:**
- `buscarContatosPlanoAcao(planoAcaoId)` - Busca todos os contatos de um plano ordenados por data
- `buscarContatoPorId(id)` - Busca contato específico por ID
- `criarContato(planoAcaoId, dados)` - Cria novo registro de contato
- `atualizarContato(id, dados)` - Atualiza contato existente
- `deletarContato(id)` - Remove contato do sistema
- `obterEstatisticasContatos(planoAcaoId)` - Calcula estatísticas de contatos (total, por meio, por retorno, último contato)

**Integração:**
- Utiliza tabela `plano_acao_contatos` criada pela migração `create_plano_acao_contatos.sql`
- Integra-se com sistema de autenticação via `supabase.auth.getUser()`
- Suporta relacionamento CASCADE DELETE com planos de ação
- Utilizado por componentes de gerenciamento de planos de ação para histórico de comunicações

**Funcionalidades principais:**
- CRUD completo de planos de ação (criar, buscar, atualizar, deletar)
- Busca de planos com filtros avançados (status, prioridade, período, busca textual)
- Integração com tabela de pesquisas de satisfação relacionadas
- Busca por pesquisa_id para verificar planos existentes
- Gerenciamento de histórico de atualizações com usuário e timestamp
- Cálculo de estatísticas agregadas por status e prioridade
- Filtros por mês/ano da data de resposta da pesquisa relacionada
- Busca textual em múltiplos campos (empresa, cliente, número do caso, descrição da ação)
- **Logging aprimorado de erros**: Console logs estruturados com emojis visuais e detalhes completos do erro (message, details, hint, code) para melhor troubleshooting
- **Filtragem de campos**: Pula campos que não existem na tabela `planos_acao` (ex: `chamado`, `empresa_id`) durante atualizações para evitar erros de banco até que migrações sejam executadas

**Métodos principais:**
- `buscarPlanosAcao(filtros?: FiltrosPlanoAcao): Promise<PlanoAcaoCompleto[]>` - Busca planos com filtros opcionais, retorna dados completos incluindo pesquisa relacionada
- `buscarPlanoAcaoPorId(id: string): Promise<PlanoAcaoCompleto | null>` - Busca plano específico por ID com dados da pesquisa
- `buscarPlanoAcaoPorPesquisa(pesquisaId: string): Promise<PlanoAcaoCompleto | null>` - Busca plano por ID da pesquisa relacionada
- `criarPlanoAcao(dados: PlanoAcaoFormData): Promise<PlanoAcao>` - Cria novo plano de ação com usuário criador
- `atualizarPlanoAcao(id: string, dados: Partial<PlanoAcaoFormData>): Promise<PlanoAcao>` - Atualiza plano existente com limpeza de dados
- `deletarPlanoAcao(id: string): Promise<void>` - Remove plano do sistema
- `buscarHistoricoPlano(planoId: string): Promise<PlanoAcaoHistorico[]>` - Busca histórico de alterações do plano
- `adicionarHistorico(planoId: string, descricao: string, tipo: 'contato' | 'atualizacao'): Promise<PlanoAcaoHistorico>` - Adiciona entrada manual no histórico
- `obterEstatisticas(filtros?: FiltrosPlanoAcao): Promise<EstatisticasPlanoAcao>` - Calcula estatísticas agregadas (total, por status, por prioridade)

**Campos da pesquisa vinculada:**
- `id` - UUID da pesquisa
- `empresa` - Nome da empresa
- `cliente` - Nome do cliente
- `tipo_caso` - Tipo do chamado (IM/PR/RF)
- `nro_caso` - Número do chamado
- `comentario_pesquisa` - Comentário da pesquisa
- `resposta` - Nível de satisfação
- `data_resposta` - Data/hora da resposta

**Filtros disponíveis (FiltrosPlanoAcao):**
- `prioridade` - Array de prioridades para filtrar (baixa, media, alta, critica)
- `status` - Array de status para filtrar (aberto, em_andamento, aguardando_retorno, concluido, cancelado)
- `dataInicio` - Data inicial do período (filtro por data_inicio do plano)
- `dataFim` - Data final do período (filtro por data_inicio do plano)
- `busca` - Busca textual em empresa, cliente, número do caso e descrição da ação corretiva
- `empresa` - Filtro específico por nome da empresa
- `mes` - Mês da data de resposta da pesquisa (1-12)
- `ano` - Ano da data de resposta da pesquisa

**Fluxo de criação:**
1. Recebe dados do formulário e limpa valores vazios/null
2. Busca usuário autenticado via `supabase.auth.getUser()`
3. Define status inicial como 'aberto' se não fornecido
4. Registra usuário criador (criado_por)
5. Retorna plano criado

**Fluxo de atualização:**
1. Recebe dados parciais do formulário
2. Limpa valores vazios/null (exceto campos que aceitam null como meio_contato, retorno_cliente, status_final)
3. Atualiza plano no banco com dados limpos
4. **Logging aprimorado**: Em caso de erro, exibe detalhes estruturados com message, details, hint e code
5. Retorna plano atualizado

**Fluxo de histórico:**
1. Busca usuário autenticado e seu nome no perfil
2. Cria entrada no histórico com usuário, timestamp e descrição
3. Suporta tipos 'contato' e 'atualizacao'
4. Retorna entrada de histórico criada

**Tipos utilizados:**
- `PlanoAcao` - Tipo base do plano de ação
- `PlanoAcaoCompleto` - Plano com dados da pesquisa relacionada
- `PlanoAcaoFormData` - Dados do formulário de criação/edição
- `PlanoAcaoHistorico` - Entrada do histórico de alterações
- `FiltrosPlanoAcao` - Filtros para busca
- `EstatisticasPlanoAcao` - Estatísticas agregadas (total, por status, por prioridade)

**Integração:**
- Utilizado pelos hooks de planos de ação
- Integra-se com tabelas `planos_acao`, `pesquisas_satisfacao` e `plano_acao_historico` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`
- Integra-se com tabela `profiles` para obter nomes de usuários

---

## Diretório `src/hooks/`

Hooks customizados para gerenciamento de estado e integração com APIs.

### `usePlanoAcaoContatos.ts`
Hooks completos para gerenciamento de contatos com clientes em planos de ação, incluindo CRUD, estatísticas e invalidação de cache.

**Hooks exportados:**

**useContatosPlanoAcao(planoAcaoId: string)**
- Busca todos os contatos de um plano de ação específico
- Ordenação cronológica automática
- Cache invalidado automaticamente após operações CRUD
- Habilitado apenas quando planoAcaoId é fornecido

**useContatoPorId(id: string)**
- Busca contato específico por ID
- Usado para visualização detalhada ou edição
- Cache individual por contato

**useCriarContato()**
- Mutation para criação de novos contatos
- Invalidação automática de cache dos contatos do plano e estatísticas
- Feedback via toast de sucesso/erro
- Parâmetros: `{ planoAcaoId: string; dados: PlanoAcaoContatoFormData }`

**useAtualizarContato()**
- Mutation para atualização de contatos existentes
- Invalidação de cache do contato específico, lista do plano e estatísticas
- Feedback via toast de sucesso/erro
- Parâmetros: `{ id: string; dados: Partial<PlanoAcaoContatoFormData> }`

**useDeletarContato()**
- Mutation para exclusão de contatos
- Invalidação de cache da lista do plano e estatísticas
- Feedback via toast de sucesso/erro
- Parâmetros: `{ id: string; planoAcaoId: string }`

**useEstatisticasContatos(planoAcaoId: string)**
- Busca estatísticas agregadas de contatos do plano
- Total de contatos, por meio de contato, por tipo de retorno
- Data do último contato registrado
- Cache independente das operações CRUD

**Integração:**
- Utiliza serviço `planoAcaoContatosService` para operações no banco
- Integração com TanStack Query para cache e estados de loading
- Notificações via sonner (toast) para feedback ao usuário
- Invalidação inteligente de cache para manter dados sincronizados

**Melhorias recentes:**
- **Logging aprimorado de erros**: Implementados console logs estruturados com emojis visuais (❌, 📋, 🔍) e detalhes completos do erro incluindo message, details, hint e code para facilitar troubleshooting e debug de problemas de atualização
- Implementada limpeza inteligente de dados que preserva campos que aceitam null
- Adicionado suporte completo ao histórico de alterações com usuário e timestamp
- Filtros por mês/ano baseados na data_resposta da pesquisa relacionada
- Busca textual em múltiplos campos para melhor usabilidade

---

### `auditService.ts`
Serviço completo para gerenciamento de logs de auditoria do sistema, incluindo registro, busca, exportação e mapeamento de nomes de tabelas.

**Funcionalidades principais:**
- Registro automático de operações CRUD em todas as tabelas auditadas
- Busca de logs com filtros avançados (tabela, operação, usuário, período)
- Exportação de logs para Excel com formatação
- Mapeamento de nomes técnicos de tabelas para nomes amigáveis em português
- Rastreamento de alterações com dados antes/depois (old_data/new_data)
- Integração com sistema de autenticação para identificar usuários

**Métodos principais:**
- `registrarLog(params)` - Registra nova entrada de auditoria com dados da operação
- `buscarLogs(filtros)` - Busca logs com filtros opcionais (tabela, operação, usuário, período)
- `exportarLogs(filtros)` - Exporta logs filtrados para arquivo Excel
- `obterNomeTabela(tableName)` - Converte nome técnico da tabela para nome amigável em português
- `obterEstatisticas()` - Calcula estatísticas de auditoria (total de logs, por operação, por tabela)

**Métodos privados de formatação:**
- `formatTipoProduto(tipo)` - Formata tipo de produto para exibição (GALLERY, COMEX/FISCAL, ou valor original)
- `formatDate(date)` - Formata data para exibição em formato brasileiro (DD/MM/YYYY)
- `formatarMoeda(valor)` - Formata valores numéricos para formato monetário brasileiro (R$ 0,00)
- `formatTipoHora(tipo)` - Formata tipo de hora para exibição (remota → Remota, local → Local)
- Formatação de `valores_remota` e `valores_local` - Converte objetos JSON de valores em strings legíveis com todas as funções e seus respectivos valores monetários formatados (ex: "Funcional: R$ 150,00, Técnico: R$ 180,00, ABAP: R$ 200,00, DBA: R$ 220,00, Gestor: R$ 250,00")

**Tabelas auditadas (mapeamento de nomes):**
- `profiles` → "Perfis de Usuário"
- `empresas_clientes` → "Empresas Clientes"
- `grupos_responsaveis` → "Grupos Responsáveis"
- `email_templates` → "Templates de Email"
- `historico_disparos` → "Disparos de Books"
- `requerimentos` → "Requerimentos"
- `taxas_clientes` → "Taxas de Clientes"
- `taxas_padrao` → "Taxas Padrão"

**Tipos de operações auditadas:**
- `INSERT` - Criação de novos registros
- `UPDATE` - Atualização de registros existentes
- `DELETE` - Exclusão de registros

**Estrutura do log de auditoria:**
- `id` - Identificador único do log
- `table_name` - Nome da tabela afetada
- `record_id` - ID do registro afetado
- `operation` - Tipo de operação (INSERT/UPDATE/DELETE)
- `old_data` - Dados antes da alteração (JSON)
- `new_data` - Dados após a alteração (JSON)
- `user_id` - ID do usuário que executou a operação
- `user_email` - Email do usuário
- `created_at` - Data/hora da operação

**Filtros disponíveis:**
- `tabela` - Filtrar por tabela específica
- `operacao` - Filtrar por tipo de operação (INSERT/UPDATE/DELETE)
- `usuario` - Filtrar por ID do usuário
- `dataInicio` - Data inicial do período
- `dataFim` - Data final do período
- `recordId` - Filtrar por ID do registro específico

**Integração:**
- Utilizado pela página `AuditLogs.tsx` para exibição de logs
- Triggers automáticos no banco de dados registram operações
- Integra-se com tabela `audit_logs` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`

**Melhorias recentes:**
- **Adicionado mapeamento de tabelas de taxas**: Incluídos nomes amigáveis para `taxas_clientes` ("Taxas de Clientes") e `taxas_padrao` ("Taxas Padrão") no método `obterNomeTabela()`
- **Adicionadas funções privadas de formatação**: Implementados métodos `formatTipoProduto()`, `formatDate()`, `formatarMoeda()` e `formatTipoHora()` para formatação consistente de dados de taxas nos logs de auditoria
- **Formatação de valores monetários**: Implementada formatação automática dos campos `valores_remota` e `valores_local` (objetos JSON) para strings legíveis com todas as funções e valores em formato monetário brasileiro
- **Formatação de tipo de hora**: Adicionada formatação do campo `tipo_hora` para exibição amigável (remota → Remota, local → Local)
- Melhorada legibilidade dos logs com nomes em português e valores formatados
- Suporte completo para auditoria do módulo de taxas com formatação adequada de tipos de produto, datas, valores monetários e tipos de hora

**Uso típico:**
```typescript
// Registrar operação de criação
await auditService.registrarLog({
  table_name: 'taxas_clientes',
  record_id: '123',
  operation: 'INSERT',
  new_data: { cliente_id: 'abc', tipo_produto: 'GALLERY' }
});

// Buscar logs de uma tabela
const logs = await auditService.buscarLogs({
  tabela: 'taxas_clientes',
  dataInicio: new Date('2024-01-01'),
  dataFim: new Date('2024-12-31')
});

// Obter nome amigável da tabela
const nomeAmigavel = auditService.obterNomeTabela('taxas_clientes');
// Retorna: "Taxas de Clientes"
```

---

### `taxasClientesService.ts`
Serviço completo para gerenciamento de taxas de clientes, incluindo CRUD, busca de taxas vigentes, cálculo automático de valores derivados e validação robusta de dados.

**Funcionalidades principais:**
- CRUD completo de taxas de clientes (criar, buscar, atualizar, deletar)
- Busca de taxa vigente por cliente e data específica
- Cálculo automático de valores derivados (hora extra, sobreaviso, etc.)
- **Cálculo automático de valores locais**: Calcula automaticamente valores locais (10% a mais dos valores remotos) durante a criação de taxas
- **Cálculo completo na busca**: Ao buscar uma taxa, calcula automaticamente TODOS os valores derivados para cada função (remota e local)
- Gestão de vigências com controle de períodos (início e fim) e verificação de conflitos
- **Validação robusta de dados**: Tratamento seguro de valores undefined/null com validações obrigatórias
- Suporte a dois tipos de produto: GALLERY e OUTROS (COMEX, FISCAL)
- Valores separados para hora remota e hora local
- Tipo de cálculo adicional configurável (normal ou média)
- Integração com sistema de autenticação para rastreamento de criador

**Métodos principais:**
- `criarTaxaCliente(dados: TaxaFormData): Promise<void>` - Cria nova taxa de cliente com validações
- `buscarTaxasClientes(): Promise<TaxaClienteCompleta[]>` - Busca todas as taxas cadastradas com valores calculados
- `buscarTaxaClientePorId(id: string): Promise<TaxaClienteCompleta | null>` - Busca taxa específica por ID com valores calculados
- `buscarTaxaVigente(clienteId: string, data?: Date): Promise<TaxaClienteCompleta | null>` - Busca taxa vigente do cliente em uma data específica
- `atualizarTaxaCliente(id: string, dados: Partial<TaxaFormData>): Promise<void>` - Atualiza taxa existente
- `deletarTaxaCliente(id: string): Promise<void>` - Remove taxa do sistema

**Cálculo automático de valores (APRIMORADO):**
- **Cálculo completo na busca**: Ao buscar uma taxa, o serviço calcula automaticamente TODOS os valores derivados para cada função
- **Separação inteligente**: Separa valores por tipo (remota/local) e prepara arrays para cálculo da média
- **Arrays para cálculo**: Cria arrays `todasFuncoesRemota` e `todasFuncoesLocal` com todas as funções e valores base para cálculos de média
- **Cálculo diferenciado**: Usa parâmetro `isLocal` (false para remota, true para local) na função `calcularValores()`
- **Retorno padronizado**: Todas as funções de busca retornam `TaxaClienteCompleta` com `valores_remota` e `valores_local` já calculados
- Utiliza função `calcularValores()` de `@/types/taxasClientes` para cálculos
- Valores calculados incluem:
  - Seg-Sex 17h30-19h30
  - Seg-Sex Após 19h30
  - Sáb/Dom/Feriados
  - Hora Adicional (Excedente do Banco)
  - Stand By (apenas para remota)
- Cálculo separado para valores remotos e locais
- Suporte a dois tipos de cálculo adicional: normal (baseado no valor base) ou média (média de todas as funções)

**Estrutura de retorno (TaxaClienteCompleta):**
```typescript
{
  id: string;
  cliente_id: string;
  tipo_produto: 'GALLERY' | 'OUTROS';
  vigencia_inicio: Date;
  vigencia_fim?: Date | null;
  tipo_calculo_adicional?: 'normal' | 'media';
  personalizado: boolean;
  valores_remota: ValorTaxaCalculado[];  // Array com valores calculados
  valores_local: ValorTaxaCalculado[];   // Array com valores calculados
  criado_por?: string;
  criado_em: Date;
  atualizado_em: Date;
}
```

**Estrutura de ValorTaxaCalculado:**
```typescript
{
  funcao: string;                    // Nome da função (Funcional, Técnico, etc.)
  valor_base: number;                // Valor base (Seg-Sex 08h30-17h30)
  valor_17h30_19h30: number;         // Calculado
  valor_apos_19h30: number;          // Calculado
  valor_fim_semana: number;          // Calculado
  valor_hora_adicional: number;      // Calculado (apenas remota)
  valor_standby: number;             // Calculado (apenas remota)
}
```

**Fluxo de criação com cálculo automático:**
1. Recebe dados do formulário com valores remotos
2. Calcula automaticamente valores locais (10% a mais) usando `calcularValoresLocaisAutomaticos()`
3. Cria taxa na tabela `taxas_clientes`
4. Insere valores remotos (fornecidos) e locais (calculados) na tabela `valores_taxas_funcoes`
5. Registra usuário criador e timestamps

**Fluxo de busca com cálculo (APRIMORADO):**
1. Busca dados da taxa na tabela `taxas_clientes`
2. Busca valores base na tabela `valores_taxas_funcoes`
3. **Separação inteligente**: Separa valores por tipo (remota/local) usando `filter()`
4. **Preparação para cálculo**: Cria arrays `todasFuncoesRemota` e `todasFuncoesLocal` com estrutura `{ funcao, valor_base }`
5. **Cálculo completo**: Para cada função, calcula TODOS os valores derivados usando `calcularValores()`:
   - Valores remotos: `calcularValores(valor_base, funcao, todasFuncoesRemota, tipo_calculo, tipo_produto, false)`
   - Valores locais: `calcularValores(valor_base, funcao, todasFuncoesLocal, tipo_calculo, tipo_produto, true)`
6. **Retorno padronizado**: Taxa completa com `valores_remota` e `valores_local` como arrays de `ValorTaxaCalculado`

**Integração:**
- Utilizado pelos hooks `useTaxas`, `useCriarTaxa`, `useAtualizarTaxa`, `useDeletarTaxa`
- Integra-se com tabelas `taxas_clientes` e `valores_taxas_funcoes` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`
- Utilizado pelos componentes `TaxaForm` e página `CadastroTaxasClientes`

**Melhorias recentes:**
- **Validação robusta de vigência implementada**: Adicionada validação obrigatória do campo `vigencia_inicio` com tratamento seguro de valores undefined:
  - **Operador de encadeamento opcional**: Uso de `?.` para evitar erros quando `vigencia_inicio` é undefined
  - **Validação explícita**: Verificação `if (!vigenciaInicio)` com erro específico "Vigência início é obrigatória"
  - **Tratamento consistente**: Aplicado mesmo padrão para `vigencia_fim` garantindo robustez
  - **Prevenção de erros**: Evita crashes por tentativa de chamar `toISOString()` em valores undefined
  - **Mensagens claras**: Erro específico facilita debug e identificação de problemas de validação
- **Cálculo completo na busca implementado**: Refatorado método `buscarTaxaClientePorId()` para calcular automaticamente TODOS os valores derivados:
  - **Separação inteligente**: Valores separados por tipo (remota/local) usando `filter()`
  - **Arrays para cálculo de média**: Criados `todasFuncoesRemota` e `todasFuncoesLocal` com estrutura `{ funcao, valor_base }`
  - **Cálculo diferenciado**: Usa parâmetro `isLocal` correto (false para remota, true para local)
  - **Retorno completo**: `valores_remota` e `valores_local` retornados como arrays de `ValorTaxaCalculado` com todos os campos calculados
- **Eliminação de cálculos no frontend**: Frontend agora recebe valores já calculados, melhorando performance
- **Consistência garantida**: Todos os valores calculados usando a mesma lógica centralizada no backend
- **Compatibilidade mantida**: Interface `TaxaClienteCompleta` preservada, mudança transparente para componentes
- **Cálculo automático de valores derivados**: Implementado cálculo automático de todos os valores derivados ao buscar uma taxa, eliminando necessidade de cálculos no frontend
- **Retorno padronizado**: Todas as funções de busca retornam `TaxaClienteCompleta` com valores já calculados
- **Performance otimizada**: Cálculos realizados uma vez no backend ao invés de múltiplas vezes no frontend
- **Consistência de dados**: Garante que valores calculados sejam sempre consistentes usando a mesma lógica de cálculo
- **Cálculo automático em reajustes**: Implementado cálculo automático de valores locais durante reajustes quando não estiver em modo personalizado, garantindo que valores locais sejam sempre 10% maiores que os remotos mesmo em atualizações com reajuste

---

### `taxasClientesService.ts`
Serviço completo para gerenciamento de taxas de clientes, incluindo CRUD, busca de taxas vigentes, cálculo automático de valores derivados e lógica de reajuste com criação de novas vigências.

**Funcionalidades principais:**
- CRUD completo de taxas de clientes (criar, buscar, atualizar, deletar)
- Busca de taxa vigente por cliente e data específica
- Cálculo automático de valores derivados (hora extra, sobreaviso, etc.)
- **Cálculo automático de valores locais**: Calcula automaticamente valores locais (10% a mais dos valores remotos) durante a criação e atualização de taxas
- Gestão de vigências com controle de períodos (início e fim) e verificação de conflitos
- Suporte a dois tipos de produto: GALLERY e OUTROS (COMEX, FISCAL)
- Valores separados para hora remota e hora local
- Tipo de cálculo adicional configurável (normal ou média)
- **Lógica de reajuste**: Quando há taxa_reajuste > 0, cria nova taxa automaticamente com valores reajustados ao invés de atualizar a existente
- **Cálculo automático em reajustes**: Durante reajustes, valores locais são calculados automaticamente (10% a mais dos remotos) quando não estiver em modo personalizado
- Integração com sistema de autenticação para rastreamento de criador
- Verificação de conflitos de vigência para evitar sobreposição de períodos

**Métodos principais:**
- `buscarTaxas(filtros?)` - Busca todas as taxas com filtros opcionais
- `buscarTaxaPorId(id)` - Busca taxa específica por ID com valores calculados
- `buscarTaxaVigente(clienteId, data?)` - Busca taxa vigente do cliente em uma data específica
- `criarTaxa(dados)` - Cria nova taxa com cálculo automático de valores locais e suporte a reajuste
- `atualizarTaxa(id, dados)` - Atualiza taxa existente OU cria nova taxa se houver reajuste
- `deletarTaxa(id)` - Remove taxa do sistema
- `verificarVigenciaConflitante()` - Verifica conflitos de vigência entre taxas
- `calcularValoresTaxa()` - Calcula valores derivados com regras de negócio

**Estrutura de retorno (TaxaClienteCompleta):**
- Dados da taxa com informações do cliente
- `valores_remota` - Array de valores remotos calculados automaticamente
- `valores_local` - Array de valores locais calculados automaticamente (10% a mais)
- Cada valor inclui: valor_base, valor_17h30_19h30, valor_apos_19h30, valor_fim_semana, valor_adicional, valor_standby

**Fluxo de criação com cálculo automático:**
1. Recebe dados do formulário com valores remotos
2. Calcula automaticamente valores locais (10% a mais) usando `calcularValoresLocaisAutomaticos()`
3. Cria taxa na tabela `taxas_clientes`
4. Insere valores remotos (fornecidos) e locais (calculados) na tabela `valores_taxas_funcoes`
5. Se há taxa_reajuste, cria automaticamente segunda taxa com valores reajustados e nova vigência

**Fluxo de atualização com reajuste e cálculo automático:**
1. Quando há `taxa_reajuste > 0`, busca taxa atual para obter dados base
2. **Cálculo automático de valores locais**: Se não estiver em modo personalizado e houver valores remotos, calcula automaticamente valores locais (10% a mais dos remotos) usando `calcularValoresLocaisAutomaticos()`
3. Cria nova taxa com valores reajustados ao invés de atualizar a existente
4. Insere valores remotos (reajustados) e locais (calculados automaticamente ou fornecidos) na tabela `valores_taxas_funcoes`
5. Preserva taxa anterior no histórico para auditoria

**Integração:**
- Utilizado pelos hooks `useTaxas`, `useCriarTaxa`, `useAtualizarTaxa`, `useDeletarTaxa`
- Integra-se com tabelas `taxas_clientes` e `valores_taxas_funcoes` do Supabase
- Utilizado pelos componentes `TaxaForm` e página `CadastroTaxasClientes`
- Utiliza função `calcularValores()` de `@/types/taxasClientes` para cálculos

### `taxaPadraoService.ts`
Serviço completo para gerenciamento de taxas padrão, incluindo CRUD, histórico de parametrizações e lógica de reajuste com criação de novas vigências.

**Funcionalidades principais:**
- CRUD completo de taxas padrão (criar, buscar, atualizar, deletar)
- Busca de histórico de taxas padrão filtrado por tipo de produto
- Lógica inteligente de reajuste: cria nova taxa ao invés de atualizar quando há taxa_reajuste
- Gestão de vigências com controle de períodos (início e fim)
- Suporte a dois tipos de produto: GALLERY e OUTROS (COMEX, FISCAL)
- Valores separados para hora remota e hora local
- Tipo de cálculo adicional configurável (normal ou média)
- Integração com sistema de autenticação para rastreamento de criador

**Métodos principais:**
- `criarTaxaPadrao(dados: TaxaPadraoData): Promise<void>` - Cria nova taxa padrão com validações
- `buscarTaxasPadrao(): Promise<TaxaPadraoCompleta[]>` - Busca todas as taxas padrão cadastradas
- `buscarTaxaPadraoPorId(id: string): Promise<TaxaPadraoCompleta | null>` - Busca taxa padrão específica por ID
- `buscarHistoricoTaxasPadrao(tipoProduto: 'GALLERY' | 'OUTROS'): Promise<TaxaPadraoCompleta[]>` - Busca histórico de taxas padrão filtrado por tipo de produto, ordenado por vigência (mais recente primeiro)
- `atualizarTaxaPadrao(id: string, dados: Partial<TaxaPadraoData>): Promise<void>` - Atualiza taxa padrão existente OU cria nova taxa se houver reajuste
- `deletarTaxaPadrao(id: string): Promise<void>` - Remove taxa padrão do sistema

**Lógica de reajuste (comportamento especial):**
Quando o método `atualizarTaxaPadrao()` recebe `taxa_reajuste > 0`, ao invés de atualizar a taxa existente, o serviço:
1. Busca a taxa atual para obter os dados base
2. Cria uma **nova taxa padrão** com os valores reajustados
3. Define nova vigência (início e fim) conforme fornecido
4. Mantém a taxa antiga no histórico (não é excluída)
5. Registra o usuário criador da nova taxa

**Motivo da lógica de reajuste:**
- Preserva histórico completo de parametrizações
- Permite rastreamento de todas as vigências anteriores
- Facilita auditoria e análise de evolução de valores
- Evita perda de dados históricos

**Estrutura de dados (TaxaPadraoData):**
```typescript
{
  tipo_produto: 'GALLERY' | 'OUTROS';
  vigencia_inicio: Date | string;
  vigencia_fim?: Date | string | null;
  tipo_calculo_adicional?: 'normal' | 'media';
  taxa_reajuste?: number;  // Percentual de reajuste (ex: 5 para 5%)
  valores_remota: {
    funcional: number;
    tecnico: number;
    abap?: number;
    dba: number;
    gestor: number;
  };
  valores_local: {
    funcional: number;
    tecnico: number;
    abap?: number;
    dba: number;
    gestor: number;
  };
}
```

**Campos do banco de dados:**
- `id` - UUID da taxa padrão
- `tipo_produto` - Tipo de produto (GALLERY ou OUTROS)
- `vigencia_inicio` - Data de início da vigência (obrigatório)
- `vigencia_fim` - Data de fim da vigência (opcional, null = indefinida)
- `tipo_calculo_adicional` - Tipo de cálculo para hora adicional (normal ou media)
- `valor_remota_funcional` - Valor base remoto para função Funcional
- `valor_remota_tecnico` - Valor base remoto para função Técnico
- `valor_remota_abap` - Valor base remoto para função ABAP (apenas OUTROS)
- `valor_remota_dba` - Valor base remoto para função DBA
- `valor_remota_gestor` - Valor base remoto para função Gestor
- `valor_local_funcional` - Valor base local para função Funcional
- `valor_local_tecnico` - Valor base local para função Técnico
- `valor_local_abap` - Valor base local para função ABAP (apenas OUTROS)
- `valor_local_dba` - Valor base local para função DBA
- `valor_local_gestor` - Valor base local para função Gestor
- `criado_por` - UUID do usuário que criou a taxa
- `criado_em` - Data/hora de criação
- `atualizado_em` - Data/hora da última atualização

**Fluxo de criação:**
1. Obtém usuário autenticado via `supabase.auth.getUser()`
2. Valida vigência_inicio (obrigatório)
3. Prepara dados para inserção no banco
4. Mapeia valores_remota e valores_local para campos individuais
5. Insere taxa padrão na tabela `taxas_padrao`
6. Registra usuário criador (criado_por)

**Fluxo de atualização (sem reajuste):**
1. Prepara dados para atualização
2. Converte datas para formato ISO se necessário
3. Mapeia valores_remota e valores_local para campos individuais
4. Atualiza taxa padrão existente na tabela `taxas_padrao`

**Fluxo de atualização (com reajuste):**
1. Obtém usuário autenticado
2. Busca taxa atual para obter dados base
3. Valida vigência_inicio (obrigatório para nova taxa)
4. Prepara dados da nova taxa com valores reajustados
5. **Cria nova taxa padrão** (INSERT) ao invés de atualizar (UPDATE)
6. Registra usuário criador da nova taxa
7. Taxa antiga permanece no histórico

**Validações:**
- Vigência início obrigatória
- Tipo de produto obrigatório (GALLERY ou OUTROS)
- Valores monetários devem ser números positivos
- Taxa de reajuste deve ser maior que 0 para acionar lógica especial

**Tratamento de erros:**
- Try-catch em todas as operações assíncronas
- Logs de erro no console para debugging
- Mensagens de erro específicas para cada tipo de falha
- Validação de existência de taxa antes de atualizar/deletar

**Integração:**
- Utilizado pelos hooks `useTaxasPadrao`, `useHistoricoTaxasPadrao`, `useCriarTaxaPadrao`, `useAtualizarTaxaPadrao`, `useDeletarTaxaPadrao`
- Integra-se com tabela `taxas_padrao` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`
- Utilizado pelos componentes `TaxaPadraoForm` e `TaxaPadraoHistorico`

**Tipos utilizados:**
- `TaxaPadraoData` - Dados do formulário de criação/edição
- `TaxaPadraoCompleta` - Tipo completo da taxa padrão com todos os campos

**Melhorias recentes:**
- **Implementada lógica de reajuste**: Quando há `taxa_reajuste > 0`, cria nova taxa ao invés de atualizar, preservando histórico completo
- **Preservação de histórico**: Taxa antiga não é excluída, permitindo rastreamento de todas as parametrizações
- **Validação de vigência**: Garantia de que vigência_inicio é obrigatória ao criar nova taxa por reajuste
- **Mapeamento de valores**: Conversão automática entre estrutura de objetos (valores_remota/valores_local) e campos individuais do banco

**Uso típico:**
```typescript
// Criar nova taxa padrão
await taxaPadraoService.criarTaxaPadrao({
  tipo_produto: 'GALLERY',
  vigencia_inicio: '2024-01-01',
  vigencia_fim: '2024-12-31',
  tipo_calculo_adicional: 'media',
  valores_remota: {
    funcional: 150,
    tecnico: 180,
    dba: 220,
    gestor: 250
  },
  valores_local: {
    funcional: 180,
    tecnico: 210,
    dba: 250,
    gestor: 280
  }
});

// Atualizar com reajuste (cria nova taxa)
await taxaPadraoService.atualizarTaxaPadrao('uuid-da-taxa', {
  taxa_reajuste: 5,  // 5% de reajuste
  vigencia_inicio: '2025-01-01',
  vigencia_fim: '2025-12-31',
  valores_remota: { /* valores reajustados */ },
  valores_local: { /* valores reajustados */ }
});
// Resultado: Nova taxa criada, taxa antiga preservada no histórico

// Buscar histórico por tipo de produto
const historico = await taxaPadraoService.buscarHistoricoTaxasPadrao('GALLERY');
// Retorna todas as taxas GALLERY ordenadas por vigência (mais recente primeiro)
```

---

## Diretório `src/types/`

Definições de tipos TypeScript utilizadas em todo o projeto.

### `elogios.ts`
Definições de tipos e interfaces para o sistema de elogios (pesquisas de satisfação positivas).

**Tipos principais:**

**StatusElogio**
```typescript
type StatusElogio = 'registrado' | 'compartilhado' | 'arquivado';
```
Status possíveis de um elogio no sistema:
- `registrado` - Elogio cadastrado mas ainda não compartilhado
- `compartilhado` - Elogio enviado/compartilhado com stakeholders
- `arquivado` - Elogio arquivado (não mais ativo)

**TipoAtualizacaoElogio**
```typescript
type TipoAtualizacaoElogio = 'criacao' | 'atualizacao' | 'compartilhamento' | 'arquivamento';
```
Tipos de atualização registrados no histórico de elogios.

**Interfaces principais:**

**Elogio**
Interface base do elogio com campos principais:
- `id` - UUID do elogio
- `pesquisa_id` - UUID da pesquisa de satisfação vinculada
- `chamado` - Número do chamado (opcional)
- `empresa_id` - UUID da empresa (opcional)
- `data_resposta` - Data da resposta do cliente (opcional)
- `observacao` - Observações internas (opcional)
- `acao_tomada` - Ações tomadas com base no elogio (opcional)
- `compartilhado_com` - Lista de pessoas/grupos com quem foi compartilhado (opcional)
- `status` - Status atual do elogio (registrado/compartilhado/arquivado)
- `criado_por` - UUID do usuário que criou (opcional)
- `criado_em` - Data/hora de criação
- `atualizado_em` - Data/hora da última atualização

**ElogioHistorico**
Interface para histórico de alterações do elogio:
- `id` - UUID do registro de histórico
- `elogio_id` - UUID do elogio relacionado
- `data_atualizacao` - Data/hora da atualização
- `usuario_id` - UUID do usuário que fez a atualização (opcional)
- `usuario_nome` - Nome do usuário (opcional)
- `descricao_atualizacao` - Descrição da alteração realizada
- `tipo_atualizacao` - Tipo da atualização (opcional)
- `criado_em` - Data/hora de criação do registro

**ElogioCompleto**
Interface estendida que inclui dados da pesquisa de satisfação vinculada:
- Herda todos os campos de `Elogio`
- `pesquisa` - Objeto com dados da pesquisa relacionada:
  - `id` - UUID da pesquisa
  - `empresa` - Nome da empresa
  - `cliente` - Nome do cliente
  - `email_cliente` - Email do cliente (opcional)
  - `prestador` - Nome do consultor/prestador (opcional)
  - `categoria` - Categoria do atendimento (opcional)
  - `grupo` - Grupo responsável (opcional)
  - `tipo_caso` - Tipo do chamado: IM/PR/RF (opcional)
  - `nro_caso` - Número do chamado (opcional)
  - `comentario_pesquisa` - Comentário da pesquisa (opcional)
  - `resposta` - Nível de satisfação (opcional)
  - `data_resposta` - Data/hora da resposta (opcional)
  - `origem` - **NOVO**: Origem dos dados ('sql_server' | 'manual') - identifica se a pesquisa foi sincronizada do SQL Server ou cadastrada manualmente no sistema (opcional)

**ElogioFormData**
Interface para dados do formulário de criação/edição:
- Campos da pesquisa de satisfação:
  - `empresa` - Nome da empresa (obrigatório)
  - `cliente` - Nome do cliente (obrigatório)
  - `email_cliente` - Email do cliente (opcional)
  - `prestador` - Nome do consultor/prestador (opcional)
  - `categoria` - Categoria do atendimento (opcional)
  - `grupo` - Grupo responsável (opcional)
  - `tipo_caso` - Tipo do chamado (opcional)
  - `nro_caso` - Número do chamado (opcional)
  - `data_resposta` - Data da resposta (Date ou string, opcional)
  - `resposta` - Nível de satisfação (obrigatório)
  - `comentario_pesquisa` - Comentário da pesquisa (opcional)
- Campos específicos do elogio:
  - `observacao` - Observações internas (opcional)
  - `acao_tomada` - Ações tomadas (opcional)
  - `compartilhado_com` - Compartilhado com (opcional)
  - `status` - Status do elogio (opcional)

**FiltrosElogio**
Interface para filtros de busca:
- `busca` - Busca textual (opcional)
- `status` - Array de status para filtrar (opcional)
- `empresa` - Filtro por empresa (opcional)
- `dataInicio` - Data inicial do período (opcional)
- `dataFim` - Data final do período (opcional)
- `mes` - Mês da data de resposta (1-12, opcional)
- `ano` - Ano da data de resposta (opcional)

**EstatisticasElogio**
Interface para estatísticas agregadas:
- `total` - Total de elogios
- `registrados` - Quantidade de elogios registrados
- `compartilhados` - Quantidade de elogios compartilhados
- `arquivados` - Quantidade de elogios arquivados

**Constantes:**

**STATUS_ELOGIO_OPTIONS**
Array de opções para selects de status:
```typescript
[
  { value: 'registrado', label: 'Registrado' },
  { value: 'compartilhado', label: 'Compartilhado' },
  { value: 'arquivado', label: 'Arquivado' },
]
```

**Uso típico:**
```typescript
import { ElogioCompleto, FiltrosElogio, StatusElogio } from '@/types/elogios';

// Buscar elogios com filtros
const filtros: FiltrosElogio = {
  mes: 12,
  ano: 2024,
  status: ['compartilhado']
};

// Trabalhar com elogio completo
const elogio: ElogioCompleto = {
  id: 'uuid',
  pesquisa_id: 'uuid-pesquisa',
  status: 'compartilhado',
  criado_em: '2024-12-01',
  atualizado_em: '2024-12-01',
  pesquisa: {
    id: 'uuid-pesquisa',
    empresa: 'Empresa XYZ',
    cliente: 'Cliente ABC',
    prestador: 'João Silva',
    resposta: 'Muito Satisfeito',
    origem: 'sql_server' // Indica que veio da sincronização
  }
};
```

**Melhorias recentes:**
- **Campo origem adicionado**: Novo campo `origem` ('sql_server' | 'manual') na interface da pesquisa vinculada permite identificar a fonte dos dados, facilitando rastreamento e tratamento diferenciado entre pesquisas sincronizadas do SQL Server e cadastradas manualmente no sistema

---

### `taxasClientes.ts`
Definições de tipos e funções para o sistema de taxas de clientes, incluindo cálculo automático de valores derivados e gestão de vigências.

**Tipos principais:**

**TipoProduto**
```typescript
type TipoProduto = 'GALLERY' | 'OUTROS';
```
Tipos de produto suportados:
- `GALLERY` - Produto Gallery com funções específicas
- `OUTROS` - Produtos COMEX e FISCAL

**TipoFuncao**
```typescript
type TipoFuncao = 'Funcional' | 'Técnico / ABAP' | 'DBA / Basis' | 'Gestor' | 
                  'Técnico (Instalação / Atualização)' | 'ABAP - PL/SQL' | 'DBA';
```
Funções disponíveis por tipo de produto:
- **GALLERY**: Funcional, Técnico / ABAP, DBA / Basis, Gestor
- **OUTROS**: Funcional, Técnico (Instalação / Atualização), ABAP - PL/SQL, DBA, Gestor

**TipoCalculoAdicional**
```typescript
type TipoCalculoAdicional = 'normal' | 'media';
```
Tipos de cálculo para hora adicional:
- `normal` - Valor base + 15% para todas as funções
- `media` - Média dos valores base + 15% das funções relacionadas

**Interfaces principais:**

**TaxaCliente**
Interface base da taxa de cliente:
- `id` - UUID da taxa
- `cliente_id` - UUID do cliente
- `vigencia_inicio` - Data de início da vigência (string)
- `vigencia_fim` - Data de fim da vigência (opcional)
- `tipo_produto` - Tipo de produto (GALLERY ou OUTROS)
- `tipo_calculo_adicional` - Tipo de cálculo para hora adicional
- `personalizado` - Flag para valores personalizados (opcional)
- `criado_por` - UUID do usuário criador (opcional)
- `criado_em` - Data/hora de criação
- `atualizado_em` - Data/hora da última atualização

**ValorTaxaFuncao**
Interface para valores de taxa por função:
- `id` - UUID do valor
- `taxa_id` - UUID da taxa relacionada
- `funcao` - Função (TipoFuncao)
- `tipo_hora` - Tipo de hora ('remota' | 'local')
- `valor_base` - Valor base (Seg-Sex 08h30-17h30)
- `criado_em` - Data/hora de criação
- `atualizado_em` - Data/hora da última atualização

**TaxaClienteCompleta**
Interface estendida com dados do cliente e valores calculados:
- Herda todos os campos de `TaxaCliente`
- `cliente` - Dados do cliente (id, nome_completo, nome_abreviado, produtos)
- `valores_remota` - Array de valores remotos calculados
- `valores_local` - Array de valores locais calculados

**ValorTaxaCalculado**
Interface para valores calculados automaticamente:
- `funcao` - Função (TipoFuncao)
- `valor_base` - Valor base (Seg-Sex 08h30-17h30)
- `valor_17h30_19h30` - Valor calculado (Seg-Sex 17h30-19h30)
- `valor_apos_19h30` - Valor calculado (Seg-Sex Após 19h30)
- `valor_fim_semana` - Valor calculado (Sáb/Dom/Feriados)
- `valor_adicional` - Valor adicional (Excedente do Banco)
- `valor_standby` - Valor de sobreaviso (Stand By)

**TaxaFormData**
Interface para dados do formulário de criação/edição:
- Campos básicos: cliente_id, vigencia_inicio, vigencia_fim, tipo_produto, tipo_calculo_adicional
- `personalizado` - Flag para permitir edição manual de todos os campos
- `taxa_reajuste` - Percentual de reajuste (opcional)
- `valores_remota` - Valores base remotos por função
- `valores_local` - Valores base locais por função
- `valores_remota_personalizados` - Valores personalizados remotos (quando personalizado = true)
- `valores_local_personalizados` - Valores personalizados locais (quando personalizado = true)

**Funções principais:**

**calcularValores()**
```typescript
calcularValores(
  valorBase: number, 
  funcao: TipoFuncao, 
  todasFuncoes?: { funcao: TipoFuncao; valor_base: number }[],
  tipoCalculo: TipoCalculoAdicional = 'media',
  tipoProduto?: TipoProduto,
  isLocal: boolean = false // NOVO: indica se é cálculo para valores locais
): ValorTaxaCalculado
```

Calcula automaticamente todos os valores derivados baseado no valor base e regras de negócio.

**Parâmetros:**
- `valorBase` - Valor base da função (Seg-Sex 08h30-17h30)
- `funcao` - Função para a qual calcular os valores
- `todasFuncoes` - Array com todas as funções para cálculos de média (opcional)
- `tipoCalculo` - Tipo de cálculo adicional ('normal' ou 'media')
- `tipoProduto` - Tipo de produto para regras específicas (opcional)
- `isLocal` - **CORREÇÃO**: Parâmetro mantido para compatibilidade futura, mas não altera o cálculo pois valores locais já vêm com 10% a mais

**Cálculos realizados:**
- **Valor base**: Usado diretamente sem ajuste adicional (valores locais já chegam com 10% a mais aplicado anteriormente)
- **Seg-Sex 17h30-19h30**: Valor base ajustado × 1,75 (multiplicação direta otimizada)
- **Seg-Sex Após 19h30**: Valor base ajustado × 2,0 (multiplicação direta otimizada)
- **Sáb/Dom/Feriados**: Valor base ajustado × 2,0 (multiplicação direta otimizada)
- **Stand By**: Valor base ajustado × 0,30
- **Hora Adicional**: Cálculo complexo baseado no tipo de cálculo e produto

**Regras de cálculo da Hora Adicional:**
- **Tipo 'normal'**: Valor base + 15% para todas as funções
- **Tipo 'media'**: Média dos valores base + 15% das funções relacionadas
- **GALLERY (Funcional/Técnico)**: Média apenas de Funcional e Técnico + 15%
- **OUTROS (3 primeiras funções)**: Média de Funcional, Técnico e ABAP + 15%

**getFuncoesPorProduto()**
```typescript
getFuncoesPorProduto(tipoProduto: TipoProduto): TipoFuncao[]
```

Retorna array de funções disponíveis por tipo de produto:
- **GALLERY**: ['Funcional', 'Técnico / ABAP', 'DBA / Basis', 'Gestor']
- **OUTROS**: ['Funcional', 'Técnico (Instalação / Atualização)', 'ABAP - PL/SQL', 'DBA', 'Gestor']

**calcularValoresLocaisAutomaticos()**
```typescript
calcularValoresLocaisAutomaticos(valoresRemotos): valoresLocais
```

Calcula automaticamente valores locais baseados nos remotos aplicando 10% a mais em cada função.

**Melhorias recentes:**
- **Tratamento robusto de valores nulos**: Implementada proteção contra valores `null` ou `undefined` usando operador `||` com fallback para 0
- **Logging detalhado**: Adicionados console logs para debug:
  - 🔄 Log dos valores remotos recebidos como entrada
  - 🔄 Log do resultado calculado antes de retornar
- **Consistência de dados**: Campo `abap` agora retorna 0 ao invés de `undefined` quando não fornecido, garantindo melhor compatibilidade com cálculos
- **Robustez aprimorada**: Função agora é mais resiliente a dados incompletos ou malformados

**Uso típico:**
```typescript
import { calcularValores, TipoProduto, TipoFuncao } from '@/types/taxasClientes';

// Calcular valores remotos
const valoresRemotos = calcularValores(
  150, // valor base
  'Funcional', // função
  todasFuncoes, // array com todas as funções
  'media', // tipo de cálculo
  'GALLERY', // tipo de produto
  false // valores remotos
);

// Calcular valores locais (10% a mais)
const valoresLocais = calcularValores(
  150, // valor base
  'Funcional', // função
  todasFuncoes, // array com todas as funções
  'media', // tipo de cálculo
  'GALLERY', // tipo de produto
  true // valores locais (aplica 10% a mais)
);
```

**Melhorias recentes:**
- **Correção final de aplicação dupla de 10%**: Removida aplicação de 10% a mais na lógica de cálculo de média das três primeiras funções (Funcional, Técnico (Instalação / Atualização), ABAP - PL/SQL) para produtos OUTROS, completando a correção da aplicação dupla de 10% nos valores locais
- **Parâmetro isLocal mantido**: Preservado parâmetro `isLocal` para compatibilidade futura, mas sem alterar o cálculo atual
- **Comentário explicativo atualizado**: Comentário corrigido para "CORREÇÃO: Não aplicar 10% aqui pois os valores locais já vêm com 10% a mais"
- **Otimização de cálculos**: Refatorados cálculos de valores derivados para usar multiplicação direta ao invés de soma com percentual:
  - `valor_17h30_19h30 = valorBaseAjustado * 1.75` (antes: `valorBaseAjustado + (valorBaseAjustado * 0.75)`)
  - `valor_apos_19h30 = valorBaseAjustado * 2.0` (antes: `valorBaseAjustado + (valorBaseAjustado * 1.0)`)
  - `valor_fim_semana = valorBaseAjustado * 2.0` (antes: `valorBaseAjustado + (valorBaseAjustado * 1.0)`)
- **Melhor clareza**: Comentários explicativos adicionados para cada cálculo (ex: "Seg-Sex 17h30-19h30: valor base × 1,75")
- **Performance aprimorada**: Eliminada operação de soma desnecessária, usando multiplicação direta mais eficiente
- **Compatibilidade mantida**: Parâmetro opcional com valor padrão `false` mantém compatibilidade com código existente

**Integração:**
- Utilizado pelos serviços `taxasClientesService.ts` e `taxaPadraoService.ts`
- Integra-se com componentes `TaxaForm.tsx` e `TipoCobrancaBloco.tsx`
- Usado para preenchimento automático de valores em formulários de requerimentos
- Suporta tanto modo automático quanto personalizado de valores

---

### `requerimentos.ts`
Definições de tipos e interfaces para o sistema de requerimentos, incluindo formulários, validações e constantes de opções.

**Tipos principais:**

**ModuloType**
```typescript
type ModuloType = 'Comex' | 'Comply' | 'Comply e-DOCS' | 'Gallery' | 'pw.SATI' | 'pw.SPED' | 'pw.SATI/pw.SPED';
```
Módulos do sistema disponíveis para requerimentos.

**LinguagemType**
```typescript
type LinguagemType = 'ABAP' | 'DBA' | 'Funcional' | 'PL/SQL' | 'Técnico';
```
Linguagens/perfis técnicos disponíveis para requerimentos.

**TipoCobrancaType**
```typescript
type TipoCobrancaType = 'Banco de Horas' | 'Cobro Interno' | 'Contrato' | 'Faturado' | 'Hora Extra' | 'Sobreaviso' | 'Reprovado' | 'Bolsão Enel';
```
Tipos de cobrança disponíveis para requerimentos.

**TipoHoraExtraType**
```typescript
type TipoHoraExtraType = '17h30-19h30' | 'apos_19h30' | 'fim_semana';
```
Tipos específicos de hora extra (usado quando tipo_cobranca = 'Hora Extra').

**StatusRequerimento**
```typescript
type StatusRequerimento = 'lancado' | 'enviado_faturamento' | 'faturado';
```
Status possíveis de um requerimento no sistema.

**Interfaces principais:**

**Requerimento**
Interface completa do requerimento com todos os campos:
- `id` - UUID do requerimento
- `chamado` - Número do chamado
- `cliente_id` - UUID do cliente
- `cliente_nome` - Nome do cliente (join com empresas_clientes)
- `modulo` - Módulo do sistema
- `descricao` - Descrição do requerimento
- `data_envio` - Data de envio
- `data_aprovacao` - Data de aprovação (opcional)
- `horas_funcional` - Horas funcionais (suporta formato HH:MM)
- `horas_tecnico` - Horas técnicas (suporta formato HH:MM)
- `horas_total` - Total de horas
- `linguagem` - Linguagem/perfil técnico
- `tipo_cobranca` - Tipo de cobrança
- `mes_cobranca` - Mês de cobrança (formato MM/YYYY)
- `observacao` - Observações (opcional)
- `valor_hora_funcional` - Valor/hora funcional (opcional)
- `valor_hora_tecnico` - Valor/hora técnico (opcional)
- `valor_total_funcional` - Valor total funcional (opcional)
- `valor_total_tecnico` - Valor total técnico (opcional)
- `valor_total_geral` - Valor total geral (opcional)
- `tipo_hora_extra` - Tipo de hora extra (opcional, para tipo_cobranca = 'Hora Extra')
- `quantidade_tickets` - Quantidade de tickets (opcional, para Banco de Horas)
- `atendimento_presencial` - **NOVO**: Flag para atendimento presencial (usa valores locais ao invés de remotos)
- `anexos` - Anexos do requerimento (opcional)
- `autor_id` - UUID do autor (opcional)
- `autor_nome` - Nome do autor (opcional)
- `status` - Status do requerimento
- `enviado_faturamento` - Flag de envio para faturamento
- `data_envio_faturamento` - Data de envio para faturamento (opcional)
- `data_faturamento` - Data de faturamento (opcional)
- `created_at` - Data/hora de criação
- `updated_at` - Data/hora da última atualização

**RequerimentoFormData**
Interface para dados do formulário de criação/edição:
- Campos básicos: chamado, cliente_id, modulo, descricao, data_envio, data_aprovacao
- `horas_funcional` - Horas funcionais (suporta formato HH:MM)
- `horas_tecnico` - Horas técnicas (suporta formato HH:MM)
- `linguagem` - Linguagem/perfil técnico
- `tipo_cobranca` - Tipo de cobrança
- `mes_cobranca` - Mês de cobrança (formato MM/YYYY)
- `observacao` - Observações (opcional)
- `valor_hora_funcional` - Valor/hora funcional (condicional)
- `valor_hora_tecnico` - Valor/hora técnico (condicional)
- `tipo_hora_extra` - Tipo de hora extra (opcional, para tipo Hora Extra)
- `quantidade_tickets` - Quantidade de tickets (opcional, para Banco de Horas)
- `horas_analise_ef` - Horas de análise EF (opcional, para tipo Reprovado, suporta formato HH:MM)
- `atendimento_presencial` - **NOVO**: Flag para atendimento presencial (usa valores locais ao invés de remotos)
- `autor_id` - UUID do autor (preenchido automaticamente)
- `autor_nome` - Nome do autor (preenchido automaticamente)

**RequerimentoFaturamentoData**
Interface estendida para dados de faturamento:
- Herda todos os campos de `RequerimentoFormData`
- `mes_cobranca` - Obrigatório para faturamento

**ClienteRequerimento**
Interface para dados do cliente (empresas_clientes):
- `id` - UUID do cliente
- `nome_abreviado` - Nome abreviado da empresa
- `tipo_cobranca` - Tipo de cobrança da empresa ('banco_horas' | 'ticket' | 'outros')

**FiltrosRequerimentos**
Interface para filtros de busca:
- `busca` - Busca textual (opcional)
- `modulo` - Módulo ou array de módulos (suporte a múltipla seleção)
- `status` - Status do requerimento (opcional)
- `tipo_cobranca` - Tipo de cobrança ou array de tipos (suporte a múltipla seleção)
- `mes_cobranca` - Mês de cobrança (formato MM/YYYY, opcional)
- `cliente_id` - UUID do cliente (opcional)
- `data_inicio` - Data inicial do período (opcional)
- `data_fim` - Data final do período (opcional)

**Constantes exportadas:**

**MODULO_OPTIONS**
Array de opções para select de módulos:
```typescript
[
  { value: 'Comex', label: 'Comex' },
  { value: 'Comply', label: 'Comply' },
  { value: 'Comply e-DOCS', label: 'Comply e-DOCS' },
  { value: 'Gallery', label: 'Gallery' },
  { value: 'pw.SATI', label: 'pw.SATI' },
  { value: 'pw.SPED', label: 'pw.SPED' },
  { value: 'pw.SATI/pw.SPED', label: 'pw.SATI/pw.SPED' }
]
```

**LINGUAGEM_OPTIONS**
Array de opções para select de linguagens:
```typescript
[
  { value: 'ABAP', label: 'ABAP' },
  { value: 'DBA', label: 'DBA' },
  { value: 'Funcional', label: 'Funcional' },
  { value: 'PL/SQL', label: 'PL/SQL' },
  { value: 'Técnico', label: 'Técnico' }
]
```

**TIPO_COBRANCA_OPTIONS**
Array de opções para select de tipos de cobrança:
```typescript
[
  { value: 'Banco de Horas', label: 'Banco de Horas' },
  { value: 'Cobro Interno', label: 'Cobro Interno' },
  { value: 'Contrato', label: 'Contrato' },
  { value: 'Faturado', label: 'Faturado - Hora Normal' },
  { value: 'Hora Extra', label: 'Faturado - Hora Extra' },
  { value: 'Sobreaviso', label: 'Faturado - Sobreaviso' },
  { value: 'Reprovado', label: 'Reprovado' },
  { value: 'Bolsão Enel', label: 'Bolsão Enel' }
]
```

**TIPO_HORA_EXTRA_OPTIONS**
Array de opções para select de tipos de hora extra:
```typescript
[
  { value: '17h30-19h30', label: 'Seg-Sex 17h30-19h30' },
  { value: 'apos_19h30', label: 'Seg-Sex Após 19h30' },
  { value: 'fim_semana', label: 'Sáb/Dom/Feriados' }
]
```

**TIPOS_COM_VALOR_HORA**
Array com tipos de cobrança que requerem campos de valor/hora:
```typescript
['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel']
```

**Funções utilitárias:**

**requerValorHora()**
```typescript
requerValorHora(tipoCobranca: TipoCobrancaType): boolean
```
Função utilitária para verificar se um tipo de cobrança requer campos de valor/hora.

**Campo atendimento_presencial (NOVO):**
- **Propósito**: Flag booleana que indica se o atendimento foi realizado presencialmente
- **Comportamento**: Quando `true`, o sistema deve usar valores locais (ao invés de remotos) da tabela de taxas para cálculo de valores/hora
- **Uso**: Permite diferenciação entre atendimentos remotos (valores padrão) e presenciais (valores com acréscimo de 10%)
- **Integração**: Deve ser considerado nos serviços de busca de taxas e cálculo de valores automáticos
- **Opcional**: Campo opcional (boolean | undefined) para manter compatibilidade com requerimentos existentes

**Uso típico:**
```typescript
import { 
  RequerimentoFormData, 
  TIPO_COBRANCA_OPTIONS, 
  requerValorHora 
} from '@/types/requerimentos';

// Verificar se tipo requer valor/hora
const precisaValor = requerValorHora('Faturado'); // true

// Usar em formulário
const formData: RequerimentoFormData = {
  chamado: 'INC123456',
  cliente_id: 'uuid-cliente',
  tipo_cobranca: 'Faturado',
  atendimento_presencial: true, // Usar valores locais
  // ... outros campos
};
```

**Melhorias recentes:**
- **Campo atendimento_presencial adicionado**: Novo campo booleano opcional que permite indicar quando um atendimento foi realizado presencialmente, fazendo com que o sistema use valores locais (com acréscimo de 10%) ao invés de valores remotos para cálculo de valores/hora

**Integração:**
- Utilizado pelos componentes de formulário de requerimentos
- Integra-se com schemas de validação Zod
- Usado pelos serviços de requerimentos para CRUD
- Constantes utilizadas em selects e validações
- Tipos utilizados para tipagem TypeScript em todo o sistema

---

### `planoAcao.ts`
Definições de tipos e interfaces para o sistema de planos de ação, incluindo gestão de prioridades, status e histórico de atualizações.

### `planoAcaoContatos.ts`
Definições de tipos e interfaces para o sistema de contatos com clientes em planos de ação, incluindo meios de contato, status de retorno e funções utilitárias.

**Tipos principais:**

**MeioContatoType**
```typescript
type MeioContatoType = 'whatsapp' | 'email' | 'ligacao';
```
Tipos de meio de contato disponíveis para comunicação com clientes.

**RetornoClienteType**
```typescript
type RetornoClienteType = 'aguardando' | 'respondeu' | 'solicitou_mais_informacoes';
```
Status do retorno do cliente após tentativa de contato.

**Interfaces principais:**

**PlanoAcaoContato**
Interface completa do contato com cliente:
- `id` - UUID do contato
- `plano_acao_id` - UUID do plano de ação relacionado
- `data_contato` - Data do contato (formato YYYY-MM-DD)
- `meio_contato` - Meio utilizado para contato
- `resumo_comunicacao` - Resumo do que foi comunicado
- `retorno_cliente` - Status do retorno do cliente (opcional)
- `observacoes` - Observações adicionais (opcional)
- `criado_por` - UUID do usuário que criou (opcional)
- `criado_em` - Data/hora de criação
- `atualizado_em` - Data/hora da última atualização

**PlanoAcaoContatoFormData**
Interface para dados do formulário de contato:
- `data_contato` - Data do contato
- `meio_contato` - Meio de contato utilizado
- `resumo_comunicacao` - Resumo da comunicação
- `retorno_cliente` - Status do retorno (opcional)
- `observacoes` - Observações adicionais (opcional)

**Constantes exportadas:**

**MEIO_CONTATO_CONTATOS_OPTIONS**
Array de opções para select de meios de contato:
```typescript
[
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'ligacao', label: 'Ligação' },
]
```

**RETORNO_CLIENTE_CONTATOS_OPTIONS**
Array de opções para select de status de retorno:
```typescript
[
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'solicitou_mais_informacoes', label: 'Solicitou Mais Informações' },
]
```

**Funções utilitárias:**
- `getMeioContatoLabel(meio)` - Retorna label amigável do meio de contato
- `getRetornoClienteLabel(retorno)` - Retorna label amigável do status de retorno
- `getMeioContatoIcon(meio)` - Retorna emoji apropriado para o meio de contato (📱 WhatsApp, 📧 Email, 📞 Ligação)

**Tipos principais:**

**PrioridadePlano**
```typescript
type PrioridadePlano = 'baixa' | 'media' | 'alta' | 'critica';
```
Níveis de prioridade disponíveis para planos de ação:
- `baixa` - Prioridade baixa
- `media` - Prioridade média
- `alta` - Prioridade alta
- `critica` - Prioridade crítica

**StatusPlano**
```typescript
type StatusPlano = 'aberto' | 'em_andamento' | 'aguardando_retorno' | 'concluido' | 'cancelado';
```
Status possíveis de um plano de ação:
- `aberto` - Plano criado mas ainda não iniciado
- `em_andamento` - Plano em execução
- `aguardando_retorno` - Aguardando resposta do cliente
- `concluido` - Plano finalizado com sucesso
- `cancelado` - Plano cancelado

**MeioContato**
```typescript
type MeioContato = 'whatsapp' | 'email' | 'ligacao';
```
Meios de contato disponíveis para comunicação com o cliente.

**RetornoCliente**
```typescript
type RetornoCliente = 'aguardando' | 'respondeu' | 'solicitou_mais_informacoes';
```
Status do retorno do cliente após contato.

**StatusFinal**
```typescript
type StatusFinal = 'resolvido' | 'nao_resolvido' | 'resolvido_parcialmente';
```
Status final da resolução do problema.

**TipoAtualizacao**
```typescript
type TipoAtualizacao = 'criacao' | 'atualizacao' | 'contato' | 'conclusao' | 'reabertura' | 'cancelamento';
```
Tipos de atualização registrados no histórico.

**Interfaces principais:**

**PlanoAcao**
Interface principal do plano de ação:
- `id` - UUID do plano de ação
- `pesquisa_id` - UUID da pesquisa de satisfação relacionada
- `chamado` - Número do chamado (opcional)
- `empresa_id` - UUID da empresa (opcional)
- `data_resposta` - Data de resposta da pesquisa (copiada para facilitar filtros, opcional)
- `comentario_cliente` - **NOVO**: Comentário do cliente (antigo descricao_acao_corretiva, opcional)
- `descricao_acao_corretiva` - **NOVO**: Descrição da ação corretiva (campo em branco para preenchimento)
- `acao_preventiva` - Ação preventiva para evitar recorrência (opcional)
- `prioridade` - Nível de prioridade do plano
- `status_plano` - Status atual do plano
- `data_inicio` - Data de início do plano
- `data_conclusao` - Data de conclusão (opcional)
- `data_primeiro_contato` - Data do primeiro contato com o cliente (opcional)
- `meio_contato` - Meio de contato utilizado (opcional)
- `resumo_comunicacao` - Resumo da comunicação com o cliente (opcional)
- `retorno_cliente` - Status do retorno do cliente (opcional)
- `status_final` - Status final da resolução (opcional)
- `data_fechamento` - Data de fechamento do plano (opcional)
- `justificativa_cancelamento` - Justificativa para cancelamento (opcional)
- `criado_por` - UUID do usuário que criou (opcional)
- `criado_em` - Data/hora de criação
- `atualizado_em` - Data/hora da última atualização

**PlanoAcaoHistorico**
Interface para histórico de alterações do plano:
- `id` - UUID do registro de histórico
- `plano_acao_id` - UUID do plano de ação relacionado
- `data_atualizacao` - Data/hora da atualização
- `usuario_id` - UUID do usuário que fez a atualização (opcional)
- `usuario_nome` - Nome do usuário (opcional)
- `descricao_atualizacao` - Descrição da alteração realizada
- `tipo_atualizacao` - Tipo da atualização (opcional)
- `criado_em` - Data/hora de criação do registro

**PlanoAcaoCompleto**
Interface estendida que inclui dados da pesquisa de satisfação relacionada:
- Herda todos os campos de `PlanoAcao`
- `pesquisa` - Objeto com dados da pesquisa relacionada:
  - `id` - UUID da pesquisa
  - `empresa` - Nome da empresa
  - `cliente` - Nome do cliente
  - `tipo_caso` - Tipo do chamado (opcional)
  - `nro_caso` - Número do chamado (opcional)
  - `comentario_pesquisa` - Comentário da pesquisa (opcional)
  - `resposta` - Nível de satisfação (opcional)

**PlanoAcaoFormData**
Interface para dados do formulário de criação/edição:
- `pesquisa_id` - UUID da pesquisa relacionada
- `chamado` - Número do chamado (opcional)
- `empresa_id` - UUID da empresa (opcional)
- `comentario_cliente` - **NOVO**: Comentário do cliente (opcional)
- `descricao_acao_corretiva` - **NOVO**: Descrição da ação corretiva (campo em branco)
- `acao_preventiva` - Ação preventiva (opcional)
- `prioridade` - Nível de prioridade
- `status_plano` - Status do plano (opcional)
- `data_inicio` - Data de início
- `data_conclusao` - Data de conclusão (opcional)
- `data_primeiro_contato` - Data do primeiro contato (opcional)
- `meio_contato` - Meio de contato (opcional)
- `resumo_comunicacao` - Resumo da comunicação (opcional)
- `retorno_cliente` - Status do retorno (opcional)
- `status_final` - Status final (opcional)
- `justificativa_cancelamento` - Justificativa para cancelamento (opcional)

**FiltrosPlanoAcao**
Interface para filtros de busca:
- `busca` - Busca textual (opcional)
- `prioridade` - Array de prioridades para filtrar (opcional)
- `status` - Array de status para filtrar (opcional)
- `empresa` - Filtro por empresa (opcional)
- `dataInicio` - Data inicial do período (opcional)
- `dataFim` - Data final do período (opcional)
- `mes` - Mês da data de resposta da pesquisa (1-12, opcional)
- `ano` - Ano da data de resposta da pesquisa (opcional)

**EstatisticasPlanoAcao**
Interface para estatísticas agregadas:
- `total` - Total de planos de ação
- `abertos` - Quantidade de planos abertos
- `em_andamento` - Quantidade de planos em andamento
- `aguardando_retorno` - Quantidade aguardando retorno
- `concluidos` - Quantidade de planos concluídos
- `cancelados` - Quantidade de planos cancelados
- `por_prioridade` - Estatísticas por nível de prioridade:
  - `baixa` - Quantidade com prioridade baixa
  - `media` - Quantidade com prioridade média
  - `alta` - Quantidade com prioridade alta
  - `critica` - Quantidade com prioridade crítica

**Constantes exportadas:**

**PRIORIDADE_OPTIONS**
Array de opções para select de prioridades:
```typescript
[
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]
```

**STATUS_PLANO_OPTIONS**
Array de opções para select de status:
```typescript
[
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'aguardando_retorno', label: 'Aguardando Retorno' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'cancelado', label: 'Cancelado' },
]
```

**MEIO_CONTATO_OPTIONS**
Array de opções para select de meios de contato:
```typescript
[
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
  { value: 'ligacao', label: 'Ligação' },
]
```

**RETORNO_CLIENTE_OPTIONS**
Array de opções para select de retorno do cliente:
```typescript
[
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'solicitou_mais_informacoes', label: 'Solicitou Mais Informações' },
]
```

**STATUS_FINAL_OPTIONS**
Array de opções para select de status final:
```typescript
[
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'nao_resolvido', label: 'Não Resolvido' },
  { value: 'resolvido_parcialmente', label: 'Resolvido Parcialmente' },
]
```

**Funções utilitárias:**

**getCorPrioridade()**
```typescript
getCorPrioridade(prioridade: PrioridadePlano): string
```
Retorna classes CSS para colorir badges de prioridade:
- `baixa` - Azul (bg-blue-100 text-blue-800)
- `media` - Amarelo (bg-yellow-100 text-yellow-800)
- `alta` - Laranja (bg-orange-100 text-orange-800)
- `critica` - Vermelho (bg-red-100 text-red-800)

**getCorStatus()**
```typescript
getCorStatus(status: StatusPlano): string
```
Retorna classes CSS para colorir badges de status:
- `aberto` - Cinza (bg-gray-100 text-gray-800)
- `em_andamento` - Azul (bg-blue-100 text-blue-800)
- `aguardando_retorno` - Amarelo (bg-yellow-100 text-yellow-800)
- `concluido` - Verde (bg-green-100 text-green-800)
- `cancelado` - Vermelho (bg-red-100 text-red-800)

**Uso típico:**
```typescript
import { 
  PlanoAcaoCompleto, 
  FiltrosPlanoAcao, 
  PRIORIDADE_OPTIONS,
  getCorPrioridade 
} from '@/types/planoAcao';

// Buscar planos com filtros
const filtros: FiltrosPlanoAcao = {
  mes: 12,
  ano: 2024,
  status: ['aberto', 'em_andamento']
};

// Trabalhar com plano completo
const plano: PlanoAcaoCompleto = {
  id: 'uuid',
  pesquisa_id: 'uuid-pesquisa',
  comentario_cliente: 'Cliente relatou problema com sistema',
  descricao_acao_corretiva: 'Implementar correção no módulo X',
  prioridade: 'alta',
  status_plano: 'em_andamento',
  data_inicio: '2024-12-01',
  criado_em: '2024-12-01T10:00:00Z',
  atualizado_em: '2024-12-01T10:00:00Z',
  pesquisa: {
    id: 'uuid-pesquisa',
    empresa: 'Empresa XYZ',
    cliente: 'Cliente ABC',
    resposta: 'Insatisfeito'
  }
};

// Obter cor para badge
const corPrioridade = getCorPrioridade('alta'); // bg-orange-100 text-orange-800
```

**Melhorias recentes:**
- **CORREÇÃO CRÍTICA**: Corrigido erro "Cannot access 'form' before initialization" movendo useEffect para depois da declaração do useForm
- **Reestruturação de campos**: Adicionado campo `comentario_cliente` (opcional) para armazenar comentário do cliente, e mantido `descricao_acao_corretiva` como campo em branco para preenchimento da ação corretiva
- **Separação de responsabilidades**: Campo `comentario_cliente` armazena informação vinda da pesquisa, enquanto `descricao_acao_corretiva` é preenchido pela equipe interna
- **Preenchimento automático**: Implementado useEffect que preenche automaticamente campos Chamado, Empresa e Comentário do Cliente quando dados da pesquisa estão disponíveis
- **Compatibilidade mantida**: Interface mantém todos os campos existentes, apenas adicionando novo campo opcional

**Integração:**
- Utilizado pelos componentes de formulário de planos de ação
- Integra-se com sistema de pesquisas de satisfação
- Usado pelos serviços de planos de ação para CRUD
- Constantes utilizadas em selects e validações
- Tipos utilizados para tipagem TypeScript em todo o sistema

**Uso típico:**
```typescript
import { 
  RequerimentoFormData, 
  TIPO_COBRANCA_OPTIONS, 
  requerValorHora 
} from '@/types/requerimentos';

// Verificar se tipo requer valor/hora
const precisaValor = requerValorHora('Faturado'); // true

// Usar em formulário
const formData: RequerimentoFormData = {
  chamado: 'INC123456',
  cliente_id: 'uuid-cliente',
  tipo_cobranca: 'Faturado',
  atendimento_presencial: true, // Usar valores locais
  // ... outros campos
};
```

**Melhorias recentes:**
- **Campo atendimento_presencial adicionado**: Novo campo booleano opcional que permite indicar quando um atendimento foi realizado presencialmente, fazendo com que o sistema use valores locais (com acréscimo de 10%) ao invés de valores remotos para cálculo de valores/hora

**Integração:**
- Utilizado pelos componentes de formulário de requerimentos
- Integra-se com schemas de validação Zod
- Usado pelos serviços de requerimentos para CRUD
- Constantes utilizadas em selects e validações
- Tipos utilizados para tipagem TypeScript em todo o sistema

---

## Diretório `src/utils/`

Utilitários e funções auxiliares utilizadas em todo o projeto.

### `horasUtils.ts`
Utilitário para conversão e manipulação de valores de horas em diferentes formatos (decimal, HH:MM, minutos).

**Funcionalidades:**
- Conversão de horas decimais para formato HH:MM
- Conversão de formato HH:MM para horas decimais
- Conversão de minutos para formato HH:MM
- Validação de formato de horas
- Arredondamento inteligente com precisão configurável
- Logs de debug para valores entre 0 e 10 horas (útil para troubleshooting)

**Funções principais:**
- `converterDeHorasDecimal(horasDecimal: number): string` - Converte número decimal para formato HH:MM com precisão aprimorada e logging de debug
- `converterParaHorasDecimal(horasString: string): number` - Converte string HH:MM para número decimal
- `converterMinutosParaHoras(minutos: number): string` - Converte minutos totais para formato HH:MM
- `validarFormatoHoras(valor: string): boolean` - Valida se string está no formato HH:MM correto

**Melhorias recentes:**
- Adicionado logging de debug para conversões de valores pequenos (0-10 horas)
- Melhorada precisão no arredondamento usando `Math.round` com multiplicação por 60
- Comentários explicativos sobre precisão de cálculo

**Uso típico:**
```typescript
// Converter 7.5 horas para "07:30"
const horasFormatadas = converterDeHorasDecimal(7.5);

// Converter "08:45" para 8.75
const horasDecimal = converterParaHorasDecimal("08:45");
```

---

### `requerimentosExportUtils.ts`
Utilitário para exportação de requerimentos em formatos Excel e PDF, com formatação profissional e totalizadores.

**Funcionalidades:**
- Exportação de requerimentos para Excel com duas abas (Não Enviados e Histórico)
- Exportação de requerimentos para PDF com layout profissional
- Formatação automática de horas, datas e valores monetários
- Totalizadores de valores por aba e geral
- Respeita filtros aplicados na interface (aba ativa, filtros de busca, período)

**Funções principais:**
- `exportarRequerimentosExcel(requerimentosNaoEnviados, requerimentosEnviados, estatisticas)` - Gera arquivo Excel com duas abas
- `exportarRequerimentosPDF(requerimentosNaoEnviados, requerimentosEnviados, estatisticas)` - Gera arquivo PDF com layout profissional

**Estrutura do Excel:**
- **Aba "Não Enviados"**: Requerimentos pendentes de envio
- **Aba "Histórico Enviados"**: Requerimentos já enviados
- **Colunas**: Chamado, Cliente, Módulo, Descrição, Linguagem, Valor/Hora Funcional, Valor/Hora Técnico, H.Func, H.Téc, Total, Data Envio, Data Aprov., Valor Total, Período Cobrança, Autor, Tipo Cobrança, Tickets, Observação
- **Formatação automática**:
  - Colunas de horas formatadas como `[h]:mm`
  - Colunas de valores formatadas como `R$ #,##0.00`
  - Larguras de colunas otimizadas para legibilidade
- **Totalizador**: Linha final com "TOTAL GERAL" e soma de valores

**Estrutura do PDF:**
- **Cabeçalho**: Título "Gerenciamento de Requerimentos" com data de geração
- **Caixa de resumo** (altura: 42mm): Estatísticas gerais no início do relatório:
  - Total de requerimentos
  - Requerimentos não enviados
  - Requerimentos enviados
  - Total de horas
  - Valor não enviados (R$)
  - Valor enviados (R$)
  - VALOR TOTAL destacado em azul Sonda (R$)
- **Seção "Requerimentos Não Enviados"**: Cards com dados completos de cada requerimento
- **Seção "Histórico - Requerimentos Enviados"**: Cards com dados completos de cada requerimento
- **Cards de requerimento** (altura: 50mm):
  - Linha 1: Chamado (título) + Tipo de cobrança (badge colorido)
  - Linha 2: Cliente + Módulo
  - Linha 2.5: Descrição
  - Linha 3: Linguagem + Valor/Hora Funcional + Valor/Hora Técnico
  - Linha 3.5: Horas (Funcional, Técnico, Total)
  - Linha 4: Data Envio + Data Aprovação + Valor Total + Tickets + Autor
  - Barra lateral colorida baseada no tipo de cobrança

**Formatação de dados:**
- Datas formatadas em pt-BR (DD/MM/YYYY)
- Horas formatadas em HH:MM
- Valores monetários formatados em R$ #.##0,00
- Cores do tema Sonda aplicadas (azul #2563eb)

**Melhorias recentes:**
- **Adicionadas colunas de Valor/Hora**: Incluídas colunas "Valor/Hora Funcional" e "Valor/Hora Técnico" nos relatórios Excel e PDF
- **Totalizador implementado**: Adicionada linha de totalizador no Excel e totalizadores de valores na caixa de resumo do PDF (início do relatório)
- **Respeita filtros**: Exportação agora considera a aba ativa e os filtros aplicados na interface
- **Layout aprimorado no PDF**: 
  - Aumentada altura do card de 45mm para 50mm para acomodar linha de valores/hora
  - Aumentada altura da caixa de resumo de 30mm para 42mm para incluir totalizadores de valores
  - Totalizadores movidos para o início do relatório (caixa de resumo) para melhor visualização

**Integração:**
- Utilizado pelo componente `RequerimentosExportButtons.tsx`
- Recebe dados filtrados da página `LancarRequerimentos.tsx`
- Utiliza `horasUtils.ts` para formatação de horas
- Utiliza `requerimentosColors.ts` para cores dos tipos de cobrança

**Uso típico:**
```typescript
// Exportar para Excel
const resultado = await exportarRequerimentosExcel(
  requerimentosNaoEnviados,
  requerimentosEnviados,
  estatisticas
);

// Exportar para PDF
const resultado = await exportarRequerimentosPDF(
  requerimentosNaoEnviados,
  requerimentosEnviados,
  estatisticas
);
```

---


---

## Diretório `supabase/migration/`

Arquivos de migração SQL para o banco de dados Supabase.

### `add_taxas_audit_triggers.sql`
Migração SQL para adicionar triggers de auditoria automática nas tabelas de taxas de clientes e taxas padrão, permitindo rastreamento completo de todas as operações CRUD.

**Funcionalidades principais:**
- **Trigger para taxas_clientes**: Registra automaticamente todas as operações (INSERT, UPDATE, DELETE) na tabela `taxas_clientes`
- **Trigger para taxas_padrao**: Registra automaticamente todas as operações (INSERT, UPDATE, DELETE) na tabela `taxas_padrao`
- **Verificação de dependências**: Valida se a função `audit_trigger_function()` existe antes de criar os triggers
- **Log da migração**: Registra a própria execução da migração na tabela `permission_audit_logs`
- **Verificação automática**: Conta e valida se os 2 triggers foram criados com sucesso

**Triggers criados:**
- `audit_taxas_clientes_trigger` - Trigger AFTER INSERT OR UPDATE OR DELETE na tabela `taxas_clientes`
- `audit_taxas_padrao_trigger` - Trigger AFTER INSERT OR UPDATE OR DELETE na tabela `taxas_padrao`

**Estrutura da migração:**
1. **Verificação de pré-requisitos**: Valida existência da função `audit_trigger_function()`
2. **Criação de triggers para taxas_clientes**:
   - Remove trigger existente se houver
   - Cria novo trigger vinculado à função de auditoria
3. **Criação de triggers para taxas_padrao**:
   - Remove trigger existente se houver
   - Cria novo trigger vinculado à função de auditoria
4. **Verificação**: Conta triggers criados e exibe mensagem de sucesso/warning
5. **Log da migração**: Insere registro na tabela de auditoria documentando a execução

**Dependências:**
- Requer função `audit_trigger_function()` criada pela migração `grups_and_profile_migration.sql`
- Requer tabela `permission_audit_logs` para armazenar os logs
- Requer tabelas `taxas_clientes` e `taxas_padrao` já existentes

**Logs gerados automaticamente:**
- **Criação**: "Taxa criada para cliente [nome] - Produto: [tipo] - Vigência: [início] a [fim]"
- **Edição**: "Taxa do cliente [nome] - [campo]: [valor antigo] → [valor novo]"
- **Exclusão**: "Taxa excluída do cliente [nome] - Produto: [tipo] - Vigência: [data]"

**Como executar:**

**Opção 1: Via Supabase Dashboard (Recomendado)**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Opção 2: Via CLI do Supabase**
```bash
supabase db push --file supabase/migration/add_taxas_audit_triggers.sql
```

**Opção 3: Via psql**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/add_taxas_audit_triggers.sql
```

**Verificação pós-execução:**
```sql
-- Verificar se os triggers foram criados
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname IN ('audit_taxas_clientes_trigger', 'audit_taxas_padrao_trigger');
```

**Rollback (se necessário):**
```sql
DROP TRIGGER IF EXISTS audit_taxas_clientes_trigger ON taxas_clientes;
DROP TRIGGER IF EXISTS audit_taxas_padrao_trigger ON taxas_padrao;
```

**Integração:**
- Logs visualizados na página `AuditLogs.tsx` com filtros específicos para "Taxas de Clientes" e "Taxas Padrão"
- Formatação de logs via `auditService.ts` com nomes amigáveis em português
- Exportação de logs para Excel/PDF via utilitários de exportação

**Melhorias recentes:**
- **Remoção de RAISE NOTICE redundantes**: Removidos comandos `RAISE NOTICE` individuais após criação de cada trigger, mantendo apenas a verificação consolidada no final
- **Código mais limpo**: Migração simplificada com mensagens de feedback centralizadas na seção de verificação
- **Melhor organização**: Estrutura mais clara com seções bem definidas e comentários explicativos

**Notas importantes:**
- Triggers executados automaticamente após cada operação
- Sem impacto significativo na performance
- Logs armazenados na tabela `permission_audit_logs`
- Apenas administradores podem visualizar logs de auditoria
- Documentação completa disponível em `README_TAXAS_AUDIT.md`

---

### `test_taxas_audit.sql`
Script SQL de teste e verificação para validar a criação e funcionamento dos triggers de auditoria nas tabelas de taxas. Útil para troubleshooting e validação da configuração de auditoria.

**Funcionalidades principais:**
- **Verificação de tabelas**: Valida se as tabelas `taxas_clientes` e `taxas_padrao` existem no banco
- **Verificação de função**: Valida se a função `audit_trigger_function()` está disponível
- **Remoção segura**: Remove triggers existentes antes de recriar (idempotente)
- **Criação de triggers**: Cria os triggers de auditoria para ambas as tabelas
- **Verificação de criação**: Conta e valida se os 2 triggers foram criados com sucesso
- **Listagem detalhada**: Exibe informações completas dos triggers criados (nome, tabela, status)

**Estrutura do script:**
1. **Verificação de tabelas**: Valida existência de `taxas_clientes` e `taxas_padrao`
2. **Verificação de função**: Valida existência de `audit_trigger_function()`
3. **Remoção de triggers**: Remove triggers existentes para evitar conflitos
4. **Criação de triggers**: Cria `audit_taxas_clientes_trigger` e `audit_taxas_padrao_trigger`
5. **Verificação de criação**: Conta triggers criados e exibe mensagem de sucesso/warning
6. **Listagem de triggers**: Exibe tabela com nome, tabela associada e status de cada trigger

**Mensagens de feedback:**
- `✓ Tabelas taxas_clientes e taxas_padrao existem` - Tabelas encontradas
- `✓ Função audit_trigger_function existe` - Função de auditoria disponível
- `✓ Ambos os triggers foram criados com sucesso!` - Triggers criados corretamente
- `⚠ Apenas X de 2 triggers foram criados` - Problema na criação de triggers

**Quando usar:**
- Após executar `add_taxas_audit_triggers.sql` para validar a instalação
- Para troubleshooting de problemas com auditoria de taxas
- Para recriar triggers em caso de problemas
- Para verificar o status atual dos triggers de auditoria

**Como executar:**

**Via Supabase Dashboard:**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/test_taxas_audit.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/test_taxas_audit.sql
```

**Saída esperada:**
```
NOTICE:  ✓ Tabelas taxas_clientes e taxas_padrao existem
NOTICE:  ✓ Função audit_trigger_function existe
NOTICE:  ✓ Ambos os triggers foram criados com sucesso!

 Nome do Trigger              | Tabela          | Status
------------------------------+-----------------+--------
 audit_taxas_clientes_trigger | taxas_clientes  | Ativo
 audit_taxas_padrao_trigger   | taxas_padrao    | Ativo
```

**Diferenças em relação ao add_taxas_audit_triggers.sql:**
- **Propósito**: Teste e validação vs. Migração de produção
- **Log de migração**: Não registra na tabela `permission_audit_logs`
- **Idempotência**: Pode ser executado múltiplas vezes sem efeitos colaterais
- **Feedback detalhado**: Exibe mais informações sobre o status dos triggers
- **Uso**: Desenvolvimento e troubleshooting vs. Deploy em produção

**Integração:**
- Complementa o arquivo `add_taxas_audit_triggers.sql`
- Útil para validar a configuração de auditoria
- Pode ser usado em ambientes de desenvolvimento e teste

---

### `fix_taxas_audit_triggers.sql`
Script SQL de correção para criar triggers de auditoria funcionais nas tabelas de taxas, com função específica para garantir compatibilidade e funcionamento correto.

**Funcionalidades principais:**
- **Remoção de triggers antigos**: Remove triggers existentes que possam estar com problemas
- **Função específica de auditoria**: Cria função `audit_taxas_trigger_function()` dedicada para taxas
- **Suporte a usuário nulo**: Trata casos onde não há usuário autenticado (auth.uid() retorna NULL)
- **Registro completo**: Captura operações INSERT, UPDATE e DELETE com dados completos
- **Verificação automática**: Valida se os 2 triggers foram criados com sucesso
- **Feedback detalhado**: Mensagens de sucesso e instruções para teste

**Estrutura do script:**
1. **Remoção de triggers antigos**: Remove `audit_taxas_clientes_trigger` e `audit_taxas_padrao_trigger` existentes
2. **Criação de função específica**: Cria `audit_taxas_trigger_function()` com lógica robusta:
   - Obtém ID do usuário atual via `auth.uid()`
   - Trata casos de usuário NULL
   - Registra operações DELETE com `old_values`
   - Registra operações UPDATE com `old_values` e `new_values`
   - Registra operações INSERT com `new_values`
   - Usa `SECURITY DEFINER` para garantir permissões adequadas
3. **Criação de triggers**: Cria triggers para ambas as tabelas usando a função específica
4. **Verificação**: Conta triggers criados e exibe mensagem de sucesso/warning

**Diferenças em relação ao add_taxas_audit_triggers.sql:**
- **Função dedicada**: Cria função específica `audit_taxas_trigger_function()` ao invés de usar a genérica
- **Tratamento de NULL**: Lida explicitamente com casos onde `auth.uid()` retorna NULL
- **Propósito**: Correção de problemas vs. Instalação inicial
- **Uso**: Quando a função genérica não funciona ou há problemas com triggers existentes

**Quando usar:**
- Quando os triggers criados por `add_taxas_audit_triggers.sql` não estão funcionando
- Quando há erros relacionados à função `audit_trigger_function()` genérica
- Para criar uma implementação independente e robusta de auditoria para taxas
- Em ambientes onde a função genérica não está disponível ou tem problemas

**Como executar:**

**Via Supabase Dashboard (Recomendado):**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/fix_taxas_audit_triggers.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/fix_taxas_audit_triggers.sql
```

**Saída esperada:**
```
NOTICE:  === TRIGGERS CRIADOS: 2 ===
NOTICE:  ✓ Triggers de auditoria criados com sucesso!
NOTICE:  Agora crie/edite uma taxa para testar
```

**Teste após execução:**
```sql
-- Criar uma taxa de teste
INSERT INTO taxas_clientes (cliente_id, tipo_produto, vigencia_inicio)
VALUES ('uuid-do-cliente', 'GALLERY', '2024-01-01');

-- Verificar se o log foi criado
SELECT * FROM permission_audit_logs 
WHERE table_name = 'taxas_clientes' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Rollback (se necessário):**
```sql
DROP TRIGGER IF EXISTS audit_taxas_clientes_trigger ON taxas_clientes;
DROP TRIGGER IF EXISTS audit_taxas_padrao_trigger ON taxas_padrao;
DROP FUNCTION IF EXISTS audit_taxas_trigger_function();
```

**Vantagens da função específica:**
- **Independência**: Não depende de outras funções do sistema
- **Robustez**: Tratamento explícito de casos especiais (usuário NULL)
- **Manutenibilidade**: Código isolado e fácil de debugar
- **Segurança**: Usa `SECURITY DEFINER` para garantir permissões adequadas

**Integração:**
- Alternativa ao `add_taxas_audit_triggers.sql` quando há problemas
- Pode ser usado em conjunto com `test_taxas_audit.sql` para validação
- Logs visualizados na página `AuditLogs.tsx` normalmente
- Formatação via `auditService.ts` funciona da mesma forma

**Notas importantes:**
- Script é idempotente (pode ser executado múltiplas vezes)
- Remove triggers antigos antes de criar novos
- Função específica não interfere com outras funções de auditoria do sistema
- Recomendado testar após execução criando/editando uma taxa

---

### `add_valores_taxas_audit_triggers.sql`
Script SQL para adicionar trigger de auditoria na tabela de valores de taxas por função, permitindo rastreamento de alterações nos valores específicos de cada função (Funcional, Técnico, ABAP, DBA, Gestor).

**Funcionalidades principais:**
- **Trigger para valores_taxas_funcoes**: Registra automaticamente todas as operações (INSERT, UPDATE, DELETE) na tabela `valores_taxas_funcoes`
- **Reutilização de função**: Utiliza a função `audit_taxas_trigger_function()` já existente (criada por `fix_taxas_audit_triggers.sql`)
- **Verificação automática**: Valida se o trigger foi criado com sucesso
- **Feedback claro**: Mensagens de sucesso ou warning sobre a criação do trigger

**Trigger criado:**
- `audit_valores_taxas_funcoes_trigger` - Trigger AFTER INSERT OR UPDATE OR DELETE na tabela `valores_taxas_funcoes`

**Estrutura do script:**
1. **Remoção de trigger antigo**: Remove `audit_valores_taxas_funcoes_trigger` se existir
2. **Criação de trigger**: Cria novo trigger vinculado à função `audit_taxas_trigger_function()`
3. **Verificação**: Valida se o trigger foi criado e exibe mensagem de sucesso/warning

**Dependências:**
- Requer função `audit_taxas_trigger_function()` criada pela migração `fix_taxas_audit_triggers.sql`
- Requer tabela `permission_audit_logs` para armazenar os logs
- Requer tabela `valores_taxas_funcoes` já existente

**Logs gerados automaticamente:**
- **Criação**: "Valor criado para função [nome] - Taxa: [taxa_id] - Tipo: [remota/local] - Valor: R$ [valor]"
- **Edição**: "Valor da função [nome] - [campo]: [valor antigo] → [valor novo]"
- **Exclusão**: "Valor excluído da função [nome] - Taxa: [taxa_id] - Tipo: [remota/local]"

**Quando usar:**
- Após executar `fix_taxas_audit_triggers.sql` para estender auditoria aos valores por função
- Para rastrear alterações específicas nos valores de cada função (Funcional, Técnico, etc.)
- Para complementar a auditoria das tabelas principais de taxas

**Como executar:**

**Via Supabase Dashboard (Recomendado):**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/add_valores_taxas_audit_triggers.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/add_valores_taxas_audit_triggers.sql
```

**Saída esperada:**
```
NOTICE:  ✓ Trigger de auditoria criado para valores_taxas_funcoes
```

**Verificação pós-execução:**
```sql
-- Verificar se o trigger foi criado
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'audit_valores_taxas_funcoes_trigger';
```

**Teste após execução:**
```sql
-- Criar um valor de teste
INSERT INTO valores_taxas_funcoes (taxa_id, funcao, tipo_valor, valor_base)
VALUES ('uuid-da-taxa', 'Funcional', 'remota', 150.00);

-- Verificar se o log foi criado
SELECT * FROM permission_audit_logs 
WHERE table_name = 'valores_taxas_funcoes' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Rollback (se necessário):**
```sql
DROP TRIGGER IF EXISTS audit_valores_taxas_funcoes_trigger ON valores_taxas_funcoes;
```

**Integração:**
- Complementa os triggers de `taxas_clientes` e `taxas_padrao`
- Logs visualizados na página `AuditLogs.tsx` (pode requerer adição de filtro específico)
- Formatação via `auditService.ts` (pode requerer mapeamento de nome amigável)
- Utiliza a mesma função de auditoria das tabelas principais

**Notas importantes:**
- Script é idempotente (pode ser executado múltiplas vezes)
- Remove trigger antigo antes de criar novo
- Requer que `fix_taxas_audit_triggers.sql` tenha sido executado primeiro
- Permite rastreamento granular de alterações em valores por função

---

### `add_campos_especificos_clientes_taxas.sql`
Migração SQL para adicionar campos específicos por cliente na tabela `taxas_clientes`, permitindo configuração de valores personalizados baseados no nome abreviado da empresa.

**Funcionalidades principais:**
- **Adição de 7 campos específicos**: Adiciona colunas para valores de tickets e excedentes específicos por cliente
- **Campos condicionais**: Campos aparecem baseado no `nome_abreviado` da empresa selecionada
- **Documentação completa**: Comentários SQL explicando qual cliente usa cada campo
- **Verificação automática**: Valida se todas as 7 colunas foram criadas com sucesso
- **Feedback detalhado**: Mensagens de sucesso listando todos os campos criados

**Campos adicionados:**
- `valor_ticket` - Valor do Ticket (usado por VOTORANTIM e CSN)
- `valor_ticket_excedente` - Valor do Ticket Excedente (usado por VOTORANTIM e CSN)
- `ticket_excedente_simples` - Ticket Excedente - Ticket Simples (usado por EXXONMOBIL)
- `ticket_excedente_complexo` - Ticket Excedente - Ticket Complexo (usado por EXXONMOBIL)
- `ticket_excedente_1` - Ticket Excedente (campo 1) (usado por CHIESI)
- `ticket_excedente_2` - Ticket Excedente (campo 2) (usado por CHIESI)
- `ticket_excedente` - Ticket Excedente (usado por NIDEC)

**Estrutura do script:**
1. **Adição de colunas**: Adiciona 7 campos DECIMAL(10,2) com `IF NOT EXISTS` para segurança
2. **Documentação**: Adiciona comentários SQL explicando o uso de cada campo
3. **Verificação**: Conta colunas criadas e exibe feedback detalhado

**Mapeamento por cliente:**
- **VOTORANTIM**: `valor_ticket`, `valor_ticket_excedente`
- **CSN**: `valor_ticket`, `valor_ticket_excedente`
- **EXXONMOBIL**: `ticket_excedente_simples`, `ticket_excedente_complexo`
- **CHIESI**: `ticket_excedente_1` (Ticket Base), `ticket_excedente_2` (Ticket Excedente)
- **NIDEC**: `ticket_excedente`

**Como executar:**

**Via Supabase Dashboard (Recomendado):**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/add_campos_especificos_clientes_taxas.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/add_campos_especificos_clientes_taxas.sql
```

**Saída esperada:**
```
NOTICE:  ✅ Todos os 7 campos específicos por cliente foram criados com sucesso!
NOTICE:     - valor_ticket (VOTORANTIM, CSN)
NOTICE:     - valor_ticket_excedente (VOTORANTIM, CSN)
NOTICE:     - ticket_excedente_simples (EXXONMOBIL)
NOTICE:     - ticket_excedente_complexo (EXXONMOBIL)
NOTICE:     - ticket_excedente_1 (CHIESI)
NOTICE:     - ticket_excedente_2 (CHIESI)
NOTICE:     - ticket_excedente (NIDEC)
```

**Verificação pós-execução:**
```sql
-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'taxas_clientes' 
AND column_name IN (
    'valor_ticket', 'valor_ticket_excedente', 
    'ticket_excedente_simples', 'ticket_excedente_complexo',
    'ticket_excedente_1', 'ticket_excedente_2', 'ticket_excedente'
)
ORDER BY column_name;
```

**Integração:**
- Utilizado pelos componentes de formulário de taxas para exibir campos condicionais
- Permite configuração específica de valores por cliente
- Suporta diferentes modelos de cobrança por empresa
- Integra-se com sistema de auditoria existente

**Notas importantes:**
- Script é idempotente (pode ser executado múltiplas vezes)
- Campos são opcionais (nullable) para manter compatibilidade
- Tipo DECIMAL(10,2) suporta valores até 99.999.999,99
- Comentários SQL facilitam manutenção e documentação

---

### `add_comentario_cliente_simple.sql`
Script SQL simples para adicionar o campo `comentario_cliente` na tabela `planos_acao`, permitindo armazenar comentários específicos do cliente separadamente da descrição da ação corretiva.

**Funcionalidades principais:**
- **Adição de coluna**: Adiciona campo `comentario_cliente` do tipo TEXT na tabela `planos_acao`
- **Verificação automática**: Valida se a coluna foi criada com sucesso
- **Operação segura**: Usa `IF NOT EXISTS` para evitar erros se coluna já existir
- **Feedback imediato**: Exibe informações da coluna criada (nome e tipo de dados)

**Estrutura do script:**
1. **Adição da coluna**: `ALTER TABLE planos_acao ADD COLUMN IF NOT EXISTS comentario_cliente TEXT`
2. **Verificação**: Query para confirmar criação da coluna consultando `information_schema.columns`

**Campo criado:**
- `comentario_cliente` - Campo TEXT opcional para armazenar comentários específicos do cliente

**Propósito do campo:**
- **Separação de responsabilidades**: Campo `comentario_cliente` armazena informação vinda da pesquisa de satisfação
- **Campo `descricao_acao_corretiva`**: Mantido como campo em branco para preenchimento da ação corretiva pela equipe interna
- **Melhor organização**: Permite distinguir entre feedback do cliente e plano de ação da equipe

**Como executar:**

**Via Supabase Dashboard:**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/add_comentario_cliente_simple.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/add_comentario_cliente_simple.sql
```

**Saída esperada:**
```
 column_name        | data_type
--------------------+-----------
 comentario_cliente | text
```

**Integração:**
- Utilizado pelos componentes de planos de ação (`PlanoAcaoForm.tsx`, `PlanoAcaoDetalhes.tsx`)
- Campo opcional que pode ser preenchido automaticamente com dados da pesquisa relacionada
- Melhora organização dos dados separando feedback do cliente de ações internas

**Notas importantes:**
- Script é idempotente (pode ser executado múltiplas vezes)
- Campo opcional (permite valores NULL)
- Não afeta dados existentes na tabela
- Complementa funcionalidade de planos de ação com melhor estruturação de dados

---

### `create_plano_acao_contatos.sql`
Migração SQL completa para criar tabela de histórico de contatos com clientes em planos de ação, permitindo registro de múltiplos contatos por plano com detalhes completos de comunicação.

**Funcionalidades principais:**
- **Criação de tabela**: Cria tabela `plano_acao_contatos` para armazenar histórico de contatos
- **Relacionamento com planos**: Foreign key para `planos_acao` com CASCADE DELETE
- **Validação de dados**: Constraints CHECK para garantir valores válidos em campos enum
- **Índices de performance**: Índices otimizados para consultas por plano e data
- **Segurança RLS**: Row Level Security habilitado com políticas completas
- **Triggers automáticos**: Trigger para atualização automática de timestamp
- **Comentários explicativos**: Documentação completa da estrutura da tabela

**Estrutura da tabela:**
- `id` - UUID primary key gerado automaticamente
- `plano_acao_id` - UUID referenciando planos_acao (NOT NULL, CASCADE DELETE)
- `data_contato` - Data do contato (NOT NULL)
- `meio_contato` - Meio utilizado (whatsapp, email, ligacao) com CHECK constraint
- `resumo_comunicacao` - Resumo do que foi comunicado (NOT NULL)
- `retorno_cliente` - Status do retorno (aguardando, respondeu, solicitou_mais_informacoes) com CHECK constraint
- `observacoes` - Observações adicionais (opcional)
- `criado_por` - UUID do usuário que criou o registro
- `criado_em` - Timestamp de criação (default NOW())
- `atualizado_em` - Timestamp de atualização (default NOW())

**Índices criados:**
- `idx_plano_acao_contatos_plano_id` - Índice por plano_acao_id para consultas rápidas
- `idx_plano_acao_contatos_data` - Índice por data_contato DESC para ordenação cronológica

**Políticas RLS:**
- **SELECT**: Usuários podem ver todos os contatos
- **INSERT**: Usuários podem inserir novos contatos
- **UPDATE**: Usuários podem atualizar contatos existentes
- **DELETE**: Usuários podem deletar contatos

**Trigger implementado:**
- `update_plano_acao_contatos_updated_at()` - Função que atualiza automaticamente o campo `atualizado_em`
- `trigger_update_plano_acao_contatos_updated_at` - Trigger BEFORE UPDATE que executa a função

**Validações de dados:**
- `meio_contato` deve ser um dos valores: 'whatsapp', 'email', 'ligacao'
- `retorno_cliente` deve ser um dos valores: 'aguardando', 'respondeu', 'solicitou_mais_informacoes'
- `data_contato` e `resumo_comunicacao` são obrigatórios
- `plano_acao_id` deve referenciar um plano existente

**Como executar:**

**Via Supabase Dashboard (Recomendado):**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/create_plano_acao_contatos.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/create_plano_acao_contatos.sql
```

**Saída esperada:**
```
NOTICE: ✅ Tabela plano_acao_contatos criada com sucesso
NOTICE:    - Políticas RLS configuradas
NOTICE:    - Triggers de timestamp criados
NOTICE:    - Índices para performance criados
```

**Integração:**
- Utilizada pelos componentes de planos de ação para registrar histórico de contatos
- Permite rastreamento completo de todas as comunicações com o cliente
- Suporta múltiplos contatos por plano de ação com detalhes específicos
- Integra-se com sistema de autenticação para rastreamento de usuário criador

**Casos de uso:**
- Registrar tentativas de contato com cliente
- Documentar respostas e feedback do cliente
- Acompanhar evolução da comunicação ao longo do tempo
- Gerar relatórios de efetividade de contatos
- Manter histórico completo para auditoria

**Notas importantes:**
- Script é idempotente (pode ser executado múltiplas vezes)
- Relacionamento CASCADE DELETE remove contatos quando plano é excluído
- RLS garante segurança de acesso aos dados
- Índices otimizam performance para consultas frequentes
- Triggers mantêm timestamps atualizados automaticamente

---

### `setup_plano_acao_contatos_completo.sql`
Migração SQL completa para implementar o sistema de histórico de contatos múltiplos para planos de ação, substituindo o sistema de contato único anterior.

**Funcionalidades principais:**
- **Migração completa em 7 passos**: Executa todas as migrações necessárias para implementar o sistema de contatos múltiplos
- **Adição de campos**: Adiciona campos faltantes na tabela `planos_acao` (chamado, comentario_cliente, empresa_id)
- **Criação de tabela**: Cria tabela `plano_acao_contatos` para armazenar histórico de contatos
- **Índices de performance**: Cria índices otimizados para consultas por plano e data
- **Segurança RLS**: Configura Row Level Security com políticas completas
- **Triggers automáticos**: Cria trigger para atualização automática de timestamp
- **Documentação**: Adiciona comentários explicativos na estrutura da tabela
- **Verificação final**: Valida se migração foi executada com sucesso
- **Sintaxe SQL corrigida**: Comandos `RAISE NOTICE` encapsulados em blocos `DO` nomeados para compatibilidade com diferentes versões do PostgreSQL

**Estrutura da migração:**
1. **PASSO 1**: Adiciona campos faltantes na tabela `planos_acao`
2. **PASSO 2**: Cria tabela `plano_acao_contatos` com estrutura completa
3. **PASSO 3**: Cria índices para performance
4. **PASSO 4**: Configura Row Level Security (RLS)
5. **PASSO 5**: Cria triggers para atualização de timestamp
6. **PASSO 6**: Adiciona comentários explicativos
7. **PASSO 7**: Executa verificação final e exibe resultado

**Como executar:**

**Via Supabase Dashboard (Recomendado):**
```
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Clique em New Query
4. Copie e cole o conteúdo do arquivo
5. Clique em Run
```

**Via CLI do Supabase:**
```bash
supabase db push --file supabase/migration/setup_plano_acao_contatos_completo.sql
```

**Via psql:**
```bash
psql -h [host] -U postgres -d postgres -f supabase/migration/setup_plano_acao_contatos_completo.sql
```

**Saída esperada:**
```
NOTICE: 🔧 PASSO 1: Adicionando campos faltantes na tabela planos_acao...
NOTICE: ✅ Campos verificados/adicionados: 3
NOTICE: 🔧 PASSO 2: Criando tabela plano_acao_contatos...
NOTICE: 🔧 PASSO 3: Criando índices...
NOTICE: 🔧 PASSO 4: Configurando segurança (RLS)...
NOTICE: 🔧 PASSO 5: Criando triggers...
NOTICE: 🔧 PASSO 6: Adicionando documentação...
NOTICE: 🔧 PASSO 7: Verificação final...
NOTICE: ✅ MIGRAÇÃO COMPLETA EXECUTADA COM SUCESSO!
NOTICE: 🎉 Sistema de contatos múltiplos pronto para uso!
```

**Melhorias recentes:**
- **Correção de sintaxe SQL**: Comandos `RAISE NOTICE` agora são encapsulados em blocos `DO` nomeados (ex: `$passo7$`) para garantir compatibilidade com diferentes versões do PostgreSQL
- **Melhor compatibilidade**: Script funciona corretamente em ambientes Supabase e PostgreSQL standalone
- **Execução mais robusta**: Eliminados possíveis erros de sintaxe em diferentes configurações de banco
- **Blocos nomeados**: Uso de delimitadores nomeados (`$passo7$`) melhora legibilidade e debugging do código SQL

**Integração:**
- Substitui completamente o sistema de contato único anterior
- Utilizada pelos componentes `ContatosList` e `ContatoForm` para gerenciamento de contatos
- Permite rastreamento completo de todas as comunicações com clientes
- Integra-se com sistema de autenticação para rastreamento de usuário criador

**Notas importantes:**
- Script é idempotente (pode ser executado múltiplas vezes)
- Executa verificação automática de sucesso da migração
- Relacionamento CASCADE DELETE remove contatos quando plano é excluído
- RLS garante segurança de acesso aos dados
- Índices otimizam performance para consultas frequentes

---


---

### `src/components/admin/requerimentos/`

Componentes relacionados ao gerenciamento de requerimentos.

#### `TipoCobrancaBloco.tsx`
Componente de bloco reutilizável para gerenciamento de tipos de cobrança em requerimentos, permitindo múltiplos tipos de cobrança em um único requerimento com busca automática de taxas e preenchimento de valores.

**Última atualização**: Removido campo `atendimento_presencial` do componente - funcionalidade de seleção entre valores remotos e locais agora é gerenciada exclusivamente no formulário principal de requerimentos (`RequerimentoForm.tsx`), simplificando a interface do bloco e evitando duplicação de controles.

**Funcionalidades principais:**
- **Bloco de tipo de cobrança**: Seção individual representando um tipo de cobrança específico
- **Organização em seções**: Interface dividida em 3 seções lógicas com títulos descritivos
- **Campos condicionais**: Exibe campos específicos baseados no tipo de cobrança selecionado
- **Integração com InputHoras**: Suporte a formato HH:MM para entrada de horas
- **Remoção de blocos**: Permite remover blocos quando há mais de um tipo de cobrança
- **Validação de tipos disponíveis**: Filtra tipos de cobrança baseado na empresa selecionada
- **Visual hierárquico**: Layout com seções bem definidas e espaçamento consistente (space-y-6)
- **Indicadores visuais coloridos**: Cada tipo de cobrança exibe um círculo colorido no Select para identificação rápida
- **Período de cobrança por bloco**: Campo de Mês/Ano de Cobrança permite especificar período específico para cada tipo de cobrança
- **Busca automática de taxas**: Busca taxa vigente do cliente automaticamente quando cliente é selecionado
- **Preenchimento automático de valores**: Preenche valores/hora baseado na taxa vigente, linguagem e tipo de cobrança

**Interfaces exportadas:**

**TipoCobrancaBlocoData**
```typescript
{
  id: string;                      // Identificador único do bloco
  tipo_cobranca: string;           // Tipo de cobrança selecionado
  horas_funcional: string | number; // Horas funcionais (HH:MM ou decimal)
  horas_tecnico: string | number;   // Horas técnicas (HH:MM ou decimal)
  valor_hora_funcional?: number;    // Valor/hora funcional (opcional)
  valor_hora_tecnico?: number;      // Valor/hora técnico (opcional)
  tipo_hora_extra?: string;         // Tipo de hora extra (condicional)
  quantidade_tickets?: number;      // Quantidade de tickets (condicional)
  horas_analise_ef?: string | number; // Horas de análise EF (condicional)
  mes_cobranca?: string;            // Mês de cobrança no formato MM/YYYY (opcional)
}
```

**Props do componente:**
- `bloco: TipoCobrancaBlocoData` - Dados do bloco de tipo de cobrança
- `index: number` - Índice do bloco na lista
- `tiposDisponiveis: typeof TIPO_COBRANCA_OPTIONS` - Tipos de cobrança disponíveis filtrados
- `onUpdate: (id: string, campo: string, valor: any) => void` - Callback para atualizar campo do bloco
- `onRemove: (id: string) => void` - Callback para remover bloco
- `canRemove: boolean` - Flag indicando se o bloco pode ser removido
- `empresaTipoCobranca?: string` - Tipo de cobrança da empresa selecionada
- `clienteId?: string` - UUID do cliente selecionado (para busca de taxa vigente)
- `linguagem?: string` - Linguagem selecionada (para mapeamento de função na taxa)

**Hooks utilizados:**
- `useEffect` - Busca automática de taxa vigente quando cliente ou tipo de cobrança mudam
- `useState` - Gerenciamento de estado local (taxaVigente, carregandoTaxa)
- `useRef` - Referências mutáveis para controle de preenchimento automático e prevenção de loops infinitos:
  - `valoresAnterioresRef`: Armazena valores anteriores de funcional e técnico para comparação
  - Permite detectar mudanças reais nos valores e evitar re-preenchimentos desnecessários
  - Resetado quando não há dados suficientes para preencher valores

**Serviços utilizados:**
- `buscarTaxaVigente` - Serviço de `taxasClientesService` para buscar taxa vigente do cliente
- `calcularValores` - Função de `@/types/taxasClientes` para cálculo de valores derivados

**Estados gerenciados:**
- `taxaVigente: TaxaClienteCompleta | null` - Taxa vigente do cliente selecionado
- `carregandoTaxa: boolean` - Estado de loading durante busca de taxa
- `valoresAnterioresRef.current`: Objeto ref com valores anteriores para controle de preenchimento:
  - `funcional?: number` - Último valor funcional preenchido
  - `tecnico?: number` - Último valor técnico preenchido

**Estrutura visual em seções:**

**1. Cabeçalho (condicional):**
- Exibido apenas quando `canRemove = true`
- Título: "📋 Tipo de Cobrança {index + 1}"
- Botão de remover alinhado à direita (ghost, size sm, ícone Trash2)

**2. Seção "Controle de Horas":**
- Título: "📊 Controle de Horas" (h4 text-sm font-semibold mb-3 com ícone Calculator h-4 w-4)
- Grid responsivo (1 coluna mobile, 3 colunas desktop)
- Campos:
  - **Horas Funcional**: InputHoras com formato HH:MM (obrigatório)
  - **Horas Técnico**: InputHoras com formato HH:MM (obrigatório)
  - **Total de Horas**: Campo calculado automaticamente (read-only) com texto auxiliar "Calculado automaticamente"
    - **Cálculo dual**: Mantém dois valores calculados para diferentes propósitos:
      - `horasTotalDecimal`: Soma em formato decimal (usado para cálculos de valor total)
      - `horasTotalStr`: Soma em formato HH:MM (usado para exibição ao usuário)
    - **Conversão inteligente**: Converte valores de entrada para string antes de somar:
      - `horasFuncionalStr`: Mantém formato string se já for string, converte para string se for número
      - `horasTecnicoStr`: Mantém formato string se já for string, converte para string se for número
    - **Soma em HH:MM**: Utiliza função `somarHoras()` de `@/utils/horasUtils` para somar corretamente no formato HH:MM
    - **Exibição formatada**: Usa `formatarHorasParaExibicao(horasTotalStr, 'completo')` para exibir total formatado
    - **Suporte a múltiplos formatos**: Aceita entrada em formato HH:MM ou decimal, sempre exibe em HH:MM

**3. Seção "Informações de Cobrança":**
- Título: "Informações de Cobrança"
- Grid responsivo (1 coluna mobile, 2 colunas desktop)
- Campos:
  - **Tipo de Cobrança**: Select com tipos disponíveis (obrigatório)
    - Cada opção exibe círculo colorido (h-3 w-3 rounded-full) com cor específica do tipo
    - Cores obtidas via função `getCorTipoCobranca()` importada de `@/utils/requerimentosColors`
    - Layout: flex items-center gap-2 (círculo + texto)
  - **Mês/Ano de Cobrança**: MonthYearPicker para seleção de período (opcional)
    - Formato: MM/YYYY
    - Permite datas futuras (allowFuture: true)
    - Placeholder: "Selecione mês e ano (opcional)"
  - **Tipo de Hora Extra**: Select condicional (exibido quando tipo_cobranca = "Hora Extra")
  - **Quantidade de Tickets**: Input numérico condicional (exibido quando empresaTipoCobranca = "Banco de Horas")
  - **Horas de Análise EF**: InputHoras condicional (exibido quando tipo_cobranca = "Reprovado")

**4. Seção "Valores/Hora" (condicional):**
- Exibida quando tipo de cobrança requer valores (Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
- Grid responsivo (1 coluna mobile, 3 colunas desktop)
- Borda superior (border-t) para separação visual
- Campos:
  - **Valor/Hora Funcional**: Input numérico com formatação monetária
  - **Valor/Hora Técnico**: Input numérico com formatação monetária
  - **Valor Total**: Campo calculado automaticamente (read-only)

**Componentes UI utilizados:**
- `div` - Containers com classes de espaçamento (space-y-6 no container principal, space-y-2 nos campos)
- `h4` - Títulos de seção com estilo text-sm font-semibold (mb-3 para espaçamento)
- `Select` - Seleção de tipo de cobrança e tipo de hora extra
  - SelectItem customizado com indicador visual colorido (círculo + texto)
- `Input` - Campos numéricos (valores/hora, quantidade de tickets)
- `InputHoras` - Campos de horas com formato HH:MM
- `MonthYearPicker` - Seletor de mês/ano para período de cobrança
- `Button` - Botão de remoção do bloco (variant ghost, size sm)
- `Label` - Labels dos campos
- `p` - Texto auxiliar (text-xs text-muted-foreground)

**Ícones utilizados (lucide-react):**
- `Trash2` - Ícone do botão de remover bloco

**Utilitários importados:**
- `getCorTipoCobranca` - Função de `@/utils/requerimentosColors` que retorna classe CSS de cor baseada no tipo de cobrança
- `cn` - Função de `@/lib/utils` para concatenação condicional de classes CSS

**Campos exibidos condicionalmente:**
- **tipo_hora_extra**: Exibido quando tipo_cobranca = "Hora Extra"
- **quantidade_tickets**: Exibido quando empresaTipoCobranca = "Banco de Horas"
- **horas_analise_ef**: Exibido quando tipo_cobranca = "Reprovado"
- **Seção de Valores/Hora completa**: Exibida quando tipo de cobrança requer valores (Faturado, Hora Extra, Sobreaviso, Bolsão Enel)

**Integração:**
- Utilizado em formulários de requerimentos que suportam múltiplos tipos de cobrança
- Integra-se com constantes `TIPO_COBRANCA_OPTIONS` e `TIPO_HORA_EXTRA_OPTIONS` de `@/types/requerimentos`
- Utiliza utilitários `formatarHorasParaExibicao` e `converterParaHorasDecimal` de `@/utils/horasUtils`
- Integra-se com serviço `taxasClientesService` para busca de taxas vigentes
- Utiliza tipos e funções de `@/types/taxasClientes` para cálculo de valores
- Exportado via `src/components/admin/requerimentos/index.ts`

**Funcionalidades de busca e preenchimento automático:**
- **Busca de taxa vigente**: Ao receber `clienteId` via props, busca automaticamente a taxa vigente do cliente
- **Validação de necessidade**: Só busca taxa quando tipo de cobrança requer valores/hora (Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
- **Preenchimento automático inteligente**: Preenche `valor_hora_funcional` e `valor_hora_tecnico` baseado na taxa vigente e linguagem selecionada
  - **Controle de preenchimento via useRef**: Utiliza `valoresAnterioresRef` para rastrear valores anteriores e evitar loops infinitos
  - **Logging detalhado de estado**: Console logs mostrando valores atuais, valores na ref e estado da taxa para facilitar debug
  - **Reset de ref**: Limpa valores anteriores quando não há dados suficientes para preencher
  - **Prevenção de loops**: Só preenche valores quando realmente necessário, comparando com valores anteriores armazenados na ref
  - **Otimização de dependências**: Removido `valoresEditadosManualmente` das dependências do useEffect de preenchimento para evitar loops infinitos desnecessários
- **Controle de edição manual**: Sistema que detecta quando usuário edita valores manualmente e preserva essas alterações:
  - **Estado `valoresEditadosManualmente`**: Rastreia se campos funcional e técnico foram editados pelo usuário (para indicadores visuais)
  - **Ref `valoresEditadosManualmenteRef`**: Referência mutável que controla o preenchimento automático sem causar re-renderizações
  - **Função `handleValorEditadoManualmente()`**: Marca campo como editado manualmente quando usuário altera valor (atualiza tanto estado quanto ref)
  - **Preservação de valores personalizados**: Preenchimento automático verifica `valoresEditadosManualmenteRef.current` antes de preencher
  - **Reset automático**: Flags de edição manual são resetadas apenas quando contexto principal muda (cliente, linguagem, tipo de cobrança) - removido `tipo_hora_extra` das dependências para evitar reset desnecessário
- **Limpeza automática para Hora Extra**: Quando tipo de cobrança é "Hora Extra" mas tipo de hora extra não está selecionado:
  - Limpa automaticamente os campos `valor_hora_funcional` e `valor_hora_tecnico` (define como undefined)
  - Reseta `valoresAnterioresRef` para permitir novo preenchimento quando tipo for selecionado
  - Logging claro indicando limpeza de campos (⚠️ e 🧹)
  - Garante que valores só sejam preenchidos quando tipo de hora extra específico for selecionado
  - Melhora consistência de dados evitando valores incorretos quando tipo não está definido
- **Mapeamento inteligente de linguagem para função**: Sistema robusto que mapeia linguagem selecionada para linha correspondente na tabela de taxas:
  - **REGRA FUNDAMENTAL**: 
    - **Valor/Hora Funcional**: SEMPRE usa linha "Funcional" da taxa
    - **Valor/Hora Técnico**: Usa linha correspondente à LINGUAGEM selecionada
  - **Mapeamento por linguagem**:
    - **Funcional** → Linha "Técnico / ABAP" (GALLERY) ou "Técnico (Instalação / Atualização)" (OUTROS)
    - **Técnico** → Linha "Técnico / ABAP" (GALLERY) ou "Técnico (Instalação / Atualização)" (OUTROS)
    - **ABAP ou PL/SQL** → Linha "Técnico / ABAP" (GALLERY) ou "ABAP - PL/SQL" (OUTROS)
    - **DBA** → Linha "DBA / Basis" (GALLERY) ou "DBA" (OUTROS)
    - **Gestor** → Linha "Gestor" (ambos os tipos de produto)
  - **Logging detalhado e estruturado**: Console logs explicativos mostrando funções mapeadas e explicação do mapeamento para facilitar debug:
    - 🔍 Buscando valores na taxa com lista de valores_remota disponíveis
    - 📊 Funções disponíveis na taxa (array de nomes de funções)
    - 🔍 Funções sendo procuradas (funcaoFuncional e funcaoTecnico)
    - 💰 Valores encontrados para cada função
    - ✅ Estrutura completa dos valores em formato JSON (indentação de 2 espaços)
    - ❌ Mensagens de erro detalhadas quando valores não são encontrados, incluindo comparação entre funções procuradas e disponíveis
- **Cálculo de valores**: Utiliza função `calcularValores` para obter valores derivados baseados no tipo de cobrança
- **Atualização dinâmica controlada**: Atualiza valores quando tipo de cobrança ou tipo de hora extra mudam, mas com controle via ref para evitar loops infinitos

**Uso típico:**
```typescript
<TipoCobrancaBloco
  bloco={blocoData}
  index={0}
  tiposDisponiveis={tiposCobrancaFiltrados}
  onUpdate={handleUpdateBloco}
  onRemove={handleRemoveBloco}
  canRemove={blocos.length > 1}
  empresaTipoCobranca={empresaSelecionada?.tipo_cobranca}
/>
```

**Melhorias recentes:**
- **Logging detalhado para debug de inputs**: Implementado logging consistente para ambos os campos de valor/hora (funcional e técnico):
  - **Input Funcional**: Console logs com emoji 🔍 mostrando valor bruto, tipo e valor formatado
  - **Input Técnico**: Console logs com emoji 🔍 mostrando valor bruto, tipo e valor formatado (NOVO)
  - **Formatação robusta**: Tratamento de valores `undefined` e `null` convertendo para string vazia
  - **Debug facilitado**: Permite rastrear problemas com formatação e exibição de valores nos inputs
  - **Consistência**: Ambos os campos agora têm o mesmo padrão de logging para troubleshooting
- **Sistema de controle de edição manual otimizado**: Refinado sistema para detectar e preservar valores editados manualmente pelo usuário:
  - **Estado `valoresEditadosManualmente`**: Objeto com flags `{ funcional: boolean; tecnico: boolean }` que rastreia se cada campo foi editado pelo usuário (usado para indicadores visuais)
  - **Ref `valoresEditadosManualmenteRef`**: Referência mutável `{ funcional: boolean; tecnico: boolean }` que controla o preenchimento automático sem causar re-renderizações
  - **Função `handleValorEditadoManualmente(campo)` aprimorada**: Callback que marca campo específico como editado manualmente quando usuário altera valor:
    - **Logging detalhado e estruturado**: Console logs organizados com emojis destacados (🔥🔥🔥) e informações completas:
      - Campo sendo editado
      - ID do bloco para rastreamento
      - Estado anterior da ref (antes da alteração)
      - Estado novo da ref (após alteração)
      - Estado visual atualizado para indicadores
    - **Atualização dupla**: Atualiza tanto ref (controle de preenchimento) quanto estado (indicadores visuais)
    - **Debug facilitado**: Logging estruturado permite rastrear facilmente quando e como valores são marcados como editados manualmente
  - **Integração nos inputs**: Ambos os campos de valor/hora (funcional e técnico) agora chamam `handleValorEditadoManualmente()` no onChange
  - **Preservação inteligente**: Preenchimento automático verifica `valoresEditadosManualmenteRef.current` antes de preencher, não sobrescrevendo valores personalizados
  - **Reset contextual**: Flags são resetadas automaticamente apenas quando cliente, linguagem ou tipo de cobrança principal mudam (novo contexto = permite novo preenchimento automático) - removido `tipo_hora_extra` para evitar reset desnecessário
  - **Logging aprimorado**: Console logs indicam quando valores são mantidos por terem sido editados manualmente
  - **UX melhorada**: Usuário pode personalizar valores sem medo de serem sobrescritos pelo sistema
  - **Performance otimizada**: Uso de ref para controle de preenchimento evita loops infinitos e re-renderizações desnecessárias
- **Limpeza aprimorada de campos para Hora Extra com logging otimizado**: Refinada validação e logging que limpa automaticamente os campos de valores/hora quando tipo de cobrança é "Hora Extra" mas o tipo específico de hora extra não foi selecionado:
  - Verifica se `tipo_hora_extra` está vazio antes de preencher valores
  - **Limpeza para zero**: Campos `valor_hora_funcional` e `valor_hora_tecnico` agora são zerados (0) ao invés de undefined
  - **Validação inteligente refinada**: Usa operador `&&` para verificar se há valor preenchido (truthy check + diferente de 0)
  - **Logging detalhado e estruturado**: Console logs organizados em níveis:
    - ⚠️ Alerta inicial quando tipo de hora extra não está selecionado
    - Exibição dos valores atuais de Funcional e Técnico (indentados com espaços)
    - 🧹 Confirmação em MAIÚSCULAS quando inicia limpeza dos campos
    - Exibição da transformação de valores (ex: "Funcional: 150 → 0")
    - ✅ Mensagem de confirmação quando campos já estão limpos
  - **Limpeza sempre em conjunto**: Ambos os campos (funcional e técnico) são sempre limpos juntos para consistência
  - Reseta `valoresAnterioresRef` para `{ funcional: 0, tecnico: 0 }` permitindo novo preenchimento quando tipo for selecionado
  - Retorna early do useEffect evitando preenchimento com valores incorretos
  - Garante que usuário veja campos zerados até selecionar tipo específico (17h30-19h30, Após 19h30, Fim de Semana)
  - Melhora UX ao fornecer feedback visual claro de que tipo de hora extra é obrigatório
  - Previne inconsistências de dados ao evitar valores de hora extra sem tipo definido
  - **Melhor compatibilidade**: Uso de 0 ao invés de undefined evita problemas com cálculos e validações
  - **Debug facilitado**: Logging estruturado permite rastrear facilmente o fluxo de limpeza e identificar quando campos já estão no estado correto
- **Sistema de controle de preenchimento automático implementado**: Adicionado `useRef` para rastrear valores anteriores e evitar loops infinitos:
  - `valoresAnterioresRef` armazena últimos valores de funcional e técnico preenchidos
  - **setTimeout implementado**: Usa `setTimeout` no useEffect para garantir que edições manuais sejam processadas antes do preenchimento automático
  - **Controle de timing aprimorado**: Evita conflitos entre atualizações de estado (`valoresEditadosManualmente`) e ref (`valoresEditadosManualmenteRef`)
  - Logging detalhado mostrando valores atuais do bloco, valores na ref e estado da taxa
  - Reset automático da ref quando não há dados suficientes para preencher valores
  - Previne re-preenchimentos desnecessários comparando valores atuais com valores anteriores
  - Melhora estabilidade do componente eliminando loops infinitos de atualização
  - Facilita debug com logs estruturados mostrando estado completo do controle de preenchimento
- **Correção de indentação no código de preenchimento**: Corrigida indentação do bloco de preenchimento automático de valores/hora para melhor legibilidade:
  - Código de preenchimento de `valor_hora_funcional` e `valor_hora_tecnico` agora com indentação consistente
  - Melhora manutenibilidade e legibilidade do código sem alterar funcionalidade
  - Facilita leitura e debug do fluxo de preenchimento automático
- **Logging granular de valores base**: Adicionados console logs específicos para valores base no tipo de cobrança "Faturado":
  - 📊 Log do valor base funcional (`valorFuncaoFuncional.valor_base`)
  - 📊 Log do valor base técnico (`valorFuncaoTecnico.valor_base`)
  - Facilita debug de problemas com valores específicos de hora normal
  - Permite verificar valores exatos antes do arredondamento
  - Complementa logging existente com informações mais detalhadas
- **Logging detalhado de busca de valores**: Aprimorados console logs no processo de busca de valores na taxa:
  - 🔍 Log de início da busca com valores_remota disponíveis
  - 📊 Lista de funções disponíveis na taxa (array de nomes)
  - 🔍 Funções sendo procuradas (funcaoFuncional e funcaoTecnico)
  - 💰 Valores encontrados para cada função
  - ✅ Estrutura completa dos valores em formato JSON com indentação (2 espaços)
  - ❌ Mensagens de erro detalhadas quando valores não são encontrados, incluindo comparação entre funções procuradas e disponíveis
  - Facilita troubleshooting de problemas com mapeamento de funções e valores da taxa
  - Permite verificar estrutura exata dos dados retornados do banco
- **Mapeamento de linguagem aprimorado com suporte completo**: Refinado sistema de mapeamento de linguagem para função na taxa:
  - **Documentação detalhada**: Adicionados comentários explicativos em cada caso do mapeamento para facilitar manutenção
  - **Suporte à linguagem Gestor**: Implementado mapeamento específico para linguagem "Gestor" → linha "Gestor" na taxa
  - **Logging aprimorado**: Console log expandido mostrando explicação clara do mapeamento (ex: "Valor/Hora Funcional usa linha 'Funcional', Valor/Hora Técnico usa linha 'Técnico / ABAP'")
  - **Regra fundamental documentada**: Comentário no código reforçando que Valor/Hora Funcional SEMPRE usa linha "Funcional" e Valor/Hora Técnico usa linha correspondente à linguagem
  - **Cobertura completa**: Todos os tipos de linguagem (Funcional, Técnico, ABAP, PL/SQL, DBA, Gestor) agora têm mapeamento explícito
- **Cálculo dual de horas totais implementado**: Refatorado cálculo de horas totais para manter dois valores distintos:
  - `horasTotalDecimal`: Soma em formato decimal para cálculos de valor total (precisão matemática)
  - `horasTotalStr`: Soma em formato HH:MM para exibição ao usuário (legibilidade)
  - Conversão inteligente de valores de entrada para string antes de somar com `somarHoras()`
  - Garante que soma de horas seja feita corretamente no formato HH:MM, evitando erros de arredondamento
  - Melhora precisão ao calcular valores monetários usando formato decimal
  - Melhora legibilidade ao exibir horas no formato HH:MM familiar ao usuário
- **Atualização dinâmica de valores implementada**: Modificado comportamento do preenchimento automático para sempre atualizar valores quando tipo de cobrança ou tipo de hora extra mudam:
  - Removida verificação de campos vazios (`!bloco.valor_hora_funcional || bloco.valor_hora_funcional === 0`)
  - Valores agora são recalculados automaticamente ao trocar tipo de cobrança ou tipo de hora extra
  - Melhora UX ao permitir que usuário veja valores atualizados imediatamente ao mudar configurações
  - Comentários atualizados para refletir novo comportamento: "Sempre atualizar valores quando tipo de cobrança ou tipo de hora extra mudar"
- **Busca automática de taxas implementada**: Adicionados imports de `useEffect`, `useState` e serviços de taxas para implementar funcionalidade completa de busca automática de taxas vigentes
  - Import de `buscarTaxaVigente` de `@/services/taxasClientesService`
  - Import de tipos `TaxaClienteCompleta` e `TipoFuncao` de `@/types/taxasClientes`
  - Import de função `calcularValores` de `@/types/taxasClientes`
  - Preparação para implementar preenchimento automático de valores/hora baseado na taxa do cliente
- **Indicadores visuais coloridos no Select**: Adicionados círculos coloridos (h-3 w-3 rounded-full) em cada opção do Select de tipo de cobrança para identificação visual rápida
  - Cores obtidas via função `getCorTipoCobranca()` de `@/utils/requerimentosColors`
  - Layout flex com gap-2 entre círculo e texto
  - Melhora significativa na usabilidade ao permitir identificação rápida por cor
- **Campo de Mês/Ano de Cobrança adicionado**: Novo campo usando MonthYearPicker para especificar período de cobrança por bloco
  - Formato MM/YYYY para consistência com outros campos de período
  - Campo opcional (placeholder: "Selecione mês e ano (opcional)")
  - Permite datas futuras (allowFuture: true)
  - Posicionado após o campo de Tipo de Cobrança na seção "Informações de Cobrança"
- **Reorganização em seções lógicas**: Interface dividida em 3 seções bem definidas (Controle de Horas, Informações de Cobrança, Valores/Hora) com títulos descritivos e emojis visuais
- **Hierarquia visual aprimorada**: Espaçamento aumentado de space-y-4 para space-y-6 no container principal para melhor separação entre seções
- **Títulos de seção consistentes**: Todos os títulos com estilo text-sm font-semibold e mb-3 para espaçamento uniforme
- **Cabeçalho condicional**: Título e botão de remover exibidos apenas quando `canRemove = true`, reduzindo poluição visual quando há apenas um bloco
- **Seção de horas destacada**: "Controle de Horas" como primeira seção com ícone 📊, enfatizando a entrada principal de dados
- **Campo de total aprimorado**: Total de horas com texto auxiliar "Calculado automaticamente" para clareza
- **Agrupamento lógico**: Campos condicionais agrupados na seção "Informações de Cobrança" para melhor organização
- **Separação visual clara**: Seção de Valores/Hora com borda superior (border-t) para delimitar visualmente do restante do formulário
- **Melhor usabilidade**: Fluxo de preenchimento mais intuitivo (horas → tipo de cobrança → valores) seguindo ordem lógica de trabalho
- **Reset inteligente de flags aprimorado**: Refinado sistema de reset de flags de edição manual com lógica mais conservadora e logging detalhado:
  - **Validação de valores significativos**: Agora considera valores > 1 como "significativos" ao invés de > 0, evitando reset quando há valores reais preenchidos
  - **Logging estruturado e detalhado**: Console logs organizados mostrando:
    - 🔄 Avaliação da necessidade de reset com dados do contexto (clienteId, linguagem, tipo_cobranca)
    - Valores atuais dos campos (funcional, tecnico) para análise
    - Flags atuais de edição manual para comparação
    - ✅ Confirmação quando reseta flags com justificativa
    - ⏭️ Explicação quando mantém flags com detalhes dos valores significativos
  - **Lógica mais conservadora**: Reset só ocorre quando não há valores significativos (> 1) preenchidos
  - **Preservação inteligente**: Mantém flags quando há valores reais, evitando perda de personalizações do usuário
  - **Debug facilitado**: Logging estruturado permite rastrear facilmente quando e por que flags são resetadas ou mantidas
  - **UX aprimorada**: Comportamento mais previsível ao preservar valores editados manualmente mesmo com mudanças menores de contexto
  - Removido `bloco.tipo_hora_extra` das dependências do useEffect para evitar reset desnecessário
  - Evita reset desnecessário quando usuário apenas seleciona tipo de hora extra
  - Permite que usuário personalize valores e depois selecione tipo de hora extra sem perder alterações
- **Otimização de dependências do useEffect de preenchimento**: Removido `valoresEditadosManualmente` das dependências do useEffect de preenchimento automático para evitar loops infinitos:
  - Estado `valoresEditadosManualmente` não precisa disparar novo preenchimento automático
  - Preenchimento é controlado pelos dados principais (taxa, linguagem, tipo de cobrança)
  - Flags de edição manual são verificadas dentro do useEffect sem precisar ser dependência
  - Melhora estabilidade do componente eliminando re-execuções desnecessárias
  - **Comentário explicativo**: "Removido valoresEditadosManualmente das dependências" para documentar a otimização
- **Otimização final de dependências implementada**: Aplicada otimização definitiva no useEffect de preenchimento automático:
  - Removido `valoresEditadosManualmente` do array de dependências do useEffect principal
  - Comentário explicativo adicionado na linha do useEffect para documentar a mudança
  - Elimina loops infinitos causados por mudanças no estado de edição manual
  - Preenchimento automático agora é disparado apenas por mudanças nos dados essenciais (taxa, linguagem, tipo de cobrança, tipo de hora extra)
  - Flags de edição manual são consultadas dentro do useEffect sem causar re-execuções
  - **Resultado**: Componente mais estável e performático, sem re-renderizações desnecessárias
- **Sobrescrita forçada para mudanças de tipo de hora extra**: Implementado useEffect específico que força recálculo de valores quando tipo de hora extra muda em requerimentos "Hora Extra":
  - **Disparo específico**: Só executa quando `bloco.tipo_hora_extra` muda e tipo de cobrança é "Hora Extra"
  - **Reset completo de flags**: Reseta tanto `valoresEditadosManualmenteRef` quanto `valoresEditadosManualmente` para permitir novo preenchimento automático
  - **Logging claro**: Console log indicando "FORÇANDO SOBRESCRITA" com o novo tipo de hora extra selecionado
  - **UX aprimorada**: Garante que valores sejam sempre atualizados quando usuário muda entre tipos de hora extra (17h30-19h30, Após 19h30, Fim de Semana)
  - **Comportamento intuitivo**: Usuário vê valores corretos imediatamente ao selecionar tipo específico de hora extra
  - **Dependência isolada**: Array de dependências contém apenas `[bloco.tipo_hora_extra]` para execução precisa
  - **Comentário explicativo**: "CORREÇÃO: Forçar sobrescrita de valores manuais quando tipo de hora extra mudar em 'Hora Extra'"
  - **Simplificação recente**: Removida lógica de preenchimento imediato inline, mantendo apenas reset de flags para permitir que o useEffect principal execute o preenchimento automático

**Notas:**
- Componente em desenvolvimento (implementação parcial)
- Projetado para suportar cenários onde um requerimento pode ter múltiplos tipos de cobrança
- Facilita gerenciamento de horas e valores por tipo de cobrança

---

#### `RequerimentoMultiploForm.tsx`
Formulário avançado para cadastro de requerimentos com suporte a múltiplos tipos de cobrança em um único requerimento, permitindo gerenciamento flexível de horas e valores por tipo.

**Última atualização**: Removido campo `atendimento_presencial` do componente `TipoCobrancaBloco` - funcionalidade de seleção entre valores remotos e locais agora é gerenciada exclusivamente no formulário principal (`RequerimentoForm.tsx`), simplificando a interface dos blocos.

**Funcionalidades principais:**
- **Múltiplos tipos de cobrança**: Suporte a múltiplos blocos de tipos de cobrança em um único requerimento
- **Gerenciamento de blocos**: Adicionar, remover e atualizar blocos de tipos de cobrança dinamicamente
- **Limpeza automática de campos**: Remove valores de campos não aplicáveis quando tipo de cobrança muda
- **Validação de blocos**: Garante pelo menos um bloco de tipo de cobrança presente
- **Filtragem inteligente**: Filtra tipos de cobrança disponíveis baseado no tipo de cobrança da empresa
- **Integração com TipoCobrancaBloco**: Utiliza componente reutilizável para renderizar cada bloco

**Estados gerenciados:**
- `chamado`: Número do chamado
- `clienteId`: UUID do cliente selecionado
- `modulo`: Módulo do sistema
- `descricao`: Descrição do requerimento
- `linguagem`: Linguagem selecionada (Funcional, Técnico, ABAP, DBA, Gestor)
- `mesCobranca`: Mês de cobrança (MM/YYYY)
- `observacao`: Observações gerais
- `blocos`: Array de blocos de tipos de cobrança (`TipoCobrancaBlocoData[]`)

**Estrutura de bloco inicial:**
```typescript
{
  id: crypto.randomUUID(),
  tipo_cobranca: 'Banco de Horas',
  horas_funcional: 0,
  horas_tecnico: 0
}
```

**Hooks utilizados:**
- `useState` - Gerenciamento de estado local (campos do formulário e blocos)
- `useMemo` - Otimização de performance para cliente selecionado e filtragem de opções

**Computed values (useMemo):**

**clienteSelecionado:**
- Busca dados completos do cliente selecionado na lista de clientes
- Retorna `null` se não houver cliente selecionado ou lista vazia
- Usado para acessar propriedades do cliente (ex: `tipo_cobranca`)

**tipoCobrancaOptionsFiltradas:**
- Filtra opções de tipo de cobrança baseado no tipo de cobrança da empresa
- Se empresa tem tipo "outros", remove opção "Banco de Horas"
- Mantém todas as opções para empresas com tipo "Banco de Horas"
- Retorna `TIPO_COBRANCA_OPTIONS` completo se não houver cliente selecionado

**Funções principais:**

**handleAdicionarBloco():**
- Cria novo bloco de tipo de cobrança com ID único (crypto.randomUUID())
- Bloco inicial com tipo "Banco de Horas" e horas zeradas
- Adiciona bloco ao array de blocos existentes

**handleRemoverBloco(id: string):**
- Remove bloco específico pelo ID
- Valida se há pelo menos um bloco antes de remover
- Exibe toast de erro se tentar remover o último bloco
- Filtra array de blocos removendo o bloco com ID correspondente

**handleAtualizarBloco(id: string, campo: string, valor: any):**
- Atualiza campo específico de um bloco pelo ID usando função de callback para otimização de estado
- Implementa lógica de limpeza automática quando campo é `tipo_cobranca`:
  - **Limpeza de valores/hora**: Remove `valor_hora_funcional` e `valor_hora_tecnico` quando tipo NÃO requer valores (tipos válidos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
  - **Limpeza de tipo_hora_extra**: Remove quando tipo NÃO é "Hora Extra"
  - **Limpeza de quantidade_tickets**: Remove quando tipo NÃO é "Banco de Horas"
  - **Limpeza de horas_analise_ef**: Remove quando tipo NÃO é "Reprovado"
- Usa `setBlocos(prevBlocos => ...)` para evitar dependências desnecessárias e melhorar performance
- Mapeia array de blocos atualizando apenas o bloco correspondente

**Lógica de limpeza de campos condicionais:**
```typescript
if (campo === 'tipo_cobranca') {
  const tiposComValorHora = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
  
  if (!tiposComValorHora.includes(valor)) {
    blocoAtualizado.valor_hora_funcional = undefined;
    blocoAtualizado.valor_hora_tecnico = undefined;
  }
  
  if (valor !== 'Hora Extra') {
    blocoAtualizado.tipo_hora_extra = undefined;
  }
  
  if (valor !== 'Banco de Horas') {
    blocoAtualizado.quantidade_tickets = undefined;
  }
  
  if (valor !== 'Reprovado') {
    blocoAtualizado.horas_analise_ef = undefined;
  }
}
```

**Tipos utilizados:**
- `TipoCobrancaBlocoData` - Interface do bloco de tipo de cobrança (importada de `TipoCobrancaBloco.tsx`)
- `TIPO_COBRANCA_OPTIONS` - Constante com opções de tipos de cobrança (importada de `@/types/requerimentos`)

**Integração:**
- Utiliza componente `TipoCobrancaBloco` para renderizar cada bloco
- Passa `clienteId` e `linguagem` para cada bloco permitindo busca automática de taxas
- Integra-se com constantes de tipos de cobrança de `@/types/requerimentos`
- Utiliza sistema de notificações via toast (sonner)
- Exportado via `src/components/admin/requerimentos/index.ts`

**Validações:**
- Pelo menos um bloco de tipo de cobrança obrigatório
- Validação de campos condicionais por tipo de cobrança
- Limpeza automática de campos não aplicáveis

**Estrutura visual:**
- **Card principal**: Envolve todo o formulário com CardHeader e CardContent
  - **CardHeader refinado**: Padding reduzido (pb-3) para visual mais compacto
  - **Título compacto**: text-base (reduzido do padrão) com ícone e badge de tipo de cobrança
  - **CardContent otimizado**: Padding superior removido (pt-0) e espaçamento interno aumentado (space-y-6)
  - **Visual minimalista**: Menos espaço desperdiçado, mais foco no conteúdo do formulário
- **Seção Chamado e Cliente**: Grid responsivo (1 coluna mobile, 2 colunas desktop) com gap-4
  - Comentário de seção simplificado: `{/* Chamado e Cliente */}`
  - Comentários inline de campos removidos para código mais limpo
- **Separador superior**: Separator com margem vertical (my-6) antes da seção de tipos de cobrança
- **Container de blocos**: div com space-y-6 para espaçamento consistente entre elementos
- **Título da seção**: h3 com "Tipos de Cobrança" em text-lg font-semibold
- **Separadores entre blocos**: Separator com margem vertical (my-4) entre cada bloco (exceto antes do primeiro)
- **Botão de adicionar**: Botão outline com borda tracejada (border-dashed border-2) em largura total
- **Hierarquia clara**: Estrutura aninhada corretamente dentro do Card para melhor organização visual
- **Totalizador Geral**: Card com estilo refinado e minimalista exibindo resumo dos blocos:
  - **Estilo do Card**: Sem fundo colorido (removido bg-blue-50 border-blue-200), usando estilo padrão
  - **CardHeader**: Padding reduzido (pb-3) com título em text-base e ícone Calculator (h-4 w-4)
  - **CardContent**: Sem padding superior (pt-0) para melhor compactação
  - **Grid responsivo**: 3 colunas (1 em mobile, 3 em desktop) com gap-4
  - **Campos exibidos**:
    - **Total de Horas**: Label em text-xs text-muted-foreground, valor em text-lg font-semibold
    - **Total de Valores**: Label em text-xs text-muted-foreground, valor em text-lg font-semibold text-green-600
    - **Requerimentos a Criar**: Label em text-xs text-muted-foreground, valor em text-lg font-semibold
  - **Tipografia refinada**: Tamanhos reduzidos (text-xs para labels, text-lg para valores) para visual mais compacto e profissional
  - **Cores sutis**: Removidas cores azuis fortes, usando text-muted-foreground para labels e mantendo apenas verde para valores monetários

**Melhorias recentes:**
- **Otimização de gerenciamento de estado**: Refatorada função `handleAtualizarBloco` para usar callback no `setBlocos`:
  - Usa `setBlocos(prevBlocos => ...)` ao invés de acessar estado diretamente
  - Evita dependências desnecessárias no array de dependências de useEffect
  - Melhora performance ao evitar re-renderizações desnecessárias
  - Segue melhores práticas do React para atualizações de estado baseadas no estado anterior
- **Remoção do campo atendimento presencial**: Removido checkbox de atendimento presencial do componente para simplificar interface:
  - Funcionalidade de seleção entre valores remotos/locais agora é gerenciada exclusivamente no formulário principal (`RequerimentoForm.tsx`)
  - Evita duplicação de controles e confusão na interface
  - Mantém funcionalidade centralizada no formulário principal de requerimentos
  - Interface mais limpa e focada nos dados específicos do bloco de tipo de cobrança
- **Integração com busca automática de taxas**: Adicionadas props `clienteId` e `linguagem` ao componente `TipoCobrancaBloco` para habilitar:
  - Busca automática de taxa vigente do cliente selecionado em cada bloco
  - Preenchimento automático de valores/hora baseado na taxa, linguagem e tipo de cobrança
  - Sincronização de dados entre formulário pai e blocos filhos
  - Permite que cada bloco tenha acesso aos dados necessários para buscar e preencher valores automaticamente
- **Refinamento visual do Totalizador Geral**: Aplicado estilo minimalista e compacto ao card de totalizador:
  - Removido fundo colorido (bg-blue-50 border-blue-200) para visual mais limpo
  - Reduzido padding do CardHeader (pb-3) e removido padding superior do CardContent (pt-0)
  - Diminuído tamanho do ícone Calculator (h-4 w-4) e título (text-base)
  - Reduzido tamanho das labels (text-xs text-muted-foreground) e valores (text-lg font-semibold)
  - Mantida cor verde apenas para valores monetários (text-green-600)
  - Visual mais profissional e menos chamativo, focando na informação essencial
- **Correção estrutural crítica**: Removidos fechamentos duplicados de `</CardContent>` e `</Card>` que estavam causando erro de estrutura HTML
  - Seção de Tipos de Cobrança agora está corretamente dentro do CardContent
  - Hierarquia de elementos corrigida para estrutura HTML válida
  - Fechamento do Card ocorre apenas no final do formulário
- **Refinamento visual do Card principal**: 
  - Título simplificado de "Informações Básicas (Compartilhadas)" para "Informações Básicas"
  - Espaçamento do CardContent aumentado de space-y-4 para space-y-6 para melhor respiração visual
  - Comentários de seção otimizados: mantido apenas `{/* Chamado e Cliente */}` no nível de seção
  - Removidos comentários inline redundantes de campos individuais para código mais limpo
- **Organização visual aprimorada**: Seção de tipos de cobrança agora está dentro do Card principal com CardContent, mantendo consistência visual com outras seções do formulário
- **Separadores entre blocos**: Adicionados Separators com margem vertical (my-4) entre cada bloco de tipo de cobrança para melhor delimitação visual
- **Espaçamento otimizado**: Container de blocos usa space-y-6 para espaçamento consistente entre título, blocos e botão de adicionar
- **Separador superior destacado**: Separator antes da seção com margem vertical maior (my-6) para separação clara das seções anteriores
- **Sistema de blocos implementado**: Estrutura completa para gerenciar múltiplos tipos de cobrança em um único requerimento
- **Limpeza automática de campos**: Implementada lógica robusta que remove valores de campos não aplicáveis quando tipo de cobrança muda
- **Filtragem inteligente**: Opções de tipo de cobrança filtradas baseado no tipo de cobrança da empresa selecionada
- **Validação de blocos**: Garante que sempre haja pelo menos um bloco presente com feedback via toast

**Uso típico:**
```typescript
// Renderizar blocos de tipos de cobrança
{blocos.map((bloco, index) => (
  <TipoCobrancaBloco
    key={bloco.id}
    bloco={bloco}
    index={index}
    tiposDisponiveis={tipoCobrancaOptionsFiltradas}
    onUpdate={handleAtualizarBloco}
    onRemove={handleRemoverBloco}
    canRemove={blocos.length > 1}
    empresaTipoCobranca={clienteSelecionado?.tipo_cobranca}
    clienteId={clienteId}
    linguagem={linguagem}
  />
))}
```

**Notas:**
- Componente em desenvolvimento ativo
- Projetado para cenários complexos onde um requerimento pode ter múltiplos tipos de cobrança
- Facilita gerenciamento granular de horas e valores por tipo de cobrança
- Lógica de limpeza automática garante consistência de dados

---

#### `index.ts`
Arquivo de exportação centralizada dos componentes do diretório de requerimentos, facilitando importações em outras partes do projeto.

**Exportações:**
- `RequerimentoForm` - Formulário completo para cadastro e edição de requerimentos individuais
- `RequerimentoMultiploForm` - Formulário avançado com suporte a múltiplos tipos de cobrança
- `TipoCobrancaBloco` - Componente de bloco reutilizável para gerenciamento de tipos de cobrança
- `RequerimentoCard` - Card de exibição de requerimento individual
- `RequerimentosTable` - Tabela de listagem de requerimentos
- `RequerimentosTableFaturamento` - Tabela especializada para faturamento
- `RequerimentosExportButtons` - Botões de exportação (Excel/PDF)

**Uso típico:**
```typescript
import { 
  RequerimentoForm, 
  RequerimentoMultiploForm,
  TipoCobrancaBloco,
  RequerimentosTable 
} from '@/components/admin/requerimentos';
```

**Melhorias recentes:**
- **Adicionadas novas exportações**: Incluídos `RequerimentoMultiploForm` e `TipoCobrancaBloco` para suportar funcionalidade de múltiplos tipos de cobrança em um único requerimento

---

#### `RequerimentoForm.tsx`
Formulário completo para cadastro e edição de requerimentos, com validação via Zod, cálculo automático de valores e integração com taxas de clientes.

**Última atualização**: Movido campo `atendimento_presencial` para a seção "Tipo de Cobrança" e tornado condicional - agora é exibido apenas quando o tipo de cobrança requer valores/hora (Faturado, Hora Extra, Sobreaviso, Bolsão Enel), melhorando a relevância contextual do campo.

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de requerimentos com todos os campos necessários
- **Validação robusta**: Validação de dados usando Zod schema (`RequerimentoFormSchema`)
- **Integração com empresas**: Select dinâmico com lista de empresas ordenadas alfabeticamente
- **Busca automática de taxas**: Carrega taxa vigente do cliente selecionado automaticamente
- **Preenchimento automático de valores**: Preenche valores/hora baseado na taxa vigente, linguagem e tipo de cobrança
- **Cálculo automático de totais**: Calcula valor total baseado em horas e valores/hora
- **Limpeza automática de campos condicionais**: Remove valores de campos não aplicáveis ao tipo de cobrança selecionado
- **Conversão de horas**: Suporte a formato HH:MM e decimal para horas
- **Campos condicionais**: Exibe campos específicos baseados no tipo de cobrança (ex: tipo_hora_extra para Hora Extra)
- **Seleção de datas**: Calendários interativos para datas de envio e aprovação
- **Debug logging**: Console logs detalhados para rastreamento de renderizações e estados

**Props do componente:**
- `requerimento?: Requerimento | null` - Requerimento existente para edição (opcional)
- `onSubmit: (dados: RequerimentoFormData) => void` - Callback executado ao submeter o formulário
- `onCancel: () => void` - Callback para cancelar a operação
- `isLoading?: boolean` - Estado de loading durante operações assíncronas

**Hooks utilizados:**
- `useForm` (React Hook Form) - Gerenciamento do estado do formulário com validação Zod
- `useClientesRequerimentos()` - Busca lista de clientes para o select
- `useResponsive()` - Hooks de responsividade para adaptação mobile/desktop
- `useAccessibility()` - Hooks de acessibilidade (screenReader, focusManagement)
- `useWatch` (form.watch) - Observa mudanças em campos específicos do formulário:
  - Campos principais: cliente_id, linguagem, tipoCobranca
  - Campos de valores: horasFuncional, horasTecnico, valorHoraFuncional, valorHoraTecnico
  - Campos condicionais: tipoHoraExtra, horasAnaliseEF
  - Campos obrigatórios: chamado, descricao, dataEnvio, modulo, linguagem, quantidadeTickets
- `useState` - Gerenciamento de estados locais (taxaVigente, carregandoTaxa, valoresEditadosManualmente)
- `useRef` - Referências mutáveis para controle de preenchimento automático sem re-renderizações

**Estados gerenciados:**
- `taxaVigente: TaxaClienteCompleta | null` - Taxa vigente do cliente selecionado, carregada automaticamente
- `carregandoTaxa: boolean` - Estado de loading durante busca de taxa vigente
- `valoresEditadosManualmente: { funcional: boolean; tecnico: boolean }` - Estado para indicadores visuais de edição manual
- `valoresEditadosManualmenteRef: { funcional: boolean; tecnico: boolean }` - Referência mutável que controla preenchimento automático sem causar re-renderizações

**Referências (useRef):**
- `valoresEditadosManualmenteRef` - Controla se valores foram editados manualmente sem causar re-renderizações
- Permite rastreamento de estado de edição manual sem disparar useEffects desnecessários
- Evita loops infinitos no sistema de preenchimento automático de valores/hora

**useEffects implementados:**

**1. useEffect de busca de taxa vigente:**
- Dispara quando `clienteId` ou `tipoCobranca` mudam
- **Validação inteligente**: Só busca taxa se o tipo de cobrança requer valores/hora (Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
- **Logging detalhado**: Console logs para debug da lógica de busca:
  - 🚀 Log de execução do useEffect (indica que o hook foi disparado)
  - 🔍 Verificação de necessidade de buscar taxa (clienteId, tipoCobranca, precisaTaxa, tiposComValorHora)
  - ❌ Quando não precisa buscar taxa (limpa estado)
  - ✅ Quando inicia busca de taxa vigente
  - ✅ Taxa encontrada com sucesso
  - ❌ Erro ao buscar taxa vigente
- Busca taxa vigente do cliente no Supabase
- Armazena taxa encontrada no estado `taxaVigente`
- Limpa taxa e estado de carregamento quando tipo de cobrança não requer valores
- Usado para preenchimento automático de valores/hora

**2. useEffect de preenchimento automático de valores:**
- Dispara quando `taxaVigente`, `linguagem`, `tipoCobranca` ou `tipoHoraExtra` mudam
- **setTimeout para controle de timing**: Usa `setTimeout` para garantir que edições manuais sejam processadas antes do preenchimento automático, evitando conflitos de timing entre estado e ref
- **CORREÇÃO CRÍTICA**: Não preenche automaticamente quando editando requerimento existente, EXCETO quando as flags de edição manual foram resetadas (mudança intencional do usuário)
- **Logging detalhado com separadores visuais**: Console logs para debug do preenchimento:
  - 🔄 Separador visual (80 caracteres '=') marcando INÍCIO DO PREENCHIMENTO AUTOMÁTICO
  - 📊 Estado atual dos dados necessários (taxaVigente, linguagem, tipoCobranca, tipoHoraExtra, editandoRequerimento)
  - ❌ Quando faltam dados para preencher valores
  - ❌ Quando tipo de cobrança não requer preenchimento automático
  - ⏭️ Quando pula preenchimento por estar editando requerimento existente com valores preservados
  - ✅ Quando inicia preenchimento automático
  - 📋 Taxa vigente completa
  - 📦 Tipo de produto da taxa
  - 🎯 Funções mapeadas (funcaoFuncional, funcaoTecnico, linguagem)
  - 🔍 Buscando valores na taxa
  - 📊 valores_remota disponíveis
  - 💰 Valores encontrados (valorFuncaoFuncional, valorFuncaoTecnico)
  - 📊 Tipo de valor sendo usado (Hora Normal, Hora Extra, Sobreaviso)
  - 💵 Valores calculados (tipoCobranca, tipoHoraExtra, valorHoraFuncional, valorHoraTecnico)
  - 📝 Valores atuais no formulário
  - ✅ Preenchendo valores ou ⏭️ Valores já preenchidos
  - **Separadores visuais**: Linhas de 80 caracteres '=' delimitam claramente o início do processo de preenchimento no console, facilitando identificação rápida durante debug
- Preenche automaticamente `valor_hora_funcional` e `valor_hora_tecnico` baseado na taxa vigente
- **Mapeamento inteligente de linguagem para função**:
  - **Valor/Hora Funcional**: SEMPRE usa linha "Funcional" da taxa
  - **Valor/Hora Técnico**: Usa linha correspondente à linguagem selecionada:
    - Linguagem "Funcional" → Linha "Técnico" (ou "Técnico / ABAP" para GALLERY, "Técnico (Instalação / Atualização)" para OUTROS)
    - Linguagem "Técnico" → Linha "Técnico / ABAP" (GALLERY) ou "Técnico (Instalação / Atualização)" (OUTROS)
    - Linguagem "ABAP" ou "PL/SQL" → Linha "Técnico / ABAP" (GALLERY) ou "ABAP - PL/SQL" (OUTROS)
    - Linguagem "DBA" → Linha "DBA / Basis" (GALLERY) ou "DBA" (OUTROS)
- **Mapeamento inteligente por tipo de cobrança**:
  - **Faturado (Hora Normal)**: Usa valor base (Seg-Sex 08h30-17h30)
  - **Hora Extra**: Usa valor específico baseado no tipo selecionado:
    - `17h30-19h30`: Seg-Sex 17h30-19h30
    - `apos_19h30`: Seg-Sex Após 19h30
    - `fim_semana`: Sáb/Dom/Feriados
    - Se tipo não selecionado: Não preenche valores (retorna early)
  - **Sobreaviso**: Usa valor de Stand By
- **Preenchimento condicional**: Só preenche valores se campos estiverem vazios ou zerados (não sobrescreve valores já preenchidos)
- Se não houver taxa cadastrada, campos ficam em branco para preenchimento manual
- Usa valores remotos por padrão (valores_remota) - seleção entre valores remotos/locais é gerenciada no formulário principal

**3. useEffect de limpeza de campos condicionais:**
- Dispara quando `tipoCobranca` muda
- **Limpeza de valores/hora**: Zera `valor_hora_funcional` e `valor_hora_tecnico` para 0 quando tipo de cobrança NÃO requer valores (tipos válidos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
  - Verifica se valores estão preenchidos antes de zerar (evita operações desnecessárias)
  - Usa `shouldValidate: true` e `shouldDirty: true` para marcar formulário como modificado e validar
- **Limpeza de tipo_hora_extra**: Remove `tipo_hora_extra` (undefined) quando tipo de cobrança NÃO é "Hora Extra"
  - Verifica se campo está preenchido antes de limpar
  - Usa `shouldValidate: true` e `shouldDirty: true` para feedback adequado ao usuário
- **Limpeza de horas_analise_ef**: Zera `horas_analise_ef` para 0 quando tipo de cobrança NÃO é "Reprovado"
  - Verifica se valor está preenchido antes de zerar
  - Usa `shouldValidate: true` e `shouldDirty: true` para marcar formulário como modificado
- **Objetivo**: Evitar dados inconsistentes no banco e melhorar UX ao trocar tipo de cobrança, garantindo que usuário seja notificado das mudanças

**4. useEffect de sobrescrita forçada para mudanças de tipo de hora extra:**
- Dispara quando `tipoHoraExtra`, `tipoCobranca`, `taxaVigente`, `linguagem` ou `atendimentoPresencial` mudam
- **Preenchimento imediato**: Quando tipo de cobrança é "Hora Extra" e tipo de hora extra é selecionado, executa preenchimento imediato sem esperar próximo useEffect
- **Validação completa**: Só executa quando todos os dados necessários estão disponíveis (tipoCobranca, tipoHoraExtra, taxaVigente, linguagem)
- **Reset de flags**: Reseta `valoresEditadosManualmenteRef` e `valoresEditadosManualmente` para permitir novo preenchimento automático
- **Cálculo completo inline**: Executa todo o processo de mapeamento de linguagem, busca de valores na taxa e cálculo de valores derivados
- **Logging detalhado**: Console logs indicando "FORÇANDO SOBRESCRITA IMEDIATA" e "EXECUTANDO PREENCHIMENTO IMEDIATO"
- **UX aprimorada**: Garante que valores sejam atualizados instantaneamente quando usuário muda tipo de hora extra
- **Dependências completas**: Array de dependências inclui todas as variáveis necessárias para o cálculo

**5. useEffect de análise inteligente de valores salvos:**
- Dispara quando `requerimento`, `taxaVigente` ou `linguagem` mudam
- **Análise comparativa**: Compara valores salvos no requerimento com valores esperados da taxa vigente atual
- **Cálculo de valores esperados**: Recalcula valores que deveriam estar no requerimento baseado na taxa vigente:
  - Mapeia linguagem para função correspondente na taxa
  - Calcula valores esperados baseado no tipo de cobrança e tipo de hora extra
  - Aplica mesmo arredondamento usado no preenchimento automático (2 casas decimais)
- **Comparação inteligente com tolerância**: Compara valores salvos com valores esperados da taxa:
  - **Tolerância de arredondamento**: Usa `Math.abs(valorSalvo - valorEsperado) > 0.01` para evitar problemas de precisão de ponto flutuante
  - Considera valor como "editado manualmente" apenas se diferença for maior que 0.01 E valor salvo > 0
  - Análise individual e precisa para cada campo (funcional e técnico)
- **Flags inteligentes**: Define flags de edição manual apenas para valores realmente personalizados:
  - `funcionalEditado`: true apenas se valor salvo > 0 E diferença absoluta > 0.01
  - `tecnicoEditado`: true apenas se valor salvo > 0 E diferença absoluta > 0.01
- **Logging detalhado e estruturado**: Console logs para debug da análise:
  - ? Log de início da análise comparativa
  - 💰 Valores do requerimento (funcional, técnico, tipo_cobranca, tipo_hora_extra, atendimento_presencial)
  - ? Comparação individual detalhada para cada campo:
    - 📊 Funcional: Valor salvo, Valor esperado, Diferença absoluta, Flag de edição manual
    - 📊 Técnico: Valor salvo, Valor esperado, Diferença absoluta, Flag de edição manual
  - ✅ Flags inteligentes definidas baseadas na comparação
- **Fallback robusto**: Se não há taxa vigente mas há valores salvos, marca como editado (comportamento anterior)
- **Resultado**: Permite preenchimento automático quando valores salvos coincidem com taxa vigente (dentro da tolerância), preserva apenas valores realmente personalizados

**Logging de debug implementado:**
- **Logs de renderização**: Console log no início do componente rastreando cada renderização:
  - 🎨🎨🎨 Log de renderização destacado com emojis triplos e flag indicando se há requerimento para edição
  - Útil para identificar re-renderizações desnecessárias e facilitar localização visual no console
- **Logs de estados iniciais**: Console log após declaração de estados:
  - 📊 Estados iniciais do componente (taxaVigente, carregandoTaxa, totalClientes)
  - Facilita debug de problemas com inicialização do formulário
  - Permite verificar se dados estão sendo carregados corretamente
- **Logs de watch values**: Console log após declaração dos watches:
  - 👀 Valores observados em tempo real (clienteId, tipoCobranca, linguagem, horasFuncional, horasTecnico, valorHoraFuncional, valorHoraTecnico)
  - Facilita debug de mudanças de estado e reatividade do formulário
  - Permite rastrear valores que disparam useEffects
- **Logs detalhados de busca de valores na taxa**: Console logs no useEffect de preenchimento automático:
  - 📊 valores_remota disponíveis na taxa
  - 📊 Estrutura completa da taxa em formato JSON (indentação de 2 espaços)
  - 💰 Detalhes completos do valor funcional encontrado em formato JSON
  - 💰 Detalhes completos do valor técnico encontrado em formato JSON
  - Facilita debug de problemas com mapeamento de funções e valores
  - Permite verificar estrutura exata dos dados retornados do banco
- **Logs de preenchimento de valores aprimorados**: Console logs detalhados ao preencher valores/hora:
  - ✅ PREENCHENDO valor_hora_funcional: [valor] - indica início do preenchimento
  - ✅ Valor preenchido com sucesso! - confirma que setValue foi executado
  - ⏭️ Valor funcional já preenchido: [valor] - mostra valor existente quando pula preenchimento
  - ✅ PREENCHENDO valor_hora_tecnico: [valor] - indica início do preenchimento
  - ✅ Valor preenchido com sucesso! - confirma que setValue foi executado
  - ⏭️ Valor técnico já preenchido: [valor] - mostra valor existente quando pula preenchimento
  - 🏁 FIM DO PREENCHIMENTO AUTOMÁTICO - separador visual marcando conclusão do processo
  - Facilita rastreamento preciso do fluxo de preenchimento e identificação de problemas
- Logs detalhados no `handleSubmit` para troubleshooting:
  - ✅ Dados completos recebidos do formulário (emoji de sucesso)
  - 📋 Tipo de cobrança selecionado
  - 💰 Valor/Hora Funcional
  - 💰 Valor/Hora Técnico
  - ⏰ Horas análise EF
  - 🏢 Tipo de cobrança da empresa selecionada
  - 🎫 Quantidade de tickets
- **Logs otimizados**: Removidos logs redundantes (tipo de horas_analise_ef, mostrarCampoTickets)
- **Emojis visuais**: Facilita identificação rápida de cada tipo de informação no console
- **Logs de validação formatados**: Erros de validação e valores do formulário exibidos em formato JSON com indentação (2 espaços) para melhor legibilidade no console
- **Logs JSON estruturados**: Estruturas complexas (taxa completa, valores de funções) exibidas em formato JSON com indentação para melhor visualização e debug
- **Separadores visuais de início e fim**: Linhas de 80 caracteres '=' delimitam claramente o início e fim do processo de preenchimento automático no console
- Facilita identificação de problemas com valores/hora, campos condicionais, inicialização do componente e mapeamento de valores da taxa

**Campos do formulário:**

**Seção: Dados Principais**
- `chamado` (obrigatório) - Número do chamado
- `cliente_id` (obrigatório) - Select com empresas ordenadas alfabeticamente
- `modulo` (obrigatório) - Módulo do sistema
- `descricao` (obrigatório) - Descrição do requerimento
- `linguagem` (obrigatório) - Select com linguagens (Funcional, Técnico, ABAP, DBA, Gestor)

**Seção: Controle de Horas**
- Título: "Controle de Horas" (h4 text-sm font-semibold mb-3 com ícone Calculator h-4 w-4)
- `horas_funcional` (obrigatório) - Horas funcionais (formato HH:MM ou decimal)
- `horas_tecnico` (obrigatório) - Horas técnicas (formato HH:MM ou decimal)
- `valor_total` - Valor total calculado automaticamente

**Seção: Valores/Hora**
- Título: "Valores/Hora" (h4 text-sm font-semibold mb-3 com ícone DollarSign h-4 w-4, tag de fechamento corrigida de `</h3>` para `</h4>`)
- `valor_hora_funcional` - Valor/hora funcional (preenchido automaticamente) com indicador visual (✏️) quando editado manualmente
- `valor_hora_tecnico` - Valor/hora técnico (preenchido automaticamente)

**Seção: Datas e Aprovação**
- `data_envio` - Data de envio do requerimento
- `data_aprovacao` - Data de aprovação
- `periodo_cobranca` - Período de cobrança (MM/YYYY)



**Seção: Tipo de Cobrança**
- `tipo_cobranca` (obrigatório) - Select com tipos (Faturado, Hora Extra, Sobreaviso, Bolsão Enel, Reprovado, Outros)
- `atendimento_presencial` (condicional) - Checkbox para indicar atendimento presencial (usa valores locais ao invés de remotos) - exibido apenas quando tipo de cobrança requer valores/hora
- `tipo_hora_extra` (condicional) - Select com tipos de hora extra (Simples, Dobrada) - exibido apenas quando tipo_cobranca = "Hora Extra" (valores `null` do banco são convertidos para `undefined` na inicialização)
- `horas_analise_ef` (condicional) - Horas de análise EF - exibido apenas quando tipo_cobranca = "Reprovado"

**Seção: Informações Adicionais**
- `tickets` - Tickets relacionados
- `observacao` - Observações gerais (campo sem label visível, apenas placeholder)

**Componentes UI utilizados:**
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` - Componentes de formulário do shadcn/ui
- `Input` - Campos de texto e numéricos
- `Textarea` - Campos de texto multilinha
- `Select` - Seleção de opções
- `Calendar` - Seletor de data
- `Popover` - Container para o calendário
- `Button` - Botões de ação

**Validação:**
- Schema Zod (`RequerimentoFormSchema`) aplicado via `zodResolver`
- Validação automática de campos obrigatórios
- Validação de formato de horas (HH:MM ou decimal)
- Validação de valores numéricos
- Mensagens de erro contextuais via `FormMessage`

**Comportamento:**
- **Modo criação**: Formulário em branco para novo requerimento
- **Modo edição**: Formulário preenchido com dados do requerimento via `defaultValues` do useForm (valores iniciais definidos na criação do formulário, incluindo `atendimento_presencial` com valor padrão `false`)
- **Busca automática de taxa**: Ao selecionar cliente, busca taxa vigente automaticamente
- **Preenchimento automático**: Valores/hora preenchidos baseado em taxa, linguagem e tipo de cobrança
- **Uso de valores remotos**: Utiliza valores remotos da taxa vigente por padrão (seleção entre valores remotos/locais é gerenciada no formulário principal)
- **Limpeza automática**: Campos condicionais limpos quando tipo de cobrança muda para tipo incompatível
- **Cálculo automático**: Valor total calculado em tempo real conforme horas e valores/hora mudam
- **Desabilitação durante loading**: Botões desabilitados durante operações assíncronas

**Opções de linguagem:**
```typescript
[
  { value: 'ABAP', label: 'ABAP' },
  { value: 'DBA', label: 'DBA' },
  { value: 'Funcional', label: 'Funcional' },
  { value: 'Gestor', label: 'Gestor' },
  { value: 'PL/SQL', label: 'PL/SQL' },
  { value: 'Técnico', label: 'Técnico' }
]
```

**Opções de tipo de cobrança:**
```typescript
[
  { value: 'Faturado', label: 'Faturado - Hora Normal' },
  { value: 'Hora Extra', label: 'Faturado - Hora Extra' },
  { value: 'Sobreaviso', label: 'Faturado - Sobreaviso' },
  { value: 'Bolsão Enel', label: 'Bolsão Enel' },
  { value: 'Reprovado', label: 'Reprovado' },
  { value: 'Outros', label: 'Outros' }
]
```

**Opções de tipo de hora extra:**
```typescript
[
  { value: 'Simples', label: 'Simples' },
  { value: 'Dobrada', label: 'Dobrada' }
]
```

**Tipos utilizados:**
- `Requerimento` - Tipo completo do requerimento
- `RequerimentoFormData` - Dados do formulário validados pelo schema Zod
- `RequerimentoFormSchema` - Schema de validação Zod

**Melhorias recentes:**
- **Suporte completo à linguagem "Gestor" implementado**: Finalizada implementação completa do suporte à linguagem "Gestor" no mapeamento de funções:
  - **Mapeamento direto**: Adicionado caso específico `if (ling === 'Gestor') { return 'Gestor'; }` na função `mapearLinguagemParaFuncao()`
  - **Funcionalidade completa**: Quando linguagem "Gestor" é selecionada, usa diretamente a linha "Gestor" da taxa vigente para preenchimento automático de valores/hora
  - **Cobertura total**: Todas as linguagens (Funcional, Técnico, ABAP, PL/SQL, DBA, Gestor) agora têm mapeamento explícito e funcional
  - **Consistência garantida**: Interface do formulário totalmente alinhada com mapeamento de linguagem implementado no backend
  - **Preenchimento automático**: Valores/hora são preenchidos corretamente para perfil de Gestor baseado na taxa vigente do cliente
- **Correção de caracteres especiais nos logs**: Corrigidos caracteres especiais inválidos (`�`) para caracteres válidos (`?`) nos console logs de análise de valores salvos:
  - Log "? ANALISVANDO VALORES SALVOS vs TAXA VIGENTE" corrigido
  - Log "? COMPAcRAÇÃO INDIVIDUAL DE VALORES:" corrigido
  - Melhorada legibilidade dos logs de debug durante desenvolvimento
  - Eliminados problemas de codificação de caracteres nos console logs
- **Opção "Gestor" adicionada ao Select de linguagem**: Incluída opção "Gestor" no Select de linguagens do formulário, completando a implementação do suporte à linguagem "Gestor":
  - **Interface completa**: Select agora inclui todas as linguagens suportadas (ABAP, DBA, Funcional, Gestor, PL/SQL, Técnico)
  - **Ordem alfabética**: Opção "Gestor" posicionada corretamente na ordem alfabética entre "Funcional" e "PL/SQL"
  - **Funcionalidade completa**: Usuários podem agora selecionar "Gestor" como linguagem e ter valores/hora preenchidos automaticamente
  - **Consistência**: Interface do formulário alinhada com mapeamento de linguagem implementado no backend
- **Suporte completo à linguagem "Gestor"**: Implementado mapeamento específico para linguagem "Gestor" → linha "Gestor" na taxa:
  - **Mapeamento direto**: Quando linguagem selecionada é "Gestor", usa diretamente a linha "Gestor" da taxa vigente
  - **Cobertura completa**: Todas as linguagens (Funcional, Técnico, ABAP, PL/SQL, DBA, Gestor) agora têm mapeamento explícito
  - **Consistência**: Garante que valores/hora sejam preenchidos corretamente para perfil de Gestor
  - **Funcionalidade completa**: Permite criação de requerimentos com linguagem "Gestor" e preenchimento automático de valores
- **Correção de caracteres nos logs**: Corrigidos caracteres especiais (`�`) para caracteres válidos (`?`) nos console logs de análise de valores salvos, melhorando legibilidade dos logs de debug
- **Fallback aprimorado para análise de valores**: Refinado sistema de fallback quando não há taxa vigente disponível:
  - **Critério mais rigoroso**: Agora considera valores ≥ R$ 1,00 como "significativos" ao invés de > R$ 0,00
  - **Logging detalhado**: Console logs estruturados mostrando análise individual de cada campo:
    - Valor atual do campo
    - Valor mínimo significativo (R$ 1,00)
    - Resultado da comparação (boolean)
    - Conclusão sobre edição manual
  - **Melhor precisão**: Evita marcar como "editado manualmente" valores muito baixos que podem ser resíduos de cálculos automáticos
  - **Debug aprimorado**: Mensagens mais claras indicando "fallback aprimorado" ao invés de "fallback individual"
  - **Consistência**: Aplica mesmo critério de valor mínimo significativo usado na análise com taxa vigente
- **Análise inteligente de valores salvos com tolerância de arredondamento**: Implementado sistema avançado que compara valores salvos com taxa vigente para determinar se foram realmente editados manualmente:
  - **Comparação precisa com tolerância**: Calcula valores esperados baseado na taxa vigente atual e compara com valores salvos usando tolerância de 0.01 para evitar problemas de precisão de ponto flutuante
  - **Flags inteligentes**: Marca como "editado manualmente" apenas valores que realmente diferem da taxa vigente (diferença > 0.01) e são maiores que 0
  - **Análise individual**: Cada campo (funcional e técnico) é analisado separadamente com logging detalhado mostrando valor salvo, esperado, diferença absoluta e flag resultante
  - **Arredondamento consistente**: Aplica mesmo arredondamento (2 casas decimais) usado no preenchimento automático para comparação precisa
  - **Mapeamento completo**: Recria todo o processo de mapeamento de linguagem para função e cálculo de valores por tipo de cobrança
  - **Logging estruturado**: Console logs organizados por campo com indentação para melhor legibilidade durante debug
  - **Resultado**: Permite preenchimento automático quando valores coincidem com taxa vigente (dentro da tolerância), preserva apenas personalizações reais
- **Preenchimento imediato para mudanças de tipo de hora extra**: Implementado sistema de preenchimento instantâneo quando tipo de hora extra muda:
  - **Execução imediata**: Não espera próximo useEffect, executa cálculo e preenchimento imediatamente quando tipo de hora extra é selecionado
  - **Validação robusta**: Só executa quando todos os dados necessários estão disponíveis (tipoCobranca = "Hora Extra", tipoHoraExtra selecionado, taxaVigente carregada, linguagem definida)
  - **Cálculo completo inline**: Duplica lógica do useEffect principal para garantir preenchimento imediato sem dependências externas
  - **Reset automático de flags**: Reseta flags de edição manual para permitir novo preenchimento automático
  - **Logging específico**: Console logs indicando "FORÇANDO SOBRESCRITA IMEDIATA" e "EXECUTANDO PREENCHIMENTO IMEDIATO" para debug
  - **UX instantânea**: Usuário vê valores atualizados imediatamente ao selecionar tipo de hora extra (17h30-19h30, Após 19h30, Fim de Semana)
  - **Dependências completas**: Array de dependências inclui todas as variáveis necessárias para garantir execução quando qualquer dado relevante muda
- **CORREÇÃO CRÍTICA: Preservação de valores em modo edição**: Implementada lógica que evita sobrescrever valores quando editando requerimento existente:
  - **Verificação de contexto**: Detecta quando está editando requerimento existente (`!!requerimento`)
  - **Preservação inteligente**: Não preenche automaticamente quando ambas as flags de edição manual estão ativas (valores já foram definidos)
  - **Exceção para mudanças intencionais**: Permite preenchimento automático quando flags foram resetadas (usuário mudou cliente/linguagem/tipo intencionalmente)
  - **Logging específico**: Console logs indicando quando preenchimento é pulado por estar editando requerimento com valores preservados
  - **UX aprimorada**: Evita sobrescrever valores já configurados ao editar requerimentos, mantendo dados originais intactos
  - **Flexibilidade mantida**: Ainda permite preenchimento automático quando usuário faz mudanças intencionais no contexto
- **Campo atendimento presencial movido e tornado condicional**: Reorganizado campo `atendimento_presencial` para melhor contexto e relevância:
  - **Nova localização**: Movido da seção "Informações Adicionais" para a seção "Tipo de Cobrança"
  - **Exibição condicional**: Agora é exibido apenas quando `mostrarCamposValor` é true (tipos que requerem valores/hora: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
  - **Melhor contexto**: Campo aparece próximo aos campos de valor/hora, onde sua funcionalidade é mais relevante
  - **UX aprimorada**: Usuário só vê o campo quando ele realmente afeta o comportamento do sistema
  - **Interface limpa**: Evita confusão ao ocultar campo quando tipo de cobrança não usa valores/hora
  - **Funcionalidade mantida**: Quando marcado, usa valores locais (com acréscimo de 10%) ao invés de valores remotos
- **Indicador visual de edição manual**: Adicionado ícone ✏️ no label do campo "Valor/Hora Funcional" que aparece quando o valor foi editado manualmente pelo usuário:
  - Ícone exibido condicionalmente baseado no estado `valoresEditadosManualmente.funcional`
  - Posicionado após o asterisco obrigatório com `ml-1 text-xs text-blue-600`
  - Tooltip explicativo "Editado manualmente" ao passar o mouse
  - Melhora transparência sobre origem dos valores (automático vs. manual)
  - Facilita identificação de campos personalizados pelo usuário
  - Complementa sistema de controle de edição manual existente
- **Logs de preenchimento detalhados e rastreáveis**: Aprimorados console logs no processo de preenchimento de valores/hora:
  - Mensagens em MAIÚSCULAS (PREENCHENDO) para destacar ações de preenchimento
  - Confirmação explícita "Valor preenchido com sucesso!" após cada setValue
  - Exibição do valor atual quando pula preenchimento (campo já preenchido)
  - Separador visual de fim (🏁 FIM DO PREENCHIMENTO AUTOMÁTICO) para delimitar conclusão do processo
  - Facilita rastreamento preciso do fluxo de preenchimento e identificação de problemas com setValue
- **Separadores visuais nos logs de preenchimento**: Adicionadas linhas de 80 caracteres '=' delimitando o início e fim do processo de preenchimento automático no console:
  - Separador superior com título "INÍCIO DO PREENCHIMENTO AUTOMÁTICO"
  - Separador inferior com título "FIM DO PREENCHIMENTO AUTOMÁTICO"
  - Facilita identificação rápida do início e fim do processo durante debug
  - Melhora legibilidade ao separar visualmente diferentes execuções do useEffect
  - Permite rastrear facilmente o fluxo de preenchimento em meio a outros logs
- **Logs JSON estruturados para debug de taxa**: Adicionados console logs detalhados no useEffect de preenchimento automático:
  - 📊 Estrutura completa da taxa em formato JSON com indentação (2 espaços)
  - 💰 Detalhes completos do valor funcional encontrado em formato JSON
  - 💰 Detalhes completos do valor técnico encontrado em formato JSON
  - Facilita debug de problemas com mapeamento de funções e valores da taxa
  - Permite verificar estrutura exata dos dados retornados do banco
  - Melhora troubleshooting de problemas com preenchimento automático de valores/hora
- **Reorganização de watches**: Movidos watches de campos obrigatórios para antes do console.log de watch values para melhor organização do código e facilitar debug
- **Logs de debug de renderização e estados**: Adicionados console logs estratégicos para rastreamento:
  - 🎨 Log de renderização no início do componente indicando se há requerimento para edição
  - 📊 Log de estados iniciais (taxaVigente, carregandoTaxa, totalClientes) após declaração de estados
  - 👀 Log de valores observados (watch values) para rastrear mudanças em tempo real
  - Facilita identificação de problemas com inicialização do formulário e carregamento de dados
  - Permite rastrear re-renderizações desnecessárias e verificar se dados estão sendo carregados corretamente
- **Logging aprimorado no preenchimento automático**: Adicionados console logs detalhados no useEffect de preenchimento automático de valores:
  - 🔄 Estado atual dos dados necessários (taxaVigente, linguagem, tipoCobranca)
  - ❌ Mensagens claras quando faltam dados ou tipo não requer preenchimento
  - ✅ Confirmação quando inicia preenchimento automático
  - 📋 Taxa vigente completa para debug
  - 📦 Tipo de produto da taxa
  - Facilita troubleshooting de problemas com preenchimento automático de valores/hora
- **Correções de tags HTML**: Corrigidas tags de fechamento dos títulos de seção para garantir HTML válido:
  - Título "Controle de Horas": tag de fechamento corrigida de `</h3>` para `</h4>`
  - Título "Valores/Hora": tag de fechamento corrigida de `</h3>` para `</h4>`
  - Garante consistência com as tags de abertura (h4) e HTML válido
- **Indicadores visuais coloridos no Select de tipo de cobrança**: Adicionados círculos coloridos (h-3 w-3 rounded-full) em cada opção do Select para identificação visual rápida
  - Cores obtidas via função `getCorTipoCobranca()` de `@/utils/requerimentosColors`
  - Layout flex com gap-2 entre círculo e texto usando tag `<span>` para o label
  - Simplificação da aplicação de classes CSS: uso direto do retorno de `getCorTipoCobranca()` sem manipulação de string
  - Melhora significativa na usabilidade ao permitir identificação rápida por cor
  - Consistência visual com o componente `TipoCobrancaBloco`
- **Refinamento visual dos títulos de seção**: Padronizado estilo dos títulos para melhor hierarquia visual:
  - Títulos de seção agora usam h4 (text-sm font-semibold mb-3) ao invés de h3 (text-lg)
  - Ícones reduzidos de h-5 w-5 para h-4 w-4 para melhor proporção
  - Visual mais compacto e consistente com outros componentes do sistema
  - Melhor hierarquia visual entre título do Card (text-base) e títulos de seção (text-sm)
- **Refinamento visual do Card**: Aplicado estilo minimalista e compacto ao formulário:
  - Reduzido padding do CardHeader (pb-3) para visual mais enxuto
  - Diminuído tamanho do título (text-base) para melhor proporção
  - Removido padding superior do CardContent (pt-0) para eliminar espaço desnecessário
  - Aumentado espaçamento interno (space-y-6) para melhor respiração entre seções
  - Visual mais profissional e focado no conteúdo essencial
- **Simplificação da inicialização do formulário**: Removido useEffect de reset do formulário que causava comportamento indesejado:
  - Valores iniciais agora são definidos exclusivamente nos `defaultValues` do useForm
  - Eliminado uso de `useRef` e lógica complexa de controle de inicialização
  - Formulário mais estável e previsível em modo edição
  - Reduzida complexidade do código e possíveis bugs relacionados a re-renderizações
  - **Resultado**: Inicialização mais simples e confiável do formulário
- **Formatação aprimorada de logs de validação**: Implementada formatação JSON com indentação para erros de validação e valores do formulário:
  - Erros de validação exibidos com `JSON.stringify(errors, null, 2)` para melhor legibilidade
  - Valores do formulário exibidos com `JSON.stringify(form.getValues(), null, 2)` para estrutura clara
  - Facilita debug de problemas de validação com visualização hierárquica dos dados
  - Melhora experiência de desenvolvimento ao identificar campos com erro
- **Logging otimizado e limpo**: Refinados console logs para melhor legibilidade:
  - Emojis visuais consistentes em todos os logs (🔍 verificação, ✅ sucesso, ❌ erro, 📋 dados, 💰 valores, ⏰ tempo, 🏢 empresa, 🎫 tickets, 🔄 inicialização)
  - Removidos logs redundantes e desnecessários (tipo de horas_analise_ef, mostrarCampoTickets)
  - Logs mais concisos e focados em informações essenciais
  - Facilita troubleshooting e identificação de problemas com busca de taxas
- **Logging aprimorado para debug**: Console logs detalhados no useEffect de busca de taxa vigente:
  - Log de verificação mostrando clienteId, tipoCobranca e flag precisaTaxa
  - Log quando não precisa buscar taxa (evita requisições desnecessárias)
  - Log quando inicia busca de taxa vigente
  - Log da taxa encontrada com todos os dados
  - Log de erro detalhado em caso de falha
- **Otimização de busca de taxa**: Implementada validação inteligente no useEffect de busca de taxa vigente:
  - Só busca taxa quando tipo de cobrança requer valores/hora (Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
  - Evita requisições desnecessárias ao banco quando tipo de cobrança não usa valores (Reprovado, Outros)
  - Limpa estado de taxa e carregamento quando tipo não requer valores
  - Melhora performance e reduz carga no banco de dados
- **Limpeza automática de campos condicionais**: Implementado useEffect que remove valores de campos não aplicáveis ao tipo de cobrança selecionado:
  - Zera `valor_hora_funcional` e `valor_hora_tecnico` para 0 quando tipo de cobrança não requer valores (mantém apenas para: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
  - Remove `tipo_hora_extra` quando tipo de cobrança não é "Hora Extra"
  - Zera `horas_analise_ef` quando tipo de cobrança não é "Reprovado"
- **Limpeza inteligente com validação**: Refinado useEffect de limpeza para melhor feedback ao usuário:
  - Verifica valores atuais antes de limpar (evita operações desnecessárias quando campos já estão vazios)
  - Usa `shouldValidate: true` e `shouldDirty: true` para marcar formulário como modificado e validar
  - Garante que usuário seja notificado das mudanças automáticas
  - Valores/hora zerados para 0 ao invés de undefined (melhor para cálculos)
- **Melhor consistência de dados**: Evita salvar valores inconsistentes no banco de dados
- **UX aprimorada**: Usuário é notificado quando campos são limpos automaticamente ao trocar tipo de cobrança, permitindo desfazer se necessário

**Integração:**
- Utilizado em páginas de gerenciamento de requerimentos
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Integra-se com sistema de taxas para busca de taxa vigente
- Validação consistente com schemas definidos em `src/schemas/requerimentosSchemas.ts`
- Exportado via `src/components/admin/requerimentos/index.ts`

**Fluxo de preenchimento automático:**
1. Usuário seleciona cliente → busca taxa vigente
2. Usuário seleciona linguagem → identifica função correspondente
3. Usuário seleciona tipo de cobrança → identifica tipo de valor
4. **Para Hora Extra**: Usuário seleciona tipo de hora extra → identifica valor específico
5. Sistema preenche automaticamente valor_hora_funcional e valor_hora_tecnico
6. Usuário informa horas → sistema calcula valor_total automaticamente

**Mapeamento de valores por tipo de cobrança:**

| Tipo de Cobrança | Campo da Taxa | Descrição |
|------------------|---------------|-----------|
| **Faturado** | `valor_base` | Hora Normal - Seg-Sex 08h30-17h30 |
| **Hora Extra** (17h30-19h30) | `valor_17h30_19h30` | Seg-Sex 17h30-19h30 |
| **Hora Extra** (Após 19h30) | `valor_apos_19h30` | Seg-Sex Após 19h30 |
| **Hora Extra** (Fim de Semana) | `valor_fim_semana` | Sáb/Dom/Feriados |
| **Sobreaviso** | `valor_standby` | Stand By |

**Comportamento quando não há taxa cadastrada:**
- Campos de valor/hora ficam em branco
- Usuário pode preencher manualmente os valores
- Sistema não bloqueia a criação do requerimento

**Fluxo de limpeza automática (NOVO):**
1. Usuário seleciona tipo de cobrança
2. Sistema verifica se tipo requer valores/hora
3. Se não requer, limpa `valor_hora_funcional` e `valor_hora_tecnico`
4. Sistema verifica se tipo é "Hora Extra"
5. Se não é, limpa `tipo_hora_extra`
6. Sistema verifica se tipo é "Reprovado"
7. Se não é, zera `horas_analise_ef`

**Tipos de cobrança que requerem valores/hora:**
- Faturado
- Hora Extra
- Sobreaviso
- Bolsão Enel

**Tipos de cobrança que NÃO requerem valores/hora:**
- Reprovado
- Outros


---

## Diretório `src/schemas/`

Schemas de validação Zod para formulários do sistema, garantindo integridade e consistência dos dados.

### `requerimentosSchemas.ts`
Schema de validação Zod para formulários de requerimentos, garantindo integridade e consistência dos dados antes de salvar no banco.

**Última atualização**: Aprimorada validação do campo `tipo_hora_extra` para aceitar valores `null` do banco de dados e convertê-los automaticamente para `undefined`, garantindo compatibilidade com o tipo TypeScript e evitando warnings de componente não controlado.

**Funcionalidades principais:**
- Validação completa de todos os campos do formulário de requerimentos
- Conversão automática de tipos (strings para números, datas, etc.)
- Validação de formato de horas (HH:MM ou decimal)
- Validação de valores monetários
- Validação de campos condicionais (tipo_hora_extra, horas_analise_ef, quantidade_tickets)
- Mensagens de erro personalizadas em português
- **Tratamento especial de null**: Campo `tipo_hora_extra` aceita `null` do banco e converte para `undefined` via transform

**Schemas exportados:**

**RequerimentoFormSchema**
Schema principal para validação do formulário de requerimentos com todos os campos:

**Campos obrigatórios:**
- `chamado` - String não vazia (número do chamado)
- `cliente_id` - UUID do cliente
- `modulo` - String não vazia (módulo do sistema)
- `descricao` - String não vazia (descrição do requerimento)
- `linguagem` - Enum com opções: Funcional, Técnico, ABAP, DBA, Gestor
- `horas_funcional` - Número positivo (horas funcionais)
- `horas_tecnico` - Número positivo (horas técnicas)
- `tipo_cobranca` - Enum com opções: Faturado, Hora Extra, Sobreaviso, Bolsão Enel, Reprovado, Outros

**Campos opcionais:**
- `valor_hora_funcional` - Número positivo (valor/hora funcional)
- `valor_hora_tecnico` - Número positivo (valor/hora técnico)
- `tipo_hora_extra` - Enum com opções: 17h30-19h30, apos_19h30, fim_semana (aceita null e converte para undefined)
- `quantidade_tickets` - Número inteiro positivo ou null
- `horas_analise_ef` - Número positivo (horas de análise EF para tipo Reprovado)
- `atendimento_presencial` - Boolean (flag para atendimento presencial, usa valores locais)
- `data_envio` - Data de envio
- `data_aprovacao` - Data de aprovação
- `periodo_cobranca` - String no formato MM/YYYY
- `tickets` - String (tickets relacionados)
- `observacao` - String (observações gerais)

**Validações especiais:**

**Campo tipo_hora_extra:**
```typescript
tipo_hora_extra: z.union([
  z.enum(['17h30-19h30', 'apos_19h30', 'fim_semana'] as const),
  z.null(),
  z.undefined()
]).optional().transform(val => val === null ? undefined : val)
```
- Aceita valores do enum, null ou undefined
- Converte automaticamente `null` (do banco) para `undefined` (TypeScript)
- Evita warnings de componente não controlado no React
- Garante compatibilidade entre banco de dados e formulário

**Campo quantidade_tickets:**
```typescript
quantidade_tickets: z.union([
  z.number().int().positive(),
  z.null()
]).optional()
```
- Aceita número inteiro positivo ou null
- Usado para empresas com tipo de cobrança "Banco de Horas"

**Campo horas_analise_ef:**
```typescript
horas_analise_ef: z.number().positive().optional()
```
- Usado apenas quando tipo_cobranca = "Reprovado"
- Registra horas de análise de engenharia fiscal

**Conversões automáticas:**
- Strings de horas (HH:MM) convertidas para números decimais
- Strings de valores monetários convertidas para números
- Datas string convertidas para objetos Date
- Valores null convertidos para undefined quando apropriado

**Mensagens de erro personalizadas:**
- "Campo obrigatório" para campos required
- "Deve ser um número positivo" para valores numéricos
- "Formato inválido" para formatos específicos (horas, datas)
- Mensagens contextuais em português para melhor UX

**Integração:**
- Utilizado pelo componente `RequerimentoForm.tsx` via `zodResolver`
- Validação aplicada automaticamente no submit do formulário
- Erros exibidos via `FormMessage` do shadcn/ui
- Garante dados consistentes antes de enviar ao banco

**Melhorias recentes:**
- **Campo atendimento_presencial adicionado**: Novo campo booleano opcional no schema de validação para indicar atendimento presencial, permitindo diferenciação entre valores remotos e locais no cálculo de valores/hora
- **Tratamento robusto de null**: Campo `tipo_hora_extra` agora aceita `null` do banco e converte automaticamente para `undefined`, eliminando warnings de componente não controlado
- **Union type completo**: Implementado `z.union([enum, null, undefined])` para cobrir todos os casos possíveis
- **Transform function**: Adicionada transformação que converte `null` em `undefined` de forma transparente
- **Melhor compatibilidade**: Garante que valores do banco (null) sejam compatíveis com tipos TypeScript (undefined)

**Uso típico:**
```typescript
import { RequerimentoFormSchema } from '@/schemas/requerimentosSchemas';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(RequerimentoFormSchema),
  defaultValues: {
    chamado: '',
    cliente_id: '',
    tipo_hora_extra: undefined, // Será null no banco, undefined no form
    atendimento_presencial: false, // Valor padrão para atendimento remoto
    // ... outros campos
  }
});
```

### `pesquisasSatisfacaoSchemas.ts`
Schema de validação Zod para formulários de pesquisas de satisfação, com suporte diferenciado para pesquisas manuais e do SQL Server.

**Funcionalidades principais:**
- Validação completa de todos os campos do formulário de pesquisas
- **Schemas diferenciados**: Validação específica para pesquisas manuais vs. SQL Server
- **Função de seleção de schema**: `getPesquisaFormSchema()` retorna schema apropriado baseado na origem
- Conversão automática de tipos (strings para números, datas, etc.)
- Validação de formato de email
- Validação de campos obrigatórios e opcionais
- Mensagens de erro personalizadas em português

**Schemas exportados:**

**PesquisaFormSchemaBase**
Schema base compartilhado entre pesquisas manuais e do SQL Server:

**Campos obrigatórios:**
- `empresa` - String não vazia (nome da empresa)
- `cliente` - String não vazia (nome do cliente)

**Campos opcionais:**
- `email_cliente` - Email válido do cliente
- `prestador` - Nome do consultor/prestador
- `categoria` - Categoria do atendimento
- `grupo` - Grupo responsável
- `tipo_caso` - Tipo do chamado (IM, PR, RF)
- `nro_caso` - Número do chamado
- `comentario_pesquisa` - Comentário da pesquisa (máximo 5000 caracteres, opcional no schema base)
- `resposta` - Nível de satisfação
- `data_resposta` - Data/hora da resposta
- `observacao` - Observações internas (máximo 2000 caracteres)

**PesquisaFormSchemaManual**
Schema estendido para pesquisas cadastradas manualmente:
- Herda todos os campos de `PesquisaFormSchemaBase`
- **comentario_pesquisa obrigatório**: Campo comentário torna-se obrigatório para pesquisas manuais

**PesquisaFormSchema**
Schema principal (alias para `PesquisaFormSchemaBase`) mantido para compatibilidade com código existente.

**Função utilitária:**

**getPesquisaFormSchema(isManual: boolean = false)**
Função que retorna o schema apropriado baseado na origem da pesquisa:
- `isManual = false`: Retorna `PesquisaFormSchemaBase` (pesquisas do SQL Server)
- `isManual = true`: Retorna `PesquisaFormSchemaManual` (comentário obrigatório)

**Validações especiais:**
- Email com formato válido quando fornecido
- Strings com limite de caracteres para evitar overflow
- Datas válidas quando fornecidas
- Campos de texto com trim automático
- **Validação condicional de comentário**: Obrigatório apenas para pesquisas manuais

**Integração:**
- Utilizado pelo componente `PesquisaForm.tsx` via `zodResolver`
- Schema selecionado dinamicamente baseado na origem da pesquisa
- Validação aplicada automaticamente no submit do formulário
- Erros exibidos via `FormMessage` do shadcn/ui

**Uso típico:**
```typescript
// Para pesquisa manual (comentário obrigatório)
const schemaManual = getPesquisaFormSchema(true);

// Para pesquisa do SQL Server (comentário opcional)
const schemaSqlServer = getPesquisaFormSchema(false);
```

---
