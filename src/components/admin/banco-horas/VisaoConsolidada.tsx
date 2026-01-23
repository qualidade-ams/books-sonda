/**
 * VisaoConsolidada Component
 * 
 * Displays all calculated fields for the consolidated view of monthly hours bank calculations
 * in a table format similar to the reference image provided.
 * 
 * @module components/admin/banco-horas/VisaoConsolidada
 */

import React, { useState, useEffect } from 'react';
import { 
  Download,
  History,
  Eye,
  FileText,
  Clock,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';
import { getCobrancaIcon } from '@/utils/requerimentosColors';
import RequerimentoViewModal from '@/components/admin/requerimentos/RequerimentoViewModal';
import { useBancoHorasReajustes } from '@/hooks/useBancoHorasReajustes';
import { useAuth } from '@/hooks/useAuth'; // ← ADICIONAR
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  
  /** Callback when "Exportar" button is clicked */
  onExportClick: () => void;
  
  /** Whether actions are disabled (e.g., during loading) */
  disabled?: boolean;
  
  /** Percentual de repasse mensal cadastrado no cliente (0-100) */
  percentualRepasseMensal?: number;
  
  /** Array com os meses reais do período (calculados baseado na vigência) */
  mesesDoPeriodo?: Array<{ mes: number; ano: number }>;
  
  /** Requerimentos do período para exibição */
  requerimentos?: Requerimento[];
}

/**
 * Formats hours from HH:MM string to display format
 */
