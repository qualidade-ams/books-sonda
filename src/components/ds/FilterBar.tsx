import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button } from './Button';

interface FilterBarProps {
  busca?: { valor: string; onChange: (valor: string) => void; placeholder: string };
  /** Quantos filtros (além da busca) estão ativos */
  filtrosAtivos: number;
  onLimpar: () => void;
  /** Os controles de filtro (selects, seletores de mês…) */
  children?: React.ReactNode;
}

const MD_QUERY = '(min-width: 768px)';

/** Busca + filtros. No celular, os filtros ficam numa gaveta "Filtros (n)". */
export function FilterBar({ busca, filtrosAtivos, onLimpar, children }: FilterBarProps) {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery(MD_QUERY);
  const [aberto, setAberto] = React.useState(false);

  const campoBusca = busca && (
    <label className="relative block min-w-0 flex-1 md:max-w-sm">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
        aria-hidden
      />
      <input
        type="search"
        aria-label={busca.placeholder}
        placeholder={busca.placeholder}
        value={busca.valor}
        onChange={(e) => busca.onChange(e.target.value)}
        className="h-11 w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface pl-9 pr-3 text-base text-ds-fg placeholder:text-ds-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9 md:text-sm"
      />
    </label>
  );

  const limpar = (
    <Button variante="fantasma" onClick={onLimpar}>
      {t('ds.clearFilters')}
    </Button>
  );

  if (isDesktop) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {campoBusca}
        {children}
        {filtrosAtivos > 0 && limpar}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {campoBusca}
      {children && (
        <>
          <Button onClick={() => setAberto(true)} aria-label={t('ds.filters')} className="shrink-0">
            <SlidersHorizontal />
            <span aria-hidden>{t('ds.filters')}</span>
            {filtrosAtivos > 0 && (
              <span className="rounded-full bg-ds-accent px-1.5 text-xs text-ds-fg-on-accent tabular-nums">
                {filtrosAtivos}
              </span>
            )}
          </Button>
          <Sheet open={aberto} onOpenChange={setAberto}>
            <SheetContent
              side="bottom"
              data-ds="v2"
              aria-describedby={undefined}
              className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-ds-border bg-ds-bg-raised font-ds-sans text-ds-fg"
            >
              <SheetTitle className="mb-4 text-base font-medium text-ds-fg">
                {t('ds.filters')}
              </SheetTitle>
              <div className="flex flex-col gap-4 [&_select]:w-full [&>*]:w-full">{children}</div>
              <div className="mt-6 flex gap-2">
                {filtrosAtivos > 0 && limpar}
                <Button variante="primario" className="flex-1" onClick={() => setAberto(false)}>
                  {t('ds.applyFilters')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
