/**
 * Gerador de chaves de cache otimizado para configurações dinâmicas
 * Implementa estratégias inteligentes de geração de chaves baseadas em parâmetros
 */

import type { ConfigurationRequest } from '@/types/configuration';

export class CacheKeyGenerator {
  private static readonly PREFIX = 'config';
  private static readonly SEPARATOR = ':';
  private static readonly VERSION = 'v1';

  /**
   * Gera chave de cache baseada nos parâmetros de configuração
   * @param params Parâmetros da requisição de configuração
   * @param format Formato adicional para diferenciação (opcional)
   * @returns Chave de cache estruturada
   */
  static generateKey(params: ConfigurationRequest, format?: string): string {
    const parts = [
      this.PREFIX,
      this.VERSION,
      this.normalizeParam(params.regraId, 'no-regra'),
      this.normalizeParam(params.aba, 'no-aba'),
      this.normalizeParam(params.segmento, 'no-segmento'),
      this.normalizeParam(params.tipo, 'percentual'),
      format ? this.normalizeParam(format, 'standard') : 'standard'
    ];

    return parts.join(this.SEPARATOR);
  }

  /**
   * Gera chave de cache para formato legado
   * @param params Parâmetros da requisição
   * @returns Chave de cache para formato legado
   */
  static generateLegacyKey(params: ConfigurationRequest): string {
    return this.generateKey(params, 'legacy');
  }

  /**
   * Gera chave de cache com hash para parâmetros complexos
   * @param params Parâmetros da requisição
   * @param additionalData Dados adicionais para incluir no hash
   * @returns Chave de cache com hash
   */
  static generateHashedKey(params: ConfigurationRequest, additionalData?: any): string {
    const baseKey = this.generateKey(params);
    
    if (!additionalData) {
      return baseKey;
    }

    const hash = this.createHash(additionalData);
    return `${baseKey}${this.SEPARATOR}${hash}`;
  }

  /**
   * Gera padrão de chave para invalidação em lote
   * @param params Parâmetros parciais para criar padrão
   * @returns Padrão regex para invalidação
   */
  static generateInvalidationPattern(params: Partial<ConfigurationRequest>): RegExp {
    const parts = [
      this.PREFIX,
      this.VERSION
    ];

    // Adicionar partes específicas se fornecidas
    if (params.regraId !== undefined) {
      parts.push(this.normalizeParam(params.regraId, 'no-regra'));
    } else {
      parts.push('[^:]+'); // Qualquer valor
    }

    if (params.aba !== undefined) {
      parts.push(this.normalizeParam(params.aba, 'no-aba'));
    } else {
      parts.push('[^:]+');
    }

    if (params.segmento !== undefined) {
      parts.push(this.normalizeParam(params.segmento, 'no-segmento'));
    } else {
      parts.push('[^:]+');
    }

    if (params.tipo !== undefined) {
      parts.push(this.normalizeParam(params.tipo, 'percentual'));
    } else {
      parts.push('[^:]+');
    }

    // Formato pode ser qualquer coisa
    parts.push('[^:]+');

    const pattern = `^${parts.join(this.SEPARATOR)}$`;
    return new RegExp(pattern);
  }

  /**
   * Extrai parâmetros de uma chave de cache
   * @param key Chave de cache para analisar
   * @returns Parâmetros extraídos ou null se inválida
   */
  static parseKey(key: string): {
    params: ConfigurationRequest;
    format: string;
    version: string;
  } | null {
    const parts = key.split(this.SEPARATOR);
    
    if (parts.length < 6 || parts[0] !== this.PREFIX) {
      return null;
    }

    const [, version, regraId, aba, segmento, tipo, format] = parts;

    const params: ConfigurationRequest = {};
    
    if (regraId !== 'no-regra') {
      params.regraId = regraId;
    }
    if (aba !== 'no-aba') {
      params.aba = aba;
    }
    if (segmento !== 'no-segmento') {
      params.segmento = segmento;
    }
    if (tipo && tipo !== 'percentual') {
      params.tipo = tipo;
    }

    return {
      params,
      format: format || 'standard',
      version
    };
  }

