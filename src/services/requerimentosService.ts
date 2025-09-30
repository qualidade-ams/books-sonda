import { supabase } from '@/integrations/supabase/client';
import {
  Requerimento,
  RequerimentoFormData,
  FaturamentoData,
  ClienteRequerimento,
  EstatisticasRequerimentos,
  FiltrosRequerimentos,
  TipoCobrancaType,
  StatusRequerimento
} from '@/types/requerimentos';
import { 
  converterParaHorasDecimal, 
  converterDeHorasDecimal,
  somarHoras,
  formatarHorasParaExibicao 
} from '@/utils/horasUtils';
import { converterParaBanco, converterDoBanco } from '@/utils/mesCobrancaUtils';

/**
 * Serviço para gerenciamento de requerimentos
 * Implementa CRUD completo, validações de negócio e métodos específicos
 */
export class RequerimentosService {
  /**
   * Criar um novo requerimento
   */
  async criarRequerimento(data: RequerimentoFormData): Promise<Requerimento> {
    // Validações de negócio
    this.validarDadosRequerimento(data);

    // Verificar se cliente existe
    await this.verificarClienteExiste(data.cliente_id);

    // Preparar dados para inserção (converter horas para decimal se necessário)
    const horasFuncionalDecimal = typeof data.horas_funcional === 'string' 
      ? converterParaHorasDecimal(data.horas_funcional)
      : data.horas_funcional;
    
    const horasTecnicoDecimal = typeof data.horas_tecnico === 'string'
      ? converterParaHorasDecimal(data.horas_tecnico)
      : data.horas_tecnico;

    const requerimentoData = {
      chamado: data.chamado.trim(),
      cliente_id: data.cliente_id,
      modulo: data.modulo,
      descricao: data.descricao.trim(),
      data_envio: data.data_envio,
      data_aprovacao: data.data_aprovacao?.trim() || null,
      horas_funcional: horasFuncionalDecimal,
      horas_tecnico: horasTecnicoDecimal,
      linguagem: data.linguagem,
      tipo_cobranca: data.tipo_cobranca,
      mes_cobranca: data.mes_cobranca,
      observacao: data.observacao?.trim() || null,
      // Campos de valor/hora (incluir apenas se fornecidos)
      valor_hora_funcional: data.valor_hora_funcional || null,
      valor_hora_tecnico: data.valor_hora_tecnico || null,
      // Campos de ticket (para Banco de Horas)
      tem_ticket: data.tem_ticket || false,
      quantidade_tickets: data.quantidade_tickets || null,
      status: 'lancado' as StatusRequerimento,
      enviado_faturamento: false
    };

    const { data: requerimento, error } = await supabase
      .from('requerimentos')
      .insert(requerimentoData)
      .select(`
        *,
        cliente:empresas_clientes(
          id,
          nome_abreviado
        )
      `)
      .single();

    if (error) {
      throw new Error(`Erro ao criar requerimento: ${error.message}`);
    }

    return this.formatarRequerimento(requerimento);
  }

  /**
   * Listar requerimentos com filtros
   */
  async listarRequerimentos(filtros?: FiltrosRequerimentos): Promise<Requerimento[]> {
    let query = supabase
      .from('requerimentos')
      .select(`
        *,
        cliente:empresas_clientes(
          id,
          nome_abreviado
        )
      `);

    // Aplicar filtros
    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }

    if (filtros?.tipo_cobranca) {
      query = query.eq('tipo_cobranca', filtros.tipo_cobranca);
    }

    if (filtros?.mes_cobranca) {
      query = query.eq('mes_cobranca', filtros.mes_cobranca);
    }

    if (filtros?.cliente_id) {
      query = query.eq('cliente_id', filtros.cliente_id);
    }

    if (filtros?.data_inicio) {
      query = query.gte('data_envio', filtros.data_inicio);
    }

