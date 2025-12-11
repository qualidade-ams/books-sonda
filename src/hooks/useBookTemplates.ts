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

    // Lista de palavras-chave que indicam templates de elogios (para exclusão)
    const elogiosKeywords = ['elogios', 'elogio', 'praise', 'compliment'];
    
    // Lista de nomes válidos para templates de books (whitelist)
    const validBookTemplateNames = [
      'template book português',
      'template book inglês', 
      'template book novo nordisk',
      'template book samarco',
      'template book português',
      'template book inglês'
    ];

    // Adicionar templates personalizados ativos para books (filtrar rigorosamente)
    const bookTemplates = templates.filter(
      template => {
        // Verificar se contém palavras-chave de elogios
        const nomeTemplate = template.nome?.toLowerCase() || '';
        const isElogiosTemplate = elogiosKeywords.some(keyword => 
          nomeTemplate.includes(keyword)
        );
        
        // Se contém palavras de elogios, excluir imediatamente
        if (isElogiosTemplate) {
          console.warn('🚨 Template de elogios BLOQUEADO:', template.nome);
          return false;
        }
        
        // Verificar se é um template válido para books
        const isValidBookTemplate = template.ativo &&
          (template.tipo === 'book' || !template.tipo) && // Aceitar tipo 'book' ou sem tipo (compatibilidade)
          template.tipo !== 'elogios' && // Nunca aceitar tipo 'elogios'
          (template.formulario === 'book' || !template.formulario); // Compatibilidade com templates antigos
        
        // Log para debug
        if (isValidBookTemplate) {
          console.log('✅ Template válido para books:', template.nome);
        }
        
        return isValidBookTemplate;
      }
    );

    // ✅ DEBUG: Log para identificar duplicação
    console.log('📧 Templates encontrados:', templates);
    console.log('📧 Templates de elogios encontrados:', templates.filter(t => t.tipo === 'elogios'));
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
      // Verificação adicional para garantir que não é template de elogios
      const isElogiosTemplate = template.nome?.toLowerCase().includes('elogios') || 
                               template.nome?.toLowerCase().includes('elogio') ||
                               template.tipo === 'elogios';
      
      if (isElogiosTemplate) {
        console.warn(`🚨 Template de elogios bloqueado: ${template.nome}`);
        return; // Pular este template
      }
      
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
    console.log('📧 Opções finais de templates para books:', options);
    
    // Debug: verificar se há templates de elogios nas opções finais
    const templatesElogiosNasOpcoes = options.filter(option => 
      option.label?.toLowerCase().includes('elogios') || 
      option.label?.toLowerCase().includes('elogio')
    );
    
    if (templatesElogiosNasOpcoes.length > 0) {
      console.error('🚨 ERRO: Templates de elogios encontrados nas opções de books:', templatesElogiosNasOpcoes);
    }
    
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