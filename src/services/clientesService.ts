import { supabase } from '@/integrations/supabase/client';
import {
  Cliente,
  ClienteInsert,
  ClienteUpdate,
  ClienteCompleto,
  ClienteFormData,
  ClienteFiltros,
  Cliente_STATUS
} from '@/types/clientBooksTypes';

/**
 * Classe de erro específica para operações de cliente
 */
export class ClienteError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ClienteError';
  }
}

/**
 * Serviço para gerenciamento de clientes
 */
export class ClientesService {
  /**
   * Criar um novo cliente
   */
  async criarCliente(data: ClienteFormData): Promise<Cliente> {
    try {
      // Validações de negócio
      await this.validarDadosCliente(data);

      // Verificar se já existe cliente com mesmo e-mail na empresa
      await this.verificarEmailUnico(data.email, data.empresaId);

      // Se for principal contato, remover flag de outros clientes da empresa
      if (data.principalContato) {
        await this.removerPrincipalContatoExistente(data.empresaId);
      }

      // Preparar dados para inserção
      const clienteData: ClienteInsert = {
        nome_completo: data.nomeCompleto.trim(),
        email: data.email.toLowerCase().trim(),
        funcao: data.funcao?.trim() || null,
        empresa_id: data.empresaId,
        status: data.status,
        data_status: new Date().toISOString(),
        descricao_status: data.descricaoStatus || null,
        principal_contato: data.principalContato
      };

      // Inserir cliente
      const { data: cliente, error } = await supabase
        .from('clientes')
        .insert(clienteData)
        .select()
        .single();

      if (error) {
        throw new ClienteError(`Erro ao criar cliente: ${error.message}`, 'CREATE_ERROR');
      }

      return cliente;
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao criar cliente: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar clientes com filtros
   */
  async listarClientes(filtros?: ClienteFiltros): Promise<ClienteCompleto[]> {
    try {
      let query = supabase
        .from('clientes')
        .select(`
          *,
          empresa:empresas_clientes(
            id,
            nome_completo,
            nome_abreviado,
            status
          )
        `);

      // Aplicar filtros
      if (filtros?.empresaId) {
        query = query.eq('empresa_id', filtros.empresaId);
      }

      if (filtros?.status && filtros.status.length > 0) {
        if (filtros.status.length === 1) {
          query = query.eq('status', filtros.status[0]);
        } else {
          query = query.in('status', filtros.status);
        }
      }
      // Comentado temporariamente para debug - mostrar todos os clientes
      // else {
      //   // Por padrão, mostrar apenas clientes ativos
      //   query = query.eq('status', Cliente_STATUS.ATIVO as any);
      // }

      if (filtros?.busca) {
        query = query.or(`nome_completo.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,funcao.ilike.%${filtros.busca}%`);
      }

      const { data, error } = await query.order('nome_completo');

      if (error) {
        console.error('Erro na query de clientes:', error);
        throw new ClienteError(`Erro ao listar clientes: ${error.message}`, 'LIST_ERROR');
      }

      console.log('Clientes retornados do banco:', data);
      return data as ClienteCompleto[] || [];
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao listar clientes: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar clientes por empresa
   */
  async listarPorEmpresa(empresaId: string): Promise<ClienteCompleto[]> {
    return this.listarClientes({ empresaId, status: [Cliente_STATUS.ATIVO as any] });
  }

  /**
   * Obter cliente por ID
   */
  async obterClientePorId(id: string): Promise<ClienteCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          empresa:empresas_clientes(
            id,
            nome_completo,
            nome_abreviado,
            status,
            template_padrao,
            email_gestor
          )
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new ClienteError(`Erro ao obter cliente: ${error.message}`, 'GET_ERROR');
      }

      return data as ClienteCompleto || null;
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao obter cliente: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Atualizar cliente
   */
  async atualizarCliente(id: string, data: Partial<ClienteFormData>): Promise<void> {
    try {
      // Obter dados atuais do cliente
      const clienteAtual = await this.obterClientePorId(id);
      if (!clienteAtual) {
        throw new ClienteError('Cliente não encontrado', 'NOT_FOUND');
      }

      // Validar dados se fornecidos
      if (data.nomeCompleto || data.email || data.empresaId) {
        await this.validarDadosCliente({
          ...clienteAtual,
          ...data
        } as ClienteFormData, true);
      }

      // Verificar e-mail único se foi alterado
      if (data.email && data.email !== clienteAtual.email) {
        await this.verificarEmailUnico(data.email, data.empresaId || clienteAtual.empresa_id, id);
      }

      // Se for principal contato, remover flag de outros clientes da empresa
      if (data.principalContato && !clienteAtual.principal_contato) {
        await this.removerPrincipalContatoExistente(data.empresaId || clienteAtual.empresa_id, id);
      }

      // Preparar dados para atualização
      const updateData: ClienteUpdate = {};

      if (data.nomeCompleto) updateData.nome_completo = data.nomeCompleto.trim();
      if (data.email) updateData.email = data.email.toLowerCase().trim();
      if (data.funcao !== undefined) updateData.funcao = data.funcao?.trim() || null;
      if (data.empresaId) updateData.empresa_id = data.empresaId;
      if (data.principalContato !== undefined) updateData.principal_contato = data.principalContato;

      // Se status mudou, atualizar data e descrição
      if (data.status) {
        updateData.status = data.status;
        updateData.data_status = new Date().toISOString();
        updateData.descricao_status = data.descricaoStatus || null;
      }

      updateData.updated_at = new Date().toISOString();

      // Atualizar cliente
      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new ClienteError(`Erro ao atualizar cliente: ${error.message}`, 'UPDATE_ERROR');
      }
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao atualizar cliente: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Atualizar status do cliente
   */
  async atualizarStatus(id: string, status: string, descricao: string): Promise<void> {
    try {
      if (!Object.values(Cliente_STATUS).includes(status as any)) {
        throw new ClienteError('Status inválido', 'INVALID_STATUS');
      }

      if (status === Cliente_STATUS.INATIVO && !descricao) {
        throw new ClienteError('Descrição é obrigatória para status Inativo', 'DESCRIPTION_REQUIRED');
      }

      const updateData: ClienteUpdate = {
        status: status as any,
        data_status: new Date().toISOString(),
        descricao_status: descricao,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('clientes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new ClienteError(`Erro ao atualizar status: ${error.message}`, 'UPDATE_STATUS_ERROR');
      }
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao atualizar status: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Deletar cliente
   */
  async deletarCliente(id: string): Promise<void> {
    try {
      // Verificar se cliente tem histórico de disparos
      const { data: historico } = await supabase
        .from('historico_disparos')
        .select('id')
        .eq('cliente_id', id)
        .limit(1);

      if (historico && historico.length > 0) {
        throw new ClienteError(
          'Não é possível deletar cliente com histórico de disparos',
          'HAS_DISPATCH_HISTORY'
        );
      }

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) {
        throw new ClienteError(`Erro ao deletar cliente: ${error.message}`, 'DELETE_ERROR');
      }
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao deletar cliente: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Obter principal contato da empresa
   */
  async obterPrincipalContato(empresaId: string): Promise<ClienteCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          empresa:empresas_clientes(
            id,
            nome_completo,
            nome_abreviado,
            status
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('principal_contato', true)
        .eq('status', Cliente_STATUS.ATIVO as any)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new ClienteError(`Erro ao obter principal contato: ${error.message}`, 'GET_PRINCIPAL_ERROR');
      }

      return data as ClienteCompleto || null;
    } catch (error) {
      if (error instanceof ClienteError) {
        throw error;
      }
      throw new ClienteError(`Erro inesperado ao obter principal contato: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar clientes ativos de uma empresa
   */
  async listarAtivos(empresaId: string): Promise<ClienteCompleto[]> {
    return this.listarClientes({
      empresaId,
      status: [Cliente_STATUS.ATIVO as any]
    });
  }

  // Métodos privados auxiliares

  private async validarDadosCliente(data: ClienteFormData, isUpdate = false): Promise<void> {
    if (!isUpdate) {
      if (!data.nomeCompleto?.trim()) {
        throw new ClienteError('Nome completo é obrigatório', 'NOME_COMPLETO_REQUIRED');
      }
      if (!data.email?.trim()) {
        throw new ClienteError('E-mail é obrigatório', 'EMAIL_REQUIRED');
      }
      if (!data.empresaId) {
        throw new ClienteError('Empresa é obrigatória', 'EMPRESA_REQUIRED');
      }
    }

    if (data.nomeCompleto && data.nomeCompleto.length > 255) {
      throw new ClienteError('Nome completo deve ter no máximo 255 caracteres', 'NOME_COMPLETO_TOO_LONG');
    }

    if (data.email && !this.validarEmail(data.email)) {
      throw new ClienteError('E-mail inválido', 'INVALID_EMAIL');
    }

    if (data.funcao && data.funcao.length > 100) {
      throw new ClienteError('Função deve ter no máximo 100 caracteres', 'FUNCAO_TOO_LONG');
    }

    if (data.status && !Object.values(Cliente_STATUS).includes(data.status as any)) {
      throw new ClienteError('Status inválido', 'INVALID_STATUS');
    }

    if (data.status === Cliente_STATUS.INATIVO && !data.descricaoStatus) {
      throw new ClienteError('Descrição é obrigatória para status Inativo', 'DESCRIPTION_REQUIRED');
    }

    // Verificar se empresa existe e está ativa
    if (data.empresaId) {
      const { data: empresa, error } = await supabase
        .from('empresas_clientes')
        .select('id, status')
        .eq('id', data.empresaId)
        .single();

      if (error || !empresa) {
        throw new ClienteError('Empresa não encontrada', 'EMPRESA_NOT_FOUND');
      }

      if (empresa.status !== 'ativo') {
        throw new ClienteError('Não é possível associar cliente a empresa inativa', 'EMPRESA_INACTIVE');
      }
    }
  }

  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async verificarEmailUnico(email: string, empresaId: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('clientes')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('empresa_id', empresaId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new ClienteError(`Erro ao verificar e-mail único: ${error.message}`, 'EMAIL_CHECK_ERROR');
    }

    if (data && data.length > 0) {
      throw new ClienteError('Já existe um cliente com este e-mail nesta empresa', 'EMAIL_ALREADY_EXISTS');
    }
  }

  private async removerPrincipalContatoExistente(empresaId: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('clientes')
      .update({
        principal_contato: false,
        updated_at: new Date().toISOString()
      })
      .eq('empresa_id', empresaId)
      .eq('principal_contato', true);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { error } = await query;

    if (error) {
      throw new ClienteError(`Erro ao remover principal contato existente: ${error.message}`, 'REMOVE_PRINCIPAL_ERROR');
    }
  }
}

// Instância singleton do serviço
export const clientesService = new ClientesService();