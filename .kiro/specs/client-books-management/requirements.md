# Documento de Requisitos - Sistema de Gerenciamento de Clientes e Books

## Introdução

Este documento especifica os requisitos para o desenvolvimento de um sistema centralizado para armazenar empresas clientes e seus colaboradores, permitindo o disparo automático de e-mails mensais (books), com histórico e controle de status dos envios. O sistema será integrado à aplicação Books SND existente, aproveitando a infraestrutura de templates de e-mail já implementada.

## Requisitos

### Requisito 1 - Cadastro de Empresas Clientes

**História do Usuário:** Como administrador do sistema, quero cadastrar e gerenciar empresas clientes, para que eu possa organizar os destinatários dos books mensais e controlar seus status de atividade.

#### Critérios de Aceitação

1. QUANDO o usuário acessar a tela de cadastro de empresas ENTÃO o sistema DEVE permitir inserir nome completo da empresa
2. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir inserir nome abreviado para uso no assunto dos e-mails
3. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir inserir link da pasta do cliente no SharePoint
4. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir selecionar template padrão de e-mail (português ou inglês)
5. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir definir status (Ativo/Inativo/Suspenso) com registro automático de data
6. QUANDO o usuário alterar status para Inativo ou Suspenso ENTÃO o sistema DEVE exigir descrição justificativa
7. QUANDO o usuário visualizar lista de empresas ENTÃO o sistema DEVE mostrar apenas clientes ativos por padrão
8. QUANDO o usuário solicitar ENTÃO o sistema DEVE permitir visualizar empresas inativas e suspensas com suas respectivas datas
9. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir selecionar múltiplos produtos contratados (CE PLUS, FISCAL, GALLERY)
10. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir relacionar grupos para envio de e-mails em CC
11. QUANDO o usuário cadastrar uma empresa ENTÃO o sistema DEVE permitir adicionar e-mail do gestor de contas
12. QUANDO o usuário selecionar múltiplas empresas ENTÃO o sistema DEVE permitir alteração em lote de e-mails
13. QUANDO o usuário solicitar ENTÃO o sistema DEVE permitir importação de dados via Excel com template disponível para download

### Requisito 2 - Cadastro de Colaboradores

**História do Usuário:** Como administrador do sistema, quero cadastrar e gerenciar colaboradores das empresas clientes, para que eu possa definir os destinatários específicos dos books mensais.

#### Critérios de Aceitação

1. QUANDO o usuário acessar a tela de cadastro de colaboradores ENTÃO o sistema DEVE permitir inserir nome completo
2. QUANDO o usuário cadastrar um colaborador ENTÃO o sistema DEVE permitir inserir e-mail válido
3. QUANDO o usuário cadastrar um colaborador ENTÃO o sistema DEVE permitir inserir função do colaborador
4. QUANDO o usuário cadastrar um colaborador ENTÃO o sistema DEVE permitir vincular à empresa previamente cadastrada
5. QUANDO o usuário cadastrar um colaborador ENTÃO o sistema DEVE permitir definir status (Ativo/Inativo) com registro automático de data
6. QUANDO o usuário alterar status para Inativo ENTÃO o sistema DEVE exigir descrição justificativa
7. QUANDO o usuário cadastrar um colaborador ENTÃO o sistema DEVE permitir marcar como principal contato (opcional)
8. QUANDO o usuário visualizar colaboradores ENTÃO o sistema DEVE mostrar apenas colaboradores ativos por padrão

### Requisito 3 - Cadastro de Grupos de Responsáveis

**História do Usuário:** Como administrador do sistema, quero cadastrar grupos de responsáveis com múltiplos e-mails, para que eu possa definir quais pessoas receberão cópia dos books enviados aos clientes.

#### Critérios de Aceitação

