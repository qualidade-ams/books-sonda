/**
 * Cálculo de recorrência dos agendamentos de sincronização.
 *
 * A regra combina "em quais dias" (diário / semanal / mensal) com
 * "em que horas" (lista de horários ou a cada X horas a partir de HH:MM).
 * Horários são sempre no fuso de São Paulo; as datas retornadas são
 * instantes (Date) comparáveis com Date.now().
 */

export const FUSO_AGENDAMENTO = 'America/Sao_Paulo';

export interface RegraRecorrencia {
  frequencia: 'diario' | 'semanal' | 'mensal';
  dias_semana: number[]; // 0 = domingo ... 6 = sábado
  dias_mes: number[]; // 1 a 31
  ultimo_dia_mes: boolean;
  modo_horario: 'horarios' | 'intervalo';
  horarios: string[]; // 'HH:MM'
  intervalo_horas: number | null;
  hora_inicio: string | null; // 'HH:MM' ou 'HH:MM:SS'
  hora_fim: string | null;
}

// Limite de busca: 13 meses cobre qualquer regra mensal válida
const MAX_DIAS_BUSCA = 400;

const REGEX_HORA = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;

function paraMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = REGEX_HORA.exec(hora.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

interface DataLocal {
  ano: number;
  mes: number; // 1-12
  dia: number;
}

const formatador = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_AGENDAMENTO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Partes de data/hora de um instante no fuso de São Paulo */
function partesLocais(instante: Date) {
  const p: Record<string, number> = {};
  for (const parte of formatador.formatToParts(instante)) {
    if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
  }
  return { ano: p.year, mes: p.month, dia: p.day, hora: p.hour, minuto: p.minute, segundo: p.second };
}

/** Converte data/hora de São Paulo no instante UTC correspondente */
function localParaInstante(data: DataLocal, minutosDoDia: number): Date {
  const hora = Math.floor(minutosDoDia / 60);
  const minuto = minutosDoDia % 60;
  const comoUtc = Date.UTC(data.ano, data.mes - 1, data.dia, hora, minuto);

  // offset = (relógio local tratado como UTC) - instante real
  const offset = (instante: number) => {
    const p = partesLocais(new Date(instante));
    return Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo) - instante;
  };

  let instante = comoUtc - offset(comoUtc);
  // Segunda passada corrige casos de troca de offset (horário de verão)
  instante = comoUtc - offset(instante);
  return new Date(instante);
}

function somarDias(data: DataLocal, dias: number): DataLocal {
  const d = new Date(Date.UTC(data.ano, data.mes - 1, data.dia + dias));
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function diaValido(regra: RegraRecorrencia, data: DataLocal): boolean {
  if (regra.frequencia === 'diario') return true;

  if (regra.frequencia === 'semanal') {
    const diaSemana = new Date(Date.UTC(data.ano, data.mes - 1, data.dia)).getUTCDay();
    return (regra.dias_semana || []).includes(diaSemana);
  }

  // mensal
  if ((regra.dias_mes || []).includes(data.dia)) return true;
  return !!regra.ultimo_dia_mes && data.dia === ultimoDiaDoMes(data.ano, data.mes);
}

/** Minutos do dia (ordenados, sem repetição) em que a regra dispara */
function minutosDoDia(regra: RegraRecorrencia): number[] {
  const minutos = new Set<number>();

  if (regra.modo_horario === 'horarios') {
    for (const h of regra.horarios || []) {
      const m = paraMinutos(h);
      if (m !== null) minutos.add(m);
    }
  } else {
    const inicio = paraMinutos(regra.hora_inicio);
    const fim = paraMinutos(regra.hora_fim) ?? 23 * 60 + 59;
    const passo = (regra.intervalo_horas || 0) * 60;
    if (inicio !== null && passo > 0) {
      for (let m = inicio; m <= fim; m += passo) minutos.add(m);
    }
  }

  return [...minutos].sort((a, b) => a - b);
}

/**
 * Próximo disparo estritamente depois de `aPartirDe`.
 * Retorna null se a regra não gera nenhum horário.
 */
export function calcularProximaExecucao(regra: RegraRecorrencia, aPartirDe: Date): Date | null {
  const minutos = minutosDoDia(regra);
  if (minutos.length === 0) return null;

  const agora = partesLocais(aPartirDe);
  const hoje: DataLocal = { ano: agora.ano, mes: agora.mes, dia: agora.dia };

  for (let i = 0; i < MAX_DIAS_BUSCA; i++) {
    const data = somarDias(hoje, i);
    if (!diaValido(regra, data)) continue;

    for (const m of minutos) {
      const instante = localParaInstante(data, m);
      if (instante.getTime() > aPartirDe.getTime()) return instante;
    }
  }

  return null;
}

/** Próximos `quantidade` disparos a partir de `aPartirDe` (padrão: agora) */
export function listarProximasExecucoes(
  regra: RegraRecorrencia,
  quantidade: number,
  aPartirDe: Date = new Date()
): Date[] {
  const resultado: Date[] = [];
  let cursor = aPartirDe;
  for (let i = 0; i < quantidade; i++) {
    const proxima = calcularProximaExecucao(regra, cursor);
    if (!proxima) break;
    resultado.push(proxima);
    cursor = proxima;
  }
  return resultado;
}

/** Lista de erros da regra (vazia = válida) */
export function validarRegra(regra: RegraRecorrencia): string[] {
  const erros: string[] = [];

  if (!['diario', 'semanal', 'mensal'].includes(regra?.frequencia)) {
    erros.push('Frequência inválida');
  }
  if (regra.frequencia === 'semanal') {
    const dias = regra.dias_semana || [];
    if (dias.length === 0) erros.push('Selecione ao menos um dia da semana');
    if (dias.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) erros.push('Dia da semana inválido');
  }
  if (regra.frequencia === 'mensal') {
    const dias = regra.dias_mes || [];
    if (dias.length === 0 && !regra.ultimo_dia_mes) erros.push('Selecione ao menos um dia do mês');
    if (dias.some((d) => !Number.isInteger(d) || d < 1 || d > 31)) erros.push('Dia do mês inválido');
  }

  if (regra.modo_horario === 'horarios') {
    const horarios = regra.horarios || [];
    if (horarios.length === 0) erros.push('Informe ao menos um horário');
    if (horarios.some((h) => paraMinutos(h) === null)) erros.push('Horário inválido (use HH:MM)');
  } else if (regra.modo_horario === 'intervalo') {
    const intervalo = regra.intervalo_horas;
    if (!Number.isInteger(intervalo) || (intervalo as number) < 1 || (intervalo as number) > 23) {
      erros.push('Intervalo deve ser entre 1 e 23 horas');
    }
    const inicio = paraMinutos(regra.hora_inicio);
    if (inicio === null) erros.push('Hora de início inválida');
    if (regra.hora_fim) {
      const fim = paraMinutos(regra.hora_fim);
      if (fim === null) erros.push('Hora de fim inválida');
      else if (inicio !== null && fim < inicio) erros.push('Hora de fim deve ser depois da hora de início');
    }
  } else {
    erros.push('Modo de horário inválido');
  }

  return erros;
}
