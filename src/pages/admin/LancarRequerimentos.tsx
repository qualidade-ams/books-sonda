import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, FileText, Send, Calendar, Clock, HelpCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InputHoras } from '@/components/ui/input-horas';
import { formatarHorasParaExibicao, somarHoras } from '@/utils/horasUtils';
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

import {
  RequerimentoForm,
  RequerimentoCard,
  RequerimentosTable,
  ContextualHelp,
  RequerimentosHelpGuide
} from '@/components/admin/requerimentos';
import { StatsCardSkeleton, RequerimentoCardSkeleton, RequerimentosTableSkeleton } from '@/components/admin/requerimentos/LoadingStates';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useDebounceSearch, useMemoizedFilter, useVirtualPagination } from '@/utils/requerimentosPerformance';

import {
  useRequerimentosNaoEnviados,
  useRequerimentosEnviados,
  useCreateRequerimento,
  useUpdateRequerimento,
  useDeleteRequerimento,
  useEstatisticasRequerimentos,
  useEnviarMultiplosParaFaturamento
} from '@/hooks/useRequerimentos';

import {
  Requerimento,
  RequerimentoFormData,
  FiltrosRequerimentos,
  MODULO_OPTIONS,
  LINGUAGEM_OPTIONS,
  TIPO_COBRANCA_OPTIONS
} from '@/types/requerimentos';

