# API de Geração de PDF

## ⚡ VERSÃO HÍBRIDA OTIMIZADA

A API agora detecta automaticamente o ambiente e escolhe a melhor opção:

- **Desenvolvimento Local**: Usa Chrome/Edge instalado (⚡ RÁPIDO - inicia em 2-3s)
- **Produção (Vercel)**: Usa `@sparticuz/chromium` (✅ AUTOMÁTICO)

## Como Funciona

### Desenvolvimento Local (`vercel dev`)

1. Detecta que está em ambiente local
2. Busca Chrome/Edge no seu sistema (usa cache após primeira busca)
3. Inicia navegador local (muito mais rápido que @sparticuz/chromium)
4. ✅ API pronta em 2-3 segundos!

### Produção (Vercel)

1. Detecta que está no Vercel (`process.env.VERCEL === '1'`)
2. Carrega `@sparticuz/chromium` automaticamente
3. Usa navegador otimizado para serverless
4. ✅ Funciona perfeitamente em produção!

## 🚀 Configuração Rápida

### 1. Configure o caminho do navegador (opcional mas recomendado)

Edite `.env.local` e defina o caminho do seu navegador:

```env
# Windows - Edge (recomendado)
BROWSER_PATH="C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"

# Windows - Chrome
# BROWSER_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

# macOS - Chrome
# BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Linux - Chrome
# BROWSER_PATH="/usr/bin/google-chrome"
```

### 2. Inicie o servidor

```bash
vercel dev
```

Agora deve iniciar em **2-3 segundos** em vez de 30-60 segundos! 🎉

## 🔍 Descobrir Caminho do Navegador

Se não souber o caminho do navegador, use o script auxiliar:

```bash
node scripts/find-browser.cjs
```

Ou busque manualmente:

**Windows:**
- Edge: `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
- Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`

**macOS:**
- Chrome: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Edge: `/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`

**Linux:**
- Chrome: `/usr/bin/google-chrome`
- Chromium: `/usr/bin/chromium-browser`

## 📊 Comparação de Performance

| Ambiente | Navegador | Tempo de Início | Observações |
|----------|-----------|-----------------|-------------|
| Dev (sem BROWSER_PATH) | Busca automática | ~5-10s | Busca em múltiplos caminhos |
| Dev (com BROWSER_PATH) | Chrome/Edge local | ⚡ 2-3s | Usa cache após primeira busca |
| Produção (Vercel) | @sparticuz/chromium | ~3-5s | Otimizado para serverless |

## 🎯 Vantagens da Abordagem Híbrida

✅ **Desenvolvimento rápido**: Chrome local inicia instantaneamente  
✅ **Produção confiável**: @sparticuz/chromium otimizado para Vercel  
✅ **Automático**: Detecta ambiente e escolhe a melhor opção  
✅ **Sem configuração extra**: Funciona out-of-the-box  
✅ **Cache inteligente**: Caminho do navegador é cacheado após primeira busca

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

## 🔧 Troubleshooting

### ❌ Problema: Ainda demora para subir

**Solução 1**: Defina `BROWSER_PATH` no `.env.local`
```env
BROWSER_PATH="C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
```

**Solução 2**: Verifique se o navegador está instalado
```bash
node scripts/find-browser.cjs
```

### ❌ Problema: "Chrome ou Edge não encontrado"

**Causa**: Nenhum navegador compatível instalado.

**Solução**: Instale Chrome ou Edge:
- Chrome: https://www.google.com/chrome/
- Edge: https://www.microsoft.com/edge/

### ❌ Problema: PDF não gera em produção

**Causa**: Erro no @sparticuz/chromium.

**Solução**: Verifique os logs do Vercel:
```bash
vercel logs
```

### ❌ Problema: "Function exceeded memory limit"

**Causa**: PDF muito complexo para 2048 MB.

**Soluções**:
1. Otimizar imagens (comprimir)
2. Reduzir complexidade do organograma
3. Upgrade para Vercel Pro (3008 MB)

### ❌ Problema: "Function invocation timeout"

**Causa**: PDF demora mais de 10 segundos para gerar.

**Soluções**:
1. Otimizar carregamento de dados
2. Reduzir número de imagens
3. Upgrade para Vercel Pro (60 segundos)

---

**Última atualização**: 2026-03-04

**Versão Híbrida Implementada**: 2026-03-04
- ✅ Desenvolvimento: Chrome/Edge local (⚡ 2-3s)
- ✅ Produção: @sparticuz/chromium (automático)
- ✅ Detecção automática de ambiente
- ✅ Cache inteligente do caminho do navegador
- ✅ Dimensões do PDF: 1754x1240px (A4 landscape em 150 DPI)
- ✅ Timeouts otimizados: 8s + 6s + 1s = ~15s total
