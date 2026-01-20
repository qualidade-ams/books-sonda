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
- **Layout de páginas**: `px-6 py-6` - Espaçamento padrão para novas páginas (⚠️ NÃO use `container mx-auto px-4`)
- **Espaçamento entre seções**: `space-y-6` ou `space-y-8`
- **Espaçamento interno de cards**: `p-6` (header) e `p-6 pt-6` (content)
- **Grid responsivo**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Gaps padrão**: `gap-4` (pequeno), `gap-6` (médio), `gap-8` (grande)

### Bordas e Sombras
- **Border radius**: `rounded-lg` (8px) para cards e componentes
- **Sombras**: `shadow-sm` para cards, `shadow-md` para modais
- **Bordas**: `border border-gray-200` para elementos neutros

## Componentes Padronizados

### 1. Layout Base (PADRÃO OFICIAL - Atualizado 2026-01-20)

**⚠️ IMPORTANTE**: Use `px-6` em vez de `container mx-auto px-4` para evitar espaçamento lateral excessivo.

```tsx
// ✅ ESTRUTURA PADRÃO CORRETA para novas páginas administrativas
<AdminLayout>
  <div className="min-h-screen bg-bg-secondary">
    <div className="px-6 py-6 space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Título da Página
          </h1>
          <p className="text-muted-foreground mt-1">
            Descrição ou contexto da página
          </p>
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

      {/* Cards de Estatísticas (opcional) */}
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-sonda-blue">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Métrica 2
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl lg:text-2xl font-bold text-sonda-blue">455h20min</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Métrica 3
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl lg:text-2xl font-bold text-green-600">R$ 26.554,92</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Métrica 4
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl lg:text-2xl font-bold text-orange-600">R$ 0,00</div>
          </CardContent>
        </Card>
      </div>

      {/* Card Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Título do Card Principal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Conteúdo da página */}
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                Os componentes desta tela serão adicionados em breve
              </p>
              <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
                <Plus className="h-4 w-4 mr-2" />
                Ação Principal
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</AdminLayout>

// ❌ NÃO USE (espaçamento lateral excessivo):
// <div className="container mx-auto px-4 py-6 space-y-8">

// ✅ USE (espaçamento correto):
// <div className="px-6 py-6 space-y-8">
```

**Padrões Obrigatórios**:
- ✅ `px-6 py-6` para espaçamento lateral e vertical consistente
- ✅ `space-y-8` para espaçamento entre seções
- ✅ Cabeçalho com título H1 e subtítulo
- ✅ Botões de ação no canto superior direito
- ✅ Cards de estatísticas em grid responsivo (opcional)
- ✅ Card principal com conteúdo da página
- ✅ Estado vazio com ícone, mensagem e botão de ação

**Exemplo Real**: Veja as páginas `GeracaoBooks.tsx` e `ControleBancoHoras.tsx`

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

### 4. Cards de Conteúdo (Padrão Real do Sistema)
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

// Card de listagem com dados estruturados (padrão usado no sistema)
<Card>
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-base font-medium">RF-7874654</CardTitle>
      <Badge className="bg-blue-100 text-blue-800 text-xs">Compras e SOCS</Badge>
    </div>
    <CardDescription className="text-sm text-gray-600">
      Horas de Horas
    </CardDescription>
  </CardHeader>
  <CardContent className="pt-0">
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-500">Cliente:</span>
        <span className="font-medium">SOUZA CRUZ</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Período:</span>
        <span>01/2026</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-500">Total:</span>
        <span className="font-semibold">10:30</span>
      </div>
    </div>
    
    <div className="flex justify-end gap-1 mt-4 pt-3 border-t">
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
  </CardContent>
</Card>

