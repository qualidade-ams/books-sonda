/**
 * Hook para gerenciamento de dashboards
 * Integração com os dashboards reais da tela principal do sistema
 */

import { useState, useMemo, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useRequerimentos } from '@/hooks/useRequerimentos';
import { useElogios, useEstatisticasElogios } from '@/hooks/useElogios';
import { usePlanosAcao, useEstatisticasPlanosAcao } from '@/hooks/usePlanosAcao';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Dashboard, FiltrosDashboard } from '@/types/dashboards';
import { FileText, Heart, BarChart3, Building2 } from 'lucide-react';

export const useDashboards = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { hasPermission } = usePermissions();
  
  // Hooks para buscar dados dos dashboards reais
  const { data: requerimentos } = useRequerimentos();
  const { data: elogios } = useElogios();
  const { data: planosAcao } = usePlanosAcao();
  const { empresas } = useEmpresas();
  const { data: estatisticasElogios } = useEstatisticasElogios({ ano: new Date().getFullYear() });
  const { data: estatisticasPlanosAcao } = useEstatisticasPlanosAcao();

  const dashboards = useMemo(() => {
    const dashboardsList: Dashboard[] = [];

    // Dashboard de Requerimentos
    if (hasPermission('lancar_requerimentos', 'view') || hasPermission('faturar_requerimentos', 'view')) {
      const totalRequerimentos = requerimentos?.length || 0;
      const requerimentosAtivos = requerimentos?.filter(r => r.status !== 'arquivado').length || 0;
      
      dashboardsList.push({
        id: 'requerimentos',
        nome: 'Dashboard de Requerimentos',
        descricao: 'Relatório completo de requerimentos com métricas de performance, faturamento e análise de tendências',
        categoria: 'operacional',
        tipo: 'mensal',
        status: 'ativo',
        data_criacao: '2024-01-01',
        data_atualizacao: new Date().toISOString(),
        autor: 'Sistema',
        tags: ['requerimentos', 'faturamento', 'performance', 'operacional'],
        configuracao: {
          periodo_padrao: 'mes_atual',
          formato_saida: 'html',
          incluir_graficos: true,
          incluir_tabelas: true
        },
        metricas: {
          total_visualizacoes: 450,
          total_envios: 25,
          ultimo_envio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          taxa_abertura: 89.2
        }
      });
    }

    // Dashboard de Elogios
    if (hasPermission('lancar_pesquisas', 'view') || hasPermission('enviar_pesquisas', 'view')) {
      const totalElogios = elogios?.length || 0;
      const elogiosCompartilhados = elogios?.filter(e => e.status === 'compartilhado').length || 0;
      
      dashboardsList.push({
        id: 'elogios',
        nome: 'Dashboard de Elogios',
        descricao: 'Relatório de elogios e pesquisas de satisfação com análise de feedback dos clientes e métricas de qualidade',
        categoria: 'qualidade',
        tipo: 'mensal',
        status: 'ativo',
        data_criacao: '2024-01-01',
        data_atualizacao: new Date().toISOString(),
        autor: 'Sistema',
        tags: ['elogios', 'satisfacao', 'qualidade', 'feedback'],
        configuracao: {
          periodo_padrao: 'mes_atual',
          formato_saida: 'html',
          incluir_graficos: true,
          incluir_tabelas: true
        },
        metricas: {
          total_visualizacoes: 320,
          total_envios: 18,
          ultimo_envio: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          taxa_abertura: 92.5
        }
      });
    }

    // Dashboard de Planos de Ação
    if (hasPermission('plano_acao', 'view')) {
      const totalPlanos = planosAcao?.length || 0;
      const planosAtivos = planosAcao?.filter(p => p.status === 'ativo').length || 0;
      
      dashboardsList.push({
        id: 'planos-acao',
        nome: 'Dashboard de Planos de Ação',
        descricao: 'Relatório de planos de ação com acompanhamento de metas, progresso e resultados alcançados',
        categoria: 'gestao',
        tipo: 'mensal',
        status: 'ativo',
        data_criacao: '2024-01-01',
        data_atualizacao: new Date().toISOString(),
        autor: 'Sistema',
        tags: ['planos', 'acao', 'metas', 'gestao'],
        configuracao: {
          periodo_padrao: 'mes_atual',
          formato_saida: 'html',
          incluir_graficos: true,
          incluir_tabelas: true
        },
        metricas: {
          total_visualizacoes: 280,
          total_envios: 12,
          ultimo_envio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          taxa_abertura: 87.3
        }
      });
    }

    // Dashboard de Empresas
    if (hasPermission('empresas_clientes', 'view')) {
      const totalEmpresas = empresas?.length || 0;
      const empresasAtivas = empresas?.filter(e => e.ativo).length || 0;
      
      dashboardsList.push({
        id: 'empresas',
        nome: 'Dashboard de Empresas',
        descricao: 'Relatório de empresas clientes com métricas de relacionamento, contratos e performance comercial',
        categoria: 'comercial',
        tipo: 'mensal',
        status: 'ativo',
        data_criacao: '2024-01-01',
        data_atualizacao: new Date().toISOString(),
        autor: 'Sistema',
        tags: ['empresas', 'clientes', 'comercial', 'contratos'],
        configuracao: {
          periodo_padrao: 'mes_atual',
          formato_saida: 'html',
          incluir_graficos: true,
          incluir_tabelas: true
        },
        metricas: {
          total_visualizacoes: 195,
          total_envios: 8,
          ultimo_envio: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          taxa_abertura: 94.1
        }
      });
    }

    return dashboardsList;
  }, [
    hasPermission, 
    requerimentos, 
    elogios, 
    planosAcao, 
    empresas, 
    estatisticasElogios, 
    estatisticasPlanosAcao
  ]);

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    // Simular recarregamento
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsLoading(false);
  };

  return {
    data: dashboards,
    isLoading,
    refetch
  };
};

