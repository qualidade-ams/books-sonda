// Quadro mensal do banco no período: meses nas colunas e as linhas do cálculo (baseline, repasse,
// consumo, saldo…). Mês fechado mostra o resultado congelado; os futuros são projetados pelo motor.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Copy, Plus } from 'lucide-react';
import { MatrixTable, type LinhaMatriz } from '@/components/ds/MatrixTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Escolha } from '@/components/ds/Formulario';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import {
  indiceReferencia,
  rotuloMesLocal,
  unidadePrincipal,
  type MesDoQuadro,
} from '@/utils/controleTela';
import type { MesAno, Unidade } from '@/services/bancosHoras/calculo';
import type { BancoCadastro, ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';

type Campo = keyof Pick<
  ResultadoUnidade,
  | 'baseline'
  | 'repasseAnterior'
  | 'saldoAUtilizar'
  | 'consumo'
  | 'requerimentos'
  | 'reajustes'
  | 'consumoTotal'
  | 'saldo'
  | 'repasse'
  | 'consumidoDeOutros'
  | 'cedidoAOutros'
  | 'saldoFinal'
  | 'excedente'
>;

/** Botão do reajuste do mês: mostra o total e abre o lançamento já com o mês */
function BotaoReajuste({
  valor,
  unidade,
  rotulo,
  onClick,
}: {
  valor: number;
  unidade: Unidade;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
        valor
          ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
          : 'border-ds-border-strong text-ds-fg-secondary hover:border-[#00D4E8] hover:text-ds-fg-accent'
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {unidade === 'horas'
        ? formatarHoras(valor, { sinal: 'sempre' })
        : valor > 0
          ? `+${valor}`
          : valor}
      <Plus className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

export function QuadroControle({
  banco,
  meses,
  rotuloPeriodo,
  podeEditar,
  onReajuste,
}: {
  banco: Pick<BancoCadastro, 'bancoId' | 'nome' | 'tipoContrato'>;
  meses: MesDoQuadro[];
  rotuloPeriodo: string;
  podeEditar: boolean;
  onReajuste: (mes: MesAno) => void;
}) {
  const { t, i18n } = useTranslation();
  const q = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.quadro.${chave}`, valores);
  const [cobranca, setCobranca] = useState<Unidade>(unidadePrincipal(banco.tipoContrato));
  const [copiado, setCopiado] = useState(false);
  const unidade = banco.tipoContrato === 'ambos' ? cobranca : unidadePrincipal(banco.tipoContrato);
  const moeda = (v: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'BRL' }).format(v);
  const rotuloMes = (m: MesAno) => rotuloMesLocal(m, i18n.language);
  const doMes = (m: MesDoQuadro) => m.resultado?.[unidade] ?? null;
  const ref = meses[indiceReferencia(meses)];

  const valor = (n: number, opcoes: { cor?: 'saldo'; sinal?: 'sempre' } = {}) =>
    unidade === 'horas' ? (
      <HoursValue minutos={n} cor={opcoes.cor} sinal={opcoes.sinal} />
    ) : (
      <span className={cn('tabular-nums', opcoes.cor && n < 0 && 'text-ds-danger-fg')}>{n}</span>
    );
  const linha = (
    id: Campo,
    rotulo: string,
    extra: Partial<LinhaMatriz> = {},
    opcoes: { cor?: 'saldo'; sinal?: 'sempre' } = {}
  ): LinhaMatriz => ({
    id,
    rotulo,
    ...extra,
    valores: Object.fromEntries(
      meses.map((m) => {
        const u = doMes(m);
        return [m.chave, u ? valor(u[id], opcoes) : '—'];
      })
    ),
  });
  const algum = (campo: Campo) => meses.some((m) => (doMes(m)?.[campo] ?? 0) !== 0);

  const linhas: LinhaMatriz[] = [
    linha('baseline', q('baseline')),
    linha('repasseAnterior', q('repasseAnterior')),
    linha('saldoAUtilizar', q('disponivel'), { enfase: 'total' }),
    linha('consumo', q('chamados')),
    linha('requerimentos', q('requerimentos')),
    podeEditar
      ? {
          id: 'reajustes',
          rotulo: q('reajustes'),
          valores: Object.fromEntries(
            meses.map((m) => [
              m.chave,
              <BotaoReajuste
                key={m.chave}
                valor={doMes(m)?.reajustes ?? 0}
                unidade={unidade}
                rotulo={q('lancarReajuste', { mes: rotuloMes(m.mes) })}
                onClick={() => onReajuste(m.mes)}
              />,
            ])
          ),
        }
      : linha('reajustes', q('reajustes'), {}, { sinal: 'sempre' }),
    linha('consumoTotal', q('consumoTotal'), { enfase: 'total' }),
    linha('saldo', q('saldo'), { enfase: 'total' }, { cor: 'saldo' }),
    linha('repasse', q('repasse', { n: ref?.resultado?.percentualRepasse ?? 0 })),
  ];
  const entreBancos = algum('consumidoDeOutros') || algum('cedidoAOutros');
  if (algum('consumidoDeOutros'))
    linhas.push(linha('consumidoDeOutros', q('consumidoDeOutros'), { enfase: 'info' }));
  if (algum('cedidoAOutros'))
    linhas.push(linha('cedidoAOutros', q('cedidoAOutros'), { enfase: 'warning' }));
  if (entreBancos)
    linhas.push(linha('saldoFinal', q('saldoFinal'), { enfase: 'total' }, { cor: 'saldo' }));

  const fechamento = meses.find((m) => (doMes(m)?.excedente ?? 0) > 0);
  const excedente = fechamento ? doMes(fechamento) : null;
  if (excedente)
    linhas.push(linha('excedente', q('excedente'), { enfase: 'warning' }), {
      id: 'valor',
      rotulo: q('valorFaturar'),
      enfase: 'total',
      valores: Object.fromEntries(
        meses.map((m) => {
          const u = doMes(m);
          return [
            m.chave,
            u?.valorExcedente ? (
              <span className="tabular-nums">{moeda(u.valorExcedente)}</span>
            ) : (
              '—'
            ),
          ];
        })
      ),
    });

  const quantidade = (n: number) => (unidade === 'horas' ? formatarHoras(n) : q('ticketsN', { n }));
  const taxaTexto = excedente?.taxa
    ? q(unidade === 'horas' ? 'porHora' : 'porTicket', { valor: moeda(excedente.taxa) })
    : '—';
  const mensagem = excedente
    ? q('mensagemExcedente', {
        periodo: rotuloPeriodo,
        banco: banco.nome,
        quantidade: quantidade(excedente.excedente),
        taxa: taxaTexto,
        valor: moeda(excedente.valorExcedente),
      })
    : '';

  const observacoes = [
    ...new Set(meses.flatMap((m) => m.resultado?.observacoes.map((o) => o.texto) ?? [])),
  ];
  const alertas = [...new Set(meses.flatMap((m) => m.resultado?.alertas ?? []))];
  const ultimoCalculado = [...meses].reverse().find((m) => m.situacao !== 'futuro');
  const temFuturo = meses.some((m) => m.situacao === 'futuro');

  return (
    <div className="space-y-4">
      {banco.tipoContrato === 'ambos' && (
        <div className="max-w-xs">
          <Escolha<Unidade>
            rotulo={q('cobranca')}
            opcoes={[
              { valor: 'horas', rotulo: q('horas') },
              { valor: 'tickets', rotulo: q('tickets') },
            ]}
            valor={cobranca}
            onChange={setCobranca}
          />
        </div>
      )}
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <MatrixTable
          rotulo={q(
            unidade === 'tickets' && banco.tipoContrato === 'ambos' ? 'rotuloTickets' : 'rotulo',
            {
              banco: banco.nome,
            }
          )}
          rotuloIndicador={unidade === 'horas' ? q('horas') : q('tickets')}
          colunas={meses.map((m) => ({
            id: m.chave,
            rotulo: rotuloMes(m.mes),
            atual: m.situacao === 'aberto',
          }))}
          linhas={linhas}
          modoMobile="mes-a-mes"
          alinhamento="centro"
          colunaInicial={ref?.chave}
        />
        {temFuturo && ultimoCalculado && (
          <p className="border-t border-ds-border px-4 py-2.5 text-xs text-ds-fg-muted">
            {q('legendaProjecao', { mes: rotuloMes(ultimoCalculado.mes) })}
          </p>
        )}
      </div>

      {observacoes.length > 0 && (
        <Callout tom="info" titulo={q('observacaoAutomatica')}>
          <ul className="space-y-1">
            {observacoes.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Callout>
      )}
      {alertas.length > 0 && (
        <Callout tom="warning" titulo={q('alertas')}>
          <ul className="space-y-1">
            {alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Callout>
      )}

      {excedente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ds-warning-border bg-ds-warning-bg px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-ds-warning-fg">
              {q('excedenteTitulo', {
                quantidade: quantidade(excedente.excedente),
                valor: moeda(excedente.valorExcedente),
              })}
            </p>
            <p className="text-ds-fg-secondary">{q('excedenteTaxa', { taxa: taxaTexto })}</p>
          </div>
          <Button
            tamanho="sm"
            onClick={() => {
              navigator.clipboard?.writeText(mensagem).catch(() => undefined);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 1500);
            }}
          >
            {copiado ? <CheckCircle2 /> : <Copy />}{' '}
            {copiado ? q('mensagemCopiada') : q('copiarMensagem')}
          </Button>
        </div>
      )}
    </div>
  );
}
