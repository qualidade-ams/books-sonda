# Documento de Requisitos - Sistema de Anexos para Disparos Personalizados

## Introdução

Este documento especifica os requisitos para implementar a funcionalidade de anexos no sistema de disparos personalizados de books. A funcionalidade permitirá que empresas com a opção "Anexo" ativa possam ter arquivos anexados aos seus books durante o disparo personalizado, integrando com o Power Automate via webhook para processamento dos anexos.

## Requisitos

### Requisito 1 - Interface de Upload de Anexos

**História do Usuário:** Como administrador do sistema, quero poder anexar arquivos aos books de empresas que possuem a opção "Anexo" ativa, para que eu possa enviar documentos específicos junto com o book personalizado.

#### Critérios de Aceitação

1. QUANDO o usuário acessar a tela de disparos personalizados ENTÃO o sistema DEVE exibir botão "Anexar Arquivo" apenas para empresas com anexo=true
2. QUANDO o usuário clicar no botão "Anexar Arquivo" ENTÃO o sistema DEVE abrir modal de upload de arquivos
3. QUANDO o usuário selecionar arquivo ENTÃO o sistema DEVE validar formato permitido (PDF, DOC, DOCX, XLS, XLSX)
4. QUANDO o usuário selecionar arquivo ENTÃO o sistema DEVE validar tamanho máximo de 10MB
5. QUANDO o arquivo for válido ENTÃO o sistema DEVE exibir preview com nome, tamanho e tipo do arquivo
6. QUANDO o usuário confirmar upload ENTÃO o sistema DEVE armazenar arquivo temporariamente
7. QUANDO arquivo for anexado ENTÃO o sistema DEVE exibir indicador visual no card da empresa
8. QUANDO o usuário quiser ENTÃO o sistema DEVE permitir remover anexo antes do disparo

### Requisito 2 - Armazenamento Temporário de Anexos

**História do Usuário:** Como sistema, quero armazenar temporariamente os anexos selecionados, para que eles possam ser enviados junto com o disparo personalizado.

#### Critérios de Aceitação

1. QUANDO arquivo for selecionado ENTÃO o sistema DEVE fazer upload para storage temporário do Supabase
2. QUANDO arquivo for armazenado ENTÃO o sistema DEVE gerar URL temporária com expiração de 24 horas
3. QUANDO arquivo for armazenado ENTÃO o sistema DEVE registrar metadados (nome, tamanho, tipo, empresa_id)
4. QUANDO disparo for executado ENTÃO o sistema DEVE incluir URL do anexo nos dados enviados ao webhook
5. QUANDO disparo for concluído ENTÃO o sistema DEVE mover arquivo para storage permanente
6. QUANDO anexo não for usado em 24h ENTÃO o sistema DEVE remover arquivo automaticamente

### Requisito 3 - Integração com Webhook do Power Automate

**História do Usuário:** Como sistema, quero enviar informações dos anexos para o Power Automate, para que o fluxo possa processar e anexar os arquivos aos e-mails.

#### Critérios de Aceitação

1. QUANDO disparo personalizado for executado com anexo ENTÃO o sistema DEVE incluir campo "anexo" no payload do webhook
2. QUANDO anexo estiver presente ENTÃO o sistema DEVE enviar URL temporária do arquivo
3. QUANDO anexo estiver presente ENTÃO o sistema DEVE enviar metadados do arquivo (nome, tipo, tamanho)
4. QUANDO webhook for chamado ENTÃO o sistema DEVE incluir token de autenticação para download do anexo
5. QUANDO Power Automate processar ENTÃO o sistema DEVE receber confirmação de recebimento do anexo
6. QUANDO confirmação for recebida ENTÃO o sistema DEVE registrar no histórico que anexo foi processado

### Requisito 4 - Controle de Estado dos Anexos

**História do Usuário:** Como administrador do sistema, quero visualizar o status dos anexos durante o processo de disparo, para que eu possa acompanhar se os arquivos foram processados corretamente.

#### Critérios de Aceitação

