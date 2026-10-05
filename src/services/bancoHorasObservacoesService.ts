/**
 * Service de observações do banco de horas (manuais e de reajustes).
 * Usado pelo hook useBancoHorasObservacoes e pelo envio automático de Saldo Parcial.
 */

import { supabase } from '@/integrations/supabase/client';

export interface BancoHorasObservacao {
  id: string;
  empresa_id: string;
  mes: number;
  ano: number;
  observacao: string;
  tipo: 'manual' | 'ajuste';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Dados do usuário (join)
  usuario_nome?: string;
  usuario_email?: string;
}

export interface ObservacaoReajuste {
  id: string;
  mes: number;
  ano: number;
  observacao: string;
  tipo_reajuste: 'entrada' | 'saida';
  valor_reajuste_horas: string;
  valor_reajuste_tickets: number;
  created_by: string | null;
  created_at: string;
  // Dados do usuário (join)
  usuario_nome?: string;
  usuario_email?: string;
}

export interface ObservacaoUnificada {
  id: string;
  mes: number;
  ano: number;
  observacao: string;
  tipo: 'manual' | 'ajuste';
  tipo_ajuste?: 'entrada' | 'saida';
  valor_horas?: string;
  valor_tickets?: number;
  created_by: string | null;
  created_at: string;
  updated_at?: string;
  usuario_nome?: string;
  usuario_email?: string;
}

/** Filtro opcional por mês/ano; sem ele, busca todas as observações da empresa */
export interface PeriodoObservacoes {
  mes: number;
  ano: number;
}

export class BancoHorasObservacoesService {
  /** Observações manuais da empresa, com nome/e-mail de quem criou */
  async listarObservacoesManuais(empresaId: string, periodo?: PeriodoObservacoes): Promise<BancoHorasObservacao[]> {
    let query = supabase
      .from('banco_horas_observacoes' as any)
      .select('*')
      .eq('empresa_id', empresaId);

    if (periodo) {
      query = query.eq('mes', periodo.mes).eq('ano', periodo.ano);
    }

    const { data: observacoes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar observações manuais:', error.message);
      throw error;
    }

    const registros = (observacoes || []) as unknown as BancoHorasObservacao[];
    return (await this.adicionarUsuarios(registros)) as BancoHorasObservacao[];
  }

  /** Observações dos reajustes ativos (com observação preenchida) da empresa */
  async listarObservacoesReajustes(empresaId: string, periodo?: PeriodoObservacoes): Promise<ObservacaoReajuste[]> {
    let query = supabase
      .from('banco_horas_reajustes' as any)
      .select('id, mes, ano, observacao, tipo_reajuste, valor_reajuste_horas, valor_reajuste_tickets, created_by, created_at')
      .eq('empresa_id', empresaId)
      .eq('ativo', true)
      .not('observacao', 'is', null)
      .neq('observacao', '');

    if (periodo) {
      query = query.eq('mes', periodo.mes).eq('ano', periodo.ano);
    }

    const { data: reajustes, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar observações de reajustes:', error.message);
      throw error;
    }

    const registros = (reajustes || []) as unknown as ObservacaoReajuste[];
    return (await this.adicionarUsuarios(registros)) as ObservacaoReajuste[];
  }

  /** Une manuais e reajustes em uma lista única, da mais recente para a mais antiga */
  unificarObservacoes(manuais: BancoHorasObservacao[], reajustes: ObservacaoReajuste[]): ObservacaoUnificada[] {
    return [
      ...manuais.map(obs => ({
        id: obs.id,
        mes: obs.mes,
        ano: obs.ano,
        observacao: obs.observacao,
        tipo: 'manual' as const,
        created_by: obs.created_by,
        created_at: obs.created_at,
        updated_at: obs.updated_at,
        usuario_nome: obs.usuario_nome,
        usuario_email: obs.usuario_email
      })),
      ...reajustes.map(obs => ({
        id: obs.id,
        mes: obs.mes,
        ano: obs.ano,
        observacao: obs.observacao,
        tipo: 'ajuste' as const,
        tipo_ajuste: obs.tipo_reajuste,
        valor_horas: obs.valor_reajuste_horas,
        valor_tickets: obs.valor_reajuste_tickets,
        created_by: obs.created_by,
        created_at: obs.created_at,
        usuario_nome: obs.usuario_nome,
        usuario_email: obs.usuario_email
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /** Todas as observações (manuais + reajustes) da empresa, já unificadas */
  async listarObservacoesUnificadas(empresaId: string): Promise<ObservacaoUnificada[]> {
    const [manuais, reajustes] = await Promise.all([
      this.listarObservacoesManuais(empresaId),
      this.listarObservacoesReajustes(empresaId)
    ]);
    return this.unificarObservacoes(manuais, reajustes);
  }

  /** Busca os perfis de quem criou cada registro (join manual) */
  private async adicionarUsuarios<T extends { created_by: string | null }>(
    registros: T[]
  ): Promise<Array<T & { usuario_nome: string; usuario_email: string }>> {
    if (registros.length === 0) return [];

    const userIds = [...new Set(registros.map(r => r.created_by).filter(Boolean))];
    if (userIds.length === 0) {
      return registros.map(r => ({ ...r, usuario_nome: 'Usuário desconhecido', usuario_email: '' }));
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Erro ao buscar profiles:', profilesError.message);
    }

    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return registros.map(r => ({
      ...r,
      usuario_nome: profilesMap.get(r.created_by)?.full_name || 'Usuário desconhecido',
      usuario_email: profilesMap.get(r.created_by)?.email || ''
    }));
  }
}

export const bancoHorasObservacoesService = new BancoHorasObservacoesService();
