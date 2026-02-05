/**
 * Utilitários para cálculo de períodos de vigência
 * 
 * Calcula períodos baseados no início da vigência e período de apuração
 * para exibição na tela de banco de horas.
 */

import { getPeriodName, isEnglishTemplateByName } from './bancoHorasI18n';

/**
 * Calcula o nome do período atual baseado na vigência e período de apuração
 * 
 * @param inicioVigencia - Data de início da vigência (formato: YYYY-MM-DD ou MM/YYYY)
 * @param periodoApuracao - Período de apuração em meses (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
 * @param mesAtual - Mês atual (1-12)
 * @param anoAtual - Ano atual (YYYY)
 * @param templateName - NOME do template da empresa (para detectar idioma)
 * @returns Nome do período (ex: "1º Trimestre", "Mensal", "Anual")
 */
export function calcularNomePeriodo(
  inicioVigencia: string | null | undefined,
  periodoApuracao: number | null | undefined,
  mesAtual: number,
  anoAtual: number,
  templateName?: string
): string {
  // Detectar se é template em inglês baseado no NOME
  const isEnglish = isEnglishTemplateByName(templateName);
  
  return calcularNomePeriodoComIdioma(
    inicioVigencia,
    periodoApuracao,
    mesAtual,
    anoAtual,
    isEnglish
  );
}

/**
 * Versão da função que recebe diretamente o idioma (para uso com hooks)
 */
export function calcularNomePeriodoComIdioma(
  inicioVigencia: string | null | undefined,
  periodoApuracao: number | null | undefined,
  mesAtual: number,
  anoAtual: number,
  isEnglish: boolean
): string {
  // Validações básicas
  if (!inicioVigencia || !periodoApuracao) {
    return isEnglish ? 'Period not defined' : 'Período não definido';
  }

  // Converter início da vigência para mês e ano
  let mesInicio: number;
  let anoInicio: number;

  try {
    if (inicioVigencia.includes('/')) {
      // Formato MM/YYYY
      const [mes, ano] = inicioVigencia.split('/');
      mesInicio = parseInt(mes, 10);
      anoInicio = parseInt(ano, 10);
    } else if (inicioVigencia.includes('-')) {
      // Formato YYYY-MM-DD ou YYYY-MM
      const data = new Date(inicioVigencia);
      mesInicio = data.getUTCMonth() + 1;
      anoInicio = data.getUTCFullYear();
    } else {
      // Tentar como timestamp ou outro formato
      const data = new Date(inicioVigencia);
      mesInicio = data.getUTCMonth() + 1;
      anoInicio = data.getUTCFullYear();
    }
  } catch (error) {
    console.error('Erro ao processar início da vigência:', error);
    return isEnglish ? 'Invalid period' : 'Período inválido';
  }

  // Calcular quantos meses se passaram desde o início da vigência
  const mesesPassados = ((anoAtual - anoInicio) * 12) + (mesAtual - mesInicio);
  
  // Se ainda não chegou no início da vigência
  if (mesesPassados < 0) {
    return isEnglish ? 'Validity not started' : 'Vigência não iniciada';
  }

  // Calcular qual período estamos (baseado no período de apuração)
  const numeroPeriodo = Math.floor(mesesPassados / periodoApuracao) + 1;
  
  // Calcular quantos períodos cabem em um ano
  const periodosNoAno = Math.floor(12 / periodoApuracao);
  
  // Calcular o período dentro do ano atual (1 a periodosNoAno)
  const periodoNoAno = ((numeroPeriodo - 1) % periodosNoAno) + 1;

  // Retornar nome baseado no período de apuração e idioma
  return getPeriodName(periodoApuracao, periodoNoAno, isEnglish);
}

/**
 * Exemplo de uso:
 * 
 * const nomePeriodo = calcularNomePeriodo(
 *   '09/2025',  // Início da vigência
 *   3,          // Período de apuração (trimestral)
 *   1,          // Mês atual (janeiro)
 *   2026        // Ano atual
 * );
 * 
 * // Resultado: "2º Trimestre"
 * // Porque janeiro/2026 está no segundo trimestre do ciclo que começou em setembro/2025
 */