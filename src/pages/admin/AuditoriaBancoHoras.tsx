/**
 * Página de Auditoria do Banco de Horas
 * 
 * Exibe log completo de todas as ações realizadas no sistema de banco de horas,
 * com filtros avançados, paginação e opções de exportação.
 * 
 * Funcionalidades:
 * - Tabela com todas as ações (data, usuário, ação, descrição)
 * - Filtros por empresa, data, usuário e ação
 * - Busca livre em descrição
 * - Paginação
 * - Exportação para CSV/PDF
 * - Visualização de detalhes da ação (dados_acao em JSON)
 * 
 * @module pages/admin/AuditoriaBancoHoras
 * @requirements 13.1-13.10
 */

import { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Filter,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar,
  User,
  Activity,
  AlertCircle
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  useBancoHorasAuditLog,
  useAcoesDisponiveis,
  formatarAcao,
  getCorAcao,
  type AuditLogFilters,
  type PaginationOptions
} from '@/hooks/useBancoHorasAuditLog';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useToast } from '@/hooks/use-toast';
import type { BancoHorasAuditLog } from '@/types/bancoHoras';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Página AuditoriaBancoHoras
 * 
 * Implementa visualização completa do audit log com filtros, paginação e exportação.
 */
export default function AuditoriaBancoHoras() {
  const { toast } = useToast();
  
  // Estado de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<AuditLogFilters>({
    empresaId: undefined,
    dataInicio: undefined,
    dataFim: undefined,
    usuarioId: undefined,
    acao: undefined,
    busca: ''
  });
  
  // Estado de paginação
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize: 50
  });
  
  // Estado de modal de detalhes
  const [logSelecionado, setLogSelecionado] = useState<BancoHorasAuditLog | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  
  // Buscar dados
  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas();
  const { data: acoesDisponiveis, isLoading: isLoadingAcoes } = useAcoesDisponiveis();
  const {
    data: auditData,
    isLoading: isLoadingAudit,
    isFetching: isFetchingAudit,
    refetch: refetchAudit
  } = useBancoHorasAuditLog(filtros, pagination);
  
  // Verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return (
      filtros.empresaId !== undefined ||
      filtros.dataInicio !== undefined ||
      filtros.dataFim !== undefined ||
      filtros.usuarioId !== undefined ||
      filtros.acao !== undefined ||
      (filtros.busca && filtros.busca.trim() !== '')
    );
  }, [filtros]);
  
  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      empresaId: undefined,
      dataInicio: undefined,
      dataFim: undefined,
      usuarioId: undefined,
      acao: undefined,
      busca: ''
    });
    setPagination({ page: 1, pageSize: 50 });
  };
  
  // Handlers de paginação
  const handlePaginaAnterior = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };
  
  const handleProximaPagina = () => {
    if (auditData && pagination.page < auditData.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };
  
  // Handler de visualização de detalhes
  const handleVisualizarDetalhes = (log: BancoHorasAuditLog) => {
    setLogSelecionado(log);
    setModalDetalhesAberto(true);
  };
  
  // Handler de exportação
  const handleExportar = (formato: 'csv' | 'pdf') => {
    toast({
      title: 'Exportação em desenvolvimento',
      description: `A exportação para ${formato.toUpperCase()} será implementada em breve.`,
    });
  };
  
  // Formatar data
  const formatarData = (data: Date | string) => {
    const dataObj = typeof data === 'string' ? new Date(data) : data;
    return format(dataObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };
  
  // Calcular índices de exibição
  const startIndex = auditData ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const endIndex = auditData 
    ? Math.min(pagination.page * pagination.pageSize, auditData.totalCount)
    : 0;
  
  // Loading state
  const isLoading = isLoadingEmpresas || isLoadingAcoes || isLoadingAudit;
  
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Auditoria de Banco de Horas
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize o histórico completo de ações realizadas no sistema
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportar('csv')}
                disabled={!auditData || auditData.logs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportar('pdf')}
                disabled={!auditData || auditData.logs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : auditData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Total de Registros
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {auditData.totalCount.toLocaleString('pt-BR')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-sonda-blue">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Página Atual
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-sonda-blue">
                    {pagination.page} de {auditData.totalPages}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Registros na Página
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-green-600">
                    {auditData.logs.length}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Card Principal com Tabela */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Log de Auditoria
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
                  
                  {hasActiveFilters && (
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

              {/* Área de filtros expansível */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Campo de busca */}
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar em descrição ou ação..."
                          value={filtros.busca || ''}
                          onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                          className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>

                    {/* Filtro Empresa */}
                    <div>
                      <div className="text-sm font-medium mb-2">Empresa</div>
                      <Select 
                        value={filtros.empresaId || 'all'} 
                        onValueChange={(value) => setFiltros({ ...filtros, empresaId: value === 'all' ? undefined : value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todas as empresas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as empresas</SelectItem>
                          {empresas?.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Ação */}
                    <div>
                      <div className="text-sm font-medium mb-2">Ação</div>
                      <Select 
                        value={filtros.acao || 'all'} 
                        onValueChange={(value) => setFiltros({ ...filtros, acao: value === 'all' ? undefined : value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todas as ações" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as ações</SelectItem>
                          {acoesDisponiveis?.map((acao) => (
                            <SelectItem key={acao} value={acao}>
                              {formatarAcao(acao)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filtros de Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Data Início</div>
                      <Input
                        type="date"
                        value={filtros.dataInicio ? format(filtros.dataInicio, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setFiltros({ 
                          ...filtros, 
                          dataInicio: e.target.value ? new Date(e.target.value) : undefined 
                        })}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Data Fim</div>
                      <Input
                        type="date"
                        value={filtros.dataFim ? format(filtros.dataFim, 'yyyy-MM-dd') : ''}
                        onChange={(e) => setFiltros({ 
                          ...filtros, 
                          dataFim: e.target.value ? new Date(e.target.value) : undefined 
                        })}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="overflow-x-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-pulse" />
                    <p className="text-gray-500">Carregando audit log...</p>
                  </div>
                </div>
              ) : !auditData || auditData.logs.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      Nenhum registro encontrado
                    </p>
                    <p className="text-sm text-gray-400">
                      {hasActiveFilters 
                        ? 'Tente ajustar os filtros para ver mais resultados'
                        : 'Não há registros de auditoria disponíveis'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Data/Hora</TableHead>
                        <TableHead className="font-semibold text-gray-700">Ação</TableHead>
                        <TableHead className="font-semibold text-gray-700">Descrição</TableHead>
                        <TableHead className="font-semibold text-gray-700">Usuário</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center w-24">Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.logs.map((log) => (
                        <TableRow key={log.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">
                                {formatarData(log.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge className={`${getCorAcao(log.acao)} text-xs`}>
                              {formatarAcao(log.acao)}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm text-gray-700">
                              {log.descricao || '-'}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {log.created_by || 'Sistema'}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleVisualizarDetalhes(log)}
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="text-sm text-gray-500">
                      Mostrando {startIndex} a {endIndex} de {auditData.totalCount.toLocaleString('pt-BR')} resultados
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePaginaAnterior}
                        disabled={pagination.page === 1 || isFetchingAudit}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {pagination.page} de {auditData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleProximaPagina}
                        disabled={pagination.page === auditData.totalPages || isFetchingAudit}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue">
              Detalhes da Ação
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Informações completas sobre a ação realizada
            </DialogDescription>
          </DialogHeader>

          {logSelecionado && (
            <div className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Data/Hora</div>
                    <div className="text-sm text-gray-900">
                      {formatarData(logSelecionado.created_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Ação</div>
                    <Badge className={getCorAcao(logSelecionado.acao)}>
                      {formatarAcao(logSelecionado.acao)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Descrição</div>
                  <div className="text-sm text-gray-900">
                    {logSelecionado.descricao || '-'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Usuário</div>
                    <div className="text-sm text-gray-900">
                      {logSelecionado.created_by || 'Sistema'}
                    </div>
                  </div>
                  {logSelecionado.ip_address && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">IP</div>
                      <div className="text-sm text-gray-900 font-mono">
                        {logSelecionado.ip_address}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados da Ação (JSON) */}
              {logSelecionado.dados_acao && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Dados da Ação</div>
                  <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-900 font-mono">
                      {JSON.stringify(logSelecionado.dados_acao, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* User Agent */}
              {logSelecionado.user_agent && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Navegador</div>
                  <div className="text-xs text-gray-600 font-mono break-all">
                    {logSelecionado.user_agent}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
