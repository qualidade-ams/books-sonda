/**
 * Tipos da tela "Sincronização SQL Server": agendamentos de sincronização
 * (tabela sync_agendamentos) e histórico de execuções (sync_execucoes).
 * A execução em si roda no sync-api.
 */

export type FrequenciaAgendamento = 'diario' | 'semanal' | 'mensal';
export type ModoHorarioAgendamento = 'horarios' | 'intervalo';

export type StatusExecucaoSync = 'executando' | 'sucesso' | 'parcial' | 'erro' | 'ignorada' | 'interrompida';

export interface TabelasSync {
  pesquisas?: boolean;
  especialistas?: boolean;
  apontamentos?: boolean;
  tickets?: boolean;
  codigoResolucao?: boolean;
  detectarInconsistencias?: boolean;
  ajustesRetroativos?: boolean;
  /** YYYY-MM-DD, só para execução manual de pesquisas */
  dataInicial?: string;
}

/** Regra de recorrência (horários sempre no fuso America/Sao_Paulo) */
export interface RegraRecorrencia {
  frequencia: FrequenciaAgendamento;
  /** 0 = domingo ... 6 = sábado */
  dias_semana: number[];
  /** 1 a 31 */
  dias_mes: number[];
  ultimo_dia_mes: boolean;
  modo_horario: ModoHorarioAgendamento;
  /** 'HH:MM' */
  horarios: string[];
  intervalo_horas: number | null;
  /** 'HH:MM' (o banco devolve 'HH:MM:SS') */
  hora_inicio: string | null;
  hora_fim: string | null;
}

export interface SyncAgendamento extends RegraRecorrencia {
  id: string;
  nome: string;
  ativo: boolean;
  tabelas: TabelasSync;
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  ultimo_status: StatusExecucaoSync | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncAgendamentoInput = RegraRecorrencia & {
  nome: string;
  ativo: boolean;
  tabelas: TabelasSync;
};

export interface LogExecucaoSync {
  em: string;
  nivel: 'info' | 'erro';
  mensagem: string;
}

export interface SyncExecucao {
  id: string;
  agendamento_id: string | null;
  origem: 'manual' | 'agendado';
  disparado_por: string | null;
  tabelas: TabelasSync;
  status: StatusExecucaoSync;
  iniciado_em: string;
  finalizado_em: string | null;
  resultado: Record<string, any> | null;
  logs: LogExecucaoSync[];
  /** join com sync_agendamentos */
  agendamento?: { nome: string } | null;
}
