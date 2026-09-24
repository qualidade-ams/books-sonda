import type { TFunction } from 'i18next';
import type { RegraRecorrencia } from '@/types/syncAgendamentos';

// Segunda primeiro, domingo por último
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
const DIAS_UTEIS = [1, 2, 3, 4, 5];

const P = 'sincronizacaoSql.recorrencia';

/** 'HH:MM:SS' → 'HH:MM' */
export const horaCurta = (hora: string | null | undefined) => (hora || '').slice(0, 5);

/** "a", "a e b", "a, b e c" */
function juntar(itens: string[], e: string): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} ${e} ${itens[itens.length - 1]}`;
}

const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

function descreverDias(regra: RegraRecorrencia, t: TFunction): string {
  const e = t(`${P}.e`);

  if (regra.frequencia === 'semanal') {
    const dias = [...new Set(regra.dias_semana || [])];
    if (dias.length === 7) return t(`${P}.todosDias`);
    if (dias.length === 5 && DIAS_UTEIS.every((d) => dias.includes(d))) return t(`${P}.diasUteis`);
    const nomes = ORDEM_SEMANA.filter((d) => dias.includes(d)).map((d) => t(`sincronizacaoSql.diasSemana.d${d}`));
    return capitalizar(juntar(nomes, e));
  }

  if (regra.frequencia === 'mensal') {
    const dias = [...new Set(regra.dias_mes || [])].sort((a, b) => a - b).map(String);
    if (dias.length === 0) return t(`${P}.ultimoDiaMes`);
    if (regra.ultimo_dia_mes) return t(`${P}.diasMesEUltimo`, { dias: dias.join(', ') });
    if (dias.length === 1) return t(`${P}.diaMes`, { dias: dias[0] });
    return t(`${P}.diasMes`, { dias: juntar(dias, e) });
  }

  return t(`${P}.todosDias`);
}

function descreverHorarios(regra: RegraRecorrencia, t: TFunction): string {
  if (regra.modo_horario === 'intervalo') {
    const inicio = horaCurta(regra.hora_inicio);
    if (regra.hora_fim) {
      return t(`${P}.aCadaIntervalo`, { n: regra.intervalo_horas, inicio, fim: horaCurta(regra.hora_fim) });
    }
    return t(`${P}.aCadaAPartir`, { n: regra.intervalo_horas, inicio });
  }

  const horas = [...new Set((regra.horarios || []).map(horaCurta))].sort();
  return t(`${P}.as`, { horas: juntar(horas, t(`${P}.e`)) });
}

/** Texto legível da regra, ex.: "Dias úteis (seg a sex), a cada 2h das 07:00 às 19:00" */
export function descreverRecorrencia(regra: RegraRecorrencia, t: TFunction): string {
  return `${descreverDias(regra, t)}, ${descreverHorarios(regra, t)}`;
}
