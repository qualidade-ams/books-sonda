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
    .from('elogios' as any)
    .select(`
      *,
      pesquisa:pesquisas_satisfacao(
        id,
        empresa,
        cliente,
        email_cliente,
        prestador,
        categoria,
        grupo,
        tipo_caso,
        nro_caso,
        comentario_pesquisa,
        resposta,
        data_resposta,
        origem
      ),
      especialistas:elogio_especialistas(
        especialista_id,
        especialistas(
          id,
          nome,
          email
        )
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
  return resultado as unknown as ElogioCompleto[];
}

/**
 * Buscar elogio por ID
 */
export async function buscarElogioPorId(id: string): Promise<ElogioCompleto | null> {
  const { data, error } = await supabase
    .from('elogios' as any)
    .select(`
      *,
      pesquisa:pesquisas_satisfacao(
        id,
        empresa,
        cliente,
        email_cliente,
        prestador,
        categoria,
        grupo,
        tipo_caso,
        nro_caso,
        comentario_pesquisa,
        resposta,
        data_resposta,
        origem
      ),
      especialistas:elogio_especialistas(
        especialista_id,
        especialistas(
          id,
          nome,
          email
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar elogio:', error);
    return null;
  }

  return data as unknown as ElogioCompleto;
}

/**
 * Criar novo elogio
 */
export async function criarElogio(dados: ElogioFormData): Promise<Elogio> {
  const { data: { user } } = await supabase.auth.getUser();

  // Primeiro, criar a pesquisa de satisfação
  const { data: pesquisa, error: pesquisaError } = await supabase
    .from('pesquisas_satisfacao')
    .insert({
      empresa: dados.empresa,
      cliente: dados.cliente,
      email_cliente: dados.email_cliente,
      prestador: dados.prestador,
      categoria: dados.categoria,
      grupo: dados.grupo,
      tipo_caso: dados.tipo_caso,
      nro_caso: dados.nro_caso,
      resposta: dados.resposta,
      comentario_pesquisa: dados.comentario_pesquisa,
      data_resposta: dados.data_resposta 
        ? (dados.data_resposta instanceof Date ? dados.data_resposta.toISOString() : dados.data_resposta)
        : undefined,
      origem: 'manual'
    } as any)
    .select()
    .single();

  if (pesquisaError) {
    console.error('Erro ao criar pesquisa:', pesquisaError);
    throw new Error('Erro ao criar pesquisa de satisfação');
  }

  // Depois, criar o elogio vinculado à pesquisa
  const { data, error } = await supabase
    .from('elogios' as any)
    .insert({
      pesquisa_id: pesquisa.id,
      chamado: dados.nro_caso,
      observacao: dados.observacao,
      data_resposta: dados.data_resposta,
      criado_por: user?.id,
      status: dados.status || 'registrado',
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar elogio:', error);
    throw new Error('Erro ao criar elogio');
  }

  return data as unknown as Elogio;
}

/**
 * Atualizar elogio
 */
export async function atualizarElogio(
  id: string,
  dados: Partial<ElogioFormData>
): Promise<Elogio> {
  // Buscar o elogio para obter o pesquisa_id
  const { data: elogioAtual, error: elogioError } = await supabase
    .from('elogios' as any)
    .select('pesquisa_id')
    .eq('id', id)
    .single();

  if (elogioError || !elogioAtual) {
    console.error('Erro ao buscar elogio:', elogioError);
    throw new Error('Elogio não encontrado');
  }

  const elogioData = elogioAtual as any;

  // Atualizar a pesquisa vinculada se houver dados de pesquisa
  if (elogioData.pesquisa_id) {
    const dadosPesquisa: any = {};
    
    if (dados.empresa) dadosPesquisa.empresa = dados.empresa;
    if (dados.cliente) dadosPesquisa.cliente = dados.cliente;
    if (dados.email_cliente !== undefined) dadosPesquisa.email_cliente = dados.email_cliente;
    if (dados.prestador !== undefined) dadosPesquisa.prestador = dados.prestador;
    if (dados.categoria !== undefined) dadosPesquisa.categoria = dados.categoria;
    if (dados.grupo !== undefined) dadosPesquisa.grupo = dados.grupo;
    if (dados.tipo_caso !== undefined) dadosPesquisa.tipo_caso = dados.tipo_caso;
    if (dados.nro_caso !== undefined) dadosPesquisa.nro_caso = dados.nro_caso;
    if (dados.resposta) dadosPesquisa.resposta = dados.resposta;
    if (dados.comentario_pesquisa !== undefined) dadosPesquisa.comentario_pesquisa = dados.comentario_pesquisa;
    if (dados.data_resposta !== undefined) dadosPesquisa.data_resposta = dados.data_resposta;

    if (Object.keys(dadosPesquisa).length > 0) {
      const { error: pesquisaError } = await supabase
        .from('pesquisas_satisfacao')
        .update(dadosPesquisa)
        .eq('id', elogioData.pesquisa_id);

      if (pesquisaError) {
        console.error('Erro ao atualizar pesquisa:', pesquisaError);
        throw new Error('Erro ao atualizar pesquisa de satisfação');
      }
    }
  }

  // Atualizar o elogio
  const dadosElogio: any = {};
  if (dados.observacao !== undefined) dadosElogio.observacao = dados.observacao;
  if (dados.nro_caso !== undefined) dadosElogio.chamado = dados.nro_caso;
  if (dados.data_resposta !== undefined) dadosElogio.data_resposta = dados.data_resposta;
  if (dados.status) dadosElogio.status = dados.status;

  const { data, error } = await supabase
    .from('elogios' as any)
    .update(dadosElogio)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar elogio:', error);
    throw new Error('Erro ao atualizar elogio');
  }

  return data as unknown as Elogio;
}

/**
 * Deletar elogio
 */
export async function deletarElogio(id: string): Promise<void> {
  const { error } = await supabase
    .from('elogios' as any)
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
  
  // Calcular satisfação média baseada nas pesquisas
  let satisfacaoMedia: number | null = null;
  
  try {
    // Buscar pesquisas relacionadas aos elogios com resposta válida
    const pesquisasComResposta = elogios
      .filter(e => e.pesquisa?.resposta && e.pesquisa.resposta.trim() !== '')
      .map(e => e.pesquisa!.resposta!.trim());

    if (pesquisasComResposta.length > 0) {
      // Mapear respostas textuais para valores numéricos
      const valoresNumericos = pesquisasComResposta
        .map(resposta => {
          const respostaLower = resposta.toLowerCase().trim();
          
          // Mapeamento baseado no texto da resposta
          // 1 - Muito insatisfeito
          if (respostaLower.includes('muito insatisfeito') || 
              respostaLower === '1' || 
              respostaLower === 'muito insatisfeito') {
            return 1;
          }
          
          // 2 - Insatisfeito
          if ((respostaLower.includes('insatisfeito') && !respostaLower.includes('muito')) || 
              respostaLower === '2' || 
              respostaLower === 'insatisfeito') {
            return 2;
          }
          
          // 3 - Neutro
          if (respostaLower.includes('neutro') || 
              respostaLower === '3' || 
              respostaLower === 'neutro') {
            return 3;
          }
          
          // 5 - Muito Satisfeito (verificar antes do 4)
          if (respostaLower.includes('muito satisfeito') || 
              respostaLower === '5' || 
              respostaLower === 'muito satisfeito') {
            return 5;
          }
          
          // 4 - Satisfeito
          if (respostaLower.includes('satisfeito') || 
              respostaLower === '4' || 
              respostaLower === 'satisfeito') {
            return 4;
          }
          
          // Tentar converter diretamente para número (caso seja numérico)
          const numeroResposta = parseInt(resposta);
          if (!isNaN(numeroResposta) && numeroResposta >= 1 && numeroResposta <= 5) {
            return numeroResposta;
          }
          
          return null; // Resposta inválida
        })
        .filter(valor => valor !== null) as number[];

      if (valoresNumericos.length > 0) {
        const soma = valoresNumericos.reduce((acc, valor) => acc + valor, 0);
        satisfacaoMedia = soma / valoresNumericos.length;
      }
    }
  } catch (error) {
    console.error('Erro ao calcular satisfação média:', error);
  }
  
  return {
    total: elogios.length,
    registrados: elogios.filter(e => e.status === 'registrado').length,
    compartilhados: elogios.filter(e => e.status === 'compartilhado').length,
    arquivados: elogios.filter(e => e.status === 'arquivado').length,
    enviados: elogios.filter(e => e.status === 'enviado').length,
    satisfacaoMedia,
  };
}
