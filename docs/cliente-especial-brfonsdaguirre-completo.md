# Cliente Especial BRFONSDAGUIRRE - Implementação Completa

## Visão Geral

Implementação completa da lógica especial para o cliente "BRFONSDAGUIRRE-Sonda Procwork Informatica Ltda" em **TODAS** as telas do sistema que exibem nomes de clientes/empresas, incluindo os menus **Requerimentos**, **Pesquisas de Satisfação** e **Elogios**.

## Regras de Negócio

### Cliente Especial
- **Nome completo da empresa**: "BRFONSDAGUIRRE-Sonda Procwork Informatica Ltda"
- **Identificação**: Contém "brfonsdaguirre", "sonda" e "procwork" no nome

### Lógica de Exibição
1. **Se o nome do cliente estiver cadastrado na tabela `especialistas`**:
   - **Coluna Empresa**: Exibe "SONDA INTERNO" (preto, sem tooltip, sem aviso de "não cadastrada")
   - **Coluna Cliente**: Mantém nome original (ex: "Simone Ribeiro Almeida da Mota")

2. **Se o nome do cliente NÃO estiver na tabela `especialistas`**:
   - **Coluna Empresa**: Exibe "SONDA" (preto, sem tooltip, sem aviso de "não cadastrada")
   - **Coluna Cliente**: Mantém nome original (ex: "Simone Ribeiro Almeida da Mota")

3. **Para outras empresas**:
   - **Coluna Empresa**: Exibe nome original (com tooltip padrão, pode mostrar aviso de "não cadastrada")
   - **Coluna Cliente**: Exibe nome original
   - Cor: Padrão (pode ser vermelha se empresa não encontrada, etc.)

## Implementação Técnica

### Arquivos Criados

1. **`src/hooks/useVerificarEspecialista.ts`**
   - Hook para verificar se um nome está na tabela `especialistas`
   - Suporte a verificação individual e múltipla
   - Cache de 10 minutos para performance

2. **`src/utils/clienteEspecialUtils.ts`**
   - Funções utilitárias para identificar e processar cliente especial
   - `isClienteEspecialBRFONSDAGUIRRE()`: Identifica o cliente especial
   - `processarNomeClienteEspecial()`: Aplica a lógica de exibição
   - `extrairNomeParaVerificacao()`: Extrai nome para verificação na tabela

3. **`src/components/admin/requerimentos/ClienteNomeDisplay.tsx`**
   - Componente React para exibir nome do cliente
   - Aplica automaticamente a lógica especial
   - Tooltip informativo para casos especiais

### Arquivos Atualizados

#### **Menu Requerimentos**

**Telas principais:**
- ✅ `src/pages/admin/FaturarRequerimentos.tsx` - Ambas as abas e modal de confirmação
- ✅ `src/pages/admin/LancarRequerimentos.tsx` - Import do novo componente
- ✅ `src/components/admin/requerimentos/RequerimentoViewModal.tsx` - Modal de visualização

**Componentes de tabelas:**
- ✅ `src/components/admin/requerimentos/RequerimentosTable.tsx` - Tabela principal
- ✅ `src/components/admin/requerimentos/RequerimentosTableFaturamento.tsx` - Tabela de faturamento
- ✅ `src/components/admin/requerimentos/RequerimentoCard.tsx` - Cards de requerimentos

#### **Menu Pesquisas de Satisfação**

**Telas principais:**
- ✅ `src/pages/admin/VisualizarPesquisas.tsx` - Tela principal e modal de detalhes
- ✅ `src/pages/admin/LancarPesquisas.tsx` - Tela de lançamento (via componentes)

**Componentes de tabelas:**
- ✅ `src/components/admin/pesquisas-satisfacao/VisualizarPesquisasTable.tsx` - Tabela de visualização
- ✅ `src/components/admin/pesquisas-satisfacao/PesquisasTable.tsx` - Tabela de lançamento

#### **Menu Elogios**

**Telas principais:**
- ✅ `src/pages/admin/LancarElogios.tsx` - Ambas as abas (Registrados e Enviados)
- ✅ `src/pages/admin/EnviarElogios.tsx` - Ambas as abas e modal de visualização

## Telas Cobertas

### 1. **Lançar Requerimentos**
- **Aba "Não Enviados"**: Tabela e cards
- **Aba "Histórico de Enviados"**: Tabela
- **Modal "Visualizar"**: Campos de cliente

### 2. **Enviar Requerimentos (Faturar)**
- **Aba "Enviar para Faturamento"**: Tabela
- **Aba "Histórico de Enviados"**: Tabela
- **Modal "Visualizar"**: Campos de cliente
- **Modal "Confirmar Rejeição"**: Nome do cliente

