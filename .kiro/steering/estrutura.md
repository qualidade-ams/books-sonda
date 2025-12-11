# Estrutura do Projeto Books SND

Documentação atualizada da estrutura completa do projeto, incluindo todos os arquivos, diretórios e suas respectivas funcionalidades.

**Última atualização**: Sistema de templates dinâmicos de elogios aprimorado com interface de seleção de templates, hook customizado de notificações toast e componentes especializados para melhor experiência do usuário.

---

## Diretório Principal do Projeto

### `src/services/`

Serviços para integração com APIs e lógica de negócio.

#### `elogiosTemplateService.ts`
Serviço avançado para processamento dinâmico de templates de elogios, substituindo o layout hardcoded por sistema flexível baseado em templates armazenados no banco de dados.

**Funcionalidades principais:**
- **Sistema de templates dinâmico**: Busca templates de elogios armazenados na tabela `email_templates` do banco
- **Busca inteligente com fallback aprimorada**: Implementa estratégia de busca robusta em múltiplas etapas:
  - **Busca por template específico**: Se `templateId` fornecido e diferente de 'template_elogios_padrao', busca template específico por ID, tipo "elogios" e status ativo
  - **Fallback para template padrão**: Se não encontrar template específico ou não houver templateId, busca template padrão por nome ("Template Elogios") e tipo ("elogios")
  - **Fallback genérico**: Se template padrão não existir, busca qualquer template ativo do tipo "elogios"
  - **Logging detalhado**: Console logs estruturados para troubleshooting (✅ Template específico encontrado, ⚠️ Erro ao buscar template específico)
