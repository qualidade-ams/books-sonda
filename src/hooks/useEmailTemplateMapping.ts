import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import { EmailTemplate, EmailTemplateMapping, TemplateMappingResult, emailTemplateMappingService } from '@/services/emailTemplateMappingService';
import { EmailTemplateError } from '@/errors/EmailTemplateError';
import type { FormularioType, ModalidadeType } from '@/types/formTypes';
import { useToast } from '@/hooks/use-toast';

// Context para identificação automática de formulário e modalidade
export interface FormContext {
  formulario?: FormularioType;
  modalidade?: ModalidadeType;
}

const FormContextProvider = createContext<FormContext>({});

interface FormContextProviderProps {
  children: ReactNode;
  formulario?: FormularioType;
  modalidade?: ModalidadeType;
}

// FormContext provider component
export const FormContextProviderComponent: React.FC<FormContextProviderProps> = ({
  children,
  formulario,
  modalidade
}) => {
  const contextValue: FormContext = {
    formulario,
    modalidade
  };

  return React.createElement(
    FormContextProvider.Provider,
    { value: contextValue },
    children
  );
};

export interface UseEmailTemplateMappingReturn {
  // Estado
  loading: boolean;
  mappings: EmailTemplateMapping[];

  // Métodos principais
  findByMapping: (formulario?: FormularioType, modalidade?: ModalidadeType) => Promise<EmailTemplate | null>;
  findWithFallback: (formulario?: FormularioType, modalidade?: ModalidadeType) => Promise<TemplateMappingResult>;
  validateUniqueness: (formulario: FormularioType, modalidade: ModalidadeType, excludeId?: string) => Promise<boolean>;
  getMappingsList: () => Promise<EmailTemplateMapping[]>;
  getTemplateById: (templateId: string) => Promise<EmailTemplate | null>;

  // Métodos de contexto automático
  findTemplateFromContext: () => Promise<EmailTemplate | null>;
  findTemplateFromContextWithFallback: () => Promise<TemplateMappingResult>;

  // Métodos de cache
  refreshMappings: () => Promise<void>;
  clearCache: () => void;
  invalidateCache: () => void;

  // Utilitários
  getFormularioLabel: (formulario: FormularioType) => string;
  getModalidadeLabel: (modalidade: ModalidadeType) => string;
  getCurrentContext: () => FormContext;

  // Configuração de fallback
  setDefaultTemplate: (formulario: FormularioType, templateId: string) => Promise<boolean>;
  setGlobalFallbackTemplate: (templateId: string) => Promise<boolean>;
  getFallbackConfig: () => any;
  updateFallbackConfig: (config: any) => void;
}