// Card de formulário com seções
<Card>
  <CardHeader>
    <CardTitle className="text-sonda-blue flex items-center gap-2">
      <Settings className="h-5 w-5" />
      Configurações do Sistema
    </CardTitle>
    <CardDescription>
      Configure as opções gerais do sistema
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Seção de configurações */}
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900 border-b pb-2">
        Notificações
      </h4>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Email de notificações</Label>
            <p className="text-xs text-gray-500">Receber alertas por email</p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Notificações push</Label>
            <p className="text-xs text-gray-500">Alertas no navegador</p>
          </div>
          <Switch />
        </div>
      </div>
    </div>

    {/* Botões de ação */}
    <div className="flex justify-end space-x-3 pt-4 border-t">
      <Button variant="outline">Cancelar</Button>
      <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
        Salvar Configurações
      </Button>
    </div>
  </CardContent>
</Card>

// IMPORTANTE: Padrões para cards de conteúdo:
// - CardHeader com pb-3 para espaçamento reduzido quando há CardDescription
// - CardContent com pt-0 quando segue CardHeader com descrição
// - Badges com cores contextuais (bg-blue-100 text-blue-800)
// - Divisores com border-t para separar seções
// - Botões de ação sempre no final com justify-end
// - Informações estruturadas com flex justify-between
// - Textos auxiliares com text-gray-500 e text-sm
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

### 5. Sistema de Filtros Padronizado (Padrão Real do Sistema)
```tsx
// Estrutura completa de filtros conforme usado no sistema
// Baseado no padrão das páginas "Requerimentos Não Enviados" e similares

const [showFilters, setShowFilters] = useState(false);
const [filtros, setFiltros] = useState({
  busca: '',
  modulo: 'all',
  tipoCobranca: 'all',
  periodo: 'all'
});

// Função para verificar se há filtros ativos
const hasActiveFilters = () => {
  return filtros.busca !== '' || 
         filtros.modulo !== 'all' || 
         filtros.tipoCobranca !== 'all' || 
         filtros.periodo !== 'all';
};

// Função para limpar filtros
const limparFiltros = () => {
  setFiltros({
    busca: '',
    modulo: 'all',
    tipoCobranca: 'all',
    periodo: 'all'
  });
};

// Estrutura do cabeçalho com filtros
<Card>
  <CardHeader>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Requerimentos Não Enviados
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
        
        {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
        {hasActiveFilters() && (
          <Button
            variant="outline"
            size="sm"
            onClick={limparFiltros}
            className="whitespace-nowrap hover:border-red-300"
          >
            <X className="h-4 w-4 mr-2 text-red-600" />
            Limpar Filtro
          </Button>
        )}
      </div>
    </div>

    {/* Área de filtros expansível - PADRÃO REAL */}
    {showFilters && (
      <div className="space-y-4 pt-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Campo de busca com ícone */}
          <div>
            <div className="text-sm font-medium mb-2">Buscar</div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por chamado, cliente..."
                value={filtros.busca}
                onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>
          </div>

          {/* Filtro Módulo */}
          <div>
            <div className="text-sm font-medium mb-2">Módulo</div>
            <Select 
              value={filtros.modulo} 
              onValueChange={(value) => setFiltros({...filtros, modulo: value})}
            >
              <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                <SelectValue placeholder="Todos os módulos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os módulos</SelectItem>
                <SelectItem value="compras">Compras e SOCS</SelectItem>
                <SelectItem value="controle">Controle Horas</SelectItem>
                <SelectItem value="financeiro">Financeiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Tipo de Cobrança */}
          <div>
            <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
            <Select 
              value={filtros.tipoCobranca} 
              onValueChange={(value) => setFiltros({...filtros, tipoCobranca: value})}
            >
              <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os tipos</SelectItem>
                <SelectItem value="horas">Por Horas</SelectItem>
                <SelectItem value="fixo">Valor Fixo</SelectItem>
                <SelectItem value="projeto">Por Projeto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Período */}
          <div>
            <div className="text-sm font-medium mb-2">Período de Cobrança</div>
            <Select 
              value={filtros.periodo} 
              onValueChange={(value) => setFiltros({...filtros, periodo: value})}
            >
              <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                <SelectValue placeholder="Todos os períodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os períodos</SelectItem>
                <SelectItem value="01/2026">01/2026</SelectItem>
                <SelectItem value="12/2025">12/2025</SelectItem>
                <SelectItem value="11/2025">11/2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    )}
  </CardHeader>

  <CardContent>
    {/* Conteúdo da tabela aqui */}
  </CardContent>
</Card>

// IMPORTANTE: Estrutura obrigatória para filtros:
// 1. Botões "Filtros" e "Limpar Filtro" no cabeçalho
// 2. Botão "Limpar Filtro" só aparece se hasActiveFilters() retorna true
// 3. Área expansível com border-t quando showFilters = true
// 4. Grid responsivo: grid-cols-1 md:grid-cols-4
// 5. Campo de busca sempre com ícone Search posicionado à esquerda
// 6. Labels com text-sm font-medium mb-2
// 7. Todos os selects com focus:ring-sonda-blue focus:border-sonda-blue
// 8. Placeholders descritivos ("Todos os módulos", "Buscar por chamado, cliente...")
// 9. Botão "Limpar Filtro" com ícone vermelho (text-red-600) mas texto preto padrão
// 10. Ícone X no botão "Limpar Filtro" em vez de Filter
```

