/**
 * Hook para verificar se uma empresa tem baseline segmentado
 * e retornar a configuração de segmentação.
 * Usado pelo BookViewer e BookPrintView para decidir se renderiza
 * abas/páginas de Consumo Segmentado.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SegmentacaoEmpresa {
  nome: string;
  percentual: number;
  filtro_tipo: string;
  filtro_valor: string;
  ordem?: number;
}

interface SegmentacaoConfig {
  empresas: SegmentacaoEmpresa[];
}

interface EmpresaSegmentacaoResult {
  baselineSegmentado: boolean;
  segmentacaoConfig: SegmentacaoConfig | null;
  quantidadeSegmentos: number;
  /** Indices agrupados em páginas de até 2 segmentos cada */
  paginasSegmentos: number[][];
  isLoading: boolean;
}

export function useEmpresaSegmentacao(empresaId: string | null): EmpresaSegmentacaoResult {
  const { data, isLoading } = useQuery({
    queryKey: ['empresa-segmentacao', empresaId],
    queryFn: async () => {
      if (!empresaId) return null;
      const { data: empresa } = await supabase
        .from('empresas_clientes')
        .select('baseline_segmentado, segmentacao_config')
        .eq('id', empresaId)
        .single();
      return empresa;
    },
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  const baselineSegmentado = data?.baseline_segmentado || false;
  const segmentacaoConfig = baselineSegmentado
    ? (data?.segmentacao_config as any as SegmentacaoConfig) || null
    : null;
  const quantidadeSegmentos = segmentacaoConfig?.empresas?.length || 0;

  // Agrupar segmentos em páginas de até 2
  const paginasSegmentos: number[][] = [];
  if (quantidadeSegmentos > 0) {
    for (let i = 0; i < quantidadeSegmentos; i += 2) {
      const pagina: number[] = [i];
      if (i + 1 < quantidadeSegmentos) pagina.push(i + 1);
      paginasSegmentos.push(pagina);
    }
  }

  return {
    baselineSegmentado,
    segmentacaoConfig,
    quantidadeSegmentos,
    paginasSegmentos,
    isLoading,
  };
}
