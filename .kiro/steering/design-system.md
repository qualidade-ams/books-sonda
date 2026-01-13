# Design System - Books SND

Este steering define o design system completo do Books SND, estabelecendo padrões visuais, componentes e diretrizes de UX para garantir consistência em todo o sistema.

**📍 Página de Referência**: `/admin/design-system` - Acesse para visualizar todos os componentes implementados

**🔧 Configuração de Permissões**: Para que a tela apareça no sistema de permissões, execute a migration:
```sql
-- Executar no Supabase SQL Editor
INSERT INTO screens (key, name, description, category, route)
VALUES (
  'design_system',
  'Design System',
  'Biblioteca de componentes padronizados do Books SND',
  'Administração',
  '/admin/design-system'
)
ON CONFLICT (key) DO NOTHING;

-- Conceder permissão para Administradores
INSERT INTO screen_permissions (group_id, screen_key, permission_level)
SELECT ug.id, 'design_system', 'edit'
FROM user_groups ug WHERE ug.name = 'Administradores'
ON CONFLICT (group_id, screen_key) DO UPDATE SET permission_level = EXCLUDED.permission_level;
```

## Identidade Visual

### Paleta de Cores Sonda
```css
/* Cores primárias Sonda - CORRIGIDAS para corresponder à sidebar */
--sonda-blue: #2563eb          /* Azul principal (mesmo da sidebar blue-600) */
--sonda-dark-blue: #1d4ed8     /* Azul escuro para hover (blue-700) */
--sonda-light-blue: #3b82f6    /* Azul claro para backgrounds (blue-500) */
--sonda-accent-blue: #60a5fa   /* Azul de destaque (blue-400) */

/* Cores de estado */
--success: #10B981             /* Verde para sucesso */
--warning: #F59E0B             /* Amarelo para avisos */
--error: #EF4444               /* Vermelho para erros */
--info: #3B82F6                /* Azul para informações */

/* Escala de cinzas */
--sonda-gray: #6B7280          /* Cinza médio */
--sonda-light-gray: #F3F4F6    /* Cinza claro */
--sonda-dark-gray: #374151     /* Cinza escuro */

/* Backgrounds padronizados */
--bg-primary: #FFFFFF          /* Background principal */
--bg-secondary: #F9FAFB        /* Background secundário */
--bg-tertiary: #F3F4F6         /* Background terciário */

/* Paleta oficial Sonda (referência) */
--sonda-black: #000000         /* Negro */
--sonda-gray1: #3D3D3D         /* Gris 1 - RGB(61,61,61) */
--sonda-gray2: #666666         /* Gris 2 - RGB(102,102,102) */
--sonda-gray3: #B1B1B1         /* Gris 3 - RGB(177,177,177) */
--sonda-gray4: #E4E4E4         /* Gris 4 - RGB(228,228,228) */
--sonda-white: #FFFFFF         /* Branco puro */
```

### Tipografia
- **Fonte principal**: Inter (Google Fonts) - `font-family: 'Inter', sans-serif`
- **Hierarquia de títulos**:
  - **H1**: `text-3xl font-bold tracking-tight` (36px) - Títulos principais de página
  - **H2**: `text-2xl font-semibold` (30px) - Seções principais
  - **H3**: `text-xl font-semibold` (24px) - Subsections
  - **H4**: `text-lg font-medium` (20px) - Títulos de cards/componentes
  - **Body**: `text-base` (16px) - Texto principal
  - **Small**: `text-sm` (14px) - Texto auxiliar e descrições
  - **Caption**: `text-xs` (12px) - Labels e metadados

### Espaçamento e Layout
- **Container**: `container mx-auto px-4 py-6` - Layout principal das páginas
- **Espaçamento entre seções**: `space-y-6` ou `space-y-8`
- **Espaçamento interno de cards**: `p-6` (header) e `p-6 pt-6` (content)
- **Grid responsivo**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Gaps padrão**: `gap-4` (pequeno), `gap-6` (médio), `gap-8` (grande)

