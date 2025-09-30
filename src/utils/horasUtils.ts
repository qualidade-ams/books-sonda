/**
 * Utilitários para conversão e validação de horas
 * Suporta formato HH:MM (horas quebradas) e números inteiros
 */

export interface HorasConvertidas {
  horas: number;
  minutos: number;
  totalMinutos: number;
  totalHoras: number;
  formatoHHMM: string;
}

/**
 * Converte string no formato HH:MM para minutos totais
 * @param horasString - String no formato "HH:MM" ou número como string
 * @returns Número total de minutos
 */
export function converterHorasParaMinutos(horasString: string): number {
  if (!horasString || horasString.trim() === '') {
    return 0;
  }

  const valor = horasString.trim();

  // Se contém ":", trata como HH:MM
  if (valor.includes(':')) {
    const [horasStr, minutosStr] = valor.split(':');
    const horas = parseInt(horasStr) || 0;
    const minutos = parseInt(minutosStr) || 0;
    
    // Validação básica
    if (minutos >= 60) {
      throw new Error('Minutos devem ser menores que 60');
    }
    
    return (horas * 60) + minutos;
  }

  // Se não contém ":", trata como número inteiro de horas
  const horasInteiras = parseInt(valor) || 0;
  return horasInteiras * 60;
}

/**
 * Converte minutos totais para formato HH:MM
 * @param totalMinutos - Total de minutos
 * @returns String no formato "HH:MM"
 */
export function converterMinutosParaHoras(totalMinutos: number): string {
  if (totalMinutos < 0) {
    return '0:00';
  }

  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  
  return `${horas}:${minutos.toString().padStart(2, '0')}`;
}

/**
 * Converte minutos totais para número decimal de horas
 * @param totalMinutos - Total de minutos
 * @returns Número decimal de horas (ex: 90 minutos = 1.5 horas)
 */
export function converterMinutosParaHorasDecimal(totalMinutos: number): number {
  return totalMinutos / 60;
}

/**
 * Converte horas decimais para minutos totais
 * @param horasDecimal - Horas em formato decimal
 * @returns Total de minutos
 */
export function converterHorasDecimalParaMinutos(horasDecimal: number): number {
  return Math.round(horasDecimal * 60);
}

/**
 * Valida se uma string está no formato HH:MM válido
 * @param horasString - String a ser validada
 * @returns true se válida, false caso contrário
 */
export function validarFormatoHoras(horasString: string): boolean {
  if (!horasString || horasString.trim() === '') {
    return true; // Vazio é válido (será 0)
  }

  const valor = horasString.trim();

  // Formato HH:MM
  if (valor.includes(':')) {
    const regex = /^\d{1,4}:[0-5]?\d$/;
    if (!regex.test(valor)) {
      return false;
    }

    const [horasStr, minutosStr] = valor.split(':');
    const horas = parseInt(horasStr);
    const minutos = parseInt(minutosStr);

    return horas >= 0 && horas <= 9999 && minutos >= 0 && minutos < 60;
  }

  // Formato número inteiro
  const numero = parseInt(valor);
  return !isNaN(numero) && numero >= 0 && numero <= 9999;
}

/**
 * Normaliza entrada de horas para formato consistente
 * @param input - Entrada do usuário
 * @returns String normalizada
 */
export function normalizarEntradaHoras(input: string): string {
  if (!input || input.trim() === '') {
    return '';
  }

  const valor = input.trim();

  // Se já está no formato HH:MM, apenas valida e retorna
  if (valor.includes(':')) {
    const [horasStr, minutosStr] = valor.split(':');
    const horas = parseInt(horasStr) || 0;
    const minutos = parseInt(minutosStr) || 0;
    
    // Corrige minutos >= 60
    if (minutos >= 60) {
      const horasAdicionais = Math.floor(minutos / 60);
      const minutosRestantes = minutos % 60;
      return `${horas + horasAdicionais}:${minutosRestantes.toString().padStart(2, '0')}`;
    }
    
    return `${horas}:${minutos.toString().padStart(2, '0')}`;
  }

  // Se é número inteiro, converte para HH:00
  const numero = parseInt(valor);
  if (!isNaN(numero) && numero >= 0) {
    return `${numero}:00`;
  }

  return valor; // Retorna como está se não conseguir processar
}

/**
 * Converte entrada de horas para objeto com informações detalhadas
 * @param horasString - String de entrada
 * @returns Objeto com informações das horas convertidas
 */
export function analisarHoras(horasString: string): HorasConvertidas {
  const totalMinutos = converterHorasParaMinutos(horasString);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  const totalHoras = totalMinutos / 60;
  const formatoHHMM = converterMinutosParaHoras(totalMinutos);

  return {
    horas,
    minutos,
    totalMinutos,
    totalHoras,
    formatoHHMM
  };
}

/**
 * Soma duas strings de horas no formato HH:MM ou números
 * @param horas1 - Primeira string de horas
 * @param horas2 - Segunda string de horas
 * @returns String no formato HH:MM com o total
 */
export function somarHoras(horas1: string, horas2: string): string {
  const minutos1 = converterHorasParaMinutos(horas1);
  const minutos2 = converterHorasParaMinutos(horas2);
  const totalMinutos = minutos1 + minutos2;
  
  return converterMinutosParaHoras(totalMinutos);
}

/**
 * Formata horas para exibição amigável
 * @param horasString - String de horas
 * @param formato - Formato de saída ('HHMM' | 'decimal' | 'completo')
 * @returns String formatada
 */
export function formatarHorasParaExibicao(
  horasString: string, 
  formato: 'HHMM' | 'decimal' | 'completo' = 'HHMM'
): string {
  const analise = analisarHoras(horasString);

  switch (formato) {
    case 'HHMM':
      return analise.formatoHHMM;
    
    case 'decimal':
      return analise.totalHoras.toFixed(2) + 'h';
    
    case 'completo':
      if (analise.minutos === 0) {
        return `${analise.horas}h`;
      }
      return `${analise.horas}h${analise.minutos}min`;
    
    default:
      return analise.formatoHHMM;
  }
}

/**
 * Converte horas para valor decimal para cálculos
 * Usado principalmente para integração com o banco de dados
 * @param horasString - String de horas
 * @returns Número decimal de horas
 */
export function converterParaHorasDecimal(horasString: string): number {
  const totalMinutos = converterHorasParaMinutos(horasString);
  return totalMinutos / 60;
}

/**
 * Converte horas decimais de volta para string HH:MM
 * Usado para converter dados do banco para exibição
 * @param horasDecimal - Horas em formato decimal
 * @returns String no formato HH:MM
 */
export function converterDeHorasDecimal(horasDecimal: number): string {
  const totalMinutos = Math.round(horasDecimal * 60);
  return converterMinutosParaHoras(totalMinutos);
}