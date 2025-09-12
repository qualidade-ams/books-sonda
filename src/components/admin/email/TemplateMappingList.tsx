import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { 
  Filter, 
  RefreshCw, 
  FileText, 
  Settings,  
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TestTube
} from 'lucide-react';
import { useEmailTemplateMapping } from '@/hooks/useEmailTemplateMapping';
import type { EmailTemplateMapping } from '@/services/emailTemplateMappingService';

export interface TemplateMappingListProps {
  /** Classe CSS adicional */
  className?: string;
  /** Se deve atualizar automaticamente */
  autoRefresh?: boolean;
  /** Intervalo de atualização em ms */
  refreshInterval?: number;
}

const TemplateMappingList: React.FC<TemplateMappingListProps> = ({
  className = '',
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const { getMappingsList, loading } = useEmailTemplateMapping();
  
  const [mappings, setMappings] = useState<EmailTemplateMapping[]>([]);
  const [filteredMappings, setFilteredMappings] = useState<EmailTemplateMapping[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Estados dos filtros
  const [formularioFilter, setFormularioFilter] = useState<string>('all');
  const [modalidadeFilter, setModalidadeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Estados do dialog de teste
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<EmailTemplateMapping | null>(null);
  
  // Estados do dialog de criação de template
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);

  // Função para carregar mapeamentos
  const loadMappings = async () => {
    try {
      setError(null);
      console.log('Carregando lista de mapeamentos...');
      
      const mappingsList = await getMappingsList();
      setMappings(mappingsList);
      
      console.log(`${mappingsList.length} mapeamentos carregados`);
    } catch (err) {
      console.error('Erro ao carregar mapeamentos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mapeamentos');
    }
  };

  // Carregar mapeamentos na inicialização
  useEffect(() => {
    loadMappings();
  }, []);

  // Auto-refresh se habilitado
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMappings();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...mappings];

    // Filtro por formulário
    if (formularioFilter !== 'all') {
      filtered = filtered.filter(mapping => mapping.formulario === formularioFilter);
    }

    // Filtro por modalidade
    if (modalidadeFilter !== 'all') {
      filtered = filtered.filter(mapping => mapping.modalidade === modalidadeFilter);
    }

    // Filtro por status (ativo/inativo)
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(mapping => mapping.template?.ativo === isActive);
    }

    setFilteredMappings(filtered);
  }, [mappings, formularioFilter, modalidadeFilter, statusFilter]);

  // Funções utilitárias
  const getFormularioLabel = (formulario: 'book' | 'comply_edocs' | 'comply_fiscal') => {
    switch (formulario) {
      case 'book': return 'Book';
      case 'comply_edocs': return 'Comply e-DOCS';
      case 'comply_fiscal': return 'Comply Fiscal';
      default: return 'Unknown';
    }
  };

  const getModalidadeLabel = (modalidade: 'mensal' | 'on-premise' | 'saas') => {
    switch (modalidade) {
      case 'mensal': return 'On-Mensal';
      case 'on-premise': return 'On-premise';
      case 'saas': return 'SaaS';
      default: return 'Anual';
    }
  };

  const getStatusBadge = (template: EmailTemplateMapping['template']) => {
    if (!template) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Template não encontrado
        </Badge>
      );
    }

    return template.ativo ? (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Ativo
      </Badge>
    ) : (
      <Badge variant="secondary" className="flex items-center gap-1">
        <EyeOff className="h-3 w-3" />
        Inativo
      </Badge>
    );
  };

  // Limpar todos os filtros
  const clearFilters = () => {
    setFormularioFilter('all');
    setModalidadeFilter('all');
    setStatusFilter('all');
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = formularioFilter !== 'all' || modalidadeFilter !== 'all' || statusFilter !== 'all';

  // Abrir dialog de teste
  const openTestDialog = (mapping: EmailTemplateMapping) => {
    setSelectedMapping(mapping);
    setTestDialogOpen(true);
  };

  // Estatísticas dos mapeamentos
  const stats = useMemo(() => {
    const total = mappings.length;
    const active = mappings.filter(m => m.template?.ativo).length;
    const inactive = total - active;
    const book = mappings.filter(m => m.formulario === 'book').length;

    return { total, active, inactive, book };
  }, [mappings]);

  if (loading && mappings.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Carregando mapeamentos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Cabeçalho com estatísticas */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            Mapeamentos de Templates
          </h2>
          <p className="text-gray-600">
            Visualize e gerencie os mapeamentos entre formulários, modalidades e templates
          </p>
          
          {/* Estatísticas */}
          <div className="flex gap-4 mt-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Total: {stats.total}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Ativos: {stats.active}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-gray-500">
              <EyeOff className="h-3 w-3" />
              Inativos: {stats.inactive}
            </Badge>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={loadMappings}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Mensagem de erro */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Erro ao carregar mapeamentos:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de mapeamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Mapeamentos 
              {hasActiveFilters && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredMappings.length} de {mappings.length})
                </span>
              )}
            </span>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredMappings.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {hasActiveFilters ? 'Nenhum mapeamento encontrado' : 'Nenhum mapeamento configurado'}
              </h3>
              <p className="text-gray-600 mb-4">
                {hasActiveFilters 
                  ? 'Tente ajustar os filtros para ver mais resultados'
                  : 'Configure mapeamentos entre formulários, modalidades e templates'
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Formulário</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.map((mapping) => (
                    <TableRow key={`${mapping.formulario}-${mapping.modalidade}`}>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <FileText className="h-3 w-3" />
                          {getFormularioLabel(mapping.formulario)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Settings className="h-3 w-3" />
                          {getModalidadeLabel(mapping.modalidade)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">
                            {mapping.template?.nome || 'Template não encontrado'}
                          </div>
                          {mapping.template?.descricao && (
                            <div className="text-sm text-gray-500">
                              {mapping.template.descricao}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            ID: {mapping.templateId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(mapping.template)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {mapping.template?.created_at 
                            ? new Date(mapping.template.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTestDialog(mapping)}
                          disabled={!mapping.template?.ativo}
                          className="flex items-center gap-1"
                        >
                          <TestTube className="h-3 w-3" />
                          Testar TUDO
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      
    </div>
  );
};

export default TemplateMappingList;