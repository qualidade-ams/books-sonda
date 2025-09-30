// Utilitários para conversão entre formatos de mês de cobrança
// Compatibilidade entre formato antigo (number) e novo (MM/YYYY)

/**
 * Converte número do mês para formato MM/YYYY
 */
export function converterMesParaString(mes: number, ano?: number): string {
  const anoAtual = ano || new Date().getFullYear();
  return `${String(mes).padStart(2, '0')}/${anoAtual}`;
}

/**
 * Converte formato MM/YYYY para número do mês
 */
export function converterStringParaMes(mesAno: string): number {
  const [mes] = mesAno.split('/');
  return parseInt(mes, 10);
}

/**
 * Converte valor de mês de cobrança para formato compatível com banco
 * (temporário até migração do banco)
 */
export function converterParaBanco(valor: string | number): number {
  if (typeof valor === 'number') {
    return valor;
  }
  
  // Se é string no formato MM/YYYY, extrair apenas o mês
  if (typeof valor === 'string' && valor.includes('/')) {
    return converterStringParaMes(valor);
  }
  
  // Se é string numérica, converter para número
  return parseInt(valor, 10);
}

/**
 * Converte valor do banco para formato de exibição
 * (temporário até migração do banco)
 */
export function converterDoBanco(valor: number | string, ano?: number): string {
  if (typeof valor === 'string' && valor.includes('/')) {
    return valor; // Já está no formato correto
  }
  
  if (typeof valor === 'number') {
    return converterMesParaString(valor, ano);
  }
  
  // Fallback
  const mesNum = parseInt(valor, 10);
  return converterMesParaString(mesNum, ano);
}

/**
 * Valida se o valor está em formato válido
 */
export function validarMesCobranca(valor: string | number): boolean {
  if (typeof valor === 'number') {
    return valor >= 1 && valor <= 12;
  }
  
  if (typeof valor === 'string') {
    // Formato MM/YYYY
    if (valor.match(/^(0[1-9]|1[0-2])\/\d{4}$/)) {
      return true;
    }
    
    // Formato numérico como string
    const num = parseInt(valor, 10);
    return !isNaN(num) && num >= 1 && num <= 12;
  }
  
  return false;
}