import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  validateMappingUniqueness, 
  validateMappingCombination,
  type ValidationResult,
  type MappingValidationOptions 
} from '@/utils/templateMappingValidation';
import { useToast } from '@/hooks/use-toast';
import type { FormularioType, ModalidadeType } from '@/types/formTypes';

/**
 * Opções de configuração para o hook useTemplateMappingValidation
 */
export interface UseTemplateMappingValidationOptions {
  /** Se deve mostrar toasts para erros de validação */
  showToasts?: boolean;
  /** Delay em ms para validação em tempo real (debounce) */
  validationDelay?: number;
  /** Se deve validar automaticamente quando os valores mudam */
  autoValidate?: boolean;
}

/**
 * Valor de retorno do hook useTemplateMappingValidation
 */
export interface UseTemplateMappingValidationReturn {
  /** Estado atual da validação */
  validationState: ValidationResult;
  /** Se está validando no momento */
  isValidating: boolean;
  /** Histórico de validações realizadas */
  validationHistory: ValidationResult[];
  
  /** Valida um mapeamento específico */
  validateMapping: (options: MappingValidationOptions) => Promise<ValidationResult>;
  /** Valida apenas a combinação formulário + modalidade */
  validateCombination: (formulario: FormularioType, modalidade: ModalidadeType) => ValidationResult;
  /** Limpa o estado de validação */
  clearValidation: () => void;
  /** Revalida com os últimos parâmetros usados */
  revalidate: () => Promise<void>;
  
  /** Utilitários */
  hasError: boolean;
  errorMessage: string | undefined;
  errorCode: string | undefined;
}

/**
 * Hook React para validação de mapeamentos de templates em tempo real.
 * 
 * Fornece funcionalidades completas de validação para mapeamentos entre
 * formulários, modalidades e templates, incluindo validação de unicidade
 * e combinações válidas.
 * 
 * @param options - Opções de configuração do hook
 * @returns Objeto com estado de validação e métodos de validação
 * 
 * @example
 * ```typescript
 * function TemplateForm() {
 *   const {
 *     validateMapping,
 *     validationState,
 *     isValidating,
 *     hasError,
 *     errorMessage
 *   } = useTemplateMappingValidation({
 *     showToasts: true,
 *     autoValidate: true,
 *     validationDelay: 500
 *   });
 * 
 *   const handleValidation = async () => {
 *     const result = await validateMapping({
 *       formulario: 'comply_fiscal',
 *       modalidade: 'on-premise',
 *       templateId: 'new-template-id'
 *     });
 * 
 *     if (result.isValid) {
 *       console.log('Mapeamento válido');
 *     } else {
 *       console.error('Erro:', result.error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       {isValidating && <p>Validando...</p>}
 *       {hasError && <p className="error">{errorMessage}</p>}
 *       <button onClick={handleValidation}>Validar</button>
 *     </div>
 *   );
 * }
 * ```
 */
export const useTemplateMappingValidation = (
  options: UseTemplateMappingValidationOptions = {}
): UseTemplateMappingValidationReturn => {
  const {
    showToasts = true,
    validationDelay = 500,
    autoValidate = true
  } = options;

  const { toast } = useToast();
  
  const [validationState, setValidationState] = useState<ValidationResult>({
    isValid: true
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationHistory, setValidationHistory] = useState<ValidationResult[]>([]);
  const [lastValidationParams, setLastValidationParams] = useState<MappingValidationOptions | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar timeout quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const validateMapping = useCallback(async (
    mappingOptions: MappingValidationOptions
  ): Promise<ValidationResult> => {
    setIsValidating(true);
    setLastValidationParams(mappingOptions);

    try {
      console.log('Validando mapeamento:', mappingOptions);
      
      // Primeiro validar a combinação localmente
      const combinationResult = validateMappingCombination(
        mappingOptions.formulario,
        mappingOptions.modalidade
      );

      if (!combinationResult.isValid) {
        setValidationState(combinationResult);
        setValidationHistory(prev => [...prev, combinationResult]);
        
        if (showToasts) {
          toast({
            title: "Erro de validação",
            description: combinationResult.error,
            variant: "destructive",
          });
        }
        
        return combinationResult;
      }

      // Se a combinação é válida, validar unicidade no banco
      const uniquenessResult = await validateMappingUniqueness(mappingOptions);
      
      setValidationState(uniquenessResult);
      setValidationHistory(prev => [...prev, uniquenessResult]);

      if (!uniquenessResult.isValid && showToasts) {
        toast({
          title: "Mapeamento duplicado",
          description: uniquenessResult.error,
          variant: "destructive",
        });
      }

      console.log('Resultado da validação:', uniquenessResult);
      return uniquenessResult;
    } catch (error) {
      console.error('Erro durante validação:', error);
      
      const errorResult: ValidationResult = {
        isValid: false,
        error: 'Erro interno durante validação',
        code: 'VALIDATION_ERROR'
      };
      
      setValidationState(errorResult);
      setValidationHistory(prev => [...prev, errorResult]);
      
      if (showToasts) {
        toast({
          title: "Erro de validação",
          description: "Ocorreu um erro durante a validação",
          variant: "destructive",
        });
      }
      
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [showToasts, toast]);

  const validateCombination = useCallback((formulario: FormularioType, modalidade: ModalidadeType): ValidationResult => {
    console.log('Validando combinação:', { formulario, modalidade });
    
    const result = validateMappingCombination(formulario, modalidade);
    
    // Atualizar estado apenas se for uma validação de combinação simples
    if (!result.isValid) {
      setValidationState(result);
      setValidationHistory(prev => [...prev, result]);
    }
    
    return result;
  }, []);

  const clearValidation = useCallback(() => {
    console.log('Limpando estado de validação');
    
    setValidationState({ isValid: true });
    setValidationHistory([]);
    setLastValidationParams(null);
    
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
      validationTimeoutRef.current = null;
    }
  }, []);

  const revalidate = useCallback(async (): Promise<void> => {
    if (!lastValidationParams) {
      console.warn('Nenhuma validação anterior para repetir');
      return;
    }

    console.log('Revalidando com opções:', lastValidationParams);
    await validateMapping(lastValidationParams);
  }, [lastValidationParams, validateMapping]);

  // Função para validação com debounce (útil para validação em tempo real)
  const validateWithDelay = useCallback((
    mappingOptions: MappingValidationOptions
  ): Promise<ValidationResult> => {
    return new Promise((resolve) => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      const timeout = setTimeout(async () => {
        const result = await validateMapping(mappingOptions);
        resolve(result);
      }, validationDelay);

      validationTimeoutRef.current = timeout;
    });
  }, [validateMapping, validationDelay]);

  // Propriedades computadas
  const hasError = !validationState.isValid;
  const errorMessage = validationState.error;
  const errorCode = validationState.code;

  return {
    // Estado
    validationState,
    isValidating,
    validationHistory,
    
    // Métodos
    validateMapping: autoValidate ? validateWithDelay : validateMapping,
    validateCombination,
    clearValidation,
    revalidate,
    
    // Propriedades computadas
    hasError,
    errorMessage,
    errorCode
  };
};