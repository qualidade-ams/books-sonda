import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { catalogoService } from '@/services/catalogoService';
import type { ModuloInput, ProdutoInput, SolucaoInput } from '@/types/catalogo';

const CHAVE = ['catalogo'];
/** Os grupos do Aranda acompanham o módulo movido (ON UPDATE CASCADE) */
const CHAVE_GRUPOS = ['grupos-aranda'];

/** Tela Produtos e Módulos: Solução › Produto › Módulo e os bancos que usam cada item */
export function useCatalogo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const catalogoQuery = useQuery({
    queryKey: CHAVE,
    queryFn: () => catalogoService.carregar(),
    staleTime: 5 * 60 * 1000,
  });

  const usosQuery = useQuery({
    queryKey: [...CHAVE, 'usos'],
    queryFn: () => catalogoService.usosEmBancos(),
    staleTime: 5 * 60 * 1000,
  });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: CHAVE });
  const avisarErro = (titulo: string) => (err: Error) =>
    toast({ title: titulo, description: err.message, variant: 'destructive' });

  const salvarSolucao = useMutation({
    mutationFn: (input: SolucaoInput) => catalogoService.salvarSolucao(input),
    onSuccess: () => {
      recarregar();
      toast({ title: 'Solução salva' });
    },
    onError: avisarErro('Erro ao salvar a solução'),
  });

  const salvarProduto = useMutation({
    mutationFn: (input: ProdutoInput) => catalogoService.salvarProduto(input),
    onSuccess: () => {
      recarregar();
      toast({ title: 'Produto salvo' });
    },
    onError: avisarErro('Erro ao salvar o produto'),
  });

  const reordenarProdutos = useMutation({
    mutationFn: (produtoIds: string[]) => catalogoService.reordenarProdutos(produtoIds),
    onSuccess: recarregar,
    onError: avisarErro('Erro ao reordenar os produtos'),
  });

  const salvarModulo = useMutation({
    mutationFn: (input: ModuloInput) => catalogoService.salvarModulo(input),
    onSuccess: () => {
      recarregar();
      toast({ title: 'Módulo salvo' });
    },
    onError: avisarErro('Erro ao salvar o módulo'),
  });

  const moverModulo = useMutation({
    mutationFn: ({ moduloId, produtoId }: { moduloId: string; produtoId: string }) =>
      catalogoService.moverModulo(moduloId, produtoId),
    onSuccess: ({ provisorioInativado }) => {
      recarregar();
      queryClient.invalidateQueries({ queryKey: CHAVE_GRUPOS });
      toast(
        provisorioInativado
          ? {
              title: 'Módulo movido',
              description: 'O produto "A classificar" ficou vazio e foi inativado.',
            }
          : { title: 'Módulo movido' }
      );
    },
    onError: avisarErro('Erro ao mover o módulo'),
  });

  return {
    solucoes: catalogoQuery.data?.solucoes ?? [],
    produtos: catalogoQuery.data?.produtos ?? [],
    modulos: catalogoQuery.data?.modulos ?? [],
    usos: usosQuery.data ?? [],
    isLoading: catalogoQuery.isLoading || usosQuery.isLoading,
    error: (catalogoQuery.error || usosQuery.error) as Error | null,
    recarregar,
    salvarSolucao: salvarSolucao.mutateAsync,
    salvarProduto: salvarProduto.mutateAsync,
    reordenarProdutos: reordenarProdutos.mutateAsync,
    salvarModulo: salvarModulo.mutateAsync,
    moverModulo: moverModulo.mutateAsync,
    isSalvando:
      salvarSolucao.isPending ||
      salvarProduto.isPending ||
      salvarModulo.isPending ||
      moverModulo.isPending,
  };
}

/** Aba "Módulos de requerimento": para onde aponta cada valor de requerimentos.modulo */
export function useModulosRequerimento() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const chave = [...CHAVE, 'modulos-requerimento'];

  const query = useQuery({
    queryKey: chave,
    queryFn: () => catalogoService.modulosRequerimento(),
    staleTime: 5 * 60 * 1000,
  });

  const salvar = useMutation({
    mutationFn: ({
      id,
      produtoId,
      moduloId,
    }: {
      id: string;
      produtoId: string;
      moduloId: string | null;
    }) => catalogoService.salvarModuloRequerimento(id, produtoId, moduloId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chave });
      toast({ title: 'Correspondência salva' });
    },
    onError: (err: Error) =>
      toast({
        title: 'Erro ao salvar a correspondência',
        description: err.message,
        variant: 'destructive',
      }),
  });

  return {
    modulosRequerimento: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    salvar: salvar.mutateAsync,
    isSalvando: salvar.isPending,
  };
}
