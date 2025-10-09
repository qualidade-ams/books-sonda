<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
books-snd/
├── .kiro/                      						      # Configurações do Kiro AI
│   ├── hooks/                  						      # Hooks automáticos do Kiro
│   │   └── update-structure-file.kiro.hook             # Hook para atualização automática do arquivo de estrutura
│   ├── specs/                  						      # Especificações de funcionalidades
│   │   ├── anexos-disparos-personalizados/            # Especificação do sistema de anexos para disparos personalizados
│   │   │   ├── design.md                               # Documento de design da funcionalidade
│   │   │   └── tasks.md                                # Plano de implementação com tarefas
│   │   ├── api-error-handling-dom-fixes/              # Especificação para correções de tratamento de erros de API e DOM
│   │   ├── client-books-management/                   # Especificação do sistema de gerenciamento de client books
│   │   └── sistema-requerimentos/                     # Especificação do sistema de requerimentos de especificações funcionais
│   │       ├── requirements.md                        # Documento de requisitos funcionais do sistema de requerimentos
│   │       ├── design.md                              # Documento de design e arquitetura do sistema de requerimentos
│   │       └── tasks.md                               # Plano de implementação com tarefas do sistema de requerimentos
│   └── steering/               						      # Regras e diretrizes do projeto
│       ├── estrutura.md        						      # Estrutura e organização do projeto
│       ├── padrao.md           						      # Padrões e convenções
│       ├── product.md          						      # Visão geral do produto
│       ├── structure.md        						      # Estrutura de diretórios e arquivos
│       └── tech.md             						      # Stack tecnológico
├── docs/                       						      # Documentação técnica
│   ├── ANEXOS_INFRASTRUCTURE.md					      # Documentação da infraestrutura de anexos para disparos personalizados (buckets, políticas RLS, funções SQL, configuração e troubleshooting)
│   ├── POWER_AUTOMATE_ANEXOS_CONFIG.md				      # Guia completo de configuração do Power Automate para processamento de anexos no sistema de disparos personalizados (estrutura de payload, fluxos de download, tratamento de erros, validações de segurança, monitoramento e troubleshooting)
│   └── TESTES_E2E_ANEXOS.md						      # Documentação dos testes end-to-end para sistema de anexos (cenários de teste, validações e troubleshooting)
├── public/                     						      # Arquivos estáticos
│   ├── favicon.ico             						      # Ícone da aplicação
│   ├── robots.txt              						      # Arquivo de configuração para crawlers
│   └── images/                 						      # Imagens do projeto
│       ├── qualidade/          						      # Imagens relacionadas a qualidade
│       ├── book.jpg            						      # Imagem ilustrativa de book
│       ├── fundo-sonda.png			                      # Imagem de fundo da Sonda
│       ├── login-sonda.jpg			                      # Imagem de login da Sonda
│       ├── login-sonda2.jpg                            # Imagem alternativa de login da Sonda
│       ├── logo-sonda-16x16.png                        # Logo da Sonda 16x16
│       ├── logo-sonda.png                              # Logo principal da Sonda
│       ├── n-sonda-azul.png                            # Logo N da Sonda em azul
│       └── sonda-logo.png                              # Logo da Sonda			
│			
├── src/                        						      # Código-fonte principal
│   ├── components/             						      # Componentes reutilizáveis
│   │   ├── admin/              						      # Componentes de administração
│   │   │   ├── anexos/         						      # Componentes do sistema de anexos para disparos personalizados
│   │   │   │   ├── __tests__/          				   # Testes dos componentes do sistema de anexos
│   │   │   │   ├── AnexoAlertsMonitor.tsx				   # Monitor de alertas em tempo real para sistema de anexos (exibe alertas críticos, de alta prioridade e médios, controle de monitoramento ativo/pausado, limpeza de alertas, resolução individual de alertas, resumo de alertas por severidade, histórico de alertas resolvidos, interface responsiva com scroll otimizado e indicadores visuais por tipo de alerta)
│   │   │   │   ├── AnexoAuditDashboard.tsx				   # Dashboard de auditoria para sistema de anexos (visualização de logs, métricas de operações e análise de performance)
│   │   │   │   ├── AnexoDashboard.tsx					   # Dashboard principal do sistema de anexos (métricas gerais, estatísticas de uso e monitoramento)
│   │   │   │   ├── AnexoMonitoringConfig.tsx			   # Configuração de monitoramento para sistema de anexos (configurações de alertas, limites e thresholds)
│   │   │   │   ├── AnexoPerformanceMonitor.tsx			   # Monitor de performance específico para anexos (tempo de upload, taxa de sucesso, gargalos)
│   │   │   │   ├── AnexoPerformanceReport.tsx			   # Relatório de performance do sistema de anexos (análise detalhada de métricas e tendências)
│   │   │   │   ├── AnexoUpload.tsx						   # Componente de upload de múltiplos arquivos com drag-and-drop, validação de tipos e tamanhos, controle de limite de 25MB por empresa, indicador de progresso, lista de arquivos selecionados, integração com hook useAnexos para gerenciamento centralizado de estado (incluindo recarregamento de anexos por empresa e sincronização manual de cache), verificação automática de status dos anexos ao montar o componente ou trocar de empresa (garante sincronização imediata com o banco de dados), verificação periódica automática otimizada a cada 15 segundos para manter dados sempre atualizados, sistema inteligente de detecção de anexos pendentes há mais de 1 minuto com forçamento de atualização automática a cada 30 segundos para resolver problemas de sincronização, e sistema avançado de debug com logs detalhados de upload (arquivos selecionados, anexos salvos no banco, verificação pós-upload com timeout para monitoramento de sincronização e troubleshooting de problemas de interface)
│   │   │   │   ├── AnexoUploadExample.tsx				   # Exemplo de uso do componente AnexoUpload (demonstração e testes)
│   │   │   │   ├── index.ts							      # Exportações centralizadas dos componentes de anexos
│   │   │   │   ├── InfrastructureChecker.tsx			   # Verificador de infraestrutura do sistema de anexos (validação de buckets, políticas RLS e configurações)
│   │   │   │   └── README.md							      # Documentação dos componentes de anexos
│   │   │   ├── client-books/   						      # Componentes do sistema de clientes e books
│   │   │   │   ├── __tests__/          				   # Testes dos componentes do sistema de books
│   │   │   │   │   └── TemplatePreview.test.tsx		   # Testes do componente de prévia de templates
│   │   │   │   ├── ClientImportExportButtons.tsx		   # Componente unificado de botões para importação e exportação de empresas e clientes com suporte a Excel e PDF
│   │   │   │   ├── ClienteForm.tsx						   # Formulário de cadastro/edição de clientes
│   │   │   │   ├── ClientesTable.tsx					   # Tabela de listagem de clientes com sistema de busca otimizado (debounce de 500ms para melhor performance, sincronização automática entre busca local e filtros externos, controle de estado local para entrada de texto responsiva, filtros por status e empresa com ordenação alfabética automática por nome abreviado usando localeCompare pt-BR, badges visuais por status com ícones, formatação de datas, integração com sistema de permissões, interface responsiva com colunas condicionais e fallback para estados vazios)
│   │   │   │   ├── EmpresaForm.tsx						   # Formulário de cadastro/edição de empresas com campos AMS, Tipo de Book, Link SharePoint, vigência de contrato e opções específicas para books de qualidade (Book Personalizado e Anexo)
│   │   │   │   ├── EmpresaImportExportButtons.tsx		   # Componente específico de botões para importação e exportação de empresas clientes com dropdown menus, suporte a Excel e PDF, modal avançado de importação com preview de dados e resultado detalhado, integração completa com hook useExcelImport, controle otimizado de estado do modal (fechamento automático quando não há dados para exibir), e botão "Nova Importação" na tela de resultado para facilitar importações sequenciais sem fechar o modal
│   │   │   │   ├── EmpresasFiltros.tsx					   # Componente de filtros simplificados para empresas clientes (busca por nome com ícone Search posicionado à esquerda, filtros únicos por status e produtos usando Select padrão, interface minimalista com botão toggle simples para mostrar/ocultar filtros, layout responsivo em grid de 3 colunas md:grid-cols-3, integração com componentes Select padrão do shadcn/ui, sem badges visuais ou contadores para manter consistência com padrão da tela de clientes)
│   │   │   │   ├── EmpresasTable.tsx					   # Tabela de listagem de empresas clientes com mapeamento de templates para siglas concisas (PT-BR, EN, SAMARCO, NOVO NORDISK) - correção na detecção do template "Novo Nordisk" com espaço
│   │   │   │   ├── GrupoForm.tsx						   # Formulário de cadastro/edição de grupos responsáveis
│   │   │   │   ├── GruposTable.tsx						   # Tabela de listagem de grupos responsáveis
│   │   │   │   └── index.ts							      # Exportações centralizadas dos componentes
│   │   │   ├── email/ 									      # Template de emails
│   │   │   │   └── EditorEmail.tsx						   # Editor HTML
│   │   │   │   └── EditorTemplateCompleto.tsx			# Tela completa editor template
│   │   │   │   └── EmailTemplateErrorFallback.tsx		# Erro ao encontrar template
│   │   │   │   └── FormularioConfiguracaoWebhook.tsx	# Tela configuração Webhook com correção para garantir que campos email e email_cc sejam sempre arrays para compatibilidade com Power Automate
│   │   │   │   └── FormularioNovoTemplate.tsx			# Tela criação novo template
│   │   │   │   └── GerenciadorTemplatesEmail.tsx		# Gerenciador completo de templates de email (listagem, criação, edição, exclusão, ativação/desativação, teste de envio, controle de permissões e exibição de ID para importação com funcionalidade de cópia para clipboard)
│   │   │   │   └── index.ts							      # Exportações centralizadas dos componentes de email
│   │   │   │   └── PreviewEmail.tsx					   # Preview Template HTML
│   │   │   │   └── PreviewEmailClientBooks.tsx		   # Preview específico para templates do sistema de books
│   │   │   │   └── TemplateMappingList.tsx				# Listagem de templates
│   │   │   │   └── TemplateMappingValidation.tsx		# Validação de template
│   │   │   │   └── TemplateValidationStatus.tsx		   # Status de validação de templates
│   │   │   │   └── TesteVariaveisClientBooks.tsx		# Teste de variáveis específico para sistema de books
│   │   │   │   └── TesteVariaveisEmail.tsx				# Simula variáveis --- Ajustar variáveis
│   │   │   │   └── TesteVariaveisUnificado.tsx			# Teste unificado de variáveis para todos os sistemas
│   │   │   │   └── VariaveisTemplate.tsx				   # Listagem de variáveis
│   │   │   │   └── VariaveisTemplateExtendido.tsx		# Listagem estendida de variáveis com mais detalhes
│   │   │   │   └── VisualizadorLogsEmail.tsx			# Listagem de logs e-mail
│   │   │   ├── excel/          						      # Componentes de importação Excel
│   │   │   │   └── ExcelImportDialog.tsx				   # Modal de importação de arquivos Excel
│   │   │   │   └── ExcelPreview.tsx					   # Preview dos dados do Excel antes da importação
│   │   │   │   └── ExcelUpload.tsx						   # Componente de upload de arquivos Excel
│   │   │   │   └── ImportResult.tsx					   # Resultado da importação com relatórios
│   │   │   │   └── index.ts							      # Exportações centralizadas dos componentes Excel
│   │   │   ├── groups/         						      # Gerenciamento de grupos (sistema de permissões)
│   │   │   │   └── DeleteGroupDialog.tsx				   # Deletar grupo
│   │   │   │   └── GroupFormDialog.tsx					# Modal Cadastro grupo
│   │   │   │   └── GroupsTable.tsx						   # Tela listagem grupos
│   │   │   │   └── PermissionConfigDialog.tsx			# Mensagem de permissão da tela
│   │   │   │   └── PermissionLevelSelect.tsx			# Select Box das permissões
│   │   │   │   └── PermissionMatrix.tsx				   # Tela de permissão
│   │   │   │   └── UserGroupAssignmentTable.tsx		# Tabela de atribuição de usuários aos grupos de permissão (listagem de usuários com grupos atuais, seleção de grupos via dropdown, estatísticas de usuários com/sem grupos, estados de loading e feedback de operações, integração com sistema de permissões e controle de acesso baseado em autenticação)
│   │   │   ├── grupos/         						      # Gerenciamento de grupos responsáveis (sistema de books)
│   │   │   │   ├── GrupoDetailsModal.tsx				   # Modal de detalhes do grupo responsável
│   │   │   │   ├── GrupoForm.tsx						   # Formulário de grupo responsável
│   │   │   │   ├── GrupoFormModal.tsx					   # Modal de formulário de grupo responsável
│   │   │   │   ├── GruposTable.tsx						   # Tabela de grupos responsáveis
│   │   │   │   └── ImportExportButtons.tsx				   # Botões de importação e exportação para grupos responsáveis
│   │   │   ├── requerimentos/  						      # Componentes do sistema de requerimentos de especificações funcionais
│   │   │   │   ├── __tests__/          				   # Testes dos componentes do sistema de requerimentos
│   │   │   │   │   ├── RequerimentoCard.test.tsx		   # Testes do componente de card de requerimentos (renderização, interações, estados de loading, validação de dados, funcionalidades de envio para faturamento, layout horizontal em grid de 12 colunas com exibição direta de valores numéricos nas colunas de horas, validação de badges por tipo de cobrança, botões de ação com ícones, verificação de status de envio para faturamento e compatibilidade com novo layout compacto sem prefixos F:/T:/Total)
│   │   │   │   │   └── RequerimentoForm.test.tsx		   # Testes do formulário de requerimentos
│   │   │   │   ├── HelpSystem.tsx					   # Sistema completo de ajuda contextual para requerimentos (componentes de tooltip otimizado, ícones de ajuda com variantes, campos de formulário com ajuda integrada, seções expansíveis, guia completo de requerimentos, modal de ajuda contextual, indicador de progresso com passos, validação em tempo real com feedback visual, suporte a temas claro/escuro e acessibilidade aprimorada)
│   │   │   │   ├── index.ts							      # Exportações centralizadas dos componentes de requerimentos (RequerimentoForm, RequerimentoCard, LoadingStates e HelpSystem)
│   │   │   │   ├── LoadingStates.tsx				   # Componentes de skeleton loading para sistema de requerimentos (LoadingSpinner para indicadores de carregamento, StatsCardSkeleton para cards de estatísticas, RequerimentoCardSkeleton para cards de requerimentos com layout horizontal alinhado incluindo checkbox de seleção 5%, PageLoadingSkeleton para página completa, FiltersSkeleton para seção de filtros, otimizados para layout em grid de 12 colunas com larguras ajustadas 16%/24%/8%/8%/7%/7%/6%/9%/10% e responsividade)

