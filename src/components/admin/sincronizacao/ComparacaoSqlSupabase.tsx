import { useTranslation } from 'react-i18next';

/** Contagem de uma tabela gravada pelo sync-api em resultado.validacao.tabelas */
interface ContagemTabela {
  sql_server?: number;
  /** Especialistas: total da origem (sql_server_ativos é só informativo) */
  sql_server_total?: number;
  supabase?: number;
  diferenca?: number;
  erro?: string;
}

interface ComparacaoSqlSupabaseProps {
  validacao:
    | { sucesso?: boolean; erro?: string; tabelas?: Record<string, ContagemTabela> | null }
    | null
    | undefined;
}

const COR_CARTAO = {
  igual: 'bg-green-50 border-green-200',
  faltam: 'bg-yellow-50 border-yellow-200',
  sobram: 'bg-blue-50 border-blue-200',
  erro: 'bg-red-50 border-red-200',
};

/**
 * Comparação de contagens SQL Server x Supabase da etapa de validação de uma
 * execução da sincronização. Diferença positiva = faltam registros no Supabase.
 */
export function ComparacaoSqlSupabase({ validacao }: ComparacaoSqlSupabaseProps) {
  const { t, i18n } = useTranslation();
  const tabelas = Object.entries(validacao?.tabelas ?? {});
  if (tabelas.length === 0) return null;

  const numero = (n: number | undefined) =>
    n === undefined || n === null ? '—' : n.toLocaleString(i18n.language || 'pt-BR');

  return (
    <div>
      <p className="text-xs font-semibold text-gray-700 mb-1">
        {t('sincronizacaoSql.historico.comparacao.titulo')}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {tabelas.map(([tabela, dados]) => {
          const diferenca = dados.diferenca ?? 0;
          const situacao = dados.erro
            ? 'erro'
            : diferenca === 0
              ? 'igual'
              : diferenca > 0
                ? 'faltam'
                : 'sobram';

          return (
            <div
              key={tabela}
              data-tabela={tabela}
              className={`rounded-lg border p-3 ${COR_CARTAO[situacao]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {t(`sincronizacaoSql.tabelas.${tabela}`)}
                </span>
                <span
                  className={`text-xs ${situacao === 'erro' ? 'text-red-600' : 'text-gray-600'}`}
                >
                  {situacao === 'erro'
                    ? dados.erro
                    : situacao === 'igual'
                      ? t('sincronizacaoSql.historico.comparacao.ok')
                      : t(`sincronizacaoSql.historico.comparacao.${situacao}`, {
                          count: Math.abs(diferenca),
                        })}
                </span>
              </div>
              {situacao !== 'erro' && (
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                  <div>
                    <span className="block text-gray-500">
                      {t('sincronizacaoSql.historico.comparacao.sqlServer')}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {numero(dados.sql_server ?? dados.sql_server_total)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500">
                      {t('sincronizacaoSql.historico.comparacao.supabase')}
                    </span>
                    <span className="font-semibold text-gray-900">{numero(dados.supabase)}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">
                      {t('sincronizacaoSql.historico.comparacao.diferenca')}
                    </span>
                    <span
                      className={`font-semibold ${diferenca === 0 ? 'text-green-600' : 'text-yellow-700'}`}
                    >
                      {diferenca > 0 ? `+${diferenca}` : diferenca}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
