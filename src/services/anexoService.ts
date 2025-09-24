import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { anexoTokenService } from './anexoTokenService';
import { anexoAuditService } from './anexoAuditService';
import { comprimirArquivo, comprimirArquivos, type CompressionResult } from '@/utils/anexoCompression';
import { anexoCache } from '@/utils/anexoCache';

type AnexoTemporario = Database['public']['Tables']['anexos_temporarios']['Row'];
type AnexoTemporarioInsert = Database['public']['Tables']['anexos_temporarios']['Insert'];

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

// Constantes de validação
const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024; // 10MB
const TAMANHO_MAXIMO_TOTAL = 25 * 1024 * 1024; // 25MB
const TIPOS_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

class AnexoService {
  /**
   * Valida um arquivo individual
   */
  private async validarArquivo(arquivo: File): Promise<void> {
    // Log validação de tipo
    const tipoValido = TIPOS_PERMITIDOS.includes(arquivo.type);
    await anexoAuditService.logValidacaoTipo(arquivo.name, arquivo.type, tipoValido);
    
    if (!tipoValido) {
      throw new Error(`Tipo de arquivo "${arquivo.type}" não permitido para "${arquivo.name}"`);
    }

    // Log validação de tamanho
    const tamanhoValido = arquivo.size <= TAMANHO_MAXIMO_ARQUIVO;
    await anexoAuditService.logValidacaoTamanho(arquivo.name, arquivo.size, tamanhoValido, TAMANHO_MAXIMO_ARQUIVO);
    
    if (!tamanhoValido) {
      throw new Error(`Arquivo "${arquivo.name}" excede o tamanho máximo de 10MB`);
    }
  }

  /**
   * Gera um nome único para o arquivo no storage
   */
  private gerarNomeArquivo(empresaId: string, nomeOriginal: string): string {
    const timestamp = Date.now();
    const extensao = nomeOriginal.split('.').pop();
    const nomeBase = nomeOriginal.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
    return `${empresaId}/${timestamp}_${nomeBase}.${extensao}`;
  }

  /**
   * Gera token de acesso JWT para o arquivo (privado)
   */
  private gerarTokenAcesso(anexoId: string, empresaId: string, nomeArquivo: string): string {
    return anexoTokenService.generateToken(anexoId, empresaId, nomeArquivo);
  }

  /**
   * Gera token de acesso público para um anexo
   */
  async gerarTokenAcessoPublico(anexoId: string): Promise<string> {
    try {
      const { data: anexo, error } = await supabase
        .from('anexos_temporarios')
        .select('empresa_id, nome_original')
        .eq('id', anexoId)
        .single();

      if (error || !anexo) {
        throw new Error('Anexo não encontrado');
      }

      return this.gerarTokenAcesso(anexoId, anexo.empresa_id, anexo.nome_original);
    } catch (error) {
      console.error('Erro ao gerar token de acesso:', error);
      throw error;
    }
  }

