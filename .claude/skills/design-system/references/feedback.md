# Badges, notificações, loading e estado vazio

## Badges

```tsx
{/* Variantes do componente */}
<Badge variant="default">Padrão</Badge>
<Badge variant="secondary">Secundário</Badge>
<Badge variant="destructive">Erro</Badge>
<Badge variant="outline">Outline</Badge>

{/* Contextuais (usados em tabelas e cards) */}
<Badge className="bg-blue-100 text-blue-800">Informação</Badge>
<Badge className="bg-green-100 text-green-800">Ativo</Badge>
<Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
<Badge className="bg-red-100 text-red-800">Inativo</Badge>
```

Em célula de tabela acrescente `text-xs`.

## Toasts

O projeto tem **duas convenções coexistindo**: `sonner` (import direto) e o hook `useToast`. Ao editar arquivo existente, siga o que já está nele; em código novo, prefira `useToast`.

```tsx
const { toast } = useToast();

toast({ title: 'Sucesso!', description: 'Operação realizada com sucesso.' });

toast({
  title: 'Erro',
  description: 'Ocorreu um erro ao processar a solicitação.',
  variant: 'destructive',
});
```

Toda `useMutation` mostra toast em `onError` (ver skill `padroes-codigo`).

## Alerts inline

```tsx
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Informação</AlertTitle>
  <AlertDescription>Mensagem informativa.</AlertDescription>
</Alert>

<Alert className="border-green-200 bg-green-50">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-800">Sucesso</AlertTitle>
  <AlertDescription className="text-green-700">Operação realizada!</AlertDescription>
</Alert>

<Alert className="border-red-200 bg-red-50">
  <XCircle className="h-4 w-4 text-red-600" />
  <AlertTitle className="text-red-800">Erro</AlertTitle>
  <AlertDescription className="text-red-700">Falha ao processar.</AlertDescription>
</Alert>
```

Toast para feedback de ação pontual; Alert inline para condição persistente da tela.

## Loading

```tsx
{/* Spinner */}
<div className="flex justify-center items-center py-8">
  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
</div>

{/* Skeleton — preferível quando o formato do conteúdo é conhecido */}
<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>
```

Botão em operação assíncrona fica `disabled` com `<Loader2 className="h-4 w-4 mr-2 animate-spin" />`.

## Estado vazio

Nunca renderize lista ou tabela vazia sem contexto. Sempre ícone + título + descrição + ação.

```tsx
<EmptyState
  icon={<FileX className="h-12 w-12 text-gray-400" />}
  title="Nenhum item encontrado"
  description="Não há dados para exibir no momento."
  action={
    <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
      <Plus className="h-4 w-4 mr-2" />
      Adicionar Item
    </Button>
  }
/>
```

`EmptyState` vem de `@/components/ui/empty-state`. Versão inline equivalente:

```tsx
<div className="flex items-center justify-center py-12">
  <div className="text-center">
    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
    <p className="text-gray-500 mb-4">Nenhum registro encontrado</p>
    <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
      <Plus className="h-4 w-4 mr-2" />
      Adicionar
    </Button>
  </div>
</div>
```

Distinga "nenhum dado cadastrado" de "nenhum resultado para o filtro aplicado" — a segunda deve oferecer limpar o filtro, não criar registro.
