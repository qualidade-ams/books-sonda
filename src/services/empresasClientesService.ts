import { supabase } from '@/integrations/supabase/client';
import {
  EmpresaCliente,
  EmpresaClienteInsert,
  EmpresaClienteUpdate,
  EmpresaClienteCompleta,
  EmpresaFormData,
  EmpresaFiltros,
  StatusEmpresa,
  Produto
} from '@/types/clientBooks';
import { empresaFormSchema } from '@/schemas/clientBooksSchemas';
import { 
  ClientBooksError, 
  ClientBooksErrorFactory 
} from '@/errors/clientBooksErrors';
import { PaginationUtils, type PaginationParams, type PaginationResult } from '@/utils/paginationUtils';
import { clientBooksCacheService } from './clientBooksCache';

// Constantes para validação
export const EMPRESA_STATUS = {
  ATIVO: 'ativo' as const,
  INATIVO: 'inativo' as const,
  SUSPENSO: 'suspenso' as const,
};

export const PRODUTOS = {
  CE_PLUS: 'CE_PLUS' as const,
  FISCAL: 'FISCAL' as const,
  GALLERY: 'GALLERY' as const,
};

// Interface para resultado de importação (será implementada na tarefa 7.1)
export interface ImportResult {
  success: number;
  errors: Array<{ line: number; message: string }>;
  total: number;
}

// Removido - usando ClientBooksError agora

/**
 * Serviço para gerenciamento de empresas clientes
 */
