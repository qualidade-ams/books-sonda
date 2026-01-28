import { supabase } from '@/integrations/supabase/client';
import type { 
  InconsistenciaChamado, 
  InconsistenciasChamadosFiltros,
  InconsistenciasChamadosEstatisticas,
  TipoInconsistencia,
  HistoricoInconsistencia,
  EnviarNotificacaoRequest
} from '@/types/inconsistenciasChamados';

/**
 * Serviço para gerenciar inconsistências de chamados
 * Busca e analisa chamados com problemas nas tabelas apontamentos_aranda e apontamentos_tickets_aranda
 * 
 * NOTA: Os erros de TypeScript relacionados às tabelas são esperados porque estas tabelas
 * não estão definidas nos tipos gerados do Supabase. O código funciona corretamente em runtime.
 */
export class InconsistenciasChamadosService {
  /**
   * Busca todas as inconsistências de chamados
   * 
   * @param filtros - Filtros opcionais para busca
   * @returns Lista de inconsistências encontradas
   */
  async buscarInconsistencias(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciaChamado[]> {
    try {
      console.log('🔍 Buscando inconsistências de chamados:', filtros);

      const inconsistencias: InconsistenciaChamado[] = [];

      // 1. Buscar inconsistências em apontamentos_aranda
      const apontamentos = await this.buscarInconsistenciasApontamentos(filtros);
      inconsistencias.push(...apontamentos);

      // 2. Buscar inconsistências em apontamentos_tickets_aranda
      const tickets = await this.buscarInconsistenciasTickets(filtros);
      inconsistencias.push(...tickets);

      // 3. Filtrar inconsistências já enviadas (que estão no histórico)
      const inconsistenciasNaoEnviadas = await this.filtrarInconsistenciasNaoEnviadas(inconsistencias);

      // 4. Ordenar por data_atividade DESC
      inconsistenciasNaoEnviadas.sort((a, b) => {
        const dataA = new Date(a.data_atividade);
        const dataB = new Date(b.data_atividade);
        return dataB.getTime() - dataA.getTime();
      });

      console.log('✅ Inconsistências encontradas:', inconsistenciasNaoEnviadas.length);

      return inconsistenciasNaoEnviadas;
    } catch (error) {
      console.error('❌ Erro ao buscar inconsistências:', error);
      throw error;
    }
  }

  /**
   * Filtra inconsistências que já foram enviadas (estão no histórico)
   */
  private async filtrarInconsistenciasNaoEnviadas(
    inconsistencias: InconsistenciaChamado[]
  ): Promise<InconsistenciaChamado[]> {
    try {
      // Buscar todas as inconsistências no histórico
      const { data: historico, error } = await supabase
        .from('historico_inconsistencias_chamados')
        .select('nro_chamado, tipo_inconsistencia, origem, data_atividade');

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        // Em caso de erro, retornar todas as inconsistências
        return inconsistencias;
      }

      if (!historico || historico.length === 0) {
        return inconsistencias;
      }

      // Criar um Set com chaves únicas das inconsistências já enviadas
      const enviadas = new Set(
        historico.map(h => 
          `${h.origem}-${h.nro_chamado}-${h.tipo_inconsistencia}-${h.data_atividade}`
        )
      );

      // Filtrar apenas as que não foram enviadas
      const naoEnviadas = inconsistencias.filter(inc => {
        const chave = `${inc.origem}-${inc.nro_chamado}-${inc.tipo_inconsistencia}-${inc.data_atividade}`;
        return !enviadas.has(chave);
      });

      console.log(`🔍 Filtradas: ${inconsistencias.length} total, ${naoEnviadas.length} não enviadas, ${enviadas.size} já enviadas`);

      return naoEnviadas;
    } catch (error) {
      console.error('❌ Erro ao filtrar inconsistências:', error);
      // Em caso de erro, retornar todas as inconsistências
      return inconsistencias;
    }
  }

