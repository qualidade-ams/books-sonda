import { supabase } from '@/integrations/supabase/client';
import {
  GrupoResponsavel,
  GrupoResponsavelInsert,
  GrupoResponsavelUpdate,
  GrupoResponsavelCompleto,
  GrupoEmail,
  GrupoEmailInsert,
  GrupoFormData
} from '@/types/clientBooksTypes';

/**
 * Classe de erro específica para operações de grupo responsável
 */
export class GrupoResponsavelError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GrupoResponsavelError';
  }
}

/**
 * Serviço para gerenciamento de grupos responsáveis
 */
export class GruposResponsaveisService {
  /**
   * Criar um novo grupo responsável
   */
  async criarGrupo(data: GrupoFormData): Promise<GrupoResponsavel> {
    try {
      // Validações de negócio
      this.validarDadosGrupo(data);

      // Verificar se já existe grupo com mesmo nome
      await this.verificarNomeUnico(data.nome);

      // Preparar dados para inserção
      const grupoData: GrupoResponsavelInsert = {
        nome: data.nome.trim(),
        descricao: data.descricao?.trim() || null
      };

      // Inserir grupo
      const { data: grupo, error } = await supabase
        .from('grupos_responsaveis')
        .insert(grupoData)
        .select()
        .single();

      if (error) {
        throw new GrupoResponsavelError(`Erro ao criar grupo: ${error.message}`, 'CREATE_ERROR');
      }

      // Adicionar e-mails ao grupo
      if (data.emails && data.emails.length > 0) {
        await this.adicionarEmails(grupo.id, data.emails);
      }

      return grupo;
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao criar grupo: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Listar todos os grupos responsáveis
   */
  async listarGrupos(): Promise<GrupoResponsavelCompleto[]> {
    try {
      const { data, error } = await supabase
        .from('grupos_responsaveis')
        .select(`
          *,
          emails:grupo_emails(
            id,
            email,
            nome,
            created_at
          )
        `)
        .order('nome');

      if (error) {
        throw new GrupoResponsavelError(`Erro ao listar grupos: ${error.message}`, 'LIST_ERROR');
      }

      return data as GrupoResponsavelCompleto[] || [];
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao listar grupos: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Obter grupo por ID
   */
  async obterGrupoPorId(id: string): Promise<GrupoResponsavelCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('grupos_responsaveis')
        .select(`
          *,
          emails:grupo_emails(
            id,
            email,
            nome,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new GrupoResponsavelError(`Erro ao obter grupo: ${error.message}`, 'GET_ERROR');
      }

      return data as GrupoResponsavelCompleto || null;
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao obter grupo: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Obter grupo por nome
   */
  async obterGrupoPorNome(nome: string): Promise<GrupoResponsavelCompleto | null> {
    try {
      const { data, error } = await supabase
        .from('grupos_responsaveis')
        .select(`
          *,
          emails:grupo_emails(
            id,
            email,
            nome,
            created_at
          )
        `)
        .eq('nome', nome)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new GrupoResponsavelError(`Erro ao obter grupo por nome: ${error.message}`, 'GET_BY_NAME_ERROR');
      }

      return data as GrupoResponsavelCompleto || null;
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao obter grupo por nome: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Atualizar grupo responsável
   */
  async atualizarGrupo(id: string, data: Partial<GrupoFormData>): Promise<void> {
    try {
      // Validar dados se fornecidos
      if (data.nome || data.emails) {
        this.validarDadosGrupo({
          nome: data.nome || '',
          emails: data.emails || []
        }, true);
      }

      // Verificar nome único se foi alterado
      if (data.nome) {
        const grupoAtual = await this.obterGrupoPorId(id);
        if (!grupoAtual) {
          throw new GrupoResponsavelError('Grupo não encontrado', 'NOT_FOUND');
        }
        
        if (data.nome !== grupoAtual.nome) {
          await this.verificarNomeUnico(data.nome, id);
        }
      }

      // Preparar dados para atualização
      const updateData: GrupoResponsavelUpdate = {};
      
      if (data.nome) updateData.nome = data.nome.trim();
      if (data.descricao !== undefined) updateData.descricao = data.descricao?.trim() || null;
      
      updateData.updated_at = new Date().toISOString();

      // Atualizar grupo
      const { error } = await supabase
        .from('grupos_responsaveis')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw new GrupoResponsavelError(`Erro ao atualizar grupo: ${error.message}`, 'UPDATE_ERROR');
      }

      // Atualizar e-mails se fornecidos
      if (data.emails) {
        await this.atualizarEmails(id, data.emails);
      }
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao atualizar grupo: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Deletar grupo responsável
   */
  async deletarGrupo(id: string): Promise<void> {
    try {
      // Verificar se grupo está associado a alguma empresa
      const { data: empresas } = await supabase
        .from('empresa_grupos')
        .select('empresa_id')
        .eq('grupo_id', id);

      if (empresas && empresas.length > 0) {
        throw new GrupoResponsavelError(
          'Não é possível deletar grupo associado a empresas',
          'HAS_ASSOCIATED_COMPANIES'
        );
      }

      const { error } = await supabase
        .from('grupos_responsaveis')
        .delete()
        .eq('id', id);

      if (error) {
        throw new GrupoResponsavelError(`Erro ao deletar grupo: ${error.message}`, 'DELETE_ERROR');
      }
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao deletar grupo: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Adicionar e-mail ao grupo
   */
  async adicionarEmailAoGrupo(grupoId: string, email: string, nome?: string): Promise<GrupoEmail> {
    try {
      // Validar e-mail
      if (!this.validarEmail(email)) {
        throw new GrupoResponsavelError('E-mail inválido', 'INVALID_EMAIL');
      }

      // Verificar se e-mail já existe no grupo
      const { data: emailExistente } = await supabase
        .from('grupo_emails')
        .select('id')
        .eq('grupo_id', grupoId)
        .eq('email', email.toLowerCase().trim());

      if (emailExistente && emailExistente.length > 0) {
        throw new GrupoResponsavelError('E-mail já existe neste grupo', 'EMAIL_ALREADY_EXISTS');
      }

      const emailData: GrupoEmailInsert = {
        grupo_id: grupoId,
        email: email.toLowerCase().trim(),
        nome: nome?.trim() || null
      };

      const { data, error } = await supabase
        .from('grupo_emails')
        .insert(emailData)
        .select()
        .single();

      if (error) {
        throw new GrupoResponsavelError(`Erro ao adicionar e-mail: ${error.message}`, 'ADD_EMAIL_ERROR');
      }

      return data;
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao adicionar e-mail: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Remover e-mail do grupo
   */
  async removerEmailDoGrupo(grupoId: string, emailId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('grupo_emails')
        .delete()
        .eq('id', emailId)
        .eq('grupo_id', grupoId);

      if (error) {
        throw new GrupoResponsavelError(`Erro ao remover e-mail: ${error.message}`, 'REMOVE_EMAIL_ERROR');
      }
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao remover e-mail: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Associar grupo a empresa
   */
  async associarGrupoEmpresa(grupoId: string, empresaId: string): Promise<void> {
    try {
      // Verificar se associação já existe
      const { data: associacaoExistente } = await supabase
        .from('empresa_grupos')
        .select('id')
        .eq('grupo_id', grupoId)
        .eq('empresa_id', empresaId);

      if (associacaoExistente && associacaoExistente.length > 0) {
        throw new GrupoResponsavelError('Grupo já está associado a esta empresa', 'ASSOCIATION_ALREADY_EXISTS');
      }

      const { error } = await supabase
        .from('empresa_grupos')
        .insert({
          grupo_id: grupoId,
          empresa_id: empresaId
        });

      if (error) {
        throw new GrupoResponsavelError(`Erro ao associar grupo à empresa: ${error.message}`, 'ASSOCIATION_ERROR');
      }
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao associar grupo: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Desassociar grupo de empresa
   */
  async desassociarGrupoEmpresa(grupoId: string, empresaId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('empresa_grupos')
        .delete()
        .eq('grupo_id', grupoId)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new GrupoResponsavelError(`Erro ao desassociar grupo da empresa: ${error.message}`, 'DISASSOCIATION_ERROR');
      }
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao desassociar grupo: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Obter grupos associados a uma empresa
   */
  async obterGruposPorEmpresa(empresaId: string): Promise<GrupoResponsavelCompleto[]> {
    try {
      const { data, error } = await supabase
        .from('empresa_grupos')
        .select(`
          grupos_responsaveis(
            *,
            emails:grupo_emails(
              id,
              email,
              nome,
              created_at
            )
          )
        `)
        .eq('empresa_id', empresaId);

      if (error) {
        throw new GrupoResponsavelError(`Erro ao obter grupos da empresa: ${error.message}`, 'GET_BY_COMPANY_ERROR');
      }

      return data?.map(item => item.grupos_responsaveis).filter(Boolean) as GrupoResponsavelCompleto[] || [];
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao obter grupos da empresa: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  /**
   * Criar grupos padrão do sistema
   */
  async criarGruposPadrao(): Promise<void> {
    try {
      const gruposPadrao = [
        {
          nome: 'Comex',
          descricao: 'Grupo responsável pelo produto Comex',
          emails: []
        },
        {
          nome: 'Fiscal',
          descricao: 'Grupo responsável pelo produto Fiscal',
          emails: []
        },
        {
          nome: 'Gallery',
          descricao: 'Grupo responsável pelo produto Gallery',
          emails: []
        },
        {
          nome: 'Todos',
          descricao: 'Grupo com demais responsáveis',
          emails: [
            { email: 'andreia@sonda.com', nome: 'Andreia' },
            { email: 'qualidadeams@sonda.com', nome: 'Qualidade' }
          ]
        }
      ];

      for (const grupoPadrao of gruposPadrao) {
        // Verificar se grupo já existe
        const grupoExistente = await this.obterGrupoPorNome(grupoPadrao.nome);
        if (!grupoExistente) {
          await this.criarGrupo(grupoPadrao);
        }
      }
    } catch (error) {
      if (error instanceof GrupoResponsavelError) {
        throw error;
      }
      throw new GrupoResponsavelError(`Erro inesperado ao criar grupos padrão: ${error.message}`, 'UNEXPECTED_ERROR');
    }
  }

  // Métodos privados auxiliares

  private validarDadosGrupo(data: Partial<GrupoFormData>, isUpdate = false): void {
    if (!isUpdate && !data.nome?.trim()) {
      throw new GrupoResponsavelError('Nome do grupo é obrigatório', 'NOME_REQUIRED');
    }

    if (data.nome && data.nome.length > 100) {
      throw new GrupoResponsavelError('Nome do grupo deve ter no máximo 100 caracteres', 'NOME_TOO_LONG');
    }

    if (data.emails) {
      for (const emailData of data.emails) {
        if (!this.validarEmail(emailData.email)) {
          throw new GrupoResponsavelError(`E-mail inválido: ${emailData.email}`, 'INVALID_EMAIL');
        }
      }

      // Verificar e-mails duplicados
      const emails = data.emails.map(e => e.email.toLowerCase().trim());
      const emailsUnicos = new Set(emails);
      if (emails.length !== emailsUnicos.size) {
        throw new GrupoResponsavelError('Existem e-mails duplicados na lista', 'DUPLICATE_EMAILS');
      }
    }
  }

  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async verificarNomeUnico(nome: string, excludeId?: string): Promise<void> {
    let query = supabase
      .from('grupos_responsaveis')
      .select('id')
      .eq('nome', nome.trim());

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new GrupoResponsavelError(`Erro ao verificar nome único: ${error.message}`, 'NAME_CHECK_ERROR');
    }

    if (data && data.length > 0) {
      throw new GrupoResponsavelError('Já existe um grupo com este nome', 'NAME_ALREADY_EXISTS');
    }
  }

  private async adicionarEmails(grupoId: string, emails: Array<{ email: string; nome?: string }>): Promise<void> {
    const emailsData: GrupoEmailInsert[] = emails.map(emailData => ({
      grupo_id: grupoId,
      email: emailData.email.toLowerCase().trim(),
      nome: emailData.nome?.trim() || null
    }));

    const { error } = await supabase
      .from('grupo_emails')
      .insert(emailsData);

    if (error) {
      throw new GrupoResponsavelError(`Erro ao adicionar e-mails: ${error.message}`, 'ADD_EMAILS_ERROR');
    }
  }

  private async atualizarEmails(grupoId: string, emails: Array<{ email: string; nome?: string }>): Promise<void> {
    // Remover e-mails existentes
    await supabase
      .from('grupo_emails')
      .delete()
      .eq('grupo_id', grupoId);

    // Adicionar novos e-mails
    if (emails.length > 0) {
      await this.adicionarEmails(grupoId, emails);
    }
  }
}

// Instância singleton do serviço
export const gruposResponsaveisService = new GruposResponsaveisService();