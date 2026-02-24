/**
 * Hook otimizado para especialistas com cache, debounce e paginação
 * IMPORTANTE: Usa cliente normal com RLS, não o admin client
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Especialista } from '@/types/especialistas';

// Função para buscar especialistas ativos (substituindo a do admin-client)
async function buscarEspecialistasAtivos(): Promise<Especialista[]> {
  const { data, error } = await supabase
    .from('especialistas')
    .select(`
      id,
      nome,
      email,
      codigo,
      empresa,
      departamento,
      cargo
    `)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })
    .limit(1000);

  if (error) {
    console.error('Erro ao buscar especialistas ativos:', error);
    throw error;
  }

  return data || [];
}

// Hook principal otimizado
export function useEspecialistasAtivosOtimizado() {
  return useQuery({
    queryKey: ['especialistas-ativos-otimizado'],
    queryFn: buscarEspecialistasAtivos,
    staleTime: 1000 * 60 * 10, // 10 minutos
    gcTime: 1000 * 60 * 15, // 15 minutos (antes era cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook com busca otimizada e debounce
export function useEspecialistasComBusca() {
  const [termoBusca, setTermoBusca] = useState('');
  
  const { data: todosEspecialistas = [], isLoading, error } = useEspecialistasAtivosOtimizado();

  // Atualizar termo diretamente (sem debounce para busca em memória)
  const atualizarBusca = useCallback((termo: string) => {
    setTermoBusca(termo);
  }, []);

  // Filtrar especialistas em memória (muito mais rápido que no banco)
  const especialistasFiltrados = useMemo(() => {
    if (!termoBusca.trim()) {
      return todosEspecialistas;
    }

    const termo = termoBusca.toLowerCase().trim();
    return todosEspecialistas.filter(especialista => 
      especialista.nome.toLowerCase().includes(termo) ||
      (especialista.email && especialista.email.toLowerCase().includes(termo)) ||
      (especialista.codigo && especialista.codigo.toLowerCase().includes(termo))
    );
  }, [todosEspecialistas, termoBusca]);

  return {
    especialistas: especialistasFiltrados,
    todosEspecialistas,
    termoBusca,
    atualizarBusca,
    isLoading,
    error,
    total: todosEspecialistas.length,
    filtrados: especialistasFiltrados.length
  };
}

// Hook com paginação otimizada para componentes
export function useEspecialistasComPaginacao(itensPorPagina: number = 10) {
  const [paginaAtual, setPaginaAtual] = useState(1);
  const { 
    especialistas: especialistasFiltrados, 
    todosEspecialistas,
    termoBusca, 
    atualizarBusca, 
    isLoading, 
    error,
    total,
    filtrados 
  } = useEspecialistasComBusca();

  // Reset da página quando busca muda
  React.useEffect(() => {
    setPaginaAtual(1);
  }, [termoBusca]);

  // Calcular itens paginados (acumulativo - mostra da página 1 até a atual)
  const especialistasPaginados = useMemo(() => {
    // Se há busca ativa, mostrar todos os resultados filtrados (sem paginação)
    if (termoBusca.trim()) {
      return especialistasFiltrados;
    }
    
    // Se não há busca, aplicar paginação normal
    const fim = paginaAtual * itensPorPagina;
    return especialistasFiltrados.slice(0, fim);
  }, [especialistasFiltrados, paginaAtual, itensPorPagina, termoBusca]);

  // Verificar se há mais páginas (apenas quando não há busca ativa)
  const temMaisPaginas = !termoBusca.trim() && especialistasFiltrados.length > paginaAtual * itensPorPagina;

  // Função para carregar próxima página
  const carregarProximaPagina = useCallback(() => {
    if (temMaisPaginas) {
      setPaginaAtual(prev => prev + 1);
    }
  }, [temMaisPaginas]);

  return {
    especialistas: especialistasPaginados,
    todosEspecialistas,
    termoBusca,
    atualizarBusca,
    isLoading,
    error,
    total,
    filtrados,
    paginaAtual,
    temMaisPaginas,
    carregarProximaPagina,
    itensCarregados: especialistasPaginados.length,
    itensRestantes: Math.max(0, especialistasFiltrados.length - especialistasPaginados.length)
  };
}

// Hook para invalidar cache após sincronização
export function useInvalidarCacheEspecialistas() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['especialistas-ativos-otimizado'] });
    queryClient.invalidateQueries({ queryKey: ['especialistas-ativos'] });
    console.log('🔄 Cache de especialistas invalidado');
  }, [queryClient]);
}

// Função de debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Hook para estatísticas rápidas (sem consulta adicional)
export function useEstatisticasEspecialistas() {
  const { todosEspecialistas, isLoading } = useEspecialistasComBusca();

  const estatisticas = useMemo(() => {
    if (isLoading || !todosEspecialistas.length) {
      return {
        total: 0,
        porEmpresa: {},
        porDepartamento: {},
        comEmail: 0,
        semEmail: 0
      };
    }

    const stats = {
      total: todosEspecialistas.length,
      porEmpresa: {} as Record<string, number>,
      porDepartamento: {} as Record<string, number>,
      comEmail: 0,
      semEmail: 0
    };

    todosEspecialistas.forEach(esp => {
      // Contar por empresa
      if (esp.empresa) {
        stats.porEmpresa[esp.empresa] = (stats.porEmpresa[esp.empresa] || 0) + 1;
      }

      // Contar por departamento
      if (esp.departamento) {
        stats.porDepartamento[esp.departamento] = (stats.porDepartamento[esp.departamento] || 0) + 1;
      }

      // Contar emails
      if (esp.email) {
        stats.comEmail++;
      } else {
        stats.semEmail++;
      }
    });

    return stats;
  }, [todosEspecialistas, isLoading]);

  return { estatisticas, isLoading };
}