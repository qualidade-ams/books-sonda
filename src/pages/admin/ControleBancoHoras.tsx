/**
 * Página de Controle de Banco de Horas
 * 
 * Gerencia o banco de horas por contratos de empresas clientes com:
 * - Seletor de empresa
 * - Navegação temporal (mês/ano)
 * - Visão Consolidada (sempre visível)
 * - Visão Segmentada (condicional a existência de alocações)
 * - Modal de Reajuste
 * - Modal de Histórico de Versões
 * - Botão Recalcular
 * - Botão Exportar
 * - Indicadores visuais de excedentes
 * 
 * @module pages/admin/ControleBancoHoras
 * @requirements 15.1-15.10, 16.1-16.10, 17.1-17.10
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Calendar,
  TrendingUp,
  FileText,
  AlertCircle,
  Building2
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { VisaoConsolidada } from '@/components/admin/banco-horas/VisaoConsolidada';
import { VisaoSegmentada } from '@/components/admin/banco-horas/VisaoSegmentada';
import { ModalReajuste } from '@/components/admin/banco-horas/ModalReajuste';
import { ModalHistorico } from '@/components/admin/banco-horas/ModalHistorico';

import { 
  useBancoHorasCalculos,
  useAlocacoes,
  useCalculosSegmentados,
  useVersoes
} from '@/hooks/useBancoHoras';
import { useHistoricoVersoes } from '@/hooks/useBancoHorasVersoes';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useToast } from '@/hooks/use-toast';
import { converterHorasParaMinutos } from '@/utils/horasUtils';
import type { BancoHorasCalculo } from '@/types/bancoHoras';

/**
 * Nomes dos meses em português
 */
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Página ControleBancoHoras
 * 
 * Implementa a interface completa de controle de banco de horas com
 * navegação temporal, seleção de empresa, visões consolidada e segmentada,
 * e ações de reajuste, histórico e exportação.
 */
