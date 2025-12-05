# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Serviço `taxaPadraoService.ts` - implementada lógica inteligente de reajuste que cria nova taxa padrão ao invés de atualizar quando há `taxa_reajuste > 0`, preservando histórico completo de parametrizações. Documentação completa do serviço incluída com detalhes de CRUD, lógica de reajuste, estrutura de dados e fluxos de criação/atualização.

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
- **Botão de adicionar**: Botão flutuante com ícone Plus para criar novo elogio
- **Controles de paginação**: Select de itens por página, navegação entre páginas e contador de registros

**Estados gerenciados:**
- `mesSelecionado`, `anoSelecionado`: Controle do período visualizado
- `filtros`: Objeto com filtros aplicados (busca, mes, ano)
- `selecionados`: Array de IDs dos elogios selecionados
- `elogioVisualizando`: Elogio atualmente sendo visualizado no modal
- `modalVisualizarAberto`: Controle de abertura do modal de edição
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
- `ElogioCompleto`: Tipo completo do elogio com dados da pesquisa relacionada
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

---

#### `EnviarElogios.tsx`
Página completa para gerenciamento e envio de elogios por email, permitindo seleção, visualização e disparo de relatórios formatados de elogios recebidos de clientes.

**Funcionalidades principais:**
- **Navegação temporal**: Navegação por período (mês/ano) com botões anterior/próximo para visualizar elogios de diferentes períodos
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

**Ícones utilizados (lucide-react):**
- `Mail`, `Send`, `Paperclip`, `X`, `FileText`, `Calendar`, `ChevronLeft`, `ChevronRight`, `CheckSquare`, `Square`, `TrendingUp`, `Database`

**Componentes UI principais:**
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
- `gerarRelatorioElogios()`: Gera HTML formatado do relatório com todos os elogios selecionados
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
- **Estrutura completa HTML5** com DOCTYPE e meta charset UTF-8
- **Cabeçalho azul gradiente** (#0066FF → #0052CC) com logo "N" branco em destaque
- **Efeito de onda** no cabeçalho e rodapé usando border-radius avançado
- **Caixa de título centralizada** com borda rosa (#E91E63) e texto em caixa alta
- **Lista de colaboradores** em destaque (nomes únicos dos clientes separados por "|") em azul e caixa alta
- **Grid responsivo 4 colunas** (1 coluna em mobile) para cards de elogios
- **Aspas decorativas** grandes em rosa (#E91E63) e azul (#0066FF) envolvendo os elogios
- **Cards de elogios** com fundo cinza claro (#f8f9fa), borda esquerda azul, contendo:
  - Nome do consultor/prestador em azul e caixa alta (campo `consultor` da pesquisa)
  - Comentário da pesquisa (se houver)
  - Informações do cliente e empresa
- **CTA Box** com borda rosa explicando como enviar elogios
- **Rodapé azul gradiente** com logo "SONDA" e tagline "make it easy"
- **CSS inline minificado** para compatibilidade máxima com clientes de email
- **Layout responsivo** com max-width de 1000px e adaptação mobile
- **Paleta de cores Sonda**: Azul (#0066FF, #0052CC), Rosa (#E91E63), Cinza (#f8f9fa)

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
- `ElogioCompleto`: Tipo completo do elogio com dados da pesquisa
- `FiltrosElogio`: Filtros para busca (mês, ano)

**Melhorias recentes:**
- **Reorganização de colunas**: Ordem otimizada para melhor fluxo de leitura (Chamado → Empresa → Data → Cliente → Comentário → Resposta)
- **Larguras fixas**: Colunas com larguras definidas para melhor controle de layout e responsividade
- **Validação visual de empresas**: Implementada função `obterDadosEmpresa()` que destaca em vermelho empresas não cadastradas no sistema
- **Formatação aprimorada**: 
  - Chamado exibido com tipo do caso (IM/PR/RF) em fonte mono com fundo cinza
  - Data com estilo muted para melhor hierarquia visual
  - Badge de resposta com whitespace-nowrap para evitar quebra de linha
  - Textos responsivos com classes sm:text-sm para adaptação mobile
- **Melhor truncamento**: Cliente e comentário com truncamento apropriado para evitar overflow

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
- `ElogioCompleto` - Tipo completo do elogio importado de `@/types/elogios`
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

**Métodos principais:**
- `criarRequerimento(data: RequerimentoFormData): Promise<Requerimento>` - Cria novo requerimento com validações
- `buscarRequerimentosEnviados()` - Busca requerimentos com formatação automática de horas
- `formatarRequerimento(req)` - Converte horas decimais para formato HH:MM para exibição
- `resolverNomesUsuarios(userIds: string[])` - Resolve nomes de autores a partir de IDs
- `validarDadosRequerimento(data)` - Valida dados antes de salvar
- `verificarClienteExiste(clienteId)` - Verifica existência de cliente

**Integração com utilitários:**
- Utiliza `horasUtils.ts` para conversão entre formatos de horas (decimal ↔ HH:MM)
- Utiliza `mesCobrancaUtils.ts` para conversão de mês de cobrança

**Melhorias recentes:**
- Adicionada formatação automática de horas na busca de requerimentos enviados
- Implementada conversão de horas decimais para formato HH:MM antes de retornar dados
- Garantia de que todos os requerimentos retornados têm horas no formato correto para exibição
- Refatoração para aplicar `formatarRequerimento()` em todos os requerimentos buscados

**Fluxo de formatação:**
1. Busca requerimentos do banco (horas em formato decimal)
2. Resolve nomes dos autores via IDs
3. Aplica `formatarRequerimento()` para converter horas decimais → HH:MM
4. Retorna dados formatados prontos para exibição

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
