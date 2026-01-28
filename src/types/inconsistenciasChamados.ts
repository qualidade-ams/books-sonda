/**
 * Tipos para Inconsistências de Chamados
 * Auditoria de chamados com problemas detectados
 */

export type OrigemInconsistencia = 'apontamentos' | 'tickets';

export type TipoInconsistencia = 
  | 'mes_diferente'      // data_atividade e data_sistema em meses diferentes
  | 'data_invertida'     // data_sistema < data_atividade
  | 'tempo_excessivo';   // tempo_gasto_horas > 10:00

export interface InconsistenciaChamado {
  // Identificação
  id: string;
  origem: OrigemInconsistencia;
  nro_chamado: string;
  
  // Datas
  data_atividade: string;
  data_sistema: string;
  
  // Tempo
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  
  // Informações adicionais
  empresa: string | null;
  analista: string | null;
  tipo_chamado: string | null;
  
  // Inconsistência detectada
  tipo_inconsistencia: TipoInconsistencia;
  descricao_inconsistencia: string;
  
  // Auditoria
  created_at?: string;
}

export interface InconsistenciasChamadosFiltros {
  busca?: string;
  tipo_inconsistencia?: TipoInconsistencia | 'all';
  origem?: OrigemInconsistencia | 'all';
  analista?: string;
  data_inicio?: string;
  data_fim?: string;
}

export interface InconsistenciasChamadosEstatisticas {
  total: number;
  por_tipo: {
    mes_diferente: number;
    data_invertida: number;
    tempo_excessivo: number;
  };
  por_origem: {
    apontamentos: number;
    tickets: number;
  };
}

export interface InconsistenciaDetalhada extends InconsistenciaChamado {
  // Campos adicionais para visualização detalhada
  diferenca_dias?: number;
  diferenca_meses?: number;
  tempo_decimal?: number;
}

export interface HistoricoInconsistencia {
  id: string;
  origem: OrigemInconsistencia;
  nro_chamado: string;
  tipo_inconsistencia: TipoInconsistencia;
  data_atividade: string;
  data_sistema: string;
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  empresa: string | null;
  analista: string | null;
  tipo_chamado: string | null;
  descricao_inconsistencia: string;
  data_envio: string;
  email_analista: string | null;
  enviado_por: string | null;
  enviado_por_nome: string | null;
  mes_referencia: number;
  ano_referencia: number;
  created_at: string;
}

export interface EnviarNotificacaoRequest {
  inconsistencias: InconsistenciaChamado[];
  mes_referencia: number;
  ano_referencia: number;
}

// Labels para exibição
export const TIPO_INCONSISTENCIA_LABELS: Record<TipoInconsistencia, string> = {
  mes_diferente: 'Mês Diferente',
  data_invertida: 'Data Invertida',
  tempo_excessivo: 'Tempo Excessivo'
};

export const ORIGEM_LABELS: Record<OrigemInconsistencia, string> = {
  apontamentos: 'Apontamentos',
  tickets: 'Tickets'
};

// Cores para badges
export const TIPO_INCONSISTENCIA_COLORS: Record<TipoInconsistencia, string> = {
  mes_diferente: 'bg-yellow-100 text-yellow-800',
  data_invertida: 'bg-red-100 text-red-800',
  tempo_excessivo: 'bg-orange-100 text-orange-800'
};

export const ORIGEM_COLORS: Record<OrigemInconsistencia, string> = {
  apontamentos: 'bg-blue-100 text-blue-800',
  tickets: 'bg-purple-100 text-purple-800'
};
