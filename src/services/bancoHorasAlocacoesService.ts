/**
 * Serviço de Alocações de Banco de Horas
 * 
 * Implementa a lógica de alocações internas do baseline da empresa:
 * - Validação de soma de percentuais = 100%
 * - Cálculo de valores segmentados proporcionalmente
 * - Validação de alocações antes de salvar
 * 
 * As alocações permitem segmentar o baseline da empresa por percentual
 * (ex: por departamento, projeto ou centro de custo), gerando uma visão
 * segmentada dos cálculos mensais.
 * 
 * @module bancoHorasAlocacoesService
 */

import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';
import type { Alocacao, BancoHorasCalculo, BancoHorasCalculoSegmentado } from '@/types/bancoHoras';

/**
 * Erro de validação de alocações
 */
export class AlocacaoValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AlocacaoValidationError';
  }
}

/**
 * Resultado da validação de alocações
 */
export interface ResultadoValidacaoAlocacoes {
  /** Indica se as alocações são válidas */
  valido: boolean;
  /** Lista de erros encontrados */
  erros: string[];
  /** Soma total dos percentuais */
  somaPercentuais: number;
}

/**
 * Valida se a soma dos percentuais de alocações é exatamente 100%
 * 
 * Esta é uma regra fundamental do sistema: a soma de todos os percentuais
 * de alocações ativas de uma empresa deve ser exatamente 100%. Isso garante
 * que a visão segmentada corresponda exatamente à visão consolidada.
 * 
 * @param alocacoes - Lista de alocações a validar
 * @returns true se soma = 100%, false caso contrário
 * @throws AlocacaoValidationError se alocações estiver vazia
 * 
 * @example
 * // Alocações válidas
 * validarSomaPercentuais([
 *   { percentual_baseline: 50, ... },
 *   { percentual_baseline: 30, ... },
 *   { percentual_baseline: 20, ... }
 * ]) // true (50 + 30 + 20 = 100)
 * 
 * @example
 * // Alocações inválidas
 * validarSomaPercentuais([
 *   { percentual_baseline: 50, ... },
 *   { percentual_baseline: 30, ... }
 * ]) // false (50 + 30 = 80 ≠ 100)
 * 
 * @example
 * // Alocação única válida
 * validarSomaPercentuais([
 *   { percentual_baseline: 100, ... }
 * ]) // true (100 = 100)
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 * **Property 3: Soma de Alocações Igual a 100%**
 */
export function validarSomaPercentuais(alocacoes: Pick<Alocacao, 'percentual_baseline'>[]): boolean {
  // Validar entrada
  if (!alocacoes || alocacoes.length === 0) {
    throw new AlocacaoValidationError(
      'alocacoes',
      'Lista de alocações não pode estar vazia',
      'EMPTY_ALLOCATIONS'
    );
  }
  
  // Calcular soma dos percentuais
  const soma = alocacoes.reduce((acc, alocacao) => {
    // Validar que percentual é um número válido
    if (typeof alocacao.percentual_baseline !== 'number' || 
        isNaN(alocacao.percentual_baseline) ||
        alocacao.percentual_baseline < 0 ||
        alocacao.percentual_baseline > 100) {
      throw new AlocacaoValidationError(
        'percentual_baseline',
        `Percentual inválido: ${alocacao.percentual_baseline}. Deve estar entre 0 e 100.`,
        'INVALID_PERCENTAGE'
      );
    }
    
    return acc + alocacao.percentual_baseline;
  }, 0);
  
  // Verificar se soma é exatamente 100
  return soma === 100;
}