// Cache local para evitar consultas repetidas durante a sessão
let mappingsCache: EmailTemplateMapping[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useEmailTemplateMapping = (): UseEmailTemplateMappingReturn => {
  const [loading, setLoading] = useState(false);
  const [mappings, setMappings] = useState<EmailTemplateMapping[]>([]);
  const { toast } = useToast();
  const formContext = useContext(FormContextProvider);

  // Verificar se o cache ainda é válido
  const isCacheValid = useCallback(() => {
    return mappingsCache !== null &&
      cacheTimestamp !== null &&
      (Date.now() - cacheTimestamp) < CACHE_DURATION;
  }, []);

  // Buscar template específico por formulário e modalidade
  const findByMapping = useCallback(async (
    formulario?: FormularioType,
    modalidade?: ModalidadeType
  ): Promise<EmailTemplate | null> => {
    try {
      // Se não fornecidos, usar do contexto
      const finalFormulario = formulario || formContext.formulario;
      const finalModalidade = modalidade || formContext.modalidade;

      if (!finalFormulario || !finalModalidade) {
        console.warn('Formulário ou modalidade não fornecidos e não disponíveis no contexto');
        return null;
      }

      setLoading(true);
      const template = await emailTemplateMappingService.findByMapping(finalFormulario, finalModalidade);
      return template;
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        toast({
          title: "Erro ao buscar template",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao buscar o template",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, formContext]);

  // Buscar template com sistema de fallback
  const findWithFallback = useCallback(async (
    formulario?: FormularioType,
    modalidade?: ModalidadeType
  ): Promise<TemplateMappingResult> => {
    try {
      // Se não fornecidos, usar do contexto
      const finalFormulario = formulario || formContext.formulario;
      const finalModalidade = modalidade || formContext.modalidade;

      if (!finalFormulario || !finalModalidade) {
        console.warn('Formulário ou modalidade não fornecidos e não disponíveis no contexto');
        return { template: null, isDefault: false, mappingFound: false };
      }

      setLoading(true);
      const result = await emailTemplateMappingService.findWithFallback(finalFormulario, finalModalidade);

      // Mostrar toast informativo sobre o tipo de template usado
      if (result.template) {
        if (!result.mappingFound && result.isDefault) {
          const fallbackMessage = getFallbackMessage(result.fallbackType, finalFormulario, finalModalidade);
          toast({
            title: "Sistema de fallback usado",
            description: fallbackMessage,
            variant: result.fallbackType === 'none' ? "destructive" : "default",
          });
        }
      } else if (result.fallbackType === 'none') {
        toast({
          title: "Nenhum template encontrado",
          description: result.fallbackReason || "Não foi possível encontrar template para esta combinação",
          variant: "destructive",
        });
      }

      return result;
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        toast({
          title: "Erro ao buscar template",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao buscar o template",
          variant: "destructive",
        });
      }
      return { template: null, isDefault: false, mappingFound: false };
    } finally {
      setLoading(false);
    }
  }, [toast, formContext]);

  // Helper para gerar mensagem de fallback
  const getFallbackMessage = (
    fallbackType?: string,
    formulario?: string,
    modalidade?: string
  ): string => {
    const formLabel = getFormularioLabel(formulario as any);
    const modalLabel = getModalidadeLabel(modalidade as any);

    switch (fallbackType) {
      case 'configured_default':
        return `Usando template padrão configurado para ${formLabel}`;
      case 'form_default':
        return `Usando template padrão do formulário ${formLabel}`;
      case 'any_active':
        return `Usando template ativo disponível para ${formLabel}`;
      case 'global_fallback':
        return `Usando template global de fallback`;
      case 'none':
        return `Nenhum template encontrado para ${formLabel} + ${modalLabel}`;
      default:
        return `Template padrão usado para ${formLabel} + ${modalLabel}`;
    }
  };

  // Validar unicidade de mapeamento
  const validateUniqueness = useCallback(async (
    formulario: FormularioType,
    modalidade: ModalidadeType,
    excludeId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const isUnique = await emailTemplateMappingService.validateUniqueness(formulario, modalidade, excludeId);

      if (!isUnique) {
        toast({
          title: "Mapeamento duplicado",
          description: `Já existe um template para ${getFormularioLabel(formulario)} + ${getModalidadeLabel(modalidade)}`,
          variant: "destructive",
        });
      }

      return isUnique;
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        toast({
          title: "Erro ao validar mapeamento",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao validar o mapeamento",
          variant: "destructive",
        });
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Listar todos os mapeamentos
  const getMappingsList = useCallback(async (): Promise<EmailTemplateMapping[]> => {
    try {
      setLoading(true);

      // Verificar cache primeiro
      if (isCacheValid()) {
        console.log('Usando mapeamentos do cache');
        setMappings(mappingsCache!);
        return mappingsCache!;
      }

      console.log('Buscando mapeamentos do servidor');
      const mappingsList = await emailTemplateMappingService.getMappingsList();

      // Atualizar cache
      mappingsCache = mappingsList;
      cacheTimestamp = Date.now();

      setMappings(mappingsList);
      return mappingsList;
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        toast({
          title: "Erro ao listar mapeamentos",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao listar os mapeamentos",
          variant: "destructive",
        });
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast, isCacheValid]);

  // Buscar template por ID
  const getTemplateById = useCallback(async (templateId: string): Promise<EmailTemplate | null> => {
    try {
      setLoading(true);
      const template = await emailTemplateMappingService.getTemplateById(templateId);
      return template;
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        toast({
          title: "Erro ao buscar template",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao buscar o template",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Atualizar cache de mapeamentos
  const refreshMappings = useCallback(async (): Promise<void> => {
    console.log('Atualizando cache de mapeamentos');
    clearCache();
    await getMappingsList();
  }, [getMappingsList]);

  // Limpar cache
  const clearCache = useCallback((): void => {
    console.log('Limpando cache de mapeamentos');
    mappingsCache = null;
    cacheTimestamp = null;
    setMappings([]);
  }, []);

  // Invalidar cache (alias para clearCache para melhor semântica)
  const invalidateCache = useCallback((): void => {
    console.log('Invalidando cache de mapeamentos');
    clearCache();
  }, [clearCache]);

  // Buscar template usando apenas o contexto atual
  const findTemplateFromContext = useCallback(async (): Promise<EmailTemplate | null> => {
    if (!formContext.formulario || !formContext.modalidade) {
      console.warn('Contexto de formulário incompleto:', formContext);
      toast({
        title: "Contexto incompleto",
        description: "Não foi possível identificar o formulário e modalidade do contexto atual",
        variant: "destructive",
      });
      return null;
    }

    console.log(`Buscando template do contexto: ${formContext.formulario} + ${formContext.modalidade}`);
    return await findByMapping(formContext.formulario, formContext.modalidade);
  }, [formContext, findByMapping, toast]);

  // Buscar template com fallback usando apenas o contexto atual
  const findTemplateFromContextWithFallback = useCallback(async (): Promise<TemplateMappingResult> => {
    if (!formContext.formulario || !formContext.modalidade) {
      console.warn('Contexto de formulário incompleto:', formContext);
      toast({
        title: "Contexto incompleto",
        description: "Não foi possível identificar o formulário e modalidade do contexto atual",
        variant: "destructive",
      });
      return { template: null, isDefault: false, mappingFound: false };
    }

    console.log(`Buscando template com fallback do contexto: ${formContext.formulario} + ${formContext.modalidade}`);
    return await findWithFallback(formContext.formulario, formContext.modalidade);
  }, [formContext, findWithFallback, toast]);

  // Obter contexto atual
  const getCurrentContext = useCallback((): FormContext => {
    return { ...formContext };
  }, [formContext]);

  // Utilitários para labels
  const getFormularioLabel = useCallback((formulario: FormularioType): string => {
    switch (formulario) {
      case 'book': return 'Book';
      default: return formulario;
    }
  }, []);

  const getModalidadeLabel = useCallback((modalidade: ModalidadeType): string => {
    switch (modalidade) {
      case 'mensal': return 'Mensal';
      default: return modalidade;
    }
  }, []);

  return {
    // Estado
    loading,
    mappings,

    // Métodos principais
    findByMapping,
    findWithFallback,
    validateUniqueness,
    getMappingsList,
    getTemplateById,

    // Métodos de contexto automático
    findTemplateFromContext,
    findTemplateFromContextWithFallback,

    // Métodos de cache
    refreshMappings,
    clearCache,
    invalidateCache,

    // Utilitários
    getFormularioLabel,
    getModalidadeLabel,
    getCurrentContext,

    // Configuração de fallback
    setDefaultTemplate: emailTemplateMappingService.setDefaultTemplate.bind(emailTemplateMappingService),
    setGlobalFallbackTemplate: emailTemplateMappingService.setGlobalFallbackTemplate.bind(emailTemplateMappingService),
    getFallbackConfig: emailTemplateMappingService.getFallbackConfig.bind(emailTemplateMappingService),
    updateFallbackConfig: emailTemplateMappingService.updateFallbackConfig.bind(emailTemplateMappingService)
  };
};