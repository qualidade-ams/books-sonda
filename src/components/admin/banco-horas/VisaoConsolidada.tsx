/**
 * VisaoConsolidada Component
 * 
 * Displays all calculated fields for the consolidated view of monthly hours bank calculations
 * in a table format similar to the reference image provided.
 * 
 * @module components/admin/banco-horas/VisaoConsolidada
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  History,
  Eye,
  FileText,
  Clock,
  RefreshCw,
  AlertCircle,
  Copy,
  Filter,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';
import { getCobrancaIcon, getBadgeClasses } from '@/utils/requerimentosColors';
import RequerimentoViewModal from '@/components/admin/requerimentos/RequerimentoViewModal';
import { BotaoReajusteHoras } from './BotaoReajusteHoras';
import { BotaoForcarRecalculo } from './BotaoForcarRecalculo';
import { SecaoObservacoes } from './SecaoObservacoes';
import { useBancoHorasReajustes } from '@/hooks/useBancoHorasReajustes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { converterParaHorasDecimal } from '@/utils/horasUtils'; // ✅ ADICIONADO
import { calcularNomePeriodoComIdioma } from '@/utils/periodoVigenciaUtils';
import { getLabels, getMonthName } from '@/utils/bancoHorasI18n';
import { useTemplateLanguage } from '@/hooks/useTemplateLanguage';
import { useTaxasEspecificasCliente, type TaxasEspecificasCliente } from '@/hooks/useTaxasEspecificasCliente';

/**
 * Props for VisaoConsolidada component
 */
export interface VisaoConsolidadaProps {
  /** Array of monthly calculations (one for each month in the period) */
  calculos: BancoHorasCalculo[];
  
  /** Period of appraisal (1=monthly, 3=quarterly, etc.) */
  periodoApuracao: number;
  
  /** Callback when "Ver Histórico" button is clicked */
  onHistoricoClick: () => void;
  
  /** Callback when "Filtros" button is clicked */
  onFiltrosClick: () => void;
  
  /** Whether filters area is visible */
  showFilters: boolean;
  
  /** Current month/year selection */
  mesAno: { mes: number; ano: number };
  
  /** Callback when period is changed via filter */
  onPeriodoChange: (mes: number, ano: number) => void;
  
  /** Whether actions are disabled (e.g., during loading) */
  disabled?: boolean;
  
  /** Percentual de repasse mensal cadastrado no cliente (0-100) */
  percentualRepasseMensal?: number;
  
  /** Array com os meses reais do período (calculados baseado na vigência) */
  mesesDoPeriodo?: Array<{ mes: number; ano: number }>;
  
  /** Requerimentos concluídos do período para exibição */
  requerimentos?: Requerimento[];
  
  /** Requerimentos não concluídos do período para exibição */
  requerimentosNaoConcluidos?: Requerimento[];
  
  /** Requerimentos em desenvolvimento (não enviados) do período para exibição */
  requerimentosEmDesenvolvimento?: Requerimento[];
  
  /** Tipo de cobrança do cliente ('Banco de Horas' ou 'Ticket') */
  tipoCobranca?: string;
  
  /** Início da vigência da empresa (para cálculo do período) */
  inicioVigencia?: string;
  
  /** Template padrão da empresa (para detectar idioma) */
  templatePadrao?: string;
  
  /** Empresa atual (para cálculo de períodos disponíveis) */
  empresaAtual?: any;
}

/**
 * Formats hours from HH:MM string to display format
 * Remove o sinal de menos para valores negativos (serão exibidos em vermelho)
 */
const formatarHoras = (horas?: string): string => {
  if (!horas || horas === '0:00' || horas === '00:00') return '';
  
  // Remover sinal de menos se existir
  const horasSemSinal = horas.startsWith('-') ? horas.substring(1) : horas;
  
  // Garantir formato HH:MM (remover segundos se existir)
  const parts = horasSemSinal.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return horasSemSinal;
};

/**
 * Converte HH:MM para número inteiro de tickets
 * Cada hora = 1 ticket
 */
const converterHorasParaTickets = (horas?: string): number => {
  if (!horas || horas === '0:00' || horas === '00:00') return 0;
  
  // Verificar se é negativo
  const isNegativo = horas.startsWith('-');
  const horasSemSinal = isNegativo ? horas.substring(1) : horas;
  
  // Converter para decimal (ex: "15:30" -> 15.5)
  const horasDecimal = converterParaHorasDecimal(horasSemSinal);
  
  // Arredondar para inteiro
  const tickets = Math.round(horasDecimal);
  
  return isNegativo ? -tickets : tickets;
};

/**
 * Formata valor baseado no tipo de cobrança
 * - 'ticket': Exibe tickets como número inteiro (ex: "15" ou "0")
 * - Outros: Exibe como horas (ex: "15:30" ou "00:00")
 */
const formatarValor = (
  horas?: string, 
  tickets?: number, 
  tipoCobranca?: string
): string => {
  // Se for tipo ticket (singular ou plural), usar o campo de tickets diretamente
  if (tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets') {
    // Se não tem valor ou é undefined/null, retornar "0"
    if (tickets === undefined || tickets === null) return '0';
    return tickets.toString();
  }
  
  // Caso contrário, usar horas
  if (!horas || horas === '0:00' || horas === '00:00' || horas === '00:00:00') return '00:00';
  return formatarHoras(horas);
};

/**
 * Formats monetary values to Brazilian Real
 */
