# Enviar Dashboards por Email

## Visão Geral

A funcionalidade "Enviar Dashboards" permite aos administradores enviar relatórios de dashboard por email de forma simples e eficiente. Esta tela foi desenvolvida seguindo o mesmo padrão da funcionalidade "Enviar Elogios".

## Localização

**Menu:** Administração > Enviar Dashboards  
**Rota:** `/admin/enviar-dashboards`  
**Permissão:** Requer permissão de edição na tela "dashboard"

## Funcionalidades Principais

### 1. Seleção de Período
- **Navegação por mês/ano:** Botões "Anterior" e "Próximo" para navegar entre períodos
- **Período atual:** Inicia automaticamente no mês/ano atual
- **Indicador visual:** Cards informativos mostram o período selecionado

### 2. Interface de Envio
- **Botão principal:** "Enviar Dashboard" no cabeçalho da página
- **Acesso protegido:** Apenas usuários com permissão adequada podem acessar

### 3. Modal de Configuração de Email

#### Destinatários
- **Campo principal:** Textarea para inserir emails separados por ponto e vírgula (;)
- **Suporte a colar:** Detecta automaticamente emails ao colar texto
- **Validação:** Verifica formato dos emails em tempo real
- **Contador:** Mostra quantos emails foram adicionados

#### Destinatários em Cópia (CC)
- **Campo opcional:** Mesmo formato dos destinatários principais
- **Funcionalidade idêntica:** Suporte a colar e validação automática

#### Assunto do Email
- **Geração automática:** Formato padrão: `[DASHBOARD] - Relatório Mensal (Mês Ano)`
- **Editável:** Usuário pode personalizar o assunto conforme necessário

#### Anexos
- **Suporte a múltiplos arquivos:** Botão "Adicionar Arquivos"
- **Limite de tamanho:** 25MB total para todos os anexos
- **Tipos aceitos:** .pdf, .doc, .docx, .xls, .xlsx, .txt, .jpg, .jpeg, .png
- **Visualização:** Lista detalhada dos arquivos com tamanho e opção de remoção
- **Indicador de progresso:** Mostra tamanho total usado

### 4. Template de Dashboard

#### Estrutura do Email
- **Header responsivo:** Design profissional com gradiente azul Sonda
- **Informações do período:** Destaque para mês/ano selecionado
- **Área de conteúdo:** Placeholder para futura integração com dados reais
- **Footer corporativo:** Informações da Sonda e data de geração

#### Design Responsivo
- **Mobile-first:** Otimizado para visualização em dispositivos móveis
- **Breakpoints:** Ajustes automáticos para diferentes tamanhos de tela
- **Tipografia:** Fonte Segoe UI para melhor legibilidade

### 5. Preview do Dashboard
- **Visualização em tempo real:** Preview do template que será enviado
- **Informações contextuais:** Mostra período selecionado
- **Design consistente:** Segue padrões visuais do sistema

### 6. Validações e Segurança
- **Validação de emails:** Regex para verificar formato válido
- **Campos obrigatórios:** Destinatários e assunto são obrigatórios
- **Feedback visual:** Mensagens de erro claras e específicas
- **Confirmação:** Modal de confirmação antes do envio

### 7. Processo de Envio
- **Loading state:** Indicador visual durante o envio
- **Conversão de anexos:** Automática para base64
- **Integração com emailService:** Usa o serviço padrão do sistema
- **Feedback de resultado:** Toast de sucesso ou erro

## Fluxo de Uso

1. **Acesso:** Usuário navega para Administração > Enviar Dashboards
2. **Seleção de período:** Ajusta mês/ano usando navegação
3. **Iniciar envio:** Clica em "Enviar Dashboard"
4. **Configurar destinatários:** Adiciona emails principais e CC
5. **Personalizar assunto:** Edita se necessário
6. **Adicionar anexos:** Opcional - adiciona arquivos relevantes
7. **Preview:** Visualiza como ficará o email
8. **Confirmar:** Confirma o envio no modal de confirmação
9. **Aguardar:** Processo de envio com feedback visual
10. **Resultado:** Recebe confirmação de sucesso ou erro

## Características Técnicas

### Componentes Utilizados
- **AdminLayout:** Layout padrão administrativo
- **ProtectedAction:** Controle de acesso baseado em permissões
- **Cards informativos:** Seguem design system Sonda
- **Modal responsivo:** Dialog com scroll automático
- **Toast notifications:** Feedback não-intrusivo

### Integração com Serviços
- **emailService:** Envio de emails via API
- **useToast:** Sistema de notificações
- **Validação de arquivos:** Limite de tamanho e tipos

### Padrões de Design
- **Cores Sonda:** Paleta oficial da empresa
- **Tipografia:** Hierarquia consistente
- **Espaçamento:** Grid system responsivo
- **Iconografia:** Lucide React icons

## Futuras Melhorias

### Integração com Dados Reais
- **Conexão com dashboard:** Integrar com dados reais do sistema
- **Gráficos dinâmicos:** Geração automática de charts
- **Métricas personalizadas:** Seleção de indicadores específicos

### Templates Avançados
- **Templates múltiplos:** Diferentes layouts para diferentes tipos de relatório
- **Personalização:** Editor de templates para administradores
- **Variáveis dinâmicas:** Sistema de substituição de variáveis

### Automação
- **Agendamento:** Envio automático em datas específicas
- **Listas de distribuição:** Grupos pré-definidos de destinatários
- **Histórico:** Registro de envios anteriores

## Troubleshooting

### Problemas Comuns

**Email não enviado:**
- Verificar se todos os campos obrigatórios estão preenchidos
- Validar formato dos emails
- Verificar se anexos não excedem 25MB

**Anexos não carregando:**
- Verificar tipos de arquivo aceitos
- Confirmar limite de tamanho total
- Tentar com arquivos menores

**Preview não aparecendo:**
- Verificar se período está selecionado corretamente
- Recarregar a página se necessário

### Logs e Debug
- Console do navegador mostra logs detalhados
- Erros de validação aparecem como toasts
- Status de envio é reportado em tempo real

## Permissões Necessárias

- **Tela:** dashboard
- **Nível:** edit (edição)
- **Grupo:** Administradores ou grupos com permissão específica

## Compatibilidade

- **Navegadores:** Chrome, Firefox, Safari, Edge (versões recentes)
- **Dispositivos:** Desktop, tablet, mobile
- **Clientes de email:** Outlook, Gmail, Apple Mail, Thunderbird

---

Esta funcionalidade foi desenvolvida seguindo os padrões estabelecidos no sistema Books SND, garantindo consistência visual e funcional com o restante da aplicação.