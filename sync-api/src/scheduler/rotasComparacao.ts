/**
 * Endpoints da tela "Comparação Legado x Novo" (Fase 4):
 *   POST /api/comparacao/recalcular (edit) — compara uma empresa em background
 */

import { Router, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exigirPermissao, RequestAutenticado } from './autenticacao';

export const SCREEN_KEY_COMPARACAO = 'bancos_horas_comparacao';

interface ModoSombraLike {
  recalcularEmpresa(empresaId: string): Promise<unknown>;
}

export function criarHandlersComparacao({ modoSombra }: { modoSombra: ModoSombraLike }) {
  return {
    async recalcular(req: RequestAutenticado, res: Response) {
      const empresaId = req.body?.empresaId;
      if (typeof empresaId !== 'string' || !empresaId) {
        return res.status(400).json({ erro: 'Informe a empresa' });
      }

      // Responde na hora: a Cloudflare corta requisições com mais de 100s.
      // A tela acompanha pelo calculado_em da comparação.
      modoSombra
        .recalcularEmpresa(empresaId)
        .catch((e) => console.error('[COMPARACAO] Erro ao recalcular:', e instanceof Error ? e.message : e));

      return res.status(202).json({ iniciado: true });
    },
  };
}

export function criarRotasComparacao(supabase: SupabaseClient, modoSombra: ModoSombraLike) {
  const router = Router();
  const handlers = criarHandlersComparacao({ modoSombra });
  const podeEditar = exigirPermissao(supabase, SCREEN_KEY_COMPARACAO, 'edit');

  router.post('/recalcular', podeEditar, handlers.recalcular);

  return router;
}
