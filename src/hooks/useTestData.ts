/**
 * Hook para gerenciar dados de teste de templates de e-mail
 */

import { useState, useEffect, useCallback } from 'react';
import { testDataService, type TestDataRecord, type CreateTestDataRequest } from '@/services/testDataService';
import type { FormularioData } from '@/utils/emailVariableMapping';
import { useToast } from '@/hooks/use-toast';

interface UseTestDataReturn {
  // Estados
  testDataSets: TestDataRecord[];
  currentTestData: FormularioData;
  loading: boolean;
  saving: boolean;
  
  // Ações
  loadTestDataSets: () => Promise<void>;
  loadTestDataById: (id: string) => Promise<void>;
  saveTestData: (nome: string, dados: FormularioData) => Promise<void>;
  updateCurrentData: (dados: FormularioData) => void;
  deleteTestData: (id: string) => Promise<void>;
  resetToDefault: () => void;
}

export const useTestData = (): UseTestDataReturn => {
  const { toast } = useToast();
  
  // Estados
  const [testDataSets, setTestDataSets] = useState<TestDataRecord[]>([]);
  const [currentTestData, setCurrentTestData] = useState<FormularioData>({
    razaoSocial: '',
    cnpj: '',
    responsavel: '',
    email: '',
    localizacao: 'São Paulo/SP'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Carregar conjuntos de dados de teste
  const loadTestDataSets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await testDataService.getTestDataSets();
      setTestDataSets(data);
    } catch (error) {
      console.error('Erro ao carregar conjuntos de dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os conjuntos de dados de teste",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Carregar dados específicos por ID
  const loadTestDataById = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const data = await testDataService.getTestDataById(id);
      if (data) {
        setCurrentTestData(data.dados);
        toast({
          title: "Dados carregados",
          description: `Conjunto "${data.nome}" carregado com sucesso`,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados por ID:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar o conjunto de dados selecionado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Salvar dados de teste
  const saveTestData = useCallback(async (nome: string, dados: FormularioData) => {
    try {
      setSaving(true);
      
      const request: CreateTestDataRequest = {
        nome,
        dados
      };
      
      await testDataService.createTestData(request);
      
      toast({
        title: "Dados salvos",
        description: `Conjunto "${nome}" salvo com sucesso`,
      });
      
      // Recarregar lista
      await loadTestDataSets();
      
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o conjunto de dados",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [toast, loadTestDataSets]);

  // Atualizar dados atuais
  const updateCurrentData = useCallback((dados: FormularioData) => {
    setCurrentTestData(dados);
  }, []);

  // Deletar conjunto de dados
  const deleteTestData = useCallback(async (id: string) => {
    try {
      await testDataService.deleteTestData(id);
      
      toast({
        title: "Dados removidos",
        description: "Conjunto de dados removido com sucesso",
      });
      
      // Recarregar lista
      await loadTestDataSets();
      
    } catch (error) {
      console.error('Erro ao deletar dados:', error);
      toast({
        title: "Erro ao remover",
        description: "Não foi possível remover o conjunto de dados",
        variant: "destructive",
      });
    }
  }, [toast, loadTestDataSets]);

  // Resetar para dados padrão
  const resetToDefault = useCallback(() => {
    setCurrentTestData({
      razaoSocial: '',
      cnpj: '',
      responsavel: '',
      email: '',
      localizacao: 'São Paulo/SP'
    });
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Carregar conjuntos de dados
        await loadTestDataSets();
        
        // Carregar dados padrão
        const defaultData = await testDataService.getDefaultTestData();
        setCurrentTestData(defaultData);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();
  }, [loadTestDataSets]);

  return {
    testDataSets,
    currentTestData,
    loading,
    saving,
    loadTestDataSets,
    loadTestDataById,
    saveTestData,
    updateCurrentData,
    deleteTestData,
    resetToDefault
  };
};
