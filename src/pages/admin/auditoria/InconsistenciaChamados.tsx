import { useState, useEffect } from 'react';
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
  Ticket
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

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEFAULT_ITEMS_PER_PAGE = 25;

export default function InconsistenciaChamados() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('inconsistencias_detectadas');
  const [showFilters, setShowFilters] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInconsistencia, setSelectedInconsistencia] = useState<any>(null);
  
  // Estado de período (mês/ano)
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  
  // Estado de filtros (sem filtros de data iniciais)
  const [filtros, setFiltros] = useState<InconsistenciasChamadosFiltros>({
    busca: '',
    tipo_inconsistencia: 'all',
    origem: 'all',
    analista: ''
    // data_inicio e data_fim serão definidos pelo useEffect
  });

  // Atualizar filtros quando mês/ano mudar
  const atualizarFiltrosPorPeriodo = (mes: number, ano: number) => {
    // Calcular primeiro e último dia do mês
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0, 23, 59, 59);
    
    console.log('📅 Definindo filtros de período:', {
      mes,
      ano,
      data_inicio: primeiroDia.toISOString(),
      data_fim: ultimoDia.toISOString()
    });
    
    setFiltros(prev => ({
      ...prev,
      data_inicio: primeiroDia.toISOString(),
      data_fim: ultimoDia.toISOString()
    }));
  };

  // Atualizar filtros quando componente montar ou mês/ano mudar
  useEffect(() => {
    console.log('🔍 Atualizando filtros por período:', { mesAtual, anoAtual });
    atualizarFiltrosPorPeriodo(mesAtual, anoAtual);
  }, [mesAtual, anoAtual]);

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
    assunto: `Inconsistências Detectadas - ${MESES[mesAtual - 1]} ${anoAtual}`,
    anexos: [] as File[]
  });

  // Hooks
  const { inconsistencias, isLoading, refetch } = useInconsistenciasChamados(filtros);
  const { estatisticas, isLoading: isLoadingStats } = useInconsistenciasEstatisticas(filtros);
  const { historico, isLoading: isLoadingHistorico } = useHistoricoInconsistencias(mesAtual, anoAtual);
  const { enviarNotificacao, isEnviando } = useEnviarNotificacao();

  // Extrair lista única de analistas das inconsistências
  const analistasUnicos = Array.from(
    new Set(
      inconsistencias
        .map(inc => inc.analista)
        .filter(analista => analista && analista.trim() !== '')
    )
  ).sort();

  // Navegação de mês
  const navegarMesAnterior = () => {
    if (mesAtual === 1) {
      setMesAtual(12);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
    setCurrentPage(1);
  };

  const navegarMesProximo = () => {
    if (mesAtual === 12) {
      setMesAtual(1);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
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
        title: "Nenhuma inconsistência selecionada",
        description: "Selecione pelo menos uma inconsistência para enviar.",
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
      assunto: `Inconsistências Detectadas - ${MESES[mesAtual - 1]} ${anoAtual}`,
      anexos: []
    });

    setShowEmailModal(true);
  };

  const handleEnviarNotificacoes = () => {
    const selecionadas = inconsistencias.filter(inc => selectedIds.includes(inc.id));
    
    // Validar campos obrigatórios
    if (!emailForm.destinatarios.trim()) {
      toast({
        title: "Destinatários obrigatórios",
        description: "Informe pelo menos um destinatário.",
        variant: "destructive"
      });
      return;
    }

    enviarNotificacao({
      inconsistencias: selecionadas,
      mes_referencia: mesAtual,
      ano_referencia: anoAtual
    }, {
      onSuccess: () => {
        toast({
          title: "Notificações enviadas!",
          description: `${selecionadas.length} inconsistência(s) foram notificadas aos analistas.`
        });
        setSelectedIds([]);
        setShowEmailModal(false);
        // Limpar formulário
        setEmailForm({
          destinatarios: '',
          cc: '',
          bcc: '',
          assunto: `Inconsistências Detectadas - ${MESES[mesAtual - 1]} ${anoAtual}`,
          anexos: []
        });
        refetch();
      },
      onError: (error) => {
        toast({
          title: "Erro ao enviar notificações",
          description: error instanceof Error ? error.message : "Erro desconhecido",
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
          title: "Limite de anexos excedido",
          description: "O tamanho total dos anexos não pode exceder 25MB.",
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
  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
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
                Inconsistência de Chamados
              </h1>
              <p className="text-muted-foreground mt-1">
                Auditoria de chamados com inconsistências detectadas
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAbrirModalEmail}
                  disabled={isEnviando}
                  className="bg-sonda-blue hover:bg-sonda-dark-blue"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email ({selectedIds.length})
                </Button>
              )}
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Total de Inconsistências
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
                    Mês Diferente
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
                    Data Invertida
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
                    Tempo Excessivo
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
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="inconsistencias_detectadas"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                Inconsistências Detectadas ({inconsistencias.length})
              </TabsTrigger>
              <TabsTrigger 
                value="historico_de_inconsistencias"
                className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
              >
                Histórico de Inconsistências ({historico.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab: Inconsistências Detectadas */}
            <TabsContent value="inconsistencias_detectadas" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Inconsistências Detectadas
                    </CardTitle>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros
                      </Button>

                      {hasActiveFilters() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={limparFiltros}
                          className="hover:border-red-300"
                        >
                          <X className="h-4 w-4 mr-2 text-red-600" />
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Filtros */}
                  {showFilters && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm font-medium mb-2">Buscar</div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Nº do chamado..."
                              value={filtros.busca}
                              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                              className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                            />
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">Tipo</div>
                          <Select
                            value={filtros.tipo_inconsistencia}
                            onValueChange={(value: any) => setFiltros({ ...filtros, tipo_inconsistencia: value })}
                          >
                            <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="mes_diferente">Mês Diferente</SelectItem>
                              <SelectItem value="data_invertida">Data Invertida</SelectItem>
                              <SelectItem value="tempo_excessivo">Tempo Excessivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">Analista</div>
                          <Select
                            value={filtros.analista || 'all'}
                            onValueChange={(value: any) => setFiltros({ ...filtros, analista: value === 'all' ? '' : value })}
                          >
                            <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                              <SelectValue placeholder="Todos os analistas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os analistas</SelectItem>
                              {analistasUnicos.map((analista) => (
                                <SelectItem key={analista} value={analista}>
                                  {analista}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <div className="text-sm font-medium mb-2">Período</div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="date"
                              value={filtros.data_inicio}
                              onChange={(e) => setFiltros({ ...filtros, data_inicio: e.target.value })}
                              className="focus:ring-sonda-blue focus:border-sonda-blue"
                            />
                            <Input
                              type="date"
                              value={filtros.data_fim}
                              onChange={(e) => setFiltros({ ...filtros, data_fim: e.target.value })}
                              className="focus:ring-sonda-blue focus:border-sonda-blue"
                            />
                          </div>
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
                          Nenhuma inconsistência encontrada
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
                            <TableHead className="w-[120px] text-center">Nº Chamado</TableHead>
                            <TableHead className="w-[150px] text-center">Tipo</TableHead>
                            <TableHead className="w-[150px] text-center">Data Atividade</TableHead>
                            <TableHead className="w-[150px] text-center">Data Sistema</TableHead>
                            <TableHead className="w-[100px] text-center">Tempo</TableHead>
                            <TableHead className="w-[180px] text-center">Empresa</TableHead>
                            <TableHead className="w-[150px] text-center">Analista</TableHead>
                            <TableHead className="text-center w-[120px]">Ações</TableHead>
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
                                  {inc.origem === 'apontamentos' ? (
                                    <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                  ) : (
                                    <Ticket className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                  )}
                                  {/* Número do chamado */}
                                  <span className="font-mono text-foreground text-xs sm:text-sm">{inc.nro_chamado}</span>
                                </div>
                              </TableCell>
                              
                              {/* Coluna Tipo */}
                              <TableCell className="text-center">
                                <Badge className={TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]}>
                                  {TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}
                                </Badge>
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
                                  title="Visualizar detalhes"
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
                            <span className="text-sm text-gray-700">Mostrar</span>
                            <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                              <SelectTrigger className="h-9 w-[70px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                                  <SelectItem key={option} value={option.toString()}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Navegação de páginas */}
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-9 w-9 p-0"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(currentPage - 1)}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-gray-700">
                              Página {currentPage} de {totalPages}
                            </span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-9 w-9 p-0"
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(currentPage + 1)}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Contador de resultados */}
                          <div className="text-sm text-gray-500">
                            {startIndex + 1}-{Math.min(endIndex, inconsistencias.length)} de {inconsistencias.length} requerimentos
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
                    Histórico de Inconsistências
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
                          Nenhum histórico encontrado
                        </p>
                        <p className="text-sm text-gray-400">
                          Inconsistências enviadas aparecerão aqui
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px] text-center">Nº Chamado</TableHead>
                          <TableHead className="w-[150px] text-center">Tipo</TableHead>
                          <TableHead className="w-[150px] text-center">Analista</TableHead>
                          <TableHead className="w-[180px] text-center">Empresa</TableHead>
                          <TableHead className="w-[150px] text-center">Data Envio</TableHead>
                          <TableHead className="w-[150px] text-center">Enviado Por</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historico.map((item) => (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            {/* Coluna Nº Chamado com ícone de origem */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                {/* Ícone de origem */}
                                {item.origem === 'apontamentos' ? (
                                  <ClipboardList className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <Ticket className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                )}
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
              Detalhes da Inconsistência
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Informações completas sobre a inconsistência detectada
            </DialogDescription>
          </DialogHeader>

          {selectedInconsistencia && (
            <div className="space-y-4 py-4">
              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Nº Chamado</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedInconsistencia.origem === 'apontamentos' ? (
                      <ClipboardList className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Ticket className="h-4 w-4 text-purple-600" />
                    )}
                    <span className="font-mono text-sm">{selectedInconsistencia.nro_chamado}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Tipo de Inconsistência</Label>
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
                  <Label className="text-sm font-medium text-gray-700">Data Atividade</Label>
                  <p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_atividade)}</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700">Data Sistema</Label>
                  <p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_sistema)}</p>
                </div>
              </div>

              {/* Tempo e Empresa */}
              <div className="grid grid-cols-2 gap-4">
                {selectedInconsistencia.tempo_gasto_horas && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tempo Gasto</Label>
                    <p className="text-sm font-mono mt-1">{selectedInconsistencia.tempo_gasto_horas}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-700">Empresa</Label>
                  <p className="text-sm mt-1">{selectedInconsistencia.empresa || '-'}</p>
                </div>
              </div>

              {/* Analista */}
              {selectedInconsistencia.analista && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Analista</Label>
                  <p className="text-sm mt-1">{selectedInconsistencia.analista}</p>
                </div>
              )}

              {/* Descrição da Inconsistência */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Descrição da Inconsistência</Label>
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
              Fechar
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
              Disparar Inconsistências por Email
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Configure os destinatários e envie as inconsistências selecionadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Destinatários */}
            <div className="space-y-2">
              <Label htmlFor="destinatarios" className="text-sm font-medium text-gray-700">
                Destinatários <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="destinatarios"
                placeholder="Cole ou digite emails separados por ponto e vírgula (;) Ex: joao@exemplo.com; maria@exemplo.com; pedro@exemplo.com"
                value={emailForm.destinatarios}
                onChange={(e) => setEmailForm({ ...emailForm, destinatarios: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[80px]"
              />
            </div>

            {/* CC */}
            <div className="space-y-2">
              <Label htmlFor="cc" className="text-sm font-medium text-gray-700">
                Destinatários em Cópia (CC) - Opcional
              </Label>
              <Textarea
                id="cc"
                placeholder="Cole ou digite emails em cópia separados por ponto e vírgula (;) Ex: joao@exemplo.com; maria@exemplo.com; pedro@exemplo.com"
                value={emailForm.cc}
                onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
              />
            </div>

            {/* BCC */}
            <div className="space-y-2">
              <Label htmlFor="bcc" className="text-sm font-medium text-gray-700">
                Destinatários em Cópia Oculta (BCC) - Opcional
              </Label>
              <Textarea
                id="bcc"
                placeholder="Cole ou digite emails em cópia oculta separados por ponto e vírgula (;) Ex: joao@exemplo.com; maria@exemplo.com; pedro@exemplo.com"
                value={emailForm.bcc}
                onChange={(e) => setEmailForm({ ...emailForm, bcc: e.target.value })}
                className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
              />
            </div>

            {/* Assunto */}
            <div className="space-y-2">
              <Label htmlFor="assunto" className="text-sm font-medium text-gray-700">
                Assunto
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
                Anexos
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
                  Adicionar Arquivos
                </Button>
                <span className="text-xs text-gray-500">Limite: 25MB total</span>
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
                Preview do Email
              </Label>
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded border max-h-[300px] overflow-y-auto">
                <div className="space-y-3">
                  {/* Header Preview */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded text-center">
                    <div className="font-bold text-lg">⚠️ Inconsistências Detectadas em Chamados</div>
                    <div className="text-sm mt-1">{MESES[mesAtual - 1]} {anoAtual}</div>
                  </div>

                  {/* Intro */}
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="text-yellow-800 text-xs">
                      <strong>Atenção!</strong> Foram detectadas inconsistências nos chamados que requerem sua verificação e correção.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="font-semibold text-blue-900 text-xs mb-2">Resumo das Inconsistências</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-900">{selectedIds.length}</div>
                        <div className="text-xs text-blue-600">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-900">
                          {inconsistencias.filter(inc => selectedIds.includes(inc.id) && inc.tipo_inconsistencia === 'mes_diferente').length}
                        </div>
                        <div className="text-xs text-blue-600">Mês Diferente</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-900">
                          {inconsistencias.filter(inc => selectedIds.includes(inc.id) && inc.tipo_inconsistencia === 'data_invertida').length}
                        </div>
                        <div className="text-xs text-blue-600">Data Invertida</div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Cards */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-700 border-b pb-1">
                      Exemplo de Inconsistências ({selectedIds.length} no total)
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
                        + {selectedIds.length - 2} inconsistências adicionais
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
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleEnviarNotificacoes}
              disabled={isEnviando || !emailForm.destinatarios.trim()}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Send className="h-4 w-4 mr-2" />
              {isEnviando ? 'Enviando...' : 'Enviar Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