/**
 * Calcula valores segmentados proporcionalmente a partir da visão consolidada
 * 
 * Aplica o percentual da alocação a cada campo calculado da visão consolidada,
 * gerando os valores proporcionais para a visão segmentada. Esta função garante
 * que a soma de todos os valores segmentados seja igual ao valor consolidado.
 * 
 * Fórmula: valor_segmentado = valor_consolidado × (percentual_baseline / 100)
 * 
 * @param calculoConsolidado - Cálculo consolidado do mês
 * @param alocacao - Alocação para calcular valores segmentados
 * @returns Cálculo segmentado com valores proporcionais
 * 
 * @example
 * // Alocação de 50% com baseline de 160 horas
 * calcularValoresSegmentados(
 *   { baseline_horas: '160:00', consumo_horas: '80:00', ... },
 *   { percentual_baseline: 50, ... }
 * )
 * // Retorna: { baseline_horas: '80:00', consumo_horas: '40:00', ... }
 * 
 * @example
 * // Alocação de 25% com baseline de 100 tickets
 * calcularValoresSegmentados(
 *   { baseline_tickets: 100, consumo_tickets: 60, ... },
 *   { percentual_baseline: 25, ... }
 * )
 * // Retorna: { baseline_tickets: 25, consumo_tickets: 15, ... }
 * 
 * @example
 * // Alocação de 100% (alocação única)
 * calcularValoresSegmentados(
 *   { baseline_horas: '160:00', ... },
 *   { percentual_baseline: 100, ... }
 * )
 * // Retorna: { baseline_horas: '160:00', ... } (valores iguais ao consolidado)
 * 
 * **Validates: Requirements 3.5, 3.6, 3.7, 5.1, 5.2, 5.3**
 * **Property 4: Derivação Proporcional Segmentada**
 */
export function calcularValoresSegmentados(
  calculoConsolidado: BancoHorasCalculo,
  alocacao: Pick<Alocacao, 'id' | 'percentual_baseline'>
): Omit<BancoHorasCalculoSegmentado, 'created_at'> {
  // Validar percentual
  if (alocacao.percentual_baseline < 0 || alocacao.percentual_baseline > 100) {
    throw new AlocacaoValidationError(
      'percentual_baseline',
      `Percentual inválido: ${alocacao.percentual_baseline}. Deve estar entre 0 e 100.`,
      'INVALID_PERCENTAGE'
    );
  }
  
  const percentual = alocacao.percentual_baseline / 100;
  
  /**
   * Calcula valor proporcional para horas (formato HH:MM)
   */
  const calcularHorasProporcional = (horas?: string): string | undefined => {
    if (!horas) return undefined;
    
    // Verificar se é negativo
    const isNegativo = horas.startsWith('-');
    const horasLimpo = isNegativo ? horas.substring(1) : horas;
    
    // Converter para minutos, aplicar percentual, converter de volta
    const minutos = converterHorasParaMinutos(horasLimpo);
    const minutosProporcional = Math.floor(minutos * percentual);
    const resultado = converterMinutosParaHoras(minutosProporcional);
    
    return isNegativo ? `-${resultado}` : resultado;
  };
  
  /**
   * Calcula valor proporcional para tickets (número decimal)
   */
  const calcularTicketsProporcional = (tickets?: number): number | undefined => {
    if (tickets === undefined || tickets === null) return undefined;
    
    // Aplicar percentual e arredondar para 2 casas decimais
    return Math.round(tickets * percentual * 100) / 100;
  };
  
  // Calcular todos os valores proporcionais
  return {
    id: '', // Será gerado pelo banco
    calculo_id: calculoConsolidado.id,
    alocacao_id: alocacao.id,
    
    // Valores de horas
    baseline_horas: calcularHorasProporcional(calculoConsolidado.baseline_horas),
    repasses_mes_anterior_horas: calcularHorasProporcional(calculoConsolidado.repasses_mes_anterior_horas),
    saldo_a_utilizar_horas: calcularHorasProporcional(calculoConsolidado.saldo_a_utilizar_horas),
    consumo_horas: calcularHorasProporcional(calculoConsolidado.consumo_horas),
    requerimentos_horas: calcularHorasProporcional(calculoConsolidado.requerimentos_horas),
    reajustes_horas: calcularHorasProporcional(calculoConsolidado.reajustes_horas),
    consumo_total_horas: calcularHorasProporcional(calculoConsolidado.consumo_total_horas),
    saldo_horas: calcularHorasProporcional(calculoConsolidado.saldo_horas),
    repasse_horas: calcularHorasProporcional(calculoConsolidado.repasse_horas),
    
    // Valores de tickets
    baseline_tickets: calcularTicketsProporcional(calculoConsolidado.baseline_tickets),
    repasses_mes_anterior_tickets: calcularTicketsProporcional(calculoConsolidado.repasses_mes_anterior_tickets),
    saldo_a_utilizar_tickets: calcularTicketsProporcional(calculoConsolidado.saldo_a_utilizar_tickets),
    consumo_tickets: calcularTicketsProporcional(calculoConsolidado.consumo_tickets),
    requerimentos_tickets: calcularTicketsProporcional(calculoConsolidado.requerimentos_tickets),
    reajustes_tickets: calcularTicketsProporcional(calculoConsolidado.reajustes_tickets),
    consumo_total_tickets: calcularTicketsProporcional(calculoConsolidado.consumo_total_tickets),
    saldo_tickets: calcularTicketsProporcional(calculoConsolidado.saldo_tickets),
    repasse_tickets: calcularTicketsProporcional(calculoConsolidado.repasse_tickets)
  };
}

