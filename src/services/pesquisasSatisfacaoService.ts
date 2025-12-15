/**
 * Serviço completo para gerenciamento de pesquisas
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  Pesquisa, 
  PesquisaFormData, 
  FiltrosPesquisas, 
  EstatisticasPesquisas,
  PesquisaInsert,
  PesquisaUpdate
} from '@/types/pesquisasSatisfacao';

// ============================================
// CRUD BÁSICO
// ============================================

/**
 * Buscar TODAS as pesquisas sem filtros automáticos (para tela de visualização)
 */
export async function buscarTodasPesquisas(filtros?: FiltrosPesquisas): Promise<Pesquisa[]> {
  // Buscar em lotes para garantir que todos os registros sejam carregados
  const BATCH_SIZE = 1000;
  let allData: Pesquisa[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('pesquisas_satisfacao')
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('created_at', { ascending: false });

    // SEM FILTROS AUTOMÁTICOS - trazer todos os dados

    // Aplicar apenas filtros explícitos se fornecidos
    if (filtros) {
      console.log('🔍 Filtros recebidos no serviço:', filtros);
      
      if (filtros.busca && filtros.busca.trim()) {
        console.log('📝 Aplicando filtro de busca:', filtros.busca);
        query = query.or(`empresa.ilike.%${filtros.busca}%,cliente.ilike.%${filtros.busca}%,prestador.ilike.%${filtros.busca}%,nro_caso.ilike.%${filtros.busca}%`);
      }

      if (filtros.origem && filtros.origem !== 'todos') {
        console.log('🏢 Aplicando filtro de origem:', filtros.origem);
        query = query.eq('origem', filtros.origem);
      }

      if (filtros.status && filtros.status !== 'todos') {
        console.log('📊 Aplicando filtro de status:', filtros.status);
        query = query.eq('status', filtros.status);
      }

      if (filtros.resposta && filtros.resposta !== 'todas') {
        console.log('💬 Aplicando filtro de resposta:', filtros.resposta);
        query = query.eq('resposta', filtros.resposta);
      }

      if (filtros.empresa) {
        query = query.ilike('empresa', `%${filtros.empresa}%`);
      }

      if (filtros.categoria) {
        query = query.ilike('categoria', `%${filtros.categoria}%`);
      }

      if (filtros.grupo) {
        query = query.ilike('grupo', `%${filtros.grupo}%`);
      }

      if (filtros.ano_abertura) {
        query = query.eq('ano_abertura', filtros.ano_abertura);
      }

      if (filtros.mes_abertura) {
        query = query.eq('mes_abertura', filtros.mes_abertura);
      }

      // Filtro por ano da data de resposta
      if (filtros.ano) {
        console.log('🔍 Filtrando pesquisas por ano da data_resposta:', filtros.ano);
        
        // Filtrar registros que têm data_resposta não nula
        query = query.not('data_resposta', 'is', null);
        
        // Usar função SQL para extrair o ano da data_resposta
        // Supabase suporta funções SQL como extract
        const anoInicio = `${filtros.ano}-01-01`;
        const anoFim = `${filtros.ano}-12-31`;
        
        query = query.gte('data_resposta', anoInicio);
        query = query.lte('data_resposta', anoFim);
        
        console.log(`📅 Buscando registros entre ${anoInicio} e ${anoFim}`);
      }

      // Filtro por mês da data de resposta (só se ano também estiver definido)
      if (filtros.mes && filtros.ano) {
        const mesStr = filtros.mes.toString().padStart(2, '0');
        
        console.log('🔍 Refinando filtro para mês específico da data_resposta:', { 
          mes: filtros.mes, 
          ano: filtros.ano,
          mesStr
        });
        
        // Calcular primeiro e último dia do mês
        const mesInicio = `${filtros.ano}-${mesStr}-01`;
        const proximoMes = filtros.mes === 12 ? 1 : filtros.mes + 1;
        const proximoAno = filtros.mes === 12 ? filtros.ano + 1 : filtros.ano;
        const proximoMesStr = proximoMes.toString().padStart(2, '0');
        const mesFim = `${proximoAno}-${proximoMesStr}-01`;
        
        // Remover filtros de ano anteriores e aplicar filtro de mês específico
        query = query.gte('data_resposta', mesInicio);
        query = query.lt('data_resposta', mesFim);
        
        console.log(`📆 Buscando registros entre ${mesInicio} e ${mesFim} (exclusivo)`);
      }

      if (filtros.data_inicio) {
        query = query.gte('data_resposta', filtros.data_inicio);
      }

      if (filtros.data_fim) {
        query = query.lte('data_resposta', filtros.data_fim);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar todas as pesquisas:', error);
      throw new Error(`Erro ao buscar todas as pesquisas: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      offset += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE; // Se retornou menos que BATCH_SIZE, não há mais dados
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Total de TODAS as pesquisas carregadas: ${allData.length}`);
  
  // Debug: Se há filtros aplicados, mostrar algumas estatísticas
  if (filtros && Object.keys(filtros).length > 0) {
    console.log('📈 Estatísticas dos dados filtrados:');
    if (allData.length > 0) {
      const respostasUnicas = [...new Set(allData.map(p => p.resposta))];
      console.log('💬 Respostas encontradas:', respostasUnicas);
      
      const origensUnicas = [...new Set(allData.map(p => p.origem))];
      console.log('🏢 Origens encontradas:', origensUnicas);
      
      // Analisar datas de resposta
      const datasResposta = allData.map(p => p.data_resposta).filter(Boolean);
      console.log('📅 Total de registros com data_resposta:', datasResposta.length);
      
      if (datasResposta.length > 0) {
        const anosResposta = [...new Set(datasResposta.map(d => new Date(d).getFullYear()))];
        console.log('📅 Anos de resposta encontrados:', anosResposta.sort());
        
        const mesesResposta = [...new Set(datasResposta.map(d => new Date(d).getMonth() + 1))];
        console.log('📆 Meses de resposta encontrados:', mesesResposta.sort());
      }
      
      if (filtros.resposta) {
        const comResposta = allData.filter(p => p.resposta === filtros.resposta);
        console.log(`🎯 Registros com resposta "${filtros.resposta}":`, comResposta.length);
      }
      
      if (filtros.ano) {
        const comAno = allData.filter(p => p.ano_abertura === filtros.ano);
        console.log(`📅 Registros com ano ${filtros.ano}:`, comAno.length);
      }
      
      if (filtros.mes) {
        const comMes = allData.filter(p => p.mes_abertura === filtros.mes);
        console.log(`📆 Registros com mês ${filtros.mes}:`, comMes.length);
      }
    }
  }
  
  return allData;
}

/**
 * Buscar todos os pesquisas com filtros opcionais (COM filtro automático para tela de lançamento)
 */
export async function buscarPesquisas(filtros?: FiltrosPesquisas): Promise<Pesquisa[]> {
  // Buscar em lotes para garantir que todos os registros sejam carregados
  const BATCH_SIZE = 1000;
  let allData: Pesquisa[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('pesquisas_satisfacao')
      .select('*')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('created_at', { ascending: false });

    // Filtro automático: Excluir registros com comentário NULL e respostas positivas
    // Regra: Se comentario_pesquisa é NULL E resposta é "Muito Satisfeito", "Satisfeito" ou "Neutro", não exibir
    query = query.or(
      'comentario_pesquisa.not.is.null,' + // Tem comentário OU
      'and(comentario_pesquisa.is.null,resposta.not.in.(Muito Satisfeito,Satisfeito,Neutro))' // Sem comentário mas resposta negativa
    );

    // Aplicar filtros
    if (filtros) {
      if (filtros.busca) {
        query = query.or(`empresa.ilike.%${filtros.busca}%,cliente.ilike.%${filtros.busca}%,prestador.ilike.%${filtros.busca}%,nro_caso.ilike.%${filtros.busca}%`);
      }

      if (filtros.origem && filtros.origem !== 'todos') {
        query = query.eq('origem', filtros.origem);
      }

      if (filtros.status && filtros.status !== 'todos') {
        query = query.eq('status', filtros.status);
      }

      if (filtros.resposta && filtros.resposta !== 'todas') {
        query = query.eq('resposta', filtros.resposta);
      }

      if (filtros.empresa) {
        query = query.ilike('empresa', `%${filtros.empresa}%`);
      }

      if (filtros.categoria) {
        query = query.ilike('categoria', `%${filtros.categoria}%`);
      }

      if (filtros.grupo) {
        query = query.ilike('grupo', `%${filtros.grupo}%`);
      }

      if (filtros.ano_abertura) {
        query = query.eq('ano_abertura', filtros.ano_abertura);
      }

      if (filtros.mes_abertura) {
        query = query.eq('mes_abertura', filtros.mes_abertura);
      }

      // Filtro por mês/ano da data de resposta
      if (filtros.mes && filtros.ano) {
        const mesStr = filtros.mes.toString().padStart(2, '0');
        const anoStr = filtros.ano.toString();
        
        console.log('🔍 Filtrando pesquisas por mês/ano:', { 
          mes: filtros.mes, 
          ano: filtros.ano,
          mesStr,
          anoStr
        });
        
        // Usar função SQL para extrair mês e ano da data_resposta
        // Isso funciona melhor com datas no formato ISO
        query = query.not('data_resposta', 'is', null);
        
        // Filtrar usando SQL functions para extrair mês e ano
        // Format: YYYY-MM-DD, então podemos usar substring
        const anoMesPrefix = `${anoStr}-${mesStr}`;
        query = query.like('data_resposta', `${anoMesPrefix}%`);
        
        console.log('📅 Buscando registros com data_resposta começando com:', anoMesPrefix);
      }

      if (filtros.data_inicio) {
        query = query.gte('data_resposta', filtros.data_inicio);
      }

      if (filtros.data_fim) {
        query = query.lte('data_resposta', filtros.data_fim);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar pesquisas:', error);
      throw new Error(`Erro ao buscar pesquisas: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      offset += BATCH_SIZE;
      hasMore = data.length === BATCH_SIZE; // Se retornou menos que BATCH_SIZE, não há mais dados
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Total de registros carregados: ${allData.length}`);
  
  // Log de debug para ver algumas datas
  if (allData.length > 0) {
    console.log('📅 Primeiros 5 registros com suas datas:', 
      allData.slice(0, 5).map(p => ({
        id: p.id,
        empresa: p.empresa,
        data_resposta: p.data_resposta
      }))
    );
  }
  
  return allData;
}

/**
 * Buscar pesquisa por ID
 */
export async function buscarPesquisaPorId(id: string): Promise<Pesquisa | null> {
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar pesquisa:', error);
    throw new Error(`Erro ao buscar pesquisa: ${error.message}`);
  }

  return data;
}

/**
 * Criar novo pesquisa
 */
export async function criarPesquisa(dados: PesquisaFormData): Promise<Pesquisa> {
  // Buscar dados do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  let autorNome = 'Sistema';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    autorNome = profile?.full_name || user.email || 'Sistema';
  }

  const pesquisaData: PesquisaInsert = {
    origem: 'manual',
    id_externo: null,
    empresa: dados.empresa,
    categoria: dados.categoria || null,
    grupo: dados.grupo || null,
    cliente: dados.cliente,
    email_cliente: dados.email_cliente || null,
    prestador: dados.prestador || null,
    nro_caso: dados.nro_caso || null,
    tipo_caso: dados.tipo_caso || null,
    ano_abertura: dados.ano_abertura || null,
    mes_abertura: dados.mes_abertura || null,
    data_resposta: dados.data_resposta?.toISOString() || null,
    resposta: dados.resposta || null,
    comentario_pesquisa: dados.comentario_pesquisa || null,
    empresa_id: dados.empresa_id || null,
    cliente_id: dados.cliente_id || null,
    status: 'pendente',
    data_envio: null,
    autor_id: user?.id || null,
    autor_nome: autorNome,
    observacao: dados.observacao || null
  };

  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .insert(pesquisaData)
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar pesquisa:', error);
    throw new Error(`Erro ao criar pesquisa: ${error.message}`);
  }

  return data;
}

/**
 * Atualizar pesquisa existente
 */
export async function atualizarPesquisa(id: string, dados: Partial<PesquisaFormData>): Promise<Pesquisa> {
  const updateData: PesquisaUpdate = {};

  // Mapear apenas campos que foram fornecidos
  if (dados.empresa !== undefined) updateData.empresa = dados.empresa;
  if (dados.categoria !== undefined) updateData.categoria = dados.categoria || null;
  if (dados.grupo !== undefined) updateData.grupo = dados.grupo || null;
  if (dados.cliente !== undefined) updateData.cliente = dados.cliente;
  if (dados.email_cliente !== undefined) updateData.email_cliente = dados.email_cliente || null;
  if (dados.prestador !== undefined) updateData.prestador = dados.prestador || null;
  if (dados.nro_caso !== undefined) updateData.nro_caso = dados.nro_caso || null;
  if (dados.tipo_caso !== undefined) updateData.tipo_caso = dados.tipo_caso || null;
  if (dados.ano_abertura !== undefined) updateData.ano_abertura = dados.ano_abertura || null;
  if (dados.mes_abertura !== undefined) updateData.mes_abertura = dados.mes_abertura || null;
  if (dados.data_resposta !== undefined) updateData.data_resposta = dados.data_resposta?.toISOString() || null;
  if (dados.resposta !== undefined) updateData.resposta = dados.resposta || null;
  if (dados.comentario_pesquisa !== undefined) updateData.comentario_pesquisa = dados.comentario_pesquisa || null;
  if (dados.observacao !== undefined) updateData.observacao = dados.observacao || null;
  if (dados.empresa_id !== undefined) updateData.empresa_id = dados.empresa_id || null;
  if (dados.cliente_id !== undefined) updateData.cliente_id = dados.cliente_id || null;

  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar pesquisa:', error);
    throw new Error(`Erro ao atualizar pesquisa: ${error.message}`);
  }

  return data;
}

/**
 * Excluir pesquisa
 */
export async function excluirPesquisa(id: string): Promise<void> {
  const { error } = await supabase
    .from('pesquisas_satisfacao')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir pesquisa:', error);
    throw new Error(`Erro ao excluir pesquisa: ${error.message}`);
  }
}

// ============================================
// OPERAÇÕES EM LOTE
// ============================================

/**
 * Marcar pesquisas como enviados
 */
export async function marcarComoEnviados(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('pesquisas_satisfacao')
    .update({
      status: 'enviado',
      data_envio: new Date().toISOString()
    })
    .in('id', ids);

  if (error) {
    console.error('Erro ao marcar pesquisas como enviados:', error);
    throw new Error(`Erro ao marcar pesquisas como enviados: ${error.message}`);
  }
}

/**
 * Excluir múltiplos pesquisas
 */
export async function excluirPesquisasEmLote(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('pesquisas_satisfacao')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Erro ao excluir pesquisas em lote:', error);
    throw new Error(`Erro ao excluir pesquisas em lote: ${error.message}`);
  }
}

