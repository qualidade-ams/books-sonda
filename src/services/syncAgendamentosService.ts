/**
 * Serviço da tela "Sincronização SQL Server".
 *
 * - Agendamentos (sync_agendamentos): CRUD direto no Supabase, protegido por RLS.
 * - Execuções (sync_execucoes): só leitura; quem grava é o sync-api.
 * - executarAgora / preverExecucoes: chamam o sync-api com o token da sessão,
 *   que valida a permissão na tela antes de agir.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  RegraRecorrencia,
  SyncAgendamento,
  SyncAgendamentoInput,
  SyncExecucao,
  TabelasSync,
} from '@/types/syncAgendamentos';

const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://sync-api.sondalyze.com.br';

// Tabelas novas ainda não estão no types.ts gerado
const db = supabase as any;

/** Chama o sync-api com o token da sessão; sem `corpo` a chamada é GET */
async function chamarSyncApi<T>(caminho: string, corpo?: unknown): Promise<{ status: number; dados: T }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.');

  const response = await fetch(`${API_URL}${caminho}`, {
    method: corpo === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });

  let dados: any = null;
  try {
    dados = await response.json();
  } catch {
    /* corpo vazio */
  }

  if (!response.ok) {
    const mensagem =
      dados?.erro || (Array.isArray(dados?.erros) ? dados.erros.join('. ') : null) || `Erro ${response.status} no sync-api`;
    throw new Error(mensagem);
  }

  return { status: response.status, dados };
}

class SyncAgendamentosService {
  async listarAgendamentos(): Promise<SyncAgendamento[]> {
    const { data, error } = await db.from('sync_agendamentos').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async criarAgendamento(input: SyncAgendamentoInput): Promise<SyncAgendamento> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await db
      .from('sync_agendamentos')
      .insert({ ...input, created_by: user?.id ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async atualizarAgendamento(id: string, input: SyncAgendamentoInput): Promise<SyncAgendamento> {
    const { data, error } = await db.from('sync_agendamentos').update(input).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async alternarAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await db.from('sync_agendamentos').update({ ativo }).eq('id', id);
    if (error) throw error;
  }

  async excluirAgendamento(id: string): Promise<void> {
    const { error } = await db.from('sync_agendamentos').delete().eq('id', id);
    if (error) throw error;
  }

  async listarExecucoes(limite = 50): Promise<SyncExecucao[]> {
    const { data, error } = await db
      .from('sync_execucoes')
      .select('*, agendamento:sync_agendamentos(nome)')
      .order('iniciado_em', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  }

  /** Dispara a sincronização no sync-api; ela continua mesmo se a tela for fechada */
  async executarAgora(tabelas: TabelasSync): Promise<{ execucaoId: string }> {
    const { dados } = await chamarSyncApi<{ execucaoId: string }>('/api/sync-jobs/executar', { tabelas });
    return dados;
  }

  /** Próximas execuções da regra, calculadas pelo sync-api (mesma lógica do agendador) */
  async preverExecucoes(regra: RegraRecorrencia, n = 5): Promise<string[]> {
    const { dados } = await chamarSyncApi<{ execucoes: string[] }>('/api/sync-jobs/proximas-execucoes', { regra, n });
    return dados?.execucoes || [];
  }

  /** Há execução em andamento? O agendador está ligado (SCHEDULER_ENABLED) neste sync-api? */
  async statusSyncApi(): Promise<{ emExecucao: boolean; agendadorAtivo: boolean }> {
    const { dados } = await chamarSyncApi<{ emExecucao: boolean; agendadorAtivo: boolean }>('/api/sync-jobs/status');
    return dados;
  }
}

export const syncAgendamentosService = new SyncAgendamentosService();
