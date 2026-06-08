# Books SND - Visão do Produto

## O que é
Books SND é uma plataforma administrativa web interna da **Sonda** para gestão operacional de serviços de TI. Centraliza controle de books mensais, banco de horas, elogios de clientes, pesquisas de satisfação, requerimentos, faturamento e organograma.

## Módulos do Sistema

| Módulo | Descrição | Criticidade |
|--------|-----------|-------------|
| **Books** | Geração e envio de relatórios mensais para clientes | Alta |
| **Banco de Horas** | Controle de alocações, excedentes, reajustes e repasses | Alta |
| **Elogios** | Registro e envio de elogios recebidos de clientes | Média |
| **Pesquisas** | Pesquisas de satisfação (AMS) e análises | Média |
| **Requerimentos** | Lançamento e faturamento de requerimentos | Alta |
| **Plano de Ação** | Gestão de planos de ação corretiva | Média |
| **Organograma** | Visualização da estrutura organizacional | Baixa |
| **Permissões** | RBAC com grupos, telas e níveis de acesso | Alta |
| **Auditoria** | Logs de atividade e monitoramento | Média |
| **Templates** | Gerenciamento de templates de email e PDF | Média |

## Usuários-Alvo
- **Administradores de Sistema**: Acesso total, configurações, permissões
- **Gerentes de Operação**: Books, banco de horas, faturamento
- **Coordenadores**: Elogios, pesquisas, planos de ação
- **Analistas**: Visualização, lançamentos, consultas

## Regras de Negócio Chave
1. Cada empresa cliente tem um ou mais books mensais
2. Banco de horas é controlado por período e tem reajustes anuais
3. Elogios são registrados e depois compartilhados via email com template
4. Pesquisas AMS são sincronizadas com SQL Server externo
5. Requerimentos podem ser faturados após aprovação
6. Acesso é controlado por grupo → tela → nível (view/edit)
7. Todas as ações críticas são auditadas

## Integrações Externas
- **SQL Server** (via Sync API): Pesquisas, especialistas, apontamentos
- **Email** (via Supabase Edge): Envio de relatórios e notificações
- **PDF** (via Vercel Serverless): Geração de books em PDF
- **Excel**: Importação/exportação de dados

## Localização
- **Idioma principal**: Português (Brasil)
- **Termos técnicos**: Mantidos em inglês quando padrão do mercado
- **Timezone**: America/Sao_Paulo (UTC-3)
- **Moeda**: BRL (R$)
- **Formato de data**: dd/MM/yyyy