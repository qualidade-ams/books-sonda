// Navegação entre os períodos de apuração do banco, do primeiro (início da vigência) ao atual.
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ds/Button';

export function NavegadorPeriodo({
  rotulos,
  indice,
  periodicidade,
  onIndice,
}: {
  /** Rótulo de cada período, do primeiro ao atual */
  rotulos: string[];
  indice: number;
  periodicidade: string;
  onIndice: (i: number) => void;
}) {
  const { t } = useTranslation();
  const p = (chave: string) => t(`controleBancoHoras.periodo.${chave}`);
  const atual = indice === rotulos.length - 1;
  return (
    <nav
      aria-label={p('rotulo')}
      className="ds-surgir flex items-center justify-between gap-3 rounded-xl border border-ds-border bg-ds-bg-surface p-1.5"
    >
      <Button
        variante="fantasma"
        tamanho="sm"
        className="text-ds-fg"
        disabled={indice === 0}
        title={indice === 0 ? p('inicioVigencia') : undefined}
        aria-label={p('anterior')}
        onClick={() => onIndice(indice - 1)}
      >
        <ChevronLeft /> <span className="hidden sm:inline">{p('anterior')}</span>
      </Button>
      <div className="text-center">
        <p className="font-ds-title text-base font-semibold tracking-tight text-ds-fg md:text-lg">
          {rotulos[indice]}
        </p>
        <p className="text-xs text-ds-fg-muted">
          {periodicidade} · {atual ? p('atual') : p('passado')}
        </p>
      </div>
      <Button
        variante="fantasma"
        tamanho="sm"
        className="text-ds-fg"
        disabled={atual}
        aria-label={indice === rotulos.length - 2 ? p('periodoAtual') : p('proximo')}
        onClick={() => onIndice(indice + 1)}
      >
        <span className="hidden sm:inline">
          {indice === rotulos.length - 2 ? p('periodoAtual') : p('proximo')}
        </span>{' '}
        <ChevronRight />
      </Button>
    </nav>
  );
}
