import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface ColunaTabela<T> {
  id: string;
  cabecalho: string;
  celula: (linha: T) => React.ReactNode;
  alinhar?: 'esquerda' | 'direita';
  /**
   * Papel da coluna no cartão do celular:
   * titulo (destaque no topo), detalhe (rótulo · valor, padrão), acoes (rodapé) ou oculta.
   */
  mobile?: 'titulo' | 'detalhe' | 'acoes' | 'oculta';
}

interface DataTableProps<T> {
  /** Nome acessível da tabela/lista */
  rotulo: string;
  colunas: ColunaTabela<T>[];
  linhas: T[];
  chaveLinha: (linha: T) => string;
  carregando?: boolean;
  /** Conteúdo exibido quando não há linhas (normalmente um EmptyState) */
  vazio?: React.ReactNode;
  linhaSelecionada?: string;
  onLinhaClick?: (linha: T) => void;
}

const MD_QUERY = '(min-width: 768px)';

/** Tabela padrão. Abaixo de 768 px vira lista de cartões, com as mesmas ações. */
export function DataTable<T>({
  rotulo,
  colunas,
  linhas,
  chaveLinha,
  carregando,
  vazio,
  linhaSelecionada,
  onLinhaClick,
}: DataTableProps<T>) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(MD_QUERY);

  if (carregando) {
    return (
      <div role="status" aria-label={t('ds.loading')} className="space-y-2 p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-ds-bg-subtle" />
        ))}
      </div>
    );
  }

  if (linhas.length === 0) return <>{vazio}</>;

  if (!isDesktop) {
    const titulo = colunas.find((c) => c.mobile === 'titulo') ?? colunas[0];
    const detalhes = colunas.filter((c) => c !== titulo && (c.mobile ?? 'detalhe') === 'detalhe');
    const acoes = colunas.filter((c) => c.mobile === 'acoes');

    return (
      <ul aria-label={rotulo} className="divide-y divide-ds-border">
        {linhas.map((linha) => {
          const id = chaveLinha(linha);
          return (
            <li
              key={id}
              aria-selected={linhaSelecionada === id || undefined}
              onClick={onLinhaClick ? () => onLinhaClick(linha) : undefined}
              className={cn(
                'px-4 py-3',
                linhaSelecionada === id && 'bg-ds-bg-selected',
                onLinhaClick && 'cursor-pointer'
              )}
            >
              <div className="text-[15px] font-medium text-ds-fg">{titulo.celula(linha)}</div>
              {detalhes.length > 0 && (
                <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  {detalhes.map((coluna) => (
                    <React.Fragment key={coluna.id}>
                      <dt className="text-ds-fg-muted">{coluna.cabecalho}</dt>
                      <dd className="tabular-nums text-ds-fg">{coluna.celula(linha)}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              )}
              {acoes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {acoes.map((coluna) => (
                    <React.Fragment key={coluna.id}>{coluna.celula(linha)}</React.Fragment>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table aria-label={rotulo} className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna.id}
                scope="col"
                className={cn(
                  'h-11 whitespace-nowrap border-b border-ds-border bg-ds-bg-subtle px-4 text-xs font-medium uppercase tracking-[0.04em] text-ds-fg-muted',
                  coluna.alinhar === 'direita' ? 'text-right' : 'text-left'
                )}
              >
                {coluna.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => {
            const id = chaveLinha(linha);
            const selecionada = linhaSelecionada === id;
            return (
              <tr
                key={id}
                aria-selected={selecionada}
                onClick={onLinhaClick ? () => onLinhaClick(linha) : undefined}
                className={cn(
                  'border-b border-ds-border last:border-b-0',
                  selecionada ? 'bg-ds-bg-selected' : 'hover:bg-ds-bg-subtle',
                  onLinhaClick && 'cursor-pointer'
                )}
              >
                {colunas.map((coluna) => (
                  <td
                    key={coluna.id}
                    className={cn(
                      'h-11 px-4 py-2.5 text-ds-fg',
                      coluna.alinhar === 'direita' ? 'text-right tabular-nums' : 'text-left'
                    )}
                  >
                    {coluna.celula(linha)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