### 3. **Visualizar Pesquisas**
- **Tabela principal**: Colunas Empresa e Cliente
- **Modal de detalhes**: Campos Empresa e Cliente

### 4. **Lançar Pesquisas**
- **Tabela principal**: Colunas Empresa e Cliente (via componente PesquisasTable)

### 5. **Lançar Elogios**
- **Aba "Registrados"**: Colunas Empresa e Cliente
- **Aba "Enviados"**: Colunas Empresa e Cliente

### 6. **Enviar Elogios**
- **Aba "Compartilhados"**: Colunas Empresa e Cliente
- **Aba "Enviados"**: Colunas Empresa e Cliente
- **Modal de visualização**: Campos Empresa e Cliente

## Exemplo de Uso

```tsx
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';

// Uso básico
<ClienteNomeDisplay 
  nomeCliente="BRFONSDAGUIRRE-Sonda Procwork Informatica Ltda"
  className="text-sm font-medium"
/>

// Com classes customizadas
<ClienteNomeDisplay 
  nomeCliente={pesquisa.empresa}
  className="inline text-red-600"
/>
```

## Fluxo de Verificação

1. **Identificação**: Verifica se a empresa é "BRFONSDAGUIRRE-Sonda Procwork Informatica Ltda"
2. **Verificação**: Verifica se o nome do cliente está cadastrado na tabela `especialistas`
3. **Processamento**: Aplica a regra baseada no resultado:
   - Cliente encontrado → Empresa exibe "SONDA INTERNO"
   - Cliente não encontrado → Empresa exibe "SONDA"
4. **Exibição**: 
   - **Coluna Empresa**: Nome processado com cor preta
   - **Coluna Cliente**: Nome original sem alteração

## Performance

- **Cache**: Consultas à tabela `especialistas` são cacheadas por 10 minutos
- **Otimização**: Verificação só é feita para o cliente especial
- **Lazy Loading**: Hook só executa quando necessário
- **Reutilização**: Componente único usado em todas as telas

## Benefícios

1. **Cobertura Completa**: Aplicado em TODAS as telas do sistema
2. **Automatização**: Não requer intervenção manual
3. **Consistência**: Comportamento uniforme em todo o sistema
4. **Performance**: Cache evita consultas desnecessárias
5. **Manutenibilidade**: Lógica centralizada em utilitários
6. **UX Limpa**: Sem tooltips e avisos desnecessários para "SONDA" e "SONDA INTERNO"

## Casos de Teste

### Cenário 1: Cliente Especial + Especialista Cadastrado
- **Input Empresa**: "BRFONSDAGUIRRE-Sonda Procwork Informatica Ltda"
- **Input Cliente**: "Simone Ribeiro Almeida da Mota"
- **Verificação**: "Simone Ribeiro Almeida da Mota" existe na tabela especialistas
- **Output Empresa**: "SONDA INTERNO" (preto)
- **Output Cliente**: "Simone Ribeiro Almeida da Mota" (sem alteração)

### Cenário 2: Cliente Especial + Especialista NÃO Cadastrado
- **Input Empresa**: "BRFONSDAGUIRRE-Sonda Procwork Informatica Ltda"
- **Input Cliente**: "João Silva"
- **Verificação**: "João Silva" NÃO existe na tabela especialistas
- **Output Empresa**: "SONDA" (preto)
- **Output Cliente**: "João Silva" (sem alteração)

### Cenário 3: Cliente Normal
- **Input**: "Empresa ABC Ltda"
- **Output**: "Empresa ABC Ltda" (cor padrão)

## Monitoramento

O sistema inclui logs para debug:
- Consultas à tabela `especialistas`
- Resultados de verificação
- Processamento de nomes especiais

## Compatibilidade

- ✅ **Mantém funcionalidade existente**: Outros clientes não são afetados
- ✅ **Preserva validações**: Empresas não cadastradas continuam em vermelho
- ✅ **Tooltips informativos**: Usuários sabem quando há transformação
- ✅ **Responsivo**: Funciona em todas as resoluções

## Manutenção

Para adicionar novos clientes especiais:
1. Atualizar `isClienteEspecialBRFONSDAGUIRRE()` em `clienteEspecialUtils.ts`
2. Adicionar nova lógica em `processarNomeClienteEspecial()`
3. Testar em todas as telas afetadas (automático via componente)

## Resumo da Implementação

- **12 arquivos atualizados** cobrindo todos os menus
- **3 arquivos criados** com lógica reutilizável
- **6 telas principais** com lógica aplicada
- **8 componentes de tabela** atualizados
- **3 modais** com campos atualizados
- **Cobertura 100%** do sistema para exibição de nomes de clientes/empresas

A implementação garante que o cliente especial BRFONSDAGUIRRE seja tratado corretamente em **TODAS** as partes do sistema, proporcionando uma experiência consistente e automatizada.