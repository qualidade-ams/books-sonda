# 📋 Instruções para Aplicar Segmentação de Empresas

## ⚠️ PROBLEMA IDENTIFICADO

O banco de dados ainda tem a coluna `empresa_segmentacao_id` (UUID), mas o código TypeScript está usando `empresa_segmentacao_nome` (TEXT).

**Por isso os valores não estão sendo salvos!**

---

## ✅ SOLUÇÃO - Passo a Passo

### 1️⃣ Aplicar Migration no Supabase

1. Abra o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Copie e cole o conteúdo do arquivo: `scripts/aplicar-empresa-segmentacao-nome.sql`
4. Execute o script (clique em "Run")

**O que a migration faz:**
- ✅ Remove constraint de FK (não é empresa cadastrada)
- ✅ Converte coluna de UUID para TEXT
- ✅ Renomeia `empresa_segmentacao_id` → `empresa_segmentacao_nome`
- ✅ Atualiza índices e triggers
- ✅ Atualiza view `vw_requerimentos_completo`

---

### 2️⃣ Verificar se Funcionou

Após executar a migration, rode esta query no SQL Editor:

```sql
-- Verificar estrutura da coluna
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'requerimentos'
  AND column_name = 'empresa_segmentacao_nome';
```

**Resultado esperado:**
```
column_name                | data_type | is_nullable
---------------------------|-----------|------------
empresa_segmentacao_nome   | text      | YES
```

---

### 3️⃣ Testar no Sistema

1. Abra o formulário de requerimentos
2. Selecione o cliente **ANGLO** (que tem baseline segmentado)
3. O campo "Empresa (Segmentação)" deve aparecer com as opções:
   - NIQUEL (50%)
   - IOB (50%)
4. Selecione uma opção (ex: NIQUEL)
5. Preencha os demais campos e salve
6. Verifique no banco se o valor foi salvo:

```sql
SELECT 
  id,
  chamado,
  cliente_id,
  empresa_segmentacao_nome
FROM requerimentos
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado:**
```
id   | chamado      | cliente_id | empresa_segmentacao_nome
-----|--------------|------------|-------------------------
...  | RF-1234567   | uuid...    | NIQUEL
```

---

## 📝 O QUE FOI ALTERADO NO CÓDIGO

### ✅ Arquivos Atualizados

1. **`src/services/requerimentosService.ts`**
   - Adicionado campo `empresa_segmentacao_nome` ao criar requerimentos
   - Removido JOIN com `empresa_segmentacao` (não é mais FK)
   - Atualizado também para requerimentos de análise EF

2. **`src/components/admin/requerimentos/RequerimentoForm.tsx`**
   - Campo "Empresa (Segmentação)" alinhado com campo "Módulo" (layout corrigido)
   - Usa `empresa_segmentacao_nome` (TEXT)

3. **`src/components/admin/requerimentos/RequerimentoMultiploForm.tsx`**
   - Usa `empresaSegmentacaoNome` (TEXT)

4. **`src/types/requerimentos.ts`**
   - Interface atualizada com `empresa_segmentacao_nome?: string`

5. **`src/hooks/useEmpresasSegmentacao.ts`**
   - Extrai nomes do JSON `segmentacao_config`
   - Retorna `{nome, percentual}`

---

## 🔍 ENTENDENDO A LÓGICA

### Como Funciona a Segmentação?

1. **Cliente ANGLO** tem `baseline_segmentado = true`
2. No campo `segmentacao_config` (JSONB) está configurado:
   ```json
   {
     "empresas": [
       {"nome": "NIQUEL", "percentual": 50, "filtro_tipo": "contem", "filtro_valor": "NIQUEL"},
       {"nome": "IOB", "percentual": 50, "filtro_tipo": "nao_contem", "filtro_valor": "NIQUEL"}
     ]
   }
   ```

3. O hook `useEmpresasSegmentacao` extrai esses nomes do JSON
4. O dropdown mostra: "NIQUEL (50%)" e "IOB (50%)"
5. Ao salvar, o **nome** (ex: "NIQUEL") é gravado em `empresa_segmentacao_nome`

### Por que TEXT e não UUID?

- NIQUEL e IOB **NÃO são empresas cadastradas** na tabela `empresas_clientes`
- São **subdivisões lógicas** do cliente ANGLO
- Por isso salvamos o **nome** (TEXT) em vez de um ID (UUID)

---

## 🚨 IMPORTANTE

- **Localhost e produção** usam o **mesmo banco de dados**
- Aplique a migration **UMA VEZ** no Supabase
- Após aplicar, **recarregue a página** no navegador (Ctrl+F5)

---

## 📞 Próximos Passos (Futuro)

Após confirmar que está funcionando, você pode:

1. Atualizar `VisaoSegmentada.tsx` para filtrar por `empresa_segmentacao_nome`
2. Atualizar `VisaoConsolidada.tsx` para agrupar por `empresa_segmentacao_nome`
3. Adicionar filtros nas listagens de requerimentos

---

## ✅ Checklist

- [ ] Migration aplicada no Supabase
- [ ] Coluna renomeada para `empresa_segmentacao_nome` (TEXT)
- [ ] Teste: Criar requerimento para ANGLO com NIQUEL
- [ ] Verificar no banco se salvou "NIQUEL" em `empresa_segmentacao_nome`
- [ ] Layout: Campos "Empresa (Segmentação)" e "Módulo" alinhados

---

**Qualquer dúvida, me avise!** 🚀
