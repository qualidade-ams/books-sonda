import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterBar, FilterGrid, FilterField } from '@/components/ui/filter-bar';
import { StatsCard } from '@/components/ui/stats-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Filter, RefreshCw, User, Clock, Database, Search, Download, FileText, FileSpreadsheet, ChevronDown, FileX } from 'lucide-react';
import { auditService } from '@/services/auditService';
import type { AuditLogWithUser, AuditLogFilters, AuditLogSummary, PermissionAuditLog } from '@/types/audit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Componente para renderizar alterações de forma assíncrona
const AuditLogChanges = ({ log }: { log: PermissionAuditLog }) => {
  const [changes, setChanges] = useState<string>('Carregando...');

  useEffect(() => {
    const loadChanges = async () => {
      try {
        const formattedChanges = await auditService.formatChanges(log);
        setChanges(formattedChanges);
      } catch (error) {
        console.error('Error formatting changes:', error);
        setChanges('Erro ao carregar alterações');
      }
    };

    loadChanges();
  }, [log]);

  return <span>{changes}</span>;
};

// Componente de exportação para logs de auditoria
interface AuditLogExportButtonsProps {
  filters: AuditLogFilters;
  summary: AuditLogSummary | null;
  isLoading: boolean;
}

const AuditLogExportButtons = ({ filters, summary, isLoading }: AuditLogExportButtonsProps) => {
  const { toast } = useToast();
  const [exportLoading, setExportLoading] = useState(false);

  const exportToExcel = async () => {
    try {
      setExportLoading(true);
      
      const { data: allLogs } = await auditService.getAuditLogs(filters, 1, 1000);
      
      if (allLogs.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há logs para exportar com os filtros aplicados.",
          variant: "destructive",
        });
        return;
      }

      // Importar dinamicamente o utilitário de exportação
      const { exportAuditLogsToExcel } = await import('@/utils/auditLogsExportUtils');
      await exportAuditLogsToExcel(allLogs);

      toast({
        title: "Exportação concluída",
        description: `${allLogs.length} logs exportados para Excel com sucesso.`,
      });

    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os logs.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = async () => {
    try {
      setExportLoading(true);
      
      const { data: allLogs } = await auditService.getAuditLogs(filters, 1, 1000);
      
      if (allLogs.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há logs para exportar com os filtros aplicados.",
          variant: "destructive",
        });
        return;
      }

      // Importar dinamicamente o utilitário de exportação
      const { exportAuditLogsToPDF } = await import('@/utils/auditLogsExportUtils');
      await exportAuditLogsToPDF(allLogs, summary);

      toast({
        title: "Relatório PDF gerado",
        description: `Relatório detalhado com ${allLogs.length} logs gerado com sucesso.`,
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório PDF.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exportLoading || isLoading}>
          {exportLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel} disabled={exportLoading || isLoading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar para Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} disabled={exportLoading || isLoading}>
          <FileText className="mr-2 h-4 w-4" />
          Exportar para PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 20;

  useEffect(() => {
    loadAuditLogs();
    loadSummary();
  }, [filters, currentPage]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const { data, count } = await auditService.getAuditLogs(filters, currentPage, pageSize);
      setLogs(data);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await auditService.getAuditSummary();
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading audit summary:', error);
    }
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof AuditLogFilters]) || searchTerm;



  // Filtrar logs baseado no termo de busca
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.user_name?.toLowerCase().includes(searchLower) ||
      log.user_email?.toLowerCase().includes(searchLower) ||
      auditService.getTableDisplayName(log.table_name).toLowerCase().includes(searchLower)
      // Note: Removed formatChanges from search as it's now async
    );
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'INSERT': return 'default';
      case 'UPDATE': return 'secondary';
      case 'DELETE': return 'destructive';
      default: return 'outline';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT': return 'Criado';
      case 'UPDATE': return 'Atualizado';
      case 'DELETE': return 'Excluído';
      default: return action;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Cabeçalho da página */}
          <PageHeader
            title="Logs de Auditoria"
            subtitle="Acompanhe todas as alterações no sistema de permissões"
            actions={
              <AuditLogExportButtons 
                filters={filters}
                summary={summary}
                isLoading={loading}
              />
            }
          />

          {/* Cards de estatísticas */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total de Alterações"
                value={summary.total_changes}
                icon={<Database className="h-5 w-5" />}
                description="Últimos 30 dias"
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200"
              />
              <StatsCard
                title="Grupos Alterados"
                value={summary.changes_by_table['user_groups'] || 0}
                icon={<User className="h-5 w-5" />}
                description="Alterações em grupos"
                className="bg-gradient-to-r from-green-50 to-green-100 border-green-200"
              />
              <StatsCard
                title="Permissões Alteradas"
                value={summary.changes_by_table['screen_permissions'] || 0}
                icon={<Filter className="h-5 w-5" />}
                description="Alterações em permissões"
                className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200"
              />
              <StatsCard
                title="Atribuições Alteradas"
                value={summary.changes_by_table['user_group_assignments'] || 0}
                icon={<Clock className="h-5 w-5" />}
                description="Alterações em atribuições"
                className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200"
              />
            </div>
          )}

          {/* Filtros */}
          <FilterBar
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar nos logs..."
          >
            <FilterGrid columns={4}>
              <FilterField label="Tabela">
                <Select
                  value={filters.table_name || '__todas_tabelas__'}
                  onValueChange={(value) => handleFilterChange('table_name', value === '__todas_tabelas__' ? '' : value)}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Todas as tabelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todas_tabelas__">Todas as tabelas</SelectItem>
                    <SelectItem value="user_groups">Grupos de Usuários</SelectItem>
                    <SelectItem value="screen_permissions">Permissões de Tela</SelectItem>
                    <SelectItem value="user_group_assignments">Atribuições de Usuários</SelectItem>
                    <SelectItem value="profiles">Usuários do Sistema</SelectItem>
                    <SelectItem value="empresas_clientes">Empresas Clientes</SelectItem>
                    <SelectItem value="clientes">Cadastro de Clientes</SelectItem>
                    <SelectItem value="grupos_responsaveis">Grupos Responsáveis</SelectItem>
                    <SelectItem value="email_templates">Templates de Email</SelectItem>
                    <SelectItem value="historico_disparos">Disparos de Books</SelectItem>
                    <SelectItem value="requerimentos">Requerimentos</SelectItem>
                    <SelectItem value="taxas_clientes">Taxas de Clientes</SelectItem>
                    <SelectItem value="taxas_padrao">Taxas Padrão</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Ação">
                <Select
                  value={filters.action || '__todas_acoes__'}
                  onValueChange={(value) => handleFilterChange('action', value === '__todas_acoes__' ? '' : value)}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todas_acoes__">Todas as ações</SelectItem>
                    <SelectItem value="INSERT">Criado</SelectItem>
                    <SelectItem value="UPDATE">Atualizado</SelectItem>
                    <SelectItem value="DELETE">Excluído</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>

              <FilterField label="Data Inicial">
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </FilterField>

              <FilterField label="Data Final">
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="focus:ring-sonda-blue focus:border-sonda-blue"
                />
              </FilterField>
            </FilterGrid>
          </FilterBar>

          {/* Tabela de logs */}
          <Card className="shadow-sm border border-gray-200">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <CardTitle className="text-sonda-blue">Logs de Auditoria</CardTitle>
                  <CardDescription>
                    {totalCount} registro(s) encontrado(s)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-sonda-blue" />
                  <span className="ml-2">Carregando logs...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <EmptyState
                  icon={<FileX className="h-12 w-12 text-gray-400" />}
                  title="Nenhum log encontrado"
                  description={searchTerm ? 'Nenhum log encontrado para o termo de busca' : 'Não há logs para exibir com os filtros aplicados'}
                />
              ) : (
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="border rounded-lg p-4 space-y-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {getActionLabel(log.action)}
                          </Badge>
                          <span className="font-medium text-gray-900">
                            {auditService.getTableDisplayName(log.table_name)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                        </div>
                      </div>

                      <div className="text-sm text-gray-700">
                        <strong>Alterações:</strong> <AuditLogChanges log={log} />
                      </div>

                      {log.user_name && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <User className="h-3 w-3" />
                          <span>Por: {log.user_name}</span>
                          {log.user_email && (
                            <span className="text-xs">({log.user_email})</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Página {currentPage} de {totalPages}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10"
                        >
                          Anterior
                        </Button>
                        
                        {/* Números das páginas */}
                        {(() => {
                          const pages: (number | string)[] = [];
                          const showEllipsis = totalPages > 7;
                          
                          if (!showEllipsis) {
                            for (let i = 1; i <= totalPages; i++) {
                              pages.push(i);
                            }
                          } else {
                            pages.push(1);
                            
                            if (currentPage > 3) {
                              pages.push('...');
                            }
                            
                            const start = Math.max(2, currentPage - 1);
                            const end = Math.min(totalPages - 1, currentPage + 1);
                            
                            for (let i = start; i <= end; i++) {
                              pages.push(i);
                            }
                            
                            if (currentPage < totalPages - 2) {
                              pages.push('...');
                            }
                            
                            pages.push(totalPages);
                          }
                          
                          return pages.map((page, index) => {
                            if (page === '...') {
                              return (
                                <span key={`ellipsis-${index}`} className="px-2 text-gray-600">
                                  ...
                                </span>
                              );
                            }
                            
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page as number)}
                                className={cn(
                                  "min-w-[36px]",
                                  currentPage === page 
                                    ? "bg-sonda-blue hover:bg-sonda-dark-blue" 
                                    : "border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10"
                                )}
                              >
                                {page}
                              </Button>
                            );
                          });
                        })()}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10"
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AdminLayout>
  );
}