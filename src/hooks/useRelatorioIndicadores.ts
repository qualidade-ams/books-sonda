/**
 * Hook para buscar indicadores por empresa a partir dos snapshots dos books gerados.
 *
 * IMPORTANTE: Os dados vêm da tabela `books` (dados congelados na geração),
 * NÃO de consultas em tempo real. Isso garante consistência com os valores
 * que aparecem nos books gerados e só são alterados em caso de retificação.
 *
 * Busca:
 * - Chamados Abertos (dados_volumetria.abertos_mes)
 * - Chamados Fechados (dados_volumetria.fechados_mes)
 * - SLA % (dados_sla.sla_percentual)
 * - Violados (dados_sla.violados)
 * - Backlog (dados_backlog.total)
 * - Pesquisas Enviadas (dados_pesquisa.pesquisas_enviadas)
 * - Pesquisas Respondidas (dados_pesquisa.pesquisas_respondidas)
 * - Pesquisas Não Respondidas (dados_pesquisa.pesquisas_nao_respondidas)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IndicadoresEmpresa, IndicadoresTotais } from '@/types/relatorioIndicadores';

// ─── Fetch principal (dados do snapshot dos books) ────────────────────────────

async function fetchIndicadoresDosBooks(
  mes: number,
  ano: number
): Promise<IndicadoresEmpresa[]> {
  // Buscar todos os books gerados para o período com seus snapshots
  const { data: books, error } = await (supabase as any)
    .from('books')
    .select(`
      id,
      empresa_id,
      dados_volumetria,
      dados_sla,
      dados_backlog,
      dados_pesquisa,
      empresas_clientes (
        nome_completo,
        nome_abreviado
      )
    `)
    .eq('mes', mes)
    .eq('ano', ano)
    .in('status', ['gerado', 'enviado', 'desatualizado']);

  if (error) throw new Error(error.message);
  if (!books || books.length === 0) return [];

  const resultados: IndicadoresEmpresa[] = books.map((book: any) => {
    const volumetria = book.dados_volumetria || {};
    const sla = book.dados_sla || {};
    const backlog = book.dados_backlog || {};
    const pesquisa = book.dados_pesquisa || {};

    // Chamados abertos = solicitacao + incidente
    const abertos = (volumetria.abertos_mes?.solicitacao || 0) + (volumetria.abertos_mes?.incidente || 0);
    // Chamados fechados = solicitacao + incidente
    const fechados = (volumetria.fechados_mes?.solicitacao || 0) + (volumetria.fechados_mes?.incidente || 0);

    // SLA - usar valor do snapshot
    const slaPercentual = sla.sla_percentual !== undefined && sla.sla_percentual !== null
      ? sla.sla_percentual
      : null;

    // Violados - do snapshot do SLA
    const violados = sla.violados ?? 0;

    // Backlog - total do snapshot
    const backlogTotal = backlog.total ?? 0;

    // Pesquisas - do snapshot
    const pesquisasEnviadas = pesquisa.pesquisas_enviadas ?? 0;
    const pesquisasRespondidas = pesquisa.pesquisas_respondidas ?? 0;
    const pesquisasNaoRespondidas = pesquisa.pesquisas_nao_respondidas ?? 0;

    return {
      empresa_id: book.empresa_id,
      empresa: book.empresas_clientes?.nome_abreviado || book.empresas_clientes?.nome_completo || book.empresa_id,
      empresa_nome_completo: book.empresas_clientes?.nome_completo || '',
      chamados_abertos: abertos,
      chamados_fechados: fechados,
      sla_percentual: slaPercentual,
      sla_violados: violados,
      backlog: backlogTotal,
      pesquisas_enviadas: pesquisasEnviadas,
      pesquisas_respondidas: pesquisasRespondidas,
      pesquisas_nao_respondidas: pesquisasNaoRespondidas,
    };
  });

  // Ordenar alfabeticamente pelo nome da empresa
  return resultados.sort((a, b) =>
    a.empresa.localeCompare(b.empresa, 'pt-BR', { sensitivity: 'base' })
  );
}

/**
 * Calcula totais consolidados
 */
function calcularTotais(dados: IndicadoresEmpresa[]): IndicadoresTotais {
  const empresasComSLA = dados.filter(d => d.sla_percentual !== null);
  const slaMedio = empresasComSLA.length > 0
    ? Math.round(empresasComSLA.reduce((acc, d) => acc + (d.sla_percentual || 0), 0) / empresasComSLA.length)
    : null;

  return {
    total_abertos: dados.reduce((acc, d) => acc + d.chamados_abertos, 0),
    total_fechados: dados.reduce((acc, d) => acc + d.chamados_fechados, 0),
    sla_medio: slaMedio,
    total_violados: dados.reduce((acc, d) => acc + d.sla_violados, 0),
    total_backlog: dados.reduce((acc, d) => acc + d.backlog, 0),
    total_pesquisas_enviadas: dados.reduce((acc, d) => acc + d.pesquisas_enviadas, 0),
    total_pesquisas_respondidas: dados.reduce((acc, d) => acc + d.pesquisas_respondidas, 0),
    total_pesquisas_nao_respondidas: dados.reduce((acc, d) => acc + d.pesquisas_nao_respondidas, 0),
  };
}

// ─── Hook exportado ──────────────────────────────────────────────────────────

export function useRelatorioIndicadores(mes: number, ano: number) {
  const query = useQuery({
    queryKey: ['relatorio-indicadores-books', mes, ano],
    queryFn: () => fetchIndicadoresDosBooks(mes, ano),
    staleTime: 5 * 60 * 1000, // 5 min — dados do snapshot (já congelados)
    enabled: mes >= 1 && mes <= 12 && ano >= 2020,
  });

  const totais = query.data ? calcularTotais(query.data) : null;

  return {
    indicadores: query.data ?? [],
    totais,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
