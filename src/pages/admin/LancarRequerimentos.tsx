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
  ContextualHelp,
  RequerimentosHelpGuide
} from '@/components/admin/requerimentos';
import { StatsCardSkeleton, RequerimentoCardSkeleton } from '@/components/admin/requerimentos/LoadingStates';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { useAccessibility } from '@/hooks/useAccessibility';
import { useDebounceSearch, useMemoizedFilter, useVirtualPagination } from '@/utils/requerimentosPerformance';

import {
  useRequerimentosNaoEnviados,
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

  // Estados para modal de Reprovado
  const [reprovadoData, setReprovadoData] = useState<RequerimentoFormData | null>(null);
  const [horasReprovado, setHorasReprovado] = useState('');

  // Hooks de responsividade e acessibilidade
  const { grid, form, navigation, cards } = useResponsive();
  const { screenReader } = useAccessibility();

  // Estados para requerimento selecionado
  const [selectedRequerimento, setSelectedRequerimento] = useState<Requerimento | null>(null);
  const [selectedRequerimentos, setSelectedRequerimentos] = useState<string[]>([]);

  // Estados para filtros
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
    data: estatisticas
  } = useEstatisticasRequerimentos();

  const createRequerimento = useCreateRequerimento();
  const updateRequerimento = useUpdateRequerimento();
  const deleteRequerimento = useDeleteRequerimento();
  const enviarMultiplos = useEnviarMultiplosParaFaturamento();

  // Filtrar requerimentos com memoização otimizada
  const requerimentosFiltrados = useMemoizedFilter(
    requerimentos || [],
    (req) => {
      // Filtro de busca (chamado, cliente, descrição)
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        const matchBusca =
          req.chamado.toLowerCase().includes(busca) ||
          req.cliente_nome?.toLowerCase().includes(busca) ||
          req.descricao.toLowerCase().includes(busca);
        if (!matchBusca) return false;
      }

      // Filtros específicos (suporte a múltipla seleção)
      if (filtros.modulo) {
        const modulos = Array.isArray(filtros.modulo) ? filtros.modulo : [filtros.modulo];
        if (!modulos.includes(req.modulo)) return false;
      }

      if (filtros.linguagem) {
        const linguagens = Array.isArray(filtros.linguagem) ? filtros.linguagem : [filtros.linguagem];
        if (!linguagens.includes(req.linguagem)) return false;
      }

      if (filtros.tipo_cobranca) {
        const tipos = Array.isArray(filtros.tipo_cobranca) ? filtros.tipo_cobranca : [filtros.tipo_cobranca];
        if (!tipos.includes(req.tipo_cobranca)) return false;
      }

      if (filtros.mes_cobranca && req.mes_cobranca !== filtros.mes_cobranca) return false;

      // Filtros de data
      if (filtros.data_inicio) {
        const dataEnvio = new Date(req.data_envio);
        const dataInicio = new Date(filtros.data_inicio);
        if (dataEnvio < dataInicio) return false;
      }

      if (filtros.data_fim) {
        const dataEnvio = new Date(req.data_envio);
        const dataFim = new Date(filtros.data_fim);
        if (dataEnvio > dataFim) return false;
      }

      return true;
    },
    [filtros]
  );

  // Paginação virtual para performance
  const paginatedData = useVirtualPagination(requerimentosFiltrados, 20, currentPage);

  // Estatísticas dos requerimentos filtrados
  const statsRequerimentos = useMemo(() => {
    const total = requerimentosFiltrados.length;

    // Somar horas corretamente usando somarHoras
    let totalHorasString = '0:00';
    requerimentosFiltrados.forEach(req => {
      if (req.horas_total) {
        totalHorasString = somarHoras(totalHorasString, req.horas_total.toString());
      }
    });

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
      porTipo
    };
  }, [requerimentosFiltrados]);

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

  // Handlers para seleção múltipla
  const toggleRequerimentoSelection = (id: string) => {
    setSelectedRequerimentos(prev =>
      prev.includes(id)
        ? prev.filter(reqId => reqId !== id)
        : [...prev, id]
    );
  };

  const selectAllRequerimentos = () => {
    setSelectedRequerimentos(requerimentosFiltrados.map(req => req.id));
  };

  const clearSelection = () => {
    setSelectedRequerimentos([]);
  };

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
                    {selectedRequerimentos.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                    Tipos Únicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-orange-600">
                    {Object.keys(statsRequerimentos.porTipo).length}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Ações Principais */}
        <div className="flex flex-wrap gap-4 items-center justify-end">
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

        {/* Lista de Requerimentos */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Requerimentos Não Enviados ({requerimentosFiltrados.length})
                <ContextualHelp
                  title="Ajuda - Requerimentos"
                  trigger={
                    <Button variant="ghost" size="sm" className="p-1">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                    </Button>
                  }
                >
                  <RequerimentosHelpGuide />
                </ContextualHelp>
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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filtros */}
            {showFilters && (
              <div
                id="filters-section"
                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border space-y-4"
                role="region"
                aria-label="Filtros de requerimentos"
              >
                {/* Busca */}
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar por chamado, cliente ou descrição..."
                    defaultValue={filtros.busca || ''}
                    onChange={(e) => handleFiltroChange('busca', e.target.value)}
                    className="h-8 flex-1"
                    aria-label="Campo de busca"
                  />
                </div>

                {/* Filtros em Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Módulo - Múltipla Seleção */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Módulo</Label>
                    <div className="h-10">
                      <MultiSelect
                        options={moduloOptions}
                        selected={Array.isArray(filtros.modulo) ? filtros.modulo : filtros.modulo ? [filtros.modulo] : []}
                        onChange={(values) => handleFiltroChange('modulo', values.length > 0 ? values : undefined)}
                        placeholder="Todos os módulos"
                        maxCount={2}
                      />
                    </div>
                  </div>

                  {/* Linguagem - Múltipla Seleção */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Linguagem</Label>
                    <div className="h-10">
                      <MultiSelect
                        options={linguagemOptions}
                        selected={Array.isArray(filtros.linguagem) ? filtros.linguagem : filtros.linguagem ? [filtros.linguagem] : []}
                        onChange={(values) => handleFiltroChange('linguagem', values.length > 0 ? values : undefined)}
                        placeholder="Todas as linguagens"
                        maxCount={2}
                      />
                    </div>
                  </div>

                  {/* Tipo de Cobrança - Múltipla Seleção */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipo de Cobrança</Label>
                    <div className="h-10">
                      <MultiSelect
                        options={tipoCobrancaOptions}
                        selected={Array.isArray(filtros.tipo_cobranca) ? filtros.tipo_cobranca : filtros.tipo_cobranca ? [filtros.tipo_cobranca] : []}
                        onChange={(values) => handleFiltroChange('tipo_cobranca', values.length > 0 ? values : undefined)}
                        placeholder="Todos os tipos"
                        maxCount={2}
                      />
                    </div>
                  </div>

                  {/* Mês/Ano de Cobrança - Seletor de Mês/Ano */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mês/Ano de Cobrança</Label>
                    <div className="h-10">
                      <MonthYearPicker
                        value={filtros.mes_cobranca}
                        onChange={(value) => handleFiltroChange('mes_cobranca', value)}
                        placeholder="Todos os meses"
                      />
                    </div>
                  </div>
                </div>

                {/* Botão Limpar */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={limparFiltros}
                    className="h-8 text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            )}

            {/* Cabeçalho da Lista */}
            {!isLoading && requerimentosFiltrados.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border">
                <div className="flex text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3">
                  <div className="w-[4%] text-center pr-1">
                    <Checkbox
                      checked={selectedRequerimentos.length === requerimentosFiltrados.length && requerimentosFiltrados.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllRequerimentos();
                        } else {
                          clearSelection();
                        }
                      }}
                      aria-label="Selecionar todos os requerimentos"
                    />
                  </div>
                  <div className="w-[11%] pr-1">Chamado</div>
                  <div className="w-[9%] pr-1">Cliente</div>
                  <div className="w-[6%] text-center pr-1">Módulo</div>
                  <div className="w-[6%] text-center pr-1">Linguagem</div>
                  <div className="w-[5%] text-center pr-1">H.Func</div>
                  <div className="w-[5%] text-center pr-1">H.Téc</div>
                  <div className="w-[5%] text-center pr-1">Total</div>
                  <div className="w-[7%] text-center pr-1">Data Envio</div>
                  <div className="w-[7%] text-center pr-1">Data Aprov.</div>
                  <div className="w-[8%] text-center pr-1">Valor Total</div>
                  <div className="w-[7%] text-center pr-1">Mês/Ano</div>
                  <div className="w-[10%] text-center pr-1">Autor</div>
                  <div className="w-[8%] text-center">Ações</div>
                </div>
              </div>
            )}

            {/* Lista de Requerimentos */}
            {isLoading ? (
              <div className="space-y-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <RequerimentoCardSkeleton key={i} />
                ))}
              </div>
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
                <div className="space-y-0">
                  {paginatedData.items.map((requerimento) => (
                    <RequerimentoCard
                      key={requerimento.id}
                      requerimento={requerimento}
                      onEdit={handleEdit}
                      onDelete={() => handleDelete(requerimento)}
                      showActions={true}
                      showEnviarFaturamento={true}
                      isSelected={selectedRequerimentos.includes(requerimento.id)}
                      onToggleSelection={() => toggleRequerimentoSelection(requerimento.id)}
                    />
                  ))}
                </div>

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