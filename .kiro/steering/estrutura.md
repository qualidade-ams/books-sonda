# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Serviço `elogiosService.ts` - adicionados campos `email_cliente`, `prestador`, `categoria` e `grupo` na busca de elogios para suportar formulário completo de cadastro/edição.

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

**Hooks utilizados:**
- `useTaxas()`: Busca todas as taxas cadastradas
- `useCriarTaxa()`: Hook para criação de novas taxas
- `useAtualizarTaxa()`: Hook para atualização de taxas existentes
- `useDeletarTaxa()`: Hook para exclusão de taxas
- `useCriarTaxaPadrao()`: Hook para criação de taxas padrão

**Ícones utilizados (lucide-react):**
- `Plus`, `Edit`, `Trash2`, `Eye`

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

**Funções principais:**
- `handleNovaTaxa()`: Abre modal para criar nova taxa
- `handleAbrirTaxaPadrao()`: Abre modal de configuração de taxa padrão
- `handleSalvarTaxaPadrao(dados)`: Salva nova taxa padrão
- `handleEditarTaxa(taxa)`: Abre modal de edição com dados da taxa
- `handleVisualizarTaxa(taxa)`: Abre modal de visualização com detalhes completos
- `handleDeletarTaxa(id)`: Exclui taxa com confirmação
- `handleSubmit(dados)`: Salva taxa (criação ou edição)
- `verificarVigente(vigenciaInicio, vigenciaFim)`: Verifica se taxa está vigente na data atual

**Estrutura da tabela principal:**
- **Coluna Cliente**: Nome abreviado do cliente
- **Coluna Tipo Produto**: Badge azul para GALLERY, outline para OUTROS (exibe nomes dos produtos quando OUTROS)
- **Coluna Vigência Início**: Data formatada em pt-BR (DD/MM/YYYY)
- **Coluna Vigência Fim**: Data formatada ou "Indefinida"
- **Coluna Status**: Badge verde para "Vigente", cinza para "Não Vigente"
- **Coluna Ações**: Botões de visualizar, editar e excluir

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

**Estilo visual:**
- Tabelas com cabeçalho azul Sonda (#0066FF)
- Linhas alternadas (zebra striping) para melhor legibilidade
- Células calculadas com fundo azul claro (bg-blue-50)
- Valores base em negrito para destaque
- Bordas arredondadas nas tabelas
- Layout responsivo com scroll horizontal quando necessário

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
