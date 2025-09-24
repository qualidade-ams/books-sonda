# Infraestrutura de Anexos - Sistema de Disparos Personalizados

## Visão Geral

Este documento descreve a infraestrutura implementada para suportar anexos no sistema de disparos personalizados. A solução inclui armazenamento seguro, controle de acesso e organização automática de arquivos.

## Componentes Implementados

### 1. Banco de Dados

#### Tabela `anexos_temporarios`
```sql
CREATE TABLE anexos_temporarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_clientes(id),
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo_mime VARCHAR(100) NOT NULL,
  tamanho_bytes INTEGER NOT NULL,
  url_temporaria TEXT NOT NULL,
  url_permanente TEXT,
  status VARCHAR(20) DEFAULT 'pendente',
  token_acesso VARCHAR(255) NOT NULL,
  data_upload TIMESTAMP DEFAULT NOW(),
  data_expiracao TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  data_processamento TIMESTAMP,
  erro_detalhes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Extensão da Tabela `historico_disparos`
- `anexo_id`: Referência para o anexo processado
- `anexo_processado`: Flag indicando se o anexo foi processado com sucesso

### 2. Supabase Storage

#### Buckets Criados
- **anexos-temporarios**: Armazenamento temporário (24h)
- **anexos-permanentes**: Armazenamento após processamento

#### Configurações de Segurança
- Buckets privados (não públicos)
- Limite de 10MB por arquivo
- Tipos MIME permitidos:
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### 3. Estrutura de Pastas

```
anexos-temporarios/
├── empresa-abc/
│   ├── 2025-01/
│   │   ├── temp/
│   │   │   ├── arquivo1_timestamp_random.pdf
│   │   │   └── arquivo2_timestamp_random.docx
│   │   └── processed/
│   │       ├── arquivo1_timestamp_random.pdf
│   │       └── arquivo2_timestamp_random.docx
│   └── 2025-02/
│       └── temp/
└── empresa-xyz/
    └── 2025-01/
        └── temp/
```

### 4. Políticas RLS (Row Level Security)

#### Controle de Acesso
- **SELECT**: Usuários com permissão de visualização ('view' ou 'edit') para disparos personalizados
- **INSERT**: Usuários com permissão de edição ('edit') para disparos personalizados
- **UPDATE**: Usuários com permissão de edição ('edit') para disparos personalizados
- **DELETE**: Apenas administradores (grupos com `is_default_admin = true`)
- **Sistema**: Service role pode gerenciar todos os anexos

### 5. Funções SQL

#### `limpar_anexos_expirados()`
- Remove anexos expirados automaticamente
- Atualiza status para 'expirado'
- Registra operação no log de auditoria

#### `validar_limite_anexos_empresa(empresa_id, novo_tamanho)`
- Valida limite de 25MB por empresa
- Considera apenas anexos ativos (pendentes/enviando)

#### `gerar_caminho_anexo(empresa_id, nome_arquivo, temporario)`
- Gera caminho organizado baseado na empresa e data
- Limpa caracteres especiais do nome da empresa

## Serviços Implementados

### AnexoStorageService
Gerencia operações de storage:
- Verificação e criação de buckets
- Geração de caminhos organizados
- Validação de arquivos (tipo e tamanho)
- Movimentação entre buckets temporário e permanente
- Limpeza automática de arquivos expirados

### AnexoInfrastructureUtils
Utilitários para verificação e inicialização:
- Verificação completa da infraestrutura
- Inicialização automática quando possível
- Geração de relatórios detalhados
- Testes de funcionalidade

## Componentes React

### InfrastructureChecker
Componente para verificação visual da infraestrutura:
- Status em tempo real dos componentes
- Inicialização automática quando possível
- Relatórios detalhados
- Instruções para resolução de problemas

## Instalação e Configuração

### 1. Executar Migrações SQL

Execute os seguintes arquivos no Supabase SQL Editor:

```bash
# 1. Criar tabelas e funções
supabase/migration/anexos_infrastructure_migration.sql

# 2. Configurar políticas RLS
supabase/migration/anexos_rls_policies.sql

