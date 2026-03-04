# Guia de Desenvolvimento - Books SND

## 🚀 Como Rodar o Projeto

### ⚠️ PROBLEMA CONHECIDO: Vercel Dev + Vite

O `vercel dev` tem problemas para servir corretamente os arquivos do Vite (erro 404 em main.tsx).

### ✅ SOLUÇÃO RECOMENDADA: Rodar Separadamente

**Opção 1: Desenvolvimento Frontend (SEM API)**
```bash
npm run dev
```
- Vite na porta 8080
- Acesse: http://localhost:8080
- APIs não funcionarão

**Opção 2: Desenvolvimento Completo (COM API)** ⭐ RECOMENDADO
```bash
# Terminal 1: Inicie o Vite
npm run dev

# Terminal 2: Inicie a API do Vercel
npm run dev:api
```

Configuração:
- Frontend (Vite): http://localhost:8080
- API (Vercel): http://localhost:3001
- O Vite faz proxy automático de `/api` para `localhost:3001`

### Opção 3: Vercel Dev (Experimental)
```bash
vercel dev
```
- ⚠️ Pode dar erro 404 nos arquivos do Vite
- Tente recarregar a página algumas vezes
- Se não funcionar, use a Opção 2

## 🔧 Configuração de Portas

| Modo | Frontend | API | Como Acessar |
|------|----------|-----|--------------|
| `npm run dev` | 8080 | ❌ | http://localhost:8080 |
| `npm run dev` + `npm run dev:api` | 8080 | 3001 | http://localhost:8080 |
| `vercel dev` | 3000 | 3000 | http://localhost:3000 (pode dar 404) |

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Vite na porta 8080 (sem API)
npm run dev:api      # Vercel API na porta 3001
npm run dev:vercel   # Vercel Dev na porta 3000 (experimental)
npm run dev:fast     # Alias para Vite rápido

# Build
npm run build        # Build de produção
npm run build:dev    # Build de desenvolvimento
npm run preview      # Preview do build

# Testes
npm run test         # Testes em watch mode
npm run test:run     # Testes uma vez

# Qualidade
npm run lint         # Linter
```

## 🎯 Fluxo de Trabalho Recomendado

### Desenvolvimento Diário (Frontend)
```bash
npm run dev
```
Use para desenvolvimento de componentes, estilos e páginas.

### Testando APIs (PDF, etc)
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run dev:api
```

Agora você pode:
- Desenvolver no frontend (localhost:8080)
- Testar APIs de geração de PDF
- Tudo funcionando junto!

## ⚠️ Problemas Comuns

### Erro: "Failed to load resource: 404" no Vercel Dev
**Causa**: O Vercel Dev não está servindo corretamente os arquivos do Vite.

**Solução**: Use a abordagem de 2 terminais:
```bash
# Terminal 1
npm run dev

# Terminal 2  
npm run dev:api
```

### Erro: "Port 8080 is in use"
```bash
# Windows (PowerShell como Admin)
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

### Erro: "Port 3001 is in use"
```bash
# Windows (PowerShell como Admin)
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### API não responde
Verifique se ambos os processos estão rodando:
1. Vite deve mostrar: `Local: http://localhost:8080/`
2. Vercel deve mostrar: `Ready! Available at http://localhost:3001`

## 🔗 URLs de Acesso

### Modo Recomendado (2 Terminais)
- **Frontend**: http://localhost:8080
- **API**: http://localhost:3001/api/*
- **Proxy automático**: Chamadas para `/api` no frontend vão para a API

### Modo Vercel Dev (Experimental)
- **Tudo**: http://localhost:3000
- ⚠️ Pode dar erro 404

## 📦 Estrutura de API

```
api/
└── pdf/
    ├── generate.ts          # Serverless function de geração de PDF
    ├── generate.prod.ts     # Versão de produção
    └── README.md            # Documentação da API
```

## 🐛 Debug

### Ver logs detalhados
```bash
# Vercel API com debug
vercel dev --listen 3001 --debug

# Vite já mostra logs detalhados
npm run dev
```

### Testar API diretamente
```bash
# Com curl
curl http://localhost:3001/api/pdf/generate

# Ou abra no navegador
http://localhost:3001/api/pdf/generate
```

## 💡 Dicas

1. **Desenvolvimento diário**: Use `npm run dev` (mais rápido)
2. **Testando APIs**: Use 2 terminais (`npm run dev` + `npm run dev:api`)
3. **Antes de deploy**: Teste com `vercel dev` (se funcionar)
4. **Problemas de porta**: Sempre libere as portas antes de iniciar
5. **Hot reload**: Ambos os modos suportam hot reload

## ✅ Checklist de Inicialização

### Terminal 1 (Vite):
```
VITE v5.4.21  ready in XXX ms
➜  Local:   http://localhost:8080/
➜  Network: http://192.168.x.x:8080/
```

### Terminal 2 (Vercel API):
```
Vercel CLI 50.23.2
> Ready! Available at http://localhost:3001
```

Quando ver ambas as mensagens, está tudo pronto! 🚀

## 🎨 Exemplo de Uso

```typescript
// No seu código React, chame a API normalmente:
const response = await fetch('/api/pdf/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* dados */ })
});

// O Vite faz proxy automático para localhost:3001
```

## 🔄 Alternativa: Usar apenas npm run dev

Se você não precisa testar a API de PDF localmente:

```bash
npm run dev
```

E use dados mockados ou aponte para a API de produção:
```typescript
const API_URL = import.meta.env.PROD 
  ? '/api' 
  : 'https://books-sonda.vercel.app/api';
```

---

**Última atualização**: 2026-03-04
**Status**: ✅ Solução de 2 terminais funcionando perfeitamente
