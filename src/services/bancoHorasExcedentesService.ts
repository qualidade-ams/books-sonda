/**
 * Serviço de Cálculo de Excedentes de Banco de Horas
 * 
 * Implementa a lógica de cálculo de excedentes quando o saldo final do período é negativo:
 * - Busca taxa de hora/ticket mais antiga do mês
 * - Calcula valor monetário do excedente
 * - Gera descrição padronizada para faturamento
 * - Valida disponibilidade de taxas
 * 
 * @module bancoHorasExcedentesService
 */

import { supabase } from '@/integrations/supabase/client';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';

/**
 * Resultado do cálculo de excedente
 */
export interface ResultadoExcedente {
  /** Valor do excedente em horas (formato HH:MM) ou tickets (número) */
  excedente: string | number;
  /** Valor monetário do excedente (R$) */
  valorExcedente: number;
  /** Taxa utilizada no cálculo (R$ por hora ou por ticket) */
  taxaUtilizada: number | null;
  /** Indica se taxa foi encontrada */
  taxaEncontrada: boolean;
  /** Mensagem de alerta se taxa ausente */
  alerta?: string;
}

/**
 * Resultado da geração de descrição de faturamento
 */
export interface DescricaoFaturamento {
  /** Descrição formatada para solicitação de PO */
  descricao: string;
  /** Nome da empresa */
  empresaNome: string;
  /** Período (MM/YYYY) */
  periodo: string;
  /** Saldo negativo (valor absoluto) */
  saldoNegativo: string | number;
  /** Valor a faturar (R$) */
  valorFaturar: number;
}

/**
 * Calcula excedente quando saldo final do período é negativo
 * 
 * Regras:
 * - Excedente só é gerado quando saldo < 0 ao final do período de apuração
 * - Busca taxa mais antiga do mês para cálculo
 * - Valor = |saldo| × taxa
 * - Se taxa ausente, retorna alerta e não calcula valor
 * 
 * @param empresaId - ID da empresa cliente
 * @param saldo - Saldo do mês (negativo) em formato HH:MM (horas) ou número (tickets)
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param tipoContrato - Tipo de contrato ('horas', 'tickets', 'ambos')
 * @returns Resultado do cálculo com excedente e valor monetário
 * 
 * @example
 * // Saldo negativo de horas
 * await calcularExcedente('uuid-empresa', '-10:30', 1, 2024, 'horas')
 * // { excedente: '10:30', valorExcedente: 1050, taxaUtilizada: 100, taxaEncontrada: true }
 * 
 * @example
 * // Saldo negativo de tickets
 * await calcularExcedente('uuid-empresa', -5, 1, 2024, 'tickets')
 * // { excedente: 5, valorExcedente: 2500, taxaUtilizada: 500, taxaEncontrada: true }
 * 
 * @example
 * // Taxa ausente
 * await calcularExcedente('uuid-empresa', '-10:00', 1, 2024, 'horas')
 * // { excedente: '10:00', valorExcedente: 0, taxaUtilizada: null, taxaEncontrada: false, alerta: '...' }
 * 
 * **Validates: Requirements 10.1-10.10**
 * **Property 13: Geração de Excedente para Saldo Negativo**
 * **Property 14: Cálculo de Valor de Excedente**
 * **Property 15: Excedente Zero para Saldo Não-Negativo**
 * **Property 25: Alerta de Taxa Ausente**
 */
