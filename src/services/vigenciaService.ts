/**
 * Serviço para gerenciamento de vigência de contratos
 * Responsável por monitorar e inativar empresas com vigência vencida
 */

import { supabase } from '@/integrations/supabase/client';
import { supabaseAdmin } from '@/integrations/supabase/adminClient';

export interface VigenciaStatus {
  id: string;
  nome_completo: string;
  vigencia_final: string;
  status: string;
  dias_restantes: number;
  status_vigencia: 'VENCIDA' | 'VENCE_BREVE' | 'OK';
}

export interface VigenciaStats {
  total_empresas: number;
  empresas_ativas: number;
  vigencias_vencidas: number;
  vigencias_vencendo_30_dias: number;
  empresas_inativadas_hoje: number;
}

class VigenciaService {
  /**
   * Executa a inativação automática de empresas com vigência vencida
   */
  async executarInativacaoAutomatica(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin.rpc('inativar_empresas_vencidas');
      
      if (error) {
        console.error('Erro ao executar inativação automática:', error);
        throw error;
      }

      console.log(`Inativação automática executada: ${data} empresas inativadas`);
      return data || 0;
    } catch (error) {
      console.error('Erro na inativação automática:', error);
      throw error;
    }
  }

  /**
   * Consulta empresas com status de vigência
   */
  async consultarStatusVigencias(): Promise<VigenciaStatus[]> {
    try {
      const { data, error } = await supabase
        .from('empresas_clientes')
        .select(`
          id,
          nome_completo,
          vigencia_final,
          status
        `)
        .not('vigencia_final', 'is', null)
        .order('vigencia_final', { ascending: true });

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      return (data || []).map(empresa => {
        const vigenciaFinal = new Date(empresa.vigencia_final);
        vigenciaFinal.setHours(0, 0, 0, 0);
        
        const diffTime = vigenciaFinal.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let statusVigencia: 'VENCIDA' | 'VENCE_BREVE' | 'OK';
        if (diasRestantes < 0) {
          statusVigencia = 'VENCIDA';
        } else if (diasRestantes <= 30) {
          statusVigencia = 'VENCE_BREVE';
        } else {
          statusVigencia = 'OK';
        }

        return {
          ...empresa,
          dias_restantes: diasRestantes,
          status_vigencia: statusVigencia
        };
      });
    } catch (error) {
      console.error('Erro ao consultar status de vigências:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de vigência
   */
  async obterEstatisticasVigencia(): Promise<VigenciaStats> {
    try {
      const { data: empresas, error } = await supabase
        .from('empresas_clientes')
        .select('id, status, vigencia_final, updated_at');

      if (error) throw error;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const em30Dias = new Date(hoje);
      em30Dias.setDate(em30Dias.getDate() + 30);

      const stats = {
        total_empresas: empresas?.length || 0,
        empresas_ativas: 0,
        vigencias_vencidas: 0,
        vigencias_vencendo_30_dias: 0,
        empresas_inativadas_hoje: 0
      };

      empresas?.forEach(empresa => {
        if (empresa.status === 'ativo') {
          stats.empresas_ativas++;
        }

        if (empresa.vigencia_final) {
          const vigenciaFinal = new Date(empresa.vigencia_final);
          vigenciaFinal.setHours(0, 0, 0, 0);

          if (vigenciaFinal < hoje) {
            stats.vigencias_vencidas++;
          } else if (vigenciaFinal <= em30Dias) {
            stats.vigencias_vencendo_30_dias++;
          }
        }

        // Verificar se foi inativada hoje
        if (empresa.status === 'inativo' && empresa.updated_at) {
          const updatedAt = new Date(empresa.updated_at);
          updatedAt.setHours(0, 0, 0, 0);
          
          if (updatedAt.getTime() === hoje.getTime()) {
            stats.empresas_inativadas_hoje++;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas de vigência:', error);
      throw error;
    }
  }

  /**
   * Executa verificação manual de todas as empresas com vigência vencida
   * Útil para executar imediatamente após definir uma vigência
   */
  async executarVerificacaoManual(): Promise<number> {
    try {
      console.log('🔍 Executando verificação manual de vigências...');
      const empresasInativadas = await this.executarInativacaoAutomatica();
      
      if (empresasInativadas > 0) {
        console.log(`✅ Verificação manual concluída: ${empresasInativadas} empresa(s) inativada(s)`);
      } else {
        console.log('ℹ️ Verificação manual concluída: nenhuma empresa precisou ser inativada');
      }
      
      return empresasInativadas;
    } catch (error) {
      console.error('❌ Erro na verificação manual:', error);
      throw error;
    }
  }

  /**
   * Força a verificação e inativação de uma empresa específica
   */
  async verificarEmpresaEspecifica(empresaId: string): Promise<boolean> {
    try {
      const { data: empresa, error } = await supabase
        .from('empresas_clientes')
        .select('id, nome_completo, vigencia_final, status')
        .eq('id', empresaId)
        .single();

      if (error) throw error;

      if (!empresa.vigencia_final) {
        return false; // Empresa sem vigência definida
      }

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const vigenciaFinal = new Date(empresa.vigencia_final);
      vigenciaFinal.setHours(0, 0, 0, 0);

      if (vigenciaFinal < hoje && empresa.status === 'ativo') {
        // Inativar empresa
        const { error: updateError } = await supabase
          .from('empresas_clientes')
          .update({
            status: 'inativo',
            data_status: new Date().toISOString(),
            descricao_status: `Inativado automaticamente por vigência vencida em ${empresa.vigencia_final}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', empresaId);

        if (updateError) throw updateError;

        console.log(`Empresa ${empresa.nome_completo} inativada por vigência vencida`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar empresa específica:', error);
      throw error;
    }
  }

  /**
   * Obtém logs de inativação automática
   */
  async obterLogsInativacao(limite: number = 50): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('logs_sistema')
        .select('*')
        .in('operacao', ['inativacao_automatica_vigencia', 'erro_inativacao_vigencia', 'vigencia_passado_definida'])
        .order('data_operacao', { ascending: false })
        .limit(limite);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Erro ao obter logs de inativação:', error);
      throw error;
    }
  }

  /**
   * Agenda verificação automática (para ser chamada por um job scheduler)
   */
  async agendarVerificacaoAutomatica(): Promise<void> {
    try {
      // Esta função seria chamada por um cron job ou scheduler
      const empresasInativadas = await this.executarInativacaoAutomatica();
      
      if (empresasInativadas > 0) {
        console.log(`Verificação automática concluída: ${empresasInativadas} empresas inativadas`);
        
        // Aqui você poderia enviar notificações para administradores
        // await this.notificarAdministradores(empresasInativadas);
      }
    } catch (error) {
      console.error('Erro na verificação automática agendada:', error);
      throw error;
    }
  }

  /**
   * Valida se as datas de vigência são consistentes
   */
  validarVigencias(vigenciaInicial?: string, vigenciaFinal?: string): { valido: boolean; erro?: string } {
    if (!vigenciaInicial || !vigenciaFinal) {
      return { valido: true }; // Campos opcionais
    }

    const dataInicial = new Date(vigenciaInicial);
    const dataFinal = new Date(vigenciaFinal);

    if (dataInicial > dataFinal) {
      return {
        valido: false,
        erro: 'A vigência inicial não pode ser posterior à vigência final'
      };
    }

    return { valido: true };
  }

  /**
   * Calcula dias restantes até o vencimento
   * Considera vencido apenas no dia seguinte ao vencimento
   */
  calcularDiasRestantes(vigenciaFinal: string): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Garantir que a data final seja interpretada corretamente (sem problemas de fuso horário)
    const dataFinal = new Date(vigenciaFinal + 'T00:00:00');
    dataFinal.setHours(0, 0, 0, 0);
    
    const diffTime = dataFinal.getTime() - hoje.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Ajustar para considerar vencido apenas no dia seguinte
    // Se hoje é o dia do vencimento, ainda não está vencido (diasRestantes = 0)
    // Só considera vencido quando diasRestantes < 0 (dia seguinte)
    return diasRestantes;
  }
}

export const vigenciaService = new VigenciaService();