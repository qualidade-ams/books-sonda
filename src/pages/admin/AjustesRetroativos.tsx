/**
 * Página de Ajustes Retroativos do Banco de Horas
 * 
 * Permite visualizar, aprovar ou descartar atualizações que chegaram
 * após o fechamento do período (geração do book).
 * 
 * @module pages/admin/AjustesRetroativos
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  X,
  FileText,
  Building2,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  useAjustesRetroativos,
  useAjustesPendentesCount,
  useAprovarAjuste,
  useDescartarAjuste
} from '@/hooks/useAjustesRetroativos';
import { useEmpresas } from '@/hooks/useEmpresas';
import { bancoHorasQuarentenaService } from '@/services/bancoHorasQuarentenaService';
import type { AjusteRetroativo } from '@/services/bancoHorasQuarentenaService';

export default function AjustesRetroativos() {
  const { t } = useTranslation();

  // Nomes dos meses via i18n
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const getMonthName = (monthIndex: number) => t(`monthPicker.months.${monthKeys[monthIndex]}`);

  // Estado de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    empresaId: 'all',
    status: 'all',
  });

  // Estado de modais
  const [modalAprovar, setModalAprovar] = useState<AjusteRetroativo | null>(null);
  const [modalDescartar, setModalDescartar] = useState<AjusteRetroativo | null>(null);
  const [motivoDecisao, setMotivoDecisao] = useState('');
  const [mesAplicacao, setMesAplicacao] = useState<number>(() => {
    const hoje = new Date();
    return hoje.getMonth() + 1;
  });
  const [anoAplicacao, setAnoAplicacao] = useState<number>(() => {
    return new Date().getFullYear();
  });

  // Dados
  const { empresas } = useEmpresas();
  const pendentesCount = useAjustesPendentesCount();
  const { ajustes, isLoading, refetch: refetchAjustes } = useAjustesRetroativos({
    empresaId: filtros.empresaId !== 'all' ? filtros.empresaId : undefined,
    status: filtros.status !== 'all' ? filtros.status : undefined,
  });

  // Mutations
  const aprovarMutation = useAprovarAjuste();
  const descartarMutation = useDescartarAjuste();

  // Detecção automática ao abrir a tela
  const deteccaoExecutada = useRef(false);
  const [isDetectando, setIsDetectando] = useState(false);

  useEffect(() => {
    if (deteccaoExecutada.current) return;
    deteccaoExecutada.current = true;

    const executarDeteccaoAutomatica = async () => {
      try {
        setIsDetectando(true);
        console.log('🔍 Executando detecção automática (últimos 3 meses)...');
        const ajustes = await bancoHorasQuarentenaService.executarDeteccaoRecente(3);
        console.log('✅ Detecção automática concluída:', ajustes.length, 'ajustes');
        if (ajustes.length > 0) {
          // Forçar refetch dos dados da tela
          refetchAjustes();
        }
      } catch (error) {
        console.error('⚠️ Erro na detecção automática:', error);
      } finally {
        setIsDetectando(false);
      }
    };

    executarDeteccaoAutomatica();
  }, []);

  // Empresas ativas com AMS
  const empresasAtivas = useMemo(() => {
    if (!empresas) return [];
    return empresas.filter(e => e.status === 'ativo' && e.tem_ams === true);
  }, [empresas]);

  // Mapa de empresas para exibir nomes
  const empresasMap = useMemo(() => {
    const map = new Map<string, string>();
    empresas?.forEach(e => {
      map.set(e.id, e.nome_abreviado || e.nome_completo);
    });
    return map;
  }, [empresas]);

  // Handlers
  const hasActiveFilters = () => {
    return filtros.empresaId !== 'all' || filtros.status !== 'all';
  };

  const limparFiltros = () => {
    setFiltros({ empresaId: 'all', status: 'all' });
  };

  const handleAprovar = async () => {
    if (!modalAprovar || !motivoDecisao.trim()) return;

    await aprovarMutation.mutateAsync({
      ajusteId: modalAprovar.id,
      motivo: motivoDecisao,
      mesAplicacao: modalAprovar.mes_referencia,
      anoAplicacao: modalAprovar.ano_referencia
    });

    setModalAprovar(null);
    setMotivoDecisao('');
  };

  const handleDescartar = async () => {
    if (!modalDescartar || !motivoDecisao.trim()) return;

    await descartarMutation.mutateAsync({
      ajusteId: modalDescartar.id,
      motivo: motivoDecisao
    });

    setModalDescartar(null);
    setMotivoDecisao('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('ajustesRetroativos.statusPending')}</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">{t('ajustesRetroativos.statusApproved')}</Badge>;
      case 'descartado':
        return <Badge className="bg-red-100 text-red-800">{t('ajustesRetroativos.statusDiscarded')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTipoDadoLabel = (tipo: string) => {
    switch (tipo) {
      case 'apontamento_horas': return t('ajustesRetroativos.typeHours');
      case 'apontamento_tickets': return t('ajustesRetroativos.typeTickets');
      case 'requerimento': return t('ajustesRetroativos.typeRequirements');
      default: return tipo;
    }
  };

  // Extrair números de chamados e tarefas do detalhes_mudanca
  const extrairChamadosTarefas = (ajuste: AjusteRetroativo) => {
    const detalhes = ajuste.detalhes_mudanca;
    if (!detalhes) return { chamados: [], tarefas: [] };

    const chamados = new Set<string>();
    const tarefas = new Set<string>();

    const processarItens = (itens: any[]) => {
      for (const item of itens) {
        // nro_chamado disponível diretamente
        if (item.nro_chamado) {
          chamados.add(item.nro_chamado);
        }
        // nro_solicitacao para tickets
        if (item.nro_solicitacao) {
          tarefas.add(item.nro_solicitacao);
        }
        // Extrair tarefa do id_externo (formato: AMSapontamento|{chamado}|{tarefa})
        if (item.id_externo) {
          const partes = item.id_externo.split('|');
          if (partes.length >= 3) {
            tarefas.add(partes[2]);
          }
          if (partes.length >= 2 && !item.nro_chamado) {
            chamados.add(partes[1]);
          }
        }
      }
    };

    if (detalhes.novos && Array.isArray(detalhes.novos)) {
      processarItens(detalhes.novos);
    }
    if (detalhes.removidos && Array.isArray(detalhes.removidos)) {
      processarItens(detalhes.removidos);
    }

    return {
      chamados: Array.from(chamados),
      tarefas: Array.from(tarefas)
    };
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('ajustesRetroativos.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('ajustesRetroativos.subtitle')}
              </p>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-yellow-600">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {t('ajustesRetroativos.pending')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-yellow-600">
                  {pendentesCount}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t('ajustesRetroativos.approved')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {ajustes.filter(a => a.status === 'aprovado').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-red-600">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {t('ajustesRetroativos.discarded')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-red-600">
                  {ajustes.filter(a => a.status === 'descartado').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Principal */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('ajustesRetroativos.tableTitle')}
                </CardTitle>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>{t('common.filter')}</span>
                  </Button>

                  {hasActiveFilters() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limparFiltros}
                      className="whitespace-nowrap hover:border-red-300"
                    >
                      <X className="h-4 w-4 mr-2 text-red-600" />
                      {t('common.clearFilter')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros expansíveis */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">{t('ajustesRetroativos.company')}</div>
                      <Select
                        value={filtros.empresaId}
                        onValueChange={(value) => setFiltros({ ...filtros, empresaId: value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder={t('ajustesRetroativos.allCompanies')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('ajustesRetroativos.allCompanies')}</SelectItem>
                          {empresasAtivas.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome_abreviado || e.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">{t('common.status')}</div>
                      <Select
                        value={filtros.status}
                        onValueChange={(value) => setFiltros({ ...filtros, status: value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder={t('ajustesRetroativos.allStatuses')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('ajustesRetroativos.allStatuses')}</SelectItem>
                          <SelectItem value="pendente">{t('ajustesRetroativos.statusPending')}</SelectItem>
                          <SelectItem value="aprovado">{t('ajustesRetroativos.statusApproved')}</SelectItem>
                          <SelectItem value="descartado">{t('ajustesRetroativos.statusDiscarded')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 overflow-x-auto">
              {(isLoading || isDetectando) ? (
                <div className="space-y-3">
                  {isDetectando && (
                    <div className="text-sm text-sonda-blue flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      {t('ajustesRetroativos.checkingExtemporaneous')}
                    </div>
                  )}
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : ajustes.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      {t('ajustesRetroativos.noAdjustmentsFound')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('ajustesRetroativos.allPeriodsUpdated')}
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">{t('ajustesRetroativos.company')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('ajustesRetroativos.refPeriod')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('ajustesRetroativos.type')}</TableHead>
                      <TableHead className="font-semibold text-gray-700">Chamado(s)</TableHead>
                      <TableHead className="font-semibold text-gray-700">Tarefa(s)</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('ajustesRetroativos.previousValue')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('ajustesRetroativos.newValue')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('ajustesRetroativos.difference')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('common.status')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">{t('ajustesRetroativos.date')}</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center w-32">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustes.map((ajuste) => {
                      const { chamados, tarefas } = extrairChamadosTarefas(ajuste);
                      return (
                      <TableRow key={ajuste.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {empresasMap.get(ajuste.empresa_id) || 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm">
                            {getMonthName(ajuste.mes_referencia - 1)}/{ajuste.ano_referencia}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {getTipoDadoLabel(ajuste.tipo_dado)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {chamados.length > 0 ? (
                            <div className="flex flex-wrap gap-1 items-center">
                              {chamados.slice(0, 3).map((chamado, idx) => (
                                <span key={idx} className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                  {chamado}
                                </span>
                              ))}
                              {chamados.length > 3 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100">
                                        +{chamados.length - 3}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                      <div className="flex flex-wrap gap-1 p-1">
                                        {chamados.slice(3).map((chamado, idx) => (
                                          <span key={idx} className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                            {chamado}
                                          </span>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {tarefas.length > 0 ? (
                            <div className="flex flex-wrap gap-1 items-center">
                              {tarefas.slice(0, 3).map((tarefa, idx) => (
                                <span key={idx} className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                  {tarefa}
                                </span>
                              ))}
                              {tarefas.length > 3 && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100">
                                        +{tarefas.length - 3}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-xs">
                                      <div className="flex flex-wrap gap-1 p-1">
                                        {tarefas.slice(3).map((tarefa, idx) => (
                                          <span key={idx} className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                                            {tarefa}
                                          </span>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {ajuste.valor_anterior || '-'}
                        </TableCell>
                        <TableCell className="text-center font-mono text-sm">
                          {ajuste.valor_novo || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-mono font-semibold ${
                            ajuste.diferenca?.startsWith('+') ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {ajuste.diferenca || '-'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(ajuste.status)}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {new Date(ajuste.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-center">
                          {ajuste.status === 'pendente' && (
                            <div className="flex justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-800"
                                title={t('ajustesRetroativos.approveTooltip')}
                                onClick={() => {
                                  setModalAprovar(ajuste);
                                  setMotivoDecisao('');
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                title={t('ajustesRetroativos.discardTooltip')}
                                onClick={() => {
                                  setModalDescartar(ajuste);
                                  setMotivoDecisao('');
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Modal Aprovar */}
          <Dialog open={!!modalAprovar} onOpenChange={() => setModalAprovar(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-sonda-blue">
                  {t('ajustesRetroativos.approveTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('ajustesRetroativos.approveDescription')}
                </DialogDescription>
              </DialogHeader>

              {modalAprovar && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.company')}:</span>
                      <span className="font-medium">
                        {empresasMap.get(modalAprovar.empresa_id) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.refPeriod')}:</span>
                      <span>{getMonthName(modalAprovar.mes_referencia - 1)}/{modalAprovar.ano_referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.difference')}:</span>
                      <span className={`font-mono font-semibold ${
                        modalAprovar.diferenca?.startsWith('+') ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {modalAprovar.diferenca}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.action')}:</span>
                      <span className="text-sm">
                        {t('ajustesRetroativos.actionDescription', { 
                          period: `${getMonthName(modalAprovar.mes_referencia - 1)}/${modalAprovar.ano_referencia}`,
                          from: modalAprovar.valor_anterior,
                          to: modalAprovar.valor_novo
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('ajustesRetroativos.justification')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder={t('ajustesRetroativos.justificationPlaceholder')}
                      value={motivoDecisao}
                      onChange={(e) => setMotivoDecisao(e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalAprovar(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAprovar}
                  disabled={!motivoDecisao.trim() || aprovarMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {aprovarMutation.isPending ? t('ajustesRetroativos.approving') : t('ajustesRetroativos.approveAndGenerate')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Descartar */}
          <Dialog open={!!modalDescartar} onOpenChange={() => setModalDescartar(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-sonda-blue">
                  {t('ajustesRetroativos.discardTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('ajustesRetroativos.discardDescription')}
                </DialogDescription>
              </DialogHeader>

              {modalDescartar && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.company')}:</span>
                      <span className="font-medium">
                        {empresasMap.get(modalDescartar.empresa_id) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.refPeriod')}:</span>
                      <span>{getMonthName(modalDescartar.mes_referencia - 1)}/{modalDescartar.ano_referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.difference')}:</span>
                      <span className="font-mono font-semibold">
                        {modalDescartar.diferenca}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('ajustesRetroativos.discardJustification')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder={t('ajustesRetroativos.discardPlaceholder')}
                      value={motivoDecisao}
                      onChange={(e) => setMotivoDecisao(e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalDescartar(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDescartar}
                  disabled={!motivoDecisao.trim() || descartarMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {descartarMutation.isPending ? t('ajustesRetroativos.discarding') : t('ajustesRetroativos.discardAdjustment')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
}
