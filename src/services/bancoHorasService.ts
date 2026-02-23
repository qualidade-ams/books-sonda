/**
 * Serviço Principal de Cálculo de Banco de Horas
 * 
 * Implementa a lógica central de cálculo mensal de banco de horas:
 * - Calcula todos os valores mensais seguindo as fórmulas definidas
 * - Integra com serviços de integração, repasse e excedentes
 * - Gerencia versionamento e histórico de cálculos
 * - Recalcula meses subsequentes quando necessário
 * 
 * @module bancoHorasService
 * @requirements 4.1-4.12, 6.1-6.12
 */

import { supabase } from '@/integrations/supabase/client';
import { bancoHorasIntegracaoService } from './bancoHorasIntegracaoService';
import { repasseService } from './bancoHorasRepasseService';
import { excedentesService } from './bancoHorasExcedentesService';
import { 
  converterHorasParaMinutos, 
  converterMinutosParaHoras,
  somarHoras,
  subtrairHoras
} from '@/utils/horasUtils';

/**
 * Resultado do cálculo mensal
 */
export interface BancoHorasCalculo {
  id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  
  // Campos calculados - Horas
  baseline_horas?: string;
  repasses_mes_anterior_horas?: string;
  saldo_a_utilizar_horas?: string;
  consumo_horas?: string;
  requerimentos_horas?: string;
  reajustes_horas?: string;
  consumo_total_horas?: string;
  saldo_horas?: string;
  repasse_horas?: string;
  excedentes_horas?: string;
  valor_excedentes_horas?: number;
  
  // Campos calculados - Tickets
  baseline_tickets?: number;
  repasses_mes_anterior_tickets?: number;
  saldo_a_utilizar_tickets?: number;
  consumo_tickets?: number;
  requerimentos_tickets?: number;
  reajustes_tickets?: number;
  consumo_total_tickets?: number;
  saldo_tickets?: number;
  repasse_tickets?: number;
  excedentes_tickets?: number;
  valor_excedentes_tickets?: number;
  
  // Valor total a faturar
  valor_a_faturar?: number;
  