const formatarMoeda = (valor?: number): string => {
  if (valor === undefined || valor === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

/**
 * Converts HH:MM to minutes for comparison
 * Lida com valores negativos (com sinal de menos)
 */
const horasParaMinutos = (horas: string): number => {
  // Verificar se é negativo
  const isNegativo = horas.startsWith('-');
  const horasSemSinal = isNegativo ? horas.substring(1) : horas;
  
  const [h, m] = horasSemSinal.split(':').map(Number);
  const minutos = (h * 60) + m;
  
  return isNegativo ? -minutos : minutos;
};

/**
 * Determines color class based on value (positive/negative/zero)
 */
const getColorClass = (horas?: string): string => {
  if (!horas) return 'text-gray-900';
  
  // Verificar se é negativo pelo sinal de menos
  const isNegativo = horas.startsWith('-');
  
  if (isNegativo) return 'text-red-600';
  
  // Se não tem sinal de menos, verificar se é positivo
  const minutos = horasParaMinutos(horas);
  if (minutos > 0) return 'text-green-600';
  
  return 'text-gray-900';
};

/**
 * Determines color class based on value (works for both hours and tickets)
 * Usa horas OU tickets dependendo do tipo de cobrança
 */
const getColorClassDinamico = (
  horas?: string, 
  tickets?: number, 
  tipoCobranca?: string
): string => {
  // Se for tipo ticket (singular ou plural), usar valor de tickets
  if (tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets') {
    if (tickets === undefined || tickets === null) return 'text-gray-900';
    if (tickets > 0) return 'text-green-600';
    if (tickets < 0) return 'text-red-600';
    return 'text-gray-900';
  }
  
  // Caso contrário, usar horas
  return getColorClass(horas);
};

/**
 * VisaoConsolidada Component
 * 
 * Displays the consolidated view of monthly hours bank calculations in a table format.
 */
export function VisaoConsolidada({
  calculos,
  periodoApuracao,
  onHistoricoClick,
  onFiltrosClick,
  showFilters,
  mesAno,
  onPeriodoChange,
  disabled = false,
  percentualRepasseMensal = 100,
  mesesDoPeriodo,
  requerimentos = [],
  requerimentosNaoConcluidos = [],
  requerimentosEmDesenvolvimento = [],
  tipoCobranca,
  inicioVigencia,
  templatePadrao,
  empresaAtual
}: VisaoConsolidadaProps) {
  // Usar primeiro cálculo para informações gerais (DEVE SER PRIMEIRO)
  const calculoPrincipal = calculos[0];
  
  // Detectar idioma do template baseado no nome na tabela email_templates
  const { isEnglish, isLoading: isLoadingTemplate } = useTemplateLanguage(templatePadrao);
  const labels = getLabels(isEnglish);
  
  // Buscar taxas específicas do cliente (para casos especiais como EXXONMOBIL)
  const { taxasEspecificas, isLoading: isLoadingTaxas } = useTaxasEspecificasCliente(calculoPrincipal?.empresa_id) as {
    taxasEspecificas: TaxasEspecificasCliente | null | undefined;
    isLoading: boolean;
  };
  
  // Log para debug
  console.log('📊 [VisaoConsolidada] Props recebidas:', {
    requerimentosConcluidos: requerimentos.length,
    requerimentosNaoConcluidos: requerimentosNaoConcluidos.length,
    requerimentosEmDesenvolvimento: requerimentosEmDesenvolvimento.length,
    tipoCobranca,
    templatePadrao,
    isEnglish,
    isLoadingTemplate,
    taxasEspecificas
  });
  
  // Calcular total de horas/tickets dos requerimentos em desenvolvimento
  const totalRequerimentosEmDesenvolvimento = useMemo(() => {
    let totalHorasDecimal = 0;
    let totalTickets = 0;
    
    requerimentosEmDesenvolvimento.forEach(req => {
      // Somar horas funcional
      if (req.horas_funcional) {
        const horas = typeof req.horas_funcional === 'string' 
          ? converterParaHorasDecimal(req.horas_funcional)
          : req.horas_funcional;
        totalHorasDecimal += horas;
      }
      
      // Somar horas técnico
      if (req.horas_tecnico) {
        const horas = typeof req.horas_tecnico === 'string'
          ? converterParaHorasDecimal(req.horas_tecnico)
          : req.horas_tecnico;
        totalHorasDecimal += horas;
      }
      
      // Somar tickets
      if (req.quantidade_tickets) {
        totalTickets += req.quantidade_tickets;
      }
    });
    
    // Converter total de horas decimais para HH:MM
    const horas = Math.floor(totalHorasDecimal);
    const minutos = Math.round((totalHorasDecimal % 1) * 60);
    const horasFormatadas = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    
    return {
      horas: horasFormatadas,
      tickets: totalTickets
    };
  }, [requerimentosEmDesenvolvimento]);
  
  // Hook de autenticação
  const { user } = useAuth();
  
  // Hook de toast para notificações
  const { toast } = useToast();
  
  // Hook de reajustes
  const { criarReajuste, isCreating } = useBancoHorasReajustes();
  
  // Query client para invalidar cache
  const queryClient = useQueryClient();
  
  // Estados para visualização de requerimento
  const [requerimentoSelecionado, setRequerimentoSelecionado] = useState<Requerimento | null>(null);
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  
  // Estado para última sincronização de apontamentos
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<Date | null>(null);
  const [carregandoSincronizacao, setCarregandoSincronizacao] = useState(true);
  
  // Buscar data da última sincronização de apontamentos_aranda
  useEffect(() => {
    const buscarUltimaSincronizacao = async () => {
      try {
        setCarregandoSincronizacao(true);
        
        // Criar timeout de 5 segundos para evitar travamento
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao buscar sincronização')), 5000)
        );
        
        // Buscar o registro mais recente da tabela apontamentos_aranda
        // OTIMIZADO: Usa índice idx_apontamentos_aranda_updated_at para performance
        const queryPromise = supabase
          .from('apontamentos_aranda' as any)
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('Erro ao buscar última sincronização:', error);
          setUltimaSincronizacao(null);
        } else if (data) {
          // Usar updated_at como referência da última sincronização
          setUltimaSincronizacao(new Date((data as any).updated_at));
        }
      } catch (error) {
        console.error('Erro ao buscar última sincronização:', error);
        setUltimaSincronizacao(null);
      } finally {
        setCarregandoSincronizacao(false);
      }
    };
    
    buscarUltimaSincronizacao();
  }, []); // Executar apenas uma vez ao montar o componente
  
  // Usar último cálculo do período para valor_a_faturar (é onde o valor é calculado)
  const calculoFimPeriodo = calculos.find(c => c.is_fim_periodo) || calculos[calculos.length - 1];
  
  // Debug: verificar taxa_hora_utilizada
  console.log('🔍 [VisaoConsolidada] Taxa hora utilizada:', {
    calculoPrincipal_taxa: calculoPrincipal?.taxa_hora_utilizada,
    calculoFimPeriodo_taxa: calculoFimPeriodo?.taxa_hora_utilizada,
    calculoPrincipal_taxa_ticket: calculoPrincipal?.taxa_ticket_utilizada,
    calculoFimPeriodo_taxa_ticket: calculoFimPeriodo?.taxa_ticket_utilizada,
    tipoCobranca,
    todos_calculos: calculos.map(c => ({
      mes: c.mes,
      ano: c.ano,
      taxa_hora_utilizada: c.taxa_hora_utilizada,
      taxa_ticket_utilizada: c.taxa_ticket_utilizada
    }))
  });
  
  // Buscar taxa conforme tipo de cobrança (singular ou plural)
  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
  
  // Buscar taxa de qualquer cálculo que tenha o valor (fallback robusto)
  const taxaHoraCalculada = isTicket
    ? (calculoFimPeriodo?.taxa_ticket_utilizada || 
       calculoPrincipal?.taxa_ticket_utilizada || 
       calculos.find(c => c.taxa_ticket_utilizada)?.taxa_ticket_utilizada)
    : (calculoFimPeriodo?.taxa_hora_utilizada || 
       calculoPrincipal?.taxa_hora_utilizada || 
       calculos.find(c => c.taxa_hora_utilizada)?.taxa_hora_utilizada);
  
  // Função para determinar qual taxa usar baseada na empresa
  const getTaxaExcedente = useMemo(() => {
    console.log('🔍 [VisaoConsolidada] Debug taxas completo:', {
      empresa_id: calculoPrincipal?.empresa_id,
      taxasEspecificas: taxasEspecificas,
      ticket_excedente_simples: taxasEspecificas?.ticket_excedente_simples,
      taxaHoraCalculada: taxaHoraCalculada,
      isLoadingTaxas: isLoadingTaxas,
      tipoCobranca: tipoCobranca,
      isTicket: isTicket,
      // ✅ ADICIONADO: Debug detalhado dos cálculos
      calculos_debug: calculos.map(c => ({
        mes: c.mes,
        ano: c.ano,
        taxa_hora_utilizada: c.taxa_hora_utilizada,
        taxa_ticket_utilizada: c.taxa_ticket_utilizada,
        is_fim_periodo: c.is_fim_periodo
      })),
      calculoPrincipal_taxa_hora: calculoPrincipal?.taxa_hora_utilizada,
      calculoFimPeriodo_taxa_hora: calculoFimPeriodo?.taxa_hora_utilizada
    });
    
    // Verificar se tem taxa específica cadastrada (para clientes especiais como EXXONMOBIL)
    if (taxasEspecificas?.ticket_excedente_simples && taxasEspecificas.ticket_excedente_simples > 0) {
      console.log('💰 [VisaoConsolidada] Usando taxa específica cadastrada:', {
        cliente_id: taxasEspecificas.cliente_id,
        ticket_excedente_simples: taxasEspecificas.ticket_excedente_simples,
        valor_formatado: new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(taxasEspecificas.ticket_excedente_simples)
      });
      return taxasEspecificas.ticket_excedente_simples;
    }
    
    // ✅ CORREÇÃO: Se não tem taxa específica, usar taxa calculada do banco de horas
    if (taxaHoraCalculada && taxaHoraCalculada > 0) {
      console.log('💰 [VisaoConsolidada] Usando taxa calculada do banco de horas:', {
        taxaHoraCalculada: taxaHoraCalculada,
        valor_formatado: new Intl.NumberFormat('pt-BR', { 
          style: 'currency', 
          currency: 'BRL' 
        }).format(taxaHoraCalculada)
      });
      return taxaHoraCalculada;
    }
    
    // Se não tem nenhuma taxa, retornar 0
    console.log('⚠️ [VisaoConsolidada] Nenhuma taxa encontrada - usando R$ 0,00', {
      motivo: 'taxaHoraCalculada é null, undefined ou 0',
      taxaHoraCalculada: taxaHoraCalculada,
      taxasEspecificas: taxasEspecificas
    });
    return 0;
  }, [taxasEspecificas, taxaHoraCalculada, isLoadingTaxas, calculoPrincipal, tipoCobranca, isTicket, calculos, calculoFimPeriodo]);
  
  const taxaHoraExibir = getTaxaExcedente;
  
  const temExcedentes = calculoPrincipal?.excedentes_horas && horasParaMinutos(calculoPrincipal.excedentes_horas) > 0;
  
  // Nomes dos meses traduzidos
  const MESES = useMemo(() => {
    if (isEnglish) {
      return [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
    } else {
      return [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
    }
  }, [isEnglish]);

  // Calcular nome do período atual
  const nomePeriodoAtual = useMemo(() => {
    if (!mesesDoPeriodo || mesesDoPeriodo.length === 0) {
      return labels.periodos.vigenciaNaoIniciada;
    }
    
    // Usar o primeiro mês do período como referência
    const mesReferencia = mesesDoPeriodo[0];
    
    return calcularNomePeriodoComIdioma(
      inicioVigencia,
      periodoApuracao,
      mesReferencia.mes,
      mesReferencia.ano,
      isEnglish
    );
  }, [inicioVigencia, periodoApuracao, mesesDoPeriodo, isEnglish, labels]);

  // Função para salvar reajuste (chamada pelo BotaoReajusteHoras)
  const handleSalvarReajuste = async (dados: {
    mes: number;
    ano: number;
    empresaId: string;
    horas: string;
    tickets: number;
    tipo: 'entrada' | 'saida';
    observacao: string;
    empresaSegmentada?: string;
  }) => {
    try {
      console.log('💾 Salvando reajuste...', {
        empresaSegmentada: dados.empresaSegmentada
      });
      
      // IMPORTANTE: criarReajuste JÁ recalcula todos os meses subsequentes no backend
      // Aguardar a conclusão completa do recálculo antes de invalidar cache
      const resultado = await criarReajuste({
        empresa_id: dados.empresaId,
        mes: dados.mes,
        ano: dados.ano,
        valor_horas: dados.horas,
        valor_tickets: dados.tickets,
        tipo: dados.tipo,
        observacao: dados.observacao,
        empresa_segmentada: dados.empresaSegmentada,
        created_by: user?.id
      });
      
      console.log('✅ Reajuste salvo e meses recalculados:', {
        reajuste_id: resultado.reajuste_id,
        versao_id: resultado.versao_id,
        meses_recalculados: resultado.meses_recalculados
      });
      
      console.log('⏳ Aguardando estabilização do banco de dados...');
      
      // Aguardar um pouco para garantir que todas as transações foram commitadas
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🔄 Invalidando cache e forçando refetch...');
      
      // Invalidar TODOS os caches relacionados
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-versoes'],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-reajustes'],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-calculo'],
          refetchType: 'all'
        }),
        queryClient.invalidateQueries({ 
          queryKey: ['banco-horas-calculos-segmentados'],
          refetchType: 'all'
        })
      ]);
      
      console.log('🔄 Forçando refetch imediato de TODOS os meses...');
      
      // Forçar refetch imediato de TODAS as queries relacionadas em paralelo
      await Promise.all([
        queryClient.refetchQueries({ 
          queryKey: ['banco-horas-versoes'],
          type: 'all'
        }),
        queryClient.refetchQueries({ 
          queryKey: ['banco-horas-reajustes'],
          type: 'all'
        }),
        queryClient.refetchQueries({ 
          queryKey: ['banco-horas-calculo'],
          type: 'all'
        }),
        queryClient.refetchQueries({ 
          queryKey: ['banco-horas-calculos-segmentados'],
          type: 'all'
        })
      ]);
      
      console.log('✅ Cache invalidado e dados recarregados!');
      console.log('⏳ Aguardando renderização final...');
      
      // Aguardar mais um pouco para garantir que o React Query processou tudo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Reajuste concluído com sucesso! Todos os meses foram recalculados e atualizados.');
      
      // NÃO abrir histórico automaticamente - deixar usuário decidir
      // onHistoricoClick();
    } catch (error) {
      console.error('❌ Erro ao salvar reajuste:', error);
      throw error; // Propagar erro para o componente filho tratar
    }
  };

  // Função para visualizar requerimento
  const handleVisualizarRequerimento = (requerimento: Requerimento) => {
    setRequerimentoSelecionado(requerimento);
    setModalVisualizacaoAberto(true);
  };

  // Verificar se o período selecionado é diferente do mês atual
  const isMesAtual = useMemo(() => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    return mesAno.mes === mesAtual && mesAno.ano === anoAtual;
  }, [mesAno]);

  // Função para limpar filtro (voltar ao mês atual)
  const handleLimparFiltro = () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    
    onPeriodoChange(mesAtual, anoAtual);
  };

  return (
    <Card className="rounded-xl overflow-hidden">
      {/* Cabeçalho de Impressão (visível apenas ao imprimir) */}
      <div className="hidden print:block print-header">
        <h1>Controle de Banco de Horas - Visão Consolidada</h1>
        <p>
          Empresa: {calculos[0]?.empresa_id} | 
          Período: {mesesDoPeriodo?.map(m => `${m.mes}/${m.ano}`).join(' - ')} | 
          Data: {new Date().toLocaleDateString('pt-BR')}
        </p>
      </div>

      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg">{labels.visaoConsolidada}</CardTitle>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {labels.bancoDeHoras}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Botão Forçar Recálculo - aparece quando consumo está zerado */}
            {calculoPrincipal && (calculoPrincipal.consumo_horas === '00:00' || calculoPrincipal.consumo_horas === '0:00') && (
              <BotaoForcarRecalculo
                empresaId={calculoPrincipal.empresa_id}
                mes={calculoPrincipal.mes}
                ano={calculoPrincipal.ano}
                empresaNome={empresaAtual?.nome_abreviado || empresaAtual?.nome_completo}
                disabled={disabled}
                onRecalculoSucesso={() => {
                  // Refetch será feito automaticamente pelo componente
                  toast({
                    title: 'Recálculo concluído',
                    description: 'Os valores foram atualizados com sucesso.',
                  });
                }}
              />
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onHistoricoClick}
              disabled={disabled}
              className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
            >
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{labels.verHistorico}</span>
              <span className="sm:hidden">{labels.historico}</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onFiltrosClick}
              disabled={disabled}
              className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
            >
              <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            
            {/* Botão Limpar Filtro - só aparece se período selecionado for diferente do mês atual */}
            {!isMesAtual && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLimparFiltro}
                disabled={disabled}
                className="flex items-center gap-2 text-xs sm:text-sm print:hidden whitespace-nowrap hover:border-red-300"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                <span className="hidden sm:inline">Limpar Filtro</span>
              </Button>
            )}
          </div>
        </div>
        
        {/* Área de Filtros Expansível */}
        {showFilters && empresaAtual && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-1 gap-4">
              {/* Filtro de Período */}
              <div>
                <div className="text-sm font-medium mb-2">Ir para período</div>
                <Select
                  value={`${mesAno.mes}-${mesAno.ano}`}
                  onValueChange={(value) => {
                    const [mes, ano] = value.split('-').map(Number);
                    onPeriodoChange(mes, ano);
                  }}
                >
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Gerar lista de períodos disponíveis
                      const periodos: Array<{ mes: number; ano: number; label: string }> = [];
                      const hoje = new Date();
                      const mesAtual = hoje.getMonth() + 1;
                      const anoAtual = hoje.getFullYear();
                      
                      // ✅ CORREÇÃO: Usar SEMPRE a vigência da empresa como início
                      // Se não tem vigência, usar 12 meses atrás como fallback
                      let mesInicio: number;
                      let anoInicio: number;
                      
                      if (empresaAtual.inicio_vigencia) {
                        // Usar data de vigência da empresa
                        const vigencia = new Date(empresaAtual.inicio_vigencia);
                        mesInicio = vigencia.getUTCMonth() + 1;
                        anoInicio = vigencia.getUTCFullYear();
                        
                        console.log('📅 [VisaoConsolidada] Usando vigência da empresa:', {
                          empresa: empresaAtual.nome_abreviado,
                          inicio_vigencia: empresaAtual.inicio_vigencia,
                          mesInicio,
                          anoInicio
                        });
                      } else {
                        // Fallback: 12 meses atrás se não tem vigência
                        mesInicio = mesAtual - 12;
                        anoInicio = anoAtual;
                        
                        if (mesInicio < 1) {
                          mesInicio += 12;
                          anoInicio -= 1;
                        }
                        
                        console.log('📅 [VisaoConsolidada] Sem vigência, usando 12 meses atrás:', {
                          mesInicio,
                          anoInicio
                        });
                      }
                      
                      // Gerar períodos do início até 6 meses no futuro
                      const mesFim = mesAtual + 6;
                      let anoFim = anoAtual;
                      
                      if (mesFim > 12) {
                        anoFim += Math.floor((mesFim - 1) / 12);
                      }
                      
                      let mesCorrente = mesInicio;
                      let anoCorrente = anoInicio;
                      
                      while (
                        anoCorrente < anoFim || 
                        (anoCorrente === anoFim && mesCorrente <= (mesFim > 12 ? mesFim % 12 : mesFim))
                      ) {
                        const anoAbreviado = String(anoCorrente).slice(-2);
                        periodos.push({
                          mes: mesCorrente,
                          ano: anoCorrente,
                          label: `${MESES[mesCorrente - 1]}/${anoAbreviado}`
                        });
                        
                        mesCorrente++;
                        if (mesCorrente > 12) {
                          mesCorrente = 1;
                          anoCorrente++;
                        }
                      }
                      
                      // Inverter para mostrar mais recentes primeiro
                      periodos.reverse();
                      
                      return periodos.map(periodo => (
                        <SelectItem 
                          key={`${periodo.mes}-${periodo.ano}`} 
                          value={`${periodo.mes}-${periodo.ano}`}
                        >
                          {periodo.label}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {/* Alert quando consumo está zerado */}
        {calculoPrincipal && (calculoPrincipal.consumo_horas === '00:00' || calculoPrincipal.consumo_horas === '0:00') && (
          <Alert className="mb-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Consumo zerado detectado.</strong> Se você sabe que existem apontamentos para este período, 
              clique no botão "Forçar Recálculo" acima para atualizar os valores.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Wrapper com scroll horizontal melhorado para mobile */}
        <div className="relative -mx-6 sm:mx-0">
          <div className="overflow-x-auto px-6 sm:px-0">
            <Table className="min-w-full">
            <TableHeader>
              {/* Nova linha: Período */}
              <TableRow className="bg-gray-700 hover:bg-gray-700">
                <TableHead className="font-semibold text-white text-center">{labels.periodo}</TableHead>
                <TableHead className="font-semibold text-white text-center" colSpan={calculos.length}>
                  {nomePeriodoAtual}
                </TableHead>
              </TableRow>
              
              {/* Linha original: Mês */}
              <TableRow className="bg-sonda-blue hover:bg-sonda-blue">
                <TableHead className="text-white font-semibold text-center">{labels.mes}</TableHead>
                {calculos.map((calculo, index) => {
                  // Usar meses do período se disponível, senão usar mês do cálculo
                  const mesExibir = mesesDoPeriodo && mesesDoPeriodo[index] 
                    ? mesesDoPeriodo[index].mes 
                    : calculo.mes;
                  
                  const anoExibir = mesesDoPeriodo && mesesDoPeriodo[index]
                    ? mesesDoPeriodo[index].ano
                    : calculo.ano;
                  
                  // Pegar apenas os 2 últimos dígitos do ano (ex: 2025 -> 25)
                  const anoAbreviado = String(anoExibir).slice(-2);
                  
                  return (
                    <TableHead key={index} className="text-white font-semibold text-center">
                      {MESES[mesExibir - 1]}/{anoAbreviado}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Banco Contratado (Baseline) */}
              <TableRow className="bg-gray-700 hover:bg-gray-700">
                <TableCell className="font-semibold text-white text-center">
                  {(tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets') ? labels.ticketsContratados : labels.bancoContratado}
                </TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-white">
                    {formatarValor(calculo.baseline_horas, calculo.baseline_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Repasse mês anterior */}
              <TableRow className="bg-gray-200 hover:bg-gray-200">
                <TableCell className="font-medium text-gray-900 text-center">{labels.repasseMesAnterior}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClassDinamico(calculo.repasses_mes_anterior_horas, calculo.repasses_mes_anterior_tickets, tipoCobranca)}`}>
                    {formatarValor(calculo.repasses_mes_anterior_horas, calculo.repasses_mes_anterior_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo a utilizar */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">{labels.saldoAUtilizar}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell 
                    key={index} 
                    className={`text-center font-semibold ${getColorClassDinamico(calculo.saldo_a_utilizar_horas, calculo.saldo_a_utilizar_tickets, tipoCobranca)}`}
                  >
                    {formatarValor(calculo.saldo_a_utilizar_horas, calculo.saldo_a_utilizar_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Consumo Chamados */}
              <TableRow>
                <TableCell className="font-medium text-center">{labels.consumoChamados}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarValor(calculo.consumo_horas, calculo.consumo_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Requerimentos */}
              <TableRow>
                <TableCell className="font-medium text-center">{labels.requerimentos}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarValor(calculo.requerimentos_horas, calculo.requerimentos_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Reajuste (botão com modal) */}
              <TableRow>
                <TableCell className="font-medium text-center">{labels.reajuste}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center">
                    <BotaoReajusteHoras
                      horasAtuais={calculo.reajustes_horas}
                      ticketsAtuais={calculo.reajustes_tickets}
                      mes={calculo.mes}
                      ano={calculo.ano}
                      empresaId={calculo.empresa_id}
                      nomeMes={MESES[calculo.mes - 1]}
                      tipoCobranca={tipoCobranca}
                      baselineSegmentado={empresaAtual?.baseline_segmentado || false}
                      empresasSegmentadas={empresaAtual?.segmentacao_config?.empresas || []}
                      onSalvar={handleSalvarReajuste}
                      disabled={disabled}
                      isSaving={isCreating}
                    />
                  </TableCell>
                ))}
              </TableRow>

              {/* Consumo Total */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">{labels.consumoTotal}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarValor(calculo.consumo_total_horas, calculo.consumo_total_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">{labels.saldo}</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClassDinamico(calculo.saldo_horas, calculo.saldo_tickets, tipoCobranca)}`}>
                    {formatarValor(calculo.saldo_horas, calculo.saldo_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Repasse - Percentual Dinâmico */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">{labels.repasse} - {percentualRepasseMensal}%</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClassDinamico(calculo.repasse_horas, calculo.repasse_tickets, tipoCobranca)}`}>
                    {formatarValor(calculo.repasse_horas, calculo.repasse_tickets, tipoCobranca)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Excedente Trimestre */}
              {temExcedentes && (
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium text-center">{labels.excedenteTrimestreLabel}</TableCell>
                  <TableCell className="text-center font-semibold text-green-600" colSpan={calculos.length}>
                    {formatarHoras(calculoPrincipal.excedentes_horas)}
                  </TableCell>
                </TableRow>
              )}

              {/* Taxa/hora Excedente e Valor Total na mesma linha */}
              <TableRow className="bg-gray-700 hover:bg-gray-700">
                <TableCell className="font-medium text-white text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span>{labels.taxaHoraExcedente}</span>
                    {/* Tooltip específico para Exxonmobil */}
                    {taxasEspecificas?.ticket_excedente_simples && taxasEspecificas.ticket_excedente_simples > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="inline-flex items-center justify-center">
                              <AlertCircle className="h-4 w-4 text-blue-300 hover:text-blue-100 transition-colors" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md p-4 bg-white text-gray-900 shadow-lg">
                            <div className="space-y-2 text-sm">
                              <p className="font-semibold">Nota – Regra de Paridade:</p>
                              <p>Para fins de apuração de esforço, 1 ticket complexo equivale a 2 tickets simples.</p>
                              <p>A proposta considera 5 tickets simples e 2 complexos, totalizando 9 tickets equivalentes no quadro de horas.</p>
                              <p className="font-semibold mt-2">Saldo de tickets:</p>
                              <p>Poderá ser transportado para o mês seguinte até 50% do saldo, desde que haja no mínimo 2 tickets válidos dentro do trimestre. Após o término do terceiro mês, o saldo remanescente será zerado.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold text-white">
                  {taxaHoraExibir && taxaHoraExibir > 0 ? formatarMoeda(taxaHoraExibir) : ''}
                </TableCell>
                <TableCell className="font-medium text-center text-white" colSpan={calculos.length > 1 ? calculos.length - 2 : 1}>
                  {labels.valorTotal}
                </TableCell>
                <TableCell className="text-center font-semibold text-white">
                  <div className="flex items-center justify-center gap-2">
                    <span>{formatarMoeda(calculoFimPeriodo?.valor_a_faturar)}</span>
                    {!!(calculoFimPeriodo?.valor_a_faturar && calculoFimPeriodo.valor_a_faturar > 0) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-white hover:bg-gray-600"
                              onClick={() => {
                                // Usar excedentes_horas se disponível, senão usar saldo negativo
                                const horasExcedentes = calculoPrincipal?.excedentes_horas && horasParaMinutos(calculoPrincipal.excedentes_horas) > 0
                                  ? formatarHoras(calculoPrincipal.excedentes_horas)
                                  : calculoFimPeriodo?.saldo_horas && horasParaMinutos(calculoFimPeriodo.saldo_horas) < 0
                                  ? formatarHoras(calculoFimPeriodo.saldo_horas)
                                  : '00:00';
                                
                                const valorHoraExcedente = taxaHoraExibir && taxaHoraExibir > 0 ? formatarMoeda(taxaHoraExibir) : 'R$ 0,00';
                                const valorTotalExcedentes = formatarMoeda(calculoFimPeriodo?.valor_a_faturar);
                                
                                const mensagem = `Horas Excedentes: ${horasExcedentes}\nValor Hora Excedentes: ${valorHoraExcedente}\nValor total dos Excedentes: ${valorTotalExcedentes}\n\nFicamos no aguardo da PO ou o "de acordo" para seguir com o faturamento.`;
                                
                                navigator.clipboard.writeText(mensagem).then(() => {
                                  toast({
                                    title: "Copiado!",
                                    description: "Mensagem de excedentes copiada para a área de transferência.",
                                  });
                                }).catch(() => {
                                  toast({
                                    title: "Erro",
                                    description: "Não foi possível copiar a mensagem.",
                                    variant: "destructive",
                                  });
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copiar mensagem de excedentes para email</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
              </TableRow>

              {/* Mensagem de fim de período */}
              {calculoPrincipal?.is_fim_periodo && (
                <TableRow className="bg-blue-50">
                  <TableCell colSpan={calculos.length + 1} className="text-center font-semibold text-blue-800">
                    {labels.finalTrimestreMsg}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* Alerta de Última Sincronização */}
        <div className='flex gap-2 mt-2 items-center'>
          <Clock className="h-3 w-3 text-gray-300" />
          <AlertDescription className="text-xs text-gray-400">
            {carregandoSincronizacao ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Verificando última sincronização...</span>
              </div>
            ) : ultimaSincronizacao ? (
              <>
                <strong>Dados de Consumo Chamados:</strong> Os dados são equivalentes à última sincronização realizada em{' '}
                <strong>
                  {format(ultimaSincronizacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </strong>
              </>
            ) : (
              <>
                <strong>Dados de Consumo Chamados:</strong> Não foi possível verificar a data da última sincronização.
              </>
            )}
          </AlertDescription>
        </div>

        {/* Observação Pública */}
        {calculoPrincipal?.observacao_publica && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Observação Pública</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {calculoPrincipal.observacao_publica}
            </p>
          </div>
        )}

        {/* Seção de Requerimentos */}
        {requerimentos && requerimentos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEnglish ? 'Period Requirements' : 'Requerimentos do Período'}
              </h4>
            </div>

            <div className="w-full overflow-x-auto">
              <Table className="w-full text-xs sm:text-sm min-w-[1300px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] text-center text-xs sm:text-sm py-2">Chamado</TableHead>
                    <TableHead className="min-w-[160px] text-center text-xs sm:text-sm py-2">Cliente</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Módulo</TableHead>
                    <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Func</TableHead>
                    <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Téc</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Total</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Envio</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Aprovação</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Valor Total</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Período</TableHead>
                    <TableHead className="w-40 text-center text-xs sm:text-sm py-2">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requerimentos.map((req) => {
                    // ✅ CORRIGIDO: Usar converterParaHorasDecimal para conversão correta
                    const horasFuncional = typeof req.horas_funcional === 'string' 
                      ? converterParaHorasDecimal(req.horas_funcional)
                      : (req.horas_funcional || 0);
                    const horasTecnico = typeof req.horas_tecnico === 'string'
                      ? converterParaHorasDecimal(req.horas_tecnico)
                      : (req.horas_tecnico || 0);
                    const totalHoras = horasFuncional + horasTecnico;
                    
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium py-2 text-center">
                          <div className="flex flex-col items-center gap-1 sm:gap-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-sm sm:text-base lg:text-lg flex-shrink-0">
                                {getCobrancaIcon(req.tipo_cobranca || 'Banco de Horas')}
                              </span>
                              <span className="truncate text-xs sm:text-sm lg:text-base font-medium">
                                {req.chamado}
                              </span>
                            </div>
                            <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5">
                              {req.tipo_cobranca || 'Banco de Horas'}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-2 text-center">
                          <span className="text-xs sm:text-sm font-medium">
                            {req.cliente_nome || '-'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="text-[8px] sm:text-[10px] lg:text-xs text-blue-600 border-blue-600 px-1 sm:px-2 py-0.5 leading-tight w-fit">
                              <span className="truncate">{req.modulo || 'Comex'}</span>
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          <span className="text-xs sm:text-sm lg:text-base font-medium">
                            {Math.floor(horasFuncional)}:{String(Math.round((horasFuncional % 1) * 60)).padStart(2, '0')}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          <span className="text-xs sm:text-sm lg:text-base font-medium">
                            {Math.floor(horasTecnico)}:{String(Math.round((horasTecnico % 1) * 60)).padStart(2, '0')}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 dark:text-white">
                              {Math.floor(totalHoras)}:{String(Math.round((totalHoras % 1) * 60)).padStart(2, '0')}
                            </span>
                            {/* Badge de tickets quando tipo de cobrança for tickets */}
                            {(tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets') && req.quantidade_tickets && req.quantidade_tickets > 0 && (
                              <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 leading-tight bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                🎫 {req.quantidade_tickets} {req.quantidade_tickets === 1 ? 'ticket' : 'tickets'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                          {req.data_envio ? new Date(req.data_envio).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        
                        <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                          {req.data_aprovacao ? new Date(req.data_aprovacao).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          {req.valor_total_geral ? (
                            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-green-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.valor_total_geral)}
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs lg:text-sm">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                          {req.mes_cobranca || '-'}
                        </TableCell>
                        
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleVisualizarRequerimento(req)}
                              title="Visualizar detalhes"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ⚠️ NOVA SEÇÃO: Requerimentos em Desenvolvimento */}
        {requerimentosEmDesenvolvimento && requerimentosEmDesenvolvimento.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-orange-600" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white cursor-help flex items-center gap-2">
                      {isEnglish ? 'Requirements in Development' : 'Requerimentos em Desenvolvimento'}
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    </h4>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-orange-50 border-orange-200">
                    <p className="text-sm text-orange-800">
                      <strong>⚠️ Atenção:</strong> Estes requerimentos estão com status "Lançado" e ainda não foram enviados para faturamento. 
                      As horas/tickets abaixo ainda serão descontadas do banco quando os requerimentos forem enviados e aprovados.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Badge className="bg-orange-200 text-orange-900 text-xs font-semibold">
                {tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets'
                  ? `${totalRequerimentosEmDesenvolvimento.tickets} tickets`
                  : totalRequerimentosEmDesenvolvimento.horas
                }
              </Badge>
            </div>

            <div className="w-full overflow-x-auto">
              <Table className="w-full text-xs sm:text-sm min-w-[1300px]">
                <TableHeader>
                  <TableRow className="bg-orange-50">
                    <TableHead className="min-w-[140px] text-center text-xs sm:text-sm py-2">Chamado</TableHead>
                    <TableHead className="min-w-[160px] text-center text-xs sm:text-sm py-2">Cliente</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Módulo</TableHead>
                    <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Func</TableHead>
                    <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Téc</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Total</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Envio</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Status</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Valor Total</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Período</TableHead>
                    <TableHead className="w-40 text-center text-xs sm:text-sm py-2">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requerimentosEmDesenvolvimento.map((req) => {
                      // ✅ CORRIGIDO: Usar converterParaHorasDecimal para conversão correta
                      const horasFuncional = typeof req.horas_funcional === 'string' 
                        ? converterParaHorasDecimal(req.horas_funcional)
                        : (req.horas_funcional || 0);
                      const horasTecnico = typeof req.horas_tecnico === 'string'
                        ? converterParaHorasDecimal(req.horas_tecnico)
                        : (req.horas_tecnico || 0);
                      const totalHoras = horasFuncional + horasTecnico;
                      
                      return (
                        <TableRow key={req.id} className="bg-orange-50/30">
                          <TableCell className="font-medium py-2 text-center">
                            <div className="flex flex-col items-center gap-1 sm:gap-2">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <span className="text-sm sm:text-base lg:text-lg flex-shrink-0">
                                  {getCobrancaIcon(req.tipo_cobranca || 'Banco de Horas')}
                                </span>
                                <span className="truncate text-xs sm:text-sm lg:text-base font-medium">
                                  {req.chamado}
                                </span>
                              </div>
                              <Badge className={getBadgeClasses(req.tipo_cobranca || 'Banco de Horas')}>
                                {req.tipo_cobranca || 'Banco de Horas'}
                              </Badge>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-2 text-center">
                            <span className="text-xs sm:text-sm font-medium">
                              {req.cliente_nome || '-'}
                            </span>
                          </TableCell>
                          
                          <TableCell className="py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge variant="outline" className="text-[8px] sm:text-[10px] lg:text-xs text-orange-600 border-orange-600 px-1 sm:px-2 py-0.5 leading-tight w-fit">
                                <span className="truncate">{req.modulo || 'Comex'}</span>
                              </Badge>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center py-3">
                            <span className="text-xs sm:text-sm lg:text-base font-medium">
                              {Math.floor(horasFuncional)}:{String(Math.round((horasFuncional % 1) * 60)).padStart(2, '0')}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-center py-3">
                            <span className="text-xs sm:text-sm lg:text-base font-medium">
                              {Math.floor(horasTecnico)}:{String(Math.round((horasTecnico % 1) * 60)).padStart(2, '0')}
                            </span>
                          </TableCell>
                          
                          <TableCell className="text-center py-3">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs sm:text-sm lg:text-base font-bold text-orange-600">
                                {Math.floor(totalHoras)}:{String(Math.round((totalHoras % 1) * 60)).padStart(2, '0')}
                              </span>
                              {/* Badge de tickets quando tipo de cobrança for tickets */}
                              {(tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets') && req.quantidade_tickets && req.quantidade_tickets > 0 && (
                                <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 leading-tight bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  🎫 {req.quantidade_tickets} {req.quantidade_tickets === 1 ? 'ticket' : 'tickets'}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm py-3">
                            <Badge className="bg-gray-100 text-gray-600 text-xs">
                              Não enviado
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm py-3">
                            <Badge className="bg-orange-100 text-orange-800 text-xs">
                              Em desenvolvimento
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-center py-3">
                            {req.valor_total_geral ? (
                              <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-green-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.valor_total_geral)}
                              </span>
                            ) : (
                              <span className="text-[10px] sm:text-xs lg:text-sm">-</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                            {req.mes_cobranca || '-'}
                          </TableCell>
                          
                          <TableCell className="py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setRequerimentoSelecionado(req);
                                  setModalVisualizacaoAberto(true);
                                }}
                                title="Visualizar detalhes"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Seção de Requerimentos NÃO CONCLUÍDOS */}
        {requerimentosNaoConcluidos && requerimentosNaoConcluidos.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-orange-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEnglish ? 'Period Requirements NOT COMPLETED' : 'Requerimentos do Período NÃO CONCLUÍDOS'}
              </h4>
              <Badge className="bg-orange-100 text-orange-800 text-xs">
                {requerimentosNaoConcluidos.length}
              </Badge>
            </div>

            <div className="w-full overflow-x-auto">
              <Table className="w-full text-xs sm:text-sm min-w-[1300px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[140px] text-center text-xs sm:text-sm py-2">Chamado</TableHead>
                    <TableHead className="min-w-[160px] text-center text-xs sm:text-sm py-2">Cliente</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Módulo</TableHead>
                    <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Func</TableHead>
                    <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">H.Téc</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Total</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Envio</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Aprovação</TableHead>
                    <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Valor Total</TableHead>
                    <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Período</TableHead>
                    <TableHead className="w-40 text-center text-xs sm:text-sm py-2">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requerimentosNaoConcluidos.map((req) => {
                    // ✅ CORRIGIDO: Usar converterParaHorasDecimal para conversão correta
                    const horasFuncional = typeof req.horas_funcional === 'string' 
                      ? converterParaHorasDecimal(req.horas_funcional)
                      : (req.horas_funcional || 0);
                    const horasTecnico = typeof req.horas_tecnico === 'string'
                      ? converterParaHorasDecimal(req.horas_tecnico)
                      : (req.horas_tecnico || 0);
                    const totalHoras = horasFuncional + horasTecnico;
                    
                    return (
                      <TableRow key={req.id} className="bg-orange-50/50">
                        <TableCell className="font-medium py-2 text-center">
                          <div className="flex flex-col items-center gap-1 sm:gap-2">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-sm sm:text-base lg:text-lg flex-shrink-0">
                                {getCobrancaIcon(req.tipo_cobranca || 'Banco de Horas')}
                              </span>
                              <span className="truncate text-xs sm:text-sm lg:text-base font-medium">
                                {req.chamado}
                              </span>
                            </div>
                            <Badge className={getBadgeClasses(req.tipo_cobranca || 'Banco de Horas')}>
                              {req.tipo_cobranca || 'Banco de Horas'}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell className="py-2 text-center">
                          <span className="text-xs sm:text-sm font-medium">
                            {req.cliente_nome || '-'}
                          </span>
                        </TableCell>
                        
                        <TableCell className="py-2 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="text-[8px] sm:text-[10px] lg:text-xs text-orange-600 border-orange-600 px-1 sm:px-2 py-0.5 leading-tight w-fit">
                              <span className="truncate">{req.modulo || 'Comex'}</span>
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          <span className="text-xs sm:text-sm lg:text-base font-medium">
                            {Math.floor(horasFuncional)}:{String(Math.round((horasFuncional % 1) * 60)).padStart(2, '0')}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          <span className="text-xs sm:text-sm lg:text-base font-medium">
                            {Math.floor(horasTecnico)}:{String(Math.round((horasTecnico % 1) * 60)).padStart(2, '0')}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 dark:text-white">
                              {Math.floor(totalHoras)}:{String(Math.round((totalHoras % 1) * 60)).padStart(2, '0')}
                            </span>
                            {/* Badge de tickets quando tipo de cobrança for tickets */}
                            {(tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets') && req.quantidade_tickets && req.quantidade_tickets > 0 && (
                              <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-2 py-0.5 leading-tight bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                🎫 {req.quantidade_tickets} {req.quantidade_tickets === 1 ? 'ticket' : 'tickets'}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                          {req.data_envio ? new Date(req.data_envio).toLocaleDateString('pt-BR') : '-'}
                        </TableCell>
                        
                        <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm py-3">
                          <Badge className="bg-orange-100 text-orange-800 text-xs">
                            Pendente
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-center py-3">
                          {req.valor_total_geral ? (
                            <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-green-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.valor_total_geral)}
                            </span>
                          ) : (
                            <span className="text-[10px] sm:text-xs lg:text-sm">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center text-[10px] sm:text-xs lg:text-sm text-gray-500 py-3">
                          {req.mes_cobranca || '-'}
                        </TableCell>
                        
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setRequerimentoSelecionado(req);
                                setModalVisualizacaoAberto(true);
                              }}
                              title="Visualizar detalhes"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>

      {/* Seção de Observações */}
      <div className="px-6 pb-6">
        <SecaoObservacoes
          empresaId={calculoPrincipal?.empresa_id}
          mesAtual={calculoPrincipal?.mes || 1}
          anoAtual={calculoPrincipal?.ano || new Date().getFullYear()}
          disabled={disabled}
          onHistoricoClick={onHistoricoClick}
          mesesDoPeriodo={mesesDoPeriodo}
        />
      </div>

      {/* Modal de Visualização de Requerimento */}
      <RequerimentoViewModal
        requerimento={requerimentoSelecionado}
        open={modalVisualizacaoAberto}
        onClose={() => {
          setModalVisualizacaoAberto(false);
          setRequerimentoSelecionado(null);
        }}
      />
      {/* Rodapé de Impressão (visível apenas ao imprimir) */}
      <div className="hidden print:block print-footer">
        <p>
          Relatório gerado em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} | 
          Sistema Books SND - Controle de Banco de Horas
        </p>
      </div>
    </Card>
  );
}
