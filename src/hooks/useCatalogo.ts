import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { textoDoErro } from '@/errors/erroTraduzivel';
import { catalogoService } from '@/services/catalogoService';
import type {
  LinhaImportacaoCatalogo,
  ModuloInput,
  ProdutoInput,
  SolucaoInput,
} from '@/types/catalogo';
import { plural } from '@/utils/plural';

const CHAVE = ['catalogo'];
/** Os grupos do Aranda acompanham o módulo movido (ON UPDATE CASCADE) */
const CHAVE_GRUPOS = ['grupos-aranda'];

/** Tela Produtos e Módulos: Solução › Produto › Módulo e os bancos que usam cada item */
export function useCatalogo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

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
    toast({ title: titulo, description: textoDoErro(err, t), variant: 'destructive' });

  const salvarSolucao = useMutation({
    mutationFn: (input: SolucaoInput) => catalogoService.salvarSolucao(input),
    onSuccess: () => {
      recarregar();
      toast({ title: t('avisos.catalogo.solucaoSalva') });
    },
    onError: avisarErro(t('avisos.catalogo.erroSalvarSolucao')),
  });

  const salvarProduto = useMutation({
    mutationFn: (input: ProdutoInput) => catalogoService.salvarProduto(input),
    onSuccess: () => {
      recarregar();
      toast({ title: t('avisos.catalogo.produtoSalvo') });
    },
    onError: avisarErro(t('avisos.catalogo.erroSalvarProduto')),
  });

  const reordenarProdutos = useMutation({
    mutationFn: (produtoIds: string[]) => catalogoService.reordenarProdutos(produtoIds),
    onSuccess: recarregar,
    onError: avisarErro(t('avisos.catalogo.erroReordenarProdutos')),
  });

  const salvarModulo = useMutation({
    mutationFn: (input: ModuloInput) => catalogoService.salvarModulo(input),
    onSuccess: () => {
      recarregar();
      toast({ title: t('avisos.catalogo.moduloSalvo') });
    },
    onError: avisarErro(t('avisos.catalogo.erroSalvarModulo')),
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
              title: t('avisos.catalogo.moduloMovido'),
              description: t('avisos.catalogo.aClassificarInativado'),
            }
          : { title: t('avisos.catalogo.moduloMovido') }
      );
    },
    onError: avisarErro(t('avisos.catalogo.erroMoverModulo')),
  });

  const importar = useMutation({
    mutationFn: (linhas: LinhaImportacaoCatalogo[]) => catalogoService.importar(linhas),
    onSuccess: (_r, linhas) =>
      toast({ title: plural(t, 'avisos.catalogo.importados', linhas.length) }),
    onError: avisarErro(t('avisos.catalogo.erroImportar')),
    // No erro, parte pode ter sido gravada
    onSettled: recarregar,
  });

  return {
    importar: importar.mutateAsync,
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
  const { t } = useTranslation();
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
      toast({ title: t('avisos.catalogo.correspondenciaSalva') });
    },
    onError: (err: Error) =>
      toast({
        title: t('avisos.catalogo.erroCorrespondencia'),
        description: textoDoErro(err, t),
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
