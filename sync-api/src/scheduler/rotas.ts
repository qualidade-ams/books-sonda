/**
 * Endpoints da tela "Sincronização SQL Server":
 *   POST /api/sync-jobs/executar            (edit) — execução manual em background
 *   POST /api/sync-jobs/proximas-execucoes  (view) — pré-visualização da recorrência
 *   GET  /api/sync-jobs/status              (view) — há execução em andamento?
 */

import { Router, Response } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exigirPermissao, RequestAutenticado } from './autenticacao';
import { listarProximasExecucoes, validarRegra, RegraRecorrencia } from './recorrencia';
import type { InicioExecucao, ParametrosExecucao, TabelasSync } from './orquestradorSync';

export const SCREEN_KEY_SINCRONIZACAO = 'sincronizacao_sql_server';

interface OrquestradorLike {
  iniciar(params: ParametrosExecucao): Promise<InicioExecucao>;
  emExecucao(): boolean;
}

const CHAVES_TABELA = ['pesquisas', 'especialistas', 'apontamentos', 'tickets', 'codigoResolucao'] as const;
const CHAVES_POS = ['detectarInconsistencias', 'ajustesRetroativos'] as const;
const MAX_PREVIEW = 20;

/** Aceita só as chaves conhecidas, com tipos corretos */
function sanitizarTabelas(entrada: any): TabelasSync {
  const tabelas: TabelasSync = {};
  for (const chave of [...CHAVES_TABELA, ...CHAVES_POS]) {
    if (typeof entrada?.[chave] === 'boolean') tabelas[chave] = entrada[chave];
  }
  if (typeof entrada?.dataInicial === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entrada.dataInicial)) {
    tabelas.dataInicial = entrada.dataInicial;
  }
  return tabelas;
}

export function criarHandlersSyncJobs({
  orquestrador,
  agendadorAtivo = () => false,
}: {
  orquestrador: OrquestradorLike;
  /** false quando SCHEDULER_ENABLED não está ligado neste servidor */
  agendadorAtivo?: () => boolean;
}) {
  return {
    async executar(req: RequestAutenticado, res: Response) {
      const tabelas = sanitizarTabelas(req.body?.tabelas);
      if (!CHAVES_TABELA.some((c) => tabelas[c])) {
        return res.status(400).json({ erro: 'Selecione ao menos uma tabela para sincronizar' });
      }

      try {
        const inicio = await orquestrador.iniciar({ tabelas, origem: 'manual', usuarioId: req.usuarioId });
        if (inicio.status === 'iniciada') return res.status(202).json({ execucaoId: inicio.execucaoId });
        return res.status(409).json({ erro: 'Já existe uma sincronização em andamento' });
      } catch (e) {
        console.error('[SYNC-JOBS] Erro ao iniciar execução:', e instanceof Error ? e.message : e);
        return res.status(500).json({ erro: 'Não foi possível iniciar a sincronização' });
      }
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
      return res.json({ emExecucao: orquestrador.emExecucao(), agendadorAtivo: agendadorAtivo() });
    },
  };
}

export function criarRotasSyncJobs(
  supabase: SupabaseClient,
  orquestrador: OrquestradorLike,
  agendadorAtivo?: () => boolean
) {
  const router = Router();
  const handlers = criarHandlersSyncJobs({ orquestrador, agendadorAtivo });
  const podeVer = exigirPermissao(supabase, SCREEN_KEY_SINCRONIZACAO, 'view');
  const podeEditar = exigirPermissao(supabase, SCREEN_KEY_SINCRONIZACAO, 'edit');

  router.post('/executar', podeEditar, handlers.executar);
  router.post('/proximas-execucoes', podeVer, handlers.proximasExecucoes);
  router.get('/status', podeVer, handlers.status);

  return router;
}
