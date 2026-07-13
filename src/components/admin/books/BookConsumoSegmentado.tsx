/**
 * BookConsumoSegmentado - Componente de Consumo Segmentado para Books
 * Exibe tabelas de banco de horas separadas por segmentação quando
 * o cliente possui Baseline Segmentado ativado.
 * 
 * Renderiza até 2 tabelas por página. Se houver mais de 2 segmentos,
 * deve ser dividido em múltiplas páginas pelo componente pai.
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';
import { calcularNomePeriodoComIdioma } from '@/utils/periodoVigenciaUtils';
import BookFooterBar from './BookFooterBar';

interface SegmentacaoEmpresa {
  nome: string;
  percentual: number;
  filtro_tipo: string;
  filtro_valor: string;
  ordem?: number;
}

interface SegmentacaoConfig {
  empresas: SegmentacaoEmpresa[];
}

interface DadosMesSegmentado {
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
}

interface DadosEmpresaSegmentada {
  nome: string;
  percentual: number;
  baseline: number;
  dadosPorMes: DadosMesSegmentado[];
  excedentes: number;
  valorTotalExcedentes: number;
}

export interface BookConsumoSegmentadoProps {
  empresaId: string;
  empresaNome?: string;
  mes: number;
  ano: number;
  /** Indices dos segmentos a renderizar nesta página (ex: [0,1] para os 2 primeiros) */
  segmentosIndices: number[];
  /** Snapshot pré-computado (evita carregamento em tempo real) */
  snapshotData?: DadosEmpresaSegmentada[];
  onDataLoaded?: () => void;
}

// Códigos de resolução válidos (mesma lista do backend e VisaoSegmentada)
const CODIGOS_RESOLUCAO_VALIDOS = [
  'Alocação - T&M', 'Alocação T&M', 'Alocação - T&M (Banco=S |SLA=N)',
  'Alocação - T&M (Banco=S| SLA=N)', 'AMS SAP', 'AMS SAP (Banco=S |SLA=S)',
  'AMS SAP (Banco=S| SLA=S)', 'Aplicação de Nota / Licença - Contratados',
  'Aplicação de Nota / Licença (Banco=S |SLA=N)', 'Consultoria',
  'Consultoria (Banco=S |SLA=S)', 'Consultoria (Banco=S| SLA=S)',
  'Consultoria - Banco de Dados', 'Consultoria - Banco de Dados (Banco=S |SLA=S)',
  'Consultoria - Banco de Dados (Banco=S| SLA=S)', 'Consultoria - Nota Publicada',
  'Consultoria - Nota Publicada (Banco=S |SLA=S)', 'Consultoria - Nota Publicada (Banco=S| SLA=S)',
  'Consultoria - Solução Paliativa', 'Consultoria - Solução Paliativa (Banco=S |SLA=S)',
  'Consultoria - Solução Paliativa (Banco=S| SLA=S)', 'Dúvida', 'Dúvida (Banco=S |SLA=N)',
  'Erro de classificação na abertura', 'Erro de classificação na abertura (Banco=S| SLA=N)',
  'Erro de classificação na abertura (Banco=S |SLA=N)',
  'Erro de programa especifico (SEM SLA)', 'Erro de programa especifico (Banco=S |SLA=N)',
  'Erro de programa especifico (Banco=S| SLA=N)',
  'Levantamento de Versão / Orçamento', 'Levantamento de Versão / Orçamento (Banco=S |SLA=N)',
  'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
  'Monitoramento DBA', 'Monitoramento DBA (Banco=S |SLA=N)',
  'Nota Publicada', 'Nota Publicada (Banco=S |SLA=N)',
  'Parametrização / Cadastro', 'Parametrização / Cadastro (Banco=S |SLA=N)',
  'Parametrização / Funcionalidade', 'Parametrização / Funcionalidade (Banco=S |SLA=N)',
  'Parametrização / Funcionalidade (Banco=S| SLA=N)',
  'Validação de Arquivo', 'Validação de Arquivo (Banco=S |SLA=N)',
  'Validação de Arquivo (Banco=S| SLA=N)'
];