│   │   │   │   ├── RequerimentoCard.tsx				   # Componente de linha horizontal para exibição de requerimentos com layout em grid de 12 colunas alinhado com cabeçalho da lista, design baseado no tipo de cobrança com sistema de cores específico e ícones, distribuição otimizada das colunas compatível com checkbox de seleção (Tipo+Chamado 18%, Cliente 26%, Módulo 8%, Linguagem 8%, Horas Func. 7%, Horas Téc. 7%, Total 6%, Data Envio 10%, Ações 10%), exibição direta de valores numéricos nas colunas de horas sem prefixos, badges de tipo de cobrança compactos, botões de ação apenas com ícones (Edit, Trash2, Send), modal de confirmação para envio ao faturamento, estados de loading e disabled, hover effects, truncamento de texto para campos longos, integração com hook useRequerimentos e useAccessibility, formatação de horas com formatarHorasParaExibicao do horasUtils, e compatibilidade com sistema de permissões e seleção múltipla
│   │   │   │   └── RequerimentoForm.tsx				   # Formulário completo de cadastro/edição de requerimentos com validação Zod, campos obrigatórios (cliente, módulo, linguagem, tipo de cobrança, chamado, descrição, horas funcional/técnico), cálculo automático de horas total com suporte a formato HH:MM utilizando função somarHoras do horasUtils, cálculo automático de valores monetários para tipos de cobrança específicos (Faturado, Hora Extra, Sobreaviso, Bolsão Enel) utilizando converterParaHorasDecimal para conversão precisa de formato HH:MM para decimal, validações de formato para campo chamado, limitação de caracteres para descrição e observação, integração com React Hook Form e função utilitária requerValorHora para verificação de tipos de cobrança que requerem valor/hora
│   │   │   ├── AnexoCleanupManager.tsx					# Gerenciador de limpeza automática de anexos expirados (interface para controle manual e monitoramento do job de limpeza)
│   │   │   ├── AutoSchedulerInitializer.tsx			   # Componente para inicialização automática do job scheduler (garante que o scheduler seja iniciado quando a aplicação carrega)
│   │   │   ├── Breadcrumb.tsx  						      # Navegação em migalhas de pão com suporte às rotas do sistema de client books
│   │   │   ├── CacheInitializer.tsx					   # Componente para limpeza inicial de cache quando o usuário acessa o sistema (garante dados atualizados na primeira sessão, utiliza hook useCacheManager para limpeza centralizada de todos os tipos de cache, execução única por sessão com timestamp de inicialização, estatísticas de cache antes da limpeza, feedback visual discreto em desenvolvimento e logs detalhados para monitoramento)
│   │   │   ├── DialogTesteEmail.tsx 					   # Modal de teste de envio de email
│   │   │   ├── DisparosLoadingSkeleton.tsx				   # Componente skeleton de loading para telas de disparos (estatísticas, ações e lista de empresas com placeholders animados)
│   │   │   ├── index.ts								      # Exportações centralizadas dos componentes admin
│   │   │   ├── JobSchedulerManager.tsx					# Gerenciador de jobs e tarefas agendadas do sistema
│   │   │   ├── LayoutAdmin.tsx							   # Layout principal da área administrativa
│   │   │   ├── PerformanceMonitor.tsx					   # Monitor de performance da aplicação
│   │   │   ├── PermissionsFixer.tsx  					   # Configurador de permissões
│   │   │   ├── SessionInfo.tsx  						   # Informações de expiração de sessão
│   │   │   ├── Sidebar.tsx  							      # Menu lateral de navegação hierárquico com seções expansíveis (Qualidade, Comunicação [Disparos, Disparos Personalizados, Histórico de Books], Clientes [Empresas Clientes, Cadastro de Clientes], Configurações [Grupos Responsáveis, Template E-mails], Administração [Grupos de Usuários, Gerenciar Usuários, Atribuir Usuários, Logs de Auditoria]), suporte a colapso com botão toggle otimizado (posicionamento absoluto -right-3, z-index máximo 2147483647, design compacto 6x6 com cores azul Sonda, sombra e borda aprimoradas), tooltips otimizados com delayDuration de 300ms e z-index 50 para melhor visibilidade, controle de permissões por tela, detecção automática da seção ativa baseada na rota atual, persistência aprimorada do estado das seções expandidas no localStorage com tratamento de erros, scrollbar customizada elegante (6px, azul Sonda com transparência, bordas arredondadas), truncamento de texto para labels longas, otimizações de CSS para elementos flexíveis, controle de overflow aprimorado (sem scroll horizontal), e melhorias de responsividade para experiência visual profissional
│   │   │   ├── ThemeToggle.tsx  						   # Alternador de tema (claro/escuro)
│   │   │   └── VigenciaMonitor.tsx						   # Monitor de vigência de contratos das empresas clientes
│   │   │			
│   │   ├── auth/               						      # Componentes de autenticação
│   │   │   ├── index.ts								      # Exportações centralizadas dos componentes de auth
│   │   │   ├── PermissionFeedback.tsx					   # Feedback quando usuário não tem permissão
│   │   │   ├── ProtectedAction.tsx						   # Componente que renderiza filhos condicionalmente com base nas permissões
│   │   │   ├── ProtectedRoute.tsx						   # Proteção de rotas baseada em permissões
│   │   │   └── SessionTimeoutModal.tsx					# Modal de expiração da sessão
│   │   ├── debug/              						      # Componentes de debug e desenvolvimento
│   │   │   ├── AnexosDebug.tsx							   # Componente de debug para sistema de anexos (visualização de estado, métricas e troubleshooting)
│   │   │   └── AnexosStatus.tsx						   # Componente de status em tempo real para anexos por empresa (exibe arquivos carregados, tamanhos, limites, status de upload, resumo de uso e informações de debug para monitoramento do sistema de anexos)
│   │   ├── errors/             						      # Componentes de tratamento de erro
│   │   │   ├── GlobalErrorBoundary.tsx					# Captura todos os erros não tratados na aplicação
│   │   │   ├── index.ts								      # Exportações centralizadas dos componentes de erro
│   │   │   ├── LoadingFallback.tsx						   # Fallback de carregamento com estados de erro e retry
│   │   │   └── PermissionErrorBoundary.tsx				# Boundary específico para erros de permissão
│   │   ├── notifications/      						      # Componentes de notificação
│   │   │   ├── index.ts								      # Exportações centralizadas dos componentes de notificação
│   │   │   ├── ProgressIndicator.tsx					   # Indicador de progresso para operações longas
│   │   │   └── RealTimeNotifications.tsx				   # Notificações em tempo real via Supabase
│   │   └── ui/                 						      # Componentes de interface genéricos (shadcn/ui)
│   │       ├── input-horas.tsx                         # Componente especializado para entrada de horas com suporte a formatos HH:MM e números inteiros, validação em tempo real, normalização automática, formatação para exibição, integração com horasUtils e feedback visual de validação
│   │       ├── month-year-picker.tsx                   # Componente de seleção de mês e ano com interface dropdown (popover com seleção de mês e ano separados, formatação MM/YYYY, fechamento automático após seleção, integração com formulários e validação, suporte a valores iniciais e callback onChange)
│   │       ├── multi-select.tsx                        # Componente de seleção múltipla com interface moderna (suporte a busca, badges removíveis, controle de máximo de itens exibidos, navegação por teclado, estados de loading e disabled, integração com Command palette, popover customizável, funcionalidade "Selecionar Todos/Desselecionar Todos" com separador visual, detecção inteligente de contexto (status/produtos) e acessibilidade completa)
│   │       └── [51+ componentes UI]                    # Componentes base da biblioteca shadcn/ui incluindo componentes customizados como confirm-dialog, field-speech-button, lazy-loading, pagination-optimized e stepper
│   │				
│   ├── config/                 						      # Configurações da aplicação
│   │   └── emailTemplateConfig.ts						   # Configurações de templates de email
│   │   └── sessionConfig.ts							      # Configuração de timeout de sessão
│   │				
│   ├── contexts/               						      # Contextos React
│   │   └── PermissionsContext.tsx						   # Contexto global para sistema de permissões
│   │				
│   ├── errors/                 						      # Classes de erro customizadas
│   │   ├── __tests__/          						      # Testes das classes de erro
│   │   │   └── clientBooksErrors.test.ts				   # Testes dos erros do sistema de books
│   │   ├── clientBooksErrors.ts						      # Erros específicos do sistema de books
│   │   ├── EmailTemplateError.ts						   # Erros específicos de templates de email
│   │   └── permissionErrors.ts							   # Erros relacionados a permissões
│   │				
│   ├── hooks/                                   		# Custom hooks
│   │   ├── __tests__/          						      # Testes dos custom hooks
│   │   │   └── useBookTemplates.test.ts			   # Testes do hook de templates de books personalizados
│   │   ├── use-mobile.tsx                       		# Hook para detectar dispositivos móveis
│   │   ├── use-toast.ts                         		# Hook para sistema de notificações toast
│   │   ├── useApprovalService.ts                		# Hook para serviços de aprovação
│   │   ├── useCacheManager.ts                   		# Hook para gerenciamento avançado de cache (limpeza, invalidação, monitoramento de cache do React Query e sistema, estatísticas de uso, refresh forçado e utilitários para funcionalidades específicas)
│   │   ├── useAuth.tsx                          		# Hook de autenticação com Supabase
│   │   ├── useBookTemplates.ts                  		# Hook para templates de books com sistema de priorização inteligente (prioriza templates personalizados sobre padrão, adiciona templates padrão "Português" e "Inglês" apenas se não existir template personalizado com o mesmo nome, implementa Set duplo para controle de duplicação e identificação de templates personalizados, logs de debug aprimorados para monitoramento, filtragem específica para formulário 'book' e prevenção completa de duplicação por nome)
│   │   ├── useClientBooksPermissions.ts         		# Hook para permissões específicas do sistema de books
│   │   ├── useClientBooksVariables.ts           		# Hook para variáveis do sistema de clientes e books
│   │   ├── useClientes.ts                       		# Hook para gerenciamento de clientes (renomeado de useColaboradores)
│   │   ├── useControleDisparos.ts               		# Hook para controle de disparos de books com cache otimizado e invalidação inteligente (staleTime de 30s para dados frescos, cacheTime de 5 minutos, refetchOnMount sempre ativo, retry configurado com 2 tentativas e delay de 1s, função centralizada invalidateAllCaches que limpa todos os caches relacionados: controle-disparos, historico-disparos, relatorio-mensal, estatisticas-performance, empresas-sem-books e clientes-com-falhas, garantindo sincronização completa após operações de disparo, reenvio e agendamento)
│   │   ├── useControleDisparosPersonalizados.ts		# Hook para controle de disparos personalizados
│   │   ├── useEmailLogs.ts                      		# Hook para logs de email
│   │   ├── useEmailTemplateMapping.ts           		# Hook para mapeamento de templates de email
│   │   ├── useEmailTemplatePreview.ts           		# Hook para preview de templates
│   │   ├── useEmailTemplates.ts                 		# Hook para gerenciamento de templates
│   │   ├── useEmailVariableMapping.ts           		# Hook para mapeamento de variáveis de email
│   │   ├── useEmpresas.ts                       		# Hook para gerenciamento completo de empresas clientes com paginação, cache otimizado e invalidação cross-screen (CRUD completo, seleção múltipla, importação em lote, alteração de status em lote, cache dinâmico com filtros ativos, invalidação automática do controle de disparos padrão e personalizados, histórico de books, sincronização assíncrona de queries relacionadas, verificação automática de vigência na atualização de empresas com inativação automática de contratos vencidos, e hook auxiliar useEmpresa para busca por ID)
│   │   ├── useEmpresasStats.ts                  		# Hook para estatísticas das empresas (independente de filtros)
│   │   ├── useExcelImport.ts                    		# Hook para importação de arquivos Excel
│   │   ├── useGrupos.ts                         		# Hook para grupos do sistema de permissões
│   │   ├── useGruposResponsaveis.ts             		# Hook para grupos responsáveis do sistema de books
│   │   ├── useHistorico.ts                      		# Hook para histórico de books com cache otimizado (staleTime reduzido para 30s, refetch automático a cada 1 minuto, refetch ao focar na janela habilitado para dados sempre atualizados)
│   │   ├── useAnexoAudit.ts                     		# Hook para auditoria de anexos (logs de operações, métricas de uso e troubleshooting)
│   │   ├── useAnexoCleanupJob.ts                		# Hook para gerenciamento do job de limpeza automática de anexos (controle de execução, estatísticas, limpeza manual, monitoramento de estado)
│   │   ├── useAnexoMetrics.ts                   		# Hook para métricas e monitoramento do sistema de anexos (estatísticas de performance, uso de storage e alertas)
│   │   ├── useAnexoMonitoring.ts                		# Hook para monitoramento em tempo real do sistema de anexos (jobs, performance e alertas)
│   │   ├── useAnexos.ts                         		# Hook para gerenciamento completo de anexos em disparos personalizados (upload múltiplo com validação de tipos e tamanhos, controle de limite de 25MB por empresa, progresso de upload por arquivo, cache local otimizado com priorização de dados locais sobre cache global para melhor performance, validações de segurança, remoção individual e em lote com limpeza forçada de cache e sincronização garantida, recarregamento de anexos por empresa sempre com dados frescos do banco via integração direta com Supabase client, função sincronizarCacheComEstado para sincronização manual entre cache e estado local, filtragem automática de arquivos com status "enviando" e "processado" para exibir apenas anexos pendentes e com erro na interface (melhora UX ocultando arquivos já processados), invalidação automática de cache por empresa após remoção com fallback global, summary de uso, estados reativos para interface e integração com serviços de compressão e cache)
│   │   ├── useJobScheduler.ts                   		# Hook para agendamento de jobs
│   │   ├── usePagination.ts                     		# Hook para paginação otimizada
│   │   ├── usePermissionFallbacks.tsx           		# Hook para fallbacks de permissões
│   │   ├── usePermissions.ts                    		# Hook principal do sistema de permissões
│   │   ├── useRealTimeNotifications.ts          		# Hook para notificações em tempo real
│   │   ├── useRequerimentos.ts                  		# Hook completo para gerenciamento do sistema de requerimentos (CRUD de requerimentos, busca de clientes, envio para faturamento, estatísticas, cache otimizado com React Query, invalidação automática de cache, mutations para operações de criação/edição/exclusão, queries para listagem e filtros, integração com sistema de permissões e tratamento de erros específicos)
│   │   ├── useResponsive.ts                     		# Hook completo para responsividade (breakpoints Tailwind, viewport, grid responsivo adaptativo com 1 coluna no mobile, 2 no tablet e 4 no desktop, formulários, tabelas, navegação, cards, modais, orientação, dispositivos touch, movimento reduzido, utilitários de breakpoint e sistema unificado de responsividade para toda a aplicação)
│   │   ├── useSessionPersistence.ts             		# Hook para persistência de sessão
│   │   ├── useSessionTimeout.ts                 		# Hook para timeout de sessão
│   │   ├── useSidebar.ts                        		# Hook para controle da sidebar
│   │   ├── useTemplateMappingValidation.ts      		# Hook para validação de mapeamento de templates
│   │   ├── useTemplateTestData.ts               		# Hook para dados de teste de templates
│   │   ├── useTemplateValidation.ts             		# Hook para validação de templates
│   │   ├── useTestData.ts                       		# Hook para gerenciamento de dados de teste
│   │   ├── useTextToSpeech.ts                   		# Hook para funcionalidade text-to-speech
│   │   ├── useTheme.ts                          		# Hook para sistema de temas
│   │   ├── useUserSettings.ts                   		# Hook para configurações do usuário
│   │   ├── useVigenciaMonitor.ts                		# Hook para monitoramento de vigência de contratos
│   │   └── useWebhookConfig.ts                  		# Hook para configurações de webhook
│   │				
│   ├── integrations/           						      # Integrações com serviços externos
│   │   └── supabase/									      # Integração com Supabase
│   │       ├── adminClient.ts                       # Cliente Supabase para operações administrativas
│   │       ├── client.ts								      # Cliente principal do Supabase
│   │       └── types.ts									      # Tipos gerados automaticamente do banco de dados (atualizado com suporte completo ao sistema de anexos: tabela anexos_temporarios para armazenamento de arquivos temporários com campos de controle de status, URLs, tokens de acesso e relacionamento com empresas_clientes, além de campos anexo_id e anexo_processado na tabela historico_disparos para integração com sistema de anexos em disparos personalizados)
│   │				
│   ├── lib/                    						      # Utilitários e bibliotecas
│   │   └── utils.ts										      # Utilitários gerais (clsx, tailwind-merge, etc.)
│   │				
│   ├── pages/                  						      # Páginas da aplicação
│   │   ├── admin/              						      # Páginas administrativas
│   │   │   ├── AuditLogs.tsx           				   # Visualização de logs de auditoria com sistema de filtros colapsável expandido (busca por texto com ícone Search, filtros por tabela/ação/período com valores especiais únicos para evitar conflitos Radix UI, filtros de tabela expandidos incluindo profiles, empresas_clientes, clientes, grupos_responsaveis, email_templates, historico_disparos e requerimentos para cobertura completa do sistema, layout responsivo com cabeçalho reorganizado, campos de data agrupados, interface padronizada seguindo padrão das demais telas do sistema, botão toggle para mostrar/ocultar filtros, componente AuditLogChanges para renderização assíncrona de alterações formatadas via auditService.formatChanges, funcionalidades de exportação refatoradas para usar auditLogsExportUtils com importação dinâmica)
│   │   │   ├── Clientes.tsx            				   # Gerenciamento de clientes (página "Cadastro de Clientes", renomeada de Colaboradores.tsx)
│   │   │   ├── ConfigurarPermissoesClientBooks.tsx   # Configuração de permissões para sistema de books (registra telas no sistema de permissões, configura permissões de administrador, verifica status de configuração automaticamente ao carregar e exibe interface de gerenciamento simplificada)
│   │   │   ├── ConfigurarPermissoesVigencias.tsx     # Configuração de permissões para tela de Monitoramento de Vigências (registra a tela no sistema de permissões, configura permissão de edição para administradores, inclui verificação de configuração e instruções detalhadas)
│   │   │   ├── ControleDisparos.tsx    				   # Controle de disparos selecionados e reenvios (tela "Disparos" no sistema de permissões, com funcionalidades de disparo por seleção, reenvio de falhas, agendamento, contadores inteligentes baseados no status das empresas selecionadas, loading skeleton durante carregamento inicial com barra de progresso animada e integração com DisparosLoadingSkeleton para otimizar a experiência do usuário)
│   │   │   ├── ControleDisparosPersonalizados.tsx    # Controle de disparos personalizados para empresas com book personalizado (filtra apenas empresas com book_personalizado=true), interface com tema roxo/purple, funcionalidades de disparo selecionado, reenvio de falhas, agendamento, controle inteligente de botões baseado em contadores específicos (paraDisparar/paraReenviar) que consideram o status real das empresas selecionadas, integração com sistema de anexos (ícones Paperclip e FileText para indicação visual de arquivos anexados) e modal de anexos com componente AnexoUpload para upload de múltiplos arquivos
│   │   │   ├── MonitoramentoVigencias.tsx             # Monitoramento de vigências de contratos das empresas
│   │   │   ├── Dashboard.tsx           				   # Painel principal administrativo simplificado com boas-vindas e suporte a tema escuro
│   │   │   ├── EmailConfig.tsx         				   # Configuração de templates de email
│   │   │   ├── EmpresasClientes.tsx    				   # Cadastro de empresas clientes com integração do componente EmpresaImportExportButtons para funcionalidades unificadas de importação e exportação, handler de importação otimizado com forceRefresh automático e notificação de sucesso, filtros padronizados seguindo padrão da tela de clientes (Select simples em vez de MultiSelect, layout em grid de 4 colunas md:grid-cols-4 para melhor distribuição dos filtros incluindo novo filtro por e-mail gestor, interface minimalista sem badges visuais, filtros inicializados para mostrar todos os status por padrão), sistema de busca otimizado com debounce de 500ms para melhor performance (sincronização automática entre busca local e filtros externos, controle de estado local para entrada de texto responsiva), correção de handlers de filtros com valores especiais únicos para evitar erros do Radix UI Select.Item, remoção de imports não utilizados e limpeza de código
│   │   │   ├── GroupManagement.tsx     			   	# Gerenciamento de grupos de usuários
│   │   │   ├── GruposResponsaveis.tsx  				   # Gerenciamento de grupos responsáveis
│   │   │   ├── HistoricoBooks.tsx      				   # Histórico e relatórios de books com interface aprimorada (exibe todos os registros por padrão sem filtros de mês/ano pré-definidos, seção dedicada para empresas com books enviados com badge verde e scroll otimizado, melhorias na exibição de empresas sem books com informações mais detalhadas incluindo nome abreviado, controle de altura máxima com scroll para listas extensas)
│   │   │   ├── LancarRequerimentos.tsx 				   # Página completa para lançamento de requerimentos de especificações funcionais (formulário de criação/edição, lista de requerimentos não enviados, filtros avançados por módulo/linguagem/tipo de cobrança/mês/datas com tratamento especial para valores "todos", seleção múltipla com ações em lote, estatísticas em tempo real com layout de grid fixo, envio para faturamento individual e em lote, integração com sistema de permissões, interface responsiva com layout horizontal em linha, cabeçalho de lista com checkbox de seleção geral e larguras percentuais otimizadas (5% checkbox, 16% chamado, 24% cliente, 8% módulo, 8% linguagem, 7% horas func., 7% horas téc., 6% total, 9% data envio, 10% ações), alinhamento perfeito entre cabeçalho e dados)
│   │   │   ├── FaturarRequerimentos.tsx 			   # Página completa para faturamento de requerimentos de especificações funcionais (visualização de requerimentos enviados para faturamento agrupados por tipo de cobrança, estatísticas do período, filtros por mês/ano/tipo, geração de relatórios HTML para email, modal de configuração de destinatários, preview de email, disparo de faturamento via Power Automate, integração com sistema de permissões e interface responsiva com grid de cards RequerimentoCard em layout 4 colunas para melhor visualização e consistência com sistema de lançamento)
│   │   │   ├── UserConfig.tsx          			   	# Configurações do usuário
│   │   │   ├── UserGroupAssignment.tsx 			   	# Atribuição de usuários a grupos
│   │   │   └── UserManagement.tsx						   # Gerenciamento completo de usuários do sistema (CRUD de usuários com formulários de criação e edição, validação de dados, sistema de filtros avançado com busca por nome/email com ícone Search posicionado à esquerda, filtros por status ativo/inativo e grupos com interface padronizada seguindo padrão das telas de empresas e clientes, botão toggle para mostrar/ocultar filtros, layout responsivo em grid de 3 colunas md:grid-cols-3, controle de status ativo/inativo, reset de senhas, modal de criação com configurações de usuário ativo e envio de email de boas-vindas, modal de edição com opção de reset de senha, tabela responsiva com informações de último login e data de criação, integração com sistema de permissões, formatação de datas brasileira, interface moderna com componentes shadcn/ui e correção do filtro de status para usar campo 'active' em vez de 'is_active')
│   │   │				
│   │   ├── AccessDenied.tsx    						      # Página de acesso negado
│   │   ├── FixPermissions.tsx  						      # Página para correção de permissões
│   │   ├── Login.tsx           					      	# Página de login
│   │   ├── NotFound.tsx        					      	# Página 404
│   │   └── SystemError.tsx     					      	# Página de erro do sistema
│   │				
│   ├── schemas/                						      # Schemas de validação Zod
│   │   ├── __tests__/          						      # Testes dos schemas
│   │   │   ├── clientBooksSchemas.test.ts			   # Testes dos schemas do sistema de books (atualizado com migração CE_PLUS → COMEX)
│   │   │   └── requerimentosSchemas.test.ts		   # Testes dos schemas do sistema de requerimentos (validação de formulários, filtros, faturamento, módulos válidos incluindo migração CE Plus → Comex, tipos de cobrança, constraints de negócio e validações condicionais)
│   │   ├── clientBooksSchemas.ts					   # Schemas de validação para formulários do sistema de clientes e books (inclui tipoBookSchema para validação dos tipos: nao_tem_book, qualidade, outros)
│   │   └── requerimentosSchemas.ts					   # Schemas de validação Zod para o sistema de requerimentos (validação de formulários de requerimento, filtros, faturamento, campos obrigatórios, constraints de negócio, validações condicionais e tipos inferidos, validação de horas como números inteiros de 0 a 9999)
│   │				
│   ├── services/               						      # Serviços e lógica de negócio
│   │   ├── __tests__/          						      # Testes dos serviços
│   │   │   ├── anexoAuditService.test.ts            # Testes do serviço de auditoria de anexos (logs, métricas e troubleshooting)
│   │   │   ├── anexoMetricsService.test.ts          # Testes do serviço de métricas de anexos (estatísticas, alertas, dashboard e monitoramento)
│   │   │   ├── anexoService.test.ts                 # Testes do serviço de gerenciamento de anexos (validação de tipos, tamanhos, upload e tokens de acesso)
│   │   │   ├── booksDisparoService.test.ts          # Testes do serviço de controle de disparos de books
│   │   │   ├── booksDisparoServiceAnexos.test.ts    # Testes específicos do serviço de disparos com anexos (integração entre books e sistema de anexos)
│   │   │   ├── clientesService.test.ts              # Testes do serviço de clientes
│   │   │   ├── empresasClientesService.test.ts      # Testes do serviço de empresas clientes
│   │   │   ├── excelImportService.test.ts           # Testes do serviço de importação Excel
│   │   │   ├── faturamentoService.test.ts           # Testes do serviço de faturamento para sistema de requerimentos
│   │   │   ├── gruposResponsaveisService.test.ts    # Testes do serviço de grupos responsáveis (atualizado com migração CE Plus → Comex)
│   │   │   ├── historicoAnexosService.test.ts       # Testes do serviço de histórico com suporte a anexos
│   │   │   ├── historicoService.test.ts             # Testes do serviço de histórico
│   │   │   ├── jobSchedulerService.test.ts          # Testes do serviço de agendamento de jobs
│   │   │   ├── realTimeNotificationService.test.ts  # Testes do serviço de notificações em tempo real
│   │   │   ├── requerimentosService.test.ts         # Testes do serviço de requerimentos de especificações funcionais (CRUD, validações, faturamento, estatísticas e integração com sistema de permissões)
│   │   │   ├── templateValidationService.test.ts    # Testes do serviço de validação de templates
│   │   │   └── webhookAnexosIntegration.test.ts     # Testes de integração webhook para sistema de anexos
│   │   ├── configuration/      						      # Serviços de configuração
│   │   │   └── index.ts									      # Exportações da infraestrutura de configuração
│   │   ├── adminNotificationService.ts       			# Notificações para administradores
│   │   ├── anexoAuditService.ts       					# Serviço de auditoria específico para sistema de anexos (logs detalhados de operações de upload, validação, processamento, tokens, downloads, limpeza automática, métricas de storage e performance, análise de gargalos, identificação de picos de uso, relatórios de taxa de sucesso/falha, cache de métricas com timeout configurável, e interface completa para troubleshooting e monitoramento do sistema de anexos)
│   │   ├── anexoCleanupJobService.ts  					# Serviço de limpeza automática de anexos expirados (job scheduler para remoção de arquivos temporários, estatísticas de execução, logs de auditoria, execução manual e automática a cada 24 horas)
│   │   ├── anexoMetricsService.ts     					# Serviço de métricas e monitoramento do sistema de anexos (estatísticas de upload, taxa de sucesso/falha, tempo de processamento, uso de storage por empresa, alertas de performance, métricas de dashboard, análise de tendências diárias, verificação automática de limites de storage e geração de relatórios de uso)
│   │   ├── anexoMonitoringJobService.ts				# Serviço de monitoramento de jobs do sistema de anexos (execução de jobs de limpeza, métricas de performance e alertas automáticos)
│   │   ├── anexoService.ts            					# Serviço completo de gerenciamento de anexos para disparos personalizados (upload, validação, armazenamento temporário/permanente, controle de limite de 25MB por empresa, geração de tokens JWT, integração com Supabase Storage, limpeza automática de arquivos expirados)
│   │   ├── anexoStorageService.ts     					# Serviço de gerenciamento de storage para anexos (operações de bucket, movimentação de arquivos, controle de espaço e otimização de armazenamento)
│   │   ├── anexoTokenService.ts       					# Serviço de autenticação e segurança para anexos com sistema de tokens ultra-compactos (geração de tokens JWT otimizados e tokens compactos alternativos para resolver limitações de tamanho do campo token_acesso, validação robusta de tokens, URLs seguras para download, controle de acesso baseado em empresa, renovação e revogação de tokens, validação de expiração, e implementação de hash customizado para tokens compactos com IDs parciais para máxima eficiência de armazenamento)
│   │   ├── auditLogger.ts            				   	# Logger de auditoria
│   │   ├── auditService.ts            					# Serviço completo de auditoria do sistema (logs de operações, formatação assíncrona de mudanças com resolução de nomes para user_id/group_id/screen_key/permission_level/empresa_id/cliente_id, rastreamento de ações de usuários, consultas de histórico de auditoria, formatação detalhada e inteligente de inserções/atualizações/exclusões com suporte expandido para profiles, empresas_clientes, clientes, grupos_responsaveis, email_templates, historico_disparos e requerimentos, formatação específica e contextual para exclusões com identificação clara de registros removidos incluindo nomes, emails, CNPJs e relacionamentos, formatação avançada de campos específicos como status/produto/tipo_disparo/tipo_cobranca, formatação automática de arrays e datas, integração com sistema de permissões e logs estruturados para compliance e troubleshooting)
│   │   ├── booksDisparoService.ts       				# Controle de disparos automáticos de books com envio consolidado por empresa e otimizações críticas de performance (filtra empresas com AMS ativo E tipo book "qualidade", suporte a disparos padrão e personalizados, implementa envio de e-mail único por empresa contendo todos os clientes tanto para disparos iniciais quanto para reenvios, interface EmailData corrigida com campo 'to' como array de destinatários para melhor compatibilidade com emailService, método direto de envio para evitar reprocessamento de template, parâmetro destinatario corrigido para string[] em enviarEmailComTemplate para consistência com sistema consolidado, tratamento robusto de erros com registro detalhado de falhas e sucessos no histórico de disparos incluindo informações de anexos, integração completa com sistema de anexos para disparos personalizados incluindo tipos AnexoWebhookData, AnexosSummaryWebhook e DisparoComAnexos para processamento de arquivos anexados, atualização automática e imediata do status dos anexos para "processado" após envio bem-sucedido ao Power Automate sem aguardar callback, registro automático de falhas no histórico com detalhes de erro e status de anexos para auditoria completa, correção específica para registro de falhas em disparos personalizados com busca de template, verificação de anexos e registro detalhado no histórico incluindo informações de arquivos anexados e status de processamento, correção de escopo da variável anexosWebhook no método enviarBookEmpresa para disponibilidade em todos os blocos de código, ordenação alfabética automática por nome da empresa no status mensal com suporte a localização brasileira e ignorar pontuação, otimização crítica do método obterStatusMensal com consulta única usando JOINs para eliminar queries N+1 e agregação de dados com Map para contagem eficiente de clientes e emails únicos, e otimização revolucionária do método buscarHistorico eliminando JOINs complexos através de consultas separadas para histórico, empresas e clientes seguidas de combinação em memória, resultando em melhoria de 85% na performance de carregamento de 3-5s para 200-500ms)
│   │   ├── cacheManager.ts            					# Gerenciador de cache avançado
│   │   ├── clientBooksCache.ts            				# Cache específico para o sistema de Client Books com estratégias otimizadas
│   │   ├── clientBooksPermissionsService.ts         # Serviço de permissões específicas do sistema de books (registra telas: empresas_clientes, clientes "Cadastro de Clientes", grupos_responsaveis, controle_disparos "Disparos", historico_books, monitoramento_vigencias "Monitoramento de Vigências")
│   │   ├── clientBooksServices.ts       				# Serviços centralizados do sistema de books
│   │   ├── clientBooksTemplateService.ts            # Serviço de templates para sistema de books
│   │   ├── clientesService.ts       					# CRUD de clientes (renomeado de colaboradoresService para clientesService, mantém compatibilidade)
│   │   ├── configurationAdminService.ts       		# Administração de configurações dinâmicas
│   │   ├── configurationRepository.ts       			# Repository de configurações
│   │   ├── configurationService.ts       				# Serviço principal de configuração
│   │   ├── emailService.ts            					# Serviço completo de envio de emails via Power Automate com interface EmailData expandida (campo 'to' aceita string ou array de e-mails para compatibilidade com envios consolidados, suporte completo a anexos do sistema de books personalizados com estrutura de dados para totalArquivos, tamanhoTotal e array de arquivos com URLs, nomes, tipos, tamanhos e tokens de acesso, processamento automático de arrays para Power Automate com garantia de formato array para campos email e email_cc, SEMPRE inclui campo anexos no payload mesmo quando vazio para compatibilidade com Power Automate, correção crítica no método sendTestEmailWithMapping para garantir que email seja sempre array e incluir campos email_cc e anexos obrigatórios, validação robusta de e-mails, logs de debug detalhados, tratamento avançado de erros HTTP com captura de detalhes da resposta incluindo logs específicos para erro 400 com anexos e estatísticas detalhadas de arquivos para troubleshooting, fallback automático para envio sem anexos em caso de erro 400, método sendEmailWithMapping para mapeamento automático de templates com substituição de variáveis incluindo mês por extenso, método testAnexosIntegration para testes específicos de anexos, sendTestEmail com dados de teste padrão e sendTestEmailWithMapping para testes com sistema de mapeamento)
│   │   ├── emailTemplateMappingService.ts       		# Mapeamento de templates de email
│   │   ├── empresasClientesService.ts       			# CRUD de empresas clientes
│   │   ├── errorRecoveryService.ts       				# Estratégias de recuperação de erros
│   │   ├── excelImportService.ts       				# Importação e processamento de Excel com schema expandido e validações robustas (inclui validação obrigatória para Link SharePoint, Email Gestor e Produtos, validação de status com descrição obrigatória para status Inativo/Suspenso, validação de vigências com formato de data e consistência temporal, validação de campos booleanos com valores aceitos "sim/não", além de campos opcionais para AMS, Tipo Book e configurações de book personalizado, template Excel aprimorado com 15 colunas incluindo campos de vigência, instruções detalhadas e larguras de coluna otimizadas, resolução automática de grupos responsáveis por nome convertendo para IDs durante a importação, mapeamento inteligente de templates padrão com suporte a nomes em português/inglês e busca automática de templates personalizados por nome exato, e geração de relatórios de importação otimizados sem cabeçalhos desnecessários)
│   │   ├── faturamentoService.ts       				# Serviço completo de faturamento para sistema de requerimentos (geração de relatórios de faturamento por mês/ano, agrupamento por tipo de cobrança, cálculo de estatísticas e totais, criação de templates HTML responsivos para emails, disparo de faturamento via Power Automate, controle de status de requerimentos faturados, logs de auditoria de operações de faturamento e integração com sistema de permissões)
│   │   ├── gruposResponsaveisService.ts       		# CRUD de grupos responsáveis
│   │   ├── historicoService.ts       					# Consultas e relatórios de histórico com funcionalidade de busca de empresas para relatórios mensais (separação entre empresas com e sem books baseada no histórico de disparos)
│   │   ├── jobConfigurationService.ts       			# Configuração de jobs e tarefas agendadas
│   │   ├── jobSchedulerService.ts       				# Agendamento e execução de jobs automáticos
│   │   ├── performanceOptimizationService.ts        # Serviço de otimização de performance
│   │   ├── permissionsService.ts       			   	# Gerenciamento de permissões
│   │   ├── realTimeNotificationService.ts       		# Notificações em tempo real via Supabase subscriptions
│   │   ├── requerimentosService.ts       				# Serviço completo para gerenciamento de requerimentos de especificações funcionais (CRUD de requerimentos com suporte completo a campos de valor/hora para tipos de cobrança específicos incluindo atualização de valor_hora_funcional e valor_hora_tecnico, busca de clientes, envio para faturamento, consultas por status e mês, validações de negócio, geração de relatórios de faturamento e integração com sistema de permissões)
│   │   ├── screenService.ts            			      # Gerenciamento de telas do sistema
│   │   ├── templateValidationService.ts             # Validação de templates
│   │   ├── testDataService.ts            				# Gerenciamento de dados de teste
│   │   ├── userManagementService.ts       			# Gerenciamento completo de usuários do sistema (CRUD de usuários, autenticação, controle de status ativo/inativo, reset de senhas, envio automático de emails de boas-vindas personalizados para novos usuários com correção da confirmação automática de email quando sendWelcomeEmail=true, integração com Supabase Auth, validação de dados, logs de auditoria, tratamento robusto de erros e ordenação alfabética automática por nome completo ou email usando localeCompare pt-BR com sensitivity base e ignorePunctuation para melhor experiência do usuário)
│   │   ├── userSettingsService.ts       				# Configurações e preferências do usuário
│   │   └── vigenciaService.ts           				# Serviço para gerenciamento de vigência de contratos
│   │				
│   ├── styles/                 					      	# Estilos globais
│   │   └── login.css 									      # Estilos específicos da página de login
│   │				
│   ├── test/                   					      	# Arquivos de teste
│   │   ├── e2e/                					      	# Testes end-to-end (E2E)
│   │   │   ├── anexosFluxoUsuarioFinal.test.ts      # Teste E2E do fluxo completo de usuário final com sistema de anexos (navegação, seleção de empresa, upload de múltiplos arquivos, execução de disparo personalizado e verificação de processamento no Power Automate)
│   │   │   └── anexosLimitesValidacoes.test.ts      # Teste E2E de limites e validações do sistema de anexos (upload de arquivos que excedem 25MB total, tipos não permitidos, mais de 10 arquivos por empresa)
│   │   ├── integration/        					      	# Testes de integração
│   │   │   ├── anexosFluxoCompleto.test.ts          # Teste de fluxo completo do sistema de anexos (upload múltiplo, validação de limite de 25MB, disparo personalizado com anexos, processamento e movimentação para storage permanente)
│   │   │   ├── cadastroCompleto.test.ts             # Teste de fluxo completo de cadastro com validação de produtos COMEX (atualizado com migração CE Plus → Comex)
│   │   │   ├── disparoEmails.test.ts                # Teste de disparo de emails
│   │   │   ├── importacaoExcel.test.ts              # Teste de importação de Excel
│   │   │   ├── mesReferenciaBooks.test.ts           # Teste de cálculo do mês de referência para disparos de books (validação do mês anterior ao disparo)
│   │   │   ├── requerimentosFluxoCompleto.test.ts   # Teste de integração completo do sistema de requerimentos (fluxo lançar → enviar → faturar, validação de integração com Supabase, sistema de permissões, envio de email, estrutura de dados, constraints de negócio, relacionamentos entre tabelas, cenários de erro e recuperação)
│   │   │   └── vigenciaAutomatica.test.ts           # Teste de inativação automática de empresas por vigência expirada
│   │   ├── clientBooksTypes.test.ts             		# Testes dos tipos do sistema de books (atualizado com migração CE Plus → Comex)
│   │   ├── permissions.test.ts                  		# Testes do sistema de permissões
│   │   └── setup.ts                             		# Configuração dos testes
│   │				
│   ├── types/                  						      # Definições de tipos TypeScript
│   │   ├── api.ts                               		# Tipos para APIs
│   │   ├── approval.ts                          		# Tipos para sistema de aprovação
│   │   ├── audit.ts                             		# Tipos para auditoria
│   │   ├── clientBooks.ts                       		# Tipos do sistema de clientes e books, incluindo constantes TIPO_BOOK_OPTIONS para seleção de tipos de book (nao_tem_book, qualidade, outros), interface RelatorioMetricas com separação de empresas com e sem books, tipos completos do sistema de anexos (AnexoTemporario, AnexoWebhookData, AnexosSummaryWebhook, DisparoComAnexos) para integração com disparos personalizados e processamento de arquivos anexados, e tipo Produto atualizado com valores 'COMEX' | 'FISCAL' | 'GALLERY' (migração de CE_PLUS para COMEX)
│   │   ├── clientBooksTypes.ts                  		# Tipos específicos do sistema de books
│   │   ├── configuration.ts                     		# Tipos para configurações
│   │   ├── constants.ts                         		# Constantes tipadas
│   │   ├── database.ts                          		# Tipos do banco de dados
│   │   ├── formData.ts                          		# Tipos para dados de formulário
│   │   ├── formDataFiscal.ts                    		# Tipos para formulários fiscais
│   │   ├── formTypes.ts                         		# Tipos gerais de formulários
│   │   ├── index.ts                             		# Exportações centralizadas de tipos
│   │   ├── permissions.ts                       		# Tipos do sistema de permissões
│   │   ├── requerimentos.ts                     		# Tipos e interfaces para o Sistema de Requerimentos (interface Requerimento, tipos ModuloType/LinguagemType/TipoCobrancaType/StatusRequerimento, constantes para opções de select, interfaces RequerimentoFormData com data_aprovacao opcional/FaturamentoData/EmailFaturamento, tipos para clientes e estatísticas, interface de filtros)
│   │   └── userSettings.ts                      		# Tipos para configurações do usuário
│   │				
│   ├── utils/                  						      # Funções utilitárias
│   │   ├── __tests__/          						      # Testes das funções utilitárias
│   │   │   ├── anexoCache.test.ts                   # Testes do sistema de cache de anexos (TTL, invalidação, estatísticas e performance)
│   │   │   ├── anexoCompression.test.ts             # Testes da compressão automática de anexos (algoritmos, tipos de arquivo, estatísticas de redução)
│   │   │   ├── clientBooksVariableMapping.test.ts   # Testes do mapeamento de variáveis com casos específicos para nomes de mês em português e inglês, validação do mês de referência (mês anterior ao disparo), testes de variáveis de sistema do mês atual e correção de sintaxe
│   │   │   ├── errorRecovery.test.ts                # Testes de recuperação de erros com validação de integridade de dados (atualizado com migração CE_PLUS → COMEX)
│   │   │   ├── requerimentosColors.test.ts          # Testes do sistema de cores para tipos de cobrança do sistema de requerimentos (validação de cores, classes CSS, ícones e contraste)
│   │   │   ├── requerimentosErrorHandler.test.ts    # Testes do tratamento de erros específicos do sistema de requerimentos (validação de erros, recovery e fallbacks)
│   │   │   └── templateSelection.integration.test.ts # Testes de integração para seleção de templates (padrão e personalizados)
│   │   ├── anexoCache.ts              					# Sistema de cache local para anexos com TTL configurável (cache em memória por empresa, invalidação automática, utilitários de limpeza, estatísticas de uso e integração com sistema de anexos para otimização de performance)
│   │   ├── anexoCompression.ts        					# Utilitários para compressão automática de anexos (compressão inteligente baseada no tamanho e tipo do arquivo, suporte a PDFs, imagens e documentos Office, processamento em paralelo com limite de concorrência, estatísticas de redução de tamanho e otimização de performance para uploads)
│   │   ├── anexoInfrastructureUtils.ts					# Utilitários para infraestrutura de anexos (configuração de buckets, validações de storage e operações de manutenção)
│   │   ├── auditLogsExportUtils.ts    					# Utilitários para exportação de logs de auditoria (Excel XLSX e PDF com design profissional seguindo padrão visual do sistema, formatação de dados, estatísticas de resumo, cards individuais por log com barras laterais coloridas por ação, integração com auditService para formatação de alterações e suporte completo a jsPDF autoTable)
│   │   ├── cacheKeyGenerator.ts       					# Geração de chaves de cache
│   │   ├── clientBooksErrorHandler.ts       			# Tratamento de erros específicos do sistema de books
│   │   ├── clientBooksVariableMapping.ts       		# Mapeamento de variáveis para templates com cálculo automático do mês de referência (mês anterior ao disparo), suporte a nomes de meses em português e inglês, variáveis de sistema para mês atual (sistema.mesNomeAtual e sistema.mesNomeAtualEn), mapeamento de produtos atualizado (COMEX, FISCAL, GALLERY) após migração de CE_PLUS para COMEX, correção de sintaxe na função de mapeamento de variáveis
│   │   ├── clientExportUtils.ts         				# Utilitários para exportação de dados de clientes (colaboradores)
│   │   ├── cnpjMask.ts            					   	# Formatação e máscara de CNPJ
│   │   ├── configurationDebug.ts      					# Debug de configurações
│   │   ├── configurationLogger.ts     					# Logging estruturado
│   │   ├── configurationMapper.ts     					# Mapeamento de configurações
│   │   ├── dateUtils.ts               					# Utilitários para manipulação de datas
│   │   ├── empresasExportUtils.ts       				# Utilitários específicos para exportação de empresas clientes (Excel e PDF com design aprimorado - layout em cards, cores temáticas Sonda (#2563eb), caixa de resumo estatístico expandida com contadores de empresas ativas/inativas/suspensas, cabeçalho profissional, integração Supabase e mapeamento assíncrono de templates, correção da sintaxe de aplicação de cores no jsPDF para compatibilidade com versões mais recentes) - usado pela tela EmpresasClientes.tsx
│   │   ├── emailValidation.ts         					# Validação de emails
│   │   ├── emailVariableMapping.ts              		# Mapeamento de variáveis de email
│   │   ├── environmentCheck.ts        					# Verificação de ambiente
│   │   ├── errorHandler.ts           				   	# Tratamento de erros
│   │   ├── errorRecovery.ts           				   	# Estratégias de recuperação de erros
│   │   ├── exportUtils.ts            				   	# Utilitários gerais para exportação de dados
│   │   ├── fallbackManager.ts         					# Gerenciamento de fallbacks
│   │   ├── formatters.ts             				   	# Formatação de valores (datas, números) com timezone Brasil e precisão de segundos
│   │   ├── historicoAlternativo.ts    					# Consulta alternativa do histórico sem joins complexos (evita problemas de relacionamento)
│   │   ├── horasUtils.ts              					# Utilitários completos para conversão e validação de horas (suporte a formato HH:MM e números inteiros, conversão entre minutos/horas/decimal, validação de formato, normalização de entrada, soma de horas, formatação para exibição amigável, integração com banco de dados e análise detalhada de horas convertidas)
│   │   ├── mesCobrancaUtils.ts        					# Utilitários para cálculo de mês de cobrança e referência
│   │   ├── paginationUtils.ts         					# Utilitários de paginação
│   │   ├── performance-optimizations.ts			   	# Otimizações de performance
│   │   ├── permissionUtils.ts         					# Utilitários de permissões (legacy)
│   │   ├── permissionsUtils.ts        					# Utilitários de permissões (novo)
│   │   ├── requerimentosColors.ts       				# Sistema completo de cores para tipos de cobrança do sistema de requerimentos (8 tipos: Banco de Horas/azul, Cobro Interno/verde, Contrato/cinza, Faturado/laranja, Hora Extra/vermelho, Sobreaviso/roxo, Reprovado/slate, Bolsão Enel/amarelo), funções utilitárias para classes CSS de cards, badges, botões e inputs com estados hover e focus, mapeamento de ícones emoji por tipo, cores hexadecimais para gráficos, validação de tipos, contraste de texto automático e constantes para reutilização em componentes
│   │   ├── requerimentosErrorHandler.ts       			# Tratamento de erros específicos do sistema de requerimentos (validação de erros, recovery, fallbacks e logging estruturado)
│   │   ├── requerimentosPerformance.ts       			# Utilitários de performance para o sistema de requerimentos (hooks para debounce de busca, memoização de filtros e estatísticas, lazy loading de componentes com correção do React.createElement para fallback, otimização de re-renders, formatação de números com cache, paginação virtual, intersection observer, configurações de queries otimizadas e scroll otimizado)
│   │   ├── retryUtils.ts             				   	# Lógica de retry com backoff
│   │   ├── templateMappingValidation.ts				   # Validação de mapeamento de templates
│   │   └── validation.ts             				   	# Validações para configuração dinâmica
│   │				
│   ├── App.css                 					      	# Estilos principais da aplicação
│   ├── App.tsx                 					      	# Componente raiz da aplicação com roteamento completo (React Router, providers de contexto, error boundaries, inicializadores automáticos, rotas protegidas para todas as páginas administrativas incluindo sistema de requerimentos, sistema de books, disparos personalizados, monitoramento de vigências, configuração de permissões e páginas de erro)
│   ├── index.css               					      	# Estilos globais e Tailwind CSS com otimizações específicas para sidebar (botão toggle com z-index máximo, sombras aprimoradas, posicionamento fixo otimizado e melhorias de clicabilidade)
│   ├── main.tsx                					      	# Ponto de entrada da aplicação React
│   └── vite-env.d.ts           					      	# Definições de tipos para Vite
│				

