/**
 * Componente VisaoSegmentada
 * 
 * Exibe a visão segmentada do banco de horas, dividindo os dados
 * entre múltiplas empresas conforme configuração de segmentação.
 * 
 * Estrutura idêntica à Visão Consolidada, exceto pela linha de Reajuste.
 * 
 * @module components/admin/banco-horas/VisaoSegmentada
 */

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertCircle, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SegmentacaoConfig } from '@/types/clientBooksTypes';
import type { Requerimento } from '@/types/requerimentos';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';
import { supabase } from '@/integrations/supabase/client';

interface VisaoSegmentadaProps {
  empresaId: string;
  segmentacaoConfig?: SegmentacaoConfig;
  mesAno: { mes: number; ano: number };
  periodoApuracao: number;
  percentualRepasseMensal: number;
  mesesDoPeriodo: Array<{ mes: number; ano: number }>;
  requerimentos: Requerimento[];
  disabled?: boolean;
  tipoCobranca?: string;
  inicioVigencia?: string;
  calculos?: Array<{ taxa_hora_utilizada?: number; taxa_ticket_utilizada?: number }>; // Adicionar calculos para buscar taxa
}

/**
 * Interface para apontamentos da tabela apontamentos_aranda
 */
interface ApontamentoAranda {
  id: string;
  item_configuracao: string | null;
  mes: number;
  ano: number;
  horas_funcionais?: string | null;
  horas_tecnicas?: string | null;
  cliente_id?: string;
}

/**
 * Aplicar filtro de item_configuracao baseado na configuração da empresa segmentada
 */
function aplicarFiltro(itemConfiguracao: string | null | undefined, filtroTipo: string, filtroValor: string): boolean {
  if (!itemConfiguracao) return false;
  
  const item = itemConfiguracao.toUpperCase();
  const valor = filtroValor.toUpperCase();
  
  switch (filtroTipo) {
    case 'contem':
      return item.includes(valor);
    case 'nao_contem':
      return !item.includes(valor);
    case 'igual':
      return item === valor;
    case 'diferente':
      return item !== valor;
    case 'comeca_com':
      return item.startsWith(valor);
    case 'termina_com':
      return item.endsWith(valor);
    default:
      return false;
  }
}

/**
 * Calcular horas de consumo de chamados para uma empresa segmentada em um mês específico
 * Busca dados da tabela apontamentos_aranda filtrando por item_configuracao
 * 
 * IMPORTANTE: Segue EXATAMENTE a mesma lógica do backend (bancoHorasIntegracaoService.buscarConsumo)
 * com filtro adicional por item_configuracao
 */
