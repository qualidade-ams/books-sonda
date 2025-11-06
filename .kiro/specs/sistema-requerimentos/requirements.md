# Requirements Document

## Introduction

O Sistema de Requerimentos é uma funcionalidade administrativa que permite o lançamento, controle e faturamento de especificações funcionais (EFs) de chamados técnicos. O sistema gerencia todo o ciclo de vida dos requerimentos, desde o lançamento inicial até o envio para faturamento, incluindo controle de horas, tipos de cobrança e geração de relatórios automáticos por email.

## Requirements

### Requirement 1

**User Story:** Como administrador, eu quero acessar o menu de Requerimentos na sidebar, para que eu possa gerenciar lançamentos e faturamentos de especificações funcionais.

#### Acceptance Criteria

1. WHEN o usuário for administrador THEN o sistema SHALL exibir o menu "Requerimentos" na sidebar
2. WHEN o usuário clicar em "Requerimentos" THEN o sistema SHALL expandir o submenu com as opções "Lançar Requerimentos" e "Enviar Requerimentos"
3. WHEN o usuário não for administrador THEN o sistema SHALL ocultar o menu "Requerimentos"

### Requirement 2

**User Story:** Como administrador, eu quero lançar requerimentos individuais com todas as informações necessárias, para que eu possa registrar especificações funcionais de chamados técnicos.

#### Acceptance Criteria

1. WHEN o usuário acessar "Lançar Requerimentos" THEN o sistema SHALL exibir um formulário com todos os campos obrigatórios
2. WHEN o usuário inserir um chamado THEN o sistema SHALL aceitar letras, números e hífen (formato: RF-6017993)
3. WHEN o usuário selecionar cliente THEN o sistema SHALL buscar da tabela empresas_clientes campo nome_completo
4. WHEN o usuário selecionar módulo THEN o sistema SHALL oferecer as opções: Comply, Comply e-DOCS, pw.SATI, pw.SPED, pw.SATI/pw.SPED
5. WHEN o usuário inserir descrição THEN o sistema SHALL limitar a 500 caracteres
6. WHEN o usuário inserir horas funcionais ou técnicas THEN o sistema SHALL permitir valores acima de 100 horas
7. WHEN o usuário inserir horas funcionais e técnicas THEN o sistema SHALL calcular automaticamente o campo "Horas" como soma dos dois
8. WHEN o usuário selecionar linguagem THEN o sistema SHALL oferecer as opções: ABAP, DBA, Funcional, PL/SQL, Técnico
9. WHEN o usuário selecionar cobrança THEN o sistema SHALL oferecer as opções: Banco de Horas, Cobro Interno, Contrato, Faturado, Hora Extra, Sobreaviso, Reprovado, Bolsão Enel
10. WHEN o usuário selecionar tipo de cobrança THEN o sistema SHALL aplicar cor específica ao card do requerimento
11. WHEN o usuário inserir observação THEN o sistema SHALL limitar a 1000 caracteres

### Requirement 3

**User Story:** Como administrador, eu quero visualizar todos os requerimentos lançados em uma lista organizada, para que eu possa gerenciar e controlar o status de cada especificação funcional.

#### Acceptance Criteria

1. WHEN o usuário acessar "Lançar Requerimentos" THEN o sistema SHALL exibir lista de todos os requerimentos não enviados para faturamento
2. WHEN o sistema exibir um requerimento THEN o sistema SHALL mostrar card com cor baseada no tipo de cobrança
3. WHEN o usuário visualizar um requerimento THEN o sistema SHALL exibir todos os campos preenchidos
4. WHEN o usuário clicar em "Enviar para faturamento" THEN o sistema SHALL mover o requerimento para tela de faturamento
5. WHEN o requerimento for enviado para faturamento THEN o sistema SHALL remover da lista de "Lançar Requerimentos"

### Requirement 4

**User Story:** Como administrador, eu quero enviar requerimentos aprovados para faturamento, para que eu possa controlar quais especificações funcionais serão cobradas.

#### Acceptance Criteria

1. WHEN o usuário clicar em "Enviar para faturamento" em um requerimento THEN o sistema SHALL transferir o requerimento para tela "Enviar Requerimentos"
2. WHEN o requerimento for transferido THEN o sistema SHALL alterar status para "Enviado para Faturamento"
3. WHEN o requerimento for transferido THEN o sistema SHALL remover da visualização de "Lançar Requerimentos"
4. WHEN o sistema transferir requerimento THEN o sistema SHALL manter todos os dados originais

### Requirement 5

**User Story:** Como administrador, eu quero visualizar todos os requerimentos aprovados do mês na tela de faturamento, para que eu possa processar cobranças de forma organizada.

#### Acceptance Criteria

1. WHEN o usuário acessar "Enviar Requerimentos" THEN o sistema SHALL exibir todos os requerimentos enviados para faturamento no mês atual
2. WHEN o sistema exibir requerimentos THEN o sistema SHALL agrupar por tipo de cobrança
3. WHEN o sistema exibir requerimentos THEN o sistema SHALL mostrar totais de horas por categoria
4. WHEN o usuário visualizar a tela THEN o sistema SHALL exibir botão "Disparar Faturamento"

