/**
 * Design System - Books SND
 * Página de demonstração de todos os componentes padronizados do sistema
 * Serve como referência para desenvolvimento e manutenção da consistência visual
 */

import React, { useState } from 'react';
import {
  Palette,
  Type,
  Square,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Plus,
  Minus,
  Check,
  ChevronDown,
  FileText,
  Database,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  Loader2,
  FileX,
  Send,
  Copy
} from 'lucide-react';

import AdminLayout from '@/components/admin/LayoutAdmin';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterBar, FilterGrid, FilterField } from '@/components/ui/filter-bar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function DesignSystem() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [switchValue, setSwitchValue] = useState(false);
  const [progress, setProgress] = useState(33);
  const [activeCodeExample, setActiveCodeExample] = useState<string | null>(null);

  const handleToast = (variant: 'default' | 'destructive' | 'success') => {
    const messages = {
      default: { title: 'Informação', description: 'Esta é uma notificação informativa.' },
      destructive: { title: 'Erro', description: 'Ocorreu um erro ao processar a solicitação.' },
      success: { title: 'Sucesso', description: 'Operação realizada com sucesso!' }
    };

    toast({
      title: messages[variant].title,
      description: messages[variant].description,
      variant: variant === 'success' ? 'default' : variant
    });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copiado!',
        description: `${label} copiado para a área de transferência.`,
        variant: 'default'
      });
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível copiar para a área de transferência.',
        variant: 'destructive'
      });
    }
  };

  const toggleCodeExample = (exampleId: string) => {
    setActiveCodeExample(activeCodeExample === exampleId ? null : exampleId);
  };

  const CodeExample = ({ id, code, children }: { id: string; code: string; children: React.ReactNode }) => (
    <div>
      <div onClick={() => toggleCodeExample(id)} className="cursor-pointer">
        {children}
      </div>
      {activeCodeExample === id && (
        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(code, 'Código')}
              className="h-8 px-2"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copiar
            </Button>
          </div>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
            {code}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="container mx-auto px-4 py-6 space-y-8">
          {/* Header */}
          <PageHeader
            title="Design System"
            subtitle="Biblioteca de componentes padronizados do Books SND"
            actions={
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Componente
                </Button>
              </div>
            }
          />

          {/* Navegação por Tabs */}
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="grid w-full grid-cols-8 bg-gray-100 p-1">
              <TabsTrigger 
                value="colors"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Cores
              </TabsTrigger>
              <TabsTrigger 
                value="typography"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Tipografia
              </TabsTrigger>
              <TabsTrigger 
                value="buttons"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Botões
              </TabsTrigger>
              <TabsTrigger 
                value="forms"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Formulários
              </TabsTrigger>
              <TabsTrigger 
                value="cards"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Cards
              </TabsTrigger>
              <TabsTrigger 
                value="tables"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Tabelas
              </TabsTrigger>
              <TabsTrigger 
                value="feedback"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Feedback
              </TabsTrigger>
              <TabsTrigger 
                value="layout"
                className="data-[state=active]:bg-sonda-blue data-[state=active]:text-white text-gray-700 hover:text-sonda-blue"
              >
                Layout
              </TabsTrigger>
            </TabsList>

            {/* Seção: Cores */}
            <TabsContent value="colors" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sonda-blue">
                    <Palette className="h-5 w-5 mr-2" />
                    Paleta de Cores Sonda
                  </CardTitle>
                  <CardDescription>
                    Cores oficiais da marca Sonda utilizadas no sistema. Clique em uma cor para copiar o código.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cores Primárias */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Cores Primárias</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#2563eb', 'Sonda Blue (#2563eb)')}
                      >
                        <div className="w-full h-20 bg-sonda-blue rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Sonda Blue</p>
                        <p className="text-xs text-gray-500">#2563eb</p>
                        <p className="text-xs text-gray-400">(blue-600)</p>
                      </div>
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#1d4ed8', 'Sonda Dark Blue (#1d4ed8)')}
                      >
                        <div className="w-full h-20 bg-sonda-dark-blue rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Sonda Dark Blue</p>
                        <p className="text-xs text-gray-500">#1d4ed8</p>
                        <p className="text-xs text-gray-400">(blue-700)</p>
                      </div>
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#3b82f6', 'Sonda Light Blue (#3b82f6)')}
                      >
                        <div className="w-full h-20 bg-sonda-light-blue rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Sonda Light Blue</p>
                        <p className="text-xs text-gray-500">#3b82f6</p>
                        <p className="text-xs text-gray-400">(blue-500)</p>
                      </div>
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#60a5fa', 'Sonda Accent Blue (#60a5fa)')}
                      >
                        <div className="w-full h-20 bg-sonda-accent-blue rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Sonda Accent Blue</p>
                        <p className="text-xs text-gray-500">#60a5fa</p>
                        <p className="text-xs text-gray-400">(blue-400)</p>
                      </div>
                    </div>
                  </div>

                  {/* Cores de Estado */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Cores de Estado</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#10B981', 'Verde Sucesso (#10B981)')}
                      >
                        <div className="w-full h-20 bg-green-500 rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Sucesso</p>
                        <p className="text-xs text-gray-500">#10B981</p>
                      </div>
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#F59E0B', 'Amarelo Aviso (#F59E0B)')}
                      >
                        <div className="w-full h-20 bg-yellow-500 rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Aviso</p>
                        <p className="text-xs text-gray-500">#F59E0B</p>
                      </div>
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#EF4444', 'Vermelho Erro (#EF4444)')}
                      >
                        <div className="w-full h-20 bg-red-500 rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Erro</p>
                        <p className="text-xs text-gray-500">#EF4444</p>
                      </div>
                      <div 
                        className="text-center cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => copyToClipboard('#3B82F6', 'Azul Informação (#3B82F6)')}
                      >
                        <div className="w-full h-20 bg-blue-500 rounded-lg mb-2 relative group">
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <p className="text-sm font-medium">Informação</p>
                        <p className="text-xs text-gray-500">#3B82F6</p>
                      </div>
                    </div>
                  </div>

                  {/* Escala de Cinzas */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Escala de Cinzas</h4>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { shade: 50, hex: '#F9FAFB' },
                        { shade: 100, hex: '#F3F4F6' },
                        { shade: 300, hex: '#D1D5DB' },
                        { shade: 500, hex: '#6B7280' },
                        { shade: 700, hex: '#374151' },
                        { shade: 900, hex: '#111827' }
                      ].map(({ shade, hex }) => (
                        <div 
                          key={shade}
                          className="text-center cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => copyToClipboard(hex, `Gray ${shade} (${hex})`)}
                        >
                          <div 
                            className={`w-full h-16 bg-gray-${shade} rounded-lg mb-2 relative group border`}
                            style={{ backgroundColor: hex }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Copy className={`h-4 w-4 ${shade >= 500 ? 'text-white' : 'text-gray-600'}`} />
                            </div>
                          </div>
                          <p className="text-xs font-medium">Gray {shade}</p>
                          <p className="text-xs text-gray-500">{hex}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção: Tipografia */}
            <TabsContent value="typography" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sonda-blue">
                    <Type className="h-5 w-5 mr-2" />
                    Hierarquia Tipográfica
                  </CardTitle>
                  <CardDescription>
                    Padrões de tipografia utilizados no sistema. Clique em um texto para ver seu código.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center group">
                        <h1 
                          className="text-3xl font-bold tracking-tight text-gray-900 cursor-pointer"
                          onClick={() => toggleCodeExample('heading-1')}
                        >
                          Heading 1 - 36px Bold
                        </h1>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('text-3xl font-bold tracking-tight', 'Classes de tipografia H1')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2"
                          title="Copiar classes CSS"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">text-3xl font-bold tracking-tight</p>
                      {activeCodeExample === 'heading-1' && (
                        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<h1 className="text-3xl font-bold tracking-tight text-gray-900">
  Heading 1 - 36px Bold
</h1>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<h1 className="text-3xl font-bold tracking-tight text-gray-900">
  Heading 1 - 36px Bold
</h1>`}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center group">
                        <h2 
                          className="text-2xl font-semibold text-gray-900 cursor-pointer"
                          onClick={() => toggleCodeExample('heading-2')}
                        >
                          Heading 2 - 30px Semibold
                        </h2>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('text-2xl font-semibold', 'Classes de tipografia H2')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2"
                          title="Copiar classes CSS"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">text-2xl font-semibold</p>
                      {activeCodeExample === 'heading-2' && (
                        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<h2 className="text-2xl font-semibold text-gray-900">
  Heading 2 - 30px Semibold
</h2>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<h2 className="text-2xl font-semibold text-gray-900">
  Heading 2 - 30px Semibold
</h2>`}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center group">
                        <h3 
                          className="text-xl font-semibold text-gray-900 cursor-pointer"
                          onClick={() => toggleCodeExample('heading-3')}
                        >
                          Heading 3 - 24px Semibold
                        </h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('text-xl font-semibold', 'Classes de tipografia H3')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2"
                          title="Copiar classes CSS"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">text-xl font-semibold</p>
                      {activeCodeExample === 'heading-3' && (
                        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<h3 className="text-xl font-semibold text-gray-900">
  Heading 3 - 24px Semibold
</h3>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<h3 className="text-xl font-semibold text-gray-900">
  Heading 3 - 24px Semibold
</h3>`}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center group">
                        <h4 
                          className="text-lg font-medium text-gray-900 cursor-pointer"
                          onClick={() => toggleCodeExample('heading-4')}
                        >
                          Heading 4 - 20px Medium
                        </h4>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('text-lg font-medium', 'Classes de tipografia H4')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2"
                          title="Copiar classes CSS"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">text-lg font-medium</p>
                      {activeCodeExample === 'heading-4' && (
                        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<h4 className="text-lg font-medium text-gray-900">
  Heading 4 - 20px Medium
</h4>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<h4 className="text-lg font-medium text-gray-900">
  Heading 4 - 20px Medium
</h4>`}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center group">
                        <p 
                          className="text-base text-gray-900 cursor-pointer"
                          onClick={() => toggleCodeExample('body-text')}
                        >
                          Body Text - 16px Normal - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('text-base', 'Classes de tipografia Body')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2 flex-shrink-0"
                          title="Copiar classes CSS"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">text-base</p>
                      {activeCodeExample === 'body-text' && (
                        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<p className="text-base text-gray-900">
  Body Text - 16px Normal - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
</p>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<p className="text-base text-gray-900">
  Body Text - 16px Normal - Lorem ipsum dolor sit amet, consectetur adipiscing elit.
</p>`}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center group">
                        <p 
                          className="text-sm text-gray-600 cursor-pointer"
                          onClick={() => toggleCodeExample('small-text')}
                        >
                          Small Text - 14px Normal - Texto auxiliar e descrições
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('text-sm', 'Classes de tipografia Small')}
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 ml-2 flex-shrink-0"
                          title="Copiar classes CSS"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">text-sm</p>
                      {activeCodeExample === 'small-text' && (
                        <div className="mt-4 bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código de Exemplo:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<p className="text-sm text-gray-600">
  Small Text - 14px Normal - Texto auxiliar e descrições
</p>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<p className="text-sm text-gray-600">
  Small Text - 14px Normal - Texto auxiliar e descrições
</p>`}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção: Botões */}
            <TabsContent value="buttons" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sonda-blue">
                    <Square className="h-5 w-5 mr-2" />
                    Botões Padronizados
                  </CardTitle>
                  <CardDescription>
                    Variações de botões utilizados no sistema. Clique em um botão para ver seu código.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Botões Primários */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Botões Primários</h4>
                    <div className="flex flex-wrap gap-4">
                      <CodeExample
                        id="btn-primary"
                        code={`<Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
  <Plus className="h-4 w-4 mr-2" />
  Primário
</Button>`}
                      >
                        <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
                          <Plus className="h-4 w-4 mr-2" />
                          Primário
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-primary-sm"
                        code={`<Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
  Pequeno
</Button>`}
                      >
                        <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
                          Pequeno
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-primary-lg"
                        code={`<Button size="lg" className="bg-sonda-blue hover:bg-sonda-dark-blue">
  Grande
</Button>`}
                      >
                        <Button size="lg" className="bg-sonda-blue hover:bg-sonda-dark-blue">
                          Grande
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-primary-disabled"
                        code={`<Button disabled className="bg-sonda-blue hover:bg-sonda-dark-blue">
  Desabilitado
</Button>`}
                      >
                        <Button disabled className="bg-sonda-blue hover:bg-sonda-dark-blue">
                          Desabilitado
                        </Button>
                      </CodeExample>
                    </div>
                  </div>

                  {/* Botões Secundários */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Botões Secundários</h4>
                    <div className="flex flex-wrap gap-4">
                      <CodeExample
                        id="btn-secondary"
                        code={`<Button variant="outline" className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10">
  <Edit className="h-4 w-4 mr-2" />
  Secundário
</Button>`}
                      >
                        <Button variant="outline" className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10">
                          <Edit className="h-4 w-4 mr-2" />
                          Secundário
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-ghost"
                        code={`<Button variant="ghost">
  <Eye className="h-4 w-4 mr-2" />
  Ghost
</Button>`}
                      >
                        <Button variant="ghost">
                          <Eye className="h-4 w-4 mr-2" />
                          Ghost
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-link"
                        code={`<Button variant="link">
  Link Button
</Button>`}
                      >
                        <Button variant="link">
                          Link Button
                        </Button>
                      </CodeExample>
                    </div>
                  </div>

                  {/* Botões de Estado */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Botões de Estado</h4>
                    <div className="flex flex-wrap gap-4">
                      <CodeExample
                        id="btn-destructive"
                        code={`<Button variant="destructive">
  <Trash2 className="h-4 w-4 mr-2" />
  Excluir
</Button>`}
                      >
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-success"
                        code={`<Button className="bg-green-500 hover:bg-green-600">
  <Check className="h-4 w-4 mr-2" />
  Confirmar
</Button>`}
                      >
                        <Button className="bg-green-500 hover:bg-green-600">
                          <Check className="h-4 w-4 mr-2" />
                          Confirmar
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-warning"
                        code={`<Button className="bg-yellow-500 hover:bg-yellow-600">
  <AlertCircle className="h-4 w-4 mr-2" />
  Atenção
</Button>`}
                      >
                        <Button className="bg-yellow-500 hover:bg-yellow-600">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Atenção
                        </Button>
                      </CodeExample>
                    </div>
                  </div>

                  {/* Botões com Loading */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Estados de Loading</h4>
                    <div className="flex flex-wrap gap-4">
                      <CodeExample
                        id="btn-loading"
                        code={`<Button disabled className="bg-sonda-blue hover:bg-sonda-dark-blue">
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  Carregando...
</Button>`}
                      >
                        <Button disabled className="bg-sonda-blue hover:bg-sonda-dark-blue">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Carregando...
                        </Button>
                      </CodeExample>

                      <CodeExample
                        id="btn-loading-outline"
                        code={`<Button variant="outline" disabled>
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  Processando...
</Button>`}
                      >
                        <Button variant="outline" disabled>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </Button>
                      </CodeExample>
                    </div>
                  </div>

                  {/* Botões de Ação em Tabelas - Padrão Real do Sistema */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Botões de Ação em Tabelas</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Botões pequenos usados nas colunas de ações das tabelas (conforme páginas Lançar Pesquisa e Visualizar Pesquisas)
                    </p>
                    
                    {/* Área dos botões - sempre alinhados */}
                    <div className="flex flex-wrap gap-4 items-center">
                      {/* Botão Visualizar - Azul */}
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleCodeExample('btn-table-view')}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">Visualizar</p>
                      </div>

                      {/* Botão Editar - Padrão */}
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => toggleCodeExample('btn-table-edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">Editar</p>
                      </div>

                      {/* Botão Excluir - Vermelho */}
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                          onClick={() => toggleCodeExample('btn-table-delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">Excluir</p>
                      </div>

                      {/* Botão Enviar - Azul */}
                      <div className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                          onClick={() => toggleCodeExample('btn-table-send')}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <p className="text-xs text-gray-500 mt-1">Enviar</p>
                      </div>
                    </div>

                    {/* Área dos códigos - sempre abaixo dos botões */}
                    <div className="mt-4 space-y-4">
                      {activeCodeExample === 'btn-table-view' && (
                        <div className="bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código - Botão Visualizar:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0"
>
  <Eye className="h-4 w-4 text-blue-600" />
</Button>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0"
>
  <Eye className="h-4 w-4 text-blue-600" />
</Button>`}
                          </pre>
                        </div>
                      )}

                      {activeCodeExample === 'btn-table-edit' && (
                        <div className="bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código - Botão Editar:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0"
>
  <Edit className="h-4 w-4" />
</Button>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0"
>
  <Edit className="h-4 w-4" />
</Button>`}
                          </pre>
                        </div>
                      )}

                      {activeCodeExample === 'btn-table-delete' && (
                        <div className="bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código - Botão Excluir:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
>
  <Trash2 className="h-4 w-4" />
</Button>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
>
  <Trash2 className="h-4 w-4" />
</Button>`}
                          </pre>
                        </div>
                      )}

                      {activeCodeExample === 'btn-table-send' && (
                        <div className="bg-gray-100 p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-sm">Código - Botão Enviar:</h5>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
>
  <Send className="h-4 w-4" />
</Button>`, 'Código')}
                              className="h-8 px-2"
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copiar
                            </Button>
                          </div>
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
{`<Button
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
>
  <Send className="h-4 w-4" />
</Button>`}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Exemplo de uso em grupo (como nas tabelas) */}
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 mb-2">Exemplo de uso agrupado (coluna Ações):</p>
                      <CodeExample
                        id="btn-table-group"
                        code={`<div className="flex items-center gap-1 justify-center">
  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
    <Edit className="h-4 w-4" />
  </Button>
  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-800">
    <Trash2 className="h-4 w-4" />
  </Button>
  <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800">
    <Send className="h-4 w-4" />
  </Button>
</div>`}
                      >
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </CodeExample>
                    </div>
                  </div>

                  {/* Botão Exportar com Dropdown */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Botão Exportar com Dropdown</h4>
                    <div className="flex flex-wrap gap-4">
                      <CodeExample
                        id="btn-export-outline"
                        code={`<Button 
  variant="outline" 
  className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
>
  <Download className="h-5 w-5 text-gray-600" />
  <span className="text-gray-700 font-medium">Exportar</span>
  <ChevronDown className="h-4 w-4 text-gray-500" />
</Button>`}
                      >
                        <Button 
                          variant="outline" 
                          className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        >
                          <Download className="h-5 w-5 text-gray-600" />
                          <span className="text-gray-700 font-medium">Exportar</span>
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        </Button>
                      </CodeExample>

                      {/* Versão com fundo azul */}
                      <CodeExample
                        id="btn-export-blue"
                        code={`<Button 
  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sonda-blue hover:bg-sonda-dark-blue text-white"
>
  <Download className="h-5 w-5" />
  <span className="font-medium">Exportar</span>
  <ChevronDown className="h-4 w-4" />
</Button>`}
                      >
                        <Button 
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sonda-blue hover:bg-sonda-dark-blue text-white"
                        >
                          <Download className="h-5 w-5" />
                          <span className="font-medium">Exportar</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CodeExample>

                      {/* Versão compacta */}
                      <CodeExample
                        id="btn-export-compact"
                        code={`<Button 
  variant="outline" 
  size="sm"
  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
>
  <Download className="h-4 w-4 text-gray-600" />
  <span className="text-gray-700">Exportar</span>
  <ChevronDown className="h-3 w-3 text-gray-500" />
</Button>`}
                      >
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4 text-gray-600" />
                          <span className="text-gray-700">Exportar</span>
                          <ChevronDown className="h-3 w-3 text-gray-500" />
                        </Button>
                      </CodeExample>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção: Formulários */}
            <TabsContent value="forms" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sonda-blue">
                    <Edit className="h-5 w-5 mr-2" />
                    Componentes de Formulário
                  </CardTitle>
                  <CardDescription>
                    Elementos de entrada de dados padronizados. Clique em um componente para ver seu código.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <CodeExample
                          id="input-normal"
                          code={`<div className="space-y-2">
  <Label htmlFor="input-normal">Input Normal</Label>
  <Input
    id="input-normal"
    placeholder="Digite algo..."
    className="focus:ring-sonda-blue focus:border-sonda-blue"
  />
</div>`}
                        >
                          <div>
                            <Label htmlFor="input-normal">Input Normal</Label>
                            <Input
                              id="input-normal"
                              placeholder="Digite algo..."
                              className="focus:ring-sonda-blue focus:border-sonda-blue"
                            />
                          </div>
                        </CodeExample>
                      </div>
                      
                      <div>
                        <CodeExample
                          id="input-error"
                          code={`<div className="space-y-2">
  <Label htmlFor="input-error">Input com Erro</Label>
  <Input
    id="input-error"
    placeholder="Campo obrigatório"
    className="border-red-500 focus:ring-red-500 focus:border-red-500"
  />
  <p className="text-sm text-red-500">Este campo é obrigatório</p>
</div>`}
                        >
                          <div>
                            <Label htmlFor="input-error">Input com Erro</Label>
                            <Input
                              id="input-error"
                              placeholder="Campo obrigatório"
                              className="border-red-500 focus:ring-red-500 focus:border-red-500"
                            />
                            <p className="text-sm text-red-500 mt-1">Este campo é obrigatório</p>
                          </div>
                        </CodeExample>
                      </div>
                      
                      <div>
                        <CodeExample
                          id="input-disabled"
                          code={`<div className="space-y-2">
  <Label htmlFor="input-disabled">Input Desabilitado</Label>
  <Input
    id="input-disabled"
    placeholder="Desabilitado"
    disabled
  />
</div>`}
                        >
                          <div>
                            <Label htmlFor="input-disabled">Input Desabilitado</Label>
                            <Input
                              id="input-disabled"
                              placeholder="Desabilitado"
                              disabled
                            />
                          </div>
                        </CodeExample>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <CodeExample
                          id="select-demo"
                          code={`<div className="space-y-2">
  <Label htmlFor="select-demo">Select</Label>
  <Select value={selectValue} onValueChange={setSelectValue}>
    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
      <SelectValue placeholder="Selecione uma opção" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="opcao1">Opção 1</SelectItem>
      <SelectItem value="opcao2">Opção 2</SelectItem>
      <SelectItem value="opcao3">Opção 3</SelectItem>
    </SelectContent>
  </Select>
</div>`}
                        >
                          <div>
                            <Label htmlFor="select-demo">Select</Label>
                            <Select value={selectValue} onValueChange={setSelectValue}>
                              <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                                <SelectValue placeholder="Selecione uma opção" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="opcao1">Opção 1</SelectItem>
                                <SelectItem value="opcao2">Opção 2</SelectItem>
                                <SelectItem value="opcao3">Opção 3</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CodeExample>
                      </div>
                      
                      <div>
                        <CodeExample
                          id="textarea-demo"
                          code={`<div className="space-y-2">
  <Label htmlFor="textarea-demo">Textarea</Label>
  <Textarea
    id="textarea-demo"
    placeholder="Digite uma mensagem..."
    className="focus:ring-sonda-blue focus:border-sonda-blue"
  />
</div>`}
                        >
                          <div>
                            <Label htmlFor="textarea-demo">Textarea</Label>
                            <Textarea
                              id="textarea-demo"
                              placeholder="Digite uma mensagem..."
                              className="focus:ring-sonda-blue focus:border-sonda-blue"
                            />
                          </div>
                        </CodeExample>
                      </div>
                    </div>
                  </div>

                  {/* Controles */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <CodeExample
                          id="checkbox-demo"
                          code={`<div className="flex items-center space-x-2">
  <Checkbox
    id="checkbox-demo"
    checked={checkboxValue}
    onCheckedChange={setCheckboxValue}
  />
  <Label htmlFor="checkbox-demo">Checkbox</Label>
</div>`}
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="checkbox-demo"
                              checked={checkboxValue}
                              onCheckedChange={(checked) => setCheckboxValue(checked === true)}
                            />
                            <Label htmlFor="checkbox-demo">Checkbox</Label>
                          </div>
                        </CodeExample>
                      </div>
                      
                      <div>
                        <CodeExample
                          id="switch-demo"
                          code={`<div className="flex items-center space-x-2">
  <Switch
    id="switch-demo"
    checked={switchValue}
    onCheckedChange={setSwitchValue}
  />
  <Label htmlFor="switch-demo">Switch</Label>
</div>`}
                        >
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="switch-demo"
                              checked={switchValue}
                              onCheckedChange={setSwitchValue}
                            />
                            <Label htmlFor="switch-demo">Switch</Label>
                          </div>
                        </CodeExample>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <CodeExample
                          id="progress-demo"
                          code={`<div className="space-y-2">
  <Label>Progress Bar</Label>
  <Progress value={progress} className="mt-2" />
  <div className="flex justify-between mt-2">
    <Button
      size="sm"
      variant="outline"
      onClick={() => setProgress(Math.max(0, progress - 10))}
    >
      <Minus className="h-4 w-4" />
    </Button>
    <span className="text-sm text-gray-600">{progress}%</span>
    <Button
      size="sm"
      variant="outline"
      onClick={() => setProgress(Math.min(100, progress + 10))}
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>
</div>`}
                        >
                          <div>
                            <Label>Progress Bar</Label>
                            <Progress value={progress} className="mt-2" />
                            <div className="flex justify-between mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setProgress(Math.max(0, progress - 10))}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-sm text-gray-600">{progress}%</span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setProgress(Math.min(100, progress + 10))}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CodeExample>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção: Cards */}
            <TabsContent value="cards" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cards de Estatísticas - Padrão Real do Sistema */}
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

              {/* Card Padrão com Conteúdo */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sonda-blue">Card Padrão</CardTitle>
                  <CardDescription>
                    Exemplo de card com conteúdo estruturado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Este é um exemplo de card padrão utilizado no sistema. 
                    Ele contém um cabeçalho com título e descrição, seguido do conteúdo principal.
                  </p>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm">Cancelar</Button>
                    <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
                      Confirmar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Exemplos de Cards com Diferentes Cores */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Variações de Cards de Estatísticas</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-sonda-blue">
                        Azul Sonda
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xl font-bold text-sonda-blue">1,234</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-green-600">
                        Verde (Sucesso)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xl font-bold text-green-600">856</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-orange-600">
                        Laranja (Aviso)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xl font-bold text-orange-600">378</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium text-red-600">
                        Vermelho (Erro)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xl font-bold text-red-600">42</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Seção: Tabelas */}
            <TabsContent value="tables" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sonda-blue">
                    <Database className="h-5 w-5 mr-2" />
                    Tabelas Padronizadas
                  </CardTitle>
                  <CardDescription>
                    Estrutura padrão para exibição de dados tabulares conforme usado no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Exemplo de Tabela Completa */}
                  <Card className="w-full">
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
                            onClick={() => setShowFilters(false)}
                            className="whitespace-nowrap"
                          >
                            <Filter className="h-4 w-4 mr-2" />
                            Limpar Filtro
                          </Button>
                        </div>
                      </div>

                      {/* Filtros */}
                      {showFilters && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Busca */}
                            <div>
                              <div className="text-sm font-medium mb-2">Buscar</div>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Buscar por chamado, cliente..."
                                  className="pl-10"
                                />
                              </div>
                            </div>

                            {/* Módulo */}
                            <div>
                              <div className="text-sm font-medium mb-2">Módulo</div>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Todos os módulos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="compra">Compra e SOCS</SelectItem>
                                  <SelectItem value="controle">Controle</SelectItem>
                                  <SelectItem value="geral">Geral</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Tipo de Cobrança */}
                            <div>
                              <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Todos os tipos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="horas">Horas</SelectItem>
                                  <SelectItem value="fixo">Fixo</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Período */}
                            <div>
                              <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Todos os períodos" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="01/2026">01/2026</SelectItem>
                                  <SelectItem value="12/2025">12/2025</SelectItem>
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
                            <TableHead className="font-semibold text-gray-700">Chamado</TableHead>
                            <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
                            <TableHead className="font-semibold text-gray-700">Módulo</TableHead>
                            <TableHead className="font-semibold text-gray-700">H Func</TableHead>
                            <TableHead className="font-semibold text-gray-700">H Tec</TableHead>
                            <TableHead className="font-semibold text-gray-700">Total</TableHead>
                            <TableHead className="font-semibold text-gray-700">Data Envio</TableHead>
                            <TableHead className="font-semibold text-gray-700">Data Aprovação</TableHead>
                            <TableHead className="font-semibold text-gray-700">Valor Total</TableHead>
                            <TableHead className="font-semibold text-gray-700">Período</TableHead>
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
                                <span className="font-medium">RF-7874654</span>
                              </div>
                              <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">Horas de Horas</Badge>
                            </TableCell>
                            <TableCell className="font-medium">SOUZA CRUZ</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-800 text-xs">Compra e SOCS</Badge>
                              <div className="text-xs text-gray-500 mt-1">Módulo Horas</div>
                            </TableCell>
                            <TableCell>2:30</TableCell>
                            <TableCell>8:00</TableCell>
                            <TableCell className="font-medium">10:30</TableCell>
                            <TableCell>12/01/2026</TableCell>
                            <TableCell>12/01/2026</TableCell>
                            <TableCell></TableCell>
                            <TableCell>01/2026</TableCell>
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

                          <TableRow className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">RF-7888458</span>
                              </div>
                              <Badge className="mt-1 bg-orange-100 text-orange-800 text-xs">Controle Horas</Badge>
                            </TableCell>
                            <TableCell className="font-medium">WHIRLPOOL</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 text-xs">Controle</Badge>
                              <div className="text-xs text-gray-500 mt-1">Controle Horas</div>
                            </TableCell>
                            <TableCell>0:30</TableCell>
                            <TableCell>2:30</TableCell>
                            <TableCell className="font-medium">3:00</TableCell>
                            <TableCell>08/07/2026</TableCell>
                            <TableCell>01/01/2026</TableCell>
                            <TableCell></TableCell>
                            <TableCell>01/2026</TableCell>
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

                          <TableRow className="hover:bg-gray-50">
                            <TableCell>
                              <Checkbox />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">RF-7875943</span>
                              </div>
                              <Badge className="mt-1 bg-blue-100 text-blue-800 text-xs">Horas de Horas</Badge>
                            </TableCell>
                            <TableCell className="font-medium">CITROSUCO</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 text-xs">Controle</Badge>
                              <div className="text-xs text-gray-500 mt-1">Controle Horas</div>
                            </TableCell>
                            <TableCell>6:40</TableCell>
                            <TableCell>2:10</TableCell>
                            <TableCell className="font-medium">8:50</TableCell>
                            <TableCell>07/01/2026</TableCell>
                            <TableCell>08/01/2026</TableCell>
                            <TableCell></TableCell>
                            <TableCell>01/2026</TableCell>
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção: Feedback */}
            <TabsContent value="feedback" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Badges */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sonda-blue">Badges</CardTitle>
                    <CardDescription>Indicadores de status e categorias. Clique em um badge para ver seu código.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <CodeExample
                        id="badge-default"
                        code={`<Badge>Padrão</Badge>`}
                      >
                        <Badge>Padrão</Badge>
                      </CodeExample>
                      
                      <CodeExample
                        id="badge-secondary"
                        code={`<Badge variant="secondary">Secundário</Badge>`}
                      >
                        <Badge variant="secondary">Secundário</Badge>
                      </CodeExample>
                      
                      <CodeExample
                        id="badge-success"
                        code={`<Badge variant="success">Sucesso</Badge>`}
                      >
                        <Badge variant="success">Sucesso</Badge>
                      </CodeExample>
                      
                      <CodeExample
                        id="badge-warning"
                        code={`<Badge variant="warning">Aviso</Badge>`}
                      >
                        <Badge variant="warning">Aviso</Badge>
                      </CodeExample>
                      
                      <CodeExample
                        id="badge-destructive"
                        code={`<Badge variant="destructive">Erro</Badge>`}
                      >
                        <Badge variant="destructive">Erro</Badge>
                      </CodeExample>
                      
                      <CodeExample
                        id="badge-outline"
                        code={`<Badge variant="outline">Outline</Badge>`}
                      >
                        <Badge variant="outline">Outline</Badge>
                      </CodeExample>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sonda-blue">Alertas</CardTitle>
                    <CardDescription>Mensagens de feedback para o usuário. Clique em um alerta para ver seu código.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CodeExample
                      id="alert-info"
                      code={`<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Informação</AlertTitle>
  <AlertDescription>
    Esta é uma mensagem informativa para o usuário.
  </AlertDescription>
</Alert>`}
                    >
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Informação</AlertTitle>
                        <AlertDescription>
                          Esta é uma mensagem informativa para o usuário.
                        </AlertDescription>
                      </Alert>
                    </CodeExample>
                    
                    <CodeExample
                      id="alert-success"
                      code={`<Alert className="border-green-200 bg-green-50">
  <CheckCircle className="h-4 w-4 text-green-600" />
  <AlertTitle className="text-green-800">Sucesso</AlertTitle>
  <AlertDescription className="text-green-700">
    Operação realizada com sucesso!
  </AlertDescription>
</Alert>`}
                    >
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-800">Sucesso</AlertTitle>
                        <AlertDescription className="text-green-700">
                          Operação realizada com sucesso!
                        </AlertDescription>
                      </Alert>
                    </CodeExample>
                    
                    <CodeExample
                      id="alert-error"
                      code={`<Alert className="border-red-200 bg-red-50">
  <XCircle className="h-4 w-4 text-red-600" />
  <AlertTitle className="text-red-800">Erro</AlertTitle>
  <AlertDescription className="text-red-700">
    Ocorreu um erro ao processar a solicitação.
  </AlertDescription>
</Alert>`}
                    >
                      <Alert className="border-red-200 bg-red-50">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle className="text-red-800">Erro</AlertTitle>
                        <AlertDescription className="text-red-700">
                          Ocorreu um erro ao processar a solicitação.
                        </AlertDescription>
                      </Alert>
                    </CodeExample>
                  </CardContent>
                </Card>

                {/* Toasts */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sonda-blue">Notificações Toast</CardTitle>
                    <CardDescription>Sistema de notificações não-intrusivas. Clique em um botão para testar e ver o código.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <CodeExample
                        id="toast-info"
                        code={`const { toast } = useToast();

toast({
  title: 'Informação',
  description: 'Esta é uma notificação informativa.',
  variant: 'default'
});`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToast('default')}
                        >
                          <Info className="h-4 w-4 mr-2" />
                          Info Toast
                        </Button>
                      </CodeExample>
                      
                      <CodeExample
                        id="toast-success"
                        code={`const { toast } = useToast();

toast({
  title: 'Sucesso',
  description: 'Operação realizada com sucesso!',
  variant: 'default'
});`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToast('success')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Success Toast
                        </Button>
                      </CodeExample>
                      
                      <CodeExample
                        id="toast-error"
                        code={`const { toast } = useToast();

toast({
  title: 'Erro',
  description: 'Ocorreu um erro ao processar a solicitação.',
  variant: 'destructive'
});`}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToast('destructive')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Error Toast
                        </Button>
                      </CodeExample>
                    </div>
                  </CardContent>
                </Card>

                {/* Estados de Loading */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sonda-blue">Estados de Loading</CardTitle>
                    <CardDescription>Indicadores de carregamento. Clique em um componente para ver seu código.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <CodeExample
                        id="loading-spinner"
                        code={`<div className="flex justify-center items-center py-8">
  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
</div>`}
                      >
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
                        </div>
                      </CodeExample>
                      
                      <CodeExample
                        id="loading-skeleton"
                        code={`<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
</div>`}
                      >
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </CodeExample>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Estado Vazio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sonda-blue">Estado Vazio</CardTitle>
                  <CardDescription>Componente para quando não há dados. Clique no componente para ver o código.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeExample
                    id="empty-state"
                    code={`<EmptyState
  icon={<FileX className="h-12 w-12 text-gray-400" />}
  title="Nenhum item encontrado"
  description="Não há dados para exibir no momento. Que tal adicionar o primeiro item?"
  action={
    <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
      <Plus className="h-4 w-4 mr-2" />
      Adicionar Item
    </Button>
  }
/>`}
                  >
                    <EmptyState
                      icon={<FileX className="h-12 w-12 text-gray-400" />}
                      title="Nenhum item encontrado"
                      description="Não há dados para exibir no momento. Que tal adicionar o primeiro item?"
                      action={
                        <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Item
                        </Button>
                      }
                    />
                  </CodeExample>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Seção: Layout */}
            <TabsContent value="layout" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-sonda-blue">
                    <Square className="h-5 w-5 mr-2" />
                    Componentes de Layout
                  </CardTitle>
                  <CardDescription>
                    Estruturas de layout padronizadas. Clique em um componente para ver seu código.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Separadores */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Separadores</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Separador Horizontal</p>
                        <CodeExample
                          id="separator-horizontal"
                          code={`<Separator />`}
                        >
                          <Separator />
                        </CodeExample>
                      </div>
                      <div className="flex items-center space-x-4">
                        <p className="text-sm text-gray-600">Texto</p>
                        <Separator orientation="vertical" className="h-6" />
                        <p className="text-sm text-gray-600">Separador Vertical</p>
                        <Separator orientation="vertical" className="h-6" />
                        <p className="text-sm text-gray-600">Texto</p>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Navegação por Tabs</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Tabs com cores Sonda</p>
                        <CodeExample
                          id="tabs-sonda"
                          code={`<Tabs defaultValue="tab1" className="w-full max-w-md">
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
  <TabsContent value="tab1" className="mt-4 p-4 border rounded-lg">
    <p className="text-sm text-gray-600">Conteúdo da Tab 1</p>
  </TabsContent>
  <TabsContent value="tab2" className="mt-4 p-4 border rounded-lg">
    <p className="text-sm text-gray-600">Conteúdo da Tab 2</p>
  </TabsContent>
  <TabsContent value="tab3" className="mt-4 p-4 border rounded-lg">
    <p className="text-sm text-gray-600">Conteúdo da Tab 3</p>
  </TabsContent>
</Tabs>`}
                        >
                          <Tabs defaultValue="tab1" className="w-full max-w-md">
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
                            <TabsContent value="tab1" className="mt-4 p-4 border rounded-lg">
                              <p className="text-sm text-gray-600">Conteúdo da Tab 1</p>
                            </TabsContent>
                            <TabsContent value="tab2" className="mt-4 p-4 border rounded-lg">
                              <p className="text-sm text-gray-600">Conteúdo da Tab 2</p>
                            </TabsContent>
                            <TabsContent value="tab3" className="mt-4 p-4 border rounded-lg">
                              <p className="text-sm text-gray-600">Conteúdo da Tab 3</p>
                            </TabsContent>
                          </Tabs>
                        </CodeExample>
                      </div>
                    </div>
                  </div>

                  {/* Modais */}
                  <div>
                    <h4 className="text-lg font-semibold mb-4">Modais</h4>
                    <div className="flex space-x-4">
                      <CodeExample
                        id="modal-dialog"
                        code={`<Button variant="outline" onClick={() => setShowDialog(true)}>
  Abrir Modal
</Button>

// Modal Component
<Dialog open={showDialog} onOpenChange={setShowDialog}>
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
      <Button variant="outline" onClick={() => setShowDialog(false)}>
        Cancelar
      </Button>
      <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
        Confirmar
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`}
                      >
                        <Button
                          variant="outline"
                          onClick={() => setShowDialog(true)}
                        >
                          Abrir Modal
                        </Button>
                      </CodeExample>
                      
                      <CodeExample
                        id="alert-dialog"
                        code={`<Button variant="outline" onClick={() => setShowAlertDialog(true)}>
  Abrir Alert Dialog
</Button>

// Alert Dialog Component
<AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
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
</AlertDialog>`}
                      >
                        <Button
                          variant="outline"
                          onClick={() => setShowAlertDialog(true)}
                        >
                          Abrir Alert Dialog
                        </Button>
                      </CodeExample>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Modais de Demonstração */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-sonda-blue">
                  Modal de Exemplo
                </DialogTitle>
                <DialogDescription>
                  Este é um exemplo de modal padrão utilizado no sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-gray-600 mb-4">
                  Conteúdo do modal. Aqui você pode incluir formulários, 
                  informações detalhadas ou qualquer outro conteúdo necessário.
                </p>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="modal-input">Campo de Exemplo</Label>
                    <Input
                      id="modal-input"
                      placeholder="Digite algo..."
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-sonda-blue hover:bg-sonda-dark-blue"
                  onClick={() => setShowDialog(false)}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
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
        </div>
      </div>
    </AdminLayout>
  );
}