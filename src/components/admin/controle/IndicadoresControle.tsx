// Indicadores do banco no período escolhido, sobre a faixa do topo: baseline, consumo do mês de
// referência, saldo e, no fechamento, o excedente ou o consumo entre bancos.
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  Clock,
  Receipt,
  Sigma,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Sparkline, atraso, useContador } from '@/components/ds/Visual';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import {
  indiceReferencia,
  rotuloMesLocal,
  unidadePrincipal,
  type MesDoQuadro,
} from '@/utils/controleTela';
import type { Unidade } from '@/services/bancosHoras/calculo';
import type { BancoCadastro } from '@/services/bancosHoras/motorBancosHoras';
import { usePeriodoTexto } from '@/components/admin/empresas/periodoTexto';

function Kpi({
  rotulo,
  icone,
  texto,
  tom = 'neutral',
  rodape,
  atrasoMs = 0,
}: {
  rotulo: string;
  icone: ReactNode;
  texto: string;
  tom?: 'neutral' | 'success' | 'danger' | 'info' | 'warning';
  rodape: ReactNode;
  atrasoMs?: number;
}) {
  const cor = {
    danger: 'text-ds-danger-fg',
    success: 'text-ds-success-fg',
    info: 'text-ds-fg-accent',
    warning: 'text-ds-warning-fg',
    neutral: 'text-ds-fg',
  }[tom];
  return (
    <div
      className="ds-surgir flex flex-col rounded-xl border border-ds-border bg-ds-bg-surface p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)]"
      style={atraso(atrasoMs)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ds-fg-muted">{rotulo}</p>
          <p
            className={cn('mt-1 text-2xl font-semibold leading-8 tracking-tight tabular-nums', cor)}
          >
            {texto}
          </p>
        </div>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ds-accent-subtle text-ds-fg-accent [&_svg]:h-4 [&_svg]:w-4"
          aria-hidden
        >
          {icone}
        </span>
      </div>
      <div className="mt-2 flex min-h-[24px] items-end text-xs text-ds-fg-muted">{rodape}</div>
    </div>
  );
}

/** Número que cresce até o valor, na unidade do banco */
function useQuantidade(valor: number, unidade: Unidade, sinal?: 'sempre') {
  const animado = useContador(Math.round(valor));
  return unidade === 'horas'
    ? formatarHoras(animado, { sinal })
    : sinal && animado > 0
      ? `+${animado}`
      : String(animado);
}

export function IndicadoresControle({
  banco,
  meses,
}: {
  banco: Pick<BancoCadastro, 'tipoContrato' | 'periodoApuracao' | 'bancoId'>;
  meses: MesDoQuadro[];
}) {
  const { t, i18n } = useTranslation();
  const k = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.kpis.${chave}`, valores);
  const periodoTexto = usePeriodoTexto();
  const unidade = unidadePrincipal(banco.tipoContrato);
  const moeda = (v: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'BRL' }).format(v);
  const fmt = (n: number, sinal?: 'sempre') =>
    unidade === 'horas' ? formatarHoras(n, { sinal }) : sinal && n > 0 ? `+${n}` : String(n);

  const i = indiceReferencia(meses);
  const ref = meses[i];
  const anterior = meses[i - 1];
  const u = ref?.resultado?.[unidade] ?? null;
  const uAnterior = anterior?.resultado?.[unidade] ?? null;
  const aberto = ref?.situacao === 'aberto';
  const saldo = u ? (aberto ? u.saldo : u.saldoFinal) : 0;
  const comExcedente = meses
    .map((m) => m.resultado?.[unidade])
    .find((x) => (x?.excedente ?? 0) > 0);
  const entre = meses.reduce(
    (s, m) =>
      s +
      (m.resultado?.[unidade]?.consumidoDeOutros ?? 0) -
      (m.resultado?.[unidade]?.cedidoAOutros ?? 0),
    0
  );
  const saldos = meses
    .filter((m) => m.situacao !== 'futuro')
    .map((m) => m.resultado?.[unidade]?.saldo ?? 0);

  const baselineTexto = useQuantidade(u?.baseline ?? 0, unidade);
  const consumoTexto = useQuantidade(u?.consumoTotal ?? 0, unidade);
  const saldoTexto = useQuantidade(saldo, unidade);
  const entreTexto = useQuantidade(entre, unidade, 'sempre');
  const rotuloRef = ref ? rotuloMesLocal(ref.mes, i18n.language) : '';
  const variacao = u && uAnterior ? u.consumoTotal - uAnterior.consumoTotal : null;

  return (
    <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
      <Kpi
        rotulo={k('baseline')}
        icone={<Wallet />}
        texto={baselineTexto}
        rodape={k('baselineRodape', {
          periodo: periodoTexto(banco.periodoApuracao),
          n: ref?.resultado?.percentualRepasse ?? 0,
        })}
      />
      <Kpi
        rotulo={k('consumo', { mes: rotuloRef })}
        icone={<Sigma />}
        texto={consumoTexto}
        atrasoMs={60}
        rodape={
          variacao !== null && anterior ? (
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
                  variacao < 0
                    ? 'bg-ds-success-bg text-ds-success-fg'
                    : 'bg-ds-danger-bg text-ds-danger-fg'
                )}
              >
                {variacao < 0 ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                {fmt(variacao, 'sempre')}
              </span>
              {k('versus', { mes: rotuloMesLocal(anterior.mes, i18n.language) })}
            </span>
          ) : (
            k('primeiroMes')
          )
        }
      />
      <Kpi
        rotulo={aberto ? k('saldo', { mes: rotuloRef }) : k('saldoFinal')}
        icone={<Clock />}
        texto={saldoTexto}
        tom={saldo < 0 ? 'danger' : saldo > 0 ? 'success' : 'neutral'}
        atrasoMs={120}
        rodape={
          saldos.length > 1 ? (
            <Sparkline
              valores={saldos}
              className={cn('h-6 w-full', saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
            />
          ) : null
        }
      />
      {comExcedente ? (
        <Kpi
          rotulo={k('excedente')}
          icone={<Receipt />}
          texto={moeda(comExcedente.valorExcedente)}
          tom="warning"
          atrasoMs={180}
          rodape={k('excedenteRodape', {
            quantidade: fmt(comExcedente.excedente),
            taxa: comExcedente.taxa !== null ? moeda(comExcedente.taxa) : '—',
          })}
        />
      ) : (
        <Kpi
          rotulo={k('entreBancos')}
          icone={<ArrowLeftRight />}
          texto={entreTexto}
          tom={entre ? 'info' : 'neutral'}
          atrasoMs={180}
          rodape={
            entre > 0
              ? k('entreRecebeu')
              : entre < 0
                ? k('entreCedeu')
                : aberto
                  ? k('soNoFechamento')
                  : k('semMovimento')
          }
        />
      )}
    </div>
  );
}
