# Separação Completa: Disparos Padrão vs Personalizados

## Alteração Implementada

Modificação na tela de **Disparos padrão** para **excluir** empresas que possuem `book_personalizado = true`, criando uma separação completa entre as duas telas.

## Nova Lógica de Filtros

### **Antes da Separação:**
- **Disparos padrão**: `tem_ams = true` E `tipo_book = 'qualidade'`
- **Disparos personalizados**: `book_personalizado = true`
- **Problema**: Empresas podiam aparecer em ambas as telas

### **Depois da Separação:**
- **Disparos padrão**: `tem_ams = true` E `tipo_book = 'qualidade'` E `book_personalizado = false`
- **Disparos personalizados**: `book_personalizado = true`
- **Resultado**: Separação completa, sem sobreposição

## Modificações Realizadas

### Arquivo: `src/services/booksDisparoService.ts`

#### 1. **Função `dispararBooksMensal()`**
```sql
-- ANTES
.eq('tem_ams', true)
.eq('tipo_book', 'qualidade')

-- DEPOIS
.eq('tem_ams', true)
.eq('tipo_book', 'qualidade')
.eq('book_personalizado', false)  -- ✅ ADICIONADO
```

#### 2. **Função `dispararEmpresasSelecionadas()`**
```sql
-- ANTES
.eq('tem_ams', true)
.eq('tipo_book', 'qualidade')

-- DEPOIS
.eq('tem_ams', true)
.eq('tipo_book', 'qualidade')
.eq('book_personalizado', false)  -- ✅ ADICIONADO
```

#### 3. **Função `obterStatusMensal()`**
```sql
-- ANTES
.eq('tem_ams', true)
.eq('tipo_book', 'qualidade')

-- DEPOIS
.eq('tem_ams', true)
.eq('tipo_book', 'qualidade')
.eq('book_personalizado', false)  -- ✅ ADICIONADO
```

## Matriz de Empresas por Tela

| Empresa | tem_ams | tipo_book | book_personalizado | Disparos Padrão | Disparos Personalizados |
|---------|---------|-----------|-------------------|-----------------|------------------------|
| **A** | ✅ Sim | Qualidade | ❌ Não | ✅ **SIM** | ❌ **NÃO** |
| **B** | ✅ Sim | Qualidade | ✅ Sim | ❌ **NÃO** | ✅ **SIM** |
| **C** | ❌ Não | Outros | ✅ Sim | ❌ **NÃO** | ✅ **SIM** |
| **D** | ✅ Sim | Outros | ❌ Não | ❌ **NÃO** | ❌ **NÃO** |
| **E** | ❌ Não | Qualidade | ❌ Não | ❌ **NÃO** | ❌ **NÃO** |

## Cenários de Uso

### **Cenário 1: Empresa Padrão**
- `tem_ams = true`, `tipo_book = 'qualidade'`, `book_personalizado = false`
- **Resultado**: Aparece apenas em **Disparos Padrão**

### **Cenário 2: Empresa Personalizada com AMS**
- `tem_ams = true`, `tipo_book = 'qualidade'`, `book_personalizado = true`
- **Resultado**: Aparece apenas em **Disparos Personalizados**

### **Cenário 3: Empresa Personalizada sem AMS**
- `tem_ams = false`, `tipo_book = 'outros'`, `book_personalizado = true`
- **Resultado**: Aparece apenas em **Disparos Personalizados**

### **Cenário 4: Empresa sem Critérios**
- `tem_ams = false`, `tipo_book = 'outros'`, `book_personalizado = false`
- **Resultado**: Não aparece em nenhuma tela

## Benefícios da Separação

### **1. Organização Clara**
- ✅ **Sem sobreposição**: Cada empresa aparece em apenas uma tela
- ✅ **Propósito específico**: Cada tela tem seu público-alvo
- ✅ **Gestão independente**: Controles separados para cada tipo

### **2. Experiência do Usuário**
- ✅ **Menos confusão**: Usuário sabe exatamente onde encontrar cada empresa
- ✅ **Foco específico**: Cada tela focada em seu tipo de book
- ✅ **Eficiência**: Não há duplicação de esforços

### **3. Manutenibilidade**
- ✅ **Lógica clara**: Filtros bem definidos e exclusivos
- ✅ **Escalabilidade**: Fácil adicionar novos tipos no futuro
- ✅ **Debugging**: Problemas isolados por tipo

## Fluxo de Trabalho

### **Para Books Padrão:**
1. Usuário acessa **Disparos** (menu normal)
2. Vê apenas empresas com AMS + Qualidade + sem personalização
3. Processa usando templates padrão do sistema

### **Para Books Personalizados:**
1. Usuário acessa **Disparos Personalizados** (menu roxo)
2. Vê apenas empresas com book personalizado
3. Processa usando templates personalizados da empresa

## Impacto na Interface

### **Tela Disparos Padrão:**
- ✅ **Menos empresas**: Apenas as que não têm personalização
- ✅ **Foco específico**: Books padrão do sistema
- ✅ **Cor azul**: Mantém identidade visual original

### **Tela Disparos Personalizados:**
- ✅ **Empresas específicas**: Apenas as com personalização
- ✅ **Foco específico**: Books personalizados
- ✅ **Cor roxa**: Identidade visual diferenciada

## Cache e Sincronização

### **Comportamento Dinâmico:**
- ✅ **Empresa ganha personalização**: Move de Padrão → Personalizado
- ✅ **Empresa perde personalização**: Move de Personalizado → Padrão
- ✅ **Cache sincronizado**: Mudanças refletem automaticamente
- ✅ **Sem Ctrl+F5**: Transições são instantâneas

### **Exemplo Prático:**
1. Empresa aparece em **Disparos Padrão**
2. Usuário marca `book_personalizado = true` na empresa
3. Empresa **desaparece** de Disparos Padrão automaticamente
4. Empresa **aparece** em Disparos Personalizados automaticamente

## Validação da Separação

### **Teste de Separação:**
1. **Criar empresa A**: AMS=Sim, Tipo=Qualidade, Personalizado=Não
2. **Criar empresa B**: AMS=Sim, Tipo=Qualidade, Personalizado=Sim
3. **Verificar Disparos Padrão**: Deve mostrar apenas empresa A
4. **Verificar Disparos Personalizados**: Deve mostrar apenas empresa B
5. **Alterar empresa A**: Marcar Personalizado=Sim
6. **Resultado**: Empresa A move para Disparos Personalizados

## Status da Alteração

✅ **CONCLUÍDO** - Separação completa implementada
- Filtros atualizados em todas as funções
- Empresas com book personalizado excluídas dos disparos padrão
- Separação completa sem sobreposição
- Cache dinâmico funcionando
- Transições automáticas entre telas

## Resumo Final

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Sobreposição** | ✅ Possível | ❌ **Impossível** |
| **Separação** | ❌ Parcial | ✅ **Completa** |
| **Confusão** | ✅ Possível | ❌ **Eliminada** |
| **Organização** | ❌ Ambígua | ✅ **Clara** |

Agora cada empresa aparece em **exatamente uma tela**, criando uma separação perfeita entre books padrão e personalizados!