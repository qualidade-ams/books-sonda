/**
 * Hook para gerenciar relacionamentos entre pesquisas/elogios e especialistas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Especialista } from '@/types/especialistas';

// ============================================
// QUERIES - PESQUISAS
// ============================================

/**
 * Hook para buscar especialistas de uma pesquisa
 */
export function useEspecialistasPesquisa(pesquisaId: string | undefined) {
  return useQuery({
    queryKey: ['especialistas-pesquisa', pesquisaId],
    queryFn: async (): Promise<Especialista[]> => {
      if (!pesquisaId) {
        console.log('🔍 [useEspecialistasPesquisa] Pesquisa ID não fornecido');
        return [];
      }

      console.log('🔍 [useEspecialistasPesquisa] === INÍCIO BUSCA ===');
      console.log('🔍 [useEspecialistasPesquisa] Buscando especialistas para pesquisa:', pesquisaId);

      const { data, error } = await supabase
        .from('pesquisa_especialistas')
        .select(`
          especialista_id,
          especialistas (*)
        `)
        .eq('pesquisa_id', pesquisaId);

      if (error) {
        console.error('❌ [useEspecialistasPesquisa] Erro ao buscar especialistas da pesquisa:', error);
        throw error;
      }

      console.log('📊 [useEspecialistasPesquisa] Dados brutos retornados do Supabase:', data);
      console.log('📊 [useEspecialistasPesquisa] Quantidade de registros:', data?.length);

      const especialistas = data?.map(item => item.especialistas).filter(Boolean) || [];
      
      console.log('✅ [useEspecialistasPesquisa] Especialistas após mapeamento:', especialistas);
      console.log('✅ [useEspecialistasPesquisa] Quantidade de especialistas:', especialistas.length);
      console.log('✅ [useEspecialistasPesquisa] IDs dos especialistas:', especialistas.map(e => e.id));
      
      // Verificar duplicação
      const ids = especialistas.map(e => e.id);
      const idsUnicos = [...new Set(ids)];
      if (ids.length !== idsUnicos.length) {
        console.warn('⚠️ [useEspecialistasPesquisa] DUPLICAÇÃO DETECTADA!');
        console.warn('⚠️ [useEspecialistasPesquisa] IDs originais:', ids);
        console.warn('⚠️ [useEspecialistasPesquisa] IDs únicos:', idsUnicos);
        console.warn('⚠️ [useEspecialistasPesquisa] Dados brutos que causaram duplicação:', data);
      }
      
      console.log('🔍 [useEspecialistasPesquisa] === FIM BUSCA ===');

      return especialistas;
    },
    enabled: !!pesquisaId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para salvar especialistas de uma pesquisa
 */
export function useSalvarEspecialistasPesquisa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pesquisaId, especialistasIds }: { 
      pesquisaId: string; 
      especialistasIds: string[] 
    }) => {
      // 1. Remover relacionamentos existentes
      const { error: deleteError } = await supabase
        .from('pesquisa_especialistas')
        .delete()
        .eq('pesquisa_id', pesquisaId);

      if (deleteError) {
        console.error('Erro ao remover relacionamentos existentes:', deleteError);
        throw deleteError;
      }

      // 2. Inserir novos relacionamentos
      if (especialistasIds.length > 0) {
        const relacionamentos = especialistasIds.map(especialistaId => ({
          pesquisa_id: pesquisaId,
          especialista_id: especialistaId
        }));

        const { error: insertError } = await supabase
          .from('pesquisa_especialistas')
          .insert(relacionamentos);

        if (insertError) {
          console.error('Erro ao inserir novos relacionamentos:', insertError);
          throw insertError;
        }
      }

      return { pesquisaId, especialistasIds };
    },
    onSuccess: ({ pesquisaId }) => {
      // Invalidar cache dos especialistas da pesquisa
      queryClient.invalidateQueries({ queryKey: ['especialistas-pesquisa', pesquisaId] });
    },
    onError: (error) => {
      console.error('Erro ao salvar especialistas da pesquisa:', error);
    }
  });
}

// ============================================
// QUERIES - ELOGIOS
// ============================================

/**
 * Hook para buscar especialistas de um elogio
 */
export function useEspecialistasElogio(elogioId: string | undefined) {
  return useQuery({
    queryKey: ['especialistas-elogio', elogioId],
    queryFn: async (): Promise<Especialista[]> => {
      if (!elogioId) {
        console.log('🔍 [useEspecialistasElogio] Elogio ID não fornecido');
        return [];
      }

      console.log('🔍 [useEspecialistasElogio] Buscando especialistas para elogio:', elogioId);

      const { data, error } = await supabase
        .from('elogio_especialistas')
        .select(`
          especialista_id,
          especialistas (*)
        `)
        .eq('elogio_id', elogioId);

      if (error) {
        console.error('❌ [useEspecialistasElogio] Erro ao buscar especialistas do elogio:', error);
        throw error;
      }

      const especialistas = data?.map(item => item.especialistas).filter(Boolean) || [];
      console.log('✅ [useEspecialistasElogio] Especialistas encontrados:', especialistas.length);
      console.log('📋 [useEspecialistasElogio] Dados:', especialistas);

      return especialistas;
    },
    enabled: !!elogioId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false
  });
}

/**
 * Hook para salvar especialistas de um elogio
 */