export default function ControleBancoHoras() {
  const { toast } = useToast();
  
  // Estado de navegação
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | undefined>(undefined);
  const [mesAno, setMesAno] = useState<{ mes: number; ano: number }>(() => {
    const hoje = new Date();
    return {
      mes: hoje.getMonth() + 1, // JavaScript months are 0-indexed
      ano: hoje.getFullYear()
    };
  });
  const [activeTab, setActiveTab] = useState<'consolidada' | 'segmentada'>('consolidada');
  
  // Estado de modais
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  
  // Buscar empresas
  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas();
  
  // Buscar empresa selecionada para obter período de apuração
  const empresaAtual = useMemo(() => {
    return empresas?.find(e => e.id === empresaSelecionada);
  }, [empresas, empresaSelecionada]);
  
  // Buscar cálculo do primeiro mês (sempre necessário)
  const {
    calculo: calculo1,
    isLoading: isLoading1,
    isFetching: isFetching1,
    recalcular: recalcular1,
    isRecalculating: isRecalculating1,
    refetch: refetch1
  } = useBancoHorasCalculos(empresaSelecionada, mesAno.mes, mesAno.ano);
  
  // Buscar cálculo do segundo mês (condicional ao período)
  const mes2 = mesAno.mes + 1 > 12 ? mesAno.mes + 1 - 12 : mesAno.mes + 1;
  const ano2 = mesAno.mes + 1 > 12 ? mesAno.ano + 1 : mesAno.ano;
  const {
    calculo: calculo2,
    isLoading: isLoading2,
    isFetching: isFetching2,
    recalcular: recalcular2,
    isRecalculating: isRecalculating2,
    refetch: refetch2
  } = useBancoHorasCalculos(
    empresaAtual?.periodo_apuracao && empresaAtual.periodo_apuracao >= 2 ? empresaSelecionada : undefined,
    mes2,
    ano2
  );
  
  // Buscar cálculo do terceiro mês (condicional ao período)
  const mes3 = mesAno.mes + 2 > 12 ? mesAno.mes + 2 - 12 : mesAno.mes + 2;
  const ano3 = mesAno.mes + 2 > 12 ? mesAno.ano + 1 : mesAno.ano;
  const {
    calculo: calculo3,
    isLoading: isLoading3,
    isFetching: isFetching3,
    recalcular: recalcular3,
    isRecalculating: isRecalculating3,
    refetch: refetch3
  } = useBancoHorasCalculos(
    empresaAtual?.periodo_apuracao && empresaAtual.periodo_apuracao >= 3 ? empresaSelecionada : undefined,
    mes3,
    ano3
  );
  
  // Montar array de cálculos baseado no período
  const calculos = useMemo(() => {
    const periodoApuracao = empresaAtual?.periodo_apuracao || 1;
    const resultado: BancoHorasCalculo[] = [];
    
    if (calculo1) resultado.push(calculo1);
    if (periodoApuracao >= 2 && calculo2) resultado.push(calculo2);
    if (periodoApuracao >= 3 && calculo3) resultado.push(calculo3);
    
    return resultado;
  }, [calculo1, calculo2, calculo3, empresaAtual]);
  
  const isLoadingCalculos = isLoading1 || isLoading2 || isLoading3;
  const isFetchingCalculos = isFetching1 || isFetching2 || isFetching3;
  const isRecalculatingAny = isRecalculating1 || isRecalculating2 || isRecalculating3;
  
  // Buscar alocações
  const {
    alocacoes,
    isLoading: isLoadingAlocacoes
  } = useAlocacoes(empresaSelecionada);
  
  // Buscar cálculos segmentados
  const {
    calculosSegmentados,
    isLoading: isLoadingSegmentados
  } = useCalculosSegmentados(empresaSelecionada, mesAno.mes, mesAno.ano);
  
  // Buscar versões
  const {
    versoes,
    isLoading: isLoadingVersoes
  } = useVersoes(empresaSelecionada, mesAno.mes, mesAno.ano);
  
  // Hook de histórico com função de comparação
  const { compararVersoes } = useHistoricoVersoes(
    empresaSelecionada || '',
    mesAno.mes,
    mesAno.ano,
    false // Não buscar automaticamente, já temos as versões
  );
  
  // Selecionar primeira empresa automaticamente
  useEffect(() => {
    if (!empresaSelecionada && empresas && empresas.length > 0) {
      setEmpresaSelecionada(empresas[0].id);
    }
  }, [empresas, empresaSelecionada]);
  
  // Verificar se há excedentes
  const temExcedentes = useMemo(() => {
    if (!calculos[0] || !calculos[0].excedentes_horas) return false;
    const minutos = converterHorasParaMinutos(calculos[0].excedentes_horas);
    return minutos > 0;
  }, [calculos]);
  
  // Navegação temporal
  const handleMesAnterior = () => {
    const periodoApuracao = empresaAtual?.periodo_apuracao || 1;
    
    setMesAno(prev => {
      const novoMes = prev.mes - periodoApuracao;
      if (novoMes < 1) {
        return { mes: 12 + novoMes, ano: prev.ano - 1 };
      }
      return { mes: novoMes, ano: prev.ano };
    });
  };
  
  const handleProximoMes = () => {
    const periodoApuracao = empresaAtual?.periodo_apuracao || 1;
    
    setMesAno(prev => {
      const novoMes = prev.mes + periodoApuracao;
      if (novoMes > 12) {
        return { mes: novoMes - 12, ano: prev.ano + 1 };
      }
      return { mes: novoMes, ano: prev.ano };
    });
  };
  
  // Formatar período (mês ou trimestre)
  const formatarPeriodo = useMemo(() => {
    const periodoApuracao = empresaAtual?.periodo_apuracao || 1;
    
    if (periodoApuracao === 1) {
      // Mensal
      return `${MESES[mesAno.mes - 1]} ${mesAno.ano}`;
    } else if (periodoApuracao === 3) {
      // Trimestral
      const trimestre = Math.ceil(mesAno.mes / 3);
      const mesInicio = (trimestre - 1) * 3 + 1;
      const mesFim = trimestre * 3;
      return `${MESES[mesInicio - 1]} - ${MESES[mesFim - 1]} ${mesAno.ano}`;
    } else {
      // Outros períodos (semestral, anual, etc.)
      const mesInicio = Math.floor((mesAno.mes - 1) / periodoApuracao) * periodoApuracao + 1;
      const mesFim = mesInicio + periodoApuracao - 1;
      return `${MESES[mesInicio - 1]} - ${MESES[Math.min(mesFim, 12) - 1]} ${mesAno.ano}`;
    }
  }, [mesAno, empresaAtual]);
  
  // Handler de recálculo
  const handleRecalcular = async () => {
    try {
      const periodoApuracao = empresaAtual?.periodo_apuracao || 1;
      
      // Recalcular baseado no período
      if (periodoApuracao === 1) {
        await recalcular1();
      } else if (periodoApuracao === 2) {
        await Promise.all([recalcular1(), recalcular2()]);
      } else if (periodoApuracao >= 3) {
        await Promise.all([recalcular1(), recalcular2(), recalcular3()]);
      }
      
      toast({
        title: 'Recálculo concluído',
        description: 'O banco de horas foi recalculado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao recalcular:', error);
      toast({
        title: 'Erro ao recalcular',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };
  
  // Handler de exportação
  const handleExportar = () => {
    toast({
      title: 'Exportação em desenvolvimento',
      description: 'A funcionalidade de exportação será implementada em breve.',
    });
  };
  
  // Handler de histórico
  const handleHistorico = () => {
    setModalHistoricoAberto(true);
  };
  
  // Handler de sucesso do reajuste
  const handleReajusteSucesso = () => {
    const periodoApuracao = empresaAtual?.periodo_apuracao || 1;
    
    // Refetch baseado no período
    refetch1();
    if (periodoApuracao >= 2) refetch2();
    if (periodoApuracao >= 3) refetch3();
  };
  
  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    if (!calculos[0]) {
      return {
        baseline: '00:00',
        saldo: '00:00',
        repasse: '00:00',
        excedentes: 'R$ 0,00'
      };
    }
    
    return {
      baseline: calculos[0].baseline_horas || '00:00',
      saldo: calculos[0].saldo_horas || '00:00',
      repasse: calculos[0].repasse_horas || '00:00',
      excedentes: calculos[0].valor_a_faturar 
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculos[0].valor_a_faturar)
        : 'R$ 0,00'
    };
  }, [calculos]);
  
  // Determinar cor do saldo
  const saldoColor = useMemo(() => {
    if (!calculos[0] || !calculos[0].saldo_horas) return 'text-gray-900';
    const minutos = converterHorasParaMinutos(calculos[0].saldo_horas);
    if (minutos > 0) return 'text-green-600';
    if (minutos < 0) return 'text-red-600';
    return 'text-gray-900';
  }, [calculos]);
  
  // Verificar se há alocações
  const temAlocacoes = alocacoes && alocacoes.length > 0;
  
  // Loading state
  const isLoading = isLoadingEmpresas || isLoadingCalculos || isLoadingAlocacoes;
  
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Controle de Banco de Horas
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie o banco de horas por contratos de empresas clientes
              </p>
            </div>
          </div>

          {/* Cards de Estatísticas - MOVIDOS PARA CIMA */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-8 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : calculos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Baseline
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticas.baseline}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-xs lg:text-sm font-medium ${saldoColor}`}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Saldo
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-xl lg:text-2xl font-bold ${saldoColor}`}>
                    {estatisticas.saldo}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-sonda-blue">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Repasse
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-sonda-blue">
                    {estatisticas.repasse}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Excedentes
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-orange-600">
                    {estatisticas.excedentes}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Seletor de Empresa */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Empresa / Cliente
                </label>
                <Select
                  value={empresaSelecionada}
                  onValueChange={setEmpresaSelecionada}
                  disabled={isLoadingEmpresas}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas?.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.nome_abreviado || empresa.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Navegação Temporal - SEPARADA */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMesAnterior}
                    disabled={isLoading}
                    className="h-10 w-10 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatarPeriodo}
                    </div>
                    {temExcedentes && (
                      <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Excedentes
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProximoMes}
                    disabled={isLoading}
                    className="h-10 w-10 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conteúdo Principal */}
          {!empresaSelecionada ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2 font-medium">
                    Selecione uma empresa
                  </p>
                  <p className="text-sm text-gray-400">
                    Escolha uma empresa acima para visualizar o banco de horas
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <RefreshCw className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-500 mb-2 font-medium">
                    Carregando dados...
                  </p>
                  <p className="text-sm text-gray-400">
                    Aguarde enquanto buscamos os cálculos do banco de horas
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : !calculos[0] ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4 font-medium">
                    Nenhum cálculo disponível
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    Não há cálculos para este período. Clique em "Recalcular" para gerar.
                  </p>
                  <Button
                    className="bg-sonda-blue hover:bg-sonda-dark-blue"
                    onClick={handleRecalcular}
                    disabled={isRecalculatingAny}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRecalculatingAny ? 'animate-spin' : ''}`} />
                    {isRecalculatingAny ? 'Calculando...' : 'Calcular Agora'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'consolidada' | 'segmentada')} className="w-full">
              <TabsList className="bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="consolidada"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
                >
                  Visão Consolidada
                </TabsTrigger>
                <TabsTrigger 
                  value="segmentada"
                  className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
                  disabled={!temAlocacoes}
                >
                  Visão Segmentada
                  {temAlocacoes && (
                    <Badge className="ml-2 bg-sonda-blue/10 text-sonda-blue text-xs">
                      {alocacoes.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="consolidada" className="mt-6">
                <VisaoConsolidada
                  calculos={calculos}
                  periodoApuracao={empresaAtual?.periodo_apuracao || 1}
                  onReajusteClick={() => setModalReajusteAberto(true)}
                  onHistoricoClick={handleHistorico}
                  onExportClick={handleExportar}
                  disabled={isFetchingCalculos || isRecalculatingAny}
                />
              </TabsContent>

              <TabsContent value="segmentada" className="mt-6">
                {temAlocacoes ? (
                  isLoadingSegmentados ? (
                    <Card>
                      <CardContent className="py-12">
                        <div className="text-center">
                          <RefreshCw className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-spin" />
                          <p className="text-gray-500">
                            Carregando cálculos segmentados...
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <VisaoSegmentada
                      calculos={calculosSegmentados}
                      alocacoes={alocacoes}
                    />
                  )
                ) : (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-2 font-medium">
                          Nenhuma alocação cadastrada
                        </p>
                        <p className="text-sm text-gray-400">
                          Configure alocações na empresa para visualizar a visão segmentada
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Modal de Reajuste */}
      {empresaSelecionada && calculos[0] && (
        <ModalReajuste
          open={modalReajusteAberto}
          onClose={() => setModalReajusteAberto(false)}
          empresaId={empresaSelecionada}
          mes={calculos[0].mes}
          ano={calculos[0].ano}
          calculoAtual={calculos[0]}
          onSuccess={handleReajusteSucesso}
        />
      )}

      {/* Modal de Histórico */}
      {empresaSelecionada && calculos[0] && (
        <ModalHistorico
          open={modalHistoricoAberto}
          onClose={() => setModalHistoricoAberto(false)}
          empresaId={empresaSelecionada}
          mes={calculos[0].mes}
          ano={calculos[0].ano}
          versoes={versoes || []}
          isLoading={isLoadingVersoes}
          onCompararVersoes={compararVersoes}
        />
      )}
    </AdminLayout>
  );
}
