/**
 * Componente para preview de dashboard selecionado
 */

import React from 'react';
import { BarChart3, Calendar, User, Tag, Settings, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dashboard } from '@/types/dashboards';

interface DashboardPreviewProps {
  dashboard: Dashboard;
  periodo: string;
  onConfiguracao?: () => void;
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

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({
  dashboard,
  periodo,
  onConfiguracao,
  className
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-sonda-blue" />
              Preview do Dashboard - {periodo}
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {dashboard.nome}
            </p>
          </div>
          {onConfiguracao && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfiguracao}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header do Preview */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Eye className="h-4 w-4" />
                <span>Preview: {dashboard.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(dashboard.status)}>
                  {getStatusLabel(dashboard.status)}
                </Badge>
                <Badge className={getTipoColor(dashboard.tipo)}>
                  {getTipoLabel(dashboard.tipo)}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Conteúdo do Preview */}
          <div className="p-8">
            <div className="text-center max-w-3xl mx-auto">
              {/* Cabeçalho do Dashboard */}
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-sonda-blue to-sonda-dark-blue rounded-xl mb-4">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {dashboard.nome}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {dashboard.descricao}
                </p>
              </div>
              
              {/* Informações do Dashboard */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Informações básicas */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-sonda-blue" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Período: {periodo}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-sonda-blue" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Autor: {dashboard.autor}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <BarChart3 className="h-4 w-4 text-sonda-blue" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Categoria: {dashboard.categoria}
                      </span>
                    </div>
                  </div>

                  {/* Configurações */}
                  <div className="space-y-4">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Formato: {dashboard.configuracao.formato_saida.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Gráficos: {dashboard.configuracao.incluir_graficos ? 'Sim' : 'Não'}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Tabelas: {dashboard.configuracao.incluir_tabelas ? 'Sim' : 'Não'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {dashboard.tags.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tags:
                      </span>
                      {dashboard.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Área de conteúdo do dashboard */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12">
                <div className="text-center">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    <div className="space-y-2">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg mx-auto flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Gráficos</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Visualizações interativas
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-green-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Métricas</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Indicadores chave
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto flex items-center justify-center">
                        <BarChart3 className="h-8 w-8 text-purple-600" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">Relatórios</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Dados detalhados
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    O conteúdo específico do dashboard será gerado dinamicamente com base nos dados do período selecionado.
                  </p>
                </div>
              </div>

              {/* Métricas do dashboard */}
              {dashboard.metricas && (
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {dashboard.metricas.total_visualizacoes}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Visualizações
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {dashboard.metricas.total_envios}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Envios
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {dashboard.metricas.taxa_abertura?.toFixed(1)}%
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        Taxa de Abertura
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};