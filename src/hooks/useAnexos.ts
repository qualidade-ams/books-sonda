import { useState, useCallback, useRef, useEffect } from 'react';
import { anexoService, type AnexoData as ServiceAnexoData } from '@/services/anexoService';
import { anexoCache, cacheUtils } from '@/utils/anexoCache';
import { comprimirArquivos } from '@/utils/anexoCompression';
import { toast } from 'sonner';

export type AnexoData = ServiceAnexoData;

export interface AnexosSummary {
  totalArquivos: number;
  tamanhoTotal: number;
  tamanhoLimite: number;
  podeAdicionar: boolean;
}

interface UseAnexosReturn {
  // Operações principais
  uploadAnexos: (empresaId: string, arquivos: File[]) => Promise<AnexoData[]>;
  uploadAnexo: (empresaId: string, arquivo: File) => Promise<AnexoData>;
  removerAnexo: (anexoId: string) => Promise<void>;
  removerTodosAnexos: (empresaId: string) => Promise<void>;
  
  // Consultas
  obterAnexosPorEmpresa: (empresaId: string) => AnexoData[];
  calcularTamanhoAtual: (empresaId: string) => number;
  obterSummary: (empresaId: string) => AnexosSummary;
  
  // Validações
  validarLimiteTotal: (empresaId: string, novosArquivos: File[]) => Promise<boolean>;
  validarArquivo: (arquivo: File) => { valido: boolean; erro?: string };
  
  // Estados
  isUploading: boolean;
  uploadProgress: Record<string, number>; // Progress por arquivo
  anexosPorEmpresa: Record<string, AnexoData[]>; // Cache de anexos por empresa
  error: Error | null;
}

