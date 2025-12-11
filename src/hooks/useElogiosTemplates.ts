import { useState, useEffect } from 'react';
import { useEmailTemplates } from './useEmailTemplates';

export interface ElogiosTemplateOption {
  value: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

/**
 * Hook especializado para templates de elogios
 * Filtra apenas templates do tipo 'elogios'
 */
export const useElogiosTemplates = () => {
  const { templates, loading: templatesLoading } = useEmailTemplates();
  const [elogiosTemplateOptions, setElogiosTemplateOptions] = useState<ElogiosTemplateOption[]>([]);

  useEffect(() => {
    console.log('🎨 [useElogiosTemplates] Processando templates:', {
      totalTemplates: templates.length,
      templates: templates.map(t => ({ nome: t.nome, tipo: t.tipo, ativo: t.ativo }))
    });
    
    const options: ElogiosTemplateOption[] = [];

    // Filtrar apenas templates ativos do tipo 'elogios'
    const elogiosTemplates = templates.filter(
      template =>
        template.ativo &&
        template.tipo === 'elogios'
    );

    console.log('📧 Templates de elogios encontrados:', elogiosTemplates);

    // Adicionar template padrão APENAS se não existir NENHUM template personalizado de elogios
    const hasAnyCustomTemplate = elogiosTemplates.length > 0;
    
    if (!hasAnyCustomTemplate) {
      options.push({
        value: 'template_elogios_padrao',
        label: 'Template Elogios (Padrão)',
        description: 'Template padrão para relatórios de elogios mensais',
        isDefault: true
      });
      console.log('📧 Template padrão adicionado (nenhum template personalizado encontrado)');
    } else {
      console.log('📧 Template padrão não adicionado (templates personalizados existem):', elogiosTemplates.length);
    }

    // Adicionar templates personalizados
    elogiosTemplates.forEach(template => {
      options.push({
        value: template.id,
        label: template.nome,
        description: template.descricao || 'Template personalizado de elogios',
        isDefault: false
      });
    });

    console.log('📧 Opções de templates de elogios:', options);
    setElogiosTemplateOptions(options);
  }, [templates]);

  /**
   * Busca um template específico por ID
   */
  const getTemplateById = (id: string): ElogiosTemplateOption | null => {
    return elogiosTemplateOptions.find(option => option.value === id) || null;
  };

  /**
   * Verifica se um template é padrão do sistema
   */
  const isDefaultTemplate = (templateId: string): boolean => {
    return templateId === 'template_elogios_padrao';
  };

  /**
   * Busca templates personalizados apenas
   */
  const getCustomTemplates = (): ElogiosTemplateOption[] => {
    return elogiosTemplateOptions.filter(option => !option.isDefault);
  };

  /**
   * Busca templates padrão apenas
   */
  const getDefaultTemplates = (): ElogiosTemplateOption[] => {
    return elogiosTemplateOptions.filter(option => option.isDefault);
  };

  return {
    elogiosTemplateOptions,
    loading: templatesLoading,
    getTemplateById,
    isDefaultTemplate,
    getCustomTemplates,
    getDefaultTemplates
  };
};