import { emailTemplateMappingService, EmailTemplateError } from '@/services/emailTemplateMappingService';
import type { FormularioType, ModalidadeType } from '@/types/formTypes';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
}

export interface MappingValidationOptions {
  formulario: FormularioType;
  modalidade: ModalidadeType;
  excludeId?: string;
}

/**
 * Valida se um mapeamento de template é único
 * @param options - Opções de validação incluindo formulário, modalidade e ID a excluir
 * @returns Resultado da validação com status e mensagem de erro se aplicável
 */
export const validateMappingUniqueness = async (
  options: MappingValidationOptions
): Promise<ValidationResult> => {
  try {
    const { formulario, modalidade, excludeId } = options;

    // Validar parâmetros obrigatórios
    if (!formulario || !modalidade) {
      return {
        isValid: false,
        error: 'Formulário e modalidade são obrigatórios',
        code: 'MISSING_PARAMETERS'
      };
    }

    // Validar valores permitidos
    const validFormularios = ['book'];
    const validModalidades = ['mensal'];

    if (!validFormularios.includes(formulario)) {
      return {
        isValid: false,
        error: 'Formulário inválido. Valores permitidos: book',
        code: 'INVALID_FORMULARIO'
      };
    }

    if (!validModalidades.includes(modalidade)) {
      return {
        isValid: false,
        error: 'Modalidade inválida. Valores permitidos: mensal',
        code: 'INVALID_MODALIDADE'
      };
    }

    // Verificar unicidade no banco de dados
    const isUnique = await emailTemplateMappingService.validateUniqueness(
      formulario,
      modalidade,
      excludeId
    );

    if (!isUnique) {
      const formularioLabel = formulario === 'book' ? 'Book' : 'Books';
      const modalidadeLabel = modalidade === 'mensal' ? 'Mensal' : 'Anual';
      
      return {
        isValid: false,
        error: `Já existe um template para ${formularioLabel} + ${modalidadeLabel}`,
        code: 'DUPLICATE_MAPPING'
      };
    }

    return {
      isValid: true
    };
  } catch (error) {
    console.error('Erro ao validar unicidade do mapeamento:', error);
    
    if (error instanceof EmailTemplateError) {
      return {
        isValid: false,
        error: error.message,
        code: error.code
      };
    }

    return {
      isValid: false,
      error: 'Erro interno ao validar mapeamento',
      code: 'INTERNAL_ERROR'
    };
  }
};

/**
 * Valida múltiplos mapeamentos de uma vez
 * @param mappings - Array de mapeamentos para validar
 * @returns Array de resultados de validação
 */
export const validateMultipleMappings = async (
  mappings: MappingValidationOptions[]
): Promise<ValidationResult[]> => {
  const results: ValidationResult[] = [];
  
  for (const mapping of mappings) {
    const result = await validateMappingUniqueness(mapping);
    results.push(result);
  }
  
  return results;
};

/**
 * Valida se uma combinação de formulário e modalidade é válida
 * @param formulario - Tipo do formulário
 * @param modalidade - Modalidade selecionada
 * @returns Resultado da validação
 */
export const validateMappingCombination = (
  formulario: FormularioType,
  modalidade: ModalidadeType
): ValidationResult => {
  const validFormularios = ['book'];
  const validModalidades = ['mensal'];

  if (!formulario || !modalidade) {
    return {
      isValid: false,
      error: 'Formulário e modalidade são obrigatórios',
      code: 'MISSING_PARAMETERS'
    };
  }

  if (!validFormularios.includes(formulario)) {
    return {
      isValid: false,
      error: 'Formulário inválido',
      code: 'INVALID_FORMULARIO'
    };
  }

  if (!validModalidades.includes(modalidade)) {
    return {
      isValid: false,
      error: 'Modalidade inválida',
      code: 'INVALID_MODALIDADE'
    };
  }

  return {
    isValid: true
  };
};

/**
 * Obtém mensagem de erro amigável baseada no código de erro
 * @param code - Código do erro
 * @returns Mensagem de erro amigável
 */
export const getValidationErrorMessage = (code: string): string => {
  const errorMessages: Record<string, string> = {
    'MISSING_PARAMETERS': 'Formulário e modalidade são obrigatórios',
    'INVALID_FORMULARIO': 'Selecione um formulário válido',
    'INVALID_MODALIDADE': 'Selecione uma modalidade válida',
    'DUPLICATE_MAPPING': 'Já existe um template para esta combinação',
    'DATABASE_ERROR': 'Erro ao acessar o banco de dados',
    'INTERNAL_ERROR': 'Erro interno do sistema'
  };

  return errorMessages[code] || 'Erro de validação desconhecido';
};