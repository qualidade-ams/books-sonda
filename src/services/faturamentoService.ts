import { supabase } from '@/integrations/supabase/client';
import { emailService, EmailData } from './emailService';
import type {
  Requerimento,
  TipoCobrancaType,
  FaturamentoData,
  EmailFaturamento
} from '@/types/requerimentos';

export interface RelatorioFaturamento {
  periodo: string;
  mes_cobranca: string; // Formato MM/YYYY
  ano_cobranca: number;
  requerimentos_por_tipo: {
    [key in TipoCobrancaType]: {
      quantidade: number;
      horas_total: number;
      requerimentos: Requerimento[];
    };
  };
  totais_gerais: {
    total_requerimentos: number;
    total_horas: number;
    total_faturado: number;
  };
}

export interface EstatisticasFaturamento {
  total_requerimentos: number;
  total_horas: number;
  valor_estimado?: number;
  tipos_cobranca: {
    [key in TipoCobrancaType]: {
      quantidade: number;
      horas: number;
      percentual: number;
    };
  };
}

export class FaturamentoService {
  /**
   * Busca requerimentos enviados para faturamento por mês
   */
  async buscarRequerimentosParaFaturamento(
    mes: number,
    ano: number = new Date().getFullYear()
  ): Promise<Requerimento[]> {
    try {
      const { data, error } = await supabase
        .from('requerimentos')
        .select(`
          *,
          empresas_clientes!inner(nome_completo, nome_abreviado)
        `)
        .eq('status', 'enviado_faturamento')
        .eq('mes_cobranca', `${String(mes).padStart(2, '0')}/${ano}`)
        .gte('created_at', `${ano}-01-01`)
        .lt('created_at', `${ano + 1}-01-01`)
        .order('tipo_cobranca')
        .order('created_at');

      if (error) {
        throw new Error(`Erro ao buscar requerimentos para faturamento: ${error.message}`);
      }

      // Mapear dados com nome do cliente e fazer cast de tipos
      return (data || []).map(item => ({
        ...item,
        cliente_nome: item.empresas_clientes?.nome_abreviado || item.empresas_clientes?.nome_completo,
        // Cast dos tipos específicos para compatibilidade com interface Requerimento
        modulo: item.modulo as any,
        linguagem: item.linguagem as any,
        tipo_cobranca: item.tipo_cobranca as any,
        status: item.status as any,
        // Garantir que horas_total seja sempre number
        horas_total: typeof item.horas_total === 'string' ? parseFloat(item.horas_total) : item.horas_total,
        horas_funcional: typeof item.horas_funcional === 'string' ? parseFloat(item.horas_funcional) : item.horas_funcional,
        horas_tecnico: typeof item.horas_tecnico === 'string' ? parseFloat(item.horas_tecnico) : item.horas_tecnico
      })) as Requerimento[];
    } catch (error) {
      console.error('Erro no faturamentoService.buscarRequerimentosParaFaturamento:', error);
      throw error;
    }
  }

  /**
   * Agrupa requerimentos por tipo de cobrança
   */
  agruparRequerimentosPorTipo(requerimentos: Requerimento[]): RelatorioFaturamento['requerimentos_por_tipo'] {
    const grupos: RelatorioFaturamento['requerimentos_por_tipo'] = {
      'Banco de Horas': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Cobro Interno': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Contrato': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Faturado': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Hora Extra': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Sobreaviso': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Reprovado': { quantidade: 0, horas_total: 0, requerimentos: [] },
      'Bolsão Enel': { quantidade: 0, horas_total: 0, requerimentos: [] }
    };

    requerimentos.forEach(req => {
      const tipo = req.tipo_cobranca;
      const tipoFaturamento = tipo as TipoCobrancaType;
      grupos[tipoFaturamento].quantidade += 1;
      grupos[tipoFaturamento].horas_total += typeof req.horas_total === 'string' ? parseFloat(req.horas_total) : req.horas_total;
      grupos[tipoFaturamento].requerimentos.push(req);
    });

    return grupos;
  }