/**
 * Valida lista completa de alocações antes de salvar
 * 
 * Realiza todas as validações necessárias para garantir que as alocações
 * estão corretas e podem ser salvas no banco de dados:
 * - Verifica se há pelo menos uma alocação
 * - Valida cada percentual individualmente (0-100)
 * - Verifica se a soma dos percentuais é exatamente 100%
 * - Valida nomes de alocações (não vazios)
 * 
 * @param alocacoes - Lista de alocações a validar
 * @returns Resultado da validação com lista de erros
 * 
 * @example
 * // Alocações válidas
 * validarAlocacoes([
 *   { nome_alocacao: 'TI', percentual_baseline: 60, ... },
 *   { nome_alocacao: 'RH', percentual_baseline: 40, ... }
 * ])
 * // { valido: true, erros: [], somaPercentuais: 100 }
 * 
 * @example
 * // Alocações inválidas - soma incorreta
 * validarAlocacoes([
 *   { nome_alocacao: 'TI', percentual_baseline: 60, ... },
 *   { nome_alocacao: 'RH', percentual_baseline: 30, ... }
 * ])
 * // { valido: false, erros: ['Soma dos percentuais deve ser 100%. Atual: 90%'], somaPercentuais: 90 }
 * 
 * @example
 * // Alocações inválidas - percentual fora do range
 * validarAlocacoes([
 *   { nome_alocacao: 'TI', percentual_baseline: 150, ... }
 * ])
 * // { valido: false, erros: ['Percentual da alocação "TI" inválido: 150. Deve estar entre 0 e 100.'], somaPercentuais: 150 }
 * 
 * @example
 * // Alocações inválidas - nome vazio
 * validarAlocacoes([
 *   { nome_alocacao: '', percentual_baseline: 100, ... }
 * ])
 * // { valido: false, erros: ['Nome da alocação não pode estar vazio'], somaPercentuais: 100 }
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8**
 */
