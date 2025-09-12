import { supabase } from '@/integrations/supabase/client';
import type { EmailTemplate } from '@/types/approval';
export type { EmailTemplate };
import {
  emailTemplateFallbackConfigManager,
  type EmailTemplateFallbackConfig
} from '@/config/emailTemplateConfig';
import { EmailTemplateError, EmailTemplateErrorFactory } from '@/errors/EmailTemplateError';

// Re-export EmailTemplateError for convenience
export { EmailTemplateError };
import { auditLogger } from './auditLogger';
import { errorRecoveryService } from './errorRecoveryService';
import { adminNotificationService } from './adminNotificationService';
import type { FormularioType, ModalidadeType } from '@/types/formTypes';

export interface EmailTemplateMapping {
  formulario: FormularioType;
  modalidade: ModalidadeType;
  templateId: string;
  template?: EmailTemplate;
}

export interface TemplateMappingResult {
  template: EmailTemplate | null;
  isDefault: boolean;
  mappingFound: boolean;
  fallbackType?: 'specific' | 'configured_default' | 'form_default' | 'any_active' | 'global_fallback' | 'none';
  fallbackReason?: string;
}

// Função helper para mapear dados do Supabase para EmailTemplate
const mapSupabaseToEmailTemplate = (data: any): EmailTemplate => {
  return {
    id: data.id,
    nome: data.nome,
    assunto: data.assunto,
    corpo: data.corpo,
    descricao: data.descricao || null,
    tipo: data.tipo || 'book',
    ativo: data.ativo !== undefined ? data.ativo : true,
    vinculado_formulario: data.vinculado_formulario !== undefined ? data.vinculado_formulario : true,
    formulario: data.formulario as FormularioType | null,
    modalidade: data.modalidade,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
};

/**
 * Serviço principal para gerenciamento de mapeamentos entre formulários, modalidades e templates de e-mail.
 * 
 * Este serviço fornece funcionalidades para:
 * - Buscar templates específicos baseados em formulário + modalidade
 * - Sistema de fallback hierárquico quando não encontra template específico
 * - Validação de unicidade de mapeamentos
 * - Listagem de todos os mapeamentos ativos
 * - Configuração de templates padrão e fallback
 * 
 * @example
 * ```typescript
 * import { emailTemplateMappingService } from '@/services/emailTemplateMappingService';
 * 
 */
export class EmailTemplateMappingService {
  /**
   * Método utilitário para logging condicional baseado na configuração
   * @private
   * @param message - Mensagem a ser logada
   * @param type - Tipo do log (info, warn, error)
   */
  private log(message: string, type: 'info' | 'warn' | 'error' = 'info'): void {
    if (emailTemplateFallbackConfigManager.isLoggingEnabled()) {
      switch (type) {
        case 'warn':
          console.warn(`[EmailTemplateMapping] ${message}`);
          break;
        case 'error':
          console.error(`[EmailTemplateMapping] ${message}`);
          break;
        default:
          console.log(`[EmailTemplateMapping] ${message}`);
      }
    }
  }

  /**
   * Log específico para uso de fallback
   * @private
   * @param formulario - Tipo do formulário
   * @param modalidade - Modalidade selecionada
   * @param fallbackType - Tipo de fallback utilizado
   * @param templateName - Nome do template usado como fallback
   * @param reason - Razão pela qual o fallback foi usado
   */
  private logFallbackUsage(
    formulario: string,
    modalidade: string,
    fallbackType: string,
    templateName: string,
    reason: string
  ): void {
    if (emailTemplateFallbackConfigManager.shouldLogFallbackUsage()) {
      this.log(
        `🔄 FALLBACK USADO: ${formulario}+${modalidade} → ${templateName} (${fallbackType}) - ${reason}`,
        'warn'
      );
    }
  }

  /**
   * Log específico para mapeamento não encontrado
   * @private
   * @param formulario - Tipo do formulário
   * @param modalidade - Modalidade selecionada
   */
  private logMappingNotFound(formulario: string, modalidade: string): void {
    if (emailTemplateFallbackConfigManager.shouldLogMappingNotFound()) {
      this.log(
        `❌ MAPEAMENTO NÃO ENCONTRADO: ${formulario}+${modalidade} - iniciando processo de fallback`,
        'warn'
      );
    }
  }
  /**
   * Busca um template específico baseado na combinação formulário + modalidade.
   * 
   * Este método procura por um template que tenha exatamente a combinação
   * de formulário e modalidade especificados. Se não encontrar, retorna null.
   * Para busca com fallback, use `findWithFallback()`.
   * 
   * @param formulario - Tipo do formulário ('comply_edocs' | 'comply_fiscal')
   * @param modalidade - Modalidade selecionada ('on-premise' | 'saas')
   * @returns Promise que resolve para o template específico ou null se não encontrado
   * 
   * @throws {EmailTemplateError} Quando há erro de banco de dados
   * 
   * @example
   * ```typescript
   * const template = await emailTemplateMappingService.findByMapping(
   *   'book',
   *   'mensal'
   * );
   * 
   * if (template) {
   *   console.log(`Template encontrado: ${template.nome}`);
   * } else {
   *   console.log('Nenhum template específico encontrado');
   * }
   * ```
   */
  async findByMapping(
    formulario: FormularioType,
    modalidade: ModalidadeType
  ): Promise<EmailTemplate | null> {
    const startTime = Date.now();

    return await errorRecoveryService.executeWithRecovery(
      async () => {
        this.log(`Buscando template para formulário: ${formulario}, modalidade: ${modalidade}`);

        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .eq('vinculado_formulario', true)
          .eq('ativo', true)
          .eq('formulario', formulario)
          .eq('modalidade', modalidade)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          const dbError = EmailTemplateErrorFactory.createDatabaseError('busca de template por mapeamento', error);
          await auditLogger.logError('template_mapping_search', dbError, { formulario, modalidade });
          await adminNotificationService.notifyError(dbError, { formulario, modalidade });
          throw dbError;
        }

        const duration = Date.now() - startTime;
        const templateFound = data && data.length > 0;
        const template = templateFound ? mapSupabaseToEmailTemplate(data[0]) : null;

        // Log da operação
        await auditLogger.logTemplateSearch(
          formulario,
          modalidade,
          templateFound,
          template?.id,
          false,
          undefined,
          duration
        );

        if (!templateFound) {
          this.log(`Nenhum template encontrado para ${formulario} + ${modalidade}`, 'warn');
          return null;
        }

        this.log(`Template encontrado: ${template!.nome} (ID: ${template!.id})`);
        return template;
      },
      {
        operationName: 'findByMapping',
        params: { formulario, modalidade }
      }
    ).then(result => {
      if (!result.success && result.error) {
        throw result.error;
      }
      return result.result || null;
    });
  }

  /**
   * Valida se já existe um mapeamento para a combinação formulário + modalidade.
   * 
   * Este método verifica se já existe um template ativo com a mesma combinação
   * de formulário e modalidade. É útil para prevenir duplicação de mapeamentos.
   * 
   * @param formulario - Tipo do formulário ('book')
   * @param modalidade - Modalidade selecionada ('mensal')
   * @param excludeId - ID do template a ser excluído da validação (útil para edição)
   * @returns Promise que resolve para true se a combinação é única, false se já existe
   * 
   * @throws {EmailTemplateError} Quando há erro de banco de dados ou duplicação
   * 
   * @example
   * ```typescript
   * const isUnique = await emailTemplateMappingService.validateUniqueness(
   *   'book',
   *   'mensal',
   *   'template-id-to-excluir' // opcional
   * );
   * 
   * if (!isUnique) {
   *   console.error('Já existe um template para esta combinação');
   * }
   * ```
   */
  async validateUniqueness(
    formulario: FormularioType,
    modalidade: ModalidadeType,
    excludeId?: string
  ): Promise<boolean> {
    const startTime = Date.now();

    return await errorRecoveryService.executeWithRecovery(
      async () => {
        this.log(`Validando unicidade para ${formulario} + ${modalidade}${excludeId ? ` (excluindo ${excludeId})` : ''}`);

        let query = supabase
          .from('email_templates')
          .select('id')
          .eq('vinculado_formulario', true)
          .eq('ativo', true)
          .eq('formulario', formulario)
          .eq('modalidade', modalidade);

        // Se estamos editando um template, excluir ele da validação
        if (excludeId) {
          query = query.neq('id', excludeId);
        }

        const { data, error } = await query;

        if (error) {
          const dbError = EmailTemplateErrorFactory.createDatabaseError('validação de unicidade', error);
          await auditLogger.logError('mapping_validation', dbError, { formulario, modalidade, excludeId });
          await adminNotificationService.notifyError(dbError, { formulario, modalidade, excludeId });
          throw dbError;
        }

        const isUnique = !data || data.length === 0;
        const duration = Date.now() - startTime;

        // Log da validação
        await auditLogger.logOperation(
          'mapping_validation',
          'mapping',
          {
            formulario,
            modalidade,
            excludeId,
            isUnique,
            duplicateCount: data?.length || 0
          },
          isUnique ? 'success' : 'warning',
          undefined,
          undefined,
          duration
        );

        if (!isUnique) {
          const duplicateError = EmailTemplateErrorFactory.createDuplicateMappingError(
            formulario,
            modalidade,
            data?.[0]?.id
          );
          await auditLogger.logError('mapping_validation', duplicateError, { formulario, modalidade });
          // Não notificar admin para duplicatas - é um erro de usuário
        }

        this.log(`Validação de unicidade: ${isUnique ? 'ÚNICO' : 'DUPLICADO'}`);
        return isUnique;
      },
      {
        operationName: 'validateUniqueness',
        params: { formulario, modalidade, excludeId }
      }
    ).then(result => {
      if (!result.success && result.error) {
        throw result.error;
      }
      return result.result || false;
    });
  }

  /**
   * Lista todos os mapeamentos ativos no sistema.
   * 
   * Retorna uma lista completa de todos os mapeamentos configurados,
   * incluindo informações do template associado a cada mapeamento.
   * 
   * @returns Promise que resolve para array com todos os mapeamentos existentes
   * 
   * @throws {EmailTemplateError} Quando há erro de banco de dados
   * 
   * @example
   * ```typescript
   * const mappings = await emailTemplateMappingService.getMappingsList();
   * 
   * mappings.forEach(mapping => {
   *   console.log(`${mapping.formulario} + ${mapping.modalidade} → ${mapping.template?.nome}`);
   * });
   * ```
   */
  async getMappingsList(): Promise<EmailTemplateMapping[]> {
    const startTime = Date.now();

    return await errorRecoveryService.executeWithRecovery(
      async () => {
        this.log('Buscando lista de todos os mapeamentos');

        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .eq('vinculado_formulario', true)
          .eq('ativo', true)
          .not('formulario', 'is', null)
          .not('modalidade', 'is', null)
          .order('formulario', { ascending: true })
          .order('modalidade', { ascending: true });

        if (error) {
          const dbError = EmailTemplateErrorFactory.createDatabaseError('busca de lista de mapeamentos', error);
          await auditLogger.logError('template_search', dbError);
          await adminNotificationService.notifyError(dbError);
          throw dbError;
        }

        const mappings: EmailTemplateMapping[] = (data || [])
          .filter(item => item.formulario && item.modalidade)
          .map(item => ({
            formulario: item.formulario as 'book',
            modalidade: item.modalidade as 'mensal',
            templateId: item.id,
            template: mapSupabaseToEmailTemplate(item)
          }));

        const duration = Date.now() - startTime;

        // Log da operação
        await auditLogger.logOperation(
          'template_search',
          'mapping',
          {
            operation: 'getMappingsList',
            mappingsFound: mappings.length,
            totalRecords: data?.length || 0
          },
          'success',
          undefined,
          undefined,
          duration
        );

        this.log(`Encontrados ${mappings.length} mapeamentos ativos`);
        return mappings;
      },
      {
        operationName: 'getMappingsList',
        params: {}
      }
    ).then(result => {
      if (!result.success && result.error) {
        throw result.error;
      }
      return result.result || [];
    });
  }

  /**
   * Busca template com sistema de fallback aprimorado.
   * 
   * Este é o método principal recomendado para busca de templates, pois implementa
   * um sistema robusto de fallback que garante que sempre haverá um template disponível
   * (a menos que configurado para falhar).
   * 
   * Hierarquia de fallback:
   * 1. **Template específico**: Combinação exata de formulário + modalidade
   * 2. **Template padrão configurado**: Template configurado como padrão para o formulário
   * 3. **Template padrão do formulário**: Template com modalidade null para o formulário
   * 4. **Qualquer template ativo**: Qualquer template ativo do formulário (se configurado)
   * 5. **Template global de fallback**: Template configurado como fallback global
   * 6. **Nenhum template**: Retorna null ou erro (dependendo da configuração)
   * 
   * @param formulario - Tipo do formulário ('book')
   * @param modalidade - Modalidade selecionada ('mensal')
   * @returns Promise que resolve para resultado com template e informações de fallback
   * 
   * @throws {EmailTemplateError} Quando configurado para falhar e nenhum template é encontrado
   * 
   * @example
   * ```typescript
   * const result = await emailTemplateMappingService.findWithFallback(
   *   'book',
   *   'mensal'
   * );
   * 
   * console.log('Template:', result.template?.nome);
   * console.log('É padrão:', result.isDefault);
   * console.log('Mapeamento encontrado:', result.mappingFound);
   * console.log('Tipo de fallback:', result.fallbackType);
   * 
   * if (result.template) {
   *   // Usar template encontrado
   *   await sendEmailWithTemplate(result.template, emailData);
   * } else {
   *   // Tratar caso sem template
   *   console.error('Nenhum template disponível');
   * }
   * ```
   */
  async findWithFallback(
    formulario: FormularioType,
    modalidade: ModalidadeType
  ): Promise<TemplateMappingResult> {
    try {
      this.log(`Iniciando busca com fallback para ${formulario} + ${modalidade}`);

      // 1. Primeiro, tentar encontrar template específico
      const specificTemplate = await this.findByMapping(formulario, modalidade);

      if (specificTemplate) {
        this.log(`✅ Template específico encontrado: ${specificTemplate.nome}`);
        return {
          template: specificTemplate,
          isDefault: false,
          mappingFound: true,
          fallbackType: 'specific',
          fallbackReason: 'Template específico para a combinação formulário+modalidade encontrado'
        };
      }

      // Log que mapeamento específico não foi encontrado
      this.logMappingNotFound(formulario, modalidade);

      // Log de auditoria para mapeamento não encontrado
      await auditLogger.logTemplateSearch(
        formulario,
        modalidade,
        false,
        undefined,
        true,
        'fallback_initiated'
      );

      // 2. Tentar buscar template padrão configurado para o formulário
      const configuredDefaultId = emailTemplateFallbackConfigManager.getDefaultTemplate(formulario);
      if (configuredDefaultId) {
        this.log(`Tentando buscar template padrão configurado: ${configuredDefaultId}`);

        const configuredTemplate = await this.getTemplateById(configuredDefaultId);
        if (configuredTemplate) {
          this.logFallbackUsage(
            formulario,
            modalidade,
            'configured_default',
            configuredTemplate.nome,
            'Template padrão configurado para o formulário'
          );

          // Log de auditoria para fallback usado
          await auditLogger.logFallbackUsage(
            formulario,
            modalidade,
            'configured_default',
            configuredTemplate.id,
            configuredTemplate.nome,
            'Template padrão configurado para o formulário'
          );

          return {
            template: configuredTemplate,
            isDefault: true,
            mappingFound: false,
            fallbackType: 'configured_default',
            fallbackReason: `Template padrão configurado para ${formulario} usado como fallback`
          };
        } else {
          this.log(`⚠️ Template padrão configurado ${configuredDefaultId} não encontrado ou inativo`, 'warn');

          // Notificar admin sobre template configurado inválido
          await adminNotificationService.notifyConfigurationIssue(
            `defaultTemplate.${formulario}`,
            `Template padrão configurado ${configuredDefaultId} não encontrado ou inativo`,
            'Verificar se o template existe e está ativo, ou reconfigurar template padrão'
          );
        }
      }

      // 3. Buscar template padrão do formulário (modalidade null)
      this.log('Buscando template padrão do formulário (modalidade null)');

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('vinculado_formulario', true)
        .eq('ativo', true)
        .eq('formulario', formulario)
        .is('modalidade', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        this.log(`Erro ao buscar template padrão: ${error.message}`, 'error');
        throw new EmailTemplateError(
          'Erro ao buscar template padrão',
          'DATABASE_ERROR',
          error
        );
      }

      if (data && data.length > 0) {
        const defaultTemplate = mapSupabaseToEmailTemplate(data[0]);
        this.logFallbackUsage(
          formulario,
          modalidade,
          'form_default',
          defaultTemplate.nome,
          'Template padrão do formulário (modalidade null)'
        );

        // Log de auditoria para fallback usado
        await auditLogger.logFallbackUsage(
          formulario,
          modalidade,
          'form_default',
          defaultTemplate.id,
          defaultTemplate.nome,
          'Template padrão do formulário (modalidade null)'
        );

        return {
          template: defaultTemplate,
          isDefault: true,
          mappingFound: false,
          fallbackType: 'form_default',
          fallbackReason: `Template padrão do formulário ${formulario} (sem modalidade específica)`
        };
      }

      // 4. Se configurado, buscar qualquer template ativo para o formulário
      if (emailTemplateFallbackConfigManager.shouldUseAnyActiveTemplateAsFallback()) {
        this.log('Buscando qualquer template ativo do formulário');

        const { data: anyTemplate, error: anyError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('vinculado_formulario', true)
          .eq('ativo', true)
          .eq('formulario', formulario)
          .order('created_at', { ascending: false })
          .limit(1);

        if (anyError) {
          this.log(`Erro ao buscar qualquer template: ${anyError.message}`, 'error');
          throw new EmailTemplateError(
            'Erro ao buscar template de fallback',
            'DATABASE_ERROR',
            anyError
          );
        }

        if (anyTemplate && anyTemplate.length > 0) {
          const fallbackTemplate = mapSupabaseToEmailTemplate(anyTemplate[0]);
          this.logFallbackUsage(
            formulario,
            modalidade,
            'any_active',
            fallbackTemplate.nome,
            'Qualquer template ativo do formulário'
          );

          // Log de auditoria para fallback usado
          await auditLogger.logFallbackUsage(
            formulario,
            modalidade,
            'any_active',
            fallbackTemplate.id,
            fallbackTemplate.nome,
            'Qualquer template ativo do formulário'
          );

          return {
            template: fallbackTemplate,
            isDefault: true,
            mappingFound: false,
            fallbackType: 'any_active',
            fallbackReason: `Qualquer template ativo encontrado para ${formulario}`
          };
        }
      }

      // 5. Tentar template global de fallback se configurado
      const globalFallbackId = emailTemplateFallbackConfigManager.getGlobalFallbackTemplate();
      if (globalFallbackId) {
        this.log(`Tentando buscar template global de fallback: ${globalFallbackId}`);

        const globalTemplate = await this.getTemplateById(globalFallbackId);
        if (globalTemplate) {
          this.logFallbackUsage(
            formulario,
            modalidade,
            'global_fallback',
            globalTemplate.nome,
            'Template global de fallback'
          );

          // Log de auditoria para fallback usado
          await auditLogger.logFallbackUsage(
            formulario,
            modalidade,
            'global_fallback',
            globalTemplate.id,
            globalTemplate.nome,
            'Template global de fallback usado como último recurso'
          );

          return {
            template: globalTemplate,
            isDefault: true,
            mappingFound: false,
            fallbackType: 'global_fallback',
            fallbackReason: 'Template global de fallback usado como último recurso'
          };
        } else {
          this.log(`⚠️ Template global de fallback ${globalFallbackId} não encontrado ou inativo`, 'warn');

          // Notificar admin sobre template global inválido
          await adminNotificationService.notifyConfigurationIssue(
            'globalFallbackTemplate',
            `Template global de fallback ${globalFallbackId} não encontrado ou inativo`,
            'Verificar se o template existe e está ativo, ou reconfigurar template global'
          );
        }
      }

      // 6. Nenhum template encontrado - cadeia de fallback esgotada
      const noTemplateMessage = `Nenhum template encontrado para ${formulario} + ${modalidade}`;
      this.log(`❌ ${noTemplateMessage}`, 'error');

      const fallbackChainError = EmailTemplateErrorFactory.createFallbackChainExhaustedError(
        formulario,
        modalidade,
        ['specific', 'configured_default', 'form_default', 'any_active', 'global_fallback']
      );

      // Log crítico de cadeia de fallback esgotada
      await auditLogger.logError('template_search', fallbackChainError, { formulario, modalidade });

      // Notificar administradores sobre problema crítico
      await adminNotificationService.notifyError(fallbackChainError, { formulario, modalidade });

      if (emailTemplateFallbackConfigManager.shouldFailWhenNoTemplateFound()) {
        throw fallbackChainError;
      }

      return {
        template: null,
        isDefault: false,
        mappingFound: false,
        fallbackType: 'none',
        fallbackReason: 'Nenhum template encontrado em toda a hierarquia de fallback'
      };
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        // Re-log do erro se ainda não foi logado
        await auditLogger.logError('template_fallback_used', error, { formulario, modalidade });
        throw error;
      }

      const systemError = new EmailTemplateError(
        'Erro inesperado no sistema de fallback',
        'SYSTEM_ERROR',
        error,
        { formulario, modalidade }
      );

      this.log(`Erro inesperado no sistema de fallback: ${error}`, 'error');
      await auditLogger.logError('template_fallback_used', systemError, { formulario, modalidade });
      await adminNotificationService.notifyError(systemError, { formulario, modalidade });

      throw systemError;
    }
  }

  /**
   * Configura template padrão para um formulário específico.
   * 
   * Define qual template deve ser usado como fallback quando não há
   * mapeamento específico para uma combinação formulário + modalidade.
   * 
   * @param formulario - Tipo do formulário ('book')
   * @param templateId - ID do template a ser usado como padrão
   * @returns Promise que resolve para true se configurado com sucesso, false se template não existe
   * 
   * @example
   * ```typescript
   * const success = await emailTemplateMappingService.setDefaultTemplate(
   *   'book',
   *   'template-book-default-id'
   * );
   * 
   * if (success) {
   *   console.log('Template padrão configurado com sucesso');
   * } else {
   *   console.error('Template não encontrado ou inativo');
   * }
   * ```
   */
  async setDefaultTemplate(
    formulario: FormularioType,
    templateId: string
  ): Promise<boolean> {
    try {
      this.log(`Configurando template padrão para ${formulario}: ${templateId}`);

      // Verificar se o template existe e está ativo
      const template = await this.getTemplateById(templateId);
      if (!template) {
        this.log(`❌ Template ${templateId} não encontrado ou inativo`, 'error');
        return false;
      }

      // Configurar o template como padrão
      emailTemplateFallbackConfigManager.setDefaultTemplate(formulario, templateId);
      this.log(`✅ Template padrão configurado: ${formulario} → ${template.nome}`);

      return true;
    } catch (error) {
      this.log(`Erro ao configurar template padrão: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Configura template global de fallback.
   * 
   * Define um template que será usado como último recurso quando nenhum
   * outro template é encontrado na hierarquia de fallback.
   * 
   * @param templateId - ID do template a ser usado como fallback global
   * @returns Promise que resolve para true se configurado com sucesso, false se template não existe
   * 
   * @example
   * ```typescript
   * const success = await emailTemplateMappingService.setGlobalFallbackTemplate(
   *   'template-global-fallback-id'
   * );
   * 
   * if (success) {
   *   console.log('Template global de fallback configurado');
   * } else {
   *   console.error('Template não encontrado ou inativo');
   * }
   * ```
   */
  async setGlobalFallbackTemplate(templateId: string): Promise<boolean> {
    try {
      this.log(`Configurando template global de fallback: ${templateId}`);

      // Verificar se o template existe e está ativo
      const template = await this.getTemplateById(templateId);
      if (!template) {
        this.log(`❌ Template ${templateId} não encontrado ou inativo`, 'error');
        return false;
      }

      // Configurar o template como fallback global
      emailTemplateFallbackConfigManager.setGlobalFallbackTemplate(templateId);
      this.log(`✅ Template global de fallback configurado: ${template.nome}`);

      return true;
    } catch (error) {
      this.log(`Erro ao configurar template global de fallback: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Obtém configuração atual de fallback.
   * 
   * Retorna a configuração completa do sistema de fallback,
   * incluindo templates padrão, configurações de comportamento e logs.
   * 
   * @returns Configuração atual do sistema de fallback
   * 
   * @example
   * ```typescript
   * const config = emailTemplateMappingService.getFallbackConfig();
   * 
   * console.log('Templates padrão:', config.defaultTemplates);
   * console.log('Template global:', config.globalFallbackTemplate);
   * console.log('Logs habilitados:', config.enableLogging);
   * ```
   */
  getFallbackConfig(): EmailTemplateFallbackConfig {
    return emailTemplateFallbackConfigManager.getConfig();
  }

  /**
   * Atualiza configuração de fallback.
   * 
   * Permite atualizar parcialmente a configuração do sistema de fallback.
   * Apenas os campos fornecidos serão atualizados.
   * 
   * @param config - Nova configuração (parcial)
   * 
   * @example
   * ```typescript
   * emailTemplateMappingService.updateFallbackConfig({
   *   enableLogging: true,
   *   logFallbackUsage: true,
   *   useAnyActiveTemplateAsFallback: false
   * });
   * ```
   */
  updateFallbackConfig(config: Partial<EmailTemplateFallbackConfig>): void {
    emailTemplateFallbackConfigManager.updateConfig(config);
    this.log('Configuração de fallback atualizada');
  }

  /**
   * Verifica se um template específico existe e está ativo.
   * 
   * Método utilitário para verificar a existência e status de um template
   * específico pelo seu ID.
   * 
   * @param templateId - ID do template a ser verificado
   * @returns Promise que resolve para o template se encontrado e ativo, null caso contrário
   * 
   * @throws {EmailTemplateError} Quando há erro de banco de dados
   * 
   * @example
   * ```typescript
   * const template = await emailTemplateMappingService.getTemplateById('template-id');
   * 
   * if (template) {
   *   console.log(`Template encontrado: ${template.nome}`);
   *   console.log(`Status: ${template.ativo ? 'Ativo' : 'Inativo'}`);
   * } else {
   *   console.log('Template não encontrado ou inativo');
   * }
   * ```
   */
  async getTemplateById(templateId: string): Promise<EmailTemplate | null> {
    try {
      console.log(`Buscando template por ID: ${templateId}`);

      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .eq('ativo', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Template não encontrado
          console.log(`Template ${templateId} não encontrado`);
          return null;
        }
        console.error('Erro ao buscar template por ID:', error);
        throw new EmailTemplateError(
          'Erro ao buscar template por ID',
          'DATABASE_ERROR',
          error
        );
      }

      const template = mapSupabaseToEmailTemplate(data);
      console.log(`Template encontrado: ${template.nome}`);
      return template;
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        throw error;
      }
      console.error('Erro inesperado ao buscar template por ID:', error);
      throw new EmailTemplateError(
        'Erro inesperado ao buscar template por ID',
        'DATABASE_ERROR',
        error
      );
    }
  }
}

// Instância singleton do serviço
export const emailTemplateMappingService = new EmailTemplateMappingService();
