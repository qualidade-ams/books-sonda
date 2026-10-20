# Investigação — Aba "Enviados" (Histórico - Requerimentos Enviados) da tela Lançar Requerimentos

## Resumo executivo

A tela "Lançar Requerimentos" é o componente `src/pages/admin/LancarRequerimentos.tsx`. A aba "Enviados" (título "Histórico - Requerimentos Enviados") é o `TabsContent value="enviados"`.

O problema relatado (precisar trocar de mês em mês para achar um chamado pesquisado) ocorre porque o filtro de **Mês de Cobrança é aplicado em DUAS camadas** e o texto de busca é aplicado em apenas UMA:

1. **Servidor (Supabase):** o hook `useRequerimentosEnviados(filtrosEnviados)` extrai apenas `filtrosEnviados.mes_cobranca` e o envia para `requerimentosService.buscarRequerimentosEnviados(mesCobranca)`. Como `mes_cobranca` é inicializado por padrão com o mês corrente (`getDefaultMesCobranca()`), a API retorna **apenas os requerimentos daquele mês**. O texto de busca **não** é enviado à API.
2. **Cliente (frontend):** o `useMemo` `requerimentosFiltrados` aplica o texto `busca` (contra `chamado`, `cliente_nome`, `descricao`) e **reaplica** o filtro de mês (`if currentFiltros.mes_cobranca ... req.mes_cobranca !== currentFiltros.mes_cobranca`).

Resultado: ao digitar no "Buscar", a busca roda apenas sobre o subconjunto do mês já carregado, forçando o usuário a navegar mês a mês.

**Variáveis de estado exatas (aba Enviados):**

- `filtrosEnviados.busca` → texto da busca (string, inicial `''`, vira `undefined` quando vazio).
- `filtrosEnviados.mes_cobranca` → mês selecionado em `MM/YYYY` (inicial `getDefaultMesCobranca()` = mês corrente).

**Ponto-chave para a solução:** o service `buscarRequerimentosEnviados(mesCobranca?)` **já suporta buscar todos os meses** — ele só adiciona `.eq('mes_cobranca', mesCobranca)` quando `mesCobranca` é truthy. Ou seja, basta passar `mes_cobranca = undefined` quando houver texto de busca para que a API retorne todos os meses. **Não é necessário alterar o service nem o hook.** Toda a lógica pode ser resolvida em `LancarRequerimentos.tsx`.

---

## Respostas às questões

### 1. Arquivo/componente que renderiza a aba "Enviados"

- Página: `src/pages/admin/LancarRequerimentos.tsx`.
- Aba enviados: `TabsContent value="enviados"` (~linha 1128). Título do Card: `t('requirements.sentHistory')` → "Histórico - Requerimentos Enviados" (i18n em `src/i18n/locales/pt-BR.ts`, linha 1204).

### 2. Como o estado do campo de busca textual é gerenciado

- Estado `filtrosEnviados` (`useState<FiltrosRequerimentos>`, ~linha 120) com campo `busca: ''`.
- Atualização por `handleFiltroEnviadosChange('busca', value)` (~linha 340), que chama `debouncedSearchEnviados` (`useDebounceSearch`, 300 ms, em `src/utils/requerimentosPerformance.ts` linha 26). O debounce seta `filtrosEnviados.busca` (string vazia vira `undefined`) e reseta a paginação para 1.
- O `Input` da busca usa `defaultValue={filtrosEnviados.busca || ''}` (não controlado) + `onChange` (~linhas 1177-1180). Por ser `defaultValue`, o valor exibido não é totalmente controlado — detalhe relevante caso se queira refletir estado desabilitado no mês.

### 3. Como o filtro de mês é aplicado