const LancarRequerimentos = () => {
  // Estados para modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showReprovadoModal, setShowReprovadoModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState('nao-enviados');

  // Estados para modal de Reprovado
  const [reprovadoData, setReprovadoData] = useState<RequerimentoFormData | null>(null);
  const [horasReprovado, setHorasReprovado] = useState('');

  // Hooks de responsividade e acessibilidade
  const { grid, form, navigation, cards } = useResponsive();
  const { screenReader } = useAccessibility();

  // Estados para requerimento selecionado
  const [selectedRequerimento, setSelectedRequerimento] = useState<Requerimento | null>(null);
  const [selectedRequerimentos, setSelectedRequerimentos] = useState<string[]>([]);

  // Estados específicos para aba de enviados
  const [selectedRequerimentosEnviados, setSelectedRequerimentosEnviados] = useState<string[]>([]);
  const [showFiltersEnviados, setShowFiltersEnviados] = useState(false);
  const [filtrosEnviados, setFiltrosEnviados] = useState<FiltrosRequerimentos>({
    busca: '',
    modulo: undefined,
    linguagem: undefined,
    tipo_cobranca: undefined,
    mes_cobranca: (() => {
      const hoje = new Date();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      return `${mes}/${ano}`;
    })(), // Formato MM/YYYY por padrão
    data_inicio: undefined,
    data_fim: undefined
  });

  // Estados para filtros da aba não enviados
  const [filtros, setFiltros] = useState<FiltrosRequerimentos>({
    busca: '',
    modulo: undefined,
    linguagem: undefined,
    tipo_cobranca: undefined,
    mes_cobranca: undefined,
    data_inicio: undefined,
    data_fim: undefined
  });

  // Opções para multi-select
  const moduloOptions: Option[] = MODULO_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label
  }));

  const linguagemOptions: Option[] = LINGUAGEM_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label
  }));

  const tipoCobrancaOptions: Option[] = TIPO_COBRANCA_OPTIONS
    .filter(opt => opt.value !== 'Selecione') // Filtrar 'Selecione'
    .map(opt => ({
      value: opt.value,
      label: opt.label
    }));

  // Hooks
  const {
    data: requerimentos = [],
    isLoading,
    refetch
  } = useRequerimentosNaoEnviados();

  const {
    data: requerimentosEnviados = [],
    isLoading: isLoadingEnviados,
    refetch: refetchEnviados
  } = useRequerimentosEnviados(filtrosEnviados);

  const {
    data: estatisticas
  } = useEstatisticasRequerimentos();

  const createRequerimento = useCreateRequerimento();
  const updateRequerimento = useUpdateRequerimento();
  const deleteRequerimento = useDeleteRequerimento();
  const enviarMultiplos = useEnviarMultiplosParaFaturamento();

  // Determinar qual lista e filtros usar baseado na aba ativa
  const currentRequerimentos = activeTab === 'nao-enviados' ? requerimentos : requerimentosEnviados;
  const currentIsLoading = activeTab === 'nao-enviados' ? isLoading : isLoadingEnviados;
  const currentFiltros = activeTab === 'nao-enviados' ? filtros : filtrosEnviados;

  // Filtrar requerimentos com memoização otimizada
  const requerimentosFiltrados = useMemoizedFilter(
    currentRequerimentos || [],
    (req) => {
      // Filtro de busca (chamado, cliente, descrição)
      if (currentFiltros.busca) {
        const busca = currentFiltros.busca.toLowerCase();
        const matchBusca =
          req.chamado.toLowerCase().includes(busca) ||
          req.cliente_nome?.toLowerCase().includes(busca) ||
          req.descricao.toLowerCase().includes(busca);
        if (!matchBusca) return false;
      }

      // Filtros específicos (suporte a múltipla seleção)
      if (currentFiltros.modulo) {
        const modulos = Array.isArray(currentFiltros.modulo) ? currentFiltros.modulo : [currentFiltros.modulo];
        if (!modulos.includes(req.modulo)) return false;
      }

      if (currentFiltros.linguagem) {
        const linguagens = Array.isArray(currentFiltros.linguagem) ? currentFiltros.linguagem : [currentFiltros.linguagem];
        if (!linguagens.includes(req.linguagem)) return false;
      }

      if (currentFiltros.tipo_cobranca) {
        const tipos = Array.isArray(currentFiltros.tipo_cobranca) ? currentFiltros.tipo_cobranca : [currentFiltros.tipo_cobranca];
        if (!tipos.includes(req.tipo_cobranca)) return false;
      }

      if (currentFiltros.mes_cobranca && req.mes_cobranca !== currentFiltros.mes_cobranca) return false;

      // Filtros de data
      if (currentFiltros.data_inicio) {
        const dataEnvio = new Date(req.data_envio);
        const dataInicio = new Date(currentFiltros.data_inicio);
        if (dataEnvio < dataInicio) return false;
      }

      if (currentFiltros.data_fim) {
        const dataEnvio = new Date(req.data_envio);
        const dataFim = new Date(currentFiltros.data_fim);
        if (dataEnvio > dataFim) return false;
      }

      return true;
    },
    [currentFiltros]
  );

  // Paginação virtual para performance
  const paginatedData = useVirtualPagination(requerimentosFiltrados, 20, currentPage);

  // Estatísticas dos requerimentos filtrados
  const statsRequerimentos = useMemo(() => {
    const total = requerimentosFiltrados.length;
    const currentSelected = activeTab === 'nao-enviados' ? selectedRequerimentos : selectedRequerimentosEnviados;

    // Somar horas corretamente usando somarHoras
    let totalHorasString = '0:00';
    requerimentosFiltrados.forEach(req => {
      if (req.horas_total) {
        totalHorasString = somarHoras(totalHorasString, req.horas_total.toString());
      }
    });

    // Somar horas e valores dos selecionados
    let horasSelecionados = '0:00';
    let valorSelecionados = 0;
    if (currentSelected.length > 0) {
      const requerimentosSelecionados = requerimentosFiltrados.filter(req => currentSelected.includes(req.id));
      requerimentosSelecionados.forEach(req => {
        if (req.horas_total) {
          horasSelecionados = somarHoras(horasSelecionados, req.horas_total.toString());
        }

        // Calcular valor se o tipo de cobrança tem valor monetário
        if (req.valor_total_geral && typeof req.valor_total_geral === 'number') {
          valorSelecionados += req.valor_total_geral;
        }
      });
    }

    // Agrupar por tipo de cobrança
    const porTipo = requerimentosFiltrados.reduce((acc, req) => {
      if (!acc[req.tipo_cobranca]) {
        acc[req.tipo_cobranca] = { quantidade: 0, horas: '0:00' };
      }
      acc[req.tipo_cobranca].quantidade++;
      if (req.horas_total) {
        acc[req.tipo_cobranca].horas = somarHoras(
          acc[req.tipo_cobranca].horas,
          req.horas_total.toString()
        );
      }
      return acc;
    }, {} as Record<string, { quantidade: number; horas: string }>);

    return {
      total,
      totalHoras: totalHorasString,
      horasSelecionados,
      valorSelecionados,
      selecionados: currentSelected.length,
      porTipo
    };
  }, [requerimentosFiltrados, selectedRequerimentos, selectedRequerimentosEnviados, activeTab]);

  // Handlers para filtros com debounce
  const debouncedSearch = useDebounceSearch((value: string) => {
    setFiltros(prev => ({ ...prev, busca: value || undefined }));
    setCurrentPage(1); // Reset página ao filtrar
  });

  const handleFiltroChange = useCallback((key: keyof FiltrosRequerimentos, value: any) => {
    if (key === 'busca') {
      debouncedSearch(value);
    } else {
      // Tratar valores especiais de "todos"
      const specialValues = ['__all_modules__', '__all_languages__', '__all_types__', '__all_months__'];
      const processedValue = specialValues.includes(value) ? undefined : value;

      setFiltros(prev => ({
        ...prev,
        [key]: processedValue || undefined
      }));
      setCurrentPage(1); // Reset página ao filtrar
    }
  }, [debouncedSearch]);

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      modulo: undefined,
      linguagem: undefined,
      tipo_cobranca: undefined,
      mes_cobranca: undefined,
      data_inicio: undefined,
      data_fim: undefined
    });
  };

  // Handlers para filtros da aba de enviados
  const debouncedSearchEnviados = useDebounceSearch((value: string) => {
    setFiltrosEnviados(prev => ({ ...prev, busca: value || undefined }));
    setCurrentPage(1);
  });

  const handleFiltroEnviadosChange = useCallback((key: keyof FiltrosRequerimentos, value: any) => {
    if (key === 'busca') {
      debouncedSearchEnviados(value);
    } else {
      const specialValues = ['__all_modules__', '__all_languages__', '__all_types__', '__all_months__'];
      const processedValue = specialValues.includes(value) ? undefined : value;

      setFiltrosEnviados(prev => ({
        ...prev,
        [key]: processedValue || undefined
      }));
      setCurrentPage(1);
    }
  }, [debouncedSearchEnviados]);

  const limparFiltrosEnviados = () => {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();

    setFiltrosEnviados({
      busca: '',
      modulo: undefined,
      linguagem: undefined,
      tipo_cobranca: undefined,
      mes_cobranca: `${mes}/${ano}`, // Manter mês corrente no formato MM/YYYY
      data_inicio: undefined,
      data_fim: undefined
    });
  };

  // Handlers para seleção múltipla
  const toggleRequerimentoSelection = (id: string) => {
    if (activeTab === 'nao-enviados') {
      setSelectedRequerimentos(prev =>
        prev.includes(id)
          ? prev.filter(reqId => reqId !== id)
          : [...prev, id]
      );
    } else if (activeTab === 'enviados') {
      setSelectedRequerimentosEnviados(prev =>
        prev.includes(id)
          ? prev.filter(reqId => reqId !== id)
          : [...prev, id]
      );
    }
  };

  const selectAllRequerimentos = () => {
    if (activeTab === 'nao-enviados') {
      setSelectedRequerimentos(requerimentosFiltrados.map(req => req.id));
    } else if (activeTab === 'enviados') {
      setSelectedRequerimentosEnviados(requerimentosFiltrados.map(req => req.id));
    }
  };

  const clearSelection = () => {
    if (activeTab === 'nao-enviados') {
      setSelectedRequerimentos([]);
    } else if (activeTab === 'enviados') {
      setSelectedRequerimentosEnviados([]);
    }
  };

  // Limpar seleção ao mudar de aba
  React.useEffect(() => {
    setSelectedRequerimentos([]);
    setSelectedRequerimentosEnviados([]);
  }, [activeTab]);

  // Handlers para ações
  const handleCreate = useCallback(async (data: RequerimentoFormData) => {
    try {
      // Se o tipo de cobrança for "Reprovado", abrir modal para definir horas
      if (data.tipo_cobranca === 'Reprovado') {
        setReprovadoData(data);
        setHorasReprovado('');
        setShowCreateModal(false);
        setShowReprovadoModal(true);
        return;
      }

      await createRequerimento.mutateAsync(data);
      setShowCreateModal(false);
      screenReader.announceSuccess('Requerimento criado com sucesso');
    } catch (error) {
      screenReader.announceError('Erro ao criar requerimento');
    }
  }, [createRequerimento, screenReader]);

  const handleEdit = (requerimento: Requerimento) => {
    setSelectedRequerimento(requerimento);
    setShowEditModal(true);
  };

  const handleUpdate = async (data: RequerimentoFormData) => {
    if (!selectedRequerimento) return;
    await updateRequerimento.mutateAsync({
      id: selectedRequerimento.id,
      data
    });
    setShowEditModal(false);
    setSelectedRequerimento(null);
  };

  // Handler para confirmar modal de Reprovado
  const handleConfirmReprovado = useCallback(async () => {
    if (!reprovadoData || !horasReprovado) return;

    try {
      // 1. Criar o requerimento "Reprovado" original
      await createRequerimento.mutateAsync(reprovadoData);

      // 2. Criar automaticamente um requerimento "Banco de Horas" com as horas especificadas
      const bancoHorasData: RequerimentoFormData = {
        ...reprovadoData,
        tipo_cobranca: 'Banco de Horas',
        horas_funcional: horasReprovado,
        horas_tecnico: '0',
        descricao: `Banco de horas referente ao chamado reprovado ${reprovadoData.chamado}`,
        observacao: `Gerado automaticamente a partir do requerimento reprovado ${reprovadoData.chamado}`
      };

      await createRequerimento.mutateAsync(bancoHorasData);

      // Fechar modal e limpar estados
      setShowReprovadoModal(false);
      setReprovadoData(null);
      setHorasReprovado('');

      screenReader.announceSuccess('Requerimento reprovado criado e banco de horas gerado automaticamente');
    } catch (error) {
      console.error('Erro ao processar requerimento reprovado:', error);
      screenReader.announceError('Erro ao processar requerimento reprovado');
    }
  }, [reprovadoData, horasReprovado, createRequerimento, screenReader]);

  const handleDelete = (requerimento: Requerimento) => {
    setSelectedRequerimento(requerimento);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedRequerimento) return;
    await deleteRequerimento.mutateAsync(selectedRequerimento.id);
    setShowDeleteModal(false);
    setSelectedRequerimento(null);
  };

  const handleEnviarSelecionados = async () => {
    if (selectedRequerimentos.length === 0) return;
    await enviarMultiplos.mutateAsync(selectedRequerimentos);
    clearSelection();
  };

  // Preparar dados iniciais para edição
  const getInitialDataForEdit = (requerimento: Requerimento): Partial<RequerimentoFormData> => {
    return {
      chamado: requerimento.chamado,
      cliente_id: requerimento.cliente_id,
      modulo: requerimento.modulo,
      descricao: requerimento.descricao,
      data_envio: requerimento.data_envio,
      data_aprovacao: requerimento.data_aprovacao,
      horas_funcional: requerimento.horas_funcional,
      horas_tecnico: requerimento.horas_tecnico,
      linguagem: requerimento.linguagem,
      tipo_cobranca: requerimento.tipo_cobranca,
      mes_cobranca: requerimento.mes_cobranca,
      observacao: requerimento.observacao || ''
    };
  };

  // Opções de mês para filtro
  const mesesOptions = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Lançar Requerimentos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerencie especificações funcionais de chamados técnicos
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <ProtectedAction screenKey="lancar_requerimentos" requiredLevel="edit">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 text-sm"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Requerimento</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Estatísticas */}
        <div className={cn("grid gap-4", grid.gridClass)}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <StatsCardSkeleton key={i} />
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {statsRequerimentos.total}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-blue-600 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total Horas
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-blue-600">
                    {formatarHorasParaExibicao(statsRequerimentos.totalHoras, 'completo')}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                    Selecionados
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-green-600">
                    {statsRequerimentos.selecionados}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                    {activeTab === 'enviados' ? 'Valores Selecionados' : 'Tipos Únicos'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {activeTab === 'enviados' ? (
                    <div className="text-xl lg:text-2xl font-bold text-orange-600">
                      R$ {(statsRequerimentos.valorSelecionados || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  ) : (
                    <div className="text-xl lg:text-2xl font-bold text-orange-600">
                      {Object.keys(statsRequerimentos.porTipo).length}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Sistema de Abas - Estilo igual ao EmailConfig */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <TabsList>
              <TabsTrigger value="nao-enviados">
                Requerimentos Não Enviados ({requerimentos.length})
              </TabsTrigger>
              <TabsTrigger value="enviados">
                Histórico de Enviados ({requerimentosEnviados.length})
              </TabsTrigger>
            </TabsList>

            {/* Ações Principais - apenas para aba não enviados */}
            {activeTab === 'nao-enviados' && (
              <div className="flex flex-wrap gap-4 items-center">
                <ProtectedAction screenKey="lancar_requerimentos" requiredLevel="edit">
                  <Button
                    onClick={handleEnviarSelecionados}
                    disabled={enviarMultiplos.isPending || selectedRequerimentos.length === 0}
                    className="flex items-center gap-2"
                    title={selectedRequerimentos.length === 0 ? 'Nenhum requerimento selecionado' : undefined}
                  >
                    <Send className="h-4 w-4" />
                    {enviarMultiplos.isPending ? 'Enviando...' : `Enviar para Faturamento (${selectedRequerimentos.length})`}
                  </Button>
                </ProtectedAction>
              </div>
            )}
          </div>

          <TabsContent value="nao-enviados">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Requerimentos Não Enviados
                  </CardTitle>

                  <div className={cn(
                    "flex gap-2",
                    navigation.stackActions ? "flex-col" : "flex-row"
                  )}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center justify-center space-x-2"
                      aria-expanded={showFilters}
                      aria-controls="filters-section"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filtros</span>
                    </Button>
                    {activeTab === 'nao-enviados' && (
                      <>
                        {selectedRequerimentos.length === 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAllRequerimentos}
                            disabled={requerimentosFiltrados.length === 0}
                            className="whitespace-nowrap"
                            aria-label={`Selecionar todos os ${requerimentosFiltrados.length} requerimentos`}
                          >
                            Selecionar Todos
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                            className="whitespace-nowrap"
                            aria-label={`Limpar seleção de ${selectedRequerimentos.length} requerimentos`}
                          >
                            Limpar Seleção
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {/* Filtros */}
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                    {/* Busca */}
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por chamado, cliente ou descrição..."
                          defaultValue={filtros.busca || ''}
                          onChange={(e) => handleFiltroChange('busca', e.target.value)}
                          className="pl-10"
                          aria-label="Campo de busca"
                        />
                      </div>
                    </div>

                    {/* Módulo */}
                    <div>
                      <div className="text-sm font-medium mb-2">Módulo</div>
                      <MultiSelect
                        options={moduloOptions}
                        selected={Array.isArray(filtros.modulo) ? filtros.modulo : filtros.modulo ? [filtros.modulo] : []}
                        onChange={(values) => handleFiltroChange('modulo', values.length > 0 ? values : undefined)}
                        placeholder="Todos os módulos"
                        maxCount={2}
                      />
                    </div>

                    {/* Linguagem */}
                    <div>
                      <div className="text-sm font-medium mb-2">Linguagem</div>
                      <MultiSelect
                        options={linguagemOptions}
                        selected={Array.isArray(filtros.linguagem) ? filtros.linguagem : filtros.linguagem ? [filtros.linguagem] : []}
                        onChange={(values) => handleFiltroChange('linguagem', values.length > 0 ? values : undefined)}
                        placeholder="Todas as linguagens"
                        maxCount={2}
                      />
                    </div>

                    {/* Tipo de Cobrança */}
                    <div>
                      <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                      <MultiSelect
                        options={tipoCobrancaOptions}
                        selected={Array.isArray(filtros.tipo_cobranca) ? filtros.tipo_cobranca : filtros.tipo_cobranca ? [filtros.tipo_cobranca] : []}
                        onChange={(values) => handleFiltroChange('tipo_cobranca', values.length > 0 ? values : undefined)}
                        placeholder="Todos os tipos"
                        maxCount={2}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Tabela de Requerimentos */}
                {isLoading ? (
                  <RequerimentosTableSkeleton />
                ) : requerimentosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum requerimento encontrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {filtros.busca || filtros.modulo || filtros.linguagem || filtros.tipo_cobranca
                        ? 'Tente ajustar os filtros ou criar um novo requerimento.'
                        : 'Comece criando seu primeiro requerimento.'}
                    </p>
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Requerimento
                    </Button>
                  </div>
                ) : (
                  <>
                    <RequerimentosTable
                      requerimentos={paginatedData.items}
                      loading={isLoading}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      selectedRequerimentos={selectedRequerimentos}
                      onToggleSelection={toggleRequerimentoSelection}
                      onSelectAll={selectAllRequerimentos}
                      onClearSelection={clearSelection}
                      showEnviarFaturamento={true}
                    />

                    {/* Paginação */}
                    {paginatedData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Mostrando {paginatedData.startIndex} a {paginatedData.endIndex} de {paginatedData.totalItems} requerimentos
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={!paginatedData.hasPrevPage}
                            aria-label="Página anterior"
                          >
                            Anterior
                          </Button>
                          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                            {currentPage} de {paginatedData.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                            disabled={!paginatedData.hasNextPage}
                            aria-label="Próxima página"
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enviados">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Histórico - Requerimentos Enviados
                  </CardTitle>

                  <div className={cn(
                    "flex gap-2",
                    navigation.stackActions ? "flex-col" : "flex-row"
                  )}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFiltersEnviados(!showFiltersEnviados)}
                      className="flex items-center justify-center space-x-2"
                      aria-expanded={showFiltersEnviados}
                      aria-controls="filters-enviados-section"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filtros</span>
                    </Button>
                    {selectedRequerimentosEnviados.length === 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={selectAllRequerimentos}
                        disabled={requerimentosFiltrados.length === 0}
                        className="whitespace-nowrap"
                        aria-label={`Selecionar todos os ${requerimentosFiltrados.length} requerimentos`}
                      >
                        Selecionar Todos
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                        className="whitespace-nowrap"
                        aria-label={`Limpar seleção de ${selectedRequerimentosEnviados.length} requerimentos`}
                      >
                        Limpar Seleção
                      </Button>
                    )}
                  </div>
                </div>
                {/* Filtros para Enviados */}
                {showFiltersEnviados && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
                    {/* Busca */}
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Nome ou e-mail..."
                          defaultValue={filtrosEnviados.busca || ''}
                          onChange={(e) => handleFiltroEnviadosChange('busca', e.target.value)}
                          className="pl-10"
                          aria-label="Campo de busca"
                        />
                      </div>
                    </div>

                    {/* Módulo */}
                    <div>
                      <div className="text-sm font-medium mb-2">Módulo</div>
                      <Select
                        value={Array.isArray(filtrosEnviados.modulo) && filtrosEnviados.modulo.length > 0 ? filtrosEnviados.modulo[0] : '__all_modules__'}
                        onValueChange={(value) => handleFiltroEnviadosChange('modulo', value === '__all_modules__' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todos os módulos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all_modules__">Todos os módulos</SelectItem>
                          {MODULO_OPTIONS.map((modulo) => (
                            <SelectItem key={modulo.value} value={modulo.value}>
                              {modulo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Linguagem */}
                    <div>
                      <div className="text-sm font-medium mb-2">Linguagem</div>
                      <Select
                        value={Array.isArray(filtrosEnviados.linguagem) && filtrosEnviados.linguagem.length > 0 ? filtrosEnviados.linguagem[0] : '__all_languages__'}
                        onValueChange={(value) => handleFiltroEnviadosChange('linguagem', value === '__all_languages__' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as linguagens" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all_languages__">Todas as linguagens</SelectItem>
                          {LINGUAGEM_OPTIONS.map((linguagem) => (
                            <SelectItem key={linguagem.value} value={linguagem.value}>
                              {linguagem.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mês/Ano */}
                    <div>
                      <div className="text-sm font-medium mb-2">Mês/Ano</div>
                      <MonthYearPicker
                        value={filtrosEnviados.mes_cobranca || ''}
                        onChange={(value) => handleFiltroEnviadosChange('mes_cobranca', value)}
                        placeholder="Outubro 2025"
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Tabela de Requerimentos Enviados com Seleção */}
                {isLoadingEnviados ? (
                  <RequerimentosTableSkeleton showActions={false} />
                ) : requerimentosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Nenhum requerimento encontrado
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {filtrosEnviados.busca || filtrosEnviados.modulo || filtrosEnviados.linguagem || filtrosEnviados.tipo_cobranca
                        ? 'Tente ajustar os filtros para encontrar requerimentos.'
                        : 'Os requerimentos enviados para faturamento aparecerão aqui.'}
                    </p>
                  </div>
                ) : (
                  <>
                    <RequerimentosTable
                      requerimentos={paginatedData.items}
                      loading={isLoadingEnviados}
                      onEdit={() => { }} // Função vazia - apenas visualização
                      onDelete={() => { }} // Função vazia - apenas visualização
                      selectedRequerimentos={selectedRequerimentosEnviados}
                      onToggleSelection={toggleRequerimentoSelection}
                      onSelectAll={selectAllRequerimentos}
                      onClearSelection={clearSelection}
                      showEnviarFaturamento={false} // Não mostrar botão de enviar
                      showActions={false} // Não mostrar coluna de ações
                    />

                    {/* Paginação */}
                    {paginatedData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Mostrando {paginatedData.startIndex} a {paginatedData.endIndex} de {paginatedData.totalItems} requerimentos
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={!paginatedData.hasPrevPage}
                            aria-label="Página anterior"
                          >
                            Anterior
                          </Button>
                          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                            {currentPage} de {paginatedData.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                            disabled={!paginatedData.hasNextPage}
                            aria-label="Próxima página"
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Criação */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Requerimento</DialogTitle>
            </DialogHeader>
            <RequerimentoForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateModal(false)}
              isLoading={createRequerimento.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Requerimento</DialogTitle>
            </DialogHeader>
            {selectedRequerimento && (
              <RequerimentoForm
                requerimento={selectedRequerimento}
                onSubmit={handleUpdate}
                onCancel={() => {
                  setShowEditModal(false);
                  setSelectedRequerimento(null);
                }}
                isLoading={updateRequerimento.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o requerimento "{selectedRequerimento?.chamado}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteRequerimento.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteRequerimento.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Horas para Reprovado */}
        <Dialog open={showReprovadoModal} onOpenChange={setShowReprovadoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-600" />
                Requerimento Reprovado
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  O requerimento será criado como <strong>Reprovado</strong> e automaticamente será gerado um requerimento de <strong>Banco de Horas</strong> com as horas especificadas abaixo.
                </p>
                <div className="text-xs text-slate-500">
                  <strong>Chamado:</strong> {reprovadoData?.chamado}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="horas-reprovado">
                  Horas para Banco de Horas <span className="text-red-500">*</span>
                </Label>
                <InputHoras
                  id="horas-reprovado"
                  value={horasReprovado}
                  onChange={setHorasReprovado}
                  placeholder="Ex: 8 ou 8:30"
                  className="w-full"
                />
                <p className="text-xs text-slate-500">
                  Informe as horas que serão creditadas no banco de horas (formato: HH:MM ou número inteiro)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReprovadoModal(false);
                    setReprovadoData(null);
                    setHorasReprovado('');
                    setShowCreateModal(true); // Reabrir modal de criação
                  }}
                  disabled={createRequerimento.isPending}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmReprovado}
                  disabled={!horasReprovado || createRequerimento.isPending}
                  className="bg-slate-600 hover:bg-slate-700"
                >
                  {createRequerimento.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar e Criar'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default LancarRequerimentos;