# ✅ Correções Aplicadas - Segmentação de Empresas

## 🔧 Problema Resolvido

O código TypeScript estava fazendo JOIN com `empresa_segmentacao_id` (coluna antiga que não existe mais), causando erro 400 nas requisições.

---

## 📝 Arquivos Corrigidos

### 1. `src/services/requerimentosService.ts`

**Função `listarRequerimentos()`:**
```typescript
// ❌ ANTES (com JOIN incorreto)
.select(`
  *,
  cliente:empresas_clientes!cliente_id(id, nome_abreviado),
  empresa_segmentacao:empresas_clientes!empresa_segmentacao_id(id, nome_abreviado)
`)

// ✅ DEPOIS (sem JOIN - empresa_segmentacao_nome já vem em r.*)
.select(`
  *,
  cliente:empresas_clientes!cliente_id(id, nome_abreviado)
`)
```

**Função `obterRequerimentoPorId()`:**
- Removido JOIN com `empresa_segmentacao_id`
- Agora busca apenas cliente

**Função `criarRequerimento()`:**
- Já estava correto (adicionado `empresa_segmentacao_nome` no insert)
- Removido JOIN com `empresa_segmentacao` no select

**Função `formatarRequerimento()`:**
```typescript
// ❌ ANTES
empresa_segmentacao_id: data.empresa_segmentacao_id,
empresa_segmentacao_nome: data.empresa_segmentacao?.nome_abreviado,

// ✅ DEPOIS
empresa_segmentacao_nome: data.empresa_segmentacao_nome,
```

---

## 🎯 Como Funciona Agora

### Estrutura no Banco de Dados

```sql
-- Tabela requerimentos
CREATE TABLE requerimentos (
  id uuid PRIMARY KEY,
  chamado text NOT NULL,
  cliente_id uuid REFERENCES empresas_clientes(id),
  empresa_segmentacao_nome text,  -- ← TEXTO, não FK!
  modulo text,
  ...
);
```

### Fluxo de Dados

1. **Cliente ANGLO** tem `baseline_segmentado = true`
2. Campo `segmentacao_config` contém:
   ```json
   {
     "empresas": [
       {"nome": "NIQUEL", "percentual": 50},
       {"nome": "IOB", "percentual": 50}
     ]
   }
   ```

3. **Hook `useEmpresasSegmentacao`** extrai nomes do JSON
4. **Dropdown** mostra: "NIQUEL (50%)" e "IOB (50%)"
5. **Ao salvar**, grava o **nome** (ex: "NIQUEL") em `empresa_segmentacao_nome`
6. **Ao buscar**, o nome já vem direto (não precisa JOIN)

---

## 🧪 Teste Agora

1. **Recarregue a página** no navegador (Ctrl+F5)
2. **Abra o formulário** de requerimentos
3. **Selecione cliente ANGLO**
4. **Campo "Empresa (Segmentação)"** deve aparecer
5. **Selecione NIQUEL ou IOB**
6. **Preencha e salve**
7. **Verifique no banco**:

```sql
SELECT 
  id,
  chamado,
  cliente_id,
  empresa_segmentacao_nome,
  created_at
FROM requerimentos
WHERE empresa_segmentacao_nome IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Checklist Final

- [x] Migration aplicada no banco
- [x] Coluna renomeada para `empresa_segmentacao_nome` (TEXT)
- [x] View `vw_requerimentos_completo` recriada
- [x] Service `requerimentosService.ts` corrigido
- [x] Função `listarRequerimentos()` sem JOIN incorreto
- [x] Função `obterRequerimentoPorId()` sem JOIN incorreto
- [x] Função `formatarRequerimento()` usando campo correto
- [x] Formulários usando `empresa_segmentacao_nome`
- [x] Layout corrigido (campos alinhados)

---

## 🚀 Próximos Passos (Opcional)

Após confirmar que está funcionando:

1. Atualizar `VisaoSegmentada.tsx` para filtrar por `empresa_segmentacao_nome`
2. Atualizar `VisaoConsolidada.tsx` para agrupar por `empresa_segmentacao_nome`
3. Adicionar coluna "Empresa (Segmentação)" nas listagens de requerimentos

---

**Agora teste no navegador!** 🎉
