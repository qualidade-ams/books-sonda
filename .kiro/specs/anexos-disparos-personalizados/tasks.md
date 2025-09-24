# Plano de Implementação - Sistema de Anexos para Disparos Personalizados

- [x] 1. Configurar infraestrutura de armazenamento





  - Criar bucket no Supabase Storage para anexos temporários e permanentes
  - Configurar políticas RLS para controle de acesso aos arquivos
  - Implementar estrutura de pastas organizadas por empresa e data
  - _Requisitos: 2.1, 2.2, 5.1_

- [x] 2. Criar modelo de dados para anexos





  - [x] 2.1 Criar tabela anexos_temporarios no banco de dados


    - Implementar schema com campos para metadados, URLs e controle de status
    - Adicionar índices para otimização de consultas por empresa e data
    - Configurar triggers para limpeza automática de registros expirados
    - _Requisitos: 2.1, 2.2, 8.1_



  - [x] 2.2 Estender tabela historico_disparos para suportar anexos





    - Adicionar campos anexo_id e anexo_processado
    - Criar relacionamento com tabela anexos_temporarios
    - Implementar migração para dados existentes
    - _Requisitos: 2.3, 8.3_

- [x] 3. Implementar serviço de gerenciamento de anexos





  - [x] 3.1 Criar AnexoService com operações básicas


    - Implementar upload de múltiplos arquivos com validação
    - Criar métodos para remoção e consulta de anexos
    - Implementar validação de limite total de 25MB por empresa
    - _Requisitos: 1.3, 1.4, 5.1, 5.4_

  - [x] 3.2 Implementar sistema de tokens de acesso


    - Gerar tokens JWT únicos para cada arquivo
    - Configurar expiração de 24 horas para URLs temporárias
    - Implementar validação de tokens no download
    - _Requisitos: 5.2, 5.3_

  - [x] 3.3 Criar job de limpeza automática


    - Implementar rotina para remover arquivos expirados
    - Configurar execução diária via cron job
    - Adicionar logs de auditoria para limpezas realizadas
    - _Requisitos: 2.5, 8.5_

- [x] 4. Desenvolver componente de interface para upload





  - [x] 4.1 Criar componente AnexoUpload


    - Implementar interface drag-and-drop para múltiplos arquivos
    - Adicionar validação em tempo real de tipos e tamanhos
    - Criar indicador visual de progresso por arquivo
    - _Requisitos: 1.1, 1.2, 1.3, 6.1_

  - [x] 4.2 Implementar lista de arquivos selecionados


    - Exibir preview com nome, tamanho e tipo de cada arquivo
    - Adicionar botões para remoção individual de arquivos
    - Mostrar contador de tamanho total e limite restante
    - _Requisitos: 1.5, 1.7, 6.2, 6.3_

  - [x] 4.3 Integrar validações de segurança


    - Verificar assinatura de arquivos (magic numbers)
    - Implementar whitelist de tipos MIME permitidos
    - Adicionar feedback visual para arquivos inválidos
    - _Requisitos: 5.1, 5.4_

- [x] 5. Criar hook personalizado para gerenciamento de anexos





  - Implementar useAnexos com estado reativo para múltiplos arquivos
  - Adicionar controle de progresso de upload por arquivo
  - Integrar validações de limite total e individual
  - _Requisitos: 1.6, 4.1, 4.2_

- [x] 6. Integrar anexos na tela de disparos personalizados




  - [x] 6.1 Modificar ControleDisparosPersonalizados para suportar anexos


    - Adicionar botão "Anexar Arquivos" apenas para empresas com anexo=true
    - Integrar componente AnexoUpload no card de cada empresa
    - Implementar indicador visual de anexos selecionados
    - _Requisitos: 1.1, 6.1, 6.6_

  - [x] 6.2 Atualizar lógica de controle de estado


    - Modificar contadores inteligentes para considerar anexos
    - Desabilitar ações durante upload de arquivos
    - Adicionar validação antes do disparo para empresas com anexos
    - _Requisitos: 4.1, 4.5, 6.5_

