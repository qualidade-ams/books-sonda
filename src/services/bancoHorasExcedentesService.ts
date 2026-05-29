/**
 * Serviço de Cálculo de Excedentes de Banco de Horas
 * 
 * Implementa a lógica de cálculo de excedentes quando o saldo final do período é negativo:
 * - Busca taxa de hora/ticket mais antiga do mês
 * - Calcula valor monetário do excedente
 * - Gera descrição padronizada para faturamento
 * - Valida disponibilidade de taxas
 * 
 * @module bancoHorasExcedentesService
 */

import { supabase } from '@/integrations/supabase/client';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';

/**
 * Resultado do cálculo de excedente
 */
export interface ResultadoExcedente {
  /** Valor do excedente em horas (formato HH:MM) ou tickets (número) */
  excedente: string | number;
  /** Valor monetário do excedente (R$) */
  valorExcedente: number;
  /** Taxa utilizada no cálculo (R$ por hora ou por ticket) */
  taxaUtilizada: number | null;
  /** Indica se taxa foi encontrada */
  taxaEncontrada: boolean;
  /** Mensagem de alerta se taxa ausente */
  alerta?: string;
}

/**
 * Resultado da geração de descrição de faturamento
 */
export interface DescricaoFaturamento {
  /** Descrição formatada para solicitação de PO */
  descricao: string;
  /** Nome da empresa */
  empresaNome: string;
  /** Período (MM/YYYY) */
  periodo: string;
  /** Saldo negativo (valor absoluto) */
  saldoNegativo: string | number;
  /** Valor a faturar (R$) */
  valorFaturar: number;
}

/**
 * Calcula excedente quando saldo final do período é negativo
 * 
 * Regras:
 * - Excedente só é gerado quando saldo < 0 ao final do período de apuração
 * - Busca taxa mais antiga do mês para cálculo
 * - Valor = |saldo| × taxa
 * - Se taxa ausente, retorna alerta e não calcula valor
 * 
 * @param empresaId - ID da empresa cliente
 * @param saldo - Saldo do mês (negativo) em formato HH:MM (horas) ou número (tickets)
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param tipoContrato - Tipo de contrato ('horas', 'tickets', 'ambos')
 * @returns Resultado do cálculo com excedente e valor monetário
 * 
 * @example
 * // Saldo negativo de horas
 * await calcularExcedente('uuid-empresa', '-10:30', 1, 2024, 'horas')
 * // { excedente: '10:30', valorExcedente: 1050, taxaUtilizada: 100, taxaEncontrada: true }
 * 
 * @example
 * // Saldo negativo de tickets
 * await calcularExcedente('uuid-empresa', -5, 1, 2024, 'tickets')
 * // { excedente: 5, valorExcedente: 2500, taxaUtilizada: 500, taxaEncontrada: true }
 * 
 * @example
 * // Taxa ausente
 * await calcularExcedente('uuid-empresa', '-10:00', 1, 2024, 'horas')
 * // { excedente: '10:00', valorExcedente: 0, taxaUtilizada: null, taxaEncontrada: false, alerta: '...' }
 * 
 * **Validates: Requirements 10.1-10.10**
 * **Property 13: Geração de Excedente para Saldo Negativo**
 * **Property 14: Cálculo de Valor de Excedente**
 * **Property 15: Excedente Zero para Saldo Não-Negativo**
 * **Property 25: Alerta de Taxa Ausente**
 */
