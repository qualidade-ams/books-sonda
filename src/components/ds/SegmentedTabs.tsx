import * as React from 'react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export interface ItemSegmentado {
  valor: string;
  rotulo: string;
  contador?: number;
  selo?: string;
}

interface SegmentedTabsProps {
  rotulo: string;
  itens: ItemSegmentado[];
  valor: string;
  onChange: (valor: string) => void;
  /** pilula: troca de visão (bancos, situação). sublinhado: seções de uma entidade ou tela. */
  variante?: 'pilula' | 'sublinhado';
  className?: string;
}

const MD_QUERY = '(min-width: 768px)';
const MAX_ITENS_NO_CELULAR = 4;

/**
 * Abas em pílula para trocar de visão (bancos, situação, mapeamentos).
 * No celular, com mais de 4 opções, vira uma lista de seleção nativa.
 */
export function SegmentedTabs({
  rotulo,
  itens,
  valor,
  onChange,
  variante = 'pilula',
  className,
}: SegmentedTabsProps) {
  const isDesktop = useMediaQuery(MD_QUERY);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  if (!isDesktop && itens.length > MAX_ITENS_NO_CELULAR) {
    return (
      <select
        aria-label={rotulo}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-11 w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 text-base text-ds-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
          className
        )}
      >
        {itens.map((item) => (
          <option key={item.valor} value={item.valor}>
            {item.rotulo}
            {item.selo ? ` (${item.selo})` : ''}
          </option>
        ))}
      </select>
    );
  }

  const indiceAtual = Math.max(
    0,
    itens.findIndex((i) => i.valor === valor)
  );

  const mover = (delta: number) => {
    const proximo = (indiceAtual + delta + itens.length) % itens.length;
    onChange(itens[proximo].valor);
    refs.current[proximo]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      mover(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      mover(-1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={rotulo}
      data-variante={variante}
      className={cn(
        variante === 'pilula'
          ? 'inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-ds-border bg-ds-bg-subtle p-1'
          : 'flex max-w-full gap-1 overflow-x-auto border-b border-ds-border',
        className
      )}
    >
      {itens.map((item, indice) => {
        const selecionado = item.valor === valor;
        return (
          <button
            key={item.valor}
            ref={(el) => (refs.current[indice] = el)}
            type="button"
            role="tab"
            aria-selected={selecionado}
            tabIndex={selecionado ? 0 : -1}
            onClick={() => onChange(item.valor)}
            onKeyDown={onKeyDown}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
              variante === 'pilula'
                ? cn(
                    'h-9 rounded-full px-3.5 md:h-8',
                    selecionado
                      ? 'bg-ds-bg-surface text-ds-fg shadow-[var(--ds-shadow-sm)] outline outline-1 outline-ds-border'
                      : 'text-ds-fg-secondary hover:text-ds-fg'
                  )
                : cn(
                    '-mb-px h-11 border-b-2 px-3',
                    selecionado
                      ? 'border-ds-fg-accent text-ds-fg-accent'
                      : 'border-transparent text-ds-fg-secondary hover:text-ds-fg'
                  )
            )}
          >
            {item.rotulo}
            {item.contador !== undefined && (
              <span className="rounded-full bg-ds-accent-subtle px-1.5 text-xs tabular-nums text-ds-fg-accent">
                {item.contador}
              </span>
            )}
            {item.selo && (
              <span className="rounded-full border border-ds-border bg-ds-bg-subtle px-1.5 text-[11px] text-ds-fg-secondary">
                {item.selo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