## Códigos de Exemplo por Tipo de Campo de Filtro

### Campo de Busca com Ícone
```tsx
// Campo de busca padrão usado em filtros
<div>
  <div className="text-sm font-medium mb-2">Buscar</div>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
    <Input
      placeholder="Buscar por chamado, cliente..."
      value={filtros.busca}
      onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
      className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
    />
  </div>
</div>
```

### Select de Módulo
```tsx
// Select para filtro de módulo
<div>
  <div className="text-sm font-medium mb-2">Módulo</div>
  <Select 
    value={filtros.modulo} 
    onValueChange={(value) => setFiltros({...filtros, modulo: value})}
  >
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Todos os módulos" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os módulos</SelectItem>
      <SelectItem value="compras">Compras e SOCS</SelectItem>
      <SelectItem value="controle">Controle Horas</SelectItem>
      <SelectItem value="financeiro">Financeiro</SelectItem>
      <SelectItem value="rh">Recursos Humanos</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Select de Tipo de Cobrança
```tsx
// Select para filtro de tipo de cobrança
<div>
  <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
  <Select 
    value={filtros.tipoCobranca} 
    onValueChange={(value) => setFiltros({...filtros, tipoCobranca: value})}
  >
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Todos os tipos" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os tipos</SelectItem>
      <SelectItem value="horas">Por Horas</SelectItem>
      <SelectItem value="fixo">Valor Fixo</SelectItem>
      <SelectItem value="projeto">Por Projeto</SelectItem>
      <SelectItem value="mensal">Mensalidade</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Select de Período de Cobrança
```tsx
// Select para filtro de período
<div>
  <div className="text-sm font-medium mb-2">Período de Cobrança</div>
  <Select 
    value={filtros.periodo} 
    onValueChange={(value) => setFiltros({...filtros, periodo: value})}
  >
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Todos os períodos" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os períodos</SelectItem>
      <SelectItem value="01/2026">01/2026</SelectItem>
      <SelectItem value="12/2025">12/2025</SelectItem>
      <SelectItem value="11/2025">11/2025</SelectItem>
      <SelectItem value="10/2025">10/2025</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Select de Status
```tsx
// Select para filtro de status
<div>
  <div className="text-sm font-medium mb-2">Status</div>
  <Select 
    value={filtros.status} 
    onValueChange={(value) => setFiltros({...filtros, status: value})}
  >
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Todos os status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os status</SelectItem>
      <SelectItem value="pendente">Pendente</SelectItem>
      <SelectItem value="aprovado">Aprovado</SelectItem>
      <SelectItem value="rejeitado">Rejeitado</SelectItem>
      <SelectItem value="enviado">Enviado</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Campo de Data (Período)
