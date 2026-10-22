// Protótipo da tela nova de Envio de Saldo Parcial (Especificação v2.0, seções 5.8 e 6.2;
// Inventário, FS-01 a FS-18), na direção visual aprovada no protótipo de Empresas. Agendamentos com
// recorrência, empresas por agendamento (uma empresa em no máximo um), executar agora com trava
// contra envio duplicado e histórico que inclui o envio manual feito no Controle. Um e-mail por
// empresa, com uma tabela por banco; o anexo Excel tem uma aba por banco.
// Dados fictícios (mocks/envioSaldoParcial.ts). Sem Supabase.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2, botaoPrimarioTopo } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroMultiplo } from './compartilhado/filtros';
import { DicasContext } from './compartilhado/dicas';
import { campo, itemMenu } from './compartilhado/estilos';
import {
  Ajuda,
  CampoNumero,
  ChaveCompacta,
  ChavePrototipo,
  ChavesPrototipo,
  Chip,
  Escolha,
  Indicador,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
  TituloFaixa,
} from './compartilhado/formulario';
import { MenuExportar } from './compartilhado/importacao';
import {
  AGENDAMENTOS_MOCK,
  EMPRESAS_AGENDAVEIS_MOCK,
  HISTORICO_ENVIOS_MOCK,
  SERVICO_ENVIO_MOCK,
  type AgendamentoMock,
  type EnvioHistoricoMock,
  type Frequencia,
  type RecorrenciaMock,
  type SituacaoEnvio,
} from './mocks/envioSaldoParcial';

