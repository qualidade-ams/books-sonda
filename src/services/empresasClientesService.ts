import { supabase } from '@/integrations/supabase/client';
import {
  EmpresaCliente,
  EmpresaClienteInsert,
  EmpresaClienteUpdate,
  EmpresaClienteCompleta,
  EmpresaFiltros,
  StatusEmpresa,
  Produto
} from '@/types/clientBooks';
import { EmpresaFormData } from '@/types/clientBooksTypes';
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
  COMEX: 'COMEX' as const,
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
    console.log('🏢 [EmpresasClientesService] Criando empresa com dados:', {
      nomeAbreviado: data.nomeAbreviado,
      baselineSegmentado: data.baselineSegmentado,
      segmentacaoConfig: data.segmentacaoConfig,
      empresasSegmentadas: data.segmentacaoConfig?.empresas?.length || 0
    });
    
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
      em_projeto: data.emProjeto || false, // NOVO: Campo Em Projeto
      email_gestor: data.emailGestor || null,
      tem_ams: data.temAms || false,
      tipo_book: data.tipoBook || 'nao_tem_book',
      tipo_cobranca: data.tipoCobranca || 'banco_horas',
      book_personalizado: data.bookPersonalizado || false,
      anexo: data.anexo || false,
      vigencia_inicial: data.vigenciaInicial || null,
      vigencia_final: data.vigenciaFinal || null,
      observacao: data.observacao || null,
      // NOVO: Campos de Banco de Horas
      tipo_contrato: data.tipo_contrato || null,
      periodo_apuracao: data.periodo_apuracao || null,
      // inicio_vigencia pode vir em dois formatos: MM/YYYY ou YYYY-MM-DD
      inicio_vigencia: data.inicio_vigencia_banco_horas 
        ? (data.inicio_vigencia_banco_horas.includes('/') 
            ? this.converterMesAnoParaDate(data.inicio_vigencia_banco_horas)
            : data.inicio_vigencia_banco_horas)
        : null,
      baseline_horas_mensal: data.baseline_horas_mensal || null,
      baseline_tickets_mensal: data.baseline_tickets_mensal || null,
      possui_repasse_especial: data.possui_repasse_especial || false,
      ciclos_para_zerar: data.ciclos_para_zerar || null,
      percentual_repasse_mensal: data.percentual_repasse_mensal || null,
      percentual_repasse_especial: data.percentual_repasse_especial || null,
      // NOVO: Campos de Segmentação de Baseline
      baseline_segmentado: data.baselineSegmentado || false,
      segmentacao_config: (data.segmentacaoConfig as any) || null
    };

    console.log('📤 [EmpresasClientesService] Dados preparados para insert:', {
      baseline_segmentado: empresaData.baseline_segmentado,
      segmentacao_config: empresaData.segmentacao_config,
      segmentacao_config_type: typeof empresaData.segmentacao_config,
      segmentacao_config_empresas: (empresaData.segmentacao_config as any)?.empresas?.length || 0
    });

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
        )
      `);

    // Aplicar filtros
    if (filtros?.status && filtros.status.length > 0) {
      query = query.in('status', filtros.status);
    }
    // Removido o filtro padrão - agora mostra todos os status quando não há filtro específico

    if (filtros?.busca) {
      const searchTerm = filtros.busca.trim();
      if (searchTerm) {
        query = query.or(`nome_completo.ilike.%${searchTerm}%,nome_abreviado.ilike.%${searchTerm}%,email_gestor.ilike.%${searchTerm}%`);
      }
    }

    if (filtros?.temAms !== undefined) {
      if (filtros.temAms === true) {
        // Filtrar apenas empresas com AMS = true
        query = query.eq('tem_ams', true);
      } else {
        // Filtrar empresas com AMS = false ou null (considerando null como "sem AMS")
        query = query.or('tem_ams.eq.false,tem_ams.is.null');
      }
    }

    // NOVO: Filtro por Em Projeto
    if (filtros?.emProjeto !== undefined) {
      if (filtros.emProjeto === true) {
        // Filtrar apenas empresas em projeto = true
        query = query.eq('em_projeto', true);
      } else {
        // Filtrar empresas em projeto = false ou null (considerando null como "não em projeto")
        query = query.or('em_projeto.eq.false,em_projeto.is.null');
      }
    }

    const { data, error } = await query.order('nome_abreviado');

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
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (filtros?.status && filtros.status.length > 0) {
      query = query.in('status', filtros.status);
    }
    // Removido o filtro padrão - agora mostra todos os status quando não há filtro específico

    if (filtros?.busca) {
      const searchTerm = filtros.busca.trim();
      if (searchTerm) {
        query = query.or(`nome_completo.ilike.%${searchTerm}%,nome_abreviado.ilike.%${searchTerm}%,email_gestor.ilike.%${searchTerm}%`);
      }
    }

    if (filtros?.temAms !== undefined) {
      if (filtros.temAms === true) {
        // Filtrar apenas empresas com AMS = true
        query = query.eq('tem_ams', true);
      } else {
        // Filtrar empresas com AMS = false ou null (considerando null como "sem AMS")
        query = query.or('tem_ams.eq.false,tem_ams.is.null');
      }
    }

    // NOVO: Filtro por Em Projeto
    if (filtros?.emProjeto !== undefined) {
      if (filtros.emProjeto === true) {
        // Filtrar apenas empresas em projeto = true
        query = query.eq('em_projeto', true);
      } else {
        // Filtrar empresas em projeto = false ou null (considerando null como "não em projeto")
        query = query.or('em_projeto.eq.false,em_projeto.is.null');
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
   * Buscar empresa por nome completo ou nome abreviado
   * Usado para detectar duplicatas na importação
   */
  async buscarEmpresaPorNome(nomeCompleto: string, nomeAbreviado?: string): Promise<EmpresaClienteCompleta | null> {
    if (!nomeCompleto || !nomeCompleto.trim()) {
      return null;
    }

    // Buscar por nome completo primeiro
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
        )
      `)
      .eq('nome_completo', nomeCompleto)
      .maybeSingle();

    const { data: empresaPorNome, error: errorNome } = await query;

    if (errorNome) {
      throw ClientBooksErrorFactory.databaseError('buscar empresa por nome', errorNome);
    }

    if (empresaPorNome) {
      return empresaPorNome as EmpresaClienteCompleta;
    }

    // Se não encontrou por nome completo e tem nome abreviado, buscar por ele
    if (nomeAbreviado && nomeAbreviado.trim()) {
      const { data: empresaPorAbrev, error: errorAbrev } = await supabase
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
          )
        `)
        .eq('nome_abreviado', nomeAbreviado)
        .maybeSingle();

      if (errorAbrev) {
        throw ClientBooksErrorFactory.databaseError('buscar empresa por nome abreviado', errorAbrev);
      }

      if (empresaPorAbrev) {
        return empresaPorAbrev as EmpresaClienteCompleta;
      }
    }

    return null;
  }

  /**
   * Atualizar empresa
   * @returns Número de clientes inativados (se aplicável)
   */
  async atualizarEmpresa(id: string, data: Partial<EmpresaFormData>): Promise<{ clientesInativados: number }> {
    try {
      // Validar dados se fornecidos
      if (data.nomeCompleto || data.nomeAbreviado || data.status) {
        this.validarDadosEmpresa(data as EmpresaFormData, true);
      }

      // Verificar duplicatas se nome completo ou abreviado foram alterados
      if (data.nomeCompleto || data.nomeAbreviado) {
        await this.verificarDuplicatasParaEdicao(id, data.nomeCompleto, data.nomeAbreviado);
      }

      // Verificar se o status está mudando para inativo
      const statusMudandoParaInativo = data.status === EMPRESA_STATUS.INATIVO;
      let clientesInativados = 0;

      // Se estiver inativando a empresa, inativar todos os clientes ativos primeiro
      if (statusMudandoParaInativo) {
        const descricaoClientes = data.descricaoStatus || 'Empresa inativada';
        
        // Importar dinamicamente o serviço de clientes para evitar dependência circular
        const { clientesService } = await import('./clientesService');
        
        try {
          clientesInativados = await clientesService.inativarClientesPorEmpresa(id, descricaoClientes);
        } catch (error) {
          console.error('Erro ao inativar clientes da empresa:', error);
          // Continuar com a inativação da empresa mesmo se houver erro nos clientes
        }
      }

      // Preparar dados para atualização
      const updateData: EmpresaClienteUpdate = {};

      if (data.nomeCompleto) updateData.nome_completo = data.nomeCompleto;
      if (data.nomeAbreviado) updateData.nome_abreviado = data.nomeAbreviado;
      if (data.linkSharepoint !== undefined) updateData.link_sharepoint = data.linkSharepoint || null;
      if (data.templatePadrao) updateData.template_padrao = data.templatePadrao;
      if (data.emailGestor !== undefined) updateData.email_gestor = data.emailGestor || null;
      if (data.emProjeto !== undefined) updateData.em_projeto = data.emProjeto; // NOVO: Campo Em Projeto
      if (data.temAms !== undefined) updateData.tem_ams = data.temAms;
      if (data.tipoBook !== undefined) updateData.tipo_book = data.tipoBook;
      if (data.tipoCobranca !== undefined) updateData.tipo_cobranca = data.tipoCobranca;
      
      // Incluir campos de vigência
      if (data.vigenciaInicial !== undefined) updateData.vigencia_inicial = data.vigenciaInicial || null;
      if (data.vigenciaFinal !== undefined) updateData.vigencia_final = data.vigenciaFinal || null;
      
      // Incluir campos de book personalizado e anexo
      if (data.bookPersonalizado !== undefined) updateData.book_personalizado = data.bookPersonalizado;
      if (data.anexo !== undefined) updateData.anexo = data.anexo;
      
      // Incluir campo de observação
      if (data.observacao !== undefined) updateData.observacao = data.observacao || null;

      // NOVO: Incluir campos de Banco de Horas
      if (data.tipo_contrato !== undefined) updateData.tipo_contrato = data.tipo_contrato || null;
      if (data.periodo_apuracao !== undefined) updateData.periodo_apuracao = data.periodo_apuracao || null;
      
      // inicio_vigencia_banco_horas pode vir em dois formatos:
      // 1. MM/YYYY (do formulário) - precisa converter
      // 2. YYYY-MM-DD (da importação) - já está no formato correto
      if (data.inicio_vigencia_banco_horas !== undefined) {
        if (data.inicio_vigencia_banco_horas) {
          // Se contém '/', é formato MM/YYYY e precisa converter
          if (data.inicio_vigencia_banco_horas.includes('/')) {
            updateData.inicio_vigencia = this.converterMesAnoParaDate(data.inicio_vigencia_banco_horas);
          } else {
            // Se contém '-', já está no formato YYYY-MM-DD
            updateData.inicio_vigencia = data.inicio_vigencia_banco_horas;
          }
        } else {
          updateData.inicio_vigencia = null;
        }
      }
      
      if (data.baseline_horas_mensal !== undefined) updateData.baseline_horas_mensal = data.baseline_horas_mensal || null;
      if (data.baseline_tickets_mensal !== undefined) updateData.baseline_tickets_mensal = data.baseline_tickets_mensal || null;
      if (data.possui_repasse_especial !== undefined) updateData.possui_repasse_especial = data.possui_repasse_especial;
      if (data.ciclos_para_zerar !== undefined) updateData.ciclos_para_zerar = data.ciclos_para_zerar || null;
      if (data.percentual_repasse_mensal !== undefined) updateData.percentual_repasse_mensal = data.percentual_repasse_mensal || null;
      if (data.percentual_repasse_especial !== undefined) updateData.percentual_repasse_especial = data.percentual_repasse_especial || null;

      // NOVO: Incluir campos de Segmentação de Baseline
      if (data.baselineSegmentado !== undefined) updateData.baseline_segmentado = data.baselineSegmentado;
      if (data.segmentacaoConfig !== undefined) {
        updateData.segmentacao_config = (data.segmentacaoConfig as any) || null;
      }

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

      // Log de clientes inativados
      if (clientesInativados > 0) {
        console.log(`✅ Empresa inativada com sucesso. ${clientesInativados} cliente(s) também foram inativados automaticamente.`);
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

      // Retornar número de clientes inativados
      return { clientesInativados };
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

    // Verificar se empresa tem clientes ativos
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id')
      .eq('empresa_id', id)
      .eq('status', 'ativo');

    if (clientes && clientes.length > 0) {
      throw ClientBooksErrorFactory.empresaHasActiveCollaborators(id, clientes.length);
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
   * @returns Número total de clientes inativados (se aplicável)
   */
  async alterarStatusLote(ids: string[], status: string, descricao: string): Promise<{ clientesInativados: number }> {
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

      // Declarar variável fora do bloco if para estar disponível no return
      let totalClientesInativados = 0;

      // Se estiver inativando empresas, inativar todos os clientes ativos primeiro
      if (status === EMPRESA_STATUS.INATIVO) {
        const descricaoClientes = descricao || 'Empresa inativada';
        
        // Importar dinamicamente o serviço de clientes para evitar dependência circular
        const { clientesService } = await import('./clientesService');
        
        // Inativar clientes de cada empresa
        for (const empresaId of ids) {
          try {
            const clientesInativados = await clientesService.inativarClientesPorEmpresa(empresaId, descricaoClientes);
            totalClientesInativados += clientesInativados;
          } catch (error) {
            console.error(`Erro ao inativar clientes da empresa ${empresaId}:`, error);
            // Continuar com as outras empresas mesmo se houver erro
          }
        }

        if (totalClientesInativados > 0) {
          console.log(`✅ ${totalClientesInativados} cliente(s) foram inativados automaticamente junto com as empresas.`);
        }
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

      // Retornar número total de clientes inativados
      return { clientesInativados: status === EMPRESA_STATUS.INATIVO ? totalClientesInativados : 0 };
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
    const { data: existingByName, error: errorName } = await supabase
      .from('empresas_clientes')
      .select('id')
      .eq('nome_completo', nomeCompleto)
      .maybeSingle();

    if (errorName) {
      throw ClientBooksErrorFactory.databaseError('verificar duplicata por nome', errorName);
    }

    if (existingByName) {
      throw ClientBooksErrorFactory.empresaDuplicateName(nomeCompleto);
    }

    const { data: existingByAbbrev, error: errorAbbrev } = await supabase
      .from('empresas_clientes')
      .select('id')
      .eq('nome_abreviado', nomeAbreviado)
      .maybeSingle();

    if (errorAbbrev) {
      throw ClientBooksErrorFactory.databaseError('verificar duplicata por nome abreviado', errorAbbrev);
    }

    if (existingByAbbrev) {
      throw ClientBooksErrorFactory.empresaDuplicateName(nomeAbreviado);
    }
  }

  private async verificarDuplicatasParaEdicao(empresaId: string, nomeCompleto?: string, nomeAbreviado?: string): Promise<void> {
    if (nomeCompleto) {
      const { data: existingByName, error: errorName } = await supabase
        .from('empresas_clientes')
        .select('id')
        .eq('nome_completo', nomeCompleto)
        .neq('id', empresaId)
        .maybeSingle();

      if (errorName) {
        throw ClientBooksErrorFactory.databaseError('verificar duplicata por nome na edição', errorName);
      }

      if (existingByName) {
        throw ClientBooksErrorFactory.empresaDuplicateName(nomeCompleto);
      }
    }

    if (nomeAbreviado) {
      const { data: existingByAbbrev, error: errorAbbrev } = await supabase
        .from('empresas_clientes')
        .select('id')
        .eq('nome_abreviado', nomeAbreviado)
        .neq('id', empresaId)
        .maybeSingle();

      if (errorAbbrev) {
        throw ClientBooksErrorFactory.databaseError('verificar duplicata por nome abreviado na edição', errorAbbrev);
      }

      if (existingByAbbrev) {
        throw ClientBooksErrorFactory.empresaDuplicateName(nomeAbreviado);
      }
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

  /**
   * Converter formato MM/YYYY para DATE (primeiro dia do mês)
   * 
   * IMPORTANTE: Retorna data em formato ISO com timezone UTC para evitar
   * problemas de conversão de timezone que podem fazer a data "voltar" um dia.
   * 
   * @param mesAno String no formato MM/YYYY (ex: "11/2025")
   * @returns String no formato YYYY-MM-DDT00:00:00.000Z (ex: "2025-11-01T00:00:00.000Z")
   * 
   * @example
   * converterMesAnoParaDate("11/2025") // "2025-11-01T00:00:00.000Z"
   * converterMesAnoParaDate("01/2024") // "2024-01-01T00:00:00.000Z"
   */
  private converterMesAnoParaDate(mesAno: string): string {
    const [mes, ano] = mesAno.split('/');
    // Criar data em UTC para evitar problemas de timezone
    // Usar Date.UTC retorna timestamp, depois converter para ISO string
    const date = new Date(Date.UTC(parseInt(ano), parseInt(mes) - 1, 1));
    return date.toISOString();
  }
}

// Instância singleton do serviço
export const empresasClientesService = new EmpresasClientesService();