- **Criação automática de template padrão**: Cria template padrão completo automaticamente se não existir no banco (template HTML responsivo pronto para uso)
- **Processamento de variáveis**: Sistema de substituição de variáveis no template (ex: `{{sistema.mesNomeAtual}}`, `{{TITULO_PRINCIPAL}}`)
- **Geração de HTML responsivo**: Produz HTML otimizado para clientes de email com layout responsivo
- **Fallback robusto**: Template hardcoded como fallback caso não consiga acessar o banco
- **Organização em linhas**: Elogios organizados automaticamente em linhas de 3 cards cada
- **Divisores decorativos**: Sistema de divisores com aspas alternadas (azul/rosa) entre linhas
- **URLs de imagens fixas**: Template padrão usa URLs absolutas hardcoded para header (http://books-sonda.vercel.app/images/header-elogios.png) garantindo carregamento confiável
- **Suporte a templates personalizados**: Permite uso de templates específicos criados via interface administrativa através do parâmetro `templateId`

**Classe principal: ElogiosTemplateService**
- `buscarTemplateElogios()` - Busca template ativo na tabela `email_templates`
- `criarTemplatePadrao()` - Cria template padrão completo se não existir (template HTML responsivo funcional)
- `processarTemplate(elogios, mes, ano, templateId?)` - Processa template com dados dos elogios selecionados, com suporte a template específico
- `gerarHtmlElogios(elogios)` - Gera HTML dos elogios organizados em linhas de 3
- `processarTemplateFallback()` - Template de emergência quando banco não está acessível
- `getVariaveisDisponiveis()` - Lista todas as variáveis disponíveis para templates

**Interfaces exportadas:**
- `ElogiosTemplateVariables` - Definição de todas as variáveis disponíveis para templates
- `ProcessedElogiosTemplate` - Resultado do processamento com HTML, variáveis e estatísticas

**Variáveis de template suportadas:**

**Sistema:**
- `{{sistema.mesNomeAtual}}` - Nome do mês em maiúsculas (ex: DEZEMBRO)
- `{{sistema.anoAtual}}` - Ano atual (ex: 2024)
- `{{sistema.dataAtual}}` - Data atual formatada (ex: 11/12/2024)

**Cabeçalho:**
- `{{TITULO_PRINCIPAL}}` - Título principal do relatório
- `{{SUBTITULO}}` - Subtítulo do relatório
- `{{HEADER_IMAGE_URL}}` - URL da imagem do cabeçalho
- `{{FOOTER_IMAGE_URL}}` - URL da imagem do rodapé

**Conteúdo:**
- `{{ELOGIOS_LOOP}}` - Loop principal dos elogios (substituído automaticamente)

**Fluxo de processamento:**
1. **Busca inteligente de template**: Se templateId fornecido, busca template específico; senão busca template padrão
2. **Fallback automático**: Se não encontrar, cria template padrão automaticamente
3. **Fallback de emergência**: Se falhar, usa template hardcoded como fallback
4. **Preparação de variáveis**: Prepara variáveis do sistema (mês, ano, URLs de imagens)
5. **Geração de HTML**: Gera HTML dos elogios organizados em linhas de 3
6. **Substituição de variáveis**: Substitui todas as variáveis no template
7. **Retorno processado**: Retorna HTML processado com estatísticas

**Integração:**
- Utilizado pela página `EnviarElogios.tsx` para geração de relatórios
- Integra-se com tabela `email_templates` do Supabase
- Substitui função `gerarRelatorioElogios()` hardcoded por sistema dinâmico
- Permite customização de templates via interface administrativa
- Suporta seleção de templates específicos através do parâmetro `templateId`

**Melhorias recentes:**
- **Seletor de templates movido para modal**: Seletor de templates agora aparece apenas no modal de envio de elogios
- **Template padrão condicional**: Template padrão só aparece se não houver templates personalizados cadastrados
- **Regeneração automática**: Preview do relatório é regenerado automaticamente quando usuário muda template
- **UX otimizada**: Fluxo mais intuitivo com seleção de template integrada ao processo de envio
- **Correção crítica de templates**: Corrigido problema onde templates de elogios apareciam no campo "Template Padrão" do formulário de empresas
- **Filtragem rigorosa**: Implementada filtragem por palavra-chave e tipo para separar completamente templates de books e elogios
- **Sistema de notificações aprimorado**: Migração de `sonner` para hook customizado `useToast` para melhor controle e consistência
- **Interface de seleção de templates**: Componente `SeletorTemplateElogios` integrado ao modal de envio
- **Hook especializado**: `useElogiosTemplates` para gerenciamento específico de templates de elogios
- **Hook corrigido**: `useBookTemplates` agora bloqueia rigorosamente templates de elogios com validação dupla
- **Scripts de debug**: Criados scripts para identificar e corrigir templates marcados incorretamente
- **Busca por template específico implementada**: Adicionada lógica para buscar template específico por ID quando `templateId` é fornecido e diferente de 'template_elogios_padrao'
- **Logging aprimorado**: Console logs estruturados indicando quando template específico é encontrado (✅) ou quando há erro na busca (⚠️)
- **Flexibilidade aumentada**: Sistema agora suporta tanto templates padrão quanto templates personalizados criados via interface administrativa
- **Robustez mantida**: Mantido sistema de fallback robusto que garante funcionamento mesmo se template específico não for encontrado
- **Compatibilidade preservada**: Parâmetro `templateId` é opcional, mantendo compatibilidade com código existente

---

### `src/pages/admin/`

Páginas administrativas do sistema Books SND.

#### `EnviarElogios.tsx`
Página completa para gerenciamento e envio de elogios por email, permitindo seleção, visualização e disparo de relatórios formatados de elogios recebidos de clientes.

**Funcionalidades principais:**
- **Navegação temporal**: Navegação por período (mês/ano) com botões anterior/próximo
- **Filtro automático por status**: Exibe apenas elogios com status "compartilhado"
- **Seleção de elogios**: Seleção individual ou em massa via checkboxes
- **Seletor de templates no modal**: Interface para escolha de templates de elogios dentro do modal de envio
- **Geração de relatório dinâmica**: Utiliza sistema de templates dinâmicos via `elogiosTemplateService`
- **Regeneração automática**: Template é regenerado automaticamente quando usuário muda a seleção
- **Configuração de email**: Interface completa para configuração de email com campos para destinatários e CC
- **Gerenciamento de anexos**: Suporte a múltiplos anexos com limite de 25MB e visualização detalhada
- **Preview em tempo real**: Preview do relatório HTML atualizado conforme seleção de template
- **Validação robusta**: Validação de emails e campos obrigatórios
- **Estatísticas visuais**: Cards com estatísticas do período (total, registrados, compartilhados)
- **Controle de acesso**: Integração com sistema de permissões via `ProtectedAction`
- **Sistema de notificações**: Utiliza hook `useToast` para feedback ao usuário
- **Tabela responsiva**: Exibição detalhada dos elogios com informações de chamado, empresa, cliente e comentários

**Integração com templates dinâmicos:**
- Utiliza `elogiosTemplateService.processarTemplate()` para geração de relatórios
- Suporte a templates personalizados através de seletor de templates no modal
- Template padrão só aparece se não houver templates personalizados cadastrados
- Regeneração automática do preview quando template é alterado
- Sistema robusto que garante funcionamento mesmo com problemas no banco de dados

**Fluxo de uso:**
1. Usuário seleciona elogios na tabela
2. Clica em "Disparar Elogios"
3. Modal abre com seletor de templates
4. Usuário escolhe template (regenera preview automaticamente)
5. Configura destinatários e anexos
6. Visualiza preview do relatório
7. Confirma e envia email

**Componentes utilizados:**
- `SeletorTemplateElogios` - Seletor de templates de elogios (dentro do modal)
- `ProtectedAction` - Controle de acesso baseado em permissões
- Componentes UI do shadcn/ui (Dialog, Table, Card, Badge, etc.)

**Hooks utilizados:**
- `useToast` - Sistema de notificações toast
- `useElogios` - Busca e gerenciamento de elogios
- `useEstatisticasElogios` - Estatísticas do período
- `useEmpresas` - Dados das empresas cadastradas

---

### `src/components/admin/elogios/`

Componentes específicos para o sistema de elogios.

#### `SeletorTemplateElogios.tsx`
Componente especializado para seleção de templates de elogios, integrado ao sistema de templates dinâmicos.

**Funcionalidades principais:**
- **Seleção de templates**: Interface dropdown para escolha de templates de elogios
- **Templates personalizados**: Suporte a templates criados via interface administrativa
- **Template padrão**: Fallback automático para template padrão do sistema
- **Loading state**: Estado de carregamento durante busca de templates
- **Validação visual**: Badge indicando template padrão
- **Descrições**: Exibição de descrições dos templates para melhor usabilidade

**Props:**
- `templateSelecionado` - ID do template atualmente selecionado
- `onTemplateChange` - Callback para mudança de template
- `disabled` - Estado desabilitado do componente

**Integração:**
- Utiliza hook `useElogiosTemplates` para busca de templates
- Integra-se com `elogiosTemplateService` para processamento
- Usado na página `EnviarElogios.tsx` para seleção de templates

---

### `src/hooks/`

Hooks customizados para gerenciamento de estado e lógica de negócio.

#### `useToast.ts`
Hook para sistema de notificações toast, substituindo a biblioteca `sonner` por implementação customizada.

**Funcionalidades principais:**
- **Sistema de toast customizado**: Implementação própria de notificações
- **Gerenciamento de estado**: Estado global para toasts ativos
- **Limite de toasts**: Controle de quantidade máxima de toasts simultâneos
- **Auto-dismiss**: Remoção automática após timeout configurável
- **API simples**: Interface similar ao `sonner` para facilitar migração

**API:**
- `toast({ title, description, variant })` - Exibe nova notificação
- `dismiss(toastId)` - Remove notificação específica
- Estado reativo com lista de toasts ativos

#### `useElogiosTemplates.ts`
Hook especializado para gerenciamento de templates de elogios, filtrando apenas templates do tipo 'elogios'.

**Funcionalidades principais:**
- **Filtro por tipo**: Busca apenas templates ativos do tipo 'elogios'
- **Template padrão condicional**: Adiciona opção de template padrão APENAS se não existir NENHUM template personalizado
- **Priorização de templates personalizados**: Templates personalizados têm prioridade sobre o padrão
- **Opções estruturadas**: Retorna lista formatada para componentes de seleção
- **Utilitários**: Funções auxiliares para identificação e busca de templates
- **Logging**: Console logs para troubleshooting e debug

**Interface `ElogiosTemplateOption`:**
- `value` - ID único do template
- `label` - Nome exibido ao usuário
- `description` - Descrição opcional do template
- `isDefault` - Indica se é template padrão do sistema

**Métodos:**
- `getTemplateById(id)` - Busca template específico por ID
- `isDefaultTemplate(id)` - Verifica se template é padrão
- `getCustomTemplates()` - Retorna apenas templates personalizados
- `getDefaultTemplates()` - Retorna apenas templates padrão

**Integração:**
- Utiliza hook `useEmailTemplates` como base
- Usado pelo componente `SeletorTemplateElogios`
- Integra-se com tabela `email_templates` do Supabase

#### `useBookTemplates.ts`
Hook especializado para gerenciamento de templates de books, com filtragem rigorosa para evitar mistura com templates de elogios.

**Funcionalidades principais:**
- **Filtragem rigorosa**: Bloqueia qualquer template que contenha palavras-chave de elogios ('elogios', 'elogio', 'praise', 'compliment')
- **Validação dupla**: Verifica tanto o tipo quanto o nome do template para garantir separação completa
- **Templates padrão**: Adiciona templates padrão do sistema (Português, Inglês) se não existirem personalizados
- **Logs de debug**: Console logs para identificar templates problemáticos e bloqueados
- **Prevenção de regressão**: Sistema robusto que impede templates de elogios de aparecerem em formulários de books

**Correção crítica implementada:**
- **Problema**: Templates de elogios apareciam no campo "Template Padrão" do formulário de empresas
- **Solução**: Filtragem por palavra-chave que bloqueia automaticamente qualquer template com "elogios" no nome
- **Validação**: Verificação dupla por tipo (`template.tipo !== 'elogios'`) e por nome (não contém palavras-chave de elogios)
- **Logs**: Mensagens claras no console quando templates de elogios são bloqueados (`🚨 Template de elogios BLOQUEADO`)

**Interface `BookTemplateOption`:**
- `value` - ID único do template
- `label` - Nome exibido ao usuário
- `description` - Descrição opcional do template
- `isDefault` - Indica se é template padrão do sistema

**Métodos:**
- `getTemplateById(id)` - Busca template específico por ID
- `isDefaultTemplate(id)` - Verifica se template é padrão do sistema
- `getCustomTemplates()` - Retorna apenas templates personalizados
- `getDefaultTemplates()` - Retorna apenas templates padrão

**Integração:**
- Utilizado pelo formulário `EmpresaForm.tsx` para campo "Template Padrão"
- Integra-se com hook `useEmailTemplates` como base
- Garante que apenas templates válidos para books apareçam no dropdown

---

## Estrutura de Diretórios

```
src/
├── components/          # Componentes reutilizáveis
│   ├── admin/          # Componentes administrativos
│   │   ├── elogios/    # Componentes de elogios
│   │   │   └── SeletorTemplateElogios.tsx  # Seletor de templates de elogios
│   │   └── templates/  # Componentes de templates
│   ├── auth/           # Componentes de autenticação
│   │   └── ProtectedAction.tsx  # Controle de acesso baseado em permissões
│   ├── errors/         # Tratamento de erros
│   └── ui/             # Componentes UI genéricos (shadcn/ui)
├── config/             # Configurações da aplicação
├── contexts/           # Provedores de contexto React
├── hooks/              # Hooks customizados
│   ├── useToast.ts     # Hook para sistema de notificações toast
│   ├── useElogios.ts   # Hook para gerenciamento de elogios
│   ├── useElogiosTemplates.ts  # Hook especializado para templates de elogios
│   ├── useBookTemplates.ts     # Hook para templates de books (corrigido)
│   └── useEmailTemplates.ts    # Hook para templates de email genéricos
├── integrations/       # Integrações externas
│   └── supabase/       # Cliente e tipos Supabase
├── lib/                # Bibliotecas utilitárias
├── pages/              # Páginas da aplicação
│   └── admin/          # Páginas administrativas
│       └── EnviarElogios.tsx  # Página de envio de elogios
├── services/           # Serviços de API e lógica de negócio
│   └── elogiosTemplateService.ts  # Serviço de templates dinâmicos
├── styles/             # Estilos globais
├── types/              # Definições de tipos TypeScript
└── utils/              # Funções utilitárias
```

---

## Tecnologias Utilizadas

- **React 18** com TypeScript
- **Vite** como build tool
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes UI
- **Supabase** para backend
- **TanStack Query** para gerenciamento de estado do servidor
- **React Hook Form** com validação Zod
- **Lucide React** para ícones

---

## Convenções de Nomenclatura

- **PascalCase** para componentes React
- **camelCase** para utilitários e serviços
- **kebab-case** para páginas quando necessário
- **lowercase** para diretórios

---

## Padrões de Arquitetura

- **Páginas**: Componentes de rota de nível superior
- **Componentes**: Componentes reutilizáveis organizados por domínio
- **Serviços**: Lógica de negócio e integração com APIs
- **Hooks**: Lógica de estado customizada
- **Tipos**: Definições TypeScript centralizadas
- **Utilitários**: Funções auxiliares reutilizáveis

---

Este arquivo documenta a estrutura atual do projeto Books SND, com foco especial no sistema de templates dinâmicos de elogios que foi recentemente aprimorado para suportar templates personalizados e busca inteligente com múltiplos fallbacks.