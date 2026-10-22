// Protótipo da tela nova de Ajustes Retroativos (Especificação v2.0, seção 5.8; Inventário, FT-35 a
// FT-47; decisões D-09, D-10 e D-11), na direção visual aprovada no protótipo de Empresas.
// Apontamentos lançados no Aranda depois do fechamento do mês: analisar, aprovar ou descartar e
// pedir a regularização aos consultores. Aprovar não muda o mês na hora: o ajuste fica aguardando a
// retificação do Book daquele mês, e nada é apagado (D-09).
// Dados fictícios (mocks/ajustesRetroativos.ts). Sem Supabase.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Mail,
  Radar,
  Search,
  XCircle,
} from 'lucide-react';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { HoursValue } from '@/components/ds/HoursValue';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2 } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroMultiplo } from './compartilhado/filtros';
import { DicasContext } from './compartilhado/dicas';
import { campo } from './compartilhado/estilos';
import {
  Ajuda,
  BarraRodape,
  ChavePrototipo,
  ChavesPrototipo,
  Chip,
  Indicador,
  Rotulo,
  Secao,
  TelaEdicao,
  TituloFaixa,
} from './compartilhado/formulario';
import { MenuExportar } from './compartilhado/importacao';
import {
  AJUSTES_RETROATIVOS_MOCK,
  EMAIL_CONSULTOR_MOCK,
  ULTIMA_DETECCAO_MOCK,
  type AjusteRetroativoMock,
  type ApontamentoRetroativoMock,
  type SituacaoAjuste,
} from './mocks/ajustesRetroativos';

/** Só quem edita a tela aprova, descarta e avisa os consultores (21/10/2026) */
type Perfil = 'edicao' | 'leitura';

const DICAS: Record<string, string> = {
  Destinatário: 'E-mail do consultor no cadastro de especialistas.',
  'Com cópia': 'E-mails extras em cópia, separados por vírgula.',
  Mensagem:
    'Pede ao consultor para excluir a tarefa lançada no mês fechado e relançar no mês vigente.',
};

const SITUACOES: Record<
  SituacaoAjuste,
  { rotulo: string; aba: string; tom: 'warning' | 'info' | 'success' | 'neutral' }
