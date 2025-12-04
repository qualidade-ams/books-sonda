// =====================================================
// SERVIÇO: TAXAS DE CLIENTES
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  TaxaCliente,
  TaxaClienteCompleta,
  ValorTaxaFuncao,
  TaxaFormData,
  FiltrosTaxa,
  ValorTaxaCalculado,
  TipoFuncao
} from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto } from '@/types/taxasClientes';

/**
 * Buscar todas as taxas com filtros
 */
export async function buscarTaxas(filtros?: FiltrosTaxa): Promise<TaxaClienteCompleta[]> {
  let query = supabase
    .from('taxas_clientes')
    .select(`
      *,
      cliente:empresas_clientes(
        id,
        nome_completo,
        nome_abreviado
      )
    `)
    .order('vigencia_inicio', { ascending: false });

  // Aplicar filtros
  if (filtros?.cliente_id) {
    query = query.eq('cliente_id', filtros.cliente_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar taxas:', error);
    throw new Error('Erro ao buscar taxas de clientes');
  }

  // Buscar valores para cada taxa
  const taxasCompletas = await Promise.all(
    (data || []).map(async (taxa) => {
      const valores = await buscarValoresTaxa(taxa.id);
      return {
        ...taxa,
        valores_remota: valores.filter(v => v.tipo_hora === 'remota'),
        valores_local: valores.filter(v => v.tipo_hora === 'local')
      } as TaxaClienteCompleta;
    })
  );

  // Filtrar por vigência se solicitado
  if (filtros?.vigente) {
    const dataReferencia = filtros.data_referencia || new Date().toISOString().split('T')[0];
    return taxasCompletas.filter(taxa => {
      const inicioValido = taxa.vigencia_inicio <= dataReferencia;
      const fimValido = !taxa.vigencia_fim || taxa.vigencia_fim >= dataReferencia;
      return inicioValido && fimValido;
    });
  }

  return taxasCompletas;
}

/**
 * Buscar taxa por ID
 */
export async function buscarTaxaPorId(id: string): Promise<TaxaClienteCompleta | null> {
  const { data, error } = await supabase
    .from('taxas_clientes')
    .select(`
      *,
      cliente:empresas_clientes(
        id,
        nome_completo,
        nome_abreviado
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar taxa:', error);
    return null;
  }

  const valores = await buscarValoresTaxa(data.id);
  
  return {
    ...data,
    valores_remota: valores.filter(v => v.tipo_hora === 'remota'),
    valores_local: valores.filter(v => v.tipo_hora === 'local')
  } as TaxaClienteCompleta;
}

/**
 * Buscar valores de uma taxa específica
 */
async function buscarValoresTaxa(taxaId: string): Promise<ValorTaxaFuncao[]> {
  const { data, error } = await supabase
    .from('valores_taxas_funcoes')
    .select('*')
    .eq('taxa_id', taxaId);

  if (error) {
    console.error('Erro ao buscar valores da taxa:', error);
    return [];
  }

  return data || [];
}

/**
 * Verificar se já existe taxa para o cliente na mesma vigência
 */
export async function verificarVigenciaConflitante(
  clienteId: string,
  vigenciaInicio: string,
  vigenciaFim: string | undefined,
  taxaIdExcluir?: string
): Promise<boolean> {
  let query = supabase
    .from('taxas_clientes')
    .select('id')
    .eq('cliente_id', clienteId);

  if (taxaIdExcluir) {
    query = query.neq('id', taxaIdExcluir);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao verificar vigência:', error);
    return false;
  }

  if (!data || data.length === 0) {
    return false;
  }

  // Verificar conflito de datas
  for (const taxa of data) {
    const { data: taxaCompleta } = await supabase
      .from('taxas_clientes')
      .select('vigencia_inicio, vigencia_fim')
      .eq('id', taxa.id)
      .single();

    if (!taxaCompleta) continue;

    const inicioExistente = taxaCompleta.vigencia_inicio;
    const fimExistente = taxaCompleta.vigencia_fim;

    // Verificar sobreposição de períodos
    const inicioNovo = vigenciaInicio;
    const fimNovo = vigenciaFim;

    // Caso 1: Nova taxa sem fim (vigência indefinida)
    if (!fimNovo) {
      // Conflita se a taxa existente não tem fim OU se o fim da existente é >= início da nova
      if (!fimExistente || fimExistente >= inicioNovo) {
        return true;
      }
    }
    // Caso 2: Nova taxa com fim definido
    else {
      // Conflita se houver qualquer sobreposição
      if (!fimExistente) {
        // Taxa existente sem fim: conflita se início da existente <= fim da nova
        if (inicioExistente <= fimNovo) {
          return true;
        }
      } else {
        // Ambas com fim: verificar sobreposição
        if (inicioNovo <= fimExistente && fimNovo >= inicioExistente) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Criar nova taxa
 */
export async function criarTaxa(dados: TaxaFormData): Promise<TaxaCliente> {
  const { data: { user } } = await supabase.auth.getUser();

  // Verificar conflito de vigência
  const vigenciaInicio = typeof dados.vigencia_inicio === 'string' 
    ? dados.vigencia_inicio 
    : dados.vigencia_inicio.toISOString().split('T')[0];
  
  const vigenciaFim = dados.vigencia_fim 
    ? (typeof dados.vigencia_fim === 'string' 
        ? dados.vigencia_fim 
        : dados.vigencia_fim.toISOString().split('T')[0])
    : undefined;

  const temConflito = await verificarVigenciaConflitante(
    dados.cliente_id,
    vigenciaInicio,
    vigenciaFim
  );

  if (temConflito) {
    throw new Error('Já existe uma taxa cadastrada para este cliente neste período de vigência');
  }

  // Criar taxa
  const { data: taxa, error: taxaError } = await supabase
    .from('taxas_clientes')
    .insert({
      cliente_id: dados.cliente_id,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      tipo_produto: dados.tipo_produto,
      criado_por: user?.id
    })
    .select()
    .single();

  if (taxaError) {
    console.error('Erro ao criar taxa:', taxaError);
    throw new Error('Erro ao criar taxa de cliente');
  }

  // Criar valores para cada função
  const funcoes = getFuncoesPorProduto(dados.tipo_produto);
  const valoresParaInserir: any[] = [];

  funcoes.forEach(funcao => {
    // Simplificar mapeamento
    let valorRemota = 0;
    let valorLocal = 0;
    
    if (funcao === 'Funcional') {
      valorRemota = dados.valores_remota.funcional;
      valorLocal = dados.valores_local.funcional;
    } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
      valorRemota = dados.valores_remota.tecnico;
      valorLocal = dados.valores_local.tecnico;
    } else if (funcao === 'ABAP - PL/SQL') {
      valorRemota = (dados.valores_remota as any).abap || 0;
      valorLocal = (dados.valores_local as any).abap || 0;
    } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
      valorRemota = dados.valores_remota.dba;
      valorLocal = dados.valores_local.dba;
    } else if (funcao === 'Gestor') {
      valorRemota = dados.valores_remota.gestor;
      valorLocal = dados.valores_local.gestor;
    }

    // Valor remota
    valoresParaInserir.push({
      taxa_id: taxa.id,
      funcao,
      tipo_hora: 'remota',
      valor_base: valorRemota
    });

    // Valor local
    valoresParaInserir.push({
      taxa_id: taxa.id,
      funcao,
      tipo_hora: 'local',
      valor_base: valorLocal
    });
  });

  const { error: valoresError } = await supabase
    .from('valores_taxas_funcoes')
    .insert(valoresParaInserir);

  if (valoresError) {
    console.error('Erro ao criar valores da taxa:', valoresError);
    // Reverter criação da taxa
    await supabase.from('taxas_clientes').delete().eq('id', taxa.id);
    throw new Error('Erro ao criar valores da taxa');
  }

  return taxa as TaxaCliente;
}

/**
 * Atualizar taxa
 */
export async function atualizarTaxa(
  id: string,
  dados: Partial<TaxaFormData>
): Promise<TaxaCliente> {
  // Buscar taxa atual
  const { data: taxaAtual, error: taxaError } = await supabase
    .from('taxas_clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (taxaError || !taxaAtual) {
    throw new Error('Taxa não encontrada');
  }

  // Verificar conflito de vigência se as datas foram alteradas
  if (dados.vigencia_inicio || dados.vigencia_fim !== undefined) {
    const vigenciaInicio = dados.vigencia_inicio 
      ? (typeof dados.vigencia_inicio === 'string' 
          ? dados.vigencia_inicio 
          : dados.vigencia_inicio.toISOString().split('T')[0])
      : taxaAtual.vigencia_inicio;
    
    const vigenciaFim = dados.vigencia_fim !== undefined
      ? (dados.vigencia_fim 
          ? (typeof dados.vigencia_fim === 'string' 
              ? dados.vigencia_fim 
              : dados.vigencia_fim.toISOString().split('T')[0])
          : undefined)
      : taxaAtual.vigencia_fim;

    const temConflito = await verificarVigenciaConflitante(
      taxaAtual.cliente_id,
      vigenciaInicio,
      vigenciaFim,
      id
    );

    if (temConflito) {
      throw new Error('Já existe uma taxa cadastrada para este cliente neste período de vigência');
    }
  }

  // Atualizar taxa
  const dadosAtualizacao: any = {};
  
  if (dados.vigencia_inicio) {
    dadosAtualizacao.vigencia_inicio = typeof dados.vigencia_inicio === 'string'
      ? dados.vigencia_inicio
      : dados.vigencia_inicio.toISOString().split('T')[0];
  }
  
  if (dados.vigencia_fim !== undefined) {
    dadosAtualizacao.vigencia_fim = dados.vigencia_fim
      ? (typeof dados.vigencia_fim === 'string'
          ? dados.vigencia_fim
          : dados.vigencia_fim.toISOString().split('T')[0])
      : null;
  }

  if (dados.tipo_produto) {
    dadosAtualizacao.tipo_produto = dados.tipo_produto;
  }

  const { data: taxaAtualizada, error: updateError } = await supabase
    .from('taxas_clientes')
    .update(dadosAtualizacao)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('Erro ao atualizar taxa:', updateError);
    throw new Error('Erro ao atualizar taxa');
  }

  // Atualizar valores se fornecidos
  if (dados.valores_remota || dados.valores_local) {
    // Deletar valores antigos
    await supabase
      .from('valores_taxas_funcoes')
      .delete()
      .eq('taxa_id', id);

    // Inserir novos valores
    const funcoes = getFuncoesPorProduto(taxaAtualizada.tipo_produto);
    const valoresParaInserir: any[] = [];

    funcoes.forEach(funcao => {
      let valorRemota = 0;
      let valorLocal = 0;
      
      if (funcao === 'Funcional') {
        valorRemota = dados.valores_remota?.funcional || 0;
        valorLocal = dados.valores_local?.funcional || 0;
      } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
        valorRemota = dados.valores_remota?.tecnico || 0;
        valorLocal = dados.valores_local?.tecnico || 0;
      } else if (funcao === 'ABAP - PL/SQL') {
        valorRemota = (dados.valores_remota as any)?.abap || 0;
        valorLocal = (dados.valores_local as any)?.abap || 0;
      } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
        valorRemota = dados.valores_remota?.dba || 0;
        valorLocal = dados.valores_local?.dba || 0;
      } else if (funcao === 'Gestor') {
        valorRemota = dados.valores_remota?.gestor || 0;
        valorLocal = dados.valores_local?.gestor || 0;
      }

      valoresParaInserir.push({
        taxa_id: id,
        funcao,
        tipo_hora: 'remota',
        valor_base: valorRemota
      });

      valoresParaInserir.push({
        taxa_id: id,
        funcao,
        tipo_hora: 'local',
        valor_base: valorLocal
      });
    });

    await supabase
      .from('valores_taxas_funcoes')
      .insert(valoresParaInserir);
  }

  return taxaAtualizada as TaxaCliente;
}

/**
 * Deletar taxa
 */
export async function deletarTaxa(id: string): Promise<void> {
  // Deletar valores primeiro (cascade deve fazer isso automaticamente, mas garantimos)
  await supabase
    .from('valores_taxas_funcoes')
    .delete()
    .eq('taxa_id', id);

  // Deletar taxa
  const { error } = await supabase
    .from('taxas_clientes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar taxa:', error);
    throw new Error('Erro ao deletar taxa');
  }
}

/**
 * Calcular valores de uma taxa com todas as regras de negócio
 */
export function calcularValoresTaxa(valores: ValorTaxaFuncao[]): ValorTaxaCalculado[] {
  const valoresCalculados: ValorTaxaCalculado[] = [];
  
  // Preparar array com todas as funções e valores base para cálculo da média
  const todasFuncoes = valores.map(v => ({
    funcao: v.funcao,
    valor_base: v.valor_base
  }));

  valores.forEach(valor => {
    const calculado = calcularValores(valor.valor_base, valor.funcao, todasFuncoes);
    valoresCalculados.push(calculado);
  });

  return valoresCalculados;
}

/**
 * Buscar taxa vigente de um cliente para uma data específica
 */
export async function buscarTaxaVigente(
  clienteId: string,
  dataReferencia?: string
): Promise<TaxaClienteCompleta | null> {
  const dataRef = dataReferencia || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('taxas_clientes')
    .select(`
      *,
      cliente:empresas_clientes(
        id,
        nome_completo,
        nome_abreviado
      )
    `)
    .eq('cliente_id', clienteId)
    .lte('vigencia_inicio', dataRef)
    .or(`vigencia_fim.is.null,vigencia_fim.gte.${dataRef}`)
    .order('vigencia_inicio', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  const valores = await buscarValoresTaxa(data.id);
  
  return {
    ...data,
    valores_remota: valores.filter(v => v.tipo_hora === 'remota'),
    valores_local: valores.filter(v => v.tipo_hora === 'local')
  } as TaxaClienteCompleta;
}
