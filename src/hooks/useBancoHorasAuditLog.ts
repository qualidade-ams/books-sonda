/**
 * Hook para gerenciamento de audit log do Banco de Horas
 * 
 * Fornece funcionalidades para buscar, filtrar e exportar logs de auditoria
 * do sistema de banco de horas, incluindo todas as ações realizadas por usuários.
 * 
 * @module hooks/useBancoHorasAuditLog
 * @requirements 13.1-13.10
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BancoHorasAuditLog } from '@/types/bancoHoras';

/**
 * Filtros para busca de audit log
 */
export interface AuditLogFilters {
  /** ID da empresa para filtrar */
  empresaId?: string;
  
  /** Data inicial do período */
  dataInicio?: Date;
  
  /** Data final do período */
  dataFim?: Date;
  
  /** ID do usuário que realizou a ação */
  usuarioId?: string;
  
  /** Tipo de ação realizada */
  acao?: string;
  
  /** Termo de busca livre */
  busca?: string;
}

/**
 * Opções de paginação
 */
export interface PaginationOptions {
  /** Página atual (1-indexed) */
  page: number;
  
  /** Itens por página */
  pageSize: number;
}

/**
 * Resultado paginado de audit logs
 */
export interface PaginatedAuditLogs {
  /** Lista de logs da página atual */
  logs: BancoHorasAuditLog[];
  
  /** Total de registros */
  totalCount: number;
  
  /** Total de páginas */
  totalPages: number;
  
  /** Página atual */
  currentPage: number;
  
  /** Itens por página */
  pageSize: number;
}

/**
 * Hook para buscar audit logs com filtros e paginação
 * 
 * @param filters - Filtros a serem aplicados
 * @param pagination - Opções de paginação
 * @returns Query com logs paginados e metadados
 */
export function useBancoHorasAuditLog(
  filters: AuditLogFilters = {},
  pagination: PaginationOptions = { page: 1, pageSize: 50 }
) {
  return useQuery({
    queryKey: ['banco-horas-audit-log', filters, pagination],
    queryFn: async (): Promise<PaginatedAuditLogs> => {
      // Construir query base
      let query = supabase
        .from('banco_horas_audit_log')
        .select('*', { count: 'exact' });
      
      // Aplicar filtros
      if (filters.empresaId) {
        query = query.eq('empresa_id', filters.empresaId);
      }
      
      if (filters.dataInicio) {
        query = query.gte('created_at', filters.dataInicio.toISOString());
      }
      
      if (filters.dataFim) {
        // Adicionar 1 dia para incluir todo o dia final
        const dataFimAjustada = new Date(filters.dataFim);
        dataFimAjustada.setDate(dataFimAjustada.getDate() + 1);
        query = query.lt('created_at', dataFimAjustada.toISOString());
      }
      
      if (filters.usuarioId) {
        query = query.eq('created_by', filters.usuarioId);
      }
      
      if (filters.acao) {
        query = query.eq('acao', filters.acao);
      }
      
      if (filters.busca) {
        // Busca em descrição ou ação
        query = query.or(`descricao.ilike.%${filters.busca}%,acao.ilike.%${filters.busca}%`);
      }
      
      // Ordenar por data decrescente (mais recentes primeiro)
      query = query.order('created_at', { ascending: false });
      
      // Aplicar paginação
      const from = (pagination.page - 1) * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
      
      // Executar query
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Erro ao buscar audit log:', error);
        throw new Error(`Falha ao buscar audit log: ${error.message}`);
      }
      
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.pageSize);
      
      return {
        logs: (data || []) as BancoHorasAuditLog[],
        totalCount,
        totalPages,
        currentPage: pagination.page,
        pageSize: pagination.pageSize
      };
    },
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para buscar tipos de ações disponíveis no audit log
 * 
 * Útil para popular dropdowns de filtro com as ações que realmente existem no sistema.
 * 
 * @returns Query com lista de ações únicas
 */
export function useAcoesDisponiveis() {
  return useQuery({
    queryKey: ['banco-horas-audit-log-acoes'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('banco_horas_audit_log')
        .select('acao')
        .order('acao');
      
      if (error) {
        console.error('Erro ao buscar ações:', error);
        throw new Error(`Falha ao buscar ações: ${error.message}`);
      }
      
      // Extrair ações únicas
      const acoesUnicas = Array.from(
        new Set((data || []).map(item => item.acao).filter(Boolean))
      );
      
      return acoesUnicas;
    },
    staleTime: 300000, // 5 minutos (ações mudam raramente)
  });
}

/**
 * Hook para buscar usuários que realizaram ações no audit log
 * 
 * Útil para popular dropdowns de filtro com os usuários que realmente têm ações registradas.
 * 
 * @returns Query com lista de IDs de usuários únicos
 */
export function useUsuariosAuditLog() {
  return useQuery({
    queryKey: ['banco-horas-audit-log-usuarios'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('banco_horas_audit_log')
        .select('created_by')
        .not('created_by', 'is', null)
        .order('created_by');
      
      if (error) {
        console.error('Erro ao buscar usuários:', error);
        throw new Error(`Falha ao buscar usuários: ${error.message}`);
      }
      
      // Extrair usuários únicos
      const usuariosUnicos = Array.from(
        new Set((data || []).map(item => item.created_by).filter(Boolean))
      );
      
      return usuariosUnicos as string[];
    },
    staleTime: 300000, // 5 minutos
  });
}

/**
 * Função auxiliar para formatar ação para exibição
 * 
 * Converte nomes técnicos de ações em descrições amigáveis.
 * 
 * @param acao - Nome técnico da ação
 * @returns Descrição amigável da ação
 */
export function formatarAcao(acao: string): string {
  const mapeamento: Record<string, string> = {
    'calculo_criado': 'Cálculo Criado',
    'reajuste_aplicado': 'Reajuste Aplicado',
    'recalculo_executado': 'Recálculo Executado',
    'versao_criada': 'Versão Criada',
    'alocacao_criada': 'Alocação Criada',
    'alocacao_atualizada': 'Alocação Atualizada',
    'alocacao_removida': 'Alocação Removida',
    'parametros_atualizados': 'Parâmetros Atualizados',
    'exportacao_realizada': 'Exportação Realizada'
  };
  
  return mapeamento[acao] || acao;
}

/**
 * Função auxiliar para obter cor da badge de ação
 * 
 * @param acao - Nome técnico da ação
 * @returns Classes CSS para a badge
 */
export function getCorAcao(acao: string): string {
  if (acao.includes('criado') || acao.includes('criada')) {
    return 'bg-green-100 text-green-800';
  }
  if (acao.includes('atualizado') || acao.includes('atualizada')) {
    return 'bg-blue-100 text-blue-800';
  }
  if (acao.includes('removido') || acao.includes('removida') || acao.includes('excluido')) {
    return 'bg-red-100 text-red-800';
  }
  if (acao.includes('reajuste') || acao.includes('recalculo')) {
    return 'bg-orange-100 text-orange-800';
  }
  if (acao.includes('exportacao')) {
    return 'bg-purple-100 text-purple-800';
  }
  return 'bg-gray-100 text-gray-800';
}