function aplicarFiltro(itemConfiguracao: string | null | undefined, filtroTipo: string, filtroValor: string): boolean {
  if (!itemConfiguracao) return false;
  const item = itemConfiguracao.toUpperCase();
  const valor = filtroValor.toUpperCase();
  switch (filtroTipo) {
    case 'contem': return item.includes(valor);
    case 'nao_contem': return !item.includes(valor);
    case 'igual': return item === valor;
    case 'diferente': return item !== valor;
    case 'comeca_com': return item.startsWith(valor);
    case 'termina_com': return item.endsWith(valor);
    default: return false;
  }
}

function getColorClass(minutos: number): string {
  if (minutos > 0) return 'text-green-600';
  if (minutos < 0) return 'text-red-600';
  return 'text-gray-900';
}

function formatarMoeda(valor?: number): string {
  if (valor === undefined || valor === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

async function calcularConsumoSegmentadoPorMes(
  empresaId: string, filtroTipo: string, filtroValor: string, mes: number, ano: number
): Promise<number> {
  try {
    const { data: empresa } = await supabase
      .from('empresas_clientes')
      .select('nome_abreviado, nome_completo')
      .eq('id', empresaId)
      .single();
    if (!empresa) return 0;

    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);

    let query = supabase
      .from('apontamentos_aranda' as any)
      .select('tempo_gasto_horas, tempo_gasto_minutos, item_configuracao, data_atividade, data_sistema')
      .eq('ativi_interna', 'Não')
      .neq('item_configuracao', '000000 - PROJETOS APL')
      .neq('tipo_chamado', 'PM')
      .gte('data_atividade', dataInicio.toISOString())
      .lte('data_atividade', dataFim.toISOString());

    const nomeAbreviado = empresa.nome_abreviado;
    const nomeCompleto = empresa.nome_completo;
    if (nomeAbreviado && nomeCompleto) {
      query = query.or(`org_us_final.ilike.%${nomeAbreviado}%,org_us_final.ilike.%${nomeCompleto}%`);
    } else if (nomeAbreviado) {
      query = query.ilike('org_us_final', `%${nomeAbreviado}%`);
    } else if (nomeCompleto) {
      query = query.ilike('org_us_final', `%${nomeCompleto}%`);
    }

    query = query.in('cod_resolucao', CODIGOS_RESOLUCAO_VALIDOS);
    const { data: apontamentos } = await query as any;

    const apontamentosFiltrados = (apontamentos || []).filter((apt: any) => {
      if (apt.data_atividade && apt.data_sistema) {
        const dAtiv = new Date(apt.data_atividade);
        const dSist = new Date(apt.data_sistema);
        if (dAtiv.getMonth() !== dSist.getMonth() || dAtiv.getFullYear() !== dSist.getFullYear()) {
          return false;
        }
      }
      return aplicarFiltro(apt.item_configuracao, filtroTipo, filtroValor);
    });

    let totalMinutos = 0;
    for (const apt of apontamentosFiltrados) {
      if (apt.tempo_gasto_horas) {
        const [h, m] = apt.tempo_gasto_horas.split(':').map(Number);
        totalMinutos += (h * 60) + m;
      } else if (apt.tempo_gasto_minutos) {
        totalMinutos += apt.tempo_gasto_minutos;
      }
    }
    return totalMinutos;
  } catch {
    return 0;
  }
}

export default function BookConsumoSegmentado({
  empresaId, empresaNome, mes, ano, segmentosIndices, snapshotData, onDataLoaded
}: BookConsumoSegmentadoProps) {
  const { t } = useTranslation();

  // Se temos snapshot, usar direto sem loading
  const [segmentacaoConfig, setSegmentacaoConfig] = useState<SegmentacaoConfig | null>(null);
  const [mesesDoPeriodo, setMesesDoPeriodo] = useState<Array<{ mes: number; ano: number }>>([]);
  const [percentualRepasse, setPercentualRepasse] = useState(50);
  const [taxaHora, setTaxaHora] = useState(0);
  const [consumoPorEmpresaMes, setConsumoPorEmpresaMes] = useState<Record<string, Record<string, number>>>({});
  const [reajustesPorEmpresaMes, setReajustesPorEmpresaMes] = useState<Record<string, Record<string, number>>>({});
  const [requerimentosPorEmpresaMes, setRequerimentosPorEmpresaMes] = useState<Record<string, Record<string, number>>>({});
  const [carregando, setCarregando] = useState(true);
  const [baselineTotal, setBaselineTotal] = useState('00:00');
  const [nomePeriodo, setNomePeriodo] = useState('1º Período');

  // 1. Buscar config da empresa e meses do período
  // Se snapshot disponível, pular fetch pesado
  useEffect(() => {
    if (snapshotData && snapshotData.length > 0) {
      // Calcular nome do período a partir do snapshot
      if (snapshotData[0]?.dadosPorMes?.length > 0) {
        const primeiroMes = snapshotData[0].dadosPorMes[0];
        // Buscar início de vigência para calcular período
        supabase
          .from('empresas_clientes')
          .select('inicio_vigencia, periodo_apuracao')
          .eq('id', empresaId)
          .single()
          .then(({ data: emp }) => {
            if (emp?.inicio_vigencia) {
              const periodoApuracao = emp.periodo_apuracao || 3;
              const nome = calcularNomePeriodoComIdioma(
                emp.inicio_vigencia,
                periodoApuracao,
                primeiroMes.mes,
                primeiroMes.ano,
                false
              );
              setNomePeriodo(nome);
            }
          });
      }
      setCarregando(false);
      onDataLoaded?.();
      return;
    }
    const init = async () => {
      try {
        const { data: empresa } = await supabase
          .from('empresas_clientes')
          .select('baseline_segmentado, segmentacao_config, periodo_apuracao, inicio_vigencia, percentual_repasse_mensal, baseline_horas_mensal')
          .eq('id', empresaId)
          .single();

        if (!empresa?.baseline_segmentado || !empresa?.segmentacao_config) {
          setCarregando(false);
          onDataLoaded?.();
          return;
        }

        const config = empresa.segmentacao_config as any as SegmentacaoConfig;
        setSegmentacaoConfig(config);
        setPercentualRepasse(empresa.percentual_repasse_mensal || 50);

        // Buscar baseline vigente
        const dataRef = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const { data: baselineVigente } = await (supabase as any).rpc('get_baseline_vigente', {
          p_empresa_id: empresaId, p_data: dataRef
        });
        if (baselineVigente?.[0]?.baseline_horas) {
          setBaselineTotal(String(baselineVigente[0].baseline_horas));
        } else {
          // baseline_horas_mensal pode ser número (ex: 80) ou string (ex: "80:00")
          const raw = empresa.baseline_horas_mensal;
          if (typeof raw === 'number') {
            const h = Math.floor(raw);
            const m = Math.round((raw - h) * 60);
            setBaselineTotal(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          } else {
            setBaselineTotal(String(raw || '00:00'));
          }
        }

        // Calcular meses do período (ciclo)
        const periodoApuracao = empresa.periodo_apuracao || 3;
        const inicioVigencia = empresa.inicio_vigencia;
        let mesesCiclo: { mes: number; ano: number }[] = [];

        if (inicioVigencia) {
          const [anoV, mesV] = inicioVigencia.split('-').map(Number);
          const mesesDesde = (ano - anoV) * 12 + (mes - mesV);
          const cicloAtual = Math.floor(mesesDesde / periodoApuracao);
          const mesesAteInicio = cicloAtual * periodoApuracao;
          let mesInicio = mesV + mesesAteInicio;
          let anoInicio = anoV;
          while (mesInicio > 12) { mesInicio -= 12; anoInicio += 1; }
          for (let i = 0; i < periodoApuracao; i++) {
            let mCalc = mesInicio + i;
            let aCalc = anoInicio;
            while (mCalc > 12) { mCalc -= 12; aCalc += 1; }
            mesesCiclo.push({ mes: mCalc, ano: aCalc });
          }
        } else {
          const primeiro = Math.floor((mes - 1) / 3) * 3 + 1;
          for (let i = 0; i < 3; i++) {
            const m = primeiro + i;
            mesesCiclo.push(m <= 12 ? { mes: m, ano } : { mes: m - 12, ano: ano + 1 });
          }
        }
        setMesesDoPeriodo(mesesCiclo);

        // Calcular número do período
        if (inicioVigencia && mesesCiclo.length > 0) {
          const nome = calcularNomePeriodoComIdioma(
            inicioVigencia,
            periodoApuracao,
            mesesCiclo[0].mes,
            mesesCiclo[0].ano,
            false
          );
          setNomePeriodo(nome);
        }

        // Buscar taxa hora excedente
        const { data: taxas } = await supabase
          .from('taxas_clientes')
          .select('id')
          .eq('cliente_id', empresaId)
          .lte('vigencia_inicio', dataRef)
          .order('vigencia_inicio', { ascending: false })
          .limit(1);
        if (taxas?.[0]) {
          const { data: valores } = await supabase
            .from('valores_taxas_funcoes')
            .select('valor_base, valor_adicional')
            .eq('taxa_id', taxas[0].id)
            .eq('tipo_hora', 'remota')
            .eq('funcao', 'Funcional')
            .limit(1);
          if (valores?.[0]) {
            const val = valores[0].valor_adicional && valores[0].valor_adicional > 0
              ? valores[0].valor_adicional
              : Math.round((valores[0].valor_base * 1.15) * 100) / 100;
            setTaxaHora(val);
          }
        }

        // Buscar consumo, reajustes e requerimentos para cada segmento/mês
        const consumoTemp: Record<string, Record<string, number>> = {};
        const reajustesTemp: Record<string, Record<string, number>> = {};
        const reqTemp: Record<string, Record<string, number>> = {};

        for (const emp of config.empresas) {
          consumoTemp[emp.nome] = {};
          reajustesTemp[emp.nome] = {};
          reqTemp[emp.nome] = {};

          for (const mA of mesesCiclo) {
            const chave = `${mA.mes}-${mA.ano}`;

            // Consumo de chamados
            consumoTemp[emp.nome][chave] = await calcularConsumoSegmentadoPorMes(
              empresaId, emp.filtro_tipo, emp.filtro_valor, mA.mes, mA.ano
            );

            // Reajustes
            const { data: reajustes } = await (supabase
              .from('banco_horas_reajustes' as any)
              .select('valor_reajuste_horas, tipo_reajuste')
              .eq('empresa_id', empresaId)
              .eq('mes', mA.mes)
              .eq('ano', mA.ano)
              .eq('empresa_segmentada', emp.nome)
              .eq('ativo', true) as any);

            let totalReajuste = 0;
            if (reajustes) {
              for (const r of reajustes) {
                const mins = converterHorasParaMinutos(r.valor_reajuste_horas || '00:00');
                totalReajuste += r.tipo_reajuste === 'entrada' ? mins : -mins;
              }
            }
            reajustesTemp[emp.nome][chave] = totalReajuste;

            // Requerimentos segmentados
            const mesCobranca = `${String(mA.mes).padStart(2, '0')}/${mA.ano}`;
            const { data: reqs } = await (supabase
              .from('requerimentos' as any)
              .select('horas_funcional, horas_tecnico')
              .eq('cliente_id', empresaId)
              .eq('mes_cobranca', mesCobranca)
              .eq('empresa_segmentacao_nome', emp.nome)
              .in('status', ['enviado_faturamento', 'faturado', 'concluido', 'em_desenvolvimento']) as any);

            let totalReqMins = 0;
            if (reqs) {
              for (const req of reqs) {
                if (typeof req.horas_funcional === 'string' && req.horas_funcional.includes(':')) {
                  const [h, m] = req.horas_funcional.split(':').map(Number);
                  totalReqMins += h * 60 + m;
                } else if (req.horas_funcional) {
                  totalReqMins += Math.round(parseFloat(req.horas_funcional) * 60);
                }
                if (typeof req.horas_tecnico === 'string' && req.horas_tecnico.includes(':')) {
                  const [h, m] = req.horas_tecnico.split(':').map(Number);
                  totalReqMins += h * 60 + m;
                } else if (req.horas_tecnico) {
                  totalReqMins += Math.round(parseFloat(req.horas_tecnico) * 60);
                }
              }
            }
            reqTemp[emp.nome][chave] = totalReqMins;
          }
        }

        setConsumoPorEmpresaMes(consumoTemp);
        setReajustesPorEmpresaMes(reajustesTemp);
        setRequerimentosPorEmpresaMes(reqTemp);
      } catch (err) {
        console.error('❌ [BookConsumoSegmentado] Erro ao inicializar:', err);
      } finally {
        setCarregando(false);
        onDataLoaded?.();
      }
    };
    init();
  }, [empresaId, mes, ano]);

  // Calcular dados segmentados por empresa
  const dadosSegmentados = useMemo<DadosEmpresaSegmentada[]>(() => {
    // Se snapshot disponível, usar direto
    if (snapshotData && snapshotData.length > 0) {
      return snapshotData;
    }

    if (!segmentacaoConfig || mesesDoPeriodo.length === 0) return [];

    const baselineTotalMin = converterHorasParaMinutos(String(baselineTotal || '00:00'));

    return segmentacaoConfig.empresas.map(emp => {
      const baseline = Math.round((baselineTotalMin * emp.percentual) / 100);
      const dadosPorMes: DadosMesSegmentado[] = [];

      mesesDoPeriodo.forEach((mA, idx) => {
        const chave = `${mA.mes}-${mA.ano}`;
        const consumoChamados = consumoPorEmpresaMes[emp.nome]?.[chave] || 0;
        const reajuste = reajustesPorEmpresaMes[emp.nome]?.[chave] || 0;
        const requerimentos = requerimentosPorEmpresaMes[emp.nome]?.[chave] || 0;
        const repasseMesAnterior = idx > 0 && dadosPorMes[idx - 1]
          ? Math.round(dadosPorMes[idx - 1].saldo * (percentualRepasse / 100))
          : 0;
        const saldoAUtilizar = baseline + repasseMesAnterior;
        const consumoTotal = consumoChamados + requerimentos + reajuste;
        const saldo = saldoAUtilizar - consumoTotal;
        const repasse = Math.round(saldo * (percentualRepasse / 100));

        dadosPorMes.push({
          mes: mA.mes, ano: mA.ano, baseline, repasseMesAnterior,
          saldoAUtilizar, consumoChamados, requerimentos, reajuste,
          consumoTotal, saldo, repasse
        });
      });

      const ultimoMes = dadosPorMes[dadosPorMes.length - 1];
      const excedentes = ultimoMes && ultimoMes.saldo < 0 ? Math.abs(ultimoMes.saldo) : 0;
      const valorTotalExcedentes = taxaHora > 0 && excedentes > 0
        ? (excedentes / 60) * taxaHora : 0;

      return { nome: emp.nome, percentual: emp.percentual, baseline, dadosPorMes, excedentes, valorTotalExcedentes };
    });
  }, [snapshotData, segmentacaoConfig, mesesDoPeriodo, consumoPorEmpresaMes, reajustesPorEmpresaMes, requerimentosPorEmpresaMes, percentualRepasse, taxaHora, baselineTotal]);

  // Filtrar apenas os segmentos que devem ser renderizados nesta página
  const segmentosParaRenderizar = dadosSegmentados.filter((_, idx) => segmentosIndices.includes(idx));

  if (carregando && !snapshotData) {
    return (
      <div className="relative w-full h-full bg-white overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Carregando dados segmentados...</p>
          </div>
        </div>
        <BookFooterBar />
      </div>
    );
  }

  if ((!segmentacaoConfig && !snapshotData) || segmentosParaRenderizar.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      {/* Header - mesmo padrão do BookConsumo */}
      <div className="w-full h-full bg-white p-8 flex flex-col relative">
        <div className="space-y-6 flex-1">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {t('books.bookContent.segmentedConsumption', 'Consumo Segmentado')} {empresaNome ? <span className="text-blue-600">{empresaNome}</span> : ''}
            </h2>
            <p className="text-sm text-gray-500">
              {t('books.bookContent.segmentedConsumptionSubtitle', 'Visão detalhada de consumo por segmentação de baseline')}
            </p>
          </div>

          {/* Tabelas de segmentos */}
          <div className="space-y-8">
            {segmentosParaRenderizar.map((dados, idx) => (
              <div key={idx} className="border-2" style={{ borderRadius: '35.5px', borderColor: '#666666', overflow: 'hidden' }}>
                {/* Título do segmento */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{dados.nome}</h3>
                  </div>
                  <Badge className="bg-blue-600 text-white text-sm px-4 py-1">
                    {dados.percentual}% do Baseline
                  </Badge>
                </div>

            {/* Tabela de banco de horas */}
            <div className="px-6 pb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderRadius: '15.5px', overflow: 'hidden' }}>
                <thead>
                  <tr className="bg-gray-700 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      Período
                    </th>
                    <th className="px-4 py-3 text-center font-semibold" colSpan={dados.dadosPorMes.length}>
                      {nomePeriodo}
                    </th>
                  </tr>
                  <tr className="bg-blue-600 text-white">
                    <th className="px-4 py-3 text-left font-semibold">
                      {t('books.bookContent.month', 'Mês')}
                    </th>
                    {dados.dadosPorMes.map((mA, i) => (
                      <th key={i} className="px-4 py-3 text-center font-semibold">
                        {new Date(mA.ano, mA.mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Banco Contratado */}
                  <tr style={{ backgroundColor: '#666666' }} className="text-white">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.contractedBank', 'Banco Contratado')}</td>
                    {dados.dadosPorMes.map((_, i) => (
                      <td key={i} className="px-4 py-2 text-center font-semibold">
                        {converterMinutosParaHoras(dados.baseline)}
                      </td>
                    ))}
                  </tr>

                  {/* Repasse mês anterior */}
                  <tr className="bg-gray-200">
                    <td className="px-4 py-2">{t('books.bookContent.previousMonthCarryover', 'Repasse mês anterior')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className={`px-4 py-2 text-center font-semibold ${getColorClass(m.repasseMesAnterior)}`}>
                        {converterMinutosParaHoras(m.repasseMesAnterior)}
                      </td>
                    ))}
                  </tr>
                  {/* Saldo a utilizar */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.balanceToUse', 'Saldo a utilizar')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className={`px-4 py-2 text-center font-bold ${getColorClass(m.saldoAUtilizar)}`}>
                        {converterMinutosParaHoras(m.saldoAUtilizar)}
                      </td>
                    ))}
                  </tr>
                  {/* Consumo Chamados */}
                  <tr className="bg-white">
                    <td className="px-4 py-2">{t('books.bookContent.ticketConsumption', 'Consumo Chamados')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className="px-4 py-2 text-center">{converterMinutosParaHoras(m.consumoChamados)}</td>
                    ))}
                  </tr>
                  {/* Requerimentos */}
                  <tr className="bg-white">
                    <td className="px-4 py-2">{t('books.bookContent.requirementsLabel', 'Requerimentos')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className="px-4 py-2 text-center">{converterMinutosParaHoras(m.requerimentos)}</td>
                    ))}
                  </tr>
                  {/* Reajuste */}
                  <tr className="bg-white">
                    <td className="px-4 py-2">{t('books.bookContent.adjustment', 'Reajuste')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className={`px-4 py-2 text-center font-semibold ${getColorClass(m.reajuste)}`}>
                        {converterMinutosParaHoras(m.reajuste)}
                      </td>
                    ))}
                  </tr>

                  {/* Consumo Total */}
                  <tr className="bg-white">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.totalConsumptionLabel', 'Consumo Total')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className="px-4 py-2 text-center font-bold">{converterMinutosParaHoras(m.consumoTotal)}</td>
                    ))}
                  </tr>
                  {/* Saldo */}
                  <tr className="bg-gray-200">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.balance', 'Saldo')}</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className={`px-4 py-2 text-center font-bold ${getColorClass(m.saldo)}`}>
                        {converterMinutosParaHoras(m.saldo)}
                      </td>
                    ))}
                  </tr>
                  {/* Repasse */}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2">Repasse - {percentualRepasse}%</td>
                    {dados.dadosPorMes.map((m, i) => (
                      <td key={i} className={`px-4 py-2 text-center font-semibold ${getColorClass(m.repasse)}`}>
                        {converterMinutosParaHoras(m.repasse)}
                      </td>
                    ))}
                  </tr>
                  {/* Taxa/hora Excedente */}
                  <tr style={{ backgroundColor: '#666666' }} className="text-white">
                    <td className="px-4 py-2 font-semibold">{t('books.bookContent.surplusRate', 'Taxa/hora Excedente')}</td>
                    {dados.dadosPorMes.map((_, i) => {
                      const isPenultima = i === dados.dadosPorMes.length - 2;
                      const isUltima = i === dados.dadosPorMes.length - 1;
                      if (isPenultima) {
                        return <td key={i} className="px-4 py-2 text-center font-semibold">Valor Total</td>;
                      } else if (isUltima) {
                        return <td key={i} className="px-4 py-2 text-center font-semibold">{formatarMoeda(dados.valorTotalExcedentes)}</td>;
                      }
                      return (
                        <td key={i} className="px-4 py-2 text-center font-semibold">
                          {taxaHora > 0 ? formatarMoeda(taxaHora) : ''}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
          </div>
        ))}
      </div>
      </div>
      </div>

      <BookFooterBar />
    </div>
  );
}
