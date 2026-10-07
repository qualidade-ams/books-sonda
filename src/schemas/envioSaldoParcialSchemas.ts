/**
 * Schema do formulário de agendamento do Envio Automático de Saldo Parcial.
 * As mensagens são chaves i18n. A recorrência é a mesma da Sincronização SQL Server
 * e é validada de novo no sync-api (validarRegra).
 */

import { z } from 'zod';
import type { AgendamentoSaldoParcial, AgendamentoSaldoParcialInput } from '@/types/envioSaldoParcial';
import {
  camposRegraRecorrenciaSchema,
  regraFormParaRegra,
  regraParaRegraForm,
  validarRegraRecorrenciaForm,
  valoresIniciaisRegraRecorrencia,
} from './syncAgendamentoSchemas';

const V = 'envioSaldoParcial.validacao';
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mails digitados separados por ";" ou "," — sem repetidos */
export function extrairEmailsCc(texto: string): string[] {
  return [...new Set(texto.split(/[;,]/).map((e) => e.trim()).filter(Boolean))];
}

/** Acrescenta e-mails ao texto do CC, sem repetir os que já estão (ignorando maiúsculas) */
export function adicionarEmailsCc(texto: string, emails: string[]): string {
  const atuais = extrairEmailsCc(texto);
  const presentes = new Set(atuais.map((e) => e.toLowerCase()));
  const novos = emails.filter((e) => {
    const chave = e.toLowerCase();
    if (presentes.has(chave)) return false;
    presentes.add(chave);
    return true;
  });
  return [...atuais, ...novos].join('; ');
}

/** Tira e-mails do texto do CC (ignorando maiúsculas), mantendo os demais */
export function removerEmailsCc(texto: string, emails: string[]): string {
  const remover = new Set(emails.map((e) => e.toLowerCase()));
  return extrairEmailsCc(texto)
    .filter((e) => !remover.has(e.toLowerCase()))
    .join('; ');
}

export const agendamentoSaldoParcialFormSchema = z
  .object({
    nome: z.string().trim().min(1, `${V}.nomeObrigatorio`).max(120),
    ativo: z.boolean(),
    empresaIds: z.array(z.string()),
    emailsCcTexto: z.string(),
    ...camposRegraRecorrenciaSchema,
  })
  .superRefine((v, ctx) => {
    const erro = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (v.empresaIds.length === 0) erro('empresaIds', `${V}.clienteObrigatorio`);
    if (extrairEmailsCc(v.emailsCcTexto).some((e) => !REGEX_EMAIL.test(e))) erro('emailsCcTexto', `${V}.emailCcInvalido`);
    validarRegraRecorrenciaForm(v, ctx);
  });

export type AgendamentoSaldoParcialFormValues = z.infer<typeof agendamentoSaldoParcialFormSchema>;

export function valoresIniciaisAgendamentoSaldoParcial(): AgendamentoSaldoParcialFormValues {
  return {
    nome: '',
    ativo: true,
    empresaIds: [],
    emailsCcTexto: '',
    ...valoresIniciaisRegraRecorrencia(),
  };
}

/** Converte o formulário no registro gravado, limpando o que não se aplica à regra */
export function formParaAgendamentoSaldoParcialInput(v: AgendamentoSaldoParcialFormValues): AgendamentoSaldoParcialInput {
  return {
    nome: v.nome.trim(),
    ativo: v.ativo,
    empresaIds: [...new Set(v.empresaIds)],
    emails_cc: extrairEmailsCc(v.emailsCcTexto),
    ...regraFormParaRegra(v),
  };
}

/** Preenche o formulário a partir de um agendamento salvo (edição) */
export function agendamentoSaldoParcialParaForm(ag: AgendamentoSaldoParcial): AgendamentoSaldoParcialFormValues {
  return {
    nome: ag.nome,
    ativo: ag.ativo,
    empresaIds: (ag.empresas || []).map((e) => e.empresa_id),
    emailsCcTexto: (ag.emails_cc || []).join('; '),
    ...regraParaRegraForm(ag),
  };
}