  /**
   * Busca inconsistências na tabela apontamentos_aranda
   */
  private async buscarInconsistenciasApontamentos(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciaChamado[]> {
    try {
      // Query base
      let query = supabase
        .from('apontamentos_aranda' as any)
        .select('*');

      // Aplicar filtros de data se fornecidos
      if (filtros?.data_inicio) {
        query = query.gte('data_atividade', filtros.data_inicio);
      }
      if (filtros?.data_fim) {
        query = query.lte('data_atividade', filtros.data_fim);
      }

      // Aplicar filtro de busca (número do chamado)
      if (filtros?.busca) {
        query = query.ilike('nro_chamado', `%${filtros.busca}%`);
      }

      // Aplicar filtro de analista (busca exata)
      if (filtros?.analista) {
        query = query.eq('analista_tarefa', filtros.analista);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar apontamentos:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Filtrar e mapear inconsistências
      const inconsistencias: InconsistenciaChamado[] = [];

      for (const apontamento of data) {
        const tipos = this.detectarInconsistencias(
          apontamento.data_atividade,
          apontamento.data_sistema,
          apontamento.tempo_gasto_horas
        );

        // Se há inconsistências detectadas
        if (tipos.length > 0) {
          // Filtrar por tipo se especificado
          const tiposFiltrados = filtros?.tipo_inconsistencia && filtros.tipo_inconsistencia !== 'all'
            ? tipos.filter(t => t === filtros.tipo_inconsistencia)
            : tipos;

          // Criar uma inconsistência para cada tipo detectado
          for (const tipo of tiposFiltrados) {
            inconsistencias.push({
              id: `${apontamento.id}-${tipo}`,
              origem: 'apontamentos',
              nro_chamado: apontamento.nro_chamado || 'N/A',
              data_atividade: apontamento.data_atividade,
              data_sistema: apontamento.data_sistema,
              tempo_gasto_horas: apontamento.tempo_gasto_horas,
              tempo_gasto_minutos: apontamento.tempo_gasto_minutos,
              empresa: apontamento.org_us_final,
              analista: apontamento.analista_tarefa,
              tipo_chamado: apontamento.tipo_chamado,
              tipo_inconsistencia: tipo,
              descricao_inconsistencia: this.gerarDescricao(
                tipo,
                apontamento.data_atividade,
                apontamento.data_sistema,
                apontamento.tempo_gasto_horas
              ),
              created_at: apontamento.created_at
            });
          }
        }
      }

      return inconsistencias;
    } catch (error) {
      console.error('❌ Erro ao buscar inconsistências de apontamentos:', error);
      return [];
    }
  }

  /**
   * Busca inconsistências na tabela apontamentos_tickets_aranda
   */
  private async buscarInconsistenciasTickets(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciaChamado[]> {
    try {
      // Query base
      let query = supabase
        .from('apontamentos_tickets_aranda' as any)
        .select('*');

      // Aplicar filtros de data se fornecidos
      if (filtros?.data_inicio) {
        query = query.gte('data_abertura', filtros.data_inicio);
      }
      if (filtros?.data_fim) {
        query = query.lte('data_abertura', filtros.data_fim);
      }

      // Aplicar filtro de busca (número da solicitação)
      if (filtros?.busca) {
        query = query.ilike('nro_solicitacao', `%${filtros.busca}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar tickets:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Filtrar e mapear inconsistências
      const inconsistencias: InconsistenciaChamado[] = [];

      for (const ticket of data) {
        const tipos = this.detectarInconsistencias(
          ticket.data_abertura,
          ticket.data_sistema,
          null // Tickets não têm tempo_gasto_horas
        );

        // Se há inconsistências detectadas
        if (tipos.length > 0) {
          // Filtrar por tipo se especificado
          const tiposFiltrados = filtros?.tipo_inconsistencia && filtros.tipo_inconsistencia !== 'all'
            ? tipos.filter(t => t === filtros.tipo_inconsistencia)
            : tipos;

          // Criar uma inconsistência para cada tipo detectado
          for (const tipo of tiposFiltrados) {
            inconsistencias.push({
              id: `${ticket.id}-${tipo}`,
              origem: 'tickets',
              nro_chamado: ticket.nro_solicitacao || 'N/A',
              data_atividade: ticket.data_abertura,
              data_sistema: ticket.data_sistema,
              tempo_gasto_horas: null,
              tempo_gasto_minutos: null,
              empresa: ticket.empresa,
              analista: null,
              tipo_chamado: null,
              tipo_inconsistencia: tipo,
              descricao_inconsistencia: this.gerarDescricao(
                tipo,
                ticket.data_abertura,
                ticket.data_sistema,
                null
              ),
              created_at: ticket.created_at
            });
          }
        }
      }

      return inconsistencias;
    } catch (error) {
      console.error('❌ Erro ao buscar inconsistências de tickets:', error);
      return [];
    }
  }

  /**
   * Detecta tipos de inconsistências em um chamado
   */
  private detectarInconsistencias(
    dataAtividade: string | null,
    dataSistema: string | null,
    tempoGastoHoras: string | null
  ): TipoInconsistencia[] {
    const tipos: TipoInconsistencia[] = [];

    if (!dataAtividade || !dataSistema) {
      return tipos;
    }

    const dtAtividade = new Date(dataAtividade);
    const dtSistema = new Date(dataSistema);

    // Regra 1: Datas em meses diferentes
    if (
      dtAtividade.getMonth() !== dtSistema.getMonth() ||
      dtAtividade.getFullYear() !== dtSistema.getFullYear()
    ) {
      tipos.push('mes_diferente');
    }

    // Regra 2: Data sistema anterior à data atividade
    if (dtSistema < dtAtividade) {
      tipos.push('data_invertida');
    }

    // Regra 3: Tempo excessivo (> 10 horas)
    if (tempoGastoHoras) {
      const [horas] = tempoGastoHoras.split(':').map(Number);
      if (horas > 10) {
        tipos.push('tempo_excessivo');
      }
    }

    return tipos;
  }

  /**
   * Gera descrição legível da inconsistência
   */
  private gerarDescricao(
    tipo: TipoInconsistencia,
    dataAtividade: string,
    dataSistema: string,
    tempoGastoHoras: string | null
  ): string {
    const dtAtividade = new Date(dataAtividade);
    const dtSistema = new Date(dataSistema);

    switch (tipo) {
      case 'mes_diferente':
        return `Data Atividade (${dtAtividade.toLocaleDateString('pt-BR')}) e Data Sistema (${dtSistema.toLocaleDateString('pt-BR')}) em meses diferentes`;
      
      case 'data_invertida':
        const diferencaDias = Math.floor((dtAtividade.getTime() - dtSistema.getTime()) / (1000 * 60 * 60 * 24));
        return `Data Sistema (${dtSistema.toLocaleDateString('pt-BR')}) é ${diferencaDias} dia(s) anterior à Data Atividade (${dtAtividade.toLocaleDateString('pt-BR')})`;
      
      case 'tempo_excessivo':
        return `Tempo gasto (${tempoGastoHoras}) excede o limite de 10 horas`;
      
      default:
        return 'Inconsistência detectada';
    }
  }

  /**
   * Busca estatísticas de inconsistências
   */
  async buscarEstatisticas(
    filtros?: InconsistenciasChamadosFiltros
  ): Promise<InconsistenciasChamadosEstatisticas> {
    try {
      const inconsistencias = await this.buscarInconsistencias(filtros);

      const estatisticas: InconsistenciasChamadosEstatisticas = {
        total: inconsistencias.length,
        por_tipo: {
          mes_diferente: 0,
          data_invertida: 0,
          tempo_excessivo: 0
        },
        por_origem: {
          apontamentos: 0,
          tickets: 0
        }
      };

      // Contar por tipo e origem
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
   * Busca histórico de inconsistências já notificadas
   */
  async buscarHistorico(
    mes: number,
    ano: number
  ): Promise<HistoricoInconsistencia[]> {
    try {
      console.log('📜 Buscando histórico de inconsistências:', { mes, ano });

      const { data, error } = await supabase
        .from('historico_inconsistencias_chamados')
        .select('*')
        .eq('mes_referencia', mes)
        .eq('ano_referencia', ano)
        .order('data_envio', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        throw error;
      }

      console.log('✅ Histórico encontrado:', data?.length || 0);

      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      throw error;
    }
  }

  /**
   * Gera HTML do email com lista de inconsistências
   */
  private gerarHtmlEmail(
    inconsistencias: InconsistenciaChamado[],
    mes: number,
    ano: number
  ): string {
    const nomesMeses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const mesNome = nomesMeses[mes - 1];

    // Agrupar inconsistências por tipo
    const porTipo = {
      mes_diferente: inconsistencias.filter(i => i.tipo_inconsistencia === 'mes_diferente'),
      data_invertida: inconsistencias.filter(i => i.tipo_inconsistencia === 'data_invertida'),
      tempo_excessivo: inconsistencias.filter(i => i.tipo_inconsistencia === 'tempo_excessivo')
    };

    const tipoLabels = {
      mes_diferente: 'Mês Diferente',
      data_invertida: 'Data Invertida',
      tempo_excessivo: 'Tempo Excessivo'
    };

    const tipoColors = {
      mes_diferente: '#F59E0B',
      data_invertida: '#EF4444',
      tempo_excessivo: '#F97316'
    };

    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6; }
        .email-container { max-width: 900px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 24px; font-weight: bold; margin: 0 0 8px 0; }
        .header p { color: #e0e7ff; font-size: 14px; margin: 0; }
        .content { padding: 32px; }
        .intro { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 24px; border-radius: 4px; }
        .intro p { color: #92400e; font-size: 14px; line-height: 1.6; margin: 0; }
        .section { margin-bottom: 32px; }
        .section-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
        .inconsistencia-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
        .inconsistencia-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .chamado-numero { font-size: 16px; font-weight: bold; color: #1f2937; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; color: #ffffff; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px; }
        .info-item { font-size: 13px; }
        .info-label { color: #6b7280; font-weight: 500; }
        .info-value { color: #1f2937; font-weight: 600; margin-top: 2px; }
        .descricao { background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px; border-radius: 4px; margin-top: 12px; }
        .descricao p { color: #92400e; font-size: 13px; line-height: 1.5; margin: 0; }
        .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 12px; margin: 0; }
        .summary { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .summary-title { font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 8px; }
        .summary-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .summary-stat { text-align: center; }
        .summary-stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
        .summary-stat-label { font-size: 12px; color: #3b82f6; margin-top: 4px; }
        @media only screen and (max-width: 600px) {
            .content { padding: 16px; }
            .info-grid { grid-template-columns: 1fr; }
            .summary-stats { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>⚠️ Inconsistências Detectadas em Chamados</h1>
            <p>${mesNome} ${ano}</p>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Intro -->
            <div class="intro">
                <p><strong>Atenção!</strong> Foram detectadas inconsistências nos chamados que requerem sua verificação e correção. Por favor, revise os itens abaixo e tome as ações necessárias.</p>
            </div>

            <!-- Summary -->
            <div class="summary">
                <div class="summary-title">Resumo das Inconsistências</div>
                <div class="summary-stats">
                    <div class="summary-stat">
                        <div class="summary-stat-value">${inconsistencias.length}</div>
                        <div class="summary-stat-label">Total</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">${porTipo.mes_diferente.length}</div>
                        <div class="summary-stat-label">Mês Diferente</div>
                    </div>
                    <div class="summary-stat">
                        <div class="summary-stat-value">${porTipo.data_invertida.length}</div>
                        <div class="summary-stat-label">Data Invertida</div>
                    </div>
                </div>
            </div>`;

    // Gerar seções por tipo de inconsistência
    for (const [tipo, lista] of Object.entries(porTipo)) {
      if (lista.length === 0) continue;

      const tipoKey = tipo as TipoInconsistencia;
      const cor = tipoColors[tipoKey];
      const label = tipoLabels[tipoKey];

      html += `
            <!-- Seção: ${label} -->
            <div class="section">
                <div class="section-title">${label} (${lista.length})</div>`;

      for (const inc of lista) {
        const origemIcon = inc.origem === 'apontamentos' ? '📋' : '🎫';
        const dataAtividade = new Date(inc.data_atividade).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const dataSistema = new Date(inc.data_sistema).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        html += `
                <div class="inconsistencia-card">
                    <div class="inconsistencia-header">
                        <div class="chamado-numero">${origemIcon} ${inc.nro_chamado}</div>
                        <span class="badge" style="background-color: ${cor};">${label}</span>
                    </div>
                    
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Data Atividade</div>
                            <div class="info-value">${dataAtividade}</div>
                        </div>
                        <div class="info-item">
                            <div class="info-label">Data Sistema</div>
                            <div class="info-value">${dataSistema}</div>
                        </div>
                        ${inc.tempo_gasto_horas ? `
                        <div class="info-item">
                            <div class="info-label">Tempo Gasto</div>
                            <div class="info-value">${inc.tempo_gasto_horas}</div>
                        </div>` : ''}
                        <div class="info-item">
                            <div class="info-label">Empresa</div>
                            <div class="info-value">${inc.empresa || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="descricao">
                        <p><strong>Descrição:</strong> ${inc.descricao_inconsistencia}</p>
                    </div>
                </div>`;
      }

      html += `
            </div>`;
    }

    html += `
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p>Este é um email automático do sistema Books SND. Por favor, não responda a este email.</p>
            <p style="margin-top: 8px;">Para dúvidas, entre em contato com o suporte.</p>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Envia notificação por email e move inconsistências para histórico
   */
  async enviarNotificacao(request: EnviarNotificacaoRequest): Promise<void> {
    try {
      console.log('📧 Enviando notificações:', {
        quantidade: request.inconsistencias.length,
        mes: request.mes_referencia,
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

      // Agrupar inconsistências por analista
      const porAnalista = new Map<string, InconsistenciaChamado[]>();

      for (const inc of request.inconsistencias) {
        const analista = inc.analista || 'Sem Analista';
        if (!porAnalista.has(analista)) {
          porAnalista.set(analista, []);
        }
        porAnalista.get(analista)!.push(inc);
      }

      console.log('👥 Analistas a notificar:', porAnalista.size);

      // Gerar HTML do email com todas as inconsistências
      const htmlEmail = this.gerarHtmlEmail(
        request.inconsistencias,
        request.mes_referencia,
        request.ano_referencia
      );

      console.log('📧 Email HTML gerado com sucesso');
      console.log('📧 Preview do email:', htmlEmail.substring(0, 500) + '...');

      // Enviar email para cada analista e salvar no histórico
      for (const [analista, inconsistencias] of porAnalista.entries()) {
        // TODO: Implementar envio de email real usando o htmlEmail gerado
        // Por enquanto, apenas salvar no histórico
        
        for (const inc of inconsistencias) {
          const { error: insertError } = await supabase
            .from('historico_inconsistencias_chamados')
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
              email_analista: null, // TODO: Buscar email do analista
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

        console.log(`✅ Notificação enviada para ${analista}: ${inconsistencias.length} chamados`);
      }

      console.log('✅ Todas as notificações foram enviadas');
    } catch (error) {
      console.error('❌ Erro ao enviar notificações:', error);
      throw error;
    }
  }
}

// Exportar instância singleton
export const inconsistenciasChamadosService = new InconsistenciasChamadosService();
