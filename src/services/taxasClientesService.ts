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
  TipoFuncao,
  TipoProduto
} from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto, calcularValoresLocaisAutomaticos } from '@/types/taxasClientes';

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
        nome_abreviado,
        produtos:empresa_produtos(produto)
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
      
      // Separar valores por tipo
      const valoresRemota = valores.filter(v => v.tipo_hora === 'remota');
      const valoresLocal = valores.filter(v => v.tipo_hora === 'local');
      
      // Preparar arrays para cálculo da média
      const todasFuncoesRemota = valoresRemota.map(v => ({
        funcao: v.funcao,
        valor_base: v.valor_base
      }));
      
      const todasFuncoesLocal = valoresLocal.map(v => ({
        funcao: v.funcao,
        valor_base: v.valor_base
      }));
      
      // Calcular valores completos
      const valoresRemotaCalculados = valoresRemota.map(v => 
        calcularValores(v.valor_base, v.funcao, todasFuncoesRemota, taxa.tipo_calculo_adicional, taxa.tipo_produto, false)
      );
      
      const valoresLocalCalculados = valoresLocal.map(v => 
        calcularValores(v.valor_base, v.funcao, todasFuncoesLocal, taxa.tipo_calculo_adicional, taxa.tipo_produto, true)
      );
      
      return {
        ...taxa,
        valores_remota: valoresRemotaCalculados,
        valores_local: valoresLocalCalculados
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
        nome_abreviado,
        produtos:empresa_produtos(produto)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar taxa:', error);
    return null;
  }

  const valores = await buscarValoresTaxa(data.id);
  
  // Separar valores por tipo
  const valoresRemota = valores.filter(v => v.tipo_hora === 'remota');
  const valoresLocal = valores.filter(v => v.tipo_hora === 'local');
  
  // Preparar arrays para cálculo da média
  const todasFuncoesRemota = valoresRemota.map(v => ({
    funcao: v.funcao,
    valor_base: v.valor_base
  }));
  
  const todasFuncoesLocal = valoresLocal.map(v => ({
    funcao: v.funcao,
    valor_base: v.valor_base
  }));
  
  // Calcular valores completos
  const valoresRemotaCalculados = valoresRemota.map(v => 
    calcularValores(v.valor_base, v.funcao, todasFuncoesRemota, data.tipo_calculo_adicional, data.tipo_produto, false)
  );
  
  const valoresLocalCalculados = valoresLocal.map(v => 
    calcularValores(v.valor_base, v.funcao, todasFuncoesLocal, data.tipo_calculo_adicional, data.tipo_produto, true)
  );
  
  return {
    ...data,
    valores_remota: valoresRemotaCalculados,
    valores_local: valoresLocalCalculados
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
 * Verificar se já existe taxa para o cliente na mesma vigência e mesmo tipo de produto
 */
export async function verificarVigenciaConflitante(
  clienteId: string,
  vigenciaInicio: string,
  vigenciaFim: string | undefined,
  tipoProduto: TipoProduto,
  taxaIdExcluir?: string
): Promise<boolean> {
  let query = supabase
    .from('taxas_clientes')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('tipo_produto', tipoProduto); // Adicionar filtro por tipo de produto

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
    vigenciaFim,
    dados.tipo_produto
  );

  if (temConflito) {
    throw new Error(`Já existe uma taxa cadastrada para este cliente e produto (${dados.tipo_produto}) neste período de vigência`);
  }

  // Criar taxa
  const { data: taxa, error: taxaError } = await supabase
    .from('taxas_clientes')
    .insert({
      cliente_id: dados.cliente_id,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      tipo_produto: dados.tipo_produto,
      tipo_calculo_adicional: dados.tipo_calculo_adicional || 'media',
      personalizado: dados.personalizado || false,
      criado_por: user?.id
    })
    .select()
    .single();

  if (taxaError) {
    console.error('Erro ao criar taxa:', taxaError);
    throw new Error('Erro ao criar taxa de cliente');
  }

  // NOVO: Calcular automaticamente valores locais se não fornecidos (10% a mais dos remotos)
  let valoresLocaisFinais = dados.valores_local;
  if (!dados.personalizado) {
    // Se não for personalizado, calcular automaticamente valores locais
    valoresLocaisFinais = calcularValoresLocaisAutomaticos(dados.valores_remota);
    console.log('🔄 Valores locais calculados automaticamente no serviço:', valoresLocaisFinais);
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
      valorLocal = valoresLocaisFinais.funcional;
    } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
      valorRemota = dados.valores_remota.tecnico;
      valorLocal = valoresLocaisFinais.tecnico;
    } else if (funcao === 'ABAP - PL/SQL') {
      valorRemota = (dados.valores_remota as any).abap || 0;
      valorLocal = (valoresLocaisFinais as any).abap || 0;
    } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
      valorRemota = dados.valores_remota.dba;
      valorLocal = valoresLocaisFinais.dba;
    } else if (funcao === 'Gestor') {
      valorRemota = dados.valores_remota.gestor;
      valorLocal = valoresLocaisFinais.gestor;
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

  // Se houver taxa de reajuste, criar segunda taxa automaticamente
  if (dados.taxa_reajuste && dados.taxa_reajuste > 0) {
    // Calcular nova vigência (início = fim da primeira + 1 dia, fim = início + 1 ano)
    const dataFimPrimeira = vigenciaFim ? new Date(vigenciaFim) : new Date(vigenciaInicio);
    if (!vigenciaFim) {
      dataFimPrimeira.setFullYear(dataFimPrimeira.getFullYear() + 1);
    }
    
    const novaVigenciaInicio = new Date(dataFimPrimeira);
    novaVigenciaInicio.setDate(novaVigenciaInicio.getDate() + 1);
    
    const novaVigenciaFim = new Date(novaVigenciaInicio);
    novaVigenciaFim.setFullYear(novaVigenciaFim.getFullYear() + 1);

    // Calcular valores reajustados
    const percentualReajuste = dados.taxa_reajuste / 100;
    const valoresReajustadosRemota = {
      funcional: dados.valores_remota.funcional + (dados.valores_remota.funcional * percentualReajuste),
      tecnico: dados.valores_remota.tecnico + (dados.valores_remota.tecnico * percentualReajuste),
      abap: ((dados.valores_remota as any).abap || 0) + (((dados.valores_remota as any).abap || 0) * percentualReajuste),
      dba: dados.valores_remota.dba + (dados.valores_remota.dba * percentualReajuste),
      gestor: dados.valores_remota.gestor + (dados.valores_remota.gestor * percentualReajuste)
    };

    // ATUALIZADO: Calcular valores locais automaticamente (10% a mais dos remotos reajustados)
    const valoresReajustadosLocal = calcularValoresLocaisAutomaticos(valoresReajustadosRemota);

    // Criar segunda taxa com valores reajustados
    const { data: taxaReajustada, error: taxaReajustadaError } = await supabase
      .from('taxas_clientes')
      .insert({
        cliente_id: dados.cliente_id,
        vigencia_inicio: novaVigenciaInicio.toISOString().split('T')[0],
        vigencia_fim: novaVigenciaFim.toISOString().split('T')[0],
        tipo_produto: dados.tipo_produto,
        tipo_calculo_adicional: dados.tipo_calculo_adicional || 'media',
        criado_por: user?.id
      })
      .select()
      .single();

    if (taxaReajustadaError) {
      console.error('Erro ao criar taxa reajustada:', taxaReajustadaError);
      // Não reverter a primeira taxa, apenas logar o erro
    } else {
      // Criar valores para a taxa reajustada
      const valoresReajustadosParaInserir: any[] = [];

      funcoes.forEach(funcao => {
        let valorRemota = 0;
        let valorLocal = 0;
        
        if (funcao === 'Funcional') {
          valorRemota = valoresReajustadosRemota.funcional;
          valorLocal = valoresReajustadosLocal.funcional;
        } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
          valorRemota = valoresReajustadosRemota.tecnico;
          valorLocal = valoresReajustadosLocal.tecnico;
        } else if (funcao === 'ABAP - PL/SQL') {
          valorRemota = valoresReajustadosRemota.abap;
          valorLocal = valoresReajustadosLocal.abap;
        } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
          valorRemota = valoresReajustadosRemota.dba;
          valorLocal = valoresReajustadosLocal.dba;
        } else if (funcao === 'Gestor') {
          valorRemota = valoresReajustadosRemota.gestor;
          valorLocal = valoresReajustadosLocal.gestor;
        }

        valoresReajustadosParaInserir.push({
          taxa_id: taxaReajustada.id,
          funcao,
          tipo_hora: 'remota',
          valor_base: valorRemota
        });

        valoresReajustadosParaInserir.push({
          taxa_id: taxaReajustada.id,
          funcao,
          tipo_hora: 'local',
          valor_base: valorLocal
        });
      });

      await supabase
        .from('valores_taxas_funcoes')
        .insert(valoresReajustadosParaInserir);
    }
  }

  return taxa as TaxaCliente;
}

