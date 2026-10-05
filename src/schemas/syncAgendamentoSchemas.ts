/**
 * Schema do formulário de agendamento de sincronização.
 * As mensagens são chaves i18n (traduzidas na hora de exibir).
 * A mesma regra é validada de novo no sync-api (validarRegra).
 *
 * Os campos e a validação da recorrência são compartilhados com o
 * agendamento do Envio Automático de Saldo Parcial.
 */

import { z } from 'zod';
import type { RegraRecorrencia, SyncAgendamento, SyncAgendamentoInput } from '@/types/syncAgendamentos';

const V = 'sincronizacaoSql.validacao';
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const TABELAS_SYNC = ['pesquisas', 'especialistas', 'apontamentos', 'tickets', 'codigoResolucao'] as const;

const tabelasSchema = z.object({
  pesquisas: z.boolean(),
  especialistas: z.boolean(),
  apontamentos: z.boolean(),
  tickets: z.boolean(),
  codigoResolucao: z.boolean(),
  detectarInconsistencias: z.boolean(),
  ajustesRetroativos: z.boolean(),
});

/** Campos da regra de recorrência como ficam no formulário */
export const camposRegraRecorrenciaSchema = {
  frequencia: z.enum(['diario', 'semanal', 'mensal']),
  dias_semana: z.array(z.number().int().min(0).max(6)),
  dias_mes: z.array(z.number().int().min(1).max(31)),
  ultimo_dia_mes: z.boolean(),
  modo_horario: z.enum(['horarios', 'intervalo']),
  horarios: z.array(z.string()),
  intervalo_horas: z.number().nullable(),
  hora_inicio: z.string(),
  hora_fim: z.string(),
};

export type RegraRecorrenciaFormValues = z.infer<z.ZodObject<typeof camposRegraRecorrenciaSchema>>;

/** Validação cruzada da recorrência (usada no superRefine dos formulários de agendamento) */
export function validarRegraRecorrenciaForm(v: RegraRecorrenciaFormValues, ctx: z.RefinementCtx) {
  const erro = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

  if (v.frequencia === 'semanal' && v.dias_semana.length === 0) erro('dias_semana', `${V}.diaSemanaObrigatorio`);
  if (v.frequencia === 'mensal' && v.dias_mes.length === 0 && !v.ultimo_dia_mes) {
    erro('dias_mes', `${V}.diaMesObrigatorio`);
  }

  if (v.modo_horario === 'horarios') {
    if (v.horarios.length === 0) erro('horarios', `${V}.horarioObrigatorio`);
    else if (v.horarios.some((h) => !REGEX_HORA.test(h))) erro('horarios', `${V}.horarioInvalido`);
  } else {
    const n = v.intervalo_horas;
    if (!Number.isInteger(n) || n < 1 || n > 23) erro('intervalo_horas', `${V}.intervaloInvalido`);
    if (!REGEX_HORA.test(v.hora_inicio)) erro('hora_inicio', `${V}.horaInicioObrigatoria`);
    if (v.hora_fim) {
      if (!REGEX_HORA.test(v.hora_fim)) erro('hora_fim', `${V}.horarioInvalido`);
      else if (REGEX_HORA.test(v.hora_inicio) && v.hora_fim < v.hora_inicio) erro('hora_fim', `${V}.horaFimAntes`);
    }
  }
}

export const agendamentoFormSchema = z
  .object({
    nome: z.string().trim().min(1, `${V}.nomeObrigatorio`).max(120),
    ativo: z.boolean(),
    tabelas: tabelasSchema,
    ...camposRegraRecorrenciaSchema,
  })
  .superRefine((v, ctx) => {
    if (!TABELAS_SYNC.some((t) => v.tabelas[t])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['tabelas'], message: `${V}.tabelaObrigatoria` });
    }
    validarRegraRecorrenciaForm(v, ctx);
  });

export type AgendamentoFormValues = z.infer<typeof agendamentoFormSchema>;

