// Protótipo EXPLORATÓRIO, quarta versão do Controle de Banco de Horas.
// Referência: docs/especificacoes/design-system-v2/referencias/dashboard-cartoes-arredondados.png
// (dashboard de cartões brancos arredondados sobre fundo claro, sidebar em pílula, chips e anéis), com a paleta Sonda:
//  - preto = ação principal e sidebar; ciano = o que está selecionado ou ativo; cinzas para o resto.
//  - cada fato aparece em um lugar só (regra herdada da versão enxuta).
// O shell (sidebar em pílula e barra superior) é desenhado aqui só para avaliar a direção; não altera o LayoutAdmin.
import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Building2,
  CalendarClock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  History,
  Home,
  Lock,
  Menu,
  MessageSquare,
  Moon,
  RefreshCw,
  Search,
  Send,
  Settings,
  Speech,
  Sun,
  ThumbsUp,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { MatrixTable, type LinhaMatriz } from '@/components/ds/MatrixTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { EMPRESAS_MOCK, REQUERIMENTOS_MOCK } from './mocks/controleBancoHorasV2';
import {
  BANCOS_ENXUTO_MOCK,
  type BancoEnxutoMock,
  type MesBancoMock,
} from './mocks/controleBancoHorasEnxuto';
import { ATIVIDADES_MOCK } from './mocks/controleBancoHorasSuave';
import { atraso, useContador } from './compartilhado/visual';

/* ------------------------------------------------------------------ */
/* Base visual desta exploração                                        */
/* ------------------------------------------------------------------ */

const CARTAO =
  'rounded-[24px] bg-ds-bg-surface shadow-[0_2px_12px_rgba(16,40,45,0.06)] dark:shadow-none dark:ring-1 dark:ring-ds-border';
const CARTAO_INTERNO =
  'rounded-2xl bg-ds-bg-surface shadow-[0_4px_16px_rgba(16,40,45,0.08)] dark:shadow-none dark:ring-1 dark:ring-ds-border';
const PILULA =
  'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF4F5] dark:focus-visible:ring-offset-black';
const PILULA_PRETA = cn(
  PILULA,
  'bg-black text-white hover:bg-[#3D3D3D] dark:bg-white dark:text-black dark:hover:bg-[#E4E4E4]'
);
const PILULA_CLARA = cn(
  PILULA,
  'border border-ds-border bg-ds-bg-surface text-ds-fg hover:border-ds-border-strong'
);
const PILULA_CIANO = cn(PILULA, 'bg-[#00D4E8] text-black hover:bg-[#00BFD1]');

const corSaldo = (minutos: number) =>
  minutos < 0 ? 'text-ds-danger-fg' : minutos > 0 ? 'text-ds-success-fg' : 'text-ds-fg';
const chipSaldo = (minutos: number) =>
  minutos < 0
    ? 'bg-ds-danger-bg text-ds-danger-fg'
    : minutos > 0
      ? 'bg-ds-success-bg text-ds-success-fg'
      : 'bg-ds-bg-subtle text-ds-fg';

function saldoAtual(banco: BancoEnxutoMock) {
  return banco.entreBancos?.saldoFinal ?? banco.meses[banco.meses.length - 1].saldo;
}

const somar = (lista: number[]) => lista.reduce((a, b) => a + b, 0);

/** Percentual de uso (consumo ÷ disponível). Acima de 1 estourou. */
const uso = (consumo: number, disponivel: number) => (disponivel > 0 ? consumo / disponivel : 1);

const corUso = (pct: number) =>
  pct > 1 ? 'var(--ds-danger-fg)' : pct > 0.9 ? 'var(--ds-warning-fg)' : '#00D4E8';

/** Anel de progresso: preenche até o percentual ao aparecer. Acima de 100% fica completo, em vermelho. */
function Anel({
  pct,
  tamanho = 64,
  espessura = 6,
  rotulo,
  children,
}: {
  pct: number;
  tamanho?: number;
  espessura?: number;
  rotulo: string;
  children?: ReactNode;
}) {
  const [valor, setValor] = useState(0);
  useEffect(() => {
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduzir) {
      setValor(pct);
      return;
    }
    const quadro = requestAnimationFrame(() => setValor(pct));
    return () => cancelAnimationFrame(quadro);
  }, [pct]);

  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = Math.min(1, valor);
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        width={tamanho}
        height={tamanho}
        role="meter"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          className="stroke-ds-bg-subtle"
          strokeWidth={espessura}
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={corUso(pct)}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - preenchido)}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

