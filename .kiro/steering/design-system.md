# Design System - Books SND

Este steering define o design system completo do Books SND, estabelecendo padrões visuais, componentes e diretrizes de UX para garantir consistência em todo o sistema.

## Identidade Visual

### Paleta de Cores Sonda
```css
/* Cores primárias */
--sonda-blue: #0066CC
--sonda-dark-blue: #004499
--sonda-light-blue: #3385D6
--sonda-accent-blue: #66B2FF

/* Cores secundárias */
--sonda-gray: #6B7280
--sonda-light-gray: #F3F4F6
--sonda-dark-gray: #374151

/* Estados */
--success: #10B981
--warning: #F59E0B
--error: #EF4444
--info: #3B82F6

/* Backgrounds */
--bg-primary: #FFFFFF
--bg-secondary: #F9FAFB
--bg-tertiary: #F3F4F6
```

### Tipografia
- **Fonte principal**: Inter (Google Fonts)
- **Hierarquia de títulos**:
  - H1: 2.25rem (36px) - font-bold
  - H2: 1.875rem (30px) - font-semibold
  - H3: 1.5rem (24px) - font-semibold
  - H4: 1.25rem (20px) - font-medium
  - Body: 1rem (16px) - font-normal
  - Small: 0.875rem (14px) - font-normal

## Componentes Padronizados

### 1. Layout Base
```tsx
// Estrutura padrão para páginas administrativas
<div className="min-h-screen bg-bg-secondary">
  <PageHeader title="Título da Página" subtitle="Descrição opcional" />
  <main className="container mx-auto px-4 py-6">
    <PageContent>
      {/* Conteúdo da página */}
    </PageContent>
  </main>
</div>
```

### 2. Cards Padronizados
```tsx
// Card básico
<Card className="p-6 shadow-sm border border-gray-200">
  <CardHeader>
    <CardTitle className="text-sonda-blue">Título</CardTitle>
    <CardDescription>Descrição opcional</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>

// Card de estatística
<StatsCard 
  title="Total de Elogios"
  value="156"
  icon={<Heart className="h-5 w-5" />}
  trend="+12%"
  trendDirection="up"
/>
```

### 3. Botões Padronizados
```tsx
// Botão primário Sonda
<Button className="bg-sonda-blue hover:bg-sonda-dark-blue text-white">
  Ação Principal
</Button>

// Botão secundário
<Button variant="outline" className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10">
  Ação Secundária
</Button>

// Botão de perigo
<Button variant="destructive">
  Excluir
</Button>
```

### 4. Formulários Padronizados
```tsx
// Estrutura padrão de formulário
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="campo"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium text-gray-700">
            Label do Campo
          </FormLabel>
          <FormControl>
            <Input 
              placeholder="Placeholder descritivo"
              className="focus:ring-sonda-blue focus:border-sonda-blue"
              {...field} 
            />
          </FormControl>
          <FormDescription>
            Texto de ajuda opcional
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    
    <div className="flex justify-end space-x-3">
      <Button type="button" variant="outline">Cancelar</Button>
      <Button type="submit" className="bg-sonda-blue hover:bg-sonda-dark-blue">
        Salvar
      </Button>
    </div>
  </form>
</Form>
```

### 5. Tabelas Padronizadas
```tsx
// Estrutura padrão de tabela
<div className="bg-white rounded-lg shadow-sm border">
  <div className="px-6 py-4 border-b border-gray-200">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold text-gray-900">Título da Tabela</h3>
      <div className="flex space-x-2">
        {/* Ações da tabela */}
      </div>
    </div>
  </div>
  
  <Table>
    <TableHeader>
      <TableRow className="bg-gray-50">
        <TableHead className="font-semibold text-gray-700">Coluna</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow className="hover:bg-gray-50">
        <TableCell>Conteúdo</TableCell>
      </TableRow>
    </TableBody>
  </Table>
</div>
```

### 6. Modais Padronizados
```tsx
// Modal padrão
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold text-sonda-blue">
        Título do Modal
      </DialogTitle>
      <DialogDescription>
        Descrição opcional do que o modal faz
      </DialogDescription>
    </DialogHeader>
    
    <div className="py-4">
      {/* Conteúdo do modal */}
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
      <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
        Confirmar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 7. Sistema de Notificações
```tsx
// Toast de sucesso
toast({
  title: "Sucesso!",
  description: "Operação realizada com sucesso.",
  variant: "success"
})

// Toast de erro
toast({
  title: "Erro",
  description: "Ocorreu um erro ao processar a solicitação.",
  variant: "destructive"
})

// Toast de aviso
toast({
  title: "Atenção",
  description: "Verifique os dados antes de continuar.",
  variant: "warning"
})
```

### 8. Estados de Loading
```tsx
// Skeleton para tabelas
<TableSkeleton rows={5} columns={4} />

// Skeleton para cards
<CardSkeleton />

// Loading spinner
<div className="flex justify-center items-center py-8">
  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