/**
 * Atualizar taxa
 * Se houver taxa_reajuste, cria uma nova taxa ao invés de atualizar
 */
export async function atualizarTaxa(
  id: string,
  dados: Partial<TaxaFormData>
): Promise<TaxaCliente> {
  const { data: { user } } = await supabase.auth.getUser();
  
  // Buscar taxa atual
  const { data: taxaAtual, error: taxaError } = await supabase
    .from('taxas_clientes')
    .select('*')
    .eq('id', id)
    .single();

  if (taxaError || !taxaAtual) {
    throw new Error('Taxa não encontrada');
  }

  // Se houver taxa de reajuste, criar nova taxa ao invés de atualizar
  if (dados.taxa_reajuste && dados.taxa_reajuste > 0) {
    // Criar nova taxa com os dados reajustados
    const vigenciaInicio = typeof dados.vigencia_inicio === 'string' 
      ? dados.vigencia_inicio 
      : dados.vigencia_inicio?.toISOString().split('T')[0];
    
    const vigenciaFim = dados.vigencia_fim 
      ? (typeof dados.vigencia_fim === 'string' 
          ? dados.vigencia_fim 
          : dados.vigencia_fim.toISOString().split('T')[0])
      : undefined;

    if (!vigenciaInicio) {
      throw new Error('Vigência início é obrigatória');
    }

    // Criar nova taxa
    const { data: novaTaxa, error: novaTaxaError } = await supabase
      .from('taxas_clientes')
      .insert({
        cliente_id: taxaAtual.cliente_id,
        vigencia_inicio: vigenciaInicio,
        vigencia_fim: vigenciaFim,
        tipo_produto: dados.tipo_produto || taxaAtual.tipo_produto,
        tipo_calculo_adicional: dados.tipo_calculo_adicional || taxaAtual.tipo_calculo_adicional,
        personalizado: dados.personalizado !== undefined ? dados.personalizado : taxaAtual.personalizado,
        criado_por: user?.id
      })
      .select()
      .single();

    if (novaTaxaError) {
      console.error('Erro ao criar nova taxa:', novaTaxaError);
      throw new Error('Erro ao criar nova taxa com reajuste');
    }

    // NOVO: Calcular automaticamente valores locais se não fornecidos (10% a mais dos remotos)
    let valoresLocaisFinais = dados.valores_local;
    if (!dados.personalizado && dados.valores_remota) {
      valoresLocaisFinais = calcularValoresLocaisAutomaticos(dados.valores_remota);
      console.log('🔄 Valores locais calculados automaticamente na atualização:', valoresLocaisFinais);
    }

    // Criar valores para a nova taxa
    const funcoes = getFuncoesPorProduto(dados.tipo_produto || taxaAtual.tipo_produto);
    const valoresParaInserir: any[] = [];

    funcoes.forEach(funcao => {
      let valorRemota = 0;
      let valorLocal = 0;
      
      if (funcao === 'Funcional') {
        valorRemota = dados.valores_remota?.funcional || 0;
        valorLocal = valoresLocaisFinais?.funcional || 0;
      } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
        valorRemota = dados.valores_remota?.tecnico || 0;
        valorLocal = valoresLocaisFinais?.tecnico || 0;
      } else if (funcao === 'ABAP - PL/SQL') {
        valorRemota = (dados.valores_remota as any)?.abap || 0;
        valorLocal = (valoresLocaisFinais as any)?.abap || 0;
      } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
        valorRemota = dados.valores_remota?.dba || 0;
        valorLocal = valoresLocaisFinais?.dba || 0;
      } else if (funcao === 'Gestor') {
        valorRemota = dados.valores_remota?.gestor || 0;
        valorLocal = valoresLocaisFinais?.gestor || 0;
      }

      valoresParaInserir.push({
        taxa_id: novaTaxa.id,
        funcao,
        tipo_hora: 'remota',
        valor_base: valorRemota
      });

      valoresParaInserir.push({
        taxa_id: novaTaxa.id,
        funcao,
        tipo_hora: 'local',
        valor_base: valorLocal
      });
    });

    const { error: valoresError } = await supabase
      .from('valores_taxas_funcoes')
      .insert(valoresParaInserir);

    if (valoresError) {
      console.error('Erro ao criar valores da nova taxa:', valoresError);
      // Reverter criação da nova taxa
      await supabase.from('taxas_clientes').delete().eq('id', novaTaxa.id);
      throw new Error('Erro ao criar valores da nova taxa');
    }

    // Retornar a nova taxa criada
    return novaTaxa as TaxaCliente;
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

    const tipoProduto = dados.tipo_produto || taxaAtual.tipo_produto;
    
    const temConflito = await verificarVigenciaConflitante(
      taxaAtual.cliente_id,
      vigenciaInicio,
      vigenciaFim,
      tipoProduto,
      id
    );

    if (temConflito) {
      throw new Error(`Já existe uma taxa cadastrada para este cliente e produto (${tipoProduto}) neste período de vigência`);
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

  if (dados.tipo_calculo_adicional) {
    dadosAtualizacao.tipo_calculo_adicional = dados.tipo_calculo_adicional;
  }

  if (dados.personalizado !== undefined) {
    dadosAtualizacao.personalizado = dados.personalizado;
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
    // NOVO: Calcular automaticamente valores locais se não fornecidos (10% a mais dos remotos)
    let valoresLocaisFinais = dados.valores_local;
    if (!dados.personalizado && dados.valores_remota) {
      valoresLocaisFinais = calcularValoresLocaisAutomaticos(dados.valores_remota);
      console.log('🔄 Valores locais calculados automaticamente na atualização normal:', valoresLocaisFinais);
    }

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
        valorLocal = valoresLocaisFinais?.funcional || 0;
      } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
        valorRemota = dados.valores_remota?.tecnico || 0;
        valorLocal = valoresLocaisFinais?.tecnico || 0;
      } else if (funcao === 'ABAP - PL/SQL') {
        valorRemota = (dados.valores_remota as any)?.abap || 0;
        valorLocal = (valoresLocaisFinais as any)?.abap || 0;
      } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
        valorRemota = dados.valores_remota?.dba || 0;
        valorLocal = valoresLocaisFinais?.dba || 0;
      } else if (funcao === 'Gestor') {
        valorRemota = dados.valores_remota?.gestor || 0;
        valorLocal = valoresLocaisFinais?.gestor || 0;
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
  
  // Calcular valores para remota e local
  const valoresRemota = valores.filter(v => v.tipo_hora === 'remota');
  const valoresLocal = valores.filter(v => v.tipo_hora === 'local');
  
  // Preparar array com todas as funções para cálculo da média
  const todasFuncoesRemota = valoresRemota.map(v => ({
    funcao: v.funcao,
    valor_base: v.valor_base
  }));
  
  const todasFuncoesLocal = valoresLocal.map(v => ({
    funcao: v.funcao,
    valor_base: v.valor_base
  }));
  
  // Calcular valores completos para remota
  const valoresRemotaCalculados = valoresRemota.map(v => 
    calcularValores(v.valor_base, v.funcao, todasFuncoesRemota, data.tipo_calculo_adicional, data.tipo_produto, false)
  );
  
  // Calcular valores completos para local (com parâmetro isLocal = true)
  const valoresLocalCalculados = valoresLocal.map(v => 
    calcularValores(v.valor_base, v.funcao, todasFuncoesLocal, data.tipo_calculo_adicional, data.tipo_produto, true)
  );
  
  return {
    ...data,
    valores_remota: valoresRemotaCalculados,
    valores_local: valoresLocalCalculados
  } as TaxaClienteCompleta;
}
