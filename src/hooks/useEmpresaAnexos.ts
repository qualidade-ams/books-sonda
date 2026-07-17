import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { empresaAnexosService, EmpresaAnexo } from '@/services/empresaAnexosService';
import { useToast } from '@/hooks/use-toast';

interface AnexoPendente {
  id: string; // ID temporário para controle local
  arquivo: File;
  descricao?: string;
  status: 'pendente' | 'uploading' | 'concluido' | 'erro';
  erro?: string;
  progresso?: number;
}

interface UseEmpresaAnexosReturn {
  // Anexos salvos no banco
  anexosSalvos: EmpresaAnexo[];
  isLoadingAnexos: boolean;
  
  // Anexos pendentes (aguardando upload)
  anexosPendentes: AnexoPendente[];
  
  // Ações
  adicionarArquivos: (files: FileList | File[]) => void;
  removerAnexoPendente: (id: string) => void;
  excluirAnexoSalvo: (anexoId: string) => Promise<void>;
  uploadTodosPendentes: (empresaId: string) => Promise<{ sucesso: number; erros: number }>;
  downloadAnexo: (anexo: EmpresaAnexo) => Promise<void>;
  limparPendentes: () => void;
  
  // Estado
  totalAnexos: number;
  podeAdicionarMais: boolean;
  isUploading: boolean;
  isExcluindo: boolean;
}

/**
 * Hook para gerenciamento de anexos no formulário de empresa.
 * Gerencia tanto anexos já salvos quanto pendentes de upload.
 */
export function useEmpresaAnexos(empresaId?: string): UseEmpresaAnexosReturn {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [anexosPendentes, setAnexosPendentes] = useState<AnexoPendente[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isExcluindo, setIsExcluindo] = useState(false);

  const maxAnexos = empresaAnexosService.getMaxAnexos();

  // Query para buscar anexos salvos
  const {
    data: anexosSalvos = [],
    isLoading: isQueryLoading,
  } = useQuery({
    queryKey: ['empresa-anexos', empresaId],
    queryFn: () => empresaAnexosService.listarAnexos(empresaId!),
    enabled: !!empresaId,
    staleTime: 5 * 60 * 1000,
  });

  // Só está carregando se realmente temos um ID para buscar
  const isLoadingAnexos = !!empresaId && isQueryLoading;

  // Total de anexos (salvos + pendentes)
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
      const validacao = empresaAnexosService.validarArquivo(arquivo);
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
      await empresaAnexosService.excluirAnexo(anexoId);
      
      // Invalidar cache
      queryClient.invalidateQueries({ queryKey: ['empresa-anexos', empresaId] });
      
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
  }, [empresaId, queryClient, toast]);

  /**
   * Fazer upload de todos os anexos pendentes
   */
  const uploadTodosPendentes = useCallback(async (targetEmpresaId: string): Promise<{ sucesso: number; erros: number }> => {
    if (anexosPendentes.length === 0) {
      return { sucesso: 0, erros: 0 };
    }

    setIsUploading(true);
    let sucessoCount = 0;
    let errosCount = 0;

    try {
      for (let i = 0; i < anexosPendentes.length; i++) {
        const pendente = anexosPendentes[i];
        
        // Atualizar status para uploading
        setAnexosPendentes(prev => 
          prev.map(a => a.id === pendente.id ? { ...a, status: 'uploading' as const } : a)
        );

        try {
          await empresaAnexosService.uploadAnexo({
            empresaId: targetEmpresaId,
            arquivo: pendente.arquivo,
            descricao: pendente.descricao,
            ordem: i,
          });

          // Atualizar status para concluído
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
      queryClient.invalidateQueries({ queryKey: ['empresa-anexos', targetEmpresaId] });

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
  const downloadAnexo = useCallback(async (anexo: EmpresaAnexo) => {
    try {
      const url = await empresaAnexosService.obterUrlDownload(anexo.storage_path);
      
      // Abrir em nova aba para download
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