  /**
   * Calcula totais de horas por categoria
   */
  calcularTotaisPorCategoria(requerimentos: Requerimento[]): EstatisticasFaturamento {
    const totais: EstatisticasFaturamento = {
      total_requerimentos: requerimentos.length,
      total_horas: 0,
      valor_estimado: 0,
      tipos_cobranca: {
        'Banco de Horas': { quantidade: 0, horas: 0, percentual: 0 },
        'Cobro Interno': { quantidade: 0, horas: 0, percentual: 0 },
        'Contrato': { quantidade: 0, horas: 0, percentual: 0 },
        'Faturado': { quantidade: 0, horas: 0, percentual: 0 },
        'Hora Extra': { quantidade: 0, horas: 0, percentual: 0 },
        'Sobreaviso': { quantidade: 0, horas: 0, percentual: 0 },
        'Reprovado': { quantidade: 0, horas: 0, percentual: 0 },
        'Bolsão Enel': { quantidade: 0, horas: 0, percentual: 0 }
      }
    };

    // Calcular totais por tipo
    requerimentos.forEach(req => {
      const tipo = req.tipo_cobranca;
      const horas = typeof req.horas_total === 'string' ? parseFloat(req.horas_total) : req.horas_total;
      const valorTotal = req.valor_total_geral || 0;

      totais.tipos_cobranca[tipo as TipoCobrancaType].quantidade += 1;
      totais.tipos_cobranca[tipo as TipoCobrancaType].horas += horas;
      totais.total_horas += horas;
      totais.valor_estimado! += valorTotal;
    });

    // Calcular percentuais
    Object.keys(totais.tipos_cobranca).forEach(tipo => {
      const tipoKey = tipo as TipoCobrancaType;
      if (totais.total_horas > 0) {
        totais.tipos_cobranca[tipoKey].percentual =
          (totais.tipos_cobranca[tipoKey].horas / totais.total_horas) * 100;
      }
    });

    return totais;
  }

