import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { empresasService, totaisEmpresas } from '@/services/empresasService';
import type { SalvarInformacoesInput, SolucaoAmsInput } from '@/types/empresas';

/** Tela nova de Empresas; o legado (useEmpresas) usa a chave 'empresas' */
const CHAVE = ['empresas-cadastro'];

/** Lista da tela Empresas, com os totais dos cartões */
export function useEmpresasCadastro() {
  const query = useQuery({
    queryKey: [...CHAVE, 'lista'],
    queryFn: () => empresasService.listar(),
    staleTime: 5 * 60 * 1000,
  });
  const empresas = useMemo(() => query.data ?? [], [query.data]);

  return {
    empresas,
    totais: useMemo(() => totaisEmpresas(empresas), [empresas]),
    isLoading: query.isLoading,
    error: query.error as Error | null,
    recarregar: query.refetch,
  };
}

/** Detalhe de uma empresa e o que a transição permite editar nesta tela */
export function useEmpresaCadastro(empresaId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: [...CHAVE, 'detalhe', empresaId],
    queryFn: () => empresasService.carregar(empresaId!),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  // A gravação é feita em partes: com erro, parte pode ter sido gravada
  const recarregar = () => queryClient.invalidateQueries({ queryKey: CHAVE });
  const avisarErro = (titulo: string) => (err: Error) =>
    toast({ title: titulo, description: err.message, variant: 'destructive' });

  const salvarSolucoes = useMutation({
    mutationFn: (solucoes: SolucaoAmsInput[]) => empresasService.salvarSolucoes(solucoes),
    onSuccess: () => toast({ title: t('avisos.empresas.amsSalvos') }),
    onError: avisarErro(t('avisos.empresas.erroAms')),
    onSettled: recarregar,
  });

  const salvarInformacoes = useMutation({
    mutationFn: (input: SalvarInformacoesInput) =>
      empresasService.salvarInformacoes(empresaId!, input),
    onSuccess: () => toast({ title: t('avisos.empresas.informacoesSalvas') }),
    onError: avisarErro(t('avisos.empresas.erroInformacoes')),
    onSettled: recarregar,
  });

  return {
    empresa: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    salvarSolucoes: salvarSolucoes.mutateAsync,
    salvarInformacoes: salvarInformacoes.mutateAsync,
    isSalvando: salvarSolucoes.isPending || salvarInformacoes.isPending,
  };
}
