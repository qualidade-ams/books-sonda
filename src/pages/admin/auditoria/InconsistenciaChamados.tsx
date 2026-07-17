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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { 
  AlertTriangle, Calendar, Clock, Filter, X, Search, Download, Eye, Send,
  ChevronLeft, ChevronRight, History, Mail, Paperclip, ClipboardList, Settings, CheckCircle, Archive
} from 'lucide-react';
import { 
  useInconsistenciasChamados, useInconsistenciasEstatisticas,
  useInconsistenciasResolvidas, useHistoricoEmailsInconsistencias, useEnviarNotificacao,
  useArquivarInconsistencia
} from '@/hooks/useInconsistenciasChamados';
import type { InconsistenciasChamadosFiltros } from '@/types/inconsistenciasChamados';
import { TIPO_INCONSISTENCIA_LABELS, TIPO_INCONSISTENCIA_COLORS } from '@/types/inconsistenciasChamados';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { isClienteEspecialBRFONSDAGUIRRE } from '@/utils/clienteEspecialUtils';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';

const DEFAULT_ITEMS_PER_PAGE = 25;

export default function InconsistenciaChamados() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('inconsistencias_detectadas');
  const [showFilters, setShowFilters] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInconsistencia, setSelectedInconsistencia] = useState<any>(null);
  
  // Estado de período (ano e mês)
  const [anoAtual, setAnoAtual] = useState(Math.max(new Date().getFullYear(), 2024));
  const [mesAtual, setMesAtual] = useState<string>('all');
  
  // Estado de filtros
  const [filtros, setFiltros] = useState<InconsistenciasChamadosFiltros>({
    busca: '',
    tipo_inconsistencia: 'all',
    origem: 'all',
    analista: '',
    data_inicio: `${new Date().getFullYear()}-01-01`,
    data_fim: `${new Date().getFullYear()}-12-31`
  });

  // Atualizar filtros quando ano/mês mudar
  useEffect(() => {
    let primeiroDia: string;
    let ultimoDia: string;
    if (mesAtual === 'all') {
      primeiroDia = `${anoAtual}-01-01`;
      ultimoDia = `${anoAtual}-12-31`;
    } else {
      const mesNum = parseInt(mesAtual, 10);
      primeiroDia = `${anoAtual}-${mesAtual}-01`;
      const ultimoDiaDate = new Date(anoAtual, mesNum, 0);
      ultimoDia = `${anoAtual}-${mesAtual}-${String(ultimoDiaDate.getDate()).padStart(2, '0')}`;
    }
    setFiltros(prev => ({ ...prev, data_inicio: primeiroDia, data_fim: ultimoDia }));
  }, [anoAtual, mesAtual]);

  // Estado de seleção e paginação
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPageResolvidas, setCurrentPageResolvidas] = useState(1);

  // Estado do formulário de email
  const [emailForm, setEmailForm] = useState({
    destinatarios: '', cc: '', bcc: '',
    assunto: `${t('inconsistencias.inconsistenciasDetectadas')} - ${anoAtual}`,
    anexos: [] as File[]
  });

  // Hooks de dados
  const { inconsistencias, isLoading, refetch } = useInconsistenciasChamados(filtros);
  const { estatisticas, isLoading: isLoadingStats } = useInconsistenciasEstatisticas(filtros);
  const { resolvidas, isLoading: isLoadingResolvidas } = useInconsistenciasResolvidas(filtros);
  const { historico, isLoading: isLoadingHistorico } = useHistoricoEmailsInconsistencias(anoAtual);
  const { enviarNotificacao, isEnviando } = useEnviarNotificacao();
  const { arquivar, isArquivando, arquivarMultiplas, isArquivandoMultiplas } = useArquivarInconsistencia();

  // Query para empresas cadastradas (validação visual)
  const { data: empresasCadastradas } = useQuery({
    queryKey: ['empresas-nomes-cadastradas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas_clientes')
        .select('nome_abreviado')
        .order('nome_abreviado');
      if (error) throw error;
      return (data || []).map(e => e.nome_abreviado?.toUpperCase().trim()).filter(Boolean) as string[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const isEmpresaCadastrada = (nomeEmpresa: string | null) => {
    if (!nomeEmpresa || !empresasCadastradas) return true;
    return empresasCadastradas.includes(nomeEmpresa.toUpperCase().trim());
  };

  // Lista de analistas únicos das inconsistências ativas
  const analistasUnicos = Array.from(
    new Set(inconsistencias.map(inc => inc.analista).filter(a => a && a.trim() !== ''))
  ).sort() as string[];

  // Navegação de ano (mínimo: 2024)
  const navegarAnoAnterior = () => {
    if (anoAtual > 2024) { setAnoAtual(anoAtual - 1); setCurrentPage(1); }
  };
  const navegarAnoProximo = () => { setAnoAtual(anoAtual + 1); setCurrentPage(1); };

  // Filtros ativos
  const hasActiveFilters = () => {
    return filtros.busca !== '' || filtros.tipo_inconsistencia !== 'all' ||
      filtros.origem !== 'all' || filtros.analista !== '' || mesAtual !== 'all';
  };
  const limparFiltros = () => {
    setMesAtual('all');
    setFiltros(prev => ({ ...prev, busca: '', tipo_inconsistencia: 'all', origem: 'all', analista: '' }));
  };

  // Seleção múltipla
  const handleSelectAll = (checked: boolean) => {
    if (checked) { setSelectedIds(paginatedInconsistencias.map(inc => inc.id)); }
    else { setSelectedIds([]); }
  };
  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) { setSelectedIds([...selectedIds, id]); }
    else { setSelectedIds(selectedIds.filter(sid => sid !== id)); }
  };

  // Email - abrir modal
  const handleAbrirModalEmail = async () => {
    const selecionadas = inconsistencias.filter(inc => selectedIds.includes(inc.id));
    if (selecionadas.length === 0) {
      toast({ title: t('inconsistencias.noInconsistencySelected'), description: t('inconsistencias.selectAtLeastOne'), variant: "destructive" });
      return;
    }
    const analistasUnicos = Array.from(new Set(selecionadas.map(inc => inc.analista).filter(Boolean)));
    const emails: string[] = [];
    for (const analista of analistasUnicos) {
      try {
        const { data } = await supabase.from('especialistas').select('email').ilike('nome', `%${analista}%`).limit(1).maybeSingle();
        if (data?.email) emails.push(data.email);
      } catch (error) { console.error(`Erro ao buscar email de ${analista}:`, error); }
    }
    setEmailForm({ destinatarios: emails.join('; '), cc: '', bcc: '', assunto: `${t('inconsistencias.inconsistenciasDetectadas')} - ${anoAtual}`, anexos: [] });
    setShowEmailModal(true);
  };

  // Email - enviar
  const handleEnviarNotificacoes = () => {
    const selecionadas = inconsistencias.filter(inc => selectedIds.includes(inc.id));
    if (!emailForm.destinatarios.trim()) {
      toast({ title: t('inconsistencias.recipientsRequired'), description: t('inconsistencias.enterAtLeastOneRecipient'), variant: "destructive" });
      return;
    }
    enviarNotificacao({ inconsistencias: selecionadas, ano_referencia: anoAtual }, {
      onSuccess: () => {
        toast({ title: t('inconsistencias.notificationsSent'), description: t('inconsistencias.notificationsSentDesc', { count: selecionadas.length }) });
        setSelectedIds([]); setShowEmailModal(false);
        setEmailForm({ destinatarios: '', cc: '', bcc: '', assunto: `${t('inconsistencias.inconsistenciasDetectadas')} - ${anoAtual}`, anexos: [] });
        refetch();
      },
      onError: (error) => { toast({ title: t('inconsistencias.sendError'), description: error instanceof Error ? error.message : t('common.error'), variant: "destructive" }); }
    });
  };

  // Arquivar individual
  const handleArquivar = (id: string) => {
    arquivar(id, {
      onSuccess: () => {
        toast({ title: 'Inconsistência arquivada', description: 'O chamado foi movido para o Histórico de Inconsistências.' });
        setSelectedIds(prev => prev.filter(sid => sid !== id));
      },
      onError: (error) => {
        toast({ title: 'Erro ao arquivar', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      }
    });
  };

  // Arquivar múltiplos selecionados
  const handleArquivarSelecionados = () => {
    if (selectedIds.length === 0) {
      toast({ title: 'Nenhum item selecionado', description: 'Selecione ao menos uma inconsistência para arquivar.', variant: 'destructive' });
      return;
    }
    arquivarMultiplas(selectedIds, {
      onSuccess: () => {
        toast({ title: 'Inconsistências arquivadas', description: `${selectedIds.length} chamado(s) movido(s) para o Histórico de Inconsistências.` });
        setSelectedIds([]);
      },
      onError: (error) => {
        toast({ title: 'Erro ao arquivar', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      }
    });
  };

  // Anexos
  const handleAnexoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const novosAnexos = Array.from(e.target.files);
      const totalSize = [...emailForm.anexos, ...novosAnexos].reduce((acc, file) => acc + file.size, 0);
      if (totalSize > 25 * 1024 * 1024) {
        toast({ title: t('inconsistencias.attachmentLimitExceeded'), description: t('inconsistencias.attachmentLimitDesc'), variant: "destructive" });
        return;
      }
      setEmailForm({ ...emailForm, anexos: [...emailForm.anexos, ...novosAnexos] });
    }
  };
  const handleRemoverAnexo = (index: number) => {
    setEmailForm({ ...emailForm, anexos: emailForm.anexos.filter((_, i) => i !== index) });
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Paginação - Detectadas
  const totalPages = Math.ceil(inconsistencias.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInconsistencias = inconsistencias.slice(startIndex, endIndex);

  // Paginação - Resolvidas
  const totalPagesResolvidas = Math.ceil(resolvidas.length / itemsPerPage);
  const startIndexResolvidas = (currentPageResolvidas - 1) * itemsPerPage;
  const endIndexResolvidas = startIndexResolvidas + itemsPerPage;
  const paginatedResolvidas = resolvidas.slice(startIndexResolvidas, endIndexResolvidas);

  const handleItemsPerPageChange = (value: string) => { setItemsPerPage(Number(value)); setCurrentPage(1); setCurrentPageResolvidas(1); };

  // Formatar data (apenas dd/MM/yyyy)
  const formatarData = (data: string | null) => {
    if (!data) return '-';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Formatar data completa com horas (para tooltip)
  const formatarDataCompleta = (data: string | null) => {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Render empresa cell helper
  const renderEmpresaCell = (empresa: string | null, analista: string | null) => {
    const isClienteEspecial = isClienteEspecialBRFONSDAGUIRRE(empresa);
    if (isClienteEspecial) {
      return <ClienteNomeDisplay nomeEmpresa={empresa} nomeCliente={analista} className="inline font-medium" />;
    }
    return <span className={`font-medium ${!isEmpresaCadastrada(empresa) ? 'text-red-600' : ''}`}>{empresa || '-'}</span>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t('inconsistencias.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('inconsistencias.subtitle')}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />{t('common.export')}</Button>
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleArquivarSelecionados} disabled={isArquivandoMultiplas}>
                  <Archive className="h-4 w-4 mr-2" />Arquivar ({selectedIds.length})
                </Button>
                <Button size="sm" onClick={handleAbrirModalEmail} disabled={isEnviando} className="bg-sonda-blue hover:bg-sonda-dark-blue">
                  <Send className="h-4 w-4 mr-2" />{t('inconsistencias.sendEmail')} ({selectedIds.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{t('inconsistencias.totalInconsistencies')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{estatisticas?.total || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-yellow-600"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{t('inconsistencias.differentMonth')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-yellow-600">{estatisticas?.por_tipo.mes_diferente || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-orange-600"><div className="flex items-center gap-2"><Clock className="h-4 w-4" />{t('inconsistencias.excessiveTime')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-orange-600">{estatisticas?.por_tipo.tempo_excessivo || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-purple-600"><div className="flex items-center gap-2"><Settings className="h-4 w-4" />{t('inconsistencias.ic999999')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-purple-600">{estatisticas?.por_tipo.ic_999999 || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-sky-600"><div className="flex items-center gap-2"><Clock className="h-4 w-4" />{t('inconsistencias.noUpdate16Days')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-sky-600">{estatisticas?.por_tipo.sem_atualizacao || 0}</div>}</CardContent></Card>
        </div>

        {/* Navegação por Ano */}
        <Card><CardContent className="py-3 px-4"><div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={navegarAnoAnterior} disabled={anoAtual <= 2024} className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" />{t('common.previous')}</Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{anoAtual}</h2>
          <Button variant="outline" size="sm" onClick={navegarAnoProximo} className="flex items-center gap-1">{t('common.next')}<ChevronRight className="h-4 w-4" /></Button>
        </div></CardContent></Card>

        {/* Tabs - 3 Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="inconsistencias_detectadas" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium">
              {t('inconsistencias.tabDetected')} ({inconsistencias.length})
            </TabsTrigger>
            <TabsTrigger value="historico_resolvidas" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium">
              Histórico de Inconsistências ({resolvidas.length})
            </TabsTrigger>
            <TabsTrigger value="emails_enviados" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium">
              Emails Enviados ({historico.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Inconsistências Detectadas */}
          <TabsContent value="inconsistencias_detectadas" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{t('inconsistencias.detectedTitle')}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4 mr-2" />{t('common.filter')}</Button>
                    {hasActiveFilters() && (<Button variant="outline" size="sm" onClick={limparFiltros} className="hover:border-red-300"><X className="h-4 w-4 mr-2 text-red-600" />{t('common.clearFilter')}</Button>)}
                  </div>
                </div>
                {showFilters && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div><div className="text-sm font-medium mb-2">{t('common.search')}</div><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder={t('inconsistencias.searchPlaceholder')} value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue" /></div></div>
                      <div><div className="text-sm font-medium mb-2">{t('common.type')}</div><Select value={filtros.tipo_inconsistencia} onValueChange={(value: any) => setFiltros({ ...filtros, tipo_inconsistencia: value })}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('common.all')}</SelectItem><SelectItem value="mes_diferente">{t('inconsistencias.differentMonth')}</SelectItem><SelectItem value="tempo_excessivo">{t('inconsistencias.excessiveTime')}</SelectItem><SelectItem value="ic_999999">{t('inconsistencias.ic999999')}</SelectItem><SelectItem value="sem_atualizacao">{t('inconsistencias.noUpdate16Days')}</SelectItem></SelectContent></Select></div>
                      <div><div className="text-sm font-medium mb-2">{t('inconsistencias.analyst')}</div><Select value={filtros.analista || 'all'} onValueChange={(value: any) => setFiltros({ ...filtros, analista: value === 'all' ? '' : value })}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder={t('inconsistencias.allAnalysts')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('inconsistencias.allAnalysts')}</SelectItem>{analistasUnicos.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent></Select></div>
                      <div><div className="text-sm font-medium mb-2">{t('inconsistencias.origin')}</div><Select value={filtros.origem || 'all'} onValueChange={(value: any) => setFiltros({ ...filtros, origem: value })}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('inconsistencias.allOrigins')}</SelectItem><SelectItem value="apontamentos">{t('inconsistencias.originAppointments')}</SelectItem><SelectItem value="tickets">{t('inconsistencias.originTickets')}</SelectItem></SelectContent></Select></div>
                      <div><div className="text-sm font-medium mb-2">Mês</div><Select value={mesAtual} onValueChange={(value) => { setMesAtual(value); setCurrentPage(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem><SelectItem value="01">Janeiro</SelectItem><SelectItem value="02">Fevereiro</SelectItem><SelectItem value="03">Março</SelectItem><SelectItem value="04">Abril</SelectItem><SelectItem value="05">Maio</SelectItem><SelectItem value="06">Junho</SelectItem><SelectItem value="07">Julho</SelectItem><SelectItem value="08">Agosto</SelectItem><SelectItem value="09">Setembro</SelectItem><SelectItem value="10">Outubro</SelectItem><SelectItem value="11">Novembro</SelectItem><SelectItem value="12">Dezembro</SelectItem></SelectContent></Select></div>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="overflow-x-auto">
                {isLoading ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : paginatedInconsistencias.length === 0 ? (
                  <div className="flex items-center justify-center py-12"><div className="text-center"><AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500 mb-2 font-medium">{t('inconsistencias.noInconsistencyFound')}</p></div></div>
                ) : (
                  <>
                    <Table className="w-full text-xs sm:text-sm">
                      <TableHeader><TableRow>
                        <TableHead className="w-12 py-2"><Checkbox checked={selectedIds.length === paginatedInconsistencias.length && paginatedInconsistencias.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.ticketNumber')}</TableHead>
                        <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.taskNumber')}</TableHead>
                        <TableHead className="min-w-[90px] text-center text-xs sm:text-sm py-2">Status</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('common.type')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.openDate')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.activityDate')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.systemDate')}</TableHead>
                        <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.time')}</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('historico.company')}</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.analyst')}</TableHead>
                        <TableHead className="w-[60px] text-center text-xs sm:text-sm py-2">{t('common.actions')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {paginatedInconsistencias.map((inc) => (
                          <TableRow key={inc.id} className="hover:bg-gray-50">
                            <TableCell className="py-2"><Checkbox checked={selectedIds.includes(inc.id)} onCheckedChange={(checked) => handleSelectItem(inc.id, checked as boolean)} /></TableCell>
                            <TableCell className="text-center py-2"><div className="flex items-center justify-center gap-1 whitespace-nowrap"><ClipboardList className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" /><span className="font-medium text-xs sm:text-sm">{inc.nro_chamado}</span></div></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs">{inc.nro_tarefa || '-'}</span></TableCell>
                            <TableCell className="text-center py-2">{inc.status_chamado && inc.status_chamado.trim() !== '' ? <Badge variant="outline" className="border-sonda-blue text-sonda-blue text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap">{inc.status_chamado}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>
                            <TableCell className="text-center py-2"><Badge className={`${TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]} text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap`}>{TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}</Badge></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_abertura)}>{formatarData(inc.data_abertura)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_atividade)}>{formatarData(inc.data_atividade)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_sistema)}>{formatarData(inc.data_sistema)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-xs sm:text-sm font-medium">{inc.tempo_gasto_horas || '-'}</span></TableCell>
                            <TableCell className="text-center py-2 max-w-[120px]">{renderEmpresaCell(inc.empresa, inc.analista)}</TableCell>
                            <TableCell className="text-center py-2"><span className="text-xs sm:text-sm">{inc.analista || '-'}</span></TableCell>
                            <TableCell className="text-center py-2"><div className="flex justify-center gap-1"><Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedInconsistencia(inc); setShowViewModal(true); }} title={t('inconsistencias.viewDetails')}><Eye className="h-3.5 w-3.5 text-blue-600" /></Button><Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleArquivar(inc.id)} disabled={isArquivando} title="Arquivar"><Archive className="h-3.5 w-3.5 text-orange-600" /></Button></div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-2 py-4 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{t('historico.show')}</span>
                          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem><SelectItem value="500">500</SelectItem></SelectContent></Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">{t('historico.pageOf', { current: currentPage, total: totalPages })}</span>
                          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{startIndex + 1}-{Math.min(endIndex, inconsistencias.length)} de {inconsistencias.length} {t('inconsistencias.inconsistenciesCount')}</div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Histórico de Inconsistências (Resolvidas) */}
          <TabsContent value="historico_resolvidas" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" />Histórico de Inconsistências</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {isLoadingResolvidas ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : paginatedResolvidas.length === 0 ? (
                  <div className="flex items-center justify-center py-12"><div className="text-center"><CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500 mb-2 font-medium">Nenhuma inconsistência resolvida neste período</p><p className="text-sm text-gray-400">Quando analistas corrigirem chamados com inconsistências, eles aparecerão aqui</p></div></div>
                ) : (
                  <>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead className="w-[120px] text-center">{t('inconsistencias.ticketNumber')}</TableHead>
                        <TableHead className="w-[100px] text-center">{t('inconsistencias.taskNumber')}</TableHead>
                        <TableHead className="w-[150px] text-center">{t('common.type')}</TableHead>
                        <TableHead className="w-[150px] text-center">Data Detecção</TableHead>
                        <TableHead className="w-[150px] text-center">Data Resolução</TableHead>
                        <TableHead className="w-[180px] text-center">{t('historico.company')}</TableHead>
                        <TableHead className="w-[150px] text-center">{t('inconsistencias.analyst')}</TableHead>
                        <TableHead className="text-center w-[120px]">{t('common.actions')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {paginatedResolvidas.map((inc) => (
                          <TableRow key={inc.id} className="hover:bg-gray-50">
                            <TableCell className="text-center"><div className="flex items-center justify-center gap-2 whitespace-nowrap"><ClipboardList className="h-4 w-4 text-green-600 flex-shrink-0" /><span className="font-mono text-foreground text-xs sm:text-sm">{inc.nro_chamado}</span></div></TableCell>
                            <TableCell className="text-center"><span className="font-mono text-xs sm:text-sm">{inc.nro_tarefa || '-'}</span></TableCell>
                            <TableCell className="text-center"><Badge className={TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]}>{TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}</Badge></TableCell>
                            <TableCell className="text-center"><span className="text-xs sm:text-sm">{formatarData(inc.data_deteccao || null)}</span></TableCell>
                            <TableCell className="text-center"><span className="text-xs sm:text-sm text-green-600 font-medium">{formatarData(inc.data_resolucao || null)}</span></TableCell>
                            <TableCell className="text-xs sm:text-sm max-w-[180px] text-center">{renderEmpresaCell(inc.empresa, inc.analista)}</TableCell>
                            <TableCell className="text-xs sm:text-sm text-center"><span>{inc.analista || '-'}</span></TableCell>
                            <TableCell className="text-center"><Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setSelectedInconsistencia(inc); setShowViewModal(true); }}><Eye className="h-4 w-4 text-blue-600" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {totalPagesResolvidas > 1 && (
                      <div className="flex items-center justify-between px-2 py-4 border-t">
                        <div className="text-sm text-gray-500">{startIndexResolvidas + 1}-{Math.min(endIndexResolvidas, resolvidas.length)} de {resolvidas.length}</div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={currentPageResolvidas === 1} onClick={() => setCurrentPageResolvidas(prev => Math.max(1, prev - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">Página {currentPageResolvidas} de {totalPagesResolvidas}</span>
                          <Button variant="outline" size="sm" disabled={currentPageResolvidas === totalPagesResolvidas} onClick={() => setCurrentPageResolvidas(prev => Math.min(totalPagesResolvidas, prev + 1))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                        <div />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Emails Enviados */}
          <TabsContent value="emails_enviados" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5" />Emails Enviados</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {isLoadingHistorico ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : historico.length === 0 ? (
                  <div className="flex items-center justify-center py-12"><div className="text-center"><Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500 mb-2 font-medium">Nenhum email enviado neste período</p><p className="text-sm text-gray-400">Quando inconsistências forem notificadas por email, aparecerão aqui</p></div></div>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-[120px] text-center">{t('inconsistencias.ticketNumber')}</TableHead>
                      <TableHead className="w-[150px] text-center">{t('common.type')}</TableHead>
                      <TableHead className="w-[150px] text-center">{t('inconsistencias.analyst')}</TableHead>
                      <TableHead className="w-[180px] text-center">{t('historico.company')}</TableHead>
                      <TableHead className="w-[150px] text-center">{t('inconsistencias.sendDate')}</TableHead>
                      <TableHead className="w-[150px] text-center">{t('inconsistencias.sentBy')}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {historico.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-50">
                          <TableCell className="text-center"><div className="flex items-center justify-center gap-2 whitespace-nowrap"><ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" /><span className="font-mono text-foreground text-xs sm:text-sm">{item.nro_chamado}</span></div></TableCell>
                          <TableCell className="text-center"><Badge className={TIPO_INCONSISTENCIA_COLORS[item.tipo_inconsistencia]}>{TIPO_INCONSISTENCIA_LABELS[item.tipo_inconsistencia]}</Badge></TableCell>
                          <TableCell className="text-xs sm:text-sm text-center"><span>{item.analista || '-'}</span></TableCell>
                          <TableCell className="text-xs sm:text-sm max-w-[180px] text-center">{renderEmpresaCell(item.empresa, item.analista)}</TableCell>
                          <TableCell className="text-center"><span className="text-xs sm:text-sm">{formatarData(item.data_envio)}</span></TableCell>
                          <TableCell className="text-xs sm:text-sm text-center"><span>{item.enviado_por_nome || '-'}</span></TableCell>
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

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2"><Eye className="h-5 w-5" />{t('inconsistencias.detailsTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{t('inconsistencias.detailsDescription')}</DialogDescription>
          </DialogHeader>
          {selectedInconsistencia && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.ticketNumber')}</Label><div className="flex items-center gap-2 mt-1"><ClipboardList className="h-4 w-4 text-blue-600" /><span className="font-mono text-sm">{selectedInconsistencia.nro_chamado}</span></div></div>
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.inconsistencyType')}</Label><div className="mt-1"><Badge className={TIPO_INCONSISTENCIA_COLORS[selectedInconsistencia.tipo_inconsistencia]}>{TIPO_INCONSISTENCIA_LABELS[selectedInconsistencia.tipo_inconsistencia]}</Badge></div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.activityDate')}</Label><p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_atividade)}</p></div>
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.systemDate')}</Label><p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_sistema)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedInconsistencia.tempo_gasto_horas && (<div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.timeSpent')}</Label><p className="text-sm font-mono mt-1">{selectedInconsistencia.tempo_gasto_horas}</p></div>)}
                <div><Label className="text-sm font-medium text-gray-700">{t('historico.company')}</Label><p className="text-sm mt-1">{selectedInconsistencia.empresa || '-'}</p></div>
              </div>
              {selectedInconsistencia.analista && (<div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.analyst')}</Label><p className="text-sm mt-1">{selectedInconsistencia.analista}</p></div>)}
              {selectedInconsistencia.status === 'resolvida' && selectedInconsistencia.data_resolucao && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800"><strong>Resolvida em:</strong> {formatarData(selectedInconsistencia.data_resolucao)}</p>
                </div>
              )}
              <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.inconsistencyDescription')}</Label><div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800">{selectedInconsistencia.descricao_inconsistencia}</p></div></div>
            </div>
          )}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowViewModal(false)}>{t('common.close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Envio de Email */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2"><Mail className="h-5 w-5" />{t('inconsistencias.emailTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{t('inconsistencias.emailDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2"><Label htmlFor="destinatarios" className="text-sm font-medium text-gray-700">{t('inconsistencias.recipients')} <span className="text-red-500">*</span></Label><Textarea id="destinatarios" placeholder={t('inconsistencias.recipientsPlaceholder')} value={emailForm.destinatarios} onChange={(e) => setEmailForm({ ...emailForm, destinatarios: e.target.value })} className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[80px]" /></div>
            <div className="space-y-2"><Label htmlFor="cc" className="text-sm font-medium text-gray-700">{t('inconsistencias.ccRecipients')}</Label><Textarea id="cc" placeholder={t('inconsistencias.recipientsPlaceholder')} value={emailForm.cc} onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })} className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]" /></div>
            <div className="space-y-2"><Label htmlFor="bcc" className="text-sm font-medium text-gray-700">{t('inconsistencias.bccRecipients')}</Label><Textarea id="bcc" placeholder={t('inconsistencias.recipientsPlaceholder')} value={emailForm.bcc} onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })} className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]" /></div>
            <div className="space-y-2"><Label htmlFor="assunto" className="text-sm font-medium text-gray-700">{t('inconsistencias.emailSubject')}</Label><Input id="assunto" value={emailForm.assunto} onChange={(e) => setEmailForm({ ...emailForm, assunto: e.target.value })} className="focus:ring-sonda-blue focus:border-sonda-blue" /></div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.attachments')}</Label>
              <div className="flex items-center gap-2"><Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('file-upload')?.click()} className="flex items-center gap-2"><Paperclip className="h-4 w-4" />{t('inconsistencias.addFiles')}</Button><span className="text-xs text-gray-500">{t('inconsistencias.totalLimit')}</span></div>
              <input id="file-upload" type="file" multiple onChange={handleAnexoChange} className="hidden" />
              {emailForm.anexos.length > 0 && (<div className="space-y-2 mt-3">{emailForm.anexos.map((file, index) => (<div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border"><div className="flex items-center gap-2"><Paperclip className="h-4 w-4 text-gray-500" /><span className="text-sm">{file.name}</span><span className="text-xs text-gray-500">({formatFileSize(file.size)})</span></div><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverAnexo(index)} className="h-6 w-6 p-0 text-red-600 hover:text-red-800"><X className="h-4 w-4" /></Button></div>))}</div>)}
            </div>
          </div>
          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)}>{t('common.cancel')}</Button>
            <Button type="button" onClick={handleEnviarNotificacoes} disabled={isEnviando || !emailForm.destinatarios.trim()} className="bg-sonda-blue hover:bg-sonda-dark-blue"><Send className="h-4 w-4 mr-2" />{isEnviando ? t('inconsistencias.sending') : t('inconsistencias.sendEmail')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