1. QUANDO o usuário acessar a tela de grupos ENTÃO o sistema DEVE permitir criar grupo "CE Plus"
2. QUANDO o usuário acessar a tela de grupos ENTÃO o sistema DEVE permitir criar grupo "Fiscal"
3. QUANDO o usuário acessar a tela de grupos ENTÃO o sistema DEVE permitir criar grupo "Gallery"
4. QUANDO o usuário acessar a tela de grupos ENTÃO o sistema DEVE permitir criar grupo "Todos" (Andreia, Aline, Angela e Qualidade)
5. QUANDO o usuário cadastrar um grupo ENTÃO o sistema DEVE permitir adicionar múltiplos e-mails ao grupo
6. QUANDO o usuário relacionar grupo com cliente ENTÃO o sistema DEVE incluir automaticamente os e-mails do grupo como CC nos envios

### Requisito 4 - Controle de Disparo de E-mails

**História do Usuário:** Como administrador do sistema, quero controlar o disparo mensal de books, para que eu possa acompanhar quais clientes já receberam os e-mails e quais estão pendentes.

#### Critérios de Aceitação

1. QUANDO o usuário acessar a tela de controle mensal ENTÃO o sistema DEVE mostrar status de disparo por cliente (enviado/pendente/falhou)
2. QUANDO o sistema executar disparo automático ENTÃO o sistema DEVE enviar books mensais para clientes ativos
3. QUANDO o usuário solicitar ENTÃO o sistema DEVE permitir agendamento de disparo para data específica
4. QUANDO o sistema disparar e-mail ENTÃO o sistema DEVE registrar no histórico com data, empresa e colaborador
5. QUANDO o disparo falhar ENTÃO o sistema DEVE registrar status "falhou" com detalhes do erro
6. QUANDO o usuário visualizar controle ENTÃO o sistema DEVE indicar claramente status: enviado, falhou, não disparado

### Requisito 5 - Histórico e Relatórios

**História do Usuário:** Como administrador do sistema, quero consultar histórico detalhado dos disparos, para que eu possa acompanhar a efetividade dos envios e identificar problemas.

#### Critérios de Aceitação

1. QUANDO o usuário acessar relatórios ENTÃO o sistema DEVE registrar todos os e-mails disparados
2. QUANDO o usuário consultar histórico ENTÃO o sistema DEVE permitir filtro por mês
3. QUANDO o usuário consultar histórico ENTÃO o sistema DEVE permitir filtro por cliente
4. QUANDO o usuário consultar histórico ENTÃO o sistema DEVE permitir filtro por colaborador
5. QUANDO o usuário consultar histórico ENTÃO o sistema DEVE permitir filtro por status
6. QUANDO o usuário gerar relatório ENTÃO o sistema DEVE identificar clientes que não receberam books em determinado mês
7. QUANDO o usuário visualizar histórico ENTÃO o sistema DEVE mostrar dados completos: data, destinatário, status, template usado

### Requisito 6 - Integração com Sistema de Templates

**História do Usuário:** Como administrador do sistema, quero que os campos cadastrados sejam disponibilizados como variáveis nos templates de e-mail, para que eu possa personalizar o conteúdo dos books.

#### Critérios de Aceitação

1. QUANDO o usuário cadastrar campo em empresa ENTÃO o sistema DEVE criar variável correspondente para templates
2. QUANDO o usuário cadastrar campo em colaborador ENTÃO o sistema DEVE criar variável correspondente para templates
3. QUANDO o usuário editar template ENTÃO o sistema DEVE disponibilizar todas as variáveis de empresa e colaborador
4. QUANDO o sistema enviar e-mail ENTÃO o sistema DEVE substituir variáveis pelos dados reais do cliente/colaborador

### Requisito 7 - Controle de Permissões

**História do Usuário:** Como administrador do sistema, quero que as novas telas sejam integradas ao sistema de permissões existente, para que eu possa controlar o acesso às funcionalidades.

#### Critérios de Aceitação

1. QUANDO as telas forem criadas ENTÃO o sistema DEVE registrar as telas no banco de dados de permissões
2. QUANDO as telas forem criadas ENTÃO o sistema DEVE permitir configuração de permissões por grupo de usuários
3. QUANDO usuário acessar tela ENTÃO o sistema DEVE verificar permissões antes de permitir acesso
4. QUANDO usuário não tiver permissão ENTÃO o sistema DEVE exibir mensagem de acesso negado