### Bordas e Sombras
- **Border radius**: `rounded-lg` (8px) para cards e componentes
- **Sombras**: `shadow-sm` para cards, `shadow-md` para modais
- **Bordas**: `border border-gray-200` para elementos neutros

## Componentes Padronizados

### 1. Layout Base
```tsx
// Estrutura padrão para páginas administrativas
<AdminLayout>
  <div className="min-h-screen bg-bg-secondary">
    <div className="container mx-auto px-4 py-6 space-y-8">
      <PageHeader 
        title="Título da Página" 
        subtitle="Descrição opcional"
        actions={
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">Ação Secundária</Button>
            <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
              Ação Principal
            </Button>
          </div>
        }
      />
      
      <main className="space-y-6">
        {/* Conteúdo da página */}
      </main>
    </div>
  </div>
</AdminLayout>
```

### 2. PageHeader Padronizado
```tsx
<PageHeader
  title="Título Principal"
  subtitle="Descrição ou contexto da página"
  breadcrumbs={<Breadcrumb />} // Opcional
  actions={
    <div className="flex space-x-2">
      {/* Botões de ação */}
    </div>
  }
/>
```

### 3. Cards de Estatísticas (Padrão Real do Sistema)
```tsx
// Cards de estatísticas simples - padrão usado nas páginas
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
        Total de Elogios
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">1,234</div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
        Compartilhados
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-xl lg:text-2xl font-bold text-green-600">856</div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
        Registrados
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="text-xl lg:text-2xl font-bold text-orange-600">378</div>
    </CardContent>
  </Card>
</div>

// Cores para títulos de cards de estatísticas:
// - text-gray-600 dark:text-gray-400 (neutro)
// - text-sonda-blue (azul Sonda)
// - text-green-600 (sucesso)
// - text-orange-600 (aviso)
// - text-red-600 (erro)
```

### 4. Cards de Conteúdo
```tsx
// Card padrão com conteúdo estruturado
<Card>
  <CardHeader>
    <CardTitle className="text-sonda-blue">Título do Card</CardTitle>
    <CardDescription>Descrição opcional do card</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-gray-600 mb-4">Conteúdo do card...</p>
    <div className="flex justify-end space-x-2">
      <Button variant="outline" size="sm">Cancelar</Button>
      <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
        Confirmar
      </Button>
    </div>
  </CardContent>
</Card>
```

### 4. Botões Padronizados
```tsx
// Botão primário Sonda (ação principal)
<Button className="bg-sonda-blue hover:bg-sonda-dark-blue text-white">
  <Plus className="h-4 w-4 mr-2" />
  Ação Principal
</Button>

// Botão secundário (ação secundária)
<Button variant="outline" className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10">
  <Edit className="h-4 w-4 mr-2" />
  Ação Secundária
</Button>

// Botão de perigo (ações destrutivas)
<Button variant="destructive">
  <Trash2 className="h-4 w-4 mr-2" />
  Excluir
</Button>

// Botão ghost (ações sutis)
<Button variant="ghost">
  <Eye className="h-4 w-4 mr-2" />
  Visualizar
</Button>

// Botão com loading
<Button disabled className="bg-sonda-blue hover:bg-sonda-dark-blue">
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  Carregando...
</Button>

// Tamanhos disponíveis
<Button size="sm">Pequeno</Button>
<Button size="default">Padrão</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Plus className="h-4 w-4" /></Button>
```

