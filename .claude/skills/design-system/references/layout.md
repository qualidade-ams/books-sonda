# Layout, cards, botões e tabs

## Shell de página administrativa (padrão oficial)

```tsx
<AdminLayout>
  <div className="min-h-screen bg-bg-secondary">
    <div className="px-6 py-6 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Título da Página
          </h1>
          <p className="text-muted-foreground mt-1">Descrição ou contexto</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
            <Plus className="h-4 w-4 mr-2" />
            Ação Principal
          </Button>
        </div>
      </div>

      {/* Cards de estatística (opcional) */}
      {/* Card principal com filtros + tabela/form */}

    </div>
  </div>
</AdminLayout>
```

`AdminLayout` vem de `@/components/admin/LayoutAdmin`. **Nunca** use `container mx-auto px-4`.

Alternativa ao header manual: `<PageHeader title subtitle breadcrumbs={<Breadcrumb />} actions={...} />` de `@/components/ui/page-header`.

Exemplos reais no repositório: `src/pages/admin/GeracaoBooks.tsx`, `src/pages/admin/ControleBancoHoras.tsx`.

## Cards de estatística

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Total
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">24</div>
    </CardContent>
  </Card>
</div>
```

A cor do título acompanha a semântica do número, e o valor repete a mesma cor: `text-gray-600 dark:text-gray-400` (neutro), `text-sonda-blue`, `text-green-600` (sucesso), `text-orange-600` (aviso), `text-red-600` (erro).

## Card de conteúdo

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sonda-blue">Título do Card</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    {/* conteúdo */}
    <div className="flex justify-end space-x-2">
      <Button variant="outline" size="sm">Cancelar</Button>
      <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">Confirmar</Button>
    </div>
  </CardContent>
</Card>
```

Regras: `CardHeader className="pb-3"` quando há `CardDescription`; `CardContent className="pt-0"` logo após header com descrição; informações estruturadas com `flex justify-between` (label `text-gray-500`, valor `font-medium`); separadores com `border-t`; ações sempre no fim com `justify-end`.

## Botões

```tsx
{/* Primário */}
<Button className="bg-sonda-blue hover:bg-sonda-dark-blue text-white">
  <Plus className="h-4 w-4 mr-2" />Ação Principal
</Button>

{/* Secundário */}
<Button variant="outline" className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10">
  <Edit className="h-4 w-4 mr-2" />Ação Secundária
</Button>

{/* Destrutivo */}
<Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</Button>

{/* Sutil */}
<Button variant="ghost"><Eye className="h-4 w-4 mr-2" />Visualizar</Button>

{/* Loading */}
<Button disabled className="bg-sonda-blue hover:bg-sonda-dark-blue">
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />Carregando...
</Button>
```

Tamanhos: `sm`, `default`, `lg`, `icon`. Ícone sempre `h-4 w-4`, com `mr-2` quando acompanha texto.

Botão de ação em linha de tabela: ver `tabelas.md`.

## Tabs

Padrão atual — aba ativa com fundo branco:

```tsx
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="bg-gray-100 p-1 rounded-lg">
    <TabsTrigger
      value="tab1"
      className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
    >
      Tab 1
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" className="mt-4">{/* ... */}</TabsContent>
</Tabs>
```

Existe um padrão antigo com aba ativa azul (`data-[state=active]:bg-sonda-blue data-[state=active]:text-white`) ainda presente em parte do código. Em tela nova use o branco; ao editar tela existente, siga o que já está nela.

## Navegação por período

```tsx
<div className="flex items-center justify-between">
  <div className="flex items-center space-x-4">
    <Button variant="outline" size="sm" onClick={handlePreviousPeriod}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <h2 className="text-lg font-semibold text-gray-900">{mesNome} {ano}</h2>
    <Button variant="outline" size="sm" onClick={handleNextPeriod}>
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  <Button variant="outline" size="sm">
    <RefreshCw className="h-4 w-4 mr-2" />Atualizar
  </Button>
</div>
```

## Ação com controle de permissão

```tsx
<ProtectedAction screenKey="ENVIAR_ELOGIOS" action="CREATE">
  <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
    <Send className="h-4 w-4 mr-2" />Disparar Elogios
  </Button>
</ProtectedAction>
```