- Estado local `filtrosEnviados.mes_cobranca` (formato `MM/YYYY`).
- Picker: `<MonthYearPicker value={filtrosEnviados.mes_cobranca || ''} onChange={...} placeholder={t('requirements.allMonths')} />` (~linhas 1213-1217). O componente `MonthYearPicker` (`src/components/ui/month-year-picker.tsx`) **já aceita prop `disabled?: boolean`** (linha 28, default `false`).
- Handler: `handleFiltroEnviadosChange('mes_cobranca', value)` — valores especiais como `'__all_months__'` viram `undefined` (~linhas 345-352).
- `limparFiltrosEnviados()` (~linha 355) zera filtros mas **reaplica `mes_cobranca` ao mês corrente** (`getDefaultMesCobranca()`).
- Aplicado em duas camadas (servidor + cliente) — ver resumo.

### 4. Como a query/fetch é feita e quais parâmetros ela aceita

- Hook: `useRequerimentosEnviados(filtros?: FiltrosRequerimentos)` em `src/hooks/useRequerimentos.ts` (~linha 62).
- Chave de cache: `REQUERIMENTOS_QUERY_KEYS.enviados(filtros)` (inclui o objeto `filtros` inteiro — linha 25).
- `queryFn`: extrai `mesCobranca = filtros?.mes_cobranca` e chama `requerimentosService.buscarRequerimentosEnviados(mesCobranca)` — **passa apenas o mês, nunca o `busca`**.
- Service `buscarRequerimentosEnviados(mesCobranca?: string)` em `src/services/requerimentosService.ts` (~linha 755):
  - `supabase.from('requerimentos').select('*').in('status', ['enviado_faturamento','faturado']).order('data_envio_faturamento', { ascending:false, nullsFirst:false })`.
  - `if (mesCobranca) { query = query.eq('mes_cobranca', mesCobranca); }` — **mês é opcional**; quando ausente, retorna todos os meses.
  - Depois enriquece cada linha com `cliente_nome` (busca individual em `empresas_clientes`).
- `staleTime` 30 s.

### 5. O mês é aplicado no frontend ou enviado à API?

- **Ambos.** Enviado à API (Supabase) como `.eq('mes_cobranca', ...)` pelo service, e reaplicado no frontend pelo `useMemo` `requerimentosFiltrados` (~linhas 187-216):
  ```ts
  // Filtro de mês/ano - SEMPRE aplicar se estiver definido
  if (currentFiltros.mes_cobranca) {
    if (req.mes_cobranca !== currentFiltros.mes_cobranca) return false;
  }
  ```
- O `busca` é aplicado **somente no frontend** nesse mesmo `useMemo` (contra `chamado`, `cliente_nome`, `descricao`).

### 6. Nomes exatos do estado/variável

- Texto de busca: **`filtrosEnviados.busca`** (type `string | undefined`).
- Mês selecionado: **`filtrosEnviados.mes_cobranca`** (type `string | undefined`, formato `MM/YYYY`).
- Tipo: `FiltrosRequerimentos` em `src/types/requerimentos.ts` (linhas 206-214): `busca?`, `modulo?`, `status?`, `tipo_cobranca?`, `mes_cobranca?`, `cliente_id?`, `data_inicio?`, `data_fim?`.

---

## Evidência (citações de código)

`src/pages/admin/LancarRequerimentos.tsx` — inicialização do estado Enviados (~linhas 120-128):

```ts
const [filtrosEnviados, setFiltrosEnviados] = useState<FiltrosRequerimentos>(() => ({
  busca: '',
  modulo: undefined,
  tipo_cobranca: undefined,
  mes_cobranca: getDefaultMesCobranca(), // Formato MM/YYYY por padrão
  data_inicio: undefined,
  data_fim: undefined,
}));
```

`src/pages/admin/LancarRequerimentos.tsx` — chamada do hook e seleção por aba (~linhas 166-184):

```ts
const { data: requerimentosEnviados = [], isLoading: isLoadingEnviados, refetch: refetchEnviados } =
    useRequerimentosEnviados(filtrosEnviados);
...
const currentRequerimentos = activeTab === 'nao-enviados' ? requerimentos : requerimentosEnviados;
const currentFiltros = activeTab === 'nao-enviados' ? filtros : filtrosEnviados;
```

`src/pages/admin/LancarRequerimentos.tsx` — filtro cliente (duplo) (~linhas 187-216):

