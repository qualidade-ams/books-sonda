import { supabase } from '@/integrations/supabase/client';
import type {
  HistoricoDisparo,
  HistoricoDisparoCompleto,
  HistoricoFiltros,
  ControleMensalCompleto,
  ControleMensalFiltros,
  EmpresaCliente,
  Colaborador,
  StatusDisparo,
  StatusControleMensal
} from '@/types/clientBooks';

export interface RelatorioMetricas {
  totalEmpresas: number;
  empresasAtivas: number;
  totalColaboradores: number;
  colaboradoresAtivos: number;
  emailsEnviadosMes: number;
  emailsFalharamMes: number;
  taxaSucessoMes: number;
  empresasSemBooks: EmpresaCliente[];
}

export interface RelatorioDetalhado {
  mes: number;
  ano: number;
  metricas: RelatorioMetricas;
  historico: HistoricoDisparoCompleto[];
  controlesMensais: ControleMensalCompleto[];
}

export interface FiltrosAvancados extends HistoricoFiltros {
  incluirInativos?: boolean;
  apenasComFalhas?: boolean;
  apenasComSucesso?: boolean;
  empresasIds?: string[];
  colaboradoresIds?: string[];
}

export interface ExportacaoConfig {
  formato: 'csv' | 'excel' | 'pdf';
  incluirDetalhes: boolean;
  incluirMetricas: boolean;
  filtros: FiltrosAvancados;
}