```tsx
// Campos de data para filtro por período
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
  <div>
    <div className="text-sm font-medium mb-2">Data Início</div>
    <Input
      type="date"
      value={filtros.dataInicio}
      onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
      className="focus:ring-sonda-blue focus:border-sonda-blue"
    />
  </div>
  <div>
    <div className="text-sm font-medium mb-2">Data Fim</div>
    <Input
      type="date"
      value={filtros.dataFim}
      onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
      className="focus:ring-sonda-blue focus:border-sonda-blue"
    />
  </div>
</div>
```

### Select de Cliente/Empresa
```tsx
// Select para filtro de cliente
<div>
  <div className="text-sm font-medium mb-2">Cliente</div>
  <Select 
    value={filtros.cliente} 
    onValueChange={(value) => setFiltros({...filtros, cliente: value})}
  >
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Todos os clientes" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os clientes</SelectItem>
      <SelectItem value="souza-cruz">SOUZA CRUZ</SelectItem>
      <SelectItem value="whirlpool">WHIRLPOOL</SelectItem>
      <SelectItem value="citrosuco">CITROSUCO</SelectItem>
      <SelectItem value="petrobras">PETROBRAS</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### Campo Numérico (Valor)
```tsx
// Campo numérico para filtros de valor
<div>
  <div className="text-sm font-medium mb-2">Valor Mínimo</div>
  <Input
    type="number"
    placeholder="R$ 0,00"
    value={filtros.valorMinimo}
    onChange={(e) => setFiltros({...filtros, valorMinimo: e.target.value})}
    className="focus:ring-sonda-blue focus:border-sonda-blue"
  />
</div>
```

### Checkbox para Filtros Múltiplos
```tsx
// Checkbox para filtros de múltipla seleção
<div>
  <div className="text-sm font-medium mb-2">Opções</div>
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <Checkbox 
        id="opcao1"
        checked={filtros.opcoes.includes('opcao1')}
        onCheckedChange={(checked) => {
          if (checked) {
            setFiltros({...filtros, opcoes: [...filtros.opcoes, 'opcao1']});
          } else {
            setFiltros({...filtros, opcoes: filtros.opcoes.filter(o => o !== 'opcao1')});
          }
        }}
      />
      <Label htmlFor="opcao1" className="text-sm">Opção 1</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox 
        id="opcao2"
        checked={filtros.opcoes.includes('opcao2')}
        onCheckedChange={(checked) => {
          if (checked) {
            setFiltros({...filtros, opcoes: [...filtros.opcoes, 'opcao2']});
          } else {
            setFiltros({...filtros, opcoes: filtros.opcoes.filter(o => o !== 'opcao2')});
          }
        }}
      />
      <Label htmlFor="opcao2" className="text-sm">Opção 2</Label>
    </div>
  </div>
