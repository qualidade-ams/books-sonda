# Formulários

Todo formulário usa **React Hook Form + Zod**. Os componentes `Form*` vêm de `@/components/ui/form`.

## Regras visuais

| Elemento | Normal | Com erro |
|---|---|---|
| Label | `text-sm font-medium text-gray-700` | `text-sm font-medium text-red-500` |
| Input / Select / Textarea | `focus:ring-sonda-blue focus:border-sonda-blue` | `border-red-500 focus:ring-red-500 focus:border-red-500` |
| Mensagem de erro | — | `<p className="text-sm text-red-500">` (ou `<FormMessage />`) |

- Campo obrigatório recebe asterisco: `<span className="text-red-500">*</span>`.
- Texto de ajuda: `text-xs text-gray-500`.
- Espaçamento: `space-y-6` no `<form>`, `space-y-2` em cada grupo label+campo, `gap-4` no grid de campos lado a lado.
- Botões no fim, separados por `border-t pt-6`, alinhados com `justify-end space-x-3`.
- Campos em linha: `grid grid-cols-1 md:grid-cols-2 gap-4`.

## Formulário com React Hook Form + Zod

```tsx
const bookSchema = z.object({
  empresa_id: z.string().uuid('Empresa inválida'),
  periodo: z.string().min(1, 'Período obrigatório'),
  observacoes: z.string().max(500).optional(),
});

type BookFormData = z.infer<typeof bookSchema>;

const form = useForm<BookFormData>({ resolver: zodResolver(bookSchema) });

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="periodo"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Período <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="MM/AAAA"
                {...field}
                className={form.formState.errors.periodo
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'focus:ring-sonda-blue focus:border-sonda-blue'}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="empresa_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-gray-700">
              Empresa <span className="text-red-500">*</span>
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger className={form.formState.errors.empresa_id
                  ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                  : 'focus:ring-sonda-blue focus:border-sonda-blue'}>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <div className="flex justify-end space-x-3 pt-6 border-t">
      <Button type="button" variant="outline">Cancelar</Button>
      <Button type="submit" className="bg-sonda-blue hover:bg-sonda-dark-blue">
        <Save className="h-4 w-4 mr-2" />
        Salvar
      </Button>
    </div>
  </form>
</Form>
```

## Campos avulsos (fora do RHF)

```tsx
{/* Textarea */}
<div className="space-y-2">
  <Label htmlFor="obs" className="text-sm font-medium text-gray-700">Observações</Label>
  <Textarea id="obs" rows={4} placeholder="Digite uma mensagem..."
            className="focus:ring-sonda-blue focus:border-sonda-blue" />
  <p className="text-xs text-gray-500">Máximo de 500 caracteres</p>
</div>

{/* Checkbox */}
<div className="flex items-center space-x-2">
  <Checkbox id="termos" />
  <Label htmlFor="termos" className="text-sm">Aceito os termos e condições</Label>
</div>

{/* Switch */}
<div className="flex items-center space-x-2">
  <Switch id="notificacoes" />
  <Label htmlFor="notificacoes" className="text-sm">Receber notificações por email</Label>
</div>
```

## Schemas Zod reaproveitáveis

Schemas compartilhados vivem em `src/schemas/`. Padrões comuns:

```ts
const emailSchema = z.string().email('Email inválido');
const requiredStringSchema = z.string().min(1, 'Campo obrigatório');
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Telefone inválido');
const dateSchema = z.string().refine((d) => !isNaN(Date.parse(d)), 'Data inválida');
```

Mensagens de validação sempre em português e específicas ao campo.
