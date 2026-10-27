// Peças de formulário promovidas para src/components/ds/Formulario (23/10/2026). Aqui ficam só as
// chaves tracejadas, que existem apenas nos protótipos.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export {
  Ajuda,
  BarraRodape,
  CampoHoras,
  CampoNumero,
  CampoTexto,
  ChaveCompacta,
  Chip,
  DicaDoRotulo,
  Escolha,
  IconeComDica,
  Indicador,
  InfoDica,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
  TituloFaixa,
  ValorCopiavel,
  Vazio,
} from '@/components/ds/Formulario';

/** Chave tracejada no topo, só do protótipo (momento, perfil de acesso…) */
export function ChavePrototipo<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  opcoes: [T, string][];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{rotulo}:</span>
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={valor === v}
          className={cn(
            'rounded-full border px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
            valor === v
              ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
              : 'border-ds-border-strong'
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/** Caixa tracejada que agrupa as chaves só do protótipo */
export function ChavesPrototipo({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-ds-border-strong px-3 py-2 text-xs text-ds-fg-secondary">
      {children}
    </div>
  );
}
