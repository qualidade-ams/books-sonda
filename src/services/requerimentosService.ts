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

    // Verificar se precisa criar requerimento adicional de análise EF
    console.log('🔍 Verificando criação de requerimento de análise EF:');
    console.log('  - Tipo de cobrança:', data.tipo_cobranca);
    console.log('  - Horas análise EF:', data.horas_analise_ef);
    console.log('  - Tipo de horas_analise_ef:', typeof data.horas_analise_ef);
    
    const criarRequerimentoAnaliseEF = data.tipo_cobranca === 'Reprovado' && data.horas_analise_ef;
    let horasAnaliseEFDecimal = 0;
    
    if (criarRequerimentoAnaliseEF) {
      horasAnaliseEFDecimal = typeof data.horas_analise_ef === 'string' 
        ? converterParaHorasDecimal(data.horas_analise_ef) 
        : data.horas_analise_ef || 0;
      
      console.log('  - Horas análise EF (decimal):', horasAnaliseEFDecimal);
      console.log('  - Vai criar segundo requerimento?', horasAnaliseEFDecimal > 0);
    }

    // Preparar dados para inserção (converter horas para decimal se necessário)
    const horasFuncionalDecimal = typeof data.horas_funcional === 'string' 
      ? converterParaHorasDecimal(data.horas_funcional)
      : data.horas_funcional;
    
    const horasTecnicoDecimal = typeof data.horas_tecnico === 'string'
      ? converterParaHorasDecimal(data.horas_tecnico)
      : data.horas_tecnico;

    const requerimentoData = {
      chamado: data.chamado.trim().toUpperCase(), // Sempre salvar em maiúsculas
      cliente_id: data.cliente_id,
      modulo: data.modulo,
      descricao: data.descricao.trim(),
      data_envio: data.data_envio,
      data_aprovacao: data.data_aprovacao?.trim() || null,
      horas_funcional: horasFuncionalDecimal,
      horas_tecnico: horasTecnicoDecimal,
      linguagem: data.linguagem,
      tipo_cobranca: data.tipo_cobranca,
      mes_cobranca: data.mes_cobranca?.trim() || null,
      observacao: data.observacao?.trim() || null,
      // Campos de valor/hora (incluir apenas se fornecidos)
      valor_hora_funcional: data.valor_hora_funcional || null,
      valor_hora_tecnico: data.valor_hora_tecnico || null,
      // Campo de tipo de hora extra (para tipo Hora Extra)
      tipo_hora_extra: data.tipo_hora_extra || null,
      // Campos de ticket (para Banco de Horas - automático baseado na empresa)
      quantidade_tickets: data.quantidade_tickets || null,
      // Campos de autor (preenchidos pelo frontend)
      autor_id: data.autor_id || null,
      autor_nome: data.autor_nome || 'Sistema',
      status: 'lancado' as StatusRequerimento,
      enviado_faturamento: false
      // Nota: horas_analise_ef NÃO é salvo no banco - é apenas para controle do formulário
    };

    // Criar requerimento principal
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

    // Se tipo é "Reprovado" e há horas de análise EF, criar segundo requerimento
    console.log('🔍 Verificando condições para criar segundo requerimento:');
    console.log('  - criarRequerimentoAnaliseEF:', criarRequerimentoAnaliseEF);
    console.log('  - horasAnaliseEFDecimal:', horasAnaliseEFDecimal);
    console.log('  - horasAnaliseEFDecimal > 0:', horasAnaliseEFDecimal > 0);
    
    if (criarRequerimentoAnaliseEF && horasAnaliseEFDecimal > 0) {
      console.log('✅ Criando requerimento adicional de Banco de Horas para análise EF...');
      
      const requerimentoAnaliseEFData = {
        chamado: data.chamado.trim().toUpperCase(),
        cliente_id: data.cliente_id,
        modulo: data.modulo,
        descricao: data.descricao.trim(),
        data_envio: data.data_envio,
        data_aprovacao: data.data_aprovacao?.trim() || null,
        horas_funcional: horasAnaliseEFDecimal, // Usar horas de análise EF
        horas_tecnico: 0,
        linguagem: data.linguagem,
        tipo_cobranca: 'Banco de Horas',
        mes_cobranca: data.mes_cobranca?.trim() || null,
        observacao: 'Horas referentes a análise e elaboração da EF',
        // Não incluir campos de valor/hora para Banco de Horas
        valor_hora_funcional: null,
        valor_hora_tecnico: null,
        tipo_hora_extra: null,
        // Manter tickets se houver
        quantidade_tickets: data.quantidade_tickets || null,
        // Campos de autor
        autor_id: data.autor_id || null,
        autor_nome: data.autor_nome || 'Sistema',
        status: 'lancado' as StatusRequerimento,
        enviado_faturamento: false
      };

      console.log('📝 Dados do segundo requerimento:', requerimentoAnaliseEFData);

      const { data: requerimentoAnaliseEF, error: errorAnaliseEF } = await supabase
        .from('requerimentos')
        .insert(requerimentoAnaliseEFData)
        .select()
        .single();

      if (errorAnaliseEF) {
        console.error('❌ Erro ao criar requerimento de análise EF:', errorAnaliseEF);
        // Não falhar a operação principal, apenas logar o erro
      } else {
        console.log('✅ Requerimento adicional de análise EF criado com sucesso:', requerimentoAnaliseEF);
      }
    } else {
      console.log('⏭️ Não vai criar segundo requerimento (condições não atendidas)');
    }

    return this.formatarRequerimento(requerimento);
  }

  /**
   * Resolver nomes de usuários baseado nos IDs
   */
  private async resolverNomesUsuarios(userIds: string[]): Promise<Record<string, string>> {
    if (userIds.length === 0) return {};

    const usersMap: Record<string, string> = {};

    try {
      // Primeiro tentar buscar na tabela profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profiles && profiles.length > 0) {
        profiles.forEach(profile => {
          usersMap[profile.id] = profile.full_name || profile.email || 'Usuário não identificado';
        });
      }

      // Para IDs que não foram encontrados na profiles, tentar no auth.users
      const idsNaoEncontrados = userIds.filter(id => !usersMap[id]);
      if (idsNaoEncontrados.length > 0) {
        try {
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          if (authUsers?.users && Array.isArray(authUsers.users)) {
            authUsers.users.forEach((user: any) => {
              if (user?.id && idsNaoEncontrados.includes(user.id)) {
                usersMap[user.id] = user.user_metadata?.full_name || 
                                   user.user_metadata?.name || 
                                   user.email || 
                                   'Usuário não identificado';
              }
            });
          }
        } catch (authError) {
          console.warn('Não foi possível buscar usuários do auth:', authError);
        }
      }
    } catch (error) {
      console.warn('Erro ao resolver nomes de usuários:', error);
    }

    return usersMap;
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
      if (Array.isArray(filtros.tipo_cobranca)) {
        query = query.in('tipo_cobranca', filtros.tipo_cobranca);
      } else {
        query = query.eq('tipo_cobranca', filtros.tipo_cobranca);
      }
    }

    if (filtros?.modulo) {
      if (Array.isArray(filtros.modulo)) {
        query = query.in('modulo', filtros.modulo);
      } else {
        query = query.eq('modulo', filtros.modulo);
      }
    }

    if (filtros?.busca && filtros.busca.trim()) {
      const termoBusca = filtros.busca.trim();
      query = query.or(`chamado.ilike.%${termoBusca}%,descricao.ilike.%${termoBusca}%`);
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

    // Resolver nomes de usuários para os campos autor_id (se existirem)
    const userIds = [...new Set((data || [])
      .map(req => (req as any).autor_id)
      .filter(Boolean))] as string[];
    
    const usersMap = await this.resolverNomesUsuarios(userIds);

    // Mapear requerimentos e atualizar nomes de autores
    return (data || []).map(req => {
      const requerimento = this.formatarRequerimento(req);
      
      // Atualizar nome do autor se temos o mapeamento
      const autorId = (req as any).autor_id;
      if (autorId && usersMap[autorId]) {
        requerimento.autor_nome = usersMap[autorId];
      }
      
      return requerimento;
    });
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

    // Resolver nome do autor se necessário
    const autorId = (data as any).autor_id;
    if (autorId) {
      const usersMap = await this.resolverNomesUsuarios([autorId]);
      if (usersMap[autorId]) {
        (data as any).autor_nome = usersMap[autorId];
      }
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

    if (data.chamado) updateData.chamado = data.chamado.trim().toUpperCase(); // Sempre salvar em maiúsculas
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
    if (data.mes_cobranca !== undefined) updateData.mes_cobranca = data.mes_cobranca?.trim() || null;
    if (data.observacao !== undefined) updateData.observacao = data.observacao?.trim() || null;
    // Campos de valor/hora
    if (data.valor_hora_funcional !== undefined) updateData.valor_hora_funcional = data.valor_hora_funcional || null;
    if (data.valor_hora_tecnico !== undefined) updateData.valor_hora_tecnico = data.valor_hora_tecnico || null;
    // Campos de ticket (automático baseado na empresa)
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
    if (!requerimento.tipo_cobranca) {
      throw new Error('É necessário selecionar um tipo de cobrança válido antes de enviar para faturamento');
    }

    // Verificar se mês de cobrança está preenchido para faturamento
    if (!requerimento.mes_cobranca || !requerimento.mes_cobranca.match(/^(0[1-9]|1[0-2])\/\d{4}$/)) {
      throw new Error('Mês de cobrança é obrigatório para envio ao faturamento e deve estar no formato MM/YYYY');
    }

    // Verificar se data de aprovação está preenchida para faturamento
    if (!requerimento.data_aprovacao || requerimento.data_aprovacao.trim() === '') {
      throw new Error('Data de aprovação do orçamento é obrigatória para envio ao faturamento');
    }

    // Atualizar status para 'enviado_faturamento'
    // Irá para 'faturado' apenas quando disparar o email
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
   * Rejeitar requerimento (voltar para status lançado)
   */
  async rejeitarRequerimento(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new Error('ID é obrigatório');
    }

    // Verificar se requerimento existe
    const requerimento = await this.obterRequerimentoPorId(id);
    if (!requerimento) {
      throw new Error('Requerimento não encontrado');
    }

    // Verificar se está no status correto para rejeição
    // Permitir rejeitar requerimentos enviados para faturamento ou já faturados
    if (requerimento.status !== 'enviado_faturamento' && requerimento.status !== 'faturado') {
      throw new Error('Apenas requerimentos enviados para faturamento ou faturados podem ser rejeitados');
    }

    console.log('Rejeitando requerimento:', {
      id,
      chamado: requerimento.chamado,
      mes_cobranca: requerimento.mes_cobranca,
      status_atual: requerimento.status
    });

    // Voltar para status lançado
    const { error } = await supabase
      .from('requerimentos')
      .update({
        status: 'lancado',
        enviado_faturamento: false,
        data_envio_faturamento: null,
        data_faturamento: null, // Limpar data de faturamento também
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao rejeitar requerimento: ${error.message}`);
    }

    console.log('Requerimento rejeitado com sucesso:', id);
  }

  /**
   * Marcar requerimentos como faturados
   */
  async marcarComoFaturados(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) {
      throw new Error('Lista de IDs é obrigatória');
    }

    console.log('Marcando requerimentos como faturados:', { ids, quantidade: ids.length });

    // Verificar se todos os requerimentos existem e estão no status correto
    const { data: requerimentos, error: selectError } = await supabase
      .from('requerimentos')
      .select('id, chamado, status')
      .in('id', ids);

    if (selectError) {
      throw new Error(`Erro ao verificar requerimentos: ${selectError.message}`);
    }

    if (!requerimentos || requerimentos.length !== ids.length) {
      throw new Error('Um ou mais requerimentos não foram encontrados');
    }

    // Verificar se todos estão no status correto
    const requerimentosInvalidos = requerimentos.filter(req => req.status !== 'enviado_faturamento');
    if (requerimentosInvalidos.length > 0) {
      throw new Error(`Apenas requerimentos enviados para faturamento podem ser marcados como faturados. Requerimentos inválidos: ${requerimentosInvalidos.map(r => r.chamado).join(', ')}`);
    }

    // Marcar como faturados
    const { error } = await supabase
      .from('requerimentos')
      .update({
        status: 'faturado',
        data_faturamento: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', ids);

    if (error) {
      throw new Error(`Erro ao marcar requerimentos como faturados: ${error.message}`);
    }

    console.log('Requerimentos marcados como faturados com sucesso:', { 
      ids, 
      chamados: requerimentos.map(r => r.chamado) 
    });
  }

  /**
   * Buscar requerimentos faturados
   */
  async buscarRequerimentosFaturados(mesCobranca?: string): Promise<Requerimento[]> {
    try {
      // Consulta simples sem JOIN para evitar erro 400
      // Buscar APENAS requerimentos já faturados (não incluir enviado_faturamento)
      let query = supabase
        .from('requerimentos')
        .select('*')
        .eq('status', 'faturado');

      // Ordenar por data_envio_faturamento (quando foi enviado para faturamento)
      // Se não existir, ordenar por data_faturamento, senão por created_at
      try {
        query = query.order('data_envio_faturamento', { ascending: false, nullsFirst: false });
      } catch {
        try {
          query = query.order('data_faturamento', { ascending: false, nullsFirst: false });
        } catch {
          query = query.order('created_at', { ascending: false });
        }
      }

      if (mesCobranca) {
        query = query.eq('mes_cobranca', mesCobranca);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro na consulta de requerimentos faturados:', error);
        // Retornar array vazio em caso de erro para não quebrar a interface
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Buscar nomes dos clientes separadamente para evitar problemas de JOIN
      const requerimentosComNomes = await Promise.all(
        data.map(async (req) => {
          let cliente_nome = 'N/A';
          
          console.log('Buscando cliente para requerimento:', {
            requerimento_id: req.id,
            chamado: req.chamado,
            cliente_id: req.cliente_id,
            tem_cliente_id: !!req.cliente_id
          });
          
          if (req.cliente_id) {
            try {
              const { data: cliente, error: clienteError } = await supabase
                .from('empresas_clientes')
                .select('nome_abreviado, nome_completo')
                .eq('id', req.cliente_id)
                .maybeSingle();

              console.log('Resultado da busca de cliente:', {
                cliente_id: req.cliente_id,
                encontrou: !!cliente,
                erro: clienteError?.message,
                nome_abreviado: cliente?.nome_abreviado,
                nome_completo: cliente?.nome_completo
              });

              if (!clienteError && cliente) {
                cliente_nome = cliente.nome_abreviado || cliente.nome_completo || 'N/A';
              }
            } catch (clienteErr) {
              console.warn('Erro ao buscar cliente:', clienteErr);
            }
          } else {
            console.warn('Requerimento sem cliente_id:', req.id, req.chamado);
          }

          return {
            ...req,
            cliente_nome
          };
        })
      );

      return requerimentosComNomes.map(req => this.formatarRequerimento(req));
    } catch (error) {
      console.error('Erro geral ao buscar requerimentos faturados:', error);
      // Retornar array vazio para não quebrar a interface
      return [];
    }
  }

  /**
   * Buscar requerimentos enviados (para histórico na tela Lançar Requerimentos)
   * Busca tanto 'enviado_faturamento' quanto 'faturado'
   */
  async buscarRequerimentosEnviados(mesCobranca?: string): Promise<Requerimento[]> {
    try {
      // Buscar requerimentos enviados para faturamento OU já faturados
      let query = supabase
        .from('requerimentos')
        .select('*')
        .in('status', ['enviado_faturamento', 'faturado']);

      // Ordenar por data_envio_faturamento
      query = query.order('data_envio_faturamento', { ascending: false, nullsFirst: false });

      if (mesCobranca) {
        query = query.eq('mes_cobranca', mesCobranca);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro na consulta de requerimentos enviados:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Buscar nomes dos clientes separadamente
      const requerimentosComNomes = await Promise.all(
        data.map(async (req) => {
          let cliente_nome = 'N/A';
          
          if (req.cliente_id) {
            try {
              const { data: cliente, error: clienteError } = await supabase
                .from('empresas_clientes')
                .select('nome_abreviado, nome_completo')
                .eq('id', req.cliente_id)
                .maybeSingle();

              if (!clienteError && cliente) {
                cliente_nome = cliente.nome_abreviado || cliente.nome_completo || 'N/A';
              }
            } catch (err) {
              console.error('Erro ao buscar cliente:', err);
            }
          }

          return {
            ...req,
            cliente_nome
          } as Requerimento;
        })
      );

      // Resolver nomes dos autores
      const autoresIds = requerimentosComNomes
        .map(req => req.autor_id)
        .filter((id): id is string => !!id);

      let requerimentosFinais = requerimentosComNomes;

      if (autoresIds.length > 0) {
        const usersMap = await this.resolverNomesUsuarios(autoresIds);
        
        requerimentosFinais = requerimentosComNomes.map(req => ({
          ...req,
          autor_nome: req.autor_id && usersMap[req.autor_id] 
            ? usersMap[req.autor_id] 
            : req.autor_nome || 'N/A'
        }));
      }

      // Formatar requerimentos para converter horas decimais para HH:MM
      return requerimentosFinais.map(req => this.formatarRequerimento(req));
    } catch (error) {
      console.error('Erro ao buscar requerimentos enviados:', error);
      return [];
    }
  }

  /**
   * Buscar clientes da tabela empresas_clientes
   */
  async buscarClientes(): Promise<ClienteRequerimento[]> {
    const { data, error } = await supabase
      .from('empresas_clientes')
      .select('id, nome_abreviado, tipo_cobranca')
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
      // Converter horas para decimal (suporta formato HH:MM e números)
      let horasFuncional = 0;
      let horasTecnico = 0;

      try {
        if (data.horas_funcional !== undefined) {
          const horasFuncionalStr = typeof data.horas_funcional === 'string' 
            ? data.horas_funcional 
            : data.horas_funcional.toString();
          horasFuncional = converterParaHorasDecimal(horasFuncionalStr);
        }
      } catch (error) {
        errors.push('Formato de horas funcionais inválido');
      }

      try {
        if (data.horas_tecnico !== undefined) {
          const horasTecnicoStr = typeof data.horas_tecnico === 'string'
            ? data.horas_tecnico
            : data.horas_tecnico.toString();
          horasTecnico = converterParaHorasDecimal(horasTecnicoStr);
        }
      } catch (error) {
        errors.push('Formato de horas técnicas inválido');
      }
      
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

    // Validar mês de cobrança apenas se fornecido (campo opcional na criação)
    if (data.mes_cobranca !== undefined && data.mes_cobranca !== '') {
      if (!data.mes_cobranca.match(/^(0[1-9]|1[0-2])\/\d{4}$/)) {
        errors.push('Mês de cobrança deve estar no formato MM/YYYY');
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
      // Suporta tanto data.cliente_nome (busca direta) quanto data.cliente?.nome_abreviado (JOIN)
      cliente_nome: data.cliente_nome || data.cliente?.nome_abreviado,
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
      data_faturamento: data.data_faturamento, // Campo de data de faturamento
      created_at: data.created_at,
      updated_at: data.updated_at,
      // Campos de valor/hora
      valor_hora_funcional: data.valor_hora_funcional,
      valor_hora_tecnico: data.valor_hora_tecnico,
      valor_total_funcional: data.valor_total_funcional,
      valor_total_tecnico: data.valor_total_tecnico,
      valor_total_geral: data.valor_total_geral,
      // Campo de tipo de hora extra
      tipo_hora_extra: data.tipo_hora_extra,
      // Campos de ticket
      quantidade_tickets: data.quantidade_tickets,
      // Campos de autor (podem não existir na tabela ainda)
      autor_id: (data as any).autor_id || undefined,
      autor_nome: (data as any).autor_nome || 'Sistema'
    };
  }
}

// Instância singleton do serviço
export const requerimentosService = new RequerimentosService();