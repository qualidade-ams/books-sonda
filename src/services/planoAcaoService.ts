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
        resposta
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
    console.error('Erro ao buscar planos de ação:', error);
    throw new Error('Erro ao buscar planos de ação');
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
        resposta
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
        resposta
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

  const { data, error } = await supabase
    .from('planos_acao')
    .insert({
      ...dados,
      criado_por: user?.id,
      status_plano: dados.status_plano || 'aberto',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar plano de ação:', error);
    throw new Error('Erro ao criar plano de ação');
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
  const { data, error } = await supabase
    .from('planos_acao')
    .update(dados)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar plano de ação:', error);
    throw new Error('Erro ao atualizar plano de ação');
  }

  return data as PlanoAcao;
}

/**
 * Deletar plano de ação
 */
export async function deletarPlanoAcao(id: string): Promise<void> {
  const { error } = await supabase
    .from('planos_acao')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar plano de ação:', error);
    throw new Error('Erro ao deletar plano de ação');
  }
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
export async function obterEstatisticas(): Promise<EstatisticasPlanoAcao> {
  const { data, error } = await supabase
    .from('planos_acao')
    .select('status_plano, prioridade');

  if (error) {
    console.error('Erro ao obter estatísticas:', error);
    throw new Error('Erro ao obter estatísticas');
  }

  const planos = data || [];

  return {
    total: planos.length,
    abertos: planos.filter(p => p.status_plano === 'aberto').length,
    em_andamento: planos.filter(p => p.status_plano === 'em_andamento').length,
    aguardando_retorno: planos.filter(p => p.status_plano === 'aguardando_retorno').length,
    concluidos: planos.filter(p => p.status_plano === 'concluido').length,
    cancelados: planos.filter(p => p.status_plano === 'cancelado').length,
    por_prioridade: {
      baixa: planos.filter(p => p.prioridade === 'baixa').length,
      media: planos.filter(p => p.prioridade === 'media').length,
      alta: planos.filter(p => p.prioridade === 'alta').length,
      critica: planos.filter(p => p.prioridade === 'critica').length,
    },
  };
}
