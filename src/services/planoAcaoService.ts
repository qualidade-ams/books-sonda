// =====================================================
// SERVIÇO: PLANO DE AÇÃO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  PlanoAcao,
  PlanoAcaoCompleto,
  PlanoAcaoFormData,
  PlanoAcaoHistorico,
  FiltrosPlanoAcao,
  EstatisticasPlanoAcao,
} from '@/types/planoAcao';

/**
 * Buscar todos os planos de ação com filtros
 */
export async function buscarPlanosAcao(
  filtros?: FiltrosPlanoAcao
): Promise<PlanoAcaoCompleto[]> {
  console.log('🔍 buscarPlanosAcao chamado com filtros:', filtros);
  
  let query = supabase
    .from('planos_acao')
    .select(`
      *,
      pesquisa:pesquisas_satisfacao(
        id,
        empresa,
        cliente,
        tipo_caso,
        nro_caso,
        comentario_pesquisa,
        resposta,
        data_resposta,
        prestador,
        coordenador_id
      )
    `)
    .order('criado_em', { ascending: false });

  // Aplicar filtros
  if (filtros?.prioridade && filtros.prioridade.length > 0) {
    query = query.in('prioridade', filtros.prioridade);
  }

  if (filtros?.status && filtros.status.length > 0) {
    query = query.in('status_plano', filtros.status);
  }

  if (filtros?.dataInicio) {
    query = query.gte('data_inicio', filtros.dataInicio);
  }

  if (filtros?.dataFim) {
    query = query.lte('data_inicio', filtros.dataFim);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Erro ao buscar planos de ação:', error);
    throw new Error('Erro ao buscar planos de ação');
  }

  console.log('✅ Planos retornados do banco:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('📋 Primeiro plano:', data[0]);
  }

  // Filtro de busca por texto (cliente-side)
  let resultado = data || [];
  if (filtros?.busca) {
    const busca = filtros.busca.toLowerCase();
    resultado = resultado.filter((plano: any) => {
      const pesquisa = plano.pesquisa;
      return (
        pesquisa?.empresa?.toLowerCase().includes(busca) ||
        pesquisa?.cliente?.toLowerCase().includes(busca) ||
        pesquisa?.nro_caso?.toLowerCase().includes(busca) ||
        plano.descricao_acao_corretiva?.toLowerCase().includes(busca)
      );
    });
  }

  // Filtro por empresa
  if (filtros?.empresa) {
    const empresaBusca = filtros.empresa.toLowerCase();
    resultado = resultado.filter((plano: any) =>
      plano.pesquisa?.empresa?.toLowerCase().includes(empresaBusca)
    );
  }

  // Filtro por mês/ano da data_resposta da pesquisa
  if (filtros?.mes && filtros?.ano) {
    console.log('🔍 Filtrando planos por mês/ano da data_resposta:', { 
      mes: filtros.mes, 
      ano: filtros.ano
    });
    console.log('📊 Total de planos antes do filtro:', resultado.length);
    
    resultado = resultado.filter((plano: any) => {
      // Usar data_resposta da pesquisa relacionada
      const dataResposta = plano.pesquisa?.data_resposta;
      
      if (!dataResposta) {
        console.log('⚠️ Plano sem data_resposta na pesquisa:', plano.id);
        return false;
      }
      
      // Converter para objeto Date para comparação precisa
      const data = new Date(dataResposta);
      const mesData = data.getMonth() + 1; // getMonth() retorna 0-11
      const anoData = data.getFullYear();
      
      const match = mesData === filtros.mes && anoData === filtros.ano;
      
      console.log('📅 Comparando:', {
        planoId: plano.id,
        dataResposta,
        mesData,
        anoData,
        filtroMes: filtros.mes,
        filtroAno: filtros.ano,
        match
      });
      
      return match;
    });
    
    console.log('✅ Total de planos após filtro:', resultado.length);
  }

  console.log('🎯 Retornando', resultado.length, 'planos');
  return resultado as PlanoAcaoCompleto[];
}

