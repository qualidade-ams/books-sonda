import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface UseTemplateTestDataProps {
  templateId: string;
}

interface UseTemplateTestDataReturn {
  testData: any;
  loading: boolean;
  saving: boolean;
  saveTestData: (data: any) => Promise<void>;
  loadTestData: () => Promise<void>;
}

/**
 * Hook para gerenciar dados de teste de templates no banco de dados
 */
export const useTemplateTestData = ({
  templateId
}: UseTemplateTestDataProps): UseTemplateTestDataReturn => {

  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar dados de teste (apenas dados padrão locais)
  const loadTestData = useCallback(async () => {
    if (!templateId) return;

    setLoading(true);
    try {

      // Usar dados padrão locais (não salvamos no banco)
      const dadosPadrao = {
        // Dados básicos
        localizacao: 'São Paulo/SP',
        segmento: 'industria',
        escopo: ['sped_fiscal', 'sped_contribuicoes', 'reinf'],
        qtdEmpresas: 3,
        qtdUfs: 2,
        volumetria: 'Até 500 NFe/mês',
        modalidade: 'saas',
        tempoContrato: 12,

        // Valores totais
        valorLicencaUso: 24000,
        valorManutencao: 18000,
        valorSuporte: 6000,

        // Dados da empresa
        razaoSocial: 'Empresa Teste Ltda',
        cnpj: '12.345.678/0001-90',
        responsavel: 'João Silva',
        email: 'joao@empresateste.com.br',

        // Novas variáveis do sistema
        horasAtendimento: 40
      };
      
      setTestData(dadosPadrao);
    } catch (error) {
      console.error('❌ Erro ao carregar dados de teste:', error);
      toast.error('Erro ao carregar dados de teste');
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  // Salvar dados de teste (apenas localmente na sessão)
  const saveTestData = useCallback(async (data: any) => {
    if (!templateId) return;

    setSaving(true);
    try {
      console.log('💾 Atualizando dados de teste localmente para template:', templateId);
      console.log('💾 Dados:', data);

      // Simular um pequeno delay para UX
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log('✅ Dados de teste atualizados localmente');
      setTestData(data);

      // Toast de sucesso discreto
      toast.success('Dados de teste atualizados', {
        duration: 2000
      });

    } catch (error) {
      console.error('❌ Erro ao atualizar dados de teste:', error);
      toast.error('Erro ao atualizar dados de teste');
    } finally {
      setSaving(false);
    }
  }, [templateId]);

  // Carregar dados quando o templateId mudar
  useEffect(() => {
    if (templateId) {
      loadTestData();
    }
  }, [templateId, loadTestData]);

  return {
    testData,
    loading,
    saving,
    saveTestData,
    loadTestData
  };
};

// Hook simplificado - tipos removidos para evitar problemas de referência circular