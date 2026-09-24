/**
 * Serviço de Sincronização Incremental de Trocas de Código de Resolução
 *
 * Origem: AMScodigoresolucao_Modificacao (SQL Server Aranda)
 *   item_id (nº do chamado), old_value, new_value, created (data da troca)
 * Destino: codigo_resolucao_modificacoes_aranda (Supabase)
 *
 * Regras:
 * 1. Busca o maior `created` já sincronizado no Supabase
 * 2. Busca no SQL Server as trocas com created >= (maior_data - 1 dia de folga)
 * 3. UPSERT por id_externo (AMScodigoresolucao_Modificacao|item_id|created):
 *    trocas não mudam depois de gravadas, então reprocessar a folga não duplica
 *
 * Usado pela detecção de inconsistências (tipo troca_codigo_resolucao).
 */

import sql from 'mssql';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  mapearModificacaoCodigoResolucao,
  ModificacaoCodigoResolucaoSqlServer,
  ModificacaoCodigoResolucaoSupabase
} from '../utils/codigoResolucaoModificacao';

const TABELA_SUPABASE = 'codigo_resolucao_modificacoes_aranda';
// Mesmo escopo da detecção de inconsistências (1º de janeiro do ano anterior)
const DATA_INICIAL_PADRAO = `${new Date().getFullYear() - 1}-01-01T00:00:00`;
const TAMANHO_LOTE = 500;

export interface ResultadoSyncCodigoResolucao {
  sucesso: boolean;
  total_processados: number;
  sincronizados: number;
  ignorados: number;
  erros: number;
  mensagens: string[];
}

async function buscarDataInicio(supabase: SupabaseClient): Promise<Date> {
  const { data, error } = await supabase
    .from(TABELA_SUPABASE)
    .select('created')
    .order('created', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data?.created) {
    console.log(`⚠️ [SYNC-COD-RESOLUCAO] Tabela vazia. Usando data inicial: ${DATA_INICIAL_PADRAO}`);
    return new Date(DATA_INICIAL_PADRAO);
  }

  // `created` é gravado sem timezone (horário local do SQL Server), então remove o
  // sufixo de timezone para reinterpretar no mesmo horário local
  const ultimaData = new Date(String(data.created).replace(/(Z|[+-]\d{2}:\d{2})$/, ''));
  ultimaData.setDate(ultimaData.getDate() - 1); // 1 dia de folga
  return ultimaData;
}

export async function sincronizarCodigoResolucaoIncremental(
  pool: sql.ConnectionPool,
  supabase: SupabaseClient
): Promise<ResultadoSyncCodigoResolucao> {
  const resultado: ResultadoSyncCodigoResolucao = {
    sucesso: false,
    total_processados: 0,
    sincronizados: 0,
    ignorados: 0,
    erros: 0,
    mensagens: []
  };

  try {
    console.log('🚀 [SYNC-COD-RESOLUCAO] Iniciando sincronização incremental...');

    const dataInicio = await buscarDataInicio(supabase);
    resultado.mensagens.push(`🔍 Buscando trocas desde: ${dataInicio.toISOString()} (folga de 1 dia)`);

    const consulta = await pool.request()
      .input('dataInicio', sql.DateTime, dataInicio)
      .query<ModificacaoCodigoResolucaoSqlServer>(`
        SELECT item_id, old_value, new_value, created
        FROM AMScodigoresolucao_Modificacao
        WHERE created IS NOT NULL
          AND CAST(created AS DATETIME) >= @dataInicio
        ORDER BY created ASC
      `);

    const registros = consulta.recordset || [];
    resultado.total_processados = registros.length;
    resultado.mensagens.push(`${registros.length} trocas encontradas no SQL Server`);
    console.log(`📊 [SYNC-COD-RESOLUCAO] ${registros.length} trocas encontradas`);

    // Mapear e deduplicar por id_externo (upsert falha com chave repetida no mesmo lote)
    const porIdExterno = new Map<string, ModificacaoCodigoResolucaoSupabase>();
    for (const registro of registros) {
      const mapeado = mapearModificacaoCodigoResolucao(registro);
      if (!mapeado) {
        resultado.ignorados++;
        continue;
      }
      porIdExterno.set(mapeado.id_externo, mapeado);
    }
    const linhas = Array.from(porIdExterno.values());

    for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
      const lote = linhas.slice(i, i + TAMANHO_LOTE).map(linha => ({
        ...linha,
        synced_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from(TABELA_SUPABASE)
        .upsert(lote, { onConflict: 'id_externo' });

      if (error) {
        console.error(`❌ [SYNC-COD-RESOLUCAO] Erro no lote ${Math.floor(i / TAMANHO_LOTE) + 1}:`, error.message);
        resultado.erros += lote.length;
        resultado.mensagens.push(`Erro lote: ${error.message}`);
      } else {
        resultado.sincronizados += lote.length;
      }
    }

    resultado.sucesso = resultado.erros === 0;
    const mensagemFinal = `Sincronização concluída: ${resultado.sincronizados} sincronizados, ${resultado.ignorados} ignorados, ${resultado.erros} erros`;
    resultado.mensagens.push(mensagemFinal);
    console.log(`✅ [SYNC-COD-RESOLUCAO] ${mensagemFinal}`);

    return resultado;
  } catch (erro) {
    console.error('💥 [SYNC-COD-RESOLUCAO] Erro crítico:', erro instanceof Error ? erro.message : erro);
    resultado.mensagens.push(`Erro crítico: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    return resultado;
  }
}
