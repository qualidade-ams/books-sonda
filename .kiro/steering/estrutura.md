<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
books-snd/
├── examples/                   						      # Exemplos de uso e integração
│   └── template-selection-example.tsx				   # Exemplos completos de uso da funcionalidade de seleção de templates (padrão e personalizados)
│			
├── public/                     						      # Arquivos estáticos
│   ├── favicon.ico             						      # Ícone da aplicação
│   ├── robots.txt              						      # Arquivo de configuração para crawlers
│   └── images/                 						      # Imagens do projeto
│       ├── qualidade/          						      # Imagens relacionadas a qualidade
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
│   │   │   ├── client-books/   						      # Componentes do sistema de clientes e books
│   │   │   │   ├── __tests__/          				   # Testes dos componentes do sistema de books
│   │   │   │   │   └── TemplatePreview.test.tsx		   # Testes do componente de prévia de templates
│   │   │   │   └── ColaboradoresTable.tsx				   # Tabela de listagem de colaboradores
│   │   │   │   └── ColaboradorForm.tsx					   # Formulário de cadastro/edição de colaboradores
│   │   │   │   └── EmpresaForm.tsx						   # Formulário de cadastro/edição de empresas
│   │   │   │   └── EmpresasTable.tsx					   # Tabela de listagem de empresas clientes
│   │   │   │   └── GrupoForm.tsx						   # Formulário de cadastro/edição de grupos responsáveis
│   │   │   │   └── GruposTable.tsx						   # Tabela de listagem de grupos responsáveis
│   │   │   │   └── TemplatePreview.tsx					   # Componente de prévia visual de templates selecionados no formulário de empresas (exibe informações de templates padrão e personalizados com badges, assunto e conteúdo)
│   │   │   │   └── index.ts							      # Exportações centralizadas dos componentes
│   │   │   ├── email/ 									      # Template de emails
│   │   │   │   └── EditorEmail.tsx						   # Editor HTML
│   │   │   │   └── EditorTemplateCompleto.tsx			# Tela completa editor template
│   │   │   │   └── EmailTemplateErrorFallback.tsx		# Erro ao encontrar template
│   │   │   │   └── FormularioConfiguracaoWebhook.tsx	# Tela configuração Webhook
│   │   │   │   └── FormularioNovoTemplate.tsx			# Tela criação novo template
│   │   │   │   └── GerenciadorTemplatesEmail.tsx		# Listagem de templates
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
│   │   │   │   └── UserGroupAssignmentTable.tsx		# Listagem de usuários aos grupos
│   │   │   ├── grupos/         						      # Gerenciamento de grupos responsáveis (sistema de books)
│   │   │   │   └── GrupoDetailsModal.tsx				   # Modal de detalhes do grupo responsável
│   │   │   │   └── GrupoForm.tsx						   # Formulário de grupo responsável
│   │   │   │   └── GrupoFormModal.tsx					   # Modal de formulário de grupo responsável
│   │   │   │   └── GruposTable.tsx						   # Tabela de grupos responsáveis
│   │   │   └── Breadcrumb.tsx  						      # Navegação em migalhas de pão com suporte às rotas do sistema de client books
│   │   │   └── DataNormalizationTool.tsx				   # Ferramenta para normalização de dados (uppercase/lowercase)
│   │   │   └── DialogTesteEmail.tsx 					   # Modal de teste de envio de email
│   │   │   └── LayoutAdmin.tsx							   # Layout principal da área administrativa
│   │   │   └── PerformanceMonitor.tsx					   # Monitor de performance da aplicação
│   │   │   └── PermissionsFixer.tsx  					   # Configurador de permissões
│   │   │   └── SessionInfo.tsx  						   # Informações de expiração de sessão
│   │   │   └── Sidebar.tsx  							      # Menu lateral de navegação
│   │   │   └── ThemeToggle.tsx  						   # Alternador de tema (claro/escuro)
│   │   │			
│   │   ├── auth/               						      # Componentes de autenticação
│   │   │   └── index.ts								      # Exportações centralizadas dos componentes de auth
│   │   │   └── PermissionFeedback.tsx					   # Feedback quando usuário não tem permissão
│   │   │   └── ProtectedAction.tsx						   # Componente que renderiza filhos condicionalmente com base nas permissões
│   │   │   └── ProtectedRoute.tsx						   # Proteção de rotas baseada em permissões
│   │   │   └── SessionTimeoutModal.tsx					# Modal de expiração da sessão
│   │   ├── errors/             						      # Componentes de tratamento de erro
│   │   │   └── GlobalErrorBoundary.tsx					# Captura todos os erros não tratados na aplicação
│   │   │   └── index.ts								      # Exportações centralizadas dos componentes de erro
│   │   │   └── LoadingFallback.tsx						   # Fallback de carregamento com estados de erro e retry
│   │   │   └── PermissionErrorBoundary.tsx				# Boundary específico para erros de permissão
│   │   ├── notifications/      						      # Componentes de notificação
│   │   │   └── index.ts								      # Exportações centralizadas dos componentes de notificação
│   │   │   └── ProgressIndicator.tsx					   # Indicador de progresso para operações longas
│   │   │   └── RealTimeNotifications.tsx				   # Notificações em tempo real via Supabase
│   │   └── ui/                 						      # Componentes de interface genéricos (shadcn/ui)
│   │       └── [60+ componentes UI]                    # Componentes base da biblioteca shadcn/ui
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
│   │   ├── useAuth.tsx                          		# Hook de autenticação com Supabase
│   │   ├── useBookTemplates.ts                  		# Hook especializado para templates de books personalizados (templates padrão removidos)
│   │   ├── useClientBooksPermissions.ts         		# Hook para permissões específicas do sistema de books
│   │   ├── useClientBooksVariables.ts           		# Hook para variáveis do sistema de clientes e books
│   │   ├── useColaboradores.ts                  		# Hook para gerenciamento de colaboradores
│   │   ├── useControleDisparos.ts               		# Hook para controle de disparos de books
│   │   ├── useEmailLogs.ts                      		# Hook para logs de email
│   │   ├── useEmailTemplateMapping.ts           		# Hook para mapeamento de templates de email
│   │   ├── useEmailTemplatePreview.ts           		# Hook para preview de templates
│   │   ├── useEmailTemplates.ts                 		# Hook para gerenciamento de templates
│   │   ├── useEmailVariableMapping.ts           		# Hook para mapeamento de variáveis de email
│   │   ├── useEmpresas.ts                       		# Hook para gerenciamento de empresas clientes
│   │   ├── useExcelImport.ts                    		# Hook para importação de arquivos Excel
│   │   ├── useGrupos.ts                         		# Hook para grupos do sistema de permissões
│   │   ├── useGruposResponsaveis.ts             		# Hook para grupos responsáveis do sistema de books
│   │   ├── useHistorico.ts                      		# Hook para histórico de books
│   │   ├── useJobScheduler.ts                   		# Hook para agendamento de jobs
│   │   ├── usePagination.ts                     		# Hook para paginação otimizada
│   │   ├── usePermissionFallbacks.tsx           		# Hook para fallbacks de permissões
│   │   ├── usePermissions.ts                    		# Hook principal do sistema de permissões
│   │   ├── useRealTimeNotifications.ts          		# Hook para notificações em tempo real
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
│   │   └── useWebhookConfig.ts                  		# Hook para configurações de webhook
│   │				
│   ├── integrations/           						      # Integrações com serviços externos
│   │   └── supabase/									      # Integração com Supabase
│   │       ├── adminClient.ts                       # Cliente Supabase para operações administrativas
│   │       ├── client.ts								      # Cliente principal do Supabase
│   │       └── types.ts									      # Tipos gerados automaticamente do banco de dados
│   │				
│   ├── lib/                    						      # Utilitários e bibliotecas
│   │   └── utils.ts										      # Utilitários gerais (clsx, tailwind-merge, etc.)
│   │				
│   ├── pages/                  						      # Páginas da aplicação
│   │   ├── admin/              						      # Páginas administrativas
│   │   │   ├── AuditLogs.tsx           				   # Visualização de logs de auditoria
│   │   │   ├── Colaboradores.tsx       				   # Gerenciamento de colaboradores
│   │   │   ├── ConfigurarPermissoesClientBooks.tsx   # Configuração de permissões para sistema de books
│   │   │   ├── ControleDisparos.tsx    				   # Controle mensal de disparos
│   │   │   ├── Dashboard.tsx           				   # Painel principal administrativo
│   │   │   ├── DataMaintenance.tsx     				   # Manutenção e normalização de dados
│   │   │   ├── EmailConfig.tsx         				   # Configuração de templates de email
│   │   │   ├── EmpresasClientes.tsx    				   # Cadastro de empresas clientes
│   │   │   ├── GroupManagement.tsx     			   	# Gerenciamento de grupos de usuários
│   │   │   ├── GruposResponsaveis.tsx  				   # Gerenciamento de grupos responsáveis
│   │   │   ├── HistoricoBooks.tsx      				   # Histórico e relatórios de books
│   │   │   ├── UserConfig.tsx          			   	# Configurações do usuário
│   │   │   ├── UserGroupAssignment.tsx 			   	# Atribuição de usuários a grupos
│   │   │   └── UserManagement.tsx						   # Gerenciamento de usuários do sistema
│   │   │				
│   │   ├── AccessDenied.tsx    						      # Página de acesso negado
│   │   ├── FixPermissions.tsx  						      # Página para correção de permissões
│   │   ├── Login.tsx           					      	# Página de login
│   │   ├── NotFound.tsx        					      	# Página 404
│   │   └── SystemError.tsx     					      	# Página de erro do sistema
│   │				
│   ├── schemas/                						      # Schemas de validação Zod
│   │   ├── __tests__/          						      # Testes dos schemas
│   │   │   └── clientBooksSchemas.test.ts			   # Testes dos schemas do sistema de books
│   │   └── clientBooksSchemas.ts					   # Schemas de validação para formulários do sistema de clientes e books
│   │				
│   ├── services/               						      # Serviços e lógica de negócio
│   │   ├── __tests__/          						      # Testes dos serviços
│   │   │   ├── booksDisparoService.test.ts          # Testes do serviço de controle de disparos de books
│   │   │   ├── colaboradoresService.test.ts         # Testes do serviço de colaboradores
│   │   │   ├── empresasClientesService.test.ts      # Testes do serviço de empresas clientes
│   │   │   ├── excelImportService.test.ts           # Testes do serviço de importação Excel
│   │   │   ├── gruposResponsaveisService.test.ts    # Testes do serviço de grupos responsáveis
│   │   │   ├── historicoService.test.ts             # Testes do serviço de histórico
│   │   │   ├── jobSchedulerService.test.ts          # Testes do serviço de agendamento de jobs
│   │   │   ├── realTimeNotificationService.test.ts  # Testes do serviço de notificações em tempo real
│   │   │   └── templateValidationService.test.ts    # Testes do serviço de validação de templates
│   │   ├── configuration/      						      # Serviços de configuração
│   │   │   └── index.ts									      # Exportações da infraestrutura de configuração
│   │   ├── adminNotificationService.ts       			# Notificações para administradores
│   │   ├── auditLogger.ts            				   	# Logger de auditoria
│   │   ├── auditService.ts            					# Serviço de auditoria do sistema
│   │   ├── booksDisparoService.ts       				# Controle de disparos automáticos de books
│   │   ├── cacheManager.ts            					# Gerenciador de cache avançado
│   │   ├── clientBooksCache.ts            				# Cache específico para o sistema de Client Books com estratégias otimizadas
│   │   ├── clientBooksPermissionsService.ts         # Serviço de permissões específicas do sistema de books
│   │   ├── clientBooksServices.ts       				# Serviços centralizados do sistema de books
│   │   ├── clientBooksTemplateService.ts            # Serviço de templates para sistema de books
│   │   ├── colaboradoresService.ts       				# CRUD de colaboradores
│   │   ├── configurationAdminService.ts       		# Administração de configurações dinâmicas
│   │   ├── configurationRepository.ts       			# Repository de configurações
│   │   ├── configurationService.ts       				# Serviço principal de configuração
│   │   ├── emailService.ts            					# Serviço base de envio de emails
│   │   ├── emailTemplateMappingService.ts       		# Mapeamento de templates de email
│   │   ├── empresasClientesService.ts       			# CRUD de empresas clientes
│   │   ├── errorRecoveryService.ts       				# Estratégias de recuperação de erros
│   │   ├── excelImportService.ts       				# Importação e processamento de Excel
│   │   ├── gruposResponsaveisService.ts       		# CRUD de grupos responsáveis
│   │   ├── historicoService.ts       					# Consultas e relatórios de histórico
│   │   ├── jobConfigurationService.ts       			# Configuração de jobs e tarefas agendadas
│   │   ├── jobSchedulerService.ts       				# Agendamento e execução de jobs automáticos
│   │   ├── performanceOptimizationService.ts        # Serviço de otimização de performance
│   │   ├── permissionsService.ts       			   	# Gerenciamento de permissões
│   │   ├── realTimeNotificationService.ts       		# Notificações em tempo real via Supabase subscriptions
│   │   ├── screenService.ts            			      # Gerenciamento de telas do sistema
│   │   ├── templateValidationService.ts             # Validação de templates
│   │   ├── testDataService.ts            				# Gerenciamento de dados de teste
│   │   ├── userManagementService.ts       			# Gerenciamento de usuários
│   │   └── userSettingsService.ts       				# Configurações e preferências do usuário
│   │				
│   ├── styles/                 					      	# Estilos globais
│   │   └── login.css 									      # Estilos específicos da página de login
│   │				
│   ├── test/                   					      	# Arquivos de teste
│   │   ├── integration/        					      	# Testes de integração
│   │   │   ├── cadastroCompleto.test.ts             # Teste de fluxo completo de cadastro
│   │   │   ├── disparoEmails.test.ts                # Teste de disparo de emails
│   │   │   └── importacaoExcel.test.ts              # Teste de importação de Excel
│   │   ├── clientBooksTypes.test.ts             		# Testes dos tipos do sistema de books
│   │   ├── permissions.test.ts                  		# Testes do sistema de permissões
│   │   └── setup.ts                             		# Configuração dos testes
│   │				
│   ├── types/                  						      # Definições de tipos TypeScript
│   │   ├── api.ts                               		# Tipos para APIs
│   │   ├── approval.ts                          		# Tipos para sistema de aprovação
│   │   ├── audit.ts                             		# Tipos para auditoria
│   │   ├── clientBooks.ts                       		# Tipos do sistema de clientes e books
│   │   ├── clientBooksTypes.ts                  		# Tipos específicos do sistema de books
│   │   ├── configuration.ts                     		# Tipos para configurações
│   │   ├── constants.ts                         		# Constantes tipadas
│   │   ├── database.ts                          		# Tipos do banco de dados
│   │   ├── formData.ts                          		# Tipos para dados de formulário
│   │   ├── formDataFiscal.ts                    		# Tipos para formulários fiscais
│   │   ├── formTypes.ts                         		# Tipos gerais de formulários
│   │   ├── index.ts                             		# Exportações centralizadas de tipos
│   │   ├── permissions.ts                       		# Tipos do sistema de permissões
│   │   └── userSettings.ts                      		# Tipos para configurações do usuário
│   │				
│   ├── utils/                  						      # Funções utilitárias
│   │   ├── __tests__/          						      # Testes das funções utilitárias
│   │   │   ├── clientBooksVariableMapping.test.ts   # Testes do mapeamento de variáveis
│   │   │   ├── errorRecovery.test.ts                # Testes de recuperação de erros
│   │   │   └── templateSelection.integration.test.ts # Testes de integração para seleção de templates (padrão e personalizados)
│   │   ├── cacheKeyGenerator.ts       					# Geração de chaves de cache
│   │   ├── clientBooksErrorHandler.ts       			# Tratamento de erros específicos do sistema de books
│   │   ├── clientBooksVariableMapping.ts       		# Mapeamento de variáveis para templates
│   │   ├── cnpjMask.ts            					   	# Formatação e máscara de CNPJ
│   │   ├── configurationDebug.ts      					# Debug de configurações
│   │   ├── configurationLogger.ts     					# Logging estruturado
│   │   ├── configurationMapper.ts     					# Mapeamento de configurações
│   │   ├── dataFixUtils.ts            					# Utilitários para correção e normalização de dados
│   │   ├── emailValidation.ts         					# Validação de emails
│   │   ├── emailVariableMapping.ts              		# Mapeamento de variáveis de email
│   │   ├── environmentCheck.ts        					# Verificação de ambiente
│   │   ├── errorHandler.ts           				   	# Tratamento de erros
│   │   ├── errorRecovery.ts           				   	# Estratégias de recuperação de erros
│   │   ├── fallbackManager.ts         					# Gerenciamento de fallbacks
│   │   ├── formatters.ts             				   	# Formatação de valores
│   │   ├── paginationUtils.ts         					# Utilitários de paginação
│   │   ├── performance-optimizations.ts			   	# Otimizações de performance
│   │   ├── permissionUtils.ts         					# Utilitários de permissões (legacy)
│   │   ├── permissionsUtils.ts        					# Utilitários de permissões (novo)
│   │   ├── retryUtils.ts             				   	# Lógica de retry com backoff
│   │   ├── templateMappingValidation.ts				   # Validação de mapeamento de templates
│   │   └── validation.ts             				   	# Validações para configuração dinâmica
│   │				
│   ├── App.css                 					      	# Estilos principais da aplicação
│   ├── App.tsx                 					      	# Componente raiz da aplicação com roteamento
│   ├── index.css               					      	# Estilos globais e Tailwind CSS
│   ├── main.tsx                					      	# Ponto de entrada da aplicação React
│   └── vite-env.d.ts           					      	# Definições de tipos para Vite
│				
├── docs/                       					      	# Documentação do projeto
│   ├── excel-import.md         					      	# Documentação sobre importação de Excel
│   └── validacoes-tratamento-erros.md              	# Documentação sobre validações e tratamento de erros
│				
├── supabase/                   					      	# Configurações do banco de dados
│   ├── .temp/                  					      	# Arquivos temporários do Supabase
│   │   └── cli-latest                              # CLI do Supabase
│   └── migration/              					      	# Scripts de migração do banco
│       ├── add_user_registration_screen.sql       # Migração para tela de registro de usuários
│       ├── client_books_management_migration.sql		# Migração principal do sistema de books
│       ├── client_books_permissions_migration.sql		# Migração de permissões para telas do sistema
│       ├── client_books_rls_policies.sql          # Políticas RLS para sistema de books
│       ├── email_logs_templates_migration.sql     # Migração para logs e templates de email
│       ├── email_test_data_migration.sql          # Migração para dados de teste de email
│       ├── grups_and_profile_migration.sql        # Migração de grupos e perfis de usuário
│       ├── jobs_queue_migration.sql               # Migração para fila de jobs
│       ├── performance_optimization_indexes.sql   # Índices para otimização de performance
│       ├── setup_rls_policies.sql                 # Configuração de políticas RLS
│       └── update_template_padrao_constraint.sql  # Migração para permitir templates personalizados no campo template_padrao
│				
├── .env.example                					      	# Exemplo de variáveis de ambiente
├── .env.local                  					      	# Variáveis de ambiente locais
├── .gitignore                 						   	# Arquivos ignorados pelo Git
├── index.html                  					      	# Template HTML principal
├── NORMALIZACAO_CAMPOS_UPPERCASE.md                # Documentação sobre normalização de campos (uppercase/lowercase)
├── package.json               						   	# Dependências e scripts do projeto
├── package-lock.json           					      	# Lock file das dependências
├── PERMISSIONS_SETUP_SUMMARY.md                    # Documentação do sistema de permissões
├── README_TEMPLATE_SELECTION.md                    # Documentação completa da implementação da funcionalidade de seleção de templates (padrão e personalizados)
├── TEMPLATE_SELECTION_GUIDE.md                     # Guia completo da funcionalidade de seleção de templates para empresas
├── postcss.config.js          						   	# Configuração do PostCSS
├── setup-permissions.js        					      	# Script de configuração de permissões
├── tailwind.config.ts         						   	# Configuração do Tailwind CSS
├── tsconfig.app.json           					      	# Configuração TypeScript para aplicação
├── tsconfig.json              					   		# Configuração principal do TypeScript
├── tsconfig.node.json          					      	# Configuração TypeScript para Node.js
├── vercel.json                 					      	# Configuração para deploy no Vercel
├── vite.config.ts            					   		# Configuração do Vite
└── vitest.config.ts            					      	# Configuração do Vitest para testes