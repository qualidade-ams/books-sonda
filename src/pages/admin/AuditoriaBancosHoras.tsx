// Tela Auditoria do Banco de Horas, nova (Especificação v2.0, seção 5.8; Modelagem_Fase3.md, seção 9):
// quem alterou o quê e quando, nos cadastros novos e nos bancos de horas. Lê auditoria_alteracoes com
// os filtros no banco, em páginas; a busca procura nas alterações já carregadas.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, ChevronRight, FileClock, RefreshCw, Search, UserRound, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { BotaoFiltros, BotaoLimparFiltros, FiltroMultiplo } from '@/components/ds/Filtros';
import { campo } from '@/components/ds/estilos';
import { DetalheAlteracao } from '@/components/admin/auditoria/DetalheAlteracao';
import { useRotulosAuditoria } from '@/components/admin/auditoria/rotulos';
import { useAuditoria } from '@/hooks/useAuditoria';
import { AREAS } from '@/services/auditoriaService';
import {
  OPCOES_VAZIAS,
  acumularOpcoes,
  buscarNaAuditoria,
  resumoDasMudancas,
} from '@/utils/auditoriaTela';
import { cn } from '@/lib/utils';
import type {
  AcaoAuditoria,
  FiltrosAuditoria,
  OrigemAuditoria,
  RegistroAuditoria,
} from '@/types/auditoria';

const ACOES: Record<AcaoAuditoria, 'success' | 'info' | 'danger'> = {
  insert: 'success',
  update: 'info',
  delete: 'danger',
};
const ORIGENS: OrigemAuditoria[] = ['app', 'sincronizacao', 'carga', 'sistema'];
const AUTOMATICAS: OrigemAuditoria[] = ['sincronizacao', 'carga', 'sistema'];
const DIAS_INICIAIS = 30;

/** AAAA-MM-DD no horário de Brasília, recuando alguns dias */
const diaBrasilia = (recuo = 0) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(Date.now() - recuo * 86_400_000)
  );

const LISTA_VAZIA = {
  empresas: [] as string[],
  bancos: [] as string[],
  areas: [] as string[],
  acoes: [] as AcaoAuditoria[],
  origens: [] as OrigemAuditoria[],
  usuarios: [] as string[],
};

