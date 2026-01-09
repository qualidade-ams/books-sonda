/**
 * Tipos e interfaces para o sistema de dashboards
 */

export interface Dashboard {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  tipo: 'mensal' | 'semanal' | 'trimestral' | 'anual';
  status: 'ativo' | 'inativo' | 'em_desenvolvimento';
  data_criacao: string;
  data_atualizacao: string;
  autor: string;
  tags: string[];
  configuracao: DashboardConfig;
  metricas?: DashboardMetricas;
}

export interface DashboardConfig {
  periodo_padrao: string;
  formato_saida: 'html' | 'pdf' | 'excel';
  incluir_graficos: boolean;
  incluir_tabelas: boolean;
  template_id?: string;
  cores_personalizadas?: string[];
}

export interface DashboardMetricas {
  total_visualizacoes: number;
  total_envios: number;
  ultimo_envio?: string;
  taxa_abertura?: number;
}

export interface FiltrosDashboard {
  busca?: string;
  categoria?: string;
  tipo?: Dashboard['tipo'];
  status?: Dashboard['status'];
  autor?: string;
  tags?: string[];
  data_inicio?: string;
  data_fim?: string;
}

export interface DashboardSelecionado {
  dashboard: Dashboard;
  periodo_personalizado?: string;
  configuracao_personalizada?: Partial<DashboardConfig>;
}

// Opções para filtros
export const CATEGORIA_OPTIONS = [
  { value: 'operacional', label: 'Operacional' },
  { value: 'qualidade', label: 'Qualidade' },
  { value: 'gestao', label: 'Gestão' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'rh', label: 'Recursos Humanos' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'ti', label: 'Tecnologia da Informação' },
  { value: 'geral', label: 'Geral' }
];

export const TIPO_OPTIONS = [
  { value: 'mensal', label: 'Mensal' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' }
];

export const STATUS_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
  { value: 'em_desenvolvimento', label: 'Em Desenvolvimento' }
];