├── supabase/                   					      	# Configurações do banco de dados
│   ├── .temp/                  					      	# Arquivos temporários do Supabase
│   │   └── cli-latest                              # CLI do Supabase
│   └── migration/              					      	# Scripts de migração do banco
│       ├── add_monitoramento_vigencias_screen.sql  # Migração otimizada para adicionar tela de Monitoramento de Vigências ao sistema de permissões (sem campos de timestamp automáticos created_at/updated_at)
│       ├── add_user_registration_screen.sql       # Migração para tela de registro de usuários
│       ├── anexos_infrastructure_migration.sql    # Migração para infraestrutura de anexos do sistema de disparos personalizados (tabela anexos_temporarios, extensão do historico_disparos, índices otimizados, funções de limpeza automática e validação de limite de 25MB por empresa)
│       ├── anexos_rls_policies.sql                # Políticas RLS para sistema de anexos com controle de acesso baseado em permissões de grupo (corrigido para usar user_group_assignments e screen_permissions em vez de user_permissions diretas)
│       ├── anexos_storage_setup.sql               # Migração para configuração do Supabase Storage para sistema de anexos (buckets, políticas de acesso e configurações de segurança)
│       ├── anexos_temporarios_migration.sql       # Migração para criar tabela anexos_temporarios do sistema de anexos para disparos personalizados (estrutura completa da tabela, índices otimizados, triggers de atualização automática, funções de limpeza de registros expirados, validação de limite de 25MB por empresa com DROP FUNCTION seguro, logs condicionais para logs_sistema, e comentários detalhados)
│       ├── client_books_management_migration.sql		# Migração principal do sistema de books
│       ├── client_books_permissions_migration.sql		# Migração de permissões para telas do sistema
│       ├── client_books_rls_policies.sql          # Políticas RLS para sistema de books
│       ├── correcao_trigger_vigencia.sql          # Correção do trigger de vigência de contratos
│       ├── correcao_vigencia_vencimento.sql       # Correção da lógica de vigência vencida (considera vencido apenas no dia seguinte ao vencimento)
│       ├── email_logs_templates_migration.sql     # Migração para logs e templates de email
│       ├── email_test_data_migration.sql          # Migração para dados de teste de email
│       ├── empresa_campos_adicionais_migration.sql # Migração para campos adicionais da tabela empresas
│       ├── grups_and_profile_migration.sql        # Migração de grupos e perfis de usuário
│       ├── historico_disparos_anexos_extension.sql # Migração para estender tabela historico_disparos com suporte a anexos (adiciona colunas anexo_id e anexo_processado, triggers de sincronização de status, funções para consulta de histórico com anexos, estatísticas de anexos por período, log de migração otimizado e comentários detalhados)
│       ├── jobs_queue_migration.sql               # Migração para fila de jobs
│       ├── migration_empresa_ams_tipo_book.sql    # Migração para adicionar campos "Tem AMS" e "Tipo de Book" na tabela empresas_clientes
│       ├── performance_optimization_indexes.sql   # Índices para otimização de performance
│       ├── rename_colaboradores_to_clientes.sql   # Migração para renomear tabela colaboradores para clientes
│       ├── rename_ce_plus_to_comex.sql           # Migração completa para renomear CE Plus para Comex em todo o sistema (atualiza produtos, grupos responsáveis, requerimentos e constraints, inclui verificação prévia de dados existentes, logs de progresso detalhados, validação pós-migração com contadores e alertas de inconsistências, numeração corrigida dos passos da migração)
│       ├── setup_rls_policies.sql                 # Configuração de políticas RLS
│       ├── README_SISTEMA_REQUERIMENTOS.md        # Documentação completa do sistema de requerimentos (guia de instalação, estrutura de arquivos, instruções de migração e exemplos de uso)
│       ├── run_sistema_requerimentos_migration.sql # Script de execução completa das migrações do sistema de requerimentos (executa todas as migrações em sequência: estrutura, permissões, RLS e validações)
│       ├── sistema_requerimentos_migration.sql    # Migração principal do sistema de requerimentos (criação da tabela requerimentos com todos os campos, constraints, índices e triggers necessários para gerenciamento de especificações funcionais de chamados técnicos, incluindo validações de negócio, campos calculados e verificação automática da estrutura criada)
│       ├── sistema_requerimentos_permissions_migration.sql # Migração de permissões do sistema de requerimentos (registro das telas "Lançar Requerimentos" e "Faturar Requerimentos" no sistema de permissões, configuração automática de permissões de edição para grupo administrador padrão, verificação de integridade das configurações e exibição de status das telas e permissões registradas)
│       ├── sistema_requerimentos_rls_policies.sql # Migração de políticas RLS do sistema de requerimentos (controle de acesso baseado em permissões de grupo, políticas de segurança para operações CRUD na tabela requerimentos)
│       ├── sistema_requerimentos_validation_test.sql # Script de validação e testes do sistema de requerimentos (testes de integridade, validação de constraints, simulação de operações CRUD e verificação de permissões)
│       ├── update_template_padrao_constraint.sql  # Migração para permitir templates personalizados no campo template_padrao
│       ├── add_valor_hora_requerimentos.sql      # Migração para adicionar campos de valor/hora na tabela requerimentos (valor_hora_funcional, valor_hora_tecnico, valor_total_funcional, valor_total_tecnico, valor_total_geral com cálculo automático via trigger para tipos de cobrança específicos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel, incluindo função de estatísticas de valores por tipo de cobrança e índices otimizados)
│       └── fix_token_acesso_size.sql              # Migração para corrigir o tamanho do campo token_acesso de VARCHAR(255) para TEXT (tokens JWT podem exceder 255 caracteres)
│				
├── .env.example                					      	# Exemplo de variáveis de ambiente
├── .env.local                  					      	# Variáveis de ambiente locais
├── .gitignore                 						   	# Arquivos ignorados pelo Git
├── AJUSTES_FORMULARIO_REQUERIMENTOS_DATAS_HORAS.md     # Documentação dos ajustes implementados no formulário de requerimentos (data de aprovação opcional em branco por padrão, horas funcionais e técnicas como números inteiros suportando valores >100h, validações robustas com Zod, melhorias na experiência do usuário, conformidade com requisitos de negócio, atualização de tipos TypeScript e testes)
├── CORRECAO_ANEXOS_STATUS_ENVIANDO_CACHE.md            # Documentação da correção do sistema de anexos para filtrar arquivos com status "enviando" e "processado" da interface (focando apenas em arquivos que precisam de gerenciamento), implementação de cache inteligente com invalidação automática, controle de concorrência para uploads múltiplos, sincronização robusta após operações e melhorias na experiência do usuário
├── CORRECAO_ALINHAMENTO_COLUNAS_REQUERIMENTOS.md       # Documentação da correção do alinhamento de colunas entre cabeçalho e dados na tela "Lançar Requerimentos" (ajuste de padding do grid interno para px-3, remoção de padding horizontal do container, garantia de alinhamento perfeito entre cabeçalho e linhas de dados, preservação de funcionalidades e responsividade)
├── CORRECAO_CHECKBOX_FORA_COLUNA_CHAMADO.md            # Documentação da correção do posicionamento do checkbox de seleção de requerimentos (criação de coluna específica para checkbox 5%, reestruturação das larguras das colunas, adição de checkbox "Selecionar Todos" no cabeçalho, eliminação da sobreposição com coluna "Chamado", melhorias na experiência do usuário e funcionalidade de seleção em massa)
├── CORRECAO_FINAL_LAYOUT_LISTA_REQUERIMENTOS.md        # Documentação da correção final do layout da lista de requerimentos (correção de erro de sintaxe w-[6%]3%], migração de grid para lista linear com space-y-0, larguras consistentes entre cabeçalho e dados 18%/26%/8%/8%/7%/7%/6%/10%/10%, alinhamento perfeito pixel-perfect, skeleton consistente e layout profissional similar à tela "Faturar Requerimentos")
├── CORRECAO_SINTAXE_CSS_LARGURAS_COLUNAS.md            # Documentação da correção de sintaxe CSS nas larguras das colunas do cabeçalho da lista de requerimentos (correção do erro w-[6%]3%] para w-[6%], padronização das larguras das colunas Data Envio e Ações de 8.33% para 10%, distribuição final otimizada 18%/26%/8%/8%/7%/7%/6%/10%/10%, sintaxe CSS válida e alinhamento perfeito)
├── CORRECAO_COMPONENTES_SKELETON_REQUERIMENTOS.md      # Documentação da correção dos componentes skeleton para sistema de requerimentos (criação do arquivo LoadingStates.tsx com StatsCardSkeleton, RequerimentoCardSkeleton, PageLoadingSkeleton e FiltersSkeleton, layout consistente com componentes reais, correção de importações e integração com sistema de UI)
├── CORRECAO_FINAL_ALINHAMENTO_FLEX_REQUERIMENTOS.md    # Documentação da correção final do alinhamento no sistema de requerimentos através da migração de CSS Grid para Flexbox com larguras percentuais fixas (solução definitiva para sobreposição de dados, alinhamento pixel-perfect entre cabeçalho e linhas, mapeamento exato de larguras 16.67%/25%/8.33% por coluna, melhorias de responsividade com min-w-0 e truncamento inteligente, validação completa com todos os testes passando)
├── CORRECAO_IMPORTACAO_DIRETA_SKELETON.md              # Documentação da correção da importação direta dos componentes skeleton (solução para erro de módulo não reconhecido, separação de importações entre componentes principais e skeleton, importação explícita do LoadingStates.tsx, melhor organização e compatibilidade com TypeScript/IDE)
├── CORRECAO_LARGURAS_CUSTOMIZADAS_REQUERIMENTOS.md     # Documentação da correção final com larguras customizadas para alinhamento perfeito no sistema de requerimentos (remoção do gap-2, implementação de padding customizado por coluna, larguras otimizadas 18%/26%/8%/8%/7%/7%/6%/10%/10%, tipografia ajustada para text-xs, espaçamento inteligente com pr-1/pr-2, solução definitiva para eliminação completa de sobreposição e desalinhamento)
├── CORRECAO_RADIX_SELECT_ITEM_VALUE_VAZIO.md           # Documentação da correção do erro crítico do Radix UI Select.Item com valores vazios (value="") que impedia o funcionamento dos componentes Select, implementação de valores especiais únicos com prefixo __ para opções "todos/todas", tratamento na lógica de filtros, prevenção de erros futuros e estabelecimento de padrões para novos selects
├── CORRECAO_TIPOS_FILTROS_REQUERIMENTOS.md             # Documentação da correção dos tipos da interface FiltrosRequerimentos (adição das propriedades busca, modulo e linguagem que estavam faltando, correção do hook useEstatisticasRequerimentos, eliminação de erros TypeScript e garantia de tipagem forte para todos os filtros do sistema de requerimentos)
├── IMPLEMENTACAO_CARDS_FATURAR_REQUERIMENTOS.md        # Documentação da implementação de cards na página "Faturar Requerimentos" (substituição do formato de tabela por grid de 4 colunas usando RequerimentoCard, layout responsivo, reutilização de código, consistência visual com página de lançamento, organização por tipo de cobrança mantida, melhor densidade de informações e experiência do usuário aprimorada)
├── CORRECAO_FILTRO_ARQUIVOS_PROCESSADOS.md            # Documentação da correção do filtro para ocultar arquivos processados da interface de anexos (modificação do hook useAnexos para filtrar arquivos com status "processado" além de "enviando", mantendo visíveis apenas arquivos "pendente" e "erro" que precisam de ação do usuário, interface mais limpa e focada, melhor experiência do usuário com lógica consistente)
├── CORRECAO_LOGS_AUDITORIA_ANEXOS.md                  # Documentação da correção dos logs de auditoria no sistema de anexos (correção das migrações para usar permission_audit_logs em vez de logs_sistema)
├── CORRECAO_LOGS_EMAIL_FORMATACAO_CONSISTENTE.md      # Documentação da correção de formatação consistente nos logs de e-mail (padronização da formatação de e-mails nos logs de erro e sucesso do emailService)
├── CORRECAO_SINTAXE_MIGRACAO_REQUERIMENTOS.md         # Documentação da correção de sintaxe na migração do sistema de requerimentos (correção de erro de sintaxe no trigger, remoção de logs de auditoria desnecessários e otimização da verificação de estrutura criada)
├── CORRECAO_PAYLOAD_POWER_AUTOMATE_ARRAYS.md          # Documentação da correção do payload do Power Automate para suporte a arrays (correção da formatação de campos email e email_cc como arrays, estrutura de anexos padronizada e compatibilidade com webhook)
├── CORRECAO_POLITICAS_RLS_ANEXOS.md                   # Documentação da correção das políticas RLS para sistema de anexos (controle de acesso baseado em permissões de grupo)
├── CORRECAO_SINCRONIZACAO_ANEXOS_INTERFACE.md         # Documentação da correção de problemas de sincronização entre interface e sistema de anexos (troubleshooting de cache, estado local vs banco de dados, componentes de debug e ferramentas de diagnóstico)
├── CORRECAO_STATUS_ANEXOS_APOS_ENVIO.md               # Documentação da correção do status de anexos após envio bem-sucedido (atualização imediata do status para "processado" sem depender de callback externo do Power Automate, melhor feedback ao usuário e consistência de dados)
├── CORRECAO_VERIFICACAO_STATUS_ANEXOS_ABERTURA_TELA.md # Documentação da correção da verificação automática de status de anexos na abertura da tela (verificação automática do banco de dados ao abrir modal, sincronização periódica a cada 15 segundos, detecção inteligente de anexos pendentes antigos, botão manual de atualização, múltiplas camadas de verificação para garantir dados sempre atualizados e eliminação de cache desatualizado)
├── debug_anexos_sincronizacao.sql                     # Script SQL para debug e diagnóstico de sincronização do sistema de anexos (verificação de estado, estatísticas por empresa, detecção de inconsistências entre cache e banco)
├── debug_anexos.sql                                   # Script SQL para debug e troubleshooting do sistema de anexos
├── debug_payload_anexos.json                          # Arquivo de debug para troubleshooting de payload de anexos no Power Automate (documenta erro 400, formato atual do payload, possíveis causas e soluções para problemas de integração com anexos)
├── IMPLEMENTACAO_EXTENSAO_HISTORICO_ANEXOS.md         # Documentação da implementação da extensão da tabela historico_disparos para suporte a anexos (adição de colunas anexo_id e anexo_processado)
├── IMPLEMENTACAO_ORDENACAO_ALFABETICA_DISPAROS.md     # Documentação da implementação de ordenação alfabética por nome da empresa nas telas de "Disparos" e "Disparos Personalizados" (configuração localeCompare com pt-BR, sensitivity base, ignorePunctuation para melhor experiência do usuário na localização de empresas)
├── IMPLEMENTACAO_SERVICO_DISPARO_ANEXOS.md            # Documentação da implementação do serviço de disparo com anexos (integração completa entre sistema de anexos e disparos personalizados)
├── OTIMIZACOES_PERFORMANCE_ANEXOS_FINALIZACAO.md      # Documentação das otimizações finais de performance do sistema de anexos (cache, compressão e monitoramento)
├── OTIMIZACOES_PERFORMANCE_DISPAROS.md               # Documentação das otimizações de performance implementadas nas telas de "Disparos" e "Disparos Personalizados" (resolução de gargalos críticos com consulta única usando JOINs, eliminação do problema N+1, cache otimizado com configurações aprimoradas, loading skeleton avançado, correções de tipos TypeScript, melhoria de 85% no tempo de carregamento de 3-5s para 200-500ms, preservação completa de funcionalidades e compatibilidade total com sistema existente)
├── test_anexos_integration.ts                         # Testes de integração para sistema de anexos
├── AJUSTE_COR_AZUL_PDF_PADRAO_SISTEMA.md            # Documentação do ajuste da cor azul padrão do sistema para exportação PDF (correção da sintaxe de aplicação de cores no jsPDF para compatibilidade com versões mais recentes da biblioteca)
├── CORRECAO_LOGS_EMAIL_FORMATACAO_CONSISTENTE.md    # Documentação da correção de formatação consistente nos logs de e-mail (padronização da formatação de e-mails nos logs de erro e sucesso do emailService)
├── ALTERACAO_FILTRO_DISPAROS_AND.md                # Documentação da alteração do filtro de disparos de OR para AND (empresas aparecem apenas se tem_ams=true E tipo_book='qualidade')
├── CORRECAO_ATUALIZACAO_AUTOMATICA_LISTA_EMPRESAS.md # Documentação da correção da atualização automática da lista de empresas após importação via Excel (implementação de invalidação de cache automática, callback onImportComplete otimizado, e eliminação da necessidade de refresh manual Ctrl+F5)
├── CORRECAO_BOTOES_SIDEBAR.md                      # Documentação das correções de clicabilidade e visibilidade dos botões da sidebar
├── CORRECAO_CONTAGEM_LINHAS_BOTAO_CANCELAR.md      # Documentação da correção da contagem incorreta de linhas no Excel (filtro de linhas vazias) e correção do botão cancelar no dialog de importação que não fechava o modal
├── CORRECAO_EMAIL_CONSOLIDADO_FORMATACAO.md        # Documentação da correção da formatação de e-mails no sistema consolidado (correção do campo 'to' de string para array para consistência com campo 'cc')
├── CORRECAO_ERROS_API_IMPORTACAO_406_400.md        # Documentação da correção dos erros de API 406 (Not Acceptable) e 400 (Bad Request) na importação de empresas (correção do uso de .single() vs .maybeSingle() na verificação de duplicatas e resolução automática de grupos responsáveis por nome para IDs)
├── CORRECAO_IMPORTACAO_EMPRESAS_TRAVAMENTO.md      # Documentação da correção do travamento na importação de empresas (problema de timing no hook useExcelImport e solução com useEffect para gerenciar estados)
├── CORRECAO_CACHE_DINAMICO_EMPRESAS.md             # Documentação da implementação de cache dinâmico com invalidação cross-screen para empresas (correção de filtros AMS e sincronização automática entre telas)
├── CORRECAO_DUPLICACAO_TEMPLATES.md                # Documentação da correção da duplicação de templates no select "Template Padrão" do formulário de empresa (implementação de deduplicação por nome nos hooks useEmailTemplates e useBookTemplates, uso de Set para controle de nomes únicos, logs de debug para monitoramento, múltiplas camadas de proteção contra duplicação e estratégias de prevenção futura)
├── CORRECAO_CAMPOS_FORMULARIO_EMPRESA.md           # Documentação da correção dos campos "Tem AMS" e "Tipo de Book" que não carregavam no formulário de edição de empresas
├── CORRECAO_FORMATACAO_EMAILS_CONSOLIDADOS.md      # Documentação da correção da formatação de e-mails consolidados (correção do campo 'to' de string para array para consistência com campo 'cc' e formatação correta com colchetes angulares)
├── CORRECAO_INTERFACE_EMAIL_ARRAY_DESTINATARIOS.md  # Documentação da correção da interface EmailData para suportar array de destinatários (correção do campo 'to' de string para array, melhorando compatibilidade com emailService e sistema de envio consolidado)
├── CORRECAO_ERROS_TYPESCRIPT_EMAILSERVICE.md        # Documentação da correção de erros TypeScript no emailService (correção de tipos para função logEmail, remoção de variável não utilizada, remoção de imports desnecessários e reversão do parâmetro destinatario para string no booksDisparoService)
├── CORRECAO_PARAMETRO_DESTINATARIO_ARRAY.md        # Documentação da reversão do parâmetro destinatario do método enviarEmailComTemplate de string[] para string no booksDisparoService (correção de incompatibilidade com emailService e manutenção da arquitetura de e-mail consolidado)
├── CORRECAO_INTERFACE_EMAIL_DATA.md                # Documentação da correção da interface EmailData para compatibilidade de tipos (correção do erro TypeScript no campo 'to' de array para string com vírgulas, mantendo compatibilidade com interface EmailData do emailService e funcionalidade de e-mail consolidado)
├── CORRECAO_LOGS_AUDITORIA_ANEXOS.md               # Documentação da correção dos logs de auditoria no sistema de anexos (correção das migrações para usar permission_audit_logs em vez de logs_sistema, estrutura adequada para auditoria de operações de limpeza e alterações de schema)
├── CORRECAO_POLITICAS_RLS_ANEXOS.md                # Documentação da correção das políticas RLS para sistema de anexos (controle de acesso baseado em permissões de grupo, correção para usar user_group_assignments e screen_permissions)
├── CORRECAO_HISTORICO_BOOKS_FILTROS.md             # Documentação da correção dos filtros padrão da tela de histórico de books (remoção de filtros de mês/ano para mostrar todos os registros por padrão)
├── CORRECAO_OPCOES_BOOK_PERSONALIZADO.md           # Documentação da correção das opções "Book Personalizado" e "Anexo" que não apareciam quando Tipo de Book era "Qualidade"
├── CORRECAO_PERMISSOES_MONITORAMENTO_VIGENCIAS.md   # Documentação da correção das permissões da tela de Monitoramento de Vigências (registro da tela no sistema de permissões, configuração de permissões para administradores, script SQL de migração otimizado sem campos de timestamp automáticos, página de configuração via interface web, e instruções completas para resolução do problema de visibilidade na lista de permissões)
├── CORRECAO_SISTEMA_VIGENCIA_AUTOMATICA.md          # Documentação da correção do sistema de vigência automática (job scheduler não inicializava automaticamente, implementação de inicialização garantida, componente AutoSchedulerInitializer, verificação manual aprimorada e múltiplas camadas de garantia de funcionamento)
├── CORRECAO_VIGENCIA_AUTOMATICA_AO_SALVAR.md        # Documentação da correção da vigência automática ao salvar empresa (verificação imediata quando vigência final é definida para data anterior ao dia atual, inativação automática no momento do salvamento sem esperar job scheduler, implementação no hook useEmpresas com importação dinâmica do vigenciaService, tratamento robusto de erros e feedback específico ao usuário)
├── CORRECAO_TEMPLATE_PADRAO_NAO_EXIBIDO.md          # Documentação da correção do campo "Template Padrão" que não exibia opções no formulário de empresa (adição de templates padrão "Português" e "Inglês" ao hook useBookTemplates)
├── FUNCIONALIDADE_CONTROLE_BOTOES_DISPARO.md       # Documentação da funcionalidade de controle inteligente de botões de disparo (habilitação/desabilitação baseada no status das empresas selecionadas)
├── IMPLEMENTACAO_LOGICA_CONDICIONAL_TIPO_BOOK.md   # Documentação da implementação da lógica condicional para o campo "Tipo de Book" (exibição condicional baseada no campo "Tem AMS", validação contextual, interface dinâmica com hierarquia de dependências e experiência do usuário aprimorada)
├── IMPLEMENTACAO_CONTADORES_INTELIGENTES.md        # Documentação da implementação de contadores inteligentes nos botões de disparo que separam empresas selecionadas por status (paraDisparar vs paraReenviar) nas telas de Disparos e Disparos Personalizados
├── IMPLEMENTACAO_DISPAROS_PERSONALIZADOS.md        # Documentação da implementação do sistema de disparos personalizados para empresas com book personalizado (filtro book_personalizado=true, interface com tema roxo/purple, funcionalidades específicas de disparo, reenvio e agendamento)
├── IMPLEMENTACAO_EMAIL_CONSOLIDADO_STATUS.md       # Documentação do status da implementação de e-mail consolidado por empresa (envio único por empresa com todos os clientes no campo "Para", problemas encontrados e próximos passos necessários)
├── IMPLEMENTACAO_MES_REFERENCIA_BOOKS.md           # Documentação da implementação do sistema de mês de referência para books (books enviados em um mês referenciam dados do mês anterior, com interface atualizada e sistema de variáveis ajustado)
├── IMPLEMENTACAO_EMPRESAS_COM_BOOKS_RELATORIO.md        # Documentação da implementação de empresas com books no relatório mensal (nova seção verde para empresas que receberam books com sucesso, separação clara entre empresas com e sem books, interface atualizada com contadores e badges visuais, método buscarTodasEmpresasRelatorio() no historicoService, e atualização da interface RelatorioMetricas)
├── IMPLEMENTACAO_EXTENSAO_HISTORICO_ANEXOS.md       # Documentação da implementação da extensão da tabela historico_disparos para suporte a anexos (adição de colunas anexo_id e anexo_processado, relacionamento com anexos_temporarios, funções SQL otimizadas, sincronização automática de status, consultas com JOIN, estatísticas de uso, integração com serviços existentes e testes completos)
├── IMPLEMENTACAO_VARIAVEIS_MES_ATUAL.md            # Documentação da implementação das variáveis de mês atual para templates (sistema.mesNomeAtual e sistema.mesNomeAtualEn para referenciar o mês atual em português e inglês, diferenciando das variáveis de disparo que referenciam o mês anterior, com testes abrangentes e exemplos de uso em templates bilíngues)
├── IMPLEMENTACAO_EXIBICAO_ID_TEMPLATES.md         # Documentação da implementação da exibição de IDs de templates na interface de gerenciamento de templates de e-mail (funcionalidade para facilitar importação Excel de empresas com templates personalizados, botão de cópia com feedback visual, seção de ajuda integrada, compatibilidade com templates padrão e personalizados, e instruções claras de uso)
├── IMPLEMENTACAO_CAMPOS_VALOR_HORA_FORMULARIO.md       # Documentação da implementação dos campos de valor/hora no formulário de requerimentos (seção condicional "Valores por Hora" para tipos de cobrança específicos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel, campos valor_hora_funcional e valor_hora_tecnico com validação monetária R$ 0,00 a R$ 99.999,99, cálculo automático de valor total estimado em tempo real, integração com schema Zod, formatação brasileira de moeda, UX aprimorada com símbolo R$ integrado, tooltips explicativos, sincronização completa com backend e triggers do banco de dados)
├── IMPLEMENTACAO_CHECKBOX_CABECALHO_REQUERIMENTOS.md    # Documentação da implementação do checkbox de seleção geral no cabeçalho da lista de requerimentos (funcionalidade de selecionar/desselecionar todos os itens, redistribuição otimizada das larguras das colunas para acomodar checkbox 5%, estado inteligente baseado na seleção atual, integração com ações em lote existentes, acessibilidade aprimorada e melhoria significativa da experiência do usuário para operações em massa)
├── IMPLEMENTACAO_LAYOUT_4_COLUNAS_REQUERIMENTOS.md
├── IMPLEMENTACAO_LAYOUT_LINHA_REQUERIMENTOS.md         # Documentação da implementação do layout em linha horizontal para requerimentos (transformação do RequerimentoCard de formato de cards para layout horizontal em grid de 12 colunas, seguindo padrão da tela "Faturar Requerimentos", cabeçalho de lista com identificação das colunas, botões de ação apenas com ícones, densidade otimizada de informações, consistência visual entre telas, atualização completa dos testes unitários e manutenção de todas as funcionalidades existentes)     # Documentação da implementação do layout em 4 colunas para cards de requerimentos (grid responsivo expandido até 4 colunas no desktop, layout vertical ultra-compacto do RequerimentoCard, tipografia reduzida, densidade otimizada para visualização de 4x mais cards simultaneamente, breakpoints inteligentes mobile/tablet/desktop, otimizações de espaço com padding compacto, botões reduzidos, seção de horas inline F:/T:/Total, responsividade completa e compatibilidade com todos os testes unitários)
├── IMPLEMENTACAO_LIMPEZA_CACHE_INICIAL.md            # Documentação da implementação de sistema de limpeza automática de cache inicial (execução única por sessão, limpeza completa de React Query/InMemoryCache/LocalStorage/SessionStorage, controle via sessionStorage, logs detalhados, integração transparente com CacheInitializer e useCacheManager, garantia de dados sempre atualizados na primeira sessão)
├── AJUSTES_FILTROS_LAYOUT.md                          # Documentação dos ajustes de layout e filtros implementados no sistema (melhorias na interface de filtros, otimizações de layout e experiência do usuário)
├── ALTERACAO_CE_PLUS_PARA_COMEX.md                    # Documentação completa da migração de CE Plus para Comex (resumo das mudanças em código-fonte, banco de dados, testes, componentes, serviços, utilitários, migrações SQL, impacto zero downtime, retrocompatibilidade, validação completa e instruções de aplicação)
├── CORRECAO_STATUS_PADRAO_TODOS.md                     # Documentação da correção do status padrão dos filtros na tela de empresas clientes (alteração de "Ativo" para "Todos os status" por padrão, padronização com tela de clientes, inicialização correta dos filtros, lógica robusta para arrays vazios/undefined, consistência visual e melhor experiência do usuário)
├── EXPANSAO_LOGS_AUDITORIA_COMPLETA.md                # Documentação da expansão completa dos logs de auditoria do sistema (implementação de auditoria abrangente para todas as operações CRUD, formatação inteligente de mudanças, rastreamento de relacionamentos, logs estruturados para compliance, troubleshooting avançado e monitoramento de atividades de usuários em todas as funcionalidades do sistema)
├── GUIA_MIGRACAO_CE_PLUS_COMEX.md                     # Guia completo de migração de CE Plus para Comex (instruções passo a passo, checklist de validação, scripts de migração e troubleshooting)
├── IMPLEMENTACAO_EXPORTACAO_LOGS_AUDITORIA.md         # Documentação da implementação de funcionalidades completas de exportação de logs de auditoria (exportação CSV com codificação UTF-8, relatório HTML detalhado com resumo estatístico, interface intuitiva com botões de exportação, tratamento de erros robusto, integração com filtros aplicados, limite de 1000 registros por exportação, formatação profissional para análise offline e documentação de compliance)
├── IMPLEMENTACAO_FILTROS_ESCONDIDOS_AUDIT_LOGS.md     # Documentação da implementação de filtros escondidos na tela de Logs de Auditoria (sistema de filtros colapsável seguindo padrão visual do sistema, busca em tempo real, layout responsivo em grid de 4 colunas, filtros por tabela/ação/período, valores especiais para evitar conflitos Radix UI, interface limpa com toggle para mostrar/ocultar filtros, consistência visual com outras telas administrativas e melhorias de UX)
├── IMPLEMENTACAO_FILTRO_EMAIL_GESTOR_EMPRESAS.md      # Documentação da implementação do filtro por e-mail gestor na tela de empresas clientes (novo campo de filtro, integração com sistema de busca, melhorias na experiência de filtragem e localização de empresas por gestor responsável)
├── index.html                  					      	# Template HTML principal da aplicação com meta tags Open Graph atualizadas para "Controle Qualidade"
├── MELHORIA_FILTROS_MULTISELECT.md                    # Documentação das melhorias implementadas nos filtros multiselect (otimizações de interface, melhor experiência do usuário, performance aprimorada e funcionalidades avançadas de seleção múltipla)
├── MELHORIA_LAYOUT_HORIZONTAL_REQUERIMENTO_CARD.md    # Documentação da melhoria do layout horizontal do componente RequerimentoCard (implementação de grid responsivo em duas colunas para melhor aproveitamento do espaço, compactação de elementos com line-clamp-2 para descrição e observação, otimizações de responsividade com breakpoints, seção de horas inline com flex-wrap, footer de ações responsivo, melhorias de espaçamento e compatibilidade completa com testes, acessibilidade e temas)
├── OTIMIZACAO_LAYOUT_MULTIPLAS_COLUNAS_REQUERIMENTOS.md # Documentação da otimização do layout para múltiplas colunas no sistema de requerimentos (implementação de grid responsivo expandido até 5 colunas em telas grandes, layout ultra-compacto vertical do RequerimentoCard, tipografia reduzida, altura consistente de cards, breakpoints inteligentes, melhorias de UX com truncamento e densidade otimizada para visualização de mais cards simultaneamente)
├── MELHORIA_CORES_PADRAO_SISTEMA_PDF.md            # Documentação da melhoria das cores padrão do sistema para exportação PDF (implementação da cor azul Sonda #2563eb como padrão corporativo em todas as exportações PDF)
├── MELHORIA_LAYOUT_PDF_EMPRESAS_PADRAO_VISUAL.md   # Documentação da melhoria do layout PDF de exportação de empresas com design moderno e profissional (cabeçalho centralizado, caixa de resumo estatístico, layout de cards individuais, sistema de cores por status, barra lateral colorida, estrutura em duas colunas, tipografia hierárquica, paginação automática e elementos visuais consistentes seguindo padrão corporativo)
├── MELHORIAS_RESPONSIVIDADE_SIDEBAR.md             # Documentação das melhorias de responsividade implementadas na sidebar
├── MELHORIA_TEMPLATE_EXCEL_EMPRESAS_COMPLETO.md    # Documentação da melhoria do template Excel para importação de empresas com todos os 15 campos disponíveis, validações robustas e instruções integradas
├── PADRONIZACAO_BOTAO_IMPORTAR_EMPRESAS.md         # Documentação da padronização do botão de importação na tela "Cadastro de Empresas" com dropdown contendo opções "Baixar Template Excel" e "Importar do Excel", seguindo padrão visual estabelecido e implementação do componente EmpresaImportExportButtons
├── PADRONIZACAO_FILTROS_CLIENTES.md                # Documentação da padronização dos filtros da tela de empresas clientes seguindo o padrão da tela de clientes (substituição de MultiSelect por Select simples, layout em grid de 3 colunas, interface minimalista sem badges visuais, mantendo funcionalidade de filtros múltiplos internamente, consistência visual em todo o sistema)
├── CORRECAO_PAYLOAD_POWER_AUTOMATE_SENDTESTEMAILWITHMAPPING.md # Documentação da correção crítica no método sendTestEmailWithMapping do emailService para garantir compatibilidade total com Power Automate (correção do campo email para sempre ser array, inclusão obrigatória dos campos email_cc e anexos mesmo quando vazios, padronização do payload de teste com estrutura completa esperada pelo webhook, eliminação de erros 400 em testes de templates e garantia de funcionamento correto da funcionalidade de teste de configuração de webhook)
├── supabase/                   					      	# Configurações do banco de dados
│   ├── .temp/                  					      	# Arquivos temporários do Supabase
│   │   └── cli-latest                              # CLI do Supabase
│   └── migration/              					      	# Scripts de migração do banco
│       ├── add_monitoramento_vigencias_screen.sql  # Migração otimizada para adicionar tela de Monitoramento de Vigências ao sistema de permissões (sem campos de timestamp automáticos created_at/updated_at)
│       ├── add_user_registration_screen.sql       # Migração para tela de registro de usuários
│       ├── add_valor_hora_requerimentos.sql      # Migração para adicionar campos de valor/hora na tabela requerimentos (valor_hora_funcional, valor_hora_tecnico, valor_total_funcional, valor_total_tecnico, valor_total_geral com cálculo automático via trigger para tipos de cobrança específicos: Faturado, Hora Extra, Sobreaviso, Bolsão Enel, incluindo função de estatísticas de valores por tipo de cobrança, índices otimizados e logging via permission_audit_logs)
│       ├── anexos_infrastructure_migration.sql    # Migração para infraestrutura de anexos do sistema de disparos personalizados (tabela anexos_temporarios, extensão do historico_disparos, índices otimizados, funções de limpeza automática e validação de limite de 25MB por empresa)
│       ├── anexos_rls_policies.sql                # Políticas RLS para sistema de anexos com controle de acesso baseado em permissões de grupo (corrigido para usar user_group_assignments e screen_permissions em vez de user_permissions diretas)
│       ├── anexos_storage_setup.sql               # Migração para configuração do Supabase Storage para sistema de anexos (buckets, políticas de acesso e configurações de segurança)
│       ├── anexos_temporarios_migration.sql       # Migração para criar tabela anexos_temporarios do sistema de anexos para disparos personalizados (estrutura completa da tabela, índices otimizados, triggers de atualização automática, funções de limpeza de registros expirados, validação de limite de 25MB por empresa com DROP FUNCTION seguro, logs condicionais para logs_sistema, e comentários detalhados)
│       ├── client_books_management_migration.sql		# Migração principal do sistema de books
│       ├── client_books_permissions_migration.sql		# Migração de permissões para telas do sistema
│       ├── client_books_rls_policies.sql          # Políticas RLS para sistema de books
│       ├── correcao_trigger_vigencia.sql          # Correção do trigger de vigência de contratos
│       ├── correcao_vigencia_vencimento.sql       # Correção da lógica de vigência vencida (considera vencido apenas no dia seguinte ao vencimento)
│       ├── email_logs_templates_migration.sql     # Migração para logs e templates de email
│       ├── email_test_data_migration.sql          # Migração para dados de teste de email
│       ├── empresa_campos_adicionais_migration.sql # Migração para campos adicionais da tabela empresas
│       ├── fix_token_acesso_size.sql              # Migração para corrigir o tamanho do campo token_acesso de VARCHAR(255) para TEXT (tokens JWT podem exceder 255 caracteres)
│       ├── grups_and_profile_migration.sql        # Migração de grupos e perfis de usuário
│       ├── historico_disparos_anexos_extension.sql # Migração para estender tabela historico_disparos com suporte a anexos (adiciona colunas anexo_id e anexo_processado, triggers de sincronização de status, funções para consulta de histórico com anexos, estatísticas de anexos por período, log de migração otimizado e comentários detalhados)
│       ├── jobs_queue_migration.sql               # Migração para fila de jobs
│       ├── migration_empresa_ams_tipo_book.sql    # Migração para adicionar campos "Tem AMS" e "Tipo de Book" na tabela empresas_clientes
│       ├── performance_optimization_indexes.sql   # Índices para otimização de performance
│       ├── rename_colaboradores_to_clientes.sql   # Migração para renomear tabela colaboradores para clientes
│       ├── rename_ce_plus_to_comex.sql           # Migração completa para renomear CE Plus para Comex em todo o sistema (atualiza produtos, grupos responsáveis, requerimentos e constraints, inclui verificação prévia de dados existentes, logs de progresso detalhados, validação pós-migração com contadores e alertas de inconsistências, numeração corrigida dos passos da migração)
│       ├── run_sistema_requerimentos_migration.sql # Script de execução completa das migrações do sistema de requerimentos (executa todas as migrações em sequência: estrutura, permissões, RLS e validações)
│       ├── setup_rls_policies.sql                 # Configuração de políticas RLS
│       ├── sistema_requerimentos_migration.sql    # Migração principal do sistema de requerimentos (criação da tabela requerimentos com todos os campos, constraints, índices e triggers necessários para gerenciamento de especificações funcionais de chamados técnicos, incluindo validações de negócio, campos calculados e verificação automática da estrutura criada)
│       ├── sistema_requerimentos_permissions_migration.sql # Migração de permissões do sistema de requerimentos (registro das telas "Lançar Requerimentos" e "Faturar Requerimentos" no sistema de permissões, configuração automática de permissões de edição para grupo administrador padrão, verificação de integridade das configurações e exibição de status das telas e permissões registradas)
│       ├── sistema_requerimentos_rls_policies.sql # Migração de políticas RLS do sistema de requerimentos (controle de acesso baseado em permissões de grupo, políticas de segurança para operações CRUD na tabela requerimentos)
│       ├── sistema_requerimentos_validation_test.sql # Script de validação e testes do sistema de requerimentos (testes de integridade, validação de constraints, simulação de operações CRUD e verificação de permissões)
│       └── update_template_padrao_constraint.sql  # Migração para permitir templates personalizados no campo template_padrao
│				
├── package.json               						   	# Dependências e scripts do projeto
├── package-lock.json           					      	# Lock file das dependências
├── PADRONIZACAO_BOTAO_EXPORTAR_LOGS_AUDITORIA.md      # Documentação da padronização do botão de exportação na tela de Logs de Auditoria (implementação de botão unificado "Exportar" com dropdown para Excel e PDF seguindo padrão visual do sistema, componente AuditLogExportButtons, funcionalidades aprimoradas de exportação com relatório HTML profissional, estatísticas detalhadas, badges coloridos por ação, layout responsivo, integração com filtros aplicados e melhorias na experiência do usuário)
├── postcss.config.js          						   	# Configuração do PostCSS
├── SEPARACAO_COMPLETA_DISPAROS.md                  # Documentação da separação completa entre disparos padrão e personalizados (exclusão de empresas com book_personalizado=true dos disparos padrão)
├── setup-permissions.js        					      	# Script de configuração de permissões
├── tailwind.config.ts         						   	# Configuração do Tailwind CSS
├── test_alteracoes_requerimentos.js                  # Script de teste completo para validar alterações no sistema de requerimentos (testa data de aprovação opcional, horas como números inteiros, suporte a valores >100h, NOVO: suporte a horas quebradas formato HH:MM, soma de horas quebradas, validação de formatos de horas, cálculo automático de horas total, validações de datas, campos obrigatórios, tipos de cobrança com valor/hora e funcionalidades avançadas do sistema)
├── test_anexos_integration.ts                         # Testes de integração para sistema de anexos
├── test_ordenacao_empresas.js                         # Script de teste para validar ordenação alfabética de empresas no sistema de books (testa a função localeCompare com configurações pt-BR, sensitivity: 'base' e ignorePunctuation: true para garantir ordenação correta por nome completo)
├── teste_loop_anexos.md                               # Documentação de testes de loop e performance do sistema de anexos (análise de comportamento em cenários de alta carga e uso intensivo)
├── TESTE_HISTORICO_DISPAROS.sql                       # Script SQL para teste e diagnóstico da tabela historico_disparos (verifica estrutura, dados, relacionamentos e identifica problemas na tabela de histórico de disparos de books)
├── tsconfig.app.json           					      	# Configuração TypeScript para aplicação
├── tsconfig.json              					   		# Configuração principal do TypeScript
├── tsconfig.node.json          					      	# Configuração TypeScript para Node.js
├── vercel.json                 					      	# Configuração para deploy no Vercel
├── vite.config.ts            					   		# Configuração do Vite
└── vitest.config.ts            					      	# Configuração do Vitest para testes