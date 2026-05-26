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
  useAjustesRetroativos,
  useAjustesPendentesCount,
  useAprovarAjuste,
  useDescartarAjuste
} from '@/hooks/useAjustesRetroativos';
import { useEmpresas } from '@/hooks/useEmpresas';
import { bancoHorasQuarentenaService } from '@/services/bancoHorasQuarentenaService';
import type { AjusteRetroativo } from '@/services/bancoHorasQuarentenaService';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function AjustesRetroativos() {
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
        console.log('🔍 Executando detecção automática de extemporâneos...');
        const ajustes = await bancoHorasQuarentenaService.executarDeteccaoParaTodosFechamentos();
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
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case 'descartado':
        return <Badge className="bg-red-100 text-red-800">Descartado</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTipoDadoLabel = (tipo: string) => {
    switch (tipo) {
      case 'apontamento_horas': return 'Horas (Apontamentos)';
      case 'apontamento_tickets': return 'Tickets';
      case 'requerimento': return 'Requerimentos';
      default: return tipo;
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Ajustes Retroativos
              </h1>
              <p className="text-muted-foreground mt-1">
                Atualizações que chegaram após o fechamento do período do banco de horas
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
                    Pendentes
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
                    Aprovados
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
                    Descartados
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
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ajustes Retroativos
                </CardTitle>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </Button>

                  {hasActiveFilters() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limparFiltros}
                      className="whitespace-nowrap hover:border-red-300"
                    >
                      <X className="h-4 w-4 mr-2 text-red-600" />
                      Limpar Filtro
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros expansíveis */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Empresa</div>
                      <Select
                        value={filtros.empresaId}
                        onValueChange={(value) => setFiltros({ ...filtros, empresaId: value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todas as empresas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as empresas</SelectItem>
                          {empresasAtivas.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome_abreviado || e.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Status</div>
                      <Select
                        value={filtros.status}
                        onValueChange={(value) => setFiltros({ ...filtros, status: value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="aprovado">Aprovado</SelectItem>
                          <SelectItem value="descartado">Descartado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="overflow-x-auto">
              {(isLoading || isDetectando) ? (
                <div className="space-y-3">
                  {isDetectando && (
                    <div className="text-sm text-sonda-blue flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      Verificando apontamentos extemporâneos...
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
                      Nenhum ajuste retroativo encontrado
                    </p>
                    <p className="text-sm text-gray-400">
                      Todos os períodos estão atualizados
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Período Ref.</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Tipo</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Valor Anterior</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Valor Novo</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Diferença</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center">Data</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center w-32">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustes.map((ajuste) => (
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
                            {MESES[ajuste.mes_referencia - 1]}/{ajuste.ano_referencia}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {getTipoDadoLabel(ajuste.tipo_dado)}
                          </Badge>
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
                    ))}
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
                  Aprovar Ajuste Retroativo
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  Ao aprovar, um reajuste será gerado automaticamente no mês de aplicação
                  e o banco de horas será recalculado.
                </DialogDescription>
              </DialogHeader>

              {modalAprovar && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empresa:</span>
                      <span className="font-medium">
                        {empresasMap.get(modalAprovar.empresa_id) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Período Ref.:</span>
                      <span>{MESES[modalAprovar.mes_referencia - 1]}/{modalAprovar.ano_referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Diferença:</span>
                      <span className={`font-mono font-semibold ${
                        modalAprovar.diferenca?.startsWith('+') ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {modalAprovar.diferenca}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Ação:</span>
                      <span className="text-sm">
                        O consumo de {MESES[modalAprovar.mes_referencia - 1]}/{modalAprovar.ano_referencia} será
                        atualizado de {modalAprovar.valor_anterior} para {modalAprovar.valor_novo} e o banco será recalculado.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Justificativa <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Descreva o motivo da aprovação..."
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
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAprovar}
                  disabled={!motivoDecisao.trim() || aprovarMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {aprovarMutation.isPending ? 'Aprovando...' : 'Aprovar e Gerar Reajuste'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Descartar */}
          <Dialog open={!!modalDescartar} onOpenChange={() => setModalDescartar(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-sonda-blue">
                  Descartar Ajuste Retroativo
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  O ajuste será marcado como descartado e não afetará o banco de horas.
                </DialogDescription>
              </DialogHeader>

              {modalDescartar && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Empresa:</span>
                      <span className="font-medium">
                        {empresasMap.get(modalDescartar.empresa_id) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Período Ref.:</span>
                      <span>{MESES[modalDescartar.mes_referencia - 1]}/{modalDescartar.ano_referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Diferença:</span>
                      <span className="font-mono font-semibold">
                        {modalDescartar.diferenca}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Justificativa do Descarte <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Descreva o motivo do descarte..."
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
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDescartar}
                  disabled={!motivoDecisao.trim() || descartarMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {descartarMutation.isPending ? 'Descartando...' : 'Descartar Ajuste'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
}
