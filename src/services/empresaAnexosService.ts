import { supabase } from '@/integrations/supabase/client';

// Constantes
const BUCKET_NAME = 'anexos-permanentes';
const FOLDER_PREFIX = 'empresas';
const MAX_ANEXOS_POR_EMPRESA = 5;
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
export interface EmpresaAnexo {
  id: string;
  empresa_id: string;
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
export interface UploadAnexoInput {
  empresaId: string;
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
 * Serviço para gerenciamento de anexos de empresas clientes.
 * Usa o bucket 'anexos-permanentes' com path 'empresas/{empresa_id}/{nome_arquivo}'.
 * Limite de 5 anexos por empresa, 10MB por arquivo.
 */
class EmpresaAnexosService {
  /**
   * Listar todos os anexos de uma empresa
   */
  async listarAnexos(empresaId: string): Promise<EmpresaAnexo[]> {
    const { data, error } = await supabase
      .from('empresa_anexos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Erro ao listar anexos da empresa:', error);
      throw new Error(`Falha ao buscar anexos: ${error.message}`);
    }

    return (data || []) as EmpresaAnexo[];
  }

  /**
   * Contar anexos de uma empresa
   */
  async contarAnexos(empresaId: string): Promise<number> {
    const { count, error } = await supabase
      .from('empresa_anexos')
      .select('*', { count: 'exact', head: true })
      .eq('empresa_id', empresaId);

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
    // Verificar tamanho
    if (arquivo.size > MAX_FILE_SIZE_BYTES) {
      return {
        valido: false,
        erro: `Arquivo "${arquivo.name}" excede o limite de ${MAX_FILE_SIZE_MB}MB (${(arquivo.size / 1024 / 1024).toFixed(1)}MB)`,
      };
    }

    // Verificar tipo MIME
    if (!TIPOS_PERMITIDOS.includes(arquivo.type)) {
      return {
        valido: false,
        erro: `Tipo de arquivo "${arquivo.type}" não é permitido. Tipos aceitos: PDF, Word, Excel, PowerPoint, imagens, texto, CSV, ZIP, RAR.`,
      };
    }

    // Verificar nome do arquivo
    if (!arquivo.name || arquivo.name.trim().length === 0) {
      return { valido: false, erro: 'Nome do arquivo é inválido.' };
    }

    return { valido: true };
  }

  /**
   * Verificar se a empresa pode receber mais anexos
   */
  async validarLimiteAnexos(empresaId: string, quantidadeNovos: number = 1): Promise<ValidacaoResult> {
    const countAtual = await this.contarAnexos(empresaId);
    
    if (countAtual + quantidadeNovos > MAX_ANEXOS_POR_EMPRESA) {
      return {
        valido: false,
        erro: `Limite de ${MAX_ANEXOS_POR_EMPRESA} anexos por empresa atingido. Atualmente: ${countAtual} anexos.`,
      };
    }

    return { valido: true };
  }

  /**
   * Gerar nome único para o arquivo no storage
   */
  private gerarNomeArquivo(empresaId: string, nomeOriginal: string): string {
    const timestamp = Date.now();
    const extensao = nomeOriginal.split('.').pop() || '';
    const nomeBase = nomeOriginal
      .replace(/\.[^/.]+$/, '') // remove extensão
      .replace(/[^a-zA-Z0-9_-]/g, '_') // sanitiza caracteres especiais
      .substring(0, 50); // limita tamanho

    return `${FOLDER_PREFIX}/${empresaId}/${timestamp}_${nomeBase}.${extensao}`;
  }

  /**
   * Fazer upload de um anexo para uma empresa
   */
  async uploadAnexo({ empresaId, arquivo, descricao, ordem }: UploadAnexoInput): Promise<EmpresaAnexo> {
    // 1. Validar arquivo
    const validacaoArquivo = this.validarArquivo(arquivo);
    if (!validacaoArquivo.valido) {
      throw new Error(validacaoArquivo.erro);
    }

    // 2. Validar limite de anexos
    const validacaoLimite = await this.validarLimiteAnexos(empresaId);
    if (!validacaoLimite.valido) {
      throw new Error(validacaoLimite.erro);
    }

    // 3. Gerar caminho no storage
    const storagePath = this.gerarNomeArquivo(empresaId, arquivo.name);

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
    const ordemFinal = ordem ?? await this.contarAnexos(empresaId);

    // 7. Salvar metadados no banco
    const { data: anexo, error: dbError } = await supabase
      .from('empresa_anexos')
      .insert({
        empresa_id: empresaId,
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

    console.log(`✅ Anexo "${arquivo.name}" uploaded com sucesso para empresa ${empresaId}`);
    return anexo as EmpresaAnexo;
  }

  /**
   * Fazer upload de múltiplos anexos
   */
  async uploadMultiplosAnexos(
    empresaId: string,
    arquivos: File[],
    descricoes?: Record<string, string>
  ): Promise<{ sucesso: EmpresaAnexo[]; erros: Array<{ nome: string; erro: string }> }> {
    // Validar limite total
    const validacaoLimite = await this.validarLimiteAnexos(empresaId, arquivos.length);
    if (!validacaoLimite.valido) {
      throw new Error(validacaoLimite.erro);
    }

    const sucesso: EmpresaAnexo[] = [];
    const erros: Array<{ nome: string; erro: string }> = [];
    const countAtual = await this.contarAnexos(empresaId);

    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      try {
        const anexo = await this.uploadAnexo({
          empresaId,
          arquivo,
          descricao: descricoes?.[arquivo.name],
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
    // 1. Buscar o anexo para obter o storage_path
    const { data: anexo, error: fetchError } = await supabase
      .from('empresa_anexos')
      .select('*')
      .eq('id', anexoId)
      .single();

    if (fetchError || !anexo) {
      throw new Error('Anexo não encontrado');
    }

    // 2. Remover do Storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([anexo.storage_path]);

    if (storageError) {
      console.error('Erro ao remover arquivo do storage:', storageError);
      // Continuar com a exclusão do registro mesmo se falhar no storage
    }

    // 3. Remover registro do banco
    const { error: dbError } = await supabase
      .from('empresa_anexos')
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
    return MAX_ANEXOS_POR_EMPRESA;
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

export const empresaAnexosService = new EmpresaAnexosService();
