/**
 * Endpoints da tela "Envio Automático de Saldo Parcial":
 *   POST /api/saldo-parcial/executar            (edit) — "executar agora" em background
 *   POST /api/saldo-parcial/proximas-execucoes  (view) — pré-visualização da recorrência
 *   GET  /api/saldo-parcial/status              (view) — agendador ligado? RENDER_IMAGE_URL configurada?
 */

import { Router, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exigirPermissao, RequestAutenticado } from './autenticacao';
import { listarProximasExecucoes, validarRegra, RegraRecorrencia } from './recorrencia';
import type { OpcoesExecucao, ResumoExecucao } from './agendadorSaldoParcial';

export const SCREEN_KEY_ENVIO_SALDO_PARCIAL = 'envio_saldo_parcial';

const MAX_PREVIEW = 48;

interface AgendadorSaldoParcialLike {
  executarAgendamento(ag: any, opcoes: OpcoesExecucao): Promise<ResumoExecucao>;
  ativo(): boolean;
}

export function criarHandlersSaldoParcial({
  supabase,
  agendador,
  renderImagemConfigurado = false
}: {
  supabase: SupabaseClient;
  agendador: AgendadorSaldoParcialLike;
  /** false quando RENDER_IMAGE_URL não está no .env: nenhum Saldo Parcial consegue sair */
  renderImagemConfigurado?: boolean;
}) {
  const db = supabase as any;

  return {
    async executar(req: RequestAutenticado, res: Response) {
      const agendamentoId = req.body?.agendamentoId;
      if (typeof agendamentoId !== 'string' || !agendamentoId) {
        return res.status(400).json({ erro: 'Informe o agendamento' });
      }

      const { data: agendamento, error } = await db
        .from('banco_horas_envio_agendamentos')
        .select('*, empresas:banco_horas_envio_agendamento_empresas(empresa_id)')
        .eq('id', agendamentoId)
        .maybeSingle();

      if (error || !agendamento) return res.status(404).json({ erro: 'Agendamento não encontrado' });

      // Responde na hora: a Cloudflare corta requisições com mais de 100s
      agendador
        .executarAgendamento(agendamento, { origem: 'manual', disparadoPor: req.usuarioId })
        .catch((e) => console.error('[SALDO PARCIAL] Erro na execução manual:', e instanceof Error ? e.message : e));

      return res.status(202).json({ iniciado: true });
    },

    async proximasExecucoes(req: RequestAutenticado, res: Response) {
      const regra = req.body?.regra as RegraRecorrencia;
      const erros = regra ? validarRegra(regra) : ['Regra não informada'];
      if (erros.length > 0) return res.status(400).json({ erros });

      const n = Math.min(Math.max(Number(req.body?.n) || 5, 1), MAX_PREVIEW);
      const execucoes = listarProximasExecucoes(regra, n).map((d) => d.toISOString());
      return res.json({ execucoes });
    },

    status(_req: RequestAutenticado, res: Response) {
      return res.json({ agendadorAtivo: agendador.ativo(), renderImagemConfigurado });
    }
  };
}

export function criarRotasSaldoParcial(
  supabase: SupabaseClient,
  agendador: AgendadorSaldoParcialLike,
  renderImagemConfigurado: boolean
) {
  const router = Router();
  const handlers = criarHandlersSaldoParcial({ supabase, agendador, renderImagemConfigurado });
  const podeVer = exigirPermissao(supabase, SCREEN_KEY_ENVIO_SALDO_PARCIAL, 'view');
  const podeEditar = exigirPermissao(supabase, SCREEN_KEY_ENVIO_SALDO_PARCIAL, 'edit');

  router.post('/executar', podeEditar, handlers.executar);
  router.post('/proximas-execucoes', podeVer, handlers.proximasExecucoes);
  router.get('/status', podeVer, handlers.status);

  return router;
}
