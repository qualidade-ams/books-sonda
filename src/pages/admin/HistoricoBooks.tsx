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
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Copy
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { formatDateTime } from '@/utils/formatters';
import { useHistorico } from '@/hooks/useHistorico';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useClientes } from '@/hooks/useClientes';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { HistoricoExportButtons } from '@/components/admin/client-books/HistoricoExportButtons';
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
  const mesAtual = currentDate.getMonth() + 1; // 1-12
  const anoAtual = currentDate.getFullYear();
  
  const [filtros, setFiltros] = useState<FiltrosAvancados>({
    mes: mesAtual, // ✅ Mês atual por padrão
    ano: anoAtual, // ✅ Ano atual por padrão
    incluirInativos: true,
    apenasComFalhas: false,
    apenasComSucesso: false
  });
  
  // Estado para rastrear se o período foi alterado pelo usuário
  const [periodoAlterado, setPeriodoAlterado] = useState(false);
  
  // Estados para modais
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<HistoricoDisparoCompleto | null>(null);

  // Estados para busca
  const [termoBusca, setTermoBusca] = useState('');
  const [abaSelecionada, setAbaSelecionada] = useState('historico');
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  // Paginação
  const totalPages = Math.ceil(historicoFiltrado.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = historicoFiltrado.slice(startIndex, endIndex);
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  // Função auxiliar para extrair número de clientes do e-mail consolidado
  const extrairNumeroClientesConsolidado = (erroDetalhes: string | null): number => {
    if (!erroDetalhes) return 0;
    
    // Padrão: "E-mail consolidado enviado para X clientes"
    const match = erroDetalhes.match(/E-mail consolidado (?:enviado para|para) (\d+) clientes/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    
    return 0;
  };

  // Estatísticas do histórico atual
  const statsHistorico = useMemo(() => {
    const total = historicoFiltrado.length;
    const enviados = historicoFiltrado.filter(h => h.status === 'enviado').length;
    const falhas = historicoFiltrado.filter(h => h.status === 'falhou').length;
    const agendados = historicoFiltrado.filter(h => h.status === 'agendado').length;
    const cancelados = historicoFiltrado.filter(h => h.status === 'cancelado').length;
    
    // Contar empresas únicas e total de clientes (considerando e-mails consolidados)
    const empresasUnicasSet = new Set<string>();
    let totalClientes = 0;
    
    historicoFiltrado.forEach(item => {
      if (item.empresa_id) {
        empresasUnicasSet.add(item.empresa_id);
      }
      
      // Verificar se é e-mail consolidado e extrair número de clientes
      const numClientesConsolidado = extrairNumeroClientesConsolidado(item.erro_detalhes);
      if (numClientesConsolidado > 0) {
        // E-mail consolidado: somar o número de clientes informado
        totalClientes += numClientesConsolidado;
      } else if (item.cliente_id) {
        // E-mail individual: contar 1 cliente
        totalClientes += 1;
      }
    });
    
    return {
      total,
      enviados,
      falhas,
      agendados,
      cancelados,
      empresasUnicas: empresasUnicasSet.size, // Empresas únicas do histórico
      clientesUnicos: totalClientes, // Total de clientes (considerando consolidados)
      taxaSucesso: total > 0 ? Math.round((enviados / total) * 100) : 0
    };
  }, [historicoFiltrado]);

  // Handlers para filtros
  const handleFiltroChange = (campo: keyof FiltrosAvancados, valor: any) => {
    // Detectar se o período (mês ou ano) foi alterado
    if (campo === 'mes' || campo === 'ano') {
      const mesAlterado = campo === 'mes' ? valor : filtros.mes;
      const anoAlterado = campo === 'ano' ? valor : filtros.ano;
      
      // Marcar como alterado se for diferente do período atual
      if (mesAlterado !== mesAtual || anoAlterado !== anoAtual) {
        setPeriodoAlterado(true);
      } else {
        setPeriodoAlterado(false);
      }
    }
    
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
    // Aplicar filtros automaticamente ao mudar
    buscarHistorico({
      ...filtros,
      [campo]: valor
    });
  };

  const handleLimparFiltros = () => {
    const filtrosLimpos: FiltrosAvancados = {
      mes: mesAtual, // ✅ Voltar para mês atual
      ano: anoAtual, // ✅ Voltar para ano atual
      incluirInativos: true,
      apenasComFalhas: false,
      apenasComSucesso: false
    };
    setFiltros(filtrosLimpos);
    setTermoBusca(''); // Limpar busca também
    setPeriodoAlterado(false); // ✅ Resetar flag de período alterado
    buscarHistorico(filtrosLimpos);
  };


  // Handlers para visualização
  const handleVerDetalhes = (item: HistoricoDisparoCompleto) => {
    setItemSelecionado(item);
    setShowDetalhesModal(true);
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
            <ProtectedAction screenKey="historico_books" requiredLevel="view">
              <HistoricoExportButtons 
                historico={historicoFiltrado}
                disabled={isLoading}
              />
            </ProtectedAction>
          </div>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Total de Disparos</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{statsHistorico.total}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statsHistorico.empresasUnicas} empresas • {statsHistorico.clientesUnicos} clientes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-green-500">Sucessos</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{statsHistorico.enviados}</p>
              <p className="text-xs text-gray-500 mt-1">
                {statsHistorico.taxaSucesso}% de sucesso
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-red-500">Falhas</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{statsHistorico.falhas}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-medium text-blue-500">Agendados</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{statsHistorico.agendados}</p>
            </CardContent>
          </Card>
        </div>

        {/* Card de Navegação de Período */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const mesAtual = filtros.mes || currentDate.getMonth() + 1;
                  const anoAtual = filtros.ano || currentDate.getFullYear();
                  
                  let novoMes = mesAtual - 1;
                  let novoAno = anoAtual;
                  
                  if (novoMes < 1) {
                    novoMes = 12;
                    novoAno = anoAtual - 1;
                  }
                  
                  setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
                  setCurrentPage(1); // Reset página ao mudar período
                  
                  // Detectar se foi alterado
                  const mesOriginal = currentDate.getMonth() + 1;
                  const anoOriginal = currentDate.getFullYear();
                  if (novoMes !== mesOriginal || novoAno !== anoOriginal) {
                    setPeriodoAlterado(true);
                  } else {
                    setPeriodoAlterado(false);
                  }
                  
                  buscarHistorico({ ...filtros, mes: novoMes, ano: novoAno });
                }}
                className="flex items-center gap-1"
              >
                <span className="text-lg">←</span>
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {nomesMeses[(filtros.mes || mesAtual) - 1]} {filtros.ano || anoAtual}
                </h2>
                <p className="text-sm text-gray-500">
                  {historicoFiltrado.length} {historicoFiltrado.length === 1 ? 'requerimento' : 'requerimentos'}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const mesAtualFiltro = filtros.mes || currentDate.getMonth() + 1;
                  const anoAtualFiltro = filtros.ano || currentDate.getFullYear();
                  
                  let novoMes = mesAtualFiltro + 1;
                  let novoAno = anoAtualFiltro;
                  
                  if (novoMes > 12) {
                    novoMes = 1;
                    novoAno = anoAtualFiltro + 1;
                  }
                  
                  setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
                  setCurrentPage(1); // Reset página ao mudar período
                  
                  // Detectar se foi alterado
                  const mesOriginal = currentDate.getMonth() + 1;
                  const anoOriginal = currentDate.getFullYear();
                  if (novoMes !== mesOriginal || novoAno !== anoOriginal) {
                    setPeriodoAlterado(true);
                  } else {
                    setPeriodoAlterado(false);
                  }
                  
                  buscarHistorico({ ...filtros, mes: novoMes, ano: novoAno });
                }}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">Próximo</span>
                <span className="text-lg">→</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Abas Principais */}
        <Tabs value={abaSelecionada} onValueChange={setAbaSelecionada}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="relatorio">Relatório Mensal</TabsTrigger>
            <TabsTrigger value="problemas">Problemas</TabsTrigger>
          </TabsList>

          {/* Aba Histórico */}
          <TabsContent value="historico" className="space-y-4">
            {/* Tabela de Histórico */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Histórico de Disparos
                  </CardTitle>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                      className="flex items-center justify-center space-x-2"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filtros</span>
                    </Button>
                    
                    {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
                    {(periodoAlterado || filtros.status?.length || termoBusca) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLimparFiltros}
                        className="whitespace-nowrap hover:border-red-300"
                      >
                        <X className="h-4 w-4 mr-2 text-red-600" />
                        Limpar Filtro
                      </Button>
                    )}
                  </div>
                </div>

                {/* Área de filtros expansível */}
                {filtrosExpandidos && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Campo de busca com ícone */}
                      <div>
                        <div className="text-sm font-medium mb-2">Buscar</div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar por empresa, cliente..."
                            value={termoBusca}
                            onChange={(e) => setTermoBusca(e.target.value)}
                            className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                          />
                        </div>
                      </div>

                      {/* Filtro Status */}
                      <div>
                        <div className="text-sm font-medium mb-2">Status</div>
                        <Select
                          value={filtros.status && filtros.status.length > 0 ? filtros.status[0] : 'all'}
                          onValueChange={(value) => handleFiltroChange('status', value === 'all' ? [] : [value])}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder="Todos os status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            {STATUS_DISPARO_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro Período de Envio */}
                      <div className="md:col-span-2">
                        <div className="text-sm font-medium mb-2">Período de Envio</div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between focus:ring-sonda-blue focus:border-sonda-blue"
                            >
                              <span>
                                {filtros.mes && filtros.ano
                                  ? `${filtros.mes.toString().padStart(2, '0')}/${filtros.ano}`
                                  : 'Todos os períodos'}
                              </span>
                              <Calendar className="h-4 w-4 ml-2 text-gray-500" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4" align="start">
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium text-sm mb-3">Selecionar Mês/Ano</h4>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                {/* Select Mês */}
                                <div className="space-y-2">
                                  <Label className="text-xs text-gray-600">Mês</Label>
                                  <Select
                                    value={filtros.mes?.toString() || 'all'}
                                    onValueChange={(value) => {
                                      if (value === 'all') {
                                        handleFiltroChange('mes', undefined);
                                      } else {
                                        handleFiltroChange('mes', parseInt(value));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                                      <SelectValue placeholder="Mês" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      {nomesMeses.map((nome, index) => (
                                        <SelectItem key={index} value={(index + 1).toString()}>
                                          {nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Select Ano */}
                                <div className="space-y-2">
                                  <Label className="text-xs text-gray-600">Ano</Label>
                                  <Select
                                    value={filtros.ano?.toString() || 'all'}
                                    onValueChange={(value) => {
                                      if (value === 'all') {
                                        handleFiltroChange('ano', undefined);
                                      } else {
                                        handleFiltroChange('ano', parseInt(value));
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                                      <SelectValue placeholder="Ano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Todos</SelectItem>
                                      {/* Gerar anos de 2025 até ano atual + 1 */}
                                      {Array.from(
                                        { length: currentDate.getFullYear() + 1 - 2025 + 1 }, 
                                        (_, i) => currentDate.getFullYear() + 1 - i
                                      ).map((ano) => (
                                        <SelectItem key={ano} value={ano.toString()}>
                                          {ano}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                )}
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
                  <div className="w-full overflow-x-auto">
                    <Table className="w-full" style={{ tableLayout: 'fixed' }}>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[15%]">Data/Hora</TableHead>
                          <TableHead className="w-[20%]">Empresa</TableHead>
                          <TableHead className="w-[25%]">Cliente</TableHead>
                          <TableHead className="w-[15%]">Status</TableHead>
                          <TableHead className="w-[15%]">Assunto</TableHead>
                          <TableHead className="w-[10%]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              {item.data_disparo 
                                ? formatDateTime(item.data_disparo)
                                : item.data_agendamento
                                ? `Agendado: ${formatDateTime(item.data_agendamento)}`
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
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleVerDetalhes(item)}
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* Paginação no Rodapé */}
                {!isLoading && historicoFiltrado.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                    {/* Select de itens por página */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          setItemsPerPage(parseInt(value));
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Navegação de páginas */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={!hasPrevPage}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={!hasNextPage}
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Contador de registros */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {startIndex + 1}-{Math.min(endIndex, historicoFiltrado.length)} de {historicoFiltrado.length} {historicoFiltrado.length === 1 ? 'registro' : 'registros'}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Relatório Mensal */}
          <TabsContent value="relatorio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatório Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                {relatorioMensal ? (
                  <div className="space-y-6">
                    {/* Métricas do Relatório */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <p className="text-xs font-medium text-gray-500">Empresas Ativas</p>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {relatorioMensal.metricas.empresasAtivas}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="h-4 w-4 text-green-500" />
                            <p className="text-xs font-medium text-green-500">E-mails Enviados</p>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {relatorioMensal.metricas.emailsEnviadosMes}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <p className="text-xs font-medium text-red-500">E-mails com Falha</p>
                          </div>
                          <p className="text-2xl font-bold text-red-600">
                            {relatorioMensal.metricas.emailsFalharamMes}
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                            <p className="text-xs font-medium text-blue-500">Taxa de Sucesso</p>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">
                            {relatorioMensal.metricas.taxaSucessoMes}%
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Empresas com Books */}
                    {relatorioMensal.metricas.empresasComBooks && relatorioMensal.metricas.empresasComBooks.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-green-600 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Empresas com Books Enviados ({relatorioMensal.metricas.empresasComBooks.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {relatorioMensal.metricas.empresasComBooks.map((empresa) => (
                              <div
                                key={empresa.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <div className="font-medium">{empresa.nome_completo}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {empresa.nome_abreviado} • Status: {empresa.status}
                                  </div>
                                </div>
                                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  Books Enviados
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

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
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {relatorioMensal.metricas.empresasSemBooks.map((empresa) => (
                              <div
                                key={empresa.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div>
                                  <div className="font-medium">{empresa.nome_completo}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {empresa.nome_abreviado} • Status: {empresa.status}
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
                      Selecione um mês e ano nos filtros para visualizar o relatório
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Problemas */}
          <TabsContent value="problemas" className="space-y-4">
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
                                Última falha: {formatDateTime(item.ultimaFalha.toISOString())}
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
          </TabsContent>
        </Tabs>




        {/* Modal de Detalhes */}
        <Dialog open={showDetalhesModal} onOpenChange={setShowDetalhesModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-sonda-blue">
                Detalhes do Disparo
              </DialogTitle>
            </DialogHeader>
            {itemSelecionado && (
              <div className="space-y-6 py-4">
                {/* Grid Principal com Dados */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Empresa */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Empresa
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {itemSelecionado.empresas_clientes?.nome_completo}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {itemSelecionado.empresas_clientes?.nome_abreviado}
                      </p>
                    </div>
                  </div>
                  
                  {/* Cliente(s) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cliente(s)
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {itemSelecionado.erro_detalhes && itemSelecionado.erro_detalhes.includes('E-mail consolidado enviado para') ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-blue-600 dark:text-blue-400">
                            E-mail Consolidado
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {itemSelecionado.erro_detalhes.match(/enviado para (\d+) clientes?:/)?.[1] || 'Múltiplos'} cliente(s)
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {itemSelecionado.clientes?.nome_completo}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {itemSelecionado.clientes?.email}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(itemSelecionado.status as StatusDisparo)}
                        <Badge className={getStatusColor(itemSelecionado.status as StatusDisparo)}>
                          {STATUS_DISPARO_OPTIONS.find(opt => opt.value === itemSelecionado.status)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Data/Hora */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Data/Hora
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {itemSelecionado.data_disparo 
                          ? formatDateTime(itemSelecionado.data_disparo)
                          : itemSelecionado.data_agendamento
                          ? `Agendado: ${formatDateTime(itemSelecionado.data_agendamento)}`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assunto */}
                {itemSelecionado.assunto && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assunto
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {itemSelecionado.assunto}
                      </p>
                    </div>
                  </div>
                )}

                {/* Detalhes do Envio - MOVIDO PARA CIMA */}
                {itemSelecionado.erro_detalhes && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {itemSelecionado.erro_detalhes.includes('E-mail consolidado enviado para') ? 'Detalhes do Envio' : 'Detalhes do Erro'}
                      </label>
                      {/* Botão Copiar - só aparece para e-mails consolidados */}
                      {itemSelecionado.erro_detalhes.includes('E-mail consolidado enviado para') && (() => {
                        const emailsText = itemSelecionado.erro_detalhes.split(':')[1]?.trim() || '';
                        const emails = emailsText.split(',').map(e => e.trim()).filter(e => e);
                        
                        return (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const emailsFormatted = emails.join('; ');
                              navigator.clipboard.writeText(emailsFormatted);
                              toast({
                                title: "E-mails copiados!",
                                description: `${emails.length} e-mails copiados para a área de transferência`,
                              });
                            }}
                            className="flex items-center gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar E-mails
                          </Button>
                        );
                      })()}
                    </div>
                    <div className={`p-4 rounded-lg border ${
                      itemSelecionado.erro_detalhes.includes('E-mail consolidado enviado para')
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}>
                      {/* Extrair e-mails do texto de detalhes */}
                      {(() => {
                        const detalhes = itemSelecionado.erro_detalhes;
                        const isConsolidado = detalhes.includes('E-mail consolidado enviado para');
                        
                        if (isConsolidado) {
                          // Extrair número de clientes e lista de e-mails
                          const numClientesMatch = detalhes.match(/enviado para (\d+) clientes?:/);
                          const numClientes = numClientesMatch ? numClientesMatch[1] : 'Múltiplos';
                          
                          // Extrair e-mails (tudo após os dois pontos)
                          const emailsText = detalhes.split(':')[1]?.trim() || '';
                          const emails = emailsText.split(',').map(e => e.trim()).filter(e => e);
                          
                          return (
                            <div className="space-y-3">
                              <p className="font-semibold text-blue-800 dark:text-blue-200">
                                E-mail consolidado enviado para {numClientes} cliente(s):
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {emails.map((email, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                                  >
                                    {email}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <p className="text-sm text-red-800 dark:text-red-200">
                              {detalhes}
                            </p>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}

                {/* E-mails em Cópia - MOVIDO PARA BAIXO */}
                {itemSelecionado.emails_cc && itemSelecionado.emails_cc.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        E-mails em Cópia
                      </label>
                      {/* Botão Copiar */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const emailsFormatted = itemSelecionado.emails_cc.join('; ');
                          navigator.clipboard.writeText(emailsFormatted);
                          toast({
                            title: "E-mails copiados!",
                            description: `${itemSelecionado.emails_cc.length} e-mails copiados para a área de transferência`,
                          });
                        }}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar E-mails
                      </Button>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {itemSelecionado.emails_cc.map((email, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {email}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão Fechar */}
                <div className="flex justify-end pt-4 border-t">
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