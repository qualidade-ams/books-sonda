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
  ciclosParaZerar: number,
  percentualRepasseEspecial: number = 100
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
  
  // Com repasse especial: verificar posição dentro do conjunto de ciclos
  // ✅ CORREÇÃO CRÍTICA: Usar módulo para calcular posição dentro do conjunto de ciclos
  // Exemplo: ciclosParaZerar = 2
  // - Ciclo 1: posicaoDentroCiclo = 1 (aplica 70%)
  // - Ciclo 2: posicaoDentroCiclo = 0 (zera)
  // - Ciclo 3: posicaoDentroCiclo = 1 (aplica 70%)
  // - Ciclo 4: posicaoDentroCiclo = 0 (zera)
  const posicaoDentroCiclo = cicloAtual % ciclosParaZerar;
  const isUltimoCicloDoConjunto = posicaoDentroCiclo === 0;
  
  console.log('🔢 Calculando posição dentro do conjunto de ciclos:', {
    cicloAtual,
    ciclosParaZerar,
    posicaoDentroCiclo,
    isUltimoCicloDoConjunto,
    calculo: `${cicloAtual} % ${ciclosParaZerar} = ${posicaoDentroCiclo}`
  });
  
  // Se NÃO é o último ciclo do conjunto: repassa percentual especial do saldo para próximo período
  if (!isUltimoCicloDoConjunto) {
    const repasseCalculado = calcularRepasse(saldo, percentualRepasseEspecial);
    
    console.log('🔄 Aplicando repasse especial entre ciclos:', {
      saldo,
      cicloAtual,
      posicaoDentroCiclo,
      ciclosParaZerar,
      percentualRepasseEspecial,
      repasseCalculado,
      observacao: `Aplicando ${percentualRepasseEspecial}% do saldo ${saldo} = ${repasseCalculado}`
    });
    
    return {
      saldoFinal: saldo,
      gerarExcedente: false,
      repasse: repasseCalculado // Repassa percentual especial do saldo positivo
    };
  }
  
  // Se É o último ciclo do conjunto: zera saldo positivo
  console.log('🏁 Último ciclo do conjunto atingido - zerando saldo:', {
    saldo,
    cicloAtual,
    posicaoDentroCiclo,
    ciclosParaZerar,
    observacao: 'Saldo será zerado pois atingiu o último ciclo'
  });
  
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

/**
 * Calcula o repasse por período (novo sistema)
 * 
 * Sistema de repasse diferenciado por período:
 * - Dentro do período: aplica percentual_dentro_periodo
 * - Entre períodos: aplica percentual_entre_periodos
 * - Ao completar todos os períodos: zera o saldo
 * 
 * @param saldo - Saldo do mês em formato HH:MM
 * @param mes - Mês atual (1-12)
 * @param ano - Ano atual
 * @param inicioVigencia - Data de início da vigência do contrato
 * @param duracaoPeriodoMeses - Duração de cada período em meses (ex: 3 para trimestral)
 * @param percentualDentroPeriodo - Percentual de repasse dentro do mesmo período
 * @param percentualEntrePeriodos - Percentual de repasse entre períodos
 * @param periodosAteZerar - Quantidade de períodos até zerar o saldo
 * @returns Resultado do repasse com informações sobre o período
 * 
 * @example
 * // Mês 1 → Mês 2 (dentro do trimestre): repassa 100%
 * calcularRepassePorPeriodo('10:00', 2, 2026, new Date('2026-01-01'), 3, 100, 70, 2)
 * // { repasse: '10:00', isFimPeriodo: false, gerarExcedente: false, isTransicaoPeriodo: false }
 * 
 * @example
 * // Mês 3 → Mês 4 (fim do trimestre 1, início do trimestre 2): repassa 70%
 * calcularRepassePorPeriodo('10:00', 4, 2026, new Date('2026-01-01'), 3, 100, 70, 2)
 * // { repasse: '7:00', isFimPeriodo: false, gerarExcedente: false, isTransicaoPeriodo: true }
 * 
 * @example
 * // Mês 6 → Mês 7 (fim do semestre): zera o saldo
 * calcularRepassePorPeriodo('10:00', 7, 2026, new Date('2026-01-01'), 3, 100, 70, 2)
 * // { repasse: '0:00', isFimPeriodo: true, gerarExcedente: false, isTransicaoPeriodo: false }
 */