### 5. Botões de Ação em Tabelas (Padrão Real do Sistema)
```tsx
// Botões de ação pequenos usados nas colunas de ações das tabelas
// Padrão usado nas páginas Lançar Pesquisa e Visualizar Pesquisas

// Botão Visualizar - Azul
<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0"
>
  <Eye className="h-4 w-4 text-blue-600" />
</Button>

// Botão Editar - Padrão
<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0"
>
  <Edit className="h-4 w-4" />
</Button>

// Botão Excluir - Vermelho
<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
>
  <Trash2 className="h-4 w-4" />
</Button>

// Botão Enviar - Azul
<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
>
  <Send className="h-4 w-4" />
</Button>

// Exemplo de uso agrupado (coluna Ações)
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

// IMPORTANTE: Classes obrigatórias para botões de ação em tabelas:
// - variant="outline" size="sm" className="h-8 w-8 p-0"
// - Ícones com className="h-4 w-4"
// - Agrupados em div com gap-1
// - Cores específicas: text-red-600 hover:text-red-800 (excluir), text-blue-600 hover:text-blue-800 (enviar)
```

### 6. Botão Exportar com Dropdown
```tsx
// Botão Exportar padrão (outline com dropdown)
<Button 
  variant="outline" 
  className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
>
  <Download className="h-5 w-5 text-gray-600" />
  <span className="text-gray-700 font-medium">Exportar</span>
  <ChevronDown className="h-4 w-4 text-gray-500" />
</Button>

// Botão Exportar azul Sonda
<Button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sonda-blue hover:bg-sonda-dark-blue text-white">
  <Download className="h-5 w-5" />
  <span className="font-medium">Exportar</span>
  <ChevronDown className="h-4 w-4" />
</Button>

// Versão compacta
<Button 
  variant="outline" 
  size="sm" 
  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
>
  <Download className="h-4 w-4 text-gray-600" />
  <span className="text-gray-700">Exportar</span>
  <ChevronDown className="h-3 w-3 text-gray-500" />
</Button>
```

### 5. Sistema de Filtros Padronizado
```tsx
// Barra de filtros com busca
<FilterBar
  showFilters={showFilters}
  onToggleFilters={() => setShowFilters(!showFilters)}
  searchValue={searchValue}
  onSearchChange={setSearchValue}
  searchPlaceholder="Buscar..."
  hasActiveFilters={hasFilters}
  onClearFilters={clearFilters}
>
  <FilterGrid columns={3}>
    <FilterField label="Status">
      <Select>
        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="inativo">Inativo</SelectItem>
        </SelectContent>
      </Select>
    </FilterField>
    {/* Mais filtros... */}
  </FilterGrid>
</FilterBar>
```

### 6. Formulários Padronizados
```tsx
// Estrutura padrão de formulário
<Card>
  <CardHeader>
    <CardTitle className="text-sonda-blue">Título do Formulário</CardTitle>
    <CardDescription>Descrição do que o formulário faz</CardDescription>
  </CardHeader>
  <CardContent>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campo padrão */}
      <div className="space-y-2">
        <Label htmlFor="campo" className="text-sm font-medium text-gray-700">
          Label do Campo
        </Label>
        <Input 
          id="campo"
          placeholder="Placeholder descritivo"
          className="focus:ring-sonda-blue focus:border-sonda-blue"
        />
        <p className="text-xs text-gray-500">Texto de ajuda opcional</p>
      </div>

      {/* Campo com erro */}
      <div className="space-y-2">
        <Label htmlFor="campo-erro" className="text-sm font-medium text-gray-700">
          Campo com Erro
        </Label>
        <Input 
          id="campo-erro"
          className="border-red-500 focus:ring-red-500 focus:border-red-500"
        />
        <p className="text-sm text-red-500">Mensagem de erro</p>
      </div>

      {/* Select padrão */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Select</Label>
        <Select>
          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opcao1">Opção 1</SelectItem>
            <SelectItem value="opcao2">Opção 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Textarea */}
      <div className="space-y-2">
        <Label htmlFor="textarea" className="text-sm font-medium text-gray-700">
          Textarea
        </Label>
        <Textarea
          id="textarea"
          placeholder="Digite uma mensagem..."
          className="focus:ring-sonda-blue focus:border-sonda-blue"
        />
      </div>

      {/* Controles */}
      <div className="flex items-center space-x-2">
        <Checkbox id="checkbox" />
        <Label htmlFor="checkbox">Checkbox</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="switch" />
        <Label htmlFor="switch">Switch</Label>
      </div>
      
      {/* Botões do formulário */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline">Cancelar</Button>
        <Button type="submit" className="bg-sonda-blue hover:bg-sonda-dark-blue">
          Salvar
        </Button>
      </div>
    </form>
  </CardContent>
</Card>
```