</div>
```

### 6. Formulários Padronizados (Padrão Real do Sistema)
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

      {/* Campo com erro - PADRÃO REAL DO SISTEMA */}
      <div className="space-y-2">
        <Label htmlFor="input-error" className="text-sm font-medium text-gray-700">
          Input com Erro
        </Label>
        <Input 
          id="input-error"
          placeholder="Campo obrigatório"
          className="border-red-500 focus:ring-red-500 focus:border-red-500"
        />
        <p className="text-sm text-red-500">Este campo é obrigatório</p>
      </div>

      {/* Campo obrigatório com asterisco */}
      <div className="space-y-2">
        <Label htmlFor="campo-obrigatorio" className="text-sm font-medium text-gray-700">
          Campo Obrigatório <span className="text-red-500">*</span>
        </Label>
        <Input 
          id="campo-obrigatorio"
          placeholder="Digite o valor..."
          className="focus:ring-sonda-blue focus:border-sonda-blue"
          required
        />
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

      {/* Select com erro */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">
          Select com Erro <span className="text-red-500">*</span>
        </Label>
        <Select>
          <SelectTrigger className="border-red-500 focus:ring-red-500 focus:border-red-500">
            <SelectValue placeholder="Selecione uma opção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="opcao1">Opção 1</SelectItem>
            <SelectItem value="opcao2">Opção 2</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-red-500">Seleção obrigatória</p>
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
          rows={4}
        />
      </div>

      {/* Textarea com erro */}
      <div className="space-y-2">
        <Label htmlFor="textarea-error" className="text-sm font-medium text-gray-700">
          Comentários <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="textarea-error"
          placeholder="Campo obrigatório"
          className="border-red-500 focus:ring-red-500 focus:border-red-500"
          rows={4}
        />
        <p className="text-sm text-red-500">Comentário é obrigatório</p>
      </div>

      {/* Controles */}
      <div className="flex items-center space-x-2">
        <Checkbox id="checkbox" />
        <Label htmlFor="checkbox" className="text-sm">
          Aceito os termos e condições
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch id="switch" />
        <Label htmlFor="switch" className="text-sm">
          Receber notificações por email
        </Label>
      </div>

      {/* Grupo de campos em linha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="data-inicio" className="text-sm font-medium text-gray-700">
            Data Início
          </Label>
          <Input 
            id="data-inicio"
            type="date"
            className="focus:ring-sonda-blue focus:border-sonda-blue"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="data-fim" className="text-sm font-medium text-gray-700">
            Data Fim
          </Label>
          <Input 
            id="data-fim"
            type="date"
            className="focus:ring-sonda-blue focus:border-sonda-blue"
          />
        </div>
      </div>
      
      {/* Botões do formulário */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" variant="outline">
          Cancelar
        </Button>
        <Button type="submit" className="bg-sonda-blue hover:bg-sonda-dark-blue">
          <Save className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </form>
  </CardContent>
</Card>

// IMPORTANTE: Padrões para formulários:
// 1. Labels sempre com text-sm font-medium text-gray-700
// 2. Campos obrigatórios marcados com asterisco vermelho: <span className="text-red-500">*</span>
// 3. Estados de erro: border-red-500 focus:ring-red-500 focus:border-red-500
// 4. Mensagens de erro: text-sm text-red-500
// 5. Estados normais: focus:ring-sonda-blue focus:border-sonda-blue
// 6. Textos de ajuda: text-xs text-gray-500
// 7. Espaçamento entre campos: space-y-6 no form, space-y-2 nos grupos
// 8. Botões sempre no final com border-t e pt-6
// 9. Grid responsivo para campos em linha: grid-cols-1 md:grid-cols-2
// 10. Placeholders descritivos e contextuais
```

