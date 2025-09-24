import { supabase } from '@/integrations/supabase/client';

export interface TokenPayload {
  anexoId: string;
  empresaId: string;
  nomeArquivo: string;
  exp: number; // Timestamp de expiração
  iat: number; // Timestamp de criação
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: TokenPayload;
  error?: string;
}

class AnexoTokenService {
  private readonly SECRET_KEY = 'anexo_token_secret'; // Em produção, usar variável de ambiente
  private readonly EXPIRATION_HOURS = 24;

  /**
   * Codifica dados em Base64 URL-safe
   */
  private base64UrlEncode(data: string): string {
    return btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Decodifica dados de Base64 URL-safe
   */
  private base64UrlDecode(data: string): string {
    // Adicionar padding se necessário
    const padding = '='.repeat((4 - (data.length % 4)) % 4);
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/') + padding;
    return atob(base64);
  }

  /**
   * Cria uma assinatura simples para o token
   */
  private createSignature(header: string, payload: string): string {
    const data = `${header}.${payload}.${this.SECRET_KEY}`;
    // Simulação de hash simples (em produção usar crypto real)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit integer
    }
    return this.base64UrlEncode(Math.abs(hash).toString());
  }

  /**
   * Gera um token JWT para acesso ao anexo
   */
  generateToken(anexoId: string, empresaId: string, nomeArquivo: string): string {
    try {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + (this.EXPIRATION_HOURS * 60 * 60); // 24 horas

      const header = {
        alg: 'HS256',
        typ: 'JWT'
      };

      const payload: TokenPayload = {
        anexoId,
        empresaId,
        nomeArquivo,
        exp,
        iat: now
      };

      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
      const signature = this.createSignature(encodedHeader, encodedPayload);

      return `${encodedHeader}.${encodedPayload}.${signature}`;
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      throw new Error('Erro ao gerar token de acesso');
    }
  }

  /**
   * Valida um token JWT
   */
  validateToken(token: string): TokenValidationResult {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Token inválido: formato incorreto' };
      }

      const [encodedHeader, encodedPayload, signature] = parts;

      // Verificar assinatura
      const expectedSignature = this.createSignature(encodedHeader, encodedPayload);
      if (signature !== expectedSignature) {
        return { valid: false, error: 'Token inválido: assinatura incorreta' };
      }

      // Decodificar payload
      const payloadJson = this.base64UrlDecode(encodedPayload);
      const payload: TokenPayload = JSON.parse(payloadJson);

