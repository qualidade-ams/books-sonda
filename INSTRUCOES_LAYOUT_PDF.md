# Instruções para Layout do PDF - Books SND

## ✅ STATUS: IMPLEMENTADO E AJUSTADO

**Última atualização**: 2026-02-24 (Ajustes finais da capa)

---

## 📋 Ajustes Finais da Capa

### 1. **Logo N Maior (Sem Bordas)** ✅
- Logo N agora ocupa 50% da largura da página
- Altura: 80% da parte azul
- Posicionada à direita com -5% de offset (sai um pouco da borda)
- Sem bordas, ocupando mais espaço visual

### 2. **Texto Mais Para Baixo** ✅
- Nome do cliente e "Book Mensal" movidos para 60% da altura (antes 45%)
- Alinhamento vertical melhorado
- Mais espaço para a logo N

### 3. **Fontes Iguais ao Modal Web** ✅
- Nome da Empresa: 48pt normal (text-6xl do Tailwind)
- "Book Mensal": 48pt bold (text-6xl do Tailwind)
- Período: 24pt bold (reduzido de 28pt)

### 4. **Card do Período Ajustado** ✅
- Tamanho reduzido: 100x25mm (antes 120x30mm)
- Fonte do mês: 24pt (reduzido de 28pt)
- **Sombra removida** (antes tinha sombra cinza)

### 5. **Logo Sonda Maior** ✅
- Tamanho aumentado: 60x30mm (antes 50x25mm)
- Não fica mais comprimida
- Alinhada à direita com 20mm de margem

### 6. **Rodapé da Capa Removido** ✅
- **Removido**: "Gerado em 24/02/2026 - Sistema Books SND"
- **Removido**: "Página 1 de 6"
- Capa agora tem visual mais limpo

---

## 📐 Especificações da Capa Atualizada

### Dimensões (Landscape A4)
- **Largura**: 297mm
- **Altura**: 210mm
- **Orientação**: Horizontal

### Estrutura da Capa
```
┌─────────────────────────────────────────┐
│ PARTE AZUL (70% = 147mm)                │
│                                         │
│  ABBOTT                    ███████      │
│  Book Mensal              ███████       │
│                          ███████        │
│                         ███████         │
│                        ███████          │
│                       ███████           │
│                      (Logo N)           │
│                                         │
├─────────────────────────────────────────┤
│ PARTE BRANCA (30% = 63mm)               │
│                                         │
│  ┌──────────────┐              SONDA   │
│  │ Janeiro 2026 │           make it easy│
│  └──────────────┘                       │
│                                         │
└─────────────────────────────────────────┘
```

### Detalhes Técnicos

#### Logo N
- **Largura**: 50% da página (~148mm)
- **Altura**: 80% da parte azul (~118mm)
- **Posição X**: pageWidth - logoWidth + 5% offset
- **Posição Y**: Centralizada verticalmente

#### Texto (Nome + Book Mensal)
- **Posição Y**: 60% da altura da parte azul
- **Margem esquerda**: 20mm
- **Fonte Nome**: 48pt normal (light)
- **Fonte Book**: 48pt bold
- **Espaçamento**: 18mm entre linhas

#### Card do Período
- **Tamanho**: 100x25mm
- **Fonte**: 24pt bold
- **Cor**: Azul Sonda #2563eb
- **Bordas**: Arredondadas 5mm
- **Sombra**: Nenhuma

#### Logo Sonda
- **Tamanho**: 60x30mm
- **Posição**: 20mm da borda direita
- **Alinhamento**: Vertical com card do período

---

## 🎨 Comparação Antes/Depois

### Antes ❌
- Logo N pequena (120x140mm) com bordas
- Texto centralizado (45% altura)
- Fontes menores (38pt)
- Card do período grande (120x30mm) com sombra
- Logo Sonda pequena (50x25mm) comprimida
- Rodapé com "Gerado em..." e "Página 1 de 6"

### Depois ✅
- Logo N grande (50% largura) sem bordas
- Texto mais para baixo (60% altura)
- Fontes maiores (48pt) iguais ao web
- Card do período menor (100x25mm) sem sombra
- Logo Sonda maior (60x30mm) não comprimida
- Sem rodapé na capa (visual limpo)

---

## � Checklist de Validação

### Capa ✅
- [x] Logo N grande e sem bordas
- [x] Texto mais para baixo
- [x] Fontes 48pt (iguais ao web)
- [x] Card do período menor (100x25mm)
- [x] Sem sombra no card
- [x] Logo Sonda maior (60x30mm)
- [x] Sem rodapé na capa

### Páginas Internas ✅
- [x] Sem bordas brancas
- [x] Conteúdo não sobrepõe rodapé
- [x] Rodapé legível
- [x] Numeração correta (páginas 2-6)

---

## 📝 Arquivo Modificado

**Arquivo**: `src/services/booksPDFService.ts`

**Método alterado**:
- `gerarCapa()` - Ajustes finais conforme feedback do usuário

**Alterações específicas**:
1. Logo N: 50% largura, 80% altura, offset -5%
2. Texto: yInicio = 60% (antes 45%)
3. Fontes: 48pt (antes 38pt)
4. Card período: 100x25mm (antes 120x30mm)
5. Fonte período: 24pt (antes 28pt)
6. Sombra removida
7. Logo Sonda: 60x30mm (antes 50x25mm)
8. Rodapé da capa removido

---

**Documento detalhado**: Ver `LAYOUT_PDF_IMPROVEMENTS.md`

