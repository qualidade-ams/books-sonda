import React from 'react';
import { Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type {
  EmpresaFiltros,
  StatusEmpresa,
  Produto
} from '@/types/clientBooks';
import {
  STATUS_EMPRESA_OPTIONS,
  PRODUTOS_OPTIONS
} from '@/types/clientBooks';

interface EmpresasFiltrosProps {
  filtros: EmpresaFiltros;
  onFiltroChange: (key: keyof EmpresaFiltros, value: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const EmpresasFiltros: React.FC<EmpresasFiltrosProps> = ({
  filtros,
  onFiltroChange,
  isOpen,
  onToggle
}) => {
  // Contar filtros ativos
  const filtrosAtivos = [
    filtros.busca && filtros.busca.length > 0,
    filtros.status && filtros.status.length > 0,
    filtros.produtos && filtros.produtos.length > 0,
  ].filter(Boolean).length;

  // Handlers para os selects simples
  const handleStatusChange = (value: string) => {
    if (value === 'todos') {
      onFiltroChange('status', []);
    } else {
      onFiltroChange('status', [value]);
    }
  };

  const handleProdutosChange = (value: string) => {
    if (value === 'todos') {
      onFiltroChange('produtos', []);
    } else {
      onFiltroChange('produtos', [value]);
    }
  };

  // Obter labels dos filtros ativos
  const getFiltrosAtivosBadges = () => {
    const badges = [];
    
    if (filtros.busca && filtros.busca.length > 0) {
      badges.push(
        <Badge key="busca" variant="secondary" className="text-xs">
          Busca: "{filtros.busca}"
        </Badge>
      );
    }
    
    if (filtros.status && filtros.status.length > 0) {
      const statusLabels = filtros.status.map(s => 
        STATUS_EMPRESA_OPTIONS.find(opt => opt.value === s)?.label || s
      ).join(', ');
      badges.push(
        <Badge key="status" variant="secondary" className="text-xs">
          Status: {statusLabels}
        </Badge>
      );
    }
    
    if (filtros.produtos && filtros.produtos.length > 0) {
      const produtosLabels = filtros.produtos.map(p => 
        PRODUTOS_OPTIONS.find(opt => opt.value === p)?.label || p
      ).join(', ');
      badges.push(
        <Badge key="produtos" variant="secondary" className="text-xs">
          Produtos: {produtosLabels}
        </Badge>
      );
    }
    
    return badges;
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div></div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filtros</span>
        </Button>
      </div>

      {/* Filtros */}
      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          {/* Busca */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar empresas</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Digite o nome da empresa..."
                value={filtros.busca || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  onFiltroChange('busca', e.target.value)
                }
                className="pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={filtros.status && filtros.status.length > 0 ? filtros.status[0] : 'todos'}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {STATUS_EMPRESA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Produtos */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Produtos</label>
            <Select
              value={filtros.produtos && filtros.produtos.length > 0 ? filtros.produtos[0] : 'todos'}
              onValueChange={handleProdutosChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os produtos</SelectItem>
                {PRODUTOS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpresasFiltros;