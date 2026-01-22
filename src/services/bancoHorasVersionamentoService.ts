/**
 * Serviço de Versionamento e Histórico de Banco de Horas
 * 
 * Implementa o controle de versões e histórico completo de cálculos:
 * - Cria snapshots imutáveis de cada cálculo
 * - Mantém histórico completo de todas as mudanças
 * - Permite comparação entre versões (diff)
 * - Garante rastreabilidade total com audit trail
 * 
 * @module bancoHorasVersionamentoService
 * @requirements 12.1-12.10
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  BancoHorasVersao, 
  BancoHorasCalculo,
  DiferencasVersao 
} from '@/types/bancoHoras';

/**
 * Erro de versionamento
 */
export class VersionamentoError extends Error {
  constructor(
    public operation: string,
    public message: string,
    public data: Record<string, any>
  ) {
    super(message);
    this.name = 'VersionamentoError';
  }
}

/**
 * Classe do serviço de versionamento
 * 
 * Responsável por gerenciar o histórico completo de versões dos cálculos,
 * garantindo imutabilidade e rastreabilidade total de todas as mudanças.
 * 
 * **Validates: Requirements 12.1-12.10**
 * **Property 17: Reajuste Gera Nova Versão**
 * **Property 19: Imutabilidade de Versões**
 * **Property 20: Histórico Completo Preservado**
 */