// ============================================
// ESTATÍSTICAS
// ============================================

/**
 * Obter estatísticas de TODAS as pesquisas (sem filtros automáticos)
 */
export async function obterTodasEstatisticas(filtros?: FiltrosPesquisas): Promise<EstatisticasPesquisas> {
  const pesquisas = await buscarTodasPesquisas(filtros);

  const estatisticas: EstatisticasPesquisas = {
    total: pesquisas.length,
    pendentes: pesquisas.filter(e => e.status === 'pendente').length,
    enviados: pesquisas.filter(e => e.status === 'enviado_plano_acao' || e.status === 'enviado_elogios').length,
    sql_server: pesquisas.filter(e => e.origem === 'sql_server').length,
    manuais: pesquisas.filter(e => e.origem === 'manual').length,
    por_empresa: {},
    por_categoria: {},
    por_mes: {}
  };

  // Agrupar por empresa
  pesquisas.forEach(pesquisa => {
    estatisticas.por_empresa[pesquisa.empresa] = (estatisticas.por_empresa[pesquisa.empresa] || 0) + 1;
  });

  // Agrupar por categoria
  pesquisas.forEach(pesquisa => {
    if (pesquisa.categoria) {
      estatisticas.por_categoria[pesquisa.categoria] = (estatisticas.por_categoria[pesquisa.categoria] || 0) + 1;
    }
  });

  // Agrupar por mês
  pesquisas.forEach(pesquisa => {
    if (pesquisa.ano_abertura && pesquisa.mes_abertura) {
      const chave = `${pesquisa.ano_abertura}-${String(pesquisa.mes_abertura).padStart(2, '0')}`;
      estatisticas.por_mes[chave] = (estatisticas.por_mes[chave] || 0) + 1;
    }
  });

  return estatisticas;
}

