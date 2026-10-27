import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PeriodPickerProps {
  rotulo: string;
  onAnterior: () => void;
  onProximo: () => void;
  podeAnterior?: boolean;
  podeProximo?: boolean;
}

/** Período de apuração com navegação anterior/próximo. */
export function PeriodPicker({
  rotulo,
  onAnterior,
  onProximo,
  podeAnterior = true,
  podeProximo = true,
}: PeriodPickerProps) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-ds-border-strong bg-ds-bg-surface">
      <Button
        variante="fantasma"
        tamanho="icone"
        aria-label={t('ds.previousPeriod')}
        disabled={!podeAnterior}
        onClick={onAnterior}
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-[9rem] px-1 text-center text-sm font-medium tabular-nums text-ds-fg">
        {rotulo}
      </span>
      <Button
        variante="fantasma"
        tamanho="icone"
        aria-label={t('ds.nextPeriod')}
        disabled={!podeProximo}
        onClick={onProximo}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