  // Metadados
  observacao_publica?: string;
  is_fim_periodo: boolean;
  taxa_hora_utilizada?: number;
  taxa_ticket_utilizada?: number;
  
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

/**
 * Parâmetros da empresa para cálculo
 */
interface ParametrosEmpresa {
  id: string;
  tipo_contrato: 'horas' | 'tickets' | 'ambos';
  periodo_apuracao: number;
  inicio_vigencia: Date;
  baseline_horas_mensal?: string;
  baseline_tickets_mensal?: number;
  possui_repasse_especial: boolean;
  ciclos_para_zerar: number;
  percentual_repasse_mensal: number;
  percentual_repasse_especial?: number;
  ciclo_atual: number;
}

/**
 * Erro de cálculo
 */
export class CalculationError extends Error {
  constructor(
    public step: string,
    public message: string,
    public data: Record<string, any>
  ) {
    super(message);
    this.name = 'CalculationError';
  }
}

/**
 * Classe principal do serviço de banco de horas
 * 
 * Responsável por orquestrar todos os cálculos mensais, integrando
 * com os serviços especializados de integração, repasse e excedentes.
 */
export class BancoHorasService {
  /**
   * Calcula valores mensais para uma empresa
   * 
   * Aplica todas as fórmulas de cálculo seguindo a ordem:
   * 1. Busca parâmetros da empresa
   * 2. Define baseline
   * 3. Busca repasses do mês anterior
   * 4. Busca reajustes (entradas e saídas)
   * 5. Calcula saldo a utilizar = baseline + repasse (SEM reajustes)
   * 6. Busca consumo e requerimentos
   *    IMPORTANTE: Para tipo_contrato = "ambos", o consumo de HORAS é IGNORADO (aba Horas).
   *    O consumo de TICKETS continua sendo considerado normalmente (aba Tickets).
   *    O consumo de horas será controlado apenas por ajustes manuais (reajustes).
   * 7. Calcula consumo total = consumo + requerimentos + reajustes_saida - reajustes_entrada
   * 8. Calcula saldo = saldo_a_utilizar - consumo_total
   * 9. Calcula repasse
   * 10. Calcula excedentes (se aplicável)
   * 11. Persiste resultado
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Cálculo mensal completo
   * 
   * @example
   * const calculo = await bancoHorasService.calcularMes('uuid-empresa', 1, 2024);
   * 
   * **Validates: Requirements 4.1-4.12, 6.1-6.12**
   * **Property 6: Fórmula de Saldo a Utilizar = baseline + repasse**
   * **Property 7: Fórmula de Consumo Total = consumo + requerimentos + reajustes_saida - reajustes_entrada**
   * **Property 8: Fórmula de Saldo Mensal = saldo_a_utilizar - consumo_total**
   */
  async calcularMes(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<BancoHorasCalculo> {
    try {
      console.log('🔍 BancoHorasService.calcularMes:', {
        empresaId,
        mes,
        ano
      });

      // 1. Buscar parâmetros da empresa (com baseline vigente para o mês/ano)
      const parametros = await this.buscarParametrosEmpresa(empresaId, mes, ano);
      
      console.log('📊 Parâmetros da empresa:', parametros);

      // 2. Definir baseline
      const baselineHoras = parametros.baseline_horas_mensal || '0:00';
      const baselineTickets = parametros.baseline_tickets_mensal || 0;

      // 3. Buscar repasses do mês anterior
      const { repasseHoras, repasseTickets } = await this.buscarRepassesMesAnterior(
        empresaId,
        mes,
        ano
      );

      console.log('📥 Repasses mês anterior:', {
        mesAtual: `${mes}/${ano}`,
        mesAnterior: mes === 1 ? `12/${ano - 1}` : `${mes - 1}/${ano}`,
        horas: repasseHoras,
        tickets: repasseTickets,
        observacao: 'Este valor vem do campo repasse_horas do mês anterior'
      });

      // 4. Buscar reajustes de entrada e saída
      const { horas: reajustesEntradaHoras, tickets: reajustesEntradaTickets } = 
        await this.buscarReajustesEntrada(empresaId, mes, ano);

      const { horas: reajustesSaidaHoras, tickets: reajustesSaidaTickets } = 
        await this.buscarReajustesSaida(empresaId, mes, ano);

      console.log('➕ Reajustes de entrada:', {
        horas: reajustesEntradaHoras,
        tickets: reajustesEntradaTickets
      });

      console.log('➖ Reajustes de saída:', {
        horas: reajustesSaidaHoras,
        tickets: reajustesSaidaTickets
      });

      // 5. Calcular saldo a utilizar = baseline + repasses_mes_anterior (SEM reajustes)
      // ✅ CORREÇÃO: Reajustes agora afetam o CONSUMO TOTAL, não o saldo a utilizar
      const saldoAUtilizarHoras = somarHoras(baselineHoras, repasseHoras);
      const saldoAUtilizarTickets = baselineTickets + repasseTickets;

      console.log('💰 Saldo a utilizar (baseline + repasse):', {
        horas: saldoAUtilizarHoras,
        tickets: saldoAUtilizarTickets
      });

      // 6. Buscar consumo e requerimentos
      // IMPORTANTE: Para tipo_contrato = "ambos", ignorar consumo de HORAS na aba de horas
      // O consumo de horas será controlado apenas por ajustes manuais
      // O consumo de TICKETS continua sendo considerado normalmente
      const consumo = await bancoHorasIntegracaoService.buscarConsumo(empresaId, mes, ano);
      
      let consumoHoras = consumo.horas;
      let consumoTickets = consumo.tickets;
      
      // Se tipo_contrato = "ambos", zerar apenas o consumo de HORAS
      if (parametros.tipo_contrato === 'ambos') {
        consumoHoras = '0:00';
        console.log('⚠️ tipo_contrato = "ambos": Consumo de HORAS ignorado (será controlado por ajustes). Consumo de TICKETS mantido.');
      }
      
      const { horas: requerimentosHoras, tickets: requerimentosTickets } = 
        await bancoHorasIntegracaoService.buscarRequerimentos(empresaId, mes, ano);

      console.log('📊 Consumo e requerimentos:', {
        consumo: { horas: consumoHoras, tickets: consumoTickets },
        requerimentos: { horas: requerimentosHoras, tickets: requerimentosTickets },
        observacao: parametros.tipo_contrato === 'ambos' ? 'Consumo de HORAS ignorado (tipo_contrato = ambos). Tickets mantidos.' : 'Consumo considerado'
      });

      // 7. Calcular total de reajustes (entradas - saídas) para exibição
      const reajustesTotalHoras = subtrairHoras(reajustesEntradaHoras, reajustesSaidaHoras);
      const reajustesTotalTickets = reajustesEntradaTickets - reajustesSaidaTickets;

      console.log('� Total de reajustes (entradas - saídas):', {
        horas: reajustesTotalHoras,
        tickets: reajustesTotalTickets
      });

      // 8. Calcular consumo total = consumo + requerimentos + reajustes_saida - reajustes_entrada
      // ✅ CORREÇÃO: Reajustes agora afetam o CONSUMO TOTAL
      // - Reajustes de SAÍDA aumentam o consumo (horas gastas)
      // - Reajustes de ENTRADA diminuem o consumo (horas devolvidas)
      const consumoComRequerimentos = somarHoras(consumoHoras, requerimentosHoras);
      const consumoComSaidas = somarHoras(consumoComRequerimentos, reajustesSaidaHoras);
      const consumoTotalHoras = subtrairHoras(consumoComSaidas, reajustesEntradaHoras);
      const consumoTotalTickets = consumoTickets + requerimentosTickets + reajustesSaidaTickets - reajustesEntradaTickets;

      console.log('📈 Consumo total (consumo + requerimentos + reajustes_saida - reajustes_entrada):', {
        horas: consumoTotalHoras,
        tickets: consumoTotalTickets
      });

      // 9. Calcular saldo = saldo_a_utilizar - consumo_total
      const saldoHoras = subtrairHoras(saldoAUtilizarHoras, consumoTotalHoras);
      const saldoTickets = saldoAUtilizarTickets - consumoTotalTickets;

      console.log('💵 Saldo:', {
        horas: saldoHoras,
        tickets: saldoTickets
      });

      // 9. Verificar se é fim de período
      const isFimPeriodo = repasseService.isFimPeriodo(
        mes,
        ano,
        parametros.inicio_vigencia,
        parametros.periodo_apuracao
      );

      console.log('🏁 Fim de período:', isFimPeriodo);

      // 10. Calcular repasse
      console.log('📊 Percentual de repasse configurado:', {
        percentual_repasse_mensal: parametros.percentual_repasse_mensal,
        percentual_repasse_especial: parametros.percentual_repasse_especial,
        possui_repasse_especial: parametros.possui_repasse_especial
      });
      
      const resultadoRepasseHoras = repasseService.calcularRepasseCompleto(
        saldoHoras,
        mes,
        ano,
        parametros.inicio_vigencia,
        parametros.periodo_apuracao,
        parametros.percentual_repasse_mensal,
        parametros.possui_repasse_especial,
        parametros.ciclo_atual,
        parametros.ciclos_para_zerar,
        parametros.percentual_repasse_especial || 100
      );

      const resultadoRepasseTickets = repasseService.calcularRepasseCompleto(
        saldoTickets.toString(),
        mes,
        ano,
        parametros.inicio_vigencia,
        parametros.periodo_apuracao,
        parametros.percentual_repasse_mensal,
        parametros.possui_repasse_especial,
        parametros.ciclo_atual,
        parametros.ciclos_para_zerar,
        parametros.percentual_repasse_especial || 100
      );

      console.log('🔄 Repasse:', {
        mesAtual: `${mes}/${ano}`,
        saldoAtual: saldoHoras,
        percentualRepasse: parametros.percentual_repasse_mensal,
        percentualRepasseEspecial: parametros.percentual_repasse_especial,
        repasseCalculado: resultadoRepasseHoras.repasse,
        observacao: 'Este valor será usado como repasse_mes_anterior no próximo mês',
        horas: resultadoRepasseHoras.repasse,
        tickets: resultadoRepasseTickets.repasse,
        gerarExcedente: resultadoRepasseHoras.gerarExcedente || resultadoRepasseTickets.gerarExcedente,
        '⚠️ IMPORTANTE': `O repasse de ${resultadoRepasseHoras.repasse} será salvo no campo repasse_horas e usado como repasse_mes_anterior no próximo mês`
      });

      // 11. Calcular excedentes (se aplicável)
      let excedenteHoras = '0:00';
      let excedenteTickets = 0;
      let valorExcedenteHoras = 0;
      let valorExcedenteTickets = 0;
      let taxaHoraUtilizada: number | null = null;
      let taxaTicketUtilizada: number | null = null;
      let observacaoPublica = '';

      // SEMPRE buscar a taxa para exibição, independente de ser fim de período
      if (parametros.tipo_contrato !== 'tickets') {
        console.log('🔍 [bancoHorasService] Buscando taxa de hora para exibição:', {
          empresaId,
          mes,
          ano,
          tipo_contrato: parametros.tipo_contrato
        });
        
        const taxaHora = await excedentesService.buscarTaxaMes(
          empresaId,
          mes,
          ano,
          parametros.tipo_contrato
        );
        taxaHoraUtilizada = taxaHora;
        
        console.log('📊 [bancoHorasService] Taxa de hora buscada para exibição:', {
          taxaHoraUtilizada,
          tipo: typeof taxaHoraUtilizada,
          valor_formatado: taxaHoraUtilizada ? `R$ ${taxaHoraUtilizada.toFixed(2)}` : 'null',
          mes: `${mes}/${ano}`
        });
      }

      if (parametros.tipo_contrato !== 'horas') {
        console.log('🔍 Buscando taxa de ticket excedente:', {
          empresaId,
          mes,
          ano,
          tipo_contrato: parametros.tipo_contrato
        });
        
        const taxaTicket = await excedentesService.buscarTaxaMes(
          empresaId,
          mes,
          ano,
          parametros.tipo_contrato
        );
        taxaTicketUtilizada = taxaTicket;
        console.log('📊 Taxa de ticket buscada para exibição:', taxaTicketUtilizada);
      }

      // Calcular excedentes se for fim de período E saldo negativo
      // OU se gerarExcedente for true (para garantir compatibilidade)
      const saldoHorasNegativo = saldoHoras.startsWith('-');
      const saldoTicketsNegativo = saldoTickets < 0;
      
      console.log('🔍 Verificando condições para cálculo de excedentes:', {
        isFimPeriodo,
        saldoHoras,
        saldoHorasNegativo,
        saldoTickets,
        saldoTicketsNegativo,
        'resultadoRepasseHoras.gerarExcedente': resultadoRepasseHoras.gerarExcedente,
        'resultadoRepasseTickets.gerarExcedente': resultadoRepasseTickets.gerarExcedente,
        'vai calcular excedente?': (isFimPeriodo && (saldoHorasNegativo || saldoTicketsNegativo)) || 
          resultadoRepasseHoras.gerarExcedente || 
          resultadoRepasseTickets.gerarExcedente
      });
      
      if ((isFimPeriodo && (saldoHorasNegativo || saldoTicketsNegativo)) || 
          resultadoRepasseHoras.gerarExcedente || 
          resultadoRepasseTickets.gerarExcedente) {
        console.log('🔔 Gerando excedentes:', {
          motivo: isFimPeriodo && (saldoHorasNegativo || saldoTicketsNegativo) 
            ? 'Fim de período com saldo negativo' 
            : 'gerarExcedente = true',
          isFimPeriodo,
          saldoHorasNegativo,
          saldoTicketsNegativo,
          gerarExcedenteHoras: resultadoRepasseHoras.gerarExcedente,
          gerarExcedenteTickets: resultadoRepasseTickets.gerarExcedente,
          saldoHoras,
          saldoTickets
        });
        // Calcular excedente de horas
        if (resultadoRepasseHoras.gerarExcedente && parametros.tipo_contrato !== 'tickets') {
          const resultadoExcedenteHoras = await excedentesService.calcularExcedente(
            empresaId,
            saldoHoras,
            mes,
            ano,
            parametros.tipo_contrato
          );

          excedenteHoras = resultadoExcedenteHoras.excedente as string;
          valorExcedenteHoras = resultadoExcedenteHoras.valorExcedente;
          taxaHoraUtilizada = resultadoExcedenteHoras.taxaUtilizada;

          // Gerar descrição de faturamento
          if (resultadoExcedenteHoras.taxaEncontrada) {
            const { data: empresa } = await supabase
              .from('empresas_clientes')
              .select('nome_abreviado, nome_completo')
              .eq('id', empresaId)
              .single();

            const empresaNome = empresa?.nome_abreviado || empresa?.nome_completo || 'Empresa';
            
            const descricao = excedentesService.gerarDescricaoFaturamento(
              empresaNome,
              excedenteHoras,
              mes,
              ano,
              valorExcedenteHoras,
              'horas'
            );

            observacaoPublica = descricao.descricao;
          } else {
            observacaoPublica = resultadoExcedenteHoras.alerta || '';
          }
        }

        // Calcular excedente de tickets
        if (resultadoRepasseTickets.gerarExcedente && parametros.tipo_contrato !== 'horas') {
          const resultadoExcedenteTickets = await excedentesService.calcularExcedente(
            empresaId,
            saldoTickets,
            mes,
            ano,
            parametros.tipo_contrato
          );

          excedenteTickets = resultadoExcedenteTickets.excedente as number;
          valorExcedenteTickets = resultadoExcedenteTickets.valorExcedente;
          taxaTicketUtilizada = resultadoExcedenteTickets.taxaUtilizada;

          // Adicionar à descrição de faturamento
          if (resultadoExcedenteTickets.taxaEncontrada) {
            const { data: empresa } = await supabase
              .from('empresas_clientes')
              .select('nome_abreviado, nome_completo')
              .eq('id', empresaId)
              .single();

            const empresaNome = empresa?.nome_abreviado || empresa?.nome_completo || 'Empresa';
            
            const descricao = excedentesService.gerarDescricaoFaturamento(
              empresaNome,
              excedenteTickets,
              mes,
              ano,
              valorExcedenteTickets,
              'tickets'
            );

            if (observacaoPublica) {
              observacaoPublica += '\n\n' + descricao.descricao;
            } else {
              observacaoPublica = descricao.descricao;
            }
          } else if (!observacaoPublica) {
            observacaoPublica = resultadoExcedenteTickets.alerta || '';
          }
        }
      }

      console.log('💸 Excedentes:', {
        horas: excedenteHoras,
        tickets: excedenteTickets,
        valorHoras: valorExcedenteHoras,
        valorTickets: valorExcedenteTickets,
        taxaHoraUtilizada,
        taxaTicketUtilizada,
        gerarExcedenteHoras: resultadoRepasseHoras.gerarExcedente,
        gerarExcedenteTickets: resultadoRepasseTickets.gerarExcedente
      });

      // 12. Calcular valor total a faturar
      const valorAFaturar = valorExcedenteHoras + valorExcedenteTickets;

      console.log('💰 Valor a faturar calculado:', {
        valorExcedenteHoras,
        valorExcedenteTickets,
        valorAFaturar,
        motivo: valorAFaturar === 0 
          ? 'Saldo não é negativo no fim do período' 
          : 'Excedente calculado com sucesso'
      });

      // 13. Persistir cálculo
      console.log('💾 [bancoHorasService] Persistindo cálculo com taxas:', {
        mes: `${mes}/${ano}`,
        taxa_hora_utilizada: taxaHoraUtilizada,
        taxa_ticket_utilizada: taxaTicketUtilizada,
        tipo_taxa_hora: typeof taxaHoraUtilizada,
        tipo_taxa_ticket: typeof taxaTicketUtilizada,
        is_fim_periodo: isFimPeriodo
      });
      
      const calculo = await this.persistirCalculo({
        empresa_id: empresaId,
        mes,
        ano,
        baseline_horas: baselineHoras,
        baseline_tickets: baselineTickets,
        repasses_mes_anterior_horas: repasseHoras,
        repasses_mes_anterior_tickets: repasseTickets,
        saldo_a_utilizar_horas: saldoAUtilizarHoras,
        saldo_a_utilizar_tickets: saldoAUtilizarTickets,
        consumo_horas: consumoHoras,
        consumo_tickets: consumoTickets,
        requerimentos_horas: requerimentosHoras,
        requerimentos_tickets: requerimentosTickets,
        reajustes_horas: reajustesTotalHoras,
        reajustes_tickets: reajustesTotalTickets,
        consumo_total_horas: consumoTotalHoras,
        consumo_total_tickets: consumoTotalTickets,
        saldo_horas: saldoHoras,
        saldo_tickets: saldoTickets,
        repasse_horas: resultadoRepasseHoras.repasse,
        repasse_tickets: parseFloat(resultadoRepasseTickets.repasse),
        excedentes_horas: excedenteHoras,
        excedentes_tickets: excedenteTickets,
        valor_excedentes_horas: valorExcedenteHoras,
        valor_excedentes_tickets: valorExcedenteTickets,
        valor_a_faturar: valorAFaturar,
        observacao_publica: observacaoPublica,
        is_fim_periodo: isFimPeriodo,
        taxa_hora_utilizada: taxaHoraUtilizada,
        taxa_ticket_utilizada: taxaTicketUtilizada
      });

      console.log('✅ Cálculo persistido:', {
        id: calculo.id,
        mes: `${mes}/${ano}`,
        saldoHoras: saldoHoras,
        repasseHoras: resultadoRepasseHoras.repasse,
        taxa_hora_utilizada: taxaHoraUtilizada,
        taxa_hora_persistida: calculo.taxa_hora_utilizada,
        valor_a_faturar: valorAFaturar,
        '⚠️ CRÍTICO': `repasse_horas = ${resultadoRepasseHoras.repasse} foi salvo no banco e será usado como repasse_mes_anterior no próximo mês`,
        '🔍 DEBUG': 'Verifique no banco se o campo repasse_horas foi salvo corretamente'
      });

      return calculo;
    } catch (error) {
      console.error('❌ Erro ao calcular mês:', error);
      
      if (error instanceof CalculationError) {
        throw error;
      }

      throw new CalculationError(
        'calculo_mes',
        `Erro ao calcular mês: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { empresaId, mes, ano }
      );
    }
  }

  /**
   * Busca cálculo existente ou cria novo
   * 
   * Verifica se já existe um cálculo para o mês/ano especificado.
   * Se existir, retorna o cálculo mais recente (maior versão).
   * Se não existir, calcula e retorna novo cálculo.
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Cálculo mensal (existente ou novo)
   * 
   * @example
   * const calculo = await bancoHorasService.obterOuCalcular('uuid-empresa', 1, 2024);
   */
  async obterOuCalcular(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<BancoHorasCalculo> {
    try {
      console.log('🔍 BancoHorasService.obterOuCalcular:', {
        empresaId,
        mes,
        ano
      });

      // Buscar cálculo existente (sem versão)
      const { data: calculoExistente, error } = await supabase
        .from('banco_horas_calculos' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new Error(`Erro ao buscar cálculo existente: ${error.message}`);
      }

      // Se encontrou cálculo, retornar
      if (calculoExistente) {
        console.log('✅ Cálculo existente encontrado:', (calculoExistente as any).id);
        return calculoExistente as any as BancoHorasCalculo;
      }

      // Se não encontrou, calcular novo
      console.log('📊 Calculando novo cálculo...');
      return await this.calcularMes(empresaId, mes, ano);
    } catch (error) {
      console.error('❌ Erro ao obter ou calcular:', error);
      throw new CalculationError(
        'obter_ou_calcular',
        `Erro ao obter ou calcular: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { empresaId, mes, ano }
      );
    }
  }

  /**
   * Recalcula mês e todos os subsequentes
   * 
   * Quando um reajuste é aplicado ou parâmetros são alterados,
   * é necessário recalcular o mês afetado e todos os meses seguintes
   * até o fim do período de apuração.
   * 
   * @param empresaId - ID da empresa cliente
   * @param mes - Mês inicial (1-12)
   * @param ano - Ano inicial (ex: 2024)
   * 
   * @example
   * await bancoHorasService.recalcularAPartirDe('uuid-empresa', 3, 2024);
   * // Recalcula março, abril, maio, ... até fim do período
   */
  async recalcularAPartirDe(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<void> {
    try {
      console.log('🔄 BancoHorasService.recalcularAPartirDe:', {
        empresaId,
        mes,
        ano
      });

      // Buscar parâmetros da empresa
      const parametros = await this.buscarParametrosEmpresa(empresaId);

      // Calcular quantos meses recalcular até fim do período
      const mesesARecalcular = this.calcularMesesAteFimPeriodo(
        mes,
        ano,
        parametros.inicio_vigencia,
        parametros.periodo_apuracao
      );

      console.log('📅 Meses a recalcular:', mesesARecalcular);

      // Recalcular cada mês sequencialmente
      for (const { mes: mesAtual, ano: anoAtual } of mesesARecalcular) {
        console.log(`🔄 Recalculando ${mesAtual}/${anoAtual}...`);
        await this.calcularMes(empresaId, mesAtual, anoAtual);
      }

      console.log('✅ Recálculo completo');
    } catch (error) {
      console.error('❌ Erro ao recalcular a partir de:', error);
      throw new CalculationError(
        'recalcular_a_partir_de',
        `Erro ao recalcular: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { empresaId, mes, ano }
      );
    }
  }

  // ========== Métodos Auxiliares Privados ==========

  /**
   * Busca parâmetros da empresa
   * 
   * IMPORTANTE: Agora busca baseline do histórico (baseline_historico) em vez da tabela empresas_clientes.
   * Isso garante que cálculos históricos usem o baseline correto da época.
   */
  private async buscarParametrosEmpresa(
    empresaId: string,
    mes?: number,
    ano?: number
  ): Promise<ParametrosEmpresa> {
    const { data: empresa, error } = await supabase
      .from('empresas_clientes')
      .select(`
        id,
        tipo_contrato,
        periodo_apuracao,
        inicio_vigencia,
        baseline_horas_mensal,
        baseline_tickets_mensal,
        possui_repasse_especial,
        ciclos_para_zerar,
        percentual_repasse_mensal,
        percentual_repasse_especial,
        ciclo_atual
      `)
      .eq('id', empresaId)
      .single();

    if (error || !empresa) {
      throw new CalculationError(
        'buscar_parametros',
        `Empresa não encontrada: ${error?.message || 'ID inválido'}`,
        { empresaId }
      );
    }

    // Validar parâmetros obrigatórios
    if (!empresa.tipo_contrato) {
      throw new CalculationError(
        'validar_parametros',
        'Tipo de contrato não configurado. Configure os parâmetros do banco de horas.',
        { empresaId }
      );
    }

    if (!empresa.periodo_apuracao) {
      throw new CalculationError(
        'validar_parametros',
        'Período de apuração não configurado. Configure os parâmetros do banco de horas.',
        { empresaId }
      );
    }

    if (!empresa.inicio_vigencia) {
      throw new CalculationError(
        'validar_parametros',
        'Início de vigência não configurado. Configure os parâmetros do banco de horas.',
        { empresaId }
      );
    }

    // ✅ NOVO: Buscar baseline do histórico se mês/ano fornecidos
    let baselineHorasMensal: string | undefined = empresa.baseline_horas_mensal as string | undefined;
    let baselineTicketsMensal: number | undefined = empresa.baseline_tickets_mensal as number | undefined;

    if (mes && ano) {
      try {
        // Calcular data de referência (primeiro dia do mês)
        const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;
        
        console.log('🔍 [buscarParametrosEmpresa] Buscando baseline vigente:', {
          empresaId,
          mes,
          ano,
          dataReferencia
        });

        // Buscar baseline vigente usando função SQL
        // @ts-ignore - Função get_baseline_vigente existe no banco mas tipos não foram regenerados
        const { data: baselineVigente, error: baselineError } = await (supabase as any)
          .rpc('get_baseline_vigente', {
            p_empresa_id: empresaId,
            p_data: dataReferencia
          });

        if (!baselineError && baselineVigente && baselineVigente.length > 0) {
          const baseline = baselineVigente[0];
          
          console.log('✅ [buscarParametrosEmpresa] Baseline vigente encontrado:', {
            baseline_horas: baseline.baseline_horas,
            baseline_tickets: baseline.baseline_tickets,
            data_inicio: baseline.data_inicio,
            data_fim: baseline.data_fim,
            is_vigente: baseline.is_vigente,
            fonte: baseline.is_vigente ? 'baseline_historico' : 'empresas_clientes (fallback)'
          });

          // Converter baseline_horas de DECIMAL para formato HH:MM
          if (baseline.baseline_horas !== null && baseline.baseline_horas !== undefined) {
            const horas = Math.floor(baseline.baseline_horas);
            const minutos = Math.round((baseline.baseline_horas - horas) * 60);
            baselineHorasMensal = `${horas}:${String(minutos).padStart(2, '0')}`;
          }

          // Usar baseline_tickets do histórico
          if (baseline.baseline_tickets !== null && baseline.baseline_tickets !== undefined) {
            baselineTicketsMensal = baseline.baseline_tickets;
          }

          console.log('📊 [buscarParametrosEmpresa] Baseline convertido:', {
            baselineHorasMensal,
            baselineTicketsMensal
          });
        } else {
          console.warn('⚠️ [buscarParametrosEmpresa] Baseline vigente não encontrado, usando valores da tabela empresas_clientes:', {
            error: baselineError?.message,
            baselineHorasMensal: empresa.baseline_horas_mensal,
            baselineTicketsMensal: empresa.baseline_tickets_mensal
          });
        }
      } catch (error) {
        console.error('❌ [buscarParametrosEmpresa] Erro ao buscar baseline vigente:', error);
        console.warn('⚠️ [buscarParametrosEmpresa] Usando fallback da tabela empresas_clientes');
        // Continuar com valores da tabela empresas_clientes (fallback)
      }
    }

    return {
      id: empresa.id,
      tipo_contrato: empresa.tipo_contrato as 'horas' | 'tickets' | 'ambos',
      periodo_apuracao: empresa.periodo_apuracao,
      inicio_vigencia: new Date(empresa.inicio_vigencia),
      baseline_horas_mensal: baselineHorasMensal,
      baseline_tickets_mensal: baselineTicketsMensal,
      possui_repasse_especial: empresa.possui_repasse_especial || false,
      ciclos_para_zerar: empresa.ciclos_para_zerar || 1,
      percentual_repasse_mensal: empresa.percentual_repasse_mensal ?? 100, // Padrão 100% se não configurado
      percentual_repasse_especial: empresa.percentual_repasse_especial ?? 100, // Padrão 100% se não configurado
      ciclo_atual: this.calcularCicloAtual(
        mes || new Date().getMonth() + 1,
        ano || new Date().getFullYear(),
        new Date(empresa.inicio_vigencia),
        empresa.periodo_apuracao
      )
    };
  }

  /**
   * Calcula o ciclo atual baseado no mês/ano e início de vigência
   * 
   * @param mes - Mês atual (1-12)
   * @param ano - Ano atual
   * @param inicioVigencia - Data de início da vigência
   * @param periodoApuracao - Período de apuração em meses
   * @returns Número do ciclo atual (1, 2, 3, ...)
   * 
   * @example
   * // Início: Janeiro/26, Período: 6 meses
   * calcularCicloAtual(1, 2026, new Date('2026-01-01'), 6) // Retorna 1 (Janeiro = 1º mês = ciclo 1)
   * calcularCicloAtual(6, 2026, new Date('2026-01-01'), 6) // Retorna 1 (Junho = 6º mês = ciclo 1)
   * calcularCicloAtual(7, 2026, new Date('2026-01-01'), 6) // Retorna 2 (Julho = 7º mês = ciclo 2)
   * calcularCicloAtual(12, 2026, new Date('2026-01-01'), 6) // Retorna 2 (Dezembro = 12º mês = ciclo 2)
   */
  private calcularCicloAtual(
    mes: number,
    ano: number,
    inicioVigencia: Date,
    periodoApuracao: number
  ): number {
    const mesInicio = inicioVigencia.getUTCMonth() + 1;
    const anoInicio = inicioVigencia.getUTCFullYear();
    
    // Calcular quantos meses se passaram desde o início
    const mesesPassados = ((ano - anoInicio) * 12) + (mes - mesInicio + 1);
    
    // Calcular o ciclo atual (arredonda para cima)
    const cicloAtual = Math.ceil(mesesPassados / periodoApuracao);
    
    console.log('🔢 Calculando ciclo atual:', {
      mes,
      ano,
      mesInicio,
      anoInicio,
      periodoApuracao,
      mesesPassados,
      cicloAtual,
      calculo: `Math.ceil(${mesesPassados} / ${periodoApuracao}) = ${cicloAtual}`
    });
    
    return cicloAtual;
  }

  /**
   * Busca repasses do mês anterior
   * 
   * REGRA ESPECIAL: Para clientes com repasse especial, APENAS o primeiro mês do contrato
   * (mesesPassados === 1) deve iniciar com repasse zerado.
   */
  private async buscarRepassesMesAnterior(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ repasseHoras: string; repasseTickets: number }> {
    // Buscar parâmetros da empresa para verificar se tem repasse especial
    const parametros = await this.buscarParametrosEmpresa(empresaId, mes, ano);
    
    // ✅ CORREÇÃO FINAL: Se possui repasse especial, zerar repasse APENAS no primeiro mês do contrato
    if (parametros.possui_repasse_especial) {
      // Calcular quantos meses se passaram desde o início da vigência
      const mesInicio = parametros.inicio_vigencia.getUTCMonth() + 1;
      const anoInicio = parametros.inicio_vigencia.getUTCFullYear();
      const mesesPassados = ((ano - anoInicio) * 12) + (mes - mesInicio + 1);
      
      console.log('🔍 Verificando se deve zerar repasse (repasse especial):', {
        possui_repasse_especial: parametros.possui_repasse_especial,
        mes_atual: `${mes}/${ano}`,
        inicio_vigencia: parametros.inicio_vigencia.toISOString(),
        periodo_apuracao: parametros.periodo_apuracao,
        mesesPassados,
        decisao: (mesesPassados === 1) 
          ? 'ZERAR (primeiro mês do contrato)' 
          : 'BUSCAR REPASSE NORMAL'
      });
      
      // Zerar repasse APENAS se for o primeiro mês do contrato (mesesPassados === 1)
      // Isso garante que:
      // - Janeiro/26 (mesesPassados=1): Zera ✅
      // - Janeiro/27 (mesesPassados=13): NÃO zera, recebe repasse de Dezembro/26 ✅
      if (mesesPassados === 1) {
        console.log('✅ Primeiro mês do contrato - zerando repasse:', {
          mes: `${mes}/${ano}`,
          mesesPassados,
          motivo: 'Apenas o primeiro mês do contrato inicia com repasse zerado'
        });
        return {
          repasseHoras: '0:00',
          repasseTickets: 0
        };
      }
    }
    
    // Calcular mês anterior
    let mesAnterior = mes - 1;
    let anoAnterior = ano;

    if (mesAnterior < 1) {
      mesAnterior = 12;
      anoAnterior = ano - 1;
    }

    console.log('🔍 Buscando repasse do mês anterior:', {
      empresaId,
      mesAtual: mes,
      anoAtual: ano,
      mesAnterior,
      anoAnterior
    });

    // Buscar cálculo do mês anterior (sem versão)
    const { data: calculoAnterior, error } = await supabase
      .from('banco_horas_calculos' as any)
      .select('repasse_horas, repasse_tickets')
      .eq('empresa_id', empresaId)
      .eq('mes', mesAnterior)
      .eq('ano', anoAnterior)
      .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406

    console.log('📊 Resultado da busca de repasse do mês anterior:', {
      encontrado: !!calculoAnterior,
      mesAnterior: `${mesAnterior}/${anoAnterior}`,
      mesAtual: `${mes}/${ano}`,
      repasseHoras: (calculoAnterior as any)?.repasse_horas,
      repasseTickets: (calculoAnterior as any)?.repasse_tickets,
      error: error?.message,
      errorCode: error?.code,
      '⚠️ IMPORTANTE': 'Este valor vem do campo repasse_horas do mês anterior',
      '🔍 DEBUG': calculoAnterior ? 'Repasse encontrado no banco' : 'Repasse NÃO encontrado no banco'
    });

    // Ignorar TODOS os erros ao buscar repasse do mês anterior
    // Erros comuns:
    // - PGRST116: Registro não encontrado
    // - 406 (Not Acceptable): Tabela vazia ou problema de formato
    // - Outros: Problemas de conectividade, permissões, etc.
    if (error) {
      console.warn('⚠️ Erro ao buscar repasse do mês anterior (será ignorado):', {
        code: error.code,
        message: error.message,
        mesAnterior,
        anoAnterior
      });
      // Não lançar erro, apenas retornar zero
      return {
        repasseHoras: '0:00',
        repasseTickets: 0
      };
    }

    // Se não encontrou cálculo anterior, retornar zero
    if (!calculoAnterior) {
      console.log('⚠️ Nenhum cálculo anterior encontrado, retornando 0:00');
      return {
        repasseHoras: '0:00',
        repasseTickets: 0
      };
    }

    console.log('✅ Repasse do mês anterior encontrado:', {
      repasseHoras: (calculoAnterior as any).repasse_horas || '0:00',
      repasseTickets: (calculoAnterior as any).repasse_tickets || 0
    });

    return {
      repasseHoras: (calculoAnterior as any).repasse_horas || '0:00',
      repasseTickets: (calculoAnterior as any).repasse_tickets || 0
    };
  }

  /**
   * Busca reajustes de ENTRADA do mês
   * 
   * ✅ CORREÇÃO: Entradas DIMINUEM o consumo total (horas devolvidas/creditadas).
   * Retorna o total de entradas para SUBTRAIR do "Consumo Total".
   */
  private async buscarReajustesEntrada(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ horas: string; tickets: number }> {
    const { data: reajustes, error } = await supabase
      .from('banco_horas_reajustes' as any)
      .select('valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .eq('tipo_reajuste', 'entrada')
      .eq('ativo', true);

    if (error) {
      console.warn('⚠️ Erro ao buscar reajustes de entrada (não crítico):', error.message);
      return { horas: '0:00', tickets: 0 };
    }

    if (!reajustes || reajustes.length === 0) {
      return { horas: '0:00', tickets: 0 };
    }

    // Somar todas as entradas
    let totalEntradasMinutos = 0;
    let totalEntradasTickets = 0;

    for (const reajuste of reajustes) {
      if ((reajuste as any).valor_reajuste_horas) {
        const valorMinutos = converterHorasParaMinutos((reajuste as any).valor_reajuste_horas);
        totalEntradasMinutos += valorMinutos;
      }
      if ((reajuste as any).valor_reajuste_tickets) {
        totalEntradasTickets += (reajuste as any).valor_reajuste_tickets;
      }
    }

    const horasFormatadas = converterMinutosParaHoras(totalEntradasMinutos);

    console.log('➕ Reajustes de entrada calculados:', {
      totalReajustes: reajustes.length,
      totalEntradasMinutos,
      horasFormatadas,
      totalEntradasTickets
    });

    return {
      horas: horasFormatadas,
      tickets: totalEntradasTickets
    };
  }

  /**
   * Busca reajustes de SAÍDA do mês
   * 
   * ✅ CORREÇÃO: Saídas AUMENTAM o consumo total (horas gastas/debitadas).
   * Retorna o total de saídas para SOMAR no "Consumo Total".
   */
  private async buscarReajustesSaida(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ horas: string; tickets: number }> {
    const { data: reajustes, error } = await supabase
      .from('banco_horas_reajustes' as any)
      .select('valor_reajuste_horas, valor_reajuste_tickets, tipo_reajuste')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .eq('tipo_reajuste', 'saida')
      .eq('ativo', true);

    if (error) {
      console.warn('⚠️ Erro ao buscar reajustes de saída (não crítico):', error.message);
      return { horas: '0:00', tickets: 0 };
    }

    if (!reajustes || reajustes.length === 0) {
      return { horas: '0:00', tickets: 0 };
    }

    // Somar todas as saídas
    let totalSaidasMinutos = 0;
    let totalSaidasTickets = 0;

    for (const reajuste of reajustes) {
      if ((reajuste as any).valor_reajuste_horas) {
        const valorMinutos = converterHorasParaMinutos((reajuste as any).valor_reajuste_horas);
        totalSaidasMinutos += valorMinutos;
      }
      if ((reajuste as any).valor_reajuste_tickets) {
        totalSaidasTickets += (reajuste as any).valor_reajuste_tickets;
      }
    }

    const horasFormatadas = converterMinutosParaHoras(totalSaidasMinutos);

    console.log('➖ Reajustes de saída calculados:', {
      totalReajustes: reajustes.length,
      totalSaidasMinutos,
      horasFormatadas,
      totalSaidasTickets
    });

    return {
      horas: horasFormatadas,
      tickets: totalSaidasTickets
    };
  }

  /**
   * Calcula meses até fim do período
   */
  private calcularMesesAteFimPeriodo(
    mesInicial: number,
    anoInicial: number,
    inicioVigencia: Date,
    periodoApuracao: number
  ): Array<{ mes: number; ano: number }> {
    const meses: Array<{ mes: number; ano: number }> = [];
    
    let mesAtual = mesInicial;
    let anoAtual = anoInicial;

    // Adicionar mês inicial
    meses.push({ mes: mesAtual, ano: anoAtual });

    // Continuar até encontrar fim de período
    while (true) {
      // Verificar se é fim de período
      const isFim = repasseService.isFimPeriodo(
        mesAtual,
        anoAtual,
        inicioVigencia,
        periodoApuracao
      );

      if (isFim) {
        break;
      }

      // Avançar para próximo mês
      mesAtual++;
      if (mesAtual > 12) {
        mesAtual = 1;
        anoAtual++;
      }

      meses.push({ mes: mesAtual, ano: anoAtual });

      // Proteção contra loop infinito (máximo 12 meses)
      if (meses.length > 12) {
        break;
      }
    }

    return meses;
  }

  /**
   * Persiste cálculo no banco de dados
   * 
   * IMPORTANTE: Não cria versões aqui! Versões são criadas apenas quando há reajuste manual.
   * Usa UPSERT para evitar condições de corrida em cálculos simultâneos.
   */
  private async persistirCalculo(dados: Partial<BancoHorasCalculo>): Promise<BancoHorasCalculo> {
    console.log('💾 Persistindo cálculo (UPSERT):', {
      empresa_id: dados.empresa_id,
      mes: dados.mes,
      ano: dados.ano
    });

    // UPSERT: Insere se não existe, atualiza se já existe
    // onConflict especifica a constraint única (empresa_id, mes, ano)
    const { data: calculo, error } = await supabase
      .from('banco_horas_calculos' as any)
      .upsert({
        ...dados,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'empresa_id,mes,ano', // Constraint única
        ignoreDuplicates: false // Sempre atualizar se já existe
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao persistir cálculo:', error);
      throw new CalculationError(
        'persistir_calculo',
        `Erro ao persistir cálculo: ${error.message}`,
        dados
      );
    }

    console.log('✅ Cálculo persistido:', (calculo as any).id);
    return calculo as any as BancoHorasCalculo;
  }

  /**
   * Calcula todos os meses de um trimestre de uma vez
   * 
   * Quando o usuário abre a tela, calcula automaticamente os 3 meses do trimestre
   * para garantir que os repasses estejam corretos entre os meses.
   * 
   * @param empresaId - ID da empresa
   * @param mesInicial - Primeiro mês do trimestre (1, 4, 7, 10)
   * @param ano - Ano
   * @returns Array com os 3 cálculos do trimestre
   */
  async calcularTrimestre(
    empresaId: string,
    mesInicial: number,
    ano: number
  ): Promise<BancoHorasCalculo[]> {
    try {
      console.log('📅 Calculando trimestre completo:', {
        empresaId,
        mesInicial,
        ano
      });

      const calculos: BancoHorasCalculo[] = [];

      // Calcular os 3 meses sequencialmente
      for (let i = 0; i < 3; i++) {
        const mes = mesInicial + i;
        console.log(`🔄 Calculando mês ${mes}/${ano}...`);
        
        const calculo = await this.calcularMes(empresaId, mes, ano);
        calculos.push(calculo);
      }

      console.log('✅ Trimestre calculado com sucesso');
      return calculos;
    } catch (error) {
      console.error('❌ Erro ao calcular trimestre:', error);
      throw new CalculationError(
        'calcular_trimestre',
        `Erro ao calcular trimestre: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { empresaId, mesInicial, ano }
      );
    }
  }
}

// Exportar instância singleton
export const bancoHorasService = new BancoHorasService();
