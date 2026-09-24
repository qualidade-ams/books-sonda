/**
 * Tipos para Inconsistências de Chamados
 * Auditoria de chamados com problemas detectados
 */

export type OrigemInconsistencia = 'apontamentos' | 'tickets';

export type TipoInconsistencia = 
  | 'mes_diferente'      // data_atividade e data_sistema em meses diferentes
  | 'tempo_excessivo'    // tempo_gasto_horas > 10:00
  | 'ic_999999'          // item_configuracao começa com 999999
  | 'sem_atualizacao'    // chamado sem atualização há 16+ dias (status Open/Hold/In Progress/Acknowledged)
  | 'troca_codigo_resolucao'; // última troca de código de resolução mudou o desconto do banco de horas (Banco=S ↔ Banco=N)

export interface InconsistenciaChamado {
  // Identificação
  id: string;
  origem: OrigemInconsistencia;
  nro_chamado: string;
  nro_tarefa: string | null;
  
  // Datas
  data_abertura: string | null;
  data_atividade: string | null;
  data_sistema: string | null;
  
  // Tempo
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  
  // Informações adicionais
  empresa: string | null;
  analista: string | null;
  tipo_chamado: string | null;
  item_configuracao: string | null;
  cod_resolucao: string | null;
  /** Código de resolução antes da troca (só em troca_codigo_resolucao) */
  cod_resolucao_anterior?: string | null;
  
  // Inconsistência detectada
  tipo_inconsistencia: TipoInconsistencia;
  descricao_inconsistencia: string;
  
  // Status e resolução (nova abordagem persistida)
  status?: 'ativa' | 'resolvida';
  status_chamado?: string | null;
  data_deteccao?: string;
  data_resolucao?: string | null;
  
  // Auditoria
  created_at?: string;
  updated_at?: string;
}

export interface InconsistenciasChamadosFiltros {
  /** Tipos exibidos pela tela; vazio/ausente = todos */
  tipos?: TipoInconsistencia[];
  busca?: string;
  tipo_inconsistencia?: TipoInconsistencia | 'all';
  origem?: OrigemInconsistencia | 'all';
  analista?: string;
  data_inicio?: string;
  data_fim?: string;
  status?: 'ativa' | 'resolvida' | 'all';
  status_chamado?: string;
}

export interface InconsistenciasChamadosEstatisticas {
  total: number;
  por_tipo: {
    mes_diferente: number;
    tempo_excessivo: number;
    ic_999999: number;
    sem_atualizacao: number;
    troca_codigo_resolucao: number;
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

/**
 * Um envio de email registrado para uma inconsistência
 * (vem de historico_inconsistencias_chamados)
 */
export interface EnvioEmailInconsistencia {
  email_para: string | null;
  email_cc: string | null;
  data_envio: string;
}

/** Envios agrupados por id da inconsistência, do mais recente para o mais antigo */
export type EnviosPorInconsistencia = Record<string, EnvioEmailInconsistencia[]>;

/**
 * Tarefa (apontamentos_aranda) lançada antes de uma troca de código de resolução.
 * A soma dessas tarefas é o tempo que passou a ser / deixou de ser cobrado do banco de horas.
 */
export interface TarefaAntesDaTroca {
  nro_tarefa: string | null;
  data_sistema: string;
  analista: string | null;
  tempo_gasto_minutos: number;
  tempo_gasto_horas: string;
}

export interface TarefasAntesDaTroca {
  tarefas: TarefaAntesDaTroca[];
  total_minutos: number;
  total_horas: string;
}

export interface EnviarNotificacaoRequest {
  inconsistencias: InconsistenciaChamado[];
  mes_referencia?: number;
  ano_referencia: number;
  /** Destinatários (Para), separados por ", " */
  email_analista?: string;
  /** Destinatários em cópia, separados por ", " */
  email_cc?: string;
}

// Labels para exibição
export const TIPO_INCONSISTENCIA_LABELS: Record<TipoInconsistencia, string> = {
  mes_diferente: 'Mês Diferente',
  tempo_excessivo: 'Tempo Excessivo',
  ic_999999: 'IC 999999',
  sem_atualizacao: 'Sem Atualização 16+ dias',
  troca_codigo_resolucao: 'Troca de código de resolução'
};

export const ORIGEM_LABELS: Record<OrigemInconsistencia, string> = {
  apontamentos: 'Apontamentos',
  tickets: 'Tickets'
};

// Cores para badges
export const TIPO_INCONSISTENCIA_COLORS: Record<TipoInconsistencia, string> = {
  mes_diferente: 'bg-yellow-100 text-yellow-800',
  tempo_excessivo: 'bg-orange-100 text-orange-800',
  ic_999999: 'bg-purple-100 text-purple-800',
  sem_atualizacao: 'bg-sky-100 text-sky-800',
  troca_codigo_resolucao: 'bg-rose-100 text-rose-800'
};

// Ordem fixa de exibição dos tipos de inconsistência (usada para agrupar itens por tipo dentro de um envelope de email)
export const TIPO_INCONSISTENCIA_ORDEM: TipoInconsistencia[] = [
  'mes_diferente', 'tempo_excessivo', 'ic_999999', 'sem_atualizacao', 'troca_codigo_resolucao'
];

// Tipos exibidos em cada tela: a troca de código de resolução tem tela própria
export const TIPOS_TELA_TROCA_CODIGO_RESOLUCAO: TipoInconsistencia[] = ['troca_codigo_resolucao'];
export const TIPOS_TELA_INCONSISTENCIAS: TipoInconsistencia[] = TIPO_INCONSISTENCIA_ORDEM.filter(
  tipo => !TIPOS_TELA_TROCA_CODIGO_RESOLUCAO.includes(tipo)
);

// Hex equivalentes às classes Tailwind de TIPO_INCONSISTENCIA_COLORS, para uso em HTML de email (não processa Tailwind)
export const TIPO_INCONSISTENCIA_COR_EMAIL_HEX: Record<TipoInconsistencia, { bg: string; text: string }> = {
  mes_diferente:    { bg: '#FEF9C3', text: '#854D0E' },
  tempo_excessivo:  { bg: '#FFEDD5', text: '#9A3412' },
  ic_999999:        { bg: '#F3E8FF', text: '#6B21A8' },
  sem_atualizacao:  { bg: '#E0F2FE', text: '#075985' },
  troca_codigo_resolucao: { bg: '#FFE4E6', text: '#9F1239' },
};

// Texto da ação de correção recomendada para cada tipo de inconsistência (exceto ic_999999, que é dinâmico)
export const ACAO_CORRECAO_TEXTO: Record<Exclude<TipoInconsistencia, 'ic_999999'>, string> = {
  mes_diferente: 'Excluir a tarefa com data retroativa e criar um novo apontamento no mês vigente, mantendo a mesma quantidade de horas. Isso garante que as horas sejam contabilizadas corretamente.',
  tempo_excessivo: 'Validar o tempo apontado e, caso esteja incorreto, excluir a tarefa indicada e incluir uma nova tarefa com o período correto.',
  sem_atualizacao: 'Atualizar o chamado e verificar se o status está adequado à situação atual.',
  troca_codigo_resolucao: 'Validar se a troca do código de resolução está correta, pois ela alterou o desconto do chamado no banco de horas. Caso esteja incorreta, voltar o código de resolução adequado.',
};

export const ORIGEM_COLORS: Record<OrigemInconsistencia, string> = {
  apontamentos: 'bg-blue-100 text-blue-800',
  tickets: 'bg-purple-100 text-purple-800'
};