/** Linha fina de progresso, no estilo da referência: trilho claro, preenchimento colorido, sem rótulo. */
function Linha({ pct, className }: { pct: number; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-1 w-full overflow-hidden rounded-full bg-ds-bg-subtle', className)}
    >
      <div
        className="ds-crescer h-full rounded-full"
        style={{ width: `${Math.min(1, pct) * 100}%`, background: corUso(pct) }}
      />
    </div>
  );
}

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold tabular-nums',
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Shell exploratório: sidebar em pílula e barra superior              */
/* ------------------------------------------------------------------ */

const MENU = [
  { icone: Home, rotulo: 'Dashboard' },
  { icone: Award, rotulo: 'Elogios' },
  { icone: FileText, rotulo: 'Books' },
  { icone: MessageSquare, rotulo: 'Pesquisas' },
  { icone: ThumbsUp, rotulo: 'Planos de ação' },
  { icone: Speech, rotulo: 'Requerimentos' },
  { icone: Clock, rotulo: 'Banco de Horas', ativo: true },
  { icone: AlertTriangle, rotulo: 'Alertas' },
  { icone: Building2, rotulo: 'Empresas' },
  { icone: Settings, rotulo: 'Configurações' },
];

function SidebarPilula() {
  return (
    <nav
      aria-label="Menu principal"
      className="fixed left-0 top-[132px] z-20 hidden w-[72px] flex-col items-center gap-1.5 rounded-r-[28px] bg-black py-5 shadow-[0_16px_40px_rgba(0,0,0,0.28)] dark:bg-ds-bg-surface dark:shadow-none dark:ring-1 dark:ring-ds-border lg:flex"
    >
      {MENU.map(({ icone: Icone, rotulo, ativo }) => (
        <a
          key={rotulo}
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-label={rotulo}
          aria-current={ativo ? 'page' : undefined}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4E8]',
            ativo
              ? 'bg-[#00D4E8] text-black shadow-[0_8px_18px_rgba(0,212,232,0.45)]'
              : 'text-[#B1B1B1] hover:bg-white/10 hover:text-white'
          )}
        >
          <Icone className="h-5 w-5" />
        </a>
      ))}
    </nav>
  );
}

function AbaTopo({
  icone: Icone,
  rotulo,
  ativa,
}: {
  icone: typeof Home;
  rotulo: string;
  ativa?: boolean;
}) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-current={ativa ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-2 py-2 text-sm transition',
        ativa
          ? 'font-semibold text-ds-fg after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-[#00D4E8]'
          : 'text-ds-fg-muted hover:text-ds-fg'
      )}
    >
      <Icone className="h-4 w-4" /> {rotulo}
    </a>
  );
}

function BotaoRedondo({
  icone: Icone,
  rotulo,
  onClick,
}: {
  icone: typeof Bell;
  rotulo: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full text-ds-fg-secondary transition hover:bg-ds-bg-surface hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
    >
      <Icone className="h-[18px] w-[18px]" />
    </button>
  );
}

