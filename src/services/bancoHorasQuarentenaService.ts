/**
 * Serviço de Quarentena de Ajustes Retroativos do Banco de Horas
 * 
 * Implementa a lógica de:
 * - Fechamento de período (snapshot no momento da geração do book)
 * - Detecção de apontamentos extemporâneos (chegaram após fechamento)
 * - Criação de registros de quarentena para análise
 * - Aprovação/Descarte de ajustes retroativos
 * - Geração automática de reajustes quando aprovado
 * 
 * @module bancoHorasQuarentenaService
 */

import { supabase } from '@/integrations/supabase/client';
import { converterHorasParaMinutos, converterMinutosParaHoras } from '@/utils/horasUtils';

/**
 * Helper para queries em tabelas não tipadas no schema gerado do Supabase.
 * Evita erros "Type instantiation is excessively deep" ao encadear métodos.
 */
const db = supabase as any;

// ============================================================================
// INTERFACES
// ============================================================================

export interface FechamentoPeriodo {
  id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  snapshot_consumo_horas: string | null;
  snapshot_consumo_tickets: number | null;
  snapshot_requerimentos_horas: string | null;
  snapshot_requerimentos_tickets: number | null;
  snapshot_calculo: Record<string, any> | null;
  apontamentos_ids: string[] | null;
  tickets_ids: string[] | null;
  fechado_em: string;
  fechado_por: string | null;
  motivo: string | null;
  created_at: string;
}

export interface AjusteRetroativo {
  id: string;
  empresa_id: string;
  fechamento_id: string;
  mes_referencia: number;
  ano_referencia: number;
  tipo_dado: 'apontamento_horas' | 'apontamento_tickets' | 'requerimento';
  valor_anterior: string | null;
  valor_novo: string | null;
  diferenca: string | null;
  diferenca_minutos: number | null;
  detalhes_mudanca: Record<string, any> | null;
  status: 'pendente' | 'aprovado' | 'descartado';
  analisado_por: string | null;
  analisado_em: string | null;
  motivo_decisao: string | null;
  reajuste_gerado_id: string | null;
  mes_aplicacao: number | null;
  ano_aplicacao: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeteccaoResult {
  temDiferenca: boolean;
  tipo: 'apontamento_horas' | 'apontamento_tickets' | 'requerimento';
  valorAnterior: string;
  valorNovo: string;
  diferenca: string;
  diferencaMinutos: number;
  novosApontamentos: Array<{
    id_externo?: string;
    nro_chamado?: string;
    nro_solicitacao?: string;
    data_atividade?: string;
    tempo_gasto_minutos?: number;
    synced_at?: string;
  }>;
  apontamentosRemovidos: Array<{
    id_externo?: string;
    nro_chamado?: string;
    nro_solicitacao?: string;
  }>;
}

export interface AprovarAjusteInput {
  ajusteId: string;
  motivo: string;
  mesAplicacao: number;
  anoAplicacao: number;
}

export interface DescartarAjusteInput {
  ajusteId: string;
  motivo: string;
}

// ============================================================================
// CLASSE PRINCIPAL
// ============================================================================

export class BancoHorasQuarentenaService {

  // ==========================================================================
  // FECHAMENTO DE PERÍODO
  // ==========================================================================