const DICAS: Record<string, string> = {
  'Nome do agendamento': 'Nome para identificar o agendamento na lista e no histórico.',
  'Agendamento ativo': 'Inativo, as empresas dele não recebem o Saldo Parcial até reativar.',
  Frequência: 'Diário, em dias da semana ou em dias do mês. Horário de Brasília.',
  Horários: 'Horários fixos ou um intervalo (ex.: das 8h às 18h, a cada 2 horas).',
  Empresas:
    'Empresas ativas com AMS. Cada empresa fica em um só agendamento. Recebem os contatos com a finalidade Saldo Parcial.',
  'Com cópia':
    'E-mails em cópia em todos os envios deste agendamento. O Customer Success de cada empresa entra em cópia automaticamente.',
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_SEMANA_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function descrever(r: RecorrenciaMock) {
  const horas =
    r.horarios.tipo === 'fixos'
      ? `às ${r.horarios.lista.join(', ')}`
      : `das ${r.horarios.de} às ${r.horarios.ate}, a cada ${plural(r.horarios.aCada, 'hora', 'horas')}`;
  if (r.frequencia === 'diario') return `Todo dia ${horas}`;
  if (r.frequencia === 'semanal')
    return `Toda ${r.dias.map((d) => DIAS_SEMANA_LONGO[d as number]).join(', ')} ${horas}`;
  return `Todo dia ${r.dias.map((d) => (d === 'ultimo' ? 'último' : d)).join(' e ')} do mês ${horas}`;
}

const SITUACAO: Record<
  SituacaoEnvio,
  { rotulo: string; tom: 'success' | 'danger' | 'info' | 'warning' | 'neutral' }
> = {
  enviado: { rotulo: 'Enviado', tom: 'success' },
  falhou: { rotulo: 'Falhou', tom: 'danger' },
  executando: { rotulo: 'Enviando', tom: 'info' },
  interrompido: { rotulo: 'Interrompido', tom: 'warning' },
  pulado: { rotulo: 'Pulado', tom: 'neutral' },
};

const origemTexto = (o: EnvioHistoricoMock['origem']) =>
  o.tipo === 'agendamento'
    ? o.nome
    : o.tipo === 'executar_agora'
      ? `${o.nome} · executado agora por ${o.por}`
      : `Envio manual no Controle · ${o.por}`;

/* ------------------------------------------------------------------ */
/* Aba Agendamentos                                                     */
/* ------------------------------------------------------------------ */

function CartaoAgendamento({
  agendamento,
  podeEditar,
  onEditar,
  onAtivo,
  onExecutar,
  onExcluir,
}: {
  agendamento: AgendamentoMock;
  podeEditar: boolean;
  onEditar: () => void;
  onAtivo: () => void;
  onExecutar: () => void;
  onExcluir: () => void;
}) {
  const empresas = EMPRESAS_AGENDAVEIS_MOCK.filter((e) => e.agendamentoId === agendamento.id);
  const semContato = empresas.filter((e) => !e.contatos).length;
  return (
    <li
      className={cn(
        'ds-surgir rounded-xl border bg-ds-bg-surface p-4 md:p-5',
        agendamento.ativo ? 'border-ds-border' : 'border-dashed border-ds-border-strong'
      )}
    >
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
            agendamento.ativo
              ? 'bg-ds-accent-subtle text-ds-fg-accent'
              : 'bg-ds-bg-subtle text-ds-fg-muted'
          )}
          aria-hidden
        >
          <CalendarClock className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 basis-60">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {agendamento.nome}
            {!agendamento.ativo && <StatusBadge>Inativo</StatusBadge>}
          </p>
          <p className="text-sm text-ds-fg-secondary">{descrever(agendamento.recorrencia)}</p>
          <p className="mt-1 text-xs text-ds-fg-muted">
            {plural(empresas.length, 'empresa', 'empresas')}
            {semContato > 0 && (
              <span className="text-ds-warning-fg"> · {semContato} sem contato</span>
            )}
            {agendamento.cc.length > 0 && ` · cópia para ${agendamento.cc.join(', ')}`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 text-sm">
          <div>
            <dt className="text-xs text-ds-fg-muted">Próximo envio</dt>
            <dd className="tabular-nums">
              {agendamento.proximoEnvio ?? <span className="text-ds-fg-muted">—</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">Último envio</dt>
            <dd className="flex items-center gap-1.5 tabular-nums">
              {agendamento.ultimoEnvio ? (
                <>
                  {agendamento.ultimoEnvio.em}
                  {agendamento.ultimoEnvio.situacao === 'com_falhas' ? (
                    <AlertTriangle
                      className="h-3.5 w-3.5 text-ds-warning-fg"
                      aria-label="com falhas"
                    />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-ds-success-fg" aria-label="enviado" />
                  )}
                </>
              ) : (
                <span className="text-ds-fg-muted">—</span>
              )}
            </dd>
          </div>
        </dl>
        {podeEditar && (
          <div className="flex items-center gap-2">
            <ChaveCompacta
              ligado={agendamento.ativo}
              rotulo={`${agendamento.nome} ativo`}
              onClick={onAtivo}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  tamanho="icone"
                  variante="fantasma"
                  aria-label={`Ações de ${agendamento.nome}`}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                data-ds="v2"
                align="end"
                className="min-w-48 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
              >
                <DropdownMenuItem className={itemMenu} onSelect={onEditar}>
                  <Pencil className="h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem className={itemMenu} onSelect={onExecutar}>
                  <Play className="h-4 w-4" /> Executar agora
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                  onSelect={onExcluir}
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Edição de um agendamento                                             */
/* ------------------------------------------------------------------ */

function EdicaoAgendamento({
  agendamento,
  onFechar,
}: {
  agendamento: AgendamentoMock | null;
  onFechar: () => void;
}) {
  const novo = agendamento === null;
  const [nome, setNome] = useState(agendamento?.nome ?? '');
  const [ativo, setAtivo] = useState(agendamento?.ativo ?? true);
  const [frequencia, setFrequencia] = useState<Frequencia>(
    agendamento?.recorrencia.frequencia ?? 'semanal'
  );
  const [dias, setDias] = useState<(number | 'ultimo')[]>(agendamento?.recorrencia.dias ?? [1]);
  const [tipoHorario, setTipoHorario] = useState<'fixos' | 'intervalo'>(
    agendamento?.recorrencia.horarios.tipo ?? 'fixos'
  );
  const [horarios, setHorarios] = useState<string[]>(
    agendamento?.recorrencia.horarios.tipo === 'fixos'
      ? agendamento.recorrencia.horarios.lista
      : ['09:00']
  );
  const [novoHorario, setNovoHorario] = useState('');
  const [intervalo, setIntervalo] = useState({ de: '08:00', ate: '18:00', aCada: '2' });
  const [empresas, setEmpresas] = useState<string[]>(
    EMPRESAS_AGENDAVEIS_MOCK.filter((e) => e.agendamentoId === agendamento?.id).map((e) => e.id)
  );
  const [busca, setBusca] = useState('');
  const [cc, setCc] = useState<string[]>(agendamento?.cc ?? []);
  const [novoCc, setNovoCc] = useState('');

  const recorrencia: RecorrenciaMock = {
    frequencia,
    dias,
    horarios:
      tipoHorario === 'fixos'
        ? { tipo: 'fixos', lista: horarios }
        : {
            tipo: 'intervalo',
            de: intervalo.de,
            ate: intervalo.ate,
            aCada: Number(intervalo.aCada) || 1,
          },
  };
  const alternarDia = (d: number | 'ultimo') =>
    setDias((l) =>
      l.includes(d)
        ? l.filter((x) => x !== d)
        : [...l, d].sort((a, b) => (a === 'ultimo' ? 1 : b === 'ultimo' ? -1 : a - b))
    );
  const visiveis = EMPRESAS_AGENDAVEIS_MOCK.filter(
    (e) => !busca || e.nome.toLowerCase().includes(busca.toLowerCase())
  );
  const erroDias = frequencia !== 'diario' && !dias.length;
  const erroHorarios = tipoHorario === 'fixos' && !horarios.length;
  const pode = !!nome.trim() && !erroDias && !erroHorarios && empresas.length > 0;

  // Prévia ilustrativa das próximas execuções
  const previa =
    frequencia === 'semanal'
      ? ['26/10/2026 (seg) 09:00', '02/11/2026 (seg) 09:00', '09/11/2026 (seg) 09:00']
      : frequencia === 'mensal'
        ? ['01/11/2026 (dom) 08:00', '15/11/2026 (dom) 08:00', '01/12/2026 (ter) 08:00']
        : ['22/10/2026 (qui) 09:00', '23/10/2026 (sex) 09:00', '24/10/2026 (sáb) 09:00'];

  return (
    <TelaEdicao
      voltarPara="Envio de Saldo Parcial"
      titulo={novo ? 'Novo agendamento' : `Editar ${agendamento.nome}`}
      subtitulo={novo ? undefined : 'Última alteração em 02/10/2026 por Usuário Teste'}
      podeSalvar={pode}
      rotuloSalvar={novo ? 'Criar agendamento' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={onFechar}
    >
      <Secao titulo="Identificação">
        <div>
          <Rotulo obrigatorio htmlFor="nome-agendamento">
            Nome do agendamento
          </Rotulo>
          <input
            id="nome-agendamento"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Semanal · segunda de manhã"
            className={campo}
          />
        </div>
        <Interruptor ligado={ativo} onChange={setAtivo} rotulo="Agendamento ativo" />
      </Secao>

      <Secao titulo="Recorrência">
        <div className="max-w-md">
          <Rotulo obrigatorio>Frequência</Rotulo>
          <Escolha<Frequencia>
            rotulo="Frequência"
            opcoes={[
              { valor: 'diario', rotulo: 'Diário' },
              { valor: 'semanal', rotulo: 'Semanal' },
              { valor: 'mensal', rotulo: 'Mensal' },
            ]}
            valor={frequencia}
            onChange={(f) => {
              setFrequencia(f);
              setDias(f === 'semanal' ? [1] : f === 'mensal' ? [1] : []);
            }}
          />
        </div>
        {frequencia !== 'diario' && (
          <div>
            <p className="mb-1.5 text-sm font-medium">
              {frequencia === 'semanal' ? 'Dias da semana' : 'Dias do mês'}
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias">
              {(frequencia === 'semanal'
                ? DIAS_SEMANA.map((r, i) => [i, r] as const)
                : [
                    ...Array.from({ length: 31 }, (_, i) => [i + 1, String(i + 1)] as const),
                    ['ultimo', 'Último'] as const,
                  ]
              ).map(([valor, rotulo]) => (
                <button
                  key={String(valor)}
                  type="button"
                  aria-pressed={dias.includes(valor)}
                  onClick={() => alternarDia(valor)}
                  className={cn(
                    'h-9 min-w-9 rounded-lg border px-2 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
                    dias.includes(valor)
                      ? 'border-[#00D4E8] bg-ds-accent-subtle font-medium text-ds-fg-accent'
                      : 'border-ds-border-strong text-ds-fg-secondary hover:text-ds-fg'
                  )}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            {erroDias && (
              <p className="mt-1.5 text-xs text-ds-danger-fg">Escolha pelo menos um dia.</p>
            )}
            {frequencia === 'mensal' && (
              <Ajuda>Nos meses mais curtos, os dias 29 a 31 caem no último dia.</Ajuda>
            )}
          </div>
        )}
        <div className="space-y-3">
          <div className="max-w-md">
            <Rotulo obrigatorio>Horários</Rotulo>
            <Escolha<'fixos' | 'intervalo'>
              rotulo="Horários"
              opcoes={[
                { valor: 'fixos', rotulo: 'Horários fixos' },
                { valor: 'intervalo', rotulo: 'Intervalo' },
              ]}
              valor={tipoHorario}
              onChange={setTipoHorario}
            />
          </div>
          {tipoHorario === 'fixos' ? (
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                {horarios.map((h) => (
                  <Chip key={h} onRemover={() => setHorarios((l) => l.filter((x) => x !== h))}>
                    {h}
                  </Chip>
                ))}
                <input
                  type="time"
                  aria-label="Novo horário"
                  value={novoHorario}
                  onChange={(e) => setNovoHorario(e.target.value)}
                  className={cn(campo, 'w-32')}
                />
                <Button
                  tamanho="sm"
                  disabled={!novoHorario || horarios.includes(novoHorario)}
                  onClick={() => {
                    setHorarios((l) => [...l, novoHorario].sort());
                    setNovoHorario('');
                  }}
                >
                  <Plus /> Incluir
                </Button>
              </div>
              {erroHorarios && (
                <p className="mt-1.5 text-xs text-ds-danger-fg">Inclua pelo menos um horário.</p>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Rotulo htmlFor="intervalo-de">Das</Rotulo>
                <input
                  id="intervalo-de"
                  type="time"
                  value={intervalo.de}
                  onChange={(e) => setIntervalo((i) => ({ ...i, de: e.target.value }))}
                  className={cn(campo, 'w-32')}
                />
              </div>
              <div>
                <Rotulo htmlFor="intervalo-ate">Até</Rotulo>
                <input
                  id="intervalo-ate"
                  type="time"
                  value={intervalo.ate}
                  onChange={(e) => setIntervalo((i) => ({ ...i, ate: e.target.value }))}
                  className={cn(campo, 'w-32')}
                />
              </div>
              <div className="w-32">
                <Rotulo htmlFor="intervalo-cada">A cada (horas)</Rotulo>
                <CampoNumero
                  id="intervalo-cada"
                  min={1}
                  max={23}
                  valor={intervalo.aCada}
                  onChange={(v) => setIntervalo((i) => ({ ...i, aCada: v }))}
                />
              </div>
            </div>
          )}
        </div>
        <Callout tom="info" titulo={descrever(recorrencia)}>
          Próximos envios: {previa.join(' · ')}
        </Callout>
      </Secao>

      <Secao titulo="Empresas">
        <label className="relative block md:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Buscar empresa"
            placeholder="Buscar empresa"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={cn(campo, 'pl-9')}
          />
        </label>
        <ul
          className="max-h-80 divide-y divide-ds-border overflow-y-auto rounded-lg border border-ds-border"
          aria-label="Empresas"
        >
          {visiveis.map((e) => {
            const emOutro =
              e.agendamentoId && e.agendamentoId !== agendamento?.id
                ? AGENDAMENTOS_MOCK.find((a) => a.id === e.agendamentoId)
                : null;
            const marcado = empresas.includes(e.id);
            return (
              <li key={e.id}>
                <label
                  className={cn(
                    'flex min-h-11 items-center gap-3 px-3 py-2 text-sm',
                    emOutro ? 'text-ds-fg-disabled' : 'cursor-pointer hover:bg-ds-bg-subtle'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={!!emOutro}
                    onChange={() =>
                      setEmpresas((l) => (marcado ? l.filter((x) => x !== e.id) : [...l, e.id]))
                    }
                    className="h-4 w-4 accent-ds-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{e.nome}</span>
                    <span className="block text-xs text-ds-fg-muted">
                      {plural(e.bancos, 'banco', 'bancos')} ·{' '}
                      {e.contatos ? (
                        plural(e.contatos, 'contato', 'contatos')
                      ) : (
                        <span className="text-ds-warning-fg">sem contato de Saldo Parcial</span>
                      )}
                    </span>
                  </span>
                  {emOutro && <span className="shrink-0 text-xs">em {emOutro.nome}</span>}
                </label>
              </li>
            );
          })}
        </ul>
        <Ajuda>
          {plural(empresas.length, 'empresa marcada', 'empresas marcadas')}. Cada empresa fica em um
          só agendamento.
        </Ajuda>
      </Secao>

      <Secao titulo="E-mail">
        <div>
          <Rotulo htmlFor="cc-agendamento">Com cópia</Rotulo>
          <div className="flex flex-wrap items-center gap-1.5">
            {cc.map((e) => (
              <Chip key={e} onRemover={() => setCc((l) => l.filter((x) => x !== e))}>
                {e}
              </Chip>
            ))}
            <input
              id="cc-agendamento"
              value={novoCc}
              onChange={(e) => setNovoCc(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoCc.trim())) {
                  setCc((l) => [...new Set([...l, novoCc.trim()])]);
                  setNovoCc('');
                }
              }}
              placeholder="e-mail e Enter"
              className={cn(campo, 'w-64')}
            />
          </div>
        </div>
        <Callout tom="info">
          Cada empresa recebe um e-mail com uma tabela por banco, os requerimentos e as observações
          do período, e o Excel de consumo com uma aba por banco. Banco negativo traz o aviso de que
          poderá ser coberto pelos outros bancos no fechamento.
        </Callout>
      </Secao>
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Histórico                                                        */
/* ------------------------------------------------------------------ */

function AbaHistorico({ estado }: { estado: PrototipoProps['estado'] }) {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoEnvio[]>([]);
  const [origem, setOrigem] = useState<string[]>([]);
  const linhas = useMemo(
    () =>
      (estado === 'vazio' ? [] : HISTORICO_ENVIOS_MOCK).filter(
        (h) =>
          (!busca || h.empresa.toLowerCase().includes(busca.toLowerCase())) &&
          (!situacao.length || situacao.includes(h.situacao)) &&
          (!origem.length || origem.includes(h.origem.tipo))
      ),
    [estado, busca, situacao, origem]
  );
  const colunas: ColunaTabela<EnvioHistoricoMock>[] = [
    {
      id: 'em',
      cabecalho: 'Quando',
      celula: (h) => <span className="whitespace-nowrap tabular-nums">{h.em}</span>,
    },
    {
      id: 'empresa',
      cabecalho: 'Empresa',
      mobile: 'titulo',
      celula: (h) => <span className="font-medium">{h.empresa}</span>,
    },
    {
      id: 'origem',
      cabecalho: 'Origem',
      celula: (h) => <span className="text-sm text-ds-fg-secondary">{origemTexto(h.origem)}</span>,
    },
    {
      id: 'situacao',
      cabecalho: 'Situação',
      celula: (h) => (
        <span className="flex flex-col items-start gap-0.5">
          <StatusBadge tom={SITUACAO[h.situacao].tom}>{SITUACAO[h.situacao].rotulo}</StatusBadge>
          {h.erro && <span className="max-w-[18rem] text-[11px] text-ds-fg-muted">{h.erro}</span>}
        </span>
      ),
    },
    {
      id: 'dest',
      cabecalho: 'Destinatários',
      alinhar: 'direita',
      celula: (h) => <span className="tabular-nums">{h.destinatarios}</span>,
    },
    {
      id: 'bancos',
      cabecalho: 'Bancos',
      alinhar: 'direita',
      celula: (h) => <span className="tabular-nums">{h.bancos}</span>,
    },
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-ds-border p-3 md:p-4">
        {(busca || situacao.length > 0 || origem.length > 0) && (
          <BotaoLimparFiltros
            onClick={() => {
              setBusca('');
              setSituacao([]);
              setOrigem([]);
            }}
          />
        )}
        <label className="relative block min-w-0 flex-1 md:w-64 md:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Buscar empresa"
            placeholder="Buscar empresa"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={cn(campo, 'pl-9')}
          />
        </label>
        <FiltroMultiplo
          rotulo="Situação"
          opcoes={(Object.keys(SITUACAO) as SituacaoEnvio[]).map((s) => ({
            valor: s,
            rotulo: SITUACAO[s].rotulo,
          }))}
          selecionados={situacao}
          onChange={setSituacao}
        />
        <FiltroMultiplo
          rotulo="Origem"
          opcoes={[
            { valor: 'agendamento', rotulo: 'Agendamento' },
            { valor: 'executar_agora', rotulo: 'Executar agora' },
            { valor: 'manual', rotulo: 'Envio manual (Controle)' },
          ]}
          selecionados={origem}
          onChange={setOrigem}
        />
      </div>
      <DataTable
        rotulo="Histórico de envios"
        colunas={colunas}
        linhas={linhas}
        chaveLinha={(h) => h.id}
        carregando={estado === 'carregando'}
        vazio={<EmptyState icone={<Send />} titulo="Nenhum envio encontrado" />}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function EnvioSaldoParcial({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [aba, setAba] = useState('agendamentos');
  const [agendamentos, setAgendamentos] = useState(AGENDAMENTOS_MOCK);
  const [editando, setEditando] = useState<{ agendamento: AgendamentoMock | null } | null>(null);
  const [executar, setExecutar] = useState<AgendamentoMock | null>(null);
  const [excluir, setExcluir] = useState<AgendamentoMock | null>(null);
  const [desativar, setDesativar] = useState<AgendamentoMock | null>(null);
  const podeEditar = perfil === 'edicao';

  const semAgendamento = EMPRESAS_AGENDAVEIS_MOCK.filter((e) => !e.agendamentoId);
  const totais = {
    ativos: agendamentos.filter((a) => a.ativo).length,
    empresas: EMPRESAS_AGENDAVEIS_MOCK.filter((e) => e.agendamentoId).length,
    enviados: HISTORICO_ENVIOS_MOCK.filter((h) => h.situacao === 'enviado').length,
    falhas: HISTORICO_ENVIOS_MOCK.filter(
      (h) => h.situacao === 'falhou' || h.situacao === 'interrompido'
    ).length,
  };
  // Trava contra duplicidade: quem já recebeu hoje (manual ou automático) é pulado no "Executar agora"
  const recebeuHoje = (ag: AgendamentoMock) =>
    EMPRESAS_AGENDAVEIS_MOCK.filter((e) => e.agendamentoId === ag.id && e.id === 'alfa');

  if (editando)
    return (
      <DicasContext.Provider value={DICAS}>
        <PaginaV2
          menuAtivo="Books"
          menuExpandido={menuExpandido}
          onToggleMenu={() => setMenuExpandido((v) => !v)}
        >
          <EdicaoAgendamento
            key={editando.agendamento?.id ?? 'novo'}
            agendamento={editando.agendamento}
            onFechar={() => setEditando(null)}
          />
        </PaginaV2>
      </DicasContext.Provider>
    );

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Books"
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
        </ChavesPrototipo>

        <FaixaTopo>
          <div className="pb-24 pt-3 md:pb-28 md:pt-4">
            <div className="ds-surgir max-w-2xl">
              <TituloFaixa texto="Envio de Saldo Parcial" />
              <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                Agendamentos do e-mail de saldo parcial: um e-mail por empresa, com uma tabela por
                banco.
              </p>
            </div>
            <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
              <MenuExportar entidade="os agendamentos e o histórico" />
              {podeEditar && (
                <button
                  type="button"
                  className={botaoPrimarioTopo}
                  onClick={() => setEditando({ agendamento: null })}
                >
                  <Plus className="h-4 w-4" /> Novo agendamento
                </button>
              )}
            </div>
          </div>
        </FaixaTopo>

        <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
          <Indicador rotulo="Agendamentos ativos" valor={totais.ativos} icone={<CalendarClock />} />
          <Indicador
            rotulo="Empresas agendadas"
            valor={totais.empresas}
            icone={<Building2 />}
            atrasoMs={60}
          />
          <Indicador
            rotulo="Enviados (7 dias)"
            valor={totais.enviados}
            icone={<Send />}
            tom="success"
            atrasoMs={120}
            onClick={() => setAba('historico')}
          />
          <Indicador
            rotulo="Falhas (7 dias)"
            valor={totais.falhas}
            icone={<AlertTriangle />}
            tom="warning"
            atrasoMs={180}
            onClick={() => setAba('historico')}
          />
        </div>

        <div className="mt-6 space-y-4">
          {SERVICO_ENVIO_MOCK.agendadorLigado ? (
            <p className="flex items-center gap-2 text-xs text-ds-fg-muted">
              <span className="h-2 w-2 rounded-full bg-ds-success-fg" aria-hidden /> Serviço de
              envio ligado · última verificação em {SERVICO_ENVIO_MOCK.ultimoCiclo}
            </p>
          ) : (
            <Callout tom="danger" titulo="Serviço de envio desligado">
              Os agendamentos não estão sendo executados. Avise a equipe de desenvolvimento.
            </Callout>
          )}

          <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
            <SegmentedTabs
              rotulo="Seções"
              itens={[
                { valor: 'agendamentos', rotulo: 'Agendamentos', contador: agendamentos.length },
                { valor: 'historico', rotulo: 'Histórico' },
                {
                  valor: 'sem',
                  rotulo: 'Empresas sem agendamento',
                  contador: semAgendamento.length,
                },
              ]}
              valor={aba}
              onChange={setAba}
            />
          </div>

          <div key={aba} className="ds-surgir" style={atraso(200)}>
            {estado === 'erro' ? (
              <div className="space-y-3">
                <Callout tom="danger" titulo="Não foi possível carregar o envio de Saldo Parcial">
                  Verifique a conexão e tente novamente.
                </Callout>
                <Button>Tentar novamente</Button>
              </div>
            ) : aba === 'historico' ? (
              <AbaHistorico estado={estado} />
            ) : aba === 'sem' ? (
              <div className="space-y-3">
                <Callout tom="warning">
                  Empresas ativas com AMS que não estão em nenhum agendamento: não recebem o Saldo
                  Parcial automático. O envio manual continua no Controle.
                </Callout>
                <ul className="divide-y divide-ds-border overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
                  {semAgendamento.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <span>
                        <span className="font-medium">{e.nome}</span>
                        <span className="block text-xs text-ds-fg-muted">
                          {plural(e.bancos, 'banco', 'bancos')} ·{' '}
                          {e.contatos ? (
                            plural(e.contatos, 'contato', 'contatos')
                          ) : (
                            <span className="text-ds-warning-fg">sem contato de Saldo Parcial</span>
                          )}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : estado === 'carregando' ? (
              <div className="space-y-3" role="status" aria-label="Carregando">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-xl bg-ds-bg-surface" />
                ))}
              </div>
            ) : estado === 'vazio' ? (
              <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
                <EmptyState
                  icone={<CalendarClock />}
                  titulo="Nenhum agendamento"
                  descricao="Crie um agendamento para as empresas receberem o Saldo Parcial automaticamente."
                  acao={
                    podeEditar ? (
                      <Button
                        variante="primario"
                        onClick={() => setEditando({ agendamento: null })}
                      >
                        <Plus /> Novo agendamento
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <ul className="space-y-3" aria-label="Agendamentos">
                {agendamentos.map((a) => (
                  <CartaoAgendamento
                    key={a.id}
                    agendamento={a}
                    podeEditar={podeEditar}
                    onEditar={() => setEditando({ agendamento: a })}
                    onAtivo={() =>
                      a.ativo
                        ? setDesativar(a)
                        : setAgendamentos((l) =>
                            l.map((x) => (x.id === a.id ? { ...x, ativo: true } : x))
                          )
                    }
                    onExecutar={() => setExecutar(a)}
                    onExcluir={() => setExcluir(a)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <ConfirmDialog
          aberto={!!executar}
          onOpenChange={(v) => !v && setExecutar(null)}
          titulo={`Executar "${executar?.nome ?? ''}" agora?`}
          descricao={
            executar
              ? `${plural(EMPRESAS_AGENDAVEIS_MOCK.filter((e) => e.agendamentoId === executar.id).length, 'empresa', 'empresas')} deste agendamento.`
              : undefined
          }
          consequencias={
            executar
              ? [
                  ...(recebeuHoje(executar).length
                    ? [
                        `${recebeuHoje(executar)
                          .map((e) => e.nome)
                          .join(
                            ', '
                          )} já recebeu o Saldo Parcial hoje e será pulada, para não duplicar`,
                      ]
                    : []),
                  'Empresas sem contato de Saldo Parcial são puladas',
                  'O envio fica no histórico, com você como autor',
                ]
              : []
          }
          rotuloConfirmar="Executar agora"
          onConfirmar={() => setExecutar(null)}
        />
        <ConfirmDialog
          aberto={!!desativar}
          onOpenChange={(v) => !v && setDesativar(null)}
          titulo={`Desativar "${desativar?.nome ?? ''}"?`}
          consequencias={[
            'As empresas dele deixam de receber o Saldo Parcial automático até reativar',
            'O envio manual no Controle continua disponível',
          ]}
          rotuloConfirmar="Desativar"
          tom="perigo"
          onConfirmar={() => {
            setAgendamentos((l) =>
              l.map((x) => (x.id === desativar?.id ? { ...x, ativo: false } : x))
            );
            setDesativar(null);
          }}
        />
        <ConfirmDialog
          aberto={!!excluir}
          onOpenChange={(v) => !v && setExcluir(null)}
          titulo={`Excluir "${excluir?.nome ?? ''}"?`}
          consequencias={[
            'As empresas dele ficam sem agendamento',
            'O histórico de envios é mantido',
          ]}
          rotuloConfirmar="Excluir"
          tom="perigo"
          onConfirmar={() => {
            setAgendamentos((l) => l.filter((x) => x.id !== excluir?.id));
            setExcluir(null);
          }}
        />
      </PaginaV2>
    </DicasContext.Provider>
  );
}