async function calcularConsumoSegmentadoPorMes(
  empresaId: string,
  filtroTipo: string,
  filtroValor: string,
  mes: number,
  ano: number
): Promise<number> {
  try {
    console.log('🔍 [VisaoSegmentada] Buscando consumo de chamados:', {
      empresaId,
      filtroTipo,
      filtroValor,
      mes,
      ano
    });
    
    // Buscar nome da empresa para filtrar apontamentos
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas_clientes')
      .select('nome_abreviado, nome_completo')
      .eq('id', empresaId)
      .single();
    
    if (empresaError || !empresa) {
      console.error('❌ Empresa não encontrada:', empresaError);
      return 0;
    }
    
    // Calcular data de início e fim do mês
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);
    
    // Códigos de resolução válidos (MESMA LISTA DO BACKEND)
    const codigosResolucaoValidos = [
      'Alocação - T&M',
      'AMS SAP',
      'Aplicação de Nota / Licença - Contratados',
      'Consultoria',
      'Consultoria - Banco de Dados',
      'Consultoria - Nota Publicada',
      'Consultoria - Solução Paliativa',
      'Dúvida',
      'Erro de classificação na abertura',
      'Erro de programa especifico (SEM SLA)',
      'Levantamento de Versão / Orçamento',
      'Monitoramento DBA',
      'Nota Publicada',
      'Parametrização / Cadastro',
      'Parametrização / Funcionalidade',
      'Validação de Arquivo'
    ];
    
    console.log('📅 Período de busca:', {
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      empresaNome: empresa.nome_abreviado || empresa.nome_completo
    });
    
    // Construir query base (MESMA LÓGICA DO BACKEND)
    let query = supabase
      .from('apontamentos_aranda' as any)
      .select('tempo_gasto_horas, tempo_gasto_minutos, item_configuracao, data_atividade, data_sistema')
      .eq('ativi_interna', 'Não')
      .neq('item_configuracao', '000000 - PROJETOS APL')  // Excluir projetos APL
      .neq('tipo_chamado', 'PM')  // Excluir tipo PM
      .gte('data_atividade', dataInicio.toISOString())
      .lte('data_atividade', dataFim.toISOString());
    
    // Adicionar filtro de empresa (nome abreviado OU nome completo)
    const nomeAbreviado = empresa.nome_abreviado;
    const nomeCompleto = empresa.nome_completo;
    
    if (nomeAbreviado && nomeCompleto) {
      query = query.or(`org_us_final.ilike.%${nomeAbreviado}%,org_us_final.ilike.%${nomeCompleto}%`);
    } else if (nomeAbreviado) {
      query = query.ilike('org_us_final', `%${nomeAbreviado}%`);
    } else if (nomeCompleto) {
      query = query.ilike('org_us_final', `%${nomeCompleto}%`);
    }
    
    // Adicionar filtro de códigos de resolução
    query = query.in('cod_resolucao', codigosResolucaoValidos);
    
    // Executar query
    const { data: apontamentos, error: apontamentosError } = await query as any;
    
    if (apontamentosError) {
      console.error('❌ Erro ao buscar apontamentos:', apontamentosError);
      return 0;
    }
    
    console.log(`📊 Total de apontamentos encontrados: ${apontamentos?.length || 0}`);
    
    // Filtrar apontamentos baseado no item_configuracao (FILTRO ADICIONAL DA SEGMENTAÇÃO)
    const apontamentosFiltrados = (apontamentos || []).filter(apt => {
      // Validar que data_atividade e data_sistema estão no mesmo mês (REGRA DO BACKEND)
      if (apt.data_atividade && apt.data_sistema) {
        const dataAtividade = new Date(apt.data_atividade);
        const dataSistema = new Date(apt.data_sistema);
        
        if (
          dataAtividade.getMonth() !== dataSistema.getMonth() ||
          dataAtividade.getFullYear() !== dataSistema.getFullYear()
        ) {
          return false; // Excluir se meses diferentes
        }
      }
      
      // Aplicar filtro de segmentação
      return aplicarFiltro(apt.item_configuracao, filtroTipo, filtroValor);
    });
    
    console.log(`✅ Apontamentos após filtro de segmentação: ${apontamentosFiltrados.length}`);
    
    // Somar horas (MESMA LÓGICA DO BACKEND)
    let totalMinutos = 0;
    
    for (const apontamento of apontamentosFiltrados) {
      // Priorizar tempo_gasto_horas (formato HH:MM)
      if (apontamento.tempo_gasto_horas) {
        try {
          const [horas, minutos] = apontamento.tempo_gasto_horas.split(':').map(Number);
          totalMinutos += (horas * 60) + minutos;
        } catch (error) {
          console.warn('⚠️ Erro ao converter tempo_gasto_horas:', apontamento.tempo_gasto_horas);
        }
      } 
      // Fallback para tempo_gasto_minutos
      else if (apontamento.tempo_gasto_minutos) {
        totalMinutos += apontamento.tempo_gasto_minutos;
      }
    }
    
    console.log(`💰 Total de minutos calculados: ${totalMinutos} (${converterMinutosParaHoras(totalMinutos)})`);
    
    return totalMinutos;
  } catch (error) {
    console.error('❌ Erro ao calcular consumo segmentado:', error);
    return 0;
  }
}

