import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { textoDoErro } from '@/errors/erroTraduzivel';
import { deParaService } from '@/services/deParaService';
import type { DestinoGrupo, MapeamentoInput } from '@/types/dePara';
import { plural } from '@/utils/plural';

const CHAVE = ['grupos-aranda'];
/** Mapear resolve o aviso "Grupo do Aranda sem mapeamento" no sino (gatilho no banco) */
const CHAVE_SINO = ['notificacoes'];

/** Tela De-para de Grupos: mapeamentos, uso nos últimos meses e grupos não mapeados */
export function useDePara() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const mapeamentosQuery = useQuery({
    queryKey: CHAVE,
    queryFn: () => deParaService.listar(),
    staleTime: 5 * 60 * 1000,
  });

  const usoQuery = useQuery({
    queryKey: [...CHAVE, 'uso'],
    queryFn: () => deParaService.uso(),
    staleTime: 5 * 60 * 1000,
  });

  const naoMapeadosQuery = useQuery({
    queryKey: [...CHAVE, 'nao-mapeados'],
    queryFn: () => deParaService.naoMapeados(),
    staleTime: 5 * 60 * 1000,
  });

  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: CHAVE });
    queryClient.invalidateQueries({ queryKey: CHAVE_SINO });
  };
  const avisarErro = (titulo: string) => (err: Error) =>
    toast({ title: titulo, description: textoDoErro(err, t), variant: 'destructive' });

  const salvar = useMutation({
    mutationFn: (input: MapeamentoInput) => deParaService.salvar(input),
    onSuccess: () => {
      recarregar();
      toast({ title: t('avisos.dePara.salvo') });
    },
    onError: avisarErro(t('avisos.dePara.erroSalvar')),
  });

  const atribuirDestino = useMutation({
    mutationFn: ({ ids, destino }: { ids: string[]; destino: DestinoGrupo }) =>
      deParaService.atribuirDestino(ids, destino),
    onSuccess: (_r, { ids }) => {
      recarregar();
      toast({ title: plural(t, 'avisos.dePara.destinoAtribuido', ids.length) });
    },
    onError: avisarErro(t('avisos.dePara.erroAtribuir')),
  });

  const importar = useMutation({
    mutationFn: (inputs: MapeamentoInput[]) => deParaService.importar(inputs),
    onSuccess: (_r, inputs) =>
      toast({ title: plural(t, 'avisos.dePara.importados', inputs.length) }),
    onError: avisarErro(t('avisos.dePara.erroImportar')),
    // No erro, parte pode ter sido gravada
    onSettled: recarregar,
  });

  const excluir = useMutation({
    mutationFn: (id: string) => deParaService.excluir(id),
    onSuccess: () => {
      recarregar();
      toast({
        title: t('avisos.dePara.excluido'),
        description: t('avisos.dePara.excluidoDescricao'),
      });
    },
    onError: avisarErro(t('avisos.dePara.erroExcluir')),
  });

  return {
    importar: importar.mutateAsync,
    mapeamentos: mapeamentosQuery.data ?? [],
    uso: usoQuery.data ?? {},
    naoMapeados: naoMapeadosQuery.data ?? [],
    isLoading: mapeamentosQuery.isLoading || usoQuery.isLoading || naoMapeadosQuery.isLoading,
    error: (mapeamentosQuery.error || usoQuery.error || naoMapeadosQuery.error) as Error | null,
    salvar: salvar.mutateAsync,
    recarregar,
    atribuirDestino: atribuirDestino.mutateAsync,
    excluir: excluir.mutateAsync,
    isSalvando: salvar.isPending || atribuirDestino.isPending || excluir.isPending,
  };
}
