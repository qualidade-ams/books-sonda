# Changelog - Configuração de Desenvolvimento e Produção

## 📅 2026-03-04 - Correção Completa do Ambiente de Desenvolvimento

### 🎯 Problema Resolvido
O `vercel dev` tinha conflitos de porta e erros 404 ao tentar servir os arquivos do Vite.

### ✅ Solução Implementada

#### 1. Desenvolvimento Local (2 Terminais)
**Configuração recomendada para desenvolvimento:**

```bash
# Terminal 1: Frontend (Vite)
npm run dev
# → Roda na porta 8080

# Terminal 2: API (Vercel)
npm run dev:api
# → Roda na porta 3001
```

**Acesse:** http://localhost:8080

#### 2. Arquivos Modificados

##### `vercel.json`
```json
{
  "devCommand": "vite --port $PORT --host 0.0.0.0",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Mudanças:**
- ✅ `devCommand` usa `$PORT` para compatibilidade com Vercel
- ✅ Rewrites corrigidos para produção (SPA routing)
- ✅ APIs isoladas em `/api/*`

##### `vite.config.ts`
```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: false,
    // Proxy APENAS em desenvolvimento
    proxy: mode === 'development' ? {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    } : undefined
  }
}));
```

**Mudanças:**
- ✅ Proxy condicional (só em desenvolvimento)
- ✅ Host `0.0.0.0` para compatibilidade
- ✅ Porta 8080 fixa para desenvolvimento

##### `package.json`
```json
{
  "scripts": {
    "dev": "vite",
    "dev:api": "vercel dev --listen 3001",
    "dev:vercel": "vercel dev"
  }
}
```

**Mudanças:**
- ✅ Novo script `dev:api` para rodar API separadamente
- ✅ Scripts organizados por função

#### 3. Documentação Criada

##### `DESENVOLVIMENTO.md`
- ✅ Guia completo de desenvolvimento local
- ✅ Solução de problemas comuns
- ✅ Explicação de portas e configurações
- ✅ Fluxo de trabalho recomendado

##### `DEPLOY.md`
- ✅ Guia completo de deploy para produção
- ✅ Checklist pré-deploy
- ✅ Configuração de variáveis de ambiente
- ✅ Troubleshooting de produção
- ✅ Monitoramento e logs

### 🔧 Configuração de Portas

| Ambiente | Frontend | API | Acesso |
|----------|----------|-----|--------|
| **Desenvolvimento** | 8080 | 3001 | http://localhost:8080 |
| **Produção** | CDN | Serverless | https://books-sonda.vercel.app |

### 📦 Estrutura de Desenvolvimento

```
Desenvolvimento Local:
├── Terminal 1: Vite (Frontend)
│   ├── Porta: 8080
│   ├── Hot Reload: ✅
│   └── Proxy: /api → localhost:3001
│
└── Terminal 2: Vercel Dev (API)
    ├── Porta: 3001
    ├── Serverless Functions: ✅
    └── PDF Generation: ✅
```

### 🚀 Produção (Vercel)

```
Produção:
├── Frontend (Static)
│   ├── CDN: Vercel Edge Network
│   ├── Build: dist/
│   └── Routing: SPA (index.html)
│
└── Backend (Serverless)
    ├── API: /api/pdf/generate.ts
    ├── Memory: 2048MB
    └── Timeout: 10s
```

### ⚠️ Problemas Conhecidos e Soluções

#### Problema 1: `vercel dev` dá erro 404
**Causa:** Vercel Dev não serve corretamente os arquivos do Vite.

**Solução:** Use 2 terminais (`npm run dev` + `npm run dev:api`)

#### Problema 2: Porta 3000 ocupada
**Causa:** Outro processo usando a porta.

**Solução:** 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

#### Problema 3: API não responde
**Causa:** Vercel Dev não está rodando.

**Solução:** Certifique-se de que ambos os terminais estão ativos.

### 🎯 Benefícios da Nova Configuração

1. **Desenvolvimento Rápido**
   - ✅ Vite inicia em ~300ms
   - ✅ Hot reload instantâneo
   - ✅ Sem conflitos de porta

2. **APIs Funcionais**
   - ✅ Geração de PDF funciona localmente
   - ✅ Serverless functions testáveis
   - ✅ Ambiente similar à produção

3. **Produção Otimizada**
   - ✅ Build otimizado pelo Vite
   - ✅ Serverless functions com memória adequada
   - ✅ Routing SPA correto
   - ✅ CDN global do Vercel

### 📝 Próximos Passos

Para desenvolvedores:
1. Leia `DESENVOLVIMENTO.md` para setup local
2. Use `npm run dev` + `npm run dev:api` para desenvolvimento
3. Teste com `npm run build` antes de fazer deploy

Para deploy:
1. Leia `DEPLOY.md` para processo de deploy
2. Configure variáveis de ambiente no Vercel Dashboard
3. Push para o repositório (deploy automático)

### 🔗 Links Úteis

- **Desenvolvimento**: http://localhost:8080
- **API Local**: http://localhost:3001/api/*
- **Produção**: https://books-sonda.vercel.app
- **Vercel Dashboard**: https://vercel.com/dashboard

---

**Autor**: Kiro AI Assistant
**Data**: 2026-03-04
**Status**: ✅ Implementado e Testado