export class BancoHorasVersionamentoService {
  /**
   * Cria nova versão do cálculo com snapshot completo
   * 
   * Armazena um snapshot completo dos dados antes e depois da mudança,
   * permitindo rastreamento total e comparação entre versões.
   * 
   * @param calculoId - ID do cálculo sendo versionado
   * @param usuarioId - ID do usuário que está criando a versão
   * @param motivo - Explicação da mudança
   * @param tipoMudanca - Categoria da mudança (reajuste, recalculo, correcao)
   * @param dadosAnteriores - Snapshot dos dados antes da mudança
   * @param dadosNovos - Snapshot dos dados após a mudança
   * @returns Versão criada
   * 
   * @example
   * const versao = await versionamentoService.criarVersao(
   *   'uuid-calculo',
   *   'uuid-usuario',
   *   'Reajuste de 10 horas aplicado',
   *   'reajuste',
   *   calculoAnterior,
   *   calculoNovo
   * );
   * 
   * **Validates: Requirements 12.1, 12.2, 12.3, 12.4**
   * **Property 17: Reajuste Gera Nova Versão**
   */
  async criarVersao(
    calculoId: string,
    usuarioId: string,
    motivo: string,
    tipoMudanca: 'reajuste' | 'recalculo' | 'correcao' = 'recalculo',
    dadosAnteriores?: Record<string, any>,
    dadosNovos?: Record<string, any>
  ): Promise<BancoHorasVersao> {
    try {
      console.log('📝 BancoHorasVersionamentoService.criarVersao:', {
        calculoId,
        usuarioId,
        tipoMudanca,
        motivo
      });

      // Buscar cálculo atual para obter versão
      const { data: calculoAtual, error: erroCalculo } = await supabase
        .from('banco_horas_calculos')
        .select('*')
        .eq('id', calculoId)
        .single();

      if (erroCalculo || !calculoAtual) {
        throw new VersionamentoError(
          'buscar_calculo',
          `Cálculo não encontrado: ${erroCalculo?.message || 'ID inválido'}`,
          { calculoId }
        );
      }

      // Se não foram fornecidos dados anteriores, buscar versão anterior
      let snapshotAnterior = dadosAnteriores;
      let versaoAnterior = calculoAtual.versao - 1;

      if (!snapshotAnterior && versaoAnterior > 0) {
        const { data: calculoAnterior } = await supabase
          .from('banco_horas_calculos')
          .select('*')
          .eq('empresa_id', calculoAtual.empresa_id)
          .eq('mes', calculoAtual.mes)
          .eq('ano', calculoAtual.ano)
          .eq('versao', versaoAnterior)
          .single();

        if (calculoAnterior) {
          snapshotAnterior = this.criarSnapshot(calculoAnterior);
        }
      }

      // Se ainda não temos dados anteriores, usar objeto vazio
      if (!snapshotAnterior) {
        snapshotAnterior = {};
        versaoAnterior = 0;
      }

      // Criar snapshot dos dados novos
      const snapshotNovo = dadosNovos || this.criarSnapshot(calculoAtual);

      // Inserir versão no banco
      const { data: versao, error: erroVersao } = await supabase
        .from('banco_horas_versoes')
        .insert({
          calculo_id: calculoId,
          versao_anterior: versaoAnterior,
          versao_nova: calculoAtual.versao,
          dados_anteriores: snapshotAnterior,
          dados_novos: snapshotNovo,
          motivo,
          tipo_mudanca: tipoMudanca,
          created_at: new Date().toISOString(),
          created_by: usuarioId
        })
        .select()
        .single();

      if (erroVersao || !versao) {
        throw new VersionamentoError(
          'criar_versao',
          `Erro ao criar versão: ${erroVersao?.message || 'Erro desconhecido'}`,
          { calculoId, versaoAnterior, versaoNova: calculoAtual.versao }
        );
      }

      console.log('✅ Versão criada:', versao.id);

      return versao as BancoHorasVersao;
    } catch (error) {
      console.error('❌ Erro ao criar versão:', error);
      
      if (error instanceof VersionamentoError) {
        throw error;
      }

      throw new VersionamentoError(
        'criar_versao',
        `Erro ao criar versão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { calculoId, usuarioId }
      );
    }
  }

  /**
   * Lista histórico de versões de um cálculo
   * 
   * Retorna todas as versões de um cálculo específico, ordenadas da mais
   * recente para a mais antiga, permitindo visualização completa do histórico.
   * 
   * @param empresaId - ID da empresa
   * @param mes - Mês (1-12)
   * @param ano - Ano (ex: 2024)
   * @returns Lista de versões ordenada por data (mais recente primeiro)
   * 
   * @example
   * const versoes = await versionamentoService.listarVersoes('uuid-empresa', 1, 2024);
   * console.log(`Total de versões: ${versoes.length}`);
   * 
   * **Validates: Requirements 12.4, 12.5, 12.6**
   * **Property 20: Histórico Completo Preservado**
   */
  async listarVersoes(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<BancoHorasVersao[]> {
    try {
      console.log('📋 BancoHorasVersionamentoService.listarVersoes:', {
        empresaId,
        mes,
        ano
      });

      // NOVA ESTRUTURA: Buscar versões diretamente por empresa_id, mes e ano
      // (após migration 20260122000006_fix_banco_horas_versoes_structure.sql)
      const { data: versoesNovaEstrutura, error: erroNovaEstrutura } = await supabase
        .from('banco_horas_versoes')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano)
        .order('created_at', { ascending: false });

      // Se encontrou versões na nova estrutura, retornar
      if (!erroNovaEstrutura && versoesNovaEstrutura && versoesNovaEstrutura.length > 0) {
        console.log(`✅ ${versoesNovaEstrutura.length} versões encontradas (nova estrutura)`);
        return versoesNovaEstrutura as BancoHorasVersao[];
      }

      // FALLBACK: Buscar pela estrutura antiga (via calculo_id)
      console.log('ℹ️ Tentando buscar versões pela estrutura antiga...');

      // Buscar todos os cálculos do período
      const { data: calculos, error: erroCalculos } = await supabase
        .from('banco_horas_calculos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano);

      if (erroCalculos) {
        throw new VersionamentoError(
          'buscar_calculos',
          `Erro ao buscar cálculos: ${erroCalculos.message}`,
          { empresaId, mes, ano }
        );
      }

      if (!calculos || calculos.length === 0) {
        console.log('ℹ️ Nenhum cálculo encontrado para o período');
        return [];
      }

      // Buscar todas as versões dos cálculos
      const calculoIds = calculos.map(c => c.id);

      const { data: versoes, error: erroVersoes } = await supabase
        .from('banco_horas_versoes')
        .select('*')
        .in('calculo_id', calculoIds)
        .order('created_at', { ascending: false });

      if (erroVersoes) {
        throw new VersionamentoError(
          'listar_versoes',
          `Erro ao listar versões: ${erroVersoes.message}`,
          { empresaId, mes, ano }
        );
      }

      console.log(`✅ ${versoes?.length || 0} versões encontradas (estrutura antiga)`);

      return (versoes || []) as BancoHorasVersao[];
    } catch (error) {
      console.error('❌ Erro ao listar versões:', error);
      
      if (error instanceof VersionamentoError) {
        throw error;
      }

      throw new VersionamentoError(
        'listar_versoes',
        `Erro ao listar versões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { empresaId, mes, ano }
      );
    }
  }

