import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Filter, RefreshCw, FileText, Send, Calendar, Clock, HelpCircle, ChevronLeft, ChevronRight, DollarSign, Target, Tags } from 'lucide-react';
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
import { formatarHorasParaExibicao, somarHoras, converterParaHorasDecimal } from '@/utils/horasUtils';
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
    RequerimentoMultiploForm,
    RequerimentoCard,
    RequerimentosTable,
    RequerimentosExportButtons,
    RequerimentoViewModal,
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
    TIPO_COBRANCA_OPTIONS
} from '@/types/requerimentos';

// Função para obter o mês/ano padrão
const getDefaultMesCobranca = () => {
    const hoje = new Date();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    return `${mes}/${ano}`;
};

const LancarRequerimentos = () => {
    // Estados para modais
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Estado para controlar a aba ativa
    const [activeTab, setActiveTab] = useState('nao-enviados');

    // Hooks de responsividade e acessibilidade
    const { grid, form, navigation, cards } = useResponsive();
    const { screenReader } = useAccessibility();

    // Estados para requerimento selecionado
    const [selectedRequerimento, setSelectedRequerimento] = useState<Requerimento | null>(null);
    const [selectedRequerimentos, setSelectedRequerimentos] = useState<string[]>([]);

    // Estados específicos para aba de enviados
    const [selectedRequerimentosEnviados, setSelectedRequerimentosEnviados] = useState<string[]>([]);
    const [showFiltersEnviados, setShowFiltersEnviados] = useState(false);
    
    const [filtrosEnviados, setFiltrosEnviados] = useState<FiltrosRequerimentos>(() => ({
        busca: '',
        modulo: undefined,
        tipo_cobranca: undefined,
        mes_cobranca: getDefaultMesCobranca(), // Formato MM/YYYY por padrão
        data_inicio: undefined,
        data_fim: undefined
    }));

    // Estados para filtros da aba não enviados
    const [filtros, setFiltros] = useState<FiltrosRequerimentos>({
        busca: '',
        modulo: undefined,
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



    const tipoCobrancaOptions: Option[] = TIPO_COBRANCA_OPTIONS.map(opt => ({
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

            if (currentFiltros.tipo_cobranca) {
                const tipos = Array.isArray(currentFiltros.tipo_cobranca) ? currentFiltros.tipo_cobranca : [currentFiltros.tipo_cobranca];
                if (!tipos.includes(req.tipo_cobranca)) return false;
            }

            // Filtro de mês/ano - SEMPRE aplicar se estiver definido
            if (currentFiltros.mes_cobranca) {
                if (req.mes_cobranca !== currentFiltros.mes_cobranca) return false;
            }

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
    const paginatedData = useVirtualPagination(requerimentosFiltrados, itemsPerPage, currentPage);

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

        // Calcular valor total de todos os requerimentos
        let valorTotal = 0;
        requerimentosFiltrados.forEach(req => {
            if (req.valor_total_geral && typeof req.valor_total_geral === 'number') {
                valorTotal += req.valor_total_geral;
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
            valorTotal,
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
        const defaultMesCobranca = getDefaultMesCobranca();
        console.log('🧹 Limpando filtros - definindo mês padrão:', defaultMesCobranca);
        setFiltrosEnviados({
            busca: '',
            modulo: undefined,
            tipo_cobranca: undefined,
            mes_cobranca: defaultMesCobranca, // Manter mês corrente no formato MM/YYYY
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
        console.log('🏠 PÁGINA - handleCreate recebeu:', data);
        console.log('🏠 PÁGINA - Tipo de cobrança:', data.tipo_cobranca);
        console.log('🏠 PÁGINA - Horas análise EF:', data.horas_analise_ef);
        
        try {
            // Criar o requerimento (o formulário já gerencia a criação do segundo requerimento se necessário)
            console.log('🏠 PÁGINA - Chamando createRequerimento.mutateAsync...');
            await createRequerimento.mutateAsync(data);
            console.log('🏠 PÁGINA - createRequerimento.mutateAsync concluído');
            setShowCreateModal(false);
            screenReader.announceSuccess('Requerimento criado com sucesso');
        } catch (error) {
            console.error('🏠 PÁGINA - Erro ao criar:', error);
            screenReader.announceError('Erro ao criar requerimento');
        }
    }, [createRequerimento, screenReader]);

    // Handler para criar múltiplos requerimentos
    const handleCreateMultiplo = useCallback(async (requerimentos: RequerimentoFormData[]) => {
        console.log('🏠 PÁGINA - handleCreateMultiplo recebeu:', requerimentos.length, 'requerimentos');
        
        try {
            // Criar cada requerimento sequencialmente
            for (const data of requerimentos) {
                console.log('🏠 PÁGINA - Criando requerimento:', data.tipo_cobranca);
                await createRequerimento.mutateAsync(data);
            }
            
            setShowCreateModal(false);
            screenReader.announceSuccess(`${requerimentos.length} requerimento(s) criado(s) com sucesso`);
        } catch (error) {
            console.error('🏠 PÁGINA - Erro ao criar requerimentos:', error);
            screenReader.announceError('Erro ao criar requerimentos');
            throw error; // Propagar erro para o formulário
        }
    }, [createRequerimento, screenReader]);

    const handleEdit = (requerimento: Requerimento) => {
        setSelectedRequerimento(requerimento);
        setShowEditModal(true);
    };

    const handleView = (requerimento: Requerimento) => {
        setSelectedRequerimento(requerimento);
        setShowViewModal(true);
    };

    const handleUpdate = async (data: RequerimentoFormData) => {
        console.log('🏠 PÁGINA - handleUpdate recebeu:', data);
        console.log('🏠 PÁGINA - Tipo de cobrança:', data.tipo_cobranca);
        console.log('🏠 PÁGINA - Horas análise EF:', data.horas_analise_ef);
        
        if (!selectedRequerimento) return;
        
        try {
            // Atualizar o requerimento principal
            console.log('🏠 PÁGINA - Atualizando requerimento principal...');
            await updateRequerimento.mutateAsync({
                id: selectedRequerimento.id,
                data
            });
            console.log('🏠 PÁGINA - Requerimento principal atualizado');
            
            // Se mudou para "Reprovado" E há horas de análise EF, criar segundo requerimento
            if (data.tipo_cobranca === 'Reprovado' && data.horas_analise_ef) {
                const horasAnaliseNum = typeof data.horas_analise_ef === 'string' 
                    ? converterParaHorasDecimal(data.horas_analise_ef) 
                    : data.horas_analise_ef || 0;
                
                if (horasAnaliseNum > 0) {
                    console.log('🏠 PÁGINA - Criando requerimento adicional de Banco de Horas...');
                    
                    const requerimentoAnaliseEF: RequerimentoFormData = {
                        chamado: data.chamado,
                        cliente_id: data.cliente_id,
                        modulo: data.modulo,
                        descricao: data.descricao,
                        data_envio: data.data_envio,
                        data_aprovacao: data.data_aprovacao,
                        horas_funcional: data.horas_analise_ef,
                        horas_tecnico: 0,
                        linguagem: data.linguagem,
                        tipo_cobranca: 'Banco de Horas',
                        mes_cobranca: data.mes_cobranca,
                        observacao: 'Horas referentes a análise e elaboração da EF',
                        valor_hora_funcional: undefined,
                        valor_hora_tecnico: undefined,
                        tipo_hora_extra: undefined,
                        quantidade_tickets: data.quantidade_tickets
                    };
                    
                    await createRequerimento.mutateAsync(requerimentoAnaliseEF);
                    console.log('🏠 PÁGINA - Requerimento adicional criado com sucesso');
                    screenReader.announceSuccess('Requerimento atualizado e requerimento de análise EF criado');
                }
            }
            
            setShowEditModal(false);
            setSelectedRequerimento(null);
        } catch (error) {
            console.error('🏠 PÁGINA - Erro ao atualizar:', error);
            screenReader.announceError('Erro ao atualizar requerimento');
        }
    };

    // Handler para confirmar modal de Reprovado
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
            <div className="space-y-6 max-w-full overflow-hidden">
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
                        <RequerimentosExportButtons
                            requerimentos={activeTab === 'nao-enviados' ? requerimentosFiltrados : []}
                            requerimentosEnviados={activeTab === 'enviados' ? requerimentosFiltrados : []}
                            estatisticas={statsRequerimentos}
                            disabled={isLoading || isLoadingEnviados}
                        />
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <StatsCardSkeleton key={i} />
                        ))
                    ) : (
                        <>
                            {/* Card combinado: Total + Tipos de Cobrança */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Total
                                        </CardTitle>
                                        <CardTitle className="text-xs lg:text-sm font-medium text-purple-600 flex items-center gap-2">
                                            <Tags className="h-4 w-4" />
                                            Tipos de Cobrança
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-start justify-between">
                                        <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                                            {statsRequerimentos.total}
                                        </div>
                                        <div className="text-xl lg:text-2xl font-bold text-purple-600">
                                            {Object.keys(statsRequerimentos.porTipo).length}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Card Total Horas */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs lg:text-sm font-medium text-blue-600 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Total Horas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="text-xl lg:text-2xl font-bold text-blue-600">
                                        {formatarHorasParaExibicao(statsRequerimentos.selecionados > 0 
                                            ? statsRequerimentos.horasSelecionados 
                                            : statsRequerimentos.totalHoras, 'completo')}
                                    </div>
                                    {statsRequerimentos.selecionados > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {statsRequerimentos.selecionados} selecionado{statsRequerimentos.selecionados > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            
                            {/* Card Valor Total */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs lg:text-sm font-medium text-green-600 flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Valor Total
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="text-xl lg:text-2xl font-bold text-green-600">
                                        R$ {statsRequerimentos.valorTotal.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {/* Card Valores Selecionados */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs lg:text-sm font-medium text-orange-600 flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Valores Selecionados
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="text-xl lg:text-2xl font-bold text-orange-600">
                                        R$ {(statsRequerimentos.valorSelecionados || 0).toLocaleString('pt-BR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </div>
                                    {statsRequerimentos.selecionados > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {statsRequerimentos.selecionados} selecionado{statsRequerimentos.selecionados > 1 ? 's' : ''}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Navegação de Período para aba de Histórico */}
                {activeTab === 'enviados' && (
                    <Card>
                        <CardContent className="py-3">
                            <div className="flex items-center justify-between gap-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const [mes, ano] = (filtrosEnviados.mes_cobranca || '').split('/');
                                        const mesAtual = parseInt(mes) || new Date().getMonth() + 1;
                                        const anoAtual = parseInt(ano) || new Date().getFullYear();

                                        let novoMes = mesAtual - 1;
                                        let novoAno = anoAtual;

                                        if (novoMes < 1) {
                                            novoMes = 12;
                                            novoAno = anoAtual - 1;
                                        }

                                        const novoMesCobranca = `${String(novoMes).padStart(2, '0')}/${novoAno}`;
                                        handleFiltroEnviadosChange('mes_cobranca', novoMesCobranca);
                                    }}
                                    className="flex items-center gap-2"
                                    aria-label="Mês anterior"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </Button>

                                <div className="text-center">
                                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {(() => {
                                            const [mes, ano] = (filtrosEnviados.mes_cobranca || '').split('/');
                                            const mesNum = parseInt(mes) || new Date().getMonth() + 1;
                                            const anoNum = parseInt(ano) || new Date().getFullYear();

                                            const mesesNomes = [
                                                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                                                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                                            ];

                                            return `${mesesNomes[mesNum - 1]} ${anoNum}`;
                                        })()}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {requerimentosFiltrados.length} requerimento{requerimentosFiltrados.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const [mes, ano] = (filtrosEnviados.mes_cobranca || '').split('/');
                                        const mesAtual = parseInt(mes) || new Date().getMonth() + 1;
                                        const anoAtual = parseInt(ano) || new Date().getFullYear();

                                        let novoMes = mesAtual + 1;
                                        let novoAno = anoAtual;

                                        if (novoMes > 12) {
                                            novoMes = 1;
                                            novoAno = anoAtual + 1;
                                        }

                                        const novoMesCobranca = `${String(novoMes).padStart(2, '0')}/${novoAno}`;
                                        handleFiltroEnviadosChange('mes_cobranca', novoMesCobranca);
                                    }}
                                    className="flex items-center gap-2"
                                    aria-label="Próximo mês"
                                >
                                    Próximo
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Sistema de Abas - Estilo igual ao EmailConfig */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4 max-w-full overflow-hidden">
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
                        <Card className="w-full max-[1366px]:max-w-[1190px] max-[1366px]:mx-auto">
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
                                                    // Mostrar botão "Limpar Filtro" se houver filtros ativos
                                                    (filtros.busca || filtros.modulo || filtros.tipo_cobranca || filtros.mes_cobranca || filtros.data_inicio || filtros.data_fim) ? (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={limparFiltros}
                                                            className="whitespace-nowrap"
                                                            aria-label="Limpar todos os filtros aplicados"
                                                        >
                                                            <Filter className="h-4 w-4 mr-2" />
                                                            Limpar Filtro
                                                        </Button>
                                                    ) : null
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
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

                                            {/* Período de Cobrança */}
                                            <div>
                                                <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                                                <MonthYearPicker
                                                    value={filtros.mes_cobranca || ''}
                                                    onChange={(value) => handleFiltroChange('mes_cobranca', value)}
                                                    placeholder="Todos os períodos"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-4 overflow-x-auto">

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
                                            {filtros.busca || filtros.modulo || filtros.tipo_cobranca
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
                                            totalFilteredCount={requerimentosFiltrados.length} // Total de requerimentos filtrados
                                        />

                                        {/* Paginação */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                                            {/* Select de itens por página */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                                                <Select
                                                    value={itemsPerPage.toString()}
                                                    onValueChange={(value) => {
                                                        const newValue = value === 'todos' ? requerimentosFiltrados.length : parseInt(value);
                                                        setItemsPerPage(newValue);
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
                                                        <SelectItem value="todos">Todos</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Navegação de páginas */}
                                            {paginatedData.totalPages > 1 && (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={!paginatedData.hasPrevPage}
                                                        aria-label="Página anterior"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                                        Página {currentPage} de {paginatedData.totalPages}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                                                        disabled={!paginatedData.hasNextPage}
                                                        aria-label="Próxima página"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Contador de registros */}
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {paginatedData.startIndex}-{paginatedData.endIndex} de {paginatedData.totalItems} requerimentos
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="enviados">
                        <Card className="w-full max-[1366px]:max-w-[1190px] max-[1366px]:mx-auto">
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
                                            // Mostrar botão "Limpar Filtro" se houver filtros ativos
                                            (filtrosEnviados.busca || 
                             filtrosEnviados.modulo || 
                             filtrosEnviados.tipo_cobranca || 
                             (filtrosEnviados.mes_cobranca && filtrosEnviados.mes_cobranca !== getDefaultMesCobranca()) ||
                             filtrosEnviados.data_inicio || 
                             filtrosEnviados.data_fim) ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={limparFiltrosEnviados}
                                                    className="whitespace-nowrap"
                                                    aria-label="Limpar todos os filtros aplicados"
                                                >
                                                    <Filter className="h-4 w-4 mr-2" />
                                                    Limpar Filtro
                                                </Button>
                                            ) : null
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

                                {/* Filtros para Enviados - Movidos para cima */}
                                {showFiltersEnviados && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                                <MultiSelect
                                                    options={moduloOptions}
                                                    selected={Array.isArray(filtrosEnviados.modulo) ? filtrosEnviados.modulo : filtrosEnviados.modulo ? [filtrosEnviados.modulo] : []}
                                                    onChange={(values) => handleFiltroEnviadosChange('modulo', values.length > 0 ? values : undefined)}
                                                    placeholder="Todos os módulos"
                                                    maxCount={2}
                                                />
                                            </div>

                                            {/* Tipo de Cobrança */}
                                            <div>
                                                <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                                                <MultiSelect
                                                    options={tipoCobrancaOptions}
                                                    selected={Array.isArray(filtrosEnviados.tipo_cobranca) ? filtrosEnviados.tipo_cobranca : filtrosEnviados.tipo_cobranca ? [filtrosEnviados.tipo_cobranca] : []}
                                                    onChange={(values) => handleFiltroEnviadosChange('tipo_cobranca', values.length > 0 ? values : undefined)}
                                                    placeholder="Todos os tipos"
                                                    maxCount={2}
                                                />
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
                                    </div>
                                )}

                            </CardHeader>
                            <CardContent className="space-y-4 overflow-x-auto">

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
                                            {filtrosEnviados.busca || filtrosEnviados.modulo || filtrosEnviados.tipo_cobranca
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
                                            onView={handleView} // Função para visualizar
                                            selectedRequerimentos={selectedRequerimentosEnviados}
                                            onToggleSelection={toggleRequerimentoSelection}
                                            onSelectAll={selectAllRequerimentos}
                                            onClearSelection={clearSelection}
                                            showEnviarFaturamento={false} // Não mostrar botão de enviar
                                            showActions={true} // Mostrar coluna de ações
                                            showEditDelete={false} // Não mostrar botões de editar/excluir (apenas visualizar)
                                            totalFilteredCount={requerimentosFiltrados.length} // Total de requerimentos filtrados
                                        />

                                        {/* Paginação */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                                            {/* Select de itens por página */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                                                <Select
                                                    value={itemsPerPage.toString()}
                                                    onValueChange={(value) => {
                                                        const newValue = value === 'todos' ? requerimentosFiltrados.length : parseInt(value);
                                                        setItemsPerPage(newValue);
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
                                                        <SelectItem value="todos">Todos</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Navegação de páginas */}
                                            {paginatedData.totalPages > 1 && (
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={!paginatedData.hasPrevPage}
                                                        aria-label="Página anterior"
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </Button>
                                                    <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                                        Página {currentPage} de {paginatedData.totalPages}
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                                                        disabled={!paginatedData.hasNextPage}
                                                        aria-label="Próxima página"
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Contador de registros */}
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {paginatedData.startIndex}-{paginatedData.endIndex} de {paginatedData.totalItems} requerimentos
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Modal de Criação */}
                <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Novo Requerimento</DialogTitle>
                        </DialogHeader>
                        <RequerimentoMultiploForm
                            onSubmit={handleCreateMultiplo}
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

                {/* Modal de Visualização */}
                <RequerimentoViewModal
                    requerimento={selectedRequerimento}
                    open={showViewModal}
                    onClose={() => {
                        setShowViewModal(false);
                        setSelectedRequerimento(null);
                    }}
                />

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


            </div>
        </AdminLayout>
    );
};

export default LancarRequerimentos;