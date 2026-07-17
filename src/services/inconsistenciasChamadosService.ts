/**
 * Serviço para leitura de inconsistências de chamados persistidas
 * 
 * Este serviço lê dados da tabela `inconsistencias_chamados` que é populada
 * automaticamente após cada sincronização com o SQL Server.
 * 
 * A detecção de inconsistências é feita pelo `inconsistenciasDeteccaoService.ts`
 * que roda após a sincronização.
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  InconsistenciaChamado, 
  InconsistenciasChamadosFiltros,
  InconsistenciasChamadosEstatisticas,
  HistoricoInconsistencia,
  EnviarNotificacaoRequest
} from '@/types/inconsistenciasChamados';

export class InconsistenciasChamadosService {

  /**
   * Enriquece inconsistências com o status atual do ticket (busca direto na tabela de tickets).
   * Substitui o campo status_chamado pelo status mais recente da tabela apontamentos_tickets_aranda.
   */
  private async enriquecerComStatusTicket(inconsistencias: InconsistenciaChamado[]): Promise<InconsistenciaChamado[]> {
    if (inconsistencias.length === 0) return inconsistencias;

    try {
      // Extrair números de chamado únicos (sem prefixo RF/IM/PM)
      const nrosUnicos = new Set<string>();
      for (const inc of inconsistencias) {
        const nroLimpo = (inc.nro_chamado || '').replace(/^(RF|IM|PM)\s*/, '').trim();
        if (nroLimpo && nroLimpo !== 'N/A') {
          nrosUnicos.add(nroLimpo);
        }
      }

      if (nrosUnicos.size === 0) return inconsistencias;

      // Buscar status dos tickets em lotes
      const nrosArray = Array.from(nrosUnicos);
      const statusMap = new Map<string, string>();
      const batchSize = 200;

      for (let i = 0; i < nrosArray.length; i += batchSize) {
        const batch = nrosArray.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('apontamentos_tickets_aranda' as any)
          .select('nro_solicitacao, status')
          .in('nro_solicitacao', batch);

        if (error || !data) continue;

        for (const ticket of data as any[]) {
          if (ticket.nro_solicitacao && ticket.status) {
            statusMap.set(ticket.nro_solicitacao, ticket.status);
          }
        }
      }

      // Aplicar status aos registros
      for (const inc of inconsistencias) {
        const nroLimpo = (inc.nro_chamado || '').replace(/^(RF|IM|PM)\s*/, '').trim();
        const status = statusMap.get(nroLimpo);
        if (status) {
          inc.status_chamado = status;
        }
      }

      return inconsistencias;
    } catch (error) {
      console.error('❌ Erro ao enriquecer com status do ticket:', error);
      return inconsistencias;
    }
  }

  /**
   * Busca inconsistências ativas (pendentes de correção)
   */
  async buscarInconsistencias(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciaChamado[]> {
    try {
      console.log('🔍 Buscando inconsistências ativas:', filtros);

      let query = supabase
        .from('inconsistencias_chamados' as any)
        .select('*')
        .eq('status', 'ativa')
        .order('data_abertura', { ascending: false });

      // Filtro por período (data_atividade)
      if (filtros?.data_inicio) {
        query = query.gte('data_atividade', filtros.data_inicio);
      }
      if (filtros?.data_fim) {
        query = query.lte('data_atividade', filtros.data_fim);
      }

      // Filtro por tipo de inconsistência
      if (filtros?.tipo_inconsistencia && filtros.tipo_inconsistencia !== 'all') {
        query = query.eq('tipo_inconsistencia', filtros.tipo_inconsistencia);
      }

      // Filtro por origem
      if (filtros?.origem && filtros.origem !== 'all') {
        query = query.eq('origem', filtros.origem);
      }

      // Filtro por analista
      if (filtros?.analista) {
        query = query.eq('analista', filtros.analista);
      }

      // Filtro por busca (número do chamado)
      if (filtros?.busca) {
        const buscaLimpa = filtros.busca.replace(/^(RF|IM|PM)\s*/i, '').trim();
        if (buscaLimpa) {
          query = query.ilike('nro_chamado', `%${buscaLimpa}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar inconsistências:', error);
        throw error;
      }

      console.log('✅ Inconsistências ativas encontradas:', data?.length || 0);
      const inconsistencias = (data as any[] || []) as InconsistenciaChamado[];
      
      // Enriquecer com status atual do ticket (sempre busca da tabela de tickets)
      return await this.enriquecerComStatusTicket(inconsistencias);
    } catch (error) {
      console.error('❌ Erro ao buscar inconsistências:', error);
      throw error;
    }
  }

  /**
   * Busca inconsistências resolvidas (corrigidas pelo analista)
   */
  async buscarResolvidas(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciaChamado[]> {
    try {
      console.log('📜 Buscando inconsistências resolvidas:', filtros);

      let query = supabase
        .from('inconsistencias_chamados' as any)
        .select('*')
        .eq('status', 'resolvida')
        .order('data_resolucao', { ascending: false });

      // Filtro por período (data_atividade)
      if (filtros?.data_inicio) {
        query = query.gte('data_atividade', filtros.data_inicio);
      }
      if (filtros?.data_fim) {
        query = query.lte('data_atividade', filtros.data_fim);
      }

      // Filtro por tipo de inconsistência
      if (filtros?.tipo_inconsistencia && filtros.tipo_inconsistencia !== 'all') {
        query = query.eq('tipo_inconsistencia', filtros.tipo_inconsistencia);
      }

      // Filtro por origem
      if (filtros?.origem && filtros.origem !== 'all') {
        query = query.eq('origem', filtros.origem);
      }

      // Filtro por analista
      if (filtros?.analista) {
        query = query.eq('analista', filtros.analista);
      }

      // Filtro por busca
      if (filtros?.busca) {
        const buscaLimpa = filtros.busca.replace(/^(RF|IM|PM)\s*/i, '').trim();
        if (buscaLimpa) {
          query = query.ilike('nro_chamado', `%${buscaLimpa}%`);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar resolvidas:', error);
        throw error;
      }

      console.log('✅ Inconsistências resolvidas encontradas:', data?.length || 0);
      const resolvidas = (data as any[] || []) as InconsistenciaChamado[];
      
      // Enriquecer com status atual do ticket
      return await this.enriquecerComStatusTicket(resolvidas);
    } catch (error) {
      console.error('❌ Erro ao buscar resolvidas:', error);
      throw error;
    }
  }

  /**
   * Busca estatísticas de inconsistências ativas
   */
  async buscarEstatisticas(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciasChamadosEstatisticas> {
    try {
      // Buscar todas as ativas com os filtros aplicados
      const inconsistencias = await this.buscarInconsistencias(filtros);

      const estatisticas: InconsistenciasChamadosEstatisticas = {
        total: inconsistencias.length,
        por_tipo: {
          mes_diferente: 0,
          tempo_excessivo: 0,
          ic_999999: 0,
          sem_atualizacao: 0
        },
        por_origem: {
          apontamentos: 0,
          tickets: 0
        }
      };

      for (const inc of inconsistencias) {
        estatisticas.por_tipo[inc.tipo_inconsistencia]++;
        estatisticas.por_origem[inc.origem]++;
      }

      return estatisticas;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de emails enviados (tabela historico_inconsistencias_chamados)
   */
  async buscarHistoricoEmails(
    ano: number
  ): Promise<HistoricoInconsistencia[]> {
    try {
      console.log('📧 Buscando histórico de emails enviados:', { ano });

      const { data, error } = await supabase
        .from('historico_inconsistencias_chamados' as any)
        .select('*')
        .eq('ano_referencia', ano)
        .order('data_envio', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar histórico de emails:', error);
        throw error;
      }

      console.log('✅ Histórico de emails encontrado:', data?.length || 0);
      return (data as any[]) || [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico de emails:', error);
      throw error;
    }
  }

  /**
   * Arquiva uma inconsistência (muda status de 'ativa' para 'resolvida')
   * Move o chamado da aba "Inconsistências Detectadas" para "Histórico de Inconsistências"
   */
  async arquivarInconsistencia(id: string): Promise<void> {
    try {
      console.log('📦 Arquivando inconsistência:', id);

      const { error } = await supabase
        .from('inconsistencias_chamados' as any)
        .update({
          status: 'resolvida',
          data_resolucao: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Erro ao arquivar inconsistência:', error);
        throw error;
      }

      console.log('✅ Inconsistência arquivada com sucesso:', id);
    } catch (error) {
      console.error('❌ Erro ao arquivar inconsistência:', error);
      throw error;
    }
  }

  /**
   * Arquiva múltiplas inconsistências de uma vez
   */
  async arquivarMultiplas(ids: string[]): Promise<void> {
    try {
      console.log('📦 Arquivando múltiplas inconsistências:', ids.length);

      const { error } = await supabase
        .from('inconsistencias_chamados' as any)
        .update({
          status: 'resolvida',
          data_resolucao: new Date().toISOString()
        })
        .in('id', ids);

      if (error) {
        console.error('❌ Erro ao arquivar múltiplas inconsistências:', error);
        throw error;
      }

      console.log('✅', ids.length, 'inconsistências arquivadas com sucesso');
    } catch (error) {
      console.error('❌ Erro ao arquivar múltiplas inconsistências:', error);
      throw error;
    }
  }

  /**
   * Envia notificação por email e registra no histórico
   */
  async enviarNotificacao(request: EnviarNotificacaoRequest): Promise<void> {
    try {
      console.log('📧 Enviando notificações:', {
        quantidade: request.inconsistencias.length,
        ano: request.ano_referencia
      });

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar nome do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const enviadoPorNome = profile?.full_name || user.email || 'Sistema';

      // Salvar cada inconsistência no histórico de emails
      for (const inc of request.inconsistencias) {
        const { error: insertError } = await supabase
          .from('historico_inconsistencias_chamados' as any)
          .insert({
            origem: inc.origem,
            nro_chamado: inc.nro_chamado,
            tipo_inconsistencia: inc.tipo_inconsistencia,
            data_atividade: inc.data_atividade,
            data_sistema: inc.data_sistema,
            tempo_gasto_horas: inc.tempo_gasto_horas,
            tempo_gasto_minutos: inc.tempo_gasto_minutos,
            empresa: inc.empresa,
            analista: inc.analista,
            tipo_chamado: inc.tipo_chamado,
            descricao_inconsistencia: inc.descricao_inconsistencia,
            email_analista: null,
            enviado_por: user.id,
            enviado_por_nome: enviadoPorNome,
            mes_referencia: request.mes_referencia,
            ano_referencia: request.ano_referencia
          });

        if (insertError) {
          console.error('❌ Erro ao salvar no histórico:', insertError);
          throw insertError;
        }
      }

      console.log(`✅ ${request.inconsistencias.length} notificações registradas no histórico`);
    } catch (error) {
      console.error('❌ Erro ao enviar notificações:', error);
      throw error;
    }
  }
}

// Exportar instância singleton
export const inconsistenciasChamadosService = new InconsistenciasChamadosService();
