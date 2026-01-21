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
  versao: number;
  
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
   * 4. Calcula saldo a utilizar
   * 5. Busca consumo e requerimentos
   * 6. Calcula consumo total
   * 7. Calcula saldo
   * 8. Calcula repasse
   * 9. Calcula excedentes (se aplicável)
   * 10. Persiste resultado
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
   * **Property 6: Fórmula de Saldo a Utilizar**
   * **Property 7: Fórmula de Consumo Total**
   * **Property 8: Fórmula de Saldo Mensal**
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

      // 1. Buscar parâmetros da empresa
      const parametros = await this.buscarParametrosEmpresa(empresaId);
      
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
        horas: repasseHoras,
        tickets: repasseTickets
      });

      // 4. Calcular saldo a utilizar = baseline + repasses_mes_anterior
      const saldoAUtilizarHoras = somarHoras(baselineHoras, repasseHoras);
      const saldoAUtilizarTickets = baselineTickets + repasseTickets;

      console.log('💰 Saldo a utilizar:', {
        horas: saldoAUtilizarHoras,
        tickets: saldoAUtilizarTickets
      });

      // 5. Buscar consumo e requerimentos
      const { horas: consumoHoras, tickets: consumoTickets } = 
        await bancoHorasIntegracaoService.buscarConsumo(empresaId, mes, ano);
      
      const { horas: requerimentosHoras, tickets: requerimentosTickets } = 
        await bancoHorasIntegracaoService.buscarRequerimentos(empresaId, mes, ano);

      console.log('📊 Consumo e requerimentos:', {
        consumo: { horas: consumoHoras, tickets: consumoTickets },
        requerimentos: { horas: requerimentosHoras, tickets: requerimentosTickets }
      });

      // 6. Buscar reajustes (se existirem)
      const { horas: reajustesHoras, tickets: reajustesTickets } = 
        await this.buscarReajustes(empresaId, mes, ano);

      console.log('🔧 Reajustes:', {
        horas: reajustesHoras,
        tickets: reajustesTickets
      });

      // 7. Calcular consumo total = consumo + requerimentos - reajustes
      const consumoTotalHoras = this.calcularConsumoTotal(
        consumoHoras,
        requerimentosHoras,
        reajustesHoras
      );
      const consumoTotalTickets = consumoTickets + requerimentosTickets - reajustesTickets;

      console.log('📈 Consumo total:', {
        horas: consumoTotalHoras,
        tickets: consumoTotalTickets
      });

      // 8. Calcular saldo = saldo_a_utilizar - consumo_total
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
      const resultadoRepasseHoras = repasseService.calcularRepasseCompleto(
        saldoHoras,
        mes,
        ano,
        parametros.inicio_vigencia,
        parametros.periodo_apuracao,
        parametros.percentual_repasse_mensal,
        parametros.possui_repasse_especial,
        parametros.ciclo_atual,
        parametros.ciclos_para_zerar
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
        parametros.ciclos_para_zerar
      );

      console.log('🔄 Repasse:', {
        horas: resultadoRepasseHoras.repasse,
        tickets: resultadoRepasseTickets.repasse,
        gerarExcedente: resultadoRepasseHoras.gerarExcedente || resultadoRepasseTickets.gerarExcedente
      });

      // 11. Calcular excedentes (se aplicável)
      let excedenteHoras = '0:00';
      let excedenteTickets = 0;
      let valorExcedenteHoras = 0;
      let valorExcedenteTickets = 0;
      let taxaHoraUtilizada: number | null = null;
      let taxaTicketUtilizada: number | null = null;
      let observacaoPublica = '';

      if (resultadoRepasseHoras.gerarExcedente || resultadoRepasseTickets.gerarExcedente) {
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
        valorTickets: valorExcedenteTickets
      });

      // 12. Calcular valor total a faturar
      const valorAFaturar = valorExcedenteHoras + valorExcedenteTickets;

      // 13. Persistir cálculo
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
        reajustes_horas: reajustesHoras,
        reajustes_tickets: reajustesTickets,
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

      console.log('✅ Cálculo persistido:', calculo.id);

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

      // Buscar cálculo existente (versão mais recente)
      const { data: calculoExistente, error } = await supabase
        .from('banco_horas_calculos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano)
        .order('versao', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new Error(`Erro ao buscar cálculo existente: ${error.message}`);
      }

      // Se encontrou cálculo, retornar
      if (calculoExistente) {
        console.log('✅ Cálculo existente encontrado:', calculoExistente.id);
        return calculoExistente as BancoHorasCalculo;
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
      const mesesARecalcular = this.calcularMesesAteF
imPeriodo(
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
   */
  private async buscarParametrosEmpresa(empresaId: string): Promise<ParametrosEmpresa> {
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

    return {
      id: empresa.id,
      tipo_contrato: empresa.tipo_contrato,
      periodo_apuracao: empresa.periodo_apuracao,
      inicio_vigencia: new Date(empresa.inicio_vigencia),
      baseline_horas_mensal: empresa.baseline_horas_mensal,
      baseline_tickets_mensal: empresa.baseline_tickets_mensal,
      possui_repasse_especial: empresa.possui_repasse_especial || false,
      ciclos_para_zerar: empresa.ciclos_para_zerar || 1,
      percentual_repasse_mensal: empresa.percentual_repasse_mensal || 0,
      ciclo_atual: empresa.ciclo_atual || 1
    };
  }

  /**
   * Busca repasses do mês anterior
   */
  private async buscarRepassesMesAnterior(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ repasseHoras: string; repasseTickets: number }> {
    // Calcular mês anterior
    let mesAnterior = mes - 1;
    let anoAnterior = ano;

    if (mesAnterior < 1) {
      mesAnterior = 12;
      anoAnterior = ano - 1;
    }

    // Buscar cálculo do mês anterior
    const { data: calculoAnterior, error } = await supabase
      .from('banco_horas_calculos')
      .select('repasse_horas, repasse_tickets')
      .eq('empresa_id', empresaId)
      .eq('mes', mesAnterior)
      .eq('ano', anoAnterior)
      .order('versao', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new CalculationError(
        'buscar_repasses_mes_anterior',
        `Erro ao buscar repasses do mês anterior: ${error.message}`,
        { empresaId, mes, ano }
      );
    }

    // Se não encontrou cálculo anterior, retornar zero
    if (!calculoAnterior) {
      return {
        repasseHoras: '0:00',
        repasseTickets: 0
      };
    }

    return {
      repasseHoras: calculoAnterior.repasse_horas || '0:00',
      repasseTickets: calculoAnterior.repasse_tickets || 0
    };
  }

  /**
   * Busca reajustes do mês
   */
  private async buscarReajustes(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<{ horas: string; tickets: number }> {
    const { data: reajustes, error } = await supabase
      .from('banco_horas_reajustes')
      .select('valor_reajuste_horas, valor_reajuste_tickets')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .eq('ativo', true);

    if (error) {
      throw new CalculationError(
        'buscar_reajustes',
        `Erro ao buscar reajustes: ${error.message}`,
        { empresaId, mes, ano }
      );
    }

    if (!reajustes || reajustes.length === 0) {
      return {
        horas: '0:00',
        tickets: 0
      };
    }

    // Somar todos os reajustes
    let totalHorasMinutos = 0;
    let totalTickets = 0;

    for (const reajuste of reajustes) {
      if (reajuste.valor_reajuste_horas) {
        totalHorasMinutos += converterHorasParaMinutos(reajuste.valor_reajuste_horas);
      }
      if (reajuste.valor_reajuste_tickets) {
        totalTickets += reajuste.valor_reajuste_tickets;
      }
    }

    return {
      horas: converterMinutosParaHoras(totalHorasMinutos),
      tickets: totalTickets
    };
  }

  /**
   * Calcula consumo total = consumo + requerimentos - reajustes
   */
  private calcularConsumoTotal(
    consumo: string,
    requerimentos: string,
    reajustes: string
  ): string {
    // Somar consumo + requerimentos
    const somaConsumoRequerimentos = somarHoras(consumo, requerimentos);
    
    // Subtrair reajustes
    return subtrairHoras(somaConsumoRequerimentos, reajustes);
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
   */
  private async persistirCalculo(dados: Partial<BancoHorasCalculo>): Promise<BancoHorasCalculo> {
    // Buscar versão atual
    const { data: calculoExistente } = await supabase
      .from('banco_horas_calculos')
      .select('versao')
      .eq('empresa_id', dados.empresa_id!)
      .eq('mes', dados.mes!)
      .eq('ano', dados.ano!)
      .order('versao', { ascending: false })
      .limit(1)
      .single();

    const novaVersao = calculoExistente ? calculoExistente.versao + 1 : 1;

    // Inserir novo cálculo
    const { data: calculo, error } = await supabase
      .from('banco_horas_calculos')
      .insert({
        ...dados,
        versao: novaVersao,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new CalculationError(
        'persistir_calculo',
        `Erro ao persistir cálculo: ${error.message}`,
        dados
      );
    }

    return calculo as BancoHorasCalculo;
  }
}

// Exportar instância singleton
export const bancoHorasService = new BancoHorasService();