### 7. Tabelas Padronizadas (Padrão Real do Sistema)
```tsx
// Estrutura completa de tabela conforme usado no sistema
<Card>
  <CardHeader>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Título da Tabela
      </CardTitle>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={limparFiltros}
          className="whitespace-nowrap"
        >
          <Filter className="h-4 w-4 mr-2" />
          Limpar Filtro
        </Button>
      </div>
    </div>

    {/* Área de filtros expansível */}
    {showFilters && (
      <div className="space-y-4 pt-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Campo de busca */}
          <div>
            <div className="text-sm font-medium mb-2">Buscar</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Outros filtros */}
          <div>
            <div className="text-sm font-medium mb-2">Categoria</div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="opcao1">Opção 1</SelectItem>
                <SelectItem value="opcao2">Opção 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )}
  </CardHeader>

  <CardContent className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50">
          <TableHead className="w-12">
            <Checkbox />
          </TableHead>
          <TableHead className="font-semibold text-gray-700">Coluna 1</TableHead>
          <TableHead className="font-semibold text-gray-700">Coluna 2</TableHead>
          <TableHead className="font-semibold text-gray-700 w-24">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="hover:bg-gray-50">
          <TableCell>
            <Checkbox />
          </TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              <span className="font-medium">Valor Principal</span>
            </div>
            <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">Status</Badge>
          </TableCell>
          <TableCell>Valor Secundário</TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
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
      </TableBody>
    </Table>
  </CardContent>
</Card>

// IMPORTANTE: Botões de ação devem ser:
// - variant="outline" size="sm" className="h-8 w-8 p-0"
// - Ícones com className="h-4 w-4"
// - Agrupados em div com gap-1
// - Cores específicas: text-red-600 hover:text-red-800 (excluir), text-blue-600 hover:text-blue-800 (enviar)
```

### 8. Modais Padronizados
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

