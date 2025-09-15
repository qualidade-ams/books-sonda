import { supabase } from '@/integrations/supabase/client';
import {
  Colaborador,
  ColaboradorInsert,
  ColaboradorUpdate,
  ColaboradorCompleto,
  ColaboradorFormData,
  ColaboradorFiltros,
  COLABORADOR_STATUS
} from '@/types/clientBooksTypes';

/**
 * Classe de erro específica para operações de colaborador
 */
export class ColaboradorError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ColaboradorError';
  }
}

/**
 * Serviço para gerenciamento de colaboradores
 */
export class ColaboradoresService {
  /**
   * Criar um novo cliente
   */
  async criarColaborador(data: ColaboradorFormData): Promise<Colaborador> {
    try {
      // Validações de negócio
      await this.validarDadosColaborador(data);

      // Verificar se já existe colaborador com mesmo e-mail na empresa
      await this.verificarEmailUnico(data.email, data.empresaId);

      // Se for principal contato, remover flag de outros colaboradores da empresa
      if (data.principalContato) {
        await this.removerPrincipalContatoExistente(data.empresaId);
      }

      // Preparar dados para inserção
      const colaboradorData: ColaboradorInsert = {
        nome_completo: data.nomeCompleto.trim(),
        email: data.email.toLowerCase().trim(),
        funcao: data.funcao?.trim() || null,
        empresa_id: data.empresaId,
        status: data.status,
        data_status: new Date().toISOString(),
        descricao_status: data.descricaoStatus || null,
        principal_contato: data.principalContato
      };

      // Inserir colaborador
      const { data: colaborador, error } = await supabase
        .from('colaboradores')
        .insert(colaboradorData)
        .select()
        .single();

      if (error) {
        throw new ColaboradorError(`Erro ao criar colaborador: ${error.message}`, 'CREATE_ERROR');
      }

      return colaborador;
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao criar colaborador: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar colaboradores com filtros
   */
  async listarColaboradores(filtros?: ColaboradorFiltros): Promise<ColaboradorCompleto[]> {
    try {
      let query = supabase
        .from('colaboradores')
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
      } else {
        // Por padrão, mostrar apenas colaboradores ativos
        query = query.eq('status', COLABORADOR_STATUS.ATIVO as any);
      }

      if (filtros?.busca) {
        query = query.or(`nome_completo.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%,funcao.ilike.%${filtros.busca}%`);
      }

      const { data, error } = await query.order('nome_completo');

      if (error) {
        throw new ColaboradorError(`Erro ao listar colaboradores: ${error.message}`, 'LIST_ERROR');
      }

      return data as ColaboradorCompleto[] || [];
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao listar colaboradores: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar colaboradores por empresa
   */
  async listarPorEmpresa(empresaId: string): Promise<ColaboradorCompleto[]> {
    return this.listarColaboradores({ empresaId, status: [COLABORADOR_STATUS.ATIVO as any] });
  }

  /**
   * Obter colaborador por ID
   */
  async obterColaboradorPorId(id: string): Promise<ColaboradorCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
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
        throw new ColaboradorError(`Erro ao obter colaborador: ${error.message}`, 'GET_ERROR');
      }

      return data as ColaboradorCompleto || null;
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao obter colaborador: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Atualizar colaborador
   */
  async atualizarColaborador(id: string, data: Partial<ColaboradorFormData>): Promise<void> {
    try {
      // Obter dados atuais do colaborador
      const colaboradorAtual = await this.obterColaboradorPorId(id);
      if (!colaboradorAtual) {
        throw new ColaboradorError('Colaborador não encontrado', 'NOT_FOUND');
      }

      // Validar dados se fornecidos
      if (data.nomeCompleto || data.email || data.empresaId) {
        await this.validarDadosColaborador({
          ...colaboradorAtual,
          ...data
        } as ColaboradorFormData, true);
      }

      // Verificar e-mail único se foi alterado
      if (data.email && data.email !== colaboradorAtual.email) {
        await this.verificarEmailUnico(data.email, data.empresaId || colaboradorAtual.empresa_id, id);
      }

      // Se for principal contato, remover flag de outros colaboradores da empresa
      if (data.principalContato && !colaboradorAtual.principal_contato) {
        await this.removerPrincipalContatoExistente(data.empresaId || colaboradorAtual.empresa_id, id);
      }

      // Preparar dados para atualização
      const updateData: ColaboradorUpdate = {};

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

      // Atualizar colaborador
      const { error } = await supabase
        .from('colaboradores')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new ColaboradorError(`Erro ao atualizar colaborador: ${error.message}`, 'UPDATE_ERROR');
      }
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao atualizar colaborador: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Atualizar status do colaborador
   */
  async atualizarStatus(id: string, status: string, descricao: string): Promise<void> {
    try {
      if (!Object.values(COLABORADOR_STATUS).includes(status as any)) {
        throw new ColaboradorError('Status inválido', 'INVALID_STATUS');
      }

      if (status === COLABORADOR_STATUS.INATIVO && !descricao) {
        throw new ColaboradorError('Descrição é obrigatória para status Inativo', 'DESCRIPTION_REQUIRED');
      }

      const updateData: ColaboradorUpdate = {
        status: status as any,
        data_status: new Date().toISOString(),
        descricao_status: descricao,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('colaboradores')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new ColaboradorError(`Erro ao atualizar status: ${error.message}`, 'UPDATE_STATUS_ERROR');
      }
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao atualizar status: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Deletar colaborador
   */
  async deletarColaborador(id: string): Promise<void> {
    try {
      // Verificar se colaborador tem histórico de disparos
      const { data: historico } = await supabase
        .from('historico_disparos')
        .select('id')
        .eq('colaborador_id', id)
        .limit(1);

      if (historico && historico.length > 0) {
        throw new ColaboradorError(
          'Não é possível deletar colaborador com histórico de disparos',
          'HAS_DISPATCH_HISTORY'
        );
      }

      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);

      if (error) {
        throw new ColaboradorError(`Erro ao deletar colaborador: ${error.message}`, 'DELETE_ERROR');
      }
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao deletar colaborador: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Obter principal contato da empresa
   */
  async obterPrincipalContato(empresaId: string): Promise<ColaboradorCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('colaboradores')
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
        .eq('status', COLABORADOR_STATUS.ATIVO as any)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new ColaboradorError(`Erro ao obter principal contato: ${error.message}`, 'GET_PRINCIPAL_ERROR');
      }

      return data as ColaboradorCompleto || null;
    } catch (error) {
      if (error instanceof ColaboradorError) {
        throw error;
      }
      throw new ColaboradorError(`Erro inesperado ao obter principal contato: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar colaboradores ativos de uma empresa
   */
  async listarAtivos(empresaId: string): Promise<ColaboradorCompleto[]> {
    return this.listarColaboradores({
      empresaId,
      status: [COLABORADOR_STATUS.ATIVO as any]
    });
  }

  // Métodos privados auxiliares

  private async validarDadosColaborador(data: ColaboradorFormData, isUpdate = false): Promise<void> {
    if (!isUpdate) {
      if (!data.nomeCompleto?.trim()) {
        throw new ColaboradorError('Nome completo é obrigatório', 'NOME_COMPLETO_REQUIRED');
      }
      if (!data.email?.trim()) {
        throw new ColaboradorError('E-mail é obrigatório', 'EMAIL_REQUIRED');
      }
      if (!data.empresaId) {
        throw new ColaboradorError('Empresa é obrigatória', 'EMPRESA_REQUIRED');
      }
    }

    if (data.nomeCompleto && data.nomeCompleto.length > 255) {
      throw new ColaboradorError('Nome completo deve ter no máximo 255 caracteres', 'NOME_COMPLETO_TOO_LONG');
    }

    if (data.email && !this.validarEmail(data.email)) {
      throw new ColaboradorError('E-mail inválido', 'INVALID_EMAIL');
    }

    if (data.funcao && data.funcao.length > 100) {
      throw new ColaboradorError('Função deve ter no máximo 100 caracteres', 'FUNCAO_TOO_LONG');
    }

    if (data.status && !Object.values(COLABORADOR_STATUS).includes(data.status as any)) {
      throw new ColaboradorError('Status inválido', 'INVALID_STATUS');
    }

    if (data.status === COLABORADOR_STATUS.INATIVO && !data.descricaoStatus) {
      throw new ColaboradorError('Descrição é obrigatória para status Inativo', 'DESCRIPTION_REQUIRED');
    }

    // Verificar se empresa existe e está ativa
    if (data.empresaId) {
      const { data: empresa, error } = await supabase
        .from('empresas_clientes')
        .select('id, status')
        .eq('id', data.empresaId)
        .single();

      if (error || !empresa) {
        throw new ColaboradorError('Empresa não encontrada', 'EMPRESA_NOT_FOUND');
      }

      if (empresa.status !== 'ativo') {
        throw new ColaboradorError('Não é possível associar colaborador a empresa inativa', 'EMPRESA_INACTIVE');
      }
    }
  }

  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async verificarEmailUnico(email: string, empresaId: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('colaboradores')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('empresa_id', empresaId);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new ColaboradorError(`Erro ao verificar e-mail único: ${error.message}`, 'EMAIL_CHECK_ERROR');
    }

    if (data && data.length > 0) {
      throw new ColaboradorError('Já existe um colaborador com este e-mail nesta empresa', 'EMAIL_ALREADY_EXISTS');
    }
  }

  private async removerPrincipalContatoExistente(empresaId: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('colaboradores')
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
      throw new ColaboradorError(`Erro ao remover principal contato existente: ${error.message}`, 'REMOVE_PRINCIPAL_ERROR');
    }
  }
}

// Instância singleton do serviço
export const colaboradoresService = new ColaboradoresService();