### 7. Tabelas Padronizadas (Padrão Real do Sistema)
```tsx
// Estrutura completa de tabela conforme usado no sistema
// Baseado no padrão "Requerimentos Não Enviados" e páginas similares

const [showFilters, setShowFilters] = useState(false);
const [selectedItems, setSelectedItems] = useState<string[]>([]);

// Função para selecionar todos os itens
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    setSelectedItems(data.map(item => item.id));
  } else {
    setSelectedItems([]);
  }
};

// Função para selecionar item individual
const handleSelectItem = (itemId: string, checked: boolean) => {
  if (checked) {
    setSelectedItems([...selectedItems, itemId]);
  } else {
    setSelectedItems(selectedItems.filter(id => id !== itemId));
  }
};

<Card>
  <CardHeader>
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Requerimentos Não Enviados
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
          {/* Filtros aqui - ver seção Sistema de Filtros */}
        </div>
      </div>
    )}
  </CardHeader>

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
          <TableHead className="font-semibold text-gray-700 text-center">H Func</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">H Tec</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Total</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Data Envio</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Data Aprovação</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Valor Total</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center">Período</TableHead>
          <TableHead className="font-semibold text-gray-700 text-center w-24">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id} className="hover:bg-gray-50">
            <TableCell>
              <Checkbox 
                checked={selectedItems.includes(item.id)}
                onCheckedChange={(checked) => handleSelectItem(item.id, checked)}
              />
            </TableCell>
            
            {/* Coluna Chamado com ícone e badge */}
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-blue-600">RF-7874654</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">Horas de Horas</div>
            </TableCell>
            
            {/* Cliente */}
            <TableCell>
              <span className="font-medium">SOUZA CRUZ</span>
            </TableCell>
            
            {/* Módulo com badge colorido */}
            <TableCell>
              <Badge className="bg-blue-100 text-blue-800 text-xs">
                Compras e SOCS
              </Badge>
              <div className="text-xs text-gray-500 mt-1">Módulo Horas</div>
            </TableCell>
            
            {/* Horas - centralizadas */}
            <TableCell className="text-center">
              <span className="font-mono text-sm">2:30</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-mono text-sm">8:00</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="font-mono text-sm font-semibold">10:30</span>
            </TableCell>
            
            {/* Datas */}
            <TableCell className="text-center">
              <span className="text-sm">12/01/2026</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-sm">12/01/2026</span>
            </TableCell>
            
            {/* Valor */}
            <TableCell className="text-center">
              <span className="font-semibold">R$ 2.450,00</span>
            </TableCell>
            
            {/* Período */}
            <TableCell className="text-center">
              <span className="text-sm">01/2026</span>
            </TableCell>
            
            {/* Ações */}
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

    {/* Paginação (opcional) */}
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-gray-500">
        Mostrando {startIndex} a {endIndex} de {totalItems} resultados
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" disabled={currentPage === 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm">
          Página {currentPage} de {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={currentPage === totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardContent>
</Card>

// IMPORTANTE: Padrões obrigatórios para tabelas:
// 1. TableHeader com bg-gray-50 para destacar cabeçalho
// 2. TableHead com font-semibold text-gray-700 para títulos
// 3. TableRow com hover:bg-gray-50 para feedback visual
// 4. Checkbox na primeira coluna para seleção múltipla
// 5. Colunas numéricas (horas, valores) centralizadas com text-center
// 6. Badges coloridos para categorização (bg-blue-100 text-blue-800)
// 7. Botões de ação: variant="outline" size="sm" className="h-8 w-8 p-0"
// 8. Ícones com className="h-4 w-4"
// 9. Cores específicas: text-red-600 hover:text-red-800 (excluir), text-blue-600 hover:text-blue-800 (enviar)
// 10. Overflow horizontal: CardContent com overflow-x-auto
// 11. Informações secundárias com text-xs text-gray-500
// 12. Links/IDs importantes com text-blue-600 e font-medium
// 13. Valores monetários e totais com font-semibold
// 14. Horas com font-mono para alinhamento
```

### 8. Modais Padronizados