- [x] 7. Estender serviço de disparo para processar anexos




  - [x] 7.1 Modificar BooksDisparoService para incluir anexos


    - Buscar anexos da empresa antes do disparo
    - Gerar tokens de acesso para cada arquivo
    - Incluir dados dos anexos no payload do webhook
    - _Requisitos: 3.1, 3.2, 3.3_

  - [x] 7.2 Implementar controle de estado dos anexos


    - Atualizar status dos anexos durante o processo de disparo
    - Registrar no histórico informações sobre anexos processados
    - Mover arquivos para storage permanente após confirmação
    - _Requisitos: 4.1, 4.2, 4.3, 8.3_

- [x] 8. Implementar sistema de auditoria e logs





  - Registrar todas as operações de upload, remoção e processamento
  - Criar logs detalhados para troubleshooting de falhas
  - Implementar métricas de uso de storage e performance
  - _Requisitos: 8.1, 8.2, 8.5, 8.6_

- [x] 9. Criar testes unitários para componentes de anexo





  - [x] 9.1 Testar AnexoService


    - Validar upload de múltiplos arquivos
    - Testar validações de limite e tipo de arquivo
    - Verificar geração e validação de tokens
    - _Requisitos: 1.3, 1.4, 5.1, 5.2_

  - [x] 9.2 Testar componente AnexoUpload


    - Simular drag-and-drop de múltiplos arquivos
    - Validar feedback visual e indicadores de progresso
    - Testar remoção individual de arquivos
    - _Requisitos: 1.1, 1.2, 6.1, 6.2_

  - [x] 9.3 Testar integração com webhook


    - Validar estrutura do payload com múltiplos anexos
    - Testar geração de tokens e URLs temporárias
    - Verificar tratamento de erros de processamento
    - _Requisitos: 3.1, 3.2, 3.4_

- [x] 10. Implementar testes de integração








  - [x] 10.1 Testar fluxo completo de upload e disparo




    - Simular seleção de múltiplos arquivos para empresa
    - Executar disparo personalizado com anexos
    - Verificar processamento e movimentação para storage permanente
    - _Requisitos: 1.1, 2.4, 4.3_

  - [x] 10.2 Testar cenários de falha e recuperação



    - Simular falhas de upload e timeout de processamento
    - Verificar limpeza automática de arquivos expirados
    - Testar comportamento com arquivos corrompidos
    - _Requisitos: 2.6, 4.4, 5.4_

- [x] 11. Criar documentação para configuração do Power Automate





  - Documentar estrutura do payload estendido com múltiplos anexos
  - Criar guia de configuração para download de arquivos
  - Especificar tratamento de erros e confirmações de processamento
  - _Requisitos: 7.1, 7.2, 7.4, 7.5_

- [x] 12. Implementar monitoramento e métricas





  - Configurar alertas para falhas de upload e processamento
  - Implementar dashboard de uso de storage por empresa
  - Criar relatórios de performance e taxa de sucesso
  - _Requisitos: 8.4, 8.5, 8.6_

- [x] 13. Realizar testes end-to-end





  - [x] 13.1 Testar fluxo completo com usuário final


    - Navegar para tela de disparos personalizados
    - Selecionar empresa com anexo=true e adicionar múltiplos arquivos
    - Executar disparo e verificar processamento no Power Automate
    - _Requisitos: 1.1, 1.8, 3.5_

  - [x] 13.2 Testar limites e validações


    - Tentar upload de arquivos que excedem 25MB total
    - Verificar comportamento com tipos de arquivo não permitidos
    - Testar upload de mais de 10 arquivos por empresa
    - _Requisitos: 1.3, 1.4, 5.1, 5.4_

- [x] 14. Otimizar performance e finalizar implementação





  - Implementar compressão automática para arquivos grandes
  - Configurar cache local para metadados de anexos
  - Realizar ajustes finais baseados nos testes E2E
  - _Requisitos: 2.4, 4.6_