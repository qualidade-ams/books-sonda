import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { menuOrganizadoService } from '@/services/menuOrganizadoService';
import type { AparenciaMenu, NoMenu, TemaMenu } from '@/types/menuOrganizado';

const CHAVE = ['menu-organizado'];
/** Todo usuário monta o menu com isto; muda pouco */
const DEZ_MINUTOS = 10 * 60 * 1000;
/** O endereço assinado do logo vale uma hora; renova antes */
const CINQUENTA_MINUTOS = 50 * 60 * 1000;

/** Ordem e aparência salvas do menu lateral (tela Organizar Menu e Sidebar) */
export function useMenuOrganizado() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: CHAVE,
    queryFn: () => menuOrganizadoService.carregar(),
    staleTime: DEZ_MINUTOS,
  });

  const salvar = useMutation({
    mutationFn: (input: {
      arvore: NoMenu[] | null;
      aparenciaAtual: Record<TemaMenu, AparenciaMenu>;
      aparenciaNova: Record<TemaMenu, AparenciaMenu>;
    }) => menuOrganizadoService.salvar(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHAVE });
      toast({ title: 'Menu salvo' });
    },
    onError: (err: Error) =>
      toast({ title: 'Erro ao salvar o menu', description: err.message, variant: 'destructive' }),
  });

  const enviarLogo = useMutation({
    mutationFn: ({
      tema,
      tipo,
      arquivo,
    }: {
      tema: TemaMenu;
      tipo: 'aberto' | 'recolhido';
      arquivo: File;
    }) => menuOrganizadoService.enviarLogo(tema, tipo, arquivo),
    onError: (err: Error) =>
      toast({ title: 'Erro ao enviar o logo', description: err.message, variant: 'destructive' }),
  });

  return {
    menu: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    salvar: salvar.mutateAsync,
    enviarLogo: enviarLogo.mutateAsync,
    isSalvando: salvar.isPending || enviarLogo.isPending,
  };
}

/** Endereço temporário do logo próprio; sem logo, nulo (vale o da Sonda) */
export function useLogoMenu(caminho: string | null): string | null {
  const query = useQuery({
    queryKey: [...CHAVE, 'logo', caminho],
    queryFn: () => menuOrganizadoService.urlDoLogo(caminho!),
    enabled: !!caminho,
    staleTime: CINQUENTA_MINUTOS,
  });
  return caminho ? (query.data ?? null) : null;
}
