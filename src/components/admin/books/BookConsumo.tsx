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

interface BookConsumoProps {
  data: BookConsumoData;
  empresaNome?: string; // Nome abreviado do cliente
  empresaId?: string; // ID da empresa para buscar requerimentos
  mes?: number; // Mês do book
  ano?: number; // Ano do book
}

/**
 * Formata horas removendo os segundos (HH:MM:SS -> HH:MM)
 */
function formatarHorasSemSegundos(horasCompletas: string): string {
  if (!horasCompletas || horasCompletas === '--') return horasCompletas;
  
  // Se já está no formato HH:MM, retorna direto
  if (horasCompletas.split(':').length === 2) return horasCompletas;
  
  // Remove os segundos (pega apenas HH:MM)
  const partes = horasCompletas.split(':');
  return `${partes[0]}:${partes[1]}`;
}

export default function BookConsumo({ data, empresaNome, empresaId, mes, ano }: BookConsumoProps) {
  const [modalRequerimentosAberto, setModalRequerimentosAberto] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState<string>('');
  const [requerimentosMes, setRequerimentosMes] = useState<RequerimentoDescontadoData[]>([]);
  const [carregandoRequerimentos, setCarregandoRequerimentos] = useState(false);
  const [bancoHorasTrimestre, setBancoHorasTrimestre] = useState<any[]>([]);
  const [carregandoBancoHoras, setCarregandoBancoHoras] = useState(false);
  const [taxaPadraoEmpresa, setTaxaPadraoEmpresa] = useState<number>(0);

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
  useEffect(() => {
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
          taxaHoraAdicional = valorFuncional.valor_base * 1.15;
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
                : v.valor_base * 1.15;
              
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
  }, [empresaId, mes, ano]);

  // Buscar dados de banco de horas do trimestre ao montar o componente
  useEffect(() => {
    const buscarBancoHorasTrimestre = async () => {
      if (!empresaId || !mes || !ano) {
        console.log('⚠️ Faltam parâmetros:', { empresaId, mes, ano });
        return;
      }
      
      setCarregandoBancoHoras(true);
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        
        // 1. Buscar dados da empresa para pegar periodo_apuracao e inicio_vigencia
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas_clientes')
          .select('periodo_apuracao, inicio_vigencia')
          .eq('id', empresaId)
          .single();
        
        if (empresaError) {
          console.error('❌ Erro ao buscar dados da empresa:', empresaError);
          return;
        }
        
        console.log('📊 Dados da empresa:', empresa);
        
        const periodoApuracao = empresa?.periodo_apuracao || 3; // Default: trimestral
        const inicioVigencia = empresa?.inicio_vigencia;
        
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
        setBancoHorasTrimestre(resultados);
        console.log('📊 Banco de horas do ciclo carregado:', resultados);
      } catch (error) {
        console.error('❌ Erro ao buscar banco de horas do ciclo:', error);
      } finally {
        setCarregandoBancoHoras(false);
      }
    };

    buscarBancoHorasTrimestre();
  }, [empresaId, mes, ano]);

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

  return (
    <div className="w-full h-full bg-white p-8">
      <div className="space-y-6">{/* Título da Seção */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Consumo {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
        </h2>
        <p className="text-sm text-gray-500">Visão detalhada de utilização de horas e baseline</p>
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
              CONSUMO TOTAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{consumoTotal}</div>
            <div className="text-xs text-gray-600 mt-2">
              Consumo + Requerimentos
            </div>
          </CardContent>
        </Card>

        {/* 2. HORAS CONSUMO */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              HORAS CONSUMO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{formatarHorasSemSegundos(data.horas_consumo) || '00:00'}</div>
            <div className="text-xs text-green-600 mt-2">
              ↑ 12% em relação ao mês anterior
            </div>
          </CardContent>
        </Card>

        {/* 3. HORAS REQUERIMENTOS - Logo após Horas Consumo */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-gray-600 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              HORAS REQUERIMENTOS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{totalHorasRequerimentos}</div>
            <div className="text-xs text-gray-600 mt-2">
              {data.requerimentos_descontados?.length || 0} requerimento(s)
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
              BASELINE DE APL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{formatarHorasSemSegundos(data.baseline_apl) || '00:00'}</div>
            <div className="text-xs text-gray-600 mt-2">
              {data.percentual_consumido || 0}% consumido
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
              INCIDENTE
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.incidente === '--' || !data.incidente || data.incidente === '00:00:00' || data.incidente === '00:00' ? (
              <>
                <div className="text-3xl font-bold text-black">00:00</div>
                <div className="text-xs text-gray-600 mt-2">
                  0% do total consumido
                </div>
              </>
            ) : (
              <>
                <div className="text-3xl font-bold text-black">{formatarHorasSemSegundos(data.incidente)}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {data.percentual_incidente || 0}% do total consumido
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
              SOLICITAÇÃO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-black">{formatarHorasSemSegundos(data.solicitacao) || '00:00'}</div>
            <div className="text-xs text-gray-600 mt-2">
              {data.percentual_solicitacao || 0}% do total consumido
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico: Histórico de Consumo Mensal */}
        <Card className="lg:col-span-2 border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Horas Mês</CardTitle>
            <p className="text-xs text-gray-500">Histórico de consumo mensal em 2025</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart 
                data={data.historico_consumo}
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
                  label={{ value: 'Horas', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    if (name === 'Consumo') {
                      return [props.payload.horas, 'CHAMADOS'];
                    } else if (name === 'Requerimentos') {
                      return [props.payload.requerimentos_horas || '00:00', 'REQUERIMENTOS'];
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
                  name="Consumo"
                  label={{
                    position: 'top',
                    content: (props: any) => {
                      const { x, y, value, index } = props;
                      const horasFormatadas = data.historico_consumo[index]?.horas || '';
                      // Remover segundos se existir
                      const horasSemSegundos = horasFormatadas.split(':').length === 3 
                        ? `${horasFormatadas.split(':')[0]}:${horasFormatadas.split(':')[1]}`
                        : horasFormatadas;
                      
                      // Ajustar posição para primeiro e último ponto
                      const totalPontos = data.historico_consumo.length;
                      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                      let xOffset = 0;
                      let yOffset = -10;
                      
                      if (index === 0) {
                        // Primeiro ponto: alinhar à direita do ponto
                        textAnchor = 'start';
                        xOffset = 8;
                        yOffset = -5;
                      } else if (index === totalPontos - 1) {
                        // Último ponto: alinhar à esquerda do ponto e mais acima
                        textAnchor = 'end';
                        xOffset = -8;
                        yOffset = -20; // Mais espaço acima para evitar sobreposição
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
                          {horasSemSegundos}
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
                  name="Requerimentos"
                  label={{
                    position: 'bottom',
                    content: (props: any) => {
                      const { x, y, index } = props;
                      const horasFormatadas = data.historico_consumo[index]?.requerimentos_horas || '00:00';
                      // Remover segundos se existir
                      const horasSemSegundos = horasFormatadas.split(':').length === 3 
                        ? `${horasFormatadas.split(':')[0]}:${horasFormatadas.split(':')[1]}`
                        : horasFormatadas;
                      
                      // Não exibir se for 00:00
                      if (horasSemSegundos === '00:00') return null;
                      
                      // Ajustar posição para primeiro e último ponto (igual à linha azul)
                      const totalPontos = data.historico_consumo.length;
                      let textAnchor: 'start' | 'middle' | 'end' = 'middle';
                      let xOffset = 0;
                      let yOffset = 15;
                      
                      if (index === 0) {
                        // Primeiro ponto: alinhar à direita do ponto
                        textAnchor = 'start';
                        xOffset = 8;
                        yOffset = 15;
                      } else if (index === totalPontos - 1) {
                        // Último ponto: alinhar à esquerda do ponto e mais abaixo
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
                          {horasSemSegundos}
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
                <span className="text-sm font-medium text-gray-700">Chamados</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                <span className="text-sm font-medium text-gray-700">Requerimentos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card: Requerimentos Descontados */}
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requerimentos Descontados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.requerimentos_descontados && data.requerimentos_descontados.length > 0 ? (
              <>
                <div className="space-y-2">
                  {data.requerimentos_descontados.slice(0, 6).map((req) => (
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
                
                {data.requerimentos_descontados.length > 6 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                    <p className="text-xs text-blue-700">
                      + {data.requerimentos_descontados.length - 6} requerimento(s) adicional(is)
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-xs">Nenhum requerimento descontado neste período</p>
              </div>
            )}
            
            {data.requerimentos_descontados && data.requerimentos_descontados.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600">TOTAL DE REQUERIMENTOS</span>
                  <span className="text-lg font-bold text-blue-600">
                    {data.requerimentos_descontados.length}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Banco de Horas - Cores atualizadas conforme tela de banco de horas */}
      {/*
      {bancoHorasTrimestre.length > 0 && (
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Banco de Horas
            </CardTitle>
            <p className="text-xs text-gray-500">Controle trimestral de horas contratadas</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ borderRadius: '15.5px', overflow: 'hidden' }}>
                <thead>
                  {/* Primeira linha - Azul com meses *
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      Período - 1º Trimestre
                    </th>
                    {bancoHorasTrimestre.map((item, index) => (
                      <th key={index} className="px-4 py-3 text-center font-semibold">
                        {new Date(item.ano, item.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Banco Contratado *
                  <tr className="text-white" style={{ backgroundColor: '#666666' }}>
                    <td className="px-4 py-2 font-semibold">Banco Contratado</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center font-semibold">
                        {item.dados?.baseline_horas ? item.dados.baseline_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Repasse mês anterior *
                  <tr className="bg-gray-200">
                    <td className="px-4 py-2">Repasse mês anterior</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center text-green-600 font-semibold">
                        {item.dados?.repasses_mes_anterior_horas ? item.dados.repasses_mes_anterior_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo a utilizar *
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 font-semibold">Saldo a utilizar</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center text-green-600 font-bold">
                        {item.dados?.saldo_a_utilizar_horas ? item.dados.saldo_a_utilizar_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Consumo Chamados *
                  <tr className="bg-white">
                    <td className="px-4 py-2">Consumo Chamados</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center">
                        {item.dados?.consumo_horas ? item.dados.consumo_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Requerimentos *
                  <tr className="bg-white">
                    <td className="px-4 py-2">Requerimentos</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center">
                        {item.dados?.requerimentos_horas ? item.dados.requerimentos_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Reajuste *
                  <tr className="bg-white">
                    <td className="px-4 py-2">Reajuste</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center">
                        {item.dados?.reajustes_horas ? item.dados.reajustes_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Consumo Total *
                  <tr className="bg-white">
                    <td className="px-4 py-2 font-semibold">Consumo Total</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center font-bold">
                        {item.dados?.consumo_total_horas ? item.dados.consumo_total_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Saldo *
                  <tr className="bg-gray-200">
                    <td className="px-4 py-2 font-semibold">Saldo</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center text-green-600 font-bold">
                        {item.dados?.saldo_horas ? item.dados.saldo_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Repasse - 50% *
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2">Repasse - 50%</td>
                    {bancoHorasTrimestre.map((item, index) => (
                      <td key={index} className="px-4 py-2 text-center text-green-600 font-semibold">
                        {item.dados?.repasse_horas ? item.dados.repasse_horas.substring(0, 5) : '00:00'}
                      </td>
                    ))}
                  </tr>

                  {/* Taxa/hora Excedente e Valor Total - LINHA ÚNICA *
                  <tr className="text-white" style={{ backgroundColor: '#666666' }}>
                    <td className="px-4 py-2 font-semibold">Taxa/hora Excedente</td>
                    {bancoHorasTrimestre.map((item, index) => {
                      const isPenultima = index === bancoHorasTrimestre.length - 2;
                      const isUltima = index === bancoHorasTrimestre.length - 1;
                      
                      if (isPenultima) {
                        // Penúltima coluna: exibir "Valor Total"
                        return (
                          <td key={index} className="px-4 py-2 text-center font-semibold">
                            Valor Total
                          </td>
                        );
                      } else if (isUltima) {
                        // Última coluna: exibir valor total dos excedentes
                        return (
                          <td key={index} className="px-4 py-2 text-center font-semibold">
                            {item.dados?.valor_excedentes_horas 
                              ? `R$ ${item.dados.valor_excedentes_horas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : 'R$ 0,00'
                            }
                          </td>
                        );
                      } else {
                        // ✅ NOVA LÓGICA: Exibir taxa usando MESMA LÓGICA do banco de horas
                        // A taxa já foi buscada corretamente no useEffect acima seguindo:
                        // 1. Busca taxa mais recente (vigente ou vencida)
                        // 2. Busca valor_adicional da função Funcional (Hora Adicional - Excedente do Banco)
                        // 3. Se valor_adicional > 0: usa valor cadastrado
                        // 4. Se não: calcula baseado em tipo_calculo_adicional ('normal' = +15%, 'media' = média das 3 funções)
                        
                        // Prioridade de exibição:
                        // 1. Taxa específica do cliente (ticket_excedente_simples) - casos especiais
                        // 2. Taxa padrão calculada (taxaPadraoEmpresa) - valor correto do banco de horas
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
      )}*/}

      {/* Loading state para banco de horas */}
      {carregandoBancoHoras && (
        <Card className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666' }}>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando banco de horas...</p>
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
              Requerimentos de {mesSelecionado}
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Detalhes dos requerimentos de Banco de Horas deste mês
            </p>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {carregandoRequerimentos ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sonda-blue mx-auto mb-4"></div>
                  <p className="text-gray-500">Carregando requerimentos...</p>
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
                          <span>Módulo:</span>
                          <span className="font-medium text-gray-900">{req.modulo}</span>
                        </div>
                      )}
                      
                      {req.horas_funcional && req.horas_funcional !== '--' && (
                        <div className="flex justify-between">
                          <span>H. Funcional:</span>
                          <span className="font-medium text-gray-900">{req.horas_funcional}</span>
                        </div>
                      )}
                      {req.horas_tecnica && req.horas_tecnica !== '--' && (
                        <div className="flex justify-between">
                          <span>H. Técnica:</span>
                          <span className="font-medium text-gray-900">{req.horas_tecnica}</span>
                        </div>
                      )}
                      {req.total_horas && req.total_horas !== '--' && (
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="font-semibold">Total:</span>
                          <span className="font-semibold text-green-600">{req.total_horas}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-600">TOTAL DE REQUERIMENTOS</span>
                    <span className="text-2xl font-bold text-green-600">
                      {requerimentosMes.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-green-600">TOTAL DE HORAS</span>
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
                <p className="text-sm">Nenhum requerimento encontrado neste mês</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
