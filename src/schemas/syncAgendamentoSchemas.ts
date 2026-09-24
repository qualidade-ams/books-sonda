/**
 * Schema do formulário de agendamento de sincronização.
 * As mensagens são chaves i18n (traduzidas na hora de exibir).
 * A mesma regra é validada de novo no sync-api (validarRegra).
 */

import { z } from 'zod';
import type { SyncAgendamento, SyncAgendamentoInput } from '@/types/syncAgendamentos';

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

export const agendamentoFormSchema = z
  .object({
    nome: z.string().trim().min(1, `${V}.nomeObrigatorio`).max(120),
    ativo: z.boolean(),
    tabelas: tabelasSchema,
    frequencia: z.enum(['diario', 'semanal', 'mensal']),
    dias_semana: z.array(z.number().int().min(0).max(6)),
    dias_mes: z.array(z.number().int().min(1).max(31)),
    ultimo_dia_mes: z.boolean(),
    modo_horario: z.enum(['horarios', 'intervalo']),
    horarios: z.array(z.string()),
    intervalo_horas: z.number().nullable(),
    hora_inicio: z.string(),
    hora_fim: z.string(),
  })
  .superRefine((v, ctx) => {
    const erro = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (!TABELAS_SYNC.some((t) => v.tabelas[t])) erro('tabelas', `${V}.tabelaObrigatoria`);

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
  });

export type AgendamentoFormValues = z.infer<typeof agendamentoFormSchema>;

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

const horaCurta = (h: string | null | undefined) => (h || '').slice(0, 5);

/** Converte o formulário no registro gravado, limpando o que não se aplica à regra */
export function formParaAgendamentoInput(v: AgendamentoFormValues): SyncAgendamentoInput {
  const porIntervalo = v.modo_horario === 'intervalo';
  return {
    nome: v.nome.trim(),
    ativo: v.ativo,
    tabelas: { ...v.tabelas },
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

/** Preenche o formulário a partir de um agendamento salvo (edição) */
export function agendamentoParaForm(ag: SyncAgendamento): AgendamentoFormValues {
  const padrao = valoresIniciaisAgendamento();
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
    frequencia: ag.frequencia,
    dias_semana: ag.dias_semana?.length ? ag.dias_semana : padrao.dias_semana,
    dias_mes: ag.dias_mes?.length ? ag.dias_mes : ag.ultimo_dia_mes ? [] : padrao.dias_mes,
    ultimo_dia_mes: !!ag.ultimo_dia_mes,
    modo_horario: ag.modo_horario,
    horarios: ag.horarios?.length ? ag.horarios.map(horaCurta) : padrao.horarios,
    intervalo_horas: ag.intervalo_horas ?? padrao.intervalo_horas,
    hora_inicio: horaCurta(ag.hora_inicio) || padrao.hora_inicio,
    hora_fim: horaCurta(ag.hora_fim),
  };
}