export function useSalvarEspecialistasElogio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ elogioId, especialistasIds }: { 
      elogioId: string; 
      especialistasIds: string[] 
    }) => {
      // 1. Remover relacionamentos existentes
      const { error: deleteError } = await supabase
        .from('elogio_especialistas')
        .delete()
        .eq('elogio_id', elogioId);

      if (deleteError) {
        console.error('Erro ao remover relacionamentos existentes:', deleteError);
        throw deleteError;
      }

      // 2. Inserir novos relacionamentos
      if (especialistasIds.length > 0) {
        const relacionamentos = especialistasIds.map(especialistaId => ({
          elogio_id: elogioId,
          especialista_id: especialistaId
        }));

        const { error: insertError } = await supabase
          .from('elogio_especialistas')
          .insert(relacionamentos);

        if (insertError) {
          console.error('Erro ao inserir novos relacionamentos:', insertError);
          throw insertError;
        }
      }

      return { elogioId, especialistasIds };
    },
    onSuccess: ({ elogioId }) => {
      // Invalidar cache dos especialistas do elogio
      queryClient.invalidateQueries({ queryKey: ['especialistas-elogio', elogioId] });
    },
    onError: (error) => {
      console.error('Erro ao salvar especialistas do elogio:', error);
    }
  });
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Hook para buscar IDs dos especialistas de uma pesquisa (para formulários)
 * Inclui correlação automática com o campo prestador se não houver relacionamentos salvos
 * 
 * RETORNA: { ids: string[], isLoading: boolean }
 */
export function useEspecialistasIdsPesquisa(pesquisaId: string | undefined, prestador?: string) {
  const { data: especialistas = [], isLoading } = useEspecialistasPesquisa(pesquisaId);
  
  console.log('🔍 [useEspecialistasIdsPesquisa] === INÍCIO ===');
  console.log('🔍 [useEspecialistasIdsPesquisa] Pesquisa ID:', pesquisaId);
  console.log('🔍 [useEspecialistasIdsPesquisa] Especialistas recebidos do hook:', especialistas);
  console.log('🔍 [useEspecialistasIdsPesquisa] Quantidade de especialistas:', especialistas.length);
  console.log('🔍 [useEspecialistasIdsPesquisa] isLoading:', isLoading);
  console.log('🔍 [useEspecialistasIdsPesquisa] Prestador:', prestador);
  
  // Se já tem especialistas relacionados, usar eles
  if (especialistas.length > 0) {
    const ids = especialistas.map(e => e.id);
    console.log('✅ [useEspecialistasIdsPesquisa] Retornando IDs dos especialistas relacionados:', ids);
    console.log('🔍 [useEspecialistasIdsPesquisa] Verificando duplicação:', {
      idsOriginais: ids,
      idsUnicos: [...new Set(ids)],
      temDuplicacao: ids.length !== new Set(ids).size
    });
    console.log('🔍 [useEspecialistasIdsPesquisa] === FIM (COM ESPECIALISTAS) ===');
    return { ids, isLoading };
  }
  
  // Se não tem relacionamentos mas tem prestador, tentar correlação automática
  if (prestador && prestador.trim()) {
    console.log('🔄 [useEspecialistasIdsPesquisa] Tentando correlação automática para prestador:', prestador);
    // Importar dinamicamente para evitar dependência circular
    import('./useCorrelacaoEspecialistas').then(({ useCorrelacaoMultiplosEspecialistas }) => {
      // Esta correlação será feita no componente que usa este hook
    });
  }
  
  console.log('❌ [useEspecialistasIdsPesquisa] Nenhum especialista encontrado, retornando array vazio');
  console.log('🔍 [useEspecialistasIdsPesquisa] === FIM (SEM ESPECIALISTAS) ===');
  return { ids: [], isLoading };
}

/**
 * Hook para buscar IDs dos especialistas de um elogio (para formulários)
 * Inclui correlação automática com o campo prestador se não houver relacionamentos salvos
 */
export function useEspecialistasIdsElogio(elogioId: string | undefined, prestador?: string) {
  const { data: especialistas = [] } = useEspecialistasElogio(elogioId);
  
  console.log('🔍 [useEspecialistasIdsElogio] === INÍCIO ===');
  console.log('🔍 [useEspecialistasIdsElogio] Elogio ID:', elogioId);
  console.log('🔍 [useEspecialistasIdsElogio] Especialistas recebidos do hook:', especialistas);
  console.log('🔍 [useEspecialistasIdsElogio] Quantidade de especialistas:', especialistas.length);
  console.log('🔍 [useEspecialistasIdsElogio] Prestador:', prestador);
  
  // Se já tem especialistas relacionados, usar eles
  if (especialistas.length > 0) {
    const ids = especialistas.map(e => e.id);
    console.log('✅ [useEspecialistasIdsElogio] Retornando IDs dos especialistas relacionados:', ids);
    console.log('🔍 [useEspecialistasIdsElogio] === FIM (COM ESPECIALISTAS) ===');
    return ids;
  }
  
  // Se não tem relacionamentos mas tem prestador, tentar correlação automática
  if (prestador && prestador.trim()) {
    console.log('🔄 [useEspecialistasIdsElogio] Tentando correlação automática para prestador:', prestador);
    // Esta correlação será feita no componente que usa este hook
  }
  
  console.log('❌ [useEspecialistasIdsElogio] Nenhum especialista encontrado, retornando array vazio');
  console.log('🔍 [useEspecialistasIdsElogio] === FIM (SEM ESPECIALISTAS) ===');
  return [];
}