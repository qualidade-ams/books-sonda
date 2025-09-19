# Sistema de Vigência Automática

## Visão Geral

O sistema de vigência automática foi implementado para gerenciar automaticamente o status das empresas clientes baseado na data de vigência final dos contratos. Quando uma empresa atinge a data de vencimento do contrato, ela é automaticamente inativada pelo sistema.

## Funcionalidades Implementadas

### 1. Migração de Banco de Dados

**Arquivo:** `supabase/migration/empresa_campos_adicionais_migration.sql`

- ✅ Adicionados campos `vigencia_inicial` e `vigencia_final` na tabela `empresas_clientes`
- ✅ Criada função `inativar_empresas_vencidas()` para inativação automática
- ✅ Implementado trigger de validação de vigências
- ✅ Criada tabela `logs_sistema` para auditoria
- ✅ Adicionados índices otimizados para performance

### 2. Serviços Backend

**Arquivo:** `src/services/vigenciaService.ts`

- ✅ Execução de inativação automática
- ✅ Consulta de status de vigências
- ✅ Estatísticas de vigência
- ✅ Validação de datas
- ✅ Cálculo de dias restantes
- ✅ Logs de operações

**Arquivo:** `src/services/jobSchedulerService.ts`

- ✅ Agendamento automático de verificações
- ✅ Execução periódica (a cada 6 horas)
- ✅ Controle manual de jobs
- ✅ Monitoramento de execuções
- ✅ Tratamento de erros

### 3. Hooks React

**Arquivo:** `src/hooks/useVigenciaMonitor.ts`

- ✅ Monitoramento em tempo real
- ✅ Notificações automáticas
- ✅ Controle de execução manual
- ✅ Estatísticas reativas
- ✅ Validação de formulários

**Arquivo:** `src/hooks/useJobScheduler.ts`

- ✅ Gerenciamento de jobs
- ✅ Controle do scheduler
- ✅ Estatísticas de execução
- ✅ Interface reativa

### 4. Componentes de Interface

**Arquivo:** `src/components/admin/VigenciaMonitor.tsx`

- ✅ Dashboard de vigências
- ✅ Lista de empresas por status
- ✅ Controles de execução manual
- ✅ Logs do sistema
- ✅ Alertas visuais

**Arquivo:** `src/components/admin/JobSchedulerManager.tsx`

- ✅ Controle do scheduler
- ✅ Gerenciamento de jobs individuais
- ✅ Estatísticas de performance
- ✅ Interface administrativa

### 5. Formulários Aprimorados

**Arquivo:** `src/components/admin/client-books/EmpresaForm.tsx`

- ✅ Campos de vigência inicial e final
- ✅ Validação automática de datas
- ✅ Alertas visuais para vigências vencidas
- ✅ Feedback em tempo real

### 6. Páginas Administrativas

**Arquivo:** `src/pages/admin/Dashboard.tsx`

- ✅ Cards de resumo de vigências
- ✅ Alertas para vigências críticas
- ✅ Status do job scheduler

**Arquivo:** `src/pages/admin/MonitoramentoVigencias.tsx`

- ✅ Interface completa de monitoramento
- ✅ Abas organizadas (Vigências, Jobs, Configurações)
- ✅ Documentação técnica integrada

### 7. Navegação e Rotas

- ✅ Rota `/admin/monitoramento-vigencias` adicionada
- ✅ Link na sidebar (seção Administração)
- ✅ Proteção por permissões

### 8. Testes

**Arquivo:** `src/test/integration/vigenciaAutomatica.test.ts`

- ✅ Testes de validação de vigências
- ✅ Testes do job scheduler
- ✅ Testes de performance
- ✅ Testes de integração completa

## Como Funciona

### Fluxo Automático

1. **Agendamento**: O job scheduler executa a verificação a cada 6 horas
2. **Verificação**: A função `inativar_empresas_vencidas()` é executada
3. **Inativação**: Empresas com `vigencia_final < CURRENT_DATE` e `status = 'ativo'` são inativadas
4. **Log**: Operação é registrada na tabela `logs_sistema`
5. **Notificação**: Administradores são notificados via interface

