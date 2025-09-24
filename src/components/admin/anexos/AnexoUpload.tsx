import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { cn } from '../../../lib/utils';
import { comprimirArquivos, deveComprimir } from '@/utils/anexoCompression';
import { anexoCache, cacheUtils } from '@/utils/anexoCache';

export interface AnexoData {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url: string;
  status: 'pendente' | 'enviando' | 'processado' | 'erro';
  empresaId: string;
  token?: string;
  dataUpload?: string;
  dataExpiracao?: string;
}

export interface AnexosSummary {
  totalArquivos: number;
  tamanhoTotal: number;
  tamanhoLimite: number;
  podeAdicionar: boolean;
}

interface AnexoUploadProps {
  empresaId: string;
  onAnexosChange: (anexos: AnexoData[]) => void;
  disabled?: boolean;
  maxTotalSize?: number; // 25MB por padrão
  maxFiles?: number; // 10 arquivos por padrão
  className?: string;
}

// Constantes de validação
const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024; // 10MB
const TAMANHO_MAXIMO_TOTAL_DEFAULT = 25 * 1024 * 1024; // 25MB
const MAX_FILES_DEFAULT = 10;
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const EXTENSOES_PERMITIDAS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];

// Função para formatar tamanho de arquivo
const formatarTamanho = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Função para obter ícone do tipo de arquivo
const obterIconeArquivo = (tipo: string) => {
  if (tipo.includes('pdf')) return '📄';
  if (tipo.includes('word')) return '📝';
  if (tipo.includes('excel') || tipo.includes('spreadsheet')) return '📊';
  return '📎';
};

// Função para validar assinatura de arquivo (magic numbers)
const validarAssinaturaArquivo = async (arquivo: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (!arrayBuffer) {
        resolve(false);
        return;
      }

      const bytes = new Uint8Array(arrayBuffer.slice(0, 8));
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

      // Magic numbers para tipos permitidos
      const magicNumbers = {
        pdf: ['25504446'], // %PDF
        docx: ['504b0304'], // ZIP (DOCX é um ZIP)
        xlsx: ['504b0304'], // ZIP (XLSX é um ZIP)
        doc: ['d0cf11e0'], // OLE2 (DOC antigo)
        xls: ['d0cf11e0'], // OLE2 (XLS antigo)
      };

      // Verificar se o arquivo corresponde a algum magic number válido
      const isValid = Object.values(magicNumbers).some(signatures => 
        signatures.some(signature => hex.startsWith(signature))
      );

      resolve(isValid);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(arquivo.slice(0, 8));
  });
};

