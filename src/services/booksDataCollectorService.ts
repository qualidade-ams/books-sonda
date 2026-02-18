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
  BookPesquisaData,
  ChamadosSemestreData
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
    console.log('🚀 INICIANDO COLETA DE DADOS DO BOOK:', { empresaId, mes, ano });
    
    try {
      // Buscar informações da empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('nome_completo, nome_abreviado, meta_sla_percentual, tipo_contrato, quantidade_minima_chamados_sla')
        .eq('id', empresaId)
        .single();

      if (empresaError) {
        console.error('❌ Erro ao buscar empresa:', empresaError);
        throw empresaError;
      }

      if (!empresa) {
        console.error('❌ Empresa não encontrada:', empresaId);
        throw new Error('Empresa não encontrada');
      }

      console.log('✅ Empresa encontrada:', {
        nome: empresa.nome_completo,
        abreviado: empresa.nome_abreviado,
        tipo_contrato: empresa.tipo_contrato
      });

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

      // Buscar apontamentos baseado no tipo de contrato
      const tipoContratoValido = (empresa.tipo_contrato === 'horas' || 
                                   empresa.tipo_contrato === 'tickets' || 
                                   empresa.tipo_contrato === 'ambos') 
        ? empresa.tipo_contrato as 'horas' | 'tickets' | 'ambos'
        : null;

      const { 
        apontamentosHoras, 
        apontamentosTickets,
        ticketsAbertos,
        ticketsFechados
      } = await this.buscarApontamentosPorTipoContrato(
        empresa.nome_completo,
        empresa.nome_abreviado,
        mes,
        ano,
        tipoContratoValido
      );

      // Gerar dados de cada seção
      const mesNome = MESES_LABELS[mes];
      const periodo = `${mesNome} ${ano}`;

      const dadosGerados = {
        capa: this.gerarDadosCapa(
          empresa.nome_completo,
          empresa.nome_abreviado,
          mes,
          ano,
          periodo
        ),
        volumetria: await this.gerarDadosVolumetria(
          apontamentosHoras,
          apontamentosTickets,
          ticketsAbertos,
          ticketsFechados,
          tipoContratoValido,
          empresa.nome_completo,
          mes,
          ano
        ),
        sla: await this.gerarDadosSLA(
          empresaId,
          empresa.nome_completo,
          mes,
          ano,
          requerimentosPeriodo,
          empresa.meta_sla_percentual || 85,
          empresa.quantidade_minima_chamados_sla || 0
        ),
        backlog: await this.gerarDadosBacklog(empresa.nome_completo, mes, ano),
        consumo: await this.gerarDadosConsumo(
          requerimentosPeriodo,
          requerimentosHistorico,
          mes,
          ano
        ),
        pesquisa: await this.gerarDadosPesquisa(empresaId, mes, ano)
      };

      console.log('✅ DADOS DO BOOK GERADOS COM SUCESSO:', {
        empresa: empresa.nome_abreviado,
        volumetria: {
          abertos: dadosGerados.volumetria.abertos_mes,
          fechados: dadosGerados.volumetria.fechados_mes,
          sla: dadosGerados.volumetria.sla_medio,
          backlog: dadosGerados.volumetria.total_backlog
        }
      });

      return dadosGerados;
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
    nomeAbreviado: string,
    mes: number,
    ano: number,
    periodo: string
  ): BookCapaData {
    return {
      empresa_nome: empresaNome,
      empresa_nome_abreviado: nomeAbreviado,
      periodo,
      mes,
      ano,
      data_geracao: new Date().toLocaleDateString('pt-BR')
    };
  }

  /**
   * Busca apontamentos baseado no tipo de contrato da empresa
   * IMPORTANTE: Para os cards de volumetria, SEMPRE buscar de apontamentos_tickets_aranda
   */
  private async buscarApontamentosPorTipoContrato(
    empresaNomeCompleto: string,
    empresaNomeAbreviado: string,
    mes: number,
    ano: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos' | null
  ): Promise<{
    apontamentosHoras: any[];
    apontamentosTickets: any[];
    ticketsAbertos: any[];
    ticketsFechados: any[];
  }> {
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);
    const proximoMesInicio = new Date(ano, mes, 1); // Para data_solucao

    console.log('🔍 Buscando apontamentos:', {
      empresaCompleto: empresaNomeCompleto,
      empresaAbreviado: empresaNomeAbreviado,
      mes,
      ano,
      tipoContrato,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString()
    });

    let apontamentosHoras: any[] = [];
    let apontamentosTickets: any[] = [];

    // SEMPRE buscar tickets para os cards de volumetria (independente do tipo_contrato)
    // ABERTOS: Buscar por data_abertura no mês com filtros específicos
    const { data: ticketsAbertos, error: ticketsAbertosError } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('*')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .gte('data_abertura', dataInicio.toISOString())
      .lte('data_abertura', dataFim.toISOString())
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

    // FECHADOS: Buscar por data_solucao no mês com filtros específicos
    const { data: ticketsFechados, error: ticketsFechadosError } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('*')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .gte('data_solucao', dataInicio.toISOString())
      .lt('data_solucao', proximoMesInicio.toISOString())
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

    if (ticketsAbertosError) {
      console.error('❌ Erro ao buscar apontamentos_tickets_aranda (abertos):', ticketsAbertosError);
    }
    if (ticketsFechadosError) {
      console.error('❌ Erro ao buscar apontamentos_tickets_aranda (fechados):', ticketsFechadosError);
    }

    // Tickets já vêm filtrados do banco de dados
    const ticketsAbertosFiltrados = ticketsAbertos || [];
    const ticketsFechadosFiltrados = ticketsFechados || [];

    console.log('🔍 DEBUG ABERTOS:', {
      totalTickets: ticketsAbertosFiltrados.length,
      empresaBuscada: empresaNomeCompleto,
      amostra: ticketsAbertosFiltrados.slice(0, 5).map(t => ({
        nro: t.nro_solicitacao,
        organizacao: t.organizacao,
        cod_tipo: t.cod_tipo,
        data_abertura: t.data_abertura,
        nome_grupo: t.nome_grupo
      }))
    });

    console.log('🔍 DEBUG FECHADOS:', {
      totalTickets: ticketsFechadosFiltrados.length,
      empresaBuscada: empresaNomeCompleto,
      amostra: ticketsFechadosFiltrados.slice(0, 5).map(t => ({
        nro: t.nro_solicitacao,
        organizacao: t.organizacao,
        cod_tipo: t.cod_tipo,
        data_solucao: t.data_solucao,
        nome_grupo: t.nome_grupo
      }))
    });
    
    console.log('✅ Apontamentos tickets encontrados:', {
      abertos: ticketsAbertosFiltrados.length,
      fechados: ticketsFechadosFiltrados.length,
      totalAbertosAntesFiltro: (ticketsAbertos || []).length,
      totalFechadosAntesFiltro: (ticketsFechados || []).length,
      esperado: {
        abertos: 13,
        fechados: 17
      }
    });

    // Combinar todos os tickets únicos para outras métricas (gráficos, etc)
    const ticketsMap = new Map();
    [...ticketsAbertosFiltrados, ...ticketsFechadosFiltrados].forEach(a => {
      const chave = a.nro_solicitacao;
      if (!ticketsMap.has(chave)) {
        ticketsMap.set(chave, a);
      }
    });

    const ticketsData = Array.from(ticketsMap.values());
    
    apontamentosTickets = ticketsData;

    return {
      apontamentosHoras,
      apontamentosTickets,
      ticketsAbertos: ticketsAbertosFiltrados,
      ticketsFechados: ticketsFechadosFiltrados
    };
  }

  /**
   * Gera dados de volumetria baseado EXCLUSIVAMENTE em tickets
   * CRÍTICO: Cards de volumetria usam APENAS apontamentos_tickets_aranda
   */
  private async gerarDadosVolumetria(
    apontamentosHoras: any[],
    apontamentosTickets: any[],
    ticketsAbertos: any[],
    ticketsFechados: any[],
    tipoContrato: 'horas' | 'tickets' | 'ambos' | null,
    empresaNomeCompleto: string,
    mes: number,
    ano: number
  ): Promise<BookVolumetriaData> {
    console.log('📊 Processando volumetria (APENAS TICKETS):', {
      tipoContrato,
      ticketsAbertos: ticketsAbertos.length,
      ticketsFechados: ticketsFechados.length,
      totalTicketsUnicos: apontamentosTickets.length
    });

    // ABERTOS | MÊS: Usar tickets já filtrados por data_abertura
    const abertosIncidente = ticketsAbertos.filter(a => 
      a.cod_tipo === 'Incidente'
    ).length;
    
    const abertosSolicitacao = ticketsAbertos.filter(a => 
      a.cod_tipo && a.cod_tipo !== 'Incidente'
    ).length;

    // Debug: Verificar tipos de chamados abertos
    const tiposAbertos = ticketsAbertos.reduce((acc: any, t: any) => {
      const tipo = t.cod_tipo || 'SEM_TIPO';
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {});

    console.log('🔍 DEBUG TIPOS ABERTOS:', {
      total: ticketsAbertos.length,
      tiposEncontrados: tiposAbertos,
      incidenteContado: abertosIncidente,
      solicitacaoContado: abertosSolicitacao,
      amostra: ticketsAbertos.slice(0, 5).map(t => ({
        nro: t.nro_solicitacao,
        cod_tipo: t.cod_tipo,
        data_abertura: t.data_abertura
      }))
    });

    // FECHADOS | MÊS: Usar tickets já filtrados por data_solucao
    const fechadosIncidente = ticketsFechados.filter(a => 
      a.cod_tipo === 'Incidente'
    ).length;
    
    const fechadosSolicitacao = ticketsFechados.filter(a => 
      a.cod_tipo && a.cod_tipo !== 'Incidente'
    ).length;

    console.log('📈 Dados calculados (CARDS - sempre de tickets):', {
      abertos: { 
        solicitacao: abertosSolicitacao, 
        incidente: abertosIncidente,
        total: abertosSolicitacao + abertosIncidente
      },
      fechados: { 
        solicitacao: fechadosSolicitacao, 
        incidente: fechadosIncidente,
        total: fechadosSolicitacao + fechadosIncidente
      }
    });

    // Calcular SLA médio (simplificado - % de chamados fechados vs abertos)
    const totalAbertos = abertosSolicitacao + abertosIncidente;
    const totalFechados = fechadosSolicitacao + fechadosIncidente;
    const slaMedio = totalAbertos > 0
      ? (totalFechados / totalAbertos) * 100
      : 0;

    console.log('✅ VOLUMETRIA FINAL (100% TICKETS):', {
      fonte: 'apontamentos_tickets_aranda',
      abertos: totalAbertos,
      fechados: totalFechados,
      backlog: apontamentosTickets.filter(a => !a.data_solucao).length,
      slaMedio: Math.round(slaMedio * 10) / 10,
      esperado: {
        abertos: 13,
        fechados: 17
      },
      diferenca: {
        abertos: totalAbertos - 13,
        fechados: totalFechados - 17
      }
    });

    // Backlog = chamados sem data_solucao (usar todos os tickets combinados)
    const totalBacklog = apontamentosTickets.filter(a => !a.data_solucao).length;

    // Gerar dados do semestre (últimos 6 meses) - buscar dados reais
    const chamadosSemestre = await this.buscarChamadosSemestre(empresaNomeCompleto, mes, ano);

    // Agrupar por grupo - passar os tickets abertos e fechados separadamente
    const chamadosPorGrupo = this.agruparPorGrupo(ticketsAbertos, ticketsFechados);

    // Taxa de resolução - baseada apenas em tickets
    const taxaResolucao = apontamentosTickets.length > 0
      ? Math.round((totalFechados / apontamentosTickets.length) * 100)
      : 0;

    // Chamados por causa - passar abertos e fechados separadamente
    const chamadosPorCausa = this.agruparChamadosPorCausa(ticketsAbertos, ticketsFechados);

    // Calcular SLA médio dos últimos 5 meses e variação vs mês anterior
    const slaMedioData = await this.calcularSLAMedioUltimos5Meses(
      empresaNomeCompleto,
      mes,
      ano
    );

    return {
      abertos_mes: {
        solicitacao: abertosSolicitacao,
        incidente: abertosIncidente
      },
      fechados_mes: {
        solicitacao: fechadosSolicitacao,
        incidente: fechadosIncidente
      },
      sla_medio: slaMedioData.sla_medio,
      sla_medio_variacao: slaMedioData.variacao_mes_anterior,
      total_backlog: totalBacklog,
      chamados_semestre: chamadosSemestre,
      chamados_por_grupo: chamadosPorGrupo,
      taxa_resolucao: taxaResolucao,
      backlog_por_causa: chamadosPorCausa
    };
  }

  /**
   * Calcula SLA médio dos últimos 5 meses e variação vs mês anterior
   * SLA = (Incidentes - Violados) / Incidentes * 100
   */
  private async calcularSLAMedioUltimos5Meses(
    empresaNomeCompleto: string,
    mesAtual: number,
    anoAtual: number
  ): Promise<{ sla_medio: number; variacao_mes_anterior: number }> {
    console.log('📊 Calculando SLA médio dos últimos 5 meses...');

    const slasPorMes: number[] = [];

    // Calcular SLA para os últimos 5 meses
    for (let i = 4; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes <= 0) {
        mes += 12;
        ano -= 1;
      }

      const dataInicio = new Date(ano, mes - 1, 1);
      const proximoMesInicio = new Date(ano, mes, 1);

      // Buscar incidentes fechados do mês
      const { data: ticketsFechados } = await supabase
        .from('apontamentos_tickets_aranda')
        .select('*')
        .ilike('organizacao', `%${empresaNomeCompleto}%`)
        .gte('data_solucao', dataInicio.toISOString())
        .lt('data_solucao', proximoMesInicio.toISOString())
        .eq('cod_tipo', 'Incidente')
        .neq('cod_tipo', 'Problema')
        .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
        .eq('caso_pai', 'SIM')
        .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

      const totalIncidentes = (ticketsFechados || []).length;

      // Buscar violados do mês
      const dataFim = new Date(ano, mes, 0, 23, 59, 59);
      const { data: ticketsViolados } = await supabase
        .from('apontamentos_tickets_aranda')
        .select('nro_solicitacao')
        .ilike('organizacao', `%${empresaNomeCompleto}%`)
        .eq('tds_cumprido', 'TDS Vencido')
        .gte('data_abertura', dataInicio.toISOString())
        .lte('data_abertura', dataFim.toISOString())
        .neq('cod_tipo', 'Problema')
        .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
        .eq('caso_pai', 'SIM')
        .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

      const totalViolados = (ticketsViolados || []).length;

      // Calcular SLA do mês
      const slaMes = totalIncidentes > 0
        ? Math.round(((totalIncidentes - totalViolados) / totalIncidentes) * 100)
        : 100;

      slasPorMes.push(slaMes);
    }

    // Calcular média dos 5 meses
    const slaMedio = slasPorMes.length > 0
      ? Math.round((slasPorMes.reduce((sum, sla) => sum + sla, 0) / slasPorMes.length) * 10) / 10
      : 0;

    // Calcular variação vs mês anterior (penúltimo mês vs último mês)
    let variacaoMesAnterior = 0;
    if (slasPorMes.length >= 2) {
      const slaMesAnterior = slasPorMes[slasPorMes.length - 2]; // Penúltimo
      const slaMesAtual = slasPorMes[slasPorMes.length - 1]; // Último
      variacaoMesAnterior = Math.round((slaMesAtual - slaMesAnterior) * 10) / 10;
    }

    console.log('✅ SLA médio calculado:', {
      slasPorMes,
      slaMedio,
      variacaoMesAnterior
    });

    return {
      sla_medio: slaMedio,
      variacao_mes_anterior: variacaoMesAnterior
    };
  }

  /**
   * Busca dados de chamados dos últimos 6 meses
   * Usa os mesmos filtros dos cards (APENAS apontamentos_tickets_aranda)
   * OTIMIZADO: Faz apenas 2 queries (abertos e fechados) para todos os 6 meses
   */
  private async buscarChamadosSemestre(
    empresaNomeCompleto: string,
    mesAtual: number,
    anoAtual: number
  ): Promise<ChamadosSemestreData[]> {
    const MESES_NOMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
                         'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    
    // Calcular data inicial (6 meses atrás) e data final (fim do mês atual)
    let mesInicial = mesAtual - 5;
    let anoInicial = anoAtual;
    
    while (mesInicial <= 0) {
      mesInicial += 12;
      anoInicial -= 1;
    }
    
    const dataInicio = new Date(anoInicial, mesInicial - 1, 1);
    const dataFim = new Date(anoAtual, mesAtual, 0, 23, 59, 59, 999);
    
    console.log('📅 Buscando dados do semestre:', {
      empresa: empresaNomeCompleto,
      periodo: `${MESES_NOMES[mesInicial - 1]}/${anoInicial} até ${MESES_NOMES[mesAtual - 1]}/${anoAtual}`,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
      mesInicial,
      anoInicial,
      mesAtual,
      anoAtual
    });
    
    // Buscar TODOS os tickets ABERTOS dos últimos 6 meses (1 query)
    const { data: ticketsAbertos, error: errorAbertos } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('nro_solicitacao, cod_tipo, data_abertura')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .gte('data_abertura', dataInicio.toISOString())
      .lte('data_abertura', dataFim.toISOString())
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');
    
    if (errorAbertos) {
      console.error('❌ Erro ao buscar tickets abertos do semestre:', errorAbertos);
    }

    console.log('🔍 DEBUG TICKETS ABERTOS:', {
      total: ticketsAbertos?.length || 0,
      amostra: ticketsAbertos?.slice(0, 3).map(t => ({
        nro: t.nro_solicitacao,
        tipo: t.cod_tipo,
        data: t.data_abertura
      }))
    });
    
    // Buscar TODOS os tickets FECHADOS dos últimos 6 meses (1 query)
    const { data: ticketsFechados, error: errorFechados } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('nro_solicitacao, cod_tipo, data_solucao')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .gte('data_solucao', dataInicio.toISOString())
      .lte('data_solucao', dataFim.toISOString())
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');
    
    if (errorFechados) {
      console.error('❌ Erro ao buscar tickets fechados do semestre:', errorFechados);
    }

    console.log('🔍 DEBUG TICKETS FECHADOS:', {
      total: ticketsFechados?.length || 0,
      amostra: ticketsFechados?.slice(0, 3).map(t => ({
        nro: t.nro_solicitacao,
        tipo: t.cod_tipo,
        data: t.data_solucao
      }))
    });
    
    // Agrupar tickets por mês
    const resultado: ChamadosSemestreData[] = [];
    
    for (let i = 5; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes <= 0) {
        mes += 12;
        ano -= 1;
      }
      
      const mesInicio = new Date(ano, mes - 1, 1);
      const mesFim = new Date(ano, mes, 0, 23, 59, 59, 999);
      
      // Contar abertos deste mês
      const abertosDoMes = (ticketsAbertos || []).filter(t => {
        const dataAbertura = new Date(t.data_abertura);
        return dataAbertura >= mesInicio && dataAbertura <= mesFim;
      }).length;
      
      // Contar fechados deste mês
      const fechadosDoMes = (ticketsFechados || []).filter(t => {
        const dataSolucao = new Date(t.data_solucao);
        return dataSolucao >= mesInicio && dataSolucao <= mesFim;
      }).length;
      
      console.log(`📊 ${MESES_NOMES[mes - 1]}/${ano}:`, {
        abertos: abertosDoMes,
        fechados: fechadosDoMes,
        periodo: `${mesInicio.toLocaleDateString()} - ${mesFim.toLocaleDateString()}`
      });
      
      resultado.push({
        mes: MESES_NOMES[mes - 1],
        abertos: abertosDoMes,
        fechados: fechadosDoMes
      });
    }
    
    console.log('📈 Dados do semestre gerados:', {
      empresa: empresaNomeCompleto,
      totalAbertos: (ticketsAbertos || []).length,
      totalFechados: (ticketsFechados || []).length,
      dados: resultado,
      somaAbertos: resultado.reduce((sum, d) => sum + d.abertos, 0),
      somaFechados: resultado.reduce((sum, d) => sum + d.fechados, 0)
    });
    
    return resultado;
  }

  /**
   * Gera dados vazios para o semestre (placeholder)
   */
  private gerarChamadosSemestreVazio() {
    const meses = ['ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO'];
    return meses.map(mes => ({
      mes,
      abertos: 0,
      fechados: 0
    }));
  }

  /**
   * Agrupa apontamentos por grupo
   */
  private agruparPorGrupo(ticketsAbertos: any[], ticketsFechados: any[]) {
    const grupos = new Map<string, { total: number; abertos: number; fechados: number }>();

    // Processar tickets abertos
    ticketsAbertos.forEach(a => {
      const grupo = a.nome_grupo || 'SEM GRUPO';
      if (!grupos.has(grupo)) {
        grupos.set(grupo, { total: 0, abertos: 0, fechados: 0 });
      }
      const stats = grupos.get(grupo)!;
      stats.abertos++;
    });

    // Processar tickets fechados
    ticketsFechados.forEach(a => {
      const grupo = a.nome_grupo || 'SEM GRUPO';
      if (!grupos.has(grupo)) {
        grupos.set(grupo, { total: 0, abertos: 0, fechados: 0 });
      }
      const stats = grupos.get(grupo)!;
      stats.fechados++;
    });

    // Calcular total para cada grupo
    grupos.forEach((stats) => {
      stats.total = stats.abertos + stats.fechados;
    });

    // Ordenar por total (maior para menor)
    const gruposArray = Array.from(grupos.entries())
      .map(([grupo, stats]) => {
        const totalGeral = ticketsAbertos.length + ticketsFechados.length;
        return {
          grupo,
          total: stats.total,
          abertos: stats.abertos,
          fechados: stats.fechados,
          percentual: totalGeral > 0 
            ? Math.round((stats.total / totalGeral) * 100)
            : 0
        };
      })
      .sort((a, b) => b.total - a.total);

    console.log('📊 Chamados agrupados por grupo (nome_grupo):', {
      totalGrupos: gruposArray.length,
      totalAbertos: ticketsAbertos.length,
      totalFechados: ticketsFechados.length,
      grupos: gruposArray.map(g => ({
        nome: g.grupo,
        total: g.total,
        abertos: g.abertos,
        fechados: g.fechados
      }))
    });

    return gruposArray;
  }

  /**
   * Agrupa backlog por origem
   */
  /**
   * Agrupa TODOS os chamados por causa (cod_resolucao)
   * Usado na aba Volumetria
   * MODIFICADO: Agora recebe abertos e fechados separadamente para exibir na tabela
   */
  private agruparChamadosPorCausa(ticketsAbertos: any[], ticketsFechados: any[]) {
    const causas = new Map<string, { 
      incidente: number; 
      solicitacao: number;
      abertos: number;
      fechados: number;
    }>();

    // Processar tickets ABERTOS
    ticketsAbertos.forEach(a => {
      const causa = a.cod_resolucao || 'Sem Código de Resolução';
      if (!causas.has(causa)) {
        causas.set(causa, { incidente: 0, solicitacao: 0, abertos: 0, fechados: 0 });
      }
      const stats = causas.get(causa)!;
      stats.abertos++;
      
      // Contar por tipo
      if (a.cod_tipo === 'Incidente') {
        stats.incidente++;
      } else {
        stats.solicitacao++;
      }
    });

    // Processar tickets FECHADOS
    ticketsFechados.forEach(a => {
      const causa = a.cod_resolucao || 'Sem Código de Resolução';
      if (!causas.has(causa)) {
        causas.set(causa, { incidente: 0, solicitacao: 0, abertos: 0, fechados: 0 });
      }
      const stats = causas.get(causa)!;
      stats.fechados++;
      
      // Contar por tipo (apenas se não foi contado nos abertos)
      // Na verdade, precisamos recontar porque um ticket pode estar em ambos
      if (a.cod_tipo === 'Incidente') {
        stats.incidente++;
      } else {
        stats.solicitacao++;
      }
    });

    const resultado = Array.from(causas.entries())
      .map(([origem, stats]) => ({
        origem,
        incidente: stats.incidente,
        solicitacao: stats.solicitacao,
        total: stats.incidente + stats.solicitacao,
        abertos: stats.abertos,
        fechados: stats.fechados
      }))
      .sort((a, b) => b.total - a.total);

    console.log('📊 Chamados agrupados por causa (cod_resolucao) - COM ABERTOS/FECHADOS:', {
      totalCausas: resultado.length,
      causas: resultado.map(c => ({
        causa: c.origem,
        incidente: c.incidente,
        solicitacao: c.solicitacao,
        total: c.total,
        abertos: c.abertos,
        fechados: c.fechados
      }))
    });

    return resultado;
  }

  /**
   * Agrupa BACKLOG (não fechados) por causa (cod_resolucao)
   * Usado na aba Backlog
   */
  private agruparBacklogPorCausa(backlog: any[]) {
    const causas = new Map<string, { incidente: number; solicitacao: number }>();

    backlog.forEach(a => {
      // Usar cod_resolucao como causa
      const causa = a.cod_resolucao || 'Sem Código de Resolução';
      if (!causas.has(causa)) {
        causas.set(causa, { incidente: 0, solicitacao: 0 });
      }
      const stats = causas.get(causa)!;
      
      // Usar cod_tipo para determinar se é Incidente ou Solicitação
      if (a.cod_tipo === 'Incidente') {
        stats.incidente++;
      } else {
        stats.solicitacao++;
      }
    });

    const resultado = Array.from(causas.entries())
      .map(([origem, stats]) => ({
        origem,
        incidente: stats.incidente,
        solicitacao: stats.solicitacao,
        total: stats.incidente + stats.solicitacao
      }))
      .sort((a, b) => b.total - a.total);

    console.log('📊 Backlog agrupado por causa (cod_resolucao):', {
      totalCausas: resultado.length,
      causas: resultado.map(c => ({
        causa: c.origem,
        incidente: c.incidente,
        solicitacao: c.solicitacao,
        total: c.total
      }))
    });

    return resultado;
  }

  /**
   * Agrupa backlog por grupo (nome_grupo)
   */
  private agruparPorGrupoBacklog(backlog: any[]) {
    const grupos = new Map<string, number>();

    backlog.forEach(a => {
      const grupo = a.nome_grupo || 'SEM GRUPO';
      grupos.set(grupo, (grupos.get(grupo) || 0) + 1);
    });

    return Array.from(grupos.entries())
      .map(([grupo, total]) => ({ grupo, total }))
      .sort((a, b) => b.total - a.total);
  }

  /**
   * Gera dados de SLA
   * MODIFICADO: Buscar dados reais de apontamentos_tickets_aranda
   * REGRA: SLA = (Total Incidentes - Violados) / Total Incidentes * 100
   * Só é elegível se Total Incidentes >= quantidade_minima_chamados_sla
   */
  private async gerarDadosSLA(
    empresaId: string,
    empresaNomeCompleto: string,
    mes: number,
    ano: number,
    requerimentos: any[],
    metaSLA: number,
    quantidadeMinimaIncidentes: number
  ): Promise<BookSLAData> {
    console.log('📊 Gerando dados de SLA...', {
      empresa: empresaNomeCompleto,
      mes,
      ano,
      periodo: `${String(mes).padStart(2, '0')}/${ano}`,
      metaSLA,
      quantidadeMinimaIncidentes
    });
    
    const dataInicio = new Date(ano, mes - 1, 1);
    const dataFim = new Date(ano, mes, 0, 23, 59, 59);
    const proximoMesInicio = new Date(ano, mes, 1);

    console.log('📅 Período SLA:', {
      empresa: empresaNomeCompleto,
      mes,
      ano,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString()
    });

    // FECHADOS: Todos os chamados fechados no mês (com data_solucao)
    const { data: ticketsFechados, error: errorFechados } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('*')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .gte('data_solucao', dataInicio.toISOString())
      .lt('data_solucao', proximoMesInicio.toISOString())
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

    if (errorFechados) {
      console.error('❌ Erro ao buscar tickets fechados:', errorFechados);
    }

    const fechados = (ticketsFechados || []).length;

    // INCIDENTES: Incidentes fechados no mês (base para cálculo do SLA)
    const incidentes = (ticketsFechados || []).filter(t => t.cod_tipo === 'Incidente').length;

    // INCIDENTES ELEGÍVEIS: Incidentes com cod_resolucao específicos para elegibilidade
    const codResolucaoElegiveis = [
      'Consultoria',
      'Consultoria – Solução Paliativa',
      'Consultoria – Banco de Dados',
      'Consultoria – Nota Publicada'
    ];
    
    const incidentesElegiveis = (ticketsFechados || []).filter(t => 
      t.cod_tipo === 'Incidente' && 
      codResolucaoElegiveis.includes(t.cod_resolucao)
    ).length;

    console.log('📊 Incidentes para elegibilidade:', {
      totalIncidentes: incidentes,
      incidentesElegiveis,
      codResolucaoElegiveis,
      amostra: (ticketsFechados || [])
        .filter(t => t.cod_tipo === 'Incidente')
        .slice(0, 5)
        .map(t => ({
          nro: t.nro_solicitacao,
          cod_resolucao: t.cod_resolucao,
          elegivel: codResolucaoElegiveis.includes(t.cod_resolucao)
        }))
    });

    // VIOLADOS: Chamados onde tds_cumprido = 'TDS Vencido'
    const { data: ticketsViolados, error: errorViolados } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('*')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .eq('tds_cumprido', 'TDS Vencido')
      .gte('data_abertura', dataInicio.toISOString())
      .lte('data_abertura', dataFim.toISOString())
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

    if (errorViolados) {
      console.error('❌ Erro ao buscar tickets violados:', errorViolados);
    }

    const violados = (ticketsViolados || []).length;
    
    // Verificar se os violados têm cod_resolucao elegível
    const violadosElegiveis = (ticketsViolados || []).filter(t => 
      codResolucaoElegiveis.includes(t.cod_resolucao)
    ).length;
    
    const violadosNaoElegiveis = violados - violadosElegiveis;

    console.log('📊 Violados por elegibilidade:', {
      totalViolados: violados,
      violadosElegiveis,
      violadosNaoElegiveis,
      amostra: (ticketsViolados || [])
        .slice(0, 5)
        .map(t => ({
          nro: t.nro_solicitacao,
          cod_resolucao: t.cod_resolucao,
          elegivel: codResolucaoElegiveis.includes(t.cod_resolucao)
        }))
    });

    console.log('✅ Dados SLA calculados:', {
      fechados,
      incidentes,
      incidentesElegiveis,
      violados,
      violadosElegiveis,
      violadosNaoElegiveis,
      quantidadeMinimaIncidentes,
      fonte: 'apontamentos_tickets_aranda'
    });

    // NOVA LÓGICA DE CÁLCULO DO SLA
    // SLA = (Incidentes - Violados) / Incidentes * 100
    // ELEGIBILIDADE = Incidentes com cod_resolucao específicos >= quantidade mínima
    let slaPercentual = 0;
    let status: 'no_prazo' | 'vencido' = 'no_prazo';
    let slaElegivel = true;
    let mensagemNaoElegivel = '';
    let mensagemVioladosNaoElegiveis = '';

    if (incidentes > 0) {
      slaPercentual = Math.round(((incidentes - violados) / incidentes) * 100);
      
      // Verificar se é elegível para avaliação (baseado em incidentes com cod_resolucao específicos)
      if (incidentesElegiveis < quantidadeMinimaIncidentes) {
        slaElegivel = false;
        mensagemNaoElegivel = 'Volume de chamados abaixo do mínimo contratual. O SLA não é elegível para avaliação neste período.';
        status = 'no_prazo'; // Não avalia como vencido se não for elegível
        console.log('⚠️ SLA NÃO ELEGÍVEL:', {
          incidentes,
          incidentesElegiveis,
          minimoRequerido: quantidadeMinimaIncidentes,
          mensagem: mensagemNaoElegivel
        });
      } else {
        // Elegível: verificar se está no prazo ou vencido
        status = slaPercentual >= metaSLA ? 'no_prazo' : 'vencido';
        console.log('✅ SLA ELEGÍVEL:', {
          incidentes,
          incidentesElegiveis,
          minimoRequerido: quantidadeMinimaIncidentes,
          percentual: slaPercentual,
          meta: metaSLA,
          status
        });
      }
      
      // Verificar se há violados não elegíveis
      if (violadosNaoElegiveis > 0) {
        mensagemVioladosNaoElegiveis = `${violadosNaoElegiveis} chamado(s) violado(s) não possui(em) código de resolução elegível para avaliação de SLA.`;
        console.log('⚠️ VIOLADOS NÃO ELEGÍVEIS:', {
          violadosNaoElegiveis,
          mensagem: mensagemVioladosNaoElegiveis
        });
      }
    } else {
      // Sem incidentes = 100% de SLA
      slaPercentual = 100;
      status = 'no_prazo';
    }

    // Histórico de SLA (últimos 5 meses: mês atual + 4 anteriores)
    const historicoSLA = await this.calcularSLAHistorico(
      empresaNomeCompleto,
      mes,
      ano,
      metaSLA,
      quantidadeMinimaIncidentes
    );

    // Detalhes dos chamados violados (top 10)
    const chamadosViolados = (ticketsViolados || []).slice(0, 10).map(t => ({
      id_chamado: t.nro_solicitacao,
      tipo: (t.cod_tipo === 'Incidente' ? 'Incidente' : 'Requisição') as 'Incidente' | 'Requisição',
      data_abertura: new Date(t.data_abertura).toLocaleDateString('pt-BR'),
      data_solucao: t.data_solucao 
        ? new Date(t.data_solucao).toLocaleDateString('pt-BR')
        : 'Pendente',
      grupo_atendedor: t.nome_grupo || 'N/A'
    }));

    return {
      sla_percentual: slaPercentual,
      meta_percentual: metaSLA,
      status: status,
      fechados: fechados,
      incidentes: incidentes,
      violados: violados,
      sla_historico: historicoSLA,
      chamados_violados: chamadosViolados,
      sla_elegivel: slaElegivel,
      mensagem_nao_elegivel: mensagemNaoElegivel,
      mensagem_violados_nao_elegiveis: mensagemVioladosNaoElegiveis
    };
  }

  /**
   * Gera dados vazios de SLA (fallback)
   */
  private gerarDadosSLAVazio(metaSLA: number): BookSLAData {
    return {
      sla_percentual: 0,
      meta_percentual: metaSLA,
      status: 'vencido',
      fechados: 0,
      incidentes: 0,
      violados: 0,
      sla_historico: [],
      chamados_violados: []
    };
  }

  /**
   * Gera dados de backlog
   * FILTRO APLICADO: Chamados em aberto (status NOT IN ('Closed', 'Resolved', 'Canceled'))
   * IMPORTANTE: item_configuracao IS NULL OU item_configuracao != '000000 - PROJETOS APL'
   * Conforme SQL de referência fornecido
   */
  private async gerarDadosBacklog(
    empresaNomeCompleto: string,
    mes: number,
    ano: number
  ): Promise<BookBacklogData> {
    console.log('📊 Buscando backlog (chamados em aberto):', {
      empresa: empresaNomeCompleto,
      filtros: {
        status: 'NOT IN (Closed, Resolved, Canceled)',
        cod_tipo: '!= Problema',
        item_configuracao: 'IS NULL OR != 000000 - PROJETOS APL',
        caso_pai: 'SIM',
        nome_grupo: 'NOT IN (AMS APL - TÉCNICO, CA SDM)'
      }
    });

    // Buscar tickets de backlog (chamados em aberto)
    // FILTRO CORRETO: item_configuracao IS NULL OU != '000000 - PROJETOS APL'
    const { data: ticketsBacklog, error } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('*')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .not('status', 'in', '("Closed","Resolved","Canceled")')
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

    if (error) {
      console.error('❌ Erro ao buscar backlog:', error);
    }

    const backlog = ticketsBacklog || [];
    
    console.log('📊 Backlog encontrado:', {
      total: backlog.length,
      incidentes: backlog.filter(t => t.cod_tipo === 'Incidente').length,
      solicitacoes: backlog.filter(t => t.cod_tipo !== 'Incidente').length,
      esperado: 11,
      diferenca: backlog.length - 11,
      amostra: backlog.slice(0, 5).map(t => ({
        nro: t.nro_solicitacao,
        status: t.status,
        cod_tipo: t.cod_tipo,
        data_abertura: t.data_abertura,
        item_configuracao: t.item_configuracao,
        nome_grupo: t.nome_grupo
      }))
    });

    const incidente = backlog.filter(r => r.cod_tipo === 'Incidente').length;
    const solicitacao = backlog.length - incidente;

    // Calcular aging (idade dos chamados baseado em data_abertura)
    const agingChamados = this.calcularAging(backlog);

    // Distribuição por grupo (nome_grupo)
    const distribuicaoPorGrupo = this.agruparPorGrupoBacklog(backlog).map(grupo => ({
      grupo: grupo.grupo,
      total: grupo.total,
      percentual: backlog.length > 0 
        ? Math.round((grupo.total / backlog.length) * 100)
        : 0
    }));

    // Backlog por causa (cod_resolucao)
    const backlogPorCausa = this.agruparBacklogPorCausa(backlog);

    console.log('✅ Dados de backlog processados:', {
      total: backlog.length,
      incidente,
      solicitacao,
      grupos: distribuicaoPorGrupo.length,
      causas: backlogPorCausa.length,
      faixasAging: agingChamados.length
    });

    return {
      total: backlog.length,
      incidente,
      solicitacao,
      aging_chamados: agingChamados,
      distribuicao_por_grupo: distribuicaoPorGrupo,
      backlog_por_causa: backlogPorCausa
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
   * Calcula aging dos chamados
   * CORRIGIDO: Usa campos corretos de apontamentos_tickets_aranda
   * - data_abertura (em vez de data_envio)
   * - cod_tipo (em vez de tipo_cobranca)
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

    console.log('📊 Calculando aging de', backlog.length, 'chamados...');

    backlog.forEach(r => {
      // Usar data_abertura (campo correto de apontamentos_tickets_aranda)
      if (!r.data_abertura) {
        console.warn('⚠️ Chamado sem data_abertura:', r.nro_solicitacao);
        return;
      }

      const dataAbertura = new Date(r.data_abertura);
      const diasAberto = Math.floor((hoje.getTime() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24));
      
      // Usar cod_tipo (campo correto de apontamentos_tickets_aranda)
      const isIncidente = r.cod_tipo === 'Incidente';

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

    console.log('✅ Aging calculado:', resultado);

    // Retornar TODAS as faixas (mesmo com total 0) para manter estrutura do gráfico
    return resultado;
  }

  /**
   * Calcula histórico de SLA dos últimos 5 meses (mês atual + 4 anteriores)
   * Busca dados reais de apontamentos_tickets_aranda
   * REGRA: SLA = (Incidentes - Violados) / Incidentes * 100
   */
  private async calcularSLAHistorico(
    empresaNomeCompleto: string,
    mesAtual: number,
    anoAtual: number,
    metaSLA: number,
    quantidadeMinimaIncidentes: number
  ) {
    console.log('📊 Calculando histórico de SLA (5 meses)...', {
      empresa: empresaNomeCompleto,
      mesAtual,
      anoAtual,
      quantidadeMinimaIncidentes
    });

    const MESES_NOMES = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
                         'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

    const resultado = [];

    // Calcular para os últimos 5 meses (mês atual + 4 anteriores)
    for (let i = 4; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes <= 0) {
        mes += 12;
        ano -= 1;
      }

      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59);
      const proximoMesInicio = new Date(ano, mes, 1);

      // Buscar tickets fechados do mês
      const { data: ticketsFechados } = await supabase
        .from('apontamentos_tickets_aranda')
        .select('*')
        .ilike('organizacao', `%${empresaNomeCompleto}%`)
        .gte('data_solucao', dataInicio.toISOString())
        .lt('data_solucao', proximoMesInicio.toISOString())
        .neq('cod_tipo', 'Problema')
        .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
        .eq('caso_pai', 'SIM')
        .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

      // Contar incidentes fechados
      const totalIncidentes = (ticketsFechados || []).filter(t => t.cod_tipo === 'Incidente').length;

      // Contar incidentes elegíveis (com cod_resolucao específicos)
      const codResolucaoElegiveis = [
        'Consultoria',
        'Consultoria – Solução Paliativa',
        'Consultoria – Banco de Dados',
        'Consultoria – Nota Publicada'
      ];
      
      const incidentesElegiveis = (ticketsFechados || []).filter(t => 
        t.cod_tipo === 'Incidente' && 
        codResolucaoElegiveis.includes(t.cod_resolucao)
      ).length;

      // Buscar tickets violados do mês
      const { data: ticketsViolados } = await supabase
        .from('apontamentos_tickets_aranda')
        .select('nro_solicitacao')
        .ilike('organizacao', `%${empresaNomeCompleto}%`)
        .eq('tds_cumprido', 'TDS Vencido')
        .gte('data_abertura', dataInicio.toISOString())
        .lte('data_abertura', dataFim.toISOString())
        .neq('cod_tipo', 'Problema')
        .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
        .eq('caso_pai', 'SIM')
        .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

      const totalViolados = (ticketsViolados || []).length;

      // Calcular percentual de SLA: (Incidentes - Violados) / Incidentes * 100
      let percentual = 0;
      let status: 'no_prazo' | 'vencido' = 'no_prazo';
      let elegivel = true;

      if (totalIncidentes > 0) {
        percentual = Math.round(((totalIncidentes - totalViolados) / totalIncidentes) * 100);
        
        // Verificar elegibilidade (baseado em incidentes com cod_resolucao específicos)
        elegivel = incidentesElegiveis >= quantidadeMinimaIncidentes;
        
        // Só avalia como vencido se for elegível (>= quantidade mínima)
        if (elegivel) {
          status = percentual >= metaSLA ? 'no_prazo' : 'vencido';
        } else {
          status = 'no_prazo'; // Não elegível = não avalia como vencido
        }
      } else {
        percentual = 100; // Sem incidentes = 100%
        status = 'no_prazo';
        elegivel = false; // Sem incidentes = não elegível
      }

      console.log(`📈 ${MESES_NOMES[mes - 1]}/${ano}:`, {
        incidentes: totalIncidentes,
        incidentesElegiveis,
        violados: totalViolados,
        percentual,
        status,
        elegivel
      });

      resultado.push({
        mes: MESES_NOMES[mes - 1],
        percentual,
        status,
        elegivel
      });
    }

    console.log('✅ Histórico SLA calculado:', resultado);
    return resultado;
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
