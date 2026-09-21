# 🏗️ Books SND - Ambiente Multi-Agente

## Estrutura do Ambiente Kiro

```
.kiro/
├── README.md                     # Este arquivo (visão geral)
│
├── steering/                     # 📋 Diretrizes globais (sempre carregadas)
│   ├── product.md               # Visão do produto e regras de negócio
│   ├── architecture.md          # Arquitetura do sistema e camadas
│   ├── coding-standards.md      # Padrões TypeScript, React, imports
│   ├── design-system.md         # UI/UX, cores Sonda, componentes
│   ├── security-validation.md   # Segurança, RLS, validações de migration
│   ├── devops.md                # Deploy, infra, CI/CD, variáveis de ambiente
│   ├── tech.md                  # Stack tecnológico e comandos
│   ├── structure.md             # Estrutura de diretórios e convenções
│   ├── domains.md               # Mapa de domínios (manual, sob demanda)
│   ├── cache-registry.md        # Registro de cache (existente)
│   └── estrutura.md             # Documentação detalhada de componentes
│
├── skills/                       # 🤖 Agentes Especialistas
│   ├── cto-agent.md             # Coordenador principal - decisões arquiteturais
│   ├── frontend-engineer.md     # React, UI, design system, componentes
│   ├── backend-engineer.md      # Supabase, services, Edge Functions
│   ├── database-engineer.md     # PostgreSQL, migrations, RLS, performance
│   ├── security-engineer.md     # Auth, RBAC, vulnerabilidades, auditoria
│   ├── auth-engineer.md         # Autenticação, sessão, permissões
│   ├── qa-engineer.md           # Testes, validação, code review
│   ├── ui-ux-engineer.md        # Design, acessibilidade, responsividade
│   └── integrations-engineer.md # APIs externas, email, PDF, Excel, sync
│
├── workflows/                    # 🔄 Fluxos de trabalho padronizados
│   ├── criar-feature.md         # Fluxo completo para nova funcionalidade
│   ├── criar-tela.md            # Criar nova tela administrativa
│   ├── criar-migration.md       # Criar e aplicar migration segura
│   ├── criar-api.md             # Criar serverless/edge function
│   ├── corrigir-bug.md          # Diagnóstico e correção de bugs
│   ├── code-review.md           # Checklist de revisão de código
│   ├── deploy.md                # Processo de deploy (frontend + DB)
│   ├── testes.md                # Criação e execução de testes
│   └── autenticacao.md          # Gerenciar permissões e auth
│
└── specs/                        # 📐 Especificações de features (existente)
    ├── anexos-disparos-personalizados/
    ├── api-error-handling-dom-fixes/
    ├── client-books-management/
    ├── gestao-contratos-banco-horas/
    └── sistema-requerimentos/
```

## Como Usar

### Steering (Automático)
Os arquivos de steering são carregados automaticamente e guiam todas as interações. O `domains.md` tem `inclusion: manual` e pode ser referenciado com `#domains.md` quando necessário.

### Skills (Sob Demanda)
Referencie um skill quando precisar de expertise específica:
- "Preciso criar uma migration" → consultar `database-engineer.md`
- "Quero criar uma nova tela" → consultar `frontend-engineer.md`
- "Tenho um problema de segurança" → consultar `security-engineer.md`

### Workflows (Passo a Passo)
Use workflows como guias para tarefas comuns:
- "Quero adicionar uma feature" → seguir `criar-feature.md`
- "Preciso fazer deploy" → seguir `deploy.md`
- "Encontrei um bug" → seguir `corrigir-bug.md`

## Decisões Arquiteturais

| Decisão | Justificativa |
|---------|---------------|
| **Skills separados por papel** | Cada agente tem escopo claro e não mistura responsabilidades |
| **Steering global para padrões** | Garante consistência sem precisar ativar manualmente |
| **Workflows como checklists** | Previne esquecimento de etapas em processos complexos |
| **domains.md como manual** | Mapa grande, carregado apenas quando precisa navegar módulos |
| **CTO Agent como coordenador** | Ponto central para decisões que afetam múltiplos domínios |
| **Security integrado em tudo** | Segurança não é opcional — checklists em todos os workflows |

## Prioridades do Sistema

1. **Segurança**: RLS, RBAC, session management
2. **Consistência**: Design system, coding standards, padrões
3. **Escalabilidade**: Separação de domínios, camadas claras
4. **Manutenibilidade**: Documentação, workflows, skills claros
5. **Performance**: Cache, queries otimizadas, lazy loading
6. **Reutilização**: Componentes, hooks, services compartilhados