export async function calcularExcedente(
  empresaId: string,
  saldo: string | number,
  mes: number,
  ano: number,
  tipoContrato: 'horas' | 'tickets' | 'ambos'
): Promise<ResultadoExcedente> {
  try {
    console.log('🔍 BancoHorasExcedentesService.calcularExcedente:', {
      empresaId,
      saldo,
      mes,
      ano,
      tipoContrato
    });

    // Validar parâmetros
    if (!empresaId?.trim()) {
      throw new Error('ID da empresa é obrigatório');
    }

    if (mes < 1 || mes > 12) {
      throw new Error('Mês deve estar entre 1 e 12');
    }

    if (ano < 2020) {
      throw new Error('Ano deve ser maior ou igual a 2020');
    }

    // Verificar se saldo é negativo
    const isHoras = typeof saldo === 'string';
    const isNegativo = isHoras 
      ? saldo.startsWith('-')
      : saldo < 0;

    // Se saldo não é negativo, retornar excedente zero
    if (!isNegativo) {
      console.log('✅ Saldo não é negativo, excedente = 0');
      return {
        excedente: isHoras ? '0:00' : 0,
        valorExcedente: 0,
        taxaUtilizada: null,
        taxaEncontrada: false
      };
    }

    // Calcular valor absoluto do saldo (excedente)
    let excedente: string | number;
    let excedenteMagnitude: number; // Para cálculo monetário

    if (isHoras) {
      // Remover sinal negativo e converter para minutos
      const saldoLimpo = (saldo as string).substring(1); // Remove '-'
      excedente = saldoLimpo;
      excedenteMagnitude = converterHorasParaMinutos(saldoLimpo) / 60; // Converter para horas decimais
    } else {
      // Tickets: valor absoluto
      excedente = Math.abs(saldo as number);
      excedenteMagnitude = excedente;
    }

    console.log('📊 Excedente calculado:', {
      excedente,
      excedenteMagnitude,
      tipo: isHoras ? 'horas' : 'tickets'
    });

    // Buscar taxa do mês
    const taxa = await buscarTaxaMes(empresaId, mes, ano, tipoContrato);

    // Se taxa não encontrada, retornar alerta
    if (taxa === null) {
      const alerta = 'Taxa não encontrada para o período. Excedente não pode ser calculado.';
      console.warn('⚠️', alerta);
      
      return {
        excedente,
        valorExcedente: 0,
        taxaUtilizada: null,
        taxaEncontrada: false,
        alerta
      };
    }

    // Calcular valor monetário do excedente
    const valorExcedente = excedenteMagnitude * taxa;

    console.log('✅ Excedente calculado com sucesso:', {
      excedente,
      taxa,
      valorExcedente: `R$ ${valorExcedente.toFixed(2)}`
    });

    return {
      excedente,
      valorExcedente,
      taxaUtilizada: taxa,
      taxaEncontrada: true
    };
  } catch (error) {
    console.error('❌ Erro ao calcular excedente:', error);
    throw new Error(
      `Erro ao calcular excedente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

/**
 * Busca taxa mais antiga do mês para cálculo de excedentes
 * 
 * Regras:
 * - Busca taxas vigentes no mês especificado
 * - Se múltiplas taxas existem, usa a mais antiga (menor data_inicio)
 * - Retorna null se nenhuma taxa encontrada
 * 
 * @param empresaId - ID da empresa cliente
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param tipoContrato - Tipo de contrato para determinar qual taxa buscar
 * @returns Taxa em R$ por hora/ticket ou null se não encontrada
 * 
 * @example
 * // Taxa encontrada
 * await buscarTaxaMes('uuid-empresa', 1, 2024, 'horas') // 100.00
 * 
 * @example
 * // Múltiplas taxas (retorna mais antiga)
 * // Taxa 1: data_inicio = 2024-01-10, valor = 120
 * // Taxa 2: data_inicio = 2024-01-05, valor = 100
 * await buscarTaxaMes('uuid-empresa', 1, 2024, 'horas') // 100 (mais antiga)
 * 
 * @example
 * // Taxa não encontrada
 * await buscarTaxaMes('uuid-empresa', 1, 2024, 'horas') // null
 * 
 * **Validates: Requirements 10.3, 14.5, 14.6**
 * **Property 24: Taxa Mais Antiga do Mês**
 */
export async function buscarTaxaMes(
  empresaId: string,
  mes: number,
  ano: number,
  tipoContrato: 'horas' | 'tickets' | 'ambos'
): Promise<number | null> {
  try {
    console.log('🔍 BancoHorasExcedentesService.buscarTaxaMes:', {
      empresaId,
      mes,
      ano,
      tipoContrato
    });

    // Calcular data de referência (primeiro dia do mês)
    const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;

    console.log('📅 Data de referência:', dataReferencia);

    // Buscar taxas vigentes no mês
    // Uma taxa é vigente se:
    // - vigencia_inicio <= data_referencia
    // - vigencia_fim >= data_referencia OU vigencia_fim IS NULL
    const { data: taxas, error } = await supabase
      .from('taxas_clientes')
      .select('id, vigencia_inicio, vigencia_fim, tipo_produto')
      .eq('cliente_id', empresaId)
      .lte('vigencia_inicio', dataReferencia)
      .or(`vigencia_fim.is.null,vigencia_fim.gte.${dataReferencia}`)
      .order('vigencia_inicio', { ascending: true }); // Ordenar por mais antiga primeiro

    if (error) {
      console.error('❌ Erro ao buscar taxas:', error);
      throw new Error(`Erro ao buscar taxas: ${error.message}`);
    }

    if (!taxas || taxas.length === 0) {
      console.log('⚠️ Nenhuma taxa encontrada para o período');
      return null;
    }

    console.log('📊 Taxas encontradas:', {
      quantidade: taxas.length,
      taxas: taxas.map(t => ({
        id: t.id,
        vigencia_inicio: t.vigencia_inicio,
        vigencia_fim: t.vigencia_fim,
        tipo_produto: t.tipo_produto
      }))
    });

    // Pegar a taxa mais antiga (primeira da lista ordenada)
    const taxaMaisAntiga = taxas[0];

    console.log('✅ Taxa mais antiga selecionada:', {
      id: taxaMaisAntiga.id,
      vigencia_inicio: taxaMaisAntiga.vigencia_inicio
    });

    // Buscar valores da taxa
    // Para horas: buscar valor_base da função 'Funcional' tipo 'remota'
    // Para tickets: buscar valor_ticket da tabela taxas_clientes
    if (tipoContrato === 'horas' || tipoContrato === 'ambos') {
      // Buscar valor de hora (função Funcional, tipo remota)
      const { data: valores, error: valoresError } = await supabase
        .from('valores_taxas_funcoes')
        .select('valor_base')
        .eq('taxa_id', taxaMaisAntiga.id)
        .eq('funcao', 'Funcional')
        .eq('tipo_hora', 'remota')
        .limit(1);

      if (valoresError) {
        console.error('❌ Erro ao buscar valores da taxa:', valoresError);
        throw new Error(`Erro ao buscar valores da taxa: ${valoresError.message}`);
      }

      if (valores && valores.length > 0) {
        const taxaHora = valores[0].valor_base;
        console.log('✅ Taxa de hora encontrada:', `R$ ${taxaHora}`);
        return taxaHora;
      }
    }

    if (tipoContrato === 'tickets' || tipoContrato === 'ambos') {
      // Buscar valor de ticket da tabela taxas_clientes
      const { data: taxaData, error: taxaError } = await supabase
        .from('taxas_clientes')
        .select('valor_ticket')
        .eq('id', taxaMaisAntiga.id)
        .single();

      if (taxaError) {
        console.error('❌ Erro ao buscar valor de ticket:', taxaError);
        throw new Error(`Erro ao buscar valor de ticket: ${taxaError.message}`);
      }

      if (taxaData && taxaData.valor_ticket) {
        const taxaTicket = taxaData.valor_ticket;
        console.log('✅ Taxa de ticket encontrada:', `R$ ${taxaTicket}`);
        return taxaTicket;
      }
    }

    console.log('⚠️ Taxa encontrada mas sem valores configurados');
    return null;
  } catch (error) {
    console.error('❌ Erro ao buscar taxa do mês:', error);
    throw new Error(
      `Erro ao buscar taxa do mês: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

/**
 * Gera descrição padronizada para faturamento de excedentes
 * 
 * Formato padrão:
 * "Excedente de [SALDO_NEGATIVO] horas no período [MES/ANO] - Valor: R$ [VALOR_EXCEDENTE]"
 * 
 * Inclui nome da empresa para contexto.
 * 
 * @param empresaNome - Nome da empresa cliente
 * @param saldoNegativo - Saldo negativo (valor absoluto) em formato HH:MM ou número
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param valorExcedente - Valor monetário do excedente (R$)
 * @param tipoContrato - Tipo de contrato para determinar unidade (horas/tickets)
 * @returns Objeto com descrição formatada e metadados
 * 
 * @example
 * // Excedente de horas
 * gerarDescricaoFaturamento('SOUZA CRUZ', '10:30', 1, 2024, 1050, 'horas')
 * // {
 * //   descricao: "Excedente de 10:30 horas no período 01/2024 - Valor: R$ 1.050,00",
 * //   empresaNome: "SOUZA CRUZ",
 * //   periodo: "01/2024",
 * //   saldoNegativo: "10:30",
 * //   valorFaturar: 1050
 * // }
 * 
 * @example
 * // Excedente de tickets
 * gerarDescricaoFaturamento('WHIRLPOOL', 5, 1, 2024, 2500, 'tickets')
 * // {
 * //   descricao: "Excedente de 5 tickets no período 01/2024 - Valor: R$ 2.500,00",
 * //   empresaNome: "WHIRLPOOL",
 * //   periodo: "01/2024",
 * //   saldoNegativo: 5,
 * //   valorFaturar: 2500
 * // }
 * 
 * **Validates: Requirements 11.1-11.8**
 * **Property 26: Formato de Descrição de Faturamento**
 */
export function gerarDescricaoFaturamento(
  empresaNome: string,
  saldoNegativo: string | number,
  mes: number,
  ano: number,
  valorExcedente: number,
  tipoContrato: 'horas' | 'tickets' | 'ambos'
): DescricaoFaturamento {
  try {
    console.log('🔍 BancoHorasExcedentesService.gerarDescricaoFaturamento:', {
      empresaNome,
      saldoNegativo,
      mes,
      ano,
      valorExcedente,
      tipoContrato
    });

    // Formatar período (MM/YYYY)
    const periodo = `${String(mes).padStart(2, '0')}/${ano}`;

    // Formatar valor monetário (R$ 1.234,56)
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorExcedente);

    // Determinar unidade (horas ou tickets)
    const unidade = tipoContrato === 'tickets' ? 'tickets' : 'horas';

    // Gerar descrição padronizada
    const descricao = `Excedente de ${saldoNegativo} ${unidade} no período ${periodo} - Valor: ${valorFormatado}`;

    console.log('✅ Descrição gerada:', descricao);

    return {
      descricao,
      empresaNome,
      periodo,
      saldoNegativo,
      valorFaturar: valorExcedente
    };
  } catch (error) {
    console.error('❌ Erro ao gerar descrição de faturamento:', error);
    throw new Error(
      `Erro ao gerar descrição de faturamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

/**
 * Classe principal do serviço de excedentes
 * 
 * Encapsula toda a lógica de cálculo de excedentes e geração de descrições
 * para faturamento, fornecendo uma interface limpa para uso em outros serviços.
 */
export class ExcedentesService {
  /**
   * Calcula excedente se saldo negativo
   * @see calcularExcedente
   */
  async calcularExcedente(
    empresaId: string,
    saldo: string | number,
    mes: number,
    ano: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos'
  ): Promise<ResultadoExcedente> {
    return calcularExcedente(empresaId, saldo, mes, ano, tipoContrato);
  }

  /**
   * Gera descrição para faturamento
   * @see gerarDescricaoFaturamento
   */
  gerarDescricaoFaturamento(
    empresaNome: string,
    saldoNegativo: string | number,
    mes: number,
    ano: number,
    valorExcedente: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos'
  ): DescricaoFaturamento {
    return gerarDescricaoFaturamento(
      empresaNome,
      saldoNegativo,
      mes,
      ano,
      valorExcedente,
      tipoContrato
    );
  }

  /**
   * Busca taxa mais antiga do mês
   * @see buscarTaxaMes
   */
  async buscarTaxaMes(
    empresaId: string,
    mes: number,
    ano: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos'
  ): Promise<number | null> {
    return buscarTaxaMes(empresaId, mes, ano, tipoContrato);
  }
}

// Exportar instância singleton
export const excedentesService = new ExcedentesService();