  /**
   * Reabre o período do banco de horas, deletando o fechamento existente.
   * Chamado durante retificação/regeneração para permitir coleta de dados atualizados.
   * 
   * O snapshot da versão anterior já está preservado em books_versoes,
   * então é seguro deletar o fechamento para criar um novo com dados frescos.
   */
  async reabrirPeriodo(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<boolean> {
    try {
      console.log('🔓 BancoHorasQuarentenaService.reabrirPeriodo:', { empresaId, mes, ano });

      const { data: existente } = await db
        .from('banco_horas_fechamentos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();

      if (!existente) {
        console.log('ℹ️ Período já está aberto, nada a fazer');
        return true;
      }

      const { error } = await db
        .from('banco_horas_fechamentos')
        .delete()
        .eq('id', existente.id);

      if (error) {
        console.error('❌ Erro ao reabrir período:', error);
        return false;
      }

      console.log('✅ Período reaberto com sucesso. Fechamento removido:', existente.id);
      return true;
    } catch (error) {
      console.error('❌ Erro em reabrirPeriodo:', error);
      return false;
    }
  }

  /**
   * Fecha o período do banco de horas para uma empresa/mês/ano.
   * Chamado automaticamente quando o book é gerado.
   * 
   * Salva um snapshot completo dos dados atuais para comparação futura.
   */
  async fecharPeriodo(
    empresaId: string,
    mes: number,
    ano: number,
    userId?: string
  ): Promise<FechamentoPeriodo> {
    try {
      console.log('🔒 BancoHorasQuarentenaService.fecharPeriodo:', { empresaId, mes, ano });

      // Verificar se já existe fechamento para este período
      const { data: existente } = await db
        .from('banco_horas_fechamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();

      if (existente) {
        console.log('ℹ️ Período já fechado, retornando fechamento existente:', existente.id);
        return existente as FechamentoPeriodo;
      }

      // Buscar cálculo atual do banco de horas
      const { data: calculo } = await supabase
        .from('banco_horas_calculos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', mes)
        .eq('ano', ano)
        .maybeSingle();

      // Buscar IDs dos apontamentos que compõem o cálculo atual
      const apontamentosIds = await this.buscarIdsApontamentos(empresaId, mes, ano);
      const ticketsIds = await this.buscarIdsTickets(empresaId, mes, ano);

      // Criar registro de fechamento
      const { data: fechamento, error } = await db
        .from('banco_horas_fechamentos')
        .insert({
          empresa_id: empresaId,
          mes,
          ano,
          snapshot_consumo_horas: calculo?.consumo_horas || '00:00',
          snapshot_consumo_tickets: calculo?.consumo_tickets || 0,
          snapshot_requerimentos_horas: calculo?.requerimentos_horas || '00:00',
          snapshot_requerimentos_tickets: calculo?.requerimentos_tickets || 0,
          snapshot_calculo: calculo || {},
          apontamentos_ids: apontamentosIds,
          tickets_ids: ticketsIds,
          fechado_por: userId || null,
          motivo: 'Geração de Book'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao fechar período:', error);
        throw new Error(`Erro ao fechar período: ${error.message}`);
      }

      console.log('✅ Período fechado com sucesso:', {
        id: fechamento.id,
        apontamentos: apontamentosIds.length,
        tickets: ticketsIds.length
      });

      return fechamento as unknown as FechamentoPeriodo;
    } catch (error) {
      console.error('❌ Erro em fecharPeriodo:', error);
      throw error;
    }
  }

  /**
   * Verifica se um período está fechado para uma empresa
   */
  async isPeriodoFechado(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<boolean> {
    const { data } = await db
      .from('banco_horas_fechamentos')
      .select('id')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle();

    return !!data;
  }

  /**
   * Busca o fechamento de um período específico
   */
  async buscarFechamento(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<FechamentoPeriodo | null> {
    const { data } = await db
      .from('banco_horas_fechamentos')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle();

    return data as FechamentoPeriodo | null;
  }

  // ==========================================================================
  // DETECÇÃO DE EXTEMPORÂNEOS
  // ==========================================================================

  /**
   * Detecta apontamentos extemporâneos para um período fechado.
   * 
   * Compara os IDs dos apontamentos atuais com os IDs salvos no snapshot.
   * Apontamentos novos (que não estavam no snapshot) são extemporâneos.
   * 
   * Critério: data_atividade pertence ao mês fechado E 
   *           (synced_at > fechado_em OU id_externo não está no snapshot)
   */
  async detectarExtemporaneos(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<DeteccaoResult | null> {
    try {
      console.log('🔍 Detectando extemporâneos:', { empresaId, mes, ano });

      // Buscar fechamento do período
      const fechamento = await this.buscarFechamento(empresaId, mes, ano);
      if (!fechamento) {
        console.log('ℹ️ Período não está fechado, nada a detectar');
        return null;
      }

      // Buscar IDs atuais dos apontamentos para este período
      const idsAtuais = await this.buscarIdsApontamentos(empresaId, mes, ano);
      const idsSnapshot = fechamento.apontamentos_ids || [];

      // Detectar novos apontamentos (estão nos atuais mas não no snapshot)
      const novosIds = idsAtuais.filter(id => !idsSnapshot.includes(id));
      // Detectar removidos (estão no snapshot mas não nos atuais)
      const removidosIds = idsSnapshot.filter(id => !idsAtuais.includes(id));

      if (novosIds.length === 0 && removidosIds.length === 0) {
        console.log('✅ Nenhuma diferença detectada para horas');
        return null;
      }

      console.log('⚠️ Diferenças detectadas:', {
        novos: novosIds.length,
        removidos: removidosIds.length
      });

      // Buscar detalhes dos novos apontamentos
      let novosApontamentos: any[] = [];
      if (novosIds.length > 0) {
        const { data } = await db
          .from('apontamentos_aranda')
          .select('id_externo, nro_chamado, data_atividade, tempo_gasto_minutos, synced_at')
          .in('id_externo', novosIds);
        novosApontamentos = data || [];
      }

      // Buscar detalhes dos removidos
      let apontamentosRemovidos: any[] = [];
      if (removidosIds.length > 0) {
        const { data } = await db
          .from('apontamentos_aranda')
          .select('id_externo, nro_chamado')
          .in('id_externo', removidosIds);
        apontamentosRemovidos = data || [];
      }

      // Calcular diferença em minutos
      const minutosNovos = novosApontamentos.reduce(
        (acc, a) => acc + (a.tempo_gasto_minutos || 0), 0
      );
      // Para removidos, precisamos buscar o tempo que tinham
      let minutosRemovidos = 0;
      if (removidosIds.length > 0) {
        const { data: removidos } = await db
          .from('apontamentos_aranda')
          .select('tempo_gasto_minutos')
          .in('id_externo', removidosIds);
        minutosRemovidos = (removidos || []).reduce(
          (acc: number, a: any) => acc + (a.tempo_gasto_minutos || 0), 0
        );
      }

      const diferencaMinutos = minutosNovos - minutosRemovidos;
      const sinal = diferencaMinutos >= 0 ? '+' : '-';
      const absMinutos = Math.abs(diferencaMinutos);
      const hDif = Math.floor(absMinutos / 60);
      const mDif = absMinutos % 60;
      const diferenca = `${sinal}${String(hDif).padStart(2, '0')}:${String(mDif).padStart(2, '0')}`;

      // Calcular valor novo total
      const snapshotHoras = fechamento.snapshot_consumo_horas || '00:00';
      const snapshotMinutos = converterHorasParaMinutos(snapshotHoras);
      const novoTotalMinutos = snapshotMinutos + diferencaMinutos;
      const valorNovo = converterMinutosParaHoras(novoTotalMinutos);

      return {
        temDiferenca: true,
        tipo: 'apontamento_horas',
        valorAnterior: snapshotHoras,
        valorNovo,
        diferenca,
        diferencaMinutos,
        novosApontamentos,
        apontamentosRemovidos
      };
    } catch (error) {
      console.error('❌ Erro ao detectar extemporâneos:', error);
      throw error;
    }
  }

  /**
   * Detecta tickets extemporâneos para um período fechado.
   */
  async detectarExtemporaneosTickets(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<DeteccaoResult | null> {
    try {
      const fechamento = await this.buscarFechamento(empresaId, mes, ano);
      if (!fechamento) return null;

      const idsAtuais = await this.buscarIdsTickets(empresaId, mes, ano);
      const idsSnapshot = fechamento.tickets_ids || [];

      const novosIds = idsAtuais.filter(id => !idsSnapshot.includes(id));
      const removidosIds = idsSnapshot.filter(id => !idsAtuais.includes(id));

      if (novosIds.length === 0 && removidosIds.length === 0) {
        return null;
      }

      const diferencaTickets = novosIds.length - removidosIds.length;
      const snapshotTickets = fechamento.snapshot_consumo_tickets || 0;

      return {
        temDiferenca: true,
        tipo: 'apontamento_tickets',
        valorAnterior: String(snapshotTickets),
        valorNovo: String(snapshotTickets + diferencaTickets),
        diferenca: `${diferencaTickets >= 0 ? '+' : ''}${diferencaTickets}`,
        diferencaMinutos: diferencaTickets, // Usando como contagem
        novosApontamentos: novosIds.map(id => ({ nro_solicitacao: id })),
        apontamentosRemovidos: removidosIds.map(id => ({ nro_solicitacao: id }))
      };
    } catch (error) {
      console.error('❌ Erro ao detectar tickets extemporâneos:', error);
      throw error;
    }
  }

  // ==========================================================================
  // CRIAÇÃO DE AJUSTES NA QUARENTENA
  // ==========================================================================

  /**
   * Executa detecção completa e cria registros de quarentena se houver diferenças.
   * Chamado após cada sincronização com Aranda.
   */
  async executarDeteccaoCompleta(
    empresaId: string,
    mes: number,
    ano: number,
    syncId?: string
  ): Promise<AjusteRetroativo[]> {
    try {
      console.log('🔍 Executando detecção completa:', { empresaId, mes, ano });

      const ajustesCriados: AjusteRetroativo[] = [];

      // Detectar extemporâneos de horas
      const resultHoras = await this.detectarExtemporaneos(empresaId, mes, ano);
      if (resultHoras?.temDiferenca) {
        const fechamento = await this.buscarFechamento(empresaId, mes, ano);
        if (fechamento) {
          const ajuste = await this.criarAjusteRetroativo(
            empresaId,
            fechamento.id,
            mes,
            ano,
            resultHoras,
            syncId
          );
          if (ajuste) ajustesCriados.push(ajuste);
        }
      }

      // Detectar extemporâneos de tickets
      const resultTickets = await this.detectarExtemporaneosTickets(empresaId, mes, ano);
      if (resultTickets?.temDiferenca) {
        const fechamento = await this.buscarFechamento(empresaId, mes, ano);
        if (fechamento) {
          const ajuste = await this.criarAjusteRetroativo(
            empresaId,
            fechamento.id,
            mes,
            ano,
            resultTickets,
            syncId
          );
          if (ajuste) ajustesCriados.push(ajuste);
        }
      }

      console.log(`✅ Detecção completa: ${ajustesCriados.length} ajustes criados`);
      return ajustesCriados;
    } catch (error) {
      console.error('❌ Erro na detecção completa:', error);
      throw error;
    }
  }

  /**
   * Cria um registro de ajuste retroativo na quarentena
   */
  private async criarAjusteRetroativo(
    empresaId: string,
    fechamentoId: string,
    mes: number,
    ano: number,
    deteccao: DeteccaoResult,
    syncId?: string
  ): Promise<AjusteRetroativo | null> {
    try {
      // Verificar se já existe ajuste pendente para este período/tipo
      const { data: existente } = await db
        .from('banco_horas_ajustes_retroativos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('mes_referencia', mes)
        .eq('ano_referencia', ano)
        .eq('tipo_dado', deteccao.tipo)
        .eq('status', 'pendente')
        .maybeSingle();

      if (existente) {
        // Atualizar o existente com novos valores
        const { data: atualizado, error } = await db
          .from('banco_horas_ajustes_retroativos')
          .update({
            valor_anterior: deteccao.valorAnterior,
            valor_novo: deteccao.valorNovo,
            diferenca: deteccao.diferenca,
            diferenca_minutos: deteccao.diferencaMinutos,
            detalhes_mudanca: {
              novos: deteccao.novosApontamentos,
              removidos: deteccao.apontamentosRemovidos
            },
            sync_id: syncId || null
          })
          .eq('id', existente.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao atualizar ajuste existente:', error);
          return null;
        }
        console.log('🔄 Ajuste existente atualizado:', existente.id);
        return atualizado as unknown as AjusteRetroativo;
      }

      // Criar novo ajuste
      const { data: novoAjuste, error } = await db
        .from('banco_horas_ajustes_retroativos')
        .insert({
          empresa_id: empresaId,
          fechamento_id: fechamentoId,
          mes_referencia: mes,
          ano_referencia: ano,
          tipo_dado: deteccao.tipo,
          valor_anterior: deteccao.valorAnterior,
          valor_novo: deteccao.valorNovo,
          diferenca: deteccao.diferenca,
          diferenca_minutos: deteccao.diferencaMinutos,
          detalhes_mudanca: {
            novos: deteccao.novosApontamentos,
            removidos: deteccao.apontamentosRemovidos
          },
          status: 'pendente',
          sync_id: syncId || null
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar ajuste retroativo:', error);
        return null;
      }

      console.log('✅ Ajuste retroativo criado:', novoAjuste.id);
      return novoAjuste as unknown as AjusteRetroativo;
    } catch (error) {
      console.error('❌ Erro ao criar ajuste retroativo:', error);
      return null;
    }
  }

  // ==========================================================================
  // APROVAÇÃO E DESCARTE
  // ==========================================================================

  /**
   * Aprova um ajuste retroativo.
   * Atualiza o snapshot do fechamento com o novo consumo e recalcula o mês.
   */
  async aprovarAjuste(input: AprovarAjusteInput): Promise<AjusteRetroativo> {
    try {
      console.log('✅ Aprovando ajuste retroativo:', input);

      // Buscar o ajuste
      const { data: ajuste, error: ajusteError } = await db
        .from('banco_horas_ajustes_retroativos')
        .select('*')
        .eq('id', input.ajusteId)
        .single();

      if (ajusteError || !ajuste) {
        throw new Error(`Ajuste não encontrado: ${ajusteError?.message}`);
      }

      if (ajuste.status !== 'pendente') {
        throw new Error(`Ajuste já foi ${ajuste.status}`);
      }

      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Atualizar o snapshot do fechamento (incorporar apontamentos + novo consumo)
      await this.incorporarApontamentosNoSnapshot(ajuste);

      // 2. Recalcular o mês de referência (agora o snapshot tem o valor novo)
      // Precisamos forçar o recálculo deletando o cálculo existente
      const { error: deleteError } = await supabase
        .from('banco_horas_calculos')
        .delete()
        .eq('empresa_id', ajuste.empresa_id)
        .eq('mes', ajuste.mes_referencia)
        .eq('ano', ajuste.ano_referencia);

      if (deleteError) {
        console.warn('⚠️ Erro ao deletar cálculo para recálculo:', deleteError);
      }

      // 3. Atualizar status do ajuste
      const { data: ajusteAtualizado, error: updateError } = await db
        .from('banco_horas_ajustes_retroativos')
        .update({
          status: 'aprovado',
          analisado_por: user?.id || null,
          analisado_em: new Date().toISOString(),
          motivo_decisao: input.motivo,
          mes_aplicacao: ajuste.mes_referencia,
          ano_aplicacao: ajuste.ano_referencia
        })
        .eq('id', input.ajusteId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Erro ao atualizar ajuste: ${updateError.message}`);
      }

      console.log('✅ Ajuste aprovado. Snapshot atualizado e recálculo disparado.');
      return ajusteAtualizado as unknown as AjusteRetroativo;
    } catch (error) {
      console.error('❌ Erro ao aprovar ajuste:', error);
      throw error;
    }
  }

  /**
   * Descarta um ajuste retroativo com justificativa.
   */
  async descartarAjuste(input: DescartarAjusteInput): Promise<AjusteRetroativo> {
    try {
      console.log('🗑️ Descartando ajuste retroativo:', input);

      const { data: { user } } = await supabase.auth.getUser();

      const { data: ajusteAtualizado, error } = await db
        .from('banco_horas_ajustes_retroativos')
        .update({
          status: 'descartado',
          analisado_por: user?.id || null,
          analisado_em: new Date().toISOString(),
          motivo_decisao: input.motivo
        })
        .eq('id', input.ajusteId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao descartar ajuste: ${error.message}`);
      }

      // Atualizar snapshot para incluir os apontamentos descartados (evita re-detecção)
      const { data: ajusteCompleto } = await db
        .from('banco_horas_ajustes_retroativos')
        .select('*')
        .eq('id', input.ajusteId)
        .single();
      
      if (ajusteCompleto) {
        await this.atualizarSnapshotAposAprovacao(ajusteCompleto);
      }

      console.log('✅ Ajuste descartado');
      return ajusteAtualizado as unknown as AjusteRetroativo;
    } catch (error) {
      console.error('❌ Erro ao descartar ajuste:', error);
      throw error;
    }
  }

  // ==========================================================================
  // LISTAGEM E CONSULTAS
  // ==========================================================================

  /**
   * Lista ajustes retroativos pendentes (para a tela de aprovação)
   */
  async listarPendentes(empresaId?: string): Promise<AjusteRetroativo[]> {
    let query = db
      .from('banco_horas_ajustes_retroativos')
      .select('*')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    if (empresaId) {
      query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao listar pendentes:', error);
      throw error;
    }

    return (data || []) as unknown as AjusteRetroativo[];
  }

  /**
   * Lista todos os ajustes retroativos com filtros
   */
  async listarAjustes(filtros?: {
    empresaId?: string;
    status?: string;
    mesReferencia?: number;
    anoReferencia?: number;
  }): Promise<AjusteRetroativo[]> {
    let query = db
      .from('banco_horas_ajustes_retroativos')
      .select('*')
      .order('created_at', { ascending: false });

    if (filtros?.empresaId) {
      query = query.eq('empresa_id', filtros.empresaId);
    }
    if (filtros?.status) {
      query = query.eq('status', filtros.status);
    }
    if (filtros?.mesReferencia) {
      query = query.eq('mes_referencia', filtros.mesReferencia);
    }
    if (filtros?.anoReferencia) {
      query = query.eq('ano_referencia', filtros.anoReferencia);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erro ao listar ajustes:', error);
      throw error;
    }

    return (data || []) as unknown as AjusteRetroativo[];
  }

  /**
   * Conta ajustes pendentes (para badge de notificação)
   */
  async contarPendentes(): Promise<number> {
    const { count, error } = await db
      .from('banco_horas_ajustes_retroativos')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');

    if (error) return 0;
    return count || 0;
  }

  // ==========================================================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ==========================================================================

  /**
   * Atualiza o snapshot do fechamento para incluir os apontamentos que foram
   * aprovados ou descartados, evitando que sejam detectados novamente.
   */
  private async atualizarSnapshotAposAprovacao(ajuste: any): Promise<void> {
    try {
      const { data: fechamento } = await db
        .from('banco_horas_fechamentos')
        .select('*')
        .eq('id', ajuste.fechamento_id)
        .single();

      if (!fechamento) return;

      const detalhes = ajuste.detalhes_mudanca;
      if (!detalhes) return;

      // Adicionar IDs dos novos apontamentos ao snapshot
      let apontamentosIds = fechamento.apontamentos_ids || [];
      let ticketsIds = fechamento.tickets_ids || [];

      if (ajuste.tipo_dado === 'apontamento_horas' && detalhes.novos) {
        const novosIds = detalhes.novos
          .map((a: any) => a.id_externo)
          .filter(Boolean);
        apontamentosIds = [...apontamentosIds, ...novosIds];
      }

      if (ajuste.tipo_dado === 'apontamento_tickets' && detalhes.novos) {
        const novosIds = detalhes.novos
          .map((t: any) => t.nro_solicitacao)
          .filter(Boolean);
        ticketsIds = [...ticketsIds, ...novosIds];
      }

      // Atualizar o fechamento com os novos IDs (sem alterar consumo)
      await db
        .from('banco_horas_fechamentos')
        .update({
          apontamentos_ids: apontamentosIds,
          tickets_ids: ticketsIds
        })
        .eq('id', ajuste.fechamento_id);

      console.log('📸 Snapshot atualizado (IDs) - descarte');
    } catch (error) {
      console.error('⚠️ Erro ao atualizar snapshot:', error);
    }
  }

  /**
   * Incorpora apontamentos aprovados no snapshot: atualiza IDs E o valor do consumo.
   * Isso permite que o recálculo use o novo valor.
   */
  private async incorporarApontamentosNoSnapshot(ajuste: any): Promise<void> {
    try {
      const { data: fechamento } = await db
        .from('banco_horas_fechamentos')
        .select('*')
        .eq('id', ajuste.fechamento_id)
        .single();

      if (!fechamento) return;

      const detalhes = ajuste.detalhes_mudanca;
      if (!detalhes) return;

      let apontamentosIds = fechamento.apontamentos_ids || [];
      let ticketsIds = fechamento.tickets_ids || [];
      let snapshotConsumoHoras = fechamento.snapshot_consumo_horas || '00:00';
      let snapshotConsumoTickets = fechamento.snapshot_consumo_tickets || 0;

      if (ajuste.tipo_dado === 'apontamento_horas') {
        // Adicionar IDs ao snapshot
        if (detalhes.novos) {
          const novosIds = detalhes.novos.map((a: any) => a.id_externo).filter(Boolean);
          apontamentosIds = [...apontamentosIds, ...novosIds];
        }
        // Atualizar consumo no snapshot
        snapshotConsumoHoras = ajuste.valor_novo || snapshotConsumoHoras;
      }

      if (ajuste.tipo_dado === 'apontamento_tickets') {
        if (detalhes.novos) {
          const novosIds = detalhes.novos.map((t: any) => t.nro_solicitacao).filter(Boolean);
          ticketsIds = [...ticketsIds, ...novosIds];
        }
        snapshotConsumoTickets = parseInt(ajuste.valor_novo) || snapshotConsumoTickets;
      }

      // Atualizar fechamento com IDs E novo valor de consumo
      await db
        .from('banco_horas_fechamentos')
        .update({
          apontamentos_ids: apontamentosIds,
          tickets_ids: ticketsIds,
          snapshot_consumo_horas: snapshotConsumoHoras,
          snapshot_consumo_tickets: snapshotConsumoTickets
        })
        .eq('id', ajuste.fechamento_id);

      console.log('📸 Snapshot atualizado (IDs + consumo) - aprovação:', {
        novoConsumoHoras: snapshotConsumoHoras,
        novoConsumoTickets: snapshotConsumoTickets
      });
    } catch (error) {
      console.error('⚠️ Erro ao incorporar apontamentos no snapshot:', error);
    }
  }

  /**
   * Busca IDs dos apontamentos que compõem o cálculo de um período.
   * Usa os mesmos filtros do bancoHorasIntegracaoService.buscarConsumo()
   */
  private async buscarIdsApontamentos(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<string[]> {
    try {
      // Buscar nome da empresa
      const { data: empresa } = await supabase
        .from('empresas_clientes')
        .select('nome_completo')
        .eq('id', empresaId)
        .single();

      if (!empresa?.nome_completo) return [];

      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);

      const codigosResolucaoValidos = [
        'Alocação - T&M',
        'Alocação - T&M (Banco=S |SLA=N)',
        'Alocação - T&M (Banco=S| SLA=N)',
        'AMS SAP',
        'AMS SAP (Banco=S |SLA=S)',
        'AMS SAP (Banco=S| SLA=S)',
        'Aplicação de Nota / Licença - Contratados',
        'Aplicação de Nota / Licença (Banco=S |SLA=N)',
        'Consultoria',
        'Consultoria (Banco=S |SLA=S)',
        'Consultoria (Banco=S| SLA=S)',
        'Consultoria - Banco de Dados',
        'Consultoria - Banco de Dados (Banco=S |SLA=S)',
        'Consultoria - Banco de Dados (Banco=S| SLA=S)',
        'Consultoria - Nota Publicada',
        'Consultoria - Nota Publicada (Banco=S |SLA=S)',
        'Consultoria - Nota Publicada (Banco=S| SLA=S)',
        'Consultoria - Solução Paliativa',
        'Consultoria - Solução Paliativa (Banco=S |SLA=S)',
        'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
        'Dúvida',
        'Dúvida (Banco=S |SLA=N)',
        'Erro de classificação na abertura',
        'Erro de classificação na abertura (Banco=S |SLA=N)',
        'Erro de classificação na abertura (Banco=S| SLA=N)',
        'Erro de programa especifico (SEM SLA)',
        'Erro de programa especifico (Banco=S |SLA=N)',
        'Erro de programa especifico (Banco=S| SLA=N)',
        'Levantamento de Versão / Orçamento',
        'Levantamento de Versão / Orçamento (Banco=S |SLA=N)',
        'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
        'Monitoramento DBA',
        'Monitoramento DBA (Banco=S |SLA=S)',
        'Nota Publicada',
        'Nota Publicada (Banco=S |SLA=N)',
        'Nota Publicada (Banco=S| SLA=N)',
        'Parametrização / Cadastro',
        'Parametrização / Cadastro (Banco=S |SLA=N)',
        'Parametrização / Funcionalidade',
        'Parametrização / Funcionalidade (Banco=S |SLA=S)',
        'Parametrização / Funcionalidade (Banco=S |SLA=N)',
        'Validação de Arquivo',
        'Validação de Arquivo (Banco=S |SLA=N)',
        'Validação de Arquivo (Banco=S| SLA=N)'
      ];

      const { data: apontamentos } = await db
        .from('apontamentos_aranda')
        .select('id_externo, data_atividade, data_sistema')
        .eq('ativi_interna', 'Não')
        .neq('item_configuracao', '000000 - PROJETOS APL')
        .in('tipo_chamado', ['IM', 'RF', 'PM'])
        .gte('data_atividade', dataInicio.toISOString())
        .lte('data_atividade', dataFim.toISOString())
        .in('cod_resolucao', codigosResolucaoValidos)
        .ilike('org_us_final', `%${empresa.nome_completo}%`)
        .limit(10000);

      if (!apontamentos) return [];

      // Aplicar mesma regra de data_atividade == data_sistema (mesmo mês)
      return apontamentos
        .filter((a: any) => {
          if (!a.data_atividade || !a.data_sistema) return true;
          const dAtiv = new Date(a.data_atividade);
          const dSist = new Date(a.data_sistema);
          return dAtiv.getMonth() === dSist.getMonth() &&
                 dAtiv.getFullYear() === dSist.getFullYear();
        })
        .map((a: any) => a.id_externo)
        .filter(Boolean);
    } catch (error) {
      console.error('❌ Erro ao buscar IDs de apontamentos:', error);
      return [];
    }
  }

  /**
   * Busca IDs dos tickets que compõem o cálculo de um período.
   * Usa os mesmos filtros do bancoHorasIntegracaoService.buscarConsumoTickets()
   */
  private async buscarIdsTickets(
    empresaId: string,
    mes: number,
    ano: number
  ): Promise<string[]> {
    try {
      const { data: empresa } = await supabase
        .from('empresas_clientes')
        .select('nome_abreviado, nome_completo')
        .eq('id', empresaId)
        .single();

      if (!empresa) return [];

      const dataInicio = new Date(ano, mes - 1, 1);
      const dataFim = new Date(ano, mes, 0, 23, 59, 59, 999);
      const nomeParaBusca = empresa.nome_abreviado || empresa.nome_completo;

      const { data: tickets } = await db
        .from('apontamentos_tickets_aranda')
        .select('nro_solicitacao')
        .gte('data_fechamento', dataInicio.toISOString())
        .lte('data_fechamento', dataFim.toISOString())
        .eq('status', 'Closed')
        .ilike('organizacao', `%${nomeParaBusca}%`)
        .limit(5000);

      if (!tickets) return [];

      return tickets
        .map((t: any) => t.nro_solicitacao)
        .filter(Boolean);
    } catch (error) {
      console.error('❌ Erro ao buscar IDs de tickets:', error);
      return [];
    }
  }
  /**
   * Executa detecção automática para TODOS os períodos fechados.
   * Chamado automaticamente ao abrir a tela de Ajustes Retroativos.
   */
  async executarDeteccaoParaTodosFechamentos(): Promise<AjusteRetroativo[]> {
    try {
      console.log('🔍 Executando detecção para todos os fechamentos...');

      // Buscar todos os fechamentos existentes
      const { data: fechamentos, error } = await db
        .from('banco_horas_fechamentos')
        .select('empresa_id, mes, ano')
        .order('created_at', { ascending: false });

      if (error || !fechamentos || fechamentos.length === 0) {
        console.log('ℹ️ Nenhum fechamento encontrado');
        return [];
      }

      console.log(`📋 ${fechamentos.length} fechamento(s) encontrado(s)`);

      const todosAjustes: AjusteRetroativo[] = [];

      for (const f of fechamentos) {
        try {
          const ajustes = await this.executarDeteccaoCompleta(
            f.empresa_id,
            f.mes,
            f.ano
          );
          todosAjustes.push(...ajustes);
        } catch (err) {
          console.warn(`⚠️ Erro ao detectar para ${f.empresa_id} ${f.mes}/${f.ano}:`, err);
        }
      }

      console.log(`✅ Detecção global concluída: ${todosAjustes.length} ajuste(s) criado(s)/atualizado(s)`);
      return todosAjustes;
    } catch (error) {
      console.error('❌ Erro na detecção global:', error);
      return [];
    }
  }
}

// Exportar instância singleton
export const bancoHorasQuarentenaService = new BancoHorasQuarentenaService();