> = {
  pendente: { rotulo: 'Pendente', aba: 'Pendentes', tom: 'warning' },
  aprovado: { rotulo: 'Aguardando retificação', aba: 'Aguardando retificação', tom: 'info' },
  aplicado: { rotulo: 'Aplicado', aba: 'Aplicados', tom: 'success' },
  descartado: { rotulo: 'Descartado', aba: 'Descartados', tom: 'neutral' },
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/* ------------------------------------------------------------------ */
/* Cartão de um ajuste (mês de um banco)                                */
/* ------------------------------------------------------------------ */

function CaixaMarcar({
  marcado,
  parcial,
  rotulo,
  desabilitado,
  onClick,
}: {
  marcado: boolean;
  parcial?: boolean;
  rotulo: string;
  desabilitado?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={parcial ? 'mixed' : marcado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onClick}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:opacity-30"
    >
      <span
        aria-hidden
        className={cn(
          'grid h-4 w-4 place-items-center rounded border transition',
          marcado || parcial
            ? 'border-ds-accent bg-ds-accent text-ds-fg-on-accent'
            : 'border-ds-border-strong bg-ds-bg-surface'
        )}
      >
        {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
        {parcial && !marcado && <span className="h-0.5 w-2 rounded bg-current" />}
      </span>
    </button>
  );
}

function CartaoAjuste({
  ajuste,
  aberto,
  onAlternar,
  perfil,
  selecionados,
  onSelecionar,
  onAprovar,
  onDescartar,
}: {
  ajuste: AjusteRetroativoMock;
  aberto: boolean;
  onAlternar: () => void;
  perfil: Perfil;
  selecionados: string[];
  onSelecionar: (ids: string[], marcar: boolean) => void;
  onAprovar: () => void;
  onDescartar: () => void;
}) {
  const diferenca = ajuste.consumoDepois - ajuste.consumoAntes;
  const situacao = SITUACOES[ajuste.situacao];
  const podeEnviar = perfil === 'edicao' && ajuste.situacao === 'pendente';
  const elegiveis = ajuste.apontamentos.filter((a) => !a.emailEnviado).map((a) => a.id);
  const marcados = elegiveis.filter((id) => selecionados.includes(id));
  const todosEnviados = ajuste.apontamentos.every((a) => a.emailEnviado);

  return (
    <li className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-5">
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          aria-label={`${aberto ? 'Fechar' : 'Ver'} apontamentos de ${ajuste.empresa} · ${ajuste.banco}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', aberto && 'rotate-180')} />
        </button>
        <div className="min-w-0 flex-1 basis-56">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {ajuste.empresa}
            <span className="font-normal text-ds-fg-secondary">› {ajuste.banco}</span>
          </p>
          <p className="text-xs text-ds-fg-muted">
            {ajuste.mesReferencia} ·{' '}
            {plural(ajuste.apontamentos.length, 'apontamento', 'apontamentos')} · detectado em{' '}
            {ajuste.detectadoEm}
          </p>
        </div>
        <dl className="flex items-center gap-5 text-sm">
          <div>
            <dt className="text-xs text-ds-fg-muted">No fechamento</dt>
            <dd>
              <HoursValue minutos={ajuste.consumoAntes} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">Com os retroativos</dt>
            <dd>
              <HoursValue minutos={ajuste.consumoDepois} className="font-medium" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">Diferença</dt>
            <dd>
              <HoursValue
                minutos={diferenca}
                sinal="sempre"
                cor="danger"
                className="font-semibold"
              />
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tom={situacao.tom}>{situacao.rotulo}</StatusBadge>
          {todosEnviados && ajuste.situacao === 'pendente' && (
            <StatusBadge tom="info">
              <Mail className="h-3 w-3" /> Consultores avisados
            </StatusBadge>
          )}
        </div>
        {perfil === 'edicao' && ajuste.situacao === 'pendente' && (
          <div className="flex gap-2">
            <Button tamanho="sm" onClick={onDescartar}>
              <XCircle /> Descartar
            </Button>
            <Button tamanho="sm" variante="primario" onClick={onAprovar}>
              <CheckCircle2 /> Aprovar
            </Button>
          </div>
        )}
      </div>

      {ajuste.decisao && (
        <p className="border-t border-ds-border bg-ds-bg-subtle px-4 py-2 text-xs text-ds-fg-secondary md:px-5">
          <span className="font-medium text-ds-fg">
            {ajuste.situacao === 'descartado' ? 'Descartado' : 'Aprovado'} por {ajuste.decisao.por}{' '}
            em {ajuste.decisao.em}:
          </span>{' '}
          {ajuste.decisao.justificativa}
          {ajuste.retificacao && (
            <>
              {' '}
              · aplicado na retificação do Book em {ajuste.retificacao.em} ({ajuste.retificacao.por}
              )
            </>
          )}
          {ajuste.situacao === 'aprovado' && (
            <> · conta quando o Book de {ajuste.mesReferencia} for retificado</>
          )}
        </p>
      )}

      {aberto && (
        <div className="border-t border-ds-border">
          <table className="w-full text-sm">
            <thead className="bg-ds-bg-subtle text-left text-xs font-medium uppercase tracking-[0.04em] text-ds-fg-muted">
              <tr>
                <th className="w-10 px-3 py-2">
                  {podeEnviar && elegiveis.length > 0 && (
                    <CaixaMarcar
                      marcado={marcados.length === elegiveis.length}
                      parcial={marcados.length > 0 && marcados.length < elegiveis.length}
                      rotulo="Selecionar os apontamentos ainda não avisados"
                      onClick={() => onSelecionar(elegiveis, marcados.length < elegiveis.length)}
                    />
                  )}
                </th>
                <th className="px-3 py-2">Chamado · tarefa</th>
                <th className="px-3 py-2">Data atividade</th>
                <th className="px-3 py-2">Data sistema</th>
                <th className="px-3 py-2">Consultor</th>
                <th className="px-3 py-2">Status do chamado</th>
                <th className="px-3 py-2 text-right">Horas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-border">
              {ajuste.apontamentos.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2">
                    {podeEnviar && !a.emailEnviado && (
                      <CaixaMarcar
                        marcado={selecionados.includes(a.id)}
                        rotulo={`Selecionar ${a.chamado} ${a.tarefa}`}
                        onClick={() => onSelecionar([a.id], !selecionados.includes(a.id))}
                      />
                    )}
                    {a.emailEnviado && (
                      <Mail
                        className="mx-auto h-4 w-4 text-ds-fg-accent"
                        aria-label={`E-mail enviado em ${a.emailEnviado.em}`}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{a.chamado}</span>
                    <span className="text-ds-fg-muted"> · {a.tarefa}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{a.dataAtividade}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {a.lancadoEm}
                    {a.emailEnviado && (
                      <span className="block text-[11px] text-ds-fg-muted">
                        avisado em {a.emailEnviado.em}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{a.consultor}</td>
                  <td className="px-3 py-2">
                    <StatusBadge tom={a.statusChamado === 'Closed' ? 'neutral' : 'info'}>
                      {a.statusChamado}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <HoursValue minutos={a.minutos} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ds-border px-4 py-2.5 md:px-5">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ds-fg-accent hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver {ajuste.mesReferencia} no Controle
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* E-mail aos consultores                                               */
/* ------------------------------------------------------------------ */

function EmailConsultores({
  apontamentos,
  onFechar,
}: {
  apontamentos: (ApontamentoRetroativoMock & { empresa: string; mes: string })[];
  onFechar: () => void;
}) {
  // Um envelope por consultor, como hoje
  const envelopes = useMemo(() => {
    const porConsultor = new Map<string, typeof apontamentos>();
    apontamentos.forEach((a) =>
      porConsultor.set(a.consultor, [...(porConsultor.get(a.consultor) ?? []), a])
    );
    return [...porConsultor.entries()];
  }, [apontamentos]);
  const semEmail = envelopes.filter(([c]) => !EMAIL_CONSULTOR_MOCK[c]);
  const [cc, setCc] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const enviaveis = envelopes.length - semEmail.length;

  return (
    <TelaEdicao
      voltarPara="Apontamentos Retroativos"
      titulo="Pedir regularização aos consultores"
      subtitulo={`${plural(apontamentos.length, 'apontamento', 'apontamentos')} · ${plural(envelopes.length, 'consultor', 'consultores')}`}
      podeSalvar={enviaveis > 0}
      rotuloSalvar={`Enviar ${plural(enviaveis, 'e-mail', 'e-mails')}`}
      onFechar={onFechar}
      onSalvar={() => setConfirmar(true)}
    >
      <Secao titulo="Envio">
        <div>
          <Rotulo htmlFor="cc-consultores">Com cópia</Rotulo>
          <input
            id="cc-consultores"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="Opcional"
            className={campo}
          />
        </div>
        {semEmail.length > 0 && (
          <Callout
            tom="warning"
            titulo={`${plural(semEmail.length, 'consultor sem e-mail cadastrado', 'consultores sem e-mail cadastrado')}`}
          >
            {semEmail.map(([c]) => c).join(', ')}: o e-mail não será enviado. Cadastre o e-mail em
            Especialistas ou avise por outro canal.
          </Callout>
        )}
      </Secao>
      <Secao titulo="Mensagem">
        <div className="space-y-3">
          {envelopes.map(([consultor, itens]) => {
            const email = EMAIL_CONSULTOR_MOCK[consultor];
            return (
              <div
                key={consultor}
                className={cn(
                  'rounded-lg border p-3',
                  email ? 'border-ds-border' : 'border-dashed border-ds-border-strong opacity-70'
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{consultor}</span>
                  {email ? (
                    <Chip>{email}</Chip>
                  ) : (
                    <StatusBadge tom="warning">sem e-mail</StatusBadge>
                  )}
                </div>
                <p className="mt-2 text-sm text-ds-fg-secondary">
                  Assunto:{' '}
                  <span className="text-ds-fg">Ajuste de apontamento · Banco de Horas</span>
                </p>
                <p className="mt-1 text-sm text-ds-fg-secondary">
                  Olá, {consultor.split(' ')[0]}. As tarefas abaixo foram lançadas em mês já
                  fechado. Por favor, exclua-as e relance no mês vigente.
                </p>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {itens.map((a) => (
                    <li key={a.id} className="tabular-nums">
                      {a.empresa} · {a.chamado} · {a.tarefa} · {a.dataAtividade} ·{' '}
                      {formatarHoras(a.minutos)}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <Ajuda>Os apontamentos avisados ficam marcados na tela para toda a equipe.</Ajuda>
      </Secao>
      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo={`Enviar ${plural(enviaveis, 'e-mail', 'e-mails')}?`}
        consequencias={[
          'Um e-mail por consultor',
          'Os apontamentos ficam marcados como avisados, com a data e quem enviou',
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

export default function ApontamentosRetroativos({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<Perfil>('edicao');
  const [ajustes, setAjustes] = useState(AJUSTES_RETROATIVOS_MOCK);
  const [aba, setAba] = useState<SituacaoAjuste>('pendente');
  const [busca, setBusca] = useState('');
  const [empresa, setEmpresa] = useState<string[]>([]);
  const [consultor, setConsultor] = useState<string[]>([]);
  const [abertos, setAbertos] = useState<string[]>(['aj1']);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [decidir, setDecidir] = useState<{
    ajuste: AjusteRetroativoMock;
    acao: 'aprovar' | 'descartar';
  } | null>(null);
  const [emailAberto, setEmailAberto] = useState(false);

  const lista = estado === 'vazio' ? [] : ajustes;
  const conta = (s: SituacaoAjuste) => lista.filter((a) => a.situacao === s).length;
  const empresas = [...new Set(ajustes.map((a) => a.empresa))].sort();
  const consultores = [
    ...new Set(ajustes.flatMap((a) => a.apontamentos.map((x) => x.consultor))),
  ].sort();

  const visiveis = lista.filter(
    (a) =>
      a.situacao === aba &&
      (!empresa.length || empresa.includes(a.empresa)) &&
      (!consultor.length || a.apontamentos.some((x) => consultor.includes(x.consultor))) &&
      (!busca ||
        `${a.empresa} ${a.banco} ${a.apontamentos.map((x) => `${x.chamado} ${x.tarefa}`).join(' ')}`
          .toLowerCase()
          .includes(busca.toLowerCase()))
  );
  const filtrando = !!busca || empresa.length > 0 || consultor.length > 0;
  const limpar = () => {
    setBusca('');
    setEmpresa([]);
    setConsultor([]);
  };

  const apontamentosSelecionados = ajustes.flatMap((a) =>
    a.apontamentos
      .filter((x) => selecionados.includes(x.id))
      .map((x) => ({ ...x, empresa: a.empresa, mes: a.mesReferencia }))
  );

  if (emailAberto)
    return (
      <DicasContext.Provider value={DICAS}>
        <PaginaV2
          menuAtivo="Banco de Horas"
          menuExpandido={menuExpandido}
          onToggleMenu={() => setMenuExpandido((v) => !v)}
        >
          <EmailConsultores
            apontamentos={apontamentosSelecionados}
            onFechar={() => {
              setEmailAberto(false);
              setSelecionados([]);
            }}
          />
        </PaginaV2>
      </DicasContext.Provider>
    );

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Banco de Horas"
        menuExpandido={menuExpandido}
        onToggleMenu={() => setMenuExpandido((v) => !v)}
      >
        <ChavesPrototipo>
          <ChavePrototipo<Perfil>
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
              <TituloFaixa texto="Apontamentos Retroativos" />
              <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                Apontamentos lançados no Aranda depois do fechamento do mês, por banco.
              </p>
            </div>
            <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
              <MenuExportar
                total={visiveis.length}
                entidade="ajustes (uma linha por apontamento)"
              />
            </div>
          </div>
        </FaixaTopo>

        <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
          <Indicador
            rotulo="Pendentes"
            valor={conta('pendente')}
            icone={<AlertTriangle />}
            tom="warning"
            selecionado={aba === 'pendente'}
            onClick={() => setAba('pendente')}
          />
          <Indicador
            rotulo="Aguardando retificação"
            valor={conta('aprovado')}
            icone={<Clock />}
            atrasoMs={60}
            selecionado={aba === 'aprovado'}
            onClick={() => setAba('aprovado')}
          />
          <Indicador
            rotulo="Aplicados"
            valor={conta('aplicado')}
            icone={<CheckCircle2 />}
            tom="success"
            atrasoMs={120}
            selecionado={aba === 'aplicado'}
            onClick={() => setAba('aplicado')}
          />
          <Indicador
            rotulo="Descartados"
            valor={conta('descartado')}
            icone={<XCircle />}
            atrasoMs={180}
            selecionado={aba === 'descartado'}
            onClick={() => setAba('descartado')}
          />
        </div>

        <div className="mt-6 space-y-4">
          <Callout tom="info">
            <span className="flex flex-wrap items-center gap-x-1.5">
              <Radar className="h-4 w-4" aria-hidden />A detecção roda a cada sincronização com o
              Aranda, em todos os meses fechados do período aberto de cada banco. Última:{' '}
              {ULTIMA_DETECCAO_MOCK}. Aprovar não muda o mês na hora: o ajuste entra quando o Book
              do mês for retificado.
            </span>
          </Callout>

          <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
            <SegmentedTabs
              rotulo="Situação"
              itens={(Object.keys(SITUACOES) as SituacaoAjuste[]).map((s) => ({
                valor: s,
                rotulo: SITUACOES[s].aba,
                contador: conta(s),
              }))}
              valor={aba}
              onChange={(v) => setAba(v as SituacaoAjuste)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filtrando && <BotaoLimparFiltros onClick={limpar} />}
            <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Buscar empresa, banco, chamado ou tarefa"
                placeholder="Buscar empresa, banco, chamado ou tarefa"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={cn(campo, 'pl-9')}
              />
            </label>
            <FiltroMultiplo
              rotulo="Empresa"
              opcoes={empresas.map((e) => ({ valor: e, rotulo: e }))}
              selecionados={empresa}
              onChange={setEmpresa}
            />
            <FiltroMultiplo
              rotulo="Consultor"
              opcoes={consultores.map((c) => ({ valor: c, rotulo: c }))}
              selecionados={consultor}
              onChange={setConsultor}
            />
          </div>

          {estado === 'erro' ? (
            <div className="space-y-3">
              <Callout tom="danger" titulo="Não foi possível carregar os ajustes">
                Verifique a conexão e tente novamente.
              </Callout>
              <Button>Tentar novamente</Button>
            </div>
          ) : estado === 'carregando' ? (
            <div className="space-y-3" role="status" aria-label="Carregando">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-ds-bg-surface" />
              ))}
            </div>
          ) : visiveis.length === 0 ? (
            <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
              <EmptyState
                icone={<CheckCircle2 />}
                titulo={
                  filtrando
                    ? 'Nenhum ajuste atende aos filtros'
                    : aba === 'pendente'
                      ? 'Nenhum ajuste pendente'
                      : `Nenhum ajuste em "${SITUACOES[aba].aba}"`
                }
                descricao={
                  !filtrando && aba === 'pendente'
                    ? 'Todos os meses fechados estão em dia com o Aranda.'
                    : undefined
                }
                acao={filtrando ? <Button onClick={limpar}>Limpar filtros</Button> : undefined}
              />
            </div>
          ) : (
            <ul className="space-y-3" aria-label="Apontamentos retroativos">
              {visiveis.map((a) => (
                <CartaoAjuste
                  key={a.id}
                  ajuste={a}
                  aberto={abertos.includes(a.id)}
                  onAlternar={() =>
                    setAbertos((l) =>
                      l.includes(a.id) ? l.filter((x) => x !== a.id) : [...l, a.id]
                    )
                  }
                  perfil={perfil}
                  selecionados={selecionados}
                  onSelecionar={(ids, marcar) =>
                    setSelecionados((s) =>
                      marcar ? [...new Set([...s, ...ids])] : s.filter((x) => !ids.includes(x))
                    )
                  }
                  onAprovar={() => setDecidir({ ajuste: a, acao: 'aprovar' })}
                  onDescartar={() => setDecidir({ ajuste: a, acao: 'descartar' })}
                />
              ))}
            </ul>
          )}
        </div>

        {selecionados.length > 0 && (
          <BarraRodape>
            <span className="text-sm text-ds-fg-secondary">
              <span className="font-medium text-ds-fg">
                {plural(
                  selecionados.length,
                  'apontamento selecionado',
                  'apontamentos selecionados'
                )}
              </span>
            </span>
            <div className="flex gap-2">
              <Button onClick={() => setSelecionados([])}>Limpar seleção</Button>
              <Button variante="primario" onClick={() => setEmailAberto(true)}>
                <Mail /> Pedir regularização
              </Button>
            </div>
          </BarraRodape>
        )}

        <ConfirmDialog
          aberto={!!decidir}
          onOpenChange={(v) => !v && setDecidir(null)}
          titulo={
            decidir
              ? `${decidir.acao === 'aprovar' ? 'Aprovar' : 'Descartar'} o ajuste de ${decidir.ajuste.empresa} · ${decidir.ajuste.banco}?`
              : ''
          }
          descricao={
            decidir
              ? `${decidir.ajuste.mesReferencia}: consumo de ${formatarHoras(decidir.ajuste.consumoAntes)} para ${formatarHoras(decidir.ajuste.consumoDepois)}.`
              : undefined
          }
          consequencias={
            decidir?.acao === 'aprovar'
              ? [
                  `Fica aguardando a retificação do Book de ${decidir.ajuste.mesReferencia}; até lá, o mês não muda`,
                  'Na retificação, o mês e os seguintes do período são recalculados (nova versão, nada é apagado)',
                ]
              : ['O consumo do mês não muda', 'Estes apontamentos não voltam a ser detectados']
          }
          rotuloConfirmar={decidir?.acao === 'aprovar' ? 'Aprovar' : 'Descartar'}
          tom={decidir?.acao === 'descartar' ? 'perigo' : 'padrao'}
          justificativa={{
            rotulo: 'Justificativa',
            placeholder:
              decidir?.acao === 'aprovar'
                ? 'Ex.: atendimento confirmado com o cliente'
                : 'Ex.: consultor vai relançar no mês vigente',
          }}
          onConfirmar={(justificativa) => {
            if (!decidir) return;
            setAjustes((l) =>
              l.map((a) =>
                a.id === decidir.ajuste.id
                  ? {
                      ...a,
                      situacao: decidir.acao === 'aprovar' ? 'aprovado' : 'descartado',
                      decisao: {
                        por: 'Usuário Teste',
                        em: '21/10/2026',
                        justificativa: justificativa ?? '',
                      },
                    }
                  : a
              )
            );
            setDecidir(null);
          }}
        />
      </PaginaV2>
    </DicasContext.Provider>
  );
}
