import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { requerimentoAnexosService, RequerimentoAnexo } from '@/services/requerimentoAnexosService';
import { useToast } from '@/hooks/use-toast';

interface AnexoPendente {
  id: string;
  arquivo: File;
  descricao?: string;
  status: 'pendente' | 'uploading' | 'concluido' | 'erro';
  erro?: string;
}

interface UseRequerimentoAnexosReturn {
  // Anexos salvos no banco
  anexosSalvos: RequerimentoAnexo[];
  isLoadingAnexos: boolean;

  // Anexos pendentes (aguardando upload)
  anexosPendentes: AnexoPendente[];

  // Ações
  adicionarArquivos: (files: FileList | File[]) => void;
  removerAnexoPendente: (id: string) => void;
  excluirAnexoSalvo: (anexoId: string) => Promise<void>;
  uploadTodosPendentes: (requerimentoId: string) => Promise<{ sucesso: number; erros: number }>;
  downloadAnexo: (anexo: RequerimentoAnexo) => Promise<void>;
  limparPendentes: () => void;

  // Estado
  totalAnexos: number;
  podeAdicionarMais: boolean;
  isUploading: boolean;
  isExcluindo: boolean;
}

/**
 * Hook para gerenciamento de anexos no formulário de requerimento.
 * Gerencia tanto anexos já salvos quanto pendentes de upload.
 */
export function useRequerimentoAnexos(requerimentoId?: string): UseRequerimentoAnexosReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [anexosPendentes, setAnexosPendentes] = useState<AnexoPendente[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExcluindo, setIsExcluindo] = useState(false);

  const maxAnexos = requerimentoAnexosService.getMaxAnexos();

  // Query para buscar anexos salvos
  const {
    data: anexosSalvos = [],
    isLoading: isQueryLoading,
  } = useQuery({
    queryKey: ['requerimento-anexos', requerimentoId],
    queryFn: () => requerimentoAnexosService.listarAnexos(requerimentoId!),
    enabled: !!requerimentoId,
    staleTime: 5 * 60 * 1000,
  });

  // Só está carregando se realmente temos um ID para buscar
  const isLoadingAnexos = !!requerimentoId && isQueryLoading;

  const totalAnexos = anexosSalvos.length + anexosPendentes.length;
  const podeAdicionarMais = totalAnexos < maxAnexos;

  /**
   * Adicionar arquivos à fila de upload (pendentes)
   */
  const adicionarArquivos = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const espacoDisponivel = maxAnexos - totalAnexos;

    if (fileArray.length > espacoDisponivel) {
      toast({
        title: 'Limite de anexos',
        description: `Você pode adicionar no máximo ${espacoDisponivel} arquivo(s). Limite total: ${maxAnexos}.`,
        variant: 'destructive',
      });
      return;
    }

    const novosAnexos: AnexoPendente[] = [];
    const errosValidacao: string[] = [];

    for (const arquivo of fileArray) {
      const validacao = requerimentoAnexosService.validarArquivo(arquivo);
      if (!validacao.valido) {
        errosValidacao.push(validacao.erro!);
        continue;
      }

      novosAnexos.push({
        id: `pendente_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        arquivo,
        status: 'pendente',
      });
    }

    if (errosValidacao.length > 0) {
      toast({
        title: 'Erro de validação',
        description: errosValidacao.join('\n'),
        variant: 'destructive',
      });
    }

    if (novosAnexos.length > 0) {
      setAnexosPendentes(prev => [...prev, ...novosAnexos]);
    }
  }, [totalAnexos, maxAnexos, toast]);

  /**
   * Remover um anexo pendente (antes do upload)
   */
  const removerAnexoPendente = useCallback((id: string) => {
    setAnexosPendentes(prev => prev.filter(a => a.id !== id));
  }, []);

  /**
   * Excluir um anexo já salvo no banco
   */
  const excluirAnexoSalvo = useCallback(async (anexoId: string) => {
    setIsExcluindo(true);
    try {
      await requerimentoAnexosService.excluirAnexo(anexoId);
      queryClient.invalidateQueries({ queryKey: ['requerimento-anexos', requerimentoId] });
      toast({
        title: 'Anexo excluído',
        description: 'O anexo foi removido com sucesso.',
      });
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : 'Erro ao excluir anexo';
      toast({
        title: 'Erro',
        description: mensagem,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsExcluindo(false);
    }
  }, [requerimentoId, queryClient, toast]);

  /**
   * Fazer upload de todos os anexos pendentes
   */
  const uploadTodosPendentes = useCallback(async (targetRequerimentoId: string): Promise<{ sucesso: number; erros: number }> => {
    if (anexosPendentes.length === 0) {
      return { sucesso: 0, erros: 0 };
    }

    setIsUploading(true);
    let sucessoCount = 0;
    let errosCount = 0;

    try {
      for (let i = 0; i < anexosPendentes.length; i++) {
        const pendente = anexosPendentes[i];

        setAnexosPendentes(prev =>
          prev.map(a => a.id === pendente.id ? { ...a, status: 'uploading' as const } : a)
        );

        try {
          await requerimentoAnexosService.uploadAnexo({
            requerimentoId: targetRequerimentoId,
            arquivo: pendente.arquivo,
            descricao: pendente.descricao,
            ordem: i,
          });

          setAnexosPendentes(prev =>
            prev.map(a => a.id === pendente.id ? { ...a, status: 'concluido' as const } : a)
          );
          sucessoCount++;
        } catch (error) {
          const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
          setAnexosPendentes(prev =>
            prev.map(a => a.id === pendente.id ? { ...a, status: 'erro' as const, erro: mensagemErro } : a)
          );
          errosCount++;
        }
      }

      // Limpar pendentes concluídos
      setAnexosPendentes(prev => prev.filter(a => a.status === 'erro'));

      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['requerimento-anexos', targetRequerimentoId] });

      if (sucessoCount > 0) {
        toast({
          title: 'Upload concluído',
          description: `${sucessoCount} arquivo(s) enviado(s) com sucesso.${errosCount > 0 ? ` ${errosCount} erro(s).` : ''}`,
        });
      }
    } finally {
      setIsUploading(false);
    }

    return { sucesso: sucessoCount, erros: errosCount };
  }, [anexosPendentes, queryClient, toast]);

  /**
   * Download de um anexo
   */
  const downloadAnexo = useCallback(async (anexo: RequerimentoAnexo) => {
    try {
      const url = await requerimentoAnexosService.obterUrlDownload(anexo.storage_path);
      const link = document.createElement('a');
      link.href = url;
      link.download = anexo.nome_original;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível gerar o link de download.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Limpar todos os anexos pendentes
   */
  const limparPendentes = useCallback(() => {
    setAnexosPendentes([]);
  }, []);

  return {
    anexosSalvos,
    isLoadingAnexos,
    anexosPendentes,
    adicionarArquivos,
    removerAnexoPendente,
    excluirAnexoSalvo,
    uploadTodosPendentes,
    downloadAnexo,
    limparPendentes,
    totalAnexos,
    podeAdicionarMais,
    isUploading,
    isExcluindo,
  };
}
