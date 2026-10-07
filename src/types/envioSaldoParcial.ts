/**
 * Tipos da tela "Envio Automático de Saldo Parcial": agendamentos
 * (banco_horas_envio_agendamentos + clientes vinculados) e histórico
 * (banco_horas_envio_execucoes). O envio em si roda no sync-api.
 */

import type { RegraRecorrencia } from './syncAgendamentos';

export type StatusExecucaoSaldoParcial = 'executando' | 'sucesso' | 'erro' | 'sem_destinatarios' | 'interrompida';

/** Status agregado do último disparo do agendamento */
export type StatusAgendamentoSaldoParcial = 'executando' | 'sucesso' | 'parcial' | 'erro';

export interface AgendamentoSaldoParcial extends RegraRecorrencia {
  id: string;
  nome: string;
  ativo: boolean;
  emails_cc: string[];
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  ultimo_status: StatusAgendamentoSaldoParcial | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** join com banco_horas_envio_agendamento_empresas */
  empresas: Array<{ empresa_id: string }>;
}

export type AgendamentoSaldoParcialInput = RegraRecorrencia & {
  nome: string;
  ativo: boolean;
  emails_cc: string[];
  empresaIds: string[];
};

export interface ExecucaoSaldoParcial {
  id: string;
  agendamento_id: string | null;
  empresa_id: string;
  origem: 'manual' | 'agendado';
  disparado_por: string | null;
  executado_para: string;
  status: StatusExecucaoSaldoParcial;
  qtd_destinatarios: number | null;
  qtd_emails: number | null;
  erro: string | null;
  iniciado_em: string;
  finalizado_em: string | null;
  agendamento?: { nome: string } | null;
  empresa?: { nome_abreviado: string } | null;
}

/** Cliente que pode ser vinculado a um agendamento */
export interface ClienteElegivelSaldoParcial {
  id: string;
  nome: string;
  /** Contatos ativos com finalidade "Saldo Parcial" ou "Ambos" */
  qtdContatosSaldoParcial: number;
  /** empresas_clientes.email_gestor — sugerido no CC ao marcar o cliente */
  emailGestor: string | null;
}
