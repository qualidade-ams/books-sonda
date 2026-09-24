/**
 * Middleware de autenticação/autorização para os endpoints do agendador.
 *
 * Valida o access token do Supabase (Authorization: Bearer <jwt>) e exige o
 * nível de permissão na tela informada — mesma regra do RBAC do frontend
 * (user_group_assignments → screen_permissions, edit > view > none).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response, NextFunction } from 'express';

type Nivel = 'view' | 'edit';

const PESO: Record<string, number> = { none: 0, view: 1, edit: 2 };

export interface RequestAutenticado extends Request {
  usuarioId?: string;
}

export function exigirPermissao(supabase: SupabaseClient, screenKey: string, nivel: Nivel) {
  const db = supabase as any;

  return async (req: RequestAutenticado, res: Response, next: NextFunction) => {
    try {
      const header = req.headers?.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!token) return res.status(401).json({ erro: 'Não autenticado' });

      const { data: auth, error: erroAuth } = await supabase.auth.getUser(token);
      const usuarioId = auth?.user?.id;
      if (erroAuth || !usuarioId) return res.status(401).json({ erro: 'Sessão inválida ou expirada' });

      const { data: grupos } = await db
        .from('user_group_assignments')
        .select('group_id')
        .eq('user_id', usuarioId);

      const gruposIds = (grupos || []).map((g: any) => g.group_id);
      let maior = 0;

      if (gruposIds.length > 0) {
        const { data: permissoes } = await db
          .from('screen_permissions')
          .select('permission_level')
          .eq('screen_key', screenKey)
          .in('group_id', gruposIds);
        for (const p of permissoes || []) maior = Math.max(maior, PESO[p.permission_level] ?? 0);
      }

      if (maior < PESO[nivel]) return res.status(403).json({ erro: 'Sem permissão para esta ação' });

      req.usuarioId = usuarioId;
      next();
    } catch (e) {
      console.error('[AUTH] Erro ao validar permissão:', e instanceof Error ? e.message : e);
      res.status(500).json({ erro: 'Erro ao validar permissão' });
    }
  };
}
