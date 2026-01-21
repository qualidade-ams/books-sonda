/**
 * Serviço de Reajustes Manuais de Banco de Horas
 * 
 * Implementa a lógica de reajustes manuais com observação obrigatória:
 * - Cria reajustes com validação de observação mínima
 * - Aplica reajustes e recalcula meses subsequentes
 * - Lista histórico de reajustes
 * - Integra com versionamento para criar versões
 * - Adiciona audit log para todas as ações
 * 
 * @module bancoHorasReajustesService
 * @requirements 9.1-9.11, 13.1-13.10
 */

import { supabase } from '@/integrations/supabase/client';
import { bancoHorasService } from './bancoHorasService';
import { bancoHorasVersionamentoService } from './bancoHorasVersionamentoService';
import type { BancoHorasReajuste, BancoHorasCalculo } from '@/types/bancoHoras';
import { 
  converterHorasParaMinutos, 
  converterMinutosParaHoras 
} from '@/utils/horasUtils';

/**
 * Erro de reajuste
 */
export class ReajusteError extends Error {
  constructor(
    public operation: string,
    public message: string,
    public data: Record<string, any>
  ) {
    super(message);
    this.name = 'ReajusteError';
  }
}

/**
 * Dados para criação de reajuste
 */
export interface CriarReajusteInput {
  /** ID da empresa */
  empresaId: string;
  
  /** Mês do reajuste (1-12) */
  mes: number;
  
  /** Ano do reajuste */
  ano: number;
  
  /** Valor do reajuste em horas (formato HH:MM, pode ser negativo com sinal -) */
  valorReajusteHoras?: string;
  
  /** Valor do reajuste em tickets (pode ser negativo) */
  valorReajusteTickets?: number;
  
  /** Observação privada obrigatória (mínimo 10 caracteres) */
  observacaoPrivada: string;
  
  /** ID do usuário que está criando o reajuste */
  usuarioId: string;
}

/**
 * Resultado da aplicação de reajuste
 */
export interface ResultadoAplicacaoReajuste {
  /** Reajuste criado */
  reajuste: BancoHorasReajuste;
  
  /** Cálculo recalculado do mês do reajuste */
  calculoAtualizado: BancoHorasCalculo;
  
  /** Número de meses subsequentes recalculados */
  mesesRecalculados: number;
  
  /** IDs dos cálculos recalculados */
  calculosRecalculados: string[];
}

/**
 * Classe do serviço de reajustes
 * 
 * Responsável por gerenciar reajustes manuais nos cálculos de banco de horas,
 * garantindo validação, versionamento e auditoria completa de todas as ações.
 * 
 * **Validates: Requirements 9.1-9.11, 13.1-13.10**
 * **Property 16: Reajuste Requer Observação**
 * **Property 17: Reajuste Gera Nova Versão**
 * **Property 18: Reajuste Recalcula Meses Subsequentes**
 * **Property 21: Auditoria de Todas as Ações**
 */
