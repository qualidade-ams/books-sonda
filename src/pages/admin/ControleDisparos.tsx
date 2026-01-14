import { useState, useMemo } from 'react';
import {
  Calendar,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Search,
  X,
  FileText
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useToast } from '@/hooks/use-toast';
import { useControleDisparos } from '@/hooks/useControleDisparos';
import { useEmpresas } from '@/hooks/useEmpresas';
import ProtectedAction from '@/components/auth/ProtectedAction';
import DisparosLoadingSkeleton from '@/components/admin/DisparosLoadingSkeleton';
import FiltrosStatusDisparos from '@/components/admin/FiltrosStatusDisparos';
import type {
  AgendamentoDisparo,
  StatusControleMensal,
  StatusMensal
} from '@/types/clientBooks';
import {
  STATUS_CONTROLE_MENSAL_OPTIONS
} from '@/types/clientBooks';

const ControleDisparos = () => {
  const { toast } = useToast();

  // Estados para controle de mês/ano
  const currentDate = new Date();
  const [mesAtual, setMesAtual] = useState(currentDate.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(currentDate.getFullYear());

  // Estados para modais
  const [showAgendamentoModal, setShowAgendamentoModal] = useState(false);
  const [showReenvioModal, setShowReenvioModal] = useState(false);

  // Estados para agendamento
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [observacoesAgendamento, setObservacoesAgendamento] = useState('');

  // Estados para filtros
  const [statusFiltro, setStatusFiltro] = useState<StatusControleMensal | 'todos'>('todos');
  const [buscaEmpresa, setBuscaEmpresa] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);



  // Hooks
  const {
    statusMensal = [] as StatusMensal[],
    isLoading,
    isDisparandoSelecionados,
    isReenviando,
    isAgendando,
    dispararSelecionados,
    reenviarSelecionados,
    reenviarFalhas,
    agendarDisparo,
    refetch
  } = useControleDisparos(mesAtual, anoAtual);

  const { empresas } = useEmpresas({ status: ['ativo'] }) as any;

  // Filtrar dados baseado no status e busca por nome de empresa
  const statusMensalFiltrado = useMemo<StatusMensal[]>(() => {
    if (!Array.isArray(statusMensal)) return [];
    
    let filtrados: StatusMensal[] = statusMensal;
    
    // Filtrar por status
    if (statusFiltro !== 'todos') {
      filtrados = filtrados.filter(status => status.status === statusFiltro);
    }
    
    // Filtrar por nome de empresa (busca em nome completo e abreviado)
    if (buscaEmpresa.trim()) {
      const termoBusca = buscaEmpresa.toLowerCase().trim();
      filtrados = filtrados.filter(status => {
        const nomeCompleto = status.empresa?.nome_completo?.toLowerCase() || '';
        const nomeAbreviado = status.empresa?.nome_abreviado?.toLowerCase() || '';
        return nomeCompleto.includes(termoBusca) || nomeAbreviado.includes(termoBusca);
      });
    }
    
    // Ordenar alfabeticamente por nome abreviado da empresa
    filtrados = filtrados.sort((a, b) => {
      const nomeA = a.empresa?.nome_abreviado || a.empresa?.nome_completo || '';
      const nomeB = b.empresa?.nome_abreviado || b.empresa?.nome_completo || '';
      return nomeA.localeCompare(nomeB, 'pt-BR');
    });
    
    return filtrados;
  }, [statusMensal, statusFiltro, buscaEmpresa]);

  // Seleção de empresas
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const allIds = useMemo(() => statusMensalFiltrado.map(s => s.empresaId), [statusMensalFiltrado]);
  const allSelected = selecionadas.length > 0 && selecionadas.length === allIds.length;
  const toggleSelectAll = () => {
    setSelecionadas(prev => (prev.length === allIds.length ? [] : allIds));
  };
  const toggleSelectOne = (id: string) => {
    setSelecionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Limpar seleção quando filtro muda
  useMemo(() => {
    setSelecionadas([]);
  }, [statusFiltro, buscaEmpresa]);

  // Verificar se todas as empresas selecionadas já foram enviadas
  const empresasSelecionadasStatus = useMemo(() => {
    if (!Array.isArray(statusMensal)) return [];
    
    return selecionadas.map(id => {
      const status = statusMensal.find(s => s.empresaId === id);
      return {
        empresaId: id,
        status: status?.status || 'pendente'
      };
    });
  }, [selecionadas, statusMensal]);

  const todasSelecionadasJaEnviadas = useMemo(() => {
    if (selecionadas.length === 0) return false;
    return empresasSelecionadasStatus.every(empresa => empresa.status === 'enviado');
  }, [empresasSelecionadasStatus]);

  // Contadores inteligentes baseados no status
  const contadoresInteligentes = useMemo(() => {
    const paraDisparar = empresasSelecionadasStatus.filter(empresa => 
      empresa.status === 'pendente' || empresa.status === 'agendado' || empresa.status === 'falhou'
    ).length;
    
    const paraReenviar = empresasSelecionadasStatus.filter(empresa => 
      empresa.status === 'enviado'
    ).length;

    return { paraDisparar, paraReenviar };
  }, [empresasSelecionadasStatus]);



  // Estatísticas do mês
  const stats = useMemo(() => {
    if (!Array.isArray(statusMensal)) {
      return {
        total: 0,
        enviados: 0,
        pendentes: 0,
        falhas: 0,
        agendados: 0,
        totalEmails: 0,
        totalClientes: 0,
        percentualConcluido: 0
      };
    }
    
    const total = statusMensal.length;
    const enviados = statusMensal.filter(s => s.status === 'enviado').length;
    const pendentes = statusMensal.filter(s => s.status === 'pendente').length;
    const falhas = statusMensal.filter(s => s.status === 'falhou').length;
    const agendados = statusMensal.filter(s => s.status === 'agendado').length;

    const totalEmails = statusMensal.reduce((acc, s) => acc + s.emailsEnviados, 0);
    const totalClientes = statusMensal.reduce((acc, s) => acc + s.clientesAtivos, 0);

    return {
      total,
      enviados,
      pendentes,
      falhas,
      agendados,
      totalEmails,
      totalClientes,
      percentualConcluido: total > 0 ? Math.round((enviados / total) * 100) : 0
    };
  }, [statusMensal]);

  // Handlers para navegação de mês/ano
  const handleMesAnterior = () => {
    if (mesAtual === 1) {
      setMesAtual(12);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  };

  const handleProximoMes = () => {
    if (mesAtual === 12) {
      setMesAtual(1);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  };

  // Handlers para ações

  const handleDispararSelecionados = async () => {
    if (selecionadas.length === 0) return;
    try {
      const resultado = await dispararSelecionados(mesAtual, anoAtual, selecionadas);
      toast({
        title: 'Disparo concluído',
        description: `${resultado.sucesso} empresas processadas com sucesso, ${resultado.falhas} falhas`,
      });
      setSelecionadas([]);
    } catch (error) {
      toast({
        title: 'Erro no disparo selecionado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const handleReenviarSelecionados = async () => {
    if (selecionadas.length === 0) return;
    try {
      const resultado = await reenviarSelecionados(mesAtual, anoAtual, selecionadas);
      toast({
        title: 'Reenvio concluído',
        description: `${resultado.sucesso} empresas reprocessadas com sucesso`,
      });
      setSelecionadas([]);
    } catch (error) {
      toast({
        title: 'Erro no reenvio selecionado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };



  const handleReenvioFalhas = async () => {
    setShowReenvioModal(true);
  };

  const confirmarReenvioFalhas = async () => {
    try {
      setShowReenvioModal(false);
      const resultado = await reenviarFalhas(mesAtual, anoAtual);

      toast({
        title: "Reenvio concluído",
        description: `${resultado.sucesso} empresas processadas com sucesso`,
      });

    } catch (error) {
      toast({
        title: "Erro no reenvio",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleAgendamento = (empresaId: string) => {
    setEmpresaSelecionada(empresaId);
    setShowAgendamentoModal(true);
  };

  const confirmarAgendamento = async () => {
    if (!empresaSelecionada || !dataAgendamento) return;

    try {
      // Buscar clientes da empresa
      const empresa = (empresas as any)?.find((e: any) => e.id === empresaSelecionada);
      if (!empresa?.clientes) return;

      const agendamento: AgendamentoDisparo = {
        empresaId: empresaSelecionada,
        clienteIds: empresa.clientes.map((c: any) => c.id),
        dataAgendamento: new Date(dataAgendamento),
        observacoes: observacoesAgendamento
      };

      await agendarDisparo(agendamento);

      setShowAgendamentoModal(false);
      setEmpresaSelecionada('');
      setDataAgendamento('');
      setObservacoesAgendamento('');

      toast({
        title: "Agendamento realizado",
        description: "Disparo agendado com sucesso",
      });

    } catch (error) {
      toast({
        title: "Erro no agendamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Função para obter ícone do status
  const getStatusIcon = (status: StatusControleMensal) => {
    switch (status) {
      case 'enviado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'falhou':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'agendado':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Função para obter cor do status
  const getStatusColor = (status: StatusControleMensal) => {
    switch (status) {
      case 'enviado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'falhou':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'agendado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Calcular mês de referência (mês anterior)
  const mesReferencia = mesAtual === 1 ? 12 : mesAtual - 1;
  const anoReferencia = mesAtual === 1 ? anoAtual - 1 : anoAtual;

  // Loading skeleton durante carregamento inicial
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Disparos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Acompanhe e gerencie o envio mensal de books
              </p>
            </div>
          </div>

          {/* Cards de Estatísticas - Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Seletor de Mês/Ano */}
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={handleMesAnterior}
                  disabled={isLoading}
                >
                  ← Anterior
                </Button>

                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {nomesMeses[mesAtual - 1]} {anoAtual}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    (Referência {nomesMeses[mesReferencia - 1]} {anoReferencia})
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Carregando...
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={handleProximoMes}
                  disabled={isLoading}
                >
                  Próximo →
                </Button>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse w-1/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DisparosLoadingSkeleton />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Disparos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Acompanhe e gerencie o envio mensal de books
            </p>
          </div>
        </div>

        {/* Estatísticas - Cards no padrão do Design System */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Total de Empresas</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalClientes} clientes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-green-500">Enviados</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalEmails} e-mails</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-red-500">Falhas</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.falhas}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <p className="text-xs font-medium text-yellow-500">Pendentes</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendentes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Seletor de Mês/Ano - Movido para baixo dos cards */}
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleMesAnterior}
                disabled={isLoading}
              >
                ← Anterior
              </Button>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {nomesMeses[mesAtual - 1]} {anoAtual}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  (Referência {nomesMeses[mesReferencia - 1]} {anoReferencia})
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.percentualConcluido}% concluído
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleProximoMes}
                disabled={isLoading}
              >
                Próximo →
              </Button>
            </div>

            {/* Barra de Progresso */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.percentualConcluido}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Ações de Disparo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 items-center">
                <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                  <Button
                    onClick={handleDispararSelecionados}
                    disabled={isDisparandoSelecionados || contadoresInteligentes.paraDisparar === 0}
                    className="flex items-center gap-2"
                    title={contadoresInteligentes.paraDisparar === 0 ? 'Nenhuma empresa selecionada precisa ser disparada' : undefined}
                  >
                    <Send className="h-4 w-4" />
                    {isDisparandoSelecionados ? 'Disparando...' : `Disparar Selecionados (${contadoresInteligentes.paraDisparar})`}
                  </Button>
                </ProtectedAction>
                <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                  <Button
                    variant="outline"
                    onClick={handleReenviarSelecionados}
                    disabled={contadoresInteligentes.paraReenviar === 0}
                    className="flex items-center gap-2"
                    title={contadoresInteligentes.paraReenviar === 0 ? 'Nenhuma empresa selecionada precisa ser reenviada' : 'Reenviar empresas já processadas (força novo processamento)'}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {`Reenviar Selecionados (${contadoresInteligentes.paraReenviar})`}
                  </Button>
                </ProtectedAction>

                <div className="ml-auto flex gap-2 items-center">
                  <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                    <Button
                      variant="outline"
                      onClick={handleReenvioFalhas}
                      disabled={isReenviando || stats.falhas === 0}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {isReenviando ? 'Reenviando...' : `Reenviar Falhas (${stats.falhas})`}
                    </Button>
                  </ProtectedAction>
                </div>
              </div>
            </div>


          </CardContent>
        </Card>

        {/* Lista de Status por Empresa */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="flex items-center gap-3">
                Status por Empresa ({statusMensalFiltrado.length})
                {statusMensalFiltrado.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox id="select-all" checked={allSelected} onCheckedChange={toggleSelectAll} />
                    <Label htmlFor="select-all">Selecionar todas</Label>
                  </div>
                )}
              </CardTitle>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
                
                {(statusFiltro !== 'todos' || buscaEmpresa) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusFiltro('todos');
                      setBuscaEmpresa('');
                    }}
                    className="whitespace-nowrap hover:border-red-300"
                  >
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Limpar Filtro
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filtros */}
            {mostrarFiltros && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Busca por Nome de Empresa */}
                  <div>
                    <div className="text-sm font-medium mb-2">Buscar Empresa</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nome da empresa..."
                        value={buscaEmpresa}
                        onChange={(e) => setBuscaEmpresa(e.target.value)}
                        className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>

                  {/* Status do Disparo */}
                  <div>
                    <div className="text-sm font-medium mb-2">Status do Disparo</div>
                    <Select
                      value={statusFiltro}
                      onValueChange={(value) => setStatusFiltro(value as StatusControleMensal | 'todos')}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os Status ({stats.total})</SelectItem>
                        <SelectItem value="enviado">Enviados ({stats.enviados})</SelectItem>
                        <SelectItem value="pendente">Pendentes ({stats.pendentes})</SelectItem>
                        <SelectItem value="falhou">Falhas ({stats.falhas})</SelectItem>
                        <SelectItem value="agendado">Agendados ({stats.agendados})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {statusMensalFiltrado.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {statusFiltro === 'todos' 
                    ? 'Nenhuma empresa encontrada para este período'
                    : `Nenhuma empresa com status "${statusFiltro}" encontrada`
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {statusMensalFiltrado.map((status) => (
                  <div
                    key={status.empresaId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={selecionadas.includes(status.empresaId)}
                        onCheckedChange={() => toggleSelectOne(status.empresaId)}
                        aria-label={`Selecionar ${status.empresa.nome_abreviado}`}
                      />
                      {getStatusIcon(status.status)}
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {status.empresa.nome_abreviado}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {status.clientesAtivos} clientes ativos
                          {status.emailsEnviados > 0 && ` • ${status.emailsEnviados} e-mails enviados`}
                        </p>
                        {status.observacoes && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {status.observacoes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(status.status)}>
                        {STATUS_CONTROLE_MENSAL_OPTIONS.find(opt => opt.value === status.status)?.label}
                      </Badge>

                      {false && status.status === 'pendente' && (
                        <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAgendamento(status.empresaId)}
                            disabled={isAgendando}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Agendar
                          </Button>
                        </ProtectedAction>
                      )}

                      {status.dataProcessamento && (
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {status.dataProcessamento.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>



        {/* Modal de Confirmação de Reenvio */}
        <AlertDialog open={showReenvioModal} onOpenChange={setShowReenvioModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Reenvio de Falhas</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja reenviar os books para as {stats.falhas} empresas que falharam em {nomesMeses[mesAtual - 1]} de {anoAtual}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmarReenvioFalhas}
                disabled={isReenviando}
              >
                {isReenviando ? 'Reenviando...' : 'Confirmar Reenvio'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Agendamento */}
        <Dialog open={showAgendamentoModal} onOpenChange={setShowAgendamentoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Disparo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="data-agendamento">Data e Hora do Agendamento</Label>
                <Input
                  id="data-agendamento"
                  type="datetime-local"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <Label htmlFor="observacoes-agendamento">Observações (opcional)</Label>
                <Textarea
                  id="observacoes-agendamento"
                  value={observacoesAgendamento}
                  onChange={(e) => setObservacoesAgendamento(e.target.value)}
                  placeholder="Observações sobre o agendamento..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAgendamentoModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmarAgendamento}
                  disabled={isAgendando || !dataAgendamento}
                >
                  {isAgendando ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ControleDisparos;