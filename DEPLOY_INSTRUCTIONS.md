# 🚀 Instruções de Deploy - Sistema PDF Puppeteer

## ✅ Pré-requisitos

- [x] Migração completa realizada
- [x] Build funcionando sem erros
- [x] Dependências instaladas
- [x] Configuração Vercel criada

---

## 📦 Deploy para Vercel

### 1. Verificar Configuração

Certifique-se de que o arquivo `vercel.json` existe na raiz do projeto:

```json
{
  "functions": {
    "api/pdf/generate.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### 2. Instalar Vercel CLI (se necessário)

```bash
npm install -g vercel
```

### 3. Login no Vercel

```bash
vercel login
```

### 4. Deploy para Produção

```bash
# Deploy direto para produção
vercel --prod

# Ou deploy para preview primeiro
vercel

# Depois promover para produção
vercel --prod
```

### 5. Verificar Deploy

Após o deploy, você receberá uma URL. Teste o endpoint:

```bash
curl -X POST https://seu-app.vercel.app/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Teste</h1>","filename":"teste.pdf"}' \
  --output teste.pdf
```

---

## 🧪 Testes Pós-Deploy

### 1. Testar Endpoint API

```bash
# Teste básico
curl -X POST https://seu-app.vercel.app/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<html><body><h1>Teste</h1></body></html>",
    "filename": "teste.pdf"
  }' \
  --output teste.pdf

# Verificar se o PDF foi gerado
ls -lh teste.pdf
```

### 2. Testar no Frontend

1. Acesse a página de exemplo: `https://seu-app.vercel.app/admin/exemplo-pdf`
2. Clique em "Baixar PDF de Exemplo"
3. Verifique se o PDF foi baixado corretamente
4. Abra o PDF e valide a fidelidade visual

### 3. Testar Geração de Books

1. Acesse a página de Books
2. Selecione um book
3. Clique em "Gerar PDF"
4. Verifique se o PDF foi gerado com layout correto

---

## ⚙️ Configurações Avançadas

### Aumentar Timeout (se necessário)

Se PDFs complexos estão dando timeout, aumente o `maxDuration`:

```json
{
  "functions": {
    "api/pdf/generate.ts": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
}
```

### Aumentar Memória (se necessário)

Para PDFs muito grandes:

```json
{
  "functions": {
    "api/pdf/generate.ts": {
      "memory": 3008,
      "maxDuration": 30
    }
  }
}
```

### Configurar Variáveis de Ambiente

Se necessário, adicione variáveis de ambiente no Vercel Dashboard:

```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

---

## 🐛 Troubleshooting

### Erro: "Function timeout"

**Causa**: PDF muito complexo ou muitas imagens pesadas.

**Solução**:
1. Aumentar `maxDuration` no `vercel.json`
2. Otimizar imagens (usar WebP, comprimir)
3. Simplificar HTML/CSS

### Erro: "Out of memory"

**Causa**: PDF muito grande ou muitas páginas.

**Solução**:
1. Aumentar `memory` no `vercel.json`
2. Dividir PDF em partes menores
3. Otimizar imagens

### Erro: "Chromium not found"

**Causa**: `@sparticuz/chromium` não instalado corretamente.

**Solução**:
```bash
npm install @sparticuz/chromium --save
vercel --prod
```

### Erro: "Fonts not loading"

**Causa**: Fontes Google não carregando.

**Solução**:
1. Verificar se `<link>` do Google Fonts está no `<head>`
2. Usar fontes base64 inline como fallback
3. Aumentar timeout para aguardar carregamento

---

## 📊 Monitoramento

### Logs do Vercel

Visualizar logs em tempo real:

```bash
vercel logs https://seu-app.vercel.app
```

### Métricas de Performance

Acessar dashboard do Vercel:
- https://vercel.com/dashboard
- Selecionar projeto
- Ver "Analytics" e "Logs"

### Alertas

Configurar alertas no Vercel Dashboard para:
- Erros 5xx
- Timeouts
- Alto uso de memória

---

## 🔒 Segurança

### Rate Limiting (Recomendado)

Adicionar rate limiting para evitar abuso:

```typescript
// api/pdf/generate.ts
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});

export default limiter(handler);
```

### Autenticação (Recomendado)

Adicionar autenticação para proteger endpoint:

```typescript
// api/pdf/generate.ts
export default async function handler(req, res) {
  // Verificar token
  const token = req.headers.authorization;
  if (!token || !isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Continuar com geração de PDF...
}
```

---

## 📈 Otimizações

### Cache de PDFs (Futuro)

Implementar cache para PDFs gerados frequentemente:

```typescript
// Usar Redis ou Vercel KV
const cachedPDF = await redis.get(`pdf:${hash}`);
if (cachedPDF) {
  return res.send(cachedPDF);
}
```

### Compressão de PDF (Futuro)

Adicionar compressão para reduzir tamanho:

```typescript
import { compress } from 'pdf-lib';

const compressedPDF = await compress(pdf);
```

### Processamento Assíncrono (Futuro)

Para PDFs muito grandes, processar de forma assíncrona:

```typescript
// Retornar job ID imediatamente
const jobId = await createPDFJob(html);
return res.json({ jobId });

// Cliente consulta status depois
GET /api/pdf/status/:jobId
```

---

## 📝 Checklist de Deploy

- [ ] Build local funcionando
- [ ] Testes locais passando
- [ ] `vercel.json` configurado
- [ ] Dependências instaladas
- [ ] Deploy para preview realizado
- [ ] Testes no preview passando
- [ ] Deploy para produção realizado
- [ ] Testes em produção passando
- [ ] Logs verificados
- [ ] Performance validada
- [ ] Documentação atualizada

---

## 🎯 Próximos Passos Após Deploy

1. ✅ Validar fidelidade visual dos PDFs
2. ✅ Monitorar performance (tempo de geração)
3. ✅ Coletar feedback dos usuários
4. ⏳ Implementar melhorias baseadas no feedback
5. ⏳ Adicionar cache de PDFs
6. ⏳ Implementar rate limiting
7. ⏳ Adicionar autenticação
8. ⏳ Migrar outros relatórios

---

## 📞 Suporte

### Documentação
- `MIGRACAO_PUPPETEER.md` - Guia de migração
- `README_PUPPETEER.md` - Documentação técnica
- `RESUMO_MIGRACAO.md` - Resumo da migração

### Logs e Debug
```bash
# Ver logs em tempo real
vercel logs https://seu-app.vercel.app --follow

# Ver logs de uma função específica
vercel logs https://seu-app.vercel.app --function=api/pdf/generate.ts
```

### Contato
- Vercel Support: https://vercel.com/support
- Puppeteer Issues: https://github.com/puppeteer/puppeteer/issues
- Chromium Issues: https://github.com/Sparticuz/chromium/issues

---

**Deploy realizado com sucesso! 🎉**

Sistema de geração de PDF com Puppeteer está pronto para produção.
