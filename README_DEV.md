# 📚 Books SND - Guia de Desenvolvimento

## 🚀 Início Rápido

### Instalação

```bash
# Instalar dependências
npm install

# Instalar Vercel CLI (para API de PDF)
npm install -g vercel
```

### Desenvolvimento

#### Opção 1: Desenvolvimento Normal (sem API de PDF)
```bash
npm run dev
```
Acesse: `http://localhost:8080`

#### Opção 2: Desenvolvimento com API de PDF
```bash
npm run dev:vercel
```
Acesse: `http://localhost:3000`

#### Opção 3: Desenvolvimento Completo (Recomendado)
```bash
# Terminal 1: API de PDF
vercel dev --listen 3000

# Terminal 2: Frontend
npm run dev
```
Acesse: `http://localhost:8080`

---

## 📖 Documentação

### Geração de PDF com Puppeteer

- **`QUICK_START_PDF.md`** - Guia rápido de 2 minutos
- **`DEV_LOCAL_PUPPETEER.md`** - Documentação completa de desenvolvimento
- **`SOLUCAO_404_API.md`** - Solução para erro 404 na API
- **`MIGRACAO_PUPPETEER.md`** - Guia de migração do @react-pdf/renderer
- **`README_PUPPETEER.md`** - Documentação técnica do Puppeteer
- **`DEPLOY_INSTRUCTIONS.md`** - Instruções de deploy para produção

### Correções e Melhorias

- **`CORRECAO_CHROMIUM.md`** - Correção de propriedades do @sparticuz/chromium
- **`RESUMO_MIGRACAO.md`** - Resumo da migração completa

---

## 🛠️ Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev              # Vite dev server (porta 8080)
npm run dev:vercel       # Vercel dev server (porta 3000)

# Build
npm run build            # Build de produção
npm run build:dev        # Build de desenvolvimento
npm run preview          # Preview do build

# Testes
npm run test             # Rodar testes em watch mode
npm run test:run         # Rodar testes uma vez

# Qualidade de Código
npm run lint             # Rodar ESLint
```

---

## 🏗️ Estrutura do Projeto

```
books-sonda/
├── api/                          # Serverless functions (Vercel)
│   └── pdf/
│       └── generate.ts           # API de geração de PDF com Puppeteer
├── src/
│   ├── components/               # Componentes React
│   ├── pages/                    # Páginas da aplicação
│   ├── services/                 # Serviços e lógica de negócio
│   │   ├── puppeteerPDFService.ts        # Cliente HTTP para API de PDF
│   │   └── booksPDFServicePuppeteer.ts   # Serviço de PDF para Books
│   ├── hooks/                    # Custom hooks
│   ├── utils/                    # Utilitários
│   └── types/                    # Definições TypeScript
├── public/                       # Arquivos estáticos
├── docs/                         # Documentação
└── vercel.json                   # Configuração Vercel
```

---

## 🔧 Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** como build tool
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **TanStack Query** para gerenciamento de estado

### Backend
- **Supabase** para banco de dados e autenticação
- **Vercel** para hospedagem e serverless functions
- **Puppeteer** para geração de PDF

### Geração de PDF
- **Puppeteer Core** - Controle do Chrome headless
- **@sparticuz/chromium** - Chrome otimizado para Vercel
- **100% fidelidade visual** ao HTML/CSS

---

## 🚨 Problemas Comuns

### Erro 404 na API de PDF

**Problema**: `Failed to load resource: the server responded with a status of 404`

**Solução**: Use `vercel dev` em vez de `npm run dev`

```bash
vercel dev
```

📖 Consulte: `SOLUCAO_404_API.md`

### Vercel CLI não encontrado

**Problema**: `vercel: command not found`

**Solução**: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Porta 3000 em uso

**Problema**: `Port 3000 already in use`

**Solução**: Usar outra porta

```bash
vercel dev --listen 3001
```

---

## 📦 Deploy

### Deploy para Vercel

```bash
# Login no Vercel
vercel login

# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

📖 Consulte: `DEPLOY_INSTRUCTIONS.md`

---

## 🧪 Testes

### Testar API de PDF

```bash
# Testar endpoint
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Teste</h1>","filename":"teste.pdf"}' \
  --output teste.pdf
```

### Testar no Frontend

1. Iniciar servidor: `vercel dev`
2. Acessar: `http://localhost:3000`
3. Navegar para página de Books
4. Clicar em "Gerar PDF"
5. Verificar se PDF foi gerado corretamente

---

## 📚 Recursos

### Documentação Oficial
- [Vite](https://vitejs.dev/)
- [React](https://react.dev/)
- [Vercel](https://vercel.com/docs)
- [Puppeteer](https://pptr.dev/)
- [Supabase](https://supabase.com/docs)

### Guias Internos
- `QUICK_START_PDF.md` - Início rápido
- `DEV_LOCAL_PUPPETEER.md` - Desenvolvimento local
- `DEPLOY_INSTRUCTIONS.md` - Deploy para produção

---

## 🤝 Contribuindo

1. Criar branch: `git checkout -b feature/nova-funcionalidade`
2. Fazer alterações
3. Testar localmente: `vercel dev`
4. Commit: `git commit -m "feat: adicionar nova funcionalidade"`
5. Push: `git push origin feature/nova-funcionalidade`
6. Criar Pull Request

---

## 📝 Notas

### Geração de PDF

- ✅ Usa Puppeteer para 100% de fidelidade visual
- ✅ Suporta CSS moderno, gradientes, fontes customizadas
- ✅ Funciona em produção no Vercel
- ⚠️ Requer Vercel Dev para testes locais

### Desenvolvimento Local

- `npm run dev` - Rápido, mas sem API de PDF
- `vercel dev` - Completo, mas um pouco mais lento
- Recomendado: Usar ambos em paralelo

---

## 📞 Suporte

- **Documentação**: Consulte arquivos `*.md` na raiz do projeto
- **Issues**: Criar issue no repositório
- **Vercel Support**: https://vercel.com/support

---

**Última atualização**: 2026-01-20

**Status**: ✅ Sistema de PDF com Puppeteer implementado e funcionando
