import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, RefreshCw, User, Clock, Database, Search, Download, FileText } from 'lucide-react';
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

export default function AuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
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

  // Exportar logs para CSV
  const exportToCSV = async () => {
    try {
      setExportLoading(true);
      
      // Buscar todos os logs com os filtros atuais (sem paginação)
      const { data: allLogs } = await auditService.getAuditLogs(filters, 1, 1000);
      
      if (allLogs.length === 0) {
        toast({
          title: "Nenhum dado para exportar",
          description: "Não há logs para exportar com os filtros aplicados.",
          variant: "destructive",
        });
        return;
      }

      // Preparar dados para CSV
      const csvData = [];
      
      // Cabeçalho
      csvData.push([
        'Data/Hora',
        'Tabela',
        'Ação',
        'Alterações',
        'Usuário',
        'Email do Usuário'
      ]);

      // Dados
      for (const log of allLogs) {
        const changes = await auditService.formatChanges(log);
        csvData.push([
          format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
          auditService.getTableDisplayName(log.table_name),
          getActionLabel(log.action),
          changes,
          log.user_name || 'Sistema',
          log.user_email || ''
        ]);
      }

      // Converter para CSV
      const csvContent = csvData.map(row => 
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Download
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `logs-auditoria-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Exportação concluída",
        description: `${allLogs.length} logs exportados com sucesso.`,
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

  // Exportar relatório detalhado
  const exportDetailedReport = async () => {
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

      // Gerar HTML do relatório
      let htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Relatório de Auditoria - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .log-entry { border: 1px solid #ddd; margin-bottom: 10px; padding: 15px; border-radius: 5px; }
            .log-header { font-weight: bold; color: #333; margin-bottom: 5px; }
            .log-details { color: #666; font-size: 14px; }
            .action-badge { padding: 2px 8px; border-radius: 3px; color: white; font-size: 12px; }
            .action-insert { background-color: #28a745; }
            .action-update { background-color: #ffc107; color: black; }
            .action-delete { background-color: #dc3545; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Logs de Auditoria</h1>
            <p>Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
            <p>Total de registros: ${allLogs.length}</p>
          </div>
      `;

      // Adicionar resumo se disponível
      if (summary) {
        htmlContent += `
          <div class="summary">
            <h3>Resumo (Últimos 30 dias)</h3>
            <p><strong>Total de alterações:</strong> ${summary.total_changes}</p>
            <p><strong>Alterações por tabela:</strong></p>
            <ul>
              ${Object.entries(summary.changes_by_table).map(([table, count]) => 
                `<li>${auditService.getTableDisplayName(table)}: ${count}</li>`
              ).join('')}
            </ul>
          </div>
        `;
      }

      // Adicionar logs
      for (const log of allLogs) {
        const changes = await auditService.formatChanges(log);
        const actionClass = `action-${log.action.toLowerCase()}`;
        
        htmlContent += `
          <div class="log-entry">
            <div class="log-header">
              <span class="action-badge ${actionClass}">${getActionLabel(log.action)}</span>
              ${auditService.getTableDisplayName(log.table_name)} - 
              ${format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
            </div>
            <div class="log-details">
              <strong>Alterações:</strong> ${changes}<br>
              <strong>Usuário:</strong> ${log.user_name || 'Sistema'} ${log.user_email ? `(${log.user_email})` : ''}
            </div>
          </div>
        `;
      }

      htmlContent += `
        </body>
        </html>
      `;

      // Download do HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio-auditoria-${format(new Date(), 'yyyy-MM-dd-HHmm')}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Relatório gerado",
        description: `Relatório detalhado com ${allLogs.length} logs gerado com sucesso.`,
      });

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro ao gerar relatório",
        description: "Ocorreu um erro ao gerar o relatório detalhado.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
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
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={exportLoading || loading}
                className="flex items-center justify-center space-x-2"
              >
                {exportLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span>CSV</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={exportDetailedReport}
                disabled={exportLoading || loading}
                className="flex items-center justify-center space-x-2"
              >
                {exportLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>Relatório</span>
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