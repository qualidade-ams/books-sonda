/**
 * Serviço de Repasse de Banco de Horas
 * 
 * Implementa a lógica de repasse de saldo entre meses conforme regras contratuais:
 * - Saldo positivo: aplica percentual configurado
 * - Saldo negativo: repassa 100% (saldo completo)
 * - Fim de período: aplica regras de fechamento e repasse especial
 * 
 * @module bancoHorasRepasseService
 */

import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';

/**
 * Resultado do cálculo de repasse
 */
export interface ResultadoRepasse {
  /** Valor do repasse em formato HH:MM */
  repasse: string;
  /** Indica se é fim de período de apuração */
  isFimPeriodo: boolean;
  /** Indica se deve gerar excedente */
  gerarExcedente: boolean;
}

/**
 * Resultado da aplicação de fechamento de período
 */
export interface ResultadoFechamento {
  /** Saldo final após aplicação das regras de fechamento */
  saldoFinal: string;
  /** Indica se deve gerar excedente para faturamento */
  gerarExcedente: boolean;
  /** Repasse para o próximo período (se aplicável) */
  repasse: string;
}

/**
 * Calcula o repasse de saldo para o próximo mês
 * 
 * Regras:
 * - Se saldo >= 0: repasse = saldo × (percentual_repasse_mensal / 100)
 * - Se saldo < 0: repasse = saldo (100% do saldo negativo)
 * 
 * @param saldo - Saldo do mês em formato HH:MM (pode ser negativo com prefixo -)
 * @param percentualRepasse - Percentual de repasse (0-100)
 * @returns Valor do repasse em formato HH:MM
 * 
 * @example
 * // Saldo positivo com 50% de repasse
 * calcularRepasse('10:00', 50) // '5:00'
 * 
 * @example
 * // Saldo negativo (repassa 100%)
 * calcularRepasse('-10:00', 50) // '-10:00'
 * 
 * @example
 * // Saldo positivo com 0% de repasse
 * calcularRepasse('10:00', 0) // '0:00'
 * 
 * @example
 * // Saldo positivo com 100% de repasse
 * calcularRepasse('10:00', 100) // '10:00'
 * 
 * **Validates: Requirements 6.10, 6.11, 7.2, 7.3, 7.7, 7.8**
 * **Property 9: Repasse de Saldo Positivo**
 * **Property 10: Repasse de Saldo Negativo**
 */
export function calcularRepasse(
  saldo: string,
  percentualRepasse: number
): string {
  // Validar percentual
  if (percentualRepasse < 0 || percentualRepasse > 100) {
    throw new Error(`Percentual de repasse inválido: ${percentualRepasse}. Deve estar entre 0 e 100.`);
  }

  // Verificar se saldo é negativo
  const isNegativo = saldo.startsWith('-');
  const saldoLimpo = isNegativo ? saldo.substring(1) : saldo;
  
  // Converter para minutos
  const saldoMinutos = converterHorasParaMinutos(saldoLimpo);
  
  // Se saldo é negativo, repassa 100% (saldo completo)
  if (isNegativo) {
    return `-${converterMinutosParaHoras(saldoMinutos)}`;
  }
  
  // Se saldo é positivo, aplica percentual
  // CORREÇÃO: Usar Math.round() em vez de Math.floor() para evitar perda de precisão
  const repasseMinutos = Math.round(saldoMinutos * (percentualRepasse / 100));
  const repasseCalculado = converterMinutosParaHoras(repasseMinutos);
  
  // Log de debug
  console.log('🔄 Cálculo de Repasse:', {
    saldo,
    saldoMinutos,
    percentualRepasse,
    repasseMinutos,
    repasseCalculado,
    metodoArredondamento: 'Math.round (arredonda para o mais próximo)'
  });
  
  return repasseCalculado;
}

