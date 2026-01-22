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
   * Busca consumo de horas/tickets de apontamentos Aranda
   * 
   * Soma tempo_gasto_horas onde ativi_interna = "Não" para a empresa e período especificados.
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
      // - org_us_final = nome da empresa (abreviado ou completo)
      // - cod_resolucao IN (códigos válidos)
      // - data_atividade dentro do período
      
      // Construir query base (usando any para evitar problemas de tipo com tabela externa)
      let query = supabase
        .from('apontamentos_aranda' as any)
        .select('tempo_gasto_horas, tempo_gasto_minutos, cod_resolucao, org_us_final')
        .eq('ativi_interna', 'Não')
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
      let totalTickets = 0;

      if (apontamentos && apontamentos.length > 0) {
        for (const apontamento of apontamentos) {
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

          // Contar tickets (cada apontamento = 1 ticket)
          totalTickets++;
        }
      }

      // Converter minutos para formato HH:MM
      const horas = Math.floor(totalMinutos / 60);
      const minutos = Math.round(totalMinutos % 60);
      const horasFormatadas = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;

      console.log('✅ Consumo calculado:', {
        totalMinutos,
        horas: horasFormatadas,
        tickets: totalTickets
      });

      return {
        horas: horasFormatadas,
        tickets: totalTickets
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
   * Busca requerimentos faturados ou lançados
   * 
   * Soma horas_total onde tipo_cobranca = "Banco de Horas" e status IN ("faturado", "lancado")
   * para a empresa e período especificados.
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
        mesCobranca
      });

      // Buscar requerimentos onde:
      // - tipo_cobranca = "Banco de Horas"
      // - status IN ("faturado", "lancado")
      // - mes_cobranca = mesCobranca
      // - cliente_id = empresaId
      const { data: requerimentos, error: requerimentosError } = await supabase
        .from('requerimentos')
        .select('horas_funcional, horas_tecnico')
        .eq('tipo_cobranca', 'Banco de Horas')
        .in('status', ['faturado', 'lancado'])
        .eq('mes_cobranca', mesCobranca)
        .eq('cliente_id', empresaId);

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
        requerimentos: requerimentos?.slice(0, 5) // Mostrar apenas primeiros 5 para debug
      });

      // Somar horas (horas_funcional + horas_tecnico)
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

          // Contar cada requerimento como 1 ticket
          totalTickets++;
        }
      }

      // Converter horas decimais para formato HH:MM
      const horasFormatadas = converterDeHorasDecimal(totalHorasDecimal);

      console.log('✅ Requerimentos calculados:', {
        totalHorasDecimal,
        horas: horasFormatadas,
        tickets: totalTickets
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

      // 3. Verificar acessibilidade de apontamentos Aranda
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
