// =====================================================
// HOOKS: CONTATOS DO PLANO DE AÇÃO
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  buscarContatosPlanoAcao,
  buscarContatoPorId,
  criarContato,
  atualizarContato,
  deletarContato,
  obterEstatisticasContatos,
} from '@/services/planoAcaoContatosService';
import type { PlanoAcaoContatoFormData } from '@/types/planoAcaoContatos';

/**
 * Hook para buscar contatos de um plano de ação
 */
export function useContatosPlanoAcao(planoAcaoId: string) {
  return useQuery({
    queryKey: ['plano-acao-contatos', planoAcaoId],
    queryFn: () => buscarContatosPlanoAcao(planoAcaoId),
    enabled: !!planoAcaoId,
  });
}

/**
 * Hook para buscar contato por ID
 */
export function useContatoPorId(id: string) {
  return useQuery({
    queryKey: ['plano-acao-contato', id],
    queryFn: () => buscarContatoPorId(id),
    enabled: !!id,
  });
}

/**
 * Hook para criar novo contato
 */
export function useCriarContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planoAcaoId, dados }: { planoAcaoId: string; dados: PlanoAcaoContatoFormData }) =>
      criarContato(planoAcaoId, dados),
    onSuccess: (_, { planoAcaoId }) => {
      // Invalidar cache dos contatos do plano
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contatos', planoAcaoId] });
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contatos-stats', planoAcaoId] });
      toast.success('Contato registrado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar contato:', error);
      toast.error('Erro ao registrar contato');
    },
  });
}

/**
 * Hook para atualizar contato
 */
export function useAtualizarContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<PlanoAcaoContatoFormData> }) =>
      atualizarContato(id, dados),
    onSuccess: (contato) => {
      // Invalidar cache dos contatos do plano
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contatos', contato.plano_acao_id] });
      // Invalidar cache do contato específico
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contato', contato.id] });
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contatos-stats', contato.plano_acao_id] });
      toast.success('Contato atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar contato:', error);
      toast.error('Erro ao atualizar contato');
    },
  });
}

/**
 * Hook para deletar contato
 */
export function useDeletarContato() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, planoAcaoId }: { id: string; planoAcaoId: string }) => {
      return deletarContato(id).then(() => planoAcaoId);
    },
    onSuccess: (planoAcaoId) => {
      // Invalidar cache dos contatos do plano
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contatos', planoAcaoId] });
      // Invalidar cache das estatísticas
      queryClient.invalidateQueries({ queryKey: ['plano-acao-contatos-stats', planoAcaoId] });
      toast.success('Contato removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao deletar contato:', error);
      toast.error('Erro ao remover contato');
    },
  });
}

/**
 * Hook para obter estatísticas de contatos
 */
export function useEstatisticasContatos(planoAcaoId: string) {
  return useQuery({
    queryKey: ['plano-acao-contatos-stats', planoAcaoId],
    queryFn: () => obterEstatisticasContatos(planoAcaoId),
    enabled: !!planoAcaoId,
  });
}