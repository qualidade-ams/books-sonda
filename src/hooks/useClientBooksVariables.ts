import { useMemo } from 'react';
import { 
  ClientBooksTemplateData, 
  ClientBooksVariaveis,
  mapearVariaveisClientBooks,
  substituirVariaveisClientBooks,
  validarVariaveisClientBooks,
  gerarDadosExemplo,
  obterVariaveisClientBooksDisponiveis
} from '@/utils/clientBooksVariableMapping';

interface UseClientBooksVariablesProps {
  dadosTemplate?: ClientBooksTemplateData;
  usarDadosExemplo?: boolean;
}

interface UseClientBooksVariablesReturn {
  variaveis: ClientBooksVariaveis | null;
  variaveisDisponiveis: { [categoria: string]: string[] };
  processarTemplate: (template: string) => string;
  validarTemplate: (template: string) => { valido: boolean; variaveisNaoEncontradas: string[] };
  dadosExemplo: ClientBooksTemplateData;
}

/**
 * Hook para gerenciar variáveis de templates do sistema de client books
 */
export const useClientBooksVariables = ({ 
  dadosTemplate,
  usarDadosExemplo = false
}: UseClientBooksVariablesProps = {}): UseClientBooksVariablesReturn => {
  
  // Gerar dados de exemplo
  const dadosExemplo = useMemo(() => gerarDadosExemplo(), []);
  
  // Determinar quais dados usar
  const dadosParaUsar = useMemo(() => {
    if (usarDadosExemplo) {
      return dadosExemplo;
    }
    return dadosTemplate || null;
  }, [dadosTemplate, usarDadosExemplo, dadosExemplo]);

  // Mapear variáveis baseado nos dados
  const variaveis = useMemo(() => {
    if (!dadosParaUsar) {
      return null;
    }
    
    return mapearVariaveisClientBooks(dadosParaUsar);
  }, [dadosParaUsar]);

  // Obter variáveis disponíveis
  const variaveisDisponiveis = useMemo(() => {
    return obterVariaveisClientBooksDisponiveis();
  }, []);

  // Função para processar template substituindo variáveis
  const processarTemplate = (template: string): string => {
    if (!variaveis) {
      return template;
    }
    
    return substituirVariaveisClientBooks(template, variaveis);
  };

  // Função para validar template
  const validarTemplate = (template: string) => {
    if (!variaveis) {
      return { valido: false, variaveisNaoEncontradas: [] };
    }
    
    return validarVariaveisClientBooks(template, variaveis);
  };

  return {
    variaveis,
    variaveisDisponiveis,
    processarTemplate,
    validarTemplate,
    dadosExemplo
  };
};