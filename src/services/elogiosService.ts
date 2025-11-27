// =====================================================
// SERVIÇO: ELOGIOS
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  Elogio,
  ElogioCompleto,
  ElogioFormData,
  FiltrosElogio,
  EstatisticasElogio,
} from '@/types/elogios';

/**
 * Buscar todos os elogios com filtros
 */
export async function buscarElogios(
  filtros?: FiltrosElogio
): Promise<ElogioCompleto[]> {
  console.log('🔍 buscarElogios chamado com filtros:', filtros);
  
  let query = supabase
    .from('elogios')
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
    .order('criado_em', { ascending: false });

  // Aplicar filtros
  if (filtros?.status && filtros.status.length > 0) {
    query = query.in('status', filtros.status);
  }

  if (filtros?.dataInicio) {
    query = query.gte('data_resposta', filtros.dataInicio);
  }

  if (filtros?.dataFim) {
    query = query.lte('data_resposta', filtros.dataFim);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Erro ao buscar elogios:', error);
    throw new Error('Erro ao buscar elogios');
  }

  console.log('✅ Elogios retornados do banco:', data?.length || 0);

  // Filtro de busca por texto (cliente-side)
  let resultado = data || [];
  
  if (filtros?.busca) {
    const busca = filtros.busca.toLowerCase();
    resultado = resultado.filter((elogio: any) => {
      const pesquisa = elogio.pesquisa;
      return (
        pesquisa?.empresa?.toLowerCase().includes(busca) ||
        pesquisa?.cliente?.toLowerCase().includes(busca) ||
        pesquisa?.nro_caso?.toLowerCase().includes(busca) ||
        elogio.observacao?.toLowerCase().includes(busca)
      );
    });
  }

  // Filtro por empresa
  if (filtros?.empresa) {
    const empresaBusca = filtros.empresa.toLowerCase();
    resultado = resultado.filter((elogio: any) =>
      elogio.pesquisa?.empresa?.toLowerCase().includes(empresaBusca)
    );
  }

  // Filtro por mês/ano da data de resposta
  if (filtros?.mes && filtros?.ano) {
    const mesStr = filtros.mes.toString().padStart(2, '0');
    const anoStr = filtros.ano.toString();
    const anoMesPrefix = `${anoStr}-${mesStr}`;
    
    console.log('🔍 Filtrando elogios por mês/ano:', { 
      mes: filtros.mes, 
      ano: filtros.ano,
      anoMesPrefix 
    });
    
    resultado = resultado.filter((elogio: any) => {
      if (!elogio.data_resposta) {
        return false;
      }
      return elogio.data_resposta.startsWith(anoMesPrefix);
    });
  }

  console.log('🎯 Retornando', resultado.length, 'elogios');
  return resultado as ElogioCompleto[];
}

/**
 * Buscar elogio por ID
 */
export async function buscarElogioPorId(id: string): Promise<ElogioCompleto | null> {
  const { data, error } = await supabase
    .from('elogios')
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
    console.error('Erro ao buscar elogio:', error);
    return null;
  }

  return data as ElogioCompleto;
}

/**
 * Criar novo elogio
 */
export async function criarElogio(dados: ElogioFormData): Promise<Elogio> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('elogios')
    .insert({
      ...dados,
      criado_por: user?.id,
      status: dados.status || 'registrado',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar elogio:', error);
    throw new Error('Erro ao criar elogio');
  }

  return data as Elogio;
}

/**
 * Atualizar elogio
 */
export async function atualizarElogio(
  id: string,
  dados: Partial<ElogioFormData>
): Promise<Elogio> {
  const { data, error } = await supabase
    .from('elogios')
    .update(dados)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar elogio:', error);
    throw new Error('Erro ao atualizar elogio');
  }

  return data as Elogio;
}

/**
 * Deletar elogio
 */
export async function deletarElogio(id: string): Promise<void> {
  const { error } = await supabase
    .from('elogios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar elogio:', error);
    throw new Error('Erro ao deletar elogio');
  }
}

/**
 * Obter estatísticas dos elogios
 */
export async function obterEstatisticas(filtros?: FiltrosElogio): Promise<EstatisticasElogio> {
  const elogios = await buscarElogios(filtros);
  
  return {
    total: elogios.length,
    registrados: elogios.filter(e => e.status === 'registrado').length,
    compartilhados: elogios.filter(e => e.status === 'compartilhado').length,
    arquivados: elogios.filter(e => e.status === 'arquivado').length,
  };
}
