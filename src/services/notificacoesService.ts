/**
 * Notificações do sino (header).
 *
 * As notificações são criadas e resolvidas por gatilhos no banco
 * (migration 20261014000001_create_notificacoes.sql); o front só lê as abertas
 * e registra a leitura do usuário. A RLS entrega apenas as notificações das
 * telas em que o usuário tem permissão de Edição.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Notificacao } from '@/types/notificacoes';

// Tabelas novas ainda não estão no types.ts gerado
const db = supabase as any;

const LIMITE = 50;

interface LinhaNotificacao extends Omit<Notificacao, 'lida'> {
  notificacoes_leituras: { lida_em: string }[] | null;
}

class NotificacoesService {
  async listarAbertas(): Promise<Notificacao[]> {
    const { data, error } = await db
      .from('notificacoes')
      .select(
        'id, tipo, screen_key, titulo, mensagem, link, empresa_id, created_at, updated_at, notificacoes_leituras(lida_em)'
      )
      .is('resolvida_em', null)
      .order('created_at', { ascending: false })
      .limit(LIMITE);

    if (error) throw new Error(`Falha ao buscar notificações: ${error.message}`);

    return ((data ?? []) as LinhaNotificacao[]).map(({ notificacoes_leituras, ...notificacao }) => {
      // A RLS de notificacoes_leituras devolve só a leitura do próprio usuário
      const lidaEm = notificacoes_leituras?.[0]?.lida_em;
      return {
        ...notificacao,
        lida: !!lidaEm && new Date(lidaEm).getTime() >= new Date(notificacao.updated_at).getTime(),
      };
    });
  }

  async marcarComoLidas(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Sessão expirada. Faça login novamente.');

    const lidaEm = new Date().toISOString();
    const { error } = await db.from('notificacoes_leituras').upsert(
      ids.map((id) => ({ notificacao_id: id, user_id: user.id, lida_em: lidaEm })),
      { onConflict: 'notificacao_id,user_id' }
    );

    if (error) throw new Error(`Falha ao marcar notificação como lida: ${error.message}`);
  }

  /** Avisa a cada mudança na tabela (criação, atualização ou resolução); devolve o cancelamento */
  assinarMudancas(aoMudar: () => void): () => void {
    const canal = supabase
      .channel('notificacoes-sino')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notificacoes' }, () => aoMudar())
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }
}

export const notificacoesService = new NotificacoesService();