/**
 * Obter estatísticas dos pesquisas (COM filtros automáticos)
 */
export async function obterEstatisticas(filtros?: FiltrosPesquisas): Promise<EstatisticasPesquisas> {
  const pesquisas = await buscarPesquisas(filtros);

  const estatisticas: EstatisticasPesquisas = {
    total: pesquisas.length,
    pendentes: pesquisas.filter(e => e.status === 'pendente').length,
    enviados: pesquisas.filter(e => e.status === 'enviado').length,
    sql_server: pesquisas.filter(e => e.origem === 'sql_server').length,
    manuais: pesquisas.filter(e => e.origem === 'manual').length,
    por_empresa: {},
    por_categoria: {},
    por_mes: {}
  };

  // Agrupar por empresa
  pesquisas.forEach(pesquisa => {
    estatisticas.por_empresa[pesquisa.empresa] = (estatisticas.por_empresa[pesquisa.empresa] || 0) + 1;
  });

  // Agrupar por categoria
  pesquisas.forEach(pesquisa => {
    if (pesquisa.categoria) {
      estatisticas.por_categoria[pesquisa.categoria] = (estatisticas.por_categoria[pesquisa.categoria] || 0) + 1;
    }
  });

  // Agrupar por mês
  pesquisas.forEach(pesquisa => {
    if (pesquisa.ano_abertura && pesquisa.mes_abertura) {
      const chave = `${pesquisa.ano_abertura}-${String(pesquisa.mes_abertura).padStart(2, '0')}`;
      estatisticas.por_mes[chave] = (estatisticas.por_mes[chave] || 0) + 1;
    }
  });

  return estatisticas;
}

