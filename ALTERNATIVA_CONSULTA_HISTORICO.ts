// Alternativa para consulta do histórico sem joins complexos

import { supabase } from './src/integrations/supabase/client';
import type {
  HistoricoDisparoCompleto,
  FiltrosAvancados
} from './src/types/clientBooks';

/**
 * Versão alternativa da consulta de histórico que evita problemas de relacionamento
 */
async function buscarHistoricoDetalhadoAlternativo(filtros: FiltrosAvancados): Promise<HistoricoDisparoCompleto[]> {
  try {
    // 1. Buscar dados básicos do histórico
    let query = supabase
      .from('historico_disparos')
      .select('*');

    // Aplicar filtros básicos
    if (filtros.empresaId) {
      query = query.eq('empresa_id', filtros.empresaId);
    }

    if (filtros.clienteId) {
      query = query.eq('cliente_id', filtros.clienteId);
    }

    if (filtros.status && filtros.status.length > 0) {
      query = query.in('status', filtros.status);
    }

    // Filtros de data
    if (filtros.dataInicio) {
      query = query.gte('data_disparo', filtros.dataInicio.toISOString());
    }

    if (filtros.dataFim) {
      query = query.lte('data_disparo', filtros.dataFim.toISOString());
    }

    // Filtro por mês/ano específico
    if (filtros.mes && filtros.ano) {
      const dataInicio = new Date(filtros.ano, filtros.mes - 1, 1);
      const dataFim = new Date(filtros.ano, filtros.mes, 0, 23, 59, 59);
      query = query.gte('data_disparo', dataInicio.toISOString())
        .lte('data_disparo', dataFim.toISOString());
    }

    // Ordenação
    query = query.order('data_disparo', { ascending: false });

    const { data: historico, error } = await query;

    if (error) {
      console.error('Erro na consulta do histórico:', error);
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    if (!historico || historico.length === 0) {
      console.log('📊 Nenhum registro encontrado no histórico');
      return [];
    }

    console.log(`📊 Histórico encontrado: ${historico.length} registros`);

    // 2. Buscar empresas relacionadas
    const empresaIds = [...new Set(historico.map(h => h.empresa_id).filter((id): id is string => Boolean(id)))];
    let empresas: any[] = [];

    if (empresaIds.length > 0) {
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .in('id', empresaIds);

      if (empresasError) {
        console.error('Erro ao buscar empresas:', empresasError);
      } else {
        empresas = empresasData || [];
      }
    }

    // 3. Buscar clientes relacionados
    const clienteIds = [...new Set(historico.map(h => h.cliente_id).filter((id): id is string => Boolean(id)))];
    let clientes: any[] = [];

    if (clienteIds.length > 0) {
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .in('id', clienteIds);

      if (clientesError) {
        console.error('Erro ao buscar clientes:', clientesError);
      } else {
        clientes = clientesData || [];
      }
    }

    // 4. Combinar dados
    const historicoCompleto = historico.map(item => {
      const empresa = empresas.find(e => e.id === item.empresa_id);
      const cliente = clientes.find(c => c.id === item.cliente_id);

      return {
        ...item,
        empresas_clientes: empresa || null,
        clientes: cliente || null
      };
    });

    // 5. Aplicar filtros de status se necessário
    let historicoFiltrado = historicoCompleto;

    if (!filtros.incluirInativos) {
      historicoFiltrado = historicoCompleto.filter(item => {
        const empresaAtiva = !item.empresas_clientes || item.empresas_clientes.status === 'ativo';
        const clienteAtivo = !item.clientes || item.clientes.status === 'ativo';

        return empresaAtiva && clienteAtivo;
      });
    }

    console.log(`✅ Histórico final: ${historicoFiltrado.length} registros após filtros`);
    return historicoFiltrado;

  } catch (error) {
    console.error('Erro na consulta alternativa do histórico:', error);
    throw new Error(`Erro ao buscar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// Exportar a função para uso em outros arquivos
export { buscarHistoricoDetalhadoAlternativo };