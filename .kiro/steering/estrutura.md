<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
books-snd/
├── public/                     						# Arquivos estáticos
│   └── images/                 						# Imagens do projeto
│       ├── qualidade/          						# Imagens relacionadas a qualidade
│       ├── fundo-sonda.png			
│       └── login-sonda.jpg			
│			
├── src/                        						# Código-fonte principal
│   ├── components/             						# Componentes reutilizáveis
│   │   ├── admin/              						# Componentes de administração
│   │   │   ├── email/ 									# Template de emails
│   │   │   │   └── EditorEmail.tsx						# Editor HTML
│   │   │   │   └── EditorTemplateCompleto.tsx			# Tela completa editor template
│   │   │   │   └── EmailTemplateErrorFallback.tsx		# Erro ao encontrar template
│   │   │   │   └── FormularioConfiguracaoWebhook.tsx	# Tela configuração Webhook
│   │   │   │   └── FormularioNovoTemplate.tsx			# Tela criação novo template
│   │   │   │   └── GerenciadorTemplatesEmail.tsx		# Listagem de templates
│   │   │   │   └── PreviewEmail.tsx					# Preview Template HTML
│   │   │   │   └── TemplateMappingList.tsx				# Listagem de templates
│   │   │   │   └── TemplateMappingValidation.tsx		# Validação de template
│   │   │   │   └── TesteVariaveisEmail.tsx				# Simula variáveis --- Ajustar variáveis
│   │   │   │   └── VariaveisTemplate.tsx				# Listagem de variáveis
│   │   │   │   └── VisualizadorLogsEmail.tsx			# Listagem de logs e-mail
│   │   │   ├── groups/         						# Gerenciamento de grupos
│   │   │   │   └── DeleteGroupDialog.tsx				# Deletar grupo
│   │   │   │   └── GroupFormDialog.tsx					# Modal Cadastro grupo
│   │   │   │   └── GroupsTable.tsx						# Tela listagem grupos
│   │   │   │   └── PermissionConfigDialog.tsx			# Mensagem de permissão da tela
│   │   │   │   └── PermissionLevelSelect.tsx			# Select Box das permissões
│   │   │   │   └── PermissionMatrix.tsx				# Tela de permissão
│   │   │   │   └── UserGroupAssignmentTable.tsx		# Listagem de usuários aos grupos
│   │   │   └── Breadcrumb.tsx  						# Navegação em migalhas de pão
│   │   │   └── DialogTesteEmail.tsx 					# 
│   │   │   └── LayoutAdmin.tsx							# Tela Administração
│   │   │   └── PermissionsFixer.tsx  					# Configurador de permissões
│   │   │   └── SessionInfo.tsx  						# Expiração de sessão
│   │   │   └── Sidebar.tsx  							# Menu lateral
│   │   │   └── ThemeToggle.tsx  						# Alteração de tema
│   │   │			
│   │   ├── auth/               						# Componentes de autenticação
│   │   │   └── index.ts								# Monta os componentes Action, Route e Timeout
│   │   │   └── PermissionFeedback.tsx					# Informa que o usuário não tem permissão
│   │   │   └── ProtectedAction.tsx						# Componente que renderiza filhos condicionalmente com base nas permissões do usuário
│   │   │   └── ProtectedRoute.tsx						# Permissóes de rotas
│   │   │   └── SessionTimeoutModal.tsx					# Modar de expiração da sessão
│   │   ├── errors/             						# Componentes de erro
│   │   │   └── GlobalErrorBoundary.tsx					# Captura todos os erros não tratados na aplicação
│   │   │   └── index.ts								# Monta os componentes GlobalErrorBoundary, LoadingFallback e PermissionErrorBoundary
│   │   │   └── LoadingFallback.tsx						# Fallback de carregamento reutilizável com estados de erro e funcionalidade de nova tentativa
│   │   │   └── PermissionErrorBoundary.tsx				# Limite de erro projetado especificamente para lidar com erros relacionados a permissões
│   │   └── ui/                 						# Componentes de interface genéricos
│   │				
│   ├── config/                 						# Configurações da aplicação
│   │   └──emailTemplateConfig.ts						# Configurações template de emails
│   │   └── sessionConfig.ts							# Configuração de expiração da sessão
│   │				
│   ├── contexts/               						# Contextos React
│   │   └── PermissionsContext.tsx						# Cria um contexto para permissões
│   │				
│   ├── errors/                 						# Tratamento de erros
│   │   └──EmailTemplateError.ts						# Tratamento de erros dos templates de email
│   │   └── permissionErrors.ts							# Carrega permissões e grupo do usuário
│   │				
│   ├── hooks/                                   		# Custom hooks
│   │   ├── use-mobile.tsx                       		# Hook para detectar dispositivos móveis
│   │   ├── use-toast.ts                         		# Hook para sistema de notificações toast
│   │   ├── useAuth.tsx                          		# Hook de autenticação com Supabase (login/logout)
│   │   ├── useEmailLogs.ts                      		# Hook para logs de email
│   │   ├── useEmailTemplateMapping.ts           		# Hook para mapeamento de templates de email
│   │   ├── useEmailTemplatePreview.ts           		# Hook para preview de templates de email
│   │   ├── useEmailTemplates.ts                 		# Hook para gerenciar templates de email
│   │   ├── useEmailVariableMapping.ts           		# Hook para mapeamento de variáveis de email
│   │   ├── usePermissionFallbacks.ts            		# Hook para fallbacks de permissões
│   │   ├── usePermissions.ts                    		# Hook para sistema de permissões
│   │   ├── useSessionPersistence.ts             		# Hook para persistência de sessão
│   │   ├── useSessionTimeout.ts                 		# Hook para timeout de sessão
│   │   ├── useSidebar.ts                        		# Hook para controle da sidebar
│   │   ├── useTemplateMappingValidation.ts      		# Hook para validação de mapeamento de templates
│   │   ├── useTemplateTestData.ts               		# Hook para dados de teste de templates
│   │   ├── useTestData.ts                       		# Hook para gerenciar dados de teste
│   │   ├── useTextToSpeech.ts                   		# Hook para funcionalidade text-to-speech
│   │   ├── useTheme.ts                          		# Hook para sistema de temas (dark/light)
│   │   ├── useUserSettings.ts                   		# Hook para configurações do usuário
│   │   └── useWebhookConfig.ts                  		# Hook para configurações de webhook     				
│   │				
│   ├── integrations/           						# Integrações com serviços externos
│   │   ├── supabase/									# Integrações banco de dados
│   │       └──client.ts								# Cria instância com Supabase
│	 │       └──types.ts									# Define a estrutura de todas as tabelas, views, funções
│   │				
│   ├── lib/                    						# Utilitários e bibliotecas
│	 │   └──utils.ts										# Importação de bibliotecas
│   │				
│   ├── pages/                  						# Páginas da aplicação (Next.js)
│   │   ├── admin/              						# Páginas de administração
│   │   │   ├── AuditLogs.tsx           				# Logs de Auditoria
│   │   │   ├── Dashboard.tsx           				# Painel de Controle
│   │   │   ├── EmailConfig.tsx         				# Configuração de E-mail
│   │   │   ├── GroupManagement.tsx     				# Gerenciamento de Grupos
│   │   │   ├── UserConfig.tsx          				# Configuração do Usuário
│   │   │   ├── UserManagement.tsx						# Listagem usuário do sistema
│   │   │   └── UserGroupAssignment.tsx 				# Atribuição de Usuários a Grupos
│   │   │				
│   │   ├── AccessDenied.tsx    						# Acesso Negado
│   │   ├── FixPermissions.tsx  						# Correção de Permissões
│   │   ├── Login.tsx           						# Tela de Login
│   │   ├── NotFound.tsx        						# Página 404
│   │   └── SystemError.tsx     						# Erro do Sistema
│   │				
│   ├── services/               						# Serviços e chamadas de API
│   │   ├── configuration/      						# Configurações do serviço
│   │   │   └──index.ts									# Exportações centralizadas da infraestrutura de configuração dinâmica
│   │   ├── adminNotificationService.ts       			# Sistema de notificações para administradores (alertas críticos, falhas de sistema)
│   │   ├── auditLogger.ts            					# Logger de auditoria para operações de mapeamento e templates
│   │   ├── auditService.ts            					# Serviço de auditoria para logs de permissões e ações do sistema
│   │   ├── cacheManager.ts            					# Gerenciador de cache avançado com TTL e estatísticas de performance
│   │   ├── configurationAdminService.ts       			# Utilitários administrativos para gerenciar configurações dinâmicas
│   │   ├── configurationRepository.ts       			# Repository para acesso aos dados de configuração no banco (calibracao_colunas/valores)
│   │   ├── configurationService.ts       				# Serviço principal de configuração dinâmica com cache e fallback
│   │   ├── emailService.ts            					# Serviço base para envio de emails com anexos
│   │   ├── emailTemplateMappingService.ts       		# Mapeamento e gerenciamento de templates de email por formulário/modalidade
│   │   ├── errorRecoveryService.ts       				# Estratégias de recuperação automática de erros com retry e fallback
│   │   ├── permissionsService.ts       				# Gerenciamento de permissões de usuários e controle de acesso
│   │   ├── screenService.ts            				# Gerenciamento de telas e suas configurações de permissão
│   │   ├── testDataService.ts            				# Gerenciamento de conjuntos de dados de teste para templates
│   │				
│   ├── styles/                 						# Estilos globais
│   │   └── login.css 									# Estilo do Login
│   │				
│   ├── types/                  						# Tipos TypeScript
│   │				
│   └── utils/                  						# Utilitários
│       ├── cacheKeyGenerator.ts       					# Gerar chaves de cache otimizadas para configurações dinâmicas
│       ├── cnpjMask.ts            						# Formatação e máscara de CNPJ (XX.XXX.XXX/XXXX-XX)
│       ├── configurationDebug.ts      					# Ferramentas de debug e diagnóstico para configurações
│       ├── configurationLogger.ts     					# Sistema de logging estruturado para eventos e performance
│       ├── configurationMapper.ts     					# Mapeamento entre formatos de configuração (legacy/novo)
│       ├── emailValidation.ts         					# Validação de emails e verificação de domínio Sonda
│       ├── environmentCheck.ts        					# Verificar se ambiente está configurado corretamente
│       ├── errorHandler.ts           					# Tratamento de erros com estratégias de recuperação
│       ├── fallbackManager.ts         					# Gerenciar mecanismos de fallback com valores padrão
│       ├── formatters.ts             					# Formatação de moeda e outros valores
│       ├── performance-optimizations.ts				# Otimizações de performance para sistema de permissões
│       ├── permissionUtils.ts         					# Verificação e validação de permissões de usuário
│       ├── permissionsUtils.ts        					# Funções auxiliares para trabalhar com permissões
│       ├── retryUtils.ts             					# Lógica de retry com backoff exponencial
│       ├── submissionLock.ts          					# Sistema de lock para prevenir submissões duplicadas
│       ├── templateMappingValidation.ts				# Validação de mapeamento de templates de email
│       └── validation.ts             					# Validações para configuração dinâmica (porcentagens, colunas)
│				
├── .env                       							# Variáveis de ambiente
├── .gitignore                 							# Arquivos ignorados pelo Git
├── package.json               							# Dependências e scripts
├── postcss.config.js          							# Configuração do PostCSS
├── tailwind.config.ts         							# Configuração do Tailwind CSS
├── tsconfig.json              							# Configuração do TypeScript
└── vite.config.ts            							# Configuração do Vite