# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Componente `PesquisaForm.tsx` - implementado mapeamento inteligente de empresas para compatibilidade entre nome completo e abreviado durante edição de pesquisas.

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

**Componentes UI principais:**
- **Tabela de elogios**: Exibição de elogios com colunas (empresa, cliente, chamado, data resposta, resposta, comentário) e checkboxes para seleção
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

**Melhorias futuras (TODOs):**
- Implementar serviço real de envio de email para elogios
- Integração com backend para disparo efetivo de emails

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
