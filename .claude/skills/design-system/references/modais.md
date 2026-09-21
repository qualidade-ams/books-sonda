# Modais

## Regras comuns

| Elemento | Classe |
|---|---|
| `DialogTitle` | `text-xl font-semibold text-sonda-blue` |
| `DialogDescription` | `text-sm text-gray-500` |
| `DialogFooter` | `pt-6 border-t` |
| Botão cancelar | `variant="outline"` |
| Botão confirmar/salvar | `bg-sonda-blue hover:bg-sonda-dark-blue` |

Largura conforme o conteúdo:

| Tipo | `DialogContent` |
|---|---|
| Simples | `sm:max-w-[600px]` |
| Com formulário | `sm:max-w-[700px] max-h-[90vh] overflow-y-auto` |
| Com tabs | `sm:max-w-[800px] max-h-[90vh] overflow-y-auto` |

## Modal simples

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold text-sonda-blue">Título do Modal</DialogTitle>
      <DialogDescription className="text-sm text-gray-500">
        Descrição opcional do que o modal faz
      </DialogDescription>
    </DialogHeader>

    <div className="py-4">{/* conteúdo */}</div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Modal com formulário (cadastro/edição)

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold text-sonda-blue">
        {mode === 'create' ? 'Novo Registro' : 'Editar Registro'}
      </DialogTitle>
      <DialogDescription className="text-sm text-gray-500">
        Preencha os dados do formulário
      </DialogDescription>
    </DialogHeader>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* FormField — ver formularios.md */}
        </div>

        <DialogFooter className="pt-6 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button type="submit" className="bg-sonda-blue hover:bg-sonda-dark-blue">
            {mode === 'create' ? 'Criar' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

## Modal com tabs (formulário longo)

Use quando houver muitos campos ou seções distintas. Os botões de ação ficam **fora** das tabs, no `DialogFooter`.

```tsx
const [activeTab, setActiveTab] = useState('principal');

<DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
  {/* DialogHeader ... */}
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-lg">
          <TabsTrigger
            value="principal"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
          >
            Informações Principais
          </TabsTrigger>
          <TabsTrigger
            value="adicionais"
            className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
          >
            Informações Adicionais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="principal" className="mt-4 space-y-6">{/* campos */}</TabsContent>
        <TabsContent value="adicionais" className="mt-4 space-y-6">{/* campos */}</TabsContent>
      </Tabs>

      <DialogFooter className="pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
        <Button type="submit" className="bg-sonda-blue hover:bg-sonda-dark-blue">
          {mode === 'create' ? 'Criar' : 'Salvar Alterações'}
        </Button>
      </DialogFooter>
    </form>
  </Form>
</DialogContent>
```

## Confirmação de ação destrutiva

Obrigatório antes de excluir, disparar email ou qualquer operação irreversível.

```tsx
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
        Confirmar Ação
      </AlertDialogTitle>
      <AlertDialogDescription className="text-sm text-gray-500">
        Esta ação não pode ser desfeita. Tem certeza de que deseja continuar?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction className="bg-sonda-blue hover:bg-sonda-dark-blue">
        Confirmar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

Existe também o hook `useConfirmDialog` (`@/hooks/useConfirmDialog`) para confirmações imperativas.
