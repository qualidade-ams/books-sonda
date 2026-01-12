/**
 * Hooks para elogios que incluem salvamento de especialistas
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSalvarEspecialistasElogio } from '@/hooks/useEspecialistasRelacionamentos';

/**
 * Hook para criar elogio com especialistas
 */
export function useCriarElogioComEspecialistas() {
  const queryClient = useQueryClient();
  const salvarEspecialistas = useSalvarEspecialistasElogio();

  return useMutation({
    mutationFn: async (dados: any) => {
      // Primeiro, criar o elogio usando o serviço existente
      const elogiosService = await import('@/services/elogiosService');
      const elogioCriado = await elogiosService.criarElogio(dados);
      
      // Depois, salvar especialistas se houver
      if (dados.especialistas_ids && dados.especialistas_ids.length > 0) {
        await salvarEspecialistas.mutateAsync({
          elogioId: elogioCriado.id,
          especialistasIds: dados.especialistas_ids
        });
      }
      
      return elogioCriado;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elogios'] });
      queryClient.invalidateQueries({ queryKey: ['elogios-estatisticas'] });
      toast.success('Elogio criado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar elogio:', error);
      toast.error(`Erro ao criar elogio: ${error.message}`);
    }
  });
}

/**
 * Hook para atualizar elogio com especialistas
 */
export function useAtualizarElogioComEspecialistas() {
  const queryClient = useQueryClient();
  const salvarEspecialistas = useSalvarEspecialistasElogio();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: any }) => {
      // Primeiro, atualizar o elogio usando o serviço existente
      const elogiosService = await import('@/services/elogiosService');
      const elogioAtualizado = await elogiosService.atualizarElogio(id, dados);
      
      // Depois, salvar especialistas se houver
      if (dados.especialistas_ids !== undefined) {
        await salvarEspecialistas.mutateAsync({
          elogioId: id,
          especialistasIds: dados.especialistas_ids
        });
      }
      
      return elogioAtualizado;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elogios'] });
      queryClient.invalidateQueries({ queryKey: ['elogio', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['elogios-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['especialistas-elogio', variables.id] });
      toast.success('Elogio atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar elogio:', error);
      toast.error(`Erro ao atualizar elogio: ${error.message}`);
    }
  });
}