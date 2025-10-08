# Documento de Design - Sistema de Gerenciamento de Clientes e Books

## Visão Geral

O sistema de gerenciamento de clientes e books será integrado à aplicação Books SND existente, aproveitando a infraestrutura de autenticação, permissões e templates de e-mail já implementada. O sistema permitirá o cadastro completo de empresas clientes e colaboradores, controle de disparo de e-mails mensais (books) e acompanhamento detalhado através de históricos e relatórios.

## Arquitetura

### Estrutura de Banco de Dados

O sistema utilizará o Supabase PostgreSQL existente com as seguintes novas tabelas:

```sql
-- Tabela de empresas clientes
CREATE TABLE empresas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo VARCHAR(255) NOT NULL,
  nome_abreviado VARCHAR(100) NOT NULL,
  link_sharepoint TEXT,
  template_padrao VARCHAR(50) DEFAULT 'portugues',
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  data_status TIMESTAMP DEFAULT NOW(),
  descricao_status TEXT,
  email_gestor VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de produtos contratados (relacionamento N:N)
CREATE TABLE empresa_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  produto VARCHAR(50) NOT NULL CHECK (produto IN ('COMEX', 'FISCAL', 'GALLERY')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de grupos de responsáveis
CREATE TABLE grupos_responsaveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de e-mails dos grupos
CREATE TABLE grupo_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID REFERENCES grupos_responsaveis(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de relacionamento empresa-grupos
CREATE TABLE empresa_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  grupo_id UUID REFERENCES grupos_responsaveis(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de colaboradores
CREATE TABLE colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  funcao VARCHAR(100),
  empresa_id UUID REFERENCES empresas_clientes(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  data_status TIMESTAMP DEFAULT NOW(),
  descricao_status TEXT,
  principal_contato BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de histórico de disparos
CREATE TABLE historico_disparos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas_clientes(id),
  colaborador_id UUID REFERENCES colaboradores(id),
  template_id UUID,
  status VARCHAR(20) NOT NULL CHECK (status IN ('enviado', 'falhou', 'agendado', 'cancelado')),
  data_disparo TIMESTAMP,
  data_agendamento TIMESTAMP,
  erro_detalhes TEXT,
  assunto VARCHAR(500),
  emails_cc TEXT[], -- Array de e-mails em cópia
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de controle mensal
CREATE TABLE controle_mensal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mes INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  empresa_id UUID REFERENCES empresas_clientes(id),
  status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'falhou', 'agendado')),
  data_processamento TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mes, ano, empresa_id)
);
```

### Integração com Sistema de Permissões

Novas telas serão registradas no sistema de permissões existente:

```sql
-- Inserir novas telas no sistema de permissões
INSERT INTO telas (screen_key, nome, descricao) VALUES
('empresas_clientes', 'Cadastro de Empresas', 'Gerenciamento de empresas clientes'),
('colaboradores', 'Cadastro de Colaboradores', 'Gerenciamento de colaboradores'),
('grupos_responsaveis', 'Grupos de Responsáveis', 'Gerenciamento de grupos de e-mail'),
('controle_disparos', 'Controle de Disparos', 'Controle mensal de envio de books'),
('historico_books', 'Histórico de Books', 'Relatórios e histórico de envios');
```

## Componentes e Interfaces

### 1. Páginas Principais

#### `/admin/empresas-clientes`
- **Componente:** `EmpresasClientes.tsx`
- **Funcionalidades:** Listagem, cadastro, edição, importação Excel
- **Permissão:** `empresas_clientes`

#### `/admin/colaboradores`
- **Componente:** `Colaboradores.tsx`
- **Funcionalidades:** Listagem, cadastro, edição por empresa
- **Permissão:** `colaboradores`

#### `/admin/grupos-responsaveis`
- **Componente:** `GruposResponsaveis.tsx`
- **Funcionalidades:** Gerenciamento de grupos e e-mails
- **Permissão:** `grupos_responsaveis`

#### `/admin/controle-disparos`
- **Componente:** `ControleDisparos.tsx`
- **Funcionalidades:** Controle mensal, agendamento, status
- **Permissão:** `controle_disparos`

#### `/admin/historico-books`
- **Componente:** `HistoricoBooks.tsx`
- **Funcionalidades:** Relatórios, filtros, exportação
- **Permissão:** `historico_books`

### 2. Componentes de Interface

#### Formulários
```typescript
// Componente de formulário de empresa
interface EmpresaFormData {
  nomeCompleto: string;
  nomeAbreviado: string;
  linkSharepoint: string;
  templatePadrao: 'portugues' | 'ingles';
  status: 'ativo' | 'inativo' | 'suspenso';
  descricaoStatus?: string;
  emailGestor: string;
  produtos: ('COMEX' | 'FISCAL' | 'GALLERY')[];
  grupos: string[];
}

// Componente de formulário de colaborador
interface ColaboradorFormData {
  nomeCompleto: string;
  email: string;
  funcao: string;
  empresaId: string;
  status: 'ativo' | 'inativo';
  descricaoStatus?: string;
  principalContato: boolean;
}
```

#### Tabelas e Listagens
- **EmpresasTable:** Listagem com filtros por status, produtos
- **ColaboradoresTable:** Listagem por empresa com filtros
- **HistoricoTable:** Tabela com filtros avançados e paginação

### 3. Serviços