```ts
const requerimentosFiltrados = useMemoizedFilter(currentRequerimentos || [], (req) => {
    if (currentFiltros.busca) {
        const busca = currentFiltros.busca.toLowerCase();
        const matchBusca = req.chamado.toLowerCase().includes(busca) ||
            req.cliente_nome?.toLowerCase().includes(busca) ||
            req.descricao.toLowerCase().includes(busca);
        if (!matchBusca) return false;
    }
    ...
    // Filtro de mês/ano - SEMPRE aplicar se estiver definido
    if (currentFiltros.mes_cobranca) {
        if (req.mes_cobranca !== currentFiltros.mes_cobranca) return false;
    }
    ...
}, [currentFiltros]);
```

`src/hooks/useRequerimentos.ts` — hook (linhas 62-72):

```ts
export function useRequerimentosEnviados(filtros?: FiltrosRequerimentos) {
  return useQuery({
    queryKey: REQUERIMENTOS_QUERY_KEYS.enviados(filtros),
    queryFn: () => {
      const mesCobranca = filtros?.mes_cobranca;
      return requerimentosService.buscarRequerimentosEnviados(mesCobranca);
    },
    staleTime: 1000 * 30,
  });
}
```

`src/services/requerimentosService.ts` — service (linhas 755-770):

```ts
async buscarRequerimentosEnviados(mesCobranca?: string): Promise<Requerimento[]> {
    try {
      let query = supabase.from('requerimentos').select('*')
        .in('status', ['enviado_faturamento', 'faturado']);
      query = query.order('data_envio_faturamento', { ascending: false, nullsFirst: false });
      if (mesCobranca) {
        query = query.eq('mes_cobranca', mesCobranca);
      }
      const { data, error } = await query;
      ...
```

`src/pages/admin/LancarRequerimentos.tsx` — UI Buscar + Mês (aba enviados, ~linhas 1176-1218):

```tsx
<Input placeholder={t('requirements.searchPlaceholder')}
       defaultValue={filtrosEnviados.busca || ''}
       onChange={(e) => handleFiltroEnviadosChange('busca', e.target.value)} ... />
...
<MonthYearPicker
    value={filtrosEnviados.mes_cobranca || ''}
    onChange={(value) => handleFiltroEnviadosChange('mes_cobranca', value)}
    placeholder={t('requirements.allMonths')}
/>
```

`src/components/ui/month-year-picker.tsx` — já suporta `disabled` (linhas 23-42):

```ts
interface MonthYearPickerProps { ... disabled?: boolean; ... }
export function MonthYearPicker({ ..., disabled = false, ... })
```

`src/types/requerimentos.ts` — tipo do filtro (linhas 206-214):

```ts
export interface FiltrosRequerimentos {
  busca?: string;
  modulo?: ModuloType | ModuloType[];
  status?: StatusRequerimento;
  tipo_cobranca?: TipoCobrancaType | TipoCobrancaType[];
  mes_cobranca?: string; // Formato MM/YYYY
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
}
```

i18n relevante (`src/i18n/locales/pt-BR.ts`):

- `requirements.sentHistory` → "Histórico - Requerimentos Enviados" (linha 1204)
- `requirements.billingMonth` → "Mês de Cobrança" (linha 1214)
- `requirements.allMonths` → "Todos os meses" (linha 1218)
- `requirements.searchPlaceholder` → "Buscar por chamado, cliente..." (linha 1219)
- `common.search` → "Buscar" (linha 852)

Testes existentes: `src/hooks/__tests__/useRequerimentos.test.ts` (cobertura do hook). Não há teste específico do componente `LancarRequerimentos.tsx`.

---

## Conclusões e recomendação de correção (nada implementado)

Toda a mudança cabe em `src/pages/admin/LancarRequerimentos.tsx`. Não é preciso tocar no service nem no hook, pois `buscarRequerimentosEnviados` já retorna todos os meses quando `mes_cobranca` é ausente.

**Mudança A — Buscar todos os meses quando houver texto (camada servidor).** Criar um filtro "efetivo" e passá-lo ao hook:

```ts
const filtrosEnviadosEfetivos: FiltrosRequerimentos = filtrosEnviados.busca
  ? { ...filtrosEnviados, mes_cobranca: undefined }
  : filtrosEnviados;

const {
  data: requerimentosEnviados = [],
  isLoading: isLoadingEnviados,
  refetch: refetchEnviados,
} = useRequerimentosEnviados(filtrosEnviadosEfetivos);
```

Como a chave de cache inclui `filtros`, buscar com texto gera uma entrada de cache distinta (sem mês) — comportamento correto. Ao limpar a busca, volta a usar a entrada com mês.

**Mudança B — Ignorar mês no filtro cliente quando houver busca (camada cliente).** No `useMemo` `requerimentosFiltrados`:

```ts
// Filtro de mês/ano - aplicar apenas quando não houver busca textual
if (currentFiltros.mes_cobranca && !currentFiltros.busca) {
  if (req.mes_cobranca !== currentFiltros.mes_cobranca) return false;
}
```

**Mudança C (UX, opcional) — Desabilitar o picker de mês durante a busca.** O `MonthYearPicker` já aceita `disabled`:

```tsx
<MonthYearPicker
  value={filtrosEnviados.mes_cobranca || ''}
  onChange={(value) => handleFiltroEnviadosChange('mes_cobranca', value)}
  placeholder={t('requirements.allMonths')}
  disabled={!!filtrosEnviados.busca}
/>
```

Opcionalmente, adicionar um texto auxiliar (ex.: "Mês ignorado durante a busca") para clareza. Como o `Input` de busca usa `defaultValue` (não controlado), o estado `filtrosEnviados.busca` só atualiza após debounce — o `disabled` do picker reagirá 300 ms depois de o usuário parar de digitar, o que é aceitável.

### Pontos de atenção / edge cases

- **Restauração do mês:** ao limpar a busca, `filtrosEnviados.busca` volta a `undefined` e o mês anteriormente selecionado (preservado em `filtrosEnviados.mes_cobranca`) é reaplicado automaticamente. Bom — não se deve zerar `mes_cobranca` ao digitar.
- **Limpar Filtro:** `limparFiltrosEnviados()` continua funcionando (restaura mês corrente e limpa busca).
- **Performance:** ao buscar, a API retorna **todos** os requerimentos `enviado_faturamento` + `faturado` (sem paginação no service). Se o volume for grande, a busca pode carregar muitos registros. A listagem já usa `useVirtualPagination` (20/página), então a renderização é paginada, mas o fetch é completo. Vale monitorar; se necessário, pode-se adicionar limite no service ou filtro server-side por texto (`.ilike` em `chamado`), mas isso é otimização fora do escopo do pedido.
- **Debounce:** o refetch ocorre 300 ms após o usuário parar de digitar (bom UX).
- **Componente controlado:** a busca usa `defaultValue`; não há conflito, pois só lemos `filtrosEnviados.busca` para decidir `disabled`/efetivar o filtro.

### Verificação sugerida (para a fase de implementação)

- `npm run typecheck` (tsc --noEmit) — confirmar tipos.
- `npm run lint` — eslint.
- `npm run test:run -- src/hooks/__tests__/useRequerimentos.test.ts` — manter testes do hook verdes.
- Teste manual: na aba Enviados, digitar um número de chamado e confirmar que aparecem resultados de meses diferentes do mês corrente sem precisar trocar de mês; limpar a busca e confirmar que o filtro de mês volta a funcionar e o picker é reabilitado.

### Observações de processo (Kiro)

- Esta é uma tela com bastante lógica de filtros; antes de implementar, vale registrar a regra de negócio "busca textual ignora mês" em Steering (`.kiro/steering/`) para padronizar comportamento em outras listas semelhantes (ex.: `nao-enviados`, `FaturarRequerimentos`, `VisualizarPesquisas`).
- A mudança toca apenas a aba "enviados"; a aba "nao-enviados" usa `filtros` separado (`mes_cobranca: undefined`) e `useRequerimentosNaoEnviados()` (sem parâmetro de mês), não sendo afetada.
