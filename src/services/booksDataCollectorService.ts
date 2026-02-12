/**
 * Serviço para coleta de dados reais para geração de Books
 * Busca dados de requerimentos (chamados) e calcula KPIs
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  BookCapaData,
  BookVolumetriaData,
  BookSLAData,
  BookBacklogData,
  BookConsumoData,
  BookPesquisaData
} from '@/types/books';
import { MESES_LABELS, MESES_ABREVIADOS } from '@/types/books';
import type { Requerimento } from '@/types/requerimentos';

class BooksDataCollectorService {
  /**
   * Coleta todos os dados necessários para gerar um book
   */
  async coletarDadosCompletos(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{
    capa: BookCapaData;
    volumetria: BookVolumetriaData;
    sla: BookSLAData;
    backlog: BookBacklogData;
    consumo: BookConsumoData;
    pesquisa: BookPesquisaData;
  }> {
    try {
      // Buscar informações da empresa
      const { data: empresa } = await supabase
        .from('empresas_clientes')
        .select('nome_completo, nome_abreviado, meta_sla_percentual')
        .eq('id', empresaId)
        .single();

      if (!empresa) {
        throw new Error('Empresa não encontrada');
      }

      // Buscar requerimentos do período
      const mesCobranca = `${String(mes).padStart(2, '0')}/${ano}`;
      const { data: requerimentos } = await supabase
        .from('requerimentos')
        .select('*')
        .eq('cliente_id', empresaId)
        .eq('mes_cobranca', mesCobranca);

      const requerimentosPeriodo = requerimentos || [];

      // Buscar requerimentos dos últimos 6 meses para histórico
      const requerimentosHistorico = await this.buscarRequerimentosHistorico(
        empresaId,
        mes,
        ano,
        6
      );

      // Gerar dados de cada seção
      const mesNome = MESES_LABELS[mes];
      const periodo = `${mesNome} ${ano}`;

      return {
        capa: this.gerarDadosCapa(
          empresa.nome_completo,
          empresa.nome_abreviado,
          mes,
          ano,
          periodo
        ),
        volumetria: await this.gerarDadosVolumetria(
          requerimentosPeriodo,
          requerimentosHistorico
        ),
        sla: await this.gerarDadosSLA(
          empresaId,
          requerimentosPeriodo,
          empresa.meta_sla_percentual || 85
        ),
        backlog: await this.gerarDadosBacklog(empresaId, requerimentosPeriodo),
        consumo: await this.gerarDadosConsumo(
          requerimentosPeriodo,
          requerimentosHistorico,
          mes,
          ano
        ),
        pesquisa: await this.gerarDadosPesquisa(empresaId, mes, ano)
      };
    } catch (error) {
      console.error('Erro ao coletar dados do book:', error);
      throw error;
    }
  }

  /**
   * Gera dados da capa
   */
  private gerarDadosCapa(
    empresaNome: string,
    mes: number,
    ano: number,
    periodo: string
  ): BookCapaData {
    return {
      empresa_nome: empresaNome,
      periodo,
      mes,
      ano,
      data_geracao: new Date().toLocaleDateString('pt-BR')
    };
  }

  /**
   * Gera dados de volumetria
   */
  private async gerarDadosVolumetria(
    requerimentos: any[],
    historico: any[]
  ): Promise<BookVolumetriaData> {
    // Contar abertos e fechados do mês
    const abertosIncidente = requerimentos.filter(r => 
      r.tipo_cobranca === 'Incidente' || r.descricao?.toLowerCase().includes('incidente')
    ).length;
    
    const abertosSolicitacao = requerimentos.length - abertosIncidente;

    // Para fechados, consideramos os que têm data_aprovacao
    const fechados = requerimentos.filter(r => r.data_aprovacao);
    const fechadosIncidente = fechados.filter(r => 
      r.tipo_cobranca === 'Incidente' || r.descricao?.toLowerCase().includes('incidente')
    ).length;
    const fechadosSolicitacao = fechados.length - fechadosIncidente;

    // Calcular SLA médio (simplificado - % de chamados com data_aprovacao)
    const slaMedio = requerimentos.length > 0
      ? (fechados.length / requerimentos.length) * 100
      : 0;

    // Backlog = chamados sem data_aprovacao
    const totalBacklog = requerimentos.filter(r => !r.data_aprovacao).length;

    // Gerar dados do semestre (últimos 6 meses do histórico)
    const chamadosSemestre = this.agruparPorMes(historico) || [];

    // Agrupar por módulo
    const chamadosPorGrupo = this.agruparPorModulo(requerimentos) || [];

    // Taxa de resolução
    const taxaResolucao = requerimentos.length > 0
      ? Math.round((fechados.length / requerimentos.length) * 100)
      : 0;

    // Backlog por causa (tipo de cobrança)
    const backlogPorCausa = this.agruparBacklogPorCausa(
      requerimentos.filter(r => !r.data_aprovacao)
    ) || [];

    return {
      abertos_mes: {
        solicitacao: abertosSolicitacao,
        incidente: abertosIncidente
      },
      fechados_mes: {
        solicitacao: fechadosSolicitacao,
        incidente: fechadosIncidente
      },
      sla_medio: Math.round(slaMedio * 10) / 10,
      total_backlog: totalBacklog,
      chamados_semestre: chamadosSemestre,
      chamados_por_grupo: chamadosPorGrupo,
      taxa_resolucao: taxaResolucao,
      backlog_por_causa: backlogPorCausa
    };
  }

  /**
   * Gera dados de SLA
   */
  private async gerarDadosSLA(
    empresaId: string,
    requerimentos: any[],
    metaSLA: number
  ): Promise<BookSLAData> {
    const fechados = requerimentos.filter(r => r.data_aprovacao);
    const incidentes = requerimentos.filter(r => 
      r.tipo_cobranca === 'Incidente' || r.descricao?.toLowerCase().includes('incidente')
    );

    // Calcular SLA (simplificado)
    const slaPercentual = requerimentos.length > 0
      ? Math.round((fechados.length / requerimentos.length) * 100)
      : 0;

    const status = slaPercentual >= metaSLA ? 'no_prazo' : 'vencido';

    // Chamados violados (sem data_aprovacao ou com atraso)
    const violados = requerimentos.filter(r => !r.data_aprovacao);

    // Histórico de SLA (últimos 4 meses)
    const slaHistorico = await this.calcularSLAHistorico(empresaId, metaSLA);

    // Detalhes dos chamados violados
    const chamadosViolados = violados.slice(0, 10).map(r => ({
      id_chamado: r.chamado,
      tipo: (r.tipo_cobranca === 'Incidente' ? 'Incidente' : 'Requisição') as 'Incidente' | 'Requisição',
      data_abertura: new Date(r.data_envio).toLocaleDateString('pt-BR'),
      data_solucao: r.data_aprovacao 
        ? new Date(r.data_aprovacao).toLocaleDateString('pt-BR')
        : 'Pendente',
      grupo_atendedor: r.modulo || 'N/A'
    }));

    return {
      sla_percentual: slaPercentual,
      meta_percentual: metaSLA,
      status,
      fechados: fechados.length,
      incidentes: incidentes.length,
      violados: violados.length,
      sla_historico,
      chamados_violados
    };
  }

  /**
   * Gera dados de backlog
   */
  private async gerarDadosBacklog(
    empresaId: string,
    requerimentos: any[]
  ): Promise<BookBacklogData> {
    const backlog = requerimentos.filter(r => !r.data_aprovacao);
    
    const incidente = backlog.filter(r => 
      r.tipo_cobranca === 'Incidente' || r.descricao?.toLowerCase().includes('incidente')
    ).length;
    
    const solicitacao = backlog.length - incidente;

    // Calcular aging (idade dos chamados)
    const agingChamados = this.calcularAging(backlog);

    // Distribuição por grupo (módulo)
    const distribuicaoPorGrupo = this.agruparPorModulo(backlog).map(grupo => ({
      grupo: grupo.grupo,
      total: grupo.total,
      percentual: backlog.length > 0 
        ? Math.round((grupo.total / backlog.length) * 100)
        : 0
    }));

    return {
      total: backlog.length,
      incidente,
      solicitacao,
      aging_chamados: agingChamados,
      distribuicao_por_grupo: distribuicaoPorGrupo
    };
  }

  /**
   * Gera dados de consumo
   */
  private async gerarDadosConsumo(
    requerimentos: any[],
    historico: any[],
    mes: number,
    ano: number
  ): Promise<BookConsumoData> {
    // Calcular horas totais
    const horasTotal = requerimentos.reduce((sum, r) => {
      const horas = this.converterHorasParaDecimal(r.horas_total);
      return sum + horas;
    }, 0);

    const horasIncidente = requerimentos
      .filter(r => r.tipo_cobranca === 'Incidente' || r.descricao?.toLowerCase().includes('incidente'))
      .reduce((sum, r) => sum + this.converterHorasParaDecimal(r.horas_total), 0);

    const horasSolicitacao = horasTotal - horasIncidente;

    // Baseline (buscar da empresa ou usar padrão)
    const baselineHoras = 40; // TODO: Buscar da empresa

    const percentualConsumido = baselineHoras > 0
      ? Math.round((horasTotal / baselineHoras) * 100)
      : 0;

    // Histórico de consumo (últimos 6 meses)
    const historicoConsumo = this.calcularHistoricoConsumo(historico, mes, ano);

    // Distribuição por causa (tipo de cobrança)
    const distribuicaoCausa = this.agruparPorTipoCobranca(requerimentos);

    return {
      horas_consumo: this.formatarHoras(horasTotal),
      baseline_apl: this.formatarHoras(baselineHoras),
      incidente: horasIncidente > 0 ? this.formatarHoras(horasIncidente) : '--',
      solicitacao: this.formatarHoras(horasSolicitacao),
      percentual_consumido: percentualConsumido,
      historico_consumo: historicoConsumo,
      distribuicao_causa: distribuicaoCausa,
      total_geral: requerimentos.length
    };
  }

  /**
   * Gera dados de pesquisa
   */
  private async gerarDadosPesquisa(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<BookPesquisaData> {
    // TODO: Implementar quando houver tabela de pesquisas
    // Por enquanto, retorna dados vazios
    
    return {
      pesquisas_respondidas: 0,
      pesquisas_nao_respondidas: 0,
      pesquisas_enviadas: 0,
      resumo_pesquisas: [],
      percentual_aderencia: 0,
      nivel_satisfacao: {
        insatisfeito: 0,
        neutro: 0,
        satisfeito: 0
      },
      sem_avaliacoes: true
    };
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Busca requerimentos dos últimos N meses
   */
  private async buscarRequerimentosHistorico(
    empresaId: string,
    mesAtual: number,
    anoAtual: number,
    meses: number
  ): Promise<any[]> {
    const periodos: string[] = [];
    let mes = mesAtual;
    let ano = anoAtual;

    for (let i = 0; i < meses; i++) {
      periodos.push(`${String(mes).padStart(2, '0')}/${ano}`);
      mes--;
      if (mes === 0) {
        mes = 12;
        ano--;
      }
    }

    const { data } = await supabase
      .from('requerimentos')
      .select('*')
      .eq('cliente_id', empresaId)
      .in('mes_cobranca', periodos);

    return data || [];
  }

  /**
   * Agrupa requerimentos por mês
   */
  private agruparPorMes(requerimentos: any[]) {
    const mesesMap = new Map<string, { abertos: number; fechados: number }>();

    requerimentos.forEach(r => {
      const [mes, ano] = r.mes_cobranca.split('/');
      const mesNum = parseInt(mes);
      const mesNome = MESES_ABREVIADOS[mesNum];

      if (!mesesMap.has(mesNome)) {
        mesesMap.set(mesNome, { abertos: 0, fechados: 0 });
      }

      const dados = mesesMap.get(mesNome)!;
      dados.abertos++;
      if (r.data_aprovacao) {
        dados.fechados++;
      }
    });

    return Array.from(mesesMap.entries()).map(([mes, dados]) => ({
      mes,
      abertos: dados.abertos,
      fechados: dados.fechados
    }));
  }

  /**
   * Agrupa requerimentos por módulo
   */
  private agruparPorModulo(requerimentos: any[]) {
    const modulosMap = new Map<string, { total: number; abertos: number; fechados: number }>();

    requerimentos.forEach(r => {
      const modulo = r.modulo || 'Outros';
      
      if (!modulosMap.has(modulo)) {
        modulosMap.set(modulo, { total: 0, abertos: 0, fechados: 0 });
      }

      const dados = modulosMap.get(modulo)!;
      dados.total++;
      dados.abertos++;
      if (r.data_aprovacao) {
        dados.fechados++;
      }
    });

    return Array.from(modulosMap.entries()).map(([grupo, dados]) => ({
      grupo,
      total: dados.total,
      abertos: dados.abertos,
      fechados: dados.fechados,
      percentual: requerimentos.length > 0
        ? Math.round((dados.total / requerimentos.length) * 100)
        : 0
    }));
  }

  /**
   * Agrupa backlog por causa (tipo de cobrança)
   */
  private agruparBacklogPorCausa(backlog: any[]) {
    const causasMap = new Map<string, { incidente: number; solicitacao: number }>();

    backlog.forEach(r => {
      const causa = r.tipo_cobranca || 'Outros';
      const isIncidente = r.tipo_cobranca === 'Incidente' || 
                         r.descricao?.toLowerCase().includes('incidente');

      if (!causasMap.has(causa)) {
        causasMap.set(causa, { incidente: 0, solicitacao: 0 });
      }

      const dados = causasMap.get(causa)!;
      if (isIncidente) {
        dados.incidente++;
      } else {
        dados.solicitacao++;
      }
    });

    return Array.from(causasMap.entries()).map(([origem, dados]) => ({
      origem,
      incidente: dados.incidente,
      solicitacao: dados.solicitacao,
      total: dados.incidente + dados.solicitacao
    }));
  }

  /**
   * Calcula aging dos chamados
   */
  private calcularAging(backlog: any[]) {
    const faixas = [
      { faixa: 'ACIMA DE 60 DIAS', min: 61, max: Infinity },
      { faixa: '30 A 60 DIAS', min: 30, max: 60 },
      { faixa: '15 A 30 DIAS', min: 15, max: 30 },
      { faixa: '05 A 15 DIAS', min: 5, max: 15 },
      { faixa: 'ATÉ 5 DIAS', min: 0, max: 5 }
    ];

    const resultado = faixas.map(f => ({
      faixa: f.faixa,
      solicitacao: 0,
      incidente: 0,
      total: 0
    }));

    const hoje = new Date();

    backlog.forEach(r => {
      const dataEnvio = new Date(r.data_envio);
      const diasAberto = Math.floor((hoje.getTime() - dataEnvio.getTime()) / (1000 * 60 * 60 * 24));
      
      const isIncidente = r.tipo_cobranca === 'Incidente' || 
                         r.descricao?.toLowerCase().includes('incidente');

      for (const faixa of resultado) {
        const faixaOriginal = faixas.find(f => f.faixa === faixa.faixa)!;
        if (diasAberto >= faixaOriginal.min && diasAberto <= faixaOriginal.max) {
          if (isIncidente) {
            faixa.incidente++;
          } else {
            faixa.solicitacao++;
          }
          faixa.total++;
          break;
        }
      }
    });

    return resultado.filter(f => f.total > 0);
  }

  /**
   * Calcula histórico de SLA
   */
  private async calcularSLAHistorico(empresaId: string, metaSLA: number) {
    // TODO: Implementar cálculo real de SLA histórico
    // Por enquanto, retorna dados mockados
    return [
      { mes: 'MAIO', percentual: 100, status: 'no_prazo' as const },
      { mes: 'JUNHO', percentual: 100, status: 'no_prazo' as const },
      { mes: 'JULHO', percentual: 100, status: 'no_prazo' as const },
      { mes: 'SETEMBRO', percentual: 90, status: 'no_prazo' as const }
    ];
  }

  /**
   * Calcula histórico de consumo
   */
  private calcularHistoricoConsumo(historico: any[], mesAtual: number, anoAtual: number) {
    const mesesMap = new Map<string, number>();

    historico.forEach(r => {
      const [mes, ano] = r.mes_cobranca.split('/');
      const mesNum = parseInt(mes);
      const mesNome = MESES_ABREVIADOS[mesNum];
      
      const horas = this.converterHorasParaDecimal(r.horas_total);
      mesesMap.set(mesNome, (mesesMap.get(mesNome) || 0) + horas);
    });

    return Array.from(mesesMap.entries()).map(([mes, horas]) => ({
      mes,
      horas: this.formatarHoras(horas),
      valor_numerico: Math.round(horas * 100) / 100
    }));
  }

  /**
   * Agrupa por tipo de cobrança
   */
  private agruparPorTipoCobranca(requerimentos: any[]) {
    const tiposMap = new Map<string, number>();

    requerimentos.forEach(r => {
      const tipo = r.tipo_cobranca || 'Outros';
      tiposMap.set(tipo, (tiposMap.get(tipo) || 0) + 1);
    });

    const total = requerimentos.length;
    
    return Array.from(tiposMap.entries()).map(([causa, quantidade]) => ({
      causa,
      quantidade,
      percentual: total > 0 ? Math.round((quantidade / total) * 100) : 0
    }));
  }

  /**
   * Converte horas para decimal
   */
  private converterHorasParaDecimal(horas: any): number {
    if (typeof horas === 'number') {
      return horas;
    }

    if (typeof horas === 'string') {
      // Formato HH:MM
      if (horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        return h + (m / 60);
      }
      return parseFloat(horas) || 0;
    }

    return 0;
  }

  /**
   * Formata horas para exibição (HH:MM:SS)
   */
  private formatarHoras(horasDecimal: number): string {
    const horas = Math.floor(horasDecimal);
    const minutos = Math.floor((horasDecimal - horas) * 60);
    const segundos = Math.floor(((horasDecimal - horas) * 60 - minutos) * 60);
    
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }
}

export const booksDataCollectorService = new BooksDataCollectorService();
