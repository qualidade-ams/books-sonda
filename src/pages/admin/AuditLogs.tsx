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
import { Filter, RefreshCw, User, Clock, Database, Search, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { auditService } from '@/services/auditService';
import type { AuditLogWithUser, AuditLogFilters, AuditLogSummary, PermissionAuditLog } from '@/types/audit';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
          <p className="text-muted-foreground">
            Acompanhe todas as alterações no sistema de permissões
          </p>
        </div>
        
        <AuditLogExportButtons 
          filters={filters}
          summary={summary}
          isLoading={loading}
        />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alterações</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_changes}</div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grupos Alterados</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.changes_by_table['user_groups'] || 0}
              </div>
              <p className="text-xs text-muted-foreground">Alterações em grupos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Permissões Alteradas</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.changes_by_table['screen_permissions'] || 0}
              </div>
              <p className="text-xs text-muted-foreground">Alterações em permissões</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atribuições Alteradas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.changes_by_table['user_group_assignments'] || 0}
              </div>
              <p className="text-xs text-muted-foreground">Alterações em atribuições</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                {totalCount} registro(s) encontrado(s)
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center justify-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </Button>
            </div>
          </div>

          {/* Filtros Escondidos */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar nos logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tabela</label>
                <Select
                  value={filters.table_name || '__todas_tabelas__'}
                  onValueChange={(value) => handleFilterChange('table_name', value === '__todas_tabelas__' ? '' : value)}
                >
                  <SelectTrigger>
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
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ação</label>
                <Select
                  value={filters.action || '__todas_acoes__'}
                  onValueChange={(value) => handleFilterChange('action', value === '__todas_acoes__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todas_acoes__">Todas as ações</SelectItem>
                    <SelectItem value="INSERT">Criado</SelectItem>
                    <SelectItem value="UPDATE">Atualizado</SelectItem>
                    <SelectItem value="DELETE">Excluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando logs...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum log encontrado para o termo de busca' : 'Nenhum log encontrado com os filtros aplicados'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {getActionLabel(log.action)}
                      </Badge>
                      <span className="font-medium">
                        {auditService.getTableDisplayName(log.table_name)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </div>
                  </div>

                  <div className="text-sm">
                    <strong>Alterações:</strong> <AuditLogChanges log={log} />
                  </div>

                  {log.user_name && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>Por: {log.user_name}</span>
                      {log.user_email && (
                        <span className="text-xs">({log.user_email})</span>
                      )}
                    </div>
                  )}

                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
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
      </div>
    </AdminLayout>
  );
}