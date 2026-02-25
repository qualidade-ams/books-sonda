# Melhorias no Layout do PDF - Books SND

## 📋 Resumo das Correções Implementadas

Este documento detalha as correções aplicadas ao sistema de geração de PDF para eliminar bordas brancas, ajustar logos e evitar sobreposição de informações com a paginação.

---

## ✅ Problemas Corrigidos

### 1. **Bordas Brancas Eliminadas**

**Problema**: PDF apresentava bordas brancas nas laterais e superior/inferior.

**Solução**:
- ✅ Fundos azul e branco da capa agora vão até as bordas (0, 0 até pageWidth, pageHeight)
- ✅ Margens laterais reduzidas de 25mm para 20mm nas páginas internas
- ✅ Margem superior reduzida de 20mm para 15mm em todas as páginas
- ✅ Rodapé ajustado para 8mm da borda inferior (antes era 10mm)

```typescript
// ANTES (com bordas brancas)
doc.rect(10, 10, pageWidth - 20, alturaSuperior, 'F'); // Deixava 10mm de borda

// DEPOIS (sem bordas)
doc.rect(0, 0, pageWidth, alturaSuperior, 'F'); // Vai até as bordas
```

---

### 2. **Logos Ajustadas**

**Problema**: Logos muito grandes ou mal posicionadas, causando sobreposição.

**Solução**:

#### Logo N (Capa - Parte Azul)
- ✅ Tamanho reduzido de 140x160mm para 120x140mm (mais proporcional)
- ✅ Posicionamento ajustado: 20mm da borda direita (antes 10mm)
- ✅ Centralização vertical otimizada

```typescript
// Logo N - Tamanhos otimizados
const logoWidth = 120;  // Reduzido de 140
const logoHeight = 140; // Reduzido de 160
const logoX = pageWidth - logoWidth - 20; // Mais espaço da borda
const logoY = (alturaSuperior - logoHeight) / 2; // Centralizado
```

#### Logo Sonda (Capa - Parte Branca)
- ✅ Tamanho mantido em 50x25mm (proporcional)
- ✅ Posicionamento ajustado: 70mm da borda direita (antes 60mm)
- ✅ Alinhamento vertical com caixa do período

```typescript
// Logo Sonda - Posicionamento otimizado
const logoSondaX = pageWidth - 70; // Mais espaço da borda
const logoSondaY = periodoBoxY + 2; // Alinhado com período
const logoSondaWidth = 50;
const logoSondaHeight = 25;
```

---

### 3. **Sobreposição de Dados com Paginação Corrigida**

**Problema**: Informações das páginas sobrepunham o rodapé com número de página.

**Solução**:

#### Capa (Página 1)
- ✅ Rodapé próprio integrado ao layout da capa
- ✅ Área branca inferior reduzida para 30% (antes 35%)
- ✅ Espaço reservado de 15mm para rodapé
- ✅ Informações de "Fonte: Aranda" e paginação não sobrepõem

```typescript
// Capa - Distribuição de espaço otimizada
const alturaSuperior = pageHeight * 0.70; // 70% azul
const alturaInferior = pageHeight - alturaSuperior - 15; // 30% branco - 15mm rodapé

// Rodapé da capa
const yRodape = pageHeight - 10; // 10mm da borda
doc.text('Fonte: Aranda', margemEsquerda, yRodape - 4);
doc.text(`Gerado em ${dataGeracao}...`, margemEsquerda, yRodape);
doc.text(`Página 1 de 6`, pageWidth - margemEsquerda, yRodape, { align: 'right' });
```

#### Páginas Internas (2-6)
- ✅ Margem inferior reservada de 20mm para rodapé
- ✅ Conteúdo inicia em yPos = 15mm (antes 20mm)
- ✅ Rodapé posicionado em pageHeight - 8mm
- ✅ Linha separadora em pageHeight - 12mm
- ✅ Capa (página 1) pulada no loop de rodapé (tem rodapé próprio)

```typescript
// Páginas internas - Espaçamento otimizado
const margemInferior = 20; // Reservar espaço para rodapé
let yPos = 15; // Margem superior reduzida

// Rodapé das páginas internas
private adicionarRodape(doc: jsPDF) {
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Pular capa (página 1) - ela tem rodapé próprio
    if (i === 1) continue;
    
    // Linha separadora
    doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
    
    // Texto do rodapé
    doc.setFontSize(7); // Fonte menor
    doc.text(`Gerado em ${dataGeracao}...`, 15, pageHeight - 8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  }
}
```

---

## 📐 Especificações Técnicas

### Dimensões do PDF (Landscape A4)
- **Largura**: 297mm
- **Altura**: 210mm
- **Orientação**: Horizontal (landscape)

### Margens Padronizadas

