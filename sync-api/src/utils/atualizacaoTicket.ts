/**
 * Regras de "chamado atualizado" do sync de tickets (AMSticketsabertos → apontamentos_tickets_aranda).
 *
 * Um chamado conta como atualizado quando muda a Data_Ultima_Modificacao OU quando
 * recebe uma nota pública (o analista pode só anotar, sem modificar o chamado).
 *
 * Sem efeitos colaterais (sem dotenv/Supabase) para poder ser testado isoladamente.
 */

/** Coluna da AMSticketsabertos com a data/hora da última nota pública */
export const COLUNA_DATA_ULTIMA_NOTA_PUBLICA = '[data_ultima_nota_publica (Date-Hour-Minute-Second)]';

/** Filtro SQL dos chamados alterados a partir de @dataInicio (modificação ou nota pública) */
export const CONDICAO_TICKET_ALTERADO_DESDE =
  `(CAST(Data_Ultima_Modificacao AS DATETIME) >= @dataInicio` +
  ` OR CAST(${COLUNA_DATA_ULTIMA_NOTA_PUBLICA} AS DATETIME) >= @dataInicio)`;

/**
 * Data inicial escolhida no modal de sincronização (YYYY-MM-DD) → meia-noite do dia,
 * mesmo padrão do sync de pesquisas. Sem data ou data inválida → null (incremental automático).
 */
export function dataInicioCustomizada(dataInicial?: string | null): Date | null {
  if (!dataInicial || !/^\d{4}-\d{2}-\d{2}$/.test(dataInicial)) return null;
  const data = new Date(`${dataInicial}T00:00:00.000Z`);
  return isNaN(data.getTime()) ? null : data;
}

/**
 * Chamado sincronizado antes de a coluna data_ultima_nota_publica existir: o SQL Server
 * tem a nota pública e o Supabase não. Precisa ser atualizado mesmo sem data mais recente.
 */
export function faltaNotaPublicaNoSupabase(
  notaPublicaSqlServer: Date | null,
  notaPublicaSupabase: string | null
): boolean {
  return !!notaPublicaSqlServer && !notaPublicaSupabase;
}

/**
 * Data da última atualização do chamado: a mais recente entre a última modificação
 * e a última nota pública. É o valor gravado em source_updated_at.
 */
export function dataUltimaAtualizacaoTicket(
  dataUltimaModificacao: Date | null,
  dataUltimaNotaPublica: Date | null
): Date | null {
  if (!dataUltimaModificacao) return dataUltimaNotaPublica || null;
  if (!dataUltimaNotaPublica) return dataUltimaModificacao;
  return dataUltimaNotaPublica.getTime() > dataUltimaModificacao.getTime()
    ? dataUltimaNotaPublica
    : dataUltimaModificacao;
}

/**
 * Compara datas considerando timezone UTC
 * Retorna true se dataSqlServer > dataSupabase
 */
export function deveAtualizarTicket(dataSqlServer: Date | null, dataSupabase: Date | null): boolean {
  // Se não houver data no SQL Server, não atualizar
  if (!dataSqlServer) {
    return false;
  }

  // Se não houver data no Supabase, atualizar
  if (!dataSupabase) {
    return true;
  }

  return dataSqlServer.getTime() > dataSupabase.getTime();
}