### Fluxo Manual

1. **Interface**: Administrador acessa "Monitoramento de Vigências"
2. **Execução**: Clica em "Verificar Agora"
3. **Resultado**: Sistema exibe quantas empresas foram inativadas
4. **Logs**: Operação é registrada e exibida nos logs

### Validações

- **Formulário**: Vigência inicial não pode ser posterior à final
- **Alertas**: Avisos visuais para vigências vencidas ou próximas do vencimento
- **Banco**: Trigger valida datas antes de salvar

## Configurações

### Job Scheduler

- **Intervalo padrão**: 6 horas (21.600.000 ms)
- **Auto-start**: Ativado em produção
- **Controle manual**: Disponível via interface administrativa

### Alertas

- **Vigência vencida**: Alerta vermelho (crítico)
- **Vence em 30 dias**: Alerta amarelo (atenção)
- **Mais de 30 dias**: Status normal (verde)

### Logs

- **Retenção**: Configurável (padrão: sem limite)
- **Tipos**: `inativacao_automatica_vigencia`, `erro_inativacao_vigencia`, `vigencia_passado_definida`

## Monitoramento

### Dashboard Principal

- Cards com estatísticas gerais
- Alertas para situações críticas
- Status do job scheduler

### Página Dedicada

- **Aba Vigências**: Lista completa com status
- **Aba Jobs**: Controle do scheduler
- **Aba Configurações**: Documentação e configurações

### Notificações

- Toast notifications para ações manuais
- Alertas visuais para vigências críticas
- Feedback em tempo real

## Segurança e Performance

### Segurança

- ✅ Validação de permissões para todas as telas
- ✅ Logs de auditoria para todas as operações
- ✅ Validação de dados no frontend e backend

### Performance

- ✅ Índices otimizados no banco de dados
- ✅ Queries eficientes com filtros apropriados
- ✅ Cache de dados com React Query
- ✅ Execução assíncrona de jobs

### Confiabilidade

- ✅ Tratamento de erros em todos os níveis
- ✅ Fallbacks para falhas de execução
- ✅ Logs detalhados para debugging
- ✅ Testes automatizados

## Próximos Passos

### Melhorias Futuras

1. **Notificações por Email**: Enviar emails para administradores quando empresas são inativadas
2. **Relatórios**: Gerar relatórios mensais de vigências
3. **API Externa**: Integração com sistemas externos para sincronização
4. **Backup Automático**: Backup dos dados antes de inativações em massa

### Configurações Avançadas

1. **Intervalos Personalizados**: Permitir configurar intervalos diferentes por tipo de empresa
2. **Regras Customizadas**: Implementar regras de negócio mais complexas
3. **Aprovação Manual**: Opção para requerer aprovação antes de inativar
4. **Reativação Automática**: Reativar empresas quando vigência for renovada

## Comandos Úteis

### Desenvolvimento

```bash
# Executar testes
npm run test

# Executar testes específicos de vigência
npm run test vigenciaAutomatica

# Iniciar aplicação em desenvolvimento
npm run dev
```

### Banco de Dados

```sql
-- Executar inativação manual
SELECT inativar_empresas_vencidas();

-- Consultar logs
SELECT * FROM logs_sistema 
WHERE operacao LIKE '%vigencia%' 
ORDER BY data_operacao DESC;

-- Verificar empresas com vigência vencida
SELECT nome_completo, vigencia_final, status 
FROM empresas_clientes 
WHERE vigencia_final < CURRENT_DATE 
AND status = 'ativo';
```

## Suporte

Para dúvidas ou problemas relacionados ao sistema de vigência automática:

1. Verificar logs do sistema na interface administrativa
2. Consultar documentação técnica na aba "Configurações"
3. Executar testes para validar funcionamento
4. Verificar status do job scheduler no dashboard

---

**Implementado em**: Setembro 2025  
**Versão**: 1.0.0  
**Status**: ✅ Funcional e testado