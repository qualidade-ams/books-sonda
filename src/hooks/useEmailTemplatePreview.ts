import { useMemo } from 'react';
import { FormularioData, useEmailVariableMapping } from '@/hooks/useEmailVariableMapping';

interface EmailTemplate {
  assunto: string;
  corpo: string;
}

export const useEmailTemplatePreview = (template: EmailTemplate, dadosPersonalizados?: FormularioData) => {
  // Dados de exemplo para preview
  const dadosExemplo: FormularioData = useMemo(() => ({
    // Dados básicos
    localizacao: 'São Paulo/SP',
    segmento: 'industria',
    escopo: ['sped_fiscal', 'sped_contabil', 'reinf'],
    qtdEmpresas: 5,
    qtdUfs: 2,
    volumetria: 'Até 20.000 documentos/mês',
    modalidade: 'saas',
    tempoContrato: 12,
    
    // Valores totais (exemplo)
    valorSaas:48000, // R$ 48.000,00    
    valorLicencaUso: 36000, // R$ 36.000,00
    valorManutencao: 24000, // R$ 24.000,00
    valorSuporte: 12000,    // R$ 12.000,00
    
    // Dados da empresa
    razaoSocial: 'Empresa de Teste Ltda',
    cnpj: '12.345.678/0001-90',
    responsavel: 'João da Silva',
    email: 'joao.silva@empresateste.com.br',
    
    // Novas variáveis do sistema
    horasAtendimento: 8
  }), []);

  // Usar dados personalizados se fornecidos, senão usar dados de exemplo
  const dadosParaUsar = dadosPersonalizados || dadosExemplo;

  // Usar o hook de mapeamento de variáveis
  const { variaveis, processarTemplate } = useEmailVariableMapping({
    dadosFormulario: dadosParaUsar
  });

  const previewData = useMemo(() => {
    const assuntoComDados = processarTemplate(template.assunto);
    const corpoComDados = processarTemplate(template.corpo);

    return { assuntoComDados, corpoComDados };
  }, [template, processarTemplate]);

  // Converter variáveis para formato de exibição no preview
  const sampleData = useMemo(() => {
    const dadosFormatados: { [key: string]: string } = {};
    
    Object.entries(variaveis).forEach(([chave, valor]) => {
      dadosFormatados[chave] = valor;
    });

    return dadosFormatados;
  }, [variaveis]);

  return {
    sampleData,
    previewData
  };
};