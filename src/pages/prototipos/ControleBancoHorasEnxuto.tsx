// Protótipo EXPLORATÓRIO, terceira versão do Controle de Banco de Horas: "cada fato em um lugar só".
// Compare com /prototipos/controle-banco-horas-v2 (neutra) e /prototipos/controle-banco-horas-criativo (expressiva).
//
// Regras desta versão:
//  - O saldo aparece no seletor de bancos (visão rápida) e no resumo (detalhe). Mais nenhum lugar.
//  - Um único número grande por tela. Hierarquia por tipografia, poucas caixas.
//  - Marca concentrada: fio ciano no cabeçalho, ciano só no banco ativo e no consumo entre bancos.
//  - Detalhe sob demanda: baseline/repasse por mês ficam no Quadro; histórico no menu ⋯.
import { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  Clock,
  History,
  MoreHorizontal,
  RefreshCw,
  Send,
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { PeriodPicker } from '@/components/ds/PeriodPicker';
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

const corSaldo = (minutos: number) =>
  minutos < 0 ? 'text-ds-danger-fg' : minutos > 0 ? 'text-ds-success-fg' : 'text-ds-fg';

/** Saldo que vale para o banco: o final do fechamento (após consumo entre bancos) ou o do mês atual. */
function saldoAtual(banco: BancoEnxutoMock) {
  return banco.entreBancos?.saldoFinal ?? banco.meses[banco.meses.length - 1].saldo;
}

/* ------------------------------------------------------------------ */
/* Partes da tela                                                      */
/* ------------------------------------------------------------------ */

function Cabecalho({
  empresa,
  setEmpresa,
  onRecalcular,
}: {
  empresa: string;
  setEmpresa: (e: string) => void;
  onRecalcular: () => void;
}) {
  return (
    <header className="ds-surgir space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="h-8 w-1 shrink-0 rounded-full bg-gradient-to-b from-[#00D4E8] to-[#006F7D]"
          />
          <h1 className="font-ds-title text-2xl font-semibold tracking-tight text-ds-fg md:text-[28px] md:leading-9">
            Controle de Banco de Horas
          </h1>
          <StatusBadge tom="success" className="hidden sm:inline-flex">
            Bancos múltiplos
          </StatusBadge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Empresa"
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            className="w-full sm:w-56"
          >
            {EMPRESAS_MOCK.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </Select>
          <PeriodPicker
            rotulo="Out – Dez/2026"
            onAnterior={() => undefined}
            onProximo={() => undefined}
            podeProximo={false}
          />
          <Button variante="primario" onClick={onRecalcular} className="ml-auto sm:ml-0">
            <RefreshCw /> Recalcular
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button tamanho="icone" aria-label="Mais ações">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" data-ds="v2" className="font-ds-sans">
              <DropdownMenuItem className="min-h-10 gap-2">
                <History className="h-4 w-4" /> Histórico de versões
              </DropdownMenuItem>
              <DropdownMenuItem className="min-h-10 gap-2">
                <Send className="h-4 w-4" /> Enviar Saldo Parcial
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div
        aria-hidden
        className="ds-crescer h-px bg-gradient-to-r from-[#00D4E8] via-[#00D4E8]/30 to-transparent"
      />
    </header>
  );
}

function SeletorBancos({ bancoId, onChange }: { bancoId: string; onChange: (id: string) => void }) {
  return (
    <div
      role="group"
      aria-label="Bancos da empresa"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0"
    >
      {BANCOS_ENXUTO_MOCK.map((banco, i) => {
        const selecionado = banco.id === bancoId;
        const saldo = saldoAtual(banco);
        return (
          <button
            key={banco.id}
            type="button"
            aria-pressed={selecionado}
            onClick={() => onChange(banco.id)}
            style={atraso(60 + i * 50)}
            className={cn(
              'ds-surgir flex min-w-[196px] shrink-0 items-center justify-between gap-6 rounded-xl border px-4 py-2.5 text-left transition duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-page',
              selecionado
                ? 'border-[#00D4E8] bg-ds-bg-surface shadow-[0_0_0_3px_rgba(0,212,232,0.15)]'
                : 'border-ds-border bg-transparent hover:border-ds-border-strong hover:bg-ds-bg-surface'
            )}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-ds-fg">{banco.nome}</span>
              <span className="block text-xs text-ds-fg-muted">
                {banco.padrao ? 'Banco padrão' : banco.contrato.split(' · ')[1]}
              </span>
            </span>
            <span className={cn('text-base font-semibold tabular-nums', corSaldo(saldo))}>
              {formatarHoras(saldo)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Estatistica({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ds-fg-muted">{rotulo}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-ds-fg">{children}</dd>
    </div>
  );
}

function Resumo({ banco }: { banco: BancoEnxutoMock }) {
  const mesAtual = banco.meses[banco.meses.length - 1];
  const final = saldoAtual(banco);
  const saldoAnimado = useContador(final);
  const disponivel = useContador(mesAtual.disponivel);
  const consumo = useContador(mesAtual.consumo);
  const entre = banco.entreBancos;

  return (
    <section
      aria-labelledby="titulo-resumo"
      className="ds-surgir rounded-xl border border-ds-border bg-ds-bg-surface p-4 md:p-6"
      style={atraso(120)}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p id="titulo-resumo" className="text-xs font-medium text-ds-fg-muted">
            Saldo de {banco.nome} · {mesAtual.rotulo}
            {mesAtual.fechamento && ' (fechamento)'}
          </p>
          <p
            className={cn(
              'mt-1 text-[40px] font-semibold leading-[48px] tracking-tight tabular-nums',
              corSaldo(final)
            )}
          >
            {formatarHoras(saldoAnimado)}
          </p>
          {entre ? (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-ds-fg-secondary">
              <span className="tabular-nums">{formatarHoras(mesAtual.saldo)} no mês</span>
              <ArrowRight className="h-3.5 w-3.5 text-ds-fg-accent" aria-hidden />
              <span>
                {entre.tipo === 'recebeu' ? 'recebeu' : 'cedeu'}{' '}
                <strong className="font-semibold tabular-nums text-ds-fg-accent">
                  {formatarHoras(entre.minutos)}
                </strong>{' '}
                {entre.tipo === 'recebeu' ? 'do' : 'para o'} {entre.outroBanco} no fechamento
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ds-fg-secondary">{banco.contrato}</p>
          )}
        </div>

        <dl className="grid grid-cols-3 gap-4 lg:flex lg:gap-0 lg:divide-x lg:divide-ds-border lg:[&>*]:px-6 lg:[&>*:first-child]:pl-0">
          <Estatistica rotulo="Disponível no mês">{formatarHoras(disponivel)}</Estatistica>
          <Estatistica rotulo="Consumido no mês">{formatarHoras(consumo)}</Estatistica>
          <div className="col-span-3 min-w-0 lg:col-span-1 lg:w-36">
            <dt className="text-xs text-ds-fg-muted">Últimos 6 meses</dt>
            <dd className="mt-1.5">
              <Sparkline
                key={banco.id}
                valores={banco.historicoSaldo}
                className={cn('h-8 w-full', final < 0 ? 'text-ds-danger-fg' : 'text-ds-fg-accent')}
              />
            </dd>
          </div>
        </dl>
      </div>

      <BarraConsumo
        key={banco.id}
        className="mt-5"
        consumo={mesAtual.consumo}
        disponivel={mesAtual.disponivel}
        rotulo={`Consumo de ${mesAtual.rotulo}`}
      />
    </section>
  );
}

function ColunaMes({
  mes,
  banco,
  atrasoMs,
}: {
  mes: MesBancoMock;
  banco: BancoEnxutoMock;
  atrasoMs: number;
}) {
  const entre = mes.fechamento ? banco.entreBancos : undefined;
  return (
    <div className="ds-surgir relative p-4 md:p-5" style={atraso(atrasoMs)}>
      {mes.fechamento && (
        <span
          aria-hidden
          className="ds-crescer absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#00D4E8] to-[#006F7D]"
        />
      )}
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-ds-fg">{mes.rotulo}</h3>
        <span
          className={cn(
            'text-xs',
            mes.fechamento ? 'font-medium text-ds-fg-accent' : 'text-ds-fg-muted'
          )}
        >
          {mes.fechamento ? 'Fechamento · aberto' : 'Fechado'}
        </span>
      </div>

      <p className={cn('mt-3 text-xl font-semibold tabular-nums', corSaldo(mes.saldo))}>
        {formatarHoras(mes.saldo)}
      </p>
      <BarraConsumo
        className="mt-2"
        consumo={mes.consumo}
        disponivel={mes.disponivel}
        rotulo={`Consumo de ${mes.rotulo}`}
      />

      {entre && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-ds-border pt-3 text-xs text-ds-fg-secondary">
          <span className="rounded-full bg-[#00D4E8] px-2 py-0.5 font-semibold tabular-nums text-black">
            {formatarHoras(entre.tipo === 'recebeu' ? entre.minutos : -entre.minutos, {
              sinal: 'sempre',
            })}
          </span>
          {entre.tipo === 'recebeu' ? 'do' : 'para o'} {entre.outroBanco}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */

const SECOES = [
  { valor: 'visao', rotulo: 'Visão geral' },
  { valor: 'quadro', rotulo: 'Quadro' },
  { valor: 'requerimentos', rotulo: 'Requerimentos', contador: REQUERIMENTOS_MOCK.length },
  { valor: 'reajustes', rotulo: 'Reajustes' },
  { valor: 'observacoes', rotulo: 'Observações' },
];

export default function ControleBancoHorasEnxuto({ estado }: PrototipoProps) {
  const [empresa, setEmpresa] = useState(EMPRESAS_MOCK[0]);
  const [bancoId, setBancoId] = useState('edocs');
  const [secao, setSecao] = useState('visao');
  const [requerimentos, setRequerimentos] = useState(REQUERIMENTOS_MOCK);
  const [recalcularAberto, setRecalcularAberto] = useState(false);

  const banco = BANCOS_ENXUTO_MOCK.find((b) => b.id === bancoId) ?? BANCOS_ENXUTO_MOCK[0];

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
          <p className="font-medium">{r.codigo}</p>
          <p className="text-xs text-ds-fg-muted">{r.titulo}</p>
        </div>
      ),
    },
    { id: 'modulo', cabecalho: 'Módulo', celula: (r) => r.modulo },
    {
      id: 'horas',
      cabecalho: 'Horas',
      alinhar: 'direita',
      celula: (r) => <HoursValue minutos={r.minutos} />,
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
          <span className="text-ds-fg-muted">Automática</span>
        ) : (
          <StatusBadge tom="warning">Ajustada</StatusBadge>
        ),
    },
  ];

  const conteudo = () => {
    if (secao === 'visao') {
      return (
        <section
          aria-label="Meses do período"
          className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface"
        >
          <div className="grid divide-y divide-ds-border md:grid-cols-3 md:divide-x md:divide-y-0">
            {banco.meses.map((m, i) => (
              <ColunaMes key={m.id} mes={m} banco={banco} atrasoMs={i * 60} />
            ))}
          </div>
        </section>
      );
    }
    if (secao === 'quadro') {
      return (
        <div className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
          <MatrixTable
            rotulo={`Quadro mensal — ${banco.nome}`}
            rotuloIndicador="Indicador"
            colunas={banco.meses.map((m) => ({
              id: m.id,
              rotulo: m.fechamento ? `${m.rotulo} · fechamento` : m.rotulo,
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
        <div className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
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
      <div className="rounded-xl border border-dashed border-ds-border-strong">
        <EmptyState
          icone={<CalendarClock />}
          titulo="Seção fora desta exploração"
          descricao="Reajustes e Observações entram depois que a direção visual for escolhida."
        />
      </div>
    );
  };

  const corpo = () => {
    if (estado === 'erro') {
      return (
        <div className="space-y-3">
          <Callout tom="danger" titulo="Não foi possível carregar o banco de horas">
            Verifique a conexão e tente novamente.
          </Callout>
          <Button>Tentar novamente</Button>
        </div>
      );
    }
    if (estado === 'vazio') {
      return (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState
            icone={<Clock />}
            titulo="Ainda não há cálculo para este período"
            descricao="O cálculo é feito automaticamente todo dia. Você pode calcular agora."
            acao={<Button variante="primario">Calcular agora</Button>}
          />
        </div>
      );
    }
    if (estado === 'carregando') {
      return (
        <div className="space-y-4" role="status" aria-label="Carregando">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[58px] w-[196px] animate-pulse rounded-xl bg-ds-bg-surface"
              />
            ))}
          </div>
          <div className="h-44 animate-pulse rounded-xl bg-ds-bg-surface" />
          <div className="h-40 animate-pulse rounded-xl bg-ds-bg-surface" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <SeletorBancos bancoId={bancoId} onChange={setBancoId} />
        <Resumo key={banco.id} banco={banco} />
        <div className="space-y-3 pt-2">
          <SegmentedTabs
            rotulo="Seções do banco"
            variante="sublinhado"
            itens={SECOES}
            valor={secao}
            onChange={setSecao}
          />
          <div key={`${banco.id}-${secao}`} className="ds-surgir">
            {conteudo()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <DsPage>
        <Cabecalho
          empresa={empresa}
          setEmpresa={setEmpresa}
          onRecalcular={() => setRecalcularAberto(true)}
        />
        {corpo()}
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
