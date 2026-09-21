# Tabelas

## Regras obrigatórias

1. `TableHeader` com linha `className="bg-gray-50"`.
2. `TableHead` com `font-semibold text-gray-700`.
3. `TableRow` do corpo com `hover:bg-gray-50`.
4. Checkbox de seleção na primeira coluna quando há ação em lote.
5. Colunas numéricas (horas, valores, datas) centralizadas com `text-center`.
6. Horas com `font-mono` (alinhamento); valores e totais com `font-semibold`.
7. Badges para categorização: `bg-blue-100 text-blue-800 text-xs`.
8. Informação secundária na célula: `text-xs text-gray-500 mt-1`.
9. IDs/links importantes: `text-blue-600 font-medium`.
10. `CardContent` com `overflow-x-auto` para scroll horizontal no mobile.

## Estrutura

```tsx
const [selectedItems, setSelectedItems] = useState<string[]>([]);

const handleSelectAll = (checked: boolean) =>
  setSelectedItems(checked ? data.map((item) => item.id) : []);

const handleSelectItem = (itemId: string, checked: boolean) =>
  setSelectedItems(checked
    ? [...selectedItems, itemId]
    : selectedItems.filter((id) => id !== itemId));

<CardContent className="overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="w-12">
          <Checkbox
            checked={selectedItems.length === data.length && data.length > 0}
            onCheckedChange={handleSelectAll}
          />
        </TableHead>
        <TableHead className="font-semibold text-gray-700">Chamado</TableHead>
        <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
        <TableHead className="font-semibold text-gray-700">Módulo</TableHead>
        <TableHead className="font-semibold text-gray-700 text-center">Total</TableHead>
        <TableHead className="font-semibold text-gray-700 text-center">Valor Total</TableHead>
        <TableHead className="font-semibold text-gray-700 text-center w-24">Ações</TableHead>
      </TableRow>
    </TableHeader>

    <TableBody>
      {data.map((item) => (
        <TableRow key={item.id} className="hover:bg-gray-50">
          <TableCell>
            <Checkbox
              checked={selectedItems.includes(item.id)}
              onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
            />
          </TableCell>

          <TableCell>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-blue-600">{item.chamado}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{item.tipo}</div>
          </TableCell>

          <TableCell><span className="font-medium">{item.cliente}</span></TableCell>

          <TableCell>
            <Badge className="bg-blue-100 text-blue-800 text-xs">{item.modulo}</Badge>
          </TableCell>

          <TableCell className="text-center">
            <span className="font-mono text-sm font-semibold">{item.total}</span>
          </TableCell>

          <TableCell className="text-center">
            <span className="font-semibold">{formatCurrency(item.valor)}</span>
          </TableCell>

          <TableCell className="text-center">
            <div className="flex justify-center gap-1">
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-800">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</CardContent>
```

## Botões de ação da coluna "Ações"

Sempre `variant="outline" size="sm" className="h-8 w-8 p-0"`, ícone `h-4 w-4`, agrupados em `div` com `gap-1`.

| Ação | Classe adicional | Ícone |
|---|---|---|
| Visualizar | — (ícone `text-blue-600`) | `Eye` |
| Editar | — | `Edit` |
| Excluir | `text-red-600 hover:text-red-800` | `Trash2` |
| Enviar | `text-blue-600 hover:text-blue-800` | `Send` |

Ação sensível deve ser envolvida em `<ProtectedAction>` (ver `layout.md`), e ação destrutiva pede confirmação via `AlertDialog` (ver `modais.md`).

## Paginação

```tsx
<div className="flex items-center justify-between px-2 py-4">
  <div className="text-sm text-gray-500">
    Mostrando {startIndex} a {endIndex} de {totalItems} resultados
  </div>
  <div className="flex items-center space-x-2">
    <Button variant="outline" size="sm" disabled={currentPage === 1}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <span className="text-sm">Página {currentPage} de {totalPages}</span>
    <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
</div>
```

Tabela sem dados nunca fica em branco — renderize o estado vazio (ver `feedback.md`).

O cabeçalho do card que envolve a tabela leva os botões de filtro: ver `filtros.md`.
