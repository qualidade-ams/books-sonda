/**
 * Utilitários de validação para o sistema de configuração dinâmica
 * Implementa validações para valores de porcentagem e nomes de colunas
 */

import type { ColumnConfig, ValidationResult } from '@/types/configuration';

export class ConfigurationValidator {
  /**
   * Valida uma configuração completa de colunas
   * @param config Array de configurações de colunas
   * @returns Resultado da validação com erros, avisos e dados sanitizados
   */
  static validateConfiguration(config: ColumnConfig[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitizedConfig: ColumnConfig[] = [];

    // Verificar se a configuração não está vazia
    if (!config || !Array.isArray(config) || config.length === 0) {
      errors.push('Configuração está vazia ou inválida');
      return {
        isValid: false,
        errors,
        warnings,
        sanitizedConfig: []
      };
    }

    const seenNames = new Set<string>();
    let totalPercentage = 0;

    config.forEach((item, index) => {
      const itemErrors: string[] = [];

      // Se há erros básicos, pular para o próximo item
      if (itemErrors.length > 0) {
        errors.push(...itemErrors);
        return;
      }

      // Verificar duplicatas (case-insensitive)
      const normalizedName = item.nome_coluna.trim().toUpperCase();
      if (seenNames.has(normalizedName)) {
        warnings.push(`Nome de coluna duplicado encontrado: ${item.nome_coluna}`);
        return; // Pular duplicata
      }
      seenNames.add(normalizedName);

      // Adicionar à configuração sanitizada
      const sanitizedItem: ColumnConfig = {
        nome_coluna: item.nome_coluna.trim(),
        porcentagem: Number(item.porcentagem.toFixed(2))
      };
      
      sanitizedConfig.push(sanitizedItem);
      totalPercentage += sanitizedItem.porcentagem;
    });

    // Verificar se o total de porcentagens é razoável
    if (sanitizedConfig.length > 1) {
      const roundedTotal = Math.round(totalPercentage);
      if (Math.abs(roundedTotal - 100) > 1) { // Tolerância de 1%
        warnings.push(`Total de porcentagens é ${totalPercentage.toFixed(2)}%, esperado próximo a 100%`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedConfig
    };
  }

  /**
   * Valida parâmetros de requisição de configuração
   * @param params Parâmetros da requisição
   * @returns Array de erros de validação
   */
  static validateConfigurationRequest(params: any): string[] {
    const errors: string[] = [];

    if (params === null || params === undefined) {
      errors.push('Parâmetros de configuração são obrigatórios');
      return errors;
    }

    if (typeof params !== 'object') {
      errors.push('Parâmetros devem ser um objeto');
      return errors;
    }

    // Validar regraId se fornecido
    if (params.regraId !== undefined && (typeof params.regraId !== 'string' || params.regraId.trim() === '')) {
      errors.push('regraId deve ser uma string não vazia quando fornecido');
    }

    // Validar aba se fornecida
    if (params.aba !== undefined && (typeof params.aba !== 'string' || params.aba.trim() === '')) {
      errors.push('aba deve ser uma string não vazia quando fornecida');
    }

    // Validar segmento se fornecido
    if (params.segmento !== undefined && (typeof params.segmento !== 'string' || params.segmento.trim() === '')) {
      errors.push('segmento deve ser uma string não vazia quando fornecido');
    }

    // Validar tipo se fornecido
    if (params.tipo !== undefined && (typeof params.tipo !== 'string' || params.tipo.trim() === '')) {
      errors.push('tipo deve ser uma string não vazia quando fornecido');
    }

    return errors;
  }

  /**
   * Sanitiza parâmetros de requisição removendo valores inválidos
   * @param params Parâmetros da requisição
   * @returns Parâmetros sanitizados
   */
  static sanitizeConfigurationRequest(params: any): any {
    if (!params || typeof params !== 'object') {
      return {};
    }

    const sanitized: any = {};

    // Sanitizar cada campo
    if (typeof params.regraId === 'string' && params.regraId.trim() !== '') {
      sanitized.regraId = params.regraId.trim();
    }

    if (typeof params.aba === 'string' && params.aba.trim() !== '') {
      sanitized.aba = params.aba.trim();
    }

    if (typeof params.segmento === 'string' && params.segmento.trim() !== '') {
      sanitized.segmento = params.segmento.trim();
    }

    if (typeof params.tipo === 'string' && params.tipo.trim() !== '') {
      sanitized.tipo = params.tipo.trim();
    }

    return sanitized;
  }
}

/**
 * Classe para validação de conexão com banco de dados
 */
export class DatabaseValidator {
  
  /**
   * Valida se uma resposta do banco de dados é válida
   * @param data Dados retornados do banco
   * @param expectedFields Campos esperados na resposta
   * @returns true se válido, false caso contrário
   */
  static isValidDatabaseResponse(data: any, expectedFields: string[]): boolean {
    if (!data || !Array.isArray(data)) {
      return false;
    }

    // Se não há dados, é válido (pode ser uma consulta que não retornou resultados)
    if (data.length === 0) {
      return true;
    }

    // Verificar se todos os campos esperados estão presentes no primeiro item
    const firstItem = data[0];
    if (!firstItem || typeof firstItem !== 'object') {
      return false;
    }

    return expectedFields.every(field => field in firstItem);
  }

  /**
   * Valida se um erro de banco de dados é recuperável
   * @param error Erro do banco de dados
   * @returns true se o erro é recuperável (pode tentar novamente)
   */
  static isRecoverableError(error: any): boolean {
    if (!error) {
      return false;
    }

    const errorMessage = error.message || error.toString();
    const recoverablePatterns = [
      /connection/i,
      /timeout/i,
      /network/i,
      /temporary/i,
      /retry/i
    ];

    return recoverablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Extrai informações úteis de um erro de banco de dados
   * @param error Erro do banco de dados
   * @returns Objeto com informações do erro
   */
  static extractErrorInfo(error: any): { message: string; code?: string; isRecoverable: boolean } {
    const message = error?.message || error?.toString() || 'Erro desconhecido do banco de dados';
    const code = error?.code || error?.status;
    const isRecoverable = this.isRecoverableError(error);

    return {
      message,
      code,
      isRecoverable
    };
  }
}