/**
 * Verifica se o mês atual é o último do período de apuração
 * 
 * Calcula quantos meses se passaram desde o início da vigência e verifica
 * se o mês atual completa um ciclo de período de apuração.
 * 
 * @param mes - Mês atual (1-12)
 * @param ano - Ano atual
 * @param inicioVigencia - Data de início da vigência do contrato
 * @param periodoApuracao - Duração do período de apuração em meses (1-12)
 * @returns true se é o último mês do período, false caso contrário
 * 
 * @example
 * // Vigência iniciou em 01/2024, período de 3 meses
 * isFimPeriodo(3, 2024, new Date('2024-01-01'), 3) // true (mês 3 completa o período)
 * isFimPeriodo(2, 2024, new Date('2024-01-01'), 3) // false (ainda falta 1 mês)
 * 
 * @example
 * // Vigência iniciou em 01/2024, período de 12 meses
 * isFimPeriodo(12, 2024, new Date('2024-01-01'), 12) // true (mês 12 completa o período)
 * isFimPeriodo(6, 2024, new Date('2024-01-01'), 12) // false (ainda falta 6 meses)
 * 
 * @example
 * // Vigência iniciou em 10/2023, período de 6 meses
 * isFimPeriodo(3, 2024, new Date('2023-10-01'), 6) // true (6 meses depois: out, nov, dez, jan, fev, mar)
 * 
 * **Validates: Requirements 7.5, 8.1**
 */
export function isFimPeriodo(
  mes: number,
  ano: number,
  inicioVigencia: Date,
  periodoApuracao: number
): boolean {
  // Validar entradas
  if (mes < 1 || mes > 12) {
    throw new Error(`Mês inválido: ${mes}. Deve estar entre 1 e 12.`);
  }
  
  if (periodoApuracao < 1 || periodoApuracao > 12) {
    throw new Error(`Período de apuração inválido: ${periodoApuracao}. Deve estar entre 1 e 12.`);
  }
  
  // Extrair mês e ano de início da vigência
  // Usar UTC para evitar problemas de timezone
  const mesInicio = inicioVigencia.getUTCMonth() + 1; // getUTCMonth() retorna 0-11, converter para 1-12
  const anoInicio = inicioVigencia.getUTCFullYear();
  
  // Calcular quantos meses se passaram desde o início da vigência (inclusive o mês atual)
  // Exemplo: se início é 01/2024 e estamos em 03/2024, passaram 3 meses (jan, fev, mar)
  const mesesPassados = ((ano - anoInicio) * 12) + (mes - mesInicio + 1);
  
  // Verificar se o mês atual completa um período de apuração
  // Um período é completado quando mesesPassados é múltiplo de periodoApuracao
  const resultado = mesesPassados > 0 && mesesPassados % periodoApuracao === 0;
  
  // Log de debug
  console.log('🔍 isFimPeriodo - Debug:', {
    mes,
    ano,
    mesInicio,
    anoInicio,
    periodoApuracao,
    mesesPassados,
    'mesesPassados % periodoApuracao': mesesPassados % periodoApuracao,
    resultado
  });
  
  return resultado;
}

