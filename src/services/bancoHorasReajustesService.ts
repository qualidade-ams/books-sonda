/**
 * Serviço de Reajustes de Banco de Horas
 * 
 * Gerencia reajustes manuais no banco de horas:
 * - Criação de reajustes (entrada/saída)
 * - Versionamento automático
 * - Recálculo de meses subsequentes
 * - Histórico de alterações
 * 
 * @module bancoHorasReajustesService
 * @requirements 18.1-18.10
 */

import { supabase } from '@/integrations/supabase/client';
import { bancoHorasService } from './bancoHorasService';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';

/**
 * Dados de um reajuste
 */
export interface ReajusteData {
  empresa_id: string;
  mes: number;
  ano: number;
  valor_horas: string; // Formato HH:MM
  tipo: 'entrada' | 'saida';
  observacao: string;
  created_by?: string;
}

/**
 * Input para criar reajuste (alias para ReajusteData)
 */
export type CriarReajusteInput = ReajusteData;

/**
 * Resultado da criação de reajuste
 */
export interface ReajusteResult {
  reajuste_id: string;
  versao_id: string;
  meses_recalculados: number;
}

/**
 * Erro de reajuste
 */
export class ReajusteError extends Error {
  constructor(
    public code: string,
    public message: string,
    public data?: Record<string, any>
  ) {
    super(message);
    this.name = 'ReajusteError';
  }
}

/**
 * Serviço de Reajustes de Banco de Horas
 */
