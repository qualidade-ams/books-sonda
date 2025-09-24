/**
 * Serviço de Infraestrutura de Storage para Anexos
 * Gerencia buckets, políticas e estrutura de pastas no Supabase Storage
 */

import { supabase } from '@/integrations/supabase/client';
import { adminClient } from '@/integrations/supabase/adminClient';

export interface StorageBucketConfig {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

export interface AnexoPath {
  bucket: string;
  path: string;
  fullUrl: string;
}

export class AnexoStorageService {
  // Configurações dos buckets
  private static readonly BUCKET_TEMPORARIO = 'anexos-temporarios';
  private static readonly BUCKET_PERMANENTE = 'anexos-permanentes';
  
  // Tipos MIME permitidos
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // Limite de tamanho por arquivo (10MB)
  private static readonly FILE_SIZE_LIMIT = 10 * 1024 * 1024;

  /**
   * Verifica se os buckets necessários existem
   */
  static async verificarBuckets(): Promise<boolean> {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Erro ao listar buckets:', error);
        return false;
      }

      const bucketIds = buckets?.map(b => b.id) || [];
      const bucketsNecessarios = [this.BUCKET_TEMPORARIO, this.BUCKET_PERMANENTE];
      
      return bucketsNecessarios.every(bucket => bucketIds.includes(bucket));
    } catch (error) {
      console.error('Erro ao verificar buckets:', error);
      return false;
    }
  }

  /**
   * Cria os buckets necessários (requer permissões de admin)
   */
  static async criarBuckets(): Promise<void> {
    const bucketConfigs: StorageBucketConfig[] = [
      {
        id: this.BUCKET_TEMPORARIO,
        name: this.BUCKET_TEMPORARIO,
        public: false,
        fileSizeLimit: this.FILE_SIZE_LIMIT,
        allowedMimeTypes: this.ALLOWED_MIME_TYPES
      },
      {
        id: this.BUCKET_PERMANENTE,
        name: this.BUCKET_PERMANENTE,
        public: false,
        fileSizeLimit: this.FILE_SIZE_LIMIT,
        allowedMimeTypes: this.ALLOWED_MIME_TYPES
      }
    ];

    for (const config of bucketConfigs) {
      try {
        const { error } = await adminClient.storage.createBucket(config.id, {
          public: config.public,
          fileSizeLimit: config.fileSizeLimit,
          allowedMimeTypes: config.allowedMimeTypes
        });

        if (error && !error.message.includes('already exists')) {
          throw error;
        }

        console.log(`Bucket ${config.id} configurado com sucesso`);
      } catch (error) {
        console.error(`Erro ao criar bucket ${config.id}:`, error);
        throw error;
      }
    }
  }

  /**
   * Gera caminho organizado para arquivo
   */
  static gerarCaminhoArquivo(
    empresaId: string,
    nomeArquivo: string,
    temporario: boolean = true
  ): string {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const periodo = `${ano}-${mes}`;
    
    // Limpar nome da empresa para uso em path (usar ID como fallback)
    const empresaPath = empresaId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Construir caminho baseado no tipo
    const subpasta = temporario ? 'temp' : 'processed';
    return `${empresaPath}/${periodo}/${subpasta}/${nomeArquivo}`;
  }

  /**
   * Gera nome único para arquivo
   */
  static gerarNomeUnico(nomeOriginal: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extensao = nomeOriginal.split('.').pop();
    const nomeBase = nomeOriginal.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    
    return `${nomeBase}_${timestamp}_${random}.${extensao}`;
  }

  /**
   * Valida tipo MIME do arquivo
   */
  static validarTipoArquivo(tipoMime: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(tipoMime);
  }

  /**
   * Valida tamanho do arquivo
   */
  static validarTamanhoArquivo(tamanhoBytes: number): boolean {
    return tamanhoBytes <= this.FILE_SIZE_LIMIT;
  }

  /**
   * Gera URL temporária para download
   */
  static async gerarUrlTemporaria(
    bucket: string,
    caminho: string,
    expiracaoSegundos: number = 3600 // 1 hora
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(caminho, expiracaoSegundos);

    if (error) {
      throw new Error(`Erro ao gerar URL temporária: ${error.message}`);
    }

    return data.signedUrl;
  }

  /**
   * Move arquivo do bucket temporário para permanente
   */
  static async moverParaPermanente(
    caminhoTemporario: string,
    caminhoPermanente: string
  ): Promise<void> {
    try {
      // Baixar arquivo do bucket temporário
      const { data: arquivo, error: downloadError } = await adminClient.storage
        .from(this.BUCKET_TEMPORARIO)
        .download(caminhoTemporario);

      if (downloadError) {
        throw new Error(`Erro ao baixar arquivo temporário: ${downloadError.message}`);
      }

      // Upload para bucket permanente
      const { error: uploadError } = await adminClient.storage
        .from(this.BUCKET_PERMANENTE)
        .upload(caminhoPermanente, arquivo);

      if (uploadError) {
        throw new Error(`Erro ao fazer upload para permanente: ${uploadError.message}`);
      }

      // Remover do bucket temporário
      const { error: deleteError } = await adminClient.storage
        .from(this.BUCKET_TEMPORARIO)
        .remove([caminhoTemporario]);

      if (deleteError) {
        console.warn(`Aviso: Erro ao remover arquivo temporário: ${deleteError.message}`);
      }

      console.log(`Arquivo movido com sucesso: ${caminhoTemporario} -> ${caminhoPermanente}`);
    } catch (error) {
      console.error('Erro ao mover arquivo para permanente:', error);
      throw error;
    }
  }

  /**
   * Remove arquivo do storage
   */
  static async removerArquivo(bucket: string, caminho: string): Promise<void> {
    const { error } = await adminClient.storage
      .from(bucket)
      .remove([caminho]);

    if (error) {
      throw new Error(`Erro ao remover arquivo: ${error.message}`);
    }
  }

  /**
   * Lista arquivos de uma empresa
   */
  static async listarArquivosEmpresa(
    empresaId: string,
    temporario: boolean = true
  ): Promise<string[]> {
    const bucket = temporario ? this.BUCKET_TEMPORARIO : this.BUCKET_PERMANENTE;
    const empresaPath = empresaId.replace(/[^a-zA-Z0-9_-]/g, '_');

    const { data: arquivos, error } = await supabase.storage
      .from(bucket)
      .list(empresaPath, {
        limit: 100,
        offset: 0
      });

    if (error) {
      throw new Error(`Erro ao listar arquivos: ${error.message}`);
    }

    return arquivos?.map(arquivo => arquivo.name) || [];
  }

  /**
   * Calcula uso de storage por empresa
   */
  static async calcularUsoStorage(empresaId: string): Promise<{
    temporario: number;
    permanente: number;
    total: number;
  }> {
    const empresaPath = empresaId.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    let usoTemporario = 0;
    let usoPermanente = 0;

    try {
      // Calcular uso no bucket temporário
      const { data: arquivosTemp } = await supabase.storage
        .from(this.BUCKET_TEMPORARIO)
        .list(empresaPath, { limit: 1000 });

      if (arquivosTemp) {
        usoTemporario = arquivosTemp.reduce((total, arquivo) => {
          return total + (arquivo.metadata?.size || 0);
        }, 0);
      }

      // Calcular uso no bucket permanente
      const { data: arquivosPerm } = await supabase.storage
        .from(this.BUCKET_PERMANENTE)
        .list(empresaPath, { limit: 1000 });

      if (arquivosPerm) {
        usoPermanente = arquivosPerm.reduce((total, arquivo) => {
          return total + (arquivo.metadata?.size || 0);
        }, 0);
      }
    } catch (error) {
      console.error('Erro ao calcular uso de storage:', error);
    }

    return {
      temporario: usoTemporario,
      permanente: usoPermanente,
      total: usoTemporario + usoPermanente
    };
  }

  /**
   * Limpa arquivos expirados (para uso em jobs)
   */
  static async limparArquivosExpirados(): Promise<number> {
    try {
      // Buscar anexos expirados no banco
      const { data: anexosExpirados, error } = await adminClient
        .from('anexos_temporarios')
        .select('nome_arquivo, empresa_id')
        .lt('data_expiracao', new Date().toISOString())
        .in('status', ['pendente', 'enviando']);

      if (error) {
        throw error;
      }

      let removidos = 0;

      for (const anexo of anexosExpirados || []) {
        try {
          const caminho = this.gerarCaminhoArquivo(
            anexo.empresa_id,
            anexo.nome_arquivo,
            true
          );

          await this.removerArquivo(this.BUCKET_TEMPORARIO, caminho);
          removidos++;
        } catch (error) {
          console.error(`Erro ao remover arquivo ${anexo.nome_arquivo}:`, error);
        }
      }

      // Atualizar status no banco usando a função SQL
      await adminClient.rpc('limpar_anexos_expirados');

      console.log(`Limpeza concluída: ${removidos} arquivos removidos`);
      return removidos;
    } catch (error) {
      console.error('Erro na limpeza de arquivos expirados:', error);
      throw error;
    }
  }

  /**
   * Obtém informações dos buckets
   */
  static getBucketInfo() {
    return {
      temporario: this.BUCKET_TEMPORARIO,
      permanente: this.BUCKET_PERMANENTE,
      tiposPermitidos: this.ALLOWED_MIME_TYPES,
      limiteArquivo: this.FILE_SIZE_LIMIT,
      limiteTotalEmpresa: 25 * 1024 * 1024 // 25MB
    };
  }
}

export default AnexoStorageService;