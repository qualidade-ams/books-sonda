import { useMemo, useEffect, useState } from 'react';
import { 
  FormularioData, 
  VariaveisCalculadas,
  mapearVariaveisTemplate,
  substituirVariaveisTemplate,
  validarVariaveisTemplate
} from '@/utils/emailVariableMapping';

interface UseEmailVariableMappingProps {
  dadosFormulario: FormularioData;
}

interface UseEmailVariableMappingReturn {
  variaveis: VariaveisCalculadas | null;
  loading: boolean;
  processarTemplate: (template: string) => string;
  validarTemplate: (template: string) => { valido: boolean; variaveisNaoEncontradas: string[] };
  dadosCalculados: {
    valorLUMensal: number;
    valorMAMensal: number;
    valorSPMensal: number;
    valorTotalMensal: number;
    valorSaasMensal: number;
    valorSaasEDMensal: number;
    valorTotalMensalSaas: number;
  };
}

/**
 * Hook para gerenciar mapeamento de variáveis em templates de email
 */
export const useEmailVariableMapping = ({ 
  dadosFormulario 
}: UseEmailVariableMappingProps): UseEmailVariableMappingReturn => {
  
  // Mapear variáveis baseado nos dados do formulário
  const variaveis = useMemo(() => {
    const variaveisMapeadas = mapearVariaveisTemplate(dadosFormulario);
    
    return variaveisMapeadas;
  }, [dadosFormulario]);

  // Calcular valores numéricos para uso interno
  const dadosCalculados = useMemo(() => {
    const valorLicencaUso = dadosFormulario.valorLicencaUso || 0;
    const valorManutencao = dadosFormulario.valorManutencao || 0;
    const valorSuporte = dadosFormulario.valorSuporte || 0;
    const valorSaas = dadosFormulario.valorSaas || 0;
    const valorSaasED = dadosFormulario.valorSaasED || 0;
    const tempoContrato = dadosFormulario.tempoContrato || 1;

    const valorLUMensal = valorLicencaUso / tempoContrato;
    const valorMAMensal = valorManutencao / tempoContrato;
    const valorSPMensal = valorSuporte / tempoContrato;
    const valorTotalMensal = valorMAMensal + valorSPMensal; // Total = MA + SP (sem LU)
    
    // Valores SaaS mensais
    const valorSaasMensal = valorSaas / tempoContrato;
    const valorSaasEDMensal = valorSaasED / tempoContrato;
    const valorTotalMensalSaas = valorSaasMensal + valorSPMensal; // valorSSMensal + valorSPMensal

    return {
      valorLUMensal,
      valorMAMensal,
      valorSPMensal,
      valorTotalMensal,
      valorSaasMensal,
      valorSaasEDMensal,
      valorTotalMensalSaas
    };
  }, [dadosFormulario]);

  // Função para processar template substituindo variáveis
  const processarTemplate = (template: string): string => {
    return substituirVariaveisTemplate(template, variaveis);
  };

  // Função para validar template
  const validarTemplate = (template: string) => {
    return validarVariaveisTemplate(template, variaveis);
  };

  return {
    variaveis,
    loading: false, // Adicionando a propriedade loading que estava faltando
    processarTemplate,
    validarTemplate,
    dadosCalculados
  };
};

export type { FormularioData };
