/**
 * Tipos e interfaces para o sistema de Geração de Books
 * Define estruturas de dados para KPIs, snapshots e geração de relatórios
 */

// Status de geração do book
export type BookStatus = 'pendente' | 'gerando' | 'gerado' | 'erro' | 'desatualizado';

// Tipos de abas do book
export type BookTab = 'capa' | 'volumetria' | 'sla' | 'backlog' | 'consumo' | 'pesquisa';

// ============================================================================
// INTERFACES PRINCIPAIS
// ============================================================================

/**
 * Dados completos de um book gerado
 */
export interface BookData {
  id: string;
  empresa_id: string;
  empresa_nome: string;
  mes: number;
  ano: number;
  status: BookStatus;
  data_geracao?: string;
  data_atualizacao?: string;
  
  // Dados congelados (snapshot)
  capa: BookCapaData;
  volumetria: BookVolumetriaData;
  sla: BookSLAData;
  backlog: BookBacklogData;
  consumo: BookConsumoData;
  pesquisa: BookPesquisaData;
  
  // Metadados
  pdf_url?: string;
  pdf_gerado_em?: string;
  erro_detalhes?: string;
}

/**
 * Dados da capa do book
 */
export interface BookCapaData {
  empresa_nome: string;
  empresa_logo_url?: string;
  periodo: string; // Ex: "Janeiro 2026"
  mes: number;
  ano: number;
  data_geracao: string;
}

/**
 * Dados de volumetria (chamados e desempenho operacional)
 */
export interface BookVolumetriaData {
  // Cards de métricas principais
  abertos_mes: {
    solicitacao: number;
    incidente: number;
  };
  fechados_mes: {
    solicitacao: number;
    incidente: number;
  };
  sla_medio: number; // Percentual
  total_backlog: number;
  
  // Gráfico: Chamados por Semestre
  chamados_semestre: ChamadosSemestreData[];
  
  // Card lateral: Chamados por Grupo
  chamados_por_grupo: ChamadosPorGrupoData[];
  taxa_resolucao: number; // Percentual
  
  // Tabela: Backlog Atualizado por Causa
  backlog_por_causa: BacklogPorCausaData[];
}

export interface ChamadosSemestreData {
  mes: string; // Ex: "ABRIL", "MAIO"
  abertos: number;
  fechados: number;
}

export interface ChamadosPorGrupoData {
  grupo: string; // Ex: "IMPORTAÇÃO"
  total: number;
  abertos: number;
  fechados: number;
  percentual: number;
}

export interface BacklogPorCausaData {
  origem: string; // Ex: "Parametrização", "Desenvolvimento Standard"
  incidente: number;
  solicitacao: number;
  total: number;
}

/**
 * Dados de SLA (nível de serviço)
 */
export interface BookSLAData {
  // Card principal: SLA Meta de Atendimento
  sla_percentual: number;
  meta_percentual: number;
  status: 'no_prazo' | 'vencido'; // Se está acima ou abaixo da meta
  
  // Cards de métricas
  fechados: number;
  incidentes: number;
  violados: number;
  
  // Gráfico: SLA Histórico Mensal
  sla_historico: SLAHistoricoData[];
  
  // Tabela: Chamados Violados
  chamados_violados: ChamadoVioladoData[];
}

export interface SLAHistoricoData {
  mes: string; // Ex: "MAIO", "JUNHO"
  percentual: number;
  status: 'no_prazo' | 'vencido';
}

export interface ChamadoVioladoData {
  id_chamado: string; // Ex: "5017679"
  tipo: 'Incidente' | 'Requisição';
  data_abertura: string;
  data_solucao: string;
  grupo_atendedor: string;
}

/**
 * Dados de backlog (pendências e envelhecimento)
 */
export interface BookBacklogData {
  // Cards de métricas
  total: number;
  incidente: number;
  solicitacao: number;
  
  // Gráfico: Aging dos Chamados
  aging_chamados: AgingChamadosData[];
  
  // Card lateral: Distribuição por Grupo
  distribuicao_por_grupo: DistribuicaoPorGrupoData[];
}

export interface AgingChamadosData {
  faixa: string; // Ex: "ACIMA DE 60 DIAS", "05 A 15 DIAS"
  solicitacao: number;
  incidente: number;
  total: number;
}

export interface DistribuicaoPorGrupoData {
  grupo: string; // Ex: "IMPORTAÇÃO"
  total: number;
  percentual: number;
}

/**
 * Dados de consumo (horas e baseline)
 */
export interface BookConsumoData {
  // Cards de métricas principais
  horas_consumo: string; // Ex: "26:10:12"
  baseline_apl: string; // Ex: "40:00:00"
  incidente: string; // Ex: "--" ou horas
  solicitacao: string; // Ex: "26:10:12"
  percentual_consumido: number; // Ex: 100
  
  // Gráfico: Histórico de Consumo Mensal
  historico_consumo: HistoricoConsumoData[];
  
  // Gráfico: Distribuição de Causa
  distribuicao_causa: DistribuicaoCausaData[];
  
  // Total geral
  total_geral: number;
}

