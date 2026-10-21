// Protótipo EXPLORATÓRIO consolidado do Controle de Banco de Horas: junta as peças escolhidas em 15/10/2026
// a partir das quatro versões anteriores (v2, criativo, enxuto, suave):
//  - menu em pílula (suave), agora com o logo e expansível;
//  - topo no estilo da referência "Sonda Precificação": faixa escura com foto de marca, selo da tela atual,
//    tema, notificações e usuário, seguida do hero da versão expressiva e dos indicadores sobrepostos;
//  - passador de período grande (comparação legado/novo);
//  - abas em pílula sem "Visão geral", abrindo direto no Quadro.
// Shell desenhado aqui só para avaliar a direção; não altera o LayoutAdmin. Dados: mock da versão enxuta (coerentes por banco).
import { useState, type ReactNode } from 'react';
import {
  ArrowLeftRight,
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
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
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
  REQUERIMENTOS_MOCK,
  type RequerimentoMock,
} from './mocks/controleBancoHorasV2';
import {
  BANCOS_ENXUTO_MOCK,
  type BancoEnxutoMock,
  type MesBancoMock,
} from './mocks/controleBancoHorasEnxuto';
import { BarraConsumo, Sparkline, atraso, useContador } from './compartilhado/visual';
import { FaixaTopo, PaginaV2, botaoPrimarioTopo, botaoVidro, vidro } from './compartilhado/shell';

function saldoAtual(banco: BancoEnxutoMock) {
  return banco.entreBancos?.saldoFinal ?? banco.meses[banco.meses.length - 1].saldo;
}

/* ------------------------------------------------------------------ */
/* Topo: cabeçalho + hero numa faixa escura com a foto de marca        */
/* ------------------------------------------------------------------ */

function Topo({
  empresa,
  setEmpresa,
  onRecalcular,
}: {
  empresa: string;
  setEmpresa: (e: string) => void;
  onRecalcular: () => void;
}) {
  return (
    <FaixaTopo>
      {/* Hero */}
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
          <span className="inline-flex h-7 items-center gap-1.5 self-start rounded-full border border-[#4CC77A]/35 bg-[#4CC77A]/10 px-2.5 text-xs font-medium text-[#4CC77A] sm:self-auto">
            <CheckCircle2 className="h-3.5 w-3.5" /> Bancos múltiplos
          </span>

          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <button type="button" className={botaoVidro}>
              <History className="h-4 w-4" /> Histórico
            </button>
            <button type="button" className={botaoVidro}>
              <Send className="h-4 w-4" /> Enviar Saldo Parcial
            </button>
            <button type="button" onClick={onRecalcular} className={botaoPrimarioTopo}>
              <RefreshCw className="h-4 w-4" /> Recalcular
            </button>
          </div>
        </div>
      </div>
    </FaixaTopo>
  );
}

/* ------------------------------------------------------------------ */
/* Indicadores                                                         */
/* ------------------------------------------------------------------ */