  /**
   * Gera relatório completo de faturamento
   */
  async gerarRelatorioFaturamento(
    mes: number,
    ano: number = new Date().getFullYear()
  ): Promise<RelatorioFaturamento> {
    try {
      const requerimentos = await this.buscarRequerimentosParaFaturamento(mes, ano);
      const requerimentos_por_tipo = this.agruparRequerimentosPorTipo(requerimentos);
      const estatisticas = this.calcularTotaisPorCategoria(requerimentos);

      const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      return {
        periodo: `${nomesMeses[mes - 1]} de ${ano}`,
        mes_cobranca: `${String(mes).padStart(2, '0')}/${ano}`,
        ano_cobranca: ano,
        requerimentos_por_tipo,
        totais_gerais: {
          total_requerimentos: estatisticas.total_requerimentos,
          total_horas: estatisticas.total_horas,
          total_faturado: estatisticas.valor_estimado || 0
        }
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento:', error);
      throw error;
    }
  }

  /**
   * Gera relatório de faturamento apenas com requerimentos selecionados
   */
  async gerarRelatorioFaturamentoSelecionados(
    requerimentosSelecionados: Requerimento[],
    mes: number,
    ano: number = new Date().getFullYear()
  ): Promise<RelatorioFaturamento> {
    try {
      if (!requerimentosSelecionados || requerimentosSelecionados.length === 0) {
        throw new Error('Nenhum requerimento selecionado para gerar relatório');
      }

      const requerimentos_por_tipo = this.agruparRequerimentosPorTipo(requerimentosSelecionados);
      const estatisticas = this.calcularTotaisPorCategoria(requerimentosSelecionados);

      const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      return {
        periodo: `${nomesMeses[mes - 1]} de ${ano} (${requerimentosSelecionados.length} selecionados)`,
        mes_cobranca: `${String(mes).padStart(2, '0')}/${ano}`,
        ano_cobranca: ano,
        requerimentos_por_tipo,
        totais_gerais: {
          total_requerimentos: estatisticas.total_requerimentos,
          total_horas: estatisticas.total_horas,
          total_faturado: estatisticas.valor_estimado || 0
        }
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento selecionados:', error);
      throw error;
    }
  }

  /**
   * Cria template HTML para relatório de faturamento
   */
  criarTemplateEmailFaturamento(relatorio: RelatorioFaturamento): string {
    const tiposComRequerimentos = Object.entries(relatorio.requerimentos_por_tipo)
      .filter(([_, dados]) => dados.quantidade > 0);

    const corPorTipo: { [key in TipoCobrancaType]: string } = {
      'Banco de Horas': '#3B82F6',
      'Cobro Interno': '#10B981',
      'Contrato': '#6B7280',
      'Faturado': '#F59E0B',
      'Hora Extra': '#EF4444',
      'Sobreaviso': '#8B5CF6',
      'Reprovado': '#64748B',
      'Bolsão Enel': '#EAB308'
    };

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Faturamento - ${relatorio.periodo}</title>
</head>

<body style="margin:0; padding:0; background-color:#f4f6fb; font-family:Arial, sans-serif; color:#333;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6fb">
    <tr>
      <td align="center" style="padding:20px;">
        <!-- CONTAINER PRINCIPAL -->
        <table width="1000" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff"
          style="border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,0.08); overflow:hidden;">
          
          <!-- CABEÇALHO -->
          <tr>
            <td align="center" bgcolor="#2563eb" style="padding:30px 20px; color:#fff;">
              <h1 style="margin:0; font-size:24px; font-weight:bold;">Relatório de Faturamento</h1>
              <p style="margin:10px 0 0 0; font-size:16px;">Especificações Funcionais - ${relatorio.periodo}</p>
            </td>
          </tr>

          <!-- RESUMO -->
          <tr>
            <td style="padding:30px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" width="30%" style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                    <h3 style="margin:0; font-size:13px; color:#64748b; text-transform:uppercase;">Total de Requerimentos</h3>
                    <p style="margin:8px 0 0 0; font-size:28px; color:#2563eb; font-weight:bold;">${relatorio.totais_gerais.total_requerimentos}</p>
                  </td>
                  <td align="center" width="35%" style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                    <h3 style="margin:0; font-size:13px; color:#64748b; text-transform:uppercase;">Total de Horas</h3>
                    <p style="margin:8px 0 0 0; font-size:28px; color:#2563eb; font-weight:bold;">${(() => { const total = relatorio.totais_gerais.total_horas; const horas = Math.floor(total); const minutos = Math.round((total - horas) * 60); return `${horas}h ${minutos.toString().padStart(2, '0')}min`; })()}</p>
                  </td>
                  <td align="center" width="35%" style="padding:15px; border:1px solid #e2e8f0; border-radius:8px;">
                    <h3 style="margin:0; font-size:13px; color:#64748b; text-transform:uppercase;">Total Faturamento</h3>
                    <p style="margin:8px 0 0 0; font-size:28px; color:#2563eb; font-weight:bold;">R$ ${relatorio.totais_gerais.total_faturado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${tiposComRequerimentos.length === 0
        ? `
              <tr>
                <td align="center" style="padding:40px; color:#64748b; font-style:italic;">
                  <h3 style="margin:0;">Nenhum requerimento encontrado para faturamento</h3>
                  <p>Não há requerimentos enviados para faturamento no período de ${relatorio.periodo}.</p>
                </td>
              </tr>
              `
        : tiposComRequerimentos
          .map(
            ([tipo, dados]) => `
            <!-- BLOCO DE TIPO DE COBRANÇA -->
            <tr>
              <td style="padding:0 20px 30px 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0; border-radius:8px;">
                  <tr>
                    <td bgcolor="${corPorTipo[tipo]}" style="padding:15px; color:#fff; font-weight:bold; font-size:16px;">
                      ${tipo}
                    </td>
                    <td bgcolor="${corPorTipo[tipo]}" align="right" style="padding:15px; color:#fff; font-size:13px;">
                      ${dados.quantidade} requerimento${dados.quantidade !== 1 ? 's' : ''} • ${(() => { const total = dados.horas_total; const horas = Math.floor(total); const minutos = Math.round((total - horas) * 60); return `${horas}:${minutos.toString().padStart(2, '0')}`; })()}
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="padding:0;">
                      <table width="100%" cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse; font-size:14px;">
                        <thead>
                          <tr bgcolor="#f8fafc" style="color:#475569; font-weight:bold;">
                            <th align="left" style="padding:10px; border-bottom:2px solid #e2e8f0;">Chamado</th>
                            <th align="left" style="padding:10px; border-bottom:2px solid #e2e8f0;">Cliente</th>
                            <th align="left" style="padding:10px; border-bottom:2px solid #e2e8f0;">Módulo</th>
                            <th align="left" style="padding:10px; border-bottom:2px solid #e2e8f0;">Linguagem</th>
                            <th align="center" style="padding:10px; border-bottom:2px solid #e2e8f0;">H.Func</th>
                            <th align="center" style="padding:10px; border-bottom:2px solid #e2e8f0;">H.Téc</th>
                            <th align="center" style="padding:10px; border-bottom:2px solid #e2e8f0;">Total</th>
                            <th align="center" style="padding:10px; border-bottom:2px solid #e2e8f0;">Data Envio</th>
                            <th align="center" style="padding:10px; border-bottom:2px solid #e2e8f0;">Data Aprov.</th>
                            ${['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(tipo) ? '<th align="center" style="padding:10px; border-bottom:2px solid #e2e8f0;">Valor Total</th>' : ''}
                            ${['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel', 'Reprovado'].includes(tipo) ? '<th align="left" style="padding:10px; border-bottom:2px solid #e2e8f0;">Observação</th>' : ''}
                          </tr>
                        </thead>
                        <tbody>
                          ${dados.requerimentos
                .map(
                  (req) => `
                              <tr>
                                <td style="padding:10px;">
                                  <span style="font-family:'Courier New', monospace; background-color:#f1f5f9; padding:3px 6px; border-radius:4px;">
                                    ${req.chamado}
                                  </span>
                                </td>
                                <td style="padding:10px;">${req.cliente_nome || 'N/A'}</td>
                                <td style="padding:10px;">${req.modulo}</td>
                                <td style="padding:10px;">${req.linguagem}</td>
                                <td align="center" style="padding:10px; color:#059669; font-weight:bold;">
                                  ${(() => {
                      const horas = typeof req.horas_funcional === 'string' ? parseFloat(req.horas_funcional) : req.horas_funcional;
                      const horasInt = Math.floor(horas);
                      const minutos = Math.round((horas - horasInt) * 60);
                      return `${horasInt}:${minutos.toString().padStart(2, '0')}`;
                    })()}
                                </td>
                                <td align="center" style="padding:10px; color:#059669; font-weight:bold;">
                                  ${(() => {
                      const horas = typeof req.horas_tecnico === 'string' ? parseFloat(req.horas_tecnico) : req.horas_tecnico;
                      const horasInt = Math.floor(horas);
                      const minutos = Math.round((horas - horasInt) * 60);
                      return `${horasInt}:${minutos.toString().padStart(2, '0')}`;
                    })()}
                                </td>
                                <td align="center" style="padding:10px; color:#059669; font-weight:bold;">
                                  <div>
                                    ${(() => {
                      const horas = typeof req.horas_total === 'string' ? parseFloat(req.horas_total) : req.horas_total;
                      const horasInt = Math.floor(horas);
                      const minutos = Math.round((horas - horasInt) * 60);
                      return `${horasInt}:${minutos.toString().padStart(2, '0')}`;
                    })()}
                                    ${req.quantidade_tickets && req.quantidade_tickets > 0 ? `
                                      <br><span style="background-color:#dbeafe; color:#1d4ed8; padding:2px 6px; border-radius:12px; font-size:10px; font-weight:normal;">
                                        🎫 ${req.quantidade_tickets} ticket${req.quantidade_tickets > 1 ? 's' : ''}
                                      </span>
                                    ` : ''}
                                  </div>
                                </td>
                                <td align="center" style="padding:10px; color:#64748b;">
                                  ${(() => {
                                    const dateStr = req.data_envio;
                                    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                      const [year, month, day] = dateStr.split('-');
                                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      return date.toLocaleDateString('pt-BR');
                                    }
                                    return new Date(dateStr).toLocaleDateString('pt-BR');
                                  })()}
                                </td>
                                <td align="center" style="padding:10px; color:#64748b;">
                                  ${req.data_aprovacao ? (() => {
                                    const dateStr = req.data_aprovacao;
                                    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                      const [year, month, day] = dateStr.split('-');
                                      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                      return date.toLocaleDateString('pt-BR');
                                    }
                                    return new Date(dateStr).toLocaleDateString('pt-BR');
                                  })() : '-'}
                                </td>
                                ${['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(tipo) ? `
                                <td align="center" style="padding:10px; color:#64748b;">
                                  ${req.valor_total_geral && req.valor_total_geral > 0
                      ? `R$ ${req.valor_total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '-'}
                                </td>
                                ` : ''}
                                ${['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel', 'Reprovado'].includes(tipo) ? `
                                <td align="left" style="padding:10px; color:#64748b; font-size:12px; max-width:200px;">
                                  ${req.observacao || '-'}
                                </td>
                                ` : ''}
                              </tr>
                              `
                )
                .join('')}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            `
          )
          .join('')
      }

          <!-- RODAPÉ -->
          <tr>
            <td align="center" style="padding:20px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0;">
              Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}<br/>
              Sistema de Requerimentos
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();

  }

  /**
   * Dispara faturamento por email
   */
  async dispararFaturamento(emailFaturamento: EmailFaturamento): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    detalhes?: any;
  }> {
    try {
      console.log('Iniciando disparo de faturamento para:', emailFaturamento.destinatarios);

      // Validar destinatários
      if (!emailFaturamento.destinatarios || emailFaturamento.destinatarios.length === 0) {
        throw new Error('É necessário informar pelo menos um destinatário');
      }

      // Validar formato de email (destinatários principais)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailsInvalidos = emailFaturamento.destinatarios.filter(email => !emailRegex.test(email));

      // Validar formato de email (CC)
      const emailsCCInvalidos = (emailFaturamento.destinatariosCC || []).filter(email => !emailRegex.test(email));

      if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0) {
        const todosInvalidos = [...emailsInvalidos, ...emailsCCInvalidos];
        throw new Error(`E-mails inválidos: ${todosInvalidos.join(', ')}`);
      }

      // Preparar dados do email
      const emailData: EmailData = {
        to: emailFaturamento.destinatarios,
        cc: emailFaturamento.destinatariosCC && emailFaturamento.destinatariosCC.length > 0 ? emailFaturamento.destinatariosCC : undefined,
        subject: emailFaturamento.assunto,
        html: emailFaturamento.corpo,
        anexos: emailFaturamento.anexos
      };

      // Enviar email usando o emailService
      const resultado = await emailService.sendEmail(emailData);

      if (resultado.success) {
        // Registrar log de auditoria
        await this.registrarLogFaturamento({
          destinatarios: emailFaturamento.destinatarios,
          destinatariosCC: emailFaturamento.destinatariosCC,
          assunto: emailFaturamento.assunto,
          status: 'enviado',
          data_envio: new Date().toISOString()
        });

        const totalDestinatarios = emailFaturamento.destinatarios.length + (emailFaturamento.destinatariosCC?.length || 0);
        return {
          success: true,
          message: `Relatório de faturamento enviado com sucesso para ${totalDestinatarios} destinatário(s)`,
          detalhes: {
            destinatarios: emailFaturamento.destinatarios,
            destinatariosCC: emailFaturamento.destinatariosCC,
            data_envio: new Date().toISOString()
          }
        };
      } else {
        throw new Error(resultado.error || 'Erro desconhecido no envio do email');
      }
    } catch (error) {
      console.error('Erro ao disparar faturamento:', error);

      // Registrar log de erro
      await this.registrarLogFaturamento({
        destinatarios: emailFaturamento.destinatarios,
        destinatariosCC: emailFaturamento.destinatariosCC,
        assunto: emailFaturamento.assunto,
        status: 'erro',
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        data_envio: new Date().toISOString()
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao disparar faturamento'
      };
    }
  }

  /**
   * Registra log de operação de faturamento
   */
  private async registrarLogFaturamento(dados: {
    destinatarios: string[];
    destinatariosCC?: string[];
    assunto: string;
    status: 'enviado' | 'erro';
    erro?: string;
    data_envio: string;
  }): Promise<void> {
    try {
      const todosDestinatarios = [
        ...dados.destinatarios,
        ...(dados.destinatariosCC || []).map(email => `CC: ${email}`)
      ];

      await supabase
        .from('email_logs')
        .insert([{
          destinatario: todosDestinatarios.join(', '),
          assunto: `[FATURAMENTO] ${dados.assunto}`,
          status: dados.status,
          erro: dados.erro,
          enviado_em: dados.data_envio
        }]);
    } catch (error) {
      console.error('Erro ao registrar log de faturamento:', error);
      // Não propagar o erro para não interromper o fluxo principal
    }
  }

  /**
   * Busca estatísticas de faturamento por período
   */
  async buscarEstatisticasFaturamento(
    mesInicio: number,
    anoInicio: number,
    mesFim: number,
    anoFim: number
  ): Promise<EstatisticasFaturamento> {
    try {
      const { data, error } = await supabase
        .from('requerimentos')
        .select('tipo_cobranca, horas_total')
        .eq('status', 'enviado_faturamento')
        .gte('mes_cobranca', `${String(mesInicio).padStart(2, '0')}/${anoInicio}`)
        .lte('mes_cobranca', `${String(mesFim).padStart(2, '0')}/${anoFim}`)
        .gte('created_at', `${anoInicio}-01-01`)
        .lt('created_at', `${anoFim + 1}-01-01`);

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      // Converter dados parciais para formato compatível com calcularTotaisPorCategoria
      const requerimentosParciais = (data || []).map(item => ({
        ...item,
        tipo_cobranca: item.tipo_cobranca as any,
        horas_total: typeof item.horas_total === 'string' ? parseFloat(item.horas_total) : item.horas_total
      })) as Requerimento[];

      return this.calcularTotaisPorCategoria(requerimentosParciais);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de faturamento:', error);
      throw error;
    }
  }

  /**
   * Marca requerimentos como enviados
   */
  async marcarComoenviados(requerimentoIds: string[]): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      if (!requerimentoIds || requerimentoIds.length === 0) {
        throw new Error('É necessário informar pelo menos um requerimento');
      }

      const { error } = await supabase
        .from('requerimentos')
        .update({
          status: 'faturado',
          updated_at: new Date().toISOString()
        })
        .in('id', requerimentoIds);

      if (error) {
        throw new Error(`Erro ao marcar requerimentos como enviados: ${error.message}`);
      }

      return {
        success: true,
        message: `${requerimentoIds.length} requerimento(s) marcado(s) como faturado(s) com sucesso`
      };
    } catch (error) {
      console.error('Erro ao marcar requerimentos como enviados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

// Instância singleton do serviço
export const faturamentoService = new FaturamentoService();