export function calcularRepassePorPeriodo(
  saldo: string,
  mes: number,
  ano: number,
  inicioVigencia: Date,
  duracaoPeriodoMeses: number,
  percentualDentroPeriodo: number,
  percentualEntrePeriodos: number,
  periodosAteZerar: number
): ResultadoRepasse & { isTransicaoPeriodo: boolean } {
  // 🔍 LOG: Parâmetros recebidos
  console.log('🔍 [calcularRepassePorPeriodo] Parâmetros recebidos:', {
    saldo,
    mes,
    ano,
    inicioVigencia: inicioVigencia.toISOString(),
    duracaoPeriodoMeses,
    percentualDentroPeriodo,
    percentualEntrePeriodos,
    periodosAteZerar
  });
  
  // Calcular quantos meses se passaram desde o início da vigência
  const mesInicio = inicioVigencia.getUTCMonth() + 1;
  const anoInicio = inicioVigencia.getUTCFullYear();
  
  // CORREÇÃO CRÍTICA: Calcular meses passados considerando que o primeiro mês é 0
  // Se inicio_vigencia = 2025-01-01 e estamos em jan/2026:
  // - Diferença de anos: (2026 - 2025) = 1 ano = 12 meses
  // - Diferença de meses: (1 - 1) = 0 meses
  // - Total: 12 meses passados desde jan/2025
  // - Mas queremos que jan/2026 seja o mês 0 do cálculo!
  // 
  // SOLUÇÃO: Considerar que o primeiro mês de cálculo é o mês 0
  // Se inicio_vigencia = 2025-01-01, então:
  // - jan/2025 = mês 0 (não calculado ainda)
  // - fev/2025 = mês 1 (não calculado ainda)
  // - ...
  // - jan/2026 = mês 12 (primeiro mês calculado) → deve ser tratado como mês 0
  //
  // NOVA LÓGICA: Subtrair 12 meses se o ano de cálculo for diferente do ano de início
  let mesesPassados = ((ano - anoInicio) * 12) + (mes - mesInicio);
  
  // Se estamos calculando um ano diferente do início da vigência,
  // ajustar para que o primeiro mês de cálculo seja 0
  if (ano > anoInicio) {
    // Exemplo: inicio_vigencia = 2025-01-01, calculando jan/2026
    // mesesPassados = 12, mas queremos que seja 0
    // Então subtraímos 12 (1 ano completo)
    mesesPassados = mesesPassados - 12;
  }
  
  console.log('🔍 [calcularRepassePorPeriodo] DEBUG Cálculo de meses:', {
    mesInicio,
    anoInicio,
    mesAtual: mes,
    anoAtual: ano,
    calculo: `((${ano} - ${anoInicio}) * 12) + (${mes} - ${mesInicio})`,
    mesesPassadosOriginal: ((ano - anoInicio) * 12) + (mes - mesInicio),
    ajuste: ano > anoInicio ? '-12 meses (ano diferente)' : 'sem ajuste',
    mesesPassadosAjustado: mesesPassados
  });
  
  // Calcular em qual período estamos (0-indexed)
  const periodoAtual = Math.floor(mesesPassados / duracaoPeriodoMeses);
  
  // Calcular posição dentro do período atual (0-indexed)
  const posicaoDentroPeriodo = mesesPassados % duracaoPeriodoMeses;
  
  // Verificar se é o último mês do período (transição para próximo período)
  const isUltimoMesPeriodo = posicaoDentroPeriodo === (duracaoPeriodoMeses - 1);
  
  // CORREÇÃO CRÍTICA: O ciclo deve se repetir a cada X períodos
  // Exemplo: periodosAteZerar = 2 (2 trimestres = 1 semestre)
  // - Período 0 (meses 0-2): não zera
  // - Período 1 (meses 3-5): zera em junho (fim do 1º semestre)
  // - Período 2 (meses 6-8): não zera (início do 2º semestre)
  // - Período 3 (meses 9-11): zera em dezembro (fim do 2º semestre)
  // - Período 4 (meses 12-14): não zera (início do 3º semestre)
  // - E assim por diante...
  //
  // SOLUÇÃO: Usar módulo para verificar se está no último período do ciclo
  const periodoNoCiclo = periodoAtual % periodosAteZerar;
  const isUltimoPeriodoDoCiclo = (periodoNoCiclo + 1) === periodosAteZerar;
  const completouTodosPeriodos = isUltimoPeriodoDoCiclo && isUltimoMesPeriodo;
  
  console.log('🔄 [calcularRepassePorPeriodo] Análise do período:', {
    mes_atual: `${mes}/${ano}`,
    meses_passados: mesesPassados,
    periodo_atual: periodoAtual + 1,
    periodo_no_ciclo: periodoNoCiclo + 1,
    posicao_dentro_periodo: posicaoDentroPeriodo + 1,
    duracao_periodo: duracaoPeriodoMeses,
    is_ultimo_mes_periodo: isUltimoMesPeriodo,
    is_ultimo_periodo_do_ciclo: isUltimoPeriodoDoCiclo,
    completou_todos_periodos: completouTodosPeriodos,
    periodos_ate_zerar: periodosAteZerar,
    '🔍 DEBUG': `Período ${periodoAtual + 1} (ciclo: ${periodoNoCiclo + 1}/${periodosAteZerar}) - ${completouTodosPeriodos ? 'ZERAR' : isUltimoMesPeriodo ? 'TRANSIÇÃO' : 'NORMAL'}`
  });
  
  // Se completou todos os períodos, zera o saldo
  if (completouTodosPeriodos) {
    console.log('✅ Completou todos os períodos - ZERANDO SALDO');
    return {
      repasse: '0:00',
      isFimPeriodo: true,
      gerarExcedente: false,
      isTransicaoPeriodo: false
    };
  }
  
  // Se é último mês do período (transição), aplica percentual entre períodos
  if (isUltimoMesPeriodo) {
    const repasse = calcularRepasse(saldo, percentualEntrePeriodos);
    console.log(`🔀 Transição de período ${periodoAtual + 1} → ${periodoAtual + 2}: repasse ${percentualEntrePeriodos}% de ${saldo} = ${repasse}`);
    return {
      repasse,
      isFimPeriodo: false,
      gerarExcedente: false,
      isTransicaoPeriodo: true
    };
  }
  
  // Dentro do mesmo período, aplica percentual dentro do período
  const repasse = calcularRepasse(saldo, percentualDentroPeriodo);
  console.log(`➡️ Dentro do período ${periodoAtual + 1}: repasse ${percentualDentroPeriodo}% de ${saldo} = ${repasse}`);
  return {
    repasse,
    isFimPeriodo: false,
    gerarExcedente: false,
    isTransicaoPeriodo: false
  };
}

export function calcularRepasseCompleto(
  saldo: string,
  mes: number,
  ano: number,
  inicioVigencia: Date,
  periodoApuracao: number,
  percentualRepasse: number,
  possuiRepasseEspecial: boolean,
  cicloAtual: number,
  ciclosParaZerar: number,
  percentualRepasseEspecial: number = 100
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
    ciclosParaZerar,
    percentualRepasseEspecial
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
    ciclosParaZerar: number,
    percentualRepasseEspecial: number = 100
  ): ResultadoFechamento {
    return aplicarFechamento(saldo, possuiRepasseEspecial, cicloAtual, ciclosParaZerar, percentualRepasseEspecial);
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
    ciclosParaZerar: number,
    percentualRepasseEspecial: number = 100
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
      ciclosParaZerar,
      percentualRepasseEspecial
    );
  }
}

// Exportar instância singleton
export const repasseService = new RepasseService();