  /**
   * Compara duas versões e retorna as diferenças
   * 
   * Analisa os snapshots de duas versões e identifica campos que foram
   * adicionados, removidos ou modificados, facilitando a visualização
   * das mudanças entre versões.
   * 
   * @param versao1 - Primeira versão (geralmente a mais antiga)
   * @param versao2 - Segunda versão (geralmente a mais recente)
   * @returns Objeto com diferenças entre as versões
   * 
   * @example
   * const diff = versionamentoService.compararVersoes(versaoAntiga, versaoNova);
   * console.log('Campos modificados:', diff.campos_modificados);
   * 
   * **Validates: Requirements 12.6, 12.9**
   */
  compararVersoes(
    versao1: BancoHorasVersao,
    versao2: BancoHorasVersao
  ): DiferencasVersao {
    try {
      console.log('🔍 BancoHorasVersionamentoService.compararVersoes:', {
        versao1Id: versao1.id,
        versao2Id: versao2.id
      });

      const dados1 = versao1.dados_novos;
      const dados2 = versao2.dados_novos;

      // Identificar campos adicionados (presentes em v2 mas não em v1)
      const camposAdicionados = Object.keys(dados2).filter(
        campo => !(campo in dados1)
      );

      // Identificar campos removidos (presentes em v1 mas não em v2)
      const camposRemovidos = Object.keys(dados1).filter(
        campo => !(campo in dados2)
      );

      // Identificar campos modificados (presentes em ambos mas com valores diferentes)
      const camposModificados: Array<{
        campo: string;
        valor_anterior: any;
        valor_novo: any;
      }> = [];

      for (const campo of Object.keys(dados1)) {
        if (campo in dados2) {
          const valor1 = dados1[campo];
          const valor2 = dados2[campo];

          // Comparar valores (considerando tipos diferentes)
          if (!this.valoresIguais(valor1, valor2)) {
            camposModificados.push({
              campo,
              valor_anterior: valor1,
              valor_novo: valor2
            });
          }
        }
      }

      const diferencas: DiferencasVersao = {
        campos_adicionados: camposAdicionados,
        campos_removidos: camposRemovidos,
        campos_modificados: camposModificados
      };

      console.log('✅ Diferenças identificadas:', {
        adicionados: camposAdicionados.length,
        removidos: camposRemovidos.length,
        modificados: camposModificados.length
      });

      return diferencas;
    } catch (error) {
      console.error('❌ Erro ao comparar versões:', error);
      
      throw new VersionamentoError(
        'comparar_versoes',
        `Erro ao comparar versões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { versao1Id: versao1.id, versao2Id: versao2.id }
      );
    }
  }

  /**
   * Busca versão específica por ID
   * 
   * @param versaoId - ID da versão
   * @returns Versão encontrada
   */
  async buscarVersao(versaoId: string): Promise<BancoHorasVersao> {
    try {
      const { data: versao, error } = await supabase
        .from('banco_horas_versoes')
        .select('*')
        .eq('id', versaoId)
        .single();

      if (error || !versao) {
        throw new VersionamentoError(
          'buscar_versao',
          `Versão não encontrada: ${error?.message || 'ID inválido'}`,
          { versaoId }
        );
      }

      return versao as BancoHorasVersao;
    } catch (error) {
      if (error instanceof VersionamentoError) {
        throw error;
      }

      throw new VersionamentoError(
        'buscar_versao',
        `Erro ao buscar versão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { versaoId }
      );
    }
  }

