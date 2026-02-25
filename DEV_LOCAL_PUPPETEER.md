# 🛠️ Desenvolvimento Local - API Puppeteer PDF

## Problema

Em desenvolvimento local com `npm run dev`, a API `/api/pdf/generate` retorna 404 porque o Vite não serve arquivos da pasta `api/`.

## Soluções

### ✅ Solução 1: Usar Vercel Dev (Recomendado)

O Vercel Dev simula o ambiente de produção localmente, incluindo as serverless functions.

#### Instalação

```bash
# Instalar Vercel CLI globalmente
npm install -g vercel

# Ou usar npx (sem instalação global)
npx vercel dev
```

#### Uso

```bash
# Iniciar servidor de desenvolvimento com Vercel
vercel dev

# Ou com npx
npx vercel dev
```

O servidor estará disponível em: `http://localhost:3000`

#### Vantagens
- ✅ Ambiente idêntico à produção
- ✅ Testa serverless functions localmente
- ✅ Suporta variáveis de ambiente
- ✅ Hot reload automático

#### Desvantagens
- ⚠️ Mais lento que `npm run dev`
- ⚠️ Requer instalação do Vercel CLI

---

### ✅ Solução 2: Proxy Vite + Vercel Dev em Paralelo

Execute dois servidores em paralelo:

#### Terminal 1: Vercel Dev (porta 3000)
```bash
vercel dev --listen 3000
```

#### Terminal 2: Vite Dev (porta 8080)
```bash
npm run dev
```

O Vite (porta 8080) fará proxy das requisições `/api/*` para o Vercel Dev (porta 3000).

#### Configuração (já aplicada)

```typescript
// vite.config.ts
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

#### Vantagens
- ✅ Vite rápido para frontend
- ✅ API funcional para testes
- ✅ Hot reload em ambos

#### Desvantagens
- ⚠️ Requer dois terminais
- ⚠️ Mais complexo de gerenciar

---

### ⚠️ Solução 3: Fallback para Desenvolvimento (Temporário)

Para desenvolvimento rápido sem API, use o serviço antigo temporariamente.

#### Criar arquivo de configuração

```typescript
// src/config/pdfService.ts
import { booksPDFServicePuppeteer } from '@/services/booksPDFServicePuppeteer';
import { booksPDFService } from '@/services/booksPDFService'; // Serviço antigo

// Usar Puppeteer apenas em produção
export const pdfService = import.meta.env.PROD 
  ? booksPDFServicePuppeteer 
  : booksPDFService;
```

#### Usar no código

```typescript
// BookViewer.tsx
import { pdfService } from '@/config/pdfService';

const handleDownloadPDF = async () => {
  await pdfService.baixarPDF(bookData);
};
```

#### Vantagens
- ✅ Desenvolvimento rápido
- ✅ Não requer Vercel Dev

#### Desvantagens
- ❌ Não testa API real
- ❌ Comportamento diferente em dev/prod
- ❌ Mantém dependência antiga

---

## Recomendação

### Para Desenvolvimento Diário
Use **Solução 2** (Proxy Vite + Vercel Dev):

```bash
# Terminal 1
vercel dev --listen 3000

# Terminal 2
npm run dev
```

Acesse: `http://localhost:8080`

### Para Testes Rápidos de UI
Use **Solução 3** (Fallback temporário) se não precisar testar a geração de PDF.

### Para Testes de Produção
Use **Solução 1** (Vercel Dev apenas):

```bash
vercel dev
```

Acesse: `http://localhost:3000`

---

## Scripts NPM Úteis

Adicione ao `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:vercel": "vercel dev",
    "dev:full": "concurrently \"vercel dev --listen 3000\" \"vite\"",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### Instalar Concurrently (para dev:full)

```bash
npm install --save-dev concurrently
```

### Usar

```bash
# Desenvolvimento normal (sem API)
npm run dev

# Desenvolvimento com Vercel Dev
npm run dev:vercel

# Desenvolvimento completo (Vite + Vercel Dev)
npm run dev:full
```

---

## Troubleshooting

### Erro: "vercel: command not found"

**Solução**: Instalar Vercel CLI
```bash
npm install -g vercel
```

### Erro: "Port 3000 already in use"

**Solução**: Usar outra porta
```bash
vercel dev --listen 3001
```

E atualizar proxy no `vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
  }
}
```

### Erro: "Proxy error"

**Solução**: Verificar se Vercel Dev está rodando
```bash
# Terminal 1
vercel dev --listen 3000

# Terminal 2 (aguardar Vercel Dev iniciar)
npm run dev
```

### PDF não gera em desenvolvimento

**Causa**: API não está rodando

**Solução**: Usar uma das soluções acima (Vercel Dev ou Fallback)

---

## Checklist de Desenvolvimento

- [ ] Vercel CLI instalado (`npm install -g vercel`)
- [ ] Proxy configurado no `vite.config.ts`
- [ ] Dois terminais abertos (Vercel Dev + Vite)
- [ ] Vercel Dev rodando na porta 3000
- [ ] Vite rodando na porta 8080
- [ ] Testar endpoint: `http://localhost:8080/api/pdf/generate`
- [ ] Testar geração de PDF no frontend

---

## Exemplo de Teste Manual

### 1. Iniciar servidores

```bash
# Terminal 1
vercel dev --listen 3000

# Terminal 2
npm run dev
```

### 2. Testar API diretamente

```bash
curl -X POST http://localhost:8080/api/pdf/generate \
  -H "Content-Type: application/json" \
  -d '{"html":"<h1>Teste</h1>","filename":"teste.pdf"}' \
  --output teste.pdf
```

### 3. Testar no frontend

1. Acessar: `http://localhost:8080`
2. Navegar para página de Books
3. Clicar em "Gerar PDF"
4. Verificar se PDF é gerado

---

## Resumo

| Solução | Velocidade | Fidelidade | Complexidade |
|---------|-----------|------------|--------------|
| Vercel Dev | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| Proxy Vite + Vercel | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Fallback Temporário | ⭐⭐⭐ | ⭐ | ⭐ |

**Recomendação**: Use **Proxy Vite + Vercel Dev** para melhor experiência de desenvolvimento.

---

**Próximos Passos**:
1. Instalar Vercel CLI
2. Configurar scripts NPM
3. Testar geração de PDF localmente
4. Deploy para produção quando estiver pronto
