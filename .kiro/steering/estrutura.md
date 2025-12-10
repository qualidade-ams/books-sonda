# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Refinamento visual no componente `src/components/admin/requerimentos/RequerimentoForm.tsx` - removido label "Observação" do campo de observações para interface mais limpa, mantendo apenas o placeholder descritivo.

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
Formulário completo para cadastro e edição de taxas de clientes, com cálculo automático de valores, gestão de vigências e suporte a reajustes.

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

**Funções principais:**
- `formatarMoeda(valor)`: Formata número para formato monetário brasileiro (0,00)
- `converterMoedaParaNumero(valor)`: Converte string monetária para número
- `calcularValoresExibicao(valores, tipo)`: Calcula todos os valores derivados para exibição
- `handleSubmit(data)`: Processa e submete dados do formulário

**Cálculo automático de valores:**
- Utiliza função `calcularValores()` de `@/types/taxasClientes`
- Valores calculados em tempo real conforme usuário edita valores base
- Regras de negócio aplicadas para diferentes horários e dias
- Suporte a dois tipos de cálculo para hora adicional (normal ou média)

**Funções por tipo de produto:**
- Utiliza função `getFuncoesPorProduto()` de `@/types/taxasClientes`
- GALLERY: Funções específicas para produto Gallery
- OUTROS: Funções para COMEX e FISCAL

**Formatação de dados:**
- Valores monetários formatados em pt-BR com 2 casas decimais
- Datas formatadas em pt-BR (DD/MM/YYYY) usando date-fns
- Ajuste de timezone adicionando 'T00:00:00' às datas
- Edição inline com formatação automática ao focar/desfocar

**Validações:**
- Cliente obrigatório
- Tipo de produto obrigatório
- Vigência início obrigatória
- Validação de formato de valores monetários

**Integração:**
- Utilizado na página `CadastroTaxasClientes.tsx`
- Integra-se com o sistema de empresas via hook `useEmpresas()`
- Integra-se com serviço de taxas padrão para preenchimento automático
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

### `src/components/admin/pesquisas-satisfacao/`

Componentes relacionados ao gerenciamento de pesquisas de satisfação.

#### `PesquisaForm.tsx`
Formulário completo para cadastro e edição de pesquisas de satisfação, com validação via Zod e integração com React Hook Form.

**Funcionalidades principais:**
- **Formulário completo**: Cadastro e edição de pesquisas de satisfação com todos os campos necessários
- **Validação robusta**: Validação de dados usando Zod schema (`PesquisaFormSchema`)
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
- Schema Zod (`PesquisaFormSchema`) aplicado via `zodResolver`
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
- `PesquisaFormSchema` - Schema de validação Zod

**Melhorias recentes:**
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
Serviço completo para gerenciamento de taxas de clientes, incluindo CRUD, busca de taxas vigentes e cálculo automático de valores derivados.

**Funcionalidades principais:**
- CRUD completo de taxas de clientes (criar, buscar, atualizar, deletar)
- Busca de taxa vigente por cliente e data específica
- Cálculo automático de valores derivados (hora extra, sobreaviso, etc.)
- Gestão de vigências com controle de períodos (início e fim)
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

**Cálculo automático de valores:**
- Ao buscar uma taxa, o serviço calcula automaticamente todos os valores derivados (hora extra, sobreaviso, etc.)
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

**Fluxo de busca com cálculo:**
1. Busca dados da taxa na tabela `taxas_clientes`
2. Busca valores base na tabela `valores_taxas_funcoes`
3. Separa valores em remota e local
4. Para cada função, calcula todos os valores derivados usando `calcularValores()`
5. Retorna taxa completa com arrays de valores calculados

**Integração:**
- Utilizado pelos hooks `useTaxas`, `useCriarTaxa`, `useAtualizarTaxa`, `useDeletarTaxa`
- Integra-se com tabelas `taxas_clientes` e `valores_taxas_funcoes` do Supabase
- Suporta autenticação via `supabase.auth.getUser()`
- Utilizado pelos componentes `TaxaForm` e página `CadastroTaxasClientes`

**Melhorias recentes:**
- **Cálculo automático de valores derivados**: Implementado cálculo automático de todos os valores derivados ao buscar uma taxa, eliminando necessidade de cálculos no frontend
- **Retorno padronizado**: Todas as funções de busca retornam `TaxaClienteCompleta` com valores já calculados
- **Performance otimizada**: Cálculos realizados uma vez no backend ao invés de múltiplas vezes no frontend
- **Consistência de dados**: Garante que valores calculados sejam sempre consistentes usando a mesma lógica de cálculo

---

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


---

### `src/components/admin/requerimentos/`

Componentes relacionados ao gerenciamento de requerimentos.

#### `TipoCobrancaBloco.tsx`
Componente de bloco reutilizável para gerenciamento de tipos de cobrança em requerimentos, permitindo múltiplos tipos de cobrança em um único requerimento com busca automática de taxas e preenchimento de valores.