export async function calcularExcedente(
  empresaId: string,
  saldo: string | number,
  mes: number,
  ano: number,
  tipoContrato: 'horas' | 'tickets' | 'ambos'
): Promise<ResultadoExcedente> {
  try {
    console.log('🔍 BancoHorasExcedentesService.calcularExcedente:', {
      empresaId,
      saldo,
      mes,
      ano,
      tipoContrato
    });

    // Validar parâmetros
    if (!empresaId?.trim()) {
      throw new Error('ID da empresa é obrigatório');
    }

    if (mes < 1 || mes > 12) {
      throw new Error('Mês deve estar entre 1 e 12');
    }

    if (ano < 2020) {
      throw new Error('Ano deve ser maior ou igual a 2020');
    }

    // Verificar se saldo é negativo
    const isHoras = typeof saldo === 'string';
    const isNegativo = isHoras 
      ? saldo.startsWith('-')
      : saldo < 0;

    // Se saldo não é negativo, retornar excedente zero
    if (!isNegativo) {
      console.log('✅ Saldo não é negativo, excedente = 0');
      return {
        excedente: isHoras ? '0:00' : 0,
        valorExcedente: 0,
        taxaUtilizada: null,
        taxaEncontrada: false
      };
    }

    // Calcular valor absoluto do saldo (excedente)
    let excedente: string | number;
    let excedenteMagnitude: number; // Para cálculo monetário

    if (isHoras) {
      // Remover sinal negativo e converter para minutos
      const saldoLimpo = (saldo as string).substring(1); // Remove '-'
      excedente = saldoLimpo;
      excedenteMagnitude = converterHorasParaMinutos(saldoLimpo) / 60; // Converter para horas decimais
    } else {
      // Tickets: valor absoluto
      excedente = Math.abs(saldo as number);
      excedenteMagnitude = excedente;
    }

    console.log('📊 Excedente calculado:', {
      excedente,
      excedenteMagnitude,
      tipo: isHoras ? 'horas' : 'tickets'
    });

    // Buscar taxa do mês
    const taxa = await buscarTaxaMes(empresaId, mes, ano, tipoContrato);

    // Se taxa não encontrada, retornar alerta
    if (taxa === null) {
      const alerta = 'Taxa não encontrada para o período. Excedente não pode ser calculado.';
      console.warn('⚠️', alerta);
      
      return {
        excedente,
        valorExcedente: 0,
        taxaUtilizada: null,
        taxaEncontrada: false,
        alerta
      };
    }

    // Calcular valor monetário do excedente
    const valorExcedente = excedenteMagnitude * taxa;

    console.log('✅ Excedente calculado com sucesso:', {
      excedente,
      taxa,
      valorExcedente: `R$ ${valorExcedente.toFixed(2)}`
    });

    return {
      excedente,
      valorExcedente,
      taxaUtilizada: taxa,
      taxaEncontrada: true
    };
  } catch (error) {
    console.error('❌ Erro ao calcular excedente:', error);
    throw new Error(
      `Erro ao calcular excedente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

/**
 * Busca taxa mais recente disponível para cálculo de excedentes
 * 
 * Regras:
 * - Busca TODAS as taxas que iniciaram antes ou no mês de referência
 * - Retorna a taxa mais RECENTE (ordenada por vigencia_inicio DESC)
 * - Exibe a taxa mesmo que esteja vencida (vigencia_fim < data_referencia)
 * - Isso permite visualizar a taxa aplicável ao período, independente da vigência
 * 
 * Para horas: calcula "Hora Adicional (Excedente do Banco)" da função Funcional conforme tipo_calculo_adicional:
 *   - 'normal': valor_base da função Funcional + 15%
 *   - 'media': média dos valores_base das três primeiras funções (Funcional, Técnico/ABAP, DBA/Basis)
 * - Para tickets: busca valor de ticket excedente conforme cliente:
 *   - VOTORANTIM, CSN: valor_ticket_excedente
 *   - CHIESI: ticket_excedente_2 (Ticket Excedente)
 *   - NIDEC: ticket_excedente
 *   - EXXONMOBIL: NÃO IMPLEMENTADO (regra personalizada futura)
 * - Retorna null se nenhuma taxa encontrada ou se valores não estiverem preenchidos
 * 
 * @param empresaId - ID da empresa cliente
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param tipoContrato - Tipo de contrato para determinar qual taxa buscar
 * @returns Taxa em R$ por hora/ticket ou null se não encontrada
 * 
 * @example
 * // Taxa de Hora Adicional (Excedente do Banco) calculada - tipo 'normal'
 * // valor_base Funcional = 208.55
 * await buscarTaxaMes('uuid-empresa', 1, 2024, 'horas') // 239.83 (208.55 * 1.15)
 * 
 * @example
 * // Taxa de Hora Adicional (Excedente do Banco) calculada - tipo 'media'
 * // Funcional = 208.55, Técnico/ABAP = 250.00, DBA/Basis = 300.00
 * await buscarTaxaMes('uuid-empresa', 1, 2024, 'horas') // 252.85 ((208.55 + 250 + 300) / 3)
 * 
 * @example
 * // Taxa de Ticket Excedente - CHIESI
 * // ticket_excedente_2 = 999.00
 * await buscarTaxaMes('uuid-chiesi', 1, 2024, 'tickets') // 999.00
 * 
 * @example
 * // Taxa vencida mas ainda exibida
 * // Taxa 1: vigencia_inicio = 2024-01-01, vigencia_fim = 2024-12-31, valor_base = 208.55
 * // Consultando período 01/2025 (após vigência)
 * await buscarTaxaMes('uuid-empresa', 1, 2025, 'horas') // 239.83 (208.55 * 1.15 - taxa vencida mas exibida)
 * 
 * @example
 * // Taxa não encontrada ou valores não preenchidos
 * await buscarTaxaMes('uuid-empresa', 1, 2024, 'horas') // null (exibe R$ 0,00)
 * 
 * **Validates: Requirements 10.3, 14.5, 14.6**
 * **Property 24: Taxa Mais Recente Disponível**
 * **Property 27: Cálculo de Hora Adicional (Excedente do Banco)**
 * **Property 28: Busca de Taxa de Ticket Excedente por Cliente**
 */
export async function buscarTaxaMes(
  empresaId: string,
  mes: number,
  ano: number,
  tipoContrato: 'horas' | 'tickets' | 'ambos'
): Promise<number | null> {
  try {
    console.log('🔍 [buscarTaxaMes] INÍCIO - Buscando taxa:', {
      empresaId,
      mes,
      ano,
      tipoContrato,
      timestamp: new Date().toISOString()
    });

    // Calcular data de referência (primeiro dia do mês)
    const dataReferencia = `${ano}-${String(mes).padStart(2, '0')}-01`;

    console.log('📅 [buscarTaxaMes] Data de referência calculada:', {
      dataReferencia,
      mes_formatado: String(mes).padStart(2, '0'),
      ano
    });

    // Buscar taxas disponíveis (vigentes ou vencidas)
    // Busca TODAS as taxas que iniciaram antes ou no mês de referência
    // Isso permite exibir a taxa mesmo que esteja vencida
    console.log('🔍 [buscarTaxaMes] Buscando taxas com filtros:', {
      cliente_id: empresaId,
      vigencia_inicio_lte: dataReferencia,
      explicacao: 'Busca taxas que iniciaram antes ou no mês de referência'
    });
    
    const { data: taxasData, error } = await (supabase as any)
      .from('taxas_clientes')
      .select('id, vigencia_inicio, vigencia_fim, tipo_produto')
      .eq('cliente_id', empresaId)
      .lte('vigencia_inicio', dataReferencia)
      .order('vigencia_inicio', { ascending: false }); // Ordenar por mais recente primeiro
    
    const taxas = taxasData as Array<{
      id: string;
      vigencia_inicio: string;
      vigencia_fim: string | null;
      tipo_produto: string;
    }> | null;

    if (error) {
      console.error('❌ [buscarTaxaMes] Erro ao buscar taxas:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        empresaId,
        dataReferencia
      });
      throw new Error(`Erro ao buscar taxas: ${error.message}`);
    }

    if (!taxas || taxas.length === 0) {
      console.log('⚠️ [buscarTaxaMes] Nenhuma taxa encontrada para o período');
      console.log('🔍 [buscarTaxaMes] Possíveis causas:');
      console.log('  1. Cliente não tem taxas cadastradas');
      console.log('  2. Todas as taxas têm vigencia_inicio APÓS', dataReferencia);
      console.log('  3. Cliente ID incorreto:', empresaId);
      return null;
    }

    console.log('📊 [buscarTaxaMes] Taxas encontradas:', {
      quantidade: taxas.length,
      taxas: taxas.map(t => {
        const vigenciaInicioDate = new Date(t.vigencia_inicio);
        const vigenciaFimDate = t.vigencia_fim ? new Date(t.vigencia_fim) : null;
        const dataRefDate = new Date(dataReferencia);
        
        return {
          id: t.id,
          vigencia_inicio: t.vigencia_inicio,
          vigencia_fim: t.vigencia_fim,
          tipo_produto: t.tipo_produto,
          status: t.vigencia_fim === null 
            ? 'Sem data fim (vigente indefinidamente)' 
            : vigenciaFimDate && vigenciaFimDate < dataRefDate
              ? `⚠️ VENCIDA em ${t.vigencia_fim}`
              : `✅ Vigente até ${t.vigencia_fim}`,
          dentro_vigencia: t.vigencia_fim === null 
            ? true 
            : vigenciaFimDate && vigenciaFimDate >= dataRefDate
        };
      })
    });

    // Pegar a taxa mais recente (primeira da lista ordenada por vigencia_inicio DESC)
    const taxaMaisRecente = taxas[0];

    console.log('✅ [buscarTaxaMes] Taxa mais recente selecionada:', {
      id: taxaMaisRecente.id,
      vigencia_inicio: taxaMaisRecente.vigencia_inicio,
      vigencia_fim: taxaMaisRecente.vigencia_fim,
      tipo_produto: taxaMaisRecente.tipo_produto
    });

    // Buscar valores da taxa
    // Para horas: calcular Hora Adicional (Excedente do Banco) da função Funcional
    // Para tickets: buscar valor_ticket da tabela taxas_clientes
    if (tipoContrato === 'horas' || tipoContrato === 'ambos') {
      console.log('🔍 [buscarTaxaMes] Buscando valores para contrato de HORAS:', {
        taxa_id: taxaMaisRecente.id,
        tipoContrato
      });
      
      // Buscar tipo de cálculo adicional e valor base da função Funcional
      const { data: taxaDataRaw, error: taxaError } = await (supabase as any)
        .from('taxas_clientes')
        .select('tipo_calculo_adicional')
        .eq('id', taxaMaisRecente.id)
        .single();
      
      const taxaData = taxaDataRaw as { tipo_calculo_adicional: string } | null;

      if (taxaError) {
        console.error('❌ [buscarTaxaMes] Erro ao buscar tipo de cálculo adicional:', {
          taxaError,
          errorMessage: taxaError.message,
          taxa_id: taxaMaisRecente.id
        });
        throw new Error(`Erro ao buscar tipo de cálculo adicional: ${taxaError.message}`);
      }

      const tipoCalculoAdicional = taxaData?.tipo_calculo_adicional || 'media';

      console.log('📊 [buscarTaxaMes] Tipo de cálculo adicional:', {
        tipoCalculoAdicional,
        taxa_id: taxaMaisRecente.id
      });

      // ✅ CORREÇÃO: Buscar valor_adicional REAL da tabela (não calcular)
      console.log('🔍 [buscarTaxaMes] Buscando valores na tabela valores_taxas_funcoes:', {
        taxa_id: taxaMaisRecente.id,
        tipo_hora: 'remota'
      });
      
      const { data: valoresData, error: valoresError } = await (supabase as any)
        .from('valores_taxas_funcoes')
        .select('valor_base, valor_adicional, funcao')
        .eq('taxa_id', taxaMaisRecente.id)
        .eq('tipo_hora', 'remota');
      
      const valores = valoresData as Array<{
        valor_base: number;
        valor_adicional: number | null;
        funcao: string;
      }> | null;

      if (valoresError) {
        console.error('❌ [buscarTaxaMes] Erro ao buscar valores da taxa:', {
          valoresError,
          errorMessage: valoresError.message,
          taxa_id: taxaMaisRecente.id
        });
        throw new Error(`Erro ao buscar valores da taxa: ${valoresError.message}`);
      }

      console.log('📊 [buscarTaxaMes] Valores encontrados na tabela:', {
        quantidade: valores?.length || 0,
        valores: valores?.map(v => ({
          funcao: v.funcao,
          valor_base: v.valor_base,
          valor_adicional: v.valor_adicional,
          tem_valor_adicional: v.valor_adicional !== null && v.valor_adicional !== undefined
        }))
      });

      if (!valores || valores.length === 0) {
        console.log('⚠️ [buscarTaxaMes] Nenhum valor de taxa encontrado na tabela valores_taxas_funcoes');
        console.log('🔍 [buscarTaxaMes] Possíveis causas:');
        console.log('  1. Tabela valores_taxas_funcoes não tem registros para taxa_id:', taxaMaisRecente.id);
        console.log('  2. Tipo de hora diferente de "remota"');
        console.log('  3. Taxa cadastrada mas sem valores');
        return null;
      }

      // ✅ CORREÇÃO: Buscar valor_adicional REAL da função Funcional
      const valorFuncional = valores.find(v => v.funcao === 'Funcional');
      
      console.log('🔍 [buscarTaxaMes] Buscando função Funcional:', {
        encontrada: !!valorFuncional,
        valorFuncional: valorFuncional ? {
          funcao: valorFuncional.funcao,
          valor_base: valorFuncional.valor_base,
          valor_adicional: valorFuncional.valor_adicional,
          tem_valor_adicional: valorFuncional.valor_adicional !== null && valorFuncional.valor_adicional !== undefined,
          valor_adicional_maior_que_zero: valorFuncional.valor_adicional !== null && 
                                          valorFuncional.valor_adicional !== undefined && 
                                          valorFuncional.valor_adicional > 0
        } : null
      });
      
      if (!valorFuncional) {
        console.log('⚠️ [buscarTaxaMes] Função Funcional não encontrada');
        console.log('🔍 [buscarTaxaMes] Funções disponíveis:', valores.map(v => v.funcao));
        return null;
      }

      // ⚠️ AVISO: Detectar se valor_adicional está cadastrado como ZERO
      if (valorFuncional.valor_adicional !== null && 
          valorFuncional.valor_adicional !== undefined && 
          valorFuncional.valor_adicional === 0) {
        console.warn('⚠️ [buscarTaxaMes] ATENÇÃO: valor_adicional está cadastrado como ZERO!', {
          funcao: 'Funcional',
          valor_adicional: valorFuncional.valor_adicional,
          valor_base: valorFuncional.valor_base,
          tipo_calculo_adicional: tipoCalculoAdicional,
          acao: 'Ignorando valor_adicional = 0 e usando fallback (cálculo baseado em valor_base ou média)'
        });
      }

      // ✅ PRIORIDADE: Usar valor_adicional cadastrado (se existir E for > 0), senão calcular
      let taxaHoraAdicional: number;

      // ✅ CORREÇÃO CRÍTICA: Verificar se valor_adicional > 0 (não apenas se não é NULL)
      // Problema: valor_adicional pode estar cadastrado como 0.00, o que causava retorno de taxa zerada
      if (valorFuncional.valor_adicional !== null && 
          valorFuncional.valor_adicional !== undefined && 
          valorFuncional.valor_adicional > 0) {
        // ✅ Usar valor REAL cadastrado na tabela
        taxaHoraAdicional = valorFuncional.valor_adicional;
        console.log('✅ [buscarTaxaMes] Taxa de Hora Adicional (Excedente do Banco) REAL da tabela:', {
          funcao: 'Funcional',
          valor_adicional_cadastrado: valorFuncional.valor_adicional,
          taxaUtilizada: `R$ ${taxaHoraAdicional.toFixed(2)}`,
          observacao: 'Valor REAL da coluna valor_adicional (não calculado)'
        });
        return taxaHoraAdicional;
      } else if (tipoCalculoAdicional === 'normal') {
        // Fallback: calcular se não tiver valor cadastrado
        // CORREÇÃO: Usar soma em vez de multiplicação direta para evitar imprecisão de ponto flutuante
        // Ex: 194.50 * 1.15 = 223.67499999999998 (errado), mas 194.50 + (194.50 * 0.15) = 223.675 (correto)
        taxaHoraAdicional = Math.round((valorFuncional.valor_base + (valorFuncional.valor_base * 0.15)) * 100) / 100;
        console.log('⚠️ [buscarTaxaMes] Taxa de Hora Adicional calculada (fallback - normal):', {
          valorBase: valorFuncional.valor_base,
          percentual: '15%',
          taxaCalculada: `R$ ${taxaHoraAdicional.toFixed(2)}`,
          observacao: 'Calculado porque valor_adicional está NULL'
        });
        return taxaHoraAdicional;
      } else {
        // Media: média das três primeiras funções (Funcional, Técnico, ABAP)
        // IMPORTANTE: Usar nomes EXATOS do banco de dados
        const funcoesPrincipais = ['Funcional', 'Técnico (Instalação / Atualização)', 'ABAP - PL/SQL'];
        
        // Para cada função, usar valor_adicional se existir e > 0, senão calcular valor_base + 15%
        // CORREÇÃO: Usar soma para evitar imprecisão de ponto flutuante
        const valoresPrincipais = valores
          .filter(v => funcoesPrincipais.includes(v.funcao))
          .map(v => {
            const taxaExcedente = (v.valor_adicional && v.valor_adicional > 0) 
              ? v.valor_adicional 
              : Math.round((v.valor_base + (v.valor_base * 0.15)) * 100) / 100;
            
            return {
              funcao: v.funcao,
              valor_base: v.valor_base,
              valor_adicional: v.valor_adicional,
              taxa_excedente_usada: taxaExcedente
            };
          });

        console.log('🔍 [buscarTaxaMes] Calculando média das funções principais:', {
          funcoesPrincipais,
          valores_encontrados: valoresPrincipais,
          quantidade: valoresPrincipais.length
        });

        if (valoresPrincipais.length === 0) {
          console.log('⚠️ [buscarTaxaMes] Nenhum valor das funções principais encontrado');
          console.log('🔍 [buscarTaxaMes] Funções disponíveis:', valores.map(v => v.funcao));
          return null;
        }

        const soma = valoresPrincipais.reduce((acc, val) => acc + val.taxa_excedente_usada, 0);
        taxaHoraAdicional = soma / valoresPrincipais.length;

        console.log('✅ [buscarTaxaMes] Taxa de Hora Adicional (Excedente do Banco) calculada (média):', {
          funcoes: valoresPrincipais.length,
          detalhes: valoresPrincipais.map(v => ({
            funcao: v.funcao,
            valor_base: `R$ ${v.valor_base.toFixed(2)}`,
            valor_adicional: v.valor_adicional ? `R$ ${v.valor_adicional.toFixed(2)}` : 'NULL',
            taxa_usada: `R$ ${v.taxa_excedente_usada.toFixed(2)}`
          })),
          soma: `R$ ${soma.toFixed(2)}`,
          media: `R$ ${taxaHoraAdicional.toFixed(2)}`,
          observacao: 'Média calculada usando valor_adicional quando disponível, senão valor_base * 1.15'
        });
        return taxaHoraAdicional;
      }
    }

    if (tipoContrato === 'tickets' || tipoContrato === 'ambos') {
      console.log('🔍 [buscarTaxaMes] Buscando taxa de ticket excedente:', {
        tipoContrato,
        taxaMaisRecenteId: taxaMaisRecente.id
      });
      
      // Buscar valor de ticket excedente da tabela taxas_clientes
      // Diferentes clientes usam campos diferentes:
      // - VOTORANTIM, CSN: valor_ticket_excedente
      // - CHIESI: ticket_excedente_2 (Ticket Excedente)
      // - NIDEC: ticket_excedente
      // - EXXONMOBIL: NÃO AJUSTAR (regra personalizada futura)
      
      const { data: taxaDataRaw, error: taxaError } = await (supabase as any)
        .from('taxas_clientes')
        .select(`
          valor_ticket_excedente,
          ticket_excedente_2,
          ticket_excedente
        `)
        .eq('id', taxaMaisRecente.id)
        .single();
      
      const taxaData = taxaDataRaw as {
        valor_ticket_excedente: number | null;
        ticket_excedente_2: number | null;
        ticket_excedente: number | null;
      } | null;

      console.log('📊 [buscarTaxaMes] Dados de taxa de ticket retornados:', {
        taxaData,
        tem_valor_ticket_excedente: taxaData?.valor_ticket_excedente !== null,
        tem_ticket_excedente_2: taxaData?.ticket_excedente_2 !== null,
        tem_ticket_excedente: taxaData?.ticket_excedente !== null
      });

      if (taxaError) {
        console.error('❌ [buscarTaxaMes] Erro ao buscar valor de ticket excedente:', {
          taxaError,
          errorMessage: taxaError.message,
          taxa_id: taxaMaisRecente.id
        });
        throw new Error(`Erro ao buscar valor de ticket excedente: ${taxaError.message}`);
      }

      // Prioridade de busca:
      // 1. valor_ticket_excedente (VOTORANTIM, CSN)
      // 2. ticket_excedente_2 (CHIESI)
      // 3. ticket_excedente (NIDEC)
      if (taxaData) {
        const taxaTicketExcedente = 
          taxaData.valor_ticket_excedente || 
          taxaData.ticket_excedente_2 || 
          taxaData.ticket_excedente;

        if (taxaTicketExcedente) {
          console.log('✅ [buscarTaxaMes] Taxa de ticket excedente encontrada:', {
            valor: `R$ ${taxaTicketExcedente.toFixed(2)}`,
            campo_usado: taxaData.valor_ticket_excedente ? 'valor_ticket_excedente (VOTORANTIM/CSN)' :
                         taxaData.ticket_excedente_2 ? 'ticket_excedente_2 (CHIESI)' :
                         'ticket_excedente (NIDEC)'
          });
          return taxaTicketExcedente;
        } else {
          console.log('⚠️ [buscarTaxaMes] Taxa de ticket excedente não encontrada - todos os campos estão NULL:', {
            valor_ticket_excedente: taxaData.valor_ticket_excedente,
            ticket_excedente_2: taxaData.ticket_excedente_2,
            ticket_excedente: taxaData.ticket_excedente
          });
        }
      }

      console.log('⚠️ [buscarTaxaMes] Taxa de ticket excedente não encontrada');
    }

    console.log('⚠️ [buscarTaxaMes] Taxa encontrada mas sem valores configurados');
    console.log('🔍 [buscarTaxaMes] Resumo final:', {
      tipoContrato,
      taxa_id: taxaMaisRecente.id,
      resultado: 'null (sem valores)'
    });
    return null;
  } catch (error) {
    console.error('❌ [buscarTaxaMes] Erro ao buscar taxa do mês:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      empresaId,
      mes,
      ano,
      tipoContrato
    });
    throw new Error(
      `Erro ao buscar taxa do mês: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

/**
 * Gera descrição padronizada para faturamento de excedentes
 * 
 * Formato padrão:
 * "Excedente de [SALDO_NEGATIVO] horas no período [MES/ANO] - Valor: R$ [VALOR_EXCEDENTE]"
 * 
 * Inclui nome da empresa para contexto.
 * 
 * @param empresaNome - Nome da empresa cliente
 * @param saldoNegativo - Saldo negativo (valor absoluto) em formato HH:MM ou número
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2024)
 * @param valorExcedente - Valor monetário do excedente (R$)
 * @param tipoContrato - Tipo de contrato para determinar unidade (horas/tickets)
 * @returns Objeto com descrição formatada e metadados
 * 
 * @example
 * // Excedente de horas
 * gerarDescricaoFaturamento('SOUZA CRUZ', '10:30', 1, 2024, 1050, 'horas')
 * // {
 * //   descricao: "Excedente de 10:30 horas no período 01/2024 - Valor: R$ 1.050,00",
 * //   empresaNome: "SOUZA CRUZ",
 * //   periodo: "01/2024",
 * //   saldoNegativo: "10:30",
 * //   valorFaturar: 1050
 * // }
 * 
 * @example
 * // Excedente de tickets
 * gerarDescricaoFaturamento('WHIRLPOOL', 5, 1, 2024, 2500, 'tickets')
 * // {
 * //   descricao: "Excedente de 5 tickets no período 01/2024 - Valor: R$ 2.500,00",
 * //   empresaNome: "WHIRLPOOL",
 * //   periodo: "01/2024",
 * //   saldoNegativo: 5,
 * //   valorFaturar: 2500
 * // }
 * 
 * **Validates: Requirements 11.1-11.8**
 * **Property 26: Formato de Descrição de Faturamento**
 */
export function gerarDescricaoFaturamento(
  empresaNome: string,
  saldoNegativo: string | number,
  mes: number,
  ano: number,
  valorExcedente: number,
  tipoContrato: 'horas' | 'tickets' | 'ambos'
): DescricaoFaturamento {
  try {
    console.log('🔍 BancoHorasExcedentesService.gerarDescricaoFaturamento:', {
      empresaNome,
      saldoNegativo,
      mes,
      ano,
      valorExcedente,
      tipoContrato
    });

    // Formatar período (MM/YYYY)
    const periodo = `${String(mes).padStart(2, '0')}/${ano}`;

    // Formatar valor monetário (R$ 1.234,56)
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorExcedente);

    // Determinar unidade (horas ou tickets)
    const unidade = tipoContrato === 'tickets' ? 'tickets' : 'horas';

    // Gerar descrição padronizada
    const descricao = `Excedente de ${saldoNegativo} ${unidade} no período ${periodo} - Valor: ${valorFormatado}`;

    console.log('✅ Descrição gerada:', descricao);

    return {
      descricao,
      empresaNome,
      periodo,
      saldoNegativo,
      valorFaturar: valorExcedente
    };
  } catch (error) {
    console.error('❌ Erro ao gerar descrição de faturamento:', error);
    throw new Error(
      `Erro ao gerar descrição de faturamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    );
  }
}

/**
 * Classe principal do serviço de excedentes
 * 
 * Encapsula toda a lógica de cálculo de excedentes e geração de descrições
 * para faturamento, fornecendo uma interface limpa para uso em outros serviços.
 */
export class ExcedentesService {
  /**
   * Calcula excedente se saldo negativo
   * @see calcularExcedente
   */
  async calcularExcedente(
    empresaId: string,
    saldo: string | number,
    mes: number,
    ano: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos'
  ): Promise<ResultadoExcedente> {
    return calcularExcedente(empresaId, saldo, mes, ano, tipoContrato);
  }

  /**
   * Gera descrição para faturamento
   * @see gerarDescricaoFaturamento
   */
  gerarDescricaoFaturamento(
    empresaNome: string,
    saldoNegativo: string | number,
    mes: number,
    ano: number,
    valorExcedente: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos'
  ): DescricaoFaturamento {
    return gerarDescricaoFaturamento(
      empresaNome,
      saldoNegativo,
      mes,
      ano,
      valorExcedente,
      tipoContrato
    );
  }

  /**
   * Busca taxa mais antiga do mês
   * @see buscarTaxaMes
   */
  async buscarTaxaMes(
    empresaId: string,
    mes: number,
    ano: number,
    tipoContrato: 'horas' | 'tickets' | 'ambos'
  ): Promise<number | null> {
    return buscarTaxaMes(empresaId, mes, ano, tipoContrato);
  }
}

// Exportar instância singleton
export const excedentesService = new ExcedentesService();
