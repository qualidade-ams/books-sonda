Pra# Implementation Plan

- [x] 1. Configurar infraestrutura de banco de dados




  - Criar migração SQL para tabela requerimentos com todos os campos, constraints e índices
  - Criar migração para registrar telas no sistema de permissões (lancar_requerimentos, faturar_requerimentos)
  - Criar políticas RLS para controle de acesso baseado em permissões de grupo
  - Testar migrações e validar estrutura do banco
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implementar tipos TypeScript e schemas de validação




  - Criar arquivo types/requerimentos.ts com todas as interfaces e tipos
  - Implementar schemas Zod para validação de formulários em schemas/requerimentosSchemas.ts
  - Criar constantes para opções de select (módulos, linguagens, tipos de cobrança)
  - Implementar sistema de cores para tipos de cobrança em utils/requerimentosColors.ts
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 3. Criar serviço de requerimentos





  - Implementar requerimentosService.ts com CRUD completo
  - Criar métodos para buscar clientes da tabela empresas_clientes
  - Implementar método para enviar requerimento para faturamento
  - Criar método para buscar requerimentos por status e mês
  - Implementar validações de negócio e tratamento de erros
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 4. Implementar hook customizado useRequerimentos





  - Criar hook useRequerimentos.ts com React Query para gerenciamento de estado
  - Implementar queries para listar, criar, editar e deletar requerimentos
  - Criar mutation para enviar requerimento para faturamento
  - Implementar cache e invalidação otimizada
  - Adicionar tratamento de erros e loading states
  - _Requirements: 2.1, 3.1, 3.2, 4.1, 4.2, 5.1_

- [x] 5. Criar componente de formulário RequerimentoForm





  - Implementar formulário completo com todos os campos obrigatórios
  - Integrar validação com Zod e React Hook Form
  - Criar select para clientes buscando de empresas_clientes
  - Implementar cálculo automático de horas total (funcional + técnico)
  - Adicionar validações de formato para campo chamado (letras, números, hífen)
  - Implementar limitação de caracteres para descrição (500) e observação (1000)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

- [x] 6. Criar componente RequerimentoCard para exibição






  - Implementar card com design baseado no tipo de cobrança
  - Aplicar sistema de cores específico para cada tipo de cobrança
  - Exibir todos os campos do requerimento de forma organizada
  - Adicionar botão "Enviar para faturamento" com confirmação
  - Implementar estados de loading e tratamento de erros
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 7. Implementar página LancarRequerimentos




  - Criar página completa com formulário e lista de requerimentos
  - Implementar funcionalidade de adicionar novo requerimento
  - Criar lista de requerimentos não enviados para faturamento
  - Integrar botão "Enviar para faturamento" em cada item
  - Implementar busca e filtros básicos
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_

- [x] 8. Criar serviço de faturamento de requerimentos





  - Implementar faturamentoService.ts para geração de relatórios
  - Criar método para agrupar requerimentos por tipo de cobrança
  - Implementar cálculo de totais de horas por categoria
  - Criar template de email HTML para relatório de faturamento
  - Integrar com emailService existente para envio
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 9. Implementar página EnviarRequerimentos





  - Criar página para visualizar requerimentos enviados para faturamento
  - Implementar agrupamento visual por tipo de cobrança
  - Exibir totais de horas por categoria
  - Criar modal para inserir emails dos destinatários
  - Implementar botão "Disparar Faturamento" com confirmação
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1_

- [x] 10. Integrar menu na sidebar





  - Adicionar seção "Requerimentos" na sidebar existente
  - Criar submenus "Lançar Requerimentos" e "Enviar Requerimentos"
  - Implementar verificação de permissões para exibição do menu
  - Integrar com sistema de navegação existente
  - Adicionar ícones apropriados (FileText, DollarSign)
  - _Requirements: 1.1, 1.2, 1.3, 10.5_

- [ ] 11. Configurar permissões no sistema








  - Executar script para registrar telas no sistema de permissões
  - Configurar permissões para grupo administrador
  - Testar controle de acesso para usuários não administradores
  - Validar integração com ProtectedRoute existente
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [-] 12. Implementar classes de erro customizadas






  - Criar requerimentosErrors.ts com classes específicas de erro
  - Implementar tratamento de erros de validação
  - Criar mensagens de erro user-friendly
  - Integrar com sistema de toast notifications existente
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 13. Criar testes unitários




  - Implementar testes para requerimentosService.test.ts
  - Criar testes para useRequerimentos.test.ts
  - Testar componentes RequerimentoForm.test.tsx e RequerimentoCard.test.tsx
  - Implementar testes de validação para schemas
  - Testar sistema de cores e utilitários
  - _Requirements: Todos os requirements através de validação de funcionalidade_

- [x] 14. Implementar testes de integração





  - Criar teste de fluxo completo: lançar → enviar → faturar
  - Testar integração com banco de dados Supabase
  - Validar integração com sistema de permissões
  - Testar envio de email de faturamento
  - _Requirements: Validação end-to-end de todos os requirements_

- [x] 15. Finalizar integração e polimento





  - Revisar e otimizar performance das queries
  - Implementar loading states e feedback visual
  - Adicionar tooltips e help text onde necessário
  - Testar responsividade em diferentes dispositivos
  - Validar acessibilidade dos componentes
  - Realizar testes finais de integração com sistema existente
  - _Requirements: Todos os requirements com foco em experiência do usuário_