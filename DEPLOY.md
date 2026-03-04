# Guia de Deploy - Books SND

## 🚀 Deploy para Produção (Vercel)

### Pré-requisitos
- Conta no Vercel
- Projeto conectado ao repositório Git
- Variáveis de ambiente configuradas no Vercel Dashboard

## 📋 Checklist Antes do Deploy

### 1. Verificar Build Local
```bash
npm run build
```

Se o build passar sem erros, está pronto para deploy.

### 2. Testar Build Localmente
```bash
npm run preview
```

Acesse http://localhost:4173 e teste a aplicação.

### 3. Verificar Variáveis de Ambiente

No Vercel Dashboard, configure:

```env
# Supabase
VITE_SUPABASE_URL=https://qiahexepsdggkzgmklhq.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_RFyt_JWwjtthTkDBiKE9vA_RIGt4KUD

# API de Sincronização
VITE_SYNC_API_URL=http://SAPSERVDB.sondait.com.br:3001
```

⚠️ **IMPORTANTE**: Não adicione `BROWSER_PATH` em produção! Essa variável é APENAS para desenvolvimento local.

## 🔧 Configuração do Vercel

### vercel.json (Já Configurado)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/pdf/generate.ts": {
      "memory": 2048,
      "maxDuration": 10
    }
  },
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

### O que cada configuração faz:

- **buildCommand**: Comando para build de produção
- **outputDirectory**: Pasta com arquivos estáticos gerados
- **framework**: Framework usado (Vite)
- **functions**: Configuração das serverless functions
  - **memory**: 2048MB para geração de PDF (Chromium precisa de memória)
  - **maxDuration**: 10 segundos de timeout
- **rewrites**: 
  - APIs vão para `/api/*`
  - Todas as outras rotas vão para `/index.html` (SPA routing)

## 📦 Estrutura de Deploy

```
Produção (Vercel):
├── Frontend (Static Files)
│   └── dist/ → Servido pelo Vercel CDN
│
└── Backend (Serverless Functions)
    └── api/pdf/generate.ts → Serverless Function
```

## 🔄 Fluxo de Deploy

### Deploy Automático (Recomendado)
1. Faça commit das mudanças
2. Push para o branch principal (main/master)
3. Vercel detecta automaticamente e faz deploy
4. Aguarde ~2-3 minutos
5. Deploy concluído! ✅

### Deploy Manual
```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Login
vercel login

# Deploy para preview
vercel

# Deploy para produção
vercel --prod
```

## 🧪 Testar em Produção

### 1. Testar Frontend
Acesse: https://books-sonda.vercel.app

### 2. Testar API de PDF
```bash
curl -X POST https://books-sonda.vercel.app/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Ou use Postman/Insomnia para testar.

## ⚠️ Problemas Comuns em Produção

### Erro: "Function execution timed out"
**Causa**: Geração de PDF demorou mais de 10 segundos.

**Solução**: Aumentar `maxDuration` no `vercel.json`:
```json
"functions": {
  "api/pdf/generate.ts": {
    "memory": 2048,
    "maxDuration": 15  // Aumentar para 15 segundos
  }
}
```

### Erro: "Out of memory"
**Causa**: Chromium precisa de mais memória.

**Solução**: Aumentar `memory` no `vercel.json`:
```json
"functions": {
  "api/pdf/generate.ts": {
    "memory": 3008,  // Aumentar para 3GB
    "maxDuration": 10
  }
}
```

### Erro: "404 Not Found" em rotas do React Router
**Causa**: Vercel não está redirecionando corretamente para `/index.html`.

**Solução**: Já configurado no `vercel.json` com:
```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

### Erro: "CORS" ao chamar API
**Causa**: Configuração de CORS na serverless function.

**Solução**: Adicionar headers CORS na resposta da API:
```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
});
```

## 📊 Monitoramento

### Logs do Vercel
1. Acesse o Vercel Dashboard
2. Selecione o projeto
3. Vá em "Deployments"
4. Clique no deployment
5. Veja os logs em "Functions"

### Métricas
- **Build Time**: ~2-3 minutos
- **Function Cold Start**: ~2-5 segundos (primeira execução)
- **Function Warm**: ~500ms-1s (execuções subsequentes)
- **PDF Generation**: ~3-8 segundos

## 🔐 Segurança

### Variáveis de Ambiente
- ✅ Sempre use variáveis de ambiente para dados sensíveis
- ✅ Configure no Vercel Dashboard, não no código
- ✅ Use prefixo `VITE_` para variáveis acessíveis no frontend
- ❌ Nunca commite `.env.local` ou `.env.production`

### API Keys
- ✅ Supabase Anon Key é segura para frontend (RLS protege os dados)
- ✅ Service Role Key NUNCA deve estar no frontend
- ✅ Use RLS (Row Level Security) no Supabase

## 🎯 Otimizações de Produção

### 1. Build Otimizado
O Vite já faz:
- ✅ Minificação de JS/CSS
- ✅ Tree-shaking
- ✅ Code splitting
- ✅ Asset optimization

### 2. Caching
Vercel CDN faz cache automático de:
- ✅ Arquivos estáticos (JS, CSS, imagens)
- ✅ HTML com cache curto
- ❌ APIs não são cacheadas (sempre fresh)

### 3. Serverless Functions
- ✅ Cold start otimizado com `@sparticuz/chromium`
- ✅ Memória adequada (2GB)
- ✅ Timeout adequado (10s)

## 📈 Escalabilidade

### Limites do Vercel (Plano Hobby)
- **Bandwidth**: 100GB/mês
- **Serverless Function Execution**: 100GB-hours/mês
- **Build Time**: 6000 minutos/mês
- **Concurrent Builds**: 1

### Limites do Vercel (Plano Pro)
- **Bandwidth**: 1TB/mês
- **Serverless Function Execution**: 1000GB-hours/mês
- **Build Time**: Ilimitado
- **Concurrent Builds**: 12

## 🔄 Rollback

Se algo der errado:

1. Acesse Vercel Dashboard
2. Vá em "Deployments"
3. Encontre o deployment anterior que funcionava
4. Clique nos 3 pontinhos
5. Selecione "Promote to Production"

Rollback instantâneo! ✅

## 📝 Checklist Final

Antes de fazer deploy para produção:

- [ ] Build local passou sem erros
- [ ] Preview local funcionou corretamente
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Testes manuais realizados
- [ ] API de PDF testada localmente
- [ ] Documentação atualizada
- [ ] Commit e push para o repositório
- [ ] Aguardar deploy automático
- [ ] Testar em produção
- [ ] Verificar logs no Vercel Dashboard

---

**Última atualização**: 2026-03-04
**Status**: ✅ Configuração de produção otimizada