</div>
```

### 9. Estados Vazios
```tsx
// Estado vazio padrão
<EmptyState
  icon={<FileX className="h-12 w-12 text-gray-400" />}
  title="Nenhum item encontrado"
  description="Não há dados para exibir no momento."
  action={
    <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
      Adicionar Item
    </Button>
  }
/>
```

## Padrões de UX

### 1. Navegação
- **Breadcrumbs**: Sempre incluir em páginas internas
- **Menu lateral**: Usar ícones + texto para melhor usabilidade
- **Navegação temporal**: Botões anterior/próximo para períodos

### 2. Feedback Visual
- **Loading states**: Sempre mostrar feedback durante operações
- **Confirmações**: Modais para ações destrutivas
- **Validação**: Feedback imediato em formulários
- **Toasts**: Notificações não-intrusivas para feedback

### 3. Responsividade
- **Mobile-first**: Design responsivo começando pelo mobile
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Tabelas**: Scroll horizontal em telas pequenas
- **Modais**: Fullscreen em mobile

### 4. Acessibilidade
- **Contraste**: Mínimo 4.5:1 para texto normal
- **Focus**: Estados de foco visíveis em todos os elementos interativos
- **ARIA**: Labels e roles apropriados
- **Keyboard**: Navegação completa por teclado

## Componentes Específicos do Sistema

### 1. SeletorTemplateElogios
```tsx
// Padrão para seletores de template
<div className="space-y-2">
  <Label className="text-sm font-medium text-gray-700">
    Template de Elogios
  </Label>
  <Select value={templateSelecionado} onValueChange={onTemplateChange}>
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Selecione um template" />
    </SelectTrigger>
    <SelectContent>
      {templates.map((template) => (
        <SelectItem key={template.value} value={template.value}>
          <div className="flex items-center space-x-2">
            <span>{template.label}</span>
            {template.isDefault && (
              <Badge variant="secondary" className="text-xs">Padrão</Badge>
            )}
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 2. Cards de Estatísticas
```tsx
// Padrão para cards de estatísticas
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
  <StatsCard
    title="Total de Elogios"
    value={stats.total}
    icon={<MessageSquare className="h-5 w-5 text-sonda-blue" />}
    className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
  />
  <StatsCard
    title="Compartilhados"
    value={stats.compartilhados}
    icon={<Share2 className="h-5 w-5 text-green-600" />}
    className="bg-gradient-to-r from-green-50 to-green-100 border-green-200"
  />
  <StatsCard
    title="Registrados"
    value={stats.registrados}
    icon={<FileText className="h-5 w-5 text-orange-600" />}
    className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
  />
</div>
```

### 3. Filtros e Busca
```tsx
// Padrão para barra de filtros
<div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
    <div className="flex-1">
      <Input
        placeholder="Buscar..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-sm focus:ring-sonda-blue focus:border-sonda-blue"
      />
    </div>
    <div className="flex space-x-2">
      <Select value={filtro} onValueChange={setFiltro}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrar por..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="ativo">Ativos</SelectItem>
          <SelectItem value="inativo">Inativos</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</div>
```

## Diretrizes de Implementação

### 1. Estrutura de Arquivos
```
src/components/ui/
├── stats-card.tsx          # Card de estatísticas
├── empty-state.tsx         # Estado vazio
├── page-header.tsx         # Cabeçalho de página
├── table-skeleton.tsx      # Skeleton para tabelas
└── protected-action.tsx    # Wrapper para ações protegidas
```

### 2. Classes Tailwind Personalizadas
```css
/* tailwind.config.ts */
theme: {
  extend: {
    colors: {
      'sonda-blue': '#0066CC',
      'sonda-dark-blue': '#004499',
      'sonda-light-blue': '#3385D6',
      'sonda-accent-blue': '#66B2FF',
    },
    fontFamily: {
      'inter': ['Inter', 'sans-serif'],
    }
  }
}
```

### 3. Hooks Padronizados
- `useToast` - Sistema de notificações
- `useConfirmDialog` - Diálogos de confirmação
- `useLocalStorage` - Persistência local
- `useDebounce` - Debounce para buscas

### 4. Validação de Formulários
```tsx
// Esquemas Zod padronizados
const emailSchema = z.string().email("Email inválido")
const requiredStringSchema = z.string().min(1, "Campo obrigatório")
const optionalStringSchema = z.string().optional()
```

## Checklist de Implementação

Ao criar novos componentes ou páginas, verificar:

- [ ] Usa paleta de cores Sonda
- [ ] Segue hierarquia tipográfica
- [ ] Implementa estados de loading
- [ ] Inclui tratamento de erro
- [ ] É responsivo (mobile-first)
- [ ] Tem feedback visual adequado
- [ ] Segue padrões de acessibilidade
- [ ] Usa componentes padronizados
- [ ] Implementa validação adequada
- [ ] Inclui documentação/comentários

---

Este design system garante consistência visual e de experiência em todo o sistema Books SND, facilitando manutenção e evolução do produto.