const TAMANHO_LIMITE_TOTAL = 25 * 1024 * 1024; // 25MB
const TAMANHO_LIMITE_INDIVIDUAL = 10 * 1024 * 1024; // 10MB
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const useAnexos = (): UseAnexosReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [anexosPorEmpresa, setAnexosPorEmpresa] = useState<Record<string, AnexoData[]>>({});
  const [error, setError] = useState<Error | null>(null);
  
  // Ref para controlar uploads em andamento
  const uploadsAtivos = useRef<Set<string>>(new Set());

  // Configurar limpeza automática do cache
  useEffect(() => {
    const cleanup = cacheUtils.setupAutoCleanup(5 * 60 * 1000); // 5 minutos
    return cleanup;
  }, []);

  // Função para atualizar progresso de upload
  const atualizarProgresso = useCallback((arquivoId: string, progresso: number) => {
    setUploadProgress(prev => ({
      ...prev,
      [arquivoId]: progresso
    }));
  }, []);

  // Função para limpar progresso de upload
  const limparProgresso = useCallback((arquivoId: string) => {
    setUploadProgress(prev => {
      const novo = { ...prev };
      delete novo[arquivoId];
      return novo;
    });
  }, []);

  // Validar arquivo individual
  const validarArquivo = useCallback((arquivo: File): { valido: boolean; erro?: string } => {
    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      return {
        valido: false,
        erro: `Tipo de arquivo não permitido: ${arquivo.type}. Tipos aceitos: PDF, DOC, DOCX, XLS, XLSX`
      };
    }

    if (arquivo.size > TAMANHO_LIMITE_INDIVIDUAL) {
      return {
        valido: false,
        erro: `Arquivo muito grande: ${(arquivo.size / 1024 / 1024).toFixed(2)}MB. Limite: 10MB`
      };
    }

    return { valido: true };
  }, []);

  // Obter anexos por empresa
  const obterAnexosPorEmpresa = useCallback((empresaId: string): AnexoData[] => {
    // Tentar cache primeiro
    const cached = anexoCache.getAnexosEmpresa(empresaId);
    if (cached) {
      return cached;
    }
    
    // Fallback para estado local
    return anexosPorEmpresa[empresaId] || [];
  }, [anexosPorEmpresa]);

  // Calcular tamanho atual dos anexos de uma empresa
  const calcularTamanhoAtual = useCallback((empresaId: string): number => {
    const anexos = obterAnexosPorEmpresa(empresaId);
    return anexos.reduce((total, anexo) => total + anexo.tamanho, 0);
  }, [obterAnexosPorEmpresa]);

  // Obter summary dos anexos
  const obterSummary = useCallback((empresaId: string): AnexosSummary => {
    const anexos = obterAnexosPorEmpresa(empresaId);
    const tamanhoTotal = calcularTamanhoAtual(empresaId);
    
    return {
      totalArquivos: anexos.length,
      tamanhoTotal,
      tamanhoLimite: TAMANHO_LIMITE_TOTAL,
      podeAdicionar: tamanhoTotal < TAMANHO_LIMITE_TOTAL
    };
  }, [obterAnexosPorEmpresa, calcularTamanhoAtual]);

  // Validar limite total
  const validarLimiteTotal = useCallback(async (empresaId: string, novosArquivos: File[]): Promise<boolean> => {
    try {
      const tamanhoAtual = calcularTamanhoAtual(empresaId);
      const tamanhoNovos = novosArquivos.reduce((total, arquivo) => total + arquivo.size, 0);
      const tamanhoTotal = tamanhoAtual + tamanhoNovos;
      
      if (tamanhoTotal > TAMANHO_LIMITE_TOTAL) {
        const limiteMB = TAMANHO_LIMITE_TOTAL / 1024 / 1024;
        const totalMB = tamanhoTotal / 1024 / 1024;
        toast.error(`Limite de ${limiteMB}MB excedido. Total seria: ${totalMB.toFixed(2)}MB`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao validar limite total:', error);
      setError(error as Error);
      return false;
    }
  }, [calcularTamanhoAtual]);

  // Upload de múltiplos anexos
  const uploadAnexos = useCallback(async (empresaId: string, arquivos: File[]): Promise<AnexoData[]> => {
    try {
      setError(null);
      setIsUploading(true);

      // Validar cada arquivo individualmente
      for (const arquivo of arquivos) {
        const validacao = validarArquivo(arquivo);
        if (!validacao.valido) {
          throw new Error(validacao.erro);
        }
      }

      // Comprimir arquivos se necessário
      toast.info('Otimizando arquivos...');
      const compressionResults = await comprimirArquivos(arquivos);
      const arquivosFinais = compressionResults.map(r => r.arquivo);

      // Validar limite total com arquivos comprimidos
      const limiteOk = await validarLimiteTotal(empresaId, arquivosFinais);
      if (!limiteOk) {
        throw new Error('Limite total de 25MB excedido');
      }

      const resultados: AnexoData[] = [];

      // Upload de cada arquivo com controle de progresso
      for (let i = 0; i < arquivosFinais.length; i++) {
        const arquivo = arquivosFinais[i];
        const compressionResult = compressionResults[i];
        const arquivoId = `${empresaId}-${arquivo.name}-${Date.now()}`;
        uploadsAtivos.current.add(arquivoId);
        
        try {
          atualizarProgresso(arquivoId, 0);
          
          // Simular progresso durante upload
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const atual = prev[arquivoId] || 0;
              if (atual < 90) {
                return { ...prev, [arquivoId]: atual + 10 };
              }
              return prev;
            });
          }, 100);

          const anexo = await anexoService.uploadAnexo(empresaId, arquivo);
          
          clearInterval(progressInterval);
          atualizarProgresso(arquivoId, 100);
          
          resultados.push(anexo);
          
          // Atualizar cache local
          setAnexosPorEmpresa(prev => ({
            ...prev,
            [empresaId]: [...(prev[empresaId] || []), anexo]
          }));

          setTimeout(() => limparProgresso(arquivoId), 1000);
          
        } catch (error) {
          console.error(`Erro no upload do arquivo ${arquivo.name}:`, error);
          limparProgresso(arquivoId);
          throw error;
        } finally {
          uploadsAtivos.current.delete(arquivoId);
        }
      }

      // Mostrar estatísticas de compressão se houve otimização
      const arquivosComprimidos = compressionResults.filter(r => r.foiComprimido);
      if (arquivosComprimidos.length > 0) {
        const reducaoTotal = arquivosComprimidos.reduce((sum, r) => sum + r.percentualReducao, 0) / arquivosComprimidos.length;
        toast.success(
          `${resultados.length} arquivo(s) enviado(s) com sucesso. ` +
          `${arquivosComprimidos.length} arquivo(s) otimizado(s) (${reducaoTotal.toFixed(1)}% menor)`
        );
      } else {
        toast.success(`${resultados.length} arquivo(s) enviado(s) com sucesso`);
      }

      return resultados;

    } catch (error) {
      console.error('Erro no upload de anexos:', error);
      setError(error as Error);
      toast.error(`Erro no upload: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [validarArquivo, validarLimiteTotal, atualizarProgresso, limparProgresso]);

  // Upload de anexo único
  const uploadAnexo = useCallback(async (empresaId: string, arquivo: File): Promise<AnexoData> => {
    const resultados = await uploadAnexos(empresaId, [arquivo]);
    return resultados[0];
  }, [uploadAnexos]);

  // Remover anexo específico
  const removerAnexo = useCallback(async (anexoId: string): Promise<void> => {
    try {
      setError(null);
      
      await anexoService.removerAnexo(anexoId);
      
      // Atualizar cache local - remover de todas as empresas
      setAnexosPorEmpresa(prev => {
        const novo = { ...prev };
        Object.keys(novo).forEach(empresaId => {
          novo[empresaId] = novo[empresaId].filter(anexo => anexo.id !== anexoId);
          // Atualizar cache também
          anexoCache.setAnexosEmpresa(empresaId, novo[empresaId]);
        });
        return novo;
      });

      toast.success('Anexo removido com sucesso');
      
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      setError(error as Error);
      toast.error(`Erro ao remover anexo: ${(error as Error).message}`);
      throw error;
    }
  }, []);

  // Remover todos os anexos de uma empresa
  const removerTodosAnexos = useCallback(async (empresaId: string): Promise<void> => {
    try {
      setError(null);
      
      await anexoService.removerAnexosEmpresa(empresaId);
      
      // Limpar cache local e cache manager
      setAnexosPorEmpresa(prev => ({
        ...prev,
        [empresaId]: []
      }));
      
      anexoCache.setAnexosEmpresa(empresaId, []);

      toast.success('Todos os anexos removidos com sucesso');
      
    } catch (error) {
      console.error('Erro ao remover anexos da empresa:', error);
      setError(error as Error);
      toast.error(`Erro ao remover anexos: ${(error as Error).message}`);
      throw error;
    }
  }, []);

  return {
    // Operações principais
    uploadAnexos,
    uploadAnexo,
    removerAnexo,
    removerTodosAnexos,
    
    // Consultas
    obterAnexosPorEmpresa,
    calcularTamanhoAtual,
    obterSummary,
    
    // Validações
    validarLimiteTotal,
    validarArquivo,
    
    // Estados
    isUploading,
    uploadProgress,
    anexosPorEmpresa,
    error
  };
};