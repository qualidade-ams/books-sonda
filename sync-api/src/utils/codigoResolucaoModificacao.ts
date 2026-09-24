/**
 * Mapeamento da tabela AMScodigoresolucao_Modificacao (SQL Server Aranda)
 * para codigo_resolucao_modificacoes_aranda (Supabase).
 *
 * Sem efeitos colaterais (sem dotenv/Supabase) para poder ser testado isoladamente.
 */

export interface ModificacaoCodigoResolucaoSqlServer {
  item_id: string | number | null;
  old_value: string | null;
  new_value: string | null;
  created: Date | string | null;
}

export interface ModificacaoCodigoResolucaoSupabase {
  id_externo: string;
  item_id: string;
  old_value: string | null;
  new_value: string | null;
  created: string;
}

/**
 * Formata a data preservando o horário local, sem timezone
 * (mesmo padrão usado nos syncs de tickets e apontamentos)
 */
function formatarDataSemTimezone(date: Date | string | null): string | null {
  if (!date) return null;
  const dataObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dataObj.getTime())) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dataObj.getFullYear()}-${pad(dataObj.getMonth() + 1)}-${pad(dataObj.getDate())}` +
    `T${pad(dataObj.getHours())}:${pad(dataObj.getMinutes())}:${pad(dataObj.getSeconds())}`;
}

function textoOuNull(valor: string | null): string | null {
  if (valor === null || valor === undefined) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
}

/**
 * Converte uma linha do SQL Server para o formato do Supabase.
 * Retorna null quando a linha não tem item_id ou created (não dá para identificá-la).
 */
export function mapearModificacaoCodigoResolucao(
  registro: ModificacaoCodigoResolucaoSqlServer
): ModificacaoCodigoResolucaoSupabase | null {
  const itemId = registro.item_id === null || registro.item_id === undefined
    ? null
    : textoOuNull(String(registro.item_id));
  const created = formatarDataSemTimezone(registro.created);

  if (!itemId || !created) return null;

  return {
    id_externo: `AMScodigoresolucao_Modificacao|${itemId}|${created}`,
    item_id: itemId,
    old_value: textoOuNull(registro.old_value),
    new_value: textoOuNull(registro.new_value),
    created,
  };
}
