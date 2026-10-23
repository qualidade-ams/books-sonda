import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
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
    toast({ title: titulo, description: err.message, variant: 'destructive' });

  const criar = useMutation({
    mutationFn: (input: NovoBancoInput) => bancosHorasCadastroService.criar(input),
    onSuccess: () => toast({ title: 'Banco criado' }),
    onError: avisarErro('Erro ao criar o banco'),
    onSettled: recarregar,
  });

  const salvar = useMutation({
    mutationFn: ({ bancoId, parametros }: { bancoId: string; parametros: ParametrosBanco }) =>
      bancosHorasCadastroService.salvar({ id: bancoId, empresaId: empresaId! }, parametros),
    onSuccess: () => toast({ title: 'Banco salvo' }),
    onError: avisarErro('Erro ao salvar o banco'),
    onSettled: recarregar,
  });

  const reordenar = useMutation({
    mutationFn: (bancoIds: string[]) => bancosHorasCadastroService.reordenar(bancoIds),
    onError: avisarErro('Erro ao reordenar os bancos'),
    onSettled: recarregar,
  });

  const inativar = useMutation({
    mutationFn: ({ bancoId, motivo }: { bancoId: string; motivo: string }) =>
      bancosHorasCadastroService.inativar(bancoId, motivo),
    onSuccess: () =>
      toast({
        title: 'Banco inativado',
        description: 'A partir do próximo mês aberto, as horas dele vão para o Banco padrão.',
      }),
    onError: avisarErro('Erro ao inativar o banco'),
    onSettled: recarregar,
  });

  const reativar = useMutation({
    mutationFn: (bancoId: string) => bancosHorasCadastroService.reativar(bancoId),
    onSuccess: () => toast({ title: 'Banco reativado' }),
    onError: avisarErro('Erro ao reativar o banco'),
    onSettled: recarregar,
  });

  const novaVigencia = useMutation({
    mutationFn: (input: NovaVigenciaInput) => bancosHorasCadastroService.novaVigencia(input),
    onSuccess: () => toast({ title: 'Vigência registrada' }),
    onError: avisarErro('Erro ao registrar a vigência'),
    onSettled: recarregar,
  });

  return {
    bancos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
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