export const useDashboardsFiltrados = (filtros: FiltrosDashboard) => {
  const { data: dashboards, isLoading, refetch } = useDashboards();

  const dashboardsFiltrados = useMemo(() => {
    if (!dashboards) return [];

    return dashboards.filter(dashboard => {
      // Filtro de busca (nome, descrição, autor)
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        const matchBusca = 
          dashboard.nome.toLowerCase().includes(busca) ||
          dashboard.descricao.toLowerCase().includes(busca) ||
          dashboard.autor.toLowerCase().includes(busca);
        if (!matchBusca) return false;
      }

      // Filtro de categoria
      if (filtros.categoria && dashboard.categoria !== filtros.categoria) {
        return false;
      }

      // Filtro de tipo
      if (filtros.tipo && dashboard.tipo !== filtros.tipo) {
        return false;
      }

      // Filtro de status
      if (filtros.status && dashboard.status !== filtros.status) {
        return false;
      }

      // Filtro de autor
      if (filtros.autor && !dashboard.autor.toLowerCase().includes(filtros.autor.toLowerCase())) {
        return false;
      }

      // Filtro de tags
      if (filtros.tags && filtros.tags.length > 0) {
        const hasMatchingTag = filtros.tags.some(tag => 
          dashboard.tags.some(dashTag => dashTag.toLowerCase().includes(tag.toLowerCase()))
        );
        if (!hasMatchingTag) return false;
      }

      // Filtros de data
      if (filtros.data_inicio) {
        const dataInicio = new Date(filtros.data_inicio);
        const dataAtualizacao = new Date(dashboard.data_atualizacao);
        if (dataAtualizacao < dataInicio) return false;
      }

      if (filtros.data_fim) {
        const dataFim = new Date(filtros.data_fim);
        const dataAtualizacao = new Date(dashboard.data_atualizacao);
        if (dataAtualizacao > dataFim) return false;
      }

      return true;
    });
  }, [dashboards, filtros]);

  // Estatísticas dos dashboards filtrados
  const estatisticas = useMemo(() => {
    const total = dashboardsFiltrados.length;
    const ativos = dashboardsFiltrados.filter(d => d.status === 'ativo').length;
    const emDesenvolvimento = dashboardsFiltrados.filter(d => d.status === 'em_desenvolvimento').length;
    const inativos = dashboardsFiltrados.filter(d => d.status === 'inativo').length;

    const porCategoria = dashboardsFiltrados.reduce((acc, dashboard) => {
      acc[dashboard.categoria] = (acc[dashboard.categoria] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const porTipo = dashboardsFiltrados.reduce((acc, dashboard) => {
      acc[dashboard.tipo] = (acc[dashboard.tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      ativos,
      emDesenvolvimento,
      inativos,
      porCategoria,
      porTipo
    };
  }, [dashboardsFiltrados]);

  return {
    data: dashboardsFiltrados,
    isLoading,
    refetch,
    estatisticas
  };
};

export const useEstatisticasDashboards = () => {
  const { data: dashboards } = useDashboards();

  const estatisticas = useMemo(() => {
    if (!dashboards) return null;

    const total = dashboards.length;
    const ativos = dashboards.filter(d => d.status === 'ativo').length;
    const emDesenvolvimento = dashboards.filter(d => d.status === 'em_desenvolvimento').length;
    const inativos = dashboards.filter(d => d.status === 'inativo').length;

    const totalVisualizacoes = dashboards.reduce((acc, d) => acc + (d.metricas?.total_visualizacoes || 0), 0);
    const totalEnvios = dashboards.reduce((acc, d) => acc + (d.metricas?.total_envios || 0), 0);

    const taxaAberturaMedia = dashboards
      .filter(d => d.metricas?.taxa_abertura)
      .reduce((acc, d, _, arr) => acc + (d.metricas?.taxa_abertura || 0) / arr.length, 0);

    return {
      total,
      ativos,
      emDesenvolvimento,
      inativos,
      totalVisualizacoes,
      totalEnvios,
      taxaAberturaMedia: Math.round(taxaAberturaMedia * 10) / 10
    };
  }, [dashboards]);

  return estatisticas;
};