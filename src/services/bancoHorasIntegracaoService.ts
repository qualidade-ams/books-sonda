import { supabase } from '@/integrations/supabase/client';
import { converterParaHorasDecimal, converterDeHorasDecimal } from '@/utils/horasUtils';

/**
 * Erro de integração com sistemas externos
 */
export class IntegrationError extends Error {
  constructor(
    public source: string,
    public message: string,
    public code: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

/**
 * Resultado da validação de dados integrados
 */
export interface ValidationResult {
  valido: boolean;
  erros: string[];
  avisos?: string[];
}

/**
 * Serviço de integração com sistemas externos para Banco de Horas
 * 
 * Responsável por buscar dados de:
 * - Apontamentos Aranda (consumo de horas/tickets)
 * - Requerimentos (horas faturadas)
 * - Validação de integridade dos dados
 * 
 * @requirements 6.5, 6.6, 14.1-14.10
 */
export class BancoHorasIntegracaoService {
  /**
   * Busca consumo de tickets de apontamentos Aranda (tabela AMSticketsabertos)
   * 
   * Conta tickets FECHADOS onde data_fechamento está dentro do período especificado.
   * Apenas tickets com status "Closed" são contabilizados como consumo.
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Número de tickets consumidos (fechados no período)
   * 
   * @requirements 6.5, 14.1, 14.2
   * @property Property 22: Consumo de Tickets Aranda
   * 
   * @throws IntegrationError quando tickets indisponíveis
   */
  async buscarConsumoTickets(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<number> {
    try {
      console.log('🎫 BancoHorasIntegracaoService.buscarConsumoTickets:', {
        empresaId,
        mes,
        ano
      });

      // Validar parâmetros
      if (!empresaId?.trim()) {
        throw new IntegrationError(
          'apontamentos_tickets_aranda',
          'ID da empresa é obrigatório',
          'INVALID_EMPRESA_ID',
          false
        );
      }

      if (mes < 1 || mes > 12) {
        throw new IntegrationError(
          'apontamentos_tickets_aranda',
          'Mês deve estar entre 1 e 12',
          'INVALID_MONTH',
          false
        );
      }

      if (ano < 2020) {
        throw new IntegrationError(
          'apontamentos_tickets_aranda',
          'Ano deve ser maior ou igual a 2020',
          'INVALID_YEAR',
          false
        );
      }

      // Buscar nome da empresa para filtrar tickets
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('nome_abreviado, nome_completo')
        .eq('id', empresaId)
        .single();

      if (empresaError || !empresa) {
        throw new IntegrationError(
          'empresas_clientes',
          `Empresa não encontrada: ${empresaError?.message || 'ID inválido'}`,
          'EMPRESA_NOT_FOUND',
          false
        );
      }

      // Calcular data de início e fim do mês
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);

      console.log('📅 Período de busca de tickets:', {
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
        empresaNome: empresa.nome_abreviado || empresa.nome_completo,
        observacao: 'Usando data_fechamento para contabilizar tickets consumidos. Campo: organizacao. Status: Closed'
      });

      // Buscar tickets onde:
      // - organizacao = nome da empresa (abreviado ou completo)
      // - data_fechamento dentro do período (tickets fechados no mês)
      // - status = 'Closed' (apenas tickets efetivamente fechados)
      
      // Construir query base (usando any para evitar problemas de tipo com tabela externa)
      let query = supabase
        .from('apontamentos_tickets_aranda' as any)
        .select('nro_solicitacao, status, organizacao, data_fechamento')
        .gte('data_fechamento', dataInicio.toISOString())
        .lte('data_fechamento', dataFim.toISOString())
        .eq('status', 'Closed'); // Status em inglês: Closed

      // Adicionar filtro de organizacao (nome abreviado OU nome completo)
      const nomeAbreviado = empresa.nome_abreviado;
      const nomeCompleto = empresa.nome_completo;
      
      if (nomeAbreviado && nomeCompleto) {
        query = query.or(`organizacao.ilike.%${nomeAbreviado}%,organizacao.ilike.%${nomeCompleto}%`);
      } else if (nomeAbreviado) {
        query = query.ilike('organizacao', `%${nomeAbreviado}%`);
      } else if (nomeCompleto) {
        query = query.ilike('organizacao', `%${nomeCompleto}%`);
      }

      // Executar query
      const { data: tickets, error: ticketsError } = await query as any;

      if (ticketsError) {
        console.error('❌ Erro ao buscar tickets:', ticketsError);
        throw new IntegrationError(
          'apontamentos_tickets_aranda',
          `Falha ao buscar tickets: ${ticketsError.message}`,
          'TICKETS_QUERY_ERROR',
          true
        );
      }

      const totalTickets = tickets?.length || 0;

      console.log('✅ Tickets encontrados:', {
        quantidade: totalTickets,
        filtros: {
          organizacao: nomeAbreviado || nomeCompleto,
          data_fechamento_inicio: dataInicio.toISOString(),
          data_fechamento_fim: dataFim.toISOString(),
          status: 'Closed'
        },
        tickets: tickets?.slice(0, 5).map((t: any) => ({
          nro_solicitacao: t.nro_solicitacao,
          organizacao: t.organizacao,
          status: t.status,
          data_fechamento: t.data_fechamento
        })) // Mostrar apenas primeiros 5 para debug
      });

      return totalTickets;
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      console.error('❌ Erro inesperado ao buscar tickets:', error);
      throw new IntegrationError(
        'apontamentos_tickets_aranda',
        `Erro inesperado ao buscar tickets: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'UNEXPECTED_ERROR',
        true
      );
    }
  }

  /**
   * Busca consumo de horas/tickets de apontamentos Aranda
   * 
   * Soma tempo_gasto_horas onde:
   * - ativi_interna = "Não"
   * - item_configuracao != "000000 - PROJETOS APL"
   * - tipo_chamado != "PM"
   * - data_atividade e data_sistema no mesmo mês
   * - cod_resolucao IN (códigos válidos)
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Consumo em formato HH:MM (horas) ou número (tickets)
   * 
   * @requirements 6.5, 14.1, 14.2
   * @property Property 22: Consumo de Apontamentos Aranda
   * 
   * @throws IntegrationError quando apontamentos indisponíveis
   */
  async buscarConsumo(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ horas: string; tickets: number }> {
    try {
      console.log('🔍 BancoHorasIntegracaoService.buscarConsumo:', {
        empresaId,
        mes,
        ano
      });

      // Validar parâmetros
      if (!empresaId?.trim()) {
        throw new IntegrationError(
          'apontamentos_aranda',
          'ID da empresa é obrigatório',
          'INVALID_EMPRESA_ID',
          false
        );
      }

      if (mes < 1 || mes > 12) {
        throw new IntegrationError(
          'apontamentos_aranda',
          'Mês deve estar entre 1 e 12',
          'INVALID_MONTH',
          false
        );
      }

      if (ano < 2020) {
        throw new IntegrationError(
          'apontamentos_aranda',
          'Ano deve ser maior ou igual a 2020',
          'INVALID_YEAR',
          false
        );
      }

      // Buscar nome da empresa para filtrar apontamentos
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('nome_abreviado, nome_completo')
        .eq('id', empresaId)
        .single();

      if (empresaError || !empresa) {
        throw new IntegrationError(
          'empresas_clientes',
          `Empresa não encontrada: ${empresaError?.message || 'ID inválido'}`,
          'EMPRESA_NOT_FOUND',
          false
        );
      }

      // Calcular data de início e fim do mês
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);

      // Códigos de resolução válidos para banco de horas
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
        'Erro de programa específico (SEM SLA)',
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
        empresaNome: empresa.nome_abreviado || empresa.nome_completo,
        codigosResolucao: codigosResolucaoValidos.length
      });

      // Buscar apontamentos onde:
      // - ativi_interna = "Não"
      // - item_configuracao != "000000 - PROJETOS APL" (NOVA REGRA 1)
      // - tipo_chamado != "PM" (NOVA REGRA 2)
      // - org_us_final = nome da empresa (abreviado ou completo)
      // - cod_resolucao IN (códigos válidos)
      // - data_atividade dentro do período
      // - data_atividade e data_sistema no mesmo mês (NOVA REGRA 3)
      
      // Construir query base (usando any para evitar problemas de tipo com tabela externa)
      let query = supabase
        .from('apontamentos_aranda' as any)
        .select('tempo_gasto_horas, tempo_gasto_minutos, cod_resolucao, org_us_final, item_configuracao, tipo_chamado, data_atividade, data_sistema')
        .eq('ativi_interna', 'Não')
        .neq('item_configuracao', '000000 - PROJETOS APL')  // NOVA REGRA 1: Excluir projetos APL
        .neq('tipo_chamado', 'PM')  // NOVA REGRA 2: Excluir tipo PM
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
        throw new IntegrationError(
          'apontamentos_aranda',
          `Falha ao buscar apontamentos: ${apontamentosError.message}`,
          'ARANDA_QUERY_ERROR',
          true
        );
      }

      console.log('📊 Apontamentos encontrados:', {
        quantidade: apontamentos?.length || 0,
        apontamentos: apontamentos?.slice(0, 5) // Mostrar apenas primeiros 5 para debug
      });

      // Somar horas
      let totalMinutos = 0;
      let apontamentosExcluidos = 0;

      if (apontamentos && apontamentos.length > 0) {
        for (const apontamento of apontamentos) {
          // NOVA REGRA 3: Validar que data_atividade e data_sistema estão no mesmo mês
          let mesmoMes = true;
          if (apontamento.data_atividade && apontamento.data_sistema) {
            const dataAtividade = new Date(apontamento.data_atividade);
            const dataSistema = new Date(apontamento.data_sistema);
            
            // Comparar mês e ano
            if (
              dataAtividade.getMonth() !== dataSistema.getMonth() ||
              dataAtividade.getFullYear() !== dataSistema.getFullYear()
            ) {
              mesmoMes = false;
              apontamentosExcluidos++;
              console.log('⚠️ Apontamento excluído (mês diferente):', {
                data_atividade: apontamento.data_atividade,
                data_sistema: apontamento.data_sistema,
                nro_chamado: apontamento.nro_chamado || 'N/A'
              });
            }
          }

          // Só contabilizar se passou na validação de mês
          if (mesmoMes) {
            // Priorizar tempo_gasto_horas (formato HH:MM)
            if (apontamento.tempo_gasto_horas) {
              try {
                const horasDecimal = converterParaHorasDecimal(apontamento.tempo_gasto_horas);
                totalMinutos += horasDecimal * 60;
              } catch (error) {
                console.warn('⚠️ Erro ao converter tempo_gasto_horas:', {
                  valor: apontamento.tempo_gasto_horas,
                  erro: error
                });
              }
            } 
            // Fallback para tempo_gasto_minutos
            else if (apontamento.tempo_gasto_minutos) {
              totalMinutos += apontamento.tempo_gasto_minutos;
            }
          }
        }
      }

      // Converter minutos para formato HH:MM
      const horas = Math.floor(totalMinutos / 60);
      const minutos = Math.round(totalMinutos % 60);
      const horasFormatadas = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;

      // Buscar tickets reais da tabela apontamentos_tickets_aranda
      const ticketsReais = await this.buscarConsumoTickets(empresaId, mes, ano);

      console.log('✅ Consumo calculado:', {
        totalMinutos,
        horas: horasFormatadas,
        tickets: ticketsReais,
        apontamentosExcluidos,
        observacao: 'Tickets buscados da tabela apontamentos_tickets_aranda (data_fechamento)'
      });

      return {
        horas: horasFormatadas,
        tickets: ticketsReais
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      console.error('❌ Erro inesperado ao buscar consumo:', error);
      throw new IntegrationError(
        'apontamentos_aranda',
        `Erro inesperado ao buscar consumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'UNEXPECTED_ERROR',
        true
      );
    }
  }

  /**
   * Busca requerimentos faturados ou enviados para faturamento
   * 
   * Soma horas_total onde tipo_cobranca = "Banco de Horas", enviado_faturamento = true
   * e status IN ("enviado_faturamento", "faturado") para a empresa e período especificados.
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Requerimentos em formato HH:MM (horas) ou número (tickets)
   * 
   * @requirements 6.6, 14.3, 14.4
   * @property Property 23: Requerimentos Faturados
   * 
   * @throws IntegrationError quando requerimentos indisponíveis
   */
  async buscarRequerimentos(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ horas: string; tickets: number }> {
    try {
      console.log('🔍 BancoHorasIntegracaoService.buscarRequerimentos:', {
        empresaId,
        mes,
        ano
      });

      // Validar parâmetros
      if (!empresaId?.trim()) {
        throw new IntegrationError(
          'requerimentos',
          'ID da empresa é obrigatório',
          'INVALID_EMPRESA_ID',
          false
        );
      }

      if (mes < 1 || mes > 12) {
        throw new IntegrationError(
          'requerimentos',
          'Mês deve estar entre 1 e 12',
          'INVALID_MONTH',
          false
        );
      }

      if (ano < 2020) {
        throw new IntegrationError(
          'requerimentos',
          'Ano deve ser maior ou igual a 2020',
          'INVALID_YEAR',
          false
        );
      }

      // Formatar mês de cobrança (MM/YYYY)
      const mesCobranca = `${String(mes).padStart(2, '0')}/${ano}`;

      console.log('📅 Buscando requerimentos para:', {
        empresaId,
        mesCobranca,
        observacao: 'Apenas requerimentos enviados para faturamento (enviado_faturamento = true e status IN (enviado_faturamento, faturado))'
      });

      // Buscar requerimentos onde:
      // - tipo_cobranca = "Banco de Horas"
      // - mes_cobranca = mesCobranca
      // - cliente_id = empresaId
      // - enviado_faturamento = true
      // - status IN ('enviado_faturamento', 'faturado')
      const { data: requerimentos, error: requerimentosError } = await supabase
        .from('requerimentos')
        .select('horas_funcional, horas_tecnico, quantidade_tickets, chamado, enviado_faturamento, status')
        .eq('tipo_cobranca', 'Banco de Horas')
        .eq('mes_cobranca', mesCobranca)
        .eq('cliente_id', empresaId)
        .eq('enviado_faturamento', true) // ✅ Enviado para faturamento
        .in('status', ['enviado_faturamento', 'faturado']); // ✅ Status correto

      if (requerimentosError) {
        console.error('❌ Erro ao buscar requerimentos:', requerimentosError);
        throw new IntegrationError(
          'requerimentos',
          `Falha ao buscar requerimentos: ${requerimentosError.message}`,
          'REQUERIMENTOS_QUERY_ERROR',
          true
        );
      }

      console.log('📊 Requerimentos encontrados:', {
        quantidade: requerimentos?.length || 0,
        requerimentos: requerimentos?.map(r => ({
          chamado: r.chamado,
          enviado_faturamento: r.enviado_faturamento,
          status: r.status,
          horas_funcional: r.horas_funcional,
          horas_tecnico: r.horas_tecnico,
          quantidade_tickets: r.quantidade_tickets
        })) // Mostrar TODOS para debug
      });

      // Somar horas (horas_funcional + horas_tecnico) e tickets
      let totalHorasDecimal = 0;
      let totalTickets = 0;

      if (requerimentos && requerimentos.length > 0) {
        for (const requerimento of requerimentos) {
          // Somar horas funcional
          if (requerimento.horas_funcional) {
            totalHorasDecimal += requerimento.horas_funcional;
          }

          // Somar horas técnico
          if (requerimento.horas_tecnico) {
            totalHorasDecimal += requerimento.horas_tecnico;
          }

          // Somar quantidade de tickets (se informado)
          if (requerimento.quantidade_tickets) {
            totalTickets += requerimento.quantidade_tickets;
          }
        }
      }

      // Converter horas decimais para formato HH:MM
      const horasFormatadas = converterDeHorasDecimal(totalHorasDecimal);

      console.log('✅ Requerimentos calculados:', {
        totalHorasDecimal,
        horas: horasFormatadas,
        tickets: totalTickets,
        observacao: 'Apenas requerimentos com data_envio preenchida'
      });

      return {
        horas: horasFormatadas,
        tickets: totalTickets
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      console.error('❌ Erro inesperado ao buscar requerimentos:', error);
      throw new IntegrationError(
        'requerimentos',
        `Erro inesperado ao buscar requerimentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'UNEXPECTED_ERROR',
        true
      );
    }
  }

  /**
   * Busca requerimentos em desenvolvimento (não enviados para faturamento)
   * 
   * Retorna requerimentos com status = 'lancado', independente de terem mes_cobranca preenchido.
   * Estes requerimentos NÃO são contabilizados no banco de horas, mas são exibidos
   * como "em desenvolvimento" para informar que as horas ainda serão descontadas quando forem enviados.
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12) - NÃO USADO, mantido por compatibilidade
   * @param ano - Ano (ex: 2024) - NÃO USADO, mantido por compatibilidade
   * @returns Requerimentos em desenvolvimento em formato HH:MM (horas) ou número (tickets)
   * 
   * @requirements 6.6, 14.3, 14.4
   * 
   * @throws IntegrationError quando requerimentos indisponíveis
   */
  async buscarRequerimentosEmDesenvolvimento(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ horas: string; tickets: number }> {
    try {
      console.log('🔍 BancoHorasIntegracaoService.buscarRequerimentosEmDesenvolvimento:', {
        empresaId,
        mes,
        ano,
        observacao: 'Buscando TODOS os requerimentos com status = lancado (independente de mes_cobranca)'
      });

      // Validar parâmetros
      if (!empresaId?.trim()) {
        throw new IntegrationError(
          'requerimentos',
          'ID da empresa é obrigatório',
          'INVALID_EMPRESA_ID',
          false
        );
      }

      console.log('📅 Buscando requerimentos em desenvolvimento para:', {
        empresaId,
        observacao: 'TODOS os requerimentos com status = lancado (sem filtro de mes_cobranca)'
      });

      // Buscar requerimentos onde:
      // - tipo_cobranca = "Banco de Horas"
      // - cliente_id = empresaId
      // - status = 'lancado'
      // NÃO filtrar por mes_cobranca (pode estar vazio)
      const { data: requerimentos, error: requerimentosError } = await supabase
        .from('requerimentos')
        .select('horas_funcional, horas_tecnico, quantidade_tickets, chamado, enviado_faturamento, status, mes_cobranca')
        .eq('tipo_cobranca', 'Banco de Horas')
        .eq('cliente_id', empresaId)
        .eq('status', 'lancado'); // ✅ Status lancado (sem filtro de mes_cobranca)

      if (requerimentosError) {
        console.error('❌ Erro ao buscar requerimentos em desenvolvimento:', requerimentosError);
        throw new IntegrationError(
          'requerimentos',
          `Falha ao buscar requerimentos em desenvolvimento: ${requerimentosError.message}`,
          'REQUERIMENTOS_QUERY_ERROR',
          true
        );
      }

      console.log('📊 Requerimentos em desenvolvimento encontrados:', {
        quantidade: requerimentos?.length || 0,
        requerimentos: requerimentos?.map(r => ({
          chamado: r.chamado,
          enviado_faturamento: r.enviado_faturamento,
          status: r.status,
          mes_cobranca: r.mes_cobranca,
          horas_funcional: r.horas_funcional,
          horas_tecnico: r.horas_tecnico,
          quantidade_tickets: r.quantidade_tickets
        })) // Mostrar TODOS para debug
      });

      // Somar horas (horas_funcional + horas_tecnico) e tickets
      let totalHorasDecimal = 0;
      let totalTickets = 0;

      if (requerimentos && requerimentos.length > 0) {
        for (const requerimento of requerimentos) {
          // Somar horas funcional
          if (requerimento.horas_funcional) {
            totalHorasDecimal += requerimento.horas_funcional;
          }

          // Somar horas técnico
          if (requerimento.horas_tecnico) {
            totalHorasDecimal += requerimento.horas_tecnico;
          }

          // Somar quantidade de tickets (se informado)
          if (requerimento.quantidade_tickets) {
            totalTickets += requerimento.quantidade_tickets;
          }
        }
      }

      // Converter horas decimais para formato HH:MM
      const horasFormatadas = converterDeHorasDecimal(totalHorasDecimal);

      console.log('✅ Requerimentos em desenvolvimento calculados:', {
        totalHorasDecimal,
        horas: horasFormatadas,
        tickets: totalTickets,
        observacao: 'Estes requerimentos NÃO são contabilizados no banco de horas'
      });

      return {
        horas: horasFormatadas,
        tickets: totalTickets
      };
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      console.error('❌ Erro inesperado ao buscar requerimentos em desenvolvimento:', error);
      throw new IntegrationError(
        'requerimentos',
        `Erro inesperado ao buscar requerimentos em desenvolvimento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        'UNEXPECTED_ERROR',
        true
      );
    }
  }

  /**
   * Valida integridade dos dados integrados
   * 
   * Verifica se:
   * - Empresa existe e está ativa
   * - Apontamentos Aranda estão acessíveis
   * - Requerimentos estão acessíveis
   * - Dados estão consistentes
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Resultado da validação com lista de erros e avisos
   * 
   * @requirements 14.7, 14.8
   */
  async validarDadosIntegrados(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<ValidationResult> {
    const erros: string[] = [];
    const avisos: string[] = [];

    console.log('🔍 BancoHorasIntegracaoService.validarDadosIntegrados:', {
      empresaId,
      mes,
      ano
    });

    try {
      // 1. Validar parâmetros básicos
      if (!empresaId?.trim()) {
        erros.push('ID da empresa é obrigatório');
      }

      if (mes < 1 || mes > 12) {
        erros.push('Mês deve estar entre 1 e 12');
      }

      if (ano < 2020) {
        erros.push('Ano deve ser maior ou igual a 2020');
      }

      // Se há erros de parâmetros, retornar imediatamente
      if (erros.length > 0) {
        return {
          valido: false,
          erros,
          avisos
        };
      }

      // 2. Verificar se empresa existe e está ativa
      try {
        const { data: empresa, error: empresaError } = await supabase
          .from('empresas_clientes')
          .select('id, nome_abreviado, status, tipo_contrato')
          .eq('id', empresaId)
          .single();

        if (empresaError || !empresa) {
          erros.push(`Empresa não encontrada: ${empresaError?.message || 'ID inválido'}`);
        } else if (empresa.status !== 'ativo') {
          avisos.push(`Empresa está com status "${empresa.status}". Apenas empresas ativas devem ter cálculos de banco de horas.`);
        }

        // Verificar se empresa tem tipo_contrato configurado
        if (empresa && !empresa.tipo_contrato) {
          erros.push('Empresa não possui tipo de contrato configurado. Configure os parâmetros do banco de horas.');
        }
      } catch (error) {
        erros.push(`Erro ao verificar empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }

      // 3. Verificar acessibilidade de apontamentos Aranda (horas)
      try {
        await this.buscarConsumo(empresaId, mes, ano);
      } catch (error) {
        if (error instanceof IntegrationError) {
          if (error.retryable) {
            avisos.push(`Apontamentos Aranda temporariamente indisponíveis: ${error.message}`);
          } else {
            erros.push(`Erro ao acessar apontamentos Aranda: ${error.message}`);
          }
        } else {
          erros.push(`Erro inesperado ao validar apontamentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // 3.1. Verificar acessibilidade de tickets Aranda
      try {
        await this.buscarConsumoTickets(empresaId, mes, ano);
      } catch (error) {
        if (error instanceof IntegrationError) {
          if (error.retryable) {
            avisos.push(`Tickets Aranda temporariamente indisponíveis: ${error.message}`);
          } else {
            // Não é erro crítico se tickets não estiverem disponíveis (pode ser empresa de horas)
            avisos.push(`Tickets Aranda não disponíveis: ${error.message}`);
          }
        } else {
          avisos.push(`Erro inesperado ao validar tickets: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // 4. Verificar acessibilidade de requerimentos
      try {
        await this.buscarRequerimentos(empresaId, mes, ano);
      } catch (error) {
        if (error instanceof IntegrationError) {
          if (error.retryable) {
            avisos.push(`Requerimentos temporariamente indisponíveis: ${error.message}`);
          } else {
            erros.push(`Erro ao acessar requerimentos: ${error.message}`);
          }
        } else {
          erros.push(`Erro inesperado ao validar requerimentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // 5. Resultado final
      const valido = erros.length === 0;

      console.log('✅ Validação concluída:', {
        valido,
        erros: erros.length,
        avisos: avisos.length
      });

      return {
        valido,
        erros,
        avisos
      };
    } catch (error) {
      console.error('❌ Erro inesperado na validação:', error);
      erros.push(`Erro inesperado na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);

      return {
        valido: false,
        erros,
        avisos
      };
    }
  }
}

// Exportar instância singleton
export const bancoHorasIntegracaoService = new BancoHorasIntegracaoService();