  /**
   * Calcula o tamanho total atual dos anexos de uma empresa
   */
  async calcularTamanhoTotal(empresaId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('anexos_temporarios')
        .select('tamanho_bytes')
        .eq('empresa_id', empresaId)
        .eq('status', 'pendente');

      if (error) {
        console.error('Erro ao calcular tamanho total:', error);
        throw new Error('Erro ao calcular tamanho total dos anexos');
      }

      return data?.reduce((total, anexo) => total + anexo.tamanho_bytes, 0) || 0;
    } catch (error) {
      console.error('Erro ao calcular tamanho total:', error);
      throw error;
    }
  }

  /**
   * Valida se é possível adicionar novos arquivos respeitando o limite total
   */
  async validarLimiteTotal(empresaId: string, novosArquivos: File[]): Promise<boolean> {
    try {
      const tamanhoAtual = await this.calcularTamanhoTotal(empresaId);
      const tamanhoNovos = novosArquivos.reduce((total, arquivo) => total + arquivo.size, 0);
      const valido = (tamanhoAtual + tamanhoNovos) <= TAMANHO_MAXIMO_TOTAL;
      
      // Log validação de limite total
      await anexoAuditService.logValidacaoLimiteTotal(
        empresaId, 
        tamanhoAtual, 
        tamanhoNovos, 
        TAMANHO_MAXIMO_TOTAL, 
        valido
      );
      
      return valido;
    } catch (error) {
      console.error('Erro ao validar limite total:', error);
      await anexoAuditService.logDatabaseErro('validar_limite_total', error as Error, { empresaId });
      return false;
    }
  }

  /**
   * Faz upload de um único arquivo
   */
  async uploadAnexo(empresaId: string, arquivo: File): Promise<AnexoData> {
    const startTime = Date.now();
    
    try {
      // Log início do upload
      await anexoAuditService.logUploadIniciado(empresaId, arquivo.name, arquivo.size, arquivo.type);

      // Validar arquivo
      await this.validarArquivo(arquivo);

      // Validar limite total
      const podeAdicionar = await this.validarLimiteTotal(empresaId, [arquivo]);
      if (!podeAdicionar) {
        throw new Error('Limite total de 25MB por empresa seria excedido');
      }

      // Comprimir arquivo se necessário
      const compressionResult = await comprimirArquivo(arquivo, {
        forcarCompressao: arquivo.size > 5 * 1024 * 1024 // Forçar para arquivos > 5MB
      });
      
      const arquivoFinal = compressionResult.arquivo;
      
      // Log compressão se houve redução
      if (compressionResult.foiComprimido) {
        await anexoAuditService.logUploadConcluido(
          {
            id: 'temp',
            nome: arquivo.name,
            tipo: arquivo.type,
            tamanho: arquivoFinal.size,
            url: '',
            status: 'pendente',
            empresaId
          },
          compressionResult.tempoCompressao,
          {
            bucket: 'anexos-temporarios',
            path: 'temp',
            size: arquivoFinal.size,
            originalSize: compressionResult.tamanhoOriginal,
            compressionRatio: compressionResult.percentualReducao
          }
        );
      }

      // Gerar nome único
      const nomeArquivo = this.gerarNomeArquivo(empresaId, arquivo.name);

      // Upload para Supabase Storage
      const uploadStartTime = Date.now();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('anexos-temporarios')
        .upload(nomeArquivo, arquivoFinal, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        await anexoAuditService.logStorageErro('upload_arquivo', uploadError as Error, {
          empresaId,
          nomeArquivo: arquivo.name,
          tamanhoArquivo: arquivo.size
        });
        throw new Error(`Erro ao fazer upload do arquivo: ${uploadError.message}`);
      }

      const uploadTime = Date.now() - uploadStartTime;

      // Gerar URL temporária
      const { data: urlData } = supabase.storage
        .from('anexos-temporarios')
        .getPublicUrl(uploadData.path);

      // Salvar metadados no banco (sem token inicialmente)
      const anexoData: AnexoTemporarioInsert = {
        empresa_id: empresaId,
        nome_original: arquivo.name,
        nome_arquivo: nomeArquivo,
        tipo_mime: arquivo.type,
        tamanho_bytes: arquivoFinal.size, // Usar tamanho do arquivo comprimido
        url_temporaria: urlData.publicUrl,
        token_acesso: 'temp_token', // Token temporário
        status: 'pendente'
      };

      const { data: dbData, error: dbError } = await supabase
        .from('anexos_temporarios')
        .insert(anexoData)
        .select()
        .single();

      if (dbError) {
        // Se falhou ao salvar no banco, remover arquivo do storage
        await supabase.storage
          .from('anexos-temporarios')
          .remove([uploadData.path]);
        
        console.error('Erro ao salvar metadados:', dbError);
        await anexoAuditService.logDatabaseErro('salvar_metadados_anexo', dbError as Error, {
          empresaId,
          nomeArquivo: arquivo.name
        });
        throw new Error('Erro ao salvar informações do anexo');
      }

      // Gerar token JWT real agora que temos o ID
      const token = this.gerarTokenAcesso(dbData.id, empresaId, nomeArquivo);
      
      // Log geração de token
      await anexoAuditService.logTokenGerado(dbData.id, empresaId, 3600); // 1 hora
      
      // Atualizar com o token real
      const { error: tokenError } = await supabase
        .from('anexos_temporarios')
        .update({ token_acesso: token })
        .eq('id', dbData.id);

      if (tokenError) {
        console.error('Erro ao atualizar token:', tokenError);
        await anexoAuditService.logDatabaseErro('atualizar_token_anexo', tokenError as Error, {
          anexoId: dbData.id,
          empresaId
        });
        // Não falhar por causa do token, mas logar o erro
      }

      const anexoResult: AnexoData = {
        id: dbData.id,
        nome: dbData.nome_original,
        tipo: dbData.tipo_mime,
        tamanho: dbData.tamanho_bytes,
        url: dbData.url_temporaria,
        status: dbData.status as AnexoData['status'],
        empresaId: dbData.empresa_id,
        token: token, // Usar o token JWT gerado
        dataUpload: dbData.data_upload,
        dataExpiracao: dbData.data_expiracao
      };

      const totalTime = Date.now() - startTime;

      // Log upload concluído com sucesso
      await anexoAuditService.logUploadConcluido(
        anexoResult,
        totalTime,
        {
          bucket: 'anexos-temporarios',
          path: uploadData.path,
          size: arquivoFinal.size,
          originalSize: compressionResult.tamanhoOriginal,
          compressionRatio: compressionResult.percentualReducao
        }
      );

      // Adicionar ao cache
      anexoCache.setAnexoMetadata(anexoResult.id, anexoResult);
      
      // Invalidar cache da empresa para forçar refresh
      anexoCache.invalidateEmpresa(empresaId);

      return anexoResult;
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('Erro no upload do anexo:', error);
      
      // Log falha no upload
      await anexoAuditService.logUploadFalhou(empresaId, arquivo.name, error as Error, totalTime);
      
      throw error;
    }
  }

  /**
   * Faz upload de múltiplos arquivos
   */
  async uploadAnexos(empresaId: string, arquivos: File[]): Promise<AnexoData[]> {
    try {
      // Validar todos os arquivos primeiro
      for (const arquivo of arquivos) {
        await this.validarArquivo(arquivo);
      }

      // Comprimir arquivos em paralelo
      const compressionResults = await comprimirArquivos(arquivos, {
        forcarCompressao: false // Deixar a compressão decidir automaticamente
      });

      // Usar arquivos comprimidos para validação de limite
      const arquivosFinais = compressionResults.map(r => r.arquivo);
      const podeAdicionar = await this.validarLimiteTotal(empresaId, arquivosFinais);
      if (!podeAdicionar) {
        throw new Error('Limite total de 25MB por empresa seria excedido');
      }

      // Upload sequencial para evitar problemas de concorrência
      const resultados: AnexoData[] = [];
      for (let i = 0; i < arquivosFinais.length; i++) {
        const arquivo = arquivosFinais[i];
        const resultado = await this.uploadAnexo(empresaId, arquivo);
        resultados.push(resultado);
      }

      return resultados;
    } catch (error) {
      console.error('Erro no upload de múltiplos anexos:', error);
      throw error;
    }
  }

  /**
   * Remove um anexo específico
   */
  async removerAnexo(anexoId: string, motivo: 'usuario' | 'expiracao' | 'limpeza' | 'erro' = 'usuario'): Promise<void> {
    try {
      // Buscar dados do anexo
      const { data: anexo, error: fetchError } = await supabase
        .from('anexos_temporarios')
        .select('nome_arquivo, empresa_id, nome_original')
        .eq('id', anexoId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar anexo:', fetchError);
        await anexoAuditService.logDatabaseErro('buscar_anexo_remocao', fetchError as Error, { anexoId });
        throw new Error('Anexo não encontrado');
      }

      // Remover arquivo do storage
      const { error: storageError } = await supabase.storage
        .from('anexos-temporarios')
        .remove([anexo.nome_arquivo]);

      if (storageError) {
        console.error('Erro ao remover arquivo do storage:', storageError);
        await anexoAuditService.logStorageErro('remover_arquivo', storageError as Error, {
          anexoId,
          nomeArquivo: anexo.nome_arquivo
        });
      }

      // Remover registro do banco
      const { error: dbError } = await supabase
        .from('anexos_temporarios')
        .delete()
        .eq('id', anexoId);

      if (dbError) {
        console.error('Erro ao remover anexo do banco:', dbError);
        await anexoAuditService.logDatabaseErro('remover_anexo_banco', dbError as Error, { anexoId });
        throw new Error('Erro ao remover anexo');
      }

      // Log remoção bem-sucedida
      await anexoAuditService.logAnexoRemovido(anexoId, anexo.empresa_id, anexo.nome_original, motivo);
      
      // Invalidar cache
      anexoCache.invalidateAnexo(anexoId);
      anexoCache.invalidateEmpresa(anexo.empresa_id);
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      throw error;
    }
  }

  /**
   * Remove todos os anexos de uma empresa
   */
  async removerAnexosEmpresa(empresaId: string): Promise<void> {
    try {
      // Buscar todos os anexos da empresa
      const { data: anexos, error: fetchError } = await supabase
        .from('anexos_temporarios')
        .select('id, nome_arquivo')
        .eq('empresa_id', empresaId);

      if (fetchError) {
        console.error('Erro ao buscar anexos da empresa:', fetchError);
        throw new Error('Erro ao buscar anexos da empresa');
      }

      if (!anexos || anexos.length === 0) {
        return; // Nenhum anexo para remover
      }

      // Remover arquivos do storage
      const nomeArquivos = anexos.map(anexo => anexo.nome_arquivo);
      const { error: storageError } = await supabase.storage
        .from('anexos-temporarios')
        .remove(nomeArquivos);

      if (storageError) {
        console.error('Erro ao remover arquivos do storage:', storageError);
      }

      // Remover registros do banco
      const { error: dbError } = await supabase
        .from('anexos_temporarios')
        .delete()
        .eq('empresa_id', empresaId);

      if (dbError) {
        console.error('Erro ao remover anexos do banco:', dbError);
        throw new Error('Erro ao remover anexos da empresa');
      }
    } catch (error) {
      console.error('Erro ao remover anexos da empresa:', error);
      throw error;
    }
  }

  /**
   * Obtém um anexo específico
   */
  async obterAnexo(anexoId: string): Promise<AnexoData | null> {
    try {
      const { data, error } = await supabase
        .from('anexos_temporarios')
        .select('*')
        .eq('id', anexoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Anexo não encontrado
        }
        console.error('Erro ao buscar anexo:', error);
        throw new Error('Erro ao buscar anexo');
      }

      return {
        id: data.id,
        nome: data.nome_original,
        tipo: data.tipo_mime,
        tamanho: data.tamanho_bytes,
        url: data.url_temporaria,
        status: data.status as AnexoData['status'],
        empresaId: data.empresa_id,
        token: data.token_acesso,
        dataUpload: data.data_upload,
        dataExpiracao: data.data_expiracao
      };
    } catch (error) {
      console.error('Erro ao obter anexo:', error);
      throw error;
    }
  }

  /**
   * Obtém todos os anexos de uma empresa
   */
  async obterAnexosEmpresa(empresaId: string): Promise<AnexoData[]> {
    try {
      // Tentar obter do cache primeiro
      const cached = anexoCache.getAnexosEmpresa(empresaId);
      if (cached) {
        return cached;
      }

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

      // Adicionar ao cache
      anexoCache.setAnexosEmpresa(empresaId, anexos);

      return anexos;
    } catch (error) {
      console.error('Erro ao obter anexos da empresa:', error);
      throw error;
    }
  }

  /**
   * Obtém resumo dos anexos de uma empresa
   */
  async obterResumoAnexos(empresaId: string): Promise<AnexosSummary> {
    try {
      // Tentar obter do cache primeiro
      const cached = anexoCache.getSummaryEmpresa(empresaId);
      if (cached) {
        return cached;
      }

      const anexos = await this.obterAnexosEmpresa(empresaId);
      const tamanhoTotal = anexos.reduce((total, anexo) => total + anexo.tamanho, 0);
      
      const summary: AnexosSummary = {
        totalArquivos: anexos.length,
        tamanhoTotal,
        tamanhoLimite: TAMANHO_MAXIMO_TOTAL,
        podeAdicionar: tamanhoTotal < TAMANHO_MAXIMO_TOTAL
      };

      // Adicionar ao cache
      anexoCache.setSummaryEmpresa(empresaId, summary);

      return summary;
    } catch (error) {
      console.error('Erro ao obter resumo dos anexos:', error);
      throw error;
    }
  }

  /**
   * Move arquivos para storage permanente após processamento
   */
  async moverParaPermanente(anexoIds: string[]): Promise<void> {
    try {
      for (const anexoId of anexoIds) {
        const startTime = Date.now();
        
        const { data: anexo, error: fetchError } = await supabase
          .from('anexos_temporarios')
          .select('*')
          .eq('id', anexoId)
          .single();

        if (fetchError) {
          console.error(`Erro ao buscar anexo ${anexoId}:`, fetchError);
          await anexoAuditService.logDatabaseErro('buscar_anexo_movimentacao', fetchError as Error, { anexoId });
          continue;
        }

        // Copiar arquivo para bucket permanente
        const nomePermamente = anexo.nome_arquivo.replace('temp/', 'permanent/');
        
        // Download do arquivo temporário
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('anexos-temporarios')
          .download(anexo.nome_arquivo);

        if (downloadError) {
          console.error(`Erro ao baixar arquivo temporário ${anexo.nome_arquivo}:`, downloadError);
          await anexoAuditService.logStorageErro('download_arquivo_temporario', downloadError as Error, {
            anexoId,
            nomeArquivo: anexo.nome_arquivo
          });
          continue;
        }

        // Upload para bucket permanente
        const { error: uploadError } = await supabase.storage
          .from('anexos-permanentes')
          .upload(nomePermamente, fileData);

        if (uploadError) {
          console.error(`Erro ao fazer upload permanente ${nomePermamente}:`, uploadError);
          await anexoAuditService.logStorageErro('upload_arquivo_permanente', uploadError as Error, {
            anexoId,
            nomeArquivo: nomePermamente
          });
          continue;
        }

        // Atualizar registro no banco
        const { error: updateError } = await supabase
          .from('anexos_temporarios')
          .update({
            url_permanente: nomePermamente,
            status: 'processado'
          })
          .eq('id', anexoId);

        if (updateError) {
          console.error(`Erro ao atualizar status do anexo ${anexoId}:`, updateError);
          await anexoAuditService.logDatabaseErro('atualizar_status_processado', updateError as Error, { anexoId });
        }

        // Remover arquivo temporário
        await supabase.storage
          .from('anexos-temporarios')
          .remove([anexo.nome_arquivo]);

        const processingTime = Date.now() - startTime;

        // Log movimentação bem-sucedida
        await anexoAuditService.logMovidoPermanente(
          anexoId,
          anexo.empresa_id,
          anexo.nome_original,
          processingTime
        );
      }
    } catch (error) {
      console.error('Erro ao mover arquivos para permanente:', error);
      throw error;
    }
  }

  /**
   * Valida token de acesso para download
   */
  async validarTokenDownload(anexoId: string, token: string): Promise<boolean> {
    try {
      return await anexoTokenService.validateAnexoAccess(anexoId, token);
    } catch (error) {
      console.error('Erro ao validar token de download:', error);
      return false;
    }
  }

  /**
   * Gera URL segura para download com token
   */
  async gerarUrlSeguraDownload(anexoId: string): Promise<string> {
    try {
      return await anexoTokenService.generateSecureDownloadUrl(anexoId);
    } catch (error) {
      console.error('Erro ao gerar URL segura:', error);
      throw error;
    }
  }

  /**
   * Atualiza status de um anexo
   */
  async atualizarStatusAnexo(anexoId: string, novoStatus: 'pendente' | 'enviando' | 'processado' | 'erro'): Promise<void> {
    try {
      const { error } = await supabase
        .from('anexos_temporarios')
        .update({ 
          status: novoStatus,
          data_processamento: novoStatus === 'processado' ? new Date().toISOString() : null
        })
        .eq('id', anexoId);

      if (error) {
        throw new Error(`Erro ao atualizar status do anexo: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro ao atualizar status do anexo:', error);
      throw error;
    }
  }

  /**
   * Atualiza token de um anexo (renovação)
   */
  async renovarTokenAnexo(anexoId: string): Promise<string> {
    try {
      return await anexoTokenService.updateAnexoToken(anexoId);
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      throw error;
    }
  }

  /**
   * Revoga acesso a um anexo
   */
  async revogarAcessoAnexo(anexoId: string): Promise<void> {
    try {
      await anexoTokenService.revokeToken(anexoId);
    } catch (error) {
      console.error('Erro ao revogar acesso:', error);
      throw error;
    }
  }

  /**
   * Prepara dados de anexos para webhook com tokens
   */
  async prepararAnexosParaWebhook(empresaId: string): Promise<Array<{
    anexoId: string;
    token: string;
    url: string;
    nome: string;
    tipo: string;
    tamanho: number;
  }>> {
    const startTime = Date.now();
    
    try {
      const anexos = await anexoTokenService.generateTokensForWebhook(empresaId);
      
      const tempoPreparacao = Date.now() - startTime;
      
      // Log preparação para webhook
      await anexoAuditService.logWebhookPreparado(
        empresaId,
        anexos.map(a => ({
          anexoId: a.anexoId,
          nome: a.nome,
          tamanho: a.tamanho
        })),
        tempoPreparacao
      );
      
      return anexos;
    } catch (error) {
      console.error('Erro ao preparar anexos para webhook:', error);
      await anexoAuditService.logDatabaseErro('preparar_webhook', error as Error, { empresaId });
      throw error;
    }
  }

  /**
   * Remove arquivos expirados (será usado pelo job de limpeza)
   */
  async limparAnexosExpirados(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Buscar anexos expirados
      const { data: anexosExpirados, error: fetchError } = await supabase
        .from('anexos_temporarios')
        .select('id, nome_arquivo, empresa_id, nome_original, tamanho_bytes')
        .lt('data_expiracao', new Date().toISOString());

      if (fetchError) {
        console.error('Erro ao buscar anexos expirados:', fetchError);
        await anexoAuditService.logDatabaseErro('buscar_anexos_expirados', fetchError as Error, {});
        throw new Error('Erro ao buscar anexos expirados');
      }

      if (!anexosExpirados || anexosExpirados.length === 0) {
        const tempoExecucao = Date.now() - startTime;
        await anexoAuditService.logLimpezaExpirados(0, 0, tempoExecucao);
        return 0;
      }

      // Calcular tamanho total liberado
      const tamanhoLiberado = anexosExpirados.reduce((total, anexo) => total + anexo.tamanho_bytes, 0);

      // Remover arquivos do storage
      const nomeArquivos = anexosExpirados.map(anexo => anexo.nome_arquivo);
      const { error: storageError } = await supabase.storage
        .from('anexos-temporarios')
        .remove(nomeArquivos);

      if (storageError) {
        console.error('Erro ao remover arquivos expirados do storage:', storageError);
        await anexoAuditService.logStorageErro('remover_arquivos_expirados', storageError as Error, {
          totalArquivos: anexosExpirados.length,
          arquivos: nomeArquivos
        });
      }

      // Remover registros do banco
      const anexoIds = anexosExpirados.map(anexo => anexo.id);
      const { error: dbError } = await supabase
        .from('anexos_temporarios')
        .delete()
        .in('id', anexoIds);

      if (dbError) {
        console.error('Erro ao remover anexos expirados do banco:', dbError);
        await anexoAuditService.logDatabaseErro('remover_anexos_expirados_banco', dbError as Error, {
          anexoIds
        });
        throw new Error('Erro ao remover anexos expirados');
      }

      const tempoExecucao = Date.now() - startTime;

      // Preparar detalhes para log (limitado para evitar logs muito grandes)
      const detalhes = anexosExpirados.map(anexo => ({
        anexoId: anexo.id,
        empresaId: anexo.empresa_id,
        nomeArquivo: anexo.nome_original
      }));

      // Log limpeza bem-sucedida
      await anexoAuditService.logLimpezaExpirados(
        anexosExpirados.length,
        tamanhoLiberado,
        tempoExecucao,
        detalhes
      );

      return anexosExpirados.length;
    } catch (error) {
      const tempoExecucao = Date.now() - startTime;
      console.error('Erro na limpeza de anexos expirados:', error);
      
      // Log falha na limpeza
      await anexoAuditService.logDatabaseErro('limpeza_anexos_expirados', error as Error, {
        tempoExecucao
      });
      
      throw error;
    }
  }
}

// Instância singleton do serviço
export const anexoService = new AnexoService();
export default anexoService;