/**
 * Hook para recálculo completo de período (trimestre/semestre)
 * 
 * Recalcula TODOS os meses do período de uma vez e só exibe resultado
 * quando todos os cálculos estiverem prontos, evitando problemas de cache
 * e garantindo consistência total dos dados.
 * 
 * @module hooks/useRecalculoPeriodoCompleto
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bancoHorasService } from '@/services/bancoHorasService';
import { toast } from 'sonner';

interface MesPeriodo {
  mes: number;
  ano: number;
}

interface ResultadoRecalculo {
  mes: number;
  ano: number;
  sucesso: boolean;
  erro?: string;
}

/**
 * Hook para recalcular todos os meses do período de uma vez
 * 
 * @example
 * const { recalcularPeriodoCompleto, isRecalculating } = useRecalculoPeriodoCompleto();
 * 
 * await recalcularPeriodoCompleto({
 *   empresaId: 'uuid-empresa',
 *   mesesDoPeriodo: [
 *     { mes: 11, ano: 2025 },
 *     { mes: 12, ano: 2025 },
 *     { mes: 1, ano: 2026 }
 *   ]
 * });
 */
export function useRecalculoPeriodoCompleto() {
  const queryClient = useQueryClient();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  /**
   * Recalcula todos os meses do período sequencialmente
   */
  const recalcularPeriodoCompleto = async ({
    empresaId,
    mesesDoPeriodo,
  }: {
    empresaId: string;
    mesesDoPeriodo: MesPeriodo[];
  }): Promise<ResultadoRecalculo[]> => {
    if (!empresaId || !mesesDoPeriodo || mesesDoPeriodo.length === 0) {
      throw new Error('Empresa e meses do período são obrigatórios');
    }

    setIsRecalculating(true);
    setProgresso({ atual: 0, total: mesesDoPeriodo.length });

    const resultados: ResultadoRecalculo[] = [];

    try {
      console.log('🔄 [RecalculoPeriodo] Iniciando recálculo completo:', {
        empresaId,
        totalMeses: mesesDoPeriodo.length,
        meses: mesesDoPeriodo,
        timestamp: new Date().toISOString()
      });

      // Recalcular cada mês sequencialmente (importante para manter ordem de repasses)
      for (let i = 0; i < mesesDoPeriodo.length; i++) {
        const { mes, ano } = mesesDoPeriodo[i];
        
        try {
          console.log(`🔄 [RecalculoPeriodo] Recalculando mês ${i + 1}/${mesesDoPeriodo.length}:`, {
            mes,
            ano,
            timestamp: new Date().toISOString()
          });

          // Forçar recálculo do mês
          await bancoHorasService.calcularMes(empresaId, mes, ano);

          resultados.push({
            mes,
            ano,
            sucesso: true,
          });

          console.log(`✅ [RecalculoPeriodo] Mês ${i + 1}/${mesesDoPeriodo.length} recalculado:`, {
            mes,
            ano,
            timestamp: new Date().toISOString()
          });

          // Atualizar progresso
          setProgresso({ atual: i + 1, total: mesesDoPeriodo.length });

        } catch (error: any) {
          console.error(`❌ [RecalculoPeriodo] Erro ao recalcular mês ${mes}/${ano}:`, error);
          
          resultados.push({
            mes,
            ano,
            sucesso: false,
            erro: error.message || 'Erro desconhecido',
          });

          // Continuar recalculando os próximos meses mesmo se um falhar
        }
      }

      // ✅ CRÍTICO: Invalidar TODO o cache da empresa após recálculo completo
      console.log('🧹 [RecalculoPeriodo] Limpando cache completo da empresa...');
      
      await queryClient.invalidateQueries({
        queryKey: ['banco-horas-calculo', empresaId]
      });

      await queryClient.invalidateQueries({
        queryKey: ['banco-horas-calculos-segmentados', empresaId]
      });

      await queryClient.invalidateQueries({
        queryKey: ['banco-horas-versoes', empresaId]
      });

      await queryClient.invalidateQueries({
        queryKey: ['banco-horas-versoes-periodo', empresaId]
      });

      await queryClient.invalidateQueries({
        queryKey: ['banco-horas-reajustes', empresaId]
      });

      // Forçar refetch imediato de todos os cálculos
      console.log('🔄 [RecalculoPeriodo] Forçando refetch de todos os cálculos...');
      
      for (const { mes, ano } of mesesDoPeriodo) {
        await queryClient.refetchQueries({
          queryKey: ['banco-horas-calculo', empresaId, mes, ano]
        });
      }

      console.log('✅ [RecalculoPeriodo] Recálculo completo finalizado:', {
        totalMeses: mesesDoPeriodo.length,
        sucessos: resultados.filter(r => r.sucesso).length,
        falhas: resultados.filter(r => !r.sucesso).length,
        timestamp: new Date().toISOString()
      });

      // Exibir toast de sucesso apenas no final
      const sucessos = resultados.filter(r => r.sucesso).length;
      const falhas = resultados.filter(r => !r.sucesso).length;

      if (falhas === 0) {
        toast.success(`✅ Período recalculado com sucesso! ${sucessos} mês(es) atualizado(s).`);
      } else {
        toast.warning(`⚠️ Recálculo concluído com ${falhas} erro(s). ${sucessos} mês(es) atualizado(s).`);
      }

      return resultados;

    } catch (error: any) {
      console.error('❌ [RecalculoPeriodo] Erro crítico no recálculo:', error);
      toast.error(`Erro ao recalcular período: ${error.message}`);
      throw error;

    } finally {
      setIsRecalculating(false);
      setProgresso({ atual: 0, total: 0 });
    }
  };

  return {
    recalcularPeriodoCompleto,
    isRecalculating,
    progresso,
  };
}
