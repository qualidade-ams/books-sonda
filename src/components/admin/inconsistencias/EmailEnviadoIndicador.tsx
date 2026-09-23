import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EnvioEmailInconsistencia } from '@/types/inconsistenciasChamados';
import { formatarDataHoraEnvio } from '@/utils/formatarDataHoraEnvio';

interface EmailEnviadoIndicadorProps {
  envios: EnvioEmailInconsistencia[] | undefined;
}

/**
 * Bolinha verde exibida ao lado do nº do chamado quando já foi enviado email
 * sobre a inconsistência. Ao passar o mouse, lista todos os envios.
 */
export function EmailEnviadoIndicador({ envios }: EmailEnviadoIndicadorProps) {
  if (!envios || envios.length === 0) return null;

  const rotulo = envios.length === 1 ? 'Email enviado' : `Email enviado (${envios.length} envios)`;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={rotulo}
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500 cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1"
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <p className="text-xs font-semibold mb-1">{rotulo}</p>
          <ul className="space-y-1.5">
            {envios.map((envio, idx) => (
              <li key={`${envio.data_envio}-${idx}`} className="text-xs">
                <p className="font-medium">{formatarDataHoraEnvio(envio.data_envio)}</p>
                <p className="break-all">Para: {envio.email_para || '-'}</p>
                {envio.email_cc && <p className="break-all">CC: {envio.email_cc}</p>}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
