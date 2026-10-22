// Filtros EXPLORATÓRIOS do DS v2 (fora do glob de /prototipos): seleção múltipla em lista suspensa
// com o mesmo visual do campo de busca. Se aprovado, vira componente em src/components/ds/ com TDD.
import { Check, ChevronDown, Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const gatilho =
  'inline-flex h-11 items-center gap-2 rounded-lg border bg-ds-bg-surface px-3 text-base text-ds-fg transition hover:border-ds-fg-muted ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9 md:text-sm';

/** Vassoura no traço do lucide (o "brush-cleaning" só existe em versões mais novas que a do projeto) */
function IconeVassoura({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m16 22-1-4" />
      <path d="M19 14a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1" />
      <path d="M5 14h14l1.97 6.77A1 1 0 0 1 20 22H4a1 1 0 0 1-.97-1.23z" />
      <path d="m8 22 1-4" />
    </svg>
  );
}

/** Funil que mostra e esconde os filtros; o número é a quantidade de filtros em uso */
export function BotaoFiltros({
  abertos,
  ativos,
  controla,
  onClick,
}: {
  abertos: boolean;
  ativos: number;
  /** id do bloco de filtros que o botão abre */
  controla: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={abertos}
      aria-controls={controla}
      aria-label={ativos ? `Filtros (${ativos} ativos)` : 'Filtros'}
      title="Filtros"
      className={cn(
        'relative grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9 md:w-9',
        abertos || ativos
          ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
          : 'border-ds-border-strong bg-ds-bg-surface text-ds-fg-secondary hover:text-ds-fg'
      )}
    >
      <Filter className="h-4 w-4" />
      {ativos > 0 && (
        <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ds-accent px-1 text-[11px] font-semibold text-ds-fg-on-accent tabular-nums">
          {ativos}
        </span>
      )}
    </button>
  );
}

/** Botão só com ícone, do mesmo tamanho do botão de filtro, para limpar busca e filtros */
export function BotaoLimparFiltros({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Limpar filtros"
      title="Limpar filtros"
      className="ds-surgir grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-ds-border-strong bg-ds-bg-surface text-ds-fg-secondary transition hover:border-ds-fg-muted hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9 md:w-9"
    >
      <IconeVassoura className="h-4 w-4" />
    </button>
  );
}

export function FiltroMultiplo<T extends string>({
  rotulo,
  opcoes,
  selecionados,
  onChange,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  selecionados: T[];
  onChange: (valores: T[]) => void;
}) {
  const alternar = (v: T) =>
    onChange(selecionados.includes(v) ? selecionados.filter((s) => s !== v) : [...selecionados, v]);
  const resumo =
    selecionados.length === 1 ? opcoes.find((o) => o.valor === selecionados[0])?.rotulo : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            gatilho,
            selecionados.length ? 'border-[#00D4E8]' : 'border-ds-border-strong'
          )}
        >
          <span className={selecionados.length ? 'text-ds-fg' : 'text-ds-fg-secondary'}>
            {rotulo}
          </span>
          {resumo && <span className="max-w-[9rem] truncate font-medium">{resumo}</span>}
          {selecionados.length > 1 && (
            <span className="rounded-full bg-ds-accent px-1.5 text-xs font-medium text-ds-fg-on-accent tabular-nums">
              {selecionados.length}
            </span>
          )}
          <ChevronDown className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-ds="v2"
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-56 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
      >
        <div role="group" aria-label={rotulo} className="max-h-72 overflow-y-auto">
          {opcoes.map((o) => {
            const marcado = selecionados.includes(o.valor);
            return (
              <button
                key={o.valor}
                type="button"
                role="checkbox"
                aria-checked={marcado}
                onClick={() => alternar(o.valor)}
                className="flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition hover:bg-ds-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9"
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                    marcado
                      ? 'border-ds-accent bg-ds-accent text-ds-fg-on-accent'
                      : 'border-ds-border-strong'
                  )}
                >
                  {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                {o.rotulo}
              </button>
            );
          })}
        </div>
        {selecionados.length > 0 && (
          <div className="mt-1 border-t border-ds-border pt-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="h-9 w-full rounded-md px-2.5 text-left text-sm text-ds-fg-secondary transition hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
            >
              Limpar seleção
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Filtro liga/desliga com o mesmo visual dos demais (substitui a caixa de seleção nativa) */
export function FiltroAlternar({
  rotulo,
  ativo,
  onChange,
}: {
  rotulo: string;
  ativo: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={() => onChange(!ativo)}
      className={cn(
        gatilho,
        ativo
          ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
          : 'border-ds-border-strong text-ds-fg-secondary'
      )}
    >
      {ativo && <Check className="h-4 w-4" aria-hidden />}
      {rotulo}
    </button>
  );
}
