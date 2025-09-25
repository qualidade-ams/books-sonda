import { useState, useCallback, useRef, useEffect } from 'react';
import { anexoService, type AnexoData as ServiceAnexoData } from '@/services/anexoService';
import { anexoCache, cacheUtils } from '@/utils/anexoCache';
import { comprimirArquivos } from '@/utils/anexoCompression';
import { supabase } from '@/integrations/supabase/client';
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
  recarregarAnexosEmpresa: (empresaId: string) => Promise<AnexoData[]>;
  sincronizarCacheComEstado: (empresaId: string) => void;
  
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

  // Carregar dados do cache na inicialização (apenas uma vez)
  useEffect(() => {
    // Este efeito roda apenas uma vez na montagem do componente
    // para carregar dados existentes do cache sem causar loops
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

  // Obter anexos por empresa (filtrando arquivos com status "enviando" e "processado")
  const obterAnexosPorEmpresa = useCallback((empresaId: string): AnexoData[] => {
    // Verificar estado local primeiro (mais atualizado)
    const localData = anexosPorEmpresa[empresaId];
    if (localData && localData.length > 0) {
      // Filtrar arquivos com status "enviando" e "processado" - eles não devem aparecer na interface
      // Mostrar apenas: "pendente" e "erro"
      return localData.filter(anexo => anexo.status !== 'enviando' && anexo.status !== 'processado');
    }
    
    // Tentar cache global
    const cached = anexoCache.getAnexosEmpresa(empresaId);
    if (cached && cached.length > 0) {
      // Filtrar arquivos com status "enviando" e "processado" também do cache
      return cached.filter(anexo => anexo.status !== 'enviando' && anexo.status !== 'processado');
    }
    
    // Retornar array vazio se não encontrar nada
    return [];
  }, [anexosPorEmpresa]);

  // Calcular tamanho atual dos anexos de uma empresa (excluindo arquivos "enviando")
  const calcularTamanhoAtual = useCallback((empresaId: string): number => {
    const anexos = obterAnexosPorEmpresa(empresaId);
    // Os anexos já vêm filtrados (sem status "enviando") da função obterAnexosPorEmpresa
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

  // Upload de múltiplos anexos com controle de concorrência
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

      // Limitar concorrência para evitar travamentos (máximo 3 uploads simultâneos)
      const LIMITE_CONCORRENCIA = 3;
      const batches: File[][] = [];
      
      for (let i = 0; i < arquivosFinais.length; i += LIMITE_CONCORRENCIA) {
        batches.push(arquivosFinais.slice(i, i + LIMITE_CONCORRENCIA));
      }

      // Processar em batches para evitar sobrecarga
      for (const batch of batches) {
        const promessasBatch = batch.map(async (arquivo, index) => {
          const compressionResult = compressionResults[arquivosFinais.indexOf(arquivo)];
          const arquivoId = `${empresaId}-${arquivo.name}-${Date.now()}-${index}`;
          uploadsAtivos.current.add(arquivoId);
          
          try {
            atualizarProgresso(arquivoId, 0);
            
            // Simular progresso durante upload (mais suave)
            const progressInterval = setInterval(() => {
              setUploadProgress(prev => {
                const atual = prev[arquivoId] || 0;
                if (atual < 85) {
                  return { ...prev, [arquivoId]: atual + 15 };
                }
                return prev;
              });
            }, 200);

            const anexo = await anexoService.uploadAnexo(empresaId, arquivo);
            
            clearInterval(progressInterval);
            atualizarProgresso(arquivoId, 100);
            
            // Limpar progresso após um tempo
            setTimeout(() => limparProgresso(arquivoId), 1500);
            
            return anexo;
            
          } catch (error) {
            console.error(`Erro no upload do arquivo ${arquivo.name}:`, error);
            limparProgresso(arquivoId);
            throw error;
          } finally {
            uploadsAtivos.current.delete(arquivoId);
          }
        });

        // Aguardar conclusão do batch atual antes de prosseguir
        const resultadosBatch = await Promise.all(promessasBatch);
        resultados.push(...resultadosBatch);
        
        // Atualizar cache local incrementalmente
        setAnexosPorEmpresa(prev => {
          const anexosAtuais = prev[empresaId] || [];
          const novosAnexos = [...anexosAtuais, ...resultadosBatch];
          return {
            ...prev,
            [empresaId]: novosAnexos
          };
        });
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

      // SEMPRE forçar limpeza e atualização do cache após upload
      console.log(`🧹 Limpando cache para empresa ${empresaId} após upload`);
      anexoCache.invalidateEmpresa(empresaId);
      
      // Buscar dados frescos do banco de dados
      const anexosFinais = await anexoService.obterAnexosEmpresa(empresaId);
      
      // Atualizar estado local com dados frescos
      setAnexosPorEmpresa(prev => ({
        ...prev,
        [empresaId]: anexosFinais
      }));
      
      // Atualizar cache com dados frescos
      anexoCache.setAnexosEmpresa(empresaId, anexosFinais);
      
      console.log(`✅ Cache atualizado: ${anexosFinais.length} anexos para empresa ${empresaId}`);

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

  // Remover anexo específico com limpeza forçada de cache
  const removerAnexo = useCallback(async (anexoId: string): Promise<void> => {
    try {
      setError(null);
      
      // Primeiro, identificar qual empresa possui este anexo
      let empresaDoAnexo: string | null = null;
      Object.entries(anexosPorEmpresa).forEach(([empresaId, anexos]) => {
        if (anexos.some(anexo => anexo.id === anexoId)) {
          empresaDoAnexo = empresaId;
        }
      });
      
      await anexoService.removerAnexo(anexoId);
      
      // SEMPRE forçar recarregamento dos anexos da empresa específica
      if (empresaDoAnexo) {
        console.log(`🧹 Limpando cache após remoção para empresa: ${empresaDoAnexo}`);
        
        // Limpar cache completamente para esta empresa
        anexoCache.invalidateEmpresa(empresaDoAnexo);
        
        // Buscar dados atualizados diretamente do banco (sem cache)
        const anexosAtualizados = await anexoService.obterAnexosEmpresa(empresaDoAnexo);
        
        // Atualizar estado local com dados frescos
        setAnexosPorEmpresa(prev => ({
          ...prev,
          [empresaDoAnexo!]: anexosAtualizados
        }));
        
        // Atualizar cache com dados frescos
        anexoCache.setAnexosEmpresa(empresaDoAnexo, anexosAtualizados);
        
        console.log(`✅ Anexos recarregados: ${anexosAtualizados.length} arquivos restantes`);
      } else {
        // Fallback: limpar cache de todas as empresas e recarregar
        console.log(`🧹 Limpando cache global após remoção de anexo ${anexoId}`);
        
        setAnexosPorEmpresa(prev => {
          const novo = { ...prev };
          Object.keys(novo).forEach(empresaId => {
            const anexosAnteriores = novo[empresaId].length;
            novo[empresaId] = novo[empresaId].filter(anexo => anexo.id !== anexoId);
            
            if (anexosAnteriores !== novo[empresaId].length) {
              // Limpar cache e atualizar
              anexoCache.invalidateEmpresa(empresaId);
              anexoCache.setAnexosEmpresa(empresaId, novo[empresaId]);
            }
          });
          return novo;
        });
      }

      toast.success('Anexo removido com sucesso');
      
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      setError(error as Error);
      toast.error(`Erro ao remover anexo: ${(error as Error).message}`);
      throw error;
    }
  }, [anexosPorEmpresa]);

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

  // Sincronizar cache com estado local (função auxiliar)
  const sincronizarCacheComEstado = useCallback((empresaId: string) => {
    const cached = anexoCache.getAnexosEmpresa(empresaId);
    if (cached && cached.length > 0) {
      setAnexosPorEmpresa(prev => {
        // Só atualizar se realmente mudou
        const current = prev[empresaId] || [];
        if (JSON.stringify(current.map(a => a.id).sort()) !== JSON.stringify(cached.map(a => a.id).sort())) {
          return {
            ...prev,
            [empresaId]: cached
          };
        }
        return prev;
      });
    }
  }, []);

  // Recarregar anexos de uma empresa com limpeza forçada de cache
  const recarregarAnexosEmpresa = useCallback(async (empresaId: string): Promise<AnexoData[]> => {
    try {
      console.log(`🔄 Recarregando anexos para empresa: ${empresaId}`);
      
      // SEMPRE limpar cache primeiro para garantir dados frescos
      anexoCache.invalidateEmpresa(empresaId);
      
      // Buscar diretamente do serviço (sem usar cache)
      const { data, error } = await supabase
        .from('anexos_temporarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('data_upload', { ascending: false });

      if (error) {
        console.error('Erro ao buscar anexos da empresa:', error);
        throw new Error('Erro ao buscar anexos da empresa');
      }

      const anexos = data.map(anexo => ({
        id: anexo.id,
        nome: anexo.nome_original,
        tipo: anexo.tipo_mime,
        tamanho: anexo.tamanho_bytes,
        url: anexo.url_temporaria,
        status: anexo.status as AnexoData['status'],
        empresaId: anexo.empresa_id,
        token: anexo.token_acesso,
        dataUpload: anexo.data_upload,
        dataExpiracao: anexo.data_expiracao
      }));
      
      // Atualizar estado local com dados frescos
      setAnexosPorEmpresa(prev => ({
        ...prev,
        [empresaId]: anexos
      }));
      
      // Atualizar cache com dados frescos
      anexoCache.setAnexosEmpresa(empresaId, anexos);
      
      console.log(`✅ Anexos recarregados: ${anexos.length} arquivos (${anexos.filter(a => a.status !== 'enviando').length} visíveis)`);
      return anexos;
    } catch (error) {
      console.error('Erro ao recarregar anexos:', error);
      setError(error as Error);
      return [];
    }
  }, []);

  return {
    // Operações principais
    uploadAnexos,
    uploadAnexo,
    removerAnexo,
    removerTodosAnexos,
    recarregarAnexosEmpresa,
    sincronizarCacheComEstado,
    
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