export function validarAlocacoes(
  alocacoes: Pick<Alocacao, 'nome_alocacao' | 'percentual_baseline'>[]
): ResultadoValidacaoAlocacoes {
  const erros: string[] = [];
  
  // Validar se há alocações
  if (!alocacoes || alocacoes.length === 0) {
    return {
      valido: false,
      erros: ['Deve haver pelo menos uma alocação'],
      somaPercentuais: 0
    };
  }
  
  // Validar cada alocação individualmente
  let somaPercentuais = 0;
  
  alocacoes.forEach((alocacao, index) => {
    // Validar nome
    if (!alocacao.nome_alocacao || alocacao.nome_alocacao.trim() === '') {
      erros.push(`Nome da alocação ${index + 1} não pode estar vazio`);
    }
    
    // Validar percentual
    if (typeof alocacao.percentual_baseline !== 'number' || isNaN(alocacao.percentual_baseline)) {
      erros.push(`Percentual da alocação "${alocacao.nome_alocacao}" deve ser um número`);
    } else if (alocacao.percentual_baseline < 0 || alocacao.percentual_baseline > 100) {
      erros.push(
        `Percentual da alocação "${alocacao.nome_alocacao}" inválido: ${alocacao.percentual_baseline}. ` +
        `Deve estar entre 0 e 100.`
      );
    } else {
      somaPercentuais += alocacao.percentual_baseline;
    }
  });
  
  // Validar soma dos percentuais
  if (erros.length === 0 && somaPercentuais !== 100) {
    erros.push(`Soma dos percentuais deve ser 100%. Atual: ${somaPercentuais}%`);
  }
  
  return {
    valido: erros.length === 0,
    erros,
    somaPercentuais
  };
}

/**
 * Verifica se a soma de valores segmentados é igual ao valor consolidado
 * 
 * Esta função é usada para validar que a derivação proporcional está correta,
 * garantindo que não há perda ou ganho de valores na segmentação.
 * 
 * Devido a arredondamentos, pode haver pequenas diferenças (< 1 minuto para horas,
 * < 0.01 para tickets), que são consideradas aceitáveis.
 * 
 * @param valorConsolidado - Valor da visão consolidada
 * @param valoresSegmentados - Lista de valores da visão segmentada
 * @param tipo - Tipo de valor ('horas' ou 'tickets')
 * @returns true se soma dos segmentados ≈ consolidado, false caso contrário
 * 
 * @example
 * // Validar horas
 * verificarSomaSegmentada('160:00', ['80:00', '50:00', '30:00'], 'horas')
 * // true (80 + 50 + 30 = 160)
 * 
 * @example
 * // Validar tickets
 * verificarSomaSegmentada(100, [50, 30, 20], 'tickets')
 * // true (50 + 30 + 20 = 100)
 * 
 * @example
 * // Validar com arredondamento aceitável
 * verificarSomaSegmentada('100:00', ['33:20', '33:20', '33:20'], 'horas')
 * // true (33:20 * 3 = 100:00, diferença de arredondamento aceitável)
 * 
 * **Validates: Requirements 3.7, 5.6, 5.7**
 * **Property 5: Soma Segmentada Igual a Consolidada**
 */
export function verificarSomaSegmentada(
  valorConsolidado: string | number | undefined,
  valoresSegmentados: (string | number | undefined)[],
  tipo: 'horas' | 'tickets'
): boolean {
  // Se valor consolidado não existe, valores segmentados também não devem existir
  if (valorConsolidado === undefined || valorConsolidado === null) {
    return valoresSegmentados.every(v => v === undefined || v === null);
  }
  
  if (tipo === 'horas') {
    // Converter todos para minutos
    const consolidadoStr = valorConsolidado as string;
    const isNegativo = consolidadoStr.startsWith('-');
    const consolidadoLimpo = isNegativo ? consolidadoStr.substring(1) : consolidadoStr;
    const consolidadoMinutos = converterHorasParaMinutos(consolidadoLimpo) * (isNegativo ? -1 : 1);
    
    const somaSegmentadosMinutos = valoresSegmentados.reduce((acc, valor) => {
      if (!valor) return acc;
      const valorStr = valor as string;
      const isNeg = valorStr.startsWith('-');
      const valorLimpo = isNeg ? valorStr.substring(1) : valorStr;
      const minutos = converterHorasParaMinutos(valorLimpo) * (isNeg ? -1 : 1);
      return acc + minutos;
    }, 0);
    
    // Permitir diferença de até 1 minuto devido a arredondamentos
    return Math.abs(consolidadoMinutos - somaSegmentadosMinutos) <= 1;
  } else {
    // Tickets - comparar números
    const consolidadoNum = valorConsolidado as number;
    const somaSegmentados = valoresSegmentados.reduce((acc, valor) => {
      if (valor === undefined || valor === null) return acc;
      return acc + (valor as number);
    }, 0);
    
    // Permitir diferença de até 0.01 devido a arredondamentos
    return Math.abs(consolidadoNum - somaSegmentados) <= 0.01;
  }
}

