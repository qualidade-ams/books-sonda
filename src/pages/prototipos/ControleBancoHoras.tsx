// Protótipo do Controle de Banco de Horas (Especificação v2.0, seção 5.6; Inventário, FT-01 a
// FT-34), revisto em 21/10/2026 sobre a direção visual aprovada em 15/10: um banco por vez, cada um
// com o seu período de apuração, e as funções da tela atual (quadro mensal, requerimentos,
// reajustes, observações, histórico de versões, recálculo, excedente, envio manual do Saldo
// Parcial) mais o que foi decidido depois (padrão de salvar, exportação, mês fechado só muda na
// retificação do Book). Dados fictícios (mocks/controleBanco.ts). Sem Supabase.
import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileSpreadsheet,
  History,
  Info,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  Sigma,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { BarraConsumo, Sparkline, atraso, useContador } from './compartilhado/visual';
import { FaixaTopo, PaginaV2, botaoPrimarioTopo, botaoVidro, vidro } from './compartilhado/shell';
import { DicasContext } from './compartilhado/dicas';
import { areaTexto, campo, itemMenu } from './compartilhado/estilos';
import {
  Ajuda,
  BarraRodape,
  CampoHoras,
  CampoNumero,
  ChavePrototipo,
  ChavesPrototipo,
  Chip,
  Escolha,
  Rotulo,
  Secao,
  TelaEdicao,
} from './compartilhado/formulario';
import { MenuExportar } from './compartilhado/importacao';
import { FiltroAlternar } from './compartilhado/filtros';
import { CONTATOS_ALFA_MOCK } from './mocks/empresas';
import {
  BANCOS_CONTROLE_MOCK,
  EMPRESAS_CONTROLE_MOCK,
  OBSERVACOES_MOCK,
  REAJUSTES_MOCK,
  REQUERIMENTOS_CONTROLE_MOCK,
  ULTIMA_SINCRONIZACAO_MOCK,
  ULTIMO_ENVIO_SALDO_MOCK,
  VERSOES_MOCK,
  type BancoControleMock,
  type MesControleMock,
  type ObservacaoMock,
  type PeriodoMock,
  type ReajusteMock,
  type RequerimentoControleMock,
} from './mocks/controleBanco';

