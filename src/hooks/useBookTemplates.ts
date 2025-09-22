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

    // Adicionar templates personalizados ativos para books
    const bookTemplates = templates.filter(
      template =>
        template.ativo &&
        template.formulario === 'book'
    );

    // ✅ DEBUG: Log para identificar duplicação
    console.log('📧 Templates encontrados:', templates);
    console.log('📧 Templates filtrados para books:', bookTemplates);

    // ✅ CORREÇÃO: Priorizar templates personalizados sobre padrão
    const templateNames = new Set<string>();
    const customTemplateNames = new Set<string>();
    
    // Primeiro, identificar quais templates personalizados existem
    bookTemplates.forEach(template => {
      customTemplateNames.add(template.nome);
    });

    // Adicionar templates padrão APENAS se não existir template personalizado com o mesmo nome
    if (!customTemplateNames.has('Template Book Português')) {
      options.push({
        value: 'portugues',
        label: 'Template Book Português',
        description: 'Template Book Mensal',
        isDefault: true
      });
      templateNames.add('Template Book Português');
    }

    if (!customTemplateNames.has('Template Book Inglês')) {
      options.push({
        value: 'ingles',
        label: 'Template Book Inglês',
        description: 'Template Book Mensal',
        isDefault: true
      });
      templateNames.add('Template Book Inglês');
    }

    // Adicionar templates personalizados (sempre têm prioridade)
    bookTemplates.forEach(template => {
      if (!templateNames.has(template.nome)) {
        templateNames.add(template.nome);
        options.push({
          value: template.id,
          label: template.nome,
          description: template.descricao || 'Template personalizado',
          isDefault: false
        });
      } else {
        console.warn(`⚠️ Template duplicado ignorado: ${template.nome}`);
      }
    });

    console.log('📧 Templates personalizados encontrados:', Array.from(customTemplateNames));
    console.log('📧 Opções finais de templates:', options);
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