export default function AuditoriaBancosHoras() {
  const { t } = useTranslation();
  const { a, dataHora, quem, registro: nomeDoRegistro, area } = useRotulosAuditoria();

  const [periodo, setPeriodo] = useState(() => ({
    de: diaBrasilia(DIAS_INICIAIS),
    ate: diaBrasilia(),
  }));
  const [lista, setLista] = useState(LISTA_VAZIA);
  const [busca, setBusca] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  // Todo o histórico de um registro: deixa de lado o período e os filtros
  const [historico, setHistorico] = useState<{ id: string; nome: string } | null>(null);
  const [aberto, setAberto] = useState<RegistroAuditoria | null>(null);

  const filtros: FiltrosAuditoria = useMemo(
    () =>
      historico
        ? { registroId: historico.id }
        : {
            desde: periodo.de || undefined,
            ate: periodo.ate || undefined,
            empresaIds: lista.empresas,
            bancoIds: lista.bancos,
            areas: lista.areas,
            acoes: lista.acoes,
            origens: lista.origens,
            usuarioIds: lista.usuarios,
          },
    [historico, periodo, lista]
  );
  const { registros, temMais, carregarMais, isCarregandoMais, isLoading, error, recarregar } =
    useAuditoria(filtros);

  // Empresas, bancos e pessoas dos filtros: o que já apareceu nas alterações
  const [opcoes, setOpcoes] = useState(OPCOES_VAZIAS);
  useEffect(() => setOpcoes((o) => acumularOpcoes(o, registros)), [registros]);
  const bancosDasEmpresas = opcoes.bancos.filter(
    (b) => !lista.empresas.length || (b.empresaId && lista.empresas.includes(b.empresaId))
  );

  const visiveis = buscarNaAuditoria(registros, busca);
  const filtrosDaLista = Object.values(lista).filter((f) => f.length).length;
  const filtrando = filtrosDaLista > 0 || !!busca.trim();
  const mudar = <K extends keyof typeof lista>(chave: K, valor: (typeof lista)[K]) =>
    setLista((l) => ({ ...l, [chave]: valor }));
  const limpar = () => {
    setLista(LISTA_VAZIA);
    setBusca('');
  };
  const alternarOrigens = (origens: OrigemAuditoria[]) =>
    mudar(
      'origens',
      lista.origens.length === origens.length && origens.every((o) => lista.origens.includes(o))
        ? []
        : origens
    );

  const totais = {
    alteracoes: visiveis.length,
    tela: visiveis.filter((r) => r.origem === 'app').length,
    automaticas: visiveis.filter((r) => r.origem !== 'app').length,
    usuarios: new Set(visiveis.map((r) => r.usuarioId).filter(Boolean)).size,
  };

  const colunas: ColunaTabela<RegistroAuditoria>[] = [
    {
      id: 'em',
      cabecalho: a('colunas.em'),
      celula: (r) => <span className="whitespace-nowrap tabular-nums">{dataHora(r.em)}</span>,
    },
    {
      id: 'quem',
      cabecalho: a('colunas.quem'),
      celula: (r) => (
        <span className="flex items-center gap-1.5">
          {r.usuarioId ? (
            <UserRound className="h-3.5 w-3.5 shrink-0 text-ds-fg-muted" aria-hidden />
          ) : (
            <Bot className="h-3.5 w-3.5 shrink-0 text-ds-fg-muted" aria-hidden />
          )}
          <span className={cn(!r.usuario && 'text-ds-fg-secondary')}>{quem(r)}</span>
        </span>
      ),
    },
    {
      id: 'registro',
      cabecalho: a('colunas.registro'),
      mobile: 'titulo',
      celula: (r) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setAberto(r)}
            className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
          >
            {nomeDoRegistro(r)}
          </button>
          <p className="text-xs font-normal text-ds-fg-muted">
            {area(r.area)}
            {r.empresa && ` · ${r.empresa}`}
            {r.banco && ` › ${r.banco}`}
          </p>
        </div>
      ),
    },
    {
      id: 'acao',
      cabecalho: a('colunas.acao'),
      celula: (r) => <StatusBadge tom={ACOES[r.acao]}>{a(`acoes.${r.acao}`)}</StatusBadge>,
    },
    {
      id: 'mudou',
      cabecalho: a('colunas.mudou'),
      celula: (r) => (
        <span className="block max-w-[22rem] truncate text-sm text-ds-fg-secondary">
          {resumoDasMudancas(r)}
        </span>
      ),
    },
    {
      id: 'abrir',
      cabecalho: '',
      mobile: 'oculta',
      celula: () => <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />,
    },
  ];

  const conteudo = () => {
    if (error)
      return (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo={a('erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={() => recarregar()}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    return (
      <>
        <DataTable
          rotulo={a('lista')}
          colunas={colunas}
          linhas={visiveis}
          chaveLinha={(r) => String(r.id)}
          carregando={isLoading}
          onLinhaClick={(r) => setAberto(r)}
          vazio={
            <EmptyState
              icone={<FileClock />}
              titulo={a('vazio.titulo')}
              descricao={filtrando ? a('vazio.filtro') : a('vazio.periodo')}
              acao={
                filtrando ? (
                  <Button onClick={limpar}>{t('fase3Comum.limparFiltros')}</Button>
                ) : undefined
              }
            />
          }
        />
        {temMais && !isLoading && (
          <div className="flex justify-center border-t border-ds-border p-3">
            <Button onClick={() => carregarMais()} disabled={isCarregandoMais}>
              {a('carregarMais')}
            </Button>
          </div>
        )}
      </>
    );
  };

  if (aberto)
    return (
      <AdminLayout>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            <DetalheAlteracao
              registro={aberto}
              onFechar={() => setAberto(null)}
              onVerHistorico={() => {
                setHistorico({ id: aberto.registroId, nome: nomeDoRegistro(aberto) });
                setAberto(null);
              }}
            />
          </DsPage>
        </div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <FaixaPagina>
            <div className="pb-24 pt-3 md:pb-28 md:pt-4">
              <div className="ds-surgir max-w-2xl">
                <TituloFaixa texto={a('titulo')} />
                <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">{a('subtitulo')}</p>
              </div>
            </div>
          </FaixaPagina>

          <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
            <Indicador
              rotulo={a('indicadores.alteracoes')}
              valor={totais.alteracoes}
              icone={<FileClock />}
            />
            <Indicador
              rotulo={a('indicadores.tela')}
              valor={totais.tela}
              icone={<UserRound />}
              atrasoMs={60}
              selecionado={lista.origens.length === 1 && lista.origens[0] === 'app'}
              onClick={historico ? undefined : () => alternarOrigens(['app'])}
            />
            <Indicador
              rotulo={a('indicadores.automaticas')}
              valor={totais.automaticas}
              icone={<RefreshCw />}
              atrasoMs={120}
              selecionado={
                lista.origens.length === AUTOMATICAS.length &&
                AUTOMATICAS.every((o) => lista.origens.includes(o))
              }
              onClick={historico ? undefined : () => alternarOrigens(AUTOMATICAS)}
            />
            <Indicador
              rotulo={a('indicadores.usuarios')}
              valor={totais.usuarios}
              icone={<Users />}
              atrasoMs={180}
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
            <div className="space-y-3 border-b border-ds-border p-3 md:p-4">
              {historico ? (
                <Callout tom="info" titulo={a('historicoDe', { registro: historico.nome })}>
                  {a('historicoTexto')}{' '}
                  <button
                    type="button"
                    className="font-medium text-ds-fg-accent hover:underline"
                    onClick={() => setHistorico(null)}
                  >
                    {a('verTodas')}
                  </button>
                </Callout>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <BotaoFiltros
                      abertos={filtrosAbertos}
                      ativos={filtrosDaLista}
                      controla="filtros-auditoria"
                      onClick={() => setFiltrosAbertos((v) => !v)}
                    />
                    {filtrando && <BotaoLimparFiltros onClick={limpar} />}
                    <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                        aria-hidden
                      />
                      <input
                        type="search"
                        aria-label={a('buscar')}
                        placeholder={a('buscar')}
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className={cn(campo, 'pl-9')}
                      />
                    </label>
                    <span className="flex items-center gap-2 text-sm">
                      <input
                        type="date"
                        aria-label={a('de')}
                        value={periodo.de}
                        max={periodo.ate || undefined}
                        onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
                        className={cn(campo, 'w-auto')}
                      />
                      <span className="text-ds-fg-muted">–</span>
                      <input
                        type="date"
                        aria-label={a('ate')}
                        value={periodo.ate}
                        min={periodo.de || undefined}
                        onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
                        className={cn(campo, 'w-auto')}
                      />
                    </span>
                  </div>
                  {filtrosAbertos && (
                    <div
                      id="filtros-auditoria"
                      className="ds-surgir flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none"
                    >
                      <FiltroMultiplo
                        rotulo={a('filtros.empresa')}
                        opcoes={opcoes.empresas}
                        selecionados={lista.empresas}
                        onChange={(empresas) => setLista((l) => ({ ...l, empresas, bancos: [] }))}
                      />
                      <FiltroMultiplo
                        rotulo={a('filtros.banco')}
                        opcoes={bancosDasEmpresas}
                        selecionados={lista.bancos}
                        onChange={(v) => mudar('bancos', v)}
                      />
                      <FiltroMultiplo
                        rotulo={a('filtros.area')}
                        opcoes={AREAS.map((chave) => ({ valor: chave, rotulo: area(chave) }))}
                        selecionados={lista.areas}
                        onChange={(v) => mudar('areas', v)}
                      />
                      <FiltroMultiplo
                        rotulo={a('filtros.acao')}
                        opcoes={(Object.keys(ACOES) as AcaoAuditoria[]).map((v) => ({
                          valor: v,
                          rotulo: a(`acoes.${v}`),
                        }))}
                        selecionados={lista.acoes}
                        onChange={(v) => mudar('acoes', v)}
                      />
                      <FiltroMultiplo
                        rotulo={a('filtros.origem')}
                        opcoes={ORIGENS.map((v) => ({ valor: v, rotulo: a(`origens.${v}`) }))}
                        selecionados={lista.origens}
                        onChange={(v) => mudar('origens', v)}
                      />
                      <FiltroMultiplo
                        rotulo={a('filtros.quem')}
                        opcoes={opcoes.usuarios}
                        selecionados={lista.usuarios}
                        onChange={(v) => mudar('usuarios', v)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
            {conteudo()}
          </section>
        </DsPage>
      </div>
    </AdminLayout>
  );
}
