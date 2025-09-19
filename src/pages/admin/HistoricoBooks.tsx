import React, { useState, useMemo } from 'react';
import { 
  History, 
  Filter, 
  Download, 
  Calendar, 
  Search, 
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  FileText,
  Eye
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useHistorico } from '@/hooks/useHistorico';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useClientes } from '@/hooks/useClientes';
import ProtectedAction from '@/components/auth/ProtectedAction';
import type {
  HistoricoDisparoCompleto,
  FiltrosAvancados,
  RelatorioDetalhado,
  ExportacaoConfig,
  StatusDisparo,
  EmpresaClienteCompleta
} from '@/types/clientBooks';
import {
  STATUS_DISPARO_OPTIONS
} from '@/types/clientBooks';

const HistoricoBooks = () => {
  const { toast } = useToast();
  
  // Estados para filtros
  const currentDate = new Date();
  const [filtros, setFiltros] = useState<FiltrosAvancados>({
    // Não definir mês e ano por padrão para mostrar todos os registros
    incluirInativos: false,
    apenasComFalhas: false,
    apenasComSucesso: false
  });
  
  // Estados para modais
  const [showFiltrosModal, setShowFiltrosModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<HistoricoDisparoCompleto | null>(null);
  
  // Estados para exportação
  const [configExportacao, setConfigExportacao] = useState<ExportacaoConfig>({
    formato: 'csv',
    incluirDetalhes: true,
    incluirMetricas: true,
    filtros: filtros
  });

  // Estados para busca
  const [termoBusca, setTermoBusca] = useState('');
  const [abaSelecionada, setAbaSelecionada] = useState('historico');

  // Hooks
  const {
    historico,
    relatorioMensal,
    estatisticasPerformance,
    empresasSemBooks,
    clientesComFalhas,
    isLoading,
    isExportando,
    buscarHistorico,
    gerarRelatorio,
    exportarDados,
    refetch
  } = useHistorico(filtros);

  const { empresas } = useEmpresas({ status: ['ativo', 'inativo', 'suspenso'] }) as { empresas: EmpresaClienteCompleta[] };
  const { clientes } = useClientes({});

  // Dados filtrados para busca
  const historicoFiltrado = useMemo(() => {
    if (!termoBusca) return historico;
    
    const termo = termoBusca.toLowerCase();
    return historico.filter(item => 
      item.empresas_clientes?.nome_completo?.toLowerCase().includes(termo) ||
      item.clientes?.nome_completo?.toLowerCase().includes(termo) ||
      item.clientes?.email?.toLowerCase().includes(termo) ||
      item.assunto?.toLowerCase().includes(termo)
    );
  }, [historico, termoBusca]);

  // Estatísticas do histórico atual
  const statsHistorico = useMemo(() => {
    const total = historicoFiltrado.length;
    const enviados = historicoFiltrado.filter(h => h.status === 'enviado').length;
    const falhas = historicoFiltrado.filter(h => h.status === 'falhou').length;
    const agendados = historicoFiltrado.filter(h => h.status === 'agendado').length;
    const cancelados = historicoFiltrado.filter(h => h.status === 'cancelado').length;
    
    const empresasUnicas = new Set(historicoFiltrado.map(h => h.empresa_id));
    const clientesUnicos = new Set(historicoFiltrado.map(h => h.cliente_id));
    
    return {
      total,
      enviados,
      falhas,
      agendados,
      cancelados,
      empresasUnicas: empresasUnicas.size,
      clientesUnicos: clientesUnicos.size,
      taxaSucesso: total > 0 ? Math.round((enviados / total) * 100) : 0
    };
  }, [historicoFiltrado]);

  // Handlers para filtros
  const handleFiltroChange = (campo: keyof FiltrosAvancados, valor: any) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleAplicarFiltros = () => {
    setShowFiltrosModal(false);
    buscarHistorico(filtros);
  };

  const handleLimparFiltros = () => {
    const filtrosLimpos: FiltrosAvancados = {
      // Não definir mês e ano por padrão para mostrar todos os registros
      incluirInativos: false,
      apenasComFalhas: false,
      apenasComSucesso: false
    };
    setFiltros(filtrosLimpos);
    buscarHistorico(filtrosLimpos);
  };

  // Handlers para exportação
  const handleExportar = async () => {
    try {
      const configFinal = {
        ...configExportacao,
        filtros: filtros
      };
      
      const resultado = await exportarDados(configFinal);
      
      // Simular download do arquivo
      const blob = new Blob([JSON.stringify(resultado.dados, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resultado.nomeArquivo}.${resultado.tipo}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setShowExportModal(false);
      
      toast({
        title: "Exportação concluída",
        description: `Arquivo ${resultado.nomeArquivo}.${resultado.tipo} baixado com sucesso`,
      });

    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Handlers para visualização
  const handleVerDetalhes = (item: HistoricoDisparoCompleto) => {
    setItemSelecionado(item);
    setShowDetalhesModal(true);
  };

  const handleGerarRelatorio = async () => {
    if (!filtros.mes || !filtros.ano) {
      toast({
        title: "Filtros obrigatórios",
        description: "Selecione um mês e ano para gerar o relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      await gerarRelatorio(filtros.mes, filtros.ano);
      toast({
        title: "Relatório gerado",
        description: "Relatório mensal gerado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: StatusDisparo) => {
    switch (status) {
      case 'enviado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'falhou':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'agendado':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelado':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: StatusDisparo) => {
    switch (status) {
      case 'enviado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'falhou':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'agendado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Histórico e Relatórios
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Consulte o histórico detalhado e gere relatórios de envio de books
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFiltrosModal(true)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <ProtectedAction screenKey="historico_books" requiredLevel="view">
              <Button
                variant="outline"
                onClick={() => setShowExportModal(true)}
                disabled={isExportando}
                className="flex items-center gap-2"
              >
                <Download className={`h-4 w-4 ${isExportando ? 'animate-spin' : ''}`} />
                Exportar
              </Button>
            </ProtectedAction>
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros Ativos */}
        {(filtros.mes || filtros.ano || filtros.empresaId || filtros.status?.length) && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {filtros.mes && filtros.ano && (
                    <Badge variant="secondary">
                      {nomesMeses[filtros.mes - 1]} {filtros.ano}
                    </Badge>
                  )}
                  {filtros.empresaId && (
                    <Badge variant="secondary">
                      Empresa: {empresas.find(e => e.id === filtros.empresaId)?.nome_completo}
                    </Badge>
                  )}
                  {filtros.status && filtros.status.length > 0 && (
                    <Badge variant="secondary">
                      Status: {filtros.status.join(', ')}
                    </Badge>
                  )}
                  {filtros.apenasComFalhas && (
                    <Badge variant="destructive">
                      Apenas Falhas
                    </Badge>
                  )}
                  {filtros.apenasComSucesso && (
                    <Badge variant="default">
                      Apenas Sucessos
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLimparFiltros}
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Total de Disparos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statsHistorico.total}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {statsHistorico.empresasUnicas} empresas • {statsHistorico.clientesUnicos} clientes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Sucessos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsHistorico.enviados}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {statsHistorico.taxaSucesso}% de sucesso
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Falhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsHistorico.falhas}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Agendados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsHistorico.agendados}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Abas Principais */}
        <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="relatorio">Relatório Mensal</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="problemas">Problemas</TabsTrigger>
          </TabsList>

          {/* Aba Histórico */}
          <TabsContent value="historico" className="space-y-4">
            {/* Busca */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por empresa, cliente, e-mail ou assunto..."
                      value={termoBusca}
                      onChange={(e) => setTermoBusca(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Histórico */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Disparos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Carregando...</p>
                  </div>
                ) : historicoFiltrado.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Nenhum registro encontrado
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data/Hora</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assunto</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historicoFiltrado.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.data_disparo 
                                ? new Date(item.data_disparo).toLocaleString('pt-BR')
                                : item.data_agendamento
                                ? `Agendado: ${new Date(item.data_agendamento).toLocaleString('pt-BR')}`
                                : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {item.empresas_clientes?.nome_completo}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.empresas_clientes?.nome_abreviado}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {item.clientes?.nome_completo}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {item.clientes?.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(item.status as StatusDisparo)}
                                <Badge className={getStatusColor(item.status as StatusDisparo)}>
                                  {STATUS_DISPARO_OPTIONS.find(opt => opt.value === item.status)?.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate">
                                {item.assunto || '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleVerDetalhes(item)}
                              >
                                <Eye className="h-4 w-4" />
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
          </TabsContent>

          {/* Aba Relatório Mensal */}
          <TabsContent value="relatorio" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Relatório Mensal</CardTitle>
                  <ProtectedAction screenKey="historico_books" requiredLevel="view">
                    <Button
                      onClick={handleGerarRelatorio}
                      disabled={!filtros.mes || !filtros.ano}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Gerar Relatório
                    </Button>
                  </ProtectedAction>
                </div>
              </CardHeader>
              <CardContent>
                {relatorioMensal ? (
                  <div className="space-y-6">
                    {/* Métricas do Relatório */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {relatorioMensal.metricas.empresasAtivas}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Empresas Ativas
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-green-600">
                            {relatorioMensal.metricas.emailsEnviadosMes}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            E-mails Enviados
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-red-600">
                            {relatorioMensal.metricas.emailsFalharamMes}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            E-mails com Falha
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-blue-600">
                            {relatorioMensal.metricas.taxaSucessoMes}%
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Taxa de Sucesso
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Empresas sem Books */}
                    {relatorioMensal.metricas.empresasSemBooks.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            Empresas sem Books ({relatorioMensal.metricas.empresasSemBooks.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {relatorioMensal.metricas.empresasSemBooks.map((empresa) => (
                              <div
                                key={empresa.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <div className="font-medium">{empresa.nome_completo}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    Status: {empresa.status}
                                  </div>
                                </div>
                                <Badge variant="destructive">
                                  Sem Books
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Selecione um mês e ano nos filtros e clique em "Gerar Relatório"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Performance */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estatísticas de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {estatisticasPerformance ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {estatisticasPerformance.totalDisparos}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total de Disparos
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {estatisticasPerformance.taxaSucesso}%
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Taxa de Sucesso
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {estatisticasPerformance.mediaDisparosPorDia}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Média por Dia
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {estatisticasPerformance.empresasAtendidas}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Empresas Atendidas
                      </p>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {estatisticasPerformance.clientesAtendidos}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Clientes Atendidos
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      Carregando estatísticas de performance...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Problemas */}
          <TabsContent value="problemas" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Empresas sem Books */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Empresas sem Books
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {empresasSemBooks && empresasSemBooks.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {empresasSemBooks.map((empresa) => (
                        <div
                          key={empresa.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{empresa.nome_completo}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {empresa.nome_abreviado}
                            </div>
                          </div>
                          <Badge variant="destructive">
                            Sem Books
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle className="h-6 w-6 mx-auto text-green-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Todas as empresas receberam books
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clientes com Falhas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Clientes com Falhas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {clientesComFalhas && clientesComFalhas.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {clientesComFalhas.map((item) => (
                        <div
                          key={item.cliente.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{item.cliente.nome_completo}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {item.cliente.email} • {item.empresa.nome_completo}
                            </div>
                            {item.ultimaFalha && (
                              <div className="text-xs text-gray-500">
                                Última falha: {item.ultimaFalha.toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <Badge variant="destructive">
                            {item.totalFalhas} falhas
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle className="h-6 w-6 mx-auto text-green-600" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Nenhum cliente com falhas recentes
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Modal de Filtros */}
        <Dialog open={showFiltrosModal} onOpenChange={setShowFiltrosModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Filtros Avançados</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mes-filtro">Mês</Label>
                  <Select
                    value={filtros.mes?.toString()}
                    onValueChange={(value) => handleFiltroChange('mes', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {nomesMeses.map((nome, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="ano-filtro">Ano</Label>
                  <Select
                    value={filtros.ano?.toString()}
                    onValueChange={(value) => handleFiltroChange('ano', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i).map((ano) => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="empresa-filtro">Empresa</Label>
                <Select
                  value={filtros.empresaId || ''}
                  onValueChange={(value) => handleFiltroChange('empresaId', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas as empresas</SelectItem>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Status</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {STATUS_DISPARO_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={filtros.status?.includes(option.value as StatusDisparo) || false}
                        onCheckedChange={(checked) => {
                          const currentStatus = filtros.status || [];
                          if (checked) {
                            handleFiltroChange('status', [...currentStatus, option.value]);
                          } else {
                            handleFiltroChange('status', currentStatus.filter(s => s !== option.value));
                          }
                        }}
                      />
                      <Label htmlFor={`status-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluir-inativos"
                    checked={filtros.incluirInativos || false}
                    onCheckedChange={(checked) => handleFiltroChange('incluirInativos', checked)}
                  />
                  <Label htmlFor="incluir-inativos" className="text-sm">
                    Incluir empresas e clientes inativos
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apenas-falhas"
                    checked={filtros.apenasComFalhas || false}
                    onCheckedChange={(checked) => handleFiltroChange('apenasComFalhas', checked)}
                  />
                  <Label htmlFor="apenas-falhas" className="text-sm">
                    Apenas registros com falhas
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="apenas-sucessos"
                    checked={filtros.apenasComSucesso || false}
                    onCheckedChange={(checked) => handleFiltroChange('apenasComSucesso', checked)}
                  />
                  <Label htmlFor="apenas-sucessos" className="text-sm">
                    Apenas registros com sucesso
                  </Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFiltrosModal(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAplicarFiltros}>
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Exportação */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exportar Dados</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Formato</Label>
                <Select
                  value={configExportacao.formato}
                  onValueChange={(value: 'csv' | 'excel' | 'pdf') => 
                    setConfigExportacao(prev => ({ ...prev, formato: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">Excel</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluir-detalhes"
                    checked={configExportacao.incluirDetalhes}
                    onCheckedChange={(checked) => 
                      setConfigExportacao(prev => ({ ...prev, incluirDetalhes: !!checked }))
                    }
                  />
                  <Label htmlFor="incluir-detalhes" className="text-sm">
                    Incluir detalhes dos disparos
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluir-metricas"
                    checked={configExportacao.incluirMetricas}
                    onCheckedChange={(checked) => 
                      setConfigExportacao(prev => ({ ...prev, incluirMetricas: !!checked }))
                    }
                  />
                  <Label htmlFor="incluir-metricas" className="text-sm">
                    Incluir métricas resumidas
                  </Label>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleExportar}
                  disabled={isExportando}
                >
                  {isExportando ? 'Exportando...' : 'Exportar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes */}
        <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes do Disparo</DialogTitle>
            </DialogHeader>
            {itemSelecionado && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Empresa
                    </Label>
                    <p className="font-medium">{itemSelecionado.empresas_clientes?.nome_completo}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {itemSelecionado.empresas_clientes?.nome_abreviado}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Cliente
                    </Label>
                    <p className="font-medium">{itemSelecionado.clientes?.nome_completo}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {itemSelecionado.clientes?.email}
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Status
                    </Label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(itemSelecionado.status as StatusDisparo)}
                      <Badge className={getStatusColor(itemSelecionado.status as StatusDisparo)}>
                        {STATUS_DISPARO_OPTIONS.find(opt => opt.value === itemSelecionado.status)?.label}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Data/Hora
                    </Label>
                    <p>
                      {itemSelecionado.data_disparo 
                        ? new Date(itemSelecionado.data_disparo).toLocaleString('pt-BR')
                        : itemSelecionado.data_agendamento
                        ? `Agendado: ${new Date(itemSelecionado.data_agendamento).toLocaleString('pt-BR')}`
                        : '-'
                      }
                    </p>
                  </div>
                </div>

                {itemSelecionado.assunto && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Assunto
                    </Label>
                    <p>{itemSelecionado.assunto}</p>
                  </div>
                )}

                {itemSelecionado.emails_cc && itemSelecionado.emails_cc.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      E-mails em Cópia
                    </Label>
                    <p className="text-sm">{itemSelecionado.emails_cc.join(', ')}</p>
                  </div>
                )}

                {itemSelecionado.erro_detalhes && (
                  <div>
                    <Label className="text-sm font-medium text-red-600">
                      Detalhes do Erro
                    </Label>
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        {itemSelecionado.erro_detalhes}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDetalhesModal(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default HistoricoBooks;