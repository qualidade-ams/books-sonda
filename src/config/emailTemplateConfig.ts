import type { FormularioType } from '@/types/formTypes';

/**
 * Configuração para sistema de fallback de templates de e-mail
 */

export interface EmailTemplateFallbackConfig {
  // Template padrão por formulário (quando não há mapeamento específico)
  defaultTemplates: {
    [key in FormularioType]?: string;
  };
  
  // Template global de fallback (quando não há nem específico nem padrão)
  globalFallbackTemplate?: string;
  
  // Configurações de logging
  logging: {
    enabled: boolean;
    logFallbackUsage: boolean;
    logMappingNotFound: boolean;
  };
  
  // Configurações de comportamento
  behavior: {
    // Se deve tentar buscar qualquer template ativo quando não encontra padrão
    useAnyActiveTemplateAsFallback: boolean;
    // Se deve falhar quando não encontra nenhum template
    failWhenNoTemplateFound: boolean;
  };
}

/**
 * Configuração padrão do sistema de fallback
 */
export const defaultEmailTemplateFallbackConfig: EmailTemplateFallbackConfig = {
  defaultTemplates: {
    // IDs dos templates padrão podem ser configurados aqui
  },
  
  // Template global de último recurso
  // globalFallbackTemplate: 'template-id-global-fallback',
  
  logging: {
    enabled: true,
    logFallbackUsage: true,
    logMappingNotFound: true,
  },
  
  behavior: {
    useAnyActiveTemplateAsFallback: true,
    failWhenNoTemplateFound: false,
  },
};

/**
 * Classe para gerenciar configuração de fallback de templates
 */
export class EmailTemplateFallbackConfigManager {
  private config: EmailTemplateFallbackConfig;
  
  constructor(config: EmailTemplateFallbackConfig = defaultEmailTemplateFallbackConfig) {
    this.config = { ...config };
  }
  
  /**
   * Obtém a configuração atual
   */
  getConfig(): EmailTemplateFallbackConfig {
    return { ...this.config };
  }
  
  /**
   * Atualiza a configuração
   */
  updateConfig(newConfig: Partial<EmailTemplateFallbackConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      defaultTemplates: {
        ...this.config.defaultTemplates,
        ...newConfig.defaultTemplates,
      },
      logging: {
        ...this.config.logging,
        ...newConfig.logging,
      },
      behavior: {
        ...this.config.behavior,
        ...newConfig.behavior,
      },
    };
  }
  
  /**
   * Define template padrão para um formulário específico
   */
  setDefaultTemplate(formulario: FormularioType, templateId: string): void {
    this.config.defaultTemplates[formulario] = templateId;
  }
  
  /**
   * Obtém template padrão para um formulário
   */
  getDefaultTemplate(formulario: FormularioType): string | undefined {
    return this.config.defaultTemplates[formulario];
  }
  
  /**
   * Define template global de fallback
   */
  setGlobalFallbackTemplate(templateId: string): void {
    this.config.globalFallbackTemplate = templateId;
  }
  
  /**
   * Obtém template global de fallback
   */
  getGlobalFallbackTemplate(): string | undefined {
    return this.config.globalFallbackTemplate;
  }
  
  /**
   * Verifica se logging está habilitado
   */
  isLoggingEnabled(): boolean {
    return this.config.logging.enabled;
  }
  
  /**
   * Verifica se deve logar uso de fallback
   */
  shouldLogFallbackUsage(): boolean {
    return this.config.logging.enabled && this.config.logging.logFallbackUsage;
  }
  
  /**
   * Verifica se deve logar quando mapeamento não é encontrado
   */
  shouldLogMappingNotFound(): boolean {
    return this.config.logging.enabled && this.config.logging.logMappingNotFound;
  }
  
  /**
   * Verifica se deve usar qualquer template ativo como fallback
   */
  shouldUseAnyActiveTemplateAsFallback(): boolean {
    return this.config.behavior.useAnyActiveTemplateAsFallback;
  }
  
  /**
   * Verifica se deve falhar quando não encontra template
   */
  shouldFailWhenNoTemplateFound(): boolean {
    return this.config.behavior.failWhenNoTemplateFound;
  }
}

// Instância singleton do gerenciador de configuração
export const emailTemplateFallbackConfigManager = new EmailTemplateFallbackConfigManager();