class HistoricoService {
  /**
   * Busca histórico detalhado de disparos com filtros avançados
   */
  async buscarHistoricoDetalhado(filtros: FiltrosAvancados): Promise<HistoricoDisparoCompleto[]> {
    try {
      let query = supabase
        .from('historico_disparos')
        .select(`
          *,
          empresas_clientes(*),
          colaboradores(*)
        `);

      // Aplicar filtros básicos
      if (filtros.empresaId) {
        query = query.eq('empresa_id', filtros.empresaId);
      }

      if (filtros.empresasIds && filtros.empresasIds.length > 0) {
        query = query.in('empresa_id', filtros.empresasIds);
      }

      if (filtros.colaboradorId) {
        query = query.eq('colaborador_id', filtros.colaboradorId);
      }

      if (filtros.colaboradoresIds && filtros.colaboradoresIds.length > 0) {
        query = query.in('colaborador_id', filtros.colaboradoresIds);
      }

      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }

      // Filtros específicos de sucesso/falha
      if (filtros.apenasComFalhas) {
        query = query.eq('status', 'falhou');
      }

      if (filtros.apenasComSucesso) {
        query = query.eq('status', 'enviado');
      }

      // Filtros de data
      if (filtros.dataInicio) {
        query = query.gte('data_disparo', filtros.dataInicio.toISOString());
      }

      if (filtros.dataFim) {
        query = query.lte('data_disparo', filtros.dataFim.toISOString());
      }

      // Filtro por mês/ano específico
      if (filtros.mes && filtros.ano) {
        const dataInicio = new Date(filtros.ano, filtros.mes - 1, 1);
        const dataFim = new Date(filtros.ano, filtros.mes, 0, 23, 59, 59);
        query = query.gte('data_disparo', dataInicio.toISOString())
                    .lte('data_disparo', dataFim.toISOString());
      }

      // Ordenação
      query = query.order('data_disparo', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico detalhado: ${error.message}`);
      }

      let historico = data || [];

      // Filtrar por status de empresa/colaborador se necessário
      if (!filtros.incluirInativos) {
        historico = historico.filter(item => 
          item.empresas_clientes?.status === 'ativo' &&
          item.colaboradores?.status === 'ativo'
        );
      }

      return historico;

    } catch (error) {
      throw new Error(`Erro ao buscar histórico detalhado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Gera relatório completo para um mês específico
   */
  async gerarRelatorioMensal(mes: number, ano: number): Promise<RelatorioDetalhado> {
    try {
      // Buscar métricas gerais
      const metricas = await this.calcularMetricasMensais(mes, ano);

      // Buscar histórico do mês
      const historico = await this.buscarHistoricoDetalhado({
        mes,
        ano,
        incluirInativos: false
      });

      // Buscar controles mensais
      const controlesMensais = await this.buscarControlesMensais({
        mes,
        ano
      });

      return {
        mes,
        ano,
        metricas,
        historico,
        controlesMensais
      };

    } catch (error) {
      throw new Error(`Erro ao gerar relatório mensal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Calcula métricas detalhadas para um mês
   */
  async calcularMetricasMensais(mes: number, ano: number): Promise<RelatorioMetricas> {
    try {
      // Contar empresas totais e ativas
      const { count: totalEmpresas } = await supabase
        .from('empresas_clientes')
        .select('*', { count: 'exact', head: true });

      const { count: empresasAtivas } = await supabase
        .from('empresas_clientes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // Contar colaboradores totais e ativos
      const { count: totalColaboradores } = await supabase
        .from('colaboradores')
        .select('*', { count: 'exact', head: true });

      const { count: colaboradoresAtivos } = await supabase
        .from('colaboradores')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      // Contar e-mails do mês
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59);

      const { count: emailsEnviadosMes } = await supabase
        .from('historico_disparos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'enviado')
        .gte('data_disparo', dataInicio.toISOString())
        .lte('data_disparo', dataFim.toISOString());

      const { count: emailsFalharamMes } = await supabase
        .from('historico_disparos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'falhou')
        .gte('data_disparo', dataInicio.toISOString())
        .lte('data_disparo', dataFim.toISOString());

      // Calcular taxa de sucesso
      const totalEmailsMes = (emailsEnviadosMes || 0) + (emailsFalharamMes || 0);
      const taxaSucessoMes = totalEmailsMes > 0 
        ? ((emailsEnviadosMes || 0) / totalEmailsMes) * 100 
        : 0;

      // Identificar empresas sem books no mês
      const empresasSemBooks = await this.identificarEmpresasSemBooks(mes, ano);

      return {
        totalEmpresas: totalEmpresas || 0,
        empresasAtivas: empresasAtivas || 0,
        totalColaboradores: totalColaboradores || 0,
        colaboradoresAtivos: colaboradoresAtivos || 0,
        emailsEnviadosMes: emailsEnviadosMes || 0,
        emailsFalharamMes: emailsFalharamMes || 0,
        taxaSucessoMes: Math.round(taxaSucessoMes * 100) / 100,
        empresasSemBooks
      };

    } catch (error) {
      throw new Error(`Erro ao calcular métricas mensais: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Identifica empresas que não receberam books em um mês específico
   */
  async identificarEmpresasSemBooks(mes: number, ano: number): Promise<EmpresaCliente[]> {
    try {
      // Buscar todas as empresas ativas
      const { data: empresasAtivas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('status', 'ativo');

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas ativas: ${empresasError.message}`);
      }

      if (!empresasAtivas || empresasAtivas.length === 0) {
        return [];
      }

      // Buscar empresas que tiveram disparos no mês
      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59);

      const { data: empresasComDisparos, error: disparosError } = await supabase
        .from('historico_disparos')
        .select('empresa_id')
        .eq('status', 'enviado')
        .gte('data_disparo', dataInicio.toISOString())
        .lte('data_disparo', dataFim.toISOString());

      if (disparosError) {
        throw new Error(`Erro ao buscar disparos: ${disparosError.message}`);
      }

      // Identificar empresas sem disparos
      const empresasComDisparosIds = new Set(
        (empresasComDisparos || []).map(d => d.empresa_id)
      );

      const empresasSemBooks = empresasAtivas.filter(
        empresa => !empresasComDisparosIds.has(empresa.id)
      );

      return empresasSemBooks;

    } catch (error) {
      throw new Error(`Erro ao identificar empresas sem books: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca controles mensais com filtros
   */
  async buscarControlesMensais(filtros: ControleMensalFiltros): Promise<ControleMensalCompleto[]> {
    try {
      let query = supabase
        .from('controle_mensal')
        .select(`
          *,
          empresas_clientes(*)
        `);

      if (filtros.mes) {
        query = query.eq('mes', filtros.mes);
      }

      if (filtros.ano) {
        query = query.eq('ano', filtros.ano);
      }

      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }

      if (filtros.empresaIds && filtros.empresaIds.length > 0) {
        query = query.in('empresa_id', filtros.empresaIds);
      }

      query = query.order('ano', { ascending: false })
                  .order('mes', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar controles mensais: ${error.message}`);
      }

      return data?.filter(item => item.empresas_clientes) as ControleMensalCompleto[] || [];

    } catch (error) {
      throw new Error(`Erro ao buscar controles mensais: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca estatísticas de performance por período
   */
  async buscarEstatisticasPerformance(
    dataInicio: Date, 
    dataFim: Date
  ): Promise<{
    totalDisparos: number;
    sucessos: number;
    falhas: number;
    taxaSucesso: number;
    empresasAtendidas: number;
    colaboradoresAtendidos: number;
    mediaDisparosPorDia: number;
  }> {
    try {
      // Buscar todos os disparos no período
      const { data: disparos, error } = await supabase
        .from('historico_disparos')
        .select('*')
        .gte('data_disparo', dataInicio.toISOString())
        .lte('data_disparo', dataFim.toISOString());

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      if (!disparos || disparos.length === 0) {
        return {
          totalDisparos: 0,
          sucessos: 0,
          falhas: 0,
          taxaSucesso: 0,
          empresasAtendidas: 0,
          colaboradoresAtendidos: 0,
          mediaDisparosPorDia: 0
        };
      }

      const totalDisparos = disparos.length;
      const sucessos = disparos.filter(d => d.status === 'enviado').length;
      const falhas = disparos.filter(d => d.status === 'falhou').length;
      const taxaSucesso = totalDisparos > 0 ? (sucessos / totalDisparos) * 100 : 0;

      // Contar empresas e colaboradores únicos
      const empresasUnicas = new Set(disparos.map(d => d.empresa_id));
      const colaboradoresUnicos = new Set(disparos.map(d => d.colaborador_id));

      // Calcular média de disparos por dia
      const diasPeriodo = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
      const mediaDisparosPorDia = diasPeriodo > 0 ? totalDisparos / diasPeriodo : 0;

      return {
        totalDisparos,
        sucessos,
        falhas,
        taxaSucesso: Math.round(taxaSucesso * 100) / 100,
        empresasAtendidas: empresasUnicas.size,
        colaboradoresAtendidos: colaboradoresUnicos.size,
        mediaDisparosPorDia: Math.round(mediaDisparosPorDia * 100) / 100
      };

    } catch (error) {
      throw new Error(`Erro ao buscar estatísticas de performance: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca histórico de uma empresa específica
   */
  async buscarHistoricoEmpresa(
    empresaId: string, 
    meses: number = 12
  ): Promise<{
    empresa: EmpresaCliente;
    historico: HistoricoDisparoCompleto[];
    estatisticas: {
      totalEnvios: number;
      sucessos: number;
      falhas: number;
      taxaSucesso: number;
      ultimoEnvio?: Date;
    };
  }> {
    try {
      // Buscar dados da empresa
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('id', empresaId)
        .single();

      if (empresaError || !empresa) {
        throw new Error(`Empresa não encontrada: ${empresaError?.message || 'ID inválido'}`);
      }

      // Calcular data de início (X meses atrás)
      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - meses);

      // Buscar histórico da empresa
      const historico = await this.buscarHistoricoDetalhado({
        empresaId,
        dataInicio,
        incluirInativos: true
      });

      // Calcular estatísticas
      const totalEnvios = historico.length;
      const sucessos = historico.filter(h => h.status === 'enviado').length;
      const falhas = historico.filter(h => h.status === 'falhou').length;
      const taxaSucesso = totalEnvios > 0 ? (sucessos / totalEnvios) * 100 : 0;

      const ultimoEnvio = historico.length > 0 && historico[0].data_disparo
        ? new Date(historico[0].data_disparo)
        : undefined;

      return {
        empresa,
        historico,
        estatisticas: {
          totalEnvios,
          sucessos,
          falhas,
          taxaSucesso: Math.round(taxaSucesso * 100) / 100,
          ultimoEnvio
        }
      };

    } catch (error) {
      throw new Error(`Erro ao buscar histórico da empresa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca colaboradores com mais falhas de envio
   */
  async buscarColaboradoresComFalhas(
    limite: number = 10,
    meses: number = 3
  ): Promise<{
    colaborador: Colaborador;
    empresa: EmpresaCliente;
    totalFalhas: number;
    ultimaFalha?: Date;
  }[]> {
    try {
      // Calcular data de início
      const dataInicio = new Date();
      dataInicio.setMonth(dataInicio.getMonth() - meses);

      // Buscar falhas agrupadas por colaborador
      const { data: falhas, error } = await supabase
        .from('historico_disparos')
        .select(`
          colaborador_id,
          data_disparo,
          colaboradores(*),
          empresas_clientes(*)
        `)
        .eq('status', 'falhou')
        .gte('data_disparo', dataInicio.toISOString())
        .order('data_disparo', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar falhas: ${error.message}`);
      }

      if (!falhas || falhas.length === 0) {
        return [];
      }

      // Agrupar por colaborador
      const falhasPorColaborador = new Map<string, {
        colaborador: Colaborador;
        empresa: EmpresaCliente;
        falhas: Date[];
      }>();

      for (const falha of falhas) {
        if (!falha.colaboradores || !falha.empresas_clientes) continue;

        const colaboradorId = falha.colaborador_id!;
        const dataFalha = new Date(falha.data_disparo!);

        if (!falhasPorColaborador.has(colaboradorId)) {
          falhasPorColaborador.set(colaboradorId, {
            colaborador: falha.colaboradores,
            empresa: falha.empresas_clientes,
            falhas: []
          });
        }

        falhasPorColaborador.get(colaboradorId)!.falhas.push(dataFalha);
      }

      // Converter para array e ordenar por número de falhas
      const resultado = Array.from(falhasPorColaborador.values())
        .map(item => ({
          colaborador: item.colaborador,
          empresa: item.empresa,
          totalFalhas: item.falhas.length,
          ultimaFalha: item.falhas.length > 0 ? item.falhas[0] : undefined
        }))
        .sort((a, b) => b.totalFalhas - a.totalFalhas)
        .slice(0, limite);

      return resultado;

    } catch (error) {
      throw new Error(`Erro ao buscar colaboradores com falhas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Exporta dados para diferentes formatos
   */
  async exportarDados(config: ExportacaoConfig): Promise<{
    dados: any[];
    nomeArquivo: string;
    tipo: string;
  }> {
    try {
      // Buscar dados baseado nos filtros
      const historico = await this.buscarHistoricoDetalhado(config.filtros);
      
      let dados: any[] = [];
      let nomeArquivo = '';

      // Preparar dados baseado no formato
      if (config.incluirDetalhes) {
        dados = historico.map(item => ({
          'Data Disparo': item.data_disparo ? new Date(item.data_disparo).toLocaleString('pt-BR') : '',
          'Empresa': item.empresas_clientes?.nome_completo || '',
          'Colaborador': item.colaboradores?.nome_completo || '',
          'Email': item.colaboradores?.email || '',
          'Status': this.formatarStatus(item.status),
          'Template': item.template_id || '',
          'Assunto': item.assunto || '',
          'Erro': item.erro_detalhes || '',
          'Emails CC': item.emails_cc?.join(', ') || ''
        }));
      }

      // Adicionar métricas se solicitado
      if (config.incluirMetricas && config.filtros.mes && config.filtros.ano) {
        const metricas = await this.calcularMetricasMensais(config.filtros.mes, config.filtros.ano);
        
        // Adicionar linha de métricas no início
        dados.unshift({
          'Data Disparo': 'MÉTRICAS DO MÊS',
          'Empresa': `Total de Empresas: ${metricas.totalEmpresas}`,
          'Colaborador': `Empresas Ativas: ${metricas.empresasAtivas}`,
          'Email': `E-mails Enviados: ${metricas.emailsEnviadosMes}`,
          'Status': `Taxa de Sucesso: ${metricas.taxaSucessoMes}%`,
          'Template': '',
          'Assunto': '',
          'Erro': '',
          'Emails CC': ''
        });
      }

      // Gerar nome do arquivo
      const agora = new Date();
      const timestamp = agora.toISOString().slice(0, 10);
      nomeArquivo = `historico_books_${timestamp}`;

      if (config.filtros.mes && config.filtros.ano) {
        nomeArquivo += `_${config.filtros.mes.toString().padStart(2, '0')}_${config.filtros.ano}`;
      }

      return {
        dados,
        nomeArquivo,
        tipo: config.formato
      };

    } catch (error) {
      throw new Error(`Erro ao exportar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Métodos auxiliares privados

  private formatarStatus(status: StatusDisparo): string {
    const statusMap: Record<StatusDisparo, string> = {
      'enviado': 'Enviado',
      'falhou': 'Falhou',
      'agendado': 'Agendado',
      'cancelado': 'Cancelado'
    };

    return statusMap[status] || status;
  }
}

export const historicoService = new HistoricoService();