      // Verificar expiração
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        return { valid: false, error: 'Token expirado' };
      }

      return { valid: true, payload };
    } catch (error) {
      console.error('Erro ao validar token:', error);
      return { valid: false, error: 'Token inválido: erro de processamento' };
    }
  }

  /**
   * Gera URL temporária com token para download
   */
  async generateSecureDownloadUrl(anexoId: string): Promise<string> {
    try {
      // Buscar dados do anexo
      const { data: anexo, error } = await supabase
        .from('anexos_temporarios')
        .select('empresa_id, nome_arquivo, url_temporaria')
        .eq('id', anexoId)
        .single();

      if (error) {
        throw new Error('Anexo não encontrado');
      }

      // Gerar token
      const token = this.generateToken(anexoId, anexo.empresa_id, anexo.nome_arquivo);

      // Retornar URL com token
      const baseUrl = anexo.url_temporaria;
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
    } catch (error) {
      console.error('Erro ao gerar URL segura:', error);
      throw error;
    }
  }

  /**
   * Valida acesso a um anexo usando token
   */
  async validateAnexoAccess(anexoId: string, token: string): Promise<boolean> {
    try {
      // Validar token
      const validation = this.validateToken(token);
      if (!validation.valid || !validation.payload) {
        console.error('Token inválido:', validation.error);
        return false;
      }

      // Verificar se o token é para este anexo
      if (validation.payload.anexoId !== anexoId) {
        console.error('Token não corresponde ao anexo solicitado');
        return false;
      }

      // Verificar se o anexo ainda existe
      const { data: anexo, error } = await supabase
        .from('anexos_temporarios')
        .select('id, empresa_id')
        .eq('id', anexoId)
        .single();

      if (error) {
        console.error('Anexo não encontrado:', error);
        return false;
      }

      // Verificar se a empresa do token corresponde
      if (anexo.empresa_id !== validation.payload.empresaId) {
        console.error('Empresa do token não corresponde ao anexo');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao validar acesso ao anexo:', error);
      return false;
    }
  }

  /**
   * Atualiza o token de um anexo no banco de dados
   */
  async updateAnexoToken(anexoId: string): Promise<string> {
    try {
      // Buscar dados do anexo
      const { data: anexo, error: fetchError } = await supabase
        .from('anexos_temporarios')
        .select('empresa_id, nome_arquivo')
        .eq('id', anexoId)
        .single();

      if (fetchError) {
        throw new Error('Anexo não encontrado');
      }

      // Gerar novo token
      const novoToken = this.generateToken(anexoId, anexo.empresa_id, anexo.nome_arquivo);

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('anexos_temporarios')
        .update({ token_acesso: novoToken })
        .eq('id', anexoId);

      if (updateError) {
        throw new Error('Erro ao atualizar token do anexo');
      }

      return novoToken;
    } catch (error) {
      console.error('Erro ao atualizar token do anexo:', error);
      throw error;
    }
  }

  /**
   * Revoga um token (marca anexo como expirado)
   */
  async revokeToken(anexoId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('anexos_temporarios')
        .update({ 
          data_expiracao: new Date().toISOString(),
          status: 'erro'
        })
        .eq('id', anexoId);

      if (error) {
        throw new Error('Erro ao revogar token');
      }
    } catch (error) {
      console.error('Erro ao revogar token:', error);
      throw error;
    }
  }

  /**
   * Gera tokens para múltiplos anexos (usado no webhook)
   */
  async generateTokensForWebhook(empresaId: string): Promise<Array<{
    anexoId: string;
    token: string;
    url: string;
    nome: string;
    tipo: string;
    tamanho: number;
  }>> {
    try {
      // Buscar anexos da empresa
      const { data: anexos, error } = await supabase
        .from('anexos_temporarios')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('status', 'pendente');

      if (error) {
        throw new Error('Erro ao buscar anexos da empresa');
      }

      if (!anexos || anexos.length === 0) {
        return [];
      }

      // Gerar tokens para cada anexo
      const anexosComToken = [];
      for (const anexo of anexos) {
        const token = this.generateToken(anexo.id, anexo.empresa_id, anexo.nome_arquivo);
        
        // Atualizar token no banco
        await supabase
          .from('anexos_temporarios')
          .update({ token_acesso: token })
          .eq('id', anexo.id);

        anexosComToken.push({
          anexoId: anexo.id,
          token,
          url: anexo.url_temporaria,
          nome: anexo.nome_original,
          tipo: anexo.tipo_mime,
          tamanho: anexo.tamanho_bytes
        });
      }

      return anexosComToken;
    } catch (error) {
      console.error('Erro ao gerar tokens para webhook:', error);
      throw error;
    }
  }

  /**
   * Verifica se um token está próximo do vencimento
   */
  isTokenExpiringSoon(token: string, hoursThreshold: number = 2): boolean {
    try {
      const validation = this.validateToken(token);
      if (!validation.valid || !validation.payload) {
        return true; // Token inválido, considerar como expirando
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiration = validation.payload.exp - now;
      const thresholdSeconds = hoursThreshold * 60 * 60;

      return timeUntilExpiration <= thresholdSeconds;
    } catch (error) {
      console.error('Erro ao verificar expiração do token:', error);
      return true;
    }
  }
}

// Instância singleton do serviço
export const anexoTokenService = new AnexoTokenService();
export default anexoTokenService;