/** Para que serve cada campo, pelo rótulo exibido (Inventário, FT-13 a FT-34) */
const DICAS: Record<string, string> = {
  'Mês do reajuste':
    'Mês em que o reajuste entra. Em mês fechado (Book já gerado), ele fica aguardando a retificação do Book daquele mês.',
  Efeito: 'Somar aumenta o consumo do mês (e diminui o saldo); abater faz o contrário.',
  Horas: 'Quantidade de horas do reajuste, em HH:MM.',
  Tickets: 'Quantidade de tickets do reajuste (contrato de horas e tickets).',
  Motivo: 'Obrigatório. Vira a observação do mês e aparece no histórico de versões.',
  Destinatários:
    'Contatos da empresa com a finalidade Saldo Parcial (cadastro de Empresas › Contatos). Um e-mail por empresa, com uma tabela por banco.',
  'Com cópia': 'E-mails extras em cópia, separados por vírgula.',
  Assunto: 'Assunto do e-mail.',
  'Texto de abertura': 'Texto antes das tabelas dos bancos.',
  Observação: 'Até 700 caracteres. Aparece no Controle e no histórico do banco.',
  'Mês da observação': 'Mês do período a que a observação se refere.',
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const rotuloMes = (id: string) => {
  const [a, m] = id.split('-');
  return `${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Number(m) - 1]}/${a}`;
};

/** Último mês com cálculo (aberto, ou o último fechado) */
const mesReferencia = (p: PeriodoMock) =>
  p.meses.find((m) => m.situacao === 'aberto') ??
  [...p.meses].reverse().find((m) => m.situacao === 'fechado') ??
  p.meses[0];

/* ------------------------------------------------------------------ */
/* Topo                                                                 */
/* ------------------------------------------------------------------ */

function Topo({
  empresaId,
  onEmpresa,
  podeEditar,
  legado,
  onEnviar,
  onRecalcular,
}: {
  empresaId: string;
  onEmpresa: (id: string) => void;
  podeEditar: boolean;
  legado: boolean;
  onEnviar: () => void;
  onRecalcular: () => void;
}) {
  return (
    <FaixaTopo>
      <div className="pb-24 pt-3 md:pb-28 md:pt-4">
        <div className="ds-surgir max-w-2xl">
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

        <div
          className="ds-surgir relative mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
          style={atraso(100)}
        >
          <label
            className={cn(
              'relative flex h-11 items-center rounded-lg transition hover:bg-white/[0.1] sm:w-64 md:h-9',
              vidro
            )}
          >
            <span className="sr-only">Empresa</span>
            <select
              value={empresaId}
              onChange={(e) => onEmpresa(e.target.value)}
              className="h-full w-full appearance-none rounded-lg bg-transparent pl-3 pr-9 text-base font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 md:text-sm [&>option]:text-black"
            >
              {EMPRESAS_CONTROLE_MOCK.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 h-4 w-4 text-white/60"
              aria-hidden
            />
          </label>
          {legado ? (
            <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-[#F0A43A]/35 bg-[#F0A43A]/10 px-2.5 text-xs font-medium text-[#F0A43A] sm:self-auto">
              <AlertTriangle className="h-3.5 w-3.5" /> Legado (em validação)
            </span>
          ) : (
            <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-[#4CC77A]/35 bg-[#4CC77A]/10 px-2.5 text-xs font-medium text-[#4CC77A] sm:self-auto">
              <CheckCircle2 className="h-3.5 w-3.5" /> Bancos múltiplos
            </span>
          )}

          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <MenuExportar entidade="o quadro de todos os bancos (uma aba por banco)" />
            {podeEditar && !legado && (
              <button type="button" className={botaoVidro} onClick={onEnviar}>
                <Send className="h-4 w-4" /> Enviar Saldo Parcial
              </button>
            )}
            {podeEditar && (
              <button type="button" onClick={onRecalcular} className={botaoPrimarioTopo}>
                <RefreshCw className="h-4 w-4" /> Recalcular
              </button>
            )}
          </div>
        </div>
      </div>
    </FaixaTopo>
  );
}

/* ------------------------------------------------------------------ */
/* Indicadores do banco no período escolhido                            */
/* ------------------------------------------------------------------ */

function Kpi({
  rotulo,
  icone,
  valor,
  formato = 'horas',
  sinal,
  tom = 'neutral',
  rodape,
  atrasoMs = 0,
}: {
  rotulo: string;
  icone: ReactNode;
  valor: number;
  formato?: 'horas' | 'reais';
  sinal?: 'auto' | 'sempre';
  tom?: 'neutral' | 'success' | 'danger' | 'info' | 'warning';
  rodape: ReactNode;
  atrasoMs?: number;
}) {
  const animado = useContador(Math.round(valor));
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
            {formato === 'reais' ? reais(valor) : formatarHoras(animado, { sinal })}
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
          caiu ? 'bg-ds-success-bg text-ds-success-fg' : 'bg-ds-danger-bg text-ds-danger-fg'
        )}
      >
        {caiu ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
        {formatarHoras(minutos, { sinal: 'sempre' })}
      </span>
      {texto}
    </span>
  );
}

function Indicadores({ banco, periodo }: { banco: BancoControleMock; periodo: PeriodoMock }) {
  const ref = mesReferencia(periodo);
  const i = periodo.meses.indexOf(ref);
  const anterior = periodo.meses[i - 1];
  const entre = periodo.entreBancos;
  const saldo = ref.fimPeriodo && entre ? entre.saldoFinal : ref.saldo;
  const aberto = ref.situacao === 'aberto';
  return (
    <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
      <Kpi
        rotulo="Baseline mensal"
        icone={<Wallet />}
        valor={ref.baseline}
        rodape={`${banco.periodicidade} · ${banco.repassePercentual}% de repasse`}
      />
      <Kpi
        rotulo={`Consumo · ${ref.rotulo}`}
        icone={<Sigma />}
        valor={ref.consumo}
        atrasoMs={60}
        rodape={
          anterior ? (
            <Variacao
              minutos={ref.consumo - anterior.consumo}
              texto={`vs. ${anterior.rotulo.slice(0, 3)}`}
            />
          ) : (
            '1º mês do período'
          )
        }
      />
      <Kpi
        rotulo={aberto ? `Saldo · ${ref.rotulo}` : 'Saldo final do período'}
        icone={<Clock />}
        valor={saldo}
        tom={saldo < 0 ? 'danger' : saldo > 0 ? 'success' : 'neutral'}
        atrasoMs={120}
        rodape={
          <Sparkline
            key={banco.id + periodo.id}
            valores={banco.historicoSaldo}
            className={cn('h-6 w-full', saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
          />
        }
      />
      {periodo.excedente ? (
        <Kpi
          rotulo="Excedente a faturar"
          icone={<Receipt />}
          valor={periodo.excedente.valor}
          formato="reais"
          tom="warning"
          atrasoMs={180}
          rodape={`${formatarHoras(periodo.excedente.minutos)} × ${reais(banco.taxa.valorHora)}`}
        />
      ) : (
        <Kpi
          rotulo="Entre bancos"
          icone={<ArrowLeftRight />}
          valor={entre ? (entre.tipo === 'recebeu' ? entre.minutos : -entre.minutos) : 0}
          sinal="sempre"
          tom={entre ? 'info' : 'neutral'}
          atrasoMs={180}
          rodape={
            entre
              ? `${entre.tipo === 'recebeu' ? 'do' : 'para o'} ${entre.outroBanco} no fechamento`
              : aberto
                ? 'Só no fechamento do período'
                : 'Sem movimento no período'
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bancos à esquerda e período                                          */
/* ------------------------------------------------------------------ */

function ItemBanco({
  banco,
  selecionado,
  onSelecionar,
  atrasoMs,
}: {
  banco: BancoControleMock;
  selecionado: boolean;
  onSelecionar: () => void;
  atrasoMs: number;
}) {
  const atual = banco.periodos[banco.periodos.length - 1];
  const ref = mesReferencia(atual);
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={onSelecionar}
      style={atraso(atrasoMs)}
      className={cn(
        'ds-surgir group relative w-[78%] shrink-0 snap-start overflow-hidden rounded-xl border bg-ds-bg-surface p-3 text-left transition duration-200 sm:w-auto',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-page',
        selecionado
          ? 'border-[#00D4E8] shadow-[0_10px_24px_-14px_rgba(0,212,232,0.6)]'
          : 'border-ds-border hover:-translate-y-0.5 hover:border-ds-border-strong'
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
        <p className="truncate text-sm text-ds-fg-secondary">{banco.nome}</p>
        {banco.padrao && (
          <StatusBadge tom="neutral" className="h-5 px-2 text-[11px]">
            padrão
          </StatusBadge>
        )}
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p
          className={cn(
            'text-lg font-semibold leading-6 tracking-tight tabular-nums',
            ref.saldo < 0
              ? 'text-ds-danger-fg'
              : ref.saldo > 0
                ? 'text-ds-success-fg'
                : 'text-ds-fg'
          )}
        >
          {formatarHoras(ref.saldo)}
        </p>
        <Sparkline
          key={banco.id}
          valores={banco.historicoSaldo}
          className={cn('h-5 w-16', ref.saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
        />
      </div>
      <BarraConsumo
        className="mt-2"
        legenda={false}
        consumo={ref.consumo}
        disponivel={ref.disponivel}
        rotulo={`Consumo de ${ref.rotulo} · ${banco.nome}`}
      />
      <p className="mt-1.5 text-[11px] text-ds-fg-muted">
        {banco.periodicidade} · {atual.rotulo}
      </p>
    </button>
  );
}

function NavegadorPeriodo({
  banco,
  indice,
  onIndice,
}: {
  banco: BancoControleMock;
  indice: number;
  onIndice: (i: number) => void;
}) {
  const periodo = banco.periodos[indice];
  const atual = indice === banco.periodos.length - 1;
  return (
    <nav
      aria-label="Período de apuração"
      className="ds-surgir flex items-center justify-between gap-3 rounded-xl border border-ds-border bg-ds-bg-surface p-1.5"
    >
      <Button
        variante="fantasma"
        tamanho="sm"
        className="text-ds-fg"
        disabled={indice === 0}
        title={indice === 0 ? 'Início da vigência do banco' : undefined}
        onClick={() => onIndice(indice - 1)}
      >
        <ChevronLeft /> <span className="hidden sm:inline">Anterior</span>
      </Button>
      <div className="text-center">
        <p className="font-ds-title text-base font-semibold tracking-tight text-ds-fg md:text-lg">
          {periodo.rotulo}
        </p>
        <p className="text-xs text-ds-fg-muted">
          {banco.periodicidade} · {atual ? 'período atual' : 'período fechado'}
        </p>
      </div>
      <Button
        variante="fantasma"
        tamanho="sm"
        className="text-ds-fg"
        disabled={atual}
        onClick={() => onIndice(indice + 1)}
      >
        <span className="hidden sm:inline">{atual ? 'Próximo' : 'Período atual'}</span>{' '}
        <ChevronRight />
      </Button>
    </nav>
  );
}

/** Reajuste do mês como botão: mostra o total e abre o lançamento já com o mês escolhido */
function BotaoReajuste({
  mes,
  podeEditar,
  onClick,
}: {
  mes: MesControleMock;
  podeEditar: boolean;
  onClick: () => void;
}) {
  if (!podeEditar) return <HoursValue minutos={mes.reajustes} sinal="sempre" />;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Lançar reajuste em ${mes.rotulo}`}
      className={cn(
        'ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
        mes.reajustes
          ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
          : 'border-ds-border-strong text-ds-fg-secondary hover:border-[#00D4E8] hover:text-ds-fg-accent'
      )}
    >
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {formatarHoras(mes.reajustes, { sinal: 'sempre' })}
      <Plus className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Quadro                                                           */
/* ------------------------------------------------------------------ */

function Quadro({
  banco,
  periodo,
  podeEditar,
  onReajuste,
}: {
  banco: BancoControleMock;
  periodo: PeriodoMock;
  podeEditar: boolean;
  /** Abre o lançamento de reajuste no mês */
  onReajuste: (mes: string) => void;
}) {
  const [cobranca, setCobranca] = useState<'horas' | 'tickets'>('horas');
  const [copiado, setCopiado] = useState(false);
  const meses = periodo.meses;
  const entre = periodo.entreBancos;
  const fechamento = meses.find((m) => m.fimPeriodo && m.situacao === 'fechado');

  const valor = (_m: MesControleMock, n: number, cor?: 'saldo', sinal?: 'sempre') => (
    <HoursValue minutos={n} cor={cor} sinal={sinal} />
  );
  const linha = (
    id: string,
    rotulo: ReactNode,
    campo: (m: MesControleMock) => number,
    extra: Partial<LinhaMatriz> = {},
    cor?: 'saldo',
    sinal?: 'sempre'
  ): LinhaMatriz => ({
    id,
    rotulo,
    ...extra,
    valores: Object.fromEntries(meses.map((m) => [m.id, valor(m, campo(m), cor, sinal)])),
  });
  const soFechamento = (n: ReactNode) =>
    Object.fromEntries(meses.map((m) => [m.id, m.id === fechamento?.id ? n : '—']));

  const linhasHoras: LinhaMatriz[] = [
    linha('baseline', 'Baseline', (m) => m.baseline),
    linha('repasse-anterior', 'Repasse do mês anterior', (m) => m.repasseAnterior),
    linha('disponivel', 'Disponível', (m) => m.disponivel, { enfase: 'total' }),
    linha('apontamentos', 'Chamados (Aranda)', (m) => m.apontamentos),
    linha('requerimentos', 'Requerimentos', (m) => m.requerimentos),
    {
      id: 'reajustes',
      rotulo: 'Reajustes',
      valores: Object.fromEntries(
        meses.map((m) => [
          m.id,
          <BotaoReajuste
            key={m.id}
            mes={m}
            podeEditar={podeEditar}
            onClick={() => onReajuste(m.id)}
          />,
        ])
      ),
    },
    linha('consumo', 'Consumo total', (m) => m.consumo, { enfase: 'total' }),
    linha('saldo', 'Saldo do mês', (m) => m.saldo, { enfase: 'total' }, 'saldo'),
    linha('repasse', `Repasse · ${banco.repassePercentual}%`, (m) =>
      m.fimPeriodo ? 0 : m.repasse
    ),
  ];
  if (entre && fechamento)
    linhasHoras.push(
      {
        id: 'entre',
        rotulo:
          entre.tipo === 'recebeu'
            ? `Consumido de ${entre.outroBanco}`
            : `Cedido a ${entre.outroBanco}`,
        enfase: entre.tipo === 'recebeu' ? 'info' : 'warning',
        valores: soFechamento(
          <HoursValue
            minutos={entre.tipo === 'recebeu' ? entre.minutos : -entre.minutos}
            sinal="sempre"
          />
        ),
      },
      {
        id: 'final',
        rotulo: 'Saldo final',
        enfase: 'total',
        valores: soFechamento(<HoursValue minutos={entre.saldoFinal} cor="saldo" />),
      }
    );
  if (periodo.excedente && fechamento)
    linhasHoras.push(
      {
        id: 'excedente',
        rotulo: 'Excedente do período',
        enfase: 'warning',
        valores: soFechamento(<HoursValue minutos={periodo.excedente.minutos} />),
      },
      {
        id: 'valor',
        rotulo: `Valor a faturar · ${reais(banco.taxa.valorHora)}/h`,
        enfase: 'total',
        valores: soFechamento(
          <span className="tabular-nums">{reais(periodo.excedente.valor)}</span>
        ),
      }
    );

  const linhasTickets: LinhaMatriz[] = [
    {
      id: 't-contratados',
      rotulo: 'Tickets contratados',
      valores: Object.fromEntries(
        meses.map((m) => [m.id, m.tickets ? m.tickets.contratados : '—'])
      ),
    },
    {
      id: 't-consumidos',
      rotulo: 'Tickets consumidos',
      valores: Object.fromEntries(meses.map((m) => [m.id, m.tickets ? m.tickets.consumidos : '—'])),
    },
    {
      id: 't-saldo',
      rotulo: 'Saldo de tickets',
      enfase: 'total',
      valores: Object.fromEntries(
        meses.map((m) => [
          m.id,
          m.tickets ? (
            <span className={cn('tabular-nums', m.tickets.saldo < 0 && 'text-ds-danger-fg')}>
              {m.tickets.saldo}
            </span>
          ) : (
            '—'
          ),
        ])
      ),
    },
  ];

  const mensagem = periodo.excedente
    ? `Prezados, no período ${periodo.rotulo} o ${banco.nome} teve ${formatarHoras(periodo.excedente.minutos)} de excedente. Taxa: ${reais(banco.taxa.valorHora)}/h. Total: ${reais(periodo.excedente.valor)}. Ficamos no aguardo da PO / de acordo.`
    : '';
  const observacaoAuto = OBSERVACOES_MOCK.find(
    (o) => o.bancoId === banco.id && o.tipo === 'automatica' && meses.some((m) => m.id === o.mes)
  );

  return (
    <div className="space-y-4">
      {banco.tipoContrato === 'ambos' && (
        <div className="max-w-xs">
          <Escolha<typeof cobranca>
            rotulo="Cobrança"
            opcoes={[
              { valor: 'horas', rotulo: 'Horas' },
              { valor: 'tickets', rotulo: 'Tickets' },
            ]}
            valor={cobranca}
            onChange={setCobranca}
          />
        </div>
      )}
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <MatrixTable
          rotulo={`Quadro mensal — ${banco.nome}`}
          rotuloIndicador={cobranca === 'horas' ? 'Horas' : 'Tickets'}
          colunas={meses.map((m) => ({
            id: m.id,
            rotulo: m.rotulo,
            atual: m.situacao === 'aberto',
          }))}
          linhas={cobranca === 'horas' ? linhasHoras : linhasTickets}
          modoMobile="mes-a-mes"
          colunaInicial={mesReferencia(periodo).id}
        />
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ds-border px-4 py-2.5 text-xs text-ds-fg-muted">
          <span>Consumo sincronizado com o Aranda em {ULTIMA_SINCRONIZACAO_MOCK}</span>
          <span aria-hidden>·</span>
          <span>Meses fechados só mudam na retificação do Book</span>
        </p>
      </div>

      {observacaoAuto && (
        <Callout tom="info" titulo="Observação automática">
          {observacaoAuto.texto}
        </Callout>
      )}

      {periodo.excedente && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ds-warning-border bg-ds-warning-bg px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-ds-warning-fg">
              Excedente de {formatarHoras(periodo.excedente.minutos)} ·{' '}
              {reais(periodo.excedente.valor)}
            </p>
            <p className="text-ds-fg-secondary">
              {banco.taxa.rotulo}: {reais(banco.taxa.valorHora)}/h, da taxa do cliente vigente no
              período.
            </p>
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
            {copiado ? 'Mensagem copiada' : 'Copiar mensagem do excedente'}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Requerimentos                                                    */
/* ------------------------------------------------------------------ */

function AbaRequerimentos({
  banco,
  podeEditar,
  lista,
  onChange,
}: {
  banco: BancoControleMock;
  podeEditar: boolean;
  lista: RequerimentoControleMock[];
  onChange: (l: RequerimentoControleMock[]) => void;
}) {
  const [soDeste, setSoDeste] = useState(true);
  const linhas = soDeste ? lista.filter((r) => r.bancoId === banco.id) : lista;
  const colunas: ColunaTabela<RequerimentoControleMock>[] = [
    {
      id: 'req',
      cabecalho: 'Requerimento',
      mobile: 'titulo',
      celula: (r) => (
        <div className="min-w-0">
          <p className="font-semibold">{r.chamado}</p>
          <p className="truncate text-xs text-ds-fg-muted">{r.titulo}</p>
        </div>
      ),
    },
    { id: 'modulo', cabecalho: 'Módulo', celula: (r) => r.modulo },
    { id: 'mes', cabecalho: 'Cobrança', celula: (r) => r.mesCobranca },
    {
      id: 'situacao',
      cabecalho: 'Situação',
      celula: (r) =>
        r.situacao === 'enviado' ? (
          <StatusBadge tom="success">Enviado</StatusBadge>
        ) : (
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge>Em desenvolvimento</StatusBadge>
            <span className="text-[11px] text-ds-fg-muted">
              não consome até ir para faturamento
            </span>
          </span>
        ),
    },
    {
      id: 'horas',
      cabecalho: 'Horas',
      alinhar: 'direita',
      celula: (r) => <HoursValue minutos={r.minutos} className="font-medium" />,
    },
    {
      id: 'banco',
      cabecalho: 'Banco',
      celula: (r) =>
        podeEditar ? (
          <Select
            aria-label={`Banco do ${r.chamado}`}
            value={r.bancoId}
            className="w-full min-w-[11rem]"
            onChange={(e) =>
              onChange(
                lista.map((x) =>
                  x.id === r.id
                    ? {
                        ...x,
                        bancoId: e.target.value,
                        classificacao: { tipo: 'ajustada', por: 'Usuário Teste', em: '21/10/2026' },
                      }
                    : x
                )
              )
            }
          >
            {BANCOS_CONTROLE_MOCK.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nome}
              </option>
            ))}
          </Select>
        ) : (
          BANCOS_CONTROLE_MOCK.find((b) => b.id === r.bancoId)?.nome
        ),
    },
    {
      id: 'classificacao',
      cabecalho: 'Classificação',
      celula: (r) =>
        r.classificacao.tipo === 'automatica' ? (
          <StatusBadge tom="info">Pelo módulo</StatusBadge>
        ) : (
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge tom="warning">Ajustada</StatusBadge>
            <span className="text-[11px] text-ds-fg-muted">
              {r.classificacao.por} · {r.classificacao.em}
            </span>
          </span>
        ),
    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltroAlternar rotulo="Só deste banco" ativo={soDeste} onChange={setSoDeste} />
        <Ajuda>
          O banco vem do módulo do requerimento (Produtos e Módulos › Módulos de requerimento).
        </Ajuda>
      </div>
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo="Requerimentos do período"
          colunas={colunas}
          linhas={linhas}
          chaveLinha={(r) => r.id}
          vazio={
            <EmptyState
              icone={<FileSpreadsheet />}
              titulo="Nenhum requerimento neste banco no período"
            />
          }
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Reajustes                                                        */
/* ------------------------------------------------------------------ */

function AbaReajustes({
  banco,
  periodo,
  podeEditar,
  reajustes,
  onLancar,
  onInativar,
}: {
  banco: BancoControleMock;
  periodo: PeriodoMock;
  podeEditar: boolean;
  reajustes: ReajusteMock[];
  onLancar: () => void;
  onInativar: (r: ReajusteMock) => void;
}) {
  const doPeriodo = reajustes.filter(
    (r) => r.bancoId === banco.id && periodo.meses.some((m) => m.id === r.mes)
  );
  const colunas: ColunaTabela<ReajusteMock>[] = [
    {
      id: 'mes',
      cabecalho: 'Mês',
      mobile: 'titulo',
      celula: (r) => <span className="font-semibold">{rotuloMes(r.mes)}</span>,
    },
    {
      id: 'valor',
      cabecalho: 'Reajuste',
      alinhar: 'direita',
      celula: (r) => (
        <span className={cn(!r.ativo && 'line-through opacity-60')}>
          <HoursValue minutos={r.minutos} sinal="sempre" className="font-medium" />
          <span className="block text-[11px] text-ds-fg-muted">
            {r.minutos > 0 ? 'soma ao consumo' : 'abate do consumo'}
          </span>
        </span>
      ),
    },
    {
      id: 'motivo',
      cabecalho: 'Motivo',
      celula: (r) => <span className="text-sm">{r.motivo}</span>,
    },
    {
      id: 'por',
      cabecalho: 'Lançado por',
      celula: (r) => (
        <span className="text-xs">
          {r.por}
          <span className="block text-ds-fg-muted">{r.em}</span>
        </span>
      ),
    },
    {
      id: 'situacao',
      cabecalho: 'Situação',
      celula: (r) =>
        !r.ativo ? (
          <StatusBadge>Inativo</StatusBadge>
        ) : r.aguardandoRetificacao ? (
          <StatusBadge tom="warning">Aguardando retificação</StatusBadge>
        ) : (
          <StatusBadge tom="success">Aplicado</StatusBadge>
        ),
    },
    ...(podeEditar
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (r: ReajusteMock) =>
              r.ativo ? (
                <div className="flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button tamanho="icone" variante="fantasma" aria-label="Ações do reajuste">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      data-ds="v2"
                      align="end"
                      className="min-w-44 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
                    >
                      <DropdownMenuItem
                        className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                        onSelect={() => onInativar(r)}
                      >
                        <XCircle className="h-4 w-4" /> Inativar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : null,
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-3">
      {podeEditar && (
        <div className="flex justify-end">
          <Button variante="primario" onClick={onLancar}>
            <Plus /> Lançar reajuste
          </Button>
        </div>
      )}
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo="Reajustes do período"
          colunas={colunas}
          linhas={doPeriodo}
          chaveLinha={(r) => r.id}
          vazio={<EmptyState icone={<Sigma />} titulo="Nenhum reajuste neste período" />}
        />
      </div>
    </div>
  );
}

function LancarReajuste({
  banco,
  periodo,
  mesInicial,
  onFechar,
}: {
  banco: BancoControleMock;
  periodo: PeriodoMock;
  mesInicial?: string;
  onFechar: () => void;
}) {
  const disponiveis = periodo.meses;
  const [mes, setMes] = useState(mesInicial ?? mesReferencia(periodo).id);
  const [efeito, setEfeito] = useState<'soma' | 'abate'>('abate');
  const [horas, setHoras] = useState('');
  const [tickets, setTickets] = useState('');
  const [motivo, setMotivo] = useState('');
  const escolhido = periodo.meses.find((m) => m.id === mes);
  const fechado = escolhido?.situacao === 'fechado';
  const minutos = /^\d{1,3}:[0-5]\d$/.test(horas)
    ? Number(horas.split(':')[0]) * 60 + Number(horas.split(':')[1])
    : 0;
  const delta = efeito === 'soma' ? minutos : -minutos;
  const pode = minutos > 0 && motivo.trim().length > 0;

  return (
    <TelaEdicao
      voltarPara={banco.nome}
      titulo="Lançar reajuste"
      subtitulo={`${banco.nome} · ${periodo.rotulo}`}
      podeSalvar={pode}
      rotuloSalvar="Lançar reajuste"
      onFechar={onFechar}
      onSalvar={onFechar}
    >
      <Secao titulo="Reajuste">
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <div>
            <Rotulo obrigatorio htmlFor="mes-reajuste">
              Mês do reajuste
            </Rotulo>
            <Select
              id="mes-reajuste"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="w-full"
            >
              {disponiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.rotulo}
                  {m.situacao === 'fechado'
                    ? ' (fechado)'
                    : m.situacao === 'futuro'
                      ? ' (a começar)'
                      : ''}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Rotulo obrigatorio>Efeito</Rotulo>
            <Escolha<typeof efeito>
              rotulo="Efeito"
              opcoes={[
                { valor: 'abate', rotulo: 'Abater do consumo' },
                { valor: 'soma', rotulo: 'Somar ao consumo' },
              ]}
              valor={efeito}
              onChange={setEfeito}
            />
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="horas-reajuste">
              Horas
            </Rotulo>
            <CampoHoras id="horas-reajuste" valor={horas} onChange={setHoras} sufixo="" />
          </div>
        </div>
        {banco.tipoContrato === 'ambos' && (
          <div className="sm:w-1/3 sm:pr-3">
            <Rotulo htmlFor="tickets-reajuste">Tickets</Rotulo>
            <CampoNumero id="tickets-reajuste" min={0} valor={tickets} onChange={setTickets} />
          </div>
        )}
        <div>
          <Rotulo obrigatorio htmlFor="motivo-reajuste">
            Motivo
          </Rotulo>
          <textarea
            id="motivo-reajuste"
            rows={3}
            maxLength={700}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: atendimento presencial não apontado no Aranda."
            className={areaTexto}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
            {motivo.length}/700
          </p>
        </div>
        {escolhido && minutos > 0 && (
          <Callout
            tom={fechado ? 'warning' : 'info'}
            titulo={fechado ? `${escolhido.rotulo} já está fechado` : 'Efeito no saldo'}
          >
            {fechado
              ? `O Book de ${escolhido.rotulo} já foi gerado. O reajuste fica aguardando a retificação do Book desse mês e, quando ela for feita, vale até o fim do período.`
              : `O saldo de ${escolhido.rotulo} passa de ${formatarHoras(escolhido.saldo)} para ${formatarHoras(escolhido.saldo - delta)}, e o repasse dos meses seguintes é recalculado.`}
          </Callout>
        )}
      </Secao>
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Observações                                                      */
/* ------------------------------------------------------------------ */

function AbaObservacoes({
  banco,
  periodo,
  podeEditar,
}: {
  banco: BancoControleMock;
  periodo: PeriodoMock;
  podeEditar: boolean;
}) {
  const [lista, setLista] = useState(OBSERVACOES_MOCK);
  const [compondo, setCompondo] = useState<{
    id: string | null;
    mes: string;
    texto: string;
  } | null>(null);
  const [excluir, setExcluir] = useState<ObservacaoMock | null>(null);
  const doPeriodo = lista
    .filter((o) => o.bancoId === banco.id && periodo.meses.some((m) => m.id === o.mes))
    .sort((a, b) => b.mes.localeCompare(a.mes));
  const meses = periodo.meses.filter((m) => m.situacao !== 'futuro');
  const salvar = () => {
    if (!compondo?.texto.trim()) return;
    setLista((l) =>
      compondo.id
        ? l.map((o) =>
            o.id === compondo.id
              ? { ...o, texto: compondo.texto.trim(), mes: compondo.mes, editada: true }
              : o
          )
        : [
            {
              id: `ob-${Date.now()}`,
              bancoId: banco.id,
              mes: compondo.mes,
              tipo: 'manual',
              texto: compondo.texto.trim(),
              por: 'Usuário Teste',
              em: '21/10/2026',
            },
            ...l,
          ]
    );
    setCompondo(null);
  };
  const TIPO = {
    manual: { rotulo: 'Manual', tom: 'neutral' as const },
    reajuste: { rotulo: 'Reajuste', tom: 'info' as const },
    automatica: { rotulo: 'Automática', tom: 'info' as const },
  };

  return (
    <div className="space-y-3">
      {podeEditar && !compondo && (
        <div className="flex justify-end">
          <Button
            variante="primario"
            onClick={() => setCompondo({ id: null, mes: mesReferencia(periodo).id, texto: '' })}
          >
            <Plus /> Nova observação
          </Button>
        </div>
      )}
      {compondo && (
        <div className="ds-surgir space-y-3 rounded-xl border border-[#00D4E8] bg-ds-bg-surface p-4">
          <div className="sm:w-1/3">
            <Rotulo htmlFor="mes-observacao">Mês da observação</Rotulo>
            <Select
              id="mes-observacao"
              value={compondo.mes}
              onChange={(e) => setCompondo({ ...compondo, mes: e.target.value })}
              className="w-full"
            >
              {meses.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.rotulo}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="texto-observacao">
              Observação
            </Rotulo>
            <textarea
              id="texto-observacao"
              autoFocus
              rows={3}
              maxLength={700}
              value={compondo.texto}
              onChange={(e) => setCompondo({ ...compondo, texto: e.target.value })}
              className={areaTexto}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
              {compondo.texto.length}/700
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setCompondo(null)}>Cancelar</Button>
            <Button variante="primario" disabled={!compondo.texto.trim()} onClick={salvar}>
              Salvar
            </Button>
          </div>
        </div>
      )}
      {doPeriodo.length === 0 ? (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState icone={<MessageSquare />} titulo="Nenhuma observação neste período" />
        </div>
      ) : (
        <ul className="space-y-2" aria-label="Observações do período">
          {doPeriodo.map((o) => (
            <li
              key={o.id}
              className="ds-surgir rounded-xl border border-ds-border bg-ds-bg-surface px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ds-fg-muted">
                    <StatusBadge tom={TIPO[o.tipo].tom}>{TIPO[o.tipo].rotulo}</StatusBadge>
                    <span className="font-medium text-ds-fg">{rotuloMes(o.mes)}</span>
                    <span>
                      {o.por} · {o.em}
                      {o.editada && ' · editada'}
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm">{o.texto}</p>
                </div>
                {podeEditar && o.tipo === 'manual' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button tamanho="icone" variante="fantasma" aria-label="Ações da observação">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      data-ds="v2"
                      align="end"
                      className="min-w-40 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
                    >
                      <DropdownMenuItem
                        className={itemMenu}
                        onSelect={() => setCompondo({ id: o.id, mes: o.mes, texto: o.texto })}
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                        onSelect={() => setExcluir(o)}
                      >
                        <Trash2 className="h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Ajuda>
        As observações de reajuste e as automáticas (consumo entre bancos) não são editadas aqui:
        mudam com o reajuste ou com o recálculo.
      </Ajuda>
      <ConfirmDialog
        aberto={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo="Excluir a observação?"
        consequencias={['Ela sai do Controle; a exclusão fica registrada na auditoria']}
        rotuloConfirmar="Excluir"
        tom="perigo"
        onConfirmar={() => {
          setLista((l) => l.filter((o) => o.id !== excluir?.id));
          setExcluir(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Histórico de versões                                             */
/* ------------------------------------------------------------------ */

function AbaHistorico({ banco, periodo }: { banco: BancoControleMock; periodo: PeriodoMock }) {
  const versoes = VERSOES_MOCK.filter(
    (v) => v.bancoId === banco.id && periodo.meses.some((m) => m.id === v.mes)
  );
  const TIPO = {
    calculo: { rotulo: 'Cálculo', tom: 'neutral' as const },
    recalculo: { rotulo: 'Recálculo', tom: 'info' as const },
    reajuste: { rotulo: 'Reajuste', tom: 'info' as const },
    retificacao: { rotulo: 'Retificação do Book', tom: 'warning' as const },
  };
  const colunas: ColunaTabela<(typeof versoes)[number]>[] = [
    {
      id: 'mes',
      cabecalho: 'Mês · versão',
      mobile: 'titulo',
      celula: (v) => (
        <span className="font-semibold">
          {rotuloMes(v.mes)} <span className="font-normal text-ds-fg-muted">· v{v.versao}</span>
        </span>
      ),
    },
    {
      id: 'tipo',
      cabecalho: 'Tipo',
      celula: (v) => <StatusBadge tom={TIPO[v.tipo].tom}>{TIPO[v.tipo].rotulo}</StatusBadge>,
    },
    {
      id: 'saldo',
      cabecalho: 'Saldo',
      celula: (v) => (
        <span className="tabular-nums">
          {v.saldoAntes === null ? '' : `${formatarHoras(v.saldoAntes)} → `}
          <HoursValue minutos={v.saldoDepois} cor="saldo" className="font-medium" />
        </span>
      ),
    },
    {
      id: 'por',
      cabecalho: 'Por',
      celula: (v) => (
        <span className="text-xs">
          {v.por}
          <span className="block text-ds-fg-muted">{v.em}</span>
        </span>
      ),
    },
    {
      id: 'motivo',
      cabecalho: 'Motivo',
      celula: (v) => v.motivo ?? <span className="text-ds-fg-muted">—</span>,
    },
  ];
  return (
    <div className="space-y-3">
      <Callout tom="info">
        Cada cálculo, recálculo, reajuste e retificação gera uma versão do mês. Nenhuma versão é
        apagada: inativar um reajuste gera uma versão nova.
      </Callout>
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo="Versões do período"
          colunas={colunas}
          linhas={versoes}
          chaveLinha={(v) => v.id}
          vazio={<EmptyState icone={<History />} titulo="Nenhuma versão neste período" />}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Envio manual do Saldo Parcial                                        */
/* ------------------------------------------------------------------ */

function EnviarSaldoParcial({ empresa, onFechar }: { empresa: string; onFechar: () => void }) {
  const contatos = CONTATOS_ALFA_MOCK.filter((c) => c.ativo && c.finalidade !== 'Book');
  const [destinatarios, setDestinatarios] = useState(contatos.map((c) => c.email));
  const [cc, setCc] = useState('');
  const [assunto, setAssunto] = useState(`Saldo parcial do banco de horas · ${empresa} · Out/2026`);
  const [texto, setTexto] = useState(
    'Prezados, segue o saldo parcial dos bancos de horas no mês de outubro.'
  );
  const [confirmar, setConfirmar] = useState(false);

  return (
    <TelaEdicao
      voltarPara="Controle"
      titulo="Enviar Saldo Parcial"
      subtitulo={`${empresa} · Último envio em ${ULTIMO_ENVIO_SALDO_MOCK.em} (${ULTIMO_ENVIO_SALDO_MOCK.por})`}
      podeSalvar={destinatarios.length > 0 && !!assunto.trim()}
      rotuloSalvar="Enviar"
      onFechar={onFechar}
      onSalvar={() => setConfirmar(true)}
    >
      <Secao titulo="E-mail">
        <div>
          <Rotulo obrigatorio>Destinatários</Rotulo>
          <div className="flex flex-wrap gap-1.5">
            {destinatarios.map((d) => (
              <Chip key={d} onRemover={() => setDestinatarios((l) => l.filter((x) => x !== d))}>
                {d}
              </Chip>
            ))}
            {!destinatarios.length && (
              <span className="text-sm text-ds-danger-fg">Nenhum destinatário.</span>
            )}
          </div>
        </div>
        <div>
          <Rotulo htmlFor="cc-saldo">Com cópia</Rotulo>
          <input
            id="cc-saldo"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="Opcional"
            className={campo}
          />
        </div>
        <div>
          <Rotulo obrigatorio htmlFor="assunto-saldo">
            Assunto
          </Rotulo>
          <input
            id="assunto-saldo"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <Rotulo htmlFor="texto-saldo">Texto de abertura</Rotulo>
          <textarea
            id="texto-saldo"
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={areaTexto}
          />
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-ds-border bg-ds-bg-subtle px-3 py-2.5 text-sm">
          <FileSpreadsheet className="h-5 w-5 text-ds-fg-accent" aria-hidden />
          <span className="min-w-0 flex-1">
            Consumo detalhado (Excel), gerado no envio: uma aba de resumo e uma aba por banco
          </span>
        </div>
      </Secao>

      <Secao titulo="Prévia">
        <p className="text-sm text-ds-fg-secondary">{texto}</p>
        <div className="grid gap-3 lg:grid-cols-3">
          {BANCOS_CONTROLE_MOCK.map((b) => {
            const p = b.periodos[b.periodos.length - 1];
            const m = mesReferencia(p);
            return (
              <div key={b.id} className="rounded-lg border border-ds-border p-3">
                <p className="text-sm font-semibold">{b.nome}</p>
                <p className="text-xs text-ds-fg-muted">{p.rotulo}</p>
                <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
                  <dt className="text-ds-fg-muted">Disponível</dt>
                  <dd className="text-right">
                    <HoursValue minutos={m.disponivel} />
                  </dd>
                  <dt className="text-ds-fg-muted">Consumo</dt>
                  <dd className="text-right">
                    <HoursValue minutos={m.consumo} />
                  </dd>
                  <dt className="font-medium">Saldo</dt>
                  <dd className="text-right font-medium">
                    <HoursValue minutos={m.saldo} cor="saldo" />
                  </dd>
                </dl>
                {m.saldo < 0 && (
                  <p className="mt-2 text-xs text-ds-fg-secondary">
                    O saldo negativo deste banco poderá ser coberto pelo saldo dos demais bancos no
                    fechamento do período ({p.meses[p.meses.length - 1].rotulo}).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Secao>

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo="Enviar o Saldo Parcial agora?"
        consequencias={[
          `${plural(destinatarios.length, 'destinatário', 'destinatários')}, um e-mail com todos os bancos`,
          'O envio fica no histórico de envios do Saldo Parcial',
        ]}
        rotuloConfirmar="Enviar"
        onConfirmar={() => {
          setConfirmar(false);
          onFechar();
        }}
      />
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function ControleBancoHoras({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [empresaId, setEmpresaId] = useState(EMPRESAS_CONTROLE_MOCK[0].id);
  const [bancoId, setBancoId] = useState('edocs');
  // Período escolhido por banco (cada banco tem a sua periodicidade)
  const [periodoPorBanco, setPeriodoPorBanco] = useState<Record<string, number>>({});
  const [secao, setSecao] = useState('quadro');
  const [nivel, setNivel] = useState<'reajuste' | 'envio' | null>(null);
  const [mesReajuste, setMesReajuste] = useState<string | undefined>();
  const [recalcular, setRecalcular] = useState(false);
  const [requerimentos, setRequerimentos] = useState(REQUERIMENTOS_CONTROLE_MOCK);
  const [reajustes, setReajustes] = useState(REAJUSTES_MOCK);
  const [inativar, setInativar] = useState<ReajusteMock | null>(null);
  const podeEditar = perfil === 'edicao';
  const empresa = EMPRESAS_CONTROLE_MOCK.find((e) => e.id === empresaId)!;
  const legado = empresa.modelo === 'legado';

  const banco = BANCOS_CONTROLE_MOCK.find((b) => b.id === bancoId) ?? BANCOS_CONTROLE_MOCK[0];
  const indicePeriodo = periodoPorBanco[banco.id] ?? banco.periodos.length - 1;
  const periodo = banco.periodos[indicePeriodo];
  const carregando = estado === 'carregando';

  const requerimentosAlterados = useMemo(
    () =>
      requerimentos.filter(
        (r) => REQUERIMENTOS_CONTROLE_MOCK.find((o) => o.id === r.id)?.bancoId !== r.bancoId
      ).length,
    [requerimentos]
  );

  const secoes = [
    { valor: 'quadro', rotulo: 'Quadro' },
    {
      valor: 'requerimentos',
      rotulo: 'Requerimentos',
      contador: requerimentos.filter((r) => r.bancoId === banco.id).length,
    },
    { valor: 'reajustes', rotulo: 'Reajustes' },
    { valor: 'observacoes', rotulo: 'Observações' },
    { valor: 'historico', rotulo: 'Histórico' },
  ];

  const conteudoSecao = () => {
    if (carregando) return <div className="h-96 animate-pulse rounded-xl bg-ds-bg-surface" />;
    if (secao === 'quadro')
      return (
        <Quadro
          banco={banco}
          periodo={periodo}
          podeEditar={podeEditar && !legado}
          onReajuste={(mes) => {
            setMesReajuste(mes);
            setNivel('reajuste');
          }}
        />
      );
    if (secao === 'requerimentos')
      return (
        <AbaRequerimentos
          banco={banco}
          podeEditar={podeEditar && !legado}
          lista={requerimentos}
          onChange={setRequerimentos}
        />
      );
    if (secao === 'reajustes')
      return (
        <AbaReajustes
          banco={banco}
          periodo={periodo}
          podeEditar={podeEditar && !legado}
          reajustes={reajustes}
          onLancar={() => {
            setMesReajuste(undefined);
            setNivel('reajuste');
          }}
          onInativar={setInativar}
        />
      );
    if (secao === 'observacoes')
      return (
        <AbaObservacoes
          key={banco.id}
          banco={banco}
          periodo={periodo}
          podeEditar={podeEditar && !legado}
        />
      );
    return <AbaHistorico banco={banco} periodo={periodo} />;
  };

  const corpo = () => {
    if (nivel === 'reajuste')
      return (
        <LancarReajuste
          banco={banco}
          periodo={periodo}
          mesInicial={mesReajuste}
          onFechar={() => setNivel(null)}
        />
      );
    if (nivel === 'envio')
      return <EnviarSaldoParcial empresa={empresa.nome} onFechar={() => setNivel(null)} />;
    return (
      <>
        <Topo
          empresaId={empresaId}
          onEmpresa={setEmpresaId}
          podeEditar={podeEditar}
          legado={legado}
          onEnviar={() => setNivel('envio')}
          onRecalcular={() => setRecalcular(true)}
        />

        {estado === 'erro' ? (
          <div className="mt-6 space-y-3">
            <Callout tom="danger" titulo="Não foi possível carregar o banco de horas">
              Verifique a conexão e tente novamente.
            </Callout>
            <Button>Tentar novamente</Button>
          </div>
        ) : estado === 'vazio' ? (
          <div className="ds-surgir relative -mt-16 rounded-xl border border-ds-border bg-ds-bg-surface shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:-mt-20">
            <EmptyState
              icone={<Clock />}
              titulo="Esta empresa ainda não tem bancos de horas"
              descricao="Os bancos são cadastrados na tela de Empresas, aba Bancos de Horas."
            />
          </div>
        ) : (
          <>
            {carregando ? (
              <div
                className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4"
                role="status"
                aria-label="Carregando"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[116px] animate-pulse rounded-xl border border-ds-border bg-ds-bg-surface"
                  />
                ))}
              </div>
            ) : (
              <div key={banco.id + periodo.id}>
                <Indicadores banco={banco} periodo={periodo} />
              </div>
            )}

            {legado && (
              <div className="mt-6">
                <Callout tom="warning" titulo={`${empresa.nome} ainda usa o cálculo atual`}>
                  Aqui aparece o cálculo novo em validação (modo sombra), sem envio ao cliente. O
                  Controle oficial desta empresa continua sendo a tela atual até a liberação.
                </Callout>
              </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
              <section aria-labelledby="titulo-bancos" className="space-y-3">
                <div className="flex h-[54px] items-center justify-between">
                  <h2 id="titulo-bancos" className="text-sm font-medium text-ds-fg">
                    Bancos da empresa{' '}
                    <span className="font-normal text-ds-fg-muted">
                      · {BANCOS_CONTROLE_MOCK.length}
                    </span>
                  </h2>
                  <span className="text-xs text-ds-fg-muted">por prioridade</span>
                </div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
                  {BANCOS_CONTROLE_MOCK.map((b, i) => (
                    <ItemBanco
                      key={b.id}
                      banco={b}
                      selecionado={b.id === banco.id}
                      onSelecionar={() => setBancoId(b.id)}
                      atrasoMs={280 + i * 70}
                    />
                  ))}
                </div>
              </section>

              <section aria-labelledby="titulo-banco" className="min-w-0 space-y-4">
                <div className="sticky top-0 z-[5] -mx-1 space-y-2 bg-ds-bg-page px-1 py-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                    <div className="min-w-0">
                      <h2
                        key={banco.id}
                        id="titulo-banco"
                        className="ds-surgir font-ds-title text-xl font-semibold tracking-tight text-ds-fg"
                      >
                        {banco.nome}
                      </h2>
                      <p className="truncate text-xs text-ds-fg-muted">
                        {banco.tipoContrato === 'ambos'
                          ? 'Banco de horas e tickets'
                          : banco.tipoContrato === 'tickets'
                            ? 'Banco de tickets'
                            : 'Banco de horas'}
                      </p>
                    </div>
                    <SegmentedTabs
                      rotulo="Seções do banco"
                      itens={secoes}
                      valor={secao}
                      onChange={setSecao}
                    />
                  </div>
                </div>
                <NavegadorPeriodo
                  banco={banco}
                  indice={indicePeriodo}
                  onIndice={(i) => setPeriodoPorBanco((p) => ({ ...p, [banco.id]: i }))}
                />
                <div key={`${banco.id}-${periodo.id}-${secao}`}>{conteudoSecao()}</div>
              </section>
            </div>
          </>
        )}

        {requerimentosAlterados > 0 && (
          <BarraRodape>
            <span className="text-sm text-ds-fg-secondary">
              <span className="font-medium text-ds-fg">
                {plural(
                  requerimentosAlterados,
                  'requerimento com banco alterado',
                  'requerimentos com banco alterado'
                )}
              </span>{' '}
              · vale a partir do próximo recálculo; meses fechados não mudam.
            </span>
            <div className="flex gap-2">
              <Button onClick={() => setRequerimentos(REQUERIMENTOS_CONTROLE_MOCK)}>
                Descartar
              </Button>
              <Button
                variante="primario"
                onClick={() => setRequerimentos(REQUERIMENTOS_CONTROLE_MOCK)}
              >
                Salvar
              </Button>
            </div>
          </BarraRodape>
        )}
      </>
    );
  };

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Banco de Horas"
        menuExpandido={menuExpandido}
        onToggleMenu={() => setMenuExpandido((v) => !v)}
      >
        <ChavesPrototipo>
          <ChavePrototipo<typeof perfil>
            rotulo="Perfil"
            opcoes={[
              ['edicao', 'Edita'],
              ['leitura', 'Só visualiza'],
            ]}
            valor={perfil}
            onChange={setPerfil}
          />
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" aria-hidden /> Troque a empresa para EMPRESA BETA para ver
            uma empresa ainda em Legado
          </span>
        </ChavesPrototipo>
        {corpo()}

        <ConfirmDialog
          aberto={recalcular}
          onOpenChange={setRecalcular}
          titulo="Recalcular os bancos de horas?"
          descricao={`Os meses abertos de todos os bancos de ${empresa.nome} são refeitos com os apontamentos, requerimentos e reajustes atuais.`}
          consequencias={[
            'Meses fechados não mudam; para eles, use a retificação do Book',
            'O resultado anterior fica no histórico de versões',
          ]}
          rotuloConfirmar="Recalcular"
          onConfirmar={() => setRecalcular(false)}
        />
        <ConfirmDialog
          aberto={!!inativar}
          onOpenChange={(v) => !v && setInativar(null)}
          titulo="Inativar o reajuste?"
          descricao={
            inativar
              ? `${formatarHoras(inativar.minutos, { sinal: 'sempre' })} em ${rotuloMes(inativar.mes)}: ${inativar.motivo}`
              : undefined
          }
          consequencias={[
            'O reajuste deixa de valer e o mês é recalculado até o fim do período',
            'Nada é apagado: o reajuste e a versão anterior continuam no histórico',
          ]}
          rotuloConfirmar="Inativar"
          tom="perigo"
          justificativa={{ rotulo: 'Motivo', placeholder: 'Ex.: lançado em duplicidade' }}
          onConfirmar={() => {
            setReajustes((l) => l.map((r) => (r.id === inativar?.id ? { ...r, ativo: false } : r)));
            setInativar(null);
          }}
        />
      </PaginaV2>
    </DicasContext.Provider>
  );
}
