/**
 * Utilitários para manipulação de datas
 * Evita problemas de fuso horário comuns em aplicações web
 */

/**
 * Converte uma data para string no formato YYYY-MM-DD mantendo o fuso horário local
 * Evita problemas com toISOString() que converte para UTC
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Converte uma string de data (YYYY-MM-DD) para objeto Date mantendo o fuso horário local
 * Evita problemas com new Date(string) que pode interpretar como UTC
 */
export function parseStringToDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formata uma data para exibição no formato brasileiro (DD/MM/YYYY)
 */
export function formatDateToBrazilian(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseStringToDate(date) : date;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Verifica se uma data é válida
 */
export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Obtém a data atual no formato YYYY-MM-DD (fuso horário local)
 */
export function getCurrentDateString(): string {
  return formatDateToString(new Date());
}

/**
 * Compara duas datas (ignora horário)
 * Retorna: -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export function compareDates(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseStringToDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseStringToDate(date2) : date2;
  
  const time1 = d1.getTime();
  const time2 = d2.getTime();
  
  if (time1 < time2) return -1;
  if (time1 > time2) return 1;
  return 0;
}

/**
 * Adiciona dias a uma data
 */
export function addDays(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseStringToDate(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
}

/**
 * Subtrai dias de uma data
 */
export function subtractDays(date: Date | string, days: number): Date {
  return addDays(date, -days);
}