export class BancoHorasReajustesService {
  /**
   * Cria um novo reajuste e recalcula meses subsequentes
   * 
   * Fluxo:
   * 1. Busca reajuste atual do mês
   * 2. Soma/subtrai o novo valor ao reajuste atual
   * 3. Cria registro de reajuste
   * 4. Cria versão para auditoria
   * 5. Recalcula mês atual e subsequentes
   * 
   * @param dados - Dados do reajuste
   * @returns Resultado com IDs e quantidade de meses recalculados
   * 
   * @example
   * const resultado = await reajustesService.criarReajuste({
   *   empresa_id: 'uuid',
   *   mes: 11,
   *   ano: 2025,
   *   valor_horas: '10:30',
   *   tipo: 'entrada',
   *   observacao: 'Ajuste de horas extras aprovadas'
   * });
   */
  async criarReajuste(dados: ReajusteData): Promise<ReajusteResult> {
    try {
      console.log('🔧 BancoHorasReajustesService.criarReajuste:', dados);

      // 1. Validar dados
      this.validarDados(dados);

      // 2. Buscar cálculo atual do mês
      const { data: calculoAtual, error: calculoError } = await supabase
        .from('banco_horas_calculos')
        .select('*')
        .eq('empresa_id', dados.empresa_id)
        .eq('mes', dados.mes)
        .eq('ano', dados.ano)
        .single();

      if (calculoError) {
        throw new ReajusteError(
          'CALCULO_NAO_ENCONTRADO',
          `Cálculo não encontrado para ${dados.mes}/${dados.ano}. Execute o cálculo primeiro.`,
          { mes: dados.mes, ano: dados.ano }
        );
      }

      // 3. Calcular novo valor de reajuste (soma ou subtrai do atual)
      const reajusteAtualMinutos = converterHorasParaMinutos(calculoAtual.reajustes_horas || '00:00');
      const novoValorMinutos = converterHorasParaMinutos(dados.valor_horas);
      
      let reajusteFinalMinutos: number;
      if (dados.tipo === 'entrada') {
        // Entrada: adiciona horas (positivo)
        reajusteFinalMinutos = reajusteAtualMinutos + novoValorMinutos;
      } else {
        // Saída: remove horas (negativo)
        reajusteFinalMinutos = reajusteAtualMinutos - novoValorMinutos;
      }

      const reajusteFinal = converterMinutosParaHoras(Math.abs(reajusteFinalMinutos));
      const reajusteFinalComSinal = reajusteFinalMinutos >= 0 ? reajusteFinal : `-${reajusteFinal}`;

      console.log('📊 Cálculo de reajuste:', {
        reajusteAtual: calculoAtual.reajustes_horas,
        novoValor: dados.valor_horas,
        tipo: dados.tipo,
        reajusteFinal: reajusteFinalComSinal
      });

      // 4. Criar registro de reajuste na tabela banco_horas_reajustes
      const dadosInsert = {
        empresa_id: dados.empresa_id,
        mes: dados.mes,
        ano: dados.ano,
        valor_reajuste_horas: dados.valor_horas,
        tipo_reajuste: dados.tipo,
        observacao: dados.observacao,
        ativo: true,
        created_by: dados.created_by
      };

      console.log('📝 Dados para inserir:', {
        ...dadosInsert,
        observacao_length: dados.observacao?.length,
        observacao_preview: dados.observacao?.substring(0, 50)
      });

      const { data: reajuste, error: reajusteError } = await supabase
        .from('banco_horas_reajustes')
        .insert(dadosInsert)
        .select()
        .single();

      if (reajusteError) {
        throw new ReajusteError(
          'ERRO_CRIAR_REAJUSTE',
          `Erro ao criar reajuste: ${reajusteError.message}`,
          { error: reajusteError }
        );
      }

      console.log('✅ Reajuste criado:', reajuste.id);

      // 5. Criar versão para auditoria
      const versaoId = await this.criarVersao(
        dados.empresa_id,
        dados.mes,
        dados.ano,
        calculoAtual,
        reajuste.id,
        dados.observacao
      );

      console.log('✅ Versão criada:', versaoId);

      // 6. Buscar parâmetros da empresa para saber quantos meses recalcular
      const { data: empresa, error: empresaError } = await supabase
        .from('empresas_clientes')
        .select('periodo_apuracao')
        .eq('id', dados.empresa_id)
        .single();

      if (empresaError || !empresa) {
        throw new ReajusteError(
          'EMPRESA_NAO_ENCONTRADA',
          'Empresa não encontrada',
          { empresa_id: dados.empresa_id }
        );
      }

      const periodoApuracao = empresa.periodo_apuracao || 3;

      // 7. Calcular quantos meses faltam até o fim do período
      const mesesParaRecalcular = this.calcularMesesParaRecalcular(
        dados.mes,
        dados.ano,
        periodoApuracao
      );

      console.log('📅 Meses para recalcular:', mesesParaRecalcular);

      // 8. Recalcular mês atual e subsequentes
      for (const { mes, ano } of mesesParaRecalcular) {
        console.log(`🔄 Recalculando ${mes}/${ano}...`);
        await bancoHorasService.calcularMes(dados.empresa_id, mes, ano);
      }

      console.log('✅ Reajuste concluído com sucesso!');

      return {
        reajuste_id: reajuste.id,
        versao_id: versaoId,
        meses_recalculados: mesesParaRecalcular.length
      };
    } catch (error) {
      console.error('❌ Erro ao criar reajuste:', error);
      
      if (error instanceof ReajusteError) {
        throw error;
      }

      throw new ReajusteError(
        'ERRO_INESPERADO',
        `Erro inesperado ao criar reajuste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { error }
      );
    }
  }

  /**
   * Busca todos os reajustes de um mês
   */
  async buscarReajustes(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('banco_horas_reajustes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ReajusteError(
        'ERRO_BUSCAR_REAJUSTES',
        `Erro ao buscar reajustes: ${error.message}`,
        { error }
      );
    }

    return data || [];
  }

  /**
   * Lista todos os reajustes de uma empresa (opcionalmente filtrados por período)
   */
  async listarReajustes(
    empresaId: string,
    mes?: number,
    ano?: number
  ): Promise<any[]> {
    let query = supabase
      .from('banco_horas_reajustes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('ativo', true);

    if (mes !== undefined) {
      query = query.eq('mes', mes);
    }

    if (ano !== undefined) {
      query = query.eq('ano', ano);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new ReajusteError(
        'ERRO_LISTAR_REAJUSTES',
        `Erro ao listar reajustes: ${error.message}`,
        { error }
      );
    }

    return data || [];
  }

  /**
   * Busca um reajuste específico por ID
   */
  async buscarReajuste(reajusteId: string): Promise<any> {
    const { data, error } = await supabase
      .from('banco_horas_reajustes')
      .select('*')
      .eq('id', reajusteId)
      .single();

    if (error) {
      throw new ReajusteError(
        'ERRO_BUSCAR_REAJUSTE',
        `Erro ao buscar reajuste: ${error.message}`,
        { reajusteId }
      );
    }

    return data;
  }

  /**
   * Desativa um reajuste (soft delete)
   */
  async desativarReajuste(reajusteId: string): Promise<void> {
    const { error } = await supabase
      .from('banco_horas_reajustes')
      .update({ ativo: false })
      .eq('id', reajusteId);

    if (error) {
      throw new ReajusteError(
        'ERRO_DESATIVAR_REAJUSTE',
        `Erro ao desativar reajuste: ${error.message}`,
        { reajusteId }
      );
    }
  }

  // ========== Métodos Privados ==========

  /**
   * Valida dados do reajuste
   */
  private validarDados(dados: ReajusteData): void {
    if (!dados.empresa_id?.trim()) {
      throw new ReajusteError(
        'EMPRESA_ID_OBRIGATORIO',
        'ID da empresa é obrigatório',
        { dados }
      );
    }

    if (dados.mes < 1 || dados.mes > 12) {
      throw new ReajusteError(
        'MES_INVALIDO',
        'Mês deve estar entre 1 e 12',
        { mes: dados.mes }
      );
    }

    if (dados.ano < 2020) {
      throw new ReajusteError(
        'ANO_INVALIDO',
        'Ano deve ser maior ou igual a 2020',
        { ano: dados.ano }
      );
    }

    if (!dados.valor_horas?.trim()) {
      throw new ReajusteError(
        'VALOR_OBRIGATORIO',
        'Valor de horas é obrigatório',
        { dados }
      );
    }

    // Validar formato HH:MM
    const regex = /^\d{1,4}:[0-5]\d$/;
    if (!regex.test(dados.valor_horas)) {
      throw new ReajusteError(
        'FORMATO_INVALIDO',
        'Formato de horas inválido. Use HH:MM (exemplo: 10:30)',
        { valor: dados.valor_horas }
      );
    }

    if (!dados.tipo || !['entrada', 'saida'].includes(dados.tipo)) {
      throw new ReajusteError(
        'TIPO_INVALIDO',
        'Tipo deve ser "entrada" ou "saida"',
        { tipo: dados.tipo }
      );
    }

    if (!dados.observacao?.trim()) {
      throw new ReajusteError(
        'OBSERVACAO_OBRIGATORIA',
        'Observação é obrigatória',
        { dados }
      );
    }
  }

  /**
   * Cria versão para auditoria
   */
  private async criarVersao(
    empresaId: string,
    mes: number,
    ano: number,
    calculoAnterior: any,
    reajusteId: string,
    observacao: string
  ): Promise<string> {
    // Buscar última versão para incrementar
    const { data: ultimaVersao } = await supabase
      .from('banco_horas_versoes')
      .select('versao')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .order('versao', { ascending: false })
      .limit(1)
      .single();

    const novaVersao = (ultimaVersao?.versao || 0) + 1;

    // Criar versão
    const { data: versao, error } = await supabase
      .from('banco_horas_versoes')
      .insert({
        empresa_id: empresaId,
        mes,
        ano,
        versao: novaVersao,
        reajuste_id: reajusteId,
        snapshot_calculo: calculoAnterior,
        observacao,
        tipo_alteracao: 'reajuste'
      })
      .select()
      .single();

    if (error) {
      throw new ReajusteError(
        'ERRO_CRIAR_VERSAO',
        `Erro ao criar versão: ${error.message}`,
        { error }
      );
    }

    return versao.id;
  }

  /**
   * Calcula quais meses precisam ser recalculados
   * 
   * Exemplo:
   * - Se reajuste em novembro (mês 11) e período é trimestral (3 meses):
   *   - Recalcula: novembro, dezembro, janeiro
   * - Se reajuste em dezembro (mês 12):
   *   - Recalcula: dezembro, janeiro
   * - Se reajuste em janeiro (mês 1):
   *   - Recalcula: apenas janeiro
   */
  private calcularMesesParaRecalcular(
    mesInicial: number,
    anoInicial: number,
    periodoApuracao: number
  ): Array<{ mes: number; ano: number }> {
    const meses: Array<{ mes: number; ano: number }> = [];
    
    let mesAtual = mesInicial;
    let anoAtual = anoInicial;

    // Adicionar mês inicial
    meses.push({ mes: mesAtual, ano: anoAtual });

    // Calcular quantos meses faltam até completar o período
    // Exemplo: se período é 3 e estamos no mês 2 do período, faltam 1 mês
    const posicaoNoPeriodo = (mesInicial - 1) % periodoApuracao;
    const mesesRestantes = periodoApuracao - posicaoNoPeriodo - 1;

    console.log('📊 Cálculo de meses para recalcular:', {
      mesInicial,
      periodoApuracao,
      posicaoNoPeriodo,
      mesesRestantes
    });

    // Adicionar meses subsequentes
    for (let i = 0; i < mesesRestantes; i++) {
      mesAtual++;
      if (mesAtual > 12) {
        mesAtual = 1;
        anoAtual++;
      }
      meses.push({ mes: mesAtual, ano: anoAtual });
    }

    return meses;
  }
}

// Exportar instância singleton
export const reajustesService = new BancoHorasReajustesService();