**Última atualização**: Implementada limpeza automática de campos de valores/hora quando tipo de hora extra não está selecionado, garantindo que campos fiquem vazios até que o usuário selecione o tipo específico de hora extra, melhorando consistência de dados e UX.

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
  - Logging detalhado mostrando valores atuais do bloco, valores na ref e estado da taxa
  - Reset automático da ref quando não há dados suficientes para preencher valores
  - Previne re-preenchimentos desnecessários comparando valores atuais com valores anteriores
  - Melhora estabilidade do componente eliminando loops infinitos de atualização
  - Facilita debug com logs estruturados mostrando estado completo do controle de preenchimento
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

**Notas:**
- Componente em desenvolvimento (implementação parcial)
- Projetado para suportar cenários onde um requerimento pode ter múltiplos tipos de cobrança
- Facilita gerenciamento de horas e valores por tipo de cobrança

---

#### `RequerimentoMultiploForm.tsx`
Formulário avançado para cadastro de requerimentos com suporte a múltiplos tipos de cobrança em um único requerimento, permitindo gerenciamento flexível de horas e valores por tipo.

**Última atualização**: Adicionadas props `clienteId` e `linguagem` ao componente `TipoCobrancaBloco` para habilitar funcionalidade de busca automática de taxas vigentes e preenchimento automático de valores/hora em cada bloco de tipo de cobrança.

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
- Atualiza campo específico de um bloco pelo ID
- Implementa lógica de limpeza automática quando campo é `tipo_cobranca`:
  - **Limpeza de valores/hora**: Remove `valor_hora_funcional` e `valor_hora_tecnico` quando tipo NÃO requer valores (tipos válidos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel)
  - **Limpeza de tipo_hora_extra**: Remove quando tipo NÃO é "Hora Extra"
  - **Limpeza de quantidade_tickets**: Remove quando tipo NÃO é "Banco de Horas"
  - **Limpeza de horas_analise_ef**: Remove quando tipo NÃO é "Reprovado"
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

**Última atualização**: Adicionados console logs de debug para rastreamento de renderizações e estados iniciais do componente, facilitando troubleshooting de problemas com inicialização do formulário e carregamento de dados.

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
- `useState` - Gerenciamento de estados locais (taxaVigente, carregandoTaxa)

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
- **Logging detalhado com separadores visuais**: Console logs para debug do preenchimento:
  - 🔄 Separador visual (80 caracteres '=') marcando INÍCIO DO PREENCHIMENTO AUTOMÁTICO
  - 📊 Estado atual dos dados necessários (taxaVigente, linguagem, tipoCobranca, tipoHoraExtra)
  - ❌ Quando faltam dados para preencher valores
  - ❌ Quando tipo de cobrança não requer preenchimento automático
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
- Usa valores remotos por padrão (valores_remota)

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

**4. useEffect de filtragem de opções de tipo de cobrança:**
- Dispara quando `empresaSelecionada` muda
- Filtra opções de tipo de cobrança baseado no tipo de cobrança da empresa
- Se empresa tem tipo "Outros", remove opção "Bolsão Enel" das opções disponíveis
- Mantém todas as opções para empresas com tipo "Banco de Horas"
- Atualiza estado `tipoCobrancaOptionsFiltradas` com opções filtradas

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
- `valor_hora_funcional` - Valor/hora funcional (preenchido automaticamente)
- `valor_hora_tecnico` - Valor/hora técnico (preenchido automaticamente)

**Seção: Datas e Aprovação**
- `data_envio` - Data de envio do requerimento
- `data_aprovacao` - Data de aprovação
- `periodo_cobranca` - Período de cobrança (MM/YYYY)

**Seção: Tipo de Cobrança**
- `tipo_cobranca` (obrigatório) - Select com tipos (Faturado, Hora Extra, Sobreaviso, Bolsão Enel, Reprovado, Outros)
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
- **Modo edição**: Formulário preenchido com dados do requerimento via `defaultValues` do useForm (valores iniciais definidos na criação do formulário)
- **Busca automática de taxa**: Ao selecionar cliente, busca taxa vigente automaticamente
- **Preenchimento automático**: Valores/hora preenchidos baseado em taxa, linguagem e tipo de cobrança
- **Limpeza automática**: Campos condicionais limpos quando tipo de cobrança muda para tipo incompatível
- **Cálculo automático**: Valor total calculado em tempo real conforme horas e valores/hora mudam
- **Desabilitação durante loading**: Botões desabilitados durante operações assíncronas

**Opções de linguagem:**
```typescript
[
  { value: 'Funcional', label: 'Funcional' },
  { value: 'Técnico', label: 'Técnico' },
  { value: 'ABAP', label: 'ABAP' },
  { value: 'DBA', label: 'DBA' },
  { value: 'Gestor', label: 'Gestor' }
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
    // ... outros campos
  }
});
```

---
