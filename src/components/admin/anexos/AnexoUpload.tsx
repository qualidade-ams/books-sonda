import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Progress } from '../../ui/progress';
import { Badge } from '../../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/tooltip';
import { cn } from '../../../lib/utils';
import { useAnexos, type AnexoData } from '@/hooks/useAnexos';

// Tipos importados do hook useAnexos

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
  // Usar o hook useAnexos para integração real com o serviço
  const {
    uploadAnexos,
    removerAnexo,
    recarregarAnexosEmpresa,
    sincronizarCacheComEstado,
    obterAnexosPorEmpresa,
    obterSummary,
    validarArquivo,
    validarLimiteTotal,
    isUploading,
    uploadProgress,
    error
  } = useAnexos();

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [compressionStats, setCompressionStats] = useState<string>('');

  // Obter anexos atuais da empresa
  const anexos = obterAnexosPorEmpresa(empresaId);
  const resumo = obterSummary(empresaId);

  // Verificação automática de status ao abrir a tela
  useEffect(() => {
    const verificarStatusAnexos = async () => {
      if (!empresaId) return;
      
      console.log(`🔍 Verificando status real dos anexos para empresa ${empresaId}`);
      
      try {
        // Forçar recarregamento dos anexos diretamente do banco
        await recarregarAnexosEmpresa(empresaId);
        console.log(`✅ Status dos anexos verificado e atualizado para empresa ${empresaId}`);
      } catch (error) {
        console.error(`❌ Erro ao verificar status dos anexos:`, error);
      }
    };

    // Verificar status quando o componente é montado ou empresa muda
    verificarStatusAnexos();

    // Verificação periódica a cada 15 segundos para manter dados atualizados
    const interval = setInterval(verificarStatusAnexos, 15000);

    // Cleanup do interval
    return () => clearInterval(interval);
  }, [empresaId, recarregarAnexosEmpresa]);

  // Verificação adicional quando há anexos pendentes por muito tempo
  useEffect(() => {
    const verificarAnexosPendentes = async () => {
      if (!empresaId || anexos.length === 0) return;

      // Verificar se há anexos pendentes há mais de 1 minuto
      const anexosPendentesAntigos = anexos.filter(anexo => {
        if (anexo.status !== 'pendente') return false;
        
        const dataUpload = anexo.dataUpload ? new Date(anexo.dataUpload) : new Date();
        const agora = new Date();
        const diferencaMinutos = (agora.getTime() - dataUpload.getTime()) / (1000 * 60);
        
        return diferencaMinutos > 1; // Mais de 1 minuto pendente
      });

      if (anexosPendentesAntigos.length > 0) {
        console.log(`⚠️ Encontrados ${anexosPendentesAntigos.length} anexos pendentes há mais de 1 minuto, forçando atualização`);
        await recarregarAnexosEmpresa(empresaId);
      }
    };

    // Verificar anexos pendentes a cada 30 segundos
    const interval = setInterval(verificarAnexosPendentes, 30000);
    
    return () => clearInterval(interval);
  }, [anexos, empresaId, recarregarAnexosEmpresa]);

  // Notificar mudanças nos anexos
  useEffect(() => {
    onAnexosChange(anexos);
  }, [anexos, onAnexosChange]);

  // Validar arquivo individual (wrapper para o hook)
  const validarArquivoLocal = async (arquivo: File): Promise<string[]> => {
    const erros: string[] = [];

    // Usar validação do hook
    const validacao = validarArquivo(arquivo);
    if (!validacao.valido && validacao.erro) {
      erros.push(validacao.erro);
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

  // Validar limite total (wrapper para o hook)
  const validarLimiteTotalLocal = async (novosArquivos: File[]): Promise<string[]> => {
    const erros: string[] = [];
    const totalArquivos = resumo.totalArquivos + novosArquivos.length;

    if (totalArquivos > maxFiles) {
      erros.push(`Máximo de ${maxFiles} arquivos permitidos por empresa`);
    }

    const limiteOk = await validarLimiteTotal(empresaId, novosArquivos);
    if (!limiteOk) {
      erros.push(`Limite total de ${formatarTamanho(maxTotalSize)} por empresa seria excedido`);
    }

    return erros;
  };

  // Callback para drop de arquivos
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setValidationErrors([]);
    setCompressionStats('');

    if (rejectedFiles.length > 0) {
      const erros = rejectedFiles.map(({ file, errors }) =>
        `${file.name}: ${errors.map((e: any) => e.message).join(', ')}`
      );
      setValidationErrors(erros);
      return;
    }

    if (acceptedFiles.length === 0) return;

    try {
      // Validar limite total primeiro
      const errosLimite = await validarLimiteTotalLocal(acceptedFiles);
      if (errosLimite.length > 0) {
        setValidationErrors(errosLimite);
        return;
      }

      // Validar cada arquivo individualmente
      const errosValidacao: string[] = [];
      for (const arquivo of acceptedFiles) {
        const errosArquivo = await validarArquivoLocal(arquivo);
        errosValidacao.push(...errosArquivo);
      }

      if (errosValidacao.length > 0) {
        setValidationErrors(errosValidacao);
        return;
      }

      // Fazer upload usando o serviço real
      console.log(`🚀 Iniciando upload de ${acceptedFiles.length} arquivo(s) para empresa ${empresaId}`);
      console.log(`📊 Arquivos selecionados:`, acceptedFiles.map(f => ({ nome: f.name, tamanho: f.size, tipo: f.type })));

      const novosAnexos = await uploadAnexos(empresaId, acceptedFiles);

      console.log(`✅ Upload concluído: ${novosAnexos.length} arquivo(s) salvos no banco de dados`);
      console.log(`📋 Anexos salvos:`, novosAnexos.map(a => ({ id: a.id, nome: a.nome, status: a.status })));
      
      // SEMPRE forçar recarregamento após upload para garantir sincronização
      console.log(`🔄 Forçando recarregamento de anexos para empresa ${empresaId}`);
      await recarregarAnexosEmpresa(empresaId);
      
      // Forçar sincronização adicional após um breve delay
      setTimeout(async () => {
        console.log(`🔄 Sincronização adicional para empresa ${empresaId}`);
        await recarregarAnexosEmpresa(empresaId);
        sincronizarCacheComEstado(empresaId);
      }, 1500);

    } catch (error) {
      console.error('Erro no processo de upload:', error);
      setValidationErrors([`Erro no upload: ${(error as Error).message}`]);
    }
  }, [empresaId, maxFiles, maxTotalSize, uploadAnexos, validarArquivoLocal, validarLimiteTotalLocal, obterAnexosPorEmpresa]);

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
    disabled: disabled || isUploading || !resumo.podeAdicionar,
    multiple: true
  });

  // Remover anexo usando o serviço real com recarregamento forçado
  const handleRemoverAnexo = async (anexoId: string) => {
    try {
      console.log(`🗑️ Removendo anexo ${anexoId} do banco de dados`);
      await removerAnexo(anexoId);
      console.log(`✅ Anexo ${anexoId} removido com sucesso`);
      
      // SEMPRE forçar recarregamento após remoção para garantir sincronização
      console.log(`🔄 Forçando recarregamento após remoção para empresa ${empresaId}`);
      await recarregarAnexosEmpresa(empresaId);
      
      // Sincronização adicional após delay
      setTimeout(async () => {
        console.log(`🔄 Sincronização adicional após remoção para empresa ${empresaId}`);
        sincronizarCacheComEstado(empresaId);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      setValidationErrors([`Erro ao remover anexo: ${(error as Error).message}`]);
    }
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
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                console.log(`🔄 Atualizando status dos anexos manualmente para empresa ${empresaId}`);
                await recarregarAnexosEmpresa(empresaId);
              }}
              className="text-xs"
              title="Atualizar status dos anexos"
            >
              🔄
            </Button>
            <Badge variant="secondary">
              {resumo.totalArquivos}/{maxFiles} arquivos
            </Badge>
          </div>
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
                  : isUploading
                    ? "Salvando no banco de dados..."
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

          {!disabled && !isUploading && resumo.podeAdicionar && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivos
            </Button>
          )}

          {isUploading && (
            <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Salvando no banco de dados...</span>
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

        {/* Erro do Hook */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">Erro no Sistema</span>
            </div>
            <p className="text-sm text-destructive">{error.message}</p>
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

        {/* Lista de Arquivos Selecionados (excluindo arquivos com status "enviando" e "processado") */}
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
                      onClick={() => handleRemoverAnexo(anexo.id)}
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