function BarraSuperior({ onRecalcular }: { onRecalcular: () => void }) {
  const { resolvedTheme, setTheme } = useTheme();
  const opcaoTema = (valor: 'light' | 'dark', Icone: typeof Sun, rotulo: string) => (
    <button
      type="button"
      aria-pressed={resolvedTheme === valor}
      onClick={() => setTheme(valor)}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition',
        resolvedTheme === valor ? 'bg-[#00D4E8] text-black' : 'text-ds-fg-muted hover:text-ds-fg'
      )}
    >
      <Icone className="h-3.5 w-3.5" /> {rotulo}
    </button>
  );

  return (
    <header className="ds-surgir flex items-center gap-4 lg:gap-6">
      <button
        type="button"
        aria-label="Abrir menu"
        className="grid h-10 w-10 place-items-center rounded-full bg-black text-white lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <img
        src="/images/logo-sonda.png"
        alt="Sonda"
        className="h-6 w-auto brightness-0 dark:brightness-100"
      />

      <nav aria-label="Áreas" className="hidden items-center gap-6 md:flex">
        <AbaTopo icone={Home} rotulo="Dashboard" />
        <AbaTopo icone={Clock} rotulo="Banco de Horas" ativa />
        <AbaTopo icone={Building2} rotulo="Empresas" />
      </nav>

      <label className="relative hidden w-full max-w-xs xl:block">
        <span className="sr-only">Buscar</span>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Buscar empresa ou comando"
          className="h-10 w-full rounded-full border border-ds-border bg-ds-bg-surface pl-10 pr-4 text-sm text-ds-fg placeholder:text-ds-fg-muted focus:outline-none focus:ring-2 focus:ring-ds-focus"
        />
      </label>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <div
          role="group"
          aria-label="Tema"
          className="hidden rounded-full border border-ds-border bg-ds-bg-surface p-1 sm:flex"
        >
          {opcaoTema('light', Sun, 'Claro')}
          {opcaoTema('dark', Moon, 'Escuro')}
        </div>
        <BotaoRedondo icone={Bell} rotulo="Notificações" />
        <BotaoRedondo icone={History} rotulo="Histórico de versões" />
        <button type="button" onClick={onRecalcular} className={cn(PILULA_PRETA, 'ml-1')}>
          <RefreshCw className="h-4 w-4" /> <span className="hidden sm:inline">Recalcular</span>
        </button>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Partes da tela                                                      */
/* ------------------------------------------------------------------ */

function Hero({
  empresa,
  setEmpresa,
  bancoId,
  setBancoId,
}: {
  empresa: string;
  setEmpresa: (e: string) => void;
  bancoId: string;
  setBancoId: (id: string) => void;
}) {
  const iniciais = empresa
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);
  return (
    <section className="grid gap-8 xl:grid-cols-[minmax(0,400px)_1fr] xl:items-center">
      <div className="ds-surgir" style={atraso(60)}>
        <div className="flex items-center gap-3">
          <h1 className="font-ds-title text-[34px] font-semibold leading-[1.1] tracking-tight text-ds-fg md:text-[40px]">
            Controle de
            <br />
            Banco de Horas
          </h1>
          <span className="hidden items-center sm:flex" aria-hidden>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#00D4E8] font-ds-title text-xs font-semibold text-black ring-2 ring-[#EEF4F5] dark:ring-black">
              {iniciais}
            </span>
            <span className="-ml-2 grid h-9 min-w-9 place-items-center rounded-full bg-ds-bg-surface px-2 text-xs font-semibold text-ds-fg shadow-[0_2px_8px_rgba(16,40,45,0.1)] ring-2 ring-[#EEF4F5] dark:shadow-none dark:ring-black">
              {BANCOS_ENXUTO_MOCK.length} bancos
            </span>
          </span>
        </div>
        <p className="mt-4 max-w-sm text-sm leading-6 text-ds-fg-secondary">
          Saldo, consumo e fechamento de cada banco de horas da empresa. Escolha um banco para ver o
          detalhe do período.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Empresa</span>
            <select
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className={cn(PILULA_CLARA, 'appearance-none pr-9')}
            >
              {EMPRESAS_MOCK.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
              aria-hidden
            />
          </label>
          <div role="group" aria-label="Período" className={cn(PILULA_CLARA, 'gap-1 px-1.5')}>
            <button
              type="button"
              aria-label="Período anterior"
              className="grid h-7 w-7 place-items-center rounded-full hover:bg-ds-bg-subtle"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-1 tabular-nums">Out – Dez/2026</span>
            <button
              type="button"
              aria-label="Próximo período"
              disabled
              className="grid h-7 w-7 place-items-center rounded-full text-ds-fg-disabled"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div role="group" aria-label="Bancos da empresa" className="grid gap-4 sm:grid-cols-3">
        {BANCOS_ENXUTO_MOCK.map((banco, i) => {
          const selecionado = banco.id === bancoId;
          const saldo = saldoAtual(banco);
          const mesAtual = banco.meses[banco.meses.length - 1];
          const pct = uso(mesAtual.consumo, mesAtual.disponivel);
          return (
            <button
              key={banco.id}
              type="button"
              aria-pressed={selecionado}
              onClick={() => setBancoId(banco.id)}
              style={atraso(120 + i * 70)}
              className={cn(
                'ds-surgir group flex flex-col rounded-[24px] bg-ds-bg-surface p-5 text-left transition duration-200 hover:-translate-y-0.5 focus-visible:outline-none',
                selecionado
                  ? 'shadow-[0_0_0_2px_#00D4E8,0_16px_32px_rgba(0,212,232,0.18)]'
                  : 'shadow-[0_2px_12px_rgba(16,40,45,0.06)] hover:shadow-[0_12px_28px_rgba(16,40,45,0.10)] focus-visible:shadow-[0_0_0_2px_var(--ds-focus)] dark:ring-1 dark:ring-ds-border dark:hover:ring-ds-border-strong'
              )}
            >
              <div className="flex w-full items-start justify-between">
                <Anel pct={pct} tamanho={56} espessura={5} rotulo={`Uso de ${mesAtual.rotulo}`}>
                  <span className="text-[11px] font-semibold tabular-nums text-ds-fg">
                    {Math.round(pct * 100)}%
                  </span>
                </Anel>
                {banco.padrao && (
                  <Chip className="bg-ds-bg-subtle text-ds-fg-secondary">Padrão</Chip>
                )}
                {selecionado && !banco.padrao && (
                  <Chip className="bg-[#E0F8FB] text-[#006F7D] dark:bg-[#0D2B2E] dark:text-[#00D4E8]">
                    Selecionado
                  </Chip>
                )}
              </div>
              <span className="mt-4 block text-sm font-semibold text-ds-fg">{banco.nome}</span>
              <span className="block truncate text-xs text-ds-fg-muted">{banco.contrato}</span>
              <span
                className={cn(
                  'mt-3 block text-[26px] font-semibold leading-8 tabular-nums',
                  corSaldo(saldo)
                )}
              >
                {formatarHoras(saldo)}
              </span>
              <span className="text-xs text-ds-fg-muted">saldo atual</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TituloCartao({ children, acao }: { children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-ds-title text-base font-semibold text-ds-fg">{children}</h2>
      {acao}
    </div>
  );
}

function CartaoMesAtual({ banco }: { banco: BancoEnxutoMock }) {
  const mes = banco.meses[banco.meses.length - 1];
  const disponivel = useContador(mes.disponivel);
  const consumo = useContador(mes.consumo);
  const pct = uso(mes.consumo, mes.disponivel);
  const entre = banco.entreBancos;
  return (
    <section
      aria-labelledby="titulo-mes-atual"
      className={cn(CARTAO, 'ds-surgir p-5')}
      style={atraso(200)}
    >
      <TituloCartao>
        <span id="titulo-mes-atual">
          {mes.rotulo}{' '}
          <span className="font-ds-sans text-xs font-medium text-ds-fg-accent">· fechamento</span>
        </span>
      </TituloCartao>

      <div className={cn(CARTAO_INTERNO, 'mt-4 p-4')}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs text-ds-fg-muted">Consumido</p>
            <p
              className={cn(
                'mt-0.5 text-2xl font-semibold tabular-nums',
                pct > 1 ? 'text-ds-danger-fg' : 'text-ds-fg'
              )}
            >
              {formatarHoras(consumo)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ds-fg-muted">Disponível</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-ds-fg">
              {formatarHoras(disponivel)}
            </p>
          </div>
        </div>
        <Linha pct={pct} className="mt-3" />
        <p className="mt-2 text-xs text-ds-fg-muted">
          {pct > 1
            ? `Passou ${formatarHoras(mes.consumo - mes.disponivel)} do disponível`
            : `${Math.round(pct * 100)}% do disponível usado`}
        </p>
      </div>

      {entre ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ds-bg-subtle p-4">
          <Chip className="bg-[#00D4E8] text-black">
            {formatarHoras(entre.tipo === 'recebeu' ? entre.minutos : -entre.minutos, {
              sinal: 'sempre',
            })}
          </Chip>
          <p className="text-xs leading-5 text-ds-fg-secondary">
            {entre.tipo === 'recebeu' ? 'recebido do' : 'cedido para o'}{' '}
            <span className="font-semibold text-ds-fg">{entre.outroBanco}</span> no fechamento
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-ds-bg-subtle p-4 text-xs leading-5 text-ds-fg-secondary">
          Sem consumo entre bancos neste fechamento.
        </div>
      )}
    </section>
  );
}

function CartaoMeses({ banco }: { banco: BancoEnxutoMock }) {
  return (
    <section
      aria-labelledby="titulo-meses"
      className={cn(CARTAO, 'ds-surgir p-5')}
      style={atraso(260)}
    >
      <TituloCartao>
        <span id="titulo-meses">Meses do período</span>
      </TituloCartao>
      <ul className="mt-4 space-y-2">
        {banco.meses.map((mes: MesBancoMock, i) => {
          const pct = uso(mes.consumo, mes.disponivel);
          return (
            <li
              key={mes.id}
              className={cn('ds-surgir p-3', mes.fechamento ? CARTAO_INTERNO : 'rounded-2xl')}
              style={atraso(300 + i * 60)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ds-fg">{mes.rotulo}</span>
                  {mes.fechamento ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ds-fg-accent">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00D4E8]" aria-hidden /> aberto
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-ds-fg-muted">
                      <Lock className="h-3 w-3" aria-hidden /> fechado
                    </span>
                  )}
                </div>
                <Chip className={chipSaldo(mes.saldo)}>{formatarHoras(mes.saldo)}</Chip>
              </div>
              <Linha pct={pct} className="mt-2.5" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ICONE_ATIVIDADE = { recalculo: RefreshCw, envio: Send, fechamento: Lock } as const;

function CartaoAtividade({ banco }: { banco: BancoEnxutoMock }) {
  return (
    <section
      aria-labelledby="titulo-atividade"
      className={cn(CARTAO, 'ds-surgir p-5')}
      style={atraso(320)}
    >
      <TituloCartao
        acao={
          <span className="flex gap-1" aria-hidden>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-ds-border text-ds-fg-muted">
              <ChevronLeft className="h-3.5 w-3.5" />
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full border border-ds-border text-ds-fg-disabled">
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </span>
        }
      >
        <span id="titulo-atividade">Out – Dez/2026</span>
      </TituloCartao>

      <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Meses">
        {banco.meses.map((mes) => (
          <li key={mes.id} className="flex flex-col items-center gap-1.5 text-xs text-ds-fg-muted">
            {mes.rotulo.slice(0, 3)}
            <span
              className={cn(
                'grid h-9 w-9 place-items-center rounded-full text-sm font-semibold',
                mes.fechamento ? 'bg-[#00D4E8] text-black' : 'bg-ds-bg-subtle text-ds-fg-secondary'
              )}
            >
              {mes.fechamento ? (
                <CalendarClock className="h-4 w-4" aria-label="fechamento" />
              ) : (
                <Lock className="h-3.5 w-3.5" aria-label="fechado" />
              )}
            </span>
          </li>
        ))}
      </ol>

      <ul className="mt-5 space-y-4">
        {ATIVIDADES_MOCK.map((a) => {
          const Icone = ICONE_ATIVIDADE[a.tipo];
          return (
            <li key={a.id}>
              <p className="flex items-center gap-2 text-xs tabular-nums text-ds-fg-muted">
                {a.quando}
                <span className="h-px flex-1 border-t border-dashed border-ds-border" aria-hidden />
              </p>
              <div className="mt-2 flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ds-bg-subtle text-ds-fg-secondary">
                  <Icone className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ds-fg">{a.titulo}</p>
                  <p className="truncate text-xs text-ds-fg-muted">{a.detalhe}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CartaoRequerimentos({ bancos }: { bancos: BancoEnxutoMock[] }) {
  const [requerimentos, setRequerimentos] = useState(REQUERIMENTOS_MOCK);
  return (
    <section
      aria-labelledby="titulo-requerimentos"
      className={cn(CARTAO, 'ds-surgir p-5')}
      style={atraso(380)}
    >
      <TituloCartao
        acao={
          <Chip className="bg-ds-bg-subtle text-ds-fg-secondary">
            {requerimentos.length} no mês
          </Chip>
        }
      >
        <span id="titulo-requerimentos">Requerimentos</span>
      </TituloCartao>

      <ul className="mt-4 space-y-2">
        {requerimentos.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              CARTAO_INTERNO,
              'ds-surgir grid items-center gap-3 p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]'
            )}
            style={atraso(420 + i * 50)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ds-fg">{r.titulo}</p>
              <p className="text-xs tabular-nums text-ds-fg-muted">
                {r.codigo} · {r.modulo}
              </p>
            </div>
            <label className="relative">
              <span className="sr-only">Banco do {r.codigo}</span>
              <select
                value={r.bancoId}
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
                className="h-8 w-full appearance-none rounded-full border border-ds-border bg-ds-bg-surface pl-3 pr-8 text-xs font-medium text-ds-fg focus:outline-none focus:ring-2 focus:ring-ds-focus"
              >
                {bancos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nome}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ds-fg-muted"
                aria-hidden
              />
            </label>
            <Chip
              className={
                r.origem.tipo === 'automatica'
                  ? 'bg-ds-bg-subtle text-ds-fg-secondary'
                  : 'bg-ds-warning-bg text-ds-warning-fg'
              }
            >
              {r.origem.tipo === 'automatica' ? 'Automática' : 'Ajustada'}
            </Chip>
            <span className="text-sm font-semibold tabular-nums text-ds-fg sm:text-right">
              {formatarHoras(r.minutos)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CartaoEnviar({ banco }: { banco: BancoEnxutoMock }) {
  return (
    <section
      aria-labelledby="titulo-enviar"
      className="ds-surgir relative flex flex-col items-center overflow-hidden rounded-[24px] bg-[#00D4E8] p-6 text-center text-black"
      style={atraso(440)}
    >
      <span
        aria-hidden
        className="ds-flutuar pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/30 blur-2xl"
      />
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/70 shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
        <Send className="h-6 w-6" />
      </span>
      <h2 id="titulo-enviar" className="mt-5 font-ds-title text-lg font-semibold">
        Enviar saldo parcial
      </h2>
      <p className="mt-2 text-sm leading-5 text-black/75">
        Envia à empresa o saldo atual de {banco.nome} e o consumo do mês até hoje.
      </p>
      <button
        type="button"
        className={cn(PILULA_PRETA, 'mt-6 dark:bg-black dark:text-white dark:hover:bg-[#3D3D3D]')}
      >
        Enviar agora
      </button>
    </section>
  );
}

function CartaoAnel({
  pct,
  rotulo,
  titulo,
  rodape,
  atrasoMs,
}: {
  pct: number;
  rotulo: string;
  titulo: string;
  rodape: string;
  atrasoMs: number;
}) {
  return (
    <section aria-label={titulo} className={cn(CARTAO, 'ds-surgir p-5')} style={atraso(atrasoMs)}>
      <div className="flex items-center gap-3">
        <Anel pct={pct} tamanho={56} espessura={5} rotulo={titulo}>
          <span className="text-[11px] font-semibold tabular-nums text-ds-fg">
            {Math.round(pct * 100)}%
          </span>
        </Anel>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ds-fg-accent">
            {rotulo}
          </p>
          <p className="text-sm font-semibold text-ds-fg">{titulo}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-ds-fg-muted">{rodape}</p>
    </section>
  );
}

function CartaoFechamento({
  onVerQuadro,
  quadroAberto,
}: {
  onVerQuadro: () => void;
  quadroAberto: boolean;
}) {
  return (
    <section
      aria-labelledby="titulo-fechamento"
      className={cn(CARTAO, 'ds-surgir p-5')}
      style={atraso(560)}
    >
      <TituloCartao>
        <span id="titulo-fechamento">Fechamento do período</span>
      </TituloCartao>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-ds-fg-accent">
        <CalendarClock className="h-3.5 w-3.5" aria-hidden /> Dez/2026 · semestral
      </p>
      <p className="mt-3 text-sm leading-6 text-ds-fg-secondary">
        O repasse e o consumo entre bancos acontecem no fechamento. Meses fechados só mudam pela
        retificação do Book.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={cn(PILULA_CLARA, 'h-9')}>
          <History className="h-4 w-4" /> Histórico
        </button>
        <button
          type="button"
          aria-expanded={quadroAberto}
          aria-controls="quadro-mensal"
          onClick={onVerQuadro}
          className={cn(PILULA_CIANO, 'h-9')}
        >
          {quadroAberto ? 'Ocultar quadro' : 'Ver quadro'}
        </button>
      </div>
    </section>
  );
}

function Quadro({ banco }: { banco: BancoEnxutoMock }) {
  const linha = (
    id: string,
    rotulo: string,
    campo: keyof MesBancoMock,
    extra: Partial<LinhaMatriz> = {},
    cor?: 'saldo'
  ): LinhaMatriz => ({
    id,
    rotulo,
    ...extra,
    valores: Object.fromEntries(
      banco.meses.map((m) => [
        m.id,
        <HoursValue key={m.id} minutos={m[campo] as number} cor={cor} />,
      ])
    ),
  });
  const linhas = [
    linha('baseline', 'Baseline', 'baseline'),
    linha('repasse', 'Repasse do mês anterior', 'repasseAnterior'),
    linha('disponivel', 'Disponível', 'disponivel'),
    linha('apontamentos', 'Apontamentos', 'apontamentos'),
    linha('requerimentos', 'Requerimentos', 'requerimentos'),
    linha('reajustes', 'Reajustes', 'reajustes'),
    linha('consumo', 'Consumo total', 'consumo', { enfase: 'total' }),
    linha('saldo', 'Saldo do mês', 'saldo', { enfase: 'total' }, 'saldo'),
  ];
  const entre = banco.entreBancos;
  if (entre) {
    const fechamento = banco.meses.find((m) => m.fechamento);
    linhas.push(
      {
        id: 'entre',
        rotulo:
          entre.tipo === 'recebeu'
            ? `Consumido de ${entre.outroBanco}`
            : `Cedido a ${entre.outroBanco}`,
        enfase: entre.tipo === 'recebeu' ? 'info' : 'warning',
        valores: Object.fromEntries(
          banco.meses.map((m) => [
            m.id,
            m.id === fechamento?.id ? (
              <HoursValue
                key={m.id}
                minutos={entre.tipo === 'recebeu' ? entre.minutos : -entre.minutos}
                sinal="sempre"
              />
            ) : (
              '—'
            ),
          ])
        ),
      },
      {
        id: 'final',
        rotulo: 'Saldo final',
        enfase: 'total',
        valores: Object.fromEntries(
          banco.meses.map((m) => [
            m.id,
            m.id === fechamento?.id ? (
              <HoursValue key={m.id} minutos={entre.saldoFinal} cor="saldo" />
            ) : (
              '—'
            ),
          ])
        ),
      }
    );
  }
  return (
    <section
      id="quadro-mensal"
      aria-labelledby="titulo-quadro"
      className={cn(CARTAO, 'ds-surgir overflow-hidden')}
    >
      <div className="p-5 pb-0">
        <TituloCartao>
          <span id="titulo-quadro">Quadro mensal · {banco.nome}</span>
        </TituloCartao>
      </div>
      <div className="mt-3">
        <MatrixTable
          rotulo={`Quadro mensal — ${banco.nome}`}
          rotuloIndicador="Indicador"
          colunas={banco.meses.map((m) => ({
            id: m.id,
            rotulo: m.fechamento ? `${m.rotulo} · fechamento` : m.rotulo,
          }))}
          linhas={linhas}
          modoMobile="mes-a-mes"
          colunaInicial={banco.meses[banco.meses.length - 1].id}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

export default function ControleBancoHorasSuave({ estado }: PrototipoProps) {
  const [empresa, setEmpresa] = useState(EMPRESAS_MOCK[0]);
  const [bancoId, setBancoId] = useState('edocs');
  const [quadroAberto, setQuadroAberto] = useState(false);
  const [recalcularAberto, setRecalcularAberto] = useState(false);

  const banco = BANCOS_ENXUTO_MOCK.find((b) => b.id === bancoId) ?? BANCOS_ENXUTO_MOCK[0];
  const usoPeriodo = uso(
    somar(banco.meses.map((m) => m.consumo)),
    somar(banco.meses.map((m) => m.disponivel))
  );
  const mesesFechados = banco.meses.filter((m) => m.fechado).length;

  const corpo = () => {
    if (estado === 'erro') {
      return (
        <section className={cn(CARTAO, 'mx-auto max-w-md p-8 text-center')} role="alert">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ds-danger-bg text-ds-danger-fg">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-ds-title text-lg font-semibold text-ds-fg">
            Não foi possível carregar o banco de horas
          </h2>
          <p className="mt-1 text-sm text-ds-fg-secondary">
            Verifique a conexão e tente novamente.
          </p>
          <button type="button" className={cn(PILULA_PRETA, 'mt-5')}>
            Tentar novamente
          </button>
        </section>
      );
    }
    if (estado === 'vazio') {
      return (
        <section className={cn(CARTAO, 'mx-auto max-w-md p-8 text-center')}>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#E0F8FB] text-[#006F7D] dark:bg-[#0D2B2E] dark:text-[#00D4E8]">
            <Clock className="h-6 w-6" />
          </span>
          <h2 className="mt-4 font-ds-title text-lg font-semibold text-ds-fg">
            Ainda não há cálculo para este período
          </h2>
          <p className="mt-1 text-sm text-ds-fg-secondary">
            O cálculo é feito automaticamente todo dia. Você pode calcular agora.
          </p>
          <button type="button" className={cn(PILULA_CIANO, 'mt-5')}>
            Calcular agora
          </button>
        </section>
      );
    }
    if (estado === 'carregando') {
      return (
        <div className="space-y-5" role="status" aria-label="Carregando">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,400px)_1fr]">
            <div className="h-40 animate-pulse rounded-[24px] bg-ds-bg-surface" />
            <div className="grid gap-4 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-[24px] bg-ds-bg-surface" />
              ))}
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[24px] bg-ds-bg-surface" />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-5">
        <Hero empresa={empresa} setEmpresa={setEmpresa} bancoId={bancoId} setBancoId={setBancoId} />

        <div key={banco.id} className="grid gap-5 lg:grid-cols-3">
          <CartaoMesAtual banco={banco} />
          <CartaoMeses banco={banco} />
          <CartaoAtividade banco={banco} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <CartaoRequerimentos bancos={BANCOS_ENXUTO_MOCK} />
          <CartaoEnviar banco={banco} />
          <div key={banco.id} className="grid gap-5 content-start">
            <div className="grid gap-5 sm:grid-cols-2">
              <CartaoAnel
                pct={usoPeriodo}
                rotulo="Período"
                titulo="Uso do período"
                rodape={`${formatarHoras(somar(banco.meses.map((m) => m.consumo)))} consumidas de ${formatarHoras(somar(banco.meses.map((m) => m.disponivel)))}`}
                atrasoMs={480}
              />
              <CartaoAnel
                pct={mesesFechados / banco.meses.length}
                rotulo="Fechamento"
                titulo="Meses fechados"
                rodape={`${mesesFechados} de ${banco.meses.length} meses do período já fechados`}
                atrasoMs={520}
              />
            </div>
            <CartaoFechamento
              quadroAberto={quadroAberto}
              onVerQuadro={() => setQuadroAberto((v) => !v)}
            />
          </div>
        </div>

        {quadroAberto && <Quadro key={banco.id} banco={banco} />}
      </div>
    );
  };

  return (
    <div data-ds="v2" className="min-h-screen bg-[#EEF4F5] font-ds-sans text-ds-fg dark:bg-black">
      <SidebarPilula />
      <div className="mx-auto max-w-[1440px] space-y-7 px-4 py-5 pb-24 md:px-6 lg:pl-[104px] lg:pr-8">
        <BarraSuperior onRecalcular={() => setRecalcularAberto(true)} />
        {corpo()}
      </div>
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
    </div>
  );
}
