/**
 * Hooks para pesquisas que incluem salvamento de especialistas
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as pesquisasService from '@/services/pesquisasSatisfacaoService';
import { useSalvarEspecialistasPesquisa } from '@/hooks/useEspecialistasRelacionamentos';
import type { PesquisaFormData } from '@/types/pesquisasSatisfacao';

/**
 * Hook para criar pesquisa com especialistas
 */
export function useCriarPesquisaComEspecialistas() {
  const queryClient = useQueryClient();
  const salvarEspecialistas = useSalvarEspecialistasPesquisa();

  return useMutation({
    mutationFn: async (dados: PesquisaFormData) => {
      // 1. Criar a pesquisa
      const pesquisa = await pesquisasService.criarPesquisa(dados);
      
      // 2. Salvar especialistas se houver
      if (dados.especialistas_ids && dados.especialistas_ids.length > 0) {
        await salvarEspecialistas.mutateAsync({
          pesquisaId: pesquisa.id,
          especialistasIds: dados.especialistas_ids
        });
      }
      
      return pesquisa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      toast.success('Pesquisa criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar pesquisa:', error);
      toast.error(`Erro ao criar pesquisa: ${error.message}`);
    }
  });
}

/**
 * Hook para atualizar pesquisa com especialistas
 */
export function useAtualizarPesquisaComEspecialistas() {
  const queryClient = useQueryClient();
  const salvarEspecialistas = useSalvarEspecialistasPesquisa();

  return useMutation({
    mutationFn: async ({ id, dados }: { id: string; dados: Partial<PesquisaFormData> }) => {
      // 1. Atualizar a pesquisa
      const pesquisa = await pesquisasService.atualizarPesquisa(id, dados);
      
      // 2. Salvar especialistas se houver
      if (dados.especialistas_ids !== undefined) {
        await salvarEspecialistas.mutateAsync({
          pesquisaId: id,
          especialistasIds: dados.especialistas_ids
        });
      }
      
      return pesquisa;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisa', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['pesquisas-estatisticas'] });
      queryClient.invalidateQueries({ queryKey: ['especialistas-pesquisa', variables.id] });
      toast.success('Pesquisa atualizada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar pesquisa:', error);
      toast.error(`Erro ao atualizar pesquisa: ${error.message}`);
    }
  });
}