### Requirement 6

**User Story:** Como administrador, eu quero disparar o faturamento dos requerimentos aprovados, para que eu possa enviar relatório detalhado por email aos responsáveis.

#### Acceptance Criteria

1. WHEN o usuário clicar em "Disparar Faturamento" THEN o sistema SHALL solicitar emails dos destinatários
2. WHEN o usuário confirmar envio THEN o sistema SHALL gerar relatório separado por tipo de cobrança
3. WHEN o sistema gerar relatório THEN o sistema SHALL incluir: Banco de Horas, Cobro Interno, Faturado, Hora Extra, Sobreaviso, Bolsão Enel
4. WHEN o sistema enviar email THEN o sistema SHALL incluir todos os requerimentos do período
5. WHEN o sistema enviar email THEN o sistema SHALL incluir totais de horas por categoria
6. WHEN o email for enviado THEN o sistema SHALL registrar log da operação

### Requirement 7

**User Story:** Como sistema, eu preciso armazenar todas as informações dos requerimentos no banco de dados, para que os dados sejam persistidos e consultados adequadamente.

#### Acceptance Criteria

1. WHEN o sistema for implementado THEN o sistema SHALL criar tabela "requerimentos" no banco de dados
2. WHEN a tabela for criada THEN o sistema SHALL incluir todos os campos necessários com tipos adequados
3. WHEN a tabela for criada THEN o sistema SHALL incluir relacionamento com empresas_clientes
4. WHEN a tabela for criada THEN o sistema SHALL incluir campos de controle (created_at, updated_at, status)
5. WHEN a tabela for criada THEN o sistema SHALL incluir índices para otimização de consultas

### Requirement 8

**User Story:** Como administrador, eu quero que o sistema aplique cores específicas para cada tipo de cobrança, para que eu possa identificar visualmente os diferentes tipos de requerimentos.

#### Acceptance Criteria

1. WHEN o tipo de cobrança for "Banco de Horas" THEN o sistema SHALL aplicar cor azul ao card
2. WHEN o tipo de cobrança for "Cobro Interno" THEN o sistema SHALL aplicar cor verde ao card
3. WHEN o tipo de cobrança for "Contrato" THEN o sistema SHALL aplicar cor cinza ao card
4. WHEN o tipo de cobrança for "Faturado" THEN o sistema SHALL aplicar cor laranja ao card
5. WHEN o tipo de cobrança for "Hora Extra" THEN o sistema SHALL aplicar cor vermelha ao card
6. WHEN o tipo de cobrança for "Sobreaviso" THEN o sistema SHALL aplicar cor roxa ao card
7. WHEN o tipo de cobrança for "Reprovado" THEN o sistema SHALL aplicar cor preta ao card
8. WHEN o tipo de cobrança for "Bolsão Enel" THEN o sistema SHALL aplicar cor amarela ao card

### Requirement 9

**User Story:** Como administrador, eu quero que o sistema valide todos os campos obrigatórios, para que não sejam salvos requerimentos com informações incompletas.

#### Acceptance Criteria

1. WHEN o usuário tentar salvar sem preencher chamado THEN o sistema SHALL exibir mensagem de erro
2. WHEN o usuário tentar salvar sem selecionar cliente THEN o sistema SHALL exibir mensagem de erro
3. WHEN o usuário tentar salvar sem selecionar módulo THEN o sistema SHALL exibir mensagem de erro
4. WHEN o usuário tentar salvar sem preencher descrição THEN o sistema SHALL exibir mensagem de erro
5. WHEN o usuário tentar salvar sem preencher datas THEN o sistema SHALL exibir mensagem de erro
6. WHEN o usuário tentar salvar sem preencher horas THEN o sistema SHALL exibir mensagem de erro
7. WHEN o usuário tentar salvar sem selecionar linguagem THEN o sistema SHALL exibir mensagem de erro
8. WHEN o usuário tentar salvar sem selecionar cobrança THEN o sistema SHALL exibir mensagem de erro
9. WHEN o usuário tentar salvar sem selecionar mês de cobrança THEN o sistema SHALL exibir mensagem de erro

### Requirement 10

**User Story:** Como administrador, eu quero que o sistema integre com o sistema de permissões existente, para que apenas usuários autorizados possam acessar as funcionalidades de requerimentos.

#### Acceptance Criteria

1. WHEN o sistema for implementado THEN o sistema SHALL registrar telas no sistema de permissões
2. WHEN o sistema registrar telas THEN o sistema SHALL criar permissão para "Lançar Requerimentos"
3. WHEN o sistema registrar telas THEN o sistema SHALL criar permissão para "Enviar Requerimentos"
4. WHEN o sistema configurar permissões THEN o sistema SHALL atribuir permissões ao grupo administrador
5. WHEN usuário sem permissão tentar acessar THEN o sistema SHALL exibir mensagem de acesso negado