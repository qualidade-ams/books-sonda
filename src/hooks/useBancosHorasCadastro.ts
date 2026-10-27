import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { textoDoErro } from '@/errors/erroTraduzivel';
import { bancosHorasCadastroService } from '@/services/bancosHorasCadastroService';
import type {
  NovaVigenciaInput,
  NovoBancoInput,
  ParametrosBanco,
} from '@/types/bancosHorasCadastro';

const CHAVE = 'bancos-horas-cadastro';
/** Modelo e pendências da empresa dependem dos bancos */
const CHAVE_EMPRESAS = ['empresas-cadastro'];

/** Aba Bancos de Horas da tela Empresas */
export function useBancosHorasCadastro(empresaId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const chave = [CHAVE, empresaId];

  const query = useQuery({
    queryKey: chave,
    queryFn: () => bancosHorasCadastroService.listar(empresaId!),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  // Algumas gravações são feitas em partes: com erro, parte pode ter sido gravada
  const recarregar = () => {
    queryClient.invalidateQueries({ queryKey: chave });
    queryClient.invalidateQueries({ queryKey: CHAVE_EMPRESAS });
  };
  const avisarErro = (titulo: string) => (err: Error) =>
    toast({ title: titulo, description: textoDoErro(err, t), variant: 'destructive' });

  const criar = useMutation({
    mutationFn: (input: NovoBancoInput) => bancosHorasCadastroService.criar(input),
    onSuccess: () => toast({ title: t('avisos.bancos.criado') }),
    onError: avisarErro(t('avisos.bancos.erroCriar')),
    onSettled: recarregar,
  });

  const salvar = useMutation({
    mutationFn: ({ bancoId, parametros }: { bancoId: string; parametros: ParametrosBanco }) =>
      bancosHorasCadastroService.salvar({ id: bancoId, empresaId: empresaId! }, parametros),
    onSuccess: () => toast({ title: t('avisos.bancos.salvo') }),
    onError: avisarErro(t('avisos.bancos.erroSalvar')),
    onSettled: recarregar,
  });

  const reordenar = useMutation({
    mutationFn: (bancoIds: string[]) => bancosHorasCadastroService.reordenar(bancoIds),
    onError: avisarErro(t('avisos.bancos.erroReordenar')),
    onSettled: recarregar,
  });

  const inativar = useMutation({
    mutationFn: ({ bancoId, motivo }: { bancoId: string; motivo: string }) =>
      bancosHorasCadastroService.inativar(bancoId, motivo),
    onSuccess: () =>
      toast({
        title: t('avisos.bancos.inativado'),
        description: t('avisos.bancos.inativadoDescricao'),
      }),
    onError: avisarErro(t('avisos.bancos.erroInativar')),
    onSettled: recarregar,
  });

  const reativar = useMutation({
    mutationFn: (bancoId: string) => bancosHorasCadastroService.reativar(bancoId),
    onSuccess: () => toast({ title: t('avisos.bancos.reativado') }),
    onError: avisarErro(t('avisos.bancos.erroReativar')),
    onSettled: recarregar,
  });

  const novaVigencia = useMutation({
    mutationFn: (input: NovaVigenciaInput) => bancosHorasCadastroService.novaVigencia(input),
    onSuccess: () => toast({ title: t('avisos.bancos.vigenciaRegistrada') }),
    onError: avisarErro(t('avisos.bancos.erroVigencia')),
    onSettled: recarregar,
  });

  return {
    bancos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar,
    criar: criar.mutateAsync,
    salvar: salvar.mutateAsync,
    reordenar: reordenar.mutateAsync,
    inativar: inativar.mutateAsync,
    reativar: reativar.mutateAsync,
    novaVigencia: novaVigencia.mutateAsync,
    isSalvando:
      criar.isPending ||
      salvar.isPending ||
      reordenar.isPending ||
      inativar.isPending ||
      reativar.isPending ||
      novaVigencia.isPending,
  };
}
