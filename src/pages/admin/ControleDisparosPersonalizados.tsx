import { useState, useMemo } from 'react';
import {
  Calendar,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Sparkles,
  Paperclip,
  FileText,
  Filter,
  Search
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
import { useControleDisparosPersonalizados } from '@/hooks/useControleDisparosPersonalizados';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useAnexos } from '@/hooks/useAnexos';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { AnexoUpload } from '@/components/admin/anexos/AnexoUpload';
import DisparosLoadingSkeleton from '@/components/admin/DisparosLoadingSkeleton';
import FiltrosStatusDisparos from '@/components/admin/FiltrosStatusDisparos';
import type {
  AgendamentoDisparo,
  StatusControleMensal
} from '@/types/clientBooks';
import {
  STATUS_CONTROLE_MENSAL_OPTIONS
} from '@/types/clientBooks';

const ControleDisparosPersonalizados = () => {
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

  // Estados para anexos
  const [showAnexoModal, setShowAnexoModal] = useState(false);
  const [empresaAnexoSelecionada, setEmpresaAnexoSelecionada] = useState<string>('');

  // Estados para filtros
  const [statusFiltro, setStatusFiltro] = useState<StatusControleMensal | 'todos'>('todos');
  const [buscaEmpresa, setBuscaEmpresa] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);



  // Hooks
  const {
    statusMensal,
    isLoading,
    isDisparandoSelecionados,
    isReenviando,
    isAgendando,
    dispararSelecionados,
    reenviarSelecionados,
    reenviarFalhas,
    agendarDisparo
  } = useControleDisparosPersonalizados(mesAtual, anoAtual);

  const { empresas } = useEmpresas({ status: ['ativo'] }) as any;

  // Hook para gerenciamento de anexos
  const {
    obterAnexosPorEmpresa,
    obterSummary,
    isUploading: isUploadingAnexos
  } = useAnexos();

  // Filtrar dados baseado no status e busca por nome de empresa
  const statusMensalFiltrado = useMemo(() => {
    let filtrados = statusMensal;
    
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

  // Status das empresas selecionadas
  const empresasSelecionadasStatus = useMemo(() => {
    return selecionadas.map(id => {
      const status = statusMensal.find(s => s.empresaId === id);
      return {
        empresaId: id,
        status: status?.status || 'pendente'
      };
    });
  }, [selecionadas, statusMensal]);

  // Contadores inteligentes baseados no status e anexos
  const contadoresInteligentes = useMemo(() => {
    const paraDisparar = empresasSelecionadasStatus.filter(empresa => {
      const status = empresa.status === 'pendente' || empresa.status === 'agendado' || empresa.status === 'falhou';

      // Verificar se empresa tem anexo obrigatório
      const empresaData = statusMensal.find(s => s.empresaId === empresa.empresaId)?.empresa;
      if (empresaData?.anexo) {
        const anexos = obterAnexosPorEmpresa(empresa.empresaId);
        const temAnexosValidos = anexos.length > 0 && anexos.every(a => a.status !== 'erro');
        return status && temAnexosValidos;
      }

      return status;
    }).length;

    const paraReenviar = empresasSelecionadasStatus.filter(empresa =>
      empresa.status === 'enviado'
    ).length;

    return { paraDisparar, paraReenviar };
  }, [empresasSelecionadasStatus, statusMensal, obterAnexosPorEmpresa]);

  // Estatísticas do mês
  const stats = useMemo(() => {
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

    // Validar anexos obrigatórios antes do disparo
    const empresasComAnexoObrigatorio = selecionadas.filter(empresaId => {
      const empresaData = statusMensal.find(s => s.empresaId === empresaId)?.empresa;
      return empresaData?.anexo === true;
    });

    for (const empresaId of empresasComAnexoObrigatorio) {
      const anexos = obterAnexosPorEmpresa(empresaId);
      const empresaData = statusMensal.find(s => s.empresaId === empresaId)?.empresa;

      if (anexos.length === 0) {
        toast({
          title: 'Anexos obrigatórios',
          description: `A empresa "${empresaData?.nome_abreviado}" requer anexos para o disparo`,
          variant: 'destructive',
        });
        return;
      }

      const anexosComErro = anexos.filter(a => a.status === 'erro');
      if (anexosComErro.length > 0) {
        toast({
          title: 'Anexos com erro',
          description: `A empresa "${empresaData?.nome_abreviado}" possui anexos com erro`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const resultado = await dispararSelecionados(mesAtual, anoAtual, selecionadas);
      toast({
        title: 'Disparo personalizado concluído',
        description: `${resultado.sucesso} empresas processadas com sucesso, ${resultado.falhas} falhas`,
      });
      setSelecionadas([]);
    } catch (error) {
      toast({
        title: 'Erro no disparo personalizado selecionado',
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
        title: 'Reenvio personalizado concluído',
        description: `${resultado.sucesso} empresas reprocessadas com sucesso`,
      });
      setSelecionadas([]);
    } catch (error) {
      toast({
        title: 'Erro no reenvio personalizado selecionado',
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
        title: "Reenvio personalizado concluído",
        description: `${resultado.sucesso} empresas processadas com sucesso`,
      });

    } catch (error) {
      toast({
        title: "Erro no reenvio personalizado",
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
        title: "Agendamento personalizado realizado",
        description: "Disparo agendado com sucesso",
      });

    } catch (error) {
      toast({
        title: "Erro no agendamento personalizado",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Handler para abrir modal de anexos
  const handleAbrirAnexos = (empresaId: string) => {
    setEmpresaAnexoSelecionada(empresaId);
    setShowAnexoModal(true);
  };

  // Handler para mudança de anexos
  const handleAnexosChange = (anexos: any[]) => {
    // Os anexos são gerenciados pelo hook useAnexos
    // Este callback é chamado quando há mudanças na lista de anexos
  };

  // Função para obter indicador de anexos
  const obterIndicadorAnexos = (empresaId: string, temAnexo: boolean) => {
    if (!temAnexo) return null;

    const anexos = obterAnexosPorEmpresa(empresaId);
    const summary = obterSummary(empresaId);

    if (anexos.length === 0) {
      return (
        <div className="flex items-center gap-1 text-yellow-600">
          <Paperclip className="h-3 w-3" />
          <span className="text-xs">Sem anexos</span>
        </div>
      );
    }

    const anexosComErro = anexos.filter(a => a.status === 'erro').length;
    const anexosPendentes = anexos.filter(a => a.status === 'pendente').length;
    const anexosProcessados = anexos.filter(a => a.status === 'processado').length;

    if (anexosComErro > 0) {
      return (
        <div className="flex items-center gap-1 text-red-600">
          <Paperclip className="h-3 w-3" />
          <span className="text-xs">{anexosComErro} erro(s)</span>
        </div>
      );
    }

    if (anexosPendentes > 0) {
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <Paperclip className="h-3 w-3" />
          <span className="text-xs">{anexos.length} arquivo(s)</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-green-600">
        <Paperclip className="h-3 w-3" />
        <span className="text-xs">{anexos.length} arquivo(s)</span>
      </div>
    );
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Disparos Personalizados
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Acompanhe e gerencie o envio de books mensais personalizados
            </p>
          </div>
        </div>



        {/* Seletor de Mês/Ano */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período de Controle
            </CardTitle>
          </CardHeader>
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
                  (Mês de envio)
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
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.percentualConcluido}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stats.totalClientes} clientes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Enviados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.enviados}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {stats.totalEmails} e-mails
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                Falhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.falhas}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendentes}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações Principais */}
        <Card>
          <CardHeader>
            <CardTitle>Ações de Disparo Personalizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-4 items-center">
                <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                  <Button
                    onClick={handleDispararSelecionados}
                    disabled={isDisparandoSelecionados || isUploadingAnexos || contadoresInteligentes.paraDisparar === 0}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700"
                    title={
                      isUploadingAnexos
                        ? 'Aguarde o upload dos anexos'
                        : contadoresInteligentes.paraDisparar === 0
                          ? 'Nenhuma empresa selecionada precisa ser disparada ou faltam anexos obrigatórios'
                          : undefined
                    }
                  >
                    <Send className="h-4 w-4" />
                    {isDisparandoSelecionados ? 'Disparando...' : `Disparar Selecionados (${contadoresInteligentes.paraDisparar})`}
                  </Button>
                </ProtectedAction>
                <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                  <Button
                    variant="outline"
                    onClick={handleReenviarSelecionados}
                    disabled={isUploadingAnexos || contadoresInteligentes.paraReenviar === 0}
                    className="flex items-center gap-2"
                    title={
                      isUploadingAnexos
                        ? 'Aguarde o upload dos anexos'
                        : contadoresInteligentes.paraReenviar === 0
                          ? 'Nenhuma empresa selecionada precisa ser reenviada'
                          : 'Reenviar empresas já processadas (força novo processamento)'
                    }
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
                      disabled={isReenviando || isUploadingAnexos || stats.falhas === 0}
                      className="flex items-center gap-2"
                      title={isUploadingAnexos ? 'Aguarde o upload dos anexos' : undefined}
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
                Status por Empresa Personalizada ({statusMensalFiltrado.length})
                {statusMensalFiltrado.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox id="select-all" checked={allSelected} onCheckedChange={toggleSelectAll} />
                    <Label htmlFor="select-all">Selecionar todas</Label>
                  </div>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {statusFiltro !== 'todos' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Filtrado: {statusMensalFiltrado.length} de {statusMensal.length} empresas
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
              </div>
            </div>
            
            {/* Filtros */}
            {mostrarFiltros && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Busca por Nome de Empresa */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Buscar Empresa</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Nome da empresa..."
                        value={buscaEmpresa}
                        onChange={(e) => setBuscaEmpresa(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Status do Disparo */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status do Disparo</label>
                    <Select
                      value={statusFiltro}
                      onValueChange={(value) => setStatusFiltro(value as StatusControleMensal | 'todos')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">
                          <div className="flex items-center justify-between w-full">
                            <span>Todos os Status</span>
                            <Badge variant="secondary" className="ml-2">
                              {stats.total}
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="enviado">
                          <div className="flex items-center justify-between w-full">
                            <span>Enviados</span>
                            <Badge variant="secondary" className="ml-2">
                              {stats.enviados}
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="pendente">
                          <div className="flex items-center justify-between w-full">
                            <span>Pendentes</span>
                            <Badge variant="secondary" className="ml-2">
                              {stats.pendentes}
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="falhou">
                          <div className="flex items-center justify-between w-full">
                            <span>Falhas</span>
                            <Badge variant="secondary" className="ml-2">
                              {stats.falhas}
                            </Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="agendado">
                          <div className="flex items-center justify-between w-full">
                            <span>Agendados</span>
                            <Badge variant="secondary" className="ml-2">
                              {stats.agendados}
                            </Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Atual */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status Atual</label>
                    <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {statusFiltro === 'todos' ? 'Todos os Status' : 
                         statusFiltro === 'enviado' ? 'Enviados' :
                         statusFiltro === 'pendente' ? 'Pendentes' :
                         statusFiltro === 'falhou' ? 'Falhas' :
                         statusFiltro === 'agendado' ? 'Agendados' : 'Nenhum filtro'}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {statusFiltro === 'todos' ? stats.total :
                         statusFiltro === 'enviado' ? stats.enviados :
                         statusFiltro === 'pendente' ? stats.pendentes :
                         statusFiltro === 'falhou' ? stats.falhas :
                         statusFiltro === 'agendado' ? stats.agendados : 0}
                      </Badge>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ações</label>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStatusFiltro('todos');
                        setBuscaEmpresa('');
                      }}
                      disabled={statusFiltro === 'todos' && !buscaEmpresa}
                      className="w-full h-10"
                    >
                      Limpar Filtros
                    </Button>
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
            ) : statusMensalFiltrado.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {statusFiltro === 'todos' 
                    ? 'Nenhuma empresa com book personalizado encontrada para este período'
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
                        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {status.empresa.nome_abreviado}
                          {status.empresa.anexo && (
                            <span title="Empresa com anexos">
                              <Paperclip className="h-4 w-4 text-purple-600" />
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {status.clientesAtivos} clientes ativos
                          {status.emailsEnviados > 0 && ` • ${status.emailsEnviados} e-mails enviados`}
                        </p>
                        {status.empresa.anexo && obterIndicadorAnexos(status.empresaId, status.empresa.anexo)}
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

                      {status.empresa.anexo && (
                        <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAbrirAnexos(status.empresaId)}
                            disabled={isUploadingAnexos}
                            className="flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Anexos
                          </Button>
                        </ProtectedAction>
                      )}

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
              <AlertDialogTitle>Confirmar Reenvio de Falhas Personalizadas</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja reenviar os books personalizados para as {stats.falhas} empresas que falharam em {nomesMeses[mesAtual - 1]} de {anoAtual}?
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
              <DialogTitle>Agendar Disparo Personalizado</DialogTitle>
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
                  placeholder="Observações sobre o agendamento personalizado..."
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
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isAgendando ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Anexos */}
        <Dialog open={showAnexoModal} onOpenChange={setShowAnexoModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Gerenciar Anexos
                {empresaAnexoSelecionada && (
                  <span className="text-sm font-normal text-muted-foreground">
                    - {statusMensal.find(s => s.empresaId === empresaAnexoSelecionada)?.empresa.nome_abreviado}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {empresaAnexoSelecionada && (
              <div className="mt-4 space-y-4">
                <AnexoUpload
                  empresaId={empresaAnexoSelecionada}
                  onAnexosChange={handleAnexosChange}
                  disabled={isUploadingAnexos}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAnexoModal(false);
                  setEmpresaAnexoSelecionada('');
                }}
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ControleDisparosPersonalizados;