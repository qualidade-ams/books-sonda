/**
 * Internacionalização para Banco de Horas
 * 
 * Traduz meses, períodos e labels da tabela baseado no template da empresa
 */

/**
 * Meses em português
 */
const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Meses em inglês
 */
const MESES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Labels da tabela em português
 */
const LABELS_PT = {
  // Cabeçalho
  periodo: 'Período',
  mes: 'Mês',
  
  // Linhas da tabela
  bancoContratado: 'Banco Contratado',
  ticketsContratados: 'Tickets Contratados',
  repasseMesAnterior: 'Repasse mês anterior',
  saldoAUtilizar: 'Saldo a utilizar',
  consumoChamados: 'Consumo Chamados',
  requerimentos: 'Requerimentos',
  reajuste: 'Reajuste',
  consumoTotal: 'Consumo Total',
  saldo: 'Saldo',
  repasse: 'Repasse',
  excedenteTrimestreLabel: 'Excedente Trimestre',
  taxaHoraExcedente: 'Taxa/hora Excedente',
  valorTotal: 'Valor Total',
  finalTrimestreMsg: 'Final do Trimestre o saldo é zerado.',
  
  // Períodos
  periodos: {
    mensal: 'Mensal',
    bimestre: (n: number) => `${n}º Bimestre`,
    trimestre: (n: number) => `${n}º Trimestre`,
    quadrimestre: (n: number) => `${n}º Quadrimestre`,
    semestre: (n: number) => `${n}º Semestre`,
    anual: 'Anual',
    meses: (n: number) => `${n} meses`,
    vigenciaNaoIniciada: 'Vigência não iniciada'
  },
  
  // Outros
  visaoConsolidada: 'Visão Consolidada',
  bancoDeHoras: 'Banco de horas',
  verHistorico: 'Ver Histórico',
  historico: 'Histórico'
};

/**
 * Labels da tabela em inglês
 */
const LABELS_EN = {
  // Cabeçalho
  periodo: 'Period',
  mes: 'Month',
  
  // Linhas da tabela
  bancoContratado: 'Contracted Hours',
  ticketsContratados: 'Contracted Tickets',
  repasseMesAnterior: 'Previous month carryover',
  saldoAUtilizar: 'Balance to use',
  consumoChamados: 'Tickets Consumption',
  requerimentos: 'Requirements',
  reajuste: 'Adjustment',
  consumoTotal: 'Total Consumption',
  saldo: 'Balance',
  repasse: 'Carryover',
  excedenteTrimestreLabel: 'Quarter Surplus',
  taxaHoraExcedente: 'Surplus Rate/hour',
  valorTotal: 'Total Amount',
  finalTrimestreMsg: 'End of Quarter balance is reset to zero.',
  
  // Períodos
  periodos: {
    mensal: 'Monthly',
    bimestre: (n: number) => `${getOrdinal(n)} Bimester`,
    trimestre: (n: number) => `${getOrdinal(n)} Quarter`,
    quadrimestre: (n: number) => `${getOrdinal(n)} Four-month period`,
    semestre: (n: number) => `${getOrdinal(n)} Semester`,
    anual: 'Annual',
    meses: (n: number) => `${n} months`,
    vigenciaNaoIniciada: 'Validity not started'
  },
  
  // Outros
  visaoConsolidada: 'Consolidated View',
  bancoDeHoras: 'Hours bank',
  verHistorico: 'View History',
  historico: 'History'
};

/**
 * Retorna o ordinal em inglês (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Detecta se o template é em inglês baseado no ID do template
 * NOTA: Esta função é um fallback. A detecção principal deve ser feita
 * buscando o nome do template na tabela email_templates.
 */
export function isEnglishTemplate(templateId?: string): boolean {
  if (!templateId) return false;
  
  const templateLower = templateId.toLowerCase();
  
  // Verificar se contém palavras-chave em inglês
  return templateLower.includes('english') || 
         templateLower.includes('inglês') || 
         templateLower.includes('ingles') ||
         templateLower.includes('en') ||
         templateLower.includes('template_books_ingles') ||
         templateLower.includes('template_books_english');
}

/**
 * Detecta se o template é em inglês baseado no NOME do template
 * Esta é a função principal que deve ser usada.
 */
export function isEnglishTemplateByName(templateName?: string): boolean {
  if (!templateName) return false;
  
  const nameLower = templateName.toLowerCase();
  
  // Verificar se o NOME contém palavras-chave em inglês
  return nameLower.includes('english') || 
         nameLower.includes('inglês') || 
         nameLower.includes('ingles') ||
         nameLower.includes('ingles') ||
         nameLower.includes('en ') ||  // "en " com espaço para evitar falsos positivos
         nameLower.startsWith('en') ||  // Começa com "en"
         nameLower.includes(' en') ||   // " en" precedido de espaço
         nameLower.includes('template en') ||
         nameLower.includes('template inglês') ||
         nameLower.includes('template ingles') ||
         nameLower.includes('template english');
}

/**
 * Retorna o nome do mês traduzido
 */
export function getMonthName(monthIndex: number, isEnglish: boolean): string {
  const months = isEnglish ? MESES_EN : MESES_PT;
  return months[monthIndex - 1] || months[0];
}

/**
 * Retorna todos os labels traduzidos
 */
export function getLabels(isEnglish: boolean) {
  return isEnglish ? LABELS_EN : LABELS_PT;
}

/**
 * Retorna o nome do período traduzido
 */
export function getPeriodName(
  periodoApuracao: number,
  numeroPeriodo: number,
  isEnglish: boolean
): string {
  const labels = getLabels(isEnglish);
  
  switch (periodoApuracao) {
    case 1:
      return labels.periodos.mensal;
    
    case 2:
      return labels.periodos.bimestre(numeroPeriodo);
    
    case 3:
      return labels.periodos.trimestre(numeroPeriodo);
    
    case 4:
      return labels.periodos.quadrimestre(numeroPeriodo);
    
    case 5:
      return labels.periodos.meses(5);
    
    case 6:
      return labels.periodos.semestre(numeroPeriodo);
    
    case 7:
      return labels.periodos.meses(7);
    
    case 8:
      return labels.periodos.meses(8);
    
    case 9:
      return labels.periodos.meses(9);
    
    case 10:
      return labels.periodos.meses(10);
    
    case 11:
      return labels.periodos.meses(11);
    
    case 12:
      return labels.periodos.anual;
    
    default:
      return labels.periodos.meses(periodoApuracao);
  }
}

/**
 * Exemplo de uso:
 * 
 * const isEnglish = isEnglishTemplate(empresa.template_padrao);
 * const labels = getLabels(isEnglish);
 * const monthName = getMonthName(1, isEnglish); // "January" ou "Janeiro"
 * const periodName = getPeriodName(3, 2, isEnglish); // "2nd Quarter" ou "2º Trimestre"
 */