export class BancoHorasReajustesService {
  /**
   * Cria um novo reajuste com validação de observação
   * 
   * Valida que a observação tenha no mínimo 10 caracteres e que pelo menos
   * um valor de reajuste (horas ou tickets) seja fornecido. O reajuste é
   * persistido mas não aplicado automaticamente - use aplicarReajuste() para isso.
   * 
   * @param input - Dados do reajuste a ser criado
   * @returns Reajuste criado
   * 
   * @example
   * const reajuste = await reajustesService.criarReajuste({
   *   empresaId: 'uuid-empresa',
   *   mes: 3,
   *   ano: 2024,
   *   valorReajusteHoras: '10:30',
   *   observacaoPrivada: 'Ajuste devido a horas extras não contabilizadas',
   *   usuarioId: 'uuid-usuario'
   * });
   * 
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.11**
   * **Property 16: Reajuste Requer Observação**
   */
  async criarReajuste(input: CriarReajusteInput): Promise<BancoHorasReajuste> {
    try {
      console.log('📝 BancoHorasReajustesService.criarReajuste:', {
        empresaId: input.empresaId,
        mes: input.mes,
        ano: input.ano,
        valorHoras: input.valorReajusteHoras,
        valorTickets: input.valorReajusteTickets
      });

      // Validar observação privada (mínimo 10 caracteres)
      if (!input.observacaoPrivada || input.observacaoPrivada.trim().length < 10) {
        throw new ReajusteError(
          'validar_observacao',
          'Observação privada deve ter no mínimo 10 caracteres',
          { observacaoLength: input.observacaoPrivada?.length || 0 }
        );
      }

      // Validar que pelo menos um valor foi fornecido
      if (!input.valorReajusteHoras && !input.valorReajusteTickets) {
        throw new ReajusteError(
          'validar_valores',
          'Pelo menos um valor de reajuste (horas ou tickets) deve ser fornecido',
          { valorHoras: input.valorReajusteHoras, valorTickets: input.valorReajusteTickets }
        );
      }

      // Buscar cálculo existente para o mês/ano
      const { data: calculoExistente, error: erroCalculo } = await supabase
        .from('banco_horas_calculos')
        .select('id')
        .eq('empresa_id', input.empresaId)
        .eq('mes', input.mes)
        .eq('ano', input.ano)
        .order('versao', { ascending: false })
        .limit(1)
        .single();

      if (erroCalculo && erroCalculo.code !== 'PGRST116') {
        throw new ReajusteError(
          'buscar_calculo',
          `Erro ao buscar cálculo: ${erroCalculo.message}`,
          { empresaId: input.empresaId, mes: input.mes, ano: input.ano }
        );
      }

      // Se não existe cálculo, criar um primeiro
      let calculoId: string;
      if (!calculoExistente) {
        console.log('ℹ️ Cálculo não existe, criando primeiro...');
        const novoCalculo = await bancoHorasService.calcularMes(
          input.empresaId,
          input.mes,
          input.ano
        );
        calculoId = novoCalculo.id;
      } else {
        calculoId = calculoExistente.id;
      }

      // Determinar tipo de reajuste (positivo ou negativo)
      let tipoReajuste: 'positivo' | 'negativo' = 'positivo';
      
      if (input.valorReajusteHoras) {
        const minutos = converterHorasParaMinutos(input.valorReajusteHoras);
        if (minutos < 0) {
          tipoReajuste = 'negativo';
        }
      } else if (input.valorReajusteTickets && input.valorReajusteTickets < 0) {
        tipoReajuste = 'negativo';
      }

      // Inserir reajuste no banco
      const { data: reajuste, error: erroReajuste } = await supabase
        .from('banco_horas_reajustes')
        .insert({
          calculo_id: calculoId,
          empresa_id: input.empresaId,
          mes: input.mes,
          ano: input.ano,
          valor_reajuste_horas: input.valorReajusteHoras,
          valor_reajuste_tickets: input.valorReajusteTickets,
          tipo_reajuste: tipoReajuste,
          observacao_privada: input.observacaoPrivada.trim(),
          created_at: new Date().toISOString(),
          created_by: input.usuarioId,
          ativo: true
        })
        .select()
        .single();

      if (erroReajuste || !reajuste) {
        throw new ReajusteError(
          'criar_reajuste',
          `Erro ao criar reajuste: ${erroReajuste?.message || 'Erro desconhecido'}`,
          input
        );
      }

      console.log('✅ Reajuste criado:', reajuste.id);

      // Registrar no audit log
      await this.registrarAuditLog(
        'reajuste_criado',
        input.empresaId,
        calculoId,
        {
          reajusteId: reajuste.id,
          mes: input.mes,
          ano: input.ano,
          valorHoras: input.valorReajusteHoras,
          valorTickets: input.valorReajusteTickets,
          tipoReajuste,
          observacao: input.observacaoPrivada
        },
        input.usuarioId
      );

      return reajuste as BancoHorasReajuste;
    } catch (error) {
      console.error('❌ Erro ao criar reajuste:', error);
      
      if (error instanceof ReajusteError) {
        throw error;
      }

      throw new ReajusteError(
        'criar_reajuste',
        `Erro ao criar reajuste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        input
      );
    }
  }

  /**
   * Aplica reajuste e recalcula mês e meses subsequentes
   * 
   * Após criar um reajuste, esta função deve ser chamada para aplicá-lo ao cálculo.
   * Ela recalcula o mês do reajuste e todos os meses subsequentes até o fim do
   * período de apuração, criando novas versões para cada cálculo afetado.
   * 
   * @param reajusteId - ID do reajuste a ser aplicado
   * @param usuarioId - ID do usuário que está aplicando o reajuste
   * @returns Resultado da aplicação com cálculos recalculados
   * 
   * @example
   * const resultado = await reajustesService.aplicarReajuste(
   *   'uuid-reajuste',
   *   'uuid-usuario'
   * );
   * console.log(`${resultado.mesesRecalculados} meses foram recalculados`);
   * 
   * **Validates: Requirements 9.6, 9.7, 9.8**
   * **Property 17: Reajuste Gera Nova Versão**
   * **Property 18: Reajuste Recalcula Meses Subsequentes**
   */
  async aplicarReajuste(
    reajusteId: string,
    usuarioId: string
  ): Promise<ResultadoAplicacaoReajuste> {
    try {
      console.log('🔄 BancoHorasReajustesService.aplicarReajuste:', {
        reajusteId,
        usuarioId
      });

      // Buscar reajuste
      const { data: reajuste, error: erroReajuste } = await supabase
        .from('banco_horas_reajustes')
        .select('*')
        .eq('id', reajusteId)
        .single();

      if (erroReajuste || !reajuste) {
        throw new ReajusteError(
          'buscar_reajuste',
          `Reajuste não encontrado: ${erroReajuste?.message || 'ID inválido'}`,
          { reajusteId }
        );
      }

      // Buscar cálculo atual antes do recálculo
      const { data: calculoAnterior, error: erroCalculoAnterior } = await supabase
        .from('banco_horas_calculos')
        .select('*')
        .eq('id', reajuste.calculo_id)
        .single();

      if (erroCalculoAnterior || !calculoAnterior) {
        throw new ReajusteError(
          'buscar_calculo_anterior',
          `Cálculo não encontrado: ${erroCalculoAnterior?.message || 'ID inválido'}`,
          { calculoId: reajuste.calculo_id }
        );
      }

      // Recalcular mês do reajuste
      console.log(`🔄 Recalculando mês ${reajuste.mes}/${reajuste.ano}...`);
      const calculoAtualizado = await bancoHorasService.calcularMes(
        reajuste.empresa_id,
        reajuste.mes,
        reajuste.ano
      );

      // Criar versão para o cálculo recalculado
      await bancoHorasVersionamentoService.criarVersao(
        calculoAtualizado.id,
        usuarioId,
        `Reajuste aplicado: ${reajuste.observacao_privada}`,
        'reajuste',
        calculoAnterior,
        calculoAtualizado
      );

      console.log('✅ Versão criada para cálculo recalculado');

      // Recalcular meses subsequentes
      console.log('🔄 Recalculando meses subsequentes...');
      await bancoHorasService.recalcularAPartirDe(
        reajuste.empresa_id,
        reajuste.mes,
        reajuste.ano
      );

      // Buscar todos os cálculos recalculados para contar
      const { data: calculosRecalculados, error: erroCalculosRecalculados } = await supabase
        .from('banco_horas_calculos')
        .select('id')
        .eq('empresa_id', reajuste.empresa_id)
        .gte('mes', reajuste.mes)
        .gte('ano', reajuste.ano)
        .order('ano', { ascending: true })
        .order('mes', { ascending: true });

      if (erroCalculosRecalculados) {
        console.warn('⚠️ Erro ao buscar cálculos recalculados:', erroCalculosRecalculados);
      }

      const calculosIds = calculosRecalculados?.map(c => c.id) || [];
      const mesesRecalculados = calculosIds.length;

      console.log(`✅ ${mesesRecalculados} meses recalculados`);

      // Registrar no audit log
      await this.registrarAuditLog(
        'reajuste_aplicado',
        reajuste.empresa_id,
        calculoAtualizado.id,
        {
          reajusteId,
          mes: reajuste.mes,
          ano: reajuste.ano,
          mesesRecalculados,
          calculosRecalculados: calculosIds
        },
        usuarioId
      );

      return {
        reajuste: reajuste as BancoHorasReajuste,
        calculoAtualizado,
        mesesRecalculados,
        calculosRecalculados: calculosIds
      };
    } catch (error) {
      console.error('❌ Erro ao aplicar reajuste:', error);
      
      if (error instanceof ReajusteError) {
        throw error;
      }

      throw new ReajusteError(
        'aplicar_reajuste',
        `Erro ao aplicar reajuste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { reajusteId, usuarioId }
      );
    }
  }

