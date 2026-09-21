# Sistema de filtros

## Estrutura obrigatória

1. Botões **Filtros** e **Limpar Filtro** no `CardHeader`, à direita do título.
2. **Limpar Filtro** só renderiza quando `hasActiveFilters()` é verdadeiro; usa ícone `X` vermelho (`text-red-600`) com texto preto.
3. Área expansível abre com `border-t` quando `showFilters` é verdadeiro.
4. Grid `grid-cols-1 md:grid-cols-4 gap-4`.
5. Label de cada campo: `<div className="text-sm font-medium mb-2">`.
6. Todo input/select: `focus:ring-sonda-blue focus:border-sonda-blue`.
7. Placeholders descritivos ("Todos os módulos", "Buscar por chamado, cliente...").
8. O valor neutro de um select é `'all'`, nunca string vazia.

## Esqueleto

```tsx
const [showFilters, setShowFilters] = useState(false);
const [filtros, setFiltros] = useState({ busca: '', modulo: 'all', tipoCobranca: 'all', periodo: 'all' });

const hasActiveFilters = () =>
  filtros.busca !== '' || filtros.modulo !== 'all' ||
  filtros.tipoCobranca !== 'all' || filtros.periodo !== 'all';

const limparFiltros = () =>
  setFiltros({ busca: '', modulo: 'all', tipoCobranca: 'all', periodo: 'all' });

<Card>
  <CardHeader>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Requerimentos Não Enviados
      </CardTitle>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center space-x-2">
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
        </Button>

        {hasActiveFilters() && (
          <Button variant="outline" size="sm" onClick={limparFiltros}
                  className="whitespace-nowrap hover:border-red-300">
            <X className="h-4 w-4 mr-2 text-red-600" />
            Limpar Filtro
          </Button>
        )}
      </div>
    </div>

    {showFilters && (
      <div className="space-y-4 pt-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* campos — ver abaixo */}
        </div>
      </div>
    )}
  </CardHeader>

  <CardContent>{/* tabela */}</CardContent>
</Card>
```

## Campos

### Busca com ícone

```tsx
<div>
  <div className="text-sm font-medium mb-2">Buscar</div>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
    <Input
      placeholder="Buscar por chamado, cliente..."
      value={filtros.busca}
      onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
      className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
    />
  </div>
</div>
```

Para busca que dispara query, use `useDebounce` (`@/hooks/useDebounce`) em vez de filtrar a cada tecla.

### Select

Mesmo molde para módulo, tipo de cobrança, período, status e cliente — muda só o label, o campo do estado e as opções.

```tsx
<div>
  <div className="text-sm font-medium mb-2">Status</div>
  <Select value={filtros.status} onValueChange={(value) => setFiltros({ ...filtros, status: value })}>
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Todos os status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os status</SelectItem>
      <SelectItem value="pendente">Pendente</SelectItem>
      <SelectItem value="aprovado">Aprovado</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Intervalo de datas

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
  <div>
    <div className="text-sm font-medium mb-2">Data Início</div>
    <Input type="date" value={filtros.dataInicio}
           onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
           className="focus:ring-sonda-blue focus:border-sonda-blue" />
  </div>
  <div>
    <div className="text-sm font-medium mb-2">Data Fim</div>
    <Input type="date" value={filtros.dataFim}
           onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
           className="focus:ring-sonda-blue focus:border-sonda-blue" />
  </div>
</div>
```

### Numérico

```tsx
<div>
  <div className="text-sm font-medium mb-2">Valor Mínimo</div>
  <Input type="number" placeholder="R$ 0,00" value={filtros.valorMinimo}
         onChange={(e) => setFiltros({ ...filtros, valorMinimo: e.target.value })}
         className="focus:ring-sonda-blue focus:border-sonda-blue" />
</div>
```

### Checkbox (seleção múltipla)

```tsx
<div>
  <div className="text-sm font-medium mb-2">Opções</div>
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <Checkbox
        id="opcao1"
        checked={filtros.opcoes.includes('opcao1')}
        onCheckedChange={(checked) =>
          setFiltros({
            ...filtros,
            opcoes: checked
              ? [...filtros.opcoes, 'opcao1']
              : filtros.opcoes.filter((o) => o !== 'opcao1'),
          })
        }
      />
      <Label htmlFor="opcao1" className="text-sm">Opção 1</Label>
    </div>
  </div>
</div>
```

Para casos simples existe o componente pronto `@/components/ui/filter-bar`.
