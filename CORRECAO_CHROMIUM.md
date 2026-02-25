# 🔧 Correção: Propriedades do @sparticuz/chromium

## Problema Identificado

O código estava tentando usar propriedades que não existem no pacote `@sparticuz/chromium`:
- ❌ `chromium.defaultViewport` - Não existe
- ❌ `chromium.headless` - Não existe

## Solução Aplicada

### Antes (Incorreto)
```typescript
browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport, // ❌ Erro
  executablePath: await chromium.executablePath(),
  headless: chromium.headless, // ❌ Erro
});
```

### Depois (Correto)
```typescript
browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true, // ✅ Valor direto
});
```

## Propriedades Válidas do @sparticuz/chromium

O pacote `@sparticuz/chromium` fornece apenas:

1. **`chromium.args`** - Array de argumentos otimizados para serverless
2. **`chromium.executablePath()`** - Função que retorna o caminho do executável

## Configuração Recomendada

```typescript
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true, // Sempre true em produção
});
```

## Resultado

✅ Build compilando sem erros
✅ TypeScript validando corretamente
✅ Código pronto para deploy no Vercel

## Arquivos Corrigidos

- `api/pdf/generate.ts` - Removidas propriedades inexistentes

## Referências

- [@sparticuz/chromium](https://github.com/Sparticuz/chromium) - Documentação oficial
- [Puppeteer Core](https://pptr.dev/) - Documentação do Puppeteer

---

**Status**: ✅ Corrigido e testado
**Data**: 2026-01-20