/**
 * Aplica regras de fechamento de período de apuração
 * 
 * Regras de fechamento:
 * 
 * **Sem Repasse Especial (possui_repasse_especial = false):**
 * - Saldo positivo: zerado (não repassa para próximo período)
 * - Saldo negativo: gera excedente para faturamento
 * 
 * **Com Repasse Especial (possui_repasse_especial = true):**
 * - Saldo positivo:
 *   - Se ciclo_atual < ciclos_para_zerar: repassa para próximo período
 *   - Se ciclo_atual = ciclos_para_zerar: zerado
 * - Saldo negativo: sempre gera excedente (independente do ciclo)
 * 
 * @param saldo - Saldo do último mês do período em formato HH:MM
 * @param possuiRepasseEspecial - Indica se contrato tem repasse especial
 * @param cicloAtual - Número do ciclo atual (1, 2, 3, ...)
 * @param ciclosParaZerar - Quantidade de ciclos antes de zerar saldo positivo
 * @returns Resultado do fechamento com saldo final, flag de excedente e repasse
 * 
 * @example
 * // Sem repasse especial, saldo positivo
 * aplicarFechamento('10:00', false, 1, 1)
 * // { saldoFinal: '0:00', gerarExcedente: false, repasse: '0:00' }
 * 
 * @example
 * // Sem repasse especial, saldo negativo
 * aplicarFechamento('-10:00', false, 1, 1)
 * // { saldoFinal: '-10:00', gerarExcedente: true, repasse: '0:00' }
 * 
 * @example
 * // Com repasse especial, saldo positivo, ciclo 1 de 3
 * aplicarFechamento('10:00', true, 1, 3)
 * // { saldoFinal: '10:00', gerarExcedente: false, repasse: '10:00' }
 * 
 * @example
 * // Com repasse especial, saldo positivo, ciclo 3 de 3 (último ciclo)
 * aplicarFechamento('10:00', true, 3, 3)
 * // { saldoFinal: '0:00', gerarExcedente: false, repasse: '0:00' }
 * 
 * @example
 * // Com repasse especial, saldo negativo (sempre gera excedente)
 * aplicarFechamento('-10:00', true, 1, 3)
 * // { saldoFinal: '-10:00', gerarExcedente: true, repasse: '0:00' }
 * 
 * **Validates: Requirements 8.1-8.9**
 * **Property 12: Zeragem de Saldo Positivo sem Repasse Especial**
 * **Property 13: Geração de Excedente para Saldo Negativo**
 * **Property 30: Ciclos para Zerar com Repasse Especial**
 */
export function aplicarFechamento(
  saldo: string,
  possuiRepasseEspecial: boolean,
  cicloAtual: number,
  ciclosParaZerar: number
): ResultadoFechamento {
  // Validar ciclos
  if (cicloAtual < 1) {
    throw new Error(`Ciclo atual inválido: ${cicloAtual}. Deve ser >= 1.`);
  }
  
  if (ciclosParaZerar < 1) {
    throw new Error(`Ciclos para zerar inválido: ${ciclosParaZerar}. Deve ser >= 1.`);
  }
  
  // Verificar se saldo é negativo
  const isNegativo = saldo.startsWith('-');
  
  // Saldo negativo SEMPRE gera excedente (independente de repasse especial ou ciclo)
  if (isNegativo) {
    return {
      saldoFinal: saldo,
      gerarExcedente: true,
      repasse: '0:00'
    };
  }
  
  // Saldo positivo - aplicar regras conforme configuração
  
  // Sem repasse especial: zera saldo positivo
  if (!possuiRepasseEspecial) {
    return {
      saldoFinal: '0:00',
      gerarExcedente: false,
      repasse: '0:00'
    };
  }
  
  // Com repasse especial: verificar ciclo
  
  // Se ainda não atingiu o último ciclo: repassa saldo para próximo período
  if (cicloAtual < ciclosParaZerar) {
    return {
      saldoFinal: saldo,
      gerarExcedente: false,
      repasse: saldo // Repassa 100% do saldo positivo
    };
  }
  
  // Se atingiu o último ciclo: zera saldo positivo
  return {
    saldoFinal: '0:00',
    gerarExcedente: false,
    repasse: '0:00'
  };
}