#### Capa (Página 1)
```
┌─────────────────────────────────────────┐
│ PARTE AZUL (70% altura)                 │ 0mm topo
│ - Logo N: 120x140mm                     │
│ - Texto: 20mm da esquerda               │
│                                         │
├─────────────────────────────────────────┤ 147mm
│ PARTE BRANCA (30% altura - 15mm rodapé)│
│ - Período: 20mm da esquerda             │
│ - Logo Sonda: 70mm da direita           │
│                                         │
├─────────────────────────────────────────┤ 195mm
│ RODAPÉ (15mm)                           │
│ - Fonte: Aranda                         │
│ - Gerado em... | Página 1 de 6          │
└─────────────────────────────────────────┘ 210mm
```

#### Páginas Internas (2-6)
```
┌─────────────────────────────────────────┐
│ MARGEM SUPERIOR (15mm)                  │ 0mm topo
├─────────────────────────────────────────┤ 15mm
│                                         │
│ CONTEÚDO DA PÁGINA                      │
│ - Margens laterais: 15-20mm             │
│ - Espaço disponível: ~175mm altura      │
│                                         │
│                                         │
├─────────────────────────────────────────┤ 198mm
│ LINHA SEPARADORA                        │
├─────────────────────────────────────────┤ 202mm
│ RODAPÉ (8mm)                            │
│ Gerado em... | Página X de 6            │
└─────────────────────────────────────────┘ 210mm
```

---

## 🎨 Ajustes de Fontes e Tamanhos

### Capa
- **Nome da Empresa**: 38pt (reduzido de 40pt)
- **"Book Mensal"**: 38pt bold (reduzido de 40pt)
- **Período**: 28pt bold (reduzido de 30pt)
- **Rodapé**: 8pt normal

### Páginas Internas
- **Títulos**: 20pt bold
- **Subtítulos**: 10pt normal
- **Rodapé**: 7pt normal (reduzido de 8pt)

---

## 🔍 Checklist de Validação

Use este checklist para validar o PDF gerado:

### Capa
- [ ] Fundo azul vai até as bordas (sem branco nas laterais)
- [ ] Logo N visível e proporcional (120x140mm)
- [ ] Logo N não sobrepõe texto "Book Mensal"
- [ ] Fundo branco vai até as bordas (sem branco nas laterais)
- [ ] Logo Sonda visível e proporcional (50x25mm)
- [ ] Caixa do período não sobrepõe logo Sonda
- [ ] Rodapé legível e não sobrepõe conteúdo
- [ ] "Página 1 de 6" alinhado à direita

### Páginas Internas (2-6)
- [ ] Sem bordas brancas nas laterais
- [ ] Títulos não cortados no topo
- [ ] Conteúdo não sobrepõe rodapé
- [ ] Linha separadora visível
- [ ] Rodapé legível (fonte 7pt)
- [ ] Numeração de página correta

### Geral
- [ ] Todas as 6 páginas geradas
- [ ] Orientação horizontal em todas as páginas
- [ ] Cores Sonda corretas (#2563eb, #ea580c, #9333ea)
- [ ] Imagens carregadas corretamente
- [ ] Sem sobreposições de texto

---

## 📝 Notas Técnicas

### Carregamento de Imagens
As imagens são carregadas de forma assíncrona e convertidas para base64:

```typescript
private async carregarImagem(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      }
    };
    img.onerror = () => reject(new Error(`Erro ao carregar: ${url}`));
    img.src = url;
  });
}
```

### Fallback de Imagens
Se as imagens não carregarem, o sistema usa texto como fallback:
- **Logo N**: Texto "N" em fonte 180pt bold branca
- **Logo Sonda**: Texto "SONDA" + "make it easy" em azul

---

## 🚀 Próximos Passos

1. ✅ Testar geração completa do PDF
2. ✅ Validar com usuário final
3. ⏳ Ajustar outras abas se necessário (SLA, Backlog, Pesquisa)
4. ⏳ Adicionar gráficos nas abas (se solicitado)

---

## 📊 Comparação Antes/Depois

### Antes
- ❌ Bordas brancas de 10-25mm em todas as laterais
- ❌ Logo N muito grande (140x160mm) e muito próxima da borda
- ❌ Logo Sonda muito próxima da borda direita
- ❌ Rodapé sobrepondo conteúdo em algumas páginas
- ❌ Margem superior de 20mm desperdiçando espaço

### Depois
- ✅ Sem bordas brancas (fundos vão até as bordas)
- ✅ Logo N proporcional (120x140mm) com 20mm de margem
- ✅ Logo Sonda bem posicionada (70mm da borda)
- ✅ Rodapé em área reservada (não sobrepõe)
- ✅ Margem superior otimizada (15mm)
- ✅ Mais espaço para conteúdo (~175mm de altura útil)

---

**Última atualização**: 2026-02-24  
**Arquivo**: `src/services/booksPDFService.ts`  
**Status**: ✅ Implementado e testado
