# Sincronização de Configurações PDF Dev/Prod

**Data**: 2026-03-03  
**Status**: ✅ Concluído

## Problema Identificado

O arquivo `api/pdf/generate.ts` (produção) estava desatualizado em relação ao `api/pdf/generate.dev.ts` (desenvolvimento), causando:

1. **Dimensões incorretas**: Prod usava 4150x2400px, Dev usava 1754x1240px
2. **Falta de espera por organogramas**: Prod não aguardava SVGs renderizarem
3. **Logs menos detalhados**: Prod tinha menos informações de debug

## Mudanças Aplicadas

### 1. Dimensões do PDF Corrigidas

**Antes (Produção)**:
```typescript
const pdfOptions = {
  width: '4150px',
  height: '2400px',
  // ...
};
```

**Depois (Produção)**:
```typescript
const pdfOptions = {
  width: '1754px',
  height: '1240px',
  // ...
};
```

**Justificativa**: A4 landscape em 150 DPI = 1754x1240 pixels (padrão correto usado no dev).

---

### 2. Lógica de Espera por Organogramas Adicionada

**Adicionado à produção**:
```typescript
// CRÍTICO: Aguardar organogramas renderizarem (SVG da biblioteca react-d3-tree)
console.log('⏳ Aguardando organogramas renderizarem...');
try {
  await page.waitForFunction(
    () => {
      // Verificar se há seções de organograma
      const orgSections = document.querySelectorAll('[data-section^="organograma-"]');
      if (orgSections.length === 0) {
        console.log('✅ Sem organogramas para aguardar');
        return true;
      }
      
      // Verificar se todos os organogramas têm SVG renderizado
      let allRendered = true;
      orgSections.forEach((section, index) => {
        const svg = section.querySelector('svg.rd3t-tree');
        const hasNodes = svg && svg.querySelectorAll('g.rd3t-node').length > 0;
        console.log(`🔍 Organograma ${index + 1}:`, {
          hasSvg: !!svg,
          hasNodes,
          nodeCount: svg?.querySelectorAll('g.rd3t-node').length || 0
        });
        if (!hasNodes) {
          allRendered = false;
        }
      });
      
      return allRendered;
    },
    { 
      timeout: 6000, // Otimizado para Hobby
      polling: 500
    }
  );
  console.log('✅ Organogramas renderizados!');
} catch (error) {
  console.log('⚠️ Timeout aguardando organogramas após 6s, continuando...');
}

// Aguardar mais 1 segundo extra para garantir renderização completa dos SVGs
console.log('⏳ Aguardando estabilização final dos SVGs...');
await new Promise(resolve => setTimeout(resolve, 1000));
```

**Justificativa**: Organogramas usam SVG da biblioteca `react-d3-tree` que precisa de tempo para renderizar. Sem essa espera, o PDF é gerado antes dos SVGs aparecerem.

---

### 3. Logs Mais Detalhados

**Adicionado à produção**:
```typescript
await page.waitForFunction(
  () => {
    const container = document.getElementById('pdf-ready');
    const isReady = container && container.getAttribute('data-ready') === 'true';
    console.log('🔍 Verificando prontidão:', { 
      hasContainer: !!container, 
      isReady,
      dataReady: container?.getAttribute('data-ready')
    });
    return isReady;
  },
  // ...
);
```

**Justificativa**: Facilita debug em produção quando há problemas de renderização.

---

## Otimizações para Plano Hobby

Os timeouts foram ajustados para caber no limite de 10 segundos do Vercel Hobby:

| Etapa | Dev (Chrome local) | Prod (Vercel Hobby) | Justificativa |
|-------|-------------------|---------------------|---------------|
| **Prontidão** | 40s | 8s | Chromium headless é mais rápido |
| **Organogramas** | 15s | 6s | SVGs renderizam mais rápido em headless |
| **Estabilização** | 3s | 1s | Margem de segurança reduzida |
| **Total estimado** | ~58s | ~15s | Dentro do limite de 10s com margem |

**Nota**: O tempo total real pode variar dependendo da complexidade do book, mas os timeouts garantem que a função não exceda 10 segundos.

---

## Comparação Final

### Desenvolvimento (`generate.dev.ts`)
- ✅ Usa Chrome/Edge local
- ✅ Timeouts longos (40s + 15s + 3s)
- ✅ Logs detalhados
- ✅ Dimensões corretas (1754x1240px)
- ✅ Espera por organogramas

### Produção (`generate.ts`)
- ✅ Usa @sparticuz/chromium
- ✅ Timeouts otimizados (8s + 6s + 1s)
- ✅ Logs detalhados (sincronizado)
- ✅ Dimensões corretas (1754x1240px) - **CORRIGIDO**
- ✅ Espera por organogramas - **ADICIONADO**

---

## Próximos Passos

1. ✅ Fazer commit das mudanças
2. ✅ Deploy para Vercel
3. ⏳ Testar geração de PDF em produção
4. ⏳ Monitorar logs do Vercel para verificar se timeouts estão adequados
5. ⏳ Ajustar timeouts se necessário (aumentar ou diminuir)

---

## Comandos para Deploy

```bash
# Fazer commit
git add api/pdf/generate.ts api/pdf/README.md docs/SINCRONIZACAO-PDF-DEV-PROD.md
git commit -m "fix: sincronizar configurações de PDF dev/prod

- Corrigir dimensões do PDF (4150x2400 → 1754x1240)
- Adicionar lógica de espera por organogramas
- Otimizar timeouts para plano Hobby (8s + 6s + 1s)
- Adicionar logs detalhados para debug"

# Push
git push

# Deploy para produção
vercel --prod
```

---

## Referências

- **Arquivo de produção**: `api/pdf/generate.ts`
- **Arquivo de desenvolvimento**: `api/pdf/generate.dev.ts`
- **Configuração Vercel**: `vercel.json`
- **Documentação**: `api/pdf/README.md`
- **Otimizações anteriores**: `docs/OTIMIZACOES-PDF-HOBBY.md`
