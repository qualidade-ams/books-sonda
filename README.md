# 📚 Books SND - Sistema de Gestão de Qualidade

Sistema completo de gestão de qualidade desenvolvido para a Sonda, incluindo gerenciamento de elogios, pesquisas de satisfação, banco de horas, requerimentos e geração automatizada de relatórios em PDF.

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Terminal 1: Frontend
npm run dev

# Terminal 2: API (opcional, para testar geração de PDF)
npm run dev:api
```

Acesse: http://localhost:8080

### Build e Deploy

```bash
# Build local
npm run build

# Preview do build
npm run preview

# Deploy (automático via Git)
git push origin main
```

## 📖 Documentação

- 📘 **[Quick Start](QUICK-START.md)** - Comandos rápidos para começar
- 📗 **[Desenvolvimento](DESENVOLVIMENTO.md)** - Guia completo de desenvolvimento local
- 📕 **[Deploy](DEPLOY.md)** - Guia de deploy para produção
- 📙 **[Changelog](CHANGELOG-DEV-SETUP.md)** - Histórico de mudanças na configuração

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** com TypeScript
- **Vite** como build tool
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **TanStack Query** para gerenciamento de estado
- **React Router** para navegação

### Backend
- **Supabase** (PostgreSQL + Auth + Storage)
- **Vercel Serverless Functions** para APIs
- **Puppeteer** para geração de PDF

### Infraestrutura
- **Vercel** para hospedagem e deploy
- **Vercel Edge Network** para CDN global
- **GitHub** para versionamento

## 📦 Estrutura do Projeto

```
books-sonda/
├── api/                      # Serverless Functions
│   └── pdf/
│       └── generate.ts       # Geração de PDF
│
├── src/
│   ├── components/           # Componentes React
│   │   ├── admin/           # Componentes administrativos
│   │   ├── auth/            # Autenticação
│   │   ├── ui/              # Componentes UI (shadcn)
│   │   └── ...
│   ├── pages/               # Páginas da aplicação
│   ├── services/            # Serviços e APIs
│   ├── hooks/               # Custom hooks
│   ├── contexts/            # Context providers
│   ├── types/               # TypeScript types
│   └── utils/               # Utilitários
│
├── public/                  # Arquivos estáticos
├── docs/                    # Documentação adicional
└── scripts/                 # Scripts utilitários
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env.local` baseado em `.env.local.example`:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API de Sincronização
VITE_SYNC_API_URL=http://your-api-url

# Desenvolvimento (opcional)
BROWSER_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
```

### Configuração do Vercel

As variáveis de ambiente devem ser configuradas no Vercel Dashboard:
1. Acesse o projeto no Vercel
2. Vá em Settings → Environment Variables
3. Adicione as variáveis necessárias

## 🎯 Funcionalidades Principais

### 📊 Gestão de Elogios
- Registro e categorização de elogios de clientes
- Sistema de aprovação e compartilhamento
- Geração automática de relatórios mensais
- Envio de emails com templates personalizados

### 📋 Pesquisas de Satisfação
- Criação e gerenciamento de pesquisas
- Coleta de feedback de clientes
- Análise de resultados e métricas
- Exportação de dados

### ⏰ Banco de Horas
- Controle de horas trabalhadas
- Aprovação de lançamentos
- Relatórios por período
- Integração com sistema de cobrança

### 📄 Requerimentos
- Gestão de requerimentos de clientes
- Workflow de aprovação
- Controle de status
- Geração de documentos

### 📑 Geração de Books
- Criação automática de relatórios em PDF
- Templates personalizáveis
- Organogramas dinâmicos
- Exportação e compartilhamento

## 🧪 Testes

```bash
# Rodar testes em watch mode
npm run test

# Rodar testes uma vez
npm run test:run

# Linter
npm run lint
```

## 📊 Performance

### Desenvolvimento
- **Vite Cold Start**: ~300ms
- **Hot Reload**: Instantâneo
- **Build Time**: ~30-60s

### Produção
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Lighthouse Score**: 90+

## 🔐 Segurança

- ✅ Row Level Security (RLS) no Supabase
- ✅ Autenticação JWT
- ✅ HTTPS em produção
- ✅ Variáveis de ambiente seguras
- ✅ CORS configurado
- ✅ Rate limiting nas APIs

## 🌐 Deploy

### Ambientes

- **Produção**: https://books-sonda.vercel.app
- **Preview**: Deploy automático em cada PR
- **Desenvolvimento**: http://localhost:8080

### CI/CD

Deploy automático via GitHub:
1. Push para `main` → Deploy em produção
2. Pull Request → Deploy de preview
3. Rollback instantâneo via Vercel Dashboard

## 📈 Monitoramento

- **Vercel Analytics**: Métricas de performance
- **Vercel Logs**: Logs de serverless functions
- **Supabase Dashboard**: Métricas de banco de dados

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

### Convenções de Commit

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

## 📝 Licença

Propriedade da Sonda IT. Todos os direitos reservados.

## 👥 Equipe

Desenvolvido pela equipe de Controle de Qualidade da Sonda IT.

## 📞 Suporte

Para suporte, entre em contato com a equipe de TI da Sonda.

---

**Última atualização**: 2026-03-04
**Versão**: 1.0.0