/** Valores iniciais da recorrência: diário às 07:00 */
export function valoresIniciaisRegraRecorrencia(): RegraRecorrenciaFormValues {
  return {
    frequencia: 'diario',
    dias_semana: [1, 2, 3, 4, 5],
    dias_mes: [1],
    ultimo_dia_mes: false,
    modo_horario: 'horarios',
    horarios: ['07:00'],
    intervalo_horas: 2,
    hora_inicio: '07:00',
    hora_fim: '',
  };
}

export function valoresIniciaisAgendamento(): AgendamentoFormValues {
  return {
    nome: '',
    ativo: true,
    tabelas: {
      pesquisas: true,
      especialistas: true,
      apontamentos: true,
      tickets: true,
      codigoResolucao: true,
      detectarInconsistencias: true,
      ajustesRetroativos: true,
    },
    ...valoresIniciaisRegraRecorrencia(),
  };
}

const horaCurta = (h: string | null | undefined) => (h || '').slice(0, 5);

/** Converte os campos de recorrência do formulário na regra gravada, limpando o que não se aplica */
export function regraFormParaRegra(v: RegraRecorrenciaFormValues): RegraRecorrencia {
  const porIntervalo = v.modo_horario === 'intervalo';
  return {
    frequencia: v.frequencia,
    dias_semana: v.frequencia === 'semanal' ? [...new Set(v.dias_semana)].sort((a, b) => a - b) : [],
    dias_mes: v.frequencia === 'mensal' ? [...new Set(v.dias_mes)].sort((a, b) => a - b) : [],
    ultimo_dia_mes: v.frequencia === 'mensal' ? v.ultimo_dia_mes : false,
    modo_horario: v.modo_horario,
    horarios: porIntervalo ? [] : [...new Set(v.horarios)].sort(),
    intervalo_horas: porIntervalo ? v.intervalo_horas : null,
    hora_inicio: porIntervalo ? v.hora_inicio : null,
    hora_fim: porIntervalo && v.hora_fim ? v.hora_fim : null,
  };
}

/** Preenche os campos de recorrência do formulário a partir de uma regra salva */
export function regraParaRegraForm(regra: RegraRecorrencia): RegraRecorrenciaFormValues {
  const padrao = valoresIniciaisRegraRecorrencia();
  return {
    frequencia: regra.frequencia,
    dias_semana: regra.dias_semana?.length ? regra.dias_semana : padrao.dias_semana,
    dias_mes: regra.dias_mes?.length ? regra.dias_mes : regra.ultimo_dia_mes ? [] : padrao.dias_mes,
    ultimo_dia_mes: !!regra.ultimo_dia_mes,
    modo_horario: regra.modo_horario,
    horarios: regra.horarios?.length ? regra.horarios.map(horaCurta) : padrao.horarios,
    intervalo_horas: regra.intervalo_horas ?? padrao.intervalo_horas,
    hora_inicio: horaCurta(regra.hora_inicio) || padrao.hora_inicio,
    hora_fim: horaCurta(regra.hora_fim),
  };
}

/** Converte o formulário no registro gravado, limpando o que não se aplica à regra */
export function formParaAgendamentoInput(v: AgendamentoFormValues): SyncAgendamentoInput {
  return {
    nome: v.nome.trim(),
    ativo: v.ativo,
    tabelas: { ...v.tabelas },
    ...regraFormParaRegra(v),
  };
}

/** Preenche o formulário a partir de um agendamento salvo (edição) */
export function agendamentoParaForm(ag: SyncAgendamento): AgendamentoFormValues {
  const t = ag.tabelas || {};
  return {
    nome: ag.nome,
    ativo: ag.ativo,
    tabelas: {
      pesquisas: !!t.pesquisas,
      especialistas: !!t.especialistas,
      apontamentos: !!t.apontamentos,
      tickets: !!t.tickets,
      codigoResolucao: !!t.codigoResolucao,
      detectarInconsistencias: t.detectarInconsistencias !== false,
      ajustesRetroativos: t.ajustesRetroativos !== false,
    },
    ...regraParaRegraForm(ag),
  };
}