// Alert Dialog (confirmação)
<AlertDialog open={open} onOpenChange={setOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="text-sonda-blue">
        Confirmar Ação
      </AlertDialogTitle>
      <AlertDialogDescription>
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

### 9. Sistema de Badges
```tsx
// Badges de status
<Badge variant="default">Padrão</Badge>
<Badge variant="secondary">Secundário</Badge>
<Badge variant="success">Sucesso</Badge>
<Badge variant="warning">Aviso</Badge>
<Badge variant="destructive">Erro</Badge>
<Badge variant="outline">Outline</Badge>

// Badges contextuais
<Badge className="bg-blue-100 text-blue-800">Informação</Badge>
<Badge className="bg-green-100 text-green-800">Ativo</Badge>
<Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>
<Badge className="bg-red-100 text-red-800">Inativo</Badge>
```

### 10. Sistema de Notificações e Feedback
```tsx
// Toast notifications
const { toast } = useToast();

// Toast de sucesso
toast({
  title: "Sucesso!",
  description: "Operação realizada com sucesso.",
  variant: "default" // ou omitir para padrão
});

// Toast de erro
toast({
  title: "Erro",
  description: "Ocorreu um erro ao processar a solicitação.",
  variant: "destructive"
});

// Alerts inline
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Informação</AlertTitle>
  <AlertDescription>
    Esta é uma mensagem informativa para o usuário.
  </AlertDescription>
</Alert>

<Alert className="border-green-200 bg-green-50">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-800">Sucesso</AlertTitle>
  <AlertDescription className="text-green-700">
    Operação realizada com sucesso!
  </AlertDescription>
</Alert>

<Alert className="border-red-200 bg-red-50">
  <XCircle className="h-4 w-4 text-red-600" />
  <AlertTitle className="text-red-800">Erro</AlertTitle>
  <AlertDescription className="text-red-700">
    Ocorreu um erro ao processar a solicitação.
  </AlertDescription>
</Alert>
```

### 11. Estados de Loading e Vazio
```tsx
// Loading spinner
<div className="flex justify-center items-center py-8">
  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
</div>

// Skeleton loading
<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>

// Estado vazio
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

## Padrões de UX
```tsx
// Tabs com cores Sonda padronizadas
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
    <TabsTrigger 
      value="tab1"
      className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
    >
      Tab 1
    </TabsTrigger>
    <TabsTrigger 
      value="tab2"
      className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
    >
      Tab 2
    </TabsTrigger>
    <TabsTrigger 
      value="tab3"
      className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
    >
      Tab 3
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    {/* Conteúdo da tab */}
  </TabsContent>
</Tabs>

// Classes obrigatórias para tabs Sonda:
// - TabsList: "bg-gray-100 p-1" (fundo cinza claro)
// - TabsTrigger: "data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
```

### 1. Navegação e Estrutura
- **Breadcrumbs**: Sempre incluir em páginas internas usando `<PageHeader breadcrumbs={<Breadcrumb />} />`
- **Menu lateral**: Usar ícones + texto para melhor usabilidade (componente `Sidebar`)
- **Navegação temporal**: Botões anterior/próximo para períodos com ícones `ChevronLeft` e `ChevronRight`
- **Tabs**: Para organizar conteúdo relacionado em seções

### 2. Feedback Visual e Interação
- **Loading states**: Sempre mostrar feedback durante operações com `Loader2` ou `Skeleton`
- **Confirmações**: Modais `AlertDialog` para ações destrutivas
- **Validação**: Feedback imediato em formulários com bordas vermelhas e mensagens de erro
- **Toasts**: Notificações não-intrusivas para feedback de ações
- **Hover states**: `hover:bg-gray-50` em linhas de tabela, `hover:bg-sonda-dark-blue` em botões
- **Focus states**: `focus:ring-sonda-blue focus:border-sonda-blue` em inputs

### 3. Responsividade
- **Mobile-first**: Design responsivo começando pelo mobile
- **Breakpoints**: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- **Grid responsivo**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Flex responsivo**: `flex-col md:flex-row`
- **Tabelas**: Scroll horizontal em telas pequenas com `overflow-auto`
- **Modais**: `sm:max-w-[600px]` para largura responsiva

### 4. Acessibilidade
- **Contraste**: Mínimo 4.5:1 para texto normal (cores já otimizadas)
- **Focus**: Estados de foco visíveis em todos os elementos interativos
- **ARIA**: Labels e roles apropriados (já implementados nos componentes shadcn/ui)
- **Keyboard**: Navegação completa por teclado
- **Semantic HTML**: Uso correto de headings, labels, e estrutura semântica

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

### 2. ProtectedAction (Controle de Acesso)
```tsx
// Wrapper para ações que requerem permissões específicas
<ProtectedAction screenKey="ENVIAR_ELOGIOS" action="CREATE">
  <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
    <Send className="h-4 w-4 mr-2" />
    Disparar Elogios
  </Button>
</ProtectedAction>
```

### 3. Navegação Temporal
```tsx
// Padrão para navegação por períodos (mês/ano)
<div className="flex items-center justify-between">
  <div className="flex items-center space-x-4">
    <Button
      variant="outline"
      size="sm"
      onClick={handlePreviousPeriod}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <div className="text-center">
      <h2 className="text-lg font-semibold text-gray-900">
        {mesNome} {ano}
      </h2>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={handleNextPeriod}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  
  <div className="flex space-x-2">
    <Button variant="outline" size="sm">
      <RefreshCw className="h-4 w-4 mr-2" />
      Atualizar
    </Button>
  </div>
</div>
```

## Diretrizes de Implementação

### 1. Estrutura de Arquivos
```
src/components/ui/
├── page-header.tsx         # Cabeçalho padronizado de páginas
├── stats-card.tsx          # Cards de estatísticas
├── empty-state.tsx         # Estado vazio padronizado
├── filter-bar.tsx          # Barra de filtros com busca
├── button.tsx              # Botões com variantes Sonda
├── card.tsx                # Cards básicos
├── table.tsx               # Tabelas responsivas
├── badge.tsx               # Badges de status
├── dialog.tsx              # Modais padronizados
├── alert.tsx               # Alertas inline
├── skeleton.tsx            # Loading skeletons
└── toast.tsx               # Sistema de notificações
```

### 2. Classes Tailwind Personalizadas
```typescript
// tailwind.config.ts - Cores já configuradas
theme: {
  extend: {
    colors: {
      // Cores Sonda
      'sonda-blue': '#0066CC',
      'sonda-dark-blue': '#004499',
      'sonda-light-blue': '#3385D6',
      'sonda-accent-blue': '#66B2FF',
      'sonda-gray': '#6B7280',
      'sonda-light-gray': '#F3F4F6',
      'sonda-dark-gray': '#374151',
      
      // Backgrounds
      'bg-primary': '#FFFFFF',
      'bg-secondary': '#F9FAFB',
      'bg-tertiary': '#F3F4F6',
      
      // Estados
      success: { DEFAULT: '#10B981', 50: '#ecfdf5', 100: '#d1fae5' },
      warning: { DEFAULT: '#F59E0B', 50: '#fffbeb', 100: '#fef3c7' },
    },
    fontFamily: {
      'inter': ['Inter', 'sans-serif'],
    },
    animation: {
      'fade-in': 'fade-in 0.3s ease-out',
      'slide-in-right': 'slide-in-right 0.3s ease-out'
    }
  }
}
```

### 3. Hooks Padronizados
```typescript
// Hooks essenciais do sistema
import { useToast } from '@/hooks/use-toast';           // Notificações
import { useConfirmDialog } from '@/hooks/useConfirmDialog'; // Confirmações
import { useLocalStorage } from '@/hooks/useLocalStorage';   // Persistência
import { useDebounce } from '@/hooks/useDebounce';           // Debounce para buscas
import { useCacheManager } from '@/hooks/useCacheManager';   // Gerenciamento de cache
```

### 4. Validação de Formulários com Zod
```typescript
// Esquemas Zod padronizados
import { z } from 'zod';

const emailSchema = z.string().email("Email inválido");
const requiredStringSchema = z.string().min(1, "Campo obrigatório");
const optionalStringSchema = z.string().optional();
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido");
const dateSchema = z.string().refine((date) => !isNaN(Date.parse(date)), "Data inválida");
```

### 5. Padrões de Importação
```typescript
// Ordem de importação padronizada
import React, { useState, useEffect } from 'react';
import { Lucide icons } from 'lucide-react';

import AdminLayout from '@/components/admin/LayoutAdmin';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// ... outros componentes UI

import ProtectedAction from '@/components/auth/ProtectedAction';
import { useToast } from '@/hooks/use-toast';
// ... outros hooks

import { serviceFunction } from '@/services/serviceFile';
import type { TypeDefinition } from '@/types/typeFile';
```

## Checklist de Implementação

Ao criar novos componentes ou páginas, verificar:

### ✅ Design e Visual
- [ ] Usa paleta de cores Sonda (`sonda-blue`, `sonda-dark-blue`, etc.)
- [ ] Segue hierarquia tipográfica (H1: `text-3xl font-bold`, H2: `text-2xl font-semibold`, etc.)
- [ ] Aplica espaçamento consistente (`space-y-6`, `gap-4`, `p-6`)
- [ ] Usa bordas e sombras padronizadas (`rounded-lg`, `shadow-sm`, `border-gray-200`)
- [ ] Implementa gradientes em cards de estatísticas quando apropriado
- [ ] **CRÍTICO**: Tabs usam cores Sonda (`data-[state=active]:bg-sonda-blue data-[state=active]:text-white`)

### ✅ Componentes e Estrutura
- [ ] Usa `AdminLayout` como wrapper principal
- [ ] Inclui `PageHeader` com título, subtítulo e ações
- [ ] Utiliza componentes UI padronizados (`Button`, `Card`, `Table`, etc.)
- [ ] **Cards de estatísticas**: Usa padrão simples com `CardHeader` (pb-2) e `CardContent` (pt-0)
- [ ] **Tabelas**: Cabeçalho com título + botões "Filtros" e "Limpar Filtro", filtros expansíveis
- [ ] **Botões de ação pequenos**: `variant="ghost" size="sm" className="h-8 w-8 p-0"`
- [ ] **Botões de ação grandes**: `h-20 w-20 p-0 rounded-2xl` com ícones `h-8 w-8`
- [ ] Aplica classes de foco Sonda (`focus:ring-sonda-blue focus:border-sonda-blue`)
- [ ] Usa `ProtectedAction` para controle de acesso quando necessário

### ✅ Estados e Feedback
- [ ] Implementa estados de loading (`Loader2`, `Skeleton`)
- [ ] Inclui tratamento de erro com `Alert` ou `toast`
- [ ] Usa `EmptyState` quando não há dados
- [ ] Implementa confirmações com `AlertDialog` para ações destrutivas
- [ ] Fornece feedback visual adequado (hover, focus, disabled)

### ✅ Responsividade e Acessibilidade
- [ ] É responsivo com abordagem mobile-first
- [ ] Usa grid/flex responsivo (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- [ ] Implementa scroll horizontal em tabelas para mobile
- [ ] Segue padrões de acessibilidade (contraste, focus, ARIA)
- [ ] Suporta navegação por teclado

### ✅ Funcionalidade e UX
- [ ] Implementa validação adequada em formulários
- [ ] Usa `FilterBar` para filtros e busca quando apropriado
- [ ] Inclui ações contextuais (exportar, adicionar, editar, excluir)
- [ ] Fornece breadcrumbs em páginas internas
- [ ] Implementa paginação quando necessário

### ✅ Código e Manutenção
- [ ] Segue padrões de importação (React → Lucide → UI → Auth → Hooks → Services → Types)
- [ ] Usa hooks padronizados (`useToast`, `useCacheManager`, etc.)
- [ ] Implementa TypeScript com tipos apropriados
- [ ] Inclui comentários JSDoc quando necessário
- [ ] Segue convenções de nomenclatura (PascalCase para componentes, camelCase para funções)

### ✅ Performance e Otimização
- [ ] Usa `useMemo` e `useCallback` quando apropriado
- [ ] Implementa lazy loading para componentes pesados
- [ ] Otimiza re-renders desnecessários
- [ ] Usa cache quando apropriado (`useCacheManager`)

---

## 📖 Referência Rápida

**Página de Design System**: `/admin/design-system`
- Visualize todos os componentes implementados
- Teste interações e estados
- Copie códigos de exemplo
- Veja paleta de cores completa

**Componentes Essenciais**:
- `PageHeader` - Cabeçalhos de página
- `Card` com `CardHeader` e `CardContent` - Cards de estatísticas e conteúdo
- `FilterBar` - Filtros e busca
- `EmptyState` - Estados vazios
- `ProtectedAction` - Controle de acesso

**Cores Principais**:
- `bg-sonda-blue hover:bg-sonda-dark-blue` - Botões primários (#2563eb → #1d4ed8)
- `text-sonda-blue` - Títulos e destaques (#2563eb)
- `border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10` - Botões secundários
- `focus:ring-sonda-blue focus:border-sonda-blue` - Estados de foco
- `data-[state=active]:bg-sonda-blue data-[state=active]:text-white` - Tabs ativas

**⚠️ IMPORTANTE**: As cores Sonda agora correspondem exatamente ao azul da sidebar (`blue-600: #2563eb`) para manter consistência visual total.

Este design system garante consistência visual e de experiência em todo o sistema Books SND, facilitando manutenção e evolução do produto.