  /**
   * Gera chaves para pré-aquecimento baseadas em combinações comuns
   * @returns Array de chaves para pré-aquecimento
   */
  static generateWarmupKeys(): string[] {
    const commonParams = [
      { tipo: 'percentual' },
      { tipo: 'percentual', aba: 'base-manutencao' },
      { tipo: 'percentual', aba: 'licenca-uso' },
      { tipo: 'percentual', segmento: 'industrial' },
      { tipo: 'percentual', segmento: 'comercial' },
      { tipo: 'percentual', aba: 'base-manutencao', segmento: 'industrial' },
      { tipo: 'percentual', aba: 'licenca-uso', segmento: 'comercial' }
    ];

    const keys: string[] = [];
    
    for (const params of commonParams) {
      keys.push(this.generateKey(params));
      keys.push(this.generateLegacyKey(params));
    }

    return keys;
  }

  /**
   * Valida se uma chave de cache é válida
   * @param key Chave para validar
   * @returns true se válida
   */
  static isValidKey(key: string): boolean {
    return this.parseKey(key) !== null;
  }

  /**
   * Gera estatísticas de uso de chaves
   * @param keys Array de chaves para analisar
   * @returns Estatísticas de uso
   */
  static analyzeKeys(keys: string[]): {
    totalKeys: number;
    validKeys: number;
    invalidKeys: number;
    byFormat: Record<string, number>;
    byAba: Record<string, number>;
    bySegmento: Record<string, number>;
    byTipo: Record<string, number>;
  } {
    const stats = {
      totalKeys: keys.length,
      validKeys: 0,
      invalidKeys: 0,
      byFormat: {} as Record<string, number>,
      byAba: {} as Record<string, number>,
      bySegmento: {} as Record<string, number>,
      byTipo: {} as Record<string, number>
    };

    for (const key of keys) {
      const parsed = this.parseKey(key);
      
      if (parsed) {
        stats.validKeys++;
        
        // Contar por formato
        stats.byFormat[parsed.format] = (stats.byFormat[parsed.format] || 0) + 1;
        
        // Contar por aba
        const aba = parsed.params.aba || 'no-aba';
        stats.byAba[aba] = (stats.byAba[aba] || 0) + 1;
        
        // Contar por segmento
        const segmento = parsed.params.segmento || 'no-segmento';
        stats.bySegmento[segmento] = (stats.bySegmento[segmento] || 0) + 1;
        
        // Contar por tipo
        const tipo = parsed.params.tipo || 'percentual';
        stats.byTipo[tipo] = (stats.byTipo[tipo] || 0) + 1;
      } else {
        stats.invalidKeys++;
      }
    }

    return stats;
  }

  /**
   * Normaliza parâmetro para uso em chave
   * @param value Valor a ser normalizado
   * @param defaultValue Valor padrão se vazio
   * @returns Valor normalizado
   */
  private static normalizeParam(value: string | undefined, defaultValue: string): string {
    if (!value || value.trim() === '') {
      return defaultValue;
    }
    
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD') // Normalizar caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9-_]/g, '-') // Substituir caracteres especiais por hífen
      .replace(/-+/g, '-') // Remover hífens duplicados
      .replace(/^-|-$/g, ''); // Remover hífens do início e fim
  }

  /**
   * Cria hash simples de dados (compatível com browser)
   * @param data Dados para criar hash
   * @returns Hash simples
   */
  private static createHash(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    
    if (str.length === 0) return '00000000';
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
  }

  /**
   * Gera chave de cache para estatísticas
   * @param type Tipo de estatística
   * @param period Período (opcional)
   * @returns Chave para estatísticas
   */
  static generateStatsKey(type: string, period?: string): string {
    const parts = ['stats', type];
    if (period) {
      parts.push(period);
    }
    return parts.join(this.SEPARATOR);
  }

  /**
   * Gera chave de cache para configuração de fallback
   * @param context Contexto do fallback
   * @returns Chave para fallback
   */
  static generateFallbackKey(context: string): string {
    return `fallback${this.SEPARATOR}${context}`;
  }
}