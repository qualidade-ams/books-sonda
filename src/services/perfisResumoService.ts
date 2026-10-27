/**
 * Nome de quem fez a última alteração, nas telas da Fase 3. Usa perfis_resumo
 * (migration 20261022000010): só o nome dos ids pedidos, sem abrir profiles. Sem
 * permissão para os nomes, devolve vazio e a tela mostra só a data.
 */

import { supabase } from '@/integrations/supabase/client';

type Cliente = typeof supabase;

export class PerfisResumoService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async nomes(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
    const unicos = [...new Set(ids.filter((id): id is string => !!id))];
    if (unicos.length === 0) return {};
    const { data, error } = await this.cliente.rpc('perfis_resumo', {
      p_ids: unicos,
      p_emails: null,
    });
    if (error) return {};
    return Object.fromEntries(
      (data ?? []).filter((p) => p.full_name).map((p) => [p.id, p.full_name as string])
    );
  }
}

export const perfisResumoService = new PerfisResumoService();
