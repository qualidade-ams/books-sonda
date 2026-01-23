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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { VisaoConsolidada } from '@/components/admin/banco-horas/VisaoConsolidada';
import { VisaoSegmentada } from '@/components/admin/banco-horas/VisaoSegmentada';
import { ModalHistorico } from '@/components/admin/banco-horas/ModalHistorico';

import { 
  useBancoHorasCalculos,
  useAlocacoes,
  useCalculosSegmentados,
  useVersoesPeriodo
} from '@/hooks/useBancoHoras';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useRequerimentos } from '@/hooks/useRequerimentos';
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
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);
  
  // Buscar empresas
  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas();
  
  // Buscar empresa selecionada para obter período de apuração
  const empresaAtual = useMemo(() => {
    return empresas?.find(e => e.id === empresaSelecionada);
  }, [empresas, empresaSelecionada]);
  
  // Calcular os meses do período baseado na vigência
  const mesesDoPeriodo = useMemo(() => {
    if (!empresaAtual?.inicio_vigencia || !empresaAtual?.periodo_apuracao) {
      // Fallback: usar meses sequenciais
      return [
        { mes: mesAno.mes, ano: mesAno.ano },
        { mes: mesAno.mes + 1 > 12 ? mesAno.mes + 1 - 12 : mesAno.mes + 1, ano: mesAno.mes + 1 > 12 ? mesAno.ano + 1 : mesAno.ano },
        { mes: mesAno.mes + 2 > 12 ? mesAno.mes + 2 - 12 : mesAno.mes + 2, ano: mesAno.mes + 2 > 12 ? mesAno.ano + 1 : mesAno.ano }
      ];
    }

    const inicioVigencia = new Date(empresaAtual.inicio_vigencia);
    const mesInicio = inicioVigencia.getUTCMonth() + 1;
    const anoInicio = inicioVigencia.getUTCFullYear();
    const periodoApuracao = empresaAtual.periodo_apuracao;

    // Calcular quantos meses se passaram desde o início da vigência até o mês atual
    const mesesPassados = ((mesAno.ano - anoInicio) * 12) + (mesAno.mes - mesInicio);
    
    // Calcular o início do período atual (múltiplo do período de apuração)
    const periodosCompletos = Math.floor(mesesPassados / periodoApuracao);
    const mesesAteInicioPeriodo = periodosCompletos * periodoApuracao;
    
    // Calcular o primeiro mês do período atual
    let mesInicioPeriodo = mesInicio + mesesAteInicioPeriodo;
    let anoInicioPeriodo = anoInicio;
    
    while (mesInicioPeriodo > 12) {
      mesInicioPeriodo -= 12;
      anoInicioPeriodo += 1;
    }
    
    // Gerar array com todos os meses do período
    const meses = [];
    for (let i = 0; i < periodoApuracao; i++) {
      let mes = mesInicioPeriodo + i;
      let ano = anoInicioPeriodo;
      
      while (mes > 12) {
        mes -= 12;
        ano += 1;
      }
      
      meses.push({ mes, ano });
    }
    
    return meses;
  }, [mesAno, empresaAtual]);

  // Buscar cálculo do primeiro mês (sempre necessário)
  const {
    calculo: calculo1,
    isLoading: isLoading1,
    isFetching: isFetching1,
    recalcular: recalcular1,
    isRecalculating: isRecalculating1
  } = useBancoHorasCalculos(empresaSelecionada, mesesDoPeriodo[0].mes, mesesDoPeriodo[0].ano);
  
  // Buscar cálculo do segundo mês (condicional ao período)
  const {
    calculo: calculo2,
    isLoading: isLoading2,
    isFetching: isFetching2,
    recalcular: recalcular2,
    isRecalculating: isRecalculating2
  } = useBancoHorasCalculos(
    empresaAtual?.periodo_apuracao && empresaAtual.periodo_apuracao >= 2 ? empresaSelecionada : undefined,
    mesesDoPeriodo[1]?.mes,
    mesesDoPeriodo[1]?.ano
  );
  
  // Buscar cálculo do terceiro mês (condicional ao período)
  const {
    calculo: calculo3,
    isLoading: isLoading3,
    isFetching: isFetching3,
    recalcular: recalcular3,
    isRecalculating: isRecalculating3
  } = useBancoHorasCalculos(
    empresaAtual?.periodo_apuracao && empresaAtual.periodo_apuracao >= 3 ? empresaSelecionada : undefined,
    mesesDoPeriodo[2]?.mes,
    mesesDoPeriodo[2]?.ano
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
  
  // Buscar versões de todos os meses do período
  const {
    versoes,
    isLoading: isLoadingVersoes,
    refetch: refetchVersoes
  } = useVersoesPeriodo(empresaSelecionada, mesesDoPeriodo);
  
  // Buscar requerimentos do período
  // ✅ Buscar TODOS os requerimentos do cliente primeiro
  const { data: requerimentosTodos, isLoading: isLoadingRequerimentos } = useRequerimentos(
    empresaSelecionada ? {
      cliente_id: empresaSelecionada
    } : undefined
  );
  
  // Filtrar requerimentos CONCLUÍDOS do período atual (com data de aprovação)
  // ✅ CORRIGIDO: Filtrar apenas tipo_cobranca = 'Banco de Horas'
  const requerimentosConcluidos = useMemo(() => {
    if (!requerimentosTodos || !mesesDoPeriodo) return [];
    
    const mesesPeriodoStr = mesesDoPeriodo.map(m => 
      `${String(m.mes).padStart(2, '0')}/${m.ano}`
    );
    
    return requerimentosTodos.filter(req => 
      req.mes_cobranca && 
      mesesPeriodoStr.includes(req.mes_cobranca) &&
      req.data_aprovacao && // Apenas requerimentos com data de aprovação
      req.tipo_cobranca === 'Banco de Horas' // ✅ ADICIONADO: Apenas Banco de Horas
    );
  }, [requerimentosTodos, mesesDoPeriodo]);
  
  // Filtrar requerimentos NÃO CONCLUÍDOS do período atual (sem data de aprovação)
  // ✅ CORRIGIDO: Filtrar apenas tipo_cobranca = 'Banco de Horas'
  const requerimentosNaoConcluidos = useMemo(() => {
    if (!requerimentosTodos || !mesesDoPeriodo) return [];
    
    const mesesPeriodoStr = mesesDoPeriodo.map(m => 
      `${String(m.mes).padStart(2, '0')}/${m.ano}`
    );
    
    const naoConcluidos = requerimentosTodos.filter(req => 
      req.mes_cobranca && 
      mesesPeriodoStr.includes(req.mes_cobranca) &&
      !req.data_aprovacao && // Apenas requerimentos SEM data de aprovação
      req.tipo_cobranca === 'Banco de Horas' // ✅ ADICIONADO: Apenas Banco de Horas
    );
    
    console.log('🔍 [DEBUG] Requerimentos Não Concluídos:', {
      total: requerimentosTodos.length,
      mesesPeriodo: mesesPeriodoStr,
      naoConcluidos: naoConcluidos.length,
      detalhes: naoConcluidos.map(r => ({
        chamado: r.chamado,
        mes_cobranca: r.mes_cobranca,
        data_aprovacao: r.data_aprovacao,
        tipo_cobranca: r.tipo_cobranca // ✅ ADICIONADO para debug
      }))
    });
    
    return naoConcluidos;
  }, [requerimentosTodos, mesesDoPeriodo]);
  // ✅ REMOVIDO: Não selecionar empresa automaticamente
  // Usuário deve escolher manualmente no dropdown
  
  // Calcular trimestre sequencialmente quando empresa muda
  useEffect(() => {
    if (!empresaSelecionada || !mesesDoPeriodo || mesesDoPeriodo.length === 0) return;
    
    const calcularTrimestreSequencial = async () => {
      try {
        console.log('🔄 Calculando trimestre sequencialmente...');
        
        // Calcular cada mês em sequência (não em paralelo!)
        for (let i = 0; i < mesesDoPeriodo.length; i++) {
          const { mes, ano } = mesesDoPeriodo[i];
          console.log(`📅 Calculando mês ${mes}/${ano}...`);
          
          // Forçar recálculo para garantir que o repasse do mês anterior seja buscado
          if (i === 0) {
            await recalcular1();
          } else if (i === 1) {
            await recalcular2();
          } else if (i === 2) {
            await recalcular3();
          }
          
          // Aguardar um pouco para garantir que o banco salvou
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('✅ Trimestre calculado com sucesso!');
        
        // Exibir toast apenas uma vez no final
        toast({
          title: 'Cálculo concluído',
          description: `${mesesDoPeriodo.length} mês(es) calculado(s) com sucesso`,
        });
      } catch (error) {
        console.error('❌ Erro ao calcular trimestre:', error);
        toast({
          title: 'Erro ao calcular',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    };
    
    // Executar apenas uma vez quando a empresa muda
    calcularTrimestreSequencial();
  }, [empresaSelecionada]); // Apenas quando empresa muda
  
  // Verificar se há alocações
  const temAlocacoes = alocacoes && alocacoes.length > 0;
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
  
  // Formatar período baseado nos meses reais do período
  const formatarPeriodo = useMemo(() => {
    if (mesesDoPeriodo.length === 1) {
      // Mensal - ano abreviado (ex: Novembro/25)
      const anoAbreviado = String(mesesDoPeriodo[0].ano).slice(-2);
      return `${MESES[mesesDoPeriodo[0].mes - 1]}/${anoAbreviado}`;
    } else {
      // Múltiplos meses - mostrar intervalo
      const primeiro = mesesDoPeriodo[0];
      const ultimo = mesesDoPeriodo[mesesDoPeriodo.length - 1];
      
      // Anos abreviados (ex: 2025 -> 25)
      const anoAbreviadoPrimeiro = String(primeiro.ano).slice(-2);
      const anoAbreviadoUltimo = String(ultimo.ano).slice(-2);
      
      if (primeiro.ano === ultimo.ano) {
        // Mesmo ano (ex: Novembro - Dezembro/25)
        return `${MESES[primeiro.mes - 1]} - ${MESES[ultimo.mes - 1]}/${anoAbreviadoPrimeiro}`;
      } else {
        // Anos diferentes (ex: Novembro/25 - Janeiro/26)
        return `${MESES[primeiro.mes - 1]}/${anoAbreviadoPrimeiro} - ${MESES[ultimo.mes - 1]}/${anoAbreviadoUltimo}`;
      }
    }
  }, [mesesDoPeriodo]);
  
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
  
  // Handler de histórico
  const handleHistorico = async () => {
    console.log('📖 Abrindo histórico...');
    console.log('🔄 Forçando refetch de versões...');
    
    // Forçar refetch das versões antes de abrir o modal
    await refetchVersoes();
    
    console.log('✅ Versões atualizadas, abrindo modal...');
    setModalHistoricoAberto(true);
  };
  
  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    if (!calculos[0]) {
      return {
        baseline: '00:00',
        saldoMesVigente: '00:00',
        requerimentosTrimestre: '00:00',
        excedentes: 'R$ 0,00'
      };
    }
    
    // Saldo do mês vigente (último mês do período)
    const mesVigente = calculos[calculos.length - 1];
    
    // Totalizar requerimentos do trimestre
    let totalRequerimentosMinutos = 0;
    calculos.forEach(calculo => {
      if (calculo.requerimentos_horas) {
        totalRequerimentosMinutos += converterHorasParaMinutos(calculo.requerimentos_horas);
      }
    });
    
    const requerimentosHoras = Math.floor(totalRequerimentosMinutos / 60);
    const requerimentosMinutos = totalRequerimentosMinutos % 60;
    const requerimentosFormatado = `${String(requerimentosHoras).padStart(2, '0')}:${String(requerimentosMinutos).padStart(2, '0')}`;
    
    // Calcular valor total dos excedentes (último mês do período)
    const valorExcedentes = mesVigente.valor_a_faturar 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mesVigente.valor_a_faturar)
      : 'R$ 0,00';
    
    return {
      baseline: calculos[0].baseline_horas || '00:00',
      saldoMesVigente: mesVigente.saldo_horas || '00:00',
      requerimentosTrimestre: requerimentosFormatado,
      excedentes: valorExcedentes
    };
  }, [calculos]);
  
  // Determinar cor do saldo do mês vigente
  const saldoColor = useMemo(() => {
    if (calculos.length === 0) return 'text-gray-900';
    const mesVigente = calculos[calculos.length - 1];
    if (!mesVigente || !mesVigente.saldo_horas) return 'text-gray-900';
    const minutos = converterHorasParaMinutos(mesVigente.saldo_horas);
    if (minutos > 0) return 'text-green-600';
    if (minutos < 0) return 'text-red-600';
    return 'text-gray-900';
  }, [calculos]);
  
  // Loading state
  const isLoading = isLoadingEmpresas || isLoadingCalculos || isLoadingAlocacoes || isLoadingRequerimentos;
  
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Controle de Banco de Horas
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Gerencie o banco de horas por contratos de empresas clientes
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalcular}
                disabled={!empresaSelecionada || isRecalculatingAny || isLoading}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${isRecalculatingAny ? 'animate-spin' : ''}`} />
                <span className="text-sm">{isRecalculatingAny ? 'Recalculando...' : 'Recalcular'}</span>
              </Button>
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
                      Saldo Mês Vigente
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className={`text-xl lg:text-2xl font-bold ${saldoColor}`}>
                    {estatisticas.saldoMesVigente}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-sonda-blue">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Requerimentos Trimestre
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl lg:text-2xl font-bold text-sonda-blue">
                    {estatisticas.requerimentosTrimestre}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
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

          {/* Navegação Temporal */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMesAnterior}
                  disabled={isLoading}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                <div className="text-center flex-1">
                  <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                    {formatarPeriodo}
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProximoMes}
                  disabled={isLoading}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
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
                  percentualRepasseMensal={empresaAtual?.percentual_repasse_mensal || 100}
                  mesesDoPeriodo={mesesDoPeriodo}
                  requerimentos={requerimentosConcluidos || []}
                  requerimentosNaoConcluidos={requerimentosNaoConcluidos || []}
                  onHistoricoClick={handleHistorico}
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
        />
      )}
    </AdminLayout>
  );
}
