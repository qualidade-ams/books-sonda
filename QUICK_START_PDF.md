# 🚀 Quick Start - API PDF Puppeteer

## Problema Atual

Você está vendo erro 404 ao tentar gerar PDF porque a API `/api/pdf/generate` não está disponível em desenvolvimento local com `npm run dev`.

## Solução Rápida (2 minutos)

### Opção 1: Usar Vercel Dev (Recomendado)

```bash
# 1. Instalar Vercel CLI (apenas uma vez)
npm install -g vercel

# 2. Parar o servidor atual (Ctrl+C)

# 3. Iniciar com Vercel Dev
vercel dev
```

Acesse: `http://localhost:3000`

✅ A API estará funcionando!

---

### Opção 2: Dois Servidores em Paralelo

```bash
# Terminal 1: Iniciar Vercel Dev
vercel dev --listen 3000

# Terminal 2: Iniciar Vite (aguarde Terminal 1 iniciar)
npm run dev
```

Acesse: `http://localhost:8080`

✅ Frontend rápido + API funcionando!

---

## Comandos Disponíveis

```bash
# Desenvolvimento normal (sem API de PDF)
npm run dev

# Desenvolvimento com API de PDF
npm run dev:vercel

# Ou use Vercel Dev diretamente
vercel dev
```

---

## Testando a API

### 1. Verificar se API está rodando

Abra no navegador: `http://localhost:3000/api/pdf/generate`

Deve retornar: `{"error":"Method not allowed"}` (isso é normal, precisa ser POST)

### 2. Testar geração de PDF

```bash
curl -X POST http://localhost:3000/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Teste</h1>","filename":"teste.pdf"}' \
  --output teste.pdf
```

### 3. Testar no frontend

1. Acesse a aplicação
2. Vá para página de Books
3. Clique em "Gerar PDF"
4. PDF deve ser gerado e baixado

---

## Troubleshooting

### "vercel: command not found"

```bash
npm install -g vercel
```

### "Port 3000 already in use"

```bash
# Usar outra porta
vercel dev --listen 3001
```

### "Proxy error"

Certifique-se de que o Vercel Dev está rodando antes de iniciar o Vite.

---

## Próximos Passos

1. ✅ Instalar Vercel CLI
2. ✅ Iniciar Vercel Dev
3. ✅ Testar geração de PDF
4. 📖 Ler `DEV_LOCAL_PUPPETEER.md` para detalhes
5. 🚀 Deploy para produção quando pronto

---

## Resumo

| Comando | Porta | API PDF | Velocidade |
|---------|-------|---------|------------|
| `npm run dev` | 8080 | ❌ | ⚡⚡⚡ |
| `vercel dev` | 3000 | ✅ | ⚡⚡ |
| Ambos | 8080 | ✅ | ⚡⚡⚡ |

**Recomendação**: Use `vercel dev` para testar a API de PDF.

---

**Dúvidas?** Consulte `DEV_LOCAL_PUPPETEER.md` para documentação completa.
