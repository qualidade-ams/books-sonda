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
  Search,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  StatusControleMensal,
  StatusMensal
} from '@/types/clientBooks';

const ControleDisparosPersonalizados = () => {
  const { toast } = useToast();
  const { t } = useTranslation();

  // Nomes dos meses via i18n
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const getMonthName = (monthIndex: number) => t(`monthPicker.months.${monthKeys[monthIndex]}`);

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
    statusMensal = [] as StatusMensal[],
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

  // Status das empresas selecionadas
  const empresasSelecionadasStatus = useMemo(() => {
    if (!Array.isArray(statusMensal)) return [];
    
    return selecionadas.map(id => {
      const status = (statusMensal as StatusMensal[]).find(s => s.empresaId === id);
      return {
        empresaId: id,
        status: status?.status || 'pendente'
      };
    });
  }, [selecionadas, statusMensal]);

  // Contadores inteligentes baseados no status e anexos
  const contadoresInteligentes = useMemo(() => {
    if (!Array.isArray(statusMensal)) {
      return { paraDisparar: 0, paraReenviar: 0 };
    }
    
    const paraDisparar = empresasSelecionadasStatus.filter(empresa => {
      const status = empresa.status === 'pendente' || empresa.status === 'agendado' || empresa.status === 'falhou';

      // Verificar se empresa tem anexo obrigatório
      const empresaData = (statusMensal as StatusMensal[]).find(s => s.empresaId === empresa.empresaId)?.empresa;
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
    
    if (!Array.isArray(statusMensal)) {
      toast({
        title: t('common.error'),
        description: t('disparosPersonalizados.statusDataUnavailable'),
        variant: 'destructive',
      });
      return;
    }

    // Validar anexos obrigatórios antes do disparo
    const empresasComAnexoObrigatorio = selecionadas.filter(empresaId => {
      const empresaData = (statusMensal as StatusMensal[]).find(s => s.empresaId === empresaId)?.empresa;
      return empresaData?.anexo === true;
    });

    for (const empresaId of empresasComAnexoObrigatorio) {
      const anexos = obterAnexosPorEmpresa(empresaId);
      const empresaData = (statusMensal as StatusMensal[]).find(s => s.empresaId === empresaId)?.empresa;

      if (anexos.length === 0) {
        toast({
          title: t('disparosPersonalizados.attachmentsRequired'),
          description: t('disparosPersonalizados.attachmentsRequiredDesc', { company: empresaData?.nome_abreviado }),
          variant: 'destructive',
        });
        return;
      }

      const anexosComErro = anexos.filter(a => a.status === 'erro');
      if (anexosComErro.length > 0) {
        toast({
          title: t('disparosPersonalizados.attachmentsWithError'),
          description: t('disparosPersonalizados.attachmentsWithErrorDesc', { company: empresaData?.nome_abreviado }),
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const resultado = await dispararSelecionados(mesAtual, anoAtual, selecionadas);
      toast({
        title: t('disparosPersonalizados.customDispatchCompleted'),
        description: t('disparosPersonalizados.customDispatchCompletedDesc', { success: resultado.sucesso, failures: resultado.falhas }),
      });
      setSelecionadas([]);
    } catch (error) {
      toast({
        title: t('disparosPersonalizados.customDispatchError'),
        description: error instanceof Error ? error.message : t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleReenviarSelecionados = async () => {
    if (selecionadas.length === 0) return;
    try {
      const resultado = await reenviarSelecionados(mesAtual, anoAtual, selecionadas);
      toast({
        title: t('disparosPersonalizados.customResendCompleted'),
        description: t('disparosPersonalizados.customResendCompletedDesc', { success: resultado.sucesso }),
      });
      setSelecionadas([]);
    } catch (error) {
      toast({
        title: t('disparosPersonalizados.customResendError'),
        description: error instanceof Error ? error.message : t('common.error'),
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
        title: t('disparosPersonalizados.customResendFailedCompleted'),
        description: t('disparosPersonalizados.customResendFailedCompletedDesc', { success: resultado.sucesso }),
      });

    } catch (error) {
      toast({
        title: t('disparosPersonalizados.customResendFailedError'),
        description: error instanceof Error ? error.message : t('common.error'),
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
        title: t('disparosPersonalizados.customScheduleCompleted'),
        description: t('disparosPersonalizados.customScheduleCompletedDesc'),
      });

    } catch (error) {
      toast({
        title: t('disparosPersonalizados.customScheduleError'),
        description: error instanceof Error ? error.message : t('common.error'),
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
          <span className="text-xs">{t('disparosPersonalizados.noAttachments')}</span>
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
          <span className="text-xs">{t('disparosPersonalizados.errorsCount', { count: anexosComErro })}</span>
        </div>
      );
    }

    if (anexosPendentes > 0) {
      return (
        <div className="flex items-center gap-1 text-blue-600">
          <Paperclip className="h-3 w-3" />
          <span className="text-xs">{t('disparosPersonalizados.filesCount', { count: anexos.length })}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-green-600">
        <Paperclip className="h-3 w-3" />
        <span className="text-xs">{t('disparosPersonalizados.filesCount', { count: anexos.length })}</span>
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header com botões de ação */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('disparosPersonalizados.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('disparosPersonalizados.subtitle')}
            </p>
          </div>

          <div className="flex gap-2">
            <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
              <Button
                onClick={handleDispararSelecionados}
                disabled={isDisparandoSelecionados || isUploadingAnexos || contadoresInteligentes.paraDisparar === 0}
                size="sm"
                title={
                  isUploadingAnexos
                    ? t('disparosPersonalizados.waitingUpload')
                    : contadoresInteligentes.paraDisparar === 0
                      ? t('disparosPersonalizados.noCompanyNeedsDispatchOrMissingAttachments')
                      : t('disparosPersonalizados.dispatchCustomBooksFor', { count: contadoresInteligentes.paraDisparar })
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {isDisparandoSelecionados ? t('disparos.sending') : `${t('disparos.sendSelected')} (${contadoresInteligentes.paraDisparar})`}
              </Button>
            </ProtectedAction>

            <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
              <Button
                variant="outline"
                onClick={handleReenviarSelecionados}
                disabled={isUploadingAnexos || contadoresInteligentes.paraReenviar === 0}
                size="sm"
                title={
                  isUploadingAnexos
                    ? t('disparosPersonalizados.waitingUpload')
                    : contadoresInteligentes.paraReenviar === 0
                      ? t('disparos.noCompanyNeedsResend')
                      : t('disparos.resendAlreadyProcessed')
                }
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('disparos.resendSelected')} ({contadoresInteligentes.paraReenviar})
              </Button>
            </ProtectedAction>

            {stats.falhas > 0 && (
              <ProtectedAction screenKey="controle_disparos" requiredLevel="edit">
                <Button
                  variant="outline"
                  onClick={handleReenvioFalhas}
                  disabled={isReenviando || isUploadingAnexos}
                  size="sm"
                  title={isUploadingAnexos ? t('disparosPersonalizados.waitingUpload') : t('disparos.resendCompaniesWithFailure', { count: stats.falhas })}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isReenviando ? t('disparos.resending') : `${t('disparos.resendFailed')} (${stats.falhas})`}
                </Button>
              </ProtectedAction>
            )}
          </div>
        </div>

        {/* Estatísticas - Cards no padrão do Design System */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">{t('disparos.totalCompanies')}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalClientes} {t('disparos.clients')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-green-500">{t('disparos.sent')}</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalEmails} {t('disparos.emails')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-red-500">{t('disparos.failures')}</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.falhas}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <p className="text-xs font-medium text-yellow-500">{t('disparos.pending')}</p>
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
                ← {t('common.previous')}
              </Button>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getMonthName(mesAtual - 1)} {anoAtual}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  ({t('disparosPersonalizados.sendMonth')})
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {stats.percentualConcluido}% {t('disparos.completed')}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={handleProximoMes}
                disabled={isLoading}
              >
                {t('common.next')} →
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

        {/* Lista de Status por Empresa */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="flex items-center gap-3">
                {t('disparosPersonalizados.statusByCustomCompany')} ({statusMensalFiltrado.length})
                {statusMensalFiltrado.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox id="select-all" checked={allSelected} onCheckedChange={toggleSelectAll} />
                    <Label htmlFor="select-all">{t('disparos.selectAll')}</Label>
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
                  <span>{t('common.filter')}</span>
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
                    {t('common.clearFilter')}
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
                    <div className="text-sm font-medium mb-2">{t('disparos.searchCompany')}</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('disparos.companyNamePlaceholder')}
                        value={buscaEmpresa}
                        onChange={(e) => setBuscaEmpresa(e.target.value)}
                        className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>

                  {/* Status do Disparo */}
                  <div>
                    <div className="text-sm font-medium mb-2">{t('disparos.dispatchStatus')}</div>
                    <Select
                      value={statusFiltro}
                      onValueChange={(value) => setStatusFiltro(value as StatusControleMensal | 'todos')}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder={t('disparos.allStatuses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">{t('disparos.allStatuses')} ({stats.total})</SelectItem>
                        <SelectItem value="enviado">{t('disparos.statusSent')} ({stats.enviados})</SelectItem>
                        <SelectItem value="pendente">{t('disparos.statusPending')} ({stats.pendentes})</SelectItem>
                        <SelectItem value="falhou">{t('disparos.statusFailed')} ({stats.falhas})</SelectItem>
                        <SelectItem value="agendado">{t('disparos.statusScheduled')} ({stats.agendados})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mt-2">{t('common.loading')}</p>
              </div>
            ) : statusMensalFiltrado.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  {statusFiltro === 'todos' 
                    ? t('disparosPersonalizados.noCustomCompanyFound')
                    : t('disparos.noCompanyWithStatus', { status: statusFiltro })
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
                            <span title={t('disparosPersonalizados.companyWithAttachments')}>
                              <Paperclip className="h-4 w-4 text-purple-600" />
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {status.clientesAtivos} {t('disparos.activeClients')}
                          {status.emailsEnviados > 0 && ` • ${status.emailsEnviados} ${t('disparos.emailsSent')}`}
                        </p>
                        {status.empresa.anexo && obterIndicadorAnexos(status.empresaId, status.empresa.anexo)}
                        {status.observacoes && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {(() => {
                              const match = status.observacoes.match(/E-mail consolidado enviado para (\d+) clientes/);
                              if (match) {
                                return `${t('disparos.consolidatedEmailSent')} ${match[1]} ${t('disparos.clients')}`;
                              }
                              return status.observacoes;
                            })()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(status.status)}>
                        {status.status === 'enviado' && t('disparos.badgeSent')}
                        {status.status === 'pendente' && t('disparos.badgePending')}
                        {status.status === 'falhou' && t('disparos.badgeFailed')}
                        {status.status === 'agendado' && t('disparos.badgeScheduled')}
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
                            {t('disparosPersonalizados.attachments')}
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
                            {t('disparos.schedule')}
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
              <AlertDialogTitle>{t('disparosPersonalizados.confirmResendCustomTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('disparosPersonalizados.confirmResendCustomDescription', { count: stats.falhas, month: getMonthName(mesAtual - 1), year: anoAtual })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmarReenvioFalhas}
                disabled={isReenviando}
              >
                {isReenviando ? t('disparos.resending') : t('disparos.confirmResend')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Agendamento */}
        <Dialog open={showAgendamentoModal} onOpenChange={setShowAgendamentoModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('disparosPersonalizados.customScheduleDispatch')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="data-agendamento">{t('disparos.scheduleDatetime')}</Label>
                <Input
                  id="data-agendamento"
                  type="datetime-local"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <Label htmlFor="observacoes-agendamento">{t('disparos.scheduleObservations')}</Label>
                <Textarea
                  id="observacoes-agendamento"
                  value={observacoesAgendamento}
                  onChange={(e) => setObservacoesAgendamento(e.target.value)}
                  placeholder={t('disparosPersonalizados.customScheduleObservationsPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAgendamentoModal(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={confirmarAgendamento}
                  disabled={isAgendando || !dataAgendamento}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isAgendando ? t('disparos.scheduling') : t('disparos.confirmSchedule')}
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
                {t('disparosPersonalizados.manageAttachments')}
                {empresaAnexoSelecionada && Array.isArray(statusMensal) && (
                  <span className="text-sm font-normal text-muted-foreground">
                    - {(statusMensal as StatusMensal[]).find(s => s.empresaId === empresaAnexoSelecionada)?.empresa.nome_abreviado}
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
                {t('common.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default ControleDisparosPersonalizados;