export function AnexoUpload({
  empresaId,
  onAnexosChange,
  disabled = false,
  maxTotalSize = TAMANHO_MAXIMO_TOTAL_DEFAULT,
  maxFiles = MAX_FILES_DEFAULT,
  className
}: AnexoUploadProps) {
  const [anexos, setAnexos] = useState<AnexoData[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [compressionStats, setCompressionStats] = useState<string>('');

  // Carregar anexos do cache ao montar o componente
  useEffect(() => {
    const cached = anexoCache.getAnexosEmpresa(empresaId);
    if (cached && cached.length > 0) {
      setAnexos(cached);
      onAnexosChange(cached);
    }
  }, [empresaId, onAnexosChange]);

  // Calcular resumo atual
  const resumo: AnexosSummary = {
    totalArquivos: anexos.length,
    tamanhoTotal: anexos.reduce((total, anexo) => total + anexo.tamanho, 0),
    tamanhoLimite: maxTotalSize,
    podeAdicionar: anexos.length < maxFiles && anexos.reduce((total, anexo) => total + anexo.tamanho, 0) < maxTotalSize
  };

  // Validar arquivo individual
  const validarArquivo = async (arquivo: File): Promise<string[]> => {
    const erros: string[] = [];

    // Validar tamanho
    if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
      erros.push(`Arquivo "${arquivo.name}" excede o tamanho máximo de 10MB`);
    }

    // Validar tipo MIME
    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      erros.push(`Tipo de arquivo "${arquivo.type}" não permitido para "${arquivo.name}"`);
    }

    // Validar extensão
    const extensao = '.' + arquivo.name.split('.').pop()?.toLowerCase();
    if (!EXTENSOES_PERMITIDAS.includes(extensao)) {
      erros.push(`Extensão "${extensao}" não permitida para "${arquivo.name}"`);
    }

    // Validar assinatura do arquivo (magic numbers)
    try {
      const assinaturaValida = await validarAssinaturaArquivo(arquivo);
      if (!assinaturaValida) {
        erros.push(`Arquivo "${arquivo.name}" possui assinatura inválida ou está corrompido`);
      }
    } catch (error) {
      erros.push(`Erro ao validar arquivo "${arquivo.name}"`);
    }

    return erros;
  };

  // Validar limite total
  const validarLimiteTotal = (novosArquivos: File[]): string[] => {
    const erros: string[] = [];
    const tamanhoAtual = resumo.tamanhoTotal;
    const tamanhoNovos = novosArquivos.reduce((total, arquivo) => total + arquivo.size, 0);
    const totalArquivos = resumo.totalArquivos + novosArquivos.length;

    if (totalArquivos > maxFiles) {
      erros.push(`Máximo de ${maxFiles} arquivos permitidos por empresa`);
    }

    if ((tamanhoAtual + tamanhoNovos) > maxTotalSize) {
      erros.push(`Limite total de ${formatarTamanho(maxTotalSize)} por empresa seria excedido`);
    }

    return erros;
  };

  // Simular upload (será substituído pela integração real com o serviço)
  const simularUpload = async (arquivo: File): Promise<AnexoData> => {
    const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simular progresso de upload
    for (let progress = 0; progress <= 100; progress += 10) {
      setUploadProgress(prev => ({ ...prev, [id]: progress }));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Remover progresso após conclusão
    setUploadProgress(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });

    return {
      id,
      nome: arquivo.name,
      tipo: arquivo.type,
      tamanho: arquivo.size,
      url: URL.createObjectURL(arquivo), // URL temporária para preview
      status: 'pendente',
      empresaId,
      dataUpload: new Date().toISOString(),
      dataExpiracao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
    };
  };

  // Callback para drop de arquivos
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationErrors([]);
    
    if (rejectedFiles.length > 0) {
      const erros = rejectedFiles.map(({ file, errors }) => 
        `${file.name}: ${errors.map((e: any) => e.message).join(', ')}`
      );
      setValidationErrors(erros);
      return;
    }

    if (acceptedFiles.length === 0) return;

    try {
      setIsUploading(true);

      // Validar limite total primeiro
      const errosLimite = validarLimiteTotal(acceptedFiles);
      if (errosLimite.length > 0) {
        setValidationErrors(errosLimite);
        return;
      }

      // Validar cada arquivo individualmente
      const errosValidacao: string[] = [];
      for (const arquivo of acceptedFiles) {
        const errosArquivo = await validarArquivo(arquivo);
        errosValidacao.push(...errosArquivo);
      }

      if (errosValidacao.length > 0) {
        setValidationErrors(errosValidacao);
        return;
      }

      // Verificar se algum arquivo precisa de compressão
      const arquivosParaComprimir = acceptedFiles.filter(arquivo => deveComprimir(arquivo));
      
      let arquivosFinais = acceptedFiles;
      
      if (arquivosParaComprimir.length > 0) {
        setIsCompressing(true);
        try {
          const compressionResults = await comprimirArquivos(acceptedFiles);
          arquivosFinais = compressionResults.map(r => r.arquivo);
          
          // Mostrar estatísticas de compressão
          const arquivosComprimidos = compressionResults.filter(r => r.foiComprimido);
          if (arquivosComprimidos.length > 0) {
            const reducaoMedia = arquivosComprimidos.reduce((sum, r) => sum + r.percentualReducao, 0) / arquivosComprimidos.length;
            setCompressionStats(`${arquivosComprimidos.length} arquivo(s) otimizado(s) - ${reducaoMedia.toFixed(1)}% menor`);
          }
        } catch (error) {
          console.warn('Erro na compressão, usando arquivos originais:', error);
        } finally {
          setIsCompressing(false);
        }
      }

      // Fazer upload dos arquivos válidos
      const novosAnexos: AnexoData[] = [];
      for (let i = 0; i < arquivosFinais.length; i++) {
        const arquivo = arquivosFinais[i];
        try {
          const anexo = await simularUpload(arquivo);
          novosAnexos.push(anexo);
        } catch (error) {
          console.error('Erro no upload:', error);
          setValidationErrors(prev => [...prev, `Erro ao fazer upload de "${arquivo.name}"`]);
        }
      }

      // Atualizar lista de anexos
      const anexosAtualizados = [...anexos, ...novosAnexos];
      setAnexos(anexosAtualizados);
      onAnexosChange(anexosAtualizados);
      
      // Atualizar cache
      anexoCache.setAnexosEmpresa(empresaId, anexosAtualizados);

    } catch (error) {
      console.error('Erro no processo de upload:', error);
      setValidationErrors(['Erro interno no processo de upload']);
    } finally {
      setIsUploading(false);
      setIsCompressing(false);
    }
  }, [anexos, empresaId, maxFiles, maxTotalSize, onAnexosChange]);

  // Configurar dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: maxFiles - resumo.totalArquivos,
    disabled: disabled || isUploading || isCompressing || !resumo.podeAdicionar,
    multiple: true
  });

  // Remover anexo
  const removerAnexo = (anexoId: string) => {
    const anexosAtualizados = anexos.filter(anexo => anexo.id !== anexoId);
    setAnexos(anexosAtualizados);
    onAnexosChange(anexosAtualizados);
    
    // Atualizar cache
    anexoCache.setAnexosEmpresa(empresaId, anexosAtualizados);
  };

  // Obter status visual do anexo
  const obterStatusAnexo = (status: AnexoData['status']) => {
    switch (status) {
      case 'pendente':
        return { icon: CheckCircle2, color: 'text-blue-500', label: 'Pendente' };
      case 'enviando':
        return { icon: Loader2, color: 'text-yellow-500', label: 'Enviando' };
      case 'processado':
        return { icon: CheckCircle2, color: 'text-green-500', label: 'Processado' };
      case 'erro':
        return { icon: AlertCircle, color: 'text-red-500', label: 'Erro' };
      default:
        return { icon: FileText, color: 'text-gray-500', label: 'Desconhecido' };
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Anexar Arquivos</span>
          <Badge variant="secondary">
            {resumo.totalArquivos}/{maxFiles} arquivos
          </Badge>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Tamanho total: {formatarTamanho(resumo.tamanhoTotal)}</span>
            <span>Limite: {formatarTamanho(resumo.tamanhoLimite)}</span>
          </div>
          <Progress 
            value={(resumo.tamanhoTotal / resumo.tamanhoLimite) * 100} 
            className="mt-2"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Área de Drop */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive && "border-primary bg-primary/5",
            (disabled || isUploading || !resumo.podeAdicionar) && "opacity-50 cursor-not-allowed",
            validationErrors.length > 0 && "border-destructive bg-destructive/5"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-2">
            <Upload className={cn(
              "h-8 w-8",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )} />
            
            <div>
              <p className="font-medium">
                {isDragActive
                  ? "Solte os arquivos aqui"
                  : isCompressing
                  ? "Otimizando arquivos..."
                  : isUploading
                  ? "Fazendo upload..."
                  : !resumo.podeAdicionar
                  ? "Limite atingido"
                  : "Arraste arquivos ou clique para selecionar"
                }
              </p>
              
              <p className="text-sm text-muted-foreground">
                Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX (máx. 10MB cada)
                <br />
                <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                  <Zap className="h-3 w-3" />
                  Compressão automática para arquivos grandes
                </span>
              </p>
            </div>
          </div>

          {!disabled && !isUploading && !isCompressing && resumo.podeAdicionar && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivos
            </Button>
          )}

          {isCompressing && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Otimizando arquivos...</span>
            </div>
          )}
        </div>

        {/* Erros de Validação */}
        {validationErrors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Erros de Validação</span>
            </div>
            <ul className="text-sm text-destructive space-y-1">
              {validationErrors.map((erro, index) => (
                <li key={index}>• {erro}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Estatísticas de Compressão */}
        {compressionStats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Otimização Aplicada</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">{compressionStats}</p>
          </div>
        )}

        {/* Lista de Arquivos Selecionados */}
        {anexos.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Arquivos Selecionados</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {anexos.map((anexo) => {
                const status = obterStatusAnexo(anexo.status);
                const StatusIcon = status.icon;
                const progress = uploadProgress[anexo.id];

                return (
                  <div
                    key={anexo.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-lg">{obterIconeArquivo(anexo.tipo)}</span>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{anexo.nome}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>{formatarTamanho(anexo.tamanho)}</span>
                          <span>•</span>
                          <div className="flex items-center space-x-1">
                            <StatusIcon className={cn("h-3 w-3", status.color)} />
                            <span>{status.label}</span>
                          </div>
                        </div>
                        
                        {progress !== undefined && (
                          <Progress value={progress} className="mt-1 h-1" />
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerAnexo(anexo.id)}
                      disabled={anexo.status === 'enviando'}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}