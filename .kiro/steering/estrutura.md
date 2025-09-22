<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
books-snd/
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
│   │   │   ├── client-books/   						      # Componentes do sistema de clientes e books
│   │   │   │   ├── __tests__/          				   # Testes dos componentes do sistema de books
│   │   │   │   │   └── TemplatePreview.test.tsx		   # Testes do componente de prévia de templates
│   │   │   │   ├── ClientImportExportButtons.tsx		   # Componente unificado de botões para importação e exportação de empresas e clientes com suporte a Excel e PDF
│   │   │   │   ├── ClienteForm.tsx						   # Formulário de cadastro/edição de clientes
│   │   │   │   ├── ClientesTable.tsx					   # Tabela de listagem de clientes
│   │   │   │   ├── EmpresaForm.tsx						   # Formulário de cadastro/edição de empresas com campos AMS, Tipo de Book, Link SharePoint, vigência de contrato e opções específicas para books de qualidade (Book Personalizado e Anexo)
│   │   │   │   ├── EmpresaImportExportButtons.tsx		   # Componente específico de botões para importação e exportação de empresas clientes com dropdown menus, suporte a Excel e PDF, modal avançado de importação com preview de dados e resultado detalhado, integração completa com hook useExcelImport, controle otimizado de estado do modal (fechamento automático quando não há dados para exibir), e botão "Nova Importação" na tela de resultado para facilitar importações sequenciais sem fechar o modal
│   │   │   │   ├── EmpresasTable.tsx					   # Tabela de listagem de empresas clientes
│   │   │   │   ├── GrupoForm.tsx						   # Formulário de cadastro/edição de grupos responsáveis
│   │   │   │   ├── GruposTable.tsx						   # Tabela de listagem de grupos responsáveis
│   │   │   │   └── index.ts							      # Exportações centralizadas dos componentes
│   │   │   ├── email/ 									      # Template de emails
│   │   │   │   └── EditorEmail.tsx						   # Editor HTML
│   │   │   │   └── EditorTemplateCompleto.tsx			# Tela completa editor template
│   │   │   │   └── EmailTemplateErrorFallback.tsx		# Erro ao encontrar template
│   │   │   │   └── FormularioConfiguracaoWebhook.tsx	# Tela configuração Webhook
│   │   │   │   └── FormularioNovoTemplate.tsx			# Tela criação novo template
│   │   │   │   └── GerenciadorTemplatesEmail.tsx		# Gerenciador completo de templates de email (listagem, criação, edição, exclusão, ativação/desativação, teste de envio e controle de permissões)
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
│   │   │   │   ├── GrupoDetailsModal.tsx				   # Modal de detalhes do grupo responsável
│   │   │   │   ├── GrupoForm.tsx						   # Formulário de grupo responsável
│   │   │   │   ├── GrupoFormModal.tsx					   # Modal de formulário de grupo responsável
│   │   │   │   ├── GruposTable.tsx						   # Tabela de grupos responsáveis
│   │   │   │   └── ImportExportButtons.tsx				   # Botões de importação e exportação para grupos responsáveis
│   │   │   ├── AutoSchedulerInitializer.tsx			   # Componente para inicialização automática do job scheduler (garante que o scheduler seja iniciado quando a aplicação carrega)
│   │   │   ├── Breadcrumb.tsx  						      # Navegação em migalhas de pão com suporte às rotas do sistema de client books
│   │   │   ├── DialogTesteEmail.tsx 					   # Modal de teste de envio de email
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
│   │       └── [52 componentes UI]                     # Componentes base da biblioteca shadcn/ui incluindo componentes customizados como confirm-dialog, field-speech-button, lazy-loading, pagination-optimized e stepper
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
│   │   ├── useBookTemplates.ts                  		# Hook para templates de books com sistema de priorização inteligente (prioriza templates personalizados sobre padrão, adiciona templates padrão "Português" e "Inglês" apenas se não existir template personalizado com o mesmo nome, implementa Set duplo para controle de duplicação e identificação de templates personalizados, logs de debug aprimorados para monitoramento, filtragem específica para formulário 'book' e prevenção completa de duplicação por nome)
│   │   ├── useClientBooksPermissions.ts         		# Hook para permissões específicas do sistema de books
│   │   ├── useClientBooksVariables.ts           		# Hook para variáveis do sistema de clientes e books
│   │   ├── useClientes.ts                       		# Hook para gerenciamento de clientes (renomeado de useColaboradores)
│   │   ├── useControleDisparos.ts               		# Hook para controle de disparos de books com invalidação otimizada de cache (função centralizada invalidateAllCaches que limpa todos os caches relacionados: controle-disparos, historico-disparos, relatorio-mensal, estatisticas-performance, empresas-sem-books e clientes-com-falhas, garantindo sincronização completa após operações de disparo, reenvio e agendamento)
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
│   │   ├── useVigenciaMonitor.ts                		# Hook para monitoramento de vigência de contratos
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
│   │   │   ├── Clientes.tsx            				   # Gerenciamento de clientes (página "Cadastro de Clientes", renomeada de Colaboradores.tsx)
│   │   │   ├── ConfigurarPermissoesClientBooks.tsx   # Configuração de permissões para sistema de books
│   │   │   ├── ConfigurarPermissoesVigencias.tsx     # Configuração de permissões para tela de Monitoramento de Vigências (registra a tela no sistema de permissões, configura permissão de edição para administradores, inclui verificação de configuração e instruções detalhadas)
│   │   │   ├── ControleDisparos.tsx    				   # Controle de disparos selecionados e reenvios (tela "Disparos" no sistema de permissões, com funcionalidades de disparo por seleção, reenvio de falhas, agendamento e contadores inteligentes baseados no status das empresas selecionadas para otimizar a experiência do usuário)
│   │   │   ├── ControleDisparosPersonalizados.tsx    # Controle de disparos personalizados para empresas com book personalizado (filtra apenas empresas com book_personalizado=true), interface com tema roxo/purple, funcionalidades de disparo selecionado, reenvio de falhas, agendamento e controle inteligente de botões baseado em contadores específicos (paraDisparar/paraReenviar) que consideram o status real das empresas selecionadas
│   │   │   ├── MonitoramentoVigencias.tsx             # Monitoramento de vigências de contratos das empresas
│   │   │   ├── Dashboard.tsx           				   # Painel principal administrativo simplificado com boas-vindas e suporte a tema escuro
│   │   │   ├── EmailConfig.tsx         				   # Configuração de templates de email
│   │   │   ├── EmpresasClientes.tsx    				   # Cadastro de empresas clientes com integração do componente EmpresaImportExportButtons para funcionalidades unificadas de importação e exportação, handler de importação otimizado com forceRefresh automático e notificação de sucesso
│   │   │   ├── GroupManagement.tsx     			   	# Gerenciamento de grupos de usuários
│   │   │   ├── GruposResponsaveis.tsx  				   # Gerenciamento de grupos responsáveis
│   │   │   ├── HistoricoBooks.tsx      				   # Histórico e relatórios de books com interface aprimorada (exibe todos os registros por padrão sem filtros de mês/ano pré-definidos, seção dedicada para empresas com books enviados com badge verde e scroll otimizado, melhorias na exibição de empresas sem books com informações mais detalhadas incluindo nome abreviado, controle de altura máxima com scroll para listas extensas)
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
│   │   └── clientBooksSchemas.ts					   # Schemas de validação para formulários do sistema de clientes e books (inclui tipoBookSchema para validação dos tipos: nao_tem_book, qualidade, outros)
│   │				
│   ├── services/               						      # Serviços e lógica de negócio
│   │   ├── __tests__/          						      # Testes dos serviços
│   │   │   ├── booksDisparoService.test.ts          # Testes do serviço de controle de disparos de books
│   │   │   ├── clientesService.test.ts              # Testes do serviço de clientes
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
│   │   ├── booksDisparoService.ts       				# Controle de disparos automáticos de books com envio consolidado por empresa (filtra empresas com AMS ativo E tipo book "qualidade", suporte a disparos padrão e personalizados, implementa envio de e-mail único por empresa contendo todos os clientes tanto para disparos iniciais quanto para reenvios, tratamento robusto de erros com registro detalhado de falhas e sucessos)
│   │   ├── cacheManager.ts            					# Gerenciador de cache avançado
│   │   ├── clientBooksCache.ts            				# Cache específico para o sistema de Client Books com estratégias otimizadas
│   │   ├── clientBooksPermissionsService.ts         # Serviço de permissões específicas do sistema de books (registra telas: empresas_clientes, clientes "Cadastro de Clientes", grupos_responsaveis, controle_disparos "Disparos", historico_books, monitoramento_vigencias "Monitoramento de Vigências")
│   │   ├── clientBooksServices.ts       				# Serviços centralizados do sistema de books
│   │   ├── clientBooksTemplateService.ts            # Serviço de templates para sistema de books
│   │   ├── clientesService.ts       					# CRUD de clientes (renomeado de colaboradoresService para clientesService, mantém compatibilidade)
│   │   ├── configurationAdminService.ts       		# Administração de configurações dinâmicas
│   │   ├── configurationRepository.ts       			# Repository de configurações
│   │   ├── configurationService.ts       				# Serviço principal de configuração
│   │   ├── emailService.ts            					# Serviço base de envio de emails
│   │   ├── emailTemplateMappingService.ts       		# Mapeamento de templates de email
│   │   ├── empresasClientesService.ts       			# CRUD de empresas clientes
│   │   ├── errorRecoveryService.ts       				# Estratégias de recuperação de erros
│   │   ├── excelImportService.ts       				# Importação e processamento de Excel com schema expandido e validações robustas (inclui validação obrigatória para Link SharePoint, Email Gestor e Produtos, validação de status com descrição obrigatória para status Inativo/Suspenso, validação de vigências com formato de data e consistência temporal, validação de campos booleanos com valores aceitos "sim/não", além de campos opcionais para AMS, Tipo Book e configurações de book personalizado, template Excel aprimorado com 15 colunas incluindo campos de vigência, instruções detalhadas e larguras de coluna otimizadas, resolução automática de grupos responsáveis por nome convertendo para IDs durante a importação, e geração de relatórios de importação otimizados sem cabeçalhos desnecessários)
│   │   ├── gruposResponsaveisService.ts       		# CRUD de grupos responsáveis
│   │   ├── historicoService.ts       					# Consultas e relatórios de histórico com funcionalidade de busca de empresas para relatórios mensais (separação entre empresas com e sem books baseada no histórico de disparos)
│   │   ├── jobConfigurationService.ts       			# Configuração de jobs e tarefas agendadas
│   │   ├── jobSchedulerService.ts       				# Agendamento e execução de jobs automáticos
│   │   ├── performanceOptimizationService.ts        # Serviço de otimização de performance
│   │   ├── permissionsService.ts       			   	# Gerenciamento de permissões
│   │   ├── realTimeNotificationService.ts       		# Notificações em tempo real via Supabase subscriptions
│   │   ├── screenService.ts            			      # Gerenciamento de telas do sistema
│   │   ├── templateValidationService.ts             # Validação de templates
│   │   ├── testDataService.ts            				# Gerenciamento de dados de teste
│   │   ├── userManagementService.ts       			# Gerenciamento de usuários
│   │   ├── userSettingsService.ts       				# Configurações e preferências do usuário
│   │   └── vigenciaService.ts           				# Serviço para gerenciamento de vigência de contratos
│   │				
│   ├── styles/                 					      	# Estilos globais
│   │   └── login.css 									      # Estilos específicos da página de login
│   │				
│   ├── test/                   					      	# Arquivos de teste
│   │   ├── integration/        					      	# Testes de integração
│   │   │   ├── cadastroCompleto.test.ts             # Teste de fluxo completo de cadastro
│   │   │   ├── disparoEmails.test.ts                # Teste de disparo de emails
│   │   │   ├── importacaoExcel.test.ts              # Teste de importação de Excel
│   │   │   ├── mesReferenciaBooks.test.ts           # Teste de cálculo do mês de referência para disparos de books (validação do mês anterior ao disparo)
│   │   │   └── vigenciaAutomatica.test.ts           # Teste de inativação automática de empresas por vigência expirada
│   │   ├── clientBooksTypes.test.ts             		# Testes dos tipos do sistema de books
│   │   ├── permissions.test.ts                  		# Testes do sistema de permissões
│   │   └── setup.ts                             		# Configuração dos testes
│   │				
│   ├── types/                  						      # Definições de tipos TypeScript
│   │   ├── api.ts                               		# Tipos para APIs
│   │   ├── approval.ts                          		# Tipos para sistema de aprovação
│   │   ├── audit.ts                             		# Tipos para auditoria
│   │   ├── clientBooks.ts                       		# Tipos do sistema de clientes e books, incluindo constantes TIPO_BOOK_OPTIONS para seleção de tipos de book (nao_tem_book, qualidade, outros) e interface RelatorioMetricas com separação de empresas com e sem books
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
│   │   │   ├── clientBooksVariableMapping.test.ts   # Testes do mapeamento de variáveis com casos específicos para nomes de mês em português e inglês, validação do mês de referência (mês anterior ao disparo) e correção de sintaxe
│   │   │   ├── errorRecovery.test.ts                # Testes de recuperação de erros
│   │   │   └── templateSelection.integration.test.ts # Testes de integração para seleção de templates (padrão e personalizados)
│   │   ├── cacheKeyGenerator.ts       					# Geração de chaves de cache
│   │   ├── clientBooksErrorHandler.ts       			# Tratamento de erros específicos do sistema de books
│   │   ├── clientBooksVariableMapping.ts       		# Mapeamento de variáveis para templates com cálculo automático do mês de referência (mês anterior ao disparo), suporte a nomes de meses em português e inglês, correção de sintaxe na função de mapeamento de variáveis
│   │   ├── clientExportUtils.ts         				# Utilitários para exportação de dados de clientes (colaboradores)
│   │   ├── cnpjMask.ts            					   	# Formatação e máscara de CNPJ
│   │   ├── empresasExportUtils.ts       				# Utilitários específicos para exportação de empresas clientes (Excel e PDF com design aprimorado - layout em cards, cores temáticas Sonda (#2563eb), caixa de resumo estatístico expandida com contadores de empresas ativas/inativas/suspensas, cabeçalho profissional, integração Supabase e mapeamento assíncrono de templates, correção da sintaxe de aplicação de cores no jsPDF para compatibilidade com versões mais recentes) - usado pela tela EmpresasClientes.tsx
│   │   ├── configurationDebug.ts      					# Debug de configurações
│   │   ├── configurationLogger.ts     					# Logging estruturado
│   │   ├── configurationMapper.ts     					# Mapeamento de configurações
│   │   ├── emailValidation.ts         					# Validação de emails
│   │   ├── emailVariableMapping.ts              		# Mapeamento de variáveis de email
│   │   ├── environmentCheck.ts        					# Verificação de ambiente
│   │   ├── errorHandler.ts           				   	# Tratamento de erros
│   │   ├── errorRecovery.ts           				   	# Estratégias de recuperação de erros
│   │   ├── exportUtils.ts            				   	# Utilitários gerais para exportação de dados
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
│       ├── client_books_management_migration.sql		# Migração principal do sistema de books
│       ├── client_books_permissions_migration.sql		# Migração de permissões para telas do sistema
│       ├── client_books_rls_policies.sql          # Políticas RLS para sistema de books
│       ├── correcao_trigger_vigencia.sql          # Correção do trigger de vigência de contratos
│       ├── correcao_vigencia_vencimento.sql       # Correção da lógica de vigência vencida (considera vencido apenas no dia seguinte ao vencimento)
│       ├── email_logs_templates_migration.sql     # Migração para logs e templates de email
│       ├── email_test_data_migration.sql          # Migração para dados de teste de email
│       ├── empresa_campos_adicionais_migration.sql # Migração para campos adicionais da tabela empresas
│       ├── grups_and_profile_migration.sql        # Migração de grupos e perfis de usuário
│       ├── jobs_queue_migration.sql               # Migração para fila de jobs
│       ├── migration_empresa_ams_tipo_book.sql    # Migração para adicionar campos "Tem AMS" e "Tipo de Book" na tabela empresas_clientes
│       ├── performance_optimization_indexes.sql   # Índices para otimização de performance
│       ├── rename_colaboradores_to_clientes.sql   # Migração para renomear tabela colaboradores para clientes
│       ├── setup_rls_policies.sql                 # Configuração de políticas RLS
│       └── update_template_padrao_constraint.sql  # Migração para permitir templates personalizados no campo template_padrao
│				
├── .env.example                					      	# Exemplo de variáveis de ambiente
├── .env.local                  					      	# Variáveis de ambiente locais
├── .gitignore                 						   	# Arquivos ignorados pelo Git
├── AJUSTE_COR_AZUL_PDF_PADRAO_SISTEMA.md            # Documentação do ajuste da cor azul padrão do sistema para exportação PDF (correção da sintaxe de aplicação de cores no jsPDF para compatibilidade com versões mais recentes da biblioteca)
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
├── index.html                  					      	# Template HTML principal
├── MELHORIA_CORES_PADRAO_SISTEMA_PDF.md            # Documentação da melhoria das cores padrão do sistema para exportação PDF (implementação da cor azul Sonda #2563eb como padrão corporativo em todas as exportações PDF)
├── MELHORIA_LAYOUT_PDF_EMPRESAS_PADRAO_VISUAL.md   # Documentação da melhoria do layout PDF de exportação de empresas com design moderno e profissional (cabeçalho centralizado, caixa de resumo estatístico, layout de cards individuais, sistema de cores por status, barra lateral colorida, estrutura em duas colunas, tipografia hierárquica, paginação automática e elementos visuais consistentes seguindo padrão corporativo)
├── MELHORIAS_RESPONSIVIDADE_SIDEBAR.md             # Documentação das melhorias de responsividade implementadas na sidebar
├── MELHORIA_TEMPLATE_EXCEL_EMPRESAS_COMPLETO.md    # Documentação da melhoria do template Excel para importação de empresas com todos os 15 campos disponíveis, validações robustas e instruções integradas
├── PADRONIZACAO_BOTAO_IMPORTAR_EMPRESAS.md         # Documentação da padronização do botão de importação na tela "Cadastro de Empresas" com dropdown contendo opções "Baixar Template Excel" e "Importar do Excel", seguindo padrão visual estabelecido e implementação do componente EmpresaImportExportButtons
├── package.json               						   	# Dependências e scripts do projeto
├── package-lock.json           					      	# Lock file das dependências
├── postcss.config.js          						   	# Configuração do PostCSS
├── SEPARACAO_COMPLETA_DISPAROS.md                  # Documentação da separação completa entre disparos padrão e personalizados (exclusão de empresas com book_personalizado=true dos disparos padrão)
├── setup-permissions.js        					      	# Script de configuração de permissões
├── tailwind.config.ts         						   	# Configuração do Tailwind CSS
├── TESTE_HISTORICO_DISPAROS.sql                       # Script SQL para teste e diagnóstico da tabela historico_disparos (verifica estrutura, dados, relacionamentos e identifica problemas na tabela de histórico de disparos de books)
├── tsconfig.app.json           					      	# Configuração TypeScript para aplicação
├── tsconfig.json              					   		# Configuração principal do TypeScript
├── tsconfig.node.json          					      	# Configuração TypeScript para Node.js
├── vercel.json                 					      	# Configuração para deploy no Vercel
├── vite.config.ts            					   		# Configuração do Vite
└── vitest.config.ts            					      	# Configuração do Vitest para testes