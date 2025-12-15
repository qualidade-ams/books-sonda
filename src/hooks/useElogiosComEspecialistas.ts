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
      // Primeiro, vamos simular a criação do elogio
      // TODO: Implementar o serviço real de criação de elogios
      const elogio = { id: 'temp-id', ...dados };
      
      // Salvar especialistas se houver
      if (dados.especialistas_ids && dados.especialistas_ids.length > 0) {
        await salvarEspecialistas.mutateAsync({
          elogioId: elogio.id,
          especialistasIds: dados.especialistas_ids
        });
      }
      
      return elogio;
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
      // TODO: Implementar o serviço real de atualização de elogios
      const elogio = { id, ...dados };
      
      // Salvar especialistas se houver
      if (dados.especialistas_ids !== undefined) {
        await salvarEspecialistas.mutateAsync({
          elogioId: id,
          especialistasIds: dados.especialistas_ids
        });
      }
      
      return elogio;
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