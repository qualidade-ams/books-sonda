/**
 * Tipos da tela "Sincronização SQL Server": agendamentos de sincronização
 * (tabela sync_agendamentos) e histórico de execuções (sync_execucoes).
 * A execução em si roda no sync-api.
 */

/**
 * sincronizacao = sync SQL Server → Supabase;
 * books = gera e envia para a Qualidade os books liberados e ainda não enviados.
 * As duas dividem a trava do sync-api: uma espera a outra terminar.
 */
export type TipoAgendamentoSync = 'sincronizacao' | 'books';

export type FrequenciaAgendamento = 'diario' | 'semanal' | 'mensal';
export type ModoHorarioAgendamento = 'horarios' | 'intervalo';

export type StatusExecucaoSync =
  'executando' | 'sucesso' | 'parcial' | 'erro' | 'ignorada' | 'interrompida';

export interface TabelasSync {
  pesquisas?: boolean;
  especialistas?: boolean;
  apontamentos?: boolean;
  tickets?: boolean;
  codigoResolucao?: boolean;
  detectarInconsistencias?: boolean;
  ajustesRetroativos?: boolean;
  /** Modo sombra da Fase 4 (Comparação Legado x Novo); padrão: ligado, roda junto com apontamentos */
  modoSombra?: boolean;
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
  tipo: TipoAgendamentoSync;
  nome: string;
  ativo: boolean;
  tabelas: TabelasSync;
  /** Só para books: empresas a gerar (vazio = todas as liberadas e ainda não enviadas) */
  empresa_ids: string[];
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  ultimo_status: StatusExecucaoSync | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type SyncAgendamentoInput = RegraRecorrencia & {
  tipo: TipoAgendamentoSync;
  nome: string;
  ativo: boolean;
  tabelas: TabelasSync;
  empresa_ids: string[];
};

export interface LogExecucaoSync {
  em: string;
  nivel: 'info' | 'erro';
  mensagem: string;
}

export interface SyncExecucao {
  id: string;
  tipo: TipoAgendamentoSync;
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
