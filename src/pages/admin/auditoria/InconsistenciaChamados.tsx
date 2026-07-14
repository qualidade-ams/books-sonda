import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { 
  AlertTriangle, 
  Calendar, 
  Clock, 
  AlertCircle,
  Filter,
  X,
  Search,
  Download,
  Eye,
  Send,
  ChevronLeft,
  ChevronRight,
  History,
  Mail,
  Paperclip,
  ClipboardList,
  Settings
} from 'lucide-react';
import { 
  useInconsistenciasChamados, 
  useInconsistenciasEstatisticas,
  useHistoricoInconsistencias,
  useEnviarNotificacao
} from '@/hooks/useInconsistenciasChamados';
import type { InconsistenciasChamadosFiltros } from '@/types/inconsistenciasChamados';
import { 
  TIPO_INCONSISTENCIA_LABELS, 
  TIPO_INCONSISTENCIA_COLORS,
  ORIGEM_LABELS,
  ORIGEM_COLORS
} from '@/types/inconsistenciasChamados';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_ITEMS_PER_PAGE = 25;

export default function InconsistenciaChamados() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('inconsistencias_detectadas');
  const [showFilters, setShowFilters] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInconsistencia, setSelectedInconsistencia] = useState<any>(null);
  
  // Estado de período (ano)
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  
  // Estado de filtros (sem filtros de data iniciais)
  const [filtros, setFiltros] = useState<InconsistenciasChamadosFiltros>({
    busca: '',
    tipo_inconsistencia: 'all',
    origem: 'all',
    analista: ''
    // data_inicio e data_fim serão definidos pelo useEffect
  });

  // Atualizar filtros quando ano mudar
  const atualizarFiltrosPorAno = (ano: number) => {
    const primeiroDia = `${ano}-01-01`;
    const ultimoDia = `${ano}-12-31`;
    
    console.log('📅 Definindo filtros de período (ano):', {
      ano,
      data_inicio: primeiroDia,
      data_fim: ultimoDia
    });
    
    setFiltros(prev => ({
      ...prev,
      data_inicio: primeiroDia,
      data_fim: ultimoDia
    }));
  };

  // Atualizar filtros quando componente montar ou ano mudar
  useEffect(() => {
    console.log('🔍 Atualizando filtros por ano:', { anoAtual });
    atualizarFiltrosPorAno(anoAtual);
  }, [anoAtual]);

  // Estado de seleção múltipla
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Estado de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // Estado do formulário de email
  const [emailForm, setEmailForm] = useState({
    destinatarios: '',
    cc: '',
    bcc: '',
    assunto: `${t('inconsistencias.inconsistenciasDetectadas')} - ${anoAtual}`,
    anexos: [] as File[]
  });

  // Hooks
  const { inconsistencias, isLoading, refetch } = useInconsistenciasChamados(filtros);
  const { estatisticas, isLoading: isLoadingStats } = useInconsistenciasEstatisticas(filtros);
  const { historico, isLoading: isLoadingHistorico } = useHistoricoInconsistencias(anoAtual);
  const { enviarNotificacao, isEnviando } = useEnviarNotificacao();

  // Extrair lista única de analistas das inconsistências
  const analistasUnicos = Array.from(
    new Set(
      inconsistencias
        .map(inc => inc.analista)
        .filter(analista => analista && analista.trim() !== '')
    )
  ).sort();

  // Navegação de ano
  const navegarAnoAnterior = () => {
    setAnoAtual(anoAtual - 1);
    setCurrentPage(1);
  };

  const navegarAnoProximo = () => {
    setAnoAtual(anoAtual + 1);
    setCurrentPage(1);
  };

  // Verificar se há filtros ativos (excluindo filtros de período padrão)
  const hasActiveFilters = () => {
    return (
      filtros.busca !== '' ||
      filtros.tipo_inconsistencia !== 'all' ||
      filtros.origem !== 'all' ||
      filtros.analista !== ''
      // Não incluir data_inicio e data_fim pois são filtros padrão do período
    );
  };

  // Limpar filtros (mantendo filtros de período)
  const limparFiltros = () => {
    setFiltros(prev => ({
      ...prev,
      busca: '',
      tipo_inconsistencia: 'all',
      origem: 'all',
      analista: ''
      // Manter data_inicio e data_fim do período atual
    }));
  };

  // Seleção múltipla
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentPageIds = paginatedInconsistencias.map(inc => inc.id);
      setSelectedIds(currentPageIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  // Enviar notificações
  const handleAbrirModalEmail = async () => {
    const selecionadas = inconsistencias.filter(inc => selectedIds.includes(inc.id));
    
    if (selecionadas.length === 0) {
      toast({
        title: t('inconsistencias.noInconsistencySelected'),
        description: t('inconsistencias.selectAtLeastOne'),
        variant: "destructive"
      });
      return;
    }

    // Buscar emails dos analistas
    const analistasUnicos = Array.from(
      new Set(selecionadas.map(inc => inc.analista).filter(Boolean))
    );

    const emails: string[] = [];

    for (const analista of analistasUnicos) {
      try {
        // Buscar email do analista na tabela especialistas
        const { data, error } = await supabase
          .from('especialistas')
          .select('email')
          .ilike('nome', `%${analista}%`)
          .limit(1)
          .maybeSingle();

        if (!error && data?.email) {
          emails.push(data.email);
        }
      } catch (error) {
        console.error(`Erro ao buscar email do analista ${analista}:`, error);
      }
    }

    // Atualizar formulário com emails encontrados
    setEmailForm({
      destinatarios: emails.join('; '),
      cc: '',
      bcc: '',
      assunto: `${t('inconsistencias.inconsistenciasDetectadas')} - ${anoAtual}`,
      anexos: []
    });

    setShowEmailModal(true);
  };

  const handleEnviarNotificacoes = () => {
    const selecionadas = inconsistencias.filter(inc => selectedIds.includes(inc.id));
    
    // Validar campos obrigatórios
    if (!emailForm.destinatarios.trim()) {
      toast({
        title: t('inconsistencias.recipientsRequired'),
        description: t('inconsistencias.enterAtLeastOneRecipient'),
        variant: "destructive"
      });
      return;
    }

    enviarNotificacao({
      inconsistencias: selecionadas,
      ano_referencia: anoAtual
    }, {
      onSuccess: () => {
        toast({
          title: t('inconsistencias.notificationsSent'),
          description: t('inconsistencias.notificationsSentDesc', { count: selecionadas.length })
        });
        setSelectedIds([]);
        setShowEmailModal(false);
        // Limpar formulário
        setEmailForm({
          destinatarios: '',
          cc: '',
          bcc: '',
          assunto: `${t('inconsistencias.inconsistenciasDetectadas')} - ${anoAtual}`,
          anexos: []
        });
        refetch();
      },
      onError: (error) => {
        toast({
          title: t('inconsistencias.sendError'),
          description: error instanceof Error ? error.message : t('common.error'),
          variant: "destructive"
        });
      }
    });
  };

  const handleAnexoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novosAnexos = Array.from(e.target.files);
      const totalSize = [...emailForm.anexos, ...novosAnexos].reduce((acc, file) => acc + file.size, 0);
      
      // Limite de 25MB
      if (totalSize > 25 * 1024 * 1024) {
        toast({
          title: t('inconsistencias.attachmentLimitExceeded'),
          description: t('inconsistencias.attachmentLimitDesc'),
          variant: "destructive"
        });
        return;
      }

      setEmailForm({
        ...emailForm,
        anexos: [...emailForm.anexos, ...novosAnexos]
      });
    }
  };

  const handleRemoverAnexo = (index: number) => {
    setEmailForm({
      ...emailForm,
      anexos: emailForm.anexos.filter((_, i) => i !== index)
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Paginação
  const totalPages = Math.ceil(inconsistencias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInconsistencias = inconsistencias.slice(startIndex, endIndex);

  // Resetar página ao mudar itens por página
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  // Formatar data com segundos
  const formatarData = (data: string | null) => {
    if (!data) return '-';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('inconsistencias.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('inconsistencias.subtitle')}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('common.export')}
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAbrirModalEmail}
                  disabled={isEnviando}
                  className="bg-sonda-blue hover:bg-sonda-dark-blue"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('inconsistencias.sendEmail')} ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {t('inconsistencias.totalInconsistencies')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticas?.total || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-yellow-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('inconsistencias.differentMonth')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold text-yellow-600">
                    {estatisticas?.por_tipo.mes_diferente || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-red-600">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t('inconsistencias.invertedDate')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold text-red-600">
                    {estatisticas?.por_tipo.data_invertida || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('inconsistencias.excessiveTime')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold text-orange-600">
                    {estatisticas?.por_tipo.tempo_excessivo || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-purple-600">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t('inconsistencias.ic999999')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold text-purple-600">
                    {estatisticas?.por_tipo.ic_999999 || 0}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-sky-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('inconsistencias.noUpdate16Days')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-xl lg:text-2xl font-bold text-sky-600">
                    {estatisticas?.por_tipo.sem_atualizacao || 0}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Navegação por Ano */}
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navegarAnoAnterior}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('common.previous')}
                </Button>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {anoAtual}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navegarAnoProximo}
                  className="flex items-center gap-1"
                >
                  {t('common.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="inconsistencias_detectadas"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('inconsistencias.tabDetected')} ({inconsistencias.length})
              </TabsTrigger>
              <TabsTrigger 
                value="historico_de_inconsistencias"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                {t('inconsistencias.tabHistory')} ({historico.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Inconsistências Detectadas */}
            <TabsContent value="inconsistencias_detectadas" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      {t('inconsistencias.detectedTitle')}
                    </CardTitle>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        {t('common.filter')}
                      </Button>

                      {hasActiveFilters() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={limparFiltros}
                          className="hover:border-red-300"
                        >
                          <X className="h-4 w-4 mr-2 text-red-600" />
                          {t('common.clearFilter')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filtros */}
                  {showFilters && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm font-medium mb-2">{t('common.search')}</div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder={t('inconsistencias.searchPlaceholder')}
                              value={filtros.busca}
                              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                              className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">{t('common.type')}</div>
                          <Select
                            value={filtros.tipo_inconsistencia}
                            onValueChange={(value: any) => setFiltros({ ...filtros, tipo_inconsistencia: value })}
                          >
                            <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('common.all')}</SelectItem>
                              <SelectItem value="mes_diferente">{t('inconsistencias.differentMonth')}</SelectItem>
                              <SelectItem value="data_invertida">{t('inconsistencias.invertedDate')}</SelectItem>
                              <SelectItem value="tempo_excessivo">{t('inconsistencias.excessiveTime')}</SelectItem>
                              <SelectItem value="ic_999999">{t('inconsistencias.ic999999')}</SelectItem>
                              <SelectItem value="sem_atualizacao">{t('inconsistencias.noUpdate16Days')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">{t('inconsistencias.analyst')}</div>
                          <Select
                            value={filtros.analista || 'all'}
                            onValueChange={(value: any) => setFiltros({ ...filtros, analista: value === 'all' ? '' : value })}
                          >
                            <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                              <SelectValue placeholder={t('inconsistencias.allAnalysts')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('inconsistencias.allAnalysts')}</SelectItem>
                              {analistasUnicos.map((analista) => (
                                <SelectItem key={analista} value={analista}>
                                  {analista}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">{t('inconsistencias.origin')}</div>
                          <Select
                            value={filtros.origem || 'all'}
                            onValueChange={(value: any) => setFiltros({ ...filtros, origem: value })}
                          >
                            <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('inconsistencias.allOrigins')}</SelectItem>
                              <SelectItem value="apontamentos">{t('inconsistencias.originAppointments')}</SelectItem>
                              <SelectItem value="tickets">{t('inconsistencias.originTickets')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="overflow-x-auto">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : paginatedInconsistencias.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2 font-medium">
                          {t('inconsistencias.noInconsistencyFound')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox 
                                checked={selectedIds.length === paginatedInconsistencias.length && paginatedInconsistencias.length > 0}
                                onCheckedChange={handleSelectAll}
                              />
                            </TableHead>
                            <TableHead className="w-[120px] text-center">{t('inconsistencias.ticketNumber')}</TableHead>
                            <TableHead className="w-[100px] text-center">{t('inconsistencias.taskNumber')}</TableHead>
                            <TableHead className="w-[150px] text-center">{t('common.type')}</TableHead>
                            <TableHead className="w-[150px] text-center">{t('inconsistencias.openDate')}</TableHead>
                            <TableHead className="w-[150px] text-center">{t('inconsistencias.activityDate')}</TableHead>
                            <TableHead className="w-[150px] text-center">{t('inconsistencias.systemDate')}</TableHead>
                            <TableHead className="w-[100px] text-center">{t('inconsistencias.time')}</TableHead>
                            <TableHead className="w-[180px] text-center">{t('historico.company')}</TableHead>
                            <TableHead className="w-[150px] text-center">{t('inconsistencias.analyst')}</TableHead>
                            <TableHead className="text-center w-[120px]">{t('common.actions')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedInconsistencias.map((inc) => (
                            <TableRow key={inc.id} className="hover:bg-gray-50">
                              <TableCell>
                                <Checkbox 
                                  checked={selectedIds.includes(inc.id)}
                                  onCheckedChange={(checked) => handleSelectItem(inc.id, checked as boolean)}
                                />
                              </TableCell>
                              
                              {/* Coluna Nº Chamado com ícone de origem */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                  {/* Ícone de origem */}
                                  <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  {/* Número do chamado */}
                                  <span className="font-mono text-foreground text-xs sm:text-sm">{inc.nro_chamado}</span>
                                </div>
                              </TableCell>
                              
                              {/* Coluna N Tarefa */}
                              <TableCell className="text-center">
                                <span className="font-mono text-xs sm:text-sm">{inc.nro_tarefa || '-'}</span>
                              </TableCell>
                              
                              {/* Coluna Tipo */}
                              <TableCell className="text-center">
                                <Badge className={TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]}>
                                  {TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}
                                </Badge>
                              </TableCell>
                              
                              {/* Coluna Data Abertura */}
                              <TableCell className="text-center">
                                <span className="text-xs sm:text-sm">{formatarData(inc.data_abertura)}</span>
                              </TableCell>
                              
                              {/* Coluna Data Atividade */}
                              <TableCell className="text-center">
                                <span className="text-xs sm:text-sm">{formatarData(inc.data_atividade)}</span>
                              </TableCell>
                              
                              {/* Coluna Data Sistema */}
                              <TableCell className="text-center">
                                <span className="text-xs sm:text-sm">{formatarData(inc.data_sistema)}</span>
                              </TableCell>
                              
                              {/* Coluna Tempo */}
                              <TableCell className="text-center">
                                <span className="font-mono text-xs sm:text-sm">
                                  {inc.tempo_gasto_horas || '-'}
                                </span>
                              </TableCell>
                              
                              {/* Coluna Empresa */}
                              <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                                <span>{inc.empresa || '-'}</span>
                              </TableCell>
                              
                              {/* Coluna Analista */}
                              <TableCell className="text-xs sm:text-sm text-center">
                                <span>{inc.analista || '-'}</span>
                              </TableCell>
                              
                              {/* Coluna Ações */}
                              <TableCell className="text-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    setSelectedInconsistencia(inc);
                                    setShowViewModal(true);
                                  }}
                                  title={t('inconsistencias.viewDetails')}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Paginação */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-2 py-4 border-t">
                          {/* Seletor de itens por página */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{t('historico.show')}</span>
                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
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
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              aria-label="Página anterior"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                              {t('historico.pageOf', { current: currentPage, total: totalPages })}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              aria-label="Próxima página"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Contador de registros */}
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {startIndex + 1}-{Math.min(endIndex, inconsistencias.length)} de {inconsistencias.length} {t('inconsistencias.inconsistenciesCount')}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="historico_de_inconsistencias" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    {t('inconsistencias.historyTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {isLoadingHistorico ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : historico.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2 font-medium">
                          {t('inconsistencias.noHistoryFound')}
                        </p>
                        <p className="text-sm text-gray-400">
                          {t('inconsistencias.sentInconsistenciesHere')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px] text-center">{t('inconsistencias.ticketNumber')}</TableHead>
                          <TableHead className="w-[150px] text-center">{t('common.type')}</TableHead>
                          <TableHead className="w-[150px] text-center">{t('inconsistencias.analyst')}</TableHead>
                          <TableHead className="w-[180px] text-center">{t('historico.company')}</TableHead>
                          <TableHead className="w-[150px] text-center">{t('inconsistencias.sendDate')}</TableHead>
                          <TableHead className="w-[150px] text-center">{t('inconsistencias.sentBy')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historico.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            {/* Coluna Nº Chamado com ícone de origem */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                {/* Ícone de origem */}
                                <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                {/* Número do chamado */}
                                <span className="font-mono text-foreground text-xs sm:text-sm">{item.nro_chamado}</span>
                              </div>
                            </TableCell>
                            
                            {/* Coluna Tipo */}
                            <TableCell className="text-center">
                              <Badge className={TIPO_INCONSISTENCIA_COLORS[item.tipo_inconsistencia]}>
                                {TIPO_INCONSISTENCIA_LABELS[item.tipo_inconsistencia]}
                              </Badge>
                            </TableCell>
                            
                            {/* Coluna Analista */}
                            <TableCell className="text-xs sm:text-sm text-center">
                              <span>{item.analista || '-'}</span>
                            </TableCell>
                            
                            {/* Coluna Empresa */}
                            <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                              <span>{item.empresa || '-'}</span>
                            </TableCell>
                            
                            {/* Coluna Data Envio */}
                            <TableCell className="text-center">
                              <span className="text-xs sm:text-sm">{formatarData(item.data_envio)}</span>
                            </TableCell>
                            
                            {/* Coluna Enviado Por */}
                            <TableCell className="text-xs sm:text-sm text-center">
                              <span>{item.enviado_por_nome || '-'}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('inconsistencias.detailsTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {t('inconsistencias.detailsDescription')}
            </DialogDescription>
          </DialogHeader>

          {selectedInconsistencia && (
            <div className="space-y-4 py-4">
              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.ticketNumber')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <ClipboardList className="h-4 w-4 text-blue-600" />
                    <span className="font-mono text-sm">{selectedInconsistencia.nro_chamado}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.inconsistencyType')}</Label>
                  <div className="mt-1">
                    <Badge className={TIPO_INCONSISTENCIA_COLORS[selectedInconsistencia.tipo_inconsistencia]}>
                      {TIPO_INCONSISTENCIA_LABELS[selectedInconsistencia.tipo_inconsistencia]}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.activityDate')}</Label>
                  <p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_atividade)}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.systemDate')}</Label>
                  <p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_sistema)}</p>
                </div>
              </div>

              {/* Tempo e Empresa */}
              <div className="grid grid-cols-2 gap-4">
                {selectedInconsistencia.tempo_gasto_horas && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.timeSpent')}</Label>
                    <p className="text-sm font-mono mt-1">{selectedInconsistencia.tempo_gasto_horas}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('historico.company')}</Label>
                  <p className="text-sm mt-1">{selectedInconsistencia.empresa || '-'}</p>
                </div>
              </div>

              {/* Analista */}
              {selectedInconsistencia.analista && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.analyst')}</Label>
                  <p className="text-sm mt-1">{selectedInconsistencia.analista}</p>
                </div>
              )}

              {/* Descrição da Inconsistência */}
              <div>
                <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.inconsistencyDescription')}</Label>
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{selectedInconsistencia.descricao_inconsistencia}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowViewModal(false)}
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Envio de Email */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('inconsistencias.emailTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {t('inconsistencias.emailDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Destinatários */}
            <div className="space-y-2">
              <Label htmlFor="destinatarios" className="text-sm font-medium text-gray-700">
                {t('inconsistencias.recipients')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="destinatarios"
                placeholder={t('inconsistencias.recipientsPlaceholder')}
                value={emailForm.destinatarios}
                onChange={(e) => setEmailForm({ ...emailForm, destinatarios: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[80px]"
              />
            </div>

            {/* CC */}
            <div className="space-y-2">
              <Label htmlFor="cc" className="text-sm font-medium text-gray-700">
                {t('inconsistencias.ccRecipients')}
              </Label>
              <Textarea
                id="cc"
                placeholder={t('inconsistencias.recipientsPlaceholder')}
                value={emailForm.cc}
                onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
              />
            </div>

            {/* BCC */}
            <div className="space-y-2">
              <Label htmlFor="bcc" className="text-sm font-medium text-gray-700">
                {t('inconsistencias.bccRecipients')}
              </Label>
              <Textarea
                id="bcc"
                placeholder={t('inconsistencias.recipientsPlaceholder')}
                value={emailForm.bcc}
                onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
              />
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="assunto" className="text-sm font-medium text-gray-700">
                {t('inconsistencias.emailSubject')}
              </Label>
              <Input
                id="assunto"
                value={emailForm.assunto}
                onChange={(e) => setEmailForm({ ...emailForm, assunto: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>

            {/* Anexos */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('inconsistencias.attachments')}
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="flex items-center gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  {t('inconsistencias.addFiles')}
                </Button>
                <span className="text-xs text-gray-500">{t('inconsistencias.totalLimit')}</span>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={handleAnexoChange}
                className="hidden"
              />
              
              {/* Lista de anexos */}
              {emailForm.anexos.length > 0 && (
                <div className="space-y-2 mt-3">
                  {emailForm.anexos.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                      <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoverAnexo(index)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview do Relatório */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                {t('inconsistencias.emailPreview')}
              </Label>
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded border max-h-[300px] overflow-y-auto">
                <div className="space-y-3">
                  {/* Header Preview */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded text-center">
                    <div className="font-bold text-lg">{t('inconsistencias.previewHeader')}</div>
                    <div className="text-sm mt-1">{anoAtual}</div>
                  </div>

                  {/* Intro */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="text-yellow-800 text-xs">
                      <strong>{t('inconsistencias.previewAttention')}</strong>
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="font-semibold text-blue-900 text-xs mb-2">{t('inconsistencias.previewSummary')}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-900">{selectedIds.length}</div>
                        <div className="text-xs text-blue-600">{t('common.total')}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-900">
                          {inconsistencias.filter(inc => selectedIds.includes(inc.id) && inc.tipo_inconsistencia === 'mes_diferente').length}
                        </div>
                        <div className="text-xs text-blue-600">{t('inconsistencias.differentMonth')}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-900">
                          {inconsistencias.filter(inc => selectedIds.includes(inc.id) && inc.tipo_inconsistencia === 'data_invertida').length}
                        </div>
                        <div className="text-xs text-blue-600">{t('inconsistencias.invertedDate')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Cards */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700 border-b pb-1">
                      {t('inconsistencias.previewExample')} ({selectedIds.length})
                    </div>
                    {inconsistencias
                      .filter(inc => selectedIds.includes(inc.id))
                      .slice(0, 2)
                      .map((inc) => (
                        <div key={inc.id} className="bg-gray-100 border rounded p-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-mono text-xs font-semibold">
                              {inc.origem === 'apontamentos' ? '📋' : '🎫'} {inc.nro_chamado}
                            </span>
                            <Badge className={`text-xs ${TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]}`}>
                              {TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {inc.descricao_inconsistencia.substring(0, 80)}...
                          </div>
                        </div>
                      ))}
                    {selectedIds.length > 2 && (
                      <div className="text-xs text-gray-500 text-center py-1">
                        {t('inconsistencias.additionalInconsistencies', { count: selectedIds.length - 2 })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEmailModal(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleEnviarNotificacoes}
              disabled={isEnviando || !emailForm.destinatarios.trim()}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Send className="h-4 w-4 mr-2" />
              {isEnviando ? t('inconsistencias.sending') : t('inconsistencias.sendEmail')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