  /**
   * Lista histórico de reajustes de uma empresa
   * 
   * Retorna todos os reajustes de uma empresa, opcionalmente filtrados por
   * período específico. Os reajustes são ordenados do mais recente para o mais antigo.
   * 
   * @param empresaId - ID da empresa
   * @param mes - Mês opcional para filtrar (1-12)
   * @param ano - Ano opcional para filtrar
   * @returns Lista de reajustes ordenada por data (mais recente primeiro)
   * 
   * @example
   * // Todos os reajustes da empresa
   * const todosReajustes = await reajustesService.listarReajustes('uuid-empresa');
   * 
   * // Reajustes de um mês específico
   * const reajustesMes = await reajustesService.listarReajustes('uuid-empresa', 3, 2024);
   * 
   * **Validates: Requirements 9.9, 9.10**
   */
  async listarReajustes(
    empresaId: string,
    mes?: number,
    ano?: number
  ): Promise<BancoHorasReajuste[]> {
    try {
      console.log('📋 BancoHorasReajustesService.listarReajustes:', {
        empresaId,
        mes,
        ano
      });

      let query = supabase
        .from('banco_horas_reajustes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      // Aplicar filtros opcionais
      if (mes !== undefined) {
        query = query.eq('mes', mes);
      }

      if (ano !== undefined) {
        query = query.eq('ano', ano);
      }

      const { data: reajustes, error } = await query;

      if (error) {
        throw new ReajusteError(
          'listar_reajustes',
          `Erro ao listar reajustes: ${error.message}`,
          { empresaId, mes, ano }
        );
      }

      console.log(`✅ ${reajustes?.length || 0} reajustes encontrados`);

      return (reajustes || []) as BancoHorasReajuste[];
    } catch (error) {
      console.error('❌ Erro ao listar reajustes:', error);
      
      if (error instanceof ReajusteError) {
        throw error;
      }

      throw new ReajusteError(
        'listar_reajustes',
        `Erro ao listar reajustes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { empresaId, mes, ano }
      );
    }
  }

  /**
   * Busca reajuste específico por ID
   * 
   * @param reajusteId - ID do reajuste
   * @returns Reajuste encontrado
   */
  async buscarReajuste(reajusteId: string): Promise<BancoHorasReajuste> {
    try {
      const { data: reajuste, error } = await supabase
        .from('banco_horas_reajustes')
        .select('*')
        .eq('id', reajusteId)
        .single();

      if (error || !reajuste) {
        throw new ReajusteError(
          'buscar_reajuste',
          `Reajuste não encontrado: ${error?.message || 'ID inválido'}`,
          { reajusteId }
        );
      }

      return reajuste as BancoHorasReajuste;
    } catch (error) {
      if (error instanceof ReajusteError) {
        throw error;
      }

      throw new ReajusteError(
        'buscar_reajuste',
        `Erro ao buscar reajuste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { reajusteId }
      );
    }
  }

  /**
   * Inativa um reajuste (soft delete)
   * 
   * Reajustes não podem ser deletados permanentemente para manter auditoria,
   * mas podem ser inativados. Após inativar, é necessário recalcular os meses
   * afetados para remover o efeito do reajuste.
   * 
   * @param reajusteId - ID do reajuste a inativar
   * @param usuarioId - ID do usuário que está inativando
   * @param motivo - Motivo da inativação
   */
  async inativarReajuste(
    reajusteId: string,
    usuarioId: string,
    motivo: string
  ): Promise<void> {
    try {
      console.log('🗑️ BancoHorasReajustesService.inativarReajuste:', {
        reajusteId,
        usuarioId,
        motivo
      });

      // Buscar reajuste
      const reajuste = await this.buscarReajuste(reajusteId);

      // Inativar reajuste
      const { error } = await supabase
        .from('banco_horas_reajustes')
        .update({ ativo: false })
        .eq('id', reajusteId);

      if (error) {
        throw new ReajusteError(
          'inativar_reajuste',
          `Erro ao inativar reajuste: ${error.message}`,
          { reajusteId }
        );
      }

      console.log('✅ Reajuste inativado');

      // Registrar no audit log
      await this.registrarAuditLog(
        'reajuste_inativado',
        reajuste.empresa_id,
        reajuste.calculo_id,
        {
          reajusteId,
          mes: reajuste.mes,
          ano: reajuste.ano,
          motivo
        },
        usuarioId
      );

      // Recalcular meses afetados
      console.log('🔄 Recalculando meses afetados...');
      await bancoHorasService.recalcularAPartirDe(
        reajuste.empresa_id,
        reajuste.mes,
        reajuste.ano
      );

      console.log('✅ Meses recalculados após inativação');
    } catch (error) {
      console.error('❌ Erro ao inativar reajuste:', error);
      
      if (error instanceof ReajusteError) {
        throw error;
      }

      throw new ReajusteError(
        'inativar_reajuste',
        `Erro ao inativar reajuste: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { reajusteId, usuarioId }
      );
    }
  }

  // ========== Métodos Auxiliares Privados ==========

  /**
   * Registra ação no audit log
   * 
   * Todas as ações de reajuste são registradas no audit log para
   * rastreabilidade completa e conformidade.
   * 
   * **Validates: Requirements 13.1, 13.2, 13.3**
   * **Property 21: Auditoria de Todas as Ações**
   */
  private async registrarAuditLog(
    acao: string,
    empresaId: string,
    calculoId: string,
    dadosAcao: Record<string, any>,
    usuarioId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('banco_horas_audit_log')
        .insert({
          empresa_id: empresaId,
          calculo_id: calculoId,
          acao,
          descricao: this.gerarDescricaoAcao(acao, dadosAcao),
          dados_acao: dadosAcao,
          created_at: new Date().toISOString(),
          created_by: usuarioId
        });

      if (error) {
        console.error('⚠️ Erro ao registrar audit log:', error);
        // Não lançar erro para não interromper operação principal
      } else {
        console.log('📝 Audit log registrado:', acao);
      }
    } catch (error) {
      console.error('⚠️ Erro ao registrar audit log:', error);
      // Não lançar erro para não interromper operação principal
    }
  }

  /**
   * Gera descrição legível para ação de audit log
   */
  private gerarDescricaoAcao(acao: string, dados: Record<string, any>): string {
    switch (acao) {
      case 'reajuste_criado':
        return `Reajuste criado para ${dados.mes}/${dados.ano}: ${dados.valorHoras || ''} ${dados.valorTickets || ''}`;
      
      case 'reajuste_aplicado':
        return `Reajuste aplicado para ${dados.mes}/${dados.ano}, ${dados.mesesRecalculados} meses recalculados`;
      
      case 'reajuste_inativado':
        return `Reajuste inativado para ${dados.mes}/${dados.ano}: ${dados.motivo}`;
      
      default:
        return `Ação ${acao} executada`;
    }
  }
}

// Exportar instância singleton
export const bancoHorasReajustesService = new BancoHorasReajustesService();