export class EmpresasClientesService {
  /**
   * Criar uma nova empresa cliente
   */
  async criarEmpresa(data: EmpresaFormData): Promise<EmpresaCliente> {
    // Validação básica
    this.validarDadosEmpresa(data);

    // Verificar duplicatas
    await this.verificarDuplicatas(data.nomeCompleto, data.nomeAbreviado);

    // Preparar dados para inserção
    const empresaData: EmpresaClienteInsert = {
      nome_completo: data.nomeCompleto,
      nome_abreviado: data.nomeAbreviado,
      link_sharepoint: data.linkSharepoint || null,
      template_padrao: data.templatePadrao,
      status: data.status,
      data_status: new Date().toISOString(),
      descricao_status: data.descricaoStatus || null,
      email_gestor: data.emailGestor || null,
      book_personalizado: data.bookPersonalizado || false,
      anexo: data.anexo || false,
      vigencia_inicial: data.vigenciaInicial ? data.vigenciaInicial : null,
      vigencia_final: data.vigenciaFinal ? data.vigenciaFinal : null
    };

    // Inserir empresa
    const { data: empresa, error } = await supabase
      .from('empresas_clientes')
      .insert(empresaData)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw ClientBooksErrorFactory.validationError('nome', data.nomeCompleto, 'Nome da empresa já existe');
      }
      throw ClientBooksErrorFactory.databaseError('criar empresa', error);
    }

    // Associar produtos (normalizar para uppercase)
    if (data.produtos && data.produtos.length > 0) {
      const produtosNormalizados = data.produtos.map(p => p.toUpperCase());
      await this.associarProdutos(empresa.id, produtosNormalizados);
    }

    // Associar grupos
    if (data.grupos && data.grupos.length > 0) {
      await this.associarGrupos(empresa.id, data.grupos);
    }

    return empresa;
  }

  /**
   * Listar empresas com filtros (sem paginação - para compatibilidade)
   */
  async listarEmpresas(filtros?: EmpresaFiltros): Promise<EmpresaClienteCompleta[]> {
    let query = supabase
      .from('empresas_clientes')
      .select(`
        *,
        produtos:empresa_produtos(
          id,
          empresa_id,
          produto,
          created_at
        ),
        grupos:empresa_grupos(
          grupo_id,
          grupos_responsaveis(
            id,
            nome,
            descricao,
            created_at,
            updated_at
          )
        ),
        colaboradores(
          id,
          nome_completo,
          email,
          funcao,
          empresa_id,
          status,
          principal_contato,
          data_status,
          descricao_status,
          created_at,
          updated_at
        )
      `);

    // Aplicar filtros
    if (filtros?.status && filtros.status.length > 0) {
      query = query.in('status', filtros.status);
    } else {
      // Por padrão, mostrar apenas empresas ativas
      query = query.eq('status', 'ativo');
    }

    if (filtros?.busca) {
      const searchTerm = filtros.busca.trim();
      if (searchTerm) {
        query = query.or(`nome_completo.ilike.%${searchTerm}%,nome_abreviado.ilike.%${searchTerm}%`);
      }
    }

    const { data, error } = await query.order('nome_completo');

    if (error) {
      throw ClientBooksErrorFactory.databaseError('listar empresas', error);
    }

    // Filtrar por produtos se especificado
    let empresas = data || [];
    if (filtros?.produtos && filtros.produtos.length > 0) {
      empresas = empresas.filter(empresa => 
        empresa.produtos.some(p => filtros.produtos!.includes(p.produto as any))
      );
    }

    return empresas as EmpresaClienteCompleta[];
  }

  /**
   * Listar empresas com paginação e cache otimizado
   */
  async listarEmpresasPaginado(
    filtros?: EmpresaFiltros,
    paginationParams?: PaginationParams
  ): Promise<PaginationResult<EmpresaClienteCompleta> | EmpresaClienteCompleta[]> {
    // Se não há paginação, usar método tradicional
    if (!paginationParams) {
      return this.listarEmpresas(filtros);
    }

    // Validar parâmetros de paginação
    const validatedParams = PaginationUtils.validatePaginationParams(paginationParams, 'empresas');

    // Verificar cache primeiro
    const cacheKey = PaginationUtils.generateCacheKey('empresas_paginated', validatedParams, filtros);
    
    // Construir query base
    let query = supabase
      .from('empresas_clientes')
      .select(`
        *,
        produtos:empresa_produtos(
          id,
          empresa_id,
          produto,
          created_at
        ),
        grupos:empresa_grupos(
          grupo_id,
          grupos_responsaveis(
            id,
            nome,
            descricao,
            created_at,
            updated_at
          )
        ),
        colaboradores(
          id,
          nome_completo,
          email,
          funcao,
          empresa_id,
          status,
          principal_contato,
          data_status,
          descricao_status,
          created_at,
          updated_at
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (filtros?.status && filtros.status.length > 0) {
      query = query.in('status', filtros.status);
    } else {
      // Por padrão, mostrar apenas empresas ativas
      query = query.eq('status', 'ativo');
    }

    if (filtros?.busca) {
      const searchTerm = filtros.busca.trim();
      if (searchTerm) {
        query = query.or(`nome_completo.ilike.%${searchTerm}%,nome_abreviado.ilike.%${searchTerm}%`);
      }
    }

    // Aplicar paginação e ordenação
    query = PaginationUtils.optimizeQuery(query, validatedParams, 'empresas');

    const { data, error, count } = await query;

    if (error) {
      throw ClientBooksErrorFactory.databaseError('listar empresas paginado', error);
    }

    let empresas = data || [];

    // Filtrar por produtos se especificado (pós-processamento para manter paginação correta)
    if (filtros?.produtos && filtros.produtos.length > 0) {
      empresas = empresas.filter(empresa => 
        empresa.produtos.some(p => filtros.produtos!.includes(p.produto as any))
      );
    }

    // Criar resultado paginado
    const result = PaginationUtils.createPaginationResult(
      empresas as EmpresaClienteCompleta[],
      count || 0,
      validatedParams
    );

    return result;
  }

  /**
   * Obter empresa por ID
   */
  async obterEmpresaPorId(id: string): Promise<EmpresaClienteCompleta | null> {
    if (!id || !id.trim()) {
      throw ClientBooksErrorFactory.validationError('id', id, 'ID é obrigatório');
    }

    const { data, error } = await supabase
      .from('empresas_clientes')
      .select(`
        *,
        produtos:empresa_produtos(
          id,
          empresa_id,
          produto,
          created_at
        ),
        grupos:empresa_grupos(
          grupo_id,
          grupos_responsaveis(
            id,
            nome,
            descricao,
            created_at,
            updated_at,
            emails:grupo_emails(
              id,
              email,
              nome
            )
          )
        ),
        colaboradores(
          id,
          nome_completo,
          email,
          funcao,
          empresa_id,
          status,
          principal_contato,
          data_status,
          descricao_status,
          created_at,
          updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw ClientBooksErrorFactory.empresaNotFound(id);
      }
      throw ClientBooksErrorFactory.databaseError('obter empresa', error);
    }

    return data as EmpresaClienteCompleta;
  }

  /**
   * Atualizar empresa
   */
  async atualizarEmpresa(id: string, data: Partial<EmpresaFormData>): Promise<void> {
    try {
      // Validar dados se fornecidos
      if (data.nomeCompleto || data.nomeAbreviado || data.status) {
        this.validarDadosEmpresa(data as EmpresaFormData, true);
      }

      // Preparar dados para atualização
      const updateData: EmpresaClienteUpdate = {};
      
      if (data.nomeCompleto) updateData.nome_completo = data.nomeCompleto;
      if (data.nomeAbreviado) updateData.nome_abreviado = data.nomeAbreviado;
      if (data.linkSharepoint !== undefined) updateData.link_sharepoint = data.linkSharepoint || null;
      if (data.templatePadrao) updateData.template_padrao = data.templatePadrao;
      if (data.emailGestor !== undefined) updateData.email_gestor = data.emailGestor || null;
      if (data.bookPersonalizado !== undefined) updateData.book_personalizado = data.bookPersonalizado;
      if (data.anexo !== undefined) updateData.anexo = data.anexo;
      if (data.vigenciaInicial !== undefined) updateData.vigencia_inicial = data.vigenciaInicial ? data.vigenciaInicial : null;
      if (data.vigenciaFinal !== undefined) updateData.vigencia_final = data.vigenciaFinal ? data.vigenciaFinal : null;
      
      // Se status mudou, atualizar data e descrição
      if (data.status) {
        updateData.status = data.status;
        updateData.data_status = new Date().toISOString();
        updateData.descricao_status = data.descricaoStatus || null;
      }

      updateData.updated_at = new Date().toISOString();

      // Atualizar empresa
      const { error } = await supabase
        .from('empresas_clientes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw ClientBooksErrorFactory.databaseError('atualizar empresa', error);
      }

      // Atualizar produtos se fornecidos (normalizar para uppercase)
      if (data.produtos) {
        const produtosNormalizados = data.produtos.map(p => p.toUpperCase());
        await this.atualizarProdutos(id, produtosNormalizados);
      }

      // Atualizar grupos se fornecidos
      if (data.grupos) {
        await this.atualizarGrupos(id, data.grupos);
      }
    } catch (error) {
      if (error instanceof ClientBooksError) {
        throw error;
      }
      throw ClientBooksErrorFactory.databaseError('atualizar empresa', error as Error);
    }
  }

  /**
   * Deletar empresa
   */
  async deletarEmpresa(id: string): Promise<void> {
    if (!id || !id.trim()) {
      throw ClientBooksErrorFactory.validationError('id', id, 'ID é obrigatório');
    }

    // Verificar se empresa existe
    const empresa = await this.obterEmpresaPorId(id);
    if (!empresa) {
      throw ClientBooksErrorFactory.empresaNotFound(id);
    }

    // Verificar se empresa tem colaboradores ativos
    const { data: colaboradores } = await supabase
      .from('colaboradores')
      .select('id')
      .eq('empresa_id', id)
      .eq('status', 'ativo');

    if (colaboradores && colaboradores.length > 0) {
      throw ClientBooksErrorFactory.empresaHasActiveCollaborators(id, colaboradores.length);
    }

    const { error } = await supabase
      .from('empresas_clientes')
      .delete()
      .eq('id', id);

    if (error) {
      throw ClientBooksErrorFactory.databaseError('deletar empresa', error);
    }
  }

  /**
   * Alteração em lote de status
   */
  async alterarStatusLote(ids: string[], status: string, descricao: string): Promise<void> {
    try {
      if (!ids || ids.length === 0) {
        throw ClientBooksErrorFactory.validationError('ids', ids, 'Lista de IDs não pode estar vazia');
      }

      if (!Object.values(EMPRESA_STATUS).includes(status as any)) {
        throw ClientBooksErrorFactory.validationError('status', status, 'Status inválido');
      }

      if ((status === EMPRESA_STATUS.INATIVO || status === EMPRESA_STATUS.SUSPENSO) && !descricao) {
        throw ClientBooksErrorFactory.validationError('descricao', descricao, 'Descrição é obrigatória para status Inativo ou Suspenso');
      }

      const updateData: EmpresaClienteUpdate = {
        status: status as any,
        data_status: new Date().toISOString(),
        descricao_status: descricao,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('empresas_clientes')
        .update(updateData)
        .in('id', ids);

      if (error) {
        throw ClientBooksErrorFactory.databaseError('alterar status em lote', error);
      }
    } catch (error) {
      if (error instanceof ClientBooksError) {
        throw error;
      }
      throw ClientBooksErrorFactory.databaseError('alteração em lote', error as Error);
    }
  }

  /**
   * Importar dados via Excel (placeholder - implementação completa será feita na tarefa específica)
   */
  async importarExcel(arquivo: File): Promise<ImportResult> {
    // Esta funcionalidade será implementada na tarefa 7.1
    throw ClientBooksErrorFactory.validationError('importacao', arquivo, 'Funcionalidade de importação Excel ainda não implementada');
  }

  // Métodos privados auxiliares

  private validarDadosEmpresa(data: EmpresaFormData, isUpdate = false): void {
    if (!isUpdate) {
      if (!data.nomeCompleto?.trim()) {
        throw ClientBooksErrorFactory.validationError('nomeCompleto', data.nomeCompleto, 'Nome completo é obrigatório');
      }
      if (!data.nomeAbreviado?.trim()) {
        throw ClientBooksErrorFactory.validationError('nomeAbreviado', data.nomeAbreviado, 'Nome abreviado é obrigatório');
      }
    }

    if (data.nomeCompleto && data.nomeCompleto.length > 255) {
      throw ClientBooksErrorFactory.validationError('nomeCompleto', data.nomeCompleto, 'Nome completo deve ter no máximo 255 caracteres');
    }

    if (data.nomeAbreviado && data.nomeAbreviado.length > 50) {
      throw ClientBooksErrorFactory.validationError('nomeAbreviado', data.nomeAbreviado, 'Nome abreviado deve ter no máximo 50 caracteres');
    }

    if (data.status && !Object.values(EMPRESA_STATUS).includes(data.status as any)) {
      throw ClientBooksErrorFactory.validationError('status', data.status, 'Status inválido');
    }
  }

  private async verificarDuplicatas(nomeCompleto: string, nomeAbreviado: string): Promise<void> {
    const { data: existingByName } = await supabase
      .from('empresas_clientes')
      .select('id')
      .eq('nome_completo', nomeCompleto)
      .single();

    if (existingByName) {
      throw ClientBooksErrorFactory.empresaDuplicateName(nomeCompleto);
    }

    const { data: existingByAbbrev } = await supabase
      .from('empresas_clientes')
      .select('id')
      .eq('nome_abreviado', nomeAbreviado)
      .single();

    if (existingByAbbrev) {
      throw ClientBooksErrorFactory.empresaDuplicateName(nomeAbreviado);
    }
  }

  private async associarProdutos(empresaId: string, produtos: string[]): Promise<void> {
    const produtosData = produtos.map(produto => ({
      empresa_id: empresaId,
      produto: produto.toUpperCase() // Normalizar para uppercase
    }));

    const { error } = await supabase
      .from('empresa_produtos')
      .insert(produtosData);

    if (error) {
      throw ClientBooksErrorFactory.databaseError('associar produtos', error);
    }
  }

  private async associarGrupos(empresaId: string, grupoIds: string[]): Promise<void> {
    const gruposData = grupoIds.map(grupoId => ({
      empresa_id: empresaId,
      grupo_id: grupoId
    }));

    const { error } = await supabase
      .from('empresa_grupos')
      .insert(gruposData);

    if (error) {
      throw ClientBooksErrorFactory.databaseError('associar grupos', error);
    }
  }

  private async atualizarProdutos(empresaId: string, produtos: string[]): Promise<void> {
    // Remover produtos existentes
    await supabase
      .from('empresa_produtos')
      .delete()
      .eq('empresa_id', empresaId);

    // Adicionar novos produtos
    if (produtos.length > 0) {
      await this.associarProdutos(empresaId, produtos);
    }
  }

  private async atualizarGrupos(empresaId: string, grupoIds: string[]): Promise<void> {
    // Remover grupos existentes
    await supabase
      .from('empresa_grupos')
      .delete()
      .eq('empresa_id', empresaId);

    // Adicionar novos grupos
    if (grupoIds.length > 0) {
      await this.associarGrupos(empresaId, grupoIds);
    }
  }
}

// Instância singleton do serviço
export const empresasClientesService = new EmpresasClientesService();