const formatarHoras = (horas?: string): string => {
  if (!horas || horas === '0:00' || horas === '00:00') return '';
  // Garantir formato HH:MM (remover segundos se existir)
  const parts = horas.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`;
  }
  return horas;
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
 */
const horasParaMinutos = (horas: string): number => {
  const [h, m] = horas.split(':').map(Number);
  return (h * 60) + m;
};

/**
 * Determines color class based on value (positive/negative/zero)
 */
const getColorClass = (horas?: string): string => {
  if (!horas) return 'text-gray-900';
  const minutos = horasParaMinutos(horas);
  if (minutos > 0) return 'text-green-600';
  if (minutos < 0) return 'text-red-600';
  return 'text-gray-900';
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
  onExportClick,
  disabled = false,
  percentualRepasseMensal = 100,
  mesesDoPeriodo,
  requerimentos = []
}: VisaoConsolidadaProps) {
  // Hook de autenticação
  const { user } = useAuth();
  
  // Hook de reajustes
  const { criarReajuste, isCreating } = useBancoHorasReajustes();
  
  // Estados para edição de reajuste
  const [reajusteEditando, setReajusteEditando] = React.useState<{
    mes: number;
    ano: number;
    horas: string;
    empresaId: string;
  } | null>(null);
  const [modalReajusteAberto, setModalReajusteAberto] = React.useState(false);
  const [tipoReajuste, setTipoReajuste] = React.useState<'entrada' | 'saida'>('entrada');
  const [observacaoReajuste, setObservacaoReajuste] = React.useState('');
  
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
        
        // Buscar o registro mais recente da tabela apontamentos_aranda
        const { data, error } = await supabase
          .from('apontamentos_aranda' as any)
          .select('created_at, updated_at')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
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
  
  // Usar primeiro cálculo para informações gerais
  const calculoPrincipal = calculos[0];
  const temExcedentes = calculoPrincipal?.excedentes_horas && horasParaMinutos(calculoPrincipal.excedentes_horas) > 0;
  
  // Nomes dos meses
  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Função para abrir modal de confirmação de reajuste (quando usuário sai do campo)
  const handleReajusteBlur = (mes: number, ano: number, valor: string, empresaId: string) => {
    // Só abre modal se houver valor digitado
    if (!valor || valor === '00:00' || valor === '') {
      return;
    }
    
    // Validar formato HH:MM
    const regex = /^\d{1,4}:[0-5]\d$/;
    if (!regex.test(valor)) {
      alert('Formato inválido! Use o formato HH:MM (exemplo: 10:30)');
      return;
    }
    
    setReajusteEditando({ mes, ano, horas: valor, empresaId });
    setModalReajusteAberto(true);
  };

  // Função para salvar reajuste
  const handleSalvarReajuste = async () => {
    if (!observacaoReajuste.trim()) {
      alert('Observação é obrigatória!');
      return;
    }
    
    if (!reajusteEditando) return;
    
    try {
      // Criar reajuste usando o serviço
      await criarReajuste({
        empresa_id: reajusteEditando.empresaId,
        mes: reajusteEditando.mes,
        ano: reajusteEditando.ano,
        valor_horas: reajusteEditando.horas,
        tipo: tipoReajuste,
        observacao: observacaoReajuste,
        created_by: user?.id // ← ADICIONAR created_by
      });
      
      // Fechar modal e limpar estados
      setModalReajusteAberto(false);
      setReajusteEditando(null);
      setObservacaoReajuste('');
      setTipoReajuste('entrada');
      
      // Abrir histórico automaticamente após salvar
      setTimeout(() => {
        onHistoricoClick();
      }, 500);
    } catch (error) {
      console.error('Erro ao salvar reajuste:', error);
      // O erro já é tratado pelo hook useBancoHorasReajustes
    }
  };

  // Função para cancelar reajuste
  const handleCancelarReajuste = () => {
    setModalReajusteAberto(false);
    setReajusteEditando(null);
    setObservacaoReajuste('');
    setTipoReajuste('entrada');
  };

  // Função para visualizar requerimento
  const handleVisualizarRequerimento = (requerimento: Requerimento) => {
    setRequerimentoSelecionado(requerimento);
    setModalVisualizacaoAberto(true);
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
            <CardTitle className="text-base sm:text-lg">Visão Consolidada</CardTitle>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Banco de horas
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              disabled={disabled}
              className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
            >
              <svg className="h-3 w-3 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onHistoricoClick}
              disabled={disabled}
              className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
            >
              <History className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Ver Histórico</span>
              <span className="sm:hidden">Histórico</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportClick}
              disabled={disabled}
              className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Wrapper com scroll horizontal melhorado para mobile */}
        <div className="relative -mx-6 sm:mx-0">
          <div className="overflow-x-auto px-6 sm:px-0">
            <Table className="min-w-full">
            <TableHeader>
              <TableRow className="bg-sonda-blue hover:bg-sonda-blue">
                <TableHead className="text-white font-semibold text-center">Mês</TableHead>
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
                <TableCell className="font-semibold text-white text-center">Banco Contratado</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-white">
                    {formatarHoras(calculo.baseline_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Repasse mês anterior */}
              <TableRow className="bg-gray-200 hover:bg-gray-200">
                <TableCell className="font-medium text-gray-900 text-center">Repasse mês anterior</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.repasses_mes_anterior_horas)}`}>
                    {formatarHoras(calculo.repasses_mes_anterior_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo a utilizar */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">Saldo a utilizar</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.saldo_a_utilizar_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Consumo Chamados */}
              <TableRow>
                <TableCell className="font-medium text-center">Consumo Chamados</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.consumo_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Requerimentos */}
              <TableRow>
                <TableCell className="font-medium text-center">Requerimentos</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.requerimentos_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Reajuste (editável) */}
              <TableRow>
                <TableCell className="font-medium text-center">Reajuste</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center">
                    <Input
                      type="text"
                      placeholder=""
                      defaultValue={formatarHoras(calculo.reajustes_horas)}
                      onBlur={(e) => handleReajusteBlur(calculo.mes, calculo.ano, e.target.value, calculo.empresa_id)}
                      disabled={disabled || isCreating}
                      className="w-24 mx-auto text-center focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </TableCell>
                ))}
              </TableRow>

              {/* Consumo Total */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">Consumo Total</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.consumo_total_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">Saldo</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.saldo_horas)}`}>
                    {formatarHoras(calculo.saldo_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Repasse - Percentual Dinâmico */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium text-center">Repasse - {percentualRepasseMensal}%</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.repasse_horas)}`}>
                    {formatarHoras(calculo.repasse_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Excedente Trimestre */}
              {temExcedentes && (
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium text-center">Excedente Trimestre</TableCell>
                  <TableCell className="text-center font-semibold text-green-600" colSpan={calculos.length}>
                    {formatarHoras(calculoPrincipal.excedentes_horas)}
                  </TableCell>
                </TableRow>
              )}

              {/* Taxa/hora Excedente e Valor Total na mesma linha */}
              <TableRow className="bg-gray-700 hover:bg-gray-700">
                <TableCell className="font-medium text-white text-center">Taxa/hora Excedente</TableCell>
                <TableCell className="text-center font-semibold text-white">
                  {calculoPrincipal?.taxa_hora_utilizada ? formatarMoeda(calculoPrincipal.taxa_hora_utilizada) : 'R$ 0,00'}
                </TableCell>
                <TableCell className="font-medium text-center text-white" colSpan={calculos.length > 1 ? calculos.length - 2 : 1}>
                  Valor Total
                </TableCell>
                <TableCell className="text-center font-semibold text-white">
                  {formatarMoeda(calculoPrincipal?.valor_a_faturar)}
                </TableCell>
              </TableRow>

              {/* Mensagem de fim de período */}
              {calculoPrincipal?.is_fim_periodo && (
                <TableRow className="bg-blue-50">
                  <TableCell colSpan={calculos.length + 1} className="text-center font-semibold text-blue-800">
                    Final do Trimestre o saldo é zerado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {/* Alerta de Última Sincronização */}
        <div className='flex gap-2 mt-2 items-center'>
          <Clock className="h-3 w-3 text-blue-600" />
          <AlertDescription className="text-sm text-blue-600">
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
                Requerimentos do Período
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
                    const horasFuncional = typeof req.horas_funcional === 'string' 
                      ? parseFloat(req.horas_funcional.replace(':', '.')) 
                      : (req.horas_funcional || 0);
                    const horasTecnico = typeof req.horas_tecnico === 'string'
                      ? parseFloat(req.horas_tecnico.replace(':', '.'))
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
                          <span className="text-xs sm:text-sm lg:text-base font-bold text-gray-900 dark:text-white">
                            {Math.floor(totalHoras)}:{String(Math.round((totalHoras % 1) * 60)).padStart(2, '0')}
                          </span>
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
      </CardContent>

      {/* Modal de Confirmação de Reajuste */}
      <Dialog open={modalReajusteAberto} onOpenChange={setModalReajusteAberto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue">
              Confirmar Reajuste
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Informe o tipo de reajuste e adicione uma observação obrigatória
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Informações do reajuste */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mês:</span>
                  <span className="ml-2 font-semibold">{reajusteEditando && MESES[reajusteEditando.mes - 1]}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ano:</span>
                  <span className="ml-2 font-semibold">{reajusteEditando?.ano}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Horas:</span>
                  <span className="ml-2 font-semibold text-sonda-blue">{reajusteEditando?.horas || '00:00'}</span>
                </div>
              </div>
            </div>

            {/* Tipo de Reajuste */}
            <div className="space-y-2">
              <Label htmlFor="tipo-reajuste" className="text-sm font-medium text-gray-700">
                Tipo de Reajuste <span className="text-red-500">*</span>
              </Label>
              <Select value={tipoReajuste} onValueChange={(value: 'entrada' | 'saida') => setTipoReajuste(value)}>
                <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Adicionar horas)</SelectItem>
                  <SelectItem value="saida">Saída (Remover horas)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao" className="text-sm font-medium text-gray-700">
                Observação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="observacao"
                placeholder="Digite a justificativa para este reajuste..."
                value={observacaoReajuste}
                onChange={(e) => setObservacaoReajuste(e.target.value)}
                rows={4}
                className={`focus:ring-sonda-blue focus:border-sonda-blue ${
                  !observacaoReajuste.trim() ? 'border-red-300' : ''
                }`}
              />
              {!observacaoReajuste.trim() && (
                <p className="text-xs text-red-500">A observação é obrigatória</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelarReajuste}
              disabled={isCreating}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarReajuste}
              disabled={!observacaoReajuste.trim() || isCreating}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              {isCreating ? 'Salvando...' : 'Salvar Reajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
