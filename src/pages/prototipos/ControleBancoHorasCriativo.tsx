// Protótipo EXPLORATÓRIO do Controle de Banco de Horas: versão com mais presença de marca, para comparar
// com /prototipos/controle-banco-horas-v2. Os elementos visuais novos ficam neste arquivo de propósito:
// só o que for aprovado vira componente em src/components/ds (com teste).
//
// Grade de espaçamento: 4/8 px. Cartões p-4 (16), entre cartões gap-3 (12), entre seções 24.
// A faixa, os indicadores e o conteúdo compartilham a mesma borda esquerda.
import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  RefreshCw,
  Send,
  Sigma,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { MatrixTable, type LinhaMatriz } from '@/components/ds/MatrixTable';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import {
  EMPRESAS_MOCK,
  MESES_MOCK,
  QUADRO_MOCK,
  REQUERIMENTOS_MOCK,
  BANCOS_MOCK,
  type RequerimentoMock,
} from './mocks/controleBancoHorasV2';
import {
  CONSUMO_ENTRE_BANCOS_MOCK,
  MESES_PERIODO_MOCK,
  RESUMO_BANCOS_MOCK,
  type MesPeriodoMock,
  type ResumoBancoMock,
} from './mocks/controleBancoHorasCriativo';
import { BarraConsumo, Sparkline, atraso, useContador } from './compartilhado/visual';

/* ------------------------------------------------------------------ */
/* Peças visuais exploratórias                                         */
/* ------------------------------------------------------------------ */

const vidro = 'border border-white/15 bg-white/[0.06] backdrop-blur-md';
const botaoVidro = cn(
  'inline-flex h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-white transition hover:bg-white/[0.14] md:h-9',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
  vidro
);

