import { useMemo } from 'react';
import { templateValidationService, type ValidationResult } from '@/services/templateValidationService';
import { useClientBooksVariables } from './useClientBooksVariables';
import { useEmailVariableMapping } from './useEmailVariableMapping';
import type { EmailTemplate } from '@/types/approval';
import type { ClientBooksTemplateData } from '@/utils/clientBooksVariableMapping';
import type { FormularioData } from '@/utils/emailVariableMapping';

interface UseTemplateValidationProps {
  template: EmailTemplate;
  dadosClientBooks?: ClientBooksTemplateData;
  dadosFormulario?: FormularioData;
}

interface UseTemplateValidationReturn {
  validacao: ValidationResult;
  isValid: boolean;
  hasWarnings: boolean;
  hasErrors: boolean;
  canSend: boolean;
  validationSummary: string;
}

/**
 * Hook para validação de templates de e-mail
 */
export const useTemplateValidation = ({
  template,
  dadosClientBooks,
  dadosFormulario
}: UseTemplateValidationProps): UseTemplateValidationReturn => {

  // Hooks para variáveis
  const { variaveis: variaveisClientBooks } = useClientBooksVariables({
    dadosTemplate: dadosClientBooks,
    usarDadosExemplo: !dadosClientBooks
  });

  const { variaveis: variaveisFormulario } = useEmailVariableMapping({
    dadosFormulario: dadosFormulario || {}
  });

  // Executar validação baseada no tipo de template
  const validacao = useMemo(() => {
    if (template.formulario === 'book') {
      // Validação para templates de books
      return templateValidationService.validarTemplateBooks(template, variaveisClientBooks || undefined);
    } else {
      // Validação para templates de formulários
      return templateValidationService.validarTemplateFormularios(template, variaveisFormulario || undefined);
    }
  }, [template, variaveisClientBooks, variaveisFormulario]);

  // Propriedades derivadas
  const isValid = validacao.valido;
  const hasWarnings = validacao.avisos.length > 0;
  const hasErrors = validacao.erros.length > 0;
  
  // Pode enviar se é válido e não tem erros críticos
  const canSend = isValid && !hasErrors && validacao.variaveisObrigatoriasAusentes.length === 0;

  // Resumo da validação
  const validationSummary = useMemo(() => {
    const parts: string[] = [];

    if (hasErrors) {
      parts.push(`${validacao.erros.length} erro(s)`);
    }

    if (hasWarnings) {
      parts.push(`${validacao.avisos.length} aviso(s)`);
    }

    if (validacao.variaveisNaoEncontradas.length > 0) {
      parts.push(`${validacao.variaveisNaoEncontradas.length} variável(is) não encontrada(s)`);
    }

    if (Object.keys(validacao.fallbacksAplicados).length > 0) {
      parts.push(`${Object.keys(validacao.fallbacksAplicados).length} fallback(s) aplicado(s)`);
    }

    if (parts.length === 0) {
      return 'Template válido';
    }

    return parts.join(', ');
  }, [validacao, hasErrors, hasWarnings]);

  return {
    validacao,
    isValid,
    hasWarnings,
    hasErrors,
    canSend,
    validationSummary
  };
};