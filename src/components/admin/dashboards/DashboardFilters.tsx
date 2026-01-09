/**
 * Componente para filtros de dashboards
 */

import React from 'react';
import { Search, Filter, X, Calendar, User, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  FiltrosDashboard, 
  CATEGORIA_OPTIONS, 
  TIPO_OPTIONS, 
  STATUS_OPTIONS 
} from '@/types/dashboards';

interface DashboardFiltersProps {
  filtros: FiltrosDashboard;
  onFiltroChange: (key: keyof FiltrosDashboard, value: any) => void;
  onLimparFiltros: () => void;
  isOpen: boolean;
  onToggle: () => void;
  totalResultados: number;
}

export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  filtros,
  onFiltroChange,
  onLimparFiltros,
  isOpen,
  onToggle,
  totalResultados
}) => {
  const filtrosAtivos = Object.entries(filtros).filter(([_, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  }).length;

  const handleTagAdd = (tag: string) => {
    if (!tag.trim()) return;
    const currentTags = filtros.tags || [];
    if (!currentTags.includes(tag.trim())) {
      onFiltroChange('tags', [...currentTags, tag.trim()]);
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    const currentTags = filtros.tags || [];
    onFiltroChange('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const input = e.target as HTMLInputElement;
      handleTagAdd(input.value);
      input.value = '';
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
                {filtrosAtivos > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filtrosAtivos}
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{totalResultados} resultado{totalResultados !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {/* Busca */}
              <div className="space-y-2">
                <Label htmlFor="busca" className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Buscar
                </Label>
                <Input
                  id="busca"
                  placeholder="Nome, descrição ou autor..."
                  value={filtros.busca || ''}
                  onChange={(e) => onFiltroChange('busca', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Filtros em linha */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Categoria */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Categoria</Label>
                  <Select
                    value={filtros.categoria || ''}
                    onValueChange={(value) => onFiltroChange('categoria', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {CATEGORIA_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo</Label>
                  <Select
                    value={filtros.tipo || ''}
                    onValueChange={(value) => onFiltroChange('tipo', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {TIPO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select
                    value={filtros.status || ''}
                    onValueChange={(value) => onFiltroChange('status', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Autor */}
                <div className="space-y-2">
                  <Label htmlFor="autor" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Autor
                  </Label>
                  <Input
                    id="autor"
                    placeholder="Nome do autor..."
                    value={filtros.autor || ''}
                    onChange={(e) => onFiltroChange('autor', e.target.value)}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Digite uma tag e pressione Enter..."
                    onKeyPress={handleTagKeyPress}
                  />
                  {filtros.tags && filtros.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {filtros.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto w-auto p-0 hover:bg-transparent"
                            onClick={() => handleTagRemove(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Filtros de data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Início
                  </Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={filtros.data_inicio || ''}
                    onChange={(e) => onFiltroChange('data_inicio', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Fim
                  </Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={filtros.data_fim || ''}
                    onChange={(e) => onFiltroChange('data_fim', e.target.value)}
                  />
                </div>
              </div>

              {/* Botão limpar filtros */}
              {filtrosAtivos > 0 && (
                <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onLimparFiltros}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};