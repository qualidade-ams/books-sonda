import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';

export interface ColunaMatriz {
  id: string;
  rotulo: string;
  /** Mês corrente: cabeçalho em destaque (cor de acento) e aria-current="date" */
  atual?: boolean;
}

export interface LinhaMatriz {
  id: string;
  rotulo: React.ReactNode;
  valores: Record<string, React.ReactNode>;
  /** total: linha de soma em destaque; info/warning: consumo entre bancos (consumido/cedido) */
  enfase?: 'total' | 'info' | 'warning';
  selo?: string;
  /** Ação inline ao lado do rótulo (ex.: reajuste) */
  acao?: React.ReactNode;
}

interface MatrixTableProps {
  rotulo: string;
  rotuloIndicador: string;
  colunas: ColunaMatriz[];
  linhas: LinhaMatriz[];
  /** No celular: rolagem lateral com a 1ª coluna fixa, ou um mês por vez com setas */
  modoMobile?: 'rolagem' | 'mes-a-mes';
  /** Coluna mostrada primeiro no modo mês a mês (ex.: o mês atual) */
  colunaInicial?: string;
}

const MD_QUERY = '(min-width: 768px)';

const fundoEnfase = {
  total: 'bg-ds-bg-subtle font-bold',
  info: 'bg-ds-info-bg text-ds-info-fg',
  warning: 'bg-ds-warning-bg text-ds-warning-fg',
};

/** Quadro mensal: indicadores nas linhas, meses nas colunas. */
export function MatrixTable({
  rotulo,
  rotuloIndicador,
  colunas,
  linhas,
  modoMobile = 'rolagem',
  colunaInicial,
}: MatrixTableProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(MD_QUERY);
  const [indice, setIndice] = React.useState(() =>
    Math.max(
      0,
      colunas.findIndex((c) => c.id === colunaInicial)
    )
  );

  const mesAMes = !isDesktop && modoMobile === 'mes-a-mes';
  const visiveis = mesAMes ? colunas.slice(indice, indice + 1) : colunas;

  return (
    <div>
      {mesAMes && (
        <div className="flex items-center justify-between gap-2 border-b border-ds-border px-2 py-2">
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={t('ds.previous')}
            disabled={indice === 0}
            onClick={() => setIndice((i) => i - 1)}
          >
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <p className={cn('text-sm font-medium', colunas[indice]?.atual && 'text-ds-fg-accent')}>
              {colunas[indice]?.rotulo}
            </p>
            <p className="text-xs text-ds-fg-muted">
              {t('ds.positionOf', { atual: indice + 1, total: colunas.length })}
            </p>
          </div>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={t('ds.next')}
            disabled={indice === colunas.length - 1}
            onClick={() => setIndice((i) => i + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table aria-label={rotulo} className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-[1] h-11 whitespace-nowrap border-b border-ds-border bg-ds-bg-subtle px-4 text-left text-xs font-medium uppercase tracking-[0.04em] text-ds-fg-muted"
              >
                {rotuloIndicador}
              </th>
              {visiveis.map((coluna) => (
                <th
                  key={coluna.id}
                  scope="col"
                  aria-current={coluna.atual ? 'date' : undefined}
                  className={cn(
                    'h-11 whitespace-nowrap border-b border-ds-border bg-ds-bg-subtle px-4 text-right text-xs uppercase tracking-[0.04em]',
                    coluna.atual
                      ? 'font-semibold text-ds-fg-accent'
                      : 'font-medium text-ds-fg-muted'
                  )}
                >
                  {coluna.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr
                key={linha.id}
                data-enfase={linha.enfase}
                className={cn(
                  'border-b border-ds-border last:border-b-0',
                  linha.enfase && fundoEnfase[linha.enfase]
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 z-[1] h-11 px-4 text-left font-normal',
                    linha.enfase ? fundoEnfase[linha.enfase] : 'bg-ds-bg-surface'
                  )}
                >
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {linha.rotulo}
                    {linha.selo && <StatusBadge tom="novo">{linha.selo}</StatusBadge>}
                    {linha.acao}
                  </span>
                </th>
                {visiveis.map((coluna) => (
                  <td
                    key={coluna.id}
                    className="h-11 whitespace-nowrap px-4 text-right tabular-nums"
                  >
                    {linha.valores[coluna.id] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
