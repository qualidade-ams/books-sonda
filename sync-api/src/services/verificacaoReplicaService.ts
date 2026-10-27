/**
 * Verificação do banco réplica do Aranda.
 *
 * Antes de cada sincronização, lê a data mais recente de apontamentos e de
 * tickets no SQL Server. Se alguma estiver com mais de 1 hora de atraso, a
 * réplica não foi atualizada pela interface: abre (ou atualiza) a notificação
 * no sino da tela Rotinas Automáticas. Quando volta a ficar em dia, a
 * notificação é resolvida. A sincronização segue normalmente nos dois casos.
 */

import type sql from 'mssql';
import type { SupabaseClient } from '@supabase/supabase-js';

export const LIMITE_ATRASO_MINUTOS = 60;

// O atraso é calculado no próprio SQL Server (GETDATE) porque as colunas de
// data não guardam fuso; a data volta como texto "AAAA-MM-DD HH:MI" pelo mesmo motivo.
export const SQL_VERIFICACAO_REPLICA = `
SELECT 'apontamentos' AS tabela,
       CONVERT(VARCHAR(16), MAX(TRY_CAST([Data_Sistema (Date-Hour-Minute-Second)] AS DATETIME)), 120) AS ultima_atualizacao,
       DATEDIFF(MINUTE, MAX(TRY_CAST([Data_Sistema (Date-Hour-Minute-Second)] AS DATETIME)), GETDATE()) AS minutos_atraso
FROM AMSapontamento
UNION ALL
SELECT 'tickets',
       CONVERT(VARCHAR(16), MAX(TRY_CAST(Data_Abertura AS DATETIME)), 120),
       DATEDIFF(MINUTE, MAX(TRY_CAST(Data_Abertura AS DATETIME)), GETDATE())
FROM AMSticketsabertos
`;

const ROTULOS: Record<string, string> = {
  apontamentos: 'Apontamentos (AMSapontamento)',
  tickets: 'Tickets (AMSticketsabertos)',
};

export interface AtrasoTabela {
  tabela: string;
  ultima_atualizacao: string | null;
  minutos_atraso: number | null;
}

export interface ResultadoVerificacaoReplica {
  atrasada: boolean;
  /** Texto da notificação; null quando a réplica está em dia */
  mensagem: string | null;
  /** Só as tabelas atrasadas */
  tabelas: AtrasoTabela[];
}

/** "AAAA-MM-DD HH:MI" → "DD/MM/AAAA HH:MI" */
function formatarData(valor: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/.exec(valor ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}` : 'data desconhecida';
}

/** 190 → "3h10min"; 120 → "2h" */
function formatarAtraso(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas}h${String(resto).padStart(2, '0')}min` : `${horas}h`;
}

export function avaliarAtrasoReplica(linhas: AtrasoTabela[]): ResultadoVerificacaoReplica {
  const tabelas = linhas
    .filter((l) => l.minutos_atraso != null && l.minutos_atraso > LIMITE_ATRASO_MINUTOS)
    .map((l) => ({ tabela: l.tabela, ultima_atualizacao: l.ultima_atualizacao, minutos_atraso: l.minutos_atraso }));

  if (tabelas.length === 0) return { atrasada: false, mensagem: null, tabelas };

  const detalhes = tabelas
    .map(
      (t) =>
        `${ROTULOS[t.tabela] ?? t.tabela}: último registro em ${formatarData(t.ultima_atualizacao)} (há ${formatarAtraso(t.minutos_atraso!)})`
    )
    .join('; ');

  return {
    atrasada: true,
    mensagem: `O banco réplica do Aranda não foi atualizado há mais de 1 hora. ${detalhes}. A sincronização roda normalmente, mas não traz o que ainda não chegou na réplica.`,
    tabelas,
  };
}

export function criarVerificadorReplica(deps: { supabase: SupabaseClient }) {
  return async (pool: sql.ConnectionPool): Promise<ResultadoVerificacaoReplica> => {
    const { recordset } = await pool.request().query(SQL_VERIFICACAO_REPLICA);
    const resultado = avaliarAtrasoReplica((recordset ?? []) as AtrasoTabela[]);

    // Mensagem nula resolve a notificação aberta (se houver)
    const { error } = await (deps.supabase as any).rpc('notificacoes_sync_replica', {
      p_mensagem: resultado.mensagem,
      p_referencia: { tabelas: resultado.tabelas },
    });
    if (error) throw new Error(`Falha ao registrar notificação do banco réplica: ${error.message}`);

    return resultado;
  };
}
