import { supabase } from '@/integrations/supabase/client';

// Constantes
const BUCKET_NAME = 'anexos-permanentes';
const FOLDER_PREFIX = 'requerimentos';
const MAX_ANEXOS_POR_REQUERIMENTO = 5;
const MAX_FILE_SIZE_MB = 10; // 10MB por arquivo
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Tipos MIME permitidos
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed',
];

// Interface para dados de anexo retornado do banco
export interface RequerimentoAnexo {
  id: string;
  requerimento_id: string;
  nome_original: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes: number;
  storage_path: string;
  descricao: string | null;
  ordem: number;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// Interface para dados de upload
export interface UploadRequerimentoAnexoInput {
  requerimentoId: string;
  arquivo: File;
  descricao?: string;
  ordem?: number;
}

// Interface para resultado de validação
interface ValidacaoResult {
  valido: boolean;
  erro?: string;
}

/**
 * Serviço para gerenciamento de anexos de requerimentos.
 * Usa o bucket 'anexos-permanentes' com path 'requerimentos/{requerimento_id}/{nome_arquivo}'.
 * Limite de 5 anexos por requerimento, 10MB por arquivo.
 */
class RequerimentoAnexosService {
  /**
   * Listar todos os anexos de um requerimento
   */
  async listarAnexos(requerimentoId: string): Promise<RequerimentoAnexo[]> {
    const { data, error } = await supabase
      .from('requerimento_anexos')
      .select('*')
      .eq('requerimento_id', requerimentoId)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Erro ao listar anexos do requerimento:', error);
      throw new Error(`Falha ao buscar anexos: ${error.message}`);
    }

    return (data || []) as RequerimentoAnexo[];
  }

  /**
   * Contar anexos de um requerimento
   */
  async contarAnexos(requerimentoId: string): Promise<number> {
    const { count, error } = await supabase
      .from('requerimento_anexos')
      .select('*', { count: 'exact', head: true })
      .eq('requerimento_id', requerimentoId);

    if (error) {
      console.error('Erro ao contar anexos:', error);
      throw new Error(`Falha ao contar anexos: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Validar arquivo antes do upload
   */
  validarArquivo(arquivo: File): ValidacaoResult {
    if (arquivo.size > MAX_FILE_SIZE_BYTES) {
      return {
        valido: false,
        erro: `Arquivo "${arquivo.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB (${(arquivo.size / 1024 / 1024).toFixed(1)}MB)`,
      };
    }

    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      return {
        valido: false,
        erro: `Tipo de arquivo "${arquivo.type}" não é permitido. Tipos aceitos: PDF, Word, Excel, PowerPoint, imagens, texto, CSV, ZIP, RAR.`,
      };
    }

    if (!arquivo.name || arquivo.name.trim().length === 0) {
      return { valido: false, erro: 'Nome do arquivo é inválido.' };
    }

