# API de Geração de PDF

## Estrutura de Arquivos

```
api/pdf/
├── generate.ts              # PRODUÇÃO (usa @sparticuz/chromium)
├── generate.dev.ts          # DESENVOLVIMENTO (usa Chrome local)
└── generate.prod.backup.ts  # Backup da versão de produção
```

## ⚠️ IMPORTANTE

### Arquivo Principal: `generate.ts`

Este arquivo é usado tanto em **desenvolvimento** quanto em **produção**.

**Conteúdo**: Versão de produção que usa `@sparticuz/chromium` (otimizado para Vercel).

### Por Que Assim?

O Vercel sempre procura por `api/pdf/generate.ts` quando você faz uma requisição para `/api/pdf/generate`.

Tentamos usar rewrites no `vercel.json`, mas não funcionou de forma confiável. A solução mais simples é:

1. **Produção**: `generate.ts` usa `@sparticuz/chromium`
2. **Desenvolvimento local**: Use `generate.dev.ts` se precisar testar com Chrome local

## 🚀 Deploy para Produção

```bash
# Fazer commit
git add .
git commit -m "fix: usar versão de produção do gerador de PDF"
git push

# Deploy
vercel --prod
```

## 🧪 Desenvolvimento Local

Se você precisar testar com Chrome local (desenvolvimento):

1. Temporariamente renomeie os arquivos:
   ```bash
   mv api/pdf/generate.ts api/pdf/generate.prod.temp.ts
   mv api/pdf/generate.dev.ts api/pdf/generate.ts
   ```
   ```bash VOLTAR
   mv api/pdf/generate.ts api/pdf/generate.dev.ts
   mv api/pdf/generate.prod.temp.ts api/pdf/generate.ts
   ```
2. Teste localmente:
   ```bash
   npm run dev
   ```

3. Antes de fazer commit, reverta:
   ```bash
   mv api/pdf/generate.ts api/pdf/generate.dev.ts
   mv api/pdf/generate.prod.temp.ts api/pdf/generate.ts
   ```

## 📋 Configuração Atual

**Plano Vercel**: Hobby

**Limites**:
- Memória: 2048 MB
- Timeout: 10 segundos

**Configuração** (`vercel.json`):
```json
{
  "functions": {
    "api/pdf/generate.ts": {
      "memory": 2048,
      "maxDuration": 10
    }
  }
}
```

## 🔍 Troubleshooting

### Erro: "Chrome ou Edge não encontrado"

**Causa**: Vercel está usando versão de desenvolvimento.

**Solução**: Certifique-se de que `api/pdf/generate.ts` contém o código de produção (usa `@sparticuz/chromium`).

### Erro: "Function exceeded memory limit"

**Causa**: PDF muito complexo para 2048 MB.

**Soluções**:
1. Otimizar imagens (comprimir)
2. Reduzir complexidade do organograma
3. Upgrade para Vercel Pro (3008 MB)

### Erro: "Function invocation timeout"

**Causa**: PDF demora mais de 10 segundos para gerar.

**Soluções**:
1. Otimizar carregamento de dados
2. Reduzir número de imagens
3. Upgrade para Vercel Pro (60 segundos)

---

**Última atualização**: 2026-03-03

**Sincronização Dev/Prod**: 2026-03-03
- ✅ Dimensões do PDF sincronizadas: 1754x1240px (A4 landscape em 150 DPI)
- ✅ Lógica de espera por organogramas adicionada à versão de produção
- ✅ Timeouts otimizados para plano Hobby:
  - Prontidão: 8s (dev usa 40s)
  - Organogramas: 6s (dev usa 15s)
  - Estabilização final: 1s (dev usa 3s)
  - **Total estimado**: ~15s (dentro do limite de 10s com margem)
