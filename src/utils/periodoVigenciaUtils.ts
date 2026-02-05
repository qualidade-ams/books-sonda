/**
 * Utilitários para cálculo de períodos de vigência
 * 
 * Calcula períodos baseados no início da vigência e período de apuração
 * para exibição na tela de banco de horas.
 */

/**
 * Calcula o nome do período atual baseado na vigência e período de apuração
 * 
 * @param inicioVigencia - Data de início da vigência (formato: YYYY-MM-DD ou MM/YYYY)
 * @param periodoApuracao - Período de apuração em meses (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)
 * @param mesAtual - Mês atual (1-12)
 * @param anoAtual - Ano atual (YYYY)
 * @returns Nome do período (ex: "1º Trimestre", "Mensal", "Anual")
 */
export function calcularNomePeriodo(
  inicioVigencia: string | null | undefined,
  periodoApuracao: number | null | undefined,
  mesAtual: number,
  anoAtual: number
): string {
  // Validações básicas
  if (!inicioVigencia || !periodoApuracao) {
    return 'Período não definido';
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
    return 'Período inválido';
  }

  // Calcular quantos meses se passaram desde o início da vigência
  const mesesPassados = ((anoAtual - anoInicio) * 12) + (mesAtual - mesInicio);
  
  // Se ainda não chegou no início da vigência
  if (mesesPassados < 0) {
    return 'Vigência não iniciada';
  }

  // Calcular qual período estamos (baseado no período de apuração)
  const numeroPeriodo = Math.floor(mesesPassados / periodoApuracao) + 1;
  
  // Calcular quantos períodos cabem em um ano
  const periodosNoAno = Math.floor(12 / periodoApuracao);
  
  // Calcular o período dentro do ano atual (1 a periodosNoAno)
  const periodoNoAno = ((numeroPeriodo - 1) % periodosNoAno) + 1;

  // Retornar nome baseado no período de apuração
  return getNomePeriodo(periodoApuracao, periodoNoAno);
}

/**
 * Retorna o nome do período baseado no período de apuração e número do período
 * 
 * @param periodoApuracao - Período de apuração em meses
 * @param numeroPeriodo - Número do período dentro do ano (1, 2, 3, etc.)
 * @returns Nome do período formatado
 */
function getNomePeriodo(periodoApuracao: number, numeroPeriodo: number): string {
  switch (periodoApuracao) {
    case 1:
      return 'Mensal';
    
    case 2:
      const bimestres = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre', '5º Bimestre', '6º Bimestre'];
      return bimestres[numeroPeriodo - 1] || `${numeroPeriodo}º Bimestre`;
    
    case 3:
      const trimestres = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre'];
      return trimestres[numeroPeriodo - 1] || `${numeroPeriodo}º Trimestre`;
    
    case 4:
      const quadrimestres = ['1º Quadrimestre', '2º Quadrimestre', '3º Quadrimestre'];
      return quadrimestres[numeroPeriodo - 1] || `${numeroPeriodo}º Quadrimestre`;
    
    case 5:
      return '5 meses';
    
    case 6:
      const semestres = ['1º Semestre', '2º Semestre'];
      return semestres[numeroPeriodo - 1] || `${numeroPeriodo}º Semestre`;
    
    case 7:
      return '7 meses';
    
    case 8:
      return '8 meses';
    
    case 9:
      return '9 meses';
    
    case 10:
      return '10 meses';
    
    case 11:
      return '11 meses';
    
    case 12:
      return 'Anual';
    
    default:
      return `${periodoApuracao} meses`;
  }
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