    return { valido: true };
  }

  /**
   * Verificar se o requerimento pode receber mais anexos
   */
  async validarLimiteAnexos(requerimentoId: string, quantidadeNovos: number = 1): Promise<ValidacaoResult> {
    const countAtual = await this.contarAnexos(requerimentoId);

    if (countAtual + quantidadeNovos > MAX_ANEXOS_POR_REQUERIMENTO) {
      return {
        valido: false,
        erro: `Limite de ${MAX_ANEXOS_POR_REQUERIMENTO} anexos por requerimento atingido. Atualmente: ${countAtual} anexos.`,
      };
    }

    return { valido: true };
  }

  /**
   * Gerar nome único para o arquivo no storage
   */
  private gerarNomeArquivo(requerimentoId: string, nomeOriginal: string): string {
    const timestamp = Date.now();
    const extensao = nomeOriginal.split('.').pop() || '';
    const nomeBase = nomeOriginal
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);

    return `${FOLDER_PREFIX}/${requerimentoId}/${timestamp}_${nomeBase}.${extensao}`;
  }

  /**
   * Fazer upload de um anexo para um requerimento
   */
  async uploadAnexo({ requerimentoId, arquivo, descricao, ordem }: UploadRequerimentoAnexoInput): Promise<RequerimentoAnexo> {
    // 1. Validar arquivo
    const validacaoArquivo = this.validarArquivo(arquivo);
    if (!validacaoArquivo.valido) {
      throw new Error(validacaoArquivo.erro);
    }

    // 2. Validar limite de anexos
    const validacaoLimite = await this.validarLimiteAnexos(requerimentoId);
    if (!validacaoLimite.valido) {
      throw new Error(validacaoLimite.erro);
    }

    // 3. Gerar caminho no storage
    const storagePath = this.gerarNomeArquivo(requerimentoId, arquivo.name);

    // 4. Upload para o Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, arquivo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Erro no upload para Storage:', uploadError);
      throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
    }

    // 5. Obter o user_id atual
    const { data: { user } } = await supabase.auth.getUser();

    // 6. Calcular ordem se não fornecida
    const ordemFinal = ordem ?? await this.contarAnexos(requerimentoId);

    // 7. Salvar metadados no banco
    const { data: anexo, error: dbError } = await supabase
      .from('requerimento_anexos')
      .insert({
        requerimento_id: requerimentoId,
        nome_original: arquivo.name,
        nome_arquivo: storagePath.split('/').pop() || arquivo.name,
        tipo_mime: arquivo.type,
        tamanho_bytes: arquivo.size,
        storage_path: storagePath,
        descricao: descricao || null,
        ordem: ordemFinal,
        uploaded_by: user?.id || null,
      })
      .select()
      .single();

    if (dbError) {
      // Se falhou no banco, remover do storage
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      console.error('Erro ao salvar metadados do anexo:', dbError);
      throw new Error(`Erro ao salvar informações do anexo: ${dbError.message}`);
    }

    console.log(`✅ Anexo "${arquivo.name}" uploaded para requerimento ${requerimentoId}`);
    return anexo as RequerimentoAnexo;
  }

  /**
   * Fazer upload de múltiplos anexos
   */
  async uploadMultiplosAnexos(
    requerimentoId: string,
    arquivos: File[]
  ): Promise<{ sucesso: RequerimentoAnexo[]; erros: Array<{ nome: string; erro: string }> }> {
    const validacaoLimite = await this.validarLimiteAnexos(requerimentoId, arquivos.length);
    if (!validacaoLimite.valido) {
      throw new Error(validacaoLimite.erro);
    }

    const sucesso: RequerimentoAnexo[] = [];
    const erros: Array<{ nome: string; erro: string }> = [];
    const countAtual = await this.contarAnexos(requerimentoId);

    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      try {
        const anexo = await this.uploadAnexo({
          requerimentoId,
          arquivo,
          ordem: countAtual + i,
        });
        sucesso.push(anexo);
      } catch (error) {
        erros.push({
          nome: arquivo.name,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return { sucesso, erros };
  }

  /**
   * Excluir um anexo
   */
  async excluirAnexo(anexoId: string): Promise<void> {
    const { data: anexo, error: fetchError } = await supabase
      .from('requerimento_anexos')
      .select('*')
      .eq('id', anexoId)
      .single();

    if (fetchError || !anexo) {
      throw new Error('Anexo não encontrado');
    }

    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([anexo.storage_path]);

    if (storageError) {
      console.error('Erro ao remover arquivo do storage:', storageError);
    }

    const { error: dbError } = await supabase
      .from('requerimento_anexos')
      .delete()
      .eq('id', anexoId);

    if (dbError) {
      throw new Error(`Erro ao excluir anexo: ${dbError.message}`);
    }

    console.log(`🗑️ Anexo ${anexoId} excluído com sucesso`);
  }

  /**
   * Obter URL de download temporária para um anexo
   */
  async obterUrlDownload(storagePath: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(storagePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error('Erro ao gerar URL de download');
    }

    return data.signedUrl;
  }

  /**
   * Obter extensões suportadas para exibição
   */
  getExtensoesSuportadas(): string {
    return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.zip,.rar';
  }

  /**
   * Obter limite máximo de anexos
   */
  getMaxAnexos(): number {
    return MAX_ANEXOS_POR_REQUERIMENTO;
  }

  /**
   * Obter tamanho máximo por arquivo em bytes
   */
  getMaxFileSize(): number {
    return MAX_FILE_SIZE_BYTES;
  }

  /**
   * Formatar tamanho de arquivo para exibição
   */
  formatarTamanho(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

export const requerimentoAnexosService = new RequerimentoAnexosService();
