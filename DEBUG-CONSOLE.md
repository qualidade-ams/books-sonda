# 🔍 Debug no Console do Navegador

## Passo 1: Abrir Console
1. Pressione **F12** no navegador
2. Vá na aba **Console**
3. Limpe o console (ícone 🚫 ou Ctrl+L)

## Passo 2: Verificar Logs Automáticos

Ao selecionar o cliente ANGLO, você deve ver:

```
🔍 Buscando empresas de segmentação para cliente: 3f028c57-b9ca-4b07-bf9d-238ce361c7bd
📋 Cliente encontrado: {id: "3f028c57...", nome: "ANGLO", baseline_segmentado: true, tem_config: true}
📋 Empresas do JSON: [{nome: "NIQUEL", ordem: 1, percentual: 50, ...}, ...]
📋 Total de empresas no JSON: 2
✅ Empresa de segmentação: {nome: "NIQUEL", percentual: 50}
✅ Empresa de segmentação: {nome: "IOB", percentual: 50}
✅ Empresas formatadas: [{nome: "NIQUEL", percentual: 50}, {nome: "IOB", percentual: 50}]
✅ Total de empresas formatadas: 2
📊 Empresas de segmentação: {clienteId: "3f028c57...", empresas: Array(2), mostrarCampo: true}
```

## Passo 3: Teste Manual no Console

Cole este código no console para testar a busca:

```javascript
// Teste 1: Verificar se o Supabase está acessível
console.log('Supabase client:', window.supabase);

// Teste 2: Buscar cliente ANGLO diretamente
const clienteId = '3f028c57-b9ca-4b07-bf9d-238ce361c7bd';
const { data, error } = await window.supabase
  .from('empresas_clientes')
  .select('id, nome_abreviado, baseline_segmentado, segmentacao_config')
  .eq('id', clienteId)
  .single();

console.log('Cliente ANGLO:', data);
console.log('Erro:', error);
console.log('Empresas:', data?.segmentacao_config?.empresas);
```

## Passo 4: Verificar Estado do React Query

Cole este código para ver o cache do React Query:

```javascript
// Verificar cache do React Query
const queryClient = window.__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.queryClient;
if (queryClient) {
  const cache = queryClient.getQueryCache().getAll();
  const empresasQuery = cache.find(q => q.queryKey[0] === 'empresas-segmentacao');
  console.log('Query de empresas:', empresasQuery);
  console.log('Dados:', empresasQuery?.state?.data);
  console.log('Status:', empresasQuery?.state?.status);
} else {
  console.log('React Query DevTools não disponível');
}
```

## Passo 5: Verificar Formulário React Hook Form

Cole este código para ver o estado do formulário:

```javascript
// Verificar valor do cliente_id no formulário
// (Isso só funciona se você tiver acesso ao componente)
console.log('Verificar no React DevTools:');
console.log('1. Abra React DevTools (aba Components)');
console.log('2. Procure por "RequerimentoForm"');
console.log('3. Veja o valor de "clienteIdWatch"');
console.log('4. Veja o valor de "empresasSegmentacao"');
console.log('5. Veja o valor de "mostrarCampoEmpresaSegmentacao"');
```

## 🎯 Resultados Esperados

### ✅ Se tudo estiver OK:
- Logs aparecem no console
- `empresasSegmentacao` tem 2 itens (NIQUEL e IOB)
- `mostrarCampoEmpresaSegmentacao` é `true`
- Campo aparece no formulário

### ❌ Se houver problema:

**Problema 1: Nenhum log aparece**
- Componente não está sendo renderizado
- Verifique se você está na página correta

**Problema 2: Logs aparecem mas `empresas: []`**
- Hook não está retornando dados
- Verifique se `clienteIdWatch` tem o ID correto do ANGLO

**Problema 3: `empresas` tem dados mas campo não aparece**
- Problema no render condicional
- Verifique se `mostrarCampoEmpresaSegmentacao` é `true`

**Problema 4: Erro no console**
- Verifique a mensagem de erro
- Pode ser problema de permissão RLS

---

## 🔧 Solução Rápida

Se nada funcionar, tente **recarregar a página com cache limpo**:

- **Chrome/Edge**: Ctrl+Shift+R ou Ctrl+F5
- **Firefox**: Ctrl+Shift+R
- **Safari**: Cmd+Option+R

Depois selecione o cliente ANGLO novamente e veja os logs.

---

**Me envie os logs que aparecem no console!** 📋
