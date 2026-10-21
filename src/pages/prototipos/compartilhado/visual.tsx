// Peças visuais EXPLORATÓRIAS compartilhadas pelos protótipos do DS v2 (fora do glob de /prototipos).
// Quando aprovadas, viram componentes em src/components/ds, com teste.
import { useEffect, useRef, useState } from 'react';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';

/** Conta do valor anterior até o novo (de 0 na primeira vez). Sem animação se o sistema pedir menos movimento. */
export function useContador(alvo: number, duracao = 700) {
  const [valor, setValor] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const de = anterior.current;
    anterior.current = alvo;
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir || de === alvo) {
      setValor(alvo);
      return;
    }
    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const p = Math.min(1, (agora - inicio) / duracao);
      const suave = 1 - Math.pow(1 - p, 3);
      setValor(Math.round(de + (alvo - de) * suave));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);

  return valor;
}

export const atraso = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Minigráfico: a linha se desenha e a área aparece em seguida. Linha do zero tracejada. */
export function Sparkline({ valores, className }: { valores: number[]; className?: string }) {
  const min = Math.min(0, ...valores);
  const max = Math.max(0, ...valores);
  const faixa = max - min || 1;
  const x = (i: number) => (i / (valores.length - 1)) * 100;
  const y = (v: number) => 28 - ((v - min) / faixa) * 24;
  const pontos = valores.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const idGradiente = `sp-${valores.join('_')}`.replace(/-/g, 'n');
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={idGradiente} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        x2="100"
        y1={y(0)}
        y2={y(0)}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="2 3"
        vectorEffect="non-scaling-stroke"
      />
      <polygon
        points={`0,32 ${pontos} 100,32`}
        fill={`url(#${idGradiente})`}
        className="ds-aparecer"
        style={atraso(400)}
      />
      <polyline
        points={pontos}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="ds-desenhar"
      />
    </svg>
  );
}

/** Barra fina de consumo sobre o disponível; o excedente aparece em vermelho. Cresce ao aparecer. */
export function BarraConsumo({
  consumo,
  disponivel,
  rotulo,
  legenda = true,
  className,
}: {
  consumo: number;
  disponivel: number;
  rotulo: string;
  legenda?: boolean;
  className?: string;
}) {
  const pct = disponivel > 0 ? consumo / disponivel : 1;
  const estourou = pct > 1;
  const dentro = (estourou ? 1 / pct : pct) * 100;
  const alerta = !estourou && pct > 0.9;
  return (
    <div className={className}>
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-ds-bg-subtle"
        role="meter"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={disponivel}
        aria-valuenow={consumo}
        aria-valuetext={`${formatarHoras(consumo)} de ${formatarHoras(disponivel)}`}
      >
        <div className="ds-crescer flex h-full w-full">
          <div
            className={cn(
              'h-full rounded-full',
              alerta ? 'bg-[#F0A43A]' : 'bg-gradient-to-r from-[#00A9B9] to-[#00D4E8]'
            )}
            style={{ width: `${dentro}%` }}
          />
          {estourou && (
            <div className="h-full bg-ds-danger-fg" style={{ width: `${100 - dentro}%` }} />
          )}
        </div>
      </div>
      {legenda && (
        <p className="mt-1.5 flex justify-between gap-2 text-xs tabular-nums text-ds-fg-muted">
          <span>
            <span className="font-medium text-ds-fg">{formatarHoras(consumo)}</span> /{' '}
            {formatarHoras(disponivel)}
          </span>
          <span>{Math.round(pct * 100)}%</span>
        </p>
      )}
    </div>
  );
}