/**
 * Buscar plano de ação por ID
 */
export async function buscarPlanoAcaoPorId(id: string): Promise<PlanoAcaoCompleto | null> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select(`
      *,
      pesquisa:pesquisas_satisfacao(
        id,
        empresa,
        cliente,
        tipo_caso,
        nro_caso,
        comentario_pesquisa,
        resposta,
        data_resposta
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar plano de ação:', error);
    return null;
  }

  return data as PlanoAcaoCompleto;
}

/**
 * Buscar plano de ação por pesquisa_id
 */
export async function buscarPlanoAcaoPorPesquisa(pesquisaId: string): Promise<PlanoAcaoCompleto | null> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select(`
      *,
      pesquisa:pesquisas_satisfacao(
        id,
        empresa,
        cliente,
        tipo_caso,
        nro_caso,
        comentario_pesquisa,
        resposta,
        data_resposta
      )
    `)
    .eq('pesquisa_id', pesquisaId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar plano de ação por pesquisa:', error);
    return null;
  }

  return data as PlanoAcaoCompleto | null;
}

/**
 * Criar novo plano de ação
 */
export async function criarPlanoAcao(dados: PlanoAcaoFormData): Promise<PlanoAcao> {
  // Buscar usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();

  // Separar coordenador_id para atualizar na pesquisa
  const { coordenador_id, ...dadosPlano } = dados;

  // Limpar valores vazios e null para evitar erros de validação
  const dadosLimpos = Object.entries(dadosPlano).reduce((acc, [key, value]) => {
    // Pular campos que não existem na tabela planos_acao (até migração ser executada)
    if (key === 'chamado' || key === 'empresa_id' || key === 'especialistas_ids') {
      console.log(`⏭️ Pulando campo ${key} (não existe na tabela):`, value);
      return acc;
    }
    // Manter apenas valores que não são undefined, null ou string vazia
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as any);

  const { data, error } = await supabase
    .from('planos_acao')
    .insert({
      ...dadosLimpos,
      criado_por: user?.id,
      status_plano: dadosLimpos.status_plano || 'aberto',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar plano de ação:', error);
    console.error('Dados enviados:', dadosLimpos);
    throw new Error('Erro ao criar plano de ação');
  }

  // Atualizar coordenador_id na pesquisa se fornecido
  if (coordenador_id && dados.pesquisa_id) {
    const { error: errorPesquisa } = await supabase
      .from('pesquisas_satisfacao')
      .update({ coordenador_id: coordenador_id || null })
      .eq('id', dados.pesquisa_id);

    if (errorPesquisa) {
      console.error('⚠️ Erro ao atualizar coordenador na pesquisa:', errorPesquisa);
      // Não falhar a operação por causa disso
    } else {
      console.log('✅ Coordenador atualizado na pesquisa');
    }
  }

  return data as PlanoAcao;
}

/**
 * Atualizar plano de ação
 */
export async function atualizarPlanoAcao(
  id: string,
  dados: Partial<PlanoAcaoFormData>
): Promise<PlanoAcao> {
  console.log('🔧 Dados recebidos para atualização:', dados);
  
  // Separar coordenador_id para atualizar na pesquisa
  const { coordenador_id, ...dadosPlano } = dados;
  
  // Limpar valores vazios e null para evitar erros de validação
  const dadosLimpos = Object.entries(dadosPlano).reduce((acc, [key, value]) => {
    // Pular campos que não existem na tabela planos_acao (até migração ser executada)
    if (key === 'chamado' || key === 'empresa_id' || key === 'especialistas_ids') {
      console.log(`⏭️ Pulando campo ${key} (não existe na tabela):`, value);
      return acc;
    }
    
    // Tratar campos especiais que podem ser null
    if (key === 'meio_contato' || key === 'retorno_cliente' || key === 'status_final') {
      if (value === null || value === undefined || value === '') {
        // Para estes campos, null é um valor válido
        acc[key] = null;
        return acc;
      }
    }
    
    // Manter apenas valores que não são undefined, null ou string vazia
    if (value !== undefined && value !== null && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
  
  console.log('📤 Dados limpos para envio:', dadosLimpos);

  const { data, error } = await supabase
    .from('planos_acao')
    .update(dadosLimpos)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar plano de ação:', error);
    console.error('📋 Dados enviados:', dadosLimpos);
    console.error('🔍 Detalhes do erro:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error('Erro ao atualizar plano de ação');
  }

  // Atualizar coordenador_id na pesquisa se fornecido
  if (coordenador_id !== undefined && dados.pesquisa_id) {
    const { error: errorPesquisa } = await supabase
      .from('pesquisas_satisfacao')
      .update({ coordenador_id: coordenador_id || null })
      .eq('id', dados.pesquisa_id);

    if (errorPesquisa) {
      console.error('⚠️ Erro ao atualizar coordenador na pesquisa:', errorPesquisa);
      // Não falhar a operação por causa disso
    } else {
      console.log('✅ Coordenador atualizado na pesquisa');
    }
  }

  return data as PlanoAcao;
}

/**
 * Deletar plano de ação e pesquisa relacionada (exclusão em cascata)
 */
export async function deletarPlanoAcao(id: string): Promise<void> {
  console.log('🗑️ Iniciando exclusão em cascata do plano de ação:', id);
  
  // Primeiro, buscar o pesquisa_id do plano de ação
  const { data: planoData, error: planoError } = await supabase
    .from('planos_acao')
    .select('pesquisa_id')
    .eq('id', id)
    .single();

  if (planoError) {
    console.error('❌ Erro ao buscar plano de ação para exclusão:', planoError);
    throw new Error('Erro ao buscar plano de ação para exclusão');
  }

  if (!planoData?.pesquisa_id) {
    console.error('❌ Plano de ação não possui pesquisa_id associado');
    throw new Error('Plano de ação não possui pesquisa associada');
  }

  const pesquisaId = planoData.pesquisa_id;
  console.log('📋 Pesquisa associada encontrada:', pesquisaId);

  // Deletar o plano de ação primeiro
  const { error: planoDeleteError } = await supabase
    .from('planos_acao')
    .delete()
    .eq('id', id);

  if (planoDeleteError) {
    console.error('❌ Erro ao deletar plano de ação:', planoDeleteError);
    throw new Error('Erro ao deletar plano de ação');
  }

  console.log('✅ Plano de ação deletado com sucesso');

  // Agora deletar a pesquisa de satisfação relacionada
  const { error: pesquisaDeleteError } = await supabase
    .from('pesquisas_satisfacao')
    .delete()
    .eq('id', pesquisaId);

  if (pesquisaDeleteError) {
    console.error('❌ Erro ao deletar pesquisa de satisfação:', pesquisaDeleteError);
    // Não vamos fazer rollback do plano já deletado, mas vamos logar o erro
    console.error('⚠️ ATENÇÃO: Plano de ação foi deletado mas a pesquisa não pôde ser removida');
    throw new Error('Erro ao deletar pesquisa de satisfação relacionada');
  }

  console.log('✅ Pesquisa de satisfação deletada com sucesso');
  console.log('🎯 Exclusão em cascata concluída com sucesso');
}

/**
 * Buscar histórico de um plano de ação
 */
export async function buscarHistoricoPlano(planoId: string): Promise<PlanoAcaoHistorico[]> {
  const { data, error } = await supabase
    .from('plano_acao_historico')
    .select('*')
    .eq('plano_acao_id', planoId)
    .order('data_atualizacao', { ascending: false });

  if (error) {
    console.error('Erro ao buscar histórico:', error);
    throw new Error('Erro ao buscar histórico');
  }

  return data as PlanoAcaoHistorico[];
}

/**
 * Adicionar entrada manual no histórico
 */
export async function adicionarHistorico(
  planoId: string,
  descricao: string,
  tipo: 'contato' | 'atualizacao'
): Promise<PlanoAcaoHistorico> {
  // Buscar usuário autenticado
  const { data: { user } } = await supabase.auth.getUser();

  // Buscar nome do usuário
  let usuarioNome = 'Sistema';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (profile?.full_name) {
      usuarioNome = profile.full_name;
    } else {
      usuarioNome = user.email || 'Sistema';
    }
  }

  const { data, error } = await supabase
    .from('plano_acao_historico')
    .insert({
      plano_acao_id: planoId,
      usuario_id: user?.id,
      usuario_nome: usuarioNome,
      descricao_atualizacao: descricao,
      tipo_atualizacao: tipo,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar histórico:', error);
    throw new Error('Erro ao adicionar histórico');
  }

  return data as PlanoAcaoHistorico;
}

/**
 * Obter estatísticas dos planos de ação
 */
export async function obterEstatisticas(filtros?: FiltrosPlanoAcao): Promise<EstatisticasPlanoAcao> {
  // Buscar planos com os mesmos filtros
  const planosCompletos = await buscarPlanosAcao(filtros);
  
  // Calcular estatísticas por mês
  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const porMes = meses.map((mesNome, index) => {
    const mesNumero = index + 1;
    const planosMes = planosCompletos.filter(plano => {
      // Usar data_resposta da pesquisa relacionada em vez de data_inicio do plano
      const dataResposta = plano.pesquisa?.data_resposta;
      
      if (!dataResposta) {
        return false;
      }
      
      const data = new Date(dataResposta);
      return data.getMonth() + 1 === mesNumero;
    });

    return {
      mes: mesNumero,
      mesNome,
      abertos: planosMes.filter(p => p.status_plano === 'aberto').length,
      em_andamento: planosMes.filter(p => p.status_plano === 'em_andamento').length,
      aguardando_retorno: planosMes.filter(p => p.status_plano === 'aguardando_retorno').length,
      concluidos: planosMes.filter(p => p.status_plano === 'concluido').length,
      cancelados: planosMes.filter(p => p.status_plano === 'cancelado').length,
      total: planosMes.length
    };
  });
  
  // Calcular tempo médio de resolução
  const planosConcluidos = planosCompletos.filter(p => 
    p.status_plano === 'concluido' && p.data_conclusao
  );
  
  let tempoMedioResolucao = 0;
  if (planosConcluidos.length > 0) {
    const totalDias = planosConcluidos.reduce((acc, plano) => {
      const dataInicio = new Date(plano.data_inicio);
      const dataConclusao = new Date(plano.data_conclusao!);
      const diffTime = Math.abs(dataConclusao.getTime() - dataInicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return acc + diffDays;
    }, 0);
    tempoMedioResolucao = Math.round(totalDias / planosConcluidos.length);
  }
  
  return {
    total: planosCompletos.length,
    abertos: planosCompletos.filter(p => p.status_plano === 'aberto').length,
    em_andamento: planosCompletos.filter(p => p.status_plano === 'em_andamento').length,
    aguardando_retorno: planosCompletos.filter(p => p.status_plano === 'aguardando_retorno').length,
    concluidos: planosCompletos.filter(p => p.status_plano === 'concluido').length,
    cancelados: planosCompletos.filter(p => p.status_plano === 'cancelado').length,
    tempo_medio_resolucao: tempoMedioResolucao,
    por_prioridade: {
      baixa: planosCompletos.filter(p => p.prioridade === 'baixa').length,
      media: planosCompletos.filter(p => p.prioridade === 'media').length,
      alta: planosCompletos.filter(p => p.prioridade === 'alta').length,
      critica: planosCompletos.filter(p => p.prioridade === 'critica').length,
    },
    por_mes: porMes,
  };
}
