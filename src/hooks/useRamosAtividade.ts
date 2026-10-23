import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ramosAtividadeService } from '@/services/ramosAtividadeService';
import type { RamoAtividade, RamoRascunho } from '@/types/ramosAtividade';

const CHAVE = ['ramos-atividade'];
/** Sempre a mesma lista vazia: a tela sincroniza o rascunho com `ramos` num efeito */
const NENHUM: RamoAtividade[] = [];

/** Tela Ramos de Atividade: lista com o uso nas empresas, salva como rascunho */
export function useRamosAtividade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: CHAVE,
    queryFn: () => ramosAtividadeService.listar(),
    staleTime: 5 * 60 * 1000,
  });

  const salvar = useMutation({
    mutationFn: (rascunho: RamoRascunho[]) => ramosAtividadeService.salvar(rascunho),
    onSuccess: () => toast({ title: 'Ramos salvos' }),
    onError: (err: Error) =>
      toast({ title: 'Erro ao salvar os ramos', description: err.message, variant: 'destructive' }),
    // A gravação é feita linha a linha: com erro, parte pode ter sido gravada
    onSettled: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
  });

  return {
    ramos: query.data?.ramos ?? NENHUM,
    totalEmpresas: query.data?.totalEmpresas ?? 0,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: () => queryClient.invalidateQueries({ queryKey: CHAVE }),
    salvar: salvar.mutateAsync,
    isSalvando: salvar.isPending,
  };
}