/**
 * Calcula repasse completo considerando se é fim de período
 * 
 * Esta função combina a lógica de repasse mensal com as regras de fechamento
 * de período, retornando um resultado unificado.
 * 
 * @param saldo - Saldo do mês em formato HH:MM
 * @param mes - Mês atual (1-12)
 * @param ano - Ano atual
 * @param inicioVigencia - Data de início da vigência
 * @param periodoApuracao - Duração do período em meses
 * @param percentualRepasse - Percentual de repasse mensal (0-100)
 * @param possuiRepasseEspecial - Indica se tem repasse especial
 * @param cicloAtual - Ciclo atual
 * @param ciclosParaZerar - Ciclos para zerar
 * @returns Resultado completo do repasse
 * 
 * @example
 * // Mês normal (não é fim de período)
 * calcularRepasseCompleto('10:00', 1, 2024, new Date('2024-01-01'), 12, 50, false, 1, 1)
 * // { repasse: '5:00', isFimPeriodo: false, gerarExcedente: false }
 * 
 * @example
 * // Fim de período sem repasse especial, saldo positivo
 * calcularRepasseCompleto('10:00', 12, 2024, new Date('2024-01-01'), 12, 50, false, 1, 1)
 * // { repasse: '0:00', isFimPeriodo: true, gerarExcedente: false }
 * 
 * @example
 * // Fim de período sem repasse especial, saldo negativo
 * calcularRepasseCompleto('-10:00', 12, 2024, new Date('2024-01-01'), 12, 50, false, 1, 1)
 * // { repasse: '0:00', isFimPeriodo: true, gerarExcedente: true }
 * 
 * **Validates: Requirements 6.10, 6.11, 7.1-7.8, 8.1-8.9**
 */
export function calcularRepasseCompleto(
  saldo: string,
  mes: number,
  ano: number,
  inicioVigencia: Date,
  periodoApuracao: number,
  percentualRepasse: number,
  possuiRepasseEspecial: boolean,
  cicloAtual: number,
  ciclosParaZerar: number
): ResultadoRepasse {
  // Verificar se é fim de período
  const fimPeriodo = isFimPeriodo(mes, ano, inicioVigencia, periodoApuracao);
  
  // Se não é fim de período, aplica repasse mensal normal
  if (!fimPeriodo) {
    const repasse = calcularRepasse(saldo, percentualRepasse);
    return {
      repasse,
      isFimPeriodo: false,
      gerarExcedente: false
    };
  }
  
  // Se é fim de período, aplica regras de fechamento
  const fechamento = aplicarFechamento(
    saldo,
    possuiRepasseEspecial,
    cicloAtual,
    ciclosParaZerar
  );
  
  return {
    repasse: fechamento.repasse,
    isFimPeriodo: true,
    gerarExcedente: fechamento.gerarExcedente
  };
}

/**
 * Classe principal do serviço de repasse
 * 
 * Encapsula toda a lógica de repasse de banco de horas entre períodos,
 * fornecendo uma interface limpa para uso em outros serviços.
 */
export class RepasseService {
  /**
   * Calcula repasse do mês
   * @see calcularRepasse
   */
  calcularRepasse(saldo: string, percentualRepasse: number): string {
    return calcularRepasse(saldo, percentualRepasse);
  }
  
  /**
   * Verifica se é fim de período
   * @see isFimPeriodo
   */
  isFimPeriodo(
    mes: number,
    ano: number,
    inicioVigencia: Date,
    periodoApuracao: number
  ): boolean {
    return isFimPeriodo(mes, ano, inicioVigencia, periodoApuracao);
  }
  
  /**
   * Aplica lógica de fechamento
   * @see aplicarFechamento
   */
  aplicarFechamento(
    saldo: string,
    possuiRepasseEspecial: boolean,
    cicloAtual: number,
    ciclosParaZerar: number
  ): ResultadoFechamento {
    return aplicarFechamento(saldo, possuiRepasseEspecial, cicloAtual, ciclosParaZerar);
  }
  
  /**
   * Calcula repasse completo
   * @see calcularRepasseCompleto
   */
  calcularRepasseCompleto(
    saldo: string,
    mes: number,
    ano: number,
    inicioVigencia: Date,
    periodoApuracao: number,
    percentualRepasse: number,
    possuiRepasseEspecial: boolean,
    cicloAtual: number,
    ciclosParaZerar: number
  ): ResultadoRepasse {
    return calcularRepasseCompleto(
      saldo,
      mes,
      ano,
      inicioVigencia,
      periodoApuracao,
      percentualRepasse,
      possuiRepasseEspecial,
      cicloAtual,
      ciclosParaZerar
    );
  }
}

// Exportar instância singleton
export const repasseService = new RepasseService();