#### `empresasClientesService.ts`
```typescript
class EmpresasClientesService {
  async criarEmpresa(data: EmpresaFormData): Promise<EmpresaCliente>;
  async atualizarEmpresa(id: string, data: Partial<EmpresaFormData>): Promise<void>;
  async listarEmpresas(filtros?: EmpresaFiltros): Promise<EmpresaCliente[]>;
  async alterarStatusLote(ids: string[], status: string, descricao: string): Promise<void>;
  async importarExcel(arquivo: File): Promise<ImportResult>;
}
```

#### `colaboradoresService.ts`
```typescript
class ColaboradoresService {
  async criarColaborador(data: ColaboradorFormData): Promise<Colaborador>;
  async listarPorEmpresa(empresaId: string): Promise<Colaborador[]>;
  async atualizarStatus(id: string, status: string, descricao: string): Promise<void>;
}
```

#### `booksDisparoService.ts`
```typescript
class BooksDisparoService {
  async dispararBooksMensal(mes: number, ano: number): Promise<DisparoResult>;
  async agendarDisparo(empresaId: string, dataAgendamento: Date): Promise<void>;
  async obterStatusMensal(mes: number, ano: number): Promise<StatusMensal[]>;
  async reenviarFalhas(mes: number, ano: number): Promise<void>;
}
```

## Modelos de Dados

### Interfaces TypeScript

```typescript
interface EmpresaCliente {
  id: string;
  nomeCompleto: string;
  nomeAbreviado: string;
  linkSharepoint?: string;
  templatePadrao: 'portugues' | 'ingles';
  status: 'ativo' | 'inativo' | 'suspenso';
  dataStatus: Date;
  descricaoStatus?: string;
  emailGestor?: string;
  produtos: Produto[];
  grupos: GrupoResponsavel[];
  colaboradores: Colaborador[];
  createdAt: Date;
  updatedAt: Date;
}

interface Colaborador {
  id: string;
  nomeCompleto: string;
  email: string;
  funcao?: string;
  empresaId: string;
  empresa: EmpresaCliente;
  status: 'ativo' | 'inativo';
  dataStatus: Date;
  descricaoStatus?: string;
  principalContato: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface GrupoResponsavel {
  id: string;
  nome: string;
  descricao?: string;
  emails: GrupoEmail[];
  createdAt: Date;
  updatedAt: Date;
}

interface HistoricoDisparo {
  id: string;
  empresaId: string;
  colaboradorId: string;
  templateId?: string;
  status: 'enviado' | 'falhou' | 'agendado' | 'cancelado';
  dataDisparo?: Date;
  dataAgendamento?: Date;
  erroDetalhes?: string;
  assunto?: string;
  emailsCc: string[];
  empresa: EmpresaCliente;
  colaborador: Colaborador;
  createdAt: Date;
}
```

## Tratamento de Erros

### Estratégias de Recuperação

1. **Falhas de Disparo de E-mail:**
   - Retry automático com backoff exponencial
   - Log detalhado de erros
   - Notificação para administradores

2. **Validação de Dados:**
   - Validação client-side com Zod
   - Validação server-side no Supabase
   - Mensagens de erro específicas

3. **Importação Excel:**
   - Validação de formato
   - Relatório de erros por linha
   - Rollback em caso de falha parcial

### Classes de Erro Customizadas

```typescript
class EmpresaError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'EmpresaError';
  }
}

class DisparoError extends Error {
  constructor(message: string, public empresaId: string, public colaboradorId: string) {
    super(message);
    this.name = 'DisparoError';
  }
}
```

## Estratégia de Testes

### Testes Unitários
- Serviços de negócio (empresas, colaboradores, disparos)
- Utilitários de validação e formatação
- Hooks customizados

### Testes de Integração
- Fluxo completo de cadastro de empresa
- Processo de disparo de e-mails
- Importação de dados Excel

### Testes E2E
- Jornada completa do usuário
- Cenários de erro e recuperação
- Validação de permissões

### Configuração de Testes

```typescript
// vitest.config.ts - configuração específica para novos módulos
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'src/test/integration/**/*.test.ts'
    ]
  }
});
```

## Integração com Sistema de Templates

### Variáveis Disponíveis

O sistema criará automaticamente variáveis para uso nos templates de e-mail:

#### Variáveis de Empresa
- `{{empresa.nomeCompleto}}`
- `{{empresa.nomeAbreviado}}`
- `{{empresa.linkSharepoint}}`
- `{{empresa.emailGestor}}`
- `{{empresa.produtos}}` (lista formatada)

#### Variáveis de Colaborador
- `{{colaborador.nomeCompleto}}`
- `{{colaborador.email}}`
- `{{colaborador.funcao}}`
- `{{colaborador.principalContato}}`

#### Variáveis de Sistema
- `{{disparo.mes}}`
- `{{disparo.ano}}`
- `{{disparo.dataDisparo}}`

### Extensão do Sistema de Templates

```typescript
interface TemplateVariables {
  empresa: EmpresaCliente;
  colaborador: Colaborador;
  disparo: {
    mes: number;
    ano: number;
    dataDisparo: Date;
  };
}

class TemplateVariableService {
  gerarVariaveis(empresaId: string, colaboradorId: string): TemplateVariables;
  substituirVariaveis(template: string, variaveis: TemplateVariables): string;
}
```

## Performance e Otimização

### Estratégias de Cache
- Cache de empresas ativas para disparo
- Cache de templates por idioma
- Cache de grupos de responsáveis

### Otimizações de Consulta
- Índices otimizados para consultas frequentes
- Paginação em listagens grandes
- Lazy loading de relacionamentos

### Processamento Assíncrono
- Disparo de e-mails em background jobs
- Processamento de importação Excel assíncrono
- Notificações em tempo real via Supabase subscriptions