#### Modal Simples (Padrão Básico)
```tsx
// Modal padrão para ações simples
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[600px]">
    <DialogHeader>
      <DialogTitle className="text-xl font-semibold text-sonda-blue">
        Título do Modal
      </DialogTitle>
      <DialogDescription className="text-sm text-gray-500">
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

#### Modal com Formulário (Padrão Completo)
```tsx
// Modal com formulário padronizado - USAR ESTE PADRÃO PARA CADASTROS/EDIÇÕES
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
        {/* Campos do formulário */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="campo1"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Campo 1 *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Digite o valor"
                    {...field}
                    className={form.formState.errors.campo1 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'focus:ring-sonda-blue focus:border-sonda-blue'
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="campo2"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Campo 2 *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.campo2 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'focus:ring-sonda-blue focus:border-sonda-blue'
                    }>
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="opcao1">Opção 1</SelectItem>
                    <SelectItem value="opcao2">Opção 2</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões de ação */}
        <DialogFooter className="pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-sonda-blue hover:bg-sonda-dark-blue"
          >
            {mode === 'create' ? 'Criar' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

#### Modal com Tabs (Padrão para Formulários Complexos)
```tsx
// Modal com tabs para organizar formulários complexos
// USAR ESTE PADRÃO quando houver muitos campos ou seções distintas
const [activeTab, setActiveTab] = useState('principal');

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
        {/* Sistema de Tabs */}
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

          {/* Tab 1: Informações Principais */}
          <TabsContent value="principal" className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="campo1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Campo 1 *
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o valor"
                        {...field}
                        className={form.formState.errors.campo1 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>

          {/* Tab 2: Informações Adicionais */}
          <TabsContent value="adicionais" className="mt-4 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      Informações Adicionais
                    </p>
                    <p className="text-sm text-gray-400">
                      Os campos desta seção serão adicionados em breve
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de ação - FORA das tabs */}
        <DialogFooter className="pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-sonda-blue hover:bg-sonda-dark-blue"
          >
            {mode === 'create' ? 'Criar' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

#### Alert Dialog (Confirmação)
```tsx
// Alert Dialog para confirmações de ações destrutivas
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

#### Padrões Obrigatórios para Modais

**Títulos:**
- DialogTitle: `className="text-xl font-semibold text-sonda-blue"`
- DialogDescription: `className="text-sm text-gray-500"`

**FormLabel:**
- Normal: `className="text-sm font-medium text-gray-700"`
- Com erro: `className="text-sm font-medium text-red-500"`

**Inputs/Selects/Textareas:**
- Normal: `className="focus:ring-sonda-blue focus:border-sonda-blue"`
- Com erro: `className="border-red-500 focus:ring-red-500 focus:border-red-500"`

**Tabs (quando necessário):**
- TabsList: `className="bg-gray-100 p-1 rounded-lg"`
- TabsTrigger ativa: `className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"`
- TabsContent: `className="mt-4 space-y-6"`

**Botões:**
- Cancelar: `variant="outline"`
- Confirmar/Salvar: `className="bg-sonda-blue hover:bg-sonda-dark-blue"`

**Espaçamento:**
- Entre campos: `space-y-6` no form
- Entre grupos de campos: `gap-4` no grid
- DialogFooter: `className="pt-6 border-t"` (separador visual)

**Tamanhos:**
- Modal simples: `className="sm:max-w-[600px]"`
- Modal com formulário: `className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto"`
- Modal com tabs: `className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"`
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
// Tabs com fundo branco quando ativa (PADRÃO OFICIAL)
<Tabs defaultValue="tab1" className="w-full">
  <TabsList className="bg-gray-100 p-1 rounded-lg">
    <TabsTrigger 
      value="tab1"
      className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
    >
      Tab 1
    </TabsTrigger>
    <TabsTrigger 
      value="tab2"
      className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
    >
      Tab 2
    </TabsTrigger>
    <TabsTrigger 
      value="tab3"
      className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
    >
      Tab 3
    </TabsTrigger>
  </TabsList>
  <TabsContent value="tab1" className="mt-4">
    {/* Conteúdo da tab */}
  </TabsContent>
</Tabs>

// Classes obrigatórias para tabs (PADRÃO OFICIAL):
// - TabsList: "bg-gray-100 p-1 rounded-lg" (fundo cinza claro com bordas arredondadas)
// - TabsTrigger: "data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
// - TabsContent: "mt-4" (espaçamento superior)

// ❌ NÃO USE MAIS (padrão antigo com azul Sonda):
// - TabsList: "grid w-full grid-cols-3 bg-gray-100 p-1"
// - TabsTrigger: "data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"

// Tabs com cores Sonda (APENAS para páginas especiais como Design System)
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

// Classes para tabs Sonda (uso especial):
// - TabsList: "grid w-full grid-cols-3 bg-gray-100 p-1" (grid com colunas iguais)
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