export interface HistoricoConsumoData {
  mes: string; // Ex: "ABR", "MAI", "JUN"
  horas: string; // Ex: "23:15"
  valor_numerico: number; // Para o gráfico
}

export interface DistribuicaoCausaData {
  causa: string; // Ex: "Parametrização", "Desenvolvimento Standard"
  quantidade: number;
  percentual: number;
}

/**
 * Dados de pesquisa (satisfação do cliente)
 */
export interface BookPesquisaData {
  // Cards circulares
  pesquisas_respondidas: number;
  pesquisas_nao_respondidas: number;
  pesquisas_enviadas: number;
  
  // Tabela: Resumo de Pesquisas
  resumo_pesquisas: ResumoPesquisaData[];
  
  // Gráfico: % Pesquisa Aderência
  percentual_aderencia: number;
  
  // Nível de Satisfação
  nivel_satisfacao: {
    insatisfeito: number;
    neutro: number;
    satisfeito: number;
  };
  
  // Mensagem quando não há dados
  sem_avaliacoes: boolean;
}

export interface ResumoPesquisaData {
  chamado: string;
  tipo: 'Incidente' | 'Requisição';
  solicitante: string;
  grupo: string;
  resposta: string | null;
}

// ============================================================================
// INTERFACES PARA LISTAGEM E GERENCIAMENTO
// ============================================================================

/**
 * Item da listagem de books (resumo)
 */
export interface BookListItem {
  id: string;
  empresa_id: string;
  empresa_nome: string;
  empresa_logo_url?: string;
  mes: number;
  ano: number;
  status: BookStatus;
  data_geracao?: string;
  data_atualizacao?: string;
  pdf_url?: string;
  tem_dados: boolean;
}

/**
 * Estatísticas da página de books
 */
export interface BooksStats {
  total_empresas: number;
  total_horas: string;
  valor_total: number;
  valores_selecionados: number;
}

/**
 * Filtros para listagem de books
 */
export interface BooksFiltros {
  mes: number;
  ano: number;
  status?: BookStatus[];
  busca?: string;
  apenas_com_dados?: boolean;
}

/**
 * Resultado de geração de book
 */
export interface BookGeracaoResult {
  sucesso: boolean;
  book_id?: string;
  empresa_id: string;
  empresa_nome: string;
  erro?: string;
  pdf_url?: string;
}

/**
 * Resultado de geração em lote
 */
export interface BooksGeracaoLoteResult {
  total: number;
  sucesso: number;
  falhas: number;
  resultados: BookGeracaoResult[];
}

/**
 * Configuração de geração de book
 */
export interface BookGeracaoConfig {
  empresa_ids: string[];
  mes: number;
  ano: number;
  forcar_atualizacao?: boolean; // Se true, regenera mesmo se já existir
  gerar_pdf?: boolean; // Se true, gera PDF automaticamente
}

/**
 * Opções de exportação de book
 */
export interface BookExportOptions {
  formato: 'pdf';
  incluir_abas: BookTab[];
  orientacao?: 'portrait' | 'landscape';
  tamanho_pagina?: 'A4' | 'Letter';
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

/**
 * Período (mês/ano)
 */
export interface Periodo {
  mes: number;
  ano: number;
  label: string; // Ex: "Janeiro 2026"
}

/**
 * Progresso de geração
 */
export interface BookGeracaoProgress {
  empresa_id: string;
  empresa_nome: string;
  etapa: 'iniciando' | 'coletando_dados' | 'processando' | 'gerando_pdf' | 'concluido' | 'erro';
  progresso: number; // 0-100
  mensagem?: string;
}

// ============================================================================
// CONSTANTES E ENUMS
// ============================================================================

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  pendente: 'Pendente',
  gerando: 'Gerando...',
  gerado: 'Gerado',
  erro: 'Erro',
  desatualizado: 'Desatualizado'
};

export const BOOK_STATUS_COLORS: Record<BookStatus, string> = {
  pendente: 'bg-gray-100 text-gray-800',
  gerando: 'bg-blue-100 text-blue-800',
  gerado: 'bg-green-100 text-green-800',
  erro: 'bg-red-100 text-red-800',
  desatualizado: 'bg-yellow-100 text-yellow-800'
};

export const BOOK_TABS_LABELS: Record<BookTab, string> = {
  capa: 'Capa',
  volumetria: 'Volumetria',
  sla: 'SLA',
  backlog: 'Backlog',
  consumo: 'Consumo',
  pesquisa: 'Pesquisa'
};

export const MESES_LABELS: Record<number, string> = {
  1: 'Janeiro',
  2: 'Fevereiro',
  3: 'Março',
  4: 'Abril',
  5: 'Maio',
  6: 'Junho',
  7: 'Julho',
  8: 'Agosto',
  9: 'Setembro',
  10: 'Outubro',
  11: 'Novembro',
  12: 'Dezembro'
};

export const MESES_ABREVIADOS: Record<number, string> = {
  1: 'JAN',
  2: 'FEV',
  3: 'MAR',
  4: 'ABR',
  5: 'MAI',
  6: 'JUN',
  7: 'JUL',
  8: 'AGO',
  9: 'SET',
  10: 'OUT',
  11: 'NOV',
  12: 'DEZ'
};