/**
 * Calcular baseline segmentado baseado no percentual
 */
function calcularBaselineSegmentado(baselineTotal: string, percentual: number): number {
  const baselineTotalMinutos = converterHorasParaMinutos(baselineTotal);
  return Math.round((baselineTotalMinutos * percentual) / 100);
}

/**
 * Determinar cor baseada no valor (positivo/negativo/zero)
 */
const getColorClass = (minutos: number): string => {
  if (minutos > 0) return 'text-green-600';
  if (minutos < 0) return 'text-red-600';
  return 'text-gray-900';
};

/**
 * Formata valor monetário para Real Brasileiro
 */
const formatarMoeda = (valor?: number): string => {
  if (valor === undefined || valor === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export function VisaoSegmentada({
  empresaId,
  segmentacaoConfig,
  mesAno,
  periodoApuracao,
  percentualRepasseMensal,
  mesesDoPeriodo,
  requerimentos,
  disabled = false,
  tipoCobranca = 'horas',
  inicioVigencia,
  calculos = [],
}: VisaoSegmentadaProps) {
  
  // Nomes dos meses completos (igual à Visão Consolidada)
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  // Estado para armazenar dados de consumo de chamados
  const [consumoPorEmpresaMes, setConsumoPorEmpresaMes] = useState<Record<string, Record<string, number>>>({});
  const [carregandoConsumo, setCarregandoConsumo] = useState(true);
  
  // Estado para armazenar reajustes por empresa segmentada e mês
  const [reajustesPorEmpresaMes, setReajustesPorEmpresaMes] = useState<Record<string, Record<string, number>>>({});
  const [carregandoReajustes, setCarregandoReajustes] = useState(true);
  
  // Buscar taxa hora/ticket (mesma lógica da Visão Consolidada)
  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
  
  const taxaHoraCalculada = useMemo(() => {
    if (calculos.length === 0) return undefined;
    
    // Buscar taxa de qualquer cálculo que tenha o valor
    if (isTicket) {
      return calculos.find(c => c.taxa_ticket_utilizada)?.taxa_ticket_utilizada;
    } else {
      return calculos.find(c => c.taxa_hora_utilizada)?.taxa_hora_utilizada;
    }
  }, [calculos, isTicket]);
  
  console.log('💰 [VisaoSegmentada] Taxa calculada:', {
    taxaHoraCalculada,
    tipoCobranca,
    isTicket,
    calculos: calculos.length
  });
  
  // Validar se há configuração de segmentação
  if (!segmentacaoConfig || !segmentacaoConfig.empresas || segmentacaoConfig.empresas.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma configuração de segmentação encontrada para esta empresa.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Buscar dados de consumo de chamados ao montar o componente
  useEffect(() => {
    const buscarConsumoSegmentado = async () => {
      setCarregandoConsumo(true);
      
      console.log('🔄 [VisaoSegmentada] Iniciando busca de consumo segmentado...');
      
      const consumoTemp: Record<string, Record<string, number>> = {};
      
      // Para cada empresa segmentada
      for (const empresa of segmentacaoConfig.empresas) {
        consumoTemp[empresa.nome] = {};
        
        // Para cada mês do período
        for (const mesAno of mesesDoPeriodo) {
          const chave = `${mesAno.mes}-${mesAno.ano}`;
          const consumo = await calcularConsumoSegmentadoPorMes(
            empresaId,
            empresa.filtro_tipo,
            empresa.filtro_valor,
            mesAno.mes,
            mesAno.ano
          );
          
          consumoTemp[empresa.nome][chave] = consumo;
          
          console.log(`📊 [${empresa.nome}] ${chave}: ${converterMinutosParaHoras(consumo)}`);
        }
      }
      
      setConsumoPorEmpresaMes(consumoTemp);
      setCarregandoConsumo(false);
      
      console.log('✅ [VisaoSegmentada] Busca de consumo concluída!');
    };
    
    buscarConsumoSegmentado();
  }, [empresaId, segmentacaoConfig, mesesDoPeriodo]);
  
  // Buscar reajustes por empresa segmentada
  useEffect(() => {
    const buscarReajustesSegmentados = async () => {
      setCarregandoReajustes(true);
      
      console.log('🔄 [VisaoSegmentada] Iniciando busca de reajustes segmentados...');
      
      const reajustesTemp: Record<string, Record<string, number>> = {};
      
      // Para cada empresa segmentada
      for (const empresa of segmentacaoConfig.empresas) {
        reajustesTemp[empresa.nome] = {};
        
        // Para cada mês do período
        for (const mesAno of mesesDoPeriodo) {
          const chave = `${mesAno.mes}-${mesAno.ano}`;
          
          // Buscar reajustes desta empresa segmentada neste mês
          const { data: reajustes, error } = await supabase
            .from('banco_horas_reajustes')
            .select('valor_reajuste_horas, tipo_reajuste')
            .eq('empresa_id', empresaId)
            .eq('mes', mesAno.mes)
            .eq('ano', mesAno.ano)
            .eq('empresa_segmentada', empresa.nome)
            .eq('ativo', true);
          
          if (error) {
            console.error(`❌ Erro ao buscar reajustes de ${empresa.nome} em ${chave}:`, error);
            reajustesTemp[empresa.nome][chave] = 0;
            continue;
          }
          
          // Somar todos os reajustes (entrada = positivo, saida = negativo)
          let totalReajusteMinutos = 0;
          
          if (reajustes && reajustes.length > 0) {
            for (const reajuste of reajustes) {
              const valorMinutos = converterHorasParaMinutos(reajuste.valor_reajuste_horas || '00:00');
              
              if (reajuste.tipo_reajuste === 'entrada') {
                totalReajusteMinutos += valorMinutos;
              } else if (reajuste.tipo_reajuste === 'saida') {
                totalReajusteMinutos -= valorMinutos;
              }
            }
          }
          
          reajustesTemp[empresa.nome][chave] = totalReajusteMinutos;
          
          console.log(`📊 [${empresa.nome}] Reajuste ${chave}: ${converterMinutosParaHoras(Math.abs(totalReajusteMinutos))} (${totalReajusteMinutos >= 0 ? '+' : '-'})`);
        }
      }
      
      setReajustesPorEmpresaMes(reajustesTemp);
      setCarregandoReajustes(false);
      
      console.log('✅ [VisaoSegmentada] Busca de reajustes concluída!');
    };
    
    buscarReajustesSegmentados();
  }, [empresaId, segmentacaoConfig, mesesDoPeriodo]);
  
  // Calcular dados para cada empresa segmentada por mês
  const dadosSegmentados = useMemo(() => {
    // TODO: Buscar baseline total real da empresa do banco de dados
    const baselineTotal = '80:00'; // Placeholder
    
    return segmentacaoConfig.empresas.map(empresa => {
      const baseline = calcularBaselineSegmentado(baselineTotal, empresa.percentual);
      
      // Array temporário para armazenar dados de cada mês
      const dadosPorMes: Array<{
        mes: number;
        ano: number;
        baseline: number;
        repasseMesAnterior: number;
        saldoAUtilizar: number;
        consumoChamados: number;
        requerimentos: number;
        reajuste: number;
        consumoTotal: number;
        saldo: number;
        repasse: number;
      }> = [];
      
      // Calcular dados para cada mês do período
      mesesDoPeriodo.forEach((mesAno, indexMes) => {
        // Buscar consumo de chamados do estado
        const chave = `${mesAno.mes}-${mesAno.ano}`;
        const consumoChamados = consumoPorEmpresaMes[empresa.nome]?.[chave] || 0;
        
        // Calcular repasse do mês anterior (PERMITIR VALORES NEGATIVOS)
        const repasseMesAnterior = indexMes > 0 && dadosPorMes[indexMes - 1]
          ? Math.round(dadosPorMes[indexMes - 1].saldo * (percentualRepasseMensal / 100))
          : 0;
        
        // Saldo a utilizar = baseline + repasse mês anterior (pode ser negativo)
        const saldoAUtilizar = baseline + repasseMesAnterior;
        
        console.log(`🔍 [${empresa.nome}] ${chave} - INÍCIO DA FILTRAGEM:`, {
          mes: mesAno.mes,
          ano: mesAno.ano,
          totalRequerimentos: requerimentos.length,
          requerimentosEmpresa: requerimentos.filter(r => r.empresa_segmentacao_nome === empresa.nome).length,
          todosRequerimentos: requerimentos.map(r => ({
            id: r.id,
            chamado: r.chamado,
            empresa_segmentacao_nome: r.empresa_segmentacao_nome,
            mes_cobranca: r.mes_cobranca,
            horas_funcional: r.horas_funcional,
            horas_tecnico: r.horas_tecnico
          }))
        });
        
        // Filtrar requerimentos desta empresa segmentada neste mês
        const requerimentosDoMes = requerimentos.filter(req => {
          // Verificar se o requerimento pertence a esta empresa de segmentação
          if (req.empresa_segmentacao_nome !== empresa.nome) {
            console.log(`❌ [${empresa.nome}] Requerimento ${req.chamado} não pertence a esta empresa (tem: ${req.empresa_segmentacao_nome})`);
            return false;
          }
          
          // Verificar se o requerimento tem mês de cobrança
          if (!req.mes_cobranca || typeof req.mes_cobranca !== 'string') {
            console.warn(`⚠️ [${empresa.nome}] Requerimento sem mes_cobranca válido:`, req.id, req.chamado);
            return false;
          }
          
          // Formato esperado: "MM/YYYY" (ex: "01/2026" ou "02/2026") ou "YYYY-MM" (ex: "2026-01")
          let mesReq: number;
          let anoReq: number;
          
          if (req.mes_cobranca.includes('/')) {
            // Formato: "MM/YYYY"
            const partes = req.mes_cobranca.split('/');
            mesReq = parseInt(partes[0], 10);
            anoReq = parseInt(partes[1], 10);
            console.log(`🔍 [${empresa.nome}] Parsing mes_cobranca "${req.mes_cobranca}" (formato MM/YYYY):`, { mesReq, anoReq, esperado: { mes: mesAno.mes, ano: mesAno.ano } });
          } else if (req.mes_cobranca.includes('-')) {
            // Formato: "YYYY-MM"
            const partes = req.mes_cobranca.split('-');
            anoReq = parseInt(partes[0], 10);
            mesReq = parseInt(partes[1], 10);
            console.log(`🔍 [${empresa.nome}] Parsing mes_cobranca "${req.mes_cobranca}" (formato YYYY-MM):`, { mesReq, anoReq, esperado: { mes: mesAno.mes, ano: mesAno.ano } });
          } else {
            console.warn(`⚠️ [${empresa.nome}] Formato de mes_cobranca inválido:`, req.mes_cobranca);
            return false;
          }
          
          // Validar se são números válidos
          if (isNaN(mesReq) || isNaN(anoReq)) {
            console.warn(`⚠️ [${empresa.nome}] Mês ou ano inválido:`, { mesReq, anoReq, mes_cobranca: req.mes_cobranca });
            return false;
          }
          
          const match = mesReq === mesAno.mes && anoReq === mesAno.ano;
          console.log(`${match ? '✅' : '❌'} [${empresa.nome}] Requerimento ${req.chamado}: ${mesReq}/${anoReq} ${match ? '===' : '!=='} ${mesAno.mes}/${mesAno.ano}`);
          
          return match;
        });
        
        // Somar horas dos requerimentos (funcional + técnico)
        const requerimentosMinutos = requerimentosDoMes.reduce((total, req) => {
          let horasFuncional = 0;
          let horasTecnico = 0;
          
          // Converter horas_funcional (pode ser string "HH:MM" ou number decimal)
          if (typeof req.horas_funcional === 'string' && req.horas_funcional.includes(':')) {
            // Formato "HH:MM" - converter para minutos
            const [horas, minutos] = req.horas_funcional.split(':').map(Number);
            horasFuncional = (horas * 60) + minutos;
          } else if (typeof req.horas_funcional === 'number') {
            // Formato decimal - converter para minutos
            horasFuncional = Math.round(req.horas_funcional * 60);
          } else if (req.horas_funcional) {
            // Tentar converter string numérica
            const valor = parseFloat(req.horas_funcional);
            if (!isNaN(valor)) {
              horasFuncional = Math.round(valor * 60);
            }
          }
          
          // Converter horas_tecnico (pode ser string "HH:MM" ou number decimal)
          if (typeof req.horas_tecnico === 'string' && req.horas_tecnico.includes(':')) {
            // Formato "HH:MM" - converter para minutos
            const [horas, minutos] = req.horas_tecnico.split(':').map(Number);
            horasTecnico = (horas * 60) + minutos;
          } else if (typeof req.horas_tecnico === 'number') {
            // Formato decimal - converter para minutos
            horasTecnico = Math.round(req.horas_tecnico * 60);
          } else if (req.horas_tecnico) {
            // Tentar converter string numérica
            const valor = parseFloat(req.horas_tecnico);
            if (!isNaN(valor)) {
              horasTecnico = Math.round(valor * 60);
            }
          }
          
          console.log(`💰 [${empresa.nome}] ${chave} - Processando requerimento ${req.chamado}:`, {
            horas_funcional_original: req.horas_funcional,
            horas_tecnico_original: req.horas_tecnico,
            horasFuncional_minutos: horasFuncional,
            horasTecnico_minutos: horasTecnico,
            tipo_horas_funcional: typeof req.horas_funcional,
            tipo_horas_tecnico: typeof req.horas_tecnico,
            total_minutos: horasFuncional + horasTecnico,
            total_horas: converterMinutosParaHoras(horasFuncional + horasTecnico)
          });
          
          // Validar se são números válidos
          if (isNaN(horasFuncional) || isNaN(horasTecnico)) {
            console.warn(`⚠️ [${empresa.nome}] Horas inválidas no requerimento:`, req.id, { horasFuncional, horasTecnico });
            return total;
          }
          
          const minutosRequerimento = horasFuncional + horasTecnico;
          console.log(`✅ [${empresa.nome}] ${chave} - Adicionando ${minutosRequerimento} minutos (${converterMinutosParaHoras(minutosRequerimento)}) ao total`);
          
          return total + minutosRequerimento;
        }, 0);
        
        console.log(`📊 [${empresa.nome}] ${chave} - Requerimentos:`, {
          total: requerimentosDoMes.length,
          minutos: requerimentosMinutos,
          horas: converterMinutosParaHoras(requerimentosMinutos),
          requerimentos: requerimentosDoMes.map(r => ({
            id: r.id,
            chamado: r.chamado,
            mes_cobranca: r.mes_cobranca,
            horas_funcional: r.horas_funcional,
            horas_tecnico: r.horas_tecnico
          }))
        });
        
        // Buscar reajuste do estado
        const reajuste = reajustesPorEmpresaMes[empresa.nome]?.[chave] || 0;
        
        // Consumo total = consumo chamados + requerimentos + reajuste
        // IMPORTANTE: Reajuste de "entrada" aumenta o consumo (positivo)
        //             Reajuste de "saída" diminui o consumo (negativo)
        const consumoTotal = consumoChamados + requerimentosMinutos + reajuste;
        
        // Saldo = saldo a utilizar - consumo total (pode ser negativo)
        const saldo = saldoAUtilizar - consumoTotal;
        
        // Repasse para próximo mês (PERMITIR VALORES NEGATIVOS)
        const repasse = Math.round(saldo * (percentualRepasseMensal / 100));
        
        // Adicionar dados do mês ao array
        dadosPorMes.push({
          mes: mesAno.mes,
          ano: mesAno.ano,
          baseline,
          repasseMesAnterior,
          saldoAUtilizar,
          consumoChamados,
          requerimentos: requerimentosMinutos,
          reajuste,
          consumoTotal,
          saldo,
          repasse,
        });
      });
      
      // Calcular excedentes (saldo negativo do último mês do período)
      const ultimoMes = dadosPorMes[dadosPorMes.length - 1];
      const excedentes = ultimoMes && ultimoMes.saldo < 0 ? Math.abs(ultimoMes.saldo) : 0;
      
      // Calcular valor total dos excedentes DESTA EMPRESA
      let valorTotalExcedentes = 0;
      if (taxaHoraCalculada && taxaHoraCalculada > 0 && excedentes > 0) {
        // Converter minutos para horas decimais
        const horasDecimais = excedentes / 60;
        // Calcular valor total
        valorTotalExcedentes = horasDecimais * taxaHoraCalculada;
      }
      
      console.log(`📊 [${empresa.nome}] Excedentes e valor calculados:`, {
        ultimoMesSaldo: ultimoMes?.saldo,
        ultimoMesSaldoHoras: ultimoMes ? converterMinutosParaHoras(ultimoMes.saldo) : 'N/A',
        excedentes,
        excedentesHoras: converterMinutosParaHoras(excedentes),
        temExcedentes: excedentes > 0,
        taxaHora: taxaHoraCalculada,
        valorTotal: valorTotalExcedentes
      });
      
      return {
        nome: empresa.nome,
        percentual: empresa.percentual,
        baseline,
        dadosPorMes,
        excedentes,
        valorTotalExcedentes, // Adicionar valor total específico desta empresa
        filtroTipo: empresa.filtro_tipo,
        filtroValor: empresa.filtro_valor,
      };
    });
  }, [segmentacaoConfig, mesesDoPeriodo, percentualRepasseMensal, consumoPorEmpresaMes, reajustesPorEmpresaMes, taxaHoraCalculada, requerimentos]);
  
  // Mostrar loading enquanto busca dados
  if (carregandoConsumo || carregandoReajustes) {
    return (
      <Card className="rounded-xl overflow-hidden">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
            <p className="text-sm text-gray-500">
              {carregandoConsumo ? 'Carregando dados de consumo segmentado...' : 'Carregando reajustes...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Tabela para cada empresa segmentada */}
      {dadosSegmentados.map((dados, index) => {
        console.log(`🔍 [Renderização] Empresa: ${dados.nome}`, {
          excedentes: dados.excedentes,
          excedentesHoras: converterMinutosParaHoras(dados.excedentes),
          temExcedentes: dados.excedentes > 0,
          mostrarLinha: dados.excedentes > 0
        });
        
        return (
        <Card key={index} className="rounded-xl overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-sonda-blue" />
                {dados.nome}
              </CardTitle>
              <Badge className="bg-sonda-blue text-white">
                {dados.percentual}% do Baseline
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  {/* Linha: Período */}
                  <TableRow className="bg-gray-700 hover:bg-gray-700">
                    <TableHead className="font-semibold text-white text-center">Período</TableHead>
                    <TableHead className="font-semibold text-white text-center" colSpan={mesesDoPeriodo.length}>
                      {periodoApuracao}º Quadrimestre
                    </TableHead>
                  </TableRow>
                  
                  {/* Linha: Mês */}
                  <TableRow className="bg-sonda-blue hover:bg-sonda-blue">
                    <TableHead className="text-white font-semibold text-center">Mês</TableHead>
                    {mesesDoPeriodo.map((mesAno, idx) => {
                      return (
                        <TableHead key={idx} className="text-white font-semibold text-center">
                          {MESES[mesAno.mes - 1]}/{mesAno.ano}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Banco Contratado (Baseline) */}
                  <TableRow className="bg-gray-700 hover:bg-gray-700">
                    <TableCell className="font-semibold text-white text-center">
                      Banco Contratado
                    </TableCell>
                    {mesesDoPeriodo.map((_, idx) => (
                      <TableCell key={idx} className="text-center font-semibold text-white">
                        {converterMinutosParaHoras(dados.baseline)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Repasse mês anterior */}
                  <TableRow className="bg-gray-200 hover:bg-gray-200">
                    <TableCell className="font-medium text-gray-900 text-center">
                      Repasse mês anterior
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell 
                        key={idx} 
                        className={`text-center font-semibold ${getColorClass(mesDados.repasseMesAnterior)}`}
                      >
                        {converterMinutosParaHoras(mesDados.repasseMesAnterior)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Saldo a utilizar */}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-medium text-center">
                      Saldo a utilizar
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell 
                        key={idx} 
                        className={`text-center font-semibold ${getColorClass(mesDados.saldoAUtilizar)}`}
                      >
                        {converterMinutosParaHoras(mesDados.saldoAUtilizar)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Consumo Chamados */}
                  <TableRow>
                    <TableCell className="font-medium text-center">
                      Consumo Chamados
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell key={idx} className="text-center font-semibold text-gray-900">
                        {converterMinutosParaHoras(mesDados.consumoChamados)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Requerimentos */}
                  <TableRow>
                    <TableCell className="font-medium text-center">
                      Requerimentos
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell key={idx} className="text-center font-semibold text-gray-900">
                        {converterMinutosParaHoras(mesDados.requerimentos)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Reajuste */}
                  <TableRow>
                    <TableCell className="font-medium text-center">
                      Reajuste
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell 
                        key={idx} 
                        className={`text-center font-semibold ${getColorClass(mesDados.reajuste)}`}
                      >
                        {converterMinutosParaHoras(Math.abs(mesDados.reajuste))}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Consumo Total */}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-medium text-center">
                      Consumo Total
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell key={idx} className="text-center font-semibold text-gray-900">
                        {converterMinutosParaHoras(mesDados.consumoTotal)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Saldo */}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-medium text-center">
                      Saldo
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell 
                        key={idx} 
                        className={`text-center font-semibold ${getColorClass(mesDados.saldo)}`}
                      >
                        {converterMinutosParaHoras(mesDados.saldo)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Repasse - Percentual */}
                  <TableRow className="bg-gray-50">
                    <TableCell className="font-medium text-center">
                      Repasse - {percentualRepasseMensal}%
                    </TableCell>
                    {dados.dadosPorMes.map((mesDados, idx) => (
                      <TableCell 
                        key={idx} 
                        className={`text-center font-semibold ${getColorClass(mesDados.repasse)}`}
                      >
                        {converterMinutosParaHoras(mesDados.repasse)}
                      </TableCell>
                    ))}
                  </TableRow>
                  
                  {/* Taxa/hora Excedente e Valor Total na mesma linha */}
                  <TableRow className="bg-gray-700 hover:bg-gray-700">
                    <TableCell className="font-medium text-white text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span>Taxa/hora Excedente</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button className="inline-flex items-center justify-center">
                                <Info className="h-4 w-4 text-blue-300 hover:text-blue-100 transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md p-4 bg-white text-gray-900 shadow-lg">
                              <div className="space-y-2 text-sm">
                                <p className="font-semibold">Nota – Excedente na Visão Segmentada:</p>
                                <p>Os excedentes identificados na visão segmentada não geram cobrança individual por segmento.</p>
                                <p>A cobrança de excedentes é sempre calculada e faturada com base na visão consolidada do contrato.</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-white">
                      {taxaHoraCalculada && taxaHoraCalculada > 0 ? formatarMoeda(taxaHoraCalculada) : ''}
                    </TableCell>
                    <TableCell className="font-medium text-center text-white" colSpan={mesesDoPeriodo.length > 1 ? mesesDoPeriodo.length - 2 : 1}>
                      Valor Total
                    </TableCell>
                    <TableCell className="text-center font-semibold text-white">
                      {formatarMoeda(dados.valorTotalExcedentes)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