/** Faixa escura de marca no topo da página. */
function Hero({
  empresa,
  setEmpresa,
  onRecalcular,
}: {
  empresa: string;
  setEmpresa: (e: string) => void;
  onRecalcular: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-black px-4 pb-16 pt-5 text-white md:px-8 md:pb-[72px] md:pt-7">
      <div
        aria-hidden
        className="ds-flutuar pointer-events-none absolute -right-20 -top-28 h-[360px] w-[360px] rounded-full bg-[#00D4E8] opacity-[0.22] blur-[100px]"
      />
      <div
        aria-hidden
        className="ds-flutuar pointer-events-none absolute -bottom-36 left-1/4 h-[260px] w-[260px] rounded-full bg-[#006F7D] opacity-30 blur-[90px]"
        style={{ animationDelay: '-7s' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_left,black_10%,transparent_65%)]"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="ds-surgir max-w-2xl">
          <div
            className={cn(
              'mb-3 inline-flex h-7 items-center gap-2 rounded-lg pl-1 pr-2.5 text-xs',
              vidro
            )}
          >
            <span className="rounded-md bg-[#00D4E8] px-1.5 py-0.5 text-[11px] font-semibold text-black">
              Novo
            </span>
            <span className="text-white/85">Bancos múltiplos ativos para esta empresa</span>
          </div>
          <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
            Controle de{' '}
            <span className="bg-gradient-to-r from-[#00D4E8] to-[#7CEBF5] bg-clip-text text-transparent">
              Banco de Horas
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
            Consumo, saldo e repasse de cada banco até o fechamento do período.
          </p>
        </div>

        <div className="ds-surgir flex flex-wrap gap-2" style={atraso(80)}>
          <button type="button" className={botaoVidro}>
            <History className="h-4 w-4" /> Histórico
          </button>
          <button type="button" className={botaoVidro}>
            <Send className="h-4 w-4" /> Enviar Saldo Parcial
          </button>
          <button
            type="button"
            onClick={onRecalcular}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#00D4E8] px-3.5 text-sm font-semibold text-black shadow-[0_6px_24px_rgba(0,212,232,0.35)] transition hover:-translate-y-px hover:bg-[#33DDED] hover:shadow-[0_10px_30px_rgba(0,212,232,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-9"
          >
            <RefreshCw className="h-4 w-4" /> Recalcular
          </button>
        </div>
      </div>

      <div
        className="ds-surgir relative mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
        style={atraso(140)}
      >
        <label
          className={cn(
            'relative flex h-11 items-center rounded-lg transition hover:bg-white/[0.1] sm:w-64 md:h-9',
            vidro
          )}
        >
          <span className="sr-only">Empresa</span>
          <select
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="h-full w-full appearance-none rounded-lg bg-transparent pl-3 pr-9 text-base font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:text-sm [&>option]:text-black"
          >
            {EMPRESAS_MOCK.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 h-4 w-4 text-white/60"
            aria-hidden
          />
        </label>
        <div className={cn('inline-flex h-11 items-center self-start rounded-lg md:h-9', vidro)}>
          <button
            type="button"
            aria-label="Período anterior"
            className="grid h-full w-10 place-items-center rounded-l-lg transition hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1.5 text-sm font-medium tabular-nums">Out – Dez/2026</span>
          <button
            type="button"
            aria-label="Próximo período"
            disabled
            className="grid h-full w-10 place-items-center rounded-r-lg text-white/30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-[#4CC77A]/35 bg-[#4CC77A]/10 px-2.5 text-xs font-medium text-[#4CC77A] sm:self-auto">
          <CheckCircle2 className="h-3.5 w-3.5" /> Bancos múltiplos
        </span>
      </div>
    </section>
  );
}

/** Indicador compacto: valor que conta, ícone e uma linha de rodapé (variação, tendência ou contexto). */
function Kpi({
  rotulo,
  icone,
  valor,
  tom = 'neutral',
  rodape,
  atrasoMs = 0,
}: {
  rotulo: string;
  icone: React.ReactNode;
  valor: number;
  tom?: 'neutral' | 'success' | 'danger';
  rodape: React.ReactNode;
  atrasoMs?: number;
}) {
  const animado = useContador(valor);
  const cor =
    tom === 'danger'
      ? 'text-ds-danger-fg'
      : tom === 'success'
        ? 'text-ds-success-fg'
        : 'text-ds-fg';
  return (
    <div
      className="ds-surgir flex flex-col rounded-xl border border-ds-border bg-ds-bg-surface p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_rgba(0,0,0,0.25)]"
      style={atraso(atrasoMs)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ds-fg-muted">{rotulo}</p>
          <p
            className={cn('mt-1 text-2xl font-semibold leading-8 tracking-tight tabular-nums', cor)}
          >
            {formatarHoras(animado)}
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

function Variacao({ minutos, texto }: { minutos: number; texto: string }) {
  const caiu = minutos < 0;
  return (
    <span className="flex items-center gap-1">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
          caiu ? 'bg-ds-danger-bg text-ds-danger-fg' : 'bg-ds-success-bg text-ds-success-fg'
        )}
      >
        {caiu ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {formatarHoras(minutos, { sinal: 'sempre' })}
      </span>
      {texto}
    </span>
  );
}

/** Banco na lista: compacto, seleciona o banco exibido. */
function ItemBanco({
  banco,
  selecionado,
  onSelecionar,
  atrasoMs,
}: {
  banco: ResumoBancoMock;
  selecionado: boolean;
  onSelecionar: () => void;
  atrasoMs: number;
}) {
  const negativo = banco.saldo < 0;
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onSelecionar}
      style={atraso(atrasoMs)}
      className={cn(
        'ds-surgir group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-xl border bg-ds-bg-surface p-3.5 text-left transition duration-200 sm:w-auto',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-page',
        selecionado
          ? 'border-[#00D4E8] shadow-[0_0_0_3px_rgba(0,212,232,0.16),0_10px_24px_-14px_rgba(0,212,232,0.6)]'
          : 'border-ds-border hover:-translate-y-0.5 hover:border-ds-border-strong hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.3)]'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-[3px] bg-[#00D4E8] transition-transform duration-300',
          selecionado ? 'scale-y-100' : 'scale-y-0'
        )}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-ds-fg">{banco.nome}</p>
        {banco.padrao && (
          <StatusBadge tom="neutral" className="h-5 px-2 text-[11px]">
            padrão
          </StatusBadge>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p
          className={cn(
            'text-xl font-semibold leading-7 tracking-tight tabular-nums',
            negativo ? 'text-ds-danger-fg' : 'text-ds-success-fg'
          )}
        >
          {formatarHoras(banco.saldo)}
        </p>
        <Sparkline
          key={banco.id}
          valores={banco.historicoSaldo}
          className={cn('h-7 w-20', negativo ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
        />
      </div>
      <div className="mt-2.5">
        <BarraConsumo
          consumo={banco.consumo}
          disponivel={banco.saldoUtilizar}
          rotulo={`Consumo do ${banco.nome}`}
        />
      </div>
    </button>
  );
}

/** Mês do período, compacto. */
function CartaoMes({ mes, atrasoMs }: { mes: MesPeriodoMock; atrasoMs: number }) {
  const linhas: [string, number][] = [
    ['Baseline', mes.baseline],
    ['Repasse', mes.repasseAnterior],
    ['Apontamentos', mes.apontamentos],
    ['Requerimentos', mes.requerimentos],
  ];
  return (
    <article
      style={atraso(atrasoMs)}
      className={cn(
        'ds-surgir relative w-[78%] shrink-0 snap-start overflow-hidden rounded-xl border bg-ds-bg-surface p-4 transition duration-200 hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.3)] sm:w-auto',
        mes.fechamento ? 'border-[#00D4E8]/60' : 'border-ds-border'
      )}
    >
      {mes.fechamento && (
        <div
          aria-hidden
          className="ds-crescer absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#006F7D] via-[#00D4E8] to-[#7CEBF5]"
        />
      )}
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ds-fg">{mes.rotulo}</h3>
        <div className="flex gap-1">
          {mes.fechamento && (
            <StatusBadge tom="info" className="h-5 px-2 text-[11px]">
              Fechamento
            </StatusBadge>
          )}
          <StatusBadge tom={mes.aberto ? 'success' : 'neutral'} className="h-5 px-2 text-[11px]">
            {mes.aberto ? 'Aberto' : 'Fechado'}
          </StatusBadge>
        </div>
      </header>

      <p className="mt-3 text-xs text-ds-fg-muted">Saldo do mês</p>
      <p
        className={cn(
          'text-2xl font-semibold leading-8 tracking-tight tabular-nums',
          mes.saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-success-fg'
        )}
      >
        {formatarHoras(mes.saldo)}
      </p>

      <div className="mt-2.5">
        <BarraConsumo
          consumo={mes.consumoTotal}
          disponivel={mes.saldoUtilizar}
          rotulo={`Consumo de ${mes.rotulo}`}
        />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-ds-border pt-3 text-xs">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-2">
            <dt className="text-ds-fg-muted">{rotulo}</dt>
            <dd className="font-medium tabular-nums text-ds-fg">
              <HoursValue minutos={valor} />
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

/** Consumo entre bancos desenhado como fluxo; o "pacote" de horas percorre a seta. */
function FluxoEntreBancos() {
  const m = CONSUMO_ENTRE_BANCOS_MOCK;
  return (
    <section
      className="ds-surgir rounded-xl border border-ds-info-border bg-ds-info-bg p-4"
      style={atraso(240)}
    >
      <div className="flex items-center gap-2 text-ds-info-fg">
        <Sparkles className="h-4 w-4" aria-hidden />
        <h3 className="text-xs font-semibold">Consumo entre bancos · fechamento de {m.mes}</h3>
      </div>
      <div className="mt-3 grid items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg border border-ds-border bg-ds-bg-surface px-3 py-2">
          <p className="text-[11px] text-ds-fg-muted">Cedeu</p>
          <p className="text-sm font-semibold text-ds-fg">{m.de}</p>
        </div>
        <div className="flex items-center justify-center gap-2 py-1" aria-hidden>
          <span className="hidden h-px w-10 bg-gradient-to-r from-transparent to-ds-fg-accent md:block" />
          <span className="rounded-full bg-[#00D4E8] px-2.5 py-1 text-xs font-bold tabular-nums text-black shadow-[0_4px_16px_rgba(0,212,232,0.4)]">
            {formatarHoras(m.minutos, { sinal: 'sempre' })}
          </span>
          <ArrowRight className="h-4 w-4 rotate-90 text-ds-fg-accent md:rotate-0" />
        </div>
        <div className="rounded-lg border border-[#00D4E8] bg-ds-bg-surface px-3 py-2 shadow-[0_0_0_3px_rgba(0,212,232,0.12)]">
          <p className="text-[11px] text-ds-fg-muted">Recebeu</p>
          <p className="text-sm font-semibold text-ds-fg">{m.para}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ds-fg">
        <span className="sr-only">
          {m.de} cedeu {formatarHoras(m.minutos)} para {m.para}.{' '}
        </span>
        Saldo negativo coberto no fechamento. Saldo após o consumo entre bancos:{' '}
        <strong className="tabular-nums text-ds-success-fg">00:00</strong> · sem excedentes.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

const SECOES = [
  { valor: 'visao', rotulo: 'Visão geral' },
  { valor: 'quadro', rotulo: 'Quadro completo' },
  { valor: 'requerimentos', rotulo: 'Requerimentos', contador: REQUERIMENTOS_MOCK.length },
  { valor: 'reajustes', rotulo: 'Reajustes' },
  { valor: 'observacoes', rotulo: 'Observações' },
  { valor: 'historico', rotulo: 'Histórico' },
];

export default function ControleBancoHorasCriativo({ estado }: PrototipoProps) {
  const [empresa, setEmpresa] = useState(EMPRESAS_MOCK[0]);
  const [bancoId, setBancoId] = useState('edocs');
  const [secao, setSecao] = useState('visao');
  const [requerimentos, setRequerimentos] = useState(REQUERIMENTOS_MOCK);
  const [recalcularAberto, setRecalcularAberto] = useState(false);

  const banco = RESUMO_BANCOS_MOCK.find((b) => b.id === bancoId) ?? RESUMO_BANCOS_MOCK[0];
  const carregando = estado === 'carregando';

  const linhasQuadro: LinhaMatriz[] = QUADRO_MOCK.map((indicador) => ({
    id: indicador.id,
    rotulo: indicador.rotulo,
    enfase: indicador.enfase,
    selo: indicador.selo,
    valores: Object.fromEntries(
      MESES_MOCK.map((mes) => [
        mes.id,
        <HoursValue
          key={mes.id}
          minutos={indicador.valores[mes.id]}
          sinal={indicador.sinal}
          cor={indicador.cor ?? 'neutral'}
        />,
      ])
    ),
  }));

  const colunasRequerimentos: ColunaTabela<RequerimentoMock>[] = [
    {
      id: 'requerimento',
      cabecalho: 'Requerimento',
      mobile: 'titulo',
      celula: (r) => (
        <div>
          <p className="font-semibold">{r.codigo}</p>
          <p className="text-xs text-ds-fg-muted">{r.titulo}</p>
        </div>
      ),
    },
    { id: 'modulo', cabecalho: 'Módulo', celula: (r) => r.modulo },
    {
      id: 'horas',
      cabecalho: 'Horas',
      alinhar: 'direita',
      celula: (r) => <HoursValue minutos={r.minutos} className="font-medium" />,
    },
    {
      id: 'banco',
      cabecalho: 'Banco',
      celula: (r) => (
        <Select
          aria-label={`Banco do ${r.codigo}`}
          value={r.bancoId}
          className="w-full min-w-[11rem]"
          onChange={(e) =>
            setRequerimentos((lista) =>
              lista.map((item) =>
                item.id === r.id
                  ? {
                      ...item,
                      bancoId: e.target.value,
                      origem: { tipo: 'ajustada', por: 'Usuário Teste', em: '15/10/2026' },
                    }
                  : item
              )
            )
          }
        >
          {BANCOS_MOCK.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: 'origem',
      cabecalho: 'Classificação',
      celula: (r) =>
        r.origem.tipo === 'automatica' ? (
          <StatusBadge tom="info">Automática</StatusBadge>
        ) : (
          <StatusBadge tom="warning">Ajustada</StatusBadge>
        ),
    },
  ];

  const conteudo = () => {
    if (carregando) {
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-ds-bg-surface" />
          ))}
        </div>
      );
    }

    if (secao === 'visao') {
      return (
        <div className="space-y-3">
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {MESES_PERIODO_MOCK.map((mes, i) => (
              <CartaoMes key={mes.id} mes={mes} atrasoMs={i * 70} />
            ))}
          </div>
          <FluxoEntreBancos />
        </div>
      );
    }

    if (secao === 'quadro') {
      return (
        <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
          <MatrixTable
            rotulo={`Quadro mensal — ${banco.nome}`}
            rotuloIndicador="Indicador"
            colunas={MESES_MOCK}
            linhas={linhasQuadro}
            modoMobile="mes-a-mes"
            colunaInicial="2026-12"
          />
        </div>
      );
    }

    if (secao === 'requerimentos') {
      return (
        <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
          <DataTable
            rotulo="Requerimentos do mês"
            colunas={colunasRequerimentos}
            linhas={requerimentos}
            chaveLinha={(r) => r.id}
          />
        </div>
      );
    }

    return (
      <div className="ds-surgir rounded-xl border border-dashed border-ds-border-strong bg-ds-bg-surface">
        <EmptyState
          icone={<CalendarClock />}
          titulo="Seção fora desta exploração"
          descricao="Reajustes, Observações e Histórico entram depois que a direção visual for escolhida."
        />
      </div>
    );
  };

  return (
    <AdminLayout>
      <DsPage className="space-y-0">
        <Hero
          empresa={empresa}
          setEmpresa={setEmpresa}
          onRecalcular={() => setRecalcularAberto(true)}
        />

        {estado === 'erro' ? (
          <div className="mt-6 space-y-3">
            <Callout tom="danger" titulo="Não foi possível carregar o banco de horas">
              Verifique a conexão e tente novamente.
            </Callout>
            <Button>Tentar novamente</Button>
          </div>
        ) : estado === 'vazio' ? (
          <div className="ds-surgir relative mx-4 -mt-10 rounded-xl border border-ds-border bg-ds-bg-surface shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:mx-8 md:-mt-12">
            <EmptyState
              icone={<Clock />}
              titulo="Ainda não há cálculo para este período"
              descricao="O cálculo é feito automaticamente todo dia. Você pode calcular agora."
              acao={<Button variante="primario">Calcular agora</Button>}
            />
          </div>
        ) : (
          <>
            {/* Indicadores sobrepostos à faixa, alinhados ao padding interno dela */}
            <div className="relative -mt-10 grid grid-cols-2 gap-3 px-4 md:-mt-12 md:px-8 lg:grid-cols-4">
              {carregando ? (
                [0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[116px] animate-pulse rounded-xl border border-ds-border bg-ds-bg-surface"
                  />
                ))
              ) : (
                <>
                  <Kpi
                    rotulo="Baseline"
                    icone={<Wallet />}
                    valor={2400}
                    rodape="Mensal · desde Jul/2026"
                  />
                  <Kpi
                    rotulo="Consumo no mês"
                    icone={<Sigma />}
                    valor={2640}
                    rodape={<Variacao minutos={180} texto="vs. Nov" />}
                    atrasoMs={60}
                  />
                  <Kpi
                    rotulo={`Saldo · ${banco.nome}`}
                    icone={<Clock />}
                    valor={banco.saldo}
                    tom={banco.saldo < 0 ? 'danger' : 'success'}
                    atrasoMs={120}
                    rodape={
                      <Sparkline
                        key={banco.id}
                        valores={banco.historicoSaldo}
                        className={cn(
                          'h-6 w-full',
                          banco.saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent'
                        )}
                      />
                    }
                  />
                  <Kpi
                    rotulo="Excedentes"
                    icone={<AlertTriangle />}
                    valor={0}
                    rodape="Nenhum no período"
                    atrasoMs={180}
                  />
                </>
              )}
            </div>

            <div className="mt-6 grid gap-6 md:px-0 xl:grid-cols-[288px_minmax(0,1fr)]">
              {/* Bancos */}
              <section aria-labelledby="titulo-bancos" className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h2 id="titulo-bancos" className="text-sm font-semibold text-ds-fg">
                    Bancos da empresa{' '}
                    <span className="font-normal text-ds-fg-muted">
                      · {RESUMO_BANCOS_MOCK.length}
                    </span>
                  </h2>
                  <span className="text-xs text-ds-fg-muted">por prioridade</span>
                </div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
                  {RESUMO_BANCOS_MOCK.map((b, i) => (
                    <ItemBanco
                      key={b.id}
                      banco={b}
                      selecionado={b.id === bancoId}
                      onSelecionar={() => setBancoId(b.id)}
                      atrasoMs={200 + i * 70}
                    />
                  ))}
                </div>
              </section>

              {/* Detalhe do banco escolhido */}
              <section aria-labelledby="titulo-banco" className="min-w-0 space-y-3">
                <div
                  key={banco.id}
                  className="ds-surgir flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
                >
                  <h2
                    id="titulo-banco"
                    className="font-ds-title text-xl font-semibold tracking-tight text-ds-fg"
                  >
                    {banco.nome}
                  </h2>
                  <p className="text-xs text-ds-fg-muted">
                    {banco.contrato} · {banco.escopo}
                  </p>
                </div>
                <div className="sticky top-0 z-[5] -mx-1 bg-ds-bg-page px-1 py-1.5">
                  <SegmentedTabs
                    rotulo="Seções do banco"
                    itens={SECOES}
                    valor={secao}
                    onChange={setSecao}
                  />
                </div>
                <div key={`${banco.id}-${secao}`}>{conteudo()}</div>
              </section>
            </div>
          </>
        )}

        <ConfirmDialog
          aberto={recalcularAberto}
          onOpenChange={setRecalcularAberto}
          titulo="Recalcular o banco de horas?"
          descricao="O cálculo do período aberto é refeito com os apontamentos e requerimentos atuais."
          consequencias={[
            'Meses fechados não mudam; para eles, use a retificação do Book',
            'O resultado anterior fica no histórico de versões',
          ]}
          rotuloConfirmar="Recalcular"
          onConfirmar={() => setRecalcularAberto(false)}
        />
      </DsPage>
    </AdminLayout>
  );
}
