import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MesPendenteIndicador {
  rotulo: string;
  quantidade: number;
}

interface PendentesMesesAnterioresIndicadorProps {
  mensagem: string;
  meses: MesPendenteIndicador[] | undefined;
}

/**
 * Bolinha exibida no botão "Anterior" com o total de requerimentos pendentes de envio
 * em meses anteriores ao selecionado. Ao passar o mouse, lista os meses e suas quantidades.
 */
export function PendentesMesesAnterioresIndicador({ mensagem, meses }: PendentesMesesAnterioresIndicadorProps) {
  if (!meses || meses.length === 0) return null;

  const total = meses.reduce((soma, mes) => soma + mes.quantidade, 0);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${mensagem} (${total})`}
            className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold leading-none ring-2 ring-white dark:ring-gray-800 cursor-default focus:outline-none focus-visible:ring-red-600"
          >
            {total > 99 ? '99+' : total}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-semibold mb-1">{mensagem}</p>
          <ul className="text-xs space-y-0.5">
            {meses.map(mes => (
              <li key={mes.rotulo}>{mes.rotulo}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
