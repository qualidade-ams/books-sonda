/**
 * Serviço para gerenciar dados de teste de templates de e-mail
 * Permite salvar e carregar dados de teste no banco de dados
 */

import { supabase } from '@/integrations/supabase/client';
import type { FormularioData } from '@/utils/emailVariableMapping';

export interface TestDataRecord {
  id: string;
  nome: string;
  dados: FormularioData;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateTestDataRequest {
  nome: string;
  dados: FormularioData;
}

export interface UpdateTestDataRequest {
  id: string;
  nome?: string;
  dados?: FormularioData;
}

class TestDataService {
  /**
   * Busca todos os conjuntos de dados de teste
   */
  async getTestDataSets(): Promise<TestDataRecord[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('email_test_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar dados de teste:', error);
        throw new Error(`Erro ao carregar dados de teste: ${error.message}`);
      }

      return (data || []) as TestDataRecord[];
    } catch (error) {
      console.error('Erro no serviço de dados de teste:', error);
      throw error;
    }
  }

  /**
   * Busca um conjunto específico de dados de teste
   */
  async getTestDataById(id: string): Promise<TestDataRecord | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('email_test_data')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        console.error('Erro ao buscar dados de teste por ID:', error);
        throw new Error(`Erro ao carregar dados de teste: ${error.message}`);
      }

      return data as TestDataRecord;
    } catch (error) {
      console.error('Erro no serviço de dados de teste:', error);
      throw error;
    }
  }

  /**
   * Cria um novo conjunto de dados de teste
   */
  async createTestData(request: CreateTestDataRequest): Promise<TestDataRecord> {
    try {
      const { data, error } = await (supabase as any)
        .from('email_test_data')
        .insert({
          nome: request.nome,
          dados: request.dados,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar dados de teste:', error);
        throw new Error(`Erro ao salvar dados de teste: ${error.message}`);
      }

      return data as TestDataRecord;
    } catch (error) {
      console.error('Erro no serviço de dados de teste:', error);
      throw error;
    }
  }

  /**
   * Atualiza um conjunto de dados de teste existente
   */
  async updateTestData(request: UpdateTestDataRequest): Promise<TestDataRecord> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (request.nome !== undefined) {
        updateData.nome = request.nome;
      }

      if (request.dados !== undefined) {
        updateData.dados = request.dados;
      }

      const { data, error } = await (supabase as any)
        .from('email_test_data')
        .update(updateData)
        .eq('id', request.id)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar dados de teste:', error);
        throw new Error(`Erro ao atualizar dados de teste: ${error.message}`);
      }

      return data as TestDataRecord;
    } catch (error) {
      console.error('Erro no serviço de dados de teste:', error);
      throw error;
    }
  }

  /**
   * Remove um conjunto de dados de teste
   */
  async deleteTestData(id: string): Promise<void> {
    try {
      const { error } = await (supabase as any)
        .from('email_test_data')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar dados de teste:', error);
        throw new Error(`Erro ao deletar dados de teste: ${error.message}`);
      }
    } catch (error) {
      console.error('Erro no serviço de dados de teste:', error);
      throw error;
    }
  }

  /**
   * Busca o conjunto de dados padrão (mais recente ou primeiro criado)
   */
  async getDefaultTestData(): Promise<FormularioData> {
    try {
      const testDataSets = await this.getTestDataSets();
      
      if (testDataSets.length > 0) {
        return testDataSets[0].dados;
      }

      // Retorna dados padrão se não houver nenhum salvo
      return this.getDefaultFormData();
    } catch (error) {
      console.error('Erro ao buscar dados padrão:', error);
      // Em caso de erro, retorna dados padrão
      return this.getDefaultFormData();
    }
  }

  /**
   * Retorna dados padrão para formulário
   */
  private getDefaultFormData(): FormularioData {
    return {
      razaoSocial: '',
      cnpj: '',
      responsavel: '',
      email: '',
      localizacao: 'São Paulo/SP'
    };
  }
}

export const testDataService = new TestDataService();
