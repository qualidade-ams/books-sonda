/**
 * BookConsumo - Componente de Consumo
 * Exibe visão detalhada de utilização de horas e baseline
 */

import { useState, useEffect } from 'react';
import { Clock, TrendingUp, AlertCircle, CheckCircle2, FileText, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BookConsumoData, RequerimentoDescontadoData } from '@/types/books';
import { useTaxasEspecificasCliente, type TaxasEspecificasCliente } from '@/hooks/useTaxasEspecificasCliente';
import { useTranslation } from 'react-i18next';
import BookFooterBar from './BookFooterBar';

interface BookConsumoProps {
  data: BookConsumoData;
  empresaNome?: string; // Nome abreviado do cliente
  empresaId?: string; // ID da empresa para buscar requerimentos
  mes?: number; // Mês do book
  ano?: number; // Ano do book
  onDataLoaded?: () => void; // Callback quando dados assíncronos terminam de carregar
}

/**
 * Formata horas removendo os segundos (HH:MM:SS -> HH:MM)
 */
function formatarHorasSemSegundos(horasCompletas: string): string {
  if (!horasCompletas || horasCompletas === '--') return horasCompletas;
  
  // Remove os segundos (pega apenas HH:MM) e garante zero à esquerda nos minutos
  const partes = horasCompletas.split(':');
  if (partes.length >= 2) {
    return `${partes[0]}:${partes[1].padStart(2, '0')}`;
  }
  return horasCompletas;
}

/**
 * Converte string de horas (HH:MM:SS ou HH:MM) para minutos totais
 * Suporta valores negativos (ex: "-10:35" = -635 minutos)
 */
function parseHorasParaMinutos(horas: string): number {
  if (!horas || horas === '--') return 0;
  
  const valor = horas.trim();
  const isNegativo = valor.startsWith('-');
  const valorSemSinal = isNegativo ? valor.substring(1) : valor;
  
  const partes = valorSemSinal.split(':');
  const h = parseInt(partes[0] || '0', 10);
  const m = parseInt(partes[1] || '0', 10);
  const totalMinutos = h * 60 + m;
  
  return isNegativo ? -totalMinutos : totalMinutos;
}

/**
 * Converte minutos totais para string HH:MM:SS
 */
