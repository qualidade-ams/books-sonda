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
  mes_cobranca: number;
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
          empresas_clientes!inner(nome_completo)
        `)
        .eq('status', 'enviado_faturamento')
        .eq('mes_cobranca', mes)
        .gte('created_at', `${ano}-01-01`)
        .lt('created_at', `${ano + 1}-01-01`)
        .order('tipo_cobranca')
        .order('created_at');

      if (error) {
        throw new Error(`Erro ao buscar requerimentos para faturamento: ${error.message}`);
      }

      // Mapear dados com nome do cliente
      return (data || []).map(item => ({
        ...item,
        cliente_nome: item.empresas_clientes?.nome_completo
      }));
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
      grupos[tipo].quantidade += 1;
      grupos[tipo].horas_total += req.horas_total;
      grupos[tipo].requerimentos.push(req);
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
      totais.tipos_cobranca[tipo].quantidade += 1;
      totais.tipos_cobranca[tipo].horas += req.horas_total;
      totais.total_horas += req.horas_total;
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
        mes_cobranca: mes,
        ano_cobranca: ano,
        requerimentos_por_tipo,
        totais_gerais: {
          total_requerimentos: estatisticas.total_requerimentos,
          total_horas: estatisticas.total_horas
        }
      };
    } catch (error) {
      console.error('Erro ao gerar relatório de faturamento:', error);
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Faturamento - ${relatorio.periodo}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .header {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            margin: 0;
            font-size: 2.2em;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 1.1em;
            opacity: 0.9;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #2563eb;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #64748b;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .summary-card .value {
            font-size: 2.2em;
            font-weight: 700;
            color: #2563eb;
            margin: 0;
        }
        .tipo-section {
            background: white;
            margin-bottom: 30px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .tipo-header {
            padding: 20px 25px;
            color: white;
            font-weight: 600;
            font-size: 1.2em;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .tipo-stats {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .requerimentos-table {
            width: 100%;
            border-collapse: collapse;
        }
        .requerimentos-table th {
            background-color: #f8fafc;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 2px solid #e2e8f0;
        }
        .requerimentos-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        .requerimentos-table tr:hover {
            background-color: #f8fafc;
        }
        .chamado {
            font-family: 'Courier New', monospace;
            background-color: #f1f5f9;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        .horas {
            font-weight: 600;
            color: #059669;
        }
        .data {
            color: #64748b;
            font-size: 0.9em;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #64748b;
            font-size: 0.9em;
            border-top: 1px solid #e2e8f0;
        }
        .no-data {
            text-align: center;
            padding: 40px;
            color: #64748b;
            font-style: italic;
        }
        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            .header h1 {
                font-size: 1.8em;
            }
            .summary {
                grid-template-columns: 1fr;
            }
            .requerimentos-table {
                font-size: 0.9em;
            }
            .tipo-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Faturamento</h1>
        <p>Especificações Funcionais - ${relatorio.periodo}</p>
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>Total de Requerimentos</h3>
            <div class="value">${relatorio.totais_gerais.total_requerimentos}</div>
        </div>
        <div class="summary-card">
            <h3>Total de Horas</h3>
            <div class="value">${relatorio.totais_gerais.total_horas.toFixed(1)}</div>
        </div>
    </div>

    ${tiposComRequerimentos.length === 0 ? `
    <div class="no-data">
        <h3>Nenhum requerimento encontrado para faturamento</h3>
        <p>Não há requerimentos enviados para faturamento no período de ${relatorio.periodo}.</p>
    </div>
    ` : tiposComRequerimentos.map(([tipo, dados]) => `
    <div class="tipo-section">
        <div class="tipo-header" style="background-color: ${corPorTipo[tipo as TipoCobrancaType]};">
            <span>${tipo}</span>
            <div class="tipo-stats">
                ${dados.quantidade} requerimento${dados.quantidade !== 1 ? 's' : ''} • 
                ${dados.horas_total.toFixed(1)} horas
            </div>
        </div>
        <table class="requerimentos-table">
            <thead>
                <tr>
                    <th>Chamado</th>
                    <th>Cliente</th>
                    <th>Módulo</th>
                    <th>Linguagem</th>
                    <th>Horas Func.</th>
                    <th>Horas Téc.</th>
                    <th>Total Horas</th>
                    <th>Data Envio</th>
                </tr>
            </thead>
            <tbody>
                ${dados.requerimentos.map(req => `
                <tr>
                    <td><span class="chamado">${req.chamado}</span></td>
                    <td>${req.cliente_nome || 'N/A'}</td>
                    <td>${req.modulo}</td>
                    <td>${req.linguagem}</td>
                    <td class="horas">${req.horas_funcional.toFixed(1)}</td>
                    <td class="horas">${req.horas_tecnico.toFixed(1)}</td>
                    <td class="horas">${req.horas_total.toFixed(1)}</td>
                    <td class="data">${new Date(req.data_envio).toLocaleDateString('pt-BR')}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    `).join('')}

    <div class="footer">
        <p>Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        <p>Sistema de Requerimentos - Books SND</p>
    </div>
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

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailsInvalidos = emailFaturamento.destinatarios.filter(email => !emailRegex.test(email));
      if (emailsInvalidos.length > 0) {
        throw new Error(`E-mails inválidos: ${emailsInvalidos.join(', ')}`);
      }

      // Preparar dados do email
      const emailData: EmailData = {
        to: emailFaturamento.destinatarios,
        subject: emailFaturamento.assunto,
        html: emailFaturamento.corpo,
        attachments: emailFaturamento.anexos
      };

      // Enviar email usando o emailService
      const resultado = await emailService.sendEmail(emailData);

      if (resultado.success) {
        // Registrar log de auditoria
        await this.registrarLogFaturamento({
          destinatarios: emailFaturamento.destinatarios,
          assunto: emailFaturamento.assunto,
          status: 'enviado',
          data_envio: new Date().toISOString()
        });

        return {
          success: true,
          message: `Relatório de faturamento enviado com sucesso para ${emailFaturamento.destinatarios.length} destinatário(s)`,
          detalhes: {
            destinatarios: emailFaturamento.destinatarios,
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
    assunto: string;
    status: 'enviado' | 'erro';
    erro?: string;
    data_envio: string;
  }): Promise<void> {
    try {
      await supabase
        .from('email_logs')
        .insert([{
          destinatario: dados.destinatarios.join(', '),
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
        .gte('mes_cobranca', mesInicio)
        .lte('mes_cobranca', mesFim)
        .gte('created_at', `${anoInicio}-01-01`)
        .lt('created_at', `${anoFim + 1}-01-01`);

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      return this.calcularTotaisPorCategoria(data || []);
    } catch (error) {
      console.error('Erro ao buscar estatísticas de faturamento:', error);
      throw error;
    }
  }

  /**
   * Marca requerimentos como faturados
   */
  async marcarComoFaturados(requerimentoIds: string[]): Promise<{
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
        throw new Error(`Erro ao marcar requerimentos como faturados: ${error.message}`);
      }

      return {
        success: true,
        message: `${requerimentoIds.length} requerimento(s) marcado(s) como faturado(s) com sucesso`
      };
    } catch (error) {
      console.error('Erro ao marcar requerimentos como faturados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
}

// Instância singleton do serviço
export const faturamentoService = new FaturamentoService();