    if (filtros?.data_fim) {
      query = query.lte('data_envio', filtros.data_fim);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao listar requerimentos: ${error.message}`);
    }

    return (data || []).map(this.formatarRequerimento);
  }

  /**
   * Buscar requerimentos não enviados para faturamento
   */
  async buscarRequerimentosNaoEnviados(): Promise<Requerimento[]> {
    return this.listarRequerimentos({
      status: 'lancado'
    });
  }

  /**
   * Buscar requerimentos por status e mês
   */
  async buscarRequerimentosPorStatusEMes(
    status: StatusRequerimento,
    mesCobranca?: string
  ): Promise<Requerimento[]> {
    const filtros: FiltrosRequerimentos = { status };
    
    if (mesCobranca) {
      filtros.mes_cobranca = mesCobranca;
    }

    return this.listarRequerimentos(filtros);
  }

  /**
   * Buscar requerimentos enviados para faturamento no mês atual
   */
  async buscarRequerimentosParaFaturamento(mesCobranca?: string): Promise<Requerimento[]> {
    const mesCobrancaAtual = mesCobranca || (() => {
      const hoje = new Date();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const ano = hoje.getFullYear();
      return `${mes}/${ano}`;
    })();
    
    return this.buscarRequerimentosPorStatusEMes('enviado_faturamento', mesCobrancaAtual);
  }

  /**
   * Obter requerimento por ID
   */
  async obterRequerimentoPorId(id: string): Promise<Requerimento | null> {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }

    const { data, error } = await supabase
      .from('requerimentos')
      .select(`
        *,
        cliente:empresas_clientes(
          id,
          nome_abreviado
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Erro ao obter requerimento: ${error.message}`);
    }

    return this.formatarRequerimento(data);
  }

  /**
   * Atualizar requerimento
   */
  async atualizarRequerimento(id: string, data: Partial<RequerimentoFormData>): Promise<void> {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }

    // Validar dados se fornecidos
    if (Object.keys(data).length > 0) {
      this.validarDadosRequerimento(data as RequerimentoFormData, true);
    }

    // Verificar se cliente existe (se cliente_id foi alterado)
    if (data.cliente_id) {
      await this.verificarClienteExiste(data.cliente_id);
    }

    // Preparar dados para atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.chamado) updateData.chamado = data.chamado.trim();
    if (data.cliente_id) updateData.cliente_id = data.cliente_id;
    if (data.modulo) updateData.modulo = data.modulo;
    if (data.descricao) updateData.descricao = data.descricao.trim();
    if (data.data_envio) updateData.data_envio = data.data_envio;
    if (data.data_aprovacao !== undefined) updateData.data_aprovacao = data.data_aprovacao?.trim() || null;
    if (data.horas_funcional !== undefined) {
      updateData.horas_funcional = typeof data.horas_funcional === 'string' 
        ? converterParaHorasDecimal(data.horas_funcional)
        : data.horas_funcional;
    }
    if (data.horas_tecnico !== undefined) {
      updateData.horas_tecnico = typeof data.horas_tecnico === 'string'
        ? converterParaHorasDecimal(data.horas_tecnico)
        : data.horas_tecnico;
    }
    if (data.linguagem) updateData.linguagem = data.linguagem;
    if (data.tipo_cobranca) updateData.tipo_cobranca = data.tipo_cobranca;
    if (data.mes_cobranca) updateData.mes_cobranca = data.mes_cobranca;
    if (data.observacao !== undefined) updateData.observacao = data.observacao?.trim() || null;
    // Campos de valor/hora
    if (data.valor_hora_funcional !== undefined) updateData.valor_hora_funcional = data.valor_hora_funcional || null;
    if (data.valor_hora_tecnico !== undefined) updateData.valor_hora_tecnico = data.valor_hora_tecnico || null;
    // Campos de ticket
    if (data.tem_ticket !== undefined) updateData.tem_ticket = data.tem_ticket || false;
    if (data.quantidade_tickets !== undefined) updateData.quantidade_tickets = data.quantidade_tickets || null;

    const { error } = await supabase
      .from('requerimentos')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao atualizar requerimento: ${error.message}`);
    }
  }

  /**
   * Deletar requerimento
   */
  async deletarRequerimento(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se requerimento existe
    const requerimento = await this.obterRequerimentoPorId(id);
    if (!requerimento) {
      throw new Error('Requerimento não encontrado');
    }

    // Não permitir deletar requerimentos já enviados para faturamento
    if (requerimento.enviado_faturamento) {
      throw new Error('Não é possível deletar requerimento já enviado para faturamento');
    }

    const { error } = await supabase
      .from('requerimentos')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao deletar requerimento: ${error.message}`);
    }
  }

  /**
   * Enviar requerimento para faturamento
   */
  async enviarParaFaturamento(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se requerimento existe
    const requerimento = await this.obterRequerimentoPorId(id);
    if (!requerimento) {
      throw new Error('Requerimento não encontrado');
    }

    // Verificar se já foi enviado
    if (requerimento.enviado_faturamento) {
      throw new Error('Requerimento já foi enviado para faturamento');
    }

    // Verificar se tipo de cobrança é válido para faturamento
    if (requerimento.tipo_cobranca === 'Selecione') {
      throw new Error('É necessário selecionar um tipo de cobrança válido antes de enviar para faturamento');
    }

    // Atualizar status
    const { error } = await supabase
      .from('requerimentos')
      .update({
        status: 'enviado_faturamento',
        enviado_faturamento: true,
        data_envio_faturamento: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao enviar requerimento para faturamento: ${error.message}`);
    }
  }

  /**
   * Buscar clientes da tabela empresas_clientes
   */
  async buscarClientes(): Promise<ClienteRequerimento[]> {
    const { data, error } = await supabase
      .from('empresas_clientes')
      .select('id, nome_abreviado')
      .eq('status', 'ativo')
      .order('nome_abreviado');

    if (error) {
      throw new Error(`Erro ao buscar clientes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Gerar dados para faturamento agrupados por tipo de cobrança
   */
  async gerarDadosFaturamento(mesCobranca?: string): Promise<FaturamentoData> {
    const requerimentos = await this.buscarRequerimentosParaFaturamento(mesCobranca);

    // Agrupar por tipo de cobrança
    const totais: FaturamentoData['totais'] = {} as any;

    // Inicializar totais para todos os tipos de cobrança
    const tiposCobranca: TipoCobrancaType[] = [
      'Banco de Horas', 'Cobro Interno', 'Contrato', 'Faturado',
      'Hora Extra', 'Sobreaviso', 'Reprovado', 'Bolsão Enel'
    ];

    tiposCobranca.forEach(tipo => {
      totais[tipo] = {
        quantidade: 0,
        horas_total: 0
      };
    });

    // Calcular totais
    requerimentos.forEach(req => {
      totais[req.tipo_cobranca].quantidade += 1;
      totais[req.tipo_cobranca].horas_total += Number(req.horas_total || 0);
    });

    return {
      requerimentos,
      totais
    };
  }

  /**
   * Obter estatísticas dos requerimentos
   */
  async obterEstatisticas(filtros?: FiltrosRequerimentos): Promise<EstatisticasRequerimentos> {
    const requerimentos = await this.listarRequerimentos(filtros);

    const stats: EstatisticasRequerimentos = {
      total_requerimentos: requerimentos.length,
      total_horas: 0,
      requerimentos_por_status: {
        lancado: 0,
        enviado_faturamento: 0,
        faturado: 0
      },
      requerimentos_por_tipo_cobranca: {} as any,
      horas_por_tipo_cobranca: {} as any
    };

    // Inicializar contadores
    const tiposCobranca: TipoCobrancaType[] = [
      'Banco de Horas', 'Cobro Interno', 'Contrato', 'Faturado',
      'Hora Extra', 'Sobreaviso', 'Reprovado', 'Bolsão Enel'
    ];

    tiposCobranca.forEach(tipo => {
      stats.requerimentos_por_tipo_cobranca[tipo] = 0;
      stats.horas_por_tipo_cobranca[tipo] = 0;
    });

    // Calcular estatísticas
    requerimentos.forEach(req => {
      stats.total_horas += Number(req.horas_total || 0);
      stats.requerimentos_por_status[req.status] += 1;
      stats.requerimentos_por_tipo_cobranca[req.tipo_cobranca] += 1;
      stats.horas_por_tipo_cobranca[req.tipo_cobranca] += Number(req.horas_total || 0);
    });

    return stats;
  }

  // Métodos privados de validação e formatação

  /**
   * Validar dados do requerimento
   */
  private validarDadosRequerimento(data: RequerimentoFormData, isUpdate = false): void {
    const errors: string[] = [];

    // Validações obrigatórias (Requirements 9.1-9.9)
    if (!isUpdate || data.chamado !== undefined) {
      if (!data.chamado?.trim()) {
        errors.push('Chamado é obrigatório');
      } else if (!/^[A-Za-z0-9\-]+$/.test(data.chamado.trim())) {
        errors.push('Chamado deve conter apenas letras, números e hífen');
      }
    }

    if (!isUpdate || data.cliente_id !== undefined) {
      if (!data.cliente_id?.trim()) {
        errors.push('Cliente é obrigatório');
      }
    }

    if (!isUpdate || data.modulo !== undefined) {
      if (!data.modulo) {
        errors.push('Módulo é obrigatório');
      }
    }

    if (!isUpdate || data.descricao !== undefined) {
      if (!data.descricao?.trim()) {
        errors.push('Descrição é obrigatória');
      } else if (data.descricao.trim().length > 500) {
        errors.push('Descrição deve ter no máximo 500 caracteres');
      }
    }

    if (!isUpdate || data.data_envio !== undefined) {
      if (!data.data_envio) {
        errors.push('Data de envio é obrigatória');
      }
    }

    // Data de aprovação é opcional - não validar se obrigatória
    // Apenas validar se fornecida e se é válida em relação à data de envio

    if (!isUpdate || data.horas_funcional !== undefined || data.horas_tecnico !== undefined) {
      const horasFuncional = Number(data.horas_funcional || 0);
      const horasTecnico = Number(data.horas_tecnico || 0);
      
      if (data.horas_funcional === undefined || horasFuncional < 0) {
        errors.push('Horas funcionais são obrigatórias e devem ser >= 0');
      }
      if (data.horas_tecnico === undefined || horasTecnico < 0) {
        errors.push('Horas técnicas são obrigatórias e devem ser >= 0');
      }
      if (horasFuncional + horasTecnico === 0) {
        errors.push('Deve haver pelo menos uma hora (funcional ou técnica)');
      }
    }

    if (!isUpdate || data.linguagem !== undefined) {
      if (!data.linguagem) {
        errors.push('Linguagem é obrigatória');
      }
    }

    if (!isUpdate || data.tipo_cobranca !== undefined) {
      if (!data.tipo_cobranca) {
        errors.push('Tipo de cobrança é obrigatório');
      }
    }

    if (!isUpdate || data.mes_cobranca !== undefined) {
      if (!data.mes_cobranca || !data.mes_cobranca.match(/^(0[1-9]|1[0-2])\/\d{4}$/)) {
        errors.push('Mês de cobrança é obrigatório e deve estar no formato MM/YYYY');
      }
    }

    // Validar observação se fornecida
    if (data.observacao && data.observacao.trim().length > 1000) {
      errors.push('Observação deve ter no máximo 1000 caracteres');
    }

    // Validar datas
    if (data.data_envio && data.data_aprovacao) {
      const dataEnvio = new Date(data.data_envio);
      const dataAprovacao = new Date(data.data_aprovacao);
      
      if (dataAprovacao < dataEnvio) {
        errors.push('Data de aprovação não pode ser anterior à data de envio');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Dados inválidos: ${errors.join(', ')}`);
    }
  }

  /**
   * Verificar se cliente existe
   */
  private async verificarClienteExiste(clienteId: string): Promise<void> {
    const { data, error } = await supabase
      .from('empresas_clientes')
      .select('id')
      .eq('id', clienteId)
      .eq('status', 'ativo')
      .single();

    if (error || !data) {
      throw new Error('Cliente não encontrado ou inativo');
    }
  }

  /**
   * Formatar requerimento com dados do cliente
   */
  private formatarRequerimento(data: any): Requerimento {
    // Converter horas decimais de volta para formato HH:MM para exibição
    const horasFuncional = typeof data.horas_funcional === 'number' 
      ? converterDeHorasDecimal(data.horas_funcional)
      : data.horas_funcional;
    
    const horasTecnico = typeof data.horas_tecnico === 'number'
      ? converterDeHorasDecimal(data.horas_tecnico)
      : data.horas_tecnico;

    // Calcular total das horas
    const horasTotal = somarHoras(
      horasFuncional?.toString() || '0',
      horasTecnico?.toString() || '0'
    );

    return {
      id: data.id,
      chamado: data.chamado,
      cliente_id: data.cliente_id,
      cliente_nome: data.cliente?.nome_abreviado,
      modulo: data.modulo,
      descricao: data.descricao,
      data_envio: data.data_envio,
      data_aprovacao: data.data_aprovacao,
      horas_funcional: horasFuncional,
      horas_tecnico: horasTecnico,
      horas_total: horasTotal,
      linguagem: data.linguagem,
      tipo_cobranca: data.tipo_cobranca,
      mes_cobranca: data.mes_cobranca,
      observacao: data.observacao,
      status: data.status,
      enviado_faturamento: data.enviado_faturamento,
      data_envio_faturamento: data.data_envio_faturamento,
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Campos de valor/hora
      valor_hora_funcional: data.valor_hora_funcional,
      valor_hora_tecnico: data.valor_hora_tecnico,
      valor_total_funcional: data.valor_total_funcional,
      valor_total_tecnico: data.valor_total_tecnico,
      valor_total_geral: data.valor_total_geral
    };
  }
}

// Instância singleton do serviço
export const requerimentosService = new RequerimentosService();