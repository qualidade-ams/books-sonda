import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const QUANTIDADES_POR_PAGINA = [50, 100, 500, 1000];

/** Páginas a mostrar: todas até 7; senão a primeira, a última e as vizinhas da atual, com "…" */
export function paginasVisiveis(atual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (atual <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (atual >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', atual - 1, atual, atual + 1, '…', total];
}

const botao =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2.5 text-sm tabular-nums transition ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:pointer-events-none disabled:opacity-40 md:h-9 md:min-w-9';

function SeletorQuantidade({ valor, onChange }: { valor: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  const [aberto, setAberto] = useState(false);
  return (
    <label className="flex items-center gap-2 text-sm text-ds-fg-secondary">
      {t('ds.paginacao.mostrar')}
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t('ds.paginacao.itensPorPagina', { quantidade: valor })}
            className={cn(
              botao,
              'w-24 justify-between border border-ds-border-strong bg-ds-bg-surface text-ds-fg'
            )}
          >
            {valor}
            <ChevronDown className="h-4 w-4 text-ds-fg-muted" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          data-ds="v2"
          align="start"
          className="w-28 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
        >
          {QUANTIDADES_POR_PAGINA.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                onChange(q);
                setAberto(false);
              }}
              className="flex h-10 w-full items-center justify-between rounded-md px-2.5 text-sm tabular-nums transition hover:bg-ds-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9"
            >
              {q}
              {q === valor && <Check className="h-4 w-4 text-ds-fg-accent" aria-hidden />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </label>
  );
}

/**
 * Paginação do DS v2: quantidade por página à esquerda, páginas centralizadas entre Anterior
 * e Próxima, contagem à direita. Trocar a quantidade volta para a primeira página.
 */
export function Paginacao({
  total,
  pagina,
  porPagina,
  onPagina,
  onPorPagina,
}: {
  total: number;
  pagina: number;
  porPagina: number;
  onPagina: (p: number) => void;
  onPorPagina: (q: number) => void;
}) {
  const { t } = useTranslation();
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);

  return (
    <footer className="flex flex-col gap-3 border-t border-ds-border px-4 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
      <SeletorQuantidade
        valor={porPagina}
        onChange={(q) => {
          onPorPagina(q);
          onPagina(1);
        }}
      />

      <nav
        aria-label={t('ds.paginacao.navegacao')}
        className="flex items-center justify-center gap-1"
      >
        <button
          type="button"
          onClick={() => onPagina(pagina - 1)}
          disabled={pagina === 1}
          className={cn(botao, 'text-ds-fg-secondary hover:bg-ds-bg-subtle hover:text-ds-fg')}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t('ds.previous')}</span>
        </button>

        {/* No celular, só "Página x de y"; a partir de sm, os números */}
        <span className="px-2 text-sm tabular-nums text-ds-fg-secondary sm:hidden">
          {t('ds.paginacao.paginaDe', { pagina, total: paginas })}
        </span>
        <span className="hidden items-center gap-1 sm:flex">
          {paginasVisiveis(pagina, paginas).map((p, i) =>
            p === '…' ? (
              <span key={`r${i}`} className="w-6 text-center text-ds-fg-muted" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPagina(p)}
                aria-current={p === pagina ? 'page' : undefined}
                aria-label={t('ds.paginacao.pagina', { pagina: p })}
                className={cn(
                  botao,
                  p === pagina
                    ? 'bg-[#00D4E8] font-semibold text-black'
                    : 'text-ds-fg-secondary hover:bg-ds-bg-subtle hover:text-ds-fg'
                )}
              >
                {p}
              </button>
            )
          )}
        </span>

        <button
          type="button"
          onClick={() => onPagina(pagina + 1)}
          disabled={pagina === paginas}
          className={cn(botao, 'text-ds-fg-secondary hover:bg-ds-bg-subtle hover:text-ds-fg')}
        >
          <span className="hidden sm:inline">{t('ds.paginacao.proxima')}</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </nav>

      <span className="text-center text-sm tabular-nums text-ds-fg-muted md:text-right">
        {t('ds.paginacao.intervalo', { inicio, fim, total })}
      </span>
    </footer>
  );
}
