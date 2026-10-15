/**
 * Cálculo mensal de um banco de horas (motor novo, Modelagem_Fase2.md seção 5).
 * Funções puras: horas em minutos inteiros, tickets em inteiros.
 *
 * O mês é calculado em duas etapas, porque o consumo entre bancos (RN-23) acontece
 * entre elas, no fim do período:
 *   1. calcularSaldo: saldo do mês
 *   2. aplicarRegraDeSaida: repasse para o mês seguinte ou excedente
 */

export type TipoContrato = 'horas' | 'tickets' | 'ambos';
export type Unidade = 'horas' | 'tickets';

export interface MesAno {
  mes: number;
  ano: number;
}

export interface ParametrosCalculo {
  tipoContrato: TipoContrato;
  periodoApuracao: number;
  inicioVigencia: MesAno;
  repasseEspecial: 'nenhum' | 'por_periodo';
  duracaoPeriodoMeses?: number | null;
  periodosAteZerar?: number | null;
}

export interface PercentuaisRepasse {
  mensal: number;
  dentroPeriodo?: number;
  entrePeriodos?: number;
}

/** O que entra no mês de uma unidade (horas ou tickets) */
export interface EntradaUnidade {
  baseline: number;
  consumo: number;
  requerimentos: number;
  reajusteEntrada: number;
  reajusteSaida: number;
}

export interface SaldoUnidade {
  baseline: number;
  repasseAnterior: number;
  saldoAUtilizar: number;
  consumo: number;
  requerimentos: number;
  /** Entradas − saídas (exibição) */
  reajustes: number;
  consumoTotal: number;
  saldo: number;
}

export interface ResultadoSaida {
  /** Vai para o mês seguinte (negativo = déficit) */
  repasse: number;
  /** Quantidade sem sinal, só no fim de período */
  excedente: number;
  fimPeriodo: boolean;
  transicaoPeriodo: boolean;
}

/** Meses desde o início da vigência: 0 no mês de início, negativo antes dele */
export function mesesDesdeVigencia(p: ParametrosCalculo, m: MesAno): number {
  return (m.ano - p.inicioVigencia.ano) * 12 + (m.mes - p.inicioVigencia.mes);
}

/** Último mês de um período de apuração (RC-28) */
export function ehFimDePeriodo(p: ParametrosCalculo, m: MesAno): boolean {
  const indice = mesesDesdeVigencia(p, m);
  return indice >= 0 && (indice + 1) % p.periodoApuracao === 0;
}

function exigirVigente(p: ParametrosCalculo, m: MesAno): number {
  const indice = mesesDesdeVigencia(p, m);
  if (indice < 0) {
    throw new Error(`Mês ${m.mes}/${m.ano} é antes do início da vigência do banco`);
  }
  return indice;
}

/** Primeiro mês do período de apuração que contém o mês */
export function inicioDoCiclo(p: ParametrosCalculo, m: MesAno): MesAno {
  const indice = exigirVigente(p, m);
  const inicio = indice - (indice % p.periodoApuracao);
  const total = p.inicioVigencia.ano * 12 + (p.inicioVigencia.mes - 1) + inicio;
  return { mes: (total % 12) + 1, ano: Math.floor(total / 12) };
}

function validarPercentual(percentual: number | undefined): number {
  if (percentual === undefined || percentual === null || percentual < 0 || percentual > 100) {
    throw new Error(`Percentual de repasse inválido: ${percentual}. Deve estar entre 0 e 100.`);
  }
  return percentual;
}

/**
 * Repasse de um saldo para o mês seguinte (RC-29, RC-56).
 * Positivo: percentual, com horas arredondadas ao minuto e tickets para baixo.
 * Negativo: o déficit inteiro.
 */
export function calcularRepasse(saldo: number, percentual: number, unidade: Unidade): number {
  validarPercentual(percentual);
  if (saldo < 0) return saldo;
  const valor = (saldo * percentual) / 100;
  return unidade === 'horas' ? Math.round(valor) : Math.floor(valor);
}

/** Saldo do mês (RC-21 a RC-27) */
export function calcularSaldo(entrada: EntradaUnidade, repasseAnterior: number): SaldoUnidade {
  const saldoAUtilizar = entrada.baseline + repasseAnterior;
  const consumoTotal =
    entrada.consumo + entrada.requerimentos + entrada.reajusteSaida - entrada.reajusteEntrada;
  return {
    baseline: entrada.baseline,
    repasseAnterior,
    saldoAUtilizar,
    consumo: entrada.consumo,
    requerimentos: entrada.requerimentos,
    reajustes: entrada.reajusteEntrada - entrada.reajusteSaida,
    consumoTotal,
    saldo: saldoAUtilizar - consumoTotal,
  };
}

function validarPorPeriodo(p: ParametrosCalculo): { duracao: number; ciclo: number } {
  const duracao = p.duracaoPeriodoMeses;
  const periodos = p.periodosAteZerar;
  if (!duracao || !periodos) {
    throw new Error('Repasse por período sem duração ou quantidade de períodos');
  }
  if (duracao * periodos !== p.periodoApuracao) {
    throw new Error(
      `Repasse por período: o período de apuração (${p.periodoApuracao}) deve ser igual a duração × períodos (${duracao} × ${periodos})`
    );
  }
  return { duracao, ciclo: duracao * periodos };
}

/**
 * O que o saldo do mês vira: repasse para o mês seguinte ou, no fim do período,
 * excedente (RC-29, RC-30, RC-32 corrigido, RC-34).
 */
export function aplicarRegraDeSaida(
  p: ParametrosCalculo,
  m: MesAno,
  saldo: number,
  percentuais: PercentuaisRepasse,
  unidade: Unidade
): ResultadoSaida {
  const indice = exigirVigente(p, m);
  const porPeriodo = p.repasseEspecial === 'por_periodo' ? validarPorPeriodo(p) : null;

  if (ehFimDePeriodo(p, m)) {
    return {
      repasse: 0,
      excedente: saldo < 0 ? -saldo : 0,
      fimPeriodo: true,
      transicaoPeriodo: false,
    };
  }

  if (porPeriodo) {
    const posicao = indice % porPeriodo.ciclo;
    const transicao = posicao % porPeriodo.duracao === porPeriodo.duracao - 1;
    const percentual = transicao ? percentuais.entrePeriodos : percentuais.dentroPeriodo;
    return {
      repasse: calcularRepasse(saldo, validarPercentual(percentual), unidade),
      excedente: 0,
      fimPeriodo: false,
      transicaoPeriodo: transicao,
    };
  }

  return {
    repasse: calcularRepasse(saldo, percentuais.mensal, unidade),
    excedente: 0,
    fimPeriodo: false,
    transicaoPeriodo: false,
  };
}

/** Valor do excedente em reais, arredondado a 2 casas (RC-75, RC-76) */
export function valorExcedente(quantidade: number, unidade: Unidade, taxa: number | null): number {
  if (taxa === null || taxa === undefined) return 0;
  const valor = unidade === 'horas' ? (quantidade / 60) * taxa : quantidade * taxa;
  return Math.round(valor * 100) / 100;
}
