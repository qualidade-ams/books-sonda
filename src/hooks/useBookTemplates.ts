import { useState, useEffect } from 'react';
import { useEmailTemplates } from './useEmailTemplates';

export interface BookTemplateOption {
  value: string;
  label: string;
  description?: string;
  isDefault?: boolean;
}

/**
 * Hook especializado para templates de books
 * Combina templates padrão do sistema com templates personalizados
 */
export const useBookTemplates = () => {
  const { templates, loading: templatesLoading } = useEmailTemplates();
  const [bookTemplateOptions, setBookTemplateOptions] = useState<BookTemplateOption[]>([]);

  useEffect(() => {
    const options: BookTemplateOption[] = [];

    // Templates padrão removidos conforme solicitação

    // Adicionar templates personalizados ativos para books
    const bookTemplates = templates.filter(
      template =>
        template.ativo &&
        template.formulario === 'book'
    );

    bookTemplates.forEach(template => {
      options.push({
        value: template.id,
        label: template.nome,
        description: template.descricao || 'Template personalizado',
        isDefault: false
      });
    });

    setBookTemplateOptions(options);
  }, [templates]);

  /**
   * Busca um template específico por ID ou nome
   */
  const getTemplateById = (id: string): BookTemplateOption | null => {
    return bookTemplateOptions.find(option => option.value === id) || null;
  };

  /**
   * Verifica se um template é padrão do sistema
   */
  const isDefaultTemplate = (templateId: string): boolean => {
    return ['portugues', 'ingles'].includes(templateId);
  };

  /**
   * Busca templates personalizados apenas
   */
  const getCustomTemplates = (): BookTemplateOption[] => {
    return bookTemplateOptions.filter(option => !option.isDefault);
  };

  /**
   * Busca templates padrão apenas
   */
  const getDefaultTemplates = (): BookTemplateOption[] => {
    return bookTemplateOptions.filter(option => option.isDefault);
  };

  return {
    bookTemplateOptions,
    loading: templatesLoading,
    getTemplateById,
    isDefaultTemplate,
    getCustomTemplates,
    getDefaultTemplates
  };
};