/**
 * Classe principal do serviço de alocações
 * 
 * Encapsula toda a lógica de alocações de banco de horas, fornecendo
 * uma interface limpa para uso em outros serviços e componentes.
 */
export class AlocacoesService {
  /**
   * Valida se soma de percentuais é 100%
   * @see validarSomaPercentuais
   */
  validarSomaPercentuais(alocacoes: Pick<Alocacao, 'percentual_baseline'>[]): boolean {
    return validarSomaPercentuais(alocacoes);
  }
  
  /**
   * Calcula valores segmentados proporcionalmente
   * @see calcularValoresSegmentados
   */
  calcularValoresSegmentados(
    calculoConsolidado: BancoHorasCalculo,
    alocacao: Pick<Alocacao, 'id' | 'percentual_baseline'>
  ): Omit<BancoHorasCalculoSegmentado, 'created_at'> {
    return calcularValoresSegmentados(calculoConsolidado, alocacao);
  }
  
  /**
   * Valida alocações antes de salvar
   * @see validarAlocacoes
   */
  validarAlocacoes(
    alocacoes: Pick<Alocacao, 'nome_alocacao' | 'percentual_baseline'>[]
  ): ResultadoValidacaoAlocacoes {
    return validarAlocacoes(alocacoes);
  }
  
  /**
   * Verifica se soma de segmentados = consolidado
   * @see verificarSomaSegmentada
   */
  verificarSomaSegmentada(
    valorConsolidado: string | number | undefined,
    valoresSegmentados: (string | number | undefined)[],
    tipo: 'horas' | 'tickets'
  ): boolean {
    return verificarSomaSegmentada(valorConsolidado, valoresSegmentados, tipo);
  }
  
  /**
   * Calcula todos os valores segmentados para múltiplas alocações
   * 
   * Conveniência para calcular valores segmentados de todas as alocações
   * de uma empresa de uma só vez.
   * 
   * @param calculoConsolidado - Cálculo consolidado do mês
   * @param alocacoes - Lista de alocações da empresa
   * @returns Lista de cálculos segmentados
   */
  calcularTodosSegmentados(
    calculoConsolidado: BancoHorasCalculo,
    alocacoes: Pick<Alocacao, 'id' | 'percentual_baseline'>[]
  ): Omit<BancoHorasCalculoSegmentado, 'created_at'>[] {
    // Validar soma de percentuais antes de calcular
    if (!this.validarSomaPercentuais(alocacoes)) {
      const soma = alocacoes.reduce((acc, a) => acc + a.percentual_baseline, 0);
      throw new AlocacaoValidationError(
        'alocacoes',
        `Soma dos percentuais deve ser 100%. Atual: ${soma}%`,
        'INVALID_PERCENTUAL_SUM'
      );
    }
    
    // Calcular valores segmentados para cada alocação
    return alocacoes.map(alocacao => 
      this.calcularValoresSegmentados(calculoConsolidado, alocacao)
    );
  }
  
  /**
   * Lista todas as alocações ativas de uma empresa
   * 
   * Busca no banco de dados todas as alocações ativas da empresa especificada.
   * 
   * @param empresaId - ID da empresa
   * @returns Lista de alocações ativas
   */
  async listarAlocacoes(empresaId: string): Promise<Alocacao[]> {
    // TODO: Implementar busca no Supabase
    // Por enquanto, retorna array vazio
    // Esta implementação será completada quando a tabela banco_horas_alocacoes estiver criada
    console.warn('listarAlocacoes: Implementação pendente - retornando array vazio');
    return [];
  }
}

// Exportar instância singleton
export const alocacoesService = new AlocacoesService();