// ============================================
// BUSCAR LISTAS ÚNICAS
// ============================================

/**
 * Buscar lista única de empresas
 */
export async function buscarEmpresas(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('empresa')
    .order('empresa');

  if (error) {
    console.error('Erro ao buscar empresas:', error);
    return [];
  }

  const empresasUnicas = [...new Set(data.map(item => item.empresa))];
  return empresasUnicas.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Buscar lista única de categorias
 */
export async function buscarCategorias(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('categoria')
    .not('categoria', 'is', null)
    .order('categoria');

  if (error) {
    console.error('Erro ao buscar categorias:', error);
    return [];
  }

  const categoriasUnicas = [...new Set(data.map(item => item.categoria).filter(Boolean) as string[])];
  return categoriasUnicas.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Buscar lista única de grupos
 */
export async function buscarGrupos(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pesquisas_satisfacao')
    .select('grupo')
    .not('grupo', 'is', null)
    .order('grupo');

  if (error) {
    console.error('Erro ao buscar grupos:', error);
    return [];
  }

  const gruposUnicos = [...new Set(data.map(item => item.grupo).filter(Boolean) as string[])];
  return gruposUnicos.sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// ============================================
// ENVIO DE PESQUISAS
// ============================================

/**
 * Enviar pesquisa para Plano de Ação
 */
export async function enviarParaPlanoAcao(id: string): Promise<void> {
  // Buscar dados da pesquisa
  const pesquisa = await buscarPesquisaPorId(id);
  
  if (!pesquisa) {
    throw new Error('Pesquisa não encontrada');
  }

  // Buscar dados do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  // Criar plano de ação automaticamente
  const { error: planoError } = await supabase
    .from('planos_acao')
    .insert({
      pesquisa_id: pesquisa.id,
      descricao_acao_corretiva: pesquisa.comentario_pesquisa || `Ação corretiva para pesquisa de ${pesquisa.cliente} - ${pesquisa.empresa}`,
      acao_preventiva: null,
      prioridade: pesquisa.resposta === 'Muito Insatisfeito' ? 'alta' : 'media',
      status_plano: 'aberto',
      data_inicio: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
      data_conclusao: null,
      data_primeiro_contato: null,
      meio_contato: null,
      resumo_comunicacao: null,
      retorno_cliente: null,
      status_final: null,
      data_fechamento: null,
      criado_por: user?.id || null
    });

  if (planoError) {
    console.error('Erro ao criar plano de ação:', planoError);
    throw new Error('Erro ao criar plano de ação');
  }

  // Atualizar status da pesquisa
  const { error } = await supabase
    .from('pesquisas_satisfacao')
    .update({ 
      status: 'enviado_plano_acao',
      data_envio: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao enviar para Plano de Ação:', error);
    throw new Error('Erro ao enviar pesquisa para Plano de Ação');
  }
}

/**
 * Enviar pesquisa para Elogios
 */
export async function enviarParaElogios(id: string): Promise<void> {
  // Buscar dados da pesquisa
  const pesquisa = await buscarPesquisaPorId(id);
  
  if (!pesquisa) {
    throw new Error('Pesquisa não encontrada');
  }

  // Verificar se já existe um elogio para esta pesquisa
  const { data: elogioExistente } = await supabase
    .from('elogios')
    .select('id')
    .eq('pesquisa_id', pesquisa.id)
    .single();

  // Se já existe, não criar novamente
  if (elogioExistente) {
    console.log('Elogio já existe para esta pesquisa');
    return;
  }

  // Buscar dados do usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();
  
  // Criar elogio vinculado à pesquisa
  const { error: elogioError } = await supabase
    .from('elogios')
    .insert({
      pesquisa_id: pesquisa.id,
      chamado: pesquisa.nro_caso,
      data_resposta: pesquisa.data_resposta,
      observacao: null,
      status: 'registrado',
      criado_por: user?.id || null
    });

  if (elogioError) {
    console.error('Erro ao criar elogio:', elogioError);
    throw new Error('Erro ao criar elogio');
  }

  // Atualizar status da pesquisa
  const { error } = await supabase
    .from('pesquisas_satisfacao')
    .update({ 
      status: 'enviado_elogios',
      data_envio: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Erro ao enviar para Elogios:', error);
    throw new Error('Erro ao enviar pesquisa para Elogios');
  }
}
