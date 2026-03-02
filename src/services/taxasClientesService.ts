// =====================================================
// SERVIÇO: TAXAS DE CLIENTES
// =====================================================
// @ts-nocheck - Suprimindo erros de tipo temporários do Supabase

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
    .from('taxas_clientes' as any)
    .select(`
      *,
      cliente:empresas_clientes(
        id,
        nome_completo,
        nome_abreviado,
        tem_ams,
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

  console.log(`🔍 [DEBUG] Taxas encontradas na tabela taxas_clientes:`, data?.length || 0);
  data?.forEach((taxa, index) => {
    console.log(`📋 [DEBUG] Taxa ${index + 1}:`, {
      id: taxa.id,
      cliente_id: taxa.cliente_id,
      personalizado: taxa.personalizado,
      tipo_produto: taxa.tipo_produto,
      vigencia_inicio: taxa.vigencia_inicio,
      vigencia_fim: taxa.vigencia_fim
    });
  });

  // Buscar valores para cada taxa
  const taxasCompletas = await Promise.all(
    (data || []).map(async (taxa: any) => {
      // Verificar se a taxa tem ID válido
      if (!taxa?.id) {
        console.error('Taxa sem ID encontrada:', taxa);
        return null;
      }

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
      
      // Aplicar lógica de personalização
      let valoresRemotaCalculados: ValorTaxaCalculado[];
      let valoresLocalCalculados: ValorTaxaCalculado[];
      
      if (taxa.personalizado) {
        // Para taxas personalizadas, usar valores EXATOS da tabela
        console.log(`🔍 [DEBUG] Taxa personalizada encontrada - ID: ${taxa.id}`);
        console.log(`🔍 [DEBUG] Valores remotos da tabela valores_taxas_funcoes:`, valoresRemota);
        console.log(`🔍 [DEBUG] Valores locais da tabela valores_taxas_funcoes:`, valoresLocal);
        
        valoresRemotaCalculados = valoresRemota.map(v => {
          const valorExato = {
            funcao: v.funcao,
            valor_base: v.valor_base ?? 0,
            valor_17h30_19h30: v.valor_17h30_19h30 ?? 0,
            valor_apos_19h30: v.valor_apos_19h30 ?? 0,
            valor_fim_semana: v.valor_fim_semana ?? 0,
            valor_adicional: v.valor_adicional ?? 0,
            valor_standby: v.valor_standby ?? 0
          } as ValorTaxaCalculado;
          
          console.log(`🔍 [DEBUG] Valor remoto EXATO para ${v.funcao}:`, valorExato);
          return valorExato;
        });
        
        valoresLocalCalculados = valoresLocal.map(v => {
          const valorExato = {
            funcao: v.funcao,
            valor_base: v.valor_base ?? 0,
            valor_17h30_19h30: v.valor_17h30_19h30 ?? 0,
            valor_apos_19h30: v.valor_apos_19h30 ?? 0,
            valor_fim_semana: v.valor_fim_semana ?? 0,
            valor_adicional: v.valor_adicional ?? null,
            valor_standby: v.valor_standby ?? null
          } as ValorTaxaCalculado;
          
          console.log(`🔍 [DEBUG] Valor local EXATO para ${v.funcao}:`, valorExato);
          return valorExato;
        });
      } else {
        // Para taxas não-personalizadas, calcular automaticamente
        valoresRemotaCalculados = valoresRemota.map(v => 
          calcularValores(v.valor_base, v.funcao, todasFuncoesRemota, taxa.tipo_calculo_adicional, taxa.tipo_produto, false)
        );
        
        valoresLocalCalculados = valoresLocal.map(v => 
          calcularValores(v.valor_base, v.funcao, todasFuncoesLocal, taxa.tipo_calculo_adicional, taxa.tipo_produto, true)
        );
      }
      
      return {
        ...taxa,
        valores_remota: valoresRemotaCalculados,
        valores_local: valoresLocalCalculados
      } as TaxaClienteCompleta;
    })
  );

  // Filtrar taxas nulas (que falharam na verificação)
  const taxasValidas = taxasCompletas.filter(taxa => taxa !== null) as TaxaClienteCompleta[];

  // Filtrar por vigência se solicitado
  if (filtros?.vigente) {
    const dataReferencia = filtros.data_referencia || new Date().toISOString().split('T')[0];
    return taxasValidas.filter(taxa => {
      const inicioValido = taxa.vigencia_inicio <= dataReferencia;
      const fimValido = !taxa.vigencia_fim || taxa.vigencia_fim >= dataReferencia;
      return inicioValido && fimValido;
    });
  }

  return taxasValidas;
}

/**
 * Buscar taxa por ID
 */
/**
 * Buscar taxa por ID
 */
export async function buscarTaxaPorId(id: string): Promise<TaxaClienteCompleta | null> {
  try {
    const { data, error } = await supabase
      .from('taxas_clientes' as any)
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
      .limit(1);

    if (error) {
      console.error('Erro ao buscar taxa:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.error('Taxa não encontrada com ID:', id);
      return null;
    }

    // Cast para o tipo correto e verificar se tem ID
    const taxaData = data[0] as any;
    if (!taxaData?.id) {
      console.error('Taxa sem ID encontrada:', taxaData);
      return null;
    }

    const valores = await buscarValoresTaxa(taxaData.id);
    
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
    
    // CORREÇÃO CRÍTICA: Se a taxa for personalizada, SEMPRE usar valores salvos no banco
    let valoresRemotaCalculados: ValorTaxaCalculado[];
    let valoresLocalCalculados: ValorTaxaCalculado[];
    
    if (taxaData.personalizado) {
      // Para taxas personalizadas, SEMPRE usar valores EXATOS da tabela valores_taxas_funcoes
      valoresRemotaCalculados = valoresRemota.map(v => ({
        funcao: v.funcao,
        valor_base: v.valor_base ?? 0,
        valor_17h30_19h30: v.valor_17h30_19h30 ?? 0,
        valor_apos_19h30: v.valor_apos_19h30 ?? 0,
        valor_fim_semana: v.valor_fim_semana ?? 0,
        valor_adicional: v.valor_adicional ?? null,
        valor_standby: v.valor_standby ?? null
      } as ValorTaxaCalculado));
      
      valoresLocalCalculados = valoresLocal.map(v => ({
        funcao: v.funcao,
        valor_base: v.valor_base ?? 0,
        valor_17h30_19h30: v.valor_17h30_19h30 ?? 0,
        valor_apos_19h30: v.valor_apos_19h30 ?? 0,
        valor_fim_semana: v.valor_fim_semana ?? 0,
        valor_adicional: null, // Local não tem valor adicional
        valor_standby: null    // Local não tem valor standby
      } as ValorTaxaCalculado));
    } else {
      // Para taxas não-personalizadas, calcular automaticamente
      valoresRemotaCalculados = valoresRemota.map(v => 
        calcularValores(v.valor_base, v.funcao, todasFuncoesRemota, taxaData.tipo_calculo_adicional, taxaData.tipo_produto, false)
      );
      
      valoresLocalCalculados = valoresLocal.map(v => 
        calcularValores(v.valor_base, v.funcao, todasFuncoesLocal, taxaData.tipo_calculo_adicional, taxaData.tipo_produto, true)
      );
    }
    
    const resultado = {
      ...taxaData,
      valores_remota: valoresRemotaCalculados,
      valores_local: valoresLocalCalculados
    } as TaxaClienteCompleta;
    
    return resultado;
  } catch (error) {
    console.error('Erro inesperado ao buscar taxa:', error);
    return null;
  }
}

/**
 * Buscar valores de uma taxa específica
 */
async function buscarValoresTaxa(taxaId: string): Promise<ValorTaxaFuncao[]> {
  console.log(`🔍 [DEBUG] Buscando valores para taxa ID: ${taxaId}`);
  
  const { data, error } = await supabase
    .from('valores_taxas_funcoes' as any)
    .select('*')
    .eq('taxa_id', taxaId)
    .order('funcao, tipo_hora');

  if (error) {
    console.error('Erro ao buscar valores da taxa:', error);
    return [];
  }

  console.log(`🔍 [DEBUG] Valores encontrados na tabela valores_taxas_funcoes:`, data);
  console.log(`🔍 [DEBUG] Total de registros encontrados: ${data?.length || 0}`);
  
  // Log detalhado de cada valor
  data?.forEach((valor, index) => {
    console.log(`📋 [DEBUG] Registro ${index + 1}:`, {
      funcao: valor.funcao,
      tipo_hora: valor.tipo_hora,
      valor_base: valor.valor_base,
      valor_17h30_19h30: valor.valor_17h30_19h30,
      valor_apos_19h30: valor.valor_apos_19h30,
      valor_fim_semana: valor.valor_fim_semana,
      valor_adicional: valor.valor_adicional,
      valor_standby: valor.valor_standby
    });
  });

  return (data || []) as ValorTaxaFuncao[];
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
    .from('taxas_clientes' as any)
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
  for (const taxa of data as any[]) {
    if (!taxa?.id) continue;

    const { data: taxaCompleta } = await supabase
      .from('taxas_clientes' as any)
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
    : dados.vigencia_inicio?.toISOString().split('T')[0];
  
  if (!vigenciaInicio) {
    throw new Error('Vigência início é obrigatória');
  }
  
  const vigenciaFim = dados.vigencia_fim 
    ? (typeof dados.vigencia_fim === 'string' 
        ? dados.vigencia_fim 
        : dados.vigencia_fim?.toISOString().split('T')[0])
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

  // Preparar dados da taxa incluindo campos específicos por cliente
  const dadosTaxa: any = {
    cliente_id: dados.cliente_id,
    vigencia_inicio: vigenciaInicio,
    vigencia_fim: vigenciaFim,
    tipo_produto: dados.tipo_produto,
    tipo_calculo_adicional: dados.tipo_calculo_adicional || 'media',
    prazo_pagamento: dados.prazo_pagamento, // NOVO: Prazo de pagamento
    personalizado: dados.personalizado || false,
    criado_por: user?.id
  };

  console.log('💰 [CRIAR TAXA] Prazo de pagamento recebido:', dados.prazo_pagamento, typeof dados.prazo_pagamento);
  console.log('📦 [CRIAR TAXA] Dados da taxa preparados:', dadosTaxa);
  console.log('💰 [CRIAR TAXA] Prazo de pagamento no objeto:', dadosTaxa.prazo_pagamento, typeof dadosTaxa.prazo_pagamento);

  // Adicionar campos específicos por cliente se fornecidos
  if (dados.valor_ticket !== undefined) dadosTaxa.valor_ticket = dados.valor_ticket;
  if (dados.valor_ticket_excedente !== undefined) dadosTaxa.valor_ticket_excedente = dados.valor_ticket_excedente;
  if (dados.ticket_excedente_simples !== undefined) dadosTaxa.ticket_excedente_simples = dados.ticket_excedente_simples;
  if (dados.ticket_excedente_complexo !== undefined) dadosTaxa.ticket_excedente_complexo = dados.ticket_excedente_complexo;
  if (dados.ticket_excedente_1 !== undefined) dadosTaxa.ticket_excedente_1 = dados.ticket_excedente_1;
  if (dados.ticket_excedente_2 !== undefined) dadosTaxa.ticket_excedente_2 = dados.ticket_excedente_2;
  if (dados.ticket_excedente !== undefined) dadosTaxa.ticket_excedente = dados.ticket_excedente;

  // Criar taxa com timeout
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: Operação demorou mais que 30 segundos')), 30000);
  });

  const taxaPromise = supabase
    .from('taxas_clientes' as any)
    .insert(dadosTaxa)
    .select();

  let taxa;
  try {
    const result = await Promise.race([taxaPromise, timeoutPromise]) as any;
    if (result.error) {
      console.error('Erro ao criar taxa:', result.error);
      throw new Error(`Erro ao criar taxa: ${result.error.message || 'Erro desconhecido'}`);
    }
    
    if (!result.data || result.data.length === 0) {
      throw new Error('Erro ao criar taxa: nenhum registro retornado');
    }
    
    taxa = result.data[0];
  } catch (error: any) {
    console.error('Erro ao criar taxa:', error);
    if (error.message?.includes('Timeout')) {
      throw new Error('A operação está demorando muito. Tente novamente.');
    }
    throw new Error(`Erro ao criar taxa: ${error.message || 'Erro desconhecido'}`);
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

  // ✅ CORREÇÃO: Preparar array com todos os valores base para cálculo da média
  const todasFuncoesRemota = funcoes.map(f => {
    let valorBase = 0;
    if (f === 'Funcional') {
      valorBase = dados.valores_remota.funcional;
    } else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') {
      valorBase = dados.valores_remota.tecnico;
    } else if (f === 'ABAP - PL/SQL') {
      valorBase = (dados.valores_remota as any).abap || 0;
    } else if (f === 'DBA / Basis' || f === 'DBA') {
      valorBase = dados.valores_remota.dba;
    } else if (f === 'Gestor') {
      valorBase = dados.valores_remota.gestor;
    }
    return { funcao: f, valor_base: valorBase };
  });

  const todasFuncoesLocal = funcoes.map(f => {
    let valorBase = 0;
    if (f === 'Funcional') {
      valorBase = valoresLocaisFinais.funcional;
    } else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') {
      valorBase = valoresLocaisFinais.tecnico;
    } else if (f === 'ABAP - PL/SQL') {
      valorBase = (valoresLocaisFinais as any).abap || 0;
    } else if (f === 'DBA / Basis' || f === 'DBA') {
      valorBase = valoresLocaisFinais.dba;
    } else if (f === 'Gestor') {
      valorBase = valoresLocaisFinais.gestor;
    }
    return { funcao: f, valor_base: valorBase };
  });

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

    // ✅ CORREÇÃO: Calcular valores usando a função calcularValores
    const valoresCalculadosRemota = calcularValores(
      valorRemota,
      funcao,
      todasFuncoesRemota,
      dados.tipo_calculo_adicional || 'media',
      dados.tipo_produto,
      false
    );

    const valoresCalculadosLocal = calcularValores(
      valorLocal,
      funcao,
      todasFuncoesLocal,
      dados.tipo_calculo_adicional || 'media',
      dados.tipo_produto,
      true
    );

    // Valor remota
    const valorRemotaData: any = {
      taxa_id: taxa.id,
      funcao,
      tipo_hora: 'remota',
      valor_base: valorRemota,
      valor_17h30_19h30: valoresCalculadosRemota.valor_17h30_19h30,
      valor_apos_19h30: valoresCalculadosRemota.valor_apos_19h30,
      valor_fim_semana: valoresCalculadosRemota.valor_fim_semana,
      valor_adicional: valoresCalculadosRemota.valor_adicional,
      valor_standby: valoresCalculadosRemota.valor_standby
    };

    // Se for personalizado, sobrescrever com valores personalizados
    if (dados.personalizado && dados.valores_remota_personalizados && dados.valores_remota_personalizados[funcao]) {
      const valoresPersonalizados = dados.valores_remota_personalizados[funcao];
      valorRemotaData.valor_17h30_19h30 = valoresPersonalizados.valor_17h30_19h30;
      valorRemotaData.valor_apos_19h30 = valoresPersonalizados.valor_apos_19h30;
      valorRemotaData.valor_fim_semana = valoresPersonalizados.valor_fim_semana;
      valorRemotaData.valor_adicional = valoresPersonalizados.valor_adicional;
      valorRemotaData.valor_standby = valoresPersonalizados.valor_standby;
    }

    valoresParaInserir.push(valorRemotaData);

    // Valor local
    const valorLocalData: any = {
      taxa_id: taxa.id,
      funcao,
      tipo_hora: 'local',
      valor_base: valorLocal,
      valor_17h30_19h30: valoresCalculadosLocal.valor_17h30_19h30,
      valor_apos_19h30: valoresCalculadosLocal.valor_apos_19h30,
      valor_fim_semana: valoresCalculadosLocal.valor_fim_semana,
      valor_adicional: valoresCalculadosLocal.valor_adicional,
      valor_standby: valoresCalculadosLocal.valor_standby
    };

    // Se for personalizado, sobrescrever com valores personalizados locais
    if (dados.personalizado && dados.valores_local_personalizados && dados.valores_local_personalizados[funcao]) {
      const valoresPersonalizados = dados.valores_local_personalizados[funcao];
      valorLocalData.valor_17h30_19h30 = valoresPersonalizados.valor_17h30_19h30;
      valorLocalData.valor_apos_19h30 = valoresPersonalizados.valor_apos_19h30;
      valorLocalData.valor_fim_semana = valoresPersonalizados.valor_fim_semana;
      valorLocalData.valor_adicional = valoresPersonalizados.valor_adicional;
      valorLocalData.valor_standby = valoresPersonalizados.valor_standby;
    }

    valoresParaInserir.push(valorLocalData);
  });

  // Inserir valores com timeout
  const valoresTimeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: Inserção de valores demorou mais que 30 segundos')), 30000);
  });

  const valoresPromise = supabase
    .from('valores_taxas_funcoes' as any)
    .insert(valoresParaInserir);

  try {
    const valoresResult = await Promise.race([valoresPromise, valoresTimeoutPromise]) as any;
    if (valoresResult.error) {
      console.error('Erro ao criar valores da taxa:', valoresResult.error);
      // Reverter criação da taxa
      await supabase.from('taxas_clientes' as any).delete().eq('id', taxa.id);
      throw new Error(`Erro ao criar valores da taxa: ${valoresResult.error.message || 'Erro desconhecido'}`);
    }
  } catch (error: any) {
    console.error('Erro ao criar valores da taxa:', error);
    // Reverter criação da taxa
    try {
      await supabase.from('taxas_clientes' as any).delete().eq('id', taxa.id);
    } catch (rollbackError) {
      console.error('Erro ao reverter criação da taxa:', rollbackError);
    }
    
    if (error.message?.includes('Timeout')) {
      throw new Error('A inserção dos valores está demorando muito. Tente novamente.');
    }
    throw new Error(`Erro ao criar valores da taxa: ${error.message || 'Erro desconhecido'}`);
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
      .from('taxas_clientes' as any)
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
          valor_base: valorRemota,
          valor_adicional: null,
          valor_standby: null
        });

        valoresReajustadosParaInserir.push({
          taxa_id: taxaReajustada.id,
          funcao,
          tipo_hora: 'local',
          valor_base: valorLocal,
          valor_adicional: null,
          valor_standby: null
        });
      });

      await supabase
        .from('valores_taxas_funcoes' as any)
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
  console.log('🔍 [ATUALIZAR TAXA] Buscando taxa:', id);
  const { data: taxaAtual, error: taxaError } = await supabase
    .from('taxas_clientes' as any)
    .select('*')
    .eq('id', id)
    .limit(1);

  if (taxaError) {
    console.error('❌ [ATUALIZAR TAXA] Erro ao buscar taxa:', taxaError);
    throw new Error('Erro ao buscar taxa atual');
  }
  
  if (!taxaAtual || taxaAtual.length === 0) {
    console.error('❌ [ATUALIZAR TAXA] Taxa não encontrada no banco:', id);
    throw new Error('Taxa não encontrada');
  }
  
  const taxaAtualData = taxaAtual[0];
  console.log('✅ [ATUALIZAR TAXA] Taxa encontrada:', {
    id: taxaAtualData.id,
    cliente_id: taxaAtualData.cliente_id,
    vigencia_inicio: taxaAtualData.vigencia_inicio,
    vigencia_fim: taxaAtualData.vigencia_fim
  });

  // Se houver taxa de reajuste, criar nova taxa ao invés de atualizar
  if (dados.taxa_reajuste && dados.taxa_reajuste > 0) {
    // Criar nova taxa com os dados reajustados
    const vigenciaInicio = typeof dados.vigencia_inicio === 'string' 
      ? dados.vigencia_inicio 
      : dados.vigencia_inicio?.toISOString().split('T')[0];
    
    const vigenciaFim = dados.vigencia_fim 
      ? (typeof dados.vigencia_fim === 'string' 
          ? dados.vigencia_fim 
          : dados.vigencia_fim?.toISOString().split('T')[0])
      : undefined;

    if (!vigenciaInicio) {
      throw new Error('Vigência início é obrigatória');
    }

    // Preparar dados da nova taxa incluindo campos específicos por cliente
    const dadosNovaTaxa: any = {
      cliente_id: taxaAtualData.cliente_id,
      vigencia_inicio: vigenciaInicio,
      vigencia_fim: vigenciaFim,
      tipo_produto: dados.tipo_produto || taxaAtualData.tipo_produto,
      tipo_calculo_adicional: dados.tipo_calculo_adicional || taxaAtualData.tipo_calculo_adicional,
      prazo_pagamento: dados.prazo_pagamento !== undefined ? dados.prazo_pagamento : taxaAtualData.prazo_pagamento, // NOVO: Prazo de pagamento
      personalizado: dados.personalizado !== undefined ? dados.personalizado : taxaAtualData.personalizado,
      criado_por: user?.id
    };

    // Adicionar campos específicos por cliente se fornecidos
    if (dados.valor_ticket !== undefined) dadosNovaTaxa.valor_ticket = dados.valor_ticket;
    if (dados.valor_ticket_excedente !== undefined) dadosNovaTaxa.valor_ticket_excedente = dados.valor_ticket_excedente;
    if (dados.ticket_excedente_simples !== undefined) dadosNovaTaxa.ticket_excedente_simples = dados.ticket_excedente_simples;
    if (dados.ticket_excedente_complexo !== undefined) dadosNovaTaxa.ticket_excedente_complexo = dados.ticket_excedente_complexo;
    if (dados.ticket_excedente_1 !== undefined) dadosNovaTaxa.ticket_excedente_1 = dados.ticket_excedente_1;
    if (dados.ticket_excedente_2 !== undefined) dadosNovaTaxa.ticket_excedente_2 = dados.ticket_excedente_2;
    if (dados.ticket_excedente !== undefined) dadosNovaTaxa.ticket_excedente = dados.ticket_excedente;

    // Criar nova taxa
    const { data: novaTaxa, error: novaTaxaError } = await supabase
      .from('taxas_clientes' as any)
      .insert(dadosNovaTaxa)
      .select();

    if (novaTaxaError) {
      console.error('Erro ao criar nova taxa:', novaTaxaError);
      throw new Error('Erro ao criar nova taxa com reajuste');
    }
    
    if (!novaTaxa || novaTaxa.length === 0) {
      throw new Error('Erro ao criar nova taxa: nenhum registro retornado');
    }
    
    const novaTaxaData = novaTaxa[0];

    // NOVO: Calcular automaticamente valores locais se não fornecidos (10% a mais dos remotos)
    let valoresLocaisFinais = dados.valores_local;
    if (!dados.personalizado && dados.valores_remota) {
      valoresLocaisFinais = calcularValoresLocaisAutomaticos(dados.valores_remota);
    }

    // Criar valores para a nova taxa
    const funcoes = getFuncoesPorProduto(dados.tipo_produto || taxaAtualData.tipo_produto);
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
        taxa_id: novaTaxaData.id,
        funcao,
        tipo_hora: 'remota',
        valor_base: valorRemota,
        valor_adicional: null,
        valor_standby: null
      });

      valoresParaInserir.push({
        taxa_id: novaTaxaData.id,
        funcao,
        tipo_hora: 'local',
        valor_base: valorLocal,
        valor_adicional: null,
        valor_standby: null
      });
    });

    // Inserir valores da nova taxa com timeout
    const novaTaxaValoresTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: Inserção de valores da nova taxa demorou mais que 30 segundos')), 30000);
    });

    const novaTaxaValoresPromise = supabase
      .from('valores_taxas_funcoes' as any)
      .insert(valoresParaInserir);

    try {
      const valoresResult = await Promise.race([novaTaxaValoresPromise, novaTaxaValoresTimeoutPromise]) as any;
      if (valoresResult.error) {
        console.error('Erro ao criar valores da nova taxa:', valoresResult.error);
        // Reverter criação da nova taxa
        await supabase.from('taxas_clientes' as any).delete().eq('id', novaTaxaData.id);
        throw new Error(`Erro ao criar valores da nova taxa: ${valoresResult.error.message || 'Erro desconhecido'}`);
      }
    } catch (error: any) {
      console.error('Erro ao criar valores da nova taxa:', error);
      // Reverter criação da nova taxa
      try {
        await supabase.from('taxas_clientes' as any).delete().eq('id', novaTaxaData.id);
      } catch (rollbackError) {
        console.error('Erro ao reverter criação da nova taxa:', rollbackError);
      }
      
      if (error.message?.includes('Timeout')) {
        throw new Error('A inserção dos valores da nova taxa está demorando muito. Tente novamente.');
      }
      throw new Error(`Erro ao criar valores da nova taxa: ${error.message || 'Erro desconhecido'}`);
    }

    // Retornar a nova taxa criada
    return novaTaxaData as TaxaCliente;
  }

  // Verificar conflito de vigência se as datas foram alteradas
  if (dados.vigencia_inicio || dados.vigencia_fim !== undefined) {
    const vigenciaInicio = dados.vigencia_inicio 
      ? (typeof dados.vigencia_inicio === 'string' 
          ? dados.vigencia_inicio 
          : dados.vigencia_inicio?.toISOString().split('T')[0])
      : taxaAtualData.vigencia_inicio;
    
    const vigenciaFim = dados.vigencia_fim !== undefined
      ? (dados.vigencia_fim 
          ? (typeof dados.vigencia_fim === 'string' 
              ? dados.vigencia_fim 
              : dados.vigencia_fim?.toISOString().split('T')[0])
          : undefined)
      : taxaAtualData.vigencia_fim;

    const tipoProduto = dados.tipo_produto || taxaAtualData.tipo_produto;
    
    const temConflito = await verificarVigenciaConflitante(
      taxaAtualData.cliente_id,
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
      : dados.vigencia_inicio?.toISOString().split('T')[0];
  }
  
  if (dados.vigencia_fim !== undefined) {
    dadosAtualizacao.vigencia_fim = dados.vigencia_fim
      ? (typeof dados.vigencia_fim === 'string'
          ? dados.vigencia_fim
          : dados.vigencia_fim?.toISOString().split('T')[0])
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

  // NOVO: Adicionar prazo de pagamento se fornecido
  if (dados.prazo_pagamento !== undefined) {
    dadosAtualizacao.prazo_pagamento = dados.prazo_pagamento;
  }

  // Adicionar campos específicos por cliente se fornecidos
  if (dados.valor_ticket !== undefined) dadosAtualizacao.valor_ticket = dados.valor_ticket;
  if (dados.valor_ticket_excedente !== undefined) dadosAtualizacao.valor_ticket_excedente = dados.valor_ticket_excedente;
  if (dados.ticket_excedente_simples !== undefined) dadosAtualizacao.ticket_excedente_simples = dados.ticket_excedente_simples;
  if (dados.ticket_excedente_complexo !== undefined) dadosAtualizacao.ticket_excedente_complexo = dados.ticket_excedente_complexo;
  if (dados.ticket_excedente_1 !== undefined) dadosAtualizacao.ticket_excedente_1 = dados.ticket_excedente_1;
  if (dados.ticket_excedente_2 !== undefined) dadosAtualizacao.ticket_excedente_2 = dados.ticket_excedente_2;
  if (dados.ticket_excedente !== undefined) dadosAtualizacao.ticket_excedente = dados.ticket_excedente;

  // Atualizar taxa com timeout
  console.log('🔄 [ATUALIZAR TAXA] Iniciando atualização:', {
    id,
    dadosAtualizacao
  });
  
  const updateTimeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: Atualização demorou mais que 30 segundos')), 30000);
  });

  const updatePromise = supabase
    .from('taxas_clientes' as any)
    .update(dadosAtualizacao)
    .eq('id', id)
    .select();

  let taxaAtualizada;
  try {
    const result = await Promise.race([updatePromise, updateTimeoutPromise]) as any;
    
    console.log('📊 [ATUALIZAR TAXA] Resultado do update:', {
      error: result.error,
      data: result.data,
      dataLength: result.data?.length
    });
    
    if (result.error) {
      console.error('❌ [ATUALIZAR TAXA] Erro ao atualizar taxa:', result.error);
      throw new Error(`Erro ao atualizar taxa: ${result.error.message || 'Erro desconhecido'}`);
    }
    
    // Verificar se retornou dados
    if (!result.data || result.data.length === 0) {
      console.error('❌ [ATUALIZAR TAXA] Nenhum dado retornado após update. Possíveis causas:');
      console.error('  1. Taxa foi deletada por outro processo');
      console.error('  2. Problema com RLS (Row Level Security)');
      console.error('  3. ID incorreto:', id);
      
      // Tentar buscar a taxa novamente para confirmar se existe
      const { data: taxaVerificacao } = await supabase
        .from('taxas_clientes' as any)
        .select('id')
        .eq('id', id)
        .limit(1);
      
      if (!taxaVerificacao || taxaVerificacao.length === 0) {
        throw new Error('Taxa não encontrada para atualização (foi deletada?)');
      } else {
        throw new Error('Taxa existe mas update não retornou dados (problema de permissão RLS?)');
      }
    }
    
    // Se retornou múltiplos registros, pegar o primeiro (não deveria acontecer com ID único)
    taxaAtualizada = Array.isArray(result.data) ? result.data[0] : result.data;
    console.log('✅ [ATUALIZAR TAXA] Taxa atualizada com sucesso:', taxaAtualizada.id);
  } catch (error: any) {
    console.error('Erro ao atualizar taxa:', error);
    if (error.message?.includes('Timeout')) {
      throw new Error('A atualização está demorando muito. Tente novamente.');
    }
    throw new Error(`Erro ao atualizar taxa: ${error.message || 'Erro desconhecido'}`);
  }

  // Atualizar valores se fornecidos
  if (dados.valores_remota || dados.valores_local) {
    console.log('🔄 [ATUALIZAR TAXA] Atualizando valores da taxa:', id);
    console.log('📊 [ATUALIZAR TAXA] Valores remotos recebidos:', dados.valores_remota);
    console.log('📊 [ATUALIZAR TAXA] Valores locais recebidos:', dados.valores_local);
    
    // CORREÇÃO CRÍTICA: Buscar valores existentes ANTES de deletar
    const { data: valoresExistentes, error: buscarError } = await supabase
      .from('valores_taxas_funcoes' as any)
      .select('*')
      .eq('taxa_id', id);

    if (buscarError) {
      console.error('Erro ao buscar valores existentes:', buscarError);
      throw new Error('Erro ao buscar valores existentes da taxa');
    }

    console.log('📋 [ATUALIZAR TAXA] Valores existentes no banco:', valoresExistentes);

    // NOVO: Calcular automaticamente valores locais se não fornecidos (10% a mais dos remotos)
    let valoresLocaisFinais = dados.valores_local;
    if (!dados.personalizado && dados.valores_remota) {
      valoresLocaisFinais = calcularValoresLocaisAutomaticos(dados.valores_remota);
    }

    // CORREÇÃO: Usar UPSERT em vez de DELETE + INSERT para evitar erro de constraint
    // Não deletar valores antigos - usar UPSERT para atualizar ou inserir
    const funcoes = getFuncoesPorProduto(taxaAtualizada.tipo_produto);
    const valoresParaUpsert: any[] = [];

    funcoes.forEach(funcao => {
      // CORREÇÃO: Buscar valores existentes para esta função
      const valorExistenteRemoto = valoresExistentes?.find(v => 
        v.funcao === funcao && v.tipo_hora === 'remota'
      );
      const valorExistenteLocal = valoresExistentes?.find(v => 
        v.funcao === funcao && v.tipo_hora === 'local'
      );

      // NOVA LÓGICA SIMPLIFICADA: Sempre usar valores do formulário se fornecidos, senão manter existentes
      let valorRemota = 0;
      let valorLocal = 0;

      if (funcao === 'Funcional') {
        valorRemota = dados.valores_remota?.funcional ?? (valorExistenteRemoto?.valor_base || 0);
        valorLocal = valoresLocaisFinais?.funcional ?? (valorExistenteLocal?.valor_base || 0);
      } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
        valorRemota = dados.valores_remota?.tecnico ?? (valorExistenteRemoto?.valor_base || 0);
        valorLocal = valoresLocaisFinais?.tecnico ?? (valorExistenteLocal?.valor_base || 0);
      } else if (funcao === 'ABAP - PL/SQL') {
        valorRemota = (dados.valores_remota as any)?.abap ?? (valorExistenteRemoto?.valor_base || 0);
        valorLocal = (valoresLocaisFinais as any)?.abap ?? (valorExistenteLocal?.valor_base || 0);
      } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
        valorRemota = dados.valores_remota?.dba ?? (valorExistenteRemoto?.valor_base || 0);
        valorLocal = valoresLocaisFinais?.dba ?? (valorExistenteLocal?.valor_base || 0);
      } else if (funcao === 'Gestor') {
        valorRemota = dados.valores_remota?.gestor ?? (valorExistenteRemoto?.valor_base || 0);
        valorLocal = valoresLocaisFinais?.gestor ?? (valorExistenteLocal?.valor_base || 0);
      }

      console.log(`📝 [ATUALIZAR TAXA] ${funcao} - Remoto: ${valorRemota} (existente: ${valorExistenteRemoto?.valor_base || 0}), Local: ${valorLocal} (existente: ${valorExistenteLocal?.valor_base || 0})`);

      // Valor remota
      const valorRemotaData: any = {
        taxa_id: id,
        funcao,
        tipo_hora: 'remota',
        valor_base: valorRemota,
        valor_adicional: null,
        valor_standby: null
      };

      // CORREÇÃO CRÍTICA: Sempre preservar valores personalizados existentes
      // IMPORTANTE: Usar NULL em vez de 0 para valor_adicional e valor_standby (constraint do banco)
      if (dados.personalizado) {
        if (dados.valores_remota_personalizados && dados.valores_remota_personalizados[funcao]) {
          // Usar novos valores personalizados se fornecidos, senão preservar existentes
          const valoresPersonalizados = dados.valores_remota_personalizados[funcao];
          valorRemotaData.valor_17h30_19h30 = valoresPersonalizados.valor_17h30_19h30 ?? (valorExistenteRemoto?.valor_17h30_19h30 || 0);
          valorRemotaData.valor_apos_19h30 = valoresPersonalizados.valor_apos_19h30 ?? (valorExistenteRemoto?.valor_apos_19h30 || 0);
          valorRemotaData.valor_fim_semana = valoresPersonalizados.valor_fim_semana ?? (valorExistenteRemoto?.valor_fim_semana || 0);
          valorRemotaData.valor_adicional = valoresPersonalizados.valor_adicional ?? (valorExistenteRemoto?.valor_adicional || null);
          valorRemotaData.valor_standby = valoresPersonalizados.valor_standby ?? (valorExistenteRemoto?.valor_standby || null);
        } else if (valorExistenteRemoto) {
          // Preservar TODOS os valores personalizados existentes
          valorRemotaData.valor_17h30_19h30 = valorExistenteRemoto.valor_17h30_19h30 || 0;
          valorRemotaData.valor_apos_19h30 = valorExistenteRemoto.valor_apos_19h30 || 0;
          valorRemotaData.valor_fim_semana = valorExistenteRemoto.valor_fim_semana || 0;
          valorRemotaData.valor_adicional = valorExistenteRemoto.valor_adicional || null;
          valorRemotaData.valor_standby = valorExistenteRemoto.valor_standby || null;
        }
      } else if (valorExistenteRemoto) {
        // Mesmo para taxas não personalizadas, preservar valores existentes
        valorRemotaData.valor_17h30_19h30 = valorExistenteRemoto.valor_17h30_19h30 || 0;
        valorRemotaData.valor_apos_19h30 = valorExistenteRemoto.valor_apos_19h30 || 0;
        valorRemotaData.valor_fim_semana = valorExistenteRemoto.valor_fim_semana || 0;
        valorRemotaData.valor_adicional = valorExistenteRemoto.valor_adicional || null;
        valorRemotaData.valor_standby = valorExistenteRemoto.valor_standby || null;
      }

      valoresParaUpsert.push(valorRemotaData);

      // Valor local
      const valorLocalData: any = {
        taxa_id: id,
        funcao,
        tipo_hora: 'local',
        valor_base: valorLocal,
        valor_adicional: null, // Local não tem valor adicional
        valor_standby: null    // Local não tem valor standby
      };

      // CORREÇÃO CRÍTICA: Sempre preservar valores personalizados locais existentes
      if (dados.personalizado) {
        if (dados.valores_local_personalizados && dados.valores_local_personalizados[funcao]) {
          // Usar novos valores personalizados se fornecidos, senão preservar existentes
          const valoresPersonalizados = dados.valores_local_personalizados[funcao];
          valorLocalData.valor_17h30_19h30 = valoresPersonalizados.valor_17h30_19h30 ?? (valorExistenteLocal?.valor_17h30_19h30 || 0);
          valorLocalData.valor_apos_19h30 = valoresPersonalizados.valor_apos_19h30 ?? (valorExistenteLocal?.valor_apos_19h30 || 0);
          valorLocalData.valor_fim_semana = valoresPersonalizados.valor_fim_semana ?? (valorExistenteLocal?.valor_fim_semana || 0);
        } else if (valorExistenteLocal) {
          // Preservar TODOS os valores personalizados existentes
          valorLocalData.valor_17h30_19h30 = valorExistenteLocal.valor_17h30_19h30 || 0;
          valorLocalData.valor_apos_19h30 = valorExistenteLocal.valor_apos_19h30 || 0;
          valorLocalData.valor_fim_semana = valorExistenteLocal.valor_fim_semana || 0;
        }
      } else if (valorExistenteLocal) {
        // Mesmo para taxas não personalizadas, preservar valores existentes
        valorLocalData.valor_17h30_19h30 = valorExistenteLocal.valor_17h30_19h30 || 0;
        valorLocalData.valor_apos_19h30 = valorExistenteLocal.valor_apos_19h30 || 0;
        valorLocalData.valor_fim_semana = valorExistenteLocal.valor_fim_semana || 0;
      }

      valoresParaUpsert.push(valorLocalData);
    });

    console.log('💾 [ATUALIZAR TAXA] Valores finais para UPSERT:', valoresParaUpsert);

    // CORREÇÃO CRÍTICA: Usar UPSERT em vez de INSERT para evitar erro de constraint
    const valoresTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: UPSERT de valores demorou mais que 30 segundos')), 30000);
    });

    const valoresPromise = supabase
      .from('valores_taxas_funcoes' as any)
      .upsert(valoresParaUpsert, {
        onConflict: 'taxa_id,funcao,tipo_hora',
        ignoreDuplicates: false
      });

    try {
      const valoresResult = await Promise.race([valoresPromise, valoresTimeoutPromise]) as any;
      if (valoresResult.error) {
        console.error('Erro ao fazer UPSERT de valores:', valoresResult.error);
        throw new Error(`Erro ao atualizar valores da taxa: ${valoresResult.error.message || 'Erro desconhecido'}`);
      }
      console.log('✅ [ATUALIZAR TAXA] Valores atualizados com sucesso via UPSERT');
    } catch (error: any) {
      console.error('Erro ao fazer UPSERT de valores:', error);
      if (error.message?.includes('Timeout')) {
        throw new Error('O UPSERT dos valores está demorando muito. Tente novamente.');
      }
      throw new Error(`Erro ao atualizar valores da taxa: ${error.message || 'Erro desconhecido'}`);
    }

  }

  return taxaAtualizada as TaxaCliente;
}

/**
 * Deletar taxa
 */
export async function deletarTaxa(id: string): Promise<void> {
  try {
    console.log('🗑️ [DELETAR TAXA] Iniciando deleção da taxa:', id);
    
    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ [DELETAR TAXA] Usuário não autenticado:', authError);
      throw new Error('Usuário não autenticado');
    }
    console.log('✅ [DELETAR TAXA] Usuário autenticado:', user.id);
    
    // Primeiro, verificar se a taxa existe
    console.log('🔍 [DELETAR TAXA] Verificando existência da taxa...');
    const { data: taxaExistente, error: verificarError } = await supabase
      .from('taxas_clientes' as any)
      .select('id, cliente_id, criado_por')
      .eq('id', id)
      .limit(1);

    if (verificarError) {
      console.error('❌ [DELETAR TAXA] Erro ao verificar existência da taxa:', verificarError);
      throw new Error(`Erro ao verificar taxa: ${verificarError.message}`);
    }

    if (!taxaExistente || taxaExistente.length === 0) {
      console.warn('⚠️ [DELETAR TAXA] Taxa não encontrada para deleção:', id);
      throw new Error('Taxa não encontrada');
    }

    console.log('✅ [DELETAR TAXA] Taxa encontrada:', {
      id: taxaExistente[0].id,
      cliente_id: taxaExistente[0].cliente_id,
      criado_por: taxaExistente[0].criado_por,
      usuario_atual: user.id
    });
    
    // Verificar quantos valores existem antes da deleção
    console.log('🔍 [DELETAR TAXA] Verificando valores existentes...');
    const { data: valoresExistentes, error: valoresExistentesError } = await supabase
      .from('valores_taxas_funcoes' as any)
      .select('id, funcao, tipo_hora')
      .eq('taxa_id', id);

    if (valoresExistentesError) {
      console.error('❌ [DELETAR TAXA] Erro ao verificar valores existentes:', valoresExistentesError);
    } else {
      console.log(`📊 [DELETAR TAXA] Encontrados ${valoresExistentes?.length || 0} valores para deletar:`, valoresExistentes);
    }
    
    // Deletar valores primeiro (cascade deve fazer isso automaticamente, mas garantimos)
    console.log('🗑️ [DELETAR TAXA] Deletando valores da taxa...');
    const { error: valoresError, count: valoresCount } = await supabase
      .from('valores_taxas_funcoes' as any)
      .delete({ count: 'exact' })
      .eq('taxa_id', id);

    if (valoresError) {
      console.error('❌ [DELETAR TAXA] Erro ao deletar valores da taxa:', valoresError);
      throw new Error(`Erro ao deletar valores da taxa: ${valoresError.message}`);
    }

    console.log(`✅ [DELETAR TAXA] ${valoresCount || 0} valores da taxa deletados com sucesso`);

    // Aguardar um pouco para garantir que a deleção dos valores foi processada
    await new Promise(resolve => setTimeout(resolve, 100));

    // Deletar taxa
    console.log('🗑️ [DELETAR TAXA] Deletando taxa principal...');
    const { error: taxaError, count: taxaCount } = await supabase
      .from('taxas_clientes' as any)
      .delete({ count: 'exact' })
      .eq('id', id);

    if (taxaError) {
      console.error('❌ [DELETAR TAXA] Erro ao deletar taxa:', taxaError);
      console.error('❌ [DELETAR TAXA] Detalhes do erro:', {
        message: taxaError.message,
        details: taxaError.details,
        hint: taxaError.hint,
        code: taxaError.code
      });
      throw new Error(`Erro ao deletar taxa: ${taxaError.message}`);
    }

    console.log(`📊 [DELETAR TAXA] Resultado da deleção: ${taxaCount} registro(s) afetado(s)`);

    if (taxaCount === 0) {
      console.error('❌ [DELETAR TAXA] Nenhuma taxa foi deletada - possível problema de permissão RLS');
      console.error('❌ [DELETAR TAXA] Verificar políticas RLS na tabela taxas_clientes');
      throw new Error('Nenhuma taxa foi deletada. Verifique as permissões RLS no Supabase.');
    }

    console.log(`✅ [DELETAR TAXA] Taxa deletada com sucesso: ${id} (${taxaCount} registro(s) afetado(s))`);
    
    // Aguardar um pouco para garantir que a deleção foi processada
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Verificar se a taxa realmente foi deletada
    console.log('🔍 [DELETAR TAXA] Verificando se taxa foi realmente deletada...');
    const { data: verificarDelecao, error: verificarDelecaoError } = await supabase
      .from('taxas_clientes' as any)
      .select('id')
      .eq('id', id)
      .limit(1);

    if (verificarDelecaoError) {
      console.warn('⚠️ [DELETAR TAXA] Erro ao verificar deleção:', verificarDelecaoError);
    } else if (verificarDelecao && verificarDelecao.length > 0) {
      console.error('❌ [DELETAR TAXA] ERRO CRÍTICO: Taxa ainda existe após deleção!', verificarDelecao);
      throw new Error('Taxa não foi deletada corretamente do banco de dados. Possível problema de RLS.');
    } else {
      console.log('✅ [DELETAR TAXA] Confirmado: Taxa foi realmente deletada do banco de dados');
    }
    
    console.log('🎉 [DELETAR TAXA] Processo de deleção concluído com sucesso!');
    
  } catch (error: any) {
    console.error('❌ [DELETAR TAXA] Erro geral na deleção da taxa:', error);
    throw new Error(`Erro ao deletar taxa: ${error.message || 'Erro desconhecido'}`);
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
    .from('taxas_clientes' as any)
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
    .limit(1);

  if (error) {
    console.error('Erro ao buscar taxa vigente:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    return null;
  }

  const taxaData = data[0];

  const valores = await buscarValoresTaxa(taxaData.id);
  
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
    calcularValores(v.valor_base, v.funcao, todasFuncoesRemota, taxaData.tipo_calculo_adicional, taxaData.tipo_produto, false)
  );
  
  // Calcular valores completos para local (com parâmetro isLocal = true)
  const valoresLocalCalculados = valoresLocal.map(v => 
    calcularValores(v.valor_base, v.funcao, todasFuncoesLocal, taxaData.tipo_calculo_adicional, taxaData.tipo_produto, true)
  );
  
  return {
    ...taxaData,
    valores_remota: valoresRemotaCalculados,
    valores_local: valoresLocalCalculados
  } as TaxaClienteCompleta;
}

/**
 * Inativar todas as taxas de um cliente (definir vigencia_fim para hoje)
 */
export async function inativarTaxasCliente(clienteId: string): Promise<void> {
  console.log(`🔍 Iniciando inativação de taxas para cliente ID: ${clienteId}`);
  
  const dataHoje = new Date().toISOString().split('T')[0];
  console.log(`📅 Data de hoje: ${dataHoje}`);
  
  // Buscar todas as taxas ativas do cliente (sem vigencia_fim ou com vigencia_fim futura)
  const { data: taxasAtivas, error: buscarError } = await supabase
    .from('taxas_clientes' as any)
    .select('id, vigencia_inicio, vigencia_fim, cliente_id')
    .eq('cliente_id', clienteId)
    .or(`vigencia_fim.is.null,vigencia_fim.gt.${dataHoje}`);

  console.log(`🔍 Query executada para cliente ${clienteId}:`, { taxasAtivas, buscarError });

  if (buscarError) {
    console.error('❌ Erro ao buscar taxas ativas do cliente:', buscarError);
    throw new Error('Erro ao buscar taxas ativas do cliente');
  }

  if (!taxasAtivas || taxasAtivas.length === 0) {
    console.log(`ℹ️ Nenhuma taxa ativa encontrada para o cliente ${clienteId}`);
    return;
  }

  console.log(`📋 Encontradas ${taxasAtivas.length} taxa(s) ativa(s):`, taxasAtivas);

  // Inativar cada taxa definindo vigencia_fim para hoje
  const vigenciaFim = dataHoje;
  console.log(`📅 Definindo vigencia_fim para: ${vigenciaFim}`);

  const { error: updateError } = await supabase
    .from('taxas_clientes' as any)
    .update({ vigencia_fim: vigenciaFim })
    .eq('cliente_id', clienteId)
    .or(`vigencia_fim.is.null,vigencia_fim.gt.${dataHoje}`);

  if (updateError) {
    console.error('❌ Erro ao inativar taxas do cliente:', updateError);
    throw new Error('Erro ao inativar taxas do cliente');
  }

  console.log(`✅ Inativadas ${taxasAtivas.length} taxa(s) do cliente ${clienteId} com vigencia_fim = ${vigenciaFim}`);
}