function Kpi({
  rotulo,
  icone,
  valor,
  sinal,
  tom = 'neutral',
  rodape,
  atrasoMs = 0,
}: {
  rotulo: string;
  icone: ReactNode;
  valor: number;
  sinal?: 'auto' | 'sempre';
  tom?: 'neutral' | 'success' | 'danger' | 'info';
  rodape: ReactNode;
  atrasoMs?: number;
}) {
  const animado = useContador(valor);
  const cor = {
    danger: 'text-ds-danger-fg',
    success: 'text-ds-success-fg',
    info: 'text-ds-fg-accent',
    neutral: 'text-ds-fg',
  }[tom];
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
            {formatarHoras(animado, { sinal })}
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

function Indicadores({ banco }: { banco: BancoEnxutoMock }) {
  const mesAtual = banco.meses[banco.meses.length - 1];
  const mesAnterior = banco.meses[banco.meses.length - 2];
  const saldo = saldoAtual(banco);
  const entre = banco.entreBancos;
  return (
    <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
      <Kpi
        rotulo="Baseline"
        icone={<Wallet />}
        valor={mesAtual.baseline}
        rodape={`Mensal · ${banco.repassePercentual}% de repasse`}
      />
      <Kpi
        rotulo="Consumo no mês"
        icone={<Sigma />}
        valor={mesAtual.consumo}
        atrasoMs={60}
        rodape={
          <Variacao
            minutos={mesAtual.consumo - mesAnterior.consumo}
            texto={`vs. ${mesAnterior.rotulo.slice(0, 3)}`}
          />
        }
      />
      <Kpi
        rotulo={`Saldo · ${banco.nome}`}
        icone={<Clock />}
        valor={saldo}
        tom={saldo < 0 ? 'danger' : saldo > 0 ? 'success' : 'neutral'}
        atrasoMs={120}
        rodape={
          <Sparkline
            key={banco.id}
            valores={banco.historicoSaldo}
            className={cn('h-6 w-full', saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
          />
        }
      />
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
            : 'Sem movimento no período'
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Período grande e bancos                                             */
/* ------------------------------------------------------------------ */

function PeriodoGrande() {
  return (
    <nav
      aria-label="Período de apuração"
      className="ds-surgir flex items-center justify-between gap-3 rounded-xl border border-ds-border bg-ds-bg-surface p-1.5"
      style={atraso(240)}
    >
      <Button variante="fantasma" tamanho="sm" className="text-ds-fg">
        <ChevronLeft /> <span className="hidden sm:inline">Anterior</span>
      </Button>
      <p className="text-center font-ds-title text-base font-semibold tracking-tight text-ds-fg md:text-lg">
        Outubro – Dezembro/2026
      </p>
      <Button variante="fantasma" tamanho="sm" disabled className="bg-transparent">
        <span className="hidden sm:inline">Próximo</span> <ChevronRight />
      </Button>
    </nav>
  );
}

function ItemBanco({
  banco,
  selecionado,
  onSelecionar,
  atrasoMs,
}: {
  banco: BancoEnxutoMock;
  selecionado: boolean;
  onSelecionar: () => void;
  atrasoMs: number;
}) {
  const saldo = saldoAtual(banco);
  const mesAtual = banco.meses[banco.meses.length - 1];
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
          ? 'border-b-[#00D4E8] border-l-[#00D4E8] border-r-transparent border-t-transparent shadow-[0_10px_24px_-14px_rgba(0,212,232,0.6)]'
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
            saldo < 0 ? 'text-ds-danger-fg' : saldo > 0 ? 'text-ds-success-fg' : 'text-ds-fg'
          )}
        >
          {formatarHoras(saldo)}
        </p>
        <Sparkline
          key={banco.id}
          valores={banco.historicoSaldo}
          className={cn('h-5 w-16', saldo < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
        />
      </div>
      <BarraConsumo
        className="mt-2"
        legenda={false}
        consumo={mesAtual.consumo}
        disponivel={mesAtual.disponivel}
        rotulo={`Consumo de ${mesAtual.rotulo} · ${banco.nome}`}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

const SECOES = [
  { valor: 'quadro', rotulo: 'Quadro' },
  { valor: 'requerimentos', rotulo: 'Requerimentos', contador: REQUERIMENTOS_MOCK.length },
  { valor: 'reajustes', rotulo: 'Reajustes' },
  { valor: 'observacoes', rotulo: 'Observações' },
  { valor: 'historico', rotulo: 'Histórico' },
];

export default function ControleBancoHoras({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [empresa, setEmpresa] = useState(EMPRESAS_MOCK[0]);
  const [bancoId, setBancoId] = useState('edocs');
  const [secao, setSecao] = useState('quadro');
  const [requerimentos, setRequerimentos] = useState(REQUERIMENTOS_MOCK);
  const [recalcularAberto, setRecalcularAberto] = useState(false);

  const banco = BANCOS_ENXUTO_MOCK.find((b) => b.id === bancoId) ?? BANCOS_ENXUTO_MOCK[0];
  const carregando = estado === 'carregando';

  const linhasQuadro = (): LinhaMatriz[] => {
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
    return linhas;
  };

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
          {BANCOS_ENXUTO_MOCK.map((b) => (
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
    if (carregando) return <div className="h-96 animate-pulse rounded-xl bg-ds-bg-surface" />;
    if (secao === 'quadro') {
      return (
        <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
          <MatrixTable
            rotulo={`Quadro mensal — ${banco.nome}`}
            rotuloIndicador="Indicador"
            colunas={banco.meses.map((m) => ({
              id: m.id,
              rotulo: m.rotulo,
              atual: !m.fechado,
            }))}
            linhas={linhasQuadro()}
            modoMobile="mes-a-mes"
            colunaInicial={banco.meses[banco.meses.length - 1].id}
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
          descricao="Reajustes, Observações e Histórico entram depois que a direção visual for fechada."
        />
      </div>
    );
  };

  return (
    <PaginaV2
      menuAtivo="Banco de Horas"
      menuExpandido={menuExpandido}
      onToggleMenu={() => setMenuExpandido((v) => !v)}
    >
      <Topo
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
        <div className="ds-surgir relative -mt-16 rounded-xl border border-ds-border bg-ds-bg-surface shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:-mt-20">
          <EmptyState
            icone={<Clock />}
            titulo="Ainda não há cálculo para este período"
            descricao="O cálculo é feito automaticamente todo dia. Você pode calcular agora."
            acao={<Button variante="primario">Calcular agora</Button>}
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
            <div key={banco.id}>
              <Indicadores banco={banco} />
            </div>
          )}

          <div className="mt-6 space-y-6">
            <PeriodoGrande />

            <div className="grid gap-6 xl:grid-cols-[248px_minmax(0,1fr)]">
              <section aria-labelledby="titulo-bancos" className="space-y-3">
                <div className="flex h-[54px] items-center justify-between">
                  <h2 id="titulo-bancos" className="text-sm font-medium text-ds-fg">
                    Bancos da empresa{' '}
                    <span className="font-normal text-ds-fg-muted">
                      · {BANCOS_ENXUTO_MOCK.length}
                    </span>
                  </h2>
                  <span className="text-xs text-ds-fg-muted">por prioridade</span>
                </div>
                <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
                  {BANCOS_ENXUTO_MOCK.map((b, i) => (
                    <ItemBanco
                      key={b.id}
                      banco={b}
                      selecionado={b.id === bancoId}
                      onSelecionar={() => setBancoId(b.id)}
                      atrasoMs={280 + i * 70}
                    />
                  ))}
                </div>
              </section>

              <section aria-labelledby="titulo-banco" className="min-w-0 space-y-3">
                {/* Título do banco e abas na mesma linha; a linha fica presa no topo ao rolar */}
                <div className="sticky top-0 z-[5] -mx-1 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 bg-ds-bg-page px-1 py-1.5">
                  <h2
                    key={banco.id}
                    id="titulo-banco"
                    className="ds-surgir font-ds-title text-xl font-semibold tracking-tight text-ds-fg"
                  >
                    {banco.nome}
                  </h2>
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
    </PaginaV2>
  );
}