# 3. Configurar storage e buckets
supabase/migration/anexos_storage_setup.sql
```

### 2. Verificar Permissões

Certifique-se de que o usuário tem:
- Acesso à tela "Disparos Personalizados"
- Permissões para criar/gerenciar buckets
- Permissões para executar funções RPC

### 3. Testar Infraestrutura

```typescript
import { AnexoInfrastructureUtils } from '@/utils/anexoInfrastructureUtils';

// Verificar status
const status = await AnexoInfrastructureUtils.verificarInfraestrutura();
console.log('Infraestrutura pronta:', status.pronto);

// Gerar relatório
const relatorio = await AnexoInfrastructureUtils.gerarRelatorioInfraestrutura();
console.log(relatorio);

// Testar funcionalidades
const teste = await AnexoInfrastructureUtils.testarInfraestrutura();
console.log('Testes passaram:', teste.sucesso);
```

## Limites e Validações

### Limites de Arquivo
- **Tamanho máximo por arquivo**: 10MB
- **Tamanho máximo por empresa**: 25MB total
- **Máximo de arquivos por empresa**: 10 arquivos
- **Tempo de expiração**: 24 horas

### Tipos Permitidos
- PDF (application/pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)

### Validações de Segurança
- Verificação de assinatura de arquivo (magic numbers)
- Whitelist de tipos MIME
- Controle de acesso baseado em permissões
- URLs temporárias com expiração
- Tokens de autenticação únicos

## Monitoramento e Manutenção

### Limpeza Automática
- Job diário para remover arquivos expirados
- Atualização automática de status
- Logs de auditoria para todas as operações

### Métricas Disponíveis
- Uso de storage por empresa
- Taxa de sucesso de uploads
- Arquivos processados vs. expirados
- Performance de operações

## Troubleshooting

### Problemas Comuns

1. **Buckets não encontrados**
   - Execute `anexos_storage_setup.sql`
   - Verifique permissões do usuário

2. **Tabelas não existem**
   - Execute `anexos_infrastructure_migration.sql`
   - Verifique conexão com banco

3. **Funções SQL não encontradas**
   - Execute todas as migrações na ordem
   - Verifique logs de erro do Supabase

4. **Políticas RLS bloqueando acesso**
   - Execute `anexos_rls_policies.sql`
   - Verifique permissões do usuário na tela

5. **Erro "relation user_permissions does not exist"**
   - Este erro indica que as políticas RLS estão usando a estrutura antiga
   - As políticas foram corrigidas para usar `user_group_assignments` e `screen_permissions`
   - Execute novamente `anexos_rls_policies.sql` e `anexos_storage_setup.sql`

### Verificação Manual

```sql
-- Verificar tabela
SELECT COUNT(*) FROM anexos_temporarios;

-- Verificar funções
SELECT limpar_anexos_expirados();

-- Verificar buckets
SELECT * FROM storage.buckets WHERE id LIKE 'anexos%';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'anexos_temporarios';

-- Verificar estrutura de permissões
SELECT 
  uga.user_id,
  ug.name as grupo,
  sp.screen_key,
  sp.permission_level
FROM user_group_assignments uga
JOIN user_groups ug ON uga.group_id = ug.id
JOIN screen_permissions sp ON ug.id = sp.group_id
WHERE sp.screen_key = 'controle_disparos_personalizados';

-- Verificar se a tela está registrada
SELECT * FROM screens WHERE key = 'controle_disparos_personalizados';
```

## Próximos Passos

Com a infraestrutura configurada, você pode prosseguir para:
1. Implementar o modelo de dados para anexos (Tarefa 2)
2. Criar o serviço de gerenciamento de anexos (Tarefa 3)
3. Desenvolver a interface de upload (Tarefa 4)

## Arquivos Relacionados

- `src/services/anexoStorageService.ts`
- `src/utils/anexoInfrastructureUtils.ts`
- `src/components/admin/anexos/InfrastructureChecker.tsx`
- `src/test/integration/anexoInfrastructure.test.ts`
- `supabase/migration/anexos_*.sql`