  /**
   * Busca versões por cálculo
   * 
   * @param calculoId - ID do cálculo
   * @returns Lista de versões do cálculo
   */
  async buscarVersoesPorCalculo(calculoId: string): Promise<BancoHorasVersao[]> {
    try {
      const { data: versoes, error } = await supabase
        .from('banco_horas_versoes')
        .select('*')
        .eq('calculo_id', calculoId)
        .order('versao_nova', { ascending: false });

      if (error) {
        throw new VersionamentoError(
          'buscar_versoes_por_calculo',
          `Erro ao buscar versões: ${error.message}`,
          { calculoId }
        );
      }

      return (versoes || []) as BancoHorasVersao[];
    } catch (error) {
      if (error instanceof VersionamentoError) {
        throw error;
      }

      throw new VersionamentoError(
        'buscar_versoes_por_calculo',
        `Erro ao buscar versões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        { calculoId }
      );
    }
  }

  // ========== Métodos Auxiliares Privados ==========

  /**
   * Cria snapshot de um cálculo
   * 
   * Remove campos de metadados que não são relevantes para comparação
   * (id, created_at, updated_at, etc.) e mantém apenas os dados de negócio.
   */
  private criarSnapshot(calculo: BancoHorasCalculo): Record<string, any> {
    const snapshot: Record<string, any> = {};

    // Campos a incluir no snapshot
    const camposRelevantes = [
      'empresa_id',
      'mes',
      'ano',
      'versao',
      'baseline_horas',
      'baseline_tickets',
      'repasses_mes_anterior_horas',
      'repasses_mes_anterior_tickets',
      'saldo_a_utilizar_horas',
      'saldo_a_utilizar_tickets',
      'consumo_horas',
      'consumo_tickets',
      'requerimentos_horas',
      'requerimentos_tickets',
      'reajustes_horas',
      'reajustes_tickets',
      'consumo_total_horas',
      'consumo_total_tickets',
      'saldo_horas',
      'saldo_tickets',
      'repasse_horas',
      'repasse_tickets',
      'excedentes_horas',
      'excedentes_tickets',
      'valor_excedentes_horas',
      'valor_excedentes_tickets',
      'valor_a_faturar',
      'observacao_publica',
      'is_fim_periodo',
      'taxa_hora_utilizada',
      'taxa_ticket_utilizada'
    ];

    for (const campo of camposRelevantes) {
      if (campo in calculo) {
        snapshot[campo] = (calculo as any)[campo];
      }
    }

    return snapshot;
  }

  /**
   * Compara dois valores considerando tipos diferentes
   * 
   * Trata null, undefined e strings vazias como equivalentes.
   * Compara números com tolerância para erros de ponto flutuante.
   */
  private valoresIguais(valor1: any, valor2: any): boolean {
    // Tratar null, undefined e string vazia como equivalentes
    const valor1Vazio = valor1 === null || valor1 === undefined || valor1 === '';
    const valor2Vazio = valor2 === null || valor2 === undefined || valor2 === '';

    if (valor1Vazio && valor2Vazio) {
      return true;
    }

    if (valor1Vazio !== valor2Vazio) {
      return false;
    }

    // Comparar números com tolerância
    if (typeof valor1 === 'number' && typeof valor2 === 'number') {
      return Math.abs(valor1 - valor2) < 0.01;
    }

    // Comparar objetos e arrays
    if (typeof valor1 === 'object' && typeof valor2 === 'object') {
      return JSON.stringify(valor1) === JSON.stringify(valor2);
    }

    // Comparação padrão
    return valor1 === valor2;
  }
}

// Exportar instância singleton
export const bancoHorasVersionamentoService = new BancoHorasVersionamentoService();