1. QUANDO anexo for selecionado ENTÃO o sistema DEVE marcar status como "pendente"
2. QUANDO disparo for iniciado ENTÃO o sistema DEVE marcar status como "enviando"
3. QUANDO webhook processar anexo ENTÃO o sistema DEVE marcar status como "processado"
4. QUANDO houver erro no processamento ENTÃO o sistema DEVE marcar status como "erro"
5. QUANDO usuário visualizar histórico ENTÃO o sistema DEVE mostrar status do anexo
6. QUANDO houver erro ENTÃO o sistema DEVE exibir detalhes do erro no histórico

### Requisito 5 - Validação e Segurança

**História do Usuário:** Como sistema, quero garantir que apenas arquivos seguros sejam anexados, para que não haja riscos de segurança no processamento.

#### Critérios de Aceitação

1. QUANDO arquivo for selecionado ENTÃO o sistema DEVE validar extensão contra lista permitida
2. QUANDO arquivo for selecionado ENTÃO o sistema DEVE verificar assinatura do arquivo (magic numbers)
3. QUANDO arquivo for selecionado ENTÃO o sistema DEVE escanear por malware (se disponível)
4. QUANDO arquivo for inválido ENTÃO o sistema DEVE exibir mensagem de erro específica
5. QUANDO usuário tentar anexo muito grande ENTÃO o sistema DEVE exibir erro de tamanho
6. QUANDO URL temporária expirar ENTÃO o sistema DEVE impedir download não autorizado

### Requisito 6 - Interface do Usuário

**História do Usuário:** Como administrador do sistema, quero uma interface intuitiva para gerenciar anexos, para que eu possa facilmente anexar e controlar arquivos nos disparos personalizados.

#### Critérios de Aceitação

1. QUANDO empresa tiver anexo=true ENTÃO o sistema DEVE exibir ícone de clipe no card da empresa
2. QUANDO anexo estiver selecionado ENTÃO o sistema DEVE exibir badge com nome do arquivo
3. QUANDO usuário passar mouse sobre badge ENTÃO o sistema DEVE mostrar tooltip com detalhes do arquivo
4. QUANDO usuário clicar no badge ENTÃO o sistema DEVE permitir visualizar ou remover anexo
5. QUANDO disparo estiver em andamento ENTÃO o sistema DEVE desabilitar botões de anexo
6. QUANDO houver erro ENTÃO o sistema DEVE exibir indicador visual de erro no card

### Requisito 7 - Configuração do Power Automate

**História do Usuário:** Como administrador do Power Automate, quero receber dados estruturados dos anexos, para que eu possa configurar o fluxo para processar e anexar arquivos aos e-mails.

#### Critérios de Aceitação

1. QUANDO webhook for chamado com anexo ENTÃO o payload DEVE incluir objeto "anexo" com propriedades:
   - url: URL temporária para download
   - nome: Nome original do arquivo
   - tipo: Tipo MIME do arquivo
   - tamanho: Tamanho em bytes
   - token: Token de autenticação
2. QUANDO Power Automate receber webhook ENTÃO DEVE fazer download do arquivo usando a URL e token
3. QUANDO download for concluído ENTÃO DEVE anexar arquivo ao e-mail antes do envio
4. QUANDO processamento for concluído ENTÃO DEVE enviar confirmação de volta para o sistema
5. QUANDO houver erro no Power Automate ENTÃO DEVE retornar código de erro específico
6. QUANDO token expirar ENTÃO DEVE retornar erro de autenticação

### Requisito 8 - Histórico e Auditoria

**História do Usuário:** Como administrador do sistema, quero registrar todas as ações relacionadas aos anexos, para que eu possa auditar o uso da funcionalidade e resolver problemas.

#### Critérios de Aceitação

1. QUANDO anexo for selecionado ENTÃO o sistema DEVE registrar no log de auditoria
2. QUANDO anexo for removido ENTÃO o sistema DEVE registrar no log de auditoria
3. QUANDO disparo com anexo for executado ENTÃO o sistema DEVE registrar no histórico de disparos
4. QUANDO webhook processar anexo ENTÃO o sistema DEVE registrar resposta no log
5. QUANDO houver erro ENTÃO o sistema DEVE registrar detalhes completos do erro
6. QUANDO usuário consultar histórico ENTÃO o sistema DEVE mostrar informações dos anexos processados