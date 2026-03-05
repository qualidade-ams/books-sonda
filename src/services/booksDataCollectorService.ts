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
        .select('nome_completo, nome_abreviado, meta_sla_percentual, tipo_contrato, quantidade_minima_chamados_sla, baseline_horas_mensal')
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

      // Converter baseline_horas_mensal (INTERVAL) para número decimal (horas)
      // INTERVAL vem como string no formato "HH:MM:SS" ou objeto
      let baselineHoras = 0;
      if (empresa.baseline_horas_mensal) {
        // Se vier como string "HH:MM:SS"
        if (typeof empresa.baseline_horas_mensal === 'string') {
          const parts = empresa.baseline_horas_mensal.split(':');
          if (parts.length >= 2) {
            const hours = parseInt(parts[0]) || 0;
            const minutes = parseInt(parts[1]) || 0;
            baselineHoras = hours + (minutes / 60);
          }
        } else if (typeof empresa.baseline_horas_mensal === 'object') {
          // Se vier como objeto com propriedades
          baselineHoras = (empresa.baseline_horas_mensal as any).hours || 0;
        }
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
          empresaId,
          empresa.nome_completo,
          empresa.nome_abreviado,
          mes,
          ano,
          tipoContratoValido,
          baselineHoras
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

    // Backlog = TODOS os chamados em aberto da empresa (mesmo critério da aba Backlog)
    // IMPORTANTE: Usa status em aberto (NOT IN Closed, Resolved, Canceled) em vez de data_solucao
    console.log('📊 Buscando backlog total (todos os chamados em aberto)...');
    const { data: ticketsBacklogTotal, error: errorBacklog } = await supabase
      .from('apontamentos_tickets_aranda')
      .select('nro_solicitacao')
      .ilike('organizacao', `%${empresaNomeCompleto}%`)
      .not('status', 'in', '("Closed","Resolved","Canceled")')
      .neq('cod_tipo', 'Problema')
      .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
      .eq('caso_pai', 'SIM')
      .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

    if (errorBacklog) {
      console.error('❌ Erro ao buscar backlog total:', errorBacklog);
    }

    const totalBacklog = (ticketsBacklogTotal || []).length;
    
    console.log('✅ Backlog total calculado:', {
      total: totalBacklog,
      criterio: 'status NOT IN (Closed, Resolved, Canceled)',
      alinhado_com: 'aba Backlog'
    });

    // Gerar dados do semestre (últimos 6 meses) - buscar dados reais
    const chamadosSemestre = await this.buscarChamadosSemestre(empresaNomeCompleto, mes, ano);

    // Agrupar por grupo - passar os tickets abertos e fechados separadamente
    const chamadosPorGrupo = await this.agruparPorGrupo(ticketsAbertos, ticketsFechados);

    // Taxa de resolução - baseada apenas em tickets
    const taxaResolucao = apontamentosTickets.length > 0
      ? Math.round((totalFechados / apontamentosTickets.length) * 100)
      : 0;

    // Chamados por causa - passar abertos e fechados separadamente
    const chamadosPorCausa = await this.agruparChamadosPorCausa(ticketsAbertos, ticketsFechados);

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
   * MAPEAMENTO: nome_grupo (apontamentos_tickets_aranda) → categoria (de_para_categoria) → grupo_book
   */
  private async agruparPorGrupo(ticketsAbertos: any[], ticketsFechados: any[]) {
    // Buscar mapeamento de categorias → grupo_book
    const mapeamento = await this.buscarMapeamentoGrupos();
    
    const grupos = new Map<string, { total: number; abertos: number; fechados: number }>();

    // Log de debug: Mostrar amostra de tickets e mapeamento
    console.log('🔍 DEBUG MAPEAMENTO - Amostra de tickets abertos:', {
      total: ticketsAbertos.length,
      amostra: ticketsAbertos.slice(0, 3).map(t => ({
        nro_solicitacao: t.nro_solicitacao,
        categoria: t.categoria,
        nome_grupo: t.nome_grupo,
        grupo_mapeado: mapeamento.get(t.categoria) || t.categoria
      }))
    });

    // Processar tickets abertos
    ticketsAbertos.forEach(a => {
      // MUDANÇA: Usar campo 'categoria' do ticket em vez de 'nome_grupo'
      const categoriaTicket = a.categoria || 'SEM CATEGORIA';
      // Mapear categoria → grupo_book usando de_para_categoria
      const grupoMapeado = mapeamento.get(categoriaTicket) || categoriaTicket;
      
      if (!grupos.has(grupoMapeado)) {
        grupos.set(grupoMapeado, { total: 0, abertos: 0, fechados: 0 });
      }
      const stats = grupos.get(grupoMapeado)!;
      stats.abertos++;
    });

    // Processar tickets fechados
    ticketsFechados.forEach(a => {
      // MUDANÇA: Usar campo 'categoria' do ticket em vez de 'nome_grupo'
      const categoriaTicket = a.categoria || 'SEM CATEGORIA';
      // Mapear categoria → grupo_book usando de_para_categoria
      const grupoMapeado = mapeamento.get(categoriaTicket) || categoriaTicket;
      
      if (!grupos.has(grupoMapeado)) {
        grupos.set(grupoMapeado, { total: 0, abertos: 0, fechados: 0 });
      }
      const stats = grupos.get(grupoMapeado)!;
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

    console.log('📊 Chamados agrupados por grupo (MAPEAMENTO: categoria → grupo_book):', {
      totalGrupos: gruposArray.length,
      totalAbertos: ticketsAbertos.length,
      totalFechados: ticketsFechados.length,
      mapeamentosAplicados: mapeamento.size,
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
   * MAPEAMENTO: cod_resolucao → categoria (de_para_categoria) → grupo_book
   */
  private async agruparChamadosPorCausa(ticketsAbertos: any[], ticketsFechados: any[]) {
    // Buscar mapeamento de categorias
    const mapeamento = await this.buscarMapeamentoGrupos();
    
    const causas = new Map<string, { 
      incidente: number; 
      solicitacao: number;
      abertos: number;
      fechados: number;
    }>();

    // Processar tickets ABERTOS
    ticketsAbertos.forEach(a => {
      const causaOriginal = a.cod_resolucao || 'Sem Código de Resolução';
      // Mapear cod_resolucao para grupo_book usando de_para_categoria
      const causaMapeada = mapeamento.get(causaOriginal) || causaOriginal;
      
      if (!causas.has(causaMapeada)) {
        causas.set(causaMapeada, { incidente: 0, solicitacao: 0, abertos: 0, fechados: 0 });
      }
      const stats = causas.get(causaMapeada)!;
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
      const causaOriginal = a.cod_resolucao || 'Sem Código de Resolução';
      // Mapear cod_resolucao para grupo_book usando de_para_categoria
      const causaMapeada = mapeamento.get(causaOriginal) || causaOriginal;
      
      if (!causas.has(causaMapeada)) {
        causas.set(causaMapeada, { incidente: 0, solicitacao: 0, abertos: 0, fechados: 0 });
      }
      const stats = causas.get(causaMapeada)!;
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

    console.log('📊 Chamados agrupados por causa (cod_resolucao) - COM MAPEAMENTO:', {
      totalCausas: resultado.length,
      mapeamentosAplicados: mapeamento.size,
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
   * MAPEAMENTO: cod_resolucao → categoria (de_para_categoria) → grupo_book
   */
  private async agruparBacklogPorCausa(backlog: any[]) {
    // Buscar mapeamento de categorias
    const mapeamento = await this.buscarMapeamentoGrupos();
    
    const causas = new Map<string, { incidente: number; solicitacao: number }>();

    backlog.forEach(a => {
      // Usar cod_resolucao como causa
      const causaOriginal = a.cod_resolucao || 'Sem Código de Resolução';
      // Mapear cod_resolucao para grupo_book usando de_para_categoria
      const causaMapeada = mapeamento.get(causaOriginal) || causaOriginal;
      
      if (!causas.has(causaMapeada)) {
        causas.set(causaMapeada, { incidente: 0, solicitacao: 0 });
      }
      const stats = causas.get(causaMapeada)!;
      
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

    console.log('📊 Backlog agrupado por causa (cod_resolucao) - COM MAPEAMENTO:', {
      totalCausas: resultado.length,
      mapeamentosAplicados: mapeamento.size,
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
   * MAPEAMENTO: categoria (apontamentos_tickets_aranda) → grupo_book (de_para_categoria)
   */
  private async agruparPorGrupoBacklog(backlog: any[]) {
    // Buscar mapeamento de categorias → grupo_book
    const mapeamento = await this.buscarMapeamentoGrupos();
    
    const grupos = new Map<string, number>();

    backlog.forEach(a => {
      // MUDANÇA: Usar campo 'categoria' do ticket em vez de 'nome_grupo'
      const categoriaTicket = a.categoria || 'SEM CATEGORIA';
      // Mapear categoria → grupo_book usando de_para_categoria
      const grupoMapeado = mapeamento.get(categoriaTicket) || categoriaTicket;
      grupos.set(grupoMapeado, (grupos.get(grupoMapeado) || 0) + 1);
    });

    const resultado = Array.from(grupos.entries())
      .map(([grupo, total]) => ({ grupo, total }))
      .sort((a, b) => b.total - a.total);

    console.log('📊 Backlog agrupado por grupo (MAPEAMENTO: categoria → grupo_book):', {
      totalGrupos: resultado.length,
      mapeamentosAplicados: mapeamento.size,
      grupos: resultado
    });

    return resultado;
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
        mensagemNaoElegivel = 'A quantidade mínima de chamados fechados de Incidente/Consultoria necessária para aplicação de penalidade é 7';
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
    const distribuicaoPorGrupo = (await this.agruparPorGrupoBacklog(backlog)).map(grupo => ({
      grupo: grupo.grupo,
      total: grupo.total,
      percentual: backlog.length > 0 
        ? Math.round((grupo.total / backlog.length) * 100)
        : 0
    }));

    // Backlog por causa (cod_resolucao)
    const backlogPorCausa = await this.agruparBacklogPorCausa(backlog);

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
   * Gera dados de consumo baseado no tipo de contrato
   * - tipo_contrato = 'horas': Busca de apontamentos_aranda
   * - tipo_contrato = 'tickets': Busca de apontamentos_tickets_aranda
   * - tipo_contrato = 'ambos': Busca de ambas as tabelas
   */
  private async gerarDadosConsumo(
    empresaId: string,
    empresaNomeCompleto: string,
    empresaNomeAbreviado: string,
    mes: number,
    ano: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos' | null,
    baselineHoras: number
  ): Promise<BookConsumoData> {
    console.log('📊 Gerando dados de consumo:', {
      empresa: empresaNomeCompleto,
      mes,
      ano,
      tipoContrato,
      baselineHoras
    });

    let horasTotal = 0;
    let horasIncidente = 0;
    let horasSolicitacao = 0;
    let totalRegistros = 0;
    let distribuicaoCausa: any[] = [];

    const dataInicio = new Date(ano, mes - 1, 1);
    const proximoMesInicio = new Date(ano, mes, 1);

    // Buscar dados baseado no tipo de contrato
    if (tipoContrato === 'horas' || tipoContrato === 'ambos') {
      // Buscar de apontamentos_aranda (horas)
      // IMPORTANTE: Usa nome_completo da tabela empresas_clientes para buscar em org_us_final
      // FILTROS CORRETOS: org_us_final, data_atividade, ativi_interna, tipo_chamado, item_configuracao, cod_resolucao
      console.log('🔍 Buscando apontamentos_aranda com nome_completo:', empresaNomeCompleto);
      console.log('📅 Período:', { dataInicio, proximoMesInicio });
      
      const { data: apontamentosHoras, error: errorApontamentos } = await supabase
        .from('apontamentos_aranda')
        .select('*')
        .ilike('org_us_final', `%${empresaNomeCompleto}%`)
        .eq('ativi_interna', 'Não')
        .in('tipo_chamado', ['IM', 'RF'])
        .neq('item_configuracao', '000000 - PROJETOS APL')
        .in('cod_resolucao', [
          'Alocação - T&M',
          'AMS SAP',
          'Aplicação de Nota / Licença - Contratados',
          'Consultoria',
          'Consultoria - Banco de Dados',
          'Consultoria - Nota Publicada',
          'Consultoria - Solução Paliativa',
          'Dúvida',
          'Erro de classificação na abertura',
          'Erro de programa específico (SEM SLA)',
          'Levantamento de Versão / Orçamento',
          'Monitoramento DBA',
          'Nota Publicada',
          'Parametrização / Cadastro',
          'Parametrização / Funcionalidade',
          'Validação de Arquivo'
        ])
        .gte('data_atividade', dataInicio.toISOString())
        .lt('data_atividade', proximoMesInicio.toISOString());

      if (errorApontamentos) {
        console.error('❌ Erro ao buscar apontamentos_aranda:', errorApontamentos);
      }

      console.log('📊 Resultado da busca apontamentos_aranda:', {
        total: apontamentosHoras?.length || 0,
        primeiros10: apontamentosHoras?.slice(0, 10).map(a => ({
          id: a.id,
          id_externo: a.id_externo,
          nro_chamado: a.nro_chamado,
          nro_tarefa: a.nro_tarefa,
          tempo_gasto_horas: a.tempo_gasto_horas,
          tempo_gasto_minutos: a.tempo_gasto_minutos,
          analista: a.analista_tarefa,
          data_atividade: a.data_atividade,
          tipo_chamado: a.tipo_chamado,
          ativi_interna: a.ativi_interna,
          item_configuracao: a.item_configuracao
        })),
        filtrosAplicados: {
          org_us_final: empresaNomeCompleto,
          ativi_interna: 'Não',
          tipo_chamado: ['IM', 'RF', 'PM'],
          item_configuracao_diferente_de: '000000 - PROJETOS APL',
          periodo: `${dataInicio.toISOString()} até ${proximoMesInicio.toISOString()}`
        }
      });

      if (apontamentosHoras && apontamentosHoras.length > 0) {
        // Calcular horas baseado em tempo_gasto_horas (formato: "HH:MM:SS" ou "HH:MM")
        // IMPORTANTE: Ignorar segundos, considerar apenas horas e minutos
        // SEPARAR por tipo_chamado: IM = Incidente, RF = Solicitação
        let detalhesConversao: any[] = [];
        let horasApontadasIncidente = 0;
        let horasApontadasSolicitacao = 0;
        
        const horasApontadas = apontamentosHoras.reduce((sum, a) => {
          const tempoStr = a.tempo_gasto_horas;
          
          if (!tempoStr) {
            console.log('⚠️ Registro sem tempo_gasto_horas:', {
              id: a.id,
              id_externo: a.id_externo,
              nro_chamado: a.nro_chamado,
              nro_tarefa: a.nro_tarefa,
              tempo_gasto_minutos: a.tempo_gasto_minutos
            });
            return sum;
          }
          
          // Converter formato "HH:MM:SS" ou "HH:MM" para horas decimais
          // IGNORANDO SEGUNDOS (apenas horas e minutos)
          const partes = tempoStr.split(':');
          const horas = parseInt(partes[0]) || 0;
          const minutos = parseInt(partes[1]) || 0;
          // Segundos são ignorados propositalmente (partes[2] não é usado)
          
          const totalHoras = horas + (minutos / 60);
          
          // Separar por tipo de chamado
          if (a.tipo_chamado === 'IM') {
            horasApontadasIncidente += totalHoras;
          } else if (a.tipo_chamado === 'RF') {
            horasApontadasSolicitacao += totalHoras;
          } else {
            // PM (Problema) ou outros tipos vão para solicitação
            horasApontadasSolicitacao += totalHoras;
          }
          
          detalhesConversao.push({
            nro_chamado: a.nro_chamado,
            nro_tarefa: a.nro_tarefa,
            tipo_chamado: a.tipo_chamado,
            tempo_original: tempoStr,
            horas_extraidas: horas,
            minutos_extraidos: minutos,
            segundos_ignorados: partes[2] || '0',
            horas_decimal: totalHoras.toFixed(4),
            analista: a.analista_tarefa,
            classificacao: a.tipo_chamado === 'IM' ? 'INCIDENTE' : 'SOLICITAÇÃO'
          });
          
          return sum + totalHoras;
        }, 0);

        // Somar aos totais gerais
        horasTotal += horasApontadas;
        horasIncidente += horasApontadasIncidente;
        horasSolicitacao += horasApontadasSolicitacao;
        totalRegistros += apontamentosHoras.length;

        console.log('✅ Horas de apontamentos_aranda:', {
          registros: apontamentosHoras.length,
          horasCalculadas: horasApontadas.toFixed(4),
          horasFormatadas: this.formatarHoras(horasApontadas),
          horasIncidente: horasApontadasIncidente.toFixed(4),
          horasSolicitacao: horasApontadasSolicitacao.toFixed(4),
          verificacao: `${horasApontadasIncidente.toFixed(4)} + ${horasApontadasSolicitacao.toFixed(4)} = ${(horasApontadasIncidente + horasApontadasSolicitacao).toFixed(4)} (deve ser igual a ${horasApontadas.toFixed(4)})`,
          somaManual: detalhesConversao.reduce((sum, d) => sum + parseFloat(d.horas_decimal), 0).toFixed(4),
          observacao: 'Segundos são ignorados, apenas horas e minutos são considerados',
          filtros: {
            org_us_final: empresaNomeCompleto,
            ativi_interna: 'Não',
            tipo_chamado: ['IM', 'RF', 'PM'],
            item_configuracao_excluido: '000000 - PROJETOS APL'
          }
        });

        // Log detalhado de TODOS os registros para debug
        console.log('🔍 DETALHAMENTO COMPLETO DOS REGISTROS:');
        console.table(detalhesConversao);
        
        console.log('📊 RESUMO DA CONVERSÃO:', {
          totalRegistros: detalhesConversao.length,
          somaHorasDecimais: detalhesConversao.reduce((sum, d) => sum + parseFloat(d.horas_decimal), 0).toFixed(4),
          horasIncidente: horasApontadasIncidente.toFixed(4) + ' horas',
          horasSolicitacao: horasApontadasSolicitacao.toFixed(4) + ' horas',
          horasTotal: horasApontadas.toFixed(4) + ' horas',
          registrosIncidente: detalhesConversao.filter(d => d.tipo_chamado === 'IM').length,
          registrosSolicitacao: detalhesConversao.filter(d => d.tipo_chamado === 'RF').length,
          registrosOutros: detalhesConversao.filter(d => d.tipo_chamado !== 'IM' && d.tipo_chamado !== 'RF').length
        });
      } else {
        console.log('⚠️ Nenhum apontamento encontrado em apontamentos_aranda para:', empresaNomeCompleto);
      }
    }

    if (tipoContrato === 'tickets' || tipoContrato === 'ambos') {
      // Buscar de apontamentos_tickets_aranda (tickets fechados)
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

      if (ticketsFechados && ticketsFechados.length > 0) {
        // Calcular horas de tickets usando tempo_gasto_dias, tempo_gasto_horas, tempo_gasto_minutos
        const horasTickets = ticketsFechados.reduce((sum, t) => {
          const dias = Number(t.tempo_gasto_dias) || 0;
          const horas = Number(t.tempo_gasto_horas) || 0;
          const minutos = Number(t.tempo_gasto_minutos) || 0;
          
          // Converter tudo para horas: (dias * 24) + horas + (minutos / 60)
          const totalHoras = (dias * 24) + horas + (minutos / 60);
          return sum + totalHoras;
        }, 0);

        // Separar por tipo
        const horasTicketsIncidente = ticketsFechados
          .filter(t => t.cod_tipo === 'Incidente')
          .reduce((sum, t) => {
            const dias = Number(t.tempo_gasto_dias) || 0;
            const horas = Number(t.tempo_gasto_horas) || 0;
            const minutos = Number(t.tempo_gasto_minutos) || 0;
            return sum + (dias * 24) + horas + (minutos / 60);
          }, 0);

        const horasTicketsSolicitacao = horasTickets - horasTicketsIncidente;

        horasTotal += horasTickets;
        horasIncidente += horasTicketsIncidente;
        horasSolicitacao += horasTicketsSolicitacao;
        totalRegistros += ticketsFechados.length;

        // Distribuição por causa (cod_resolucao)
        const causasMap = new Map<string, number>();
        ticketsFechados.forEach(t => {
          const causa = t.cod_resolucao || 'SEM CAUSA';
          causasMap.set(causa, (causasMap.get(causa) || 0) + 1);
        });

        distribuicaoCausa = Array.from(causasMap.entries()).map(([causa, quantidade]) => ({
          causa,
          quantidade,
          percentual: totalRegistros > 0 ? Math.round((quantidade / totalRegistros) * 100) : 0
        }));

        console.log('✅ Horas de apontamentos_tickets_aranda:', {
          registros: ticketsFechados.length,
          horas: horasTickets,
          incidente: horasTicketsIncidente,
          solicitacao: horasTicketsSolicitacao
        });
      }
    }

    // Calcular percentual consumido
    const percentualConsumido = baselineHoras > 0
      ? Math.round((horasTotal / baselineHoras) * 100)
      : 0;

    // Calcular percentuais individuais de incidente e solicitação
    const percentualIncidente = horasTotal > 0
      ? Math.round((horasIncidente / horasTotal) * 100)
      : 0;
    
    const percentualSolicitacao = horasTotal > 0
      ? Math.round((horasSolicitacao / horasTotal) * 100)
      : 0;

    // Verificação de consistência
    const somaVerificacao = horasIncidente + horasSolicitacao;
    const diferencaVerificacao = Math.abs(horasTotal - somaVerificacao);
    
    if (diferencaVerificacao > 0.01) {
      console.warn('⚠️ INCONSISTÊNCIA DETECTADA:', {
        horasTotal: horasTotal.toFixed(4),
        horasIncidente: horasIncidente.toFixed(4),
        horasSolicitacao: horasSolicitacao.toFixed(4),
        soma: somaVerificacao.toFixed(4),
        diferenca: diferencaVerificacao.toFixed(4)
      });
    } else {
      console.log('✅ VERIFICAÇÃO OK: Incidente + Solicitação = Total', {
        horasIncidente: horasIncidente.toFixed(4),
        horasSolicitacao: horasSolicitacao.toFixed(4),
        soma: somaVerificacao.toFixed(4),
        horasTotal: horasTotal.toFixed(4)
      });
    }

    // Histórico de consumo (últimos 6 meses)
    const historicoConsumo = await this.calcularHistoricoConsumoReal(
      empresaNomeCompleto,
      mes,
      ano,
      tipoContrato
    );

    // Histórico de requerimentos (últimos 6 meses)
    const historicoRequerimentos = await this.calcularHistoricoRequerimentos(
      empresaId,
      mes,
      ano
    );

    // Mesclar histórico de consumo com histórico de requerimentos
    const historicoCompleto = historicoConsumo.map((consumo, index) => ({
      ...consumo,
      requerimentos_horas: historicoRequerimentos[index]?.requerimentos_horas || '00:00',
      requerimentos_valor_numerico: historicoRequerimentos[index]?.requerimentos_valor_numerico || 0
    }));

    console.log('✅ Dados de consumo calculados:', {
      horasTotal: horasTotal.toFixed(2),
      horasTotalFormatado: this.formatarHoras(horasTotal),
      horasIncidente: horasIncidente.toFixed(2),
      horasSolicitacao: horasSolicitacao.toFixed(2),
      percentualIncidente: percentualIncidente + '%',
      percentualSolicitacao: percentualSolicitacao + '%',
      baselineHoras: baselineHoras.toFixed(2),
      percentualConsumido,
      totalRegistros,
      empresa: empresaNomeCompleto,
      periodo: `${mes}/${ano}`
    });

    // Buscar requerimentos descontados do período
    const requerimentosDescontados = await this.buscarRequerimentosDescontados(
      empresaId,
      mes,
      ano
    );

    return {
      horas_consumo: this.formatarHoras(horasTotal),
      baseline_apl: this.formatarHoras(baselineHoras),
      incidente: horasIncidente > 0 ? this.formatarHoras(horasIncidente) : '--',
      solicitacao: this.formatarHoras(horasSolicitacao),
      percentual_consumido: percentualConsumido,
      percentual_incidente: percentualIncidente,
      percentual_solicitacao: percentualSolicitacao,
      historico_consumo: historicoCompleto,
      distribuicao_causa: distribuicaoCausa.length > 0 ? distribuicaoCausa : [
        { causa: 'SEM DADOS', quantidade: 0, percentual: 0 }
      ],
      requerimentos_descontados: requerimentosDescontados,
      total_geral: totalRegistros
    };
  }

  /**
   * Busca requerimentos descontados do banco de horas no período
   * IMPORTANTE: O book do mês X mostra requerimentos do mês X
   * Exemplo: Book de Janeiro/2026 mostra requerimentos de Janeiro/2026
   */
  private async buscarRequerimentosDescontados(
    empresaId: string,
    mes: number,
    ano: number
  ) {
    try {
      // Buscar requerimentos do MESMO mês do book
      const mesCobranca = `${String(mes).padStart(2, '0')}/${ano}`;
      
      console.log('🔍 Buscando requerimentos descontados:', {
        empresaId,
        mesBook: `${String(mes).padStart(2, '0')}/${ano}`,
        mesRequerimento: mesCobranca,
        observacao: 'Book do mês X mostra requerimentos do mês X'
      });

      // Buscar diretamente por cliente_id - APENAS BANCO DE HORAS
      const { data: requerimentos, error } = await supabase
        .from('requerimentos')
        .select('*')
        .eq('cliente_id', empresaId)
        .eq('mes_cobranca', mesCobranca)
        .eq('tipo_cobranca', 'Banco de Horas')
        .in('status', ['enviado_faturamento', 'faturado', 'concluido'])
        .order('data_envio_faturamento', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar requerimentos:', error);
        return [];
      }

      console.log('✅ Requerimentos encontrados:', requerimentos?.length || 0);

      return (requerimentos || []).map(req => {
        console.log(`\n🔍 Processando requerimento ${req.chamado}:`, {
          horas_funcional_raw: req.horas_funcional,
          horas_funcional_type: typeof req.horas_funcional,
          horas_tecnico_raw: req.horas_tecnico,
          horas_tecnico_type: typeof req.horas_tecnico
        });

        // Converter horas para decimal (pode vir como número ou string HH:MM)
        let horasFuncional = 0;
        let horasTecnico = 0;
        
        // Processar horas_funcional
        if (req.horas_funcional) {
          const horasFuncionalValue = req.horas_funcional as string | number;
          if (typeof horasFuncionalValue === 'string' && horasFuncionalValue.includes(':')) {
            // Formato HH:MM
            const [h, m] = horasFuncionalValue.split(':').map(Number);
            horasFuncional = h + (m / 60);
            console.log(`  ✅ horas_funcional (HH:MM): ${horasFuncionalValue} → ${horasFuncional.toFixed(2)}h`);
          } else {
            // Formato decimal
            horasFuncional = Number(horasFuncionalValue) || 0;
            console.log(`  ✅ horas_funcional (decimal): ${horasFuncionalValue} → ${horasFuncional.toFixed(2)}h`);
          }
        } else {
          console.log(`  ⚠️ horas_funcional: null/undefined`);
        }
        
        // Processar horas_tecnico
        if (req.horas_tecnico) {
          const horasTecnicoValue = req.horas_tecnico as string | number;
          if (typeof horasTecnicoValue === 'string' && horasTecnicoValue.includes(':')) {
            // Formato HH:MM
            const [h, m] = horasTecnicoValue.split(':').map(Number);
            horasTecnico = h + (m / 60);
            console.log(`  ✅ horas_tecnico (HH:MM): ${horasTecnicoValue} → ${horasTecnico.toFixed(2)}h`);
          } else {
            // Formato decimal
            horasTecnico = Number(horasTecnicoValue) || 0;
            console.log(`  ✅ horas_tecnico (decimal): ${horasTecnicoValue} → ${horasTecnico.toFixed(2)}h`);
          }
        } else {
          console.log(`  ⚠️ horas_tecnico: null/undefined`);
        }
        
        const totalHorasDecimal = horasFuncional + horasTecnico;
        
        // Formatar total como HH:MM
        const totalHorasFormatado = totalHorasDecimal > 0 
          ? this.formatarHoras(totalHorasDecimal)
          : '00:00';
        
        console.log(`  📊 TOTAL: ${totalHorasDecimal.toFixed(2)}h → ${totalHorasFormatado}\n`);
        
        return {
          id: req.id,
          numero_chamado: req.chamado || '--',
          cliente: req.cliente_id || '--',
          modulo: req.modulo || '--',
          tipo_cobranca: req.tipo_cobranca || '--',
          horas_funcional: req.horas_funcional?.toString() || '00:00',
          horas_tecnica: req.horas_tecnico?.toString() || '00:00',
          total_horas: totalHorasFormatado,
          tickets: 0,
          data_envio: req.data_envio_faturamento || null,
          data_aprovacao: req.data_aprovacao || null,
          valor_total: req.valor_total_funcional && req.valor_total_tecnico
            ? (Number(req.valor_total_funcional) || 0) + (Number(req.valor_total_tecnico) || 0)
            : 0,
          periodo_cobranca: req.mes_cobranca || mesCobranca
        };
      });
    } catch (error) {
      console.error('❌ Erro ao buscar requerimentos descontados:', error);
      return [];
    }
  }

  /**
   * Gera dados de pesquisa
   * 
   * REGRA DE NEGÓCIO:
   * - Busca pesquisas pelo campo data_fechamento (mês/ano do book)
   * - Pesquisas com data_resposta preenchido = RESPONDIDAS
   * - Pesquisas com data_resposta NULL = NÃO RESPONDIDAS
   * - EXCLUI grupos: "AMS APL - TÉCNICO" e "CA SDM"
   * - EXCLUI tipo_caso: "PM"
   */
  private async gerarDadosPesquisa(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<BookPesquisaData> {
    console.log('📊 Buscando dados de pesquisa:', { empresaId, mes, ano });

    try {
      // 1. Buscar nome completo da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('nome_completo')
        .eq('id', empresaId)
        .single();

      if (empresaError || !empresaData) {
        console.error('❌ Erro ao buscar empresa:', empresaError);
        return this.retornarDadosPesquisaVazios();
      }

      const nomeCompletoEmpresa = empresaData.nome_completo;
      console.log('🏢 Nome completo da empresa:', nomeCompletoEmpresa);

      // 2. Calcular intervalo de datas do mês do book (data_fechamento)
      const dataInicio = new Date(ano, mes - 1, 1); // Primeiro dia do mês
      const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999); // Último dia do mês

      console.log('📅 Período de busca (data_fechamento):', {
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString()
      });
      console.log('🚫 Grupos excluídos: "AMS APL - TÉCNICO", "CA SDM"');
      console.log('🚫 Tipo de caso excluído: "PM"');

      // 3. Buscar todas as pesquisas da empresa no período (data_fechamento)
      // Excluindo grupos "AMS APL - TÉCNICO" e "CA SDM"
      // Excluindo tipo_caso "PM"
      const { data: pesquisas, error: pesquisasError } = await supabase
        .from('pesquisas_satisfacao')
        .select('*')
        .eq('empresa', nomeCompletoEmpresa)
        .gte('data_fechamento', dataInicio.toISOString())
        .lte('data_fechamento', dataFim.toISOString())
        .not('grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")')
        .neq('tipo_caso', 'PM');

      if (pesquisasError) {
        console.error('❌ Erro ao buscar pesquisas:', pesquisasError);
        return this.retornarDadosPesquisaVazios();
      }

      console.log(`📋 Total de pesquisas encontradas (data_fechamento): ${pesquisas?.length || 0}`);

      // Se não houver pesquisas, retornar dados vazios
      if (!pesquisas || pesquisas.length === 0) {
        return this.retornarDadosPesquisaVazios();
      }

      // 4. Separar pesquisas respondidas e não respondidas (baseado em data_resposta)
      const pesquisasRespondidas = pesquisas.filter(p => p.data_resposta !== null);
      const pesquisasNaoRespondidas = pesquisas.filter(p => p.data_resposta === null);

      console.log('✅ Pesquisas respondidas (data_resposta preenchido):', pesquisasRespondidas.length);
      console.log('⏳ Pesquisas não respondidas (data_resposta NULL):', pesquisasNaoRespondidas.length);

      // 5. Calcular percentual de aderência
      const percentualAderencia = pesquisas.length > 0 
        ? (pesquisasRespondidas.length / pesquisas.length) * 100 
        : 0;

      // 6. Calcular nível de satisfação (apenas das respondidas)
      const nivelSatisfacao = {
        insatisfeito: 0,
        neutro: 0,
        satisfeito: 0
      };

      pesquisasRespondidas.forEach(p => {
        const resposta = p.resposta?.toLowerCase() || '';
        
        if (resposta.includes('insatisfeito') || resposta.includes('ruim') || resposta.includes('péssimo')) {
          nivelSatisfacao.insatisfeito++;
        } else if (resposta.includes('neutro') || resposta.includes('regular') || resposta.includes('médio')) {
          nivelSatisfacao.neutro++;
        } else if (resposta.includes('satisfeito') || resposta.includes('bom') || resposta.includes('ótimo') || resposta.includes('excelente')) {
          nivelSatisfacao.satisfeito++;
        }
      });

      // 7. Montar resumo de pesquisas (apenas as respondidas)
      const resumoPesquisas = pesquisasRespondidas.map(p => ({
        chamado: p.nro_caso || 'N/A',
        tipo: (p.tipo_caso === 'Incidente' ? 'Incidente' : 'Requisição') as 'Incidente' | 'Requisição',
        solicitante: p.solicitante || 'N/A',
        grupo: p.grupo || 'N/A',
        resposta: p.resposta || null
      }));

      console.log('📊 Estatísticas calculadas (baseado em data_fechamento):', {
        total: pesquisas.length,
        respondidas: pesquisasRespondidas.length,
        naoRespondidas: pesquisasNaoRespondidas.length,
        percentualAderencia: percentualAderencia.toFixed(1) + '%',
        nivelSatisfacao
      });

      return {
        pesquisas_respondidas: pesquisasRespondidas.length,
        pesquisas_nao_respondidas: pesquisasNaoRespondidas.length,
        pesquisas_enviadas: pesquisas.length,
        resumo_pesquisas: resumoPesquisas,
        percentual_aderencia: percentualAderencia,
        nivel_satisfacao: nivelSatisfacao,
        sem_avaliacoes: pesquisasRespondidas.length === 0
      };

    } catch (error) {
      console.error('❌ Erro ao gerar dados de pesquisa:', error);
      return this.retornarDadosPesquisaVazios();
    }
  }

  /**
   * Retorna estrutura de dados de pesquisa vazia
   */
  private retornarDadosPesquisaVazios(): BookPesquisaData {
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
   * Calcula histórico de consumo (método antigo - mantido para compatibilidade)
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
   * Calcula histórico de consumo real dos últimos 6 meses
   * Busca de apontamentos_aranda e/ou apontamentos_tickets_aranda baseado no tipo_contrato
   */
  private async calcularHistoricoConsumoReal(
    empresaNomeCompleto: string,
    mesAtual: number,
    anoAtual: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos' | null
  ) {
    const MESES_NOMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 
                         'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    const resultado = [];

    // Calcular para os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes <= 0) {
        mes += 12;
        ano -= 1;
      }

      const dataInicio = new Date(ano, mes - 1, 1);
      const proximoMesInicio = new Date(ano, mes, 1);

      let horasMes = 0;

      // Buscar de apontamentos_aranda se necessário
      if (tipoContrato === 'horas' || tipoContrato === 'ambos') {
        console.log(`🔍 Buscando histórico apontamentos_aranda (${MESES_NOMES[mes - 1]}/${ano}) com nome_completo:`, empresaNomeCompleto);
        
        const { data: apontamentosHoras } = await supabase
          .from('apontamentos_aranda')
          .select('tempo_gasto_minutos')
          .ilike('org_us_final', `%${empresaNomeCompleto}%`)
          .eq('ativi_interna', 'Não')
          .in('tipo_chamado', ['IM', 'RF'])
          .neq('item_configuracao', '000000 - PROJETOS APL')
          .in('cod_resolucao', [
            'Alocação - T&M',
            'AMS SAP',
            'Aplicação de Nota / Licença - Contratados',
            'Consultoria',
            'Consultoria - Banco de Dados',
            'Consultoria - Nota Publicada',
            'Consultoria - Solução Paliativa',
            'Dúvida',
            'Erro de classificação na abertura',
            'Erro de programa específico (SEM SLA)',
            'Levantamento de Versão / Orçamento',
            'Monitoramento DBA',
            'Nota Publicada',
            'Parametrização / Cadastro',
            'Parametrização / Funcionalidade',
            'Validação de Arquivo'
          ])
          .gte('data_atividade', dataInicio.toISOString())
          .lt('data_atividade', proximoMesInicio.toISOString());

        if (apontamentosHoras) {
          const horasApontadas = apontamentosHoras.reduce((sum, a) => {
            const minutos = a.tempo_gasto_minutos || 0;
            const horas = minutos / 60;
            return sum + horas;
          }, 0);
          horasMes += horasApontadas;
          
          console.log(`✅ ${MESES_NOMES[mes - 1]}/${ano}: ${apontamentosHoras.length} registros, ${horasApontadas.toFixed(2)}h`);
        }
      }

      // Buscar de apontamentos_tickets_aranda se necessário
      if (tipoContrato === 'tickets' || tipoContrato === 'ambos') {
        const { data: ticketsFechados } = await supabase
          .from('apontamentos_tickets_aranda')
          .select('tempo_gasto_dias, tempo_gasto_horas, tempo_gasto_minutos')
          .ilike('organizacao', `%${empresaNomeCompleto}%`)
          .gte('data_solucao', dataInicio.toISOString())
          .lt('data_solucao', proximoMesInicio.toISOString())
          .neq('cod_tipo', 'Problema')
          .or('item_configuracao.is.null,item_configuracao.neq.000000 - PROJETOS APL')
          .eq('caso_pai', 'SIM')
          .not('nome_grupo', 'in', '("AMS APL - TÉCNICO","CA SDM")');

        if (ticketsFechados) {
          const horasTickets = ticketsFechados.reduce((sum, t) => {
            const dias = Number(t.tempo_gasto_dias) || 0;
            const horas = Number(t.tempo_gasto_horas) || 0;
            const minutos = Number(t.tempo_gasto_minutos) || 0;
            
            // Converter tudo para horas: (dias * 24) + horas + (minutos / 60)
            return sum + (dias * 24) + horas + (minutos / 60);
          }, 0);
          horasMes += horasTickets;
        }
      }

      resultado.push({
        mes: MESES_NOMES[mes - 1],
        horas: this.formatarHoras(horasMes),
        valor_numerico: Math.round(horasMes * 100) / 100
      });
    }

    console.log('📈 Histórico de consumo calculado:', {
      empresa: empresaNomeCompleto,
      tipoContrato,
      meses: resultado.length,
      dados: resultado
    });

    return resultado;
  }

  /**
   * Calcula histórico de requerimentos consumidos dos últimos 6 meses
   * Busca requerimentos da tabela requerimentos com status enviado/faturado/concluído
   * IMPORTANTE: Requerimentos do mês X aparecem no gráfico do mês X
   * Exemplo: Requerimentos de Dezembro/2025 aparecem no ponto de Dezembro/2025
   */
  private async calcularHistoricoRequerimentos(
    empresaId: string,
    mesAtual: number,
    anoAtual: number
  ) {
    const MESES_NOMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 
                         'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    
    const resultado = [];

    // Calcular para os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes <= 0) {
        mes += 12;
        ano -= 1;
      }

      // Buscar requerimentos do MESMO mês (não do mês anterior)
      const mesCobranca = `${String(mes).padStart(2, '0')}/${ano}`;

      console.log(`🔍 Buscando histórico requerimentos para ${MESES_NOMES[mes - 1]}/${ano} (mes_cobranca: ${mesCobranca}) - empresaId:`, empresaId);
      
      // Buscar diretamente por cliente_id - APENAS BANCO DE HORAS
      const { data: requerimentos } = await supabase
        .from('requerimentos')
        .select('horas_funcional, horas_tecnico')
        .eq('cliente_id', empresaId)
        .eq('mes_cobranca', mesCobranca)
        .eq('tipo_cobranca', 'Banco de Horas')
        .in('status', ['enviado_faturamento', 'faturado', 'concluido']);

      let horasMes = 0;

      if (requerimentos && requerimentos.length > 0) {
        horasMes = requerimentos.reduce((sum, req) => {
          const horasFuncional = Number(req.horas_funcional) || 0;
          const horasTecnico = Number(req.horas_tecnico) || 0;
          return sum + horasFuncional + horasTecnico;
        }, 0);
        
        console.log(`✅ ${MESES_NOMES[mes - 1]}/${ano}: ${requerimentos.length} requerimentos (de ${mesCobranca}), ${horasMes.toFixed(2)}h`);
      } else {
        console.log(`⚠️ ${MESES_NOMES[mes - 1]}/${ano}: Nenhum requerimento encontrado (buscou ${mesCobranca})`);
      }

      resultado.push({
        mes: MESES_NOMES[mes - 1],
        requerimentos_horas: this.formatarHoras(horasMes),
        requerimentos_valor_numerico: Math.round(horasMes * 100) / 100
      });
    }

    console.log('📈 Histórico de requerimentos calculado:', {
      empresaId,
      meses: resultado.length,
      dados: resultado
    });

    return resultado;
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
   * IMPORTANTE: Não calcula segundos pois estamos ignorando-os na entrada
   */
  private formatarHoras(horasDecimal: number): string {
    const horas = Math.floor(horasDecimal);
    const minutos = Math.round((horasDecimal - horas) * 60); // Arredondar minutos
    
    return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:00`;
  }

  /**
   * Cache para mapeamento de grupos (válido por 5 minutos)
   */
  private mapeamentoCache: Map<string, string> | null = null;
  private mapeamentoCacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /**
   * Busca mapeamento de categorias da tabela de_para_categoria
   * Mapeia tanto nome_grupo quanto cod_resolucao para grupo_book
   * 
   * REGRAS DE MAPEAMENTO:
   * 1. nome_grupo (apontamentos_tickets_aranda) → categoria (de_para_categoria) → grupo (retornado)
   * 2. cod_resolucao (apontamentos_tickets_aranda) → categoria (de_para_categoria) → grupo (retornado)
   * 
   * Cache de 5 minutos para otimizar performance
   */
  private async buscarMapeamentoGrupos(): Promise<Map<string, string>> {
    const agora = Date.now();
    
    // Verificar se cache é válido
    if (this.mapeamentoCache && (agora - this.mapeamentoCacheTimestamp) < this.CACHE_DURATION) {
      console.log('✅ Usando cache de mapeamento de grupos');
      return this.mapeamentoCache;
    }

    console.log('🔍 Buscando mapeamento de grupos da tabela de_para_categoria...');

    try {
      const { data: categorias, error } = await supabase
        .from('de_para_categoria')
        .select('*')
        .eq('status', 'ativa');

      if (error) {
        console.error('❌ Erro ao buscar mapeamento de categorias:', error);
        return new Map();
      }

      const mapeamento = new Map<string, string>();
      
      (categorias || []).forEach((cat: any) => {
        // Mapear categoria → grupo_book
        if (cat.categoria && cat.grupo_book) {
          mapeamento.set(cat.categoria, cat.grupo_book);
        }
      });

      // Atualizar cache
      this.mapeamentoCache = mapeamento;
      this.mapeamentoCacheTimestamp = agora;

      console.log('✅ Mapeamento de grupos carregado (categoria → grupo_book):', {
        totalMapeamentos: mapeamento.size,
        exemplos: Array.from(mapeamento.entries()).slice(0, 5).map(([cat, grupo]) => ({
          categoria: cat,
          grupo_book: grupo
        }))
      });

      return mapeamento;
    } catch (error) {
      console.error('❌ Erro ao buscar mapeamento:', error);
      return new Map();
    }
  }
}

export const booksDataCollectorService = new BooksDataCollectorService();
