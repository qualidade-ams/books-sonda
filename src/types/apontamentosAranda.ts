/**
 * Tipos para apontamentos sincronizados da tabela AMSapontamento do SQL Server Aranda
 */

export interface ApontamentoAranda {
  // Campos de controle
  id: string;
  origem: 'sql_server' | 'manual';
  id_externo: string;
  
  // Campos da tabela AMSapontamento
  nro_chamado: string | null;
  tipo_chamado: string | null;
  org_us_final: string | null;
  categoria: string | null;
  causa_raiz: string | null;
  solicitante: string | null;
  us_final_afetado: string | null;
  data_abertura: string | null;
  data_sistema: string | null;
  data_atividade: string | null;
  data_fechamento: string | null;
  data_ult_modificacao: string | null;
  ativi_interna: string | null;
  caso_estado: string | null;
  caso_grupo: string | null;
  nro_tarefa: string | null;
  descricao_tarefa: string | null;
  tempo_gasto_segundos: number | null;
  tempo_gasto_minutos: number | null;
  tempo_gasto_horas: string | null;
  item_configuracao: string | null;
  analista_tarefa: string | null;
  analista_caso: string | null;
  estado_tarefa: string | null;
  resumo_tarefa: string | null;
  grupo_tarefa: string | null;
  problema: string | null;
  cod_resolucao: string | null;
  log: string | null;
  
  // Campos de auditoria
  autor_id: string | null;
  autor_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApontamentoArandaFormData {
  nro_chamado: string;
  tipo_chamado?: string;
  org_us_final?: string;
  categoria?: string;
  causa_raiz?: string;
  solicitante?: string;
  us_final_afetado?: string;
  data_abertura?: string;
  data_sistema?: string;
  data_atividade?: string;
  data_fechamento?: string;
  data_ult_modificacao?: string;
  ativi_interna?: string;
  caso_estado?: string;
  caso_grupo?: string;
  nro_tarefa: string;
  descricao_tarefa?: string;
  tempo_gasto_segundos?: number;
  tempo_gasto_minutos?: number;
  tempo_gasto_horas?: string;
  item_configuracao?: string;
  analista_tarefa?: string;
  analista_caso?: string;
  estado_tarefa?: string;
  resumo_tarefa?: string;
  grupo_tarefa?: string;
  problema?: string;
  cod_resolucao?: string;
  log?: string;
}

export interface ApontamentoArandaFiltros {
  busca?: string;
  nro_chamado?: string;
  caso_grupo?: string;
  analista_tarefa?: string;
  data_abertura_inicio?: string;
  data_abertura_fim?: string;
  data_fechamento_inicio?: string;
  data_fechamento_fim?: string;
}

export interface ApontamentoArandaEstatisticas {
  total: number;
  abertos: number;
  fechados: number;
  tempo_total_horas: number;
  tempo_medio_horas: number;
  por_grupo: Record<string, number>;
  por_analista: Record<string, number>;
}
