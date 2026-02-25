# 🔧 Solução: Erro 404 na API de PDF

## Problema

```
Failed to load resource: the server responded with a status of 404 (Not Found)
❌ Erro ao gerar PDF: SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

## Causa

A API `/api/pdf/generate` não está disponível em desenvolvimento local porque:
- O Vite (`npm run dev`) não serve arquivos da pasta `api/`
- As serverless functions só funcionam no Vercel ou com Vercel Dev

## Solução Implementada

### 1. Proxy Vite Configurado ✅

Arquivo `vite.config.ts` atualizado para fazer proxy das requisições `/api/*` para `http://localhost:3000`:

```typescript
export default defineConfig({
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
});
```

### 2. Scripts NPM Adicionados ✅

Arquivo `package.json` atualizado com novo script:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:vercel": "vercel dev"
  }
}
```

### 3. Documentação Criada ✅

- `QUICK_START_PDF.md` - Guia rápido de início
- `DEV_LOCAL_PUPPETEER.md` - Documentação completa
- `SOLUCAO_404_API.md` - Este arquivo

---

## Como Usar Agora

### Opção A: Vercel Dev (Mais Simples)

```bash
# 1. Instalar Vercel CLI (apenas uma vez)
npm install -g vercel

# 2. Iniciar servidor
vercel dev
```

Acesse: `http://localhost:3000`

### Opção B: Vite + Vercel Dev (Mais Rápido)

```bash
# Terminal 1: Vercel Dev
vercel dev --listen 3000

# Terminal 2: Vite (aguarde Terminal 1 iniciar)
npm run dev
```

Acesse: `http://localhost:8080`

---

## Fluxo de Desenvolvimento

### Desenvolvimento Normal (sem testar PDF)
```bash
npm run dev
```
- ✅ Frontend rápido
- ❌ API de PDF não funciona

### Desenvolvimento com API de PDF
```bash
vercel dev
```
- ✅ API de PDF funciona
- ⚠️ Um pouco mais lento

### Desenvolvimento Completo (melhor dos dois)
```bash
# Terminal 1
vercel dev --listen 3000

# Terminal 2
npm run dev
```
- ✅ Frontend rápido
- ✅ API de PDF funciona

---

## Verificação

### 1. Verificar se Vercel Dev está rodando

```bash
curl http://localhost:3000/api/pdf/generate
```

Deve retornar: `{"error":"Method not allowed"}`

### 2. Testar geração de PDF

```bash
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Teste</h1>","filename":"teste.pdf"}' \
  --output teste.pdf
```

Deve criar arquivo `teste.pdf`

### 3. Testar no frontend

1. Acessar aplicação
2. Ir para página de Books
3. Clicar em "Gerar PDF"
4. PDF deve ser gerado e baixado

---

## Troubleshooting

### Erro: "vercel: command not found"

```bash
npm install -g vercel
```

### Erro: "Port 3000 already in use"

```bash
# Matar processo na porta 3000
npx kill-port 3000

# Ou usar outra porta
vercel dev --listen 3001
```

E atualizar `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
  }
}
```

### Erro: "Proxy error"

Certifique-se de que o Vercel Dev está rodando ANTES de iniciar o Vite.

### PDF ainda não gera

1. Verificar se Vercel Dev está rodando
2. Verificar console do navegador para erros
3. Verificar logs do Vercel Dev no terminal
4. Testar API diretamente com curl

---

## Arquivos Modificados

- ✅ `vite.config.ts` - Proxy configurado
- ✅ `package.json` - Script `dev:vercel` adicionado
- ✅ `api/pdf/generate.ts` - Propriedades do Chromium corrigidas

## Arquivos Criados

- ✅ `QUICK_START_PDF.md` - Guia rápido
- ✅ `DEV_LOCAL_PUPPETEER.md` - Documentação completa
- ✅ `SOLUCAO_404_API.md` - Este arquivo
- ✅ `CORRECAO_CHROMIUM.md` - Correção anterior

---

## Próximos Passos

1. ✅ Instalar Vercel CLI: `npm install -g vercel`
2. ✅ Iniciar Vercel Dev: `vercel dev`
3. ✅ Testar geração de PDF no frontend
4. 📖 Ler `DEV_LOCAL_PUPPETEER.md` para mais detalhes
5. 🚀 Deploy para produção: `vercel --prod`

---

## Resumo

**Problema**: API retorna 404 em desenvolvimento local

**Causa**: Vite não serve pasta `api/`

**Solução**: Usar Vercel Dev para simular ambiente de produção

**Comando**: `vercel dev` ou `npm run dev:vercel`

**Status**: ✅ Resolvido

---

**Documentação Completa**: Consulte `DEV_LOCAL_PUPPETEER.md`

**Guia Rápido**: Consulte `QUICK_START_PDF.md`