function minutosParaHoras(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

/**
 * Determina a cor do valor com base no sinal (positivo/negativo/zero)
 * - Negativo (começa com '-'): vermelho
 * - Positivo (> 0 minutos): verde
 * - Zero: preto
 */
function getColorClass(horas?: string): string {
  if (!horas) return 'text-gray-900';
  
  const isNegativo = horas.startsWith('-');
  if (isNegativo) return 'text-red-600';
  
  const minutos = parseHorasParaMinutos(horas);
  if (minutos > 0) return 'text-green-600';
  
  return 'text-gray-900';
}

export default function BookConsumo({ data, empresaNome, empresaId, mes, ano, onDataLoaded }: BookConsumoProps) {
  const { t } = useTranslation();

  // Helper to translate abbreviated month names from backend (Portuguese) to current language
  const translateMonthAbbrev = (mes: string): string => {
    const key = `books.bookContent.monthsAbbrev.${mes}`;
    const translated = t(key);
    return translated !== key ? translated : mes;
  };

  const [modalRequerimentosAberto, setModalRequerimentosAberto] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [requerimentosMes, setRequerimentosMes] = useState<RequerimentoDescontadoData[]>([]);
  const [carregandoRequerimentos, setCarregandoRequerimentos] = useState(false);
  const [bancoHorasTrimestre, setBancoHorasTrimestre] = useState<any[]>([]);
  const [carregandoBancoHoras, setCarregandoBancoHoras] = useState(false);
  const [taxaPadraoEmpresa, setTaxaPadraoEmpresa] = useState<number>(0);
  const [percentualRepasseEmpresa, setPercentualRepasseEmpresa] = useState<number>(50);
  const [tipoContratoEmpresa, setTipoContratoEmpresa] = useState<string>('horas');
  // Requerimentos descontados em tempo real (busca quando snapshot está vazio)
  const [requerimentosDescontadosReal, setRequerimentosDescontadosReal] = useState<RequerimentoDescontadoData[] | null>(null);

  // Determina se o contrato é do tipo ticket (inclui 'ambos' pois exibe visão de tickets no Book)
  const isTicket = tipoContratoEmpresa === 'tickets' || tipoContratoEmpresa === 'ticket' || tipoContratoEmpresa === 'ambos';

  /**
   * Formata valor da tabela de banco de horas baseado no tipo de contrato
   * - Ticket: exibe como número inteiro (ex: "5", "12")
   * - Horas: exibe como HH:MM (ex: "15:30")
   */
  const formatarValorBanco = (horas?: string | null, tickets?: number | null): string => {
    if (isTicket) {
      if (tickets === undefined || tickets === null) return '0';
      return tickets.toString();
    }
    return formatarHorasSemSegundos(horas || '00:00');
  };

  /**
   * Determina cor para valores de ticket (positivo/negativo/zero)
   */
  const getColorClassTicket = (tickets?: number | null): string => {
    if (tickets === undefined || tickets === null || tickets === 0) return 'text-gray-900';
    if (tickets < 0) return 'text-red-600';
    if (tickets > 0) return 'text-green-600';
    return 'text-gray-900';
  };

  /**
   * Retorna a classe de cor baseada no tipo de contrato
   */
  const getColorClassValor = (horas?: string | null, tickets?: number | null): string => {
    if (isTicket) return getColorClassTicket(tickets);
    return getColorClass(horas || undefined);
  };

  // Buscar taxas específicas do cliente (igual à tela de banco de horas)
  const { taxasEspecificas, isLoading: isLoadingTaxas } = useTaxasEspecificasCliente(empresaId) as {
    taxasEspecificas: TaxasEspecificasCliente | null | undefined;
    isLoading: boolean;
  };
  
  console.log('💰 Taxas específicas do cliente:', {
    taxasEspecificas,
    ticket_excedente_simples: taxasEspecificas?.ticket_excedente_simples,
    todos_campos: taxasEspecificas ? Object.keys(taxasEspecificas) : []
  });

  // ✅ NOVO: Buscar taxa usando a MESMA LÓGICA do serviço de excedentes do banco de horas
  // Se já tem no snapshot, usar direto (PDF e versões antigas)
  useEffect(() => {
    if (data.taxa_hora_excedente && data.taxa_hora_excedente > 0) {
      console.log('✅ Usando taxa_hora_excedente do snapshot:', data.taxa_hora_excedente);
      setTaxaPadraoEmpresa(data.taxa_hora_excedente);
      return;
    }

    const buscarTaxaExcedente = async () => {
      if (!empresaId || !mes || !ano) {
        console.log('⚠️ [buscarTaxaExcedente] Parâmetros faltando:', { empresaId, mes, ano });
        return;
      }
      
      console.log('🔍 [buscarTaxaExcedente] Iniciando busca de taxa (mesma lógica do banco de horas):', {
        empresaId,
        mes,
        ano
      });
      
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // Calcular data de referência (primeiro dia do mês)
        const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
        
        console.log('📅 [buscarTaxaExcedente] Data de referência:', dataReferencia);
        
        // ✅ MESMA LÓGICA DO BANCO DE HORAS: Buscar taxas disponíveis (vigentes ou vencidas)
        // Busca TODAS as taxas que iniciaram antes ou no mês de referência
        const { data: taxasArray, error } = await supabase
          .from('taxas_clientes')
          .select('id, vigencia_inicio, vigencia_fim, tipo_produto, tipo_calculo_adicional')
          .eq('cliente_id', empresaId)
          .lte('vigencia_inicio', dataReferencia)
          .order('vigencia_inicio', { ascending: false }); // Mais recente primeiro
        
        const taxas = taxasArray as Array<{
          id: string;
          vigencia_inicio: string;
          vigencia_fim: string | null;
          tipo_produto: string;
          tipo_calculo_adicional: string;
        }> | null;
        
        if (error) {
          console.error('❌ [buscarTaxaExcedente] Erro ao buscar taxas:', error);
          return;
        }
        
        if (!taxas || taxas.length === 0) {
          console.log('⚠️ [buscarTaxaExcedente] Nenhuma taxa encontrada para o período');
          setTaxaPadraoEmpresa(0);
          return;
        }
        
        console.log('📊 [buscarTaxaExcedente] Taxas encontradas:', {
          quantidade: taxas.length,
          taxas: taxas.map(t => ({
            id: t.id,
            vigencia_inicio: t.vigencia_inicio,
            vigencia_fim: t.vigencia_fim,
            tipo_produto: t.tipo_produto
          }))
        });
        
        // Pegar a taxa mais recente (primeira da lista)
        const taxaMaisRecente = taxas[0];
        
        console.log('✅ [buscarTaxaExcedente] Taxa mais recente selecionada:', {
          id: taxaMaisRecente.id,
          vigencia_inicio: taxaMaisRecente.vigencia_inicio,
          vigencia_fim: taxaMaisRecente.vigencia_fim
        });
        
        // ✅ BUSCAR VALOR_ADICIONAL DA FUNÇÃO FUNCIONAL (Hora Adicional - Excedente do Banco)
        // Mesma lógica do bancoHorasExcedentesService.ts
        const { data: valoresArray, error: valoresError } = await supabase
          .from('valores_taxas_funcoes')
          .select('valor_base, valor_adicional, funcao')
          .eq('taxa_id', taxaMaisRecente.id)
          .eq('tipo_hora', 'remota');
        
        const valores = valoresArray as Array<{
          valor_base: number;
          valor_adicional: number | null;
          funcao: string;
        }> | null;
        
        if (valoresError) {
          console.error('❌ [buscarTaxaExcedente] Erro ao buscar valores:', valoresError);
          return;
        }
        
        if (!valores || valores.length === 0) {
          console.log('⚠️ [buscarTaxaExcedente] Nenhum valor encontrado na tabela valores_taxas_funcoes');
          setTaxaPadraoEmpresa(0);
          return;
        }
        
        console.log('📊 [buscarTaxaExcedente] Valores encontrados:', {
          quantidade: valores.length,
          valores: valores.map(v => ({
            funcao: v.funcao,
            valor_base: v.valor_base,
            valor_adicional: v.valor_adicional
          }))
        });
        
        // Buscar função Funcional
        const valorFuncional = valores.find(v => v.funcao === 'Funcional');
        
        if (!valorFuncional) {
          console.log('⚠️ [buscarTaxaExcedente] Função Funcional não encontrada');
          setTaxaPadraoEmpresa(0);
          return;
        }
        
        // ✅ PRIORIDADE: Usar valor_adicional cadastrado (se existir E for > 0), senão calcular
        let taxaHoraAdicional: number;
        
        if (valorFuncional.valor_adicional !== null && 
            valorFuncional.valor_adicional !== undefined && 
            valorFuncional.valor_adicional > 0) {
          // Usar valor REAL cadastrado
          taxaHoraAdicional = valorFuncional.valor_adicional;
          console.log('✅ [buscarTaxaExcedente] Taxa de Hora Adicional REAL da tabela:', {
            valor_adicional_cadastrado: valorFuncional.valor_adicional,
            taxaUtilizada: `R$ ${taxaHoraAdicional.toFixed(2)}`
          });
        } else if (taxaMaisRecente.tipo_calculo_adicional === 'normal') {
          // Fallback: calcular +15%
          // CORREÇÃO: Usar soma para evitar imprecisão de ponto flutuante
          taxaHoraAdicional = Math.round((valorFuncional.valor_base + (valorFuncional.valor_base * 0.15)) * 100) / 100;
          console.log('⚠️ [buscarTaxaExcedente] Taxa calculada (fallback - normal):', {
            valorBase: valorFuncional.valor_base,
            percentual: '15%',
            taxaCalculada: `R$ ${taxaHoraAdicional.toFixed(2)}`
          });
        } else {
          // Media: média das três primeiras funções
          const funcoesPrincipais = ['Funcional', 'Técnico (Instalação / Atualização)', 'ABAP - PL/SQL'];
          
          const valoresPrincipais = valores
            .filter(v => funcoesPrincipais.includes(v.funcao))
            .map(v => {
              const taxaExcedente = (v.valor_adicional && v.valor_adicional > 0) 
                ? v.valor_adicional 
                : Math.round((v.valor_base + (v.valor_base * 0.15)) * 100) / 100;
              
              return {
                funcao: v.funcao,
                taxa_excedente_usada: taxaExcedente
              };
            });
          
          if (valoresPrincipais.length === 0) {
            console.log('⚠️ [buscarTaxaExcedente] Nenhum valor das funções principais encontrado');
            setTaxaPadraoEmpresa(0);
            return;
          }
          
          const soma = valoresPrincipais.reduce((acc, val) => acc + val.taxa_excedente_usada, 0);
          taxaHoraAdicional = soma / valoresPrincipais.length;
          
          console.log('✅ [buscarTaxaExcedente] Taxa calculada (média):', {
            funcoes: valoresPrincipais.length,
            media: `R$ ${taxaHoraAdicional.toFixed(2)}`
          });
        }
        
        setTaxaPadraoEmpresa(taxaHoraAdicional);
        
        console.log('✅ [buscarTaxaExcedente] Taxa final definida:', {
          taxa: taxaHoraAdicional,
          valor_formatado: new Intl.NumberFormat('pt-BR', { 
            style: 'currency', 
            currency: 'BRL' 
          }).format(taxaHoraAdicional)
        });
      } catch (error) {
        console.error('❌ [buscarTaxaExcedente] Erro ao buscar taxa:', error);
        setTaxaPadraoEmpresa(0);
      }
    };
    
    buscarTaxaExcedente();
  }, [empresaId, mes, ano, data.taxa_hora_excedente]);

  // Buscar dados de banco de horas do trimestre ao montar o componente
  // Se os dados já estão no snapshot (data.banco_horas_trimestre), usar direto
  useEffect(() => {
    // Se já tem dados no snapshot, usar direto (PDF e versões antigas)
    // CORREÇÃO: Verificar se pelo menos um mês tem dados reais (não null)
    const snapshotTemDadosReais = data.banco_horas_trimestre && 
      data.banco_horas_trimestre.length > 0 &&
      data.banco_horas_trimestre.some((item: any) => item.dados !== null && item.dados !== undefined);
    
    if (snapshotTemDadosReais) {
      console.log('✅ Usando banco_horas_trimestre do snapshot:', data.banco_horas_trimestre!.length, 'meses');
      
      // Buscar percentual da empresa para usar no cálculo de meses futuros
      const processarSnapshot = async () => {
        let percentualRepasse = 50; // fallback
        if (empresaId) {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: empresa } = await supabase
              .from('empresas_clientes')
              .select('percentual_repasse_mensal, tipo_contrato')
              .eq('id', empresaId)
              .single();
            if (empresa?.percentual_repasse_mensal != null) {
              percentualRepasse = empresa.percentual_repasse_mensal;
            }
            if (empresa?.tipo_contrato) {
              setTipoContratoEmpresa(empresa.tipo_contrato.toLowerCase());
            }
          } catch (e) {
            console.warn('⚠️ Erro ao buscar percentual da empresa, usando fallback 50%');
          }
          setPercentualRepasseEmpresa(percentualRepasse);
        }

        // Aplicar mesma lógica de zerar consumo para meses futuros
        const mesReferencia = mes;
        const anoReferencia = ano;
        
        if (mesReferencia && anoReferencia) {
          const mesComDados = data.banco_horas_trimestre!.find(r => r.dados?.baseline_horas);
          const baselineHoras = mesComDados?.dados?.baseline_horas || null;
          
          const resultadosProcessados: typeof data.banco_horas_trimestre = [];
          const totalMesesCiclo = data.banco_horas_trimestre!.length;
          
          for (let idx = 0; idx < data.banco_horas_trimestre!.length; idx++) {
            const resultado = data.banco_horas_trimestre![idx];
            const eFuturo = (resultado.ano > anoReferencia) || 
                            (resultado.ano === anoReferencia && resultado.mes > mesReferencia);
            
            if (eFuturo) {
              const dadosMesAnterior = idx > 0 ? resultadosProcessados![idx - 1]?.dados : null;
              const repasseMesAnterior: string = dadosMesAnterior?.repasse_horas || '00:00:00';
              const baselineMes: string = resultado.dados?.baseline_horas || baselineHoras || '00:00:00';
              
              const baselineMinutos = parseHorasParaMinutos(baselineMes);
              const repasseMinutos = parseHorasParaMinutos(repasseMesAnterior);
              const saldoUtilizar = baselineMinutos + repasseMinutos;
              
              // ✅ CORREÇÃO: Verificar se é o último mês do ciclo para zerar repasse
              const isUltimoMesCiclo = idx === (totalMesesCiclo - 1);
              const repasse = isUltimoMesCiclo ? 0 : Math.floor(saldoUtilizar * percentualRepasse / 100);
              
              resultadosProcessados!.push({
                ...resultado,
                dados: {
                  baseline_horas: baselineMes,
                  repasses_mes_anterior_horas: repasseMesAnterior,
                  saldo_a_utilizar_horas: minutosParaHoras(saldoUtilizar),
                  consumo_horas: '00:00:00',
                  requerimentos_horas: '00:00:00',
                  reajustes_horas: '00:00:00',
                  consumo_total_horas: '00:00:00',
                  saldo_horas: minutosParaHoras(saldoUtilizar),
                  repasse_horas: minutosParaHoras(repasse),
                  excedentes_horas: '00:00:00',
                  valor_excedentes_horas: 0,
                  taxa_hora_utilizada: null
                }
              });
            } else {
              resultadosProcessados!.push(resultado);
            }
          }
          
          setBancoHorasTrimestre(resultadosProcessados!);
        } else {
          setBancoHorasTrimestre(data.banco_horas_trimestre!);
        }
        
        setCarregandoBancoHoras(false);
        onDataLoaded?.();
      };

      processarSnapshot();
      return;
    }

    // Snapshot não tem dados reais (todos null) ou não existe - buscar em tempo real
    if (data.banco_horas_trimestre && data.banco_horas_trimestre.length > 0) {
      console.log('⚠️ Snapshot banco_horas_trimestre existe mas todos os meses têm dados null. Buscando em tempo real...');
    }

    const buscarBancoHorasTrimestre = async () => {
      if (!empresaId || !mes || !ano) {
        console.log('⚠️ Faltam parâmetros:', { empresaId, mes, ano });
        onDataLoaded?.();
        return;
      }
      
      setCarregandoBancoHoras(true);
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // 1. Buscar dados da empresa para pegar periodo_apuracao e inicio_vigencia
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas_clientes')
          .select('periodo_apuracao, inicio_vigencia, percentual_repasse_mensal, tipo_contrato')
          .eq('id', empresaId)
          .single();
        
        if (empresaError) {
          console.error('❌ Erro ao buscar dados da empresa:', empresaError);
          return;
        }
        
        console.log('📊 Dados da empresa:', empresa);
        
        const periodoApuracao = empresa?.periodo_apuracao || 3; // Default: trimestral
        const inicioVigencia = empresa?.inicio_vigencia;
        const percentualRepasse = empresa?.percentual_repasse_mensal ?? 50;
        setPercentualRepasseEmpresa(percentualRepasse);
        if (empresa?.tipo_contrato) {
          setTipoContratoEmpresa(empresa.tipo_contrato.toLowerCase());
        }
        
        // 2. Calcular os meses do ciclo baseado no periodo_apuracao e inicio_vigencia
        let mesesCiclo: { mes: number; ano: number }[] = [];
        
        if (inicioVigencia) {
          // Extrair mês e ano do inicio_vigencia (formato: YYYY-MM-DD)
          const [anoVigencia, mesVigencia] = inicioVigencia.split('-').map(Number);
          
          console.log(`📅 Início vigência: ${mesVigencia}/${anoVigencia}`);
          console.log(`📅 Período apuração: ${periodoApuracao} meses`);
          console.log(`📅 Mês atual do book: ${mes}/${ano}`);
          
          // Calcular quantos meses se passaram desde o início da vigência
          const mesesDesdeInicio = (ano - anoVigencia) * 12 + (mes - mesVigencia);
          
          // Calcular em qual ciclo estamos
          const cicloAtual = Math.floor(mesesDesdeInicio / periodoApuracao);
          
          // Calcular o primeiro mês deste ciclo
          const mesesAteInicioCiclo = cicloAtual * periodoApuracao;
          let mesInicioCiclo = mesVigencia + mesesAteInicioCiclo;
          let anoInicioCiclo = anoVigencia;
          
          // Ajustar ano se necessário
          while (mesInicioCiclo > 12) {
            mesInicioCiclo -= 12;
            anoInicioCiclo += 1;
          }
          
          console.log(`📅 Ciclo ${cicloAtual + 1}: inicia em ${mesInicioCiclo}/${anoInicioCiclo}`);
          
          // Gerar os meses do ciclo
          for (let i = 0; i < periodoApuracao; i++) {
            let mesCalc = mesInicioCiclo + i;
            let anoCalc = anoInicioCiclo;
            
            while (mesCalc > 12) {
              mesCalc -= 12;
              anoCalc += 1;
            }
            
            mesesCiclo.push({ mes: mesCalc, ano: anoCalc });
          }
        } else {
          // Fallback: usar cálculo trimestral padrão
          console.log('⚠️ Empresa sem início de vigência, usando cálculo trimestral padrão');
          const primeiroMes = Math.floor((mes - 1) / 3) * 3 + 1;
          
          for (let i = 0; i < 3; i++) {
            const mesCalc = primeiroMes + i;
            if (mesCalc <= 12) {
              mesesCiclo.push({ mes: mesCalc, ano });
            } else {
              mesesCiclo.push({ mes: mesCalc - 12, ano: ano + 1 });
            }
          }
        }
        
        console.log('📅 Meses do ciclo:', mesesCiclo);
        console.log('📊 Buscando banco de horas para os meses:', mesesCiclo);
        
        // 3. Buscar dados de cada mês do ciclo
        const promessas = mesesCiclo.map(async ({ mes: m, ano: a }) => {
          console.log(`🔍 Buscando dados para ${m}/${a}...`);
          
          const { data: bancoHorasData, error } = await supabase
            .from('banco_horas_calculos')
            .select('*')
            .eq('empresa_id', empresaId)
            .eq('mes', m)
            .eq('ano', a)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') {
            console.error(`❌ Erro ao buscar banco de horas ${m}/${a}:`, error);
          } else if (bancoHorasData) {
            console.log(`✅ Dados encontrados para ${m}/${a}:`, bancoHorasData);
          } else {
            console.log(`⚠️ Nenhum dado encontrado para ${m}/${a}`);
          }
          
          return {
            mes: m,
            ano: a,
            dados: bancoHorasData || null
          };
        });
        
        const resultados = await Promise.all(promessas);
        
        // 4. Para meses futuros, zerar consumo e recalcular saldo
        const mesReferencia = mes;
        const anoReferencia = ano;
        
        // Encontrar o baseline a partir de qualquer mês que tenha dados
        const mesComDados = resultados.find(r => r.dados?.baseline_horas);
        const baselineHoras = mesComDados?.dados?.baseline_horas || null;
        
        // Para cada mês futuro, zerar consumo e recalcular saldo (loop imperativo para encadear repasses)
        const resultadosProcessados: typeof resultados = [];
        
        for (let idx = 0; idx < resultados.length; idx++) {
          const resultado = resultados[idx];
          const eFuturo = (resultado.ano > anoReferencia) || 
                          (resultado.ano === anoReferencia && resultado.mes > mesReferencia);
          
          if (eFuturo) {
            // Pegar repasse do mês anterior já processado
            const dadosMesAnterior = idx > 0 ? resultadosProcessados[idx - 1]?.dados : null;
            const repasseMesAnterior = String(dadosMesAnterior?.repasse_horas || '00:00:00');
            
            // Usar baseline do mês atual se existir, senão usar o baseline encontrado
            const baselineMes = String(resultado.dados?.baseline_horas || baselineHoras || '00:00:00');
            
            // Saldo a utilizar = baseline + repasse mês anterior
            const baselineMinutos = parseHorasParaMinutos(baselineMes);
            const repasseMinutos = parseHorasParaMinutos(repasseMesAnterior);
            const saldoUtilizar = baselineMinutos + repasseMinutos;
            
            // ✅ CORREÇÃO: Verificar se é o último mês do ciclo para zerar repasse
            const isUltimoMesCiclo = idx === (mesesCiclo.length - 1);
            let repasse: number;
            
            if (isUltimoMesCiclo) {
              // No último mês do ciclo, repasse é ZERO (banco zera)
              repasse = 0;
              console.log(`📅 Mês futuro ${resultado.mes}/${resultado.ano}: ÚLTIMO MÊS DO CICLO - repasse zerado`);
            } else {
              // Meses normais: repasse = percentual × saldo
              repasse = Math.floor(saldoUtilizar * percentualRepasse / 100);
            }
            
            console.log(`📅 Mês futuro ${resultado.mes}/${resultado.ano}: preenchendo com consumo zerado`, {
              baseline: baselineMes,
              repasseMesAnterior,
              saldoUtilizar: minutosParaHoras(saldoUtilizar),
              saldo: minutosParaHoras(saldoUtilizar),
              repasse: minutosParaHoras(repasse),
              isUltimoMesCiclo
            });
            
            resultadosProcessados.push({
              ...resultado,
              dados: {
                baseline_horas: baselineMes,
                repasses_mes_anterior_horas: repasseMesAnterior,
                saldo_a_utilizar_horas: minutosParaHoras(saldoUtilizar),
                consumo_horas: '00:00:00',
                requerimentos_horas: '00:00:00',
                reajustes_horas: '00:00:00',
                consumo_total_horas: '00:00:00',
                saldo_horas: minutosParaHoras(saldoUtilizar),
                repasse_horas: minutosParaHoras(repasse),
                excedentes_horas: '00:00:00',
                valor_excedentes_horas: 0,
                taxa_hora_utilizada: null
              } as any
            });
          } else {
            resultadosProcessados.push(resultado);
          }
        }
        
        setBancoHorasTrimestre(resultadosProcessados);
        console.log('📊 Banco de horas do ciclo carregado:', resultadosProcessados);
      } catch (error) {
        console.error('❌ Erro ao buscar banco de horas do ciclo:', error);
      } finally {
        setCarregandoBancoHoras(false);
        // Sinalizar que dados assíncronos terminaram de carregar
        onDataLoaded?.();
      }
    };

    buscarBancoHorasTrimestre();
  }, [empresaId, mes, ano, data.banco_horas_trimestre]);

  // Buscar requerimentos descontados em tempo real quando snapshot está vazio
  useEffect(() => {
    // Se o snapshot já tem dados, não precisa buscar
    if (data.requerimentos_descontados && data.requerimentos_descontados.length > 0) {
      setRequerimentosDescontadosReal(null); // usar snapshot
      return;
    }

    // Sem dados no snapshot: buscar em tempo real
    const buscarRequerimentosReal = async () => {
      if (!empresaId || !mes || !ano) return;

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const mesCobranca = `${String(mes).padStart(2, '0')}/${ano}`;

        const { data: requerimentos } = await supabase
          .from('requerimentos')
          .select('*')
          .eq('cliente_id', empresaId)
          .eq('mes_cobranca', mesCobranca)
          .eq('tipo_cobranca', 'Banco de Horas')
          .in('status', ['enviado_faturamento', 'faturado', 'concluido'])
          .order('data_envio_faturamento', { ascending: false });

        if (requerimentos && requerimentos.length > 0) {
          const formatados: RequerimentoDescontadoData[] = requerimentos.map(req => {
            // Converter horas para formato HH:MM
            let horasFuncional = 0;
            let horasTecnico = 0;

            if (req.horas_funcional) {
              const val = req.horas_funcional as string | number;
              if (typeof val === 'string' && val.includes(':')) {
                const [h, m] = val.split(':').map(Number);
                horasFuncional = h + (m / 60);
              } else {
                horasFuncional = Number(val) || 0;
              }
            }
            if (req.horas_tecnico) {
              const val = req.horas_tecnico as string | number;
              if (typeof val === 'string' && val.includes(':')) {
                const [h, m] = val.split(':').map(Number);
                horasTecnico = h + (m / 60);
              } else {
                horasTecnico = Number(val) || 0;
              }
            }

            const totalDecimal = horasFuncional + horasTecnico;
            const totalH = Math.floor(totalDecimal);
            const totalM = Math.round((totalDecimal - totalH) * 60);
            const totalFormatado = totalDecimal > 0
              ? `${String(totalH).padStart(2, '0')}:${String(totalM).padStart(2, '0')}`
              : '00:00';

            return {
              id: req.id,
              numero_chamado: req.chamado || '--',
              cliente: req.cliente_id || '--',
              modulo: req.modulo || '--',
              tipo_cobranca: req.tipo_cobranca || '--',
              horas_funcional: req.horas_funcional?.toString() || '00:00',
              horas_tecnica: req.horas_tecnico?.toString() || '00:00',
              total_horas: totalFormatado,
              tickets: 0,
              data_envio: req.data_envio_faturamento || null,
              data_aprovacao: req.data_aprovacao || null,
              valor_total: (Number(req.valor_total_funcional) || 0) + (Number(req.valor_total_tecnico) || 0),
              periodo_cobranca: req.mes_cobranca || mesCobranca
            };
          });

          console.log('✅ Requerimentos descontados encontrados em tempo real:', formatados.length);
          setRequerimentosDescontadosReal(formatados);
        } else {
          setRequerimentosDescontadosReal([]);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar requerimentos em tempo real:', error);
        setRequerimentosDescontadosReal([]);
      }
    };

    buscarRequerimentosReal();
  }, [empresaId, mes, ano, data.requerimentos_descontados]);

  // Função para buscar requerimentos de um mês específico
  const buscarRequerimentosMes = async (mes: string, ano: string) => {
    if (!empresaId) return;
    
    setCarregandoRequerimentos(true);
    setMesSelecionado(mes);
    
    try {
      const mesCobranca = `${mes}/${ano}`;
      
      console.log(`🔍 Modal: Clicou em ${mes}/${ano} → Buscando requerimentos de ${mesCobranca}`);
      
      // Buscar requerimentos do mês
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: requerimentos } = await supabase
        .from('requerimentos')
        .select('*')
        .eq('cliente_id', empresaId)
        .eq('mes_cobranca', mesCobranca)
        .eq('tipo_cobranca', 'Banco de Horas')
        .in('status', ['enviado_faturamento', 'faturado', 'concluido'])
        .order('data_envio_faturamento', { ascending: false });
      
      if (requerimentos) {
        const requerimentosFormatados = requerimentos.map(req => ({
          id: req.id,
          numero_chamado: req.chamado || '--',
          cliente: req.cliente_id || '--',
          modulo: req.modulo || '--',
          tipo_cobranca: req.tipo_cobranca || '--',
          horas_funcional: req.horas_funcional?.toString() || '--',
          horas_tecnica: req.horas_tecnico?.toString() || '--',
          total_horas: req.horas_funcional && req.horas_tecnico 
            ? ((Number(req.horas_funcional) || 0) + (Number(req.horas_tecnico) || 0)).toString()
            : '--',
          tickets: 0,
          data_envio: req.data_envio_faturamento || null,
          data_aprovacao: req.data_aprovacao || null,
          valor_total: req.valor_total_funcional && req.valor_total_tecnico
            ? (Number(req.valor_total_funcional) || 0) + (Number(req.valor_total_tecnico) || 0)
            : 0,
          periodo_cobranca: req.mes_cobranca || mesCobranca
        }));
        
        setRequerimentosMes(requerimentosFormatados);
      }
    } catch (error) {
      console.error('Erro ao buscar requerimentos:', error);
      setRequerimentosMes([]);
    } finally {
      setCarregandoRequerimentos(false);
      setModalRequerimentosAberto(true);
    }
  };

  // Função para converter nome do mês abreviado para número
  const mesParaNumero = (mesAbrev: string): string => {
    const meses: Record<string, string> = {
      'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
      'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
      'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
    };
    return meses[mesAbrev] || '01';
  };

  // Calcular total de horas de requerimentos
  const calcularTotalHorasRequerimentos = (): string => {
    if (!data.requerimentos_descontados || data.requerimentos_descontados.length === 0) {
      console.log('📊 Nenhum requerimento descontado encontrado');
      return '00:00';
    }
    
    console.log('📊 Calculando total de horas de requerimentos:', data.requerimentos_descontados);
    
    let totalMinutos = 0;
    data.requerimentos_descontados.forEach(req => {
      console.log(`  - Requerimento ${req.numero_chamado}:`, {
        total_horas: req.total_horas,
        tipo: typeof req.total_horas
      });
      
      if (req.total_horas && req.total_horas !== '--' && req.total_horas !== '00:00') {
        const partes = req.total_horas.split(':');
        if (partes.length >= 2) {
          const horas = parseInt(partes[0]) || 0;
          const minutos = parseInt(partes[1]) || 0;
          const minutosReq = (horas * 60) + minutos;
          console.log(`    ✅ ${horas}h ${minutos}min = ${minutosReq} minutos`);
          totalMinutos += minutosReq;
        } else {
          console.log(`    ⚠️ Formato inválido: ${req.total_horas}`);
        }
      } else {
        console.log(`    ⚠️ Sem horas ou valor zerado`);
      }
    });
    
    console.log(`📊 Total de minutos acumulados: ${totalMinutos}`);
    
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const resultado = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    
    console.log(`📊 Total de horas de requerimentos: ${resultado}`);
    return resultado;
  };

  // Calcular consumo total (Horas Consumo + Horas Requerimentos)
  const calcularConsumoTotal = (): string => {
    const horasConsumo = data.horas_consumo || '00:00';
    const horasRequerimentos = calcularTotalHorasRequerimentos();
    
    // Converter ambos para minutos
    const partesConsumo = horasConsumo.split(':');
    const partesReq = horasRequerimentos.split(':');
    
    const hC = parseInt(partesConsumo[0]) || 0;
    const mC = parseInt(partesConsumo[1]) || 0;
    const hR = parseInt(partesReq[0]) || 0;
    const mR = parseInt(partesReq[1]) || 0;
    
    const totalMinutos = (hC * 60 + mC) + (hR * 60 + mR);
    
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
  };

  const totalHorasRequerimentos = calcularTotalHorasRequerimentos();
  const consumoTotal = calcularConsumoTotal();

  // Lista de requerimentos descontados: usar tempo real quando snapshot está vazio
  const requerimentosDescontados = (data.requerimentos_descontados && data.requerimentos_descontados.length > 0)
    ? data.requerimentos_descontados
    : (requerimentosDescontadosReal || []);

  // Construir dados do gráfico: SEMPRE mostra os 6 meses ANTERIORES ao mês do book (inclusive).
  // Ex: Book de Junho/2026 → JAN, FEV, MAR, ABR, MAI, JUN
  // Fonte principal: banco_horas_calculos (valores do fechamento oficial).
  // Fallback: snapshot historico_consumo quando banco_horas_calculos não tem o mês.
  const MESES_NOMES_GRAFICO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  // Estado para armazenar dados de consumo dos 6 meses (buscados de banco_horas_calculos)
  const [dadosGrafico6Meses, setDadosGrafico6Meses] = useState<any[] | null>(null);

  // Buscar dados de banco_horas_calculos para os 6 meses do gráfico
  useEffect(() => {
    const buscarDados6Meses = async () => {
      if (!empresaId || !mes || !ano) return;

      try {
        const { supabase } = await import('@/integrations/supabase/client');

        // Calcular os 6 meses esperados
        const meses6: { mesNum: number; anoNum: number; nome: string }[] = [];
        for (let i = 5; i >= 0; i--) {
          let m = mes - i;
          let a = ano;
          while (m <= 0) { m += 12; a -= 1; }
          meses6.push({ mesNum: m, anoNum: a, nome: MESES_NOMES_GRAFICO[m - 1] });
        }

        // Buscar todos os registros de banco_horas_calculos para essa empresa nos 6 meses
        const promessas = meses6.map(async ({ mesNum, anoNum }) => {
          const { data: bancoData } = await supabase
            .from('banco_horas_calculos')
            .select('mes, ano, consumo_horas, requerimentos_horas, consumo_tickets, requerimentos_tickets')
            .eq('empresa_id', empresaId)
            .eq('mes', mesNum)
            .eq('ano', anoNum)
            .maybeSingle();
          return { mesNum, anoNum, dados: bancoData };
        });

        const resultados = await Promise.all(promessas);

        // Construir dados do gráfico
        const dadosGrafico = meses6.map(({ mesNum, anoNum, nome }, index) => {
          const resultado = resultados.find(r => r.mesNum === mesNum && r.anoNum === anoNum);

          if (resultado?.dados) {
            if (isTicket) {
              return {
                mes: nome,
                horas: String(resultado.dados.consumo_tickets || 0),
                valor_numerico: resultado.dados.consumo_tickets || 0,
                requerimentos_horas: String(resultado.dados.requerimentos_tickets || 0),
                requerimentos_valor_numerico: resultado.dados.requerimentos_tickets || 0
              };
            }
            // Tipo horas
            const consumoHoras = String(resultado.dados.consumo_horas || '00:00:00');
            const partesConsumo = consumoHoras.split(':');
            const hConsumo = parseInt(partesConsumo[0]) || 0;
            const mConsumo = parseInt(partesConsumo[1]) || 0;
            const valorNumericoConsumo = hConsumo + (mConsumo / 60);

            const reqHoras = String(resultado.dados.requerimentos_horas || '00:00:00');
            const partesReq = reqHoras.split(':');
            const hReq = parseInt(partesReq[0]) || 0;
            const mReq = parseInt(partesReq[1]) || 0;
            const valorNumericoReq = hReq + (mReq / 60);

            return {
              mes: nome,
              horas: formatarHorasSemSegundos(consumoHoras),
              valor_numerico: Math.round(valorNumericoConsumo * 100) / 100,
              requerimentos_horas: formatarHorasSemSegundos(reqHoras),
              requerimentos_valor_numerico: Math.round(valorNumericoReq * 100) / 100
            };
          }

          // Fallback: usar snapshot por posição
          const historicoSnapshot = data.historico_consumo || [];
          const snapshotItem = historicoSnapshot.find(item => item.mes === nome)
            || historicoSnapshot[index];
          if (snapshotItem) {
            return { ...snapshotItem, mes: nome };
          }

          return {
            mes: nome,
            horas: '00:00',
            valor_numerico: 0,
            requerimentos_horas: '00:00',
            requerimentos_valor_numerico: 0
          };
        });

        setDadosGrafico6Meses(dadosGrafico);
      } catch (error) {
        console.error('❌ Erro ao buscar dados de 6 meses para gráfico:', error);
      }
    };

    buscarDados6Meses();
  }, [empresaId, mes, ano, isTicket]);

  // Dados do gráfico: usar dados buscados dos 6 meses, ou fallback para snapshot
  const dadosGrafico = dadosGrafico6Meses || data.historico_consumo || [];

  // Encontrar os dados do banco de horas do mês ATUAL do book
  const mesBancoAtual = bancoHorasTrimestre.length > 0
    ? bancoHorasTrimestre.find(item => item.mes === mes && item.ano === ano)?.dados
    : null;
  // Fallback para o último mês não-futuro disponível
  const ultimoMesBanco = mesBancoAtual || (bancoHorasTrimestre.length > 0 
    ? bancoHorasTrimestre.filter(item => {
        if (!mes || !ano) return true;
        return (item.ano < ano) || (item.ano === ano && item.mes <= mes);
      }).pop()?.dados
    : null);
  
  const ticketsConsumoReal = isTicket && ultimoMesBanco 
    ? (ultimoMesBanco.consumo_tickets || 0) 
    : null;
  const ticketsRequerimentosReal = isTicket && ultimoMesBanco 
    ? (ultimoMesBanco.requerimentos_tickets || 0) 
    : null;
  const ticketsConsumoTotalReal = isTicket && ultimoMesBanco 
    ? (ultimoMesBanco.consumo_total_tickets || 0) 
    : null;
  const ticketsBaselineReal = isTicket && ultimoMesBanco 
    ? (ultimoMesBanco.baseline_tickets || 0) 
    : null;

  // Para tipo horas: usar dados do banco_horas_calculos do mês atual para os cards
  // Garante consistência entre cards, gráfico e tabela Banco de Horas
  const horasConsumoReal = !isTicket && ultimoMesBanco && ultimoMesBanco.consumo_horas
    ? formatarHorasSemSegundos(ultimoMesBanco.consumo_horas)
    : null;
  const horasRequerimentosReal = !isTicket && ultimoMesBanco && ultimoMesBanco.requerimentos_horas
    ? formatarHorasSemSegundos(ultimoMesBanco.requerimentos_horas)
    : null;
  const horasConsumoTotalReal = !isTicket && ultimoMesBanco && ultimoMesBanco.consumo_total_horas
    ? formatarHorasSemSegundos(ultimoMesBanco.consumo_total_horas)
    : null;

  // Calcular variação percentual em relação ao mês anterior
  const calcularVariacaoMesAnterior = (): { percentual: number; tipo: 'aumento' | 'queda' | 'igual' } => {
    const historico = dadosGrafico;
    if (!historico || historico.length < 2) {
      return { percentual: 0, tipo: 'igual' };
    }

    // Encontrar o índice do mês atual do book no histórico
    const mesNomeAtual = MESES_NOMES_GRAFICO[(mes || 1) - 1];
    let indexMesAtual = historico.findIndex(item => item.mes === mesNomeAtual);
    
    // Se não encontrar pelo nome do mês, usar o último com dados (valor_numerico > 0 ou horas != '00:00')
    if (indexMesAtual === -1) {
      // Fallback: último elemento
      indexMesAtual = historico.length - 1;
    }

    // Verificar se há mês anterior no histórico
    if (indexMesAtual < 1) {
      return { percentual: 0, tipo: 'igual' };
    }

    const mesAtual = historico[indexMesAtual];
    const mesAnterior = historico[indexMesAtual - 1];

    let valorAtual: number;
    let valorAnterior: number;

    if (isTicket) {
      // Para tickets: usar valor_numerico diretamente
      valorAtual = mesAtual?.valor_numerico || 0;
      valorAnterior = mesAnterior?.valor_numerico || 0;
    } else {
      // Para horas: converter HH:MM para minutos
      valorAtual = parseHorasParaMinutos(mesAtual?.horas || '00:00');
      valorAnterior = parseHorasParaMinutos(mesAnterior?.horas || '00:00');
    }

    if (valorAnterior === 0) {
      if (valorAtual === 0) return { percentual: 0, tipo: 'igual' };
      return { percentual: 100, tipo: 'aumento' };
    }

    const variacao = ((valorAtual - valorAnterior) / valorAnterior) * 100;
    const percentualArredondado = Math.abs(Math.round(variacao));

    if (variacao > 0) return { percentual: percentualArredondado, tipo: 'aumento' };
    if (variacao < 0) return { percentual: percentualArredondado, tipo: 'queda' };
    return { percentual: 0, tipo: 'igual' };
  };

  const variacaoConsumo = calcularVariacaoMesAnterior();

  return (
    <div className="w-full h-full bg-white p-8 flex flex-col relative">
      <div className="space-y-6 flex-1">{/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('books.bookContent.consumptionTitle')} {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
        </h2>
        <p className="text-sm text-gray-500">{t('books.bookContent.consumptionSubtitle')}</p>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* 1. CONSUMO TOTAL - Primeiro */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              {t('books.bookContent.totalConsumption')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{isTicket ? (ticketsConsumoTotalReal !== null ? ticketsConsumoTotalReal : data.total_geral) : (horasConsumoTotalReal || consumoTotal)}</div>
            <div className="text-xs text-gray-600 mt-2">
              {isTicket ? 'Chamados + Requerimentos' : t('books.bookContent.consumptionPlusRequirements')}
            </div>
          </CardContent>
        </Card>

        {/* 2. HORAS CONSUMO / TICKETS CONSUMO */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              {isTicket ? 'Tickets Consumo' : t('books.bookContent.hoursConsumption')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{isTicket ? (ticketsConsumoReal !== null ? ticketsConsumoReal : data.total_geral) : (horasConsumoReal || formatarHorasSemSegundos(data.horas_consumo) || '00:00')}</div>
            <div className={`text-xs mt-2 ${variacaoConsumo.tipo === 'aumento' ? 'text-green-600' : variacaoConsumo.tipo === 'queda' ? 'text-red-600' : 'text-gray-600'}`}>
              {variacaoConsumo.tipo === 'aumento' && t('books.bookContent.increaseVsPrevious', { percent: variacaoConsumo.percentual })}
              {variacaoConsumo.tipo === 'queda' && t('books.bookContent.decreaseVsPrevious', { percent: variacaoConsumo.percentual })}
              {variacaoConsumo.tipo === 'igual' && t('books.bookContent.noVariation')}
            </div>
          </CardContent>
        </Card>

        {/* 3. HORAS REQUERIMENTOS / TICKETS REQUERIMENTOS */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              {isTicket ? 'Tickets Requerimentos' : t('books.bookContent.hoursRequirements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{isTicket ? (ticketsRequerimentosReal !== null ? ticketsRequerimentosReal : (requerimentosDescontados?.length || 0)) : (horasRequerimentosReal || totalHorasRequerimentos)}</div>
            <div className="text-xs text-gray-600 mt-2">
              {t('books.bookContent.requirementsCount', { count: requerimentosDescontados?.length || 0 })}
            </div>
          </CardContent>
        </Card>

        {/* 4. BASELINE DE APL */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
              {isTicket ? 'Baseline Tickets' : t('books.bookContent.baselineAPL')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">
              {isTicket 
                ? (ticketsBaselineReal !== null ? ticketsBaselineReal : (bancoHorasTrimestre.length > 0 ? (bancoHorasTrimestre[0]?.dados?.baseline_tickets || 0) : 0))
                : (formatarHorasSemSegundos(data.baseline_apl) || '00:00')
              }
            </div>
            <div className="text-xs text-gray-600 mt-2">
              {t('books.bookContent.percentConsumed', { percent: data.percentual_consumido || 0 })}
            </div>
          </CardContent>
        </Card>

        {/* 5. INCIDENTE */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                {data.incidente === '--' || !data.incidente || data.incidente === '00:00:00' || data.incidente === '00:00' ? (
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                )}
              </div>
              {t('books.bookContent.incident')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.incidente === '--' || !data.incidente || data.incidente === '00:00:00' || data.incidente === '00:00' ? (
              <>
                <div className="text-3xl font-bold text-black">{isTicket ? '0' : '00:00'}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {t('books.bookContent.percentOfTotal', { percent: 0 })}
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-black">{isTicket ? Math.round(parseHorasParaMinutos(data.incidente) / 60) : formatarHorasSemSegundos(data.incidente)}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {t('books.bookContent.percentOfTotal', { percent: data.percentual_incidente || 0 })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 6. SOLICITAÇÃO */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              {t('books.bookContent.request')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{isTicket ? (ticketsConsumoReal !== null ? ticketsConsumoReal : Math.round(parseHorasParaMinutos(data.solicitacao) / 60)) : (formatarHorasSemSegundos(data.solicitacao) || '00:00')}</div>
            <div className="text-xs text-gray-600 mt-2">
              {t('books.bookContent.percentOfTotal', { percent: data.percentual_solicitacao || 0 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico: Histórico de Consumo Mensal */}
        <Card className="lg:col-span-2 border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{isTicket ? 'Tickets Mês' : t('books.bookContent.hoursMonth')}</CardTitle>
            <p className="text-xs text-gray-500">{isTicket ? `Histórico de consumo mensal em ${ano || new Date().getFullYear()}` : t('books.bookContent.monthlyConsumptionHistory', { year: ano || new Date().getFullYear() })}</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={dadosGrafico.map(d => ({ ...d, mes: translateMonthAbbrev(d.mes) }))}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                  label={{ value: isTicket ? 'Tickets' : t('books.bookContent.hoursLabel'), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === t('books.bookContent.consumptionLine')) {
                      if (isTicket) {
                        return [props.payload.valor_numerico || 0, 'Tickets'];
                      }
                      return [props.payload.horas, t('books.bookContent.ticketsTooltip')];
                    } else if (name === t('books.bookContent.requirementsLine')) {
                      if (isTicket) {
                        return [props.payload.requerimentos_valor_numerico || 0, 'Requerimentos'];
                      }
                      return [props.payload.requerimentos_horas || '00:00', t('books.bookContent.requirementsTooltip')];
                    }
                    return [value, name];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor_numerico" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', r: 5 }}
                  activeDot={{ r: 7 }}
                  name={t('books.bookContent.consumptionLine')}
                  label={{
                    position: 'top',
                    content: (props: any) => {
                      const { x, y, value, index } = props;
                      const horasFormatadas = dadosGrafico[index]?.horas || '';
                      
                      let displayValue: string;
                      if (isTicket) {
                        // Para tickets, mostrar valor numérico inteiro
                        displayValue = String(dadosGrafico[index]?.valor_numerico || 0);
                      } else {
                        // Remover segundos se existir
                        displayValue = horasFormatadas.split(':').length === 3 
                          ? `${horasFormatadas.split(':')[0]}:${horasFormatadas.split(':')[1]}`
                          : horasFormatadas;
                      }
                      
                      // Ajustar posição para primeiro e último ponto
                      const totalPontos = dadosGrafico.length;
                      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                      let xOffset = 0;
                      let yOffset = -10;
                      
                      if (index === 0) {
                        textAnchor = 'start';
                        xOffset = 8;
                        yOffset = -5;
                      } else if (index === totalPontos - 1) {
                        textAnchor = 'end';
                        xOffset = -8;
                        yOffset = -20;
                      }
                      
                      return (
                        <text
                          x={x + xOffset}
                          y={y + yOffset}
                          fill="#2563eb"
                          fontSize={11}
                          fontWeight="600"
                          textAnchor={textAnchor}
                        >
                          {displayValue}
                        </text>
                      );
                    }
                  }}
                />
                
                {/* Linha de Requerimentos (Laranja) - Clicável */}
                <Line 
                  type="monotone" 
                  dataKey="requerimentos_valor_numerico" 
                  stroke="#ea580c" 
                  strokeWidth={3}
                  dot={{ fill: '#ea580c', r: 5, cursor: 'pointer' }}
                  activeDot={{ 
                    r: 7, 
                    cursor: 'pointer',
                    onClick: (e: any, payload: any) => {
                      const mesAbrev = payload.payload.mes;
                      const ano = '2025'; // TODO: Pegar ano dinâmico
                      const mesNum = mesParaNumero(mesAbrev);
                      buscarRequerimentosMes(mesNum, ano);
                    }
                  }}
                  name={t('books.bookContent.requirementsLine')}
                  label={{
                    position: 'bottom',
                    content: (props: any) => {
                      const { x, y, index } = props;
                      const horasFormatadas = dadosGrafico[index]?.requerimentos_horas || '00:00';
                      
                      let displayValue: string;
                      if (isTicket) {
                        // Para tickets, mostrar valor numérico inteiro
                        const val = dadosGrafico[index]?.requerimentos_valor_numerico || 0;
                        if (val === 0) return null;
                        displayValue = String(val);
                      } else {
                        // Remover segundos se existir
                        const horasSemSegundos = horasFormatadas.split(':').length === 3 
                          ? `${horasFormatadas.split(':')[0]}:${horasFormatadas.split(':')[1]}`
                          : horasFormatadas;
                        // Não exibir se for 00:00
                        if (horasSemSegundos === '00:00') return null;
                        displayValue = horasSemSegundos;
                      }
                      
                      // Ajustar posição para primeiro e último ponto (igual à linha azul)
                      const totalPontos = dadosGrafico.length;
                      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                      let xOffset = 0;
                      let yOffset = 15;
                      
                      if (index === 0) {
                        textAnchor = 'start';
                        xOffset = 8;
                        yOffset = 15;
                      } else if (index === totalPontos - 1) {
                        textAnchor = 'end';
                        xOffset = -8;
                        yOffset = 30;
                      }
                      
                      return (
                        <text
                          x={x + xOffset}
                          y={y + yOffset}
                          fill="#ea580c"
                          fontSize={11}
                          fontWeight="600"
                          textAnchor={textAnchor}
                        >
                          {displayValue}
                        </text>
                      );
                    }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
            
            {/* Legenda abaixo do gráfico */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                <span className="text-sm font-medium text-gray-700">{t('books.bookContent.ticketsLegend')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span className="text-sm font-medium text-gray-700">{t('books.bookContent.requirementsLegend')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Requerimentos Descontados */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('books.bookContent.discountedRequirements')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {requerimentosDescontados && requerimentosDescontados.length > 0 ? (
              <>
                <div className="space-y-2">
                  {requerimentosDescontados.slice(0, 6).map((req) => (
                    <div 
                      key={req.id} 
                      className="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1">
                          <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                          <span className="font-semibold text-xs text-blue-600">
                            {req.numero_chamado}
                          </span>
                          {req.modulo && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-[11px] text-gray-600 truncate">
                                {req.modulo}
                              </span>
                            </>
                          )}
                        </div>
                        {req.total_horas && req.total_horas !== '--' && (
                          <span className="font-semibold text-xs text-blue-600 ml-2 flex-shrink-0">
                            {req.total_horas}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {requerimentosDescontados.length > 6 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                    <p className="text-xs text-blue-700">
                      {t('books.bookContent.additionalRequirements', { count: requerimentosDescontados.length - 6 })}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-xs">{t('books.bookContent.noDiscountedRequirements')}</p>
              </div>
            )}
            
            {requerimentosDescontados && requerimentosDescontados.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600">{t('books.bookContent.totalRequirements')}</span>
                  <span className="text-lg font-bold text-blue-600">
                    {requerimentosDescontados.length}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Banco de Horas - Cores atualizadas conforme tela de banco de horas */}
      {bancoHorasTrimestre.length > 0 && (
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('books.bookContent.bankHoursTitle')}
            </CardTitle>
            <p className="text-xs text-gray-500">{t('books.bookContent.quarterlyControl')}</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderRadius: '15.5px', overflow: 'hidden' }}>
                <thead>
                  {/* Primeira linha - Azul com meses */}
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      {t('books.bookContent.periodTrimester')}
                    </th>
                    {bancoHorasTrimestre.map((item, index) => (
                      <th key={index} className="px-4 py-3 text-center font-semibold">
                        {new Date(item.ano, item.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Banco Contratado / Tickets Contratados */}
                  <tr className="text-white" style={{ backgroundColor: '#666666' }}>
                    <td className="px-4 py-2 font-semibold">{isTicket ? 'Tickets Contratados' : t('books.bookContent.contractedBank')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center font-semibold">
                        {formatarValorBanco(item.dados?.baseline_horas, item.dados?.baseline_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Repasse mês anterior */}
                  <tr className="bg-gray-200">
                    <td className="px-4 py-2">{t('books.bookContent.previousMonthCarryover')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className={`px-4 py-2 text-center font-semibold ${getColorClassValor(item.dados?.repasses_mes_anterior_horas, item.dados?.repasses_mes_anterior_tickets)}`}>
                        {formatarValorBanco(item.dados?.repasses_mes_anterior_horas, item.dados?.repasses_mes_anterior_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo a utilizar */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.balanceToUse')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className={`px-4 py-2 text-center font-bold ${getColorClassValor(item.dados?.saldo_a_utilizar_horas, item.dados?.saldo_a_utilizar_tickets)}`}>
                        {formatarValorBanco(item.dados?.saldo_a_utilizar_horas, item.dados?.saldo_a_utilizar_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Consumo Chamados */}
                  <tr className="bg-white">
                    <td className="px-4 py-2">{t('books.bookContent.ticketConsumption')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center">
                        {formatarValorBanco(item.dados?.consumo_horas, item.dados?.consumo_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Requerimentos */}
                  <tr className="bg-white">
                    <td className="px-4 py-2">{t('books.bookContent.requirementsLabel')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center">
                        {formatarValorBanco(item.dados?.requerimentos_horas, item.dados?.requerimentos_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Reajuste */}
                  <tr className="bg-white">
                    <td className="px-4 py-2">{t('books.bookContent.adjustment')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className={`px-4 py-2 text-center font-semibold ${getColorClassValor(item.dados?.reajustes_horas, item.dados?.reajustes_tickets)}`}>
                        {formatarValorBanco(item.dados?.reajustes_horas, item.dados?.reajustes_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Consumo Total */}
                  <tr className="bg-white">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.totalConsumptionLabel')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center font-bold">
                        {formatarValorBanco(item.dados?.consumo_total_horas, item.dados?.consumo_total_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo */}
                  <tr className="bg-gray-200">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.balance')}</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className={`px-4 py-2 text-center font-bold ${getColorClassValor(item.dados?.saldo_horas, item.dados?.saldo_tickets)}`}>
                        {formatarValorBanco(item.dados?.saldo_horas, item.dados?.saldo_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Repasse */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2">{t('books.bookContent.carryover')} - {percentualRepasseEmpresa}%</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className={`px-4 py-2 text-center font-semibold ${getColorClassValor(item.dados?.repasse_horas, item.dados?.repasse_tickets)}`}>
                        {formatarValorBanco(item.dados?.repasse_horas, item.dados?.repasse_tickets)}
                      </td>
                    ))}
                  </tr>

                  {/* Taxa/hora Excedente e Valor Total - LINHA ÚNICA */}
                  <tr className="text-white" style={{ backgroundColor: '#666666' }}>
                    <td className="px-4 py-2 font-semibold">{isTicket ? 'Taxa/ticket Excedente' : t('books.bookContent.surplusRate')}</td>
                    {bancoHorasTrimestre.map((item, index) => {
                      const isPenultima = index === bancoHorasTrimestre.length - 2;
                      const isUltima = index === bancoHorasTrimestre.length - 1;
                      
                      if (isPenultima) {
                        // Penúltima coluna: exibir "Valor Total"
                        return (
                          <td key={index} className="px-4 py-2 text-center font-semibold">
                            {t('books.bookContent.totalValue')}
                          </td>
                        );
                      } else if (isUltima) {
                        // Última coluna: exibir valor total dos excedentes
                        const valorExcedentes = isTicket 
                          ? item.dados?.valor_excedentes_tickets 
                          : item.dados?.valor_excedentes_horas;
                        return (
                          <td key={index} className="px-4 py-2 text-center font-semibold">
                            {valorExcedentes 
                              ? `R$ ${valorExcedentes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : 'R$ 0,00'
                            }
                          </td>
                        );
                      } else {
                        // ✅ Exibir taxa usando MESMA LÓGICA do banco de horas
                        const taxaEspecifica = taxasEspecificas?.ticket_excedente_simples;
                        const taxa = (taxaEspecifica && taxaEspecifica > 0) 
                          ? taxaEspecifica 
                          : (taxaPadraoEmpresa || 0);
                        
                        console.log(`📊 [Tabela] Taxa mês ${item.mes}/${item.ano}:`, {
                          taxasEspecificas,
                          ticket_excedente_simples: taxaEspecifica,
                          taxa_padrao_calculada: taxaPadraoEmpresa,
                          taxa_final: taxa,
                          vai_exibir: taxa > 0,
                          origem: taxaEspecifica && taxaEspecifica > 0 ? 'taxa_especifica' : 'taxa_padrao_banco_horas'
                        });
                        
                        return (
                          <td key={index} className="px-4 py-2 text-center font-semibold">
                            {taxa > 0 
                              ? `R$ ${taxa.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : ''
                            }
                          </td>
                        );
                      }
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state para banco de horas */}
      {carregandoBancoHoras && (
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">{t('books.bookContent.loadingBankHours')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes dos Requerimentos do Mês */}
      <Dialog open={modalRequerimentosAberto} onOpenChange={setModalRequerimentosAberto}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('books.bookContent.requirementsOfMonth', { month: mesSelecionado })}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              {t('books.bookContent.requirementsDetails')}
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {carregandoRequerimentos ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonda-blue mx-auto mb-4"></div>
                  <p className="text-gray-500">{t('books.bookContent.loadingRequirements')}</p>
                </div>
              </div>
            ) : requerimentosMes.length > 0 ? (
              <>
                {requerimentosMes.map((req) => (
                  <div 
                    key={req.id} 
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-sm text-blue-600">
                          {req.numero_chamado}
                        </span>
                      </div>
                      {req.tipo_cobranca && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          {req.tipo_cobranca}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-xs text-gray-600">
                      {req.modulo && (
                        <div className="flex justify-between">
                          <span>{t('books.bookContent.moduleLabel')}</span>
                          <span className="font-medium text-gray-900">{req.modulo}</span>
                        </div>
                      )}
                      
                      {req.horas_funcional && req.horas_funcional !== '--' && (
                        <div className="flex justify-between">
                          <span>{t('books.bookContent.functionalH')}</span>
                          <span className="font-medium text-gray-900">{req.horas_funcional}</span>
                        </div>
                      )}
                      {req.horas_tecnica && req.horas_tecnica !== '--' && (
                        <div className="flex justify-between">
                          <span>{t('books.bookContent.technicalH')}</span>
                          <span className="font-medium text-gray-900">{req.horas_tecnica}</span>
                        </div>
                      )}
                      {req.total_horas && req.total_horas !== '--' && (
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="font-semibold">{t('books.bookContent.totalLabel')}</span>
                          <span className="font-semibold text-green-600">{req.total_horas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">{t('books.bookContent.totalRequirements')}</span>
                    <span className="text-2xl font-bold text-green-600">
                      {requerimentosMes.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-green-600">{t('books.bookContent.totalHours')}</span>
                    <span className="text-2xl font-bold text-green-600">
                      {requerimentosMes.reduce((sum, req) => {
                        const total = Number(req.total_horas) || 0;
                        return sum + total;
                      }, 0).toFixed(2)}h
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">{t('books.bookContent.noRequirementsMonth')}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
      <BookFooterBar />
    </div>
  );
}
