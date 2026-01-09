/**
 * Componente para exibir um card de dashboard
 */

import React from 'react';
import { 
  BarChart3, 
  Calendar, 
  User, 
  Eye, 
  Send, 
  TrendingUp,
  Clock,
  Tag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/types/dashboards';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  dashboard: Dashboard;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
  onPreview?: () => void;
  className?: string;
}

const getStatusColor = (status: Dashboard['status']) => {
  switch (status) {
    case 'ativo':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inativo':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'em_desenvolvimento':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: Dashboard['status']) => {
  switch (status) {
    case 'ativo':
      return 'Ativo';
    case 'inativo':
      return 'Inativo';
    case 'em_desenvolvimento':
      return 'Em Desenvolvimento';
    default:
      return status;
  }
};

const getTipoColor = (tipo: Dashboard['tipo']) => {
  switch (tipo) {
    case 'mensal':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'semanal':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'trimestral':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'anual':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getTipoLabel = (tipo: Dashboard['tipo']) => {
  switch (tipo) {
    case 'mensal':
      return 'Mensal';
    case 'semanal':
      return 'Semanal';
    case 'trimestral':
      return 'Trimestral';
    case 'anual':
      return 'Anual';
    default:
      return tipo;
  }
};

export const DashboardCard: React.FC<DashboardCardProps> = ({
  dashboard,
  isSelected,
  onSelectionChange,
  onPreview,
  className
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      isSelected && 'ring-2 ring-sonda-blue border-sonda-blue',
      dashboard.status === 'inativo' && 'opacity-75',
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectionChange}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 dark:text-white truncate">
                {dashboard.nome}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={getStatusColor(dashboard.status)}>
                  {getStatusLabel(dashboard.status)}
                </Badge>
                <Badge className={getTipoColor(dashboard.tipo)}>
                  {getTipoLabel(dashboard.tipo)}
                </Badge>
              </div>
            </div>
          </div>
          {onPreview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreview}
              className="h-8 w-8 p-0 text-gray-500 hover:text-sonda-blue"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Descrição */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {dashboard.descricao}
          </p>

          {/* Informações básicas */}
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="truncate">{dashboard.autor}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(dashboard.data_atualizacao)}</span>
            </div>
          </div>

          {/* Tags */}
          {dashboard.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag className="h-3 w-3 text-gray-400" />
              {dashboard.tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="outline" 
                  className="text-xs px-1.5 py-0.5 h-auto"
                >
                  {tag}
                </Badge>
              ))}
              {dashboard.tags.length > 3 && (
                <span className="text-xs text-gray-400">
                  +{dashboard.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Métricas */}
          {dashboard.metricas && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3 text-blue-500" />
                  <span className="text-xs font-medium text-blue-600">
                    {dashboard.metricas.total_visualizacoes}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Views</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Send className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-medium text-green-600">
                    {dashboard.metricas.total_envios}
                  </span>
                </div>
                <span className="text-xs text-gray-400">Envios</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-3 w-3 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600">
                    {dashboard.metricas.taxa_abertura?.toFixed(1)}%
                  </span>
                </div>
                <span className="text-xs text-gray-400">Taxa</span>
              </div>
            </div>
          )}

          {/* Último envio */}
          {dashboard.metricas?.ultimo_envio && (
            <div className="flex items-center gap-1 text-xs text-gray-500 pt-1">
              <Clock className="h-3 w-3" />
              <span>Último envio: {formatDate(dashboard.metricas.ultimo_envio)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};