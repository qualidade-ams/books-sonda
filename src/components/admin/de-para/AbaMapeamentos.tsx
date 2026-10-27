// Aba Mapeamentos da tela De-para de Grupos: lista com busca, filtros e paginação, atribuição
// do mesmo destino a vários grupos e exclusão.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, GitMerge, ListChecks, MoreHorizontal, Pencil, Search, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Paginacao } from '@/components/ds/Paginacao';
import { BotaoFiltros, BotaoLimparFiltros, FiltroMultiplo } from '@/components/ds/Filtros';
import { campo, itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { useNomesUsuarios } from '@/hooks/useNomesUsuarios';
import {
  empresasAfetadas,
  filtrarMapeamentos,
  SEM_FILTRO,
  type FiltroMapeamentos,
} from '@/utils/deParaTela';
import type { Catalogo } from '@/types/catalogo';
import type { ClassificacaoGrupo, DestinoGrupo, MapeamentoGrupo, UsoGrupo } from '@/types/dePara';
import { DestinoNaLista, EscolhaDestino } from './EscolhaDestino';
import { useTextoDestino } from './textoDestino';

const VAZIO: DestinoGrupo = { solucaoId: null, produtoId: null, moduloId: null };
const CLASSIFICACOES: ClassificacaoGrupo[] = ['modulo', 'produto', 'solucao', 'nao_se_aplica'];
const ID_FILTROS = 'filtros-depara';

/** Caixa de seleção dentro da linha clicável: marcar não abre a edição */
function Caixa({
  marcado,
  parcial,
  rotulo,
  onClick,
}: {
  marcado: boolean;
  parcial?: boolean;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={parcial ? 'mixed' : marcado}
      aria-label={rotulo}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="grid h-8 w-8 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
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

function MenuMapeamento({
  m,
  onEditar,
  onExcluir,
}: {
  m: MapeamentoGrupo;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={t('fase3Comum.acoesDe', { nome: m.grupoAranda })}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-ds="v2"
          align="end"
          className="min-w-44 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
        >
          <DropdownMenuItem className={itemMenu} onSelect={onEditar}>
            <Pencil className="h-4 w-4" /> {t('fase3Comum.editar')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
            onSelect={onExcluir}
          >
            <Trash2 className="h-4 w-4" /> {t('deParaGrupos.lista.excluir')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AbaMapeamentos({
  mapeamentos,
  catalogo,
  uso,
  carregando,
  erro,
  podeEditar,
  filtro,
  onFiltro,
  onEditar,
  onAtribuir,
  onExcluir,
  onTentarNovamente,
}: {
  mapeamentos: MapeamentoGrupo[];
  catalogo: Catalogo;
  uso: Record<string, UsoGrupo>;
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  /** Controlado pela página: o indicador "Sem módulo" filtra a lista e o Exportar usa o filtro */
  filtro: FiltroMapeamentos;
  onFiltro: (filtro: FiltroMapeamentos) => void;
  onEditar: (m: MapeamentoGrupo) => void;
  onAtribuir: (ids: string[], destino: DestinoGrupo) => Promise<void>;
  onExcluir: (m: MapeamentoGrupo) => Promise<void>;
  onTentarNovamente: () => void;
}) {
  const { t, i18n } = useTranslation();
  const textoDestino = useTextoDestino(catalogo);
  const { busca, solucoes, produtos, modulos, situacao } = filtro;
  const [filtrosAbertos, setFiltrosAbertos] = useState(situacao.length > 0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [selecao, setSelecao] = useState<string[]>([]);
  const [lote, setLote] = useState<DestinoGrupo>(VAZIO);
  const [confirmarLote, setConfirmarLote] = useState(false);
  const [excluir, setExcluir] = useState<MapeamentoGrupo | null>(null);
  const [processando, setProcessando] = useState(false);

  // O indicador filtra de fora: os filtros abrem para mostrar o que está aplicado
  useEffect(() => {
    if (situacao.length) setFiltrosAbertos(true);
    setPagina(1);
  }, [situacao]);

  const linhas = useMemo(() => filtrarMapeamentos(mapeamentos, filtro), [mapeamentos, filtro]);
  const visiveis = linhas.slice((pagina - 1) * porPagina, pagina * porPagina);
  const nomes = useNomesUsuarios(visiveis.map((m) => m.atualizadoPor));
  const filtrosAtivos = [solucoes, produtos, modulos, situacao].filter((f) => f.length).length;
  const filtrando = filtrosAtivos > 0 || !!busca;
  const filtrar = (parte: Partial<FiltroMapeamentos>) => {
    onFiltro({ ...filtro, ...parte });
    setPagina(1);
  };
  const limpar = () => filtrar(SEM_FILTRO);

  const todosVisiveis = visiveis.length > 0 && visiveis.every((m) => selecao.includes(m.id));
  const algumVisivel = visiveis.some((m) => selecao.includes(m.id));
  const alternar = (id: string) =>
    setSelecao((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const afetadas = empresasAfetadas(selecao, uso);

  const nome = <T extends { id: string; nome: string }>(lista: T[], id: string) =>
    lista.find((x) => x.id === id)?.nome;
  const produtosDoFiltro = catalogo.produtos.filter(
    (p) => !solucoes.length || solucoes.includes(p.solucaoId)
  );
  const modulosDoFiltro = catalogo.modulos.filter((m) =>
    produtos.length
      ? produtos.includes(m.produtoId)
      : produtosDoFiltro.some((p) => p.id === m.produtoId)
  );

  const atribuir = async () => {
    setProcessando(true);
    try {
      await onAtribuir(selecao, lote);
      setSelecao([]);
      setLote(VAZIO);
      setConfirmarLote(false);
    } finally {
      setProcessando(false);
    }
  };
  const confirmarExcluir = async () => {
    if (!excluir) return;
    setProcessando(true);
    try {
      await onExcluir(excluir);
      setSelecao((s) => s.filter((id) => id !== excluir.id));
      setExcluir(null);
    } finally {
      setProcessando(false);
    }
  };

  const colunas: ColunaTabela<MapeamentoGrupo>[] = [
    ...(podeEditar
      ? [
          {
            id: 'selecao',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (m: MapeamentoGrupo) => (
              <Caixa
                marcado={selecao.includes(m.id)}
                rotulo={t('deParaGrupos.lista.selecionar', { grupo: m.grupoAranda })}
                onClick={() => alternar(m.id)}
              />
            ),
          },
        ]
      : []),
    {
      id: 'grupo',
      cabecalho: t('deParaGrupos.lista.colunaGrupo'),
      mobile: 'titulo',
      celula: (m) => <span className="font-mono text-xs font-medium">{m.grupoAranda}</span>,
    },
    { id: 'book', cabecalho: t('deParaGrupos.lista.colunaBook'), celula: (m) => m.grupoBook },
    {
      id: 'destino',
      cabecalho: t('deParaGrupos.lista.colunaDestino'),
      celula: (m) => <DestinoNaLista m={m} catalogo={catalogo} />,
    },
    {
      id: 'apontamentos',
      cabecalho: t('deParaGrupos.lista.colunaApontamentos'),
      alinhar: 'direita',
      celula: (m) => <span className="tabular-nums">{uso[m.id]?.apontamentos ?? 0}</span>,
    },
    {
      id: 'alteracao',
      cabecalho: t('deParaGrupos.lista.colunaAlteracao'),
      celula: (m) => (
        <span className="text-xs">
          <span className="tabular-nums">{formatarDataHora(m.atualizadoEm, i18n.language)}</span>
          {m.atualizadoPor && nomes[m.atualizadoPor] && (
            <span className="block text-ds-fg-muted">{nomes[m.atualizadoPor]}</span>
          )}
        </span>
      ),
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (m) =>
        podeEditar ? (
          <MenuMapeamento m={m} onEditar={() => onEditar(m)} onExcluir={() => setExcluir(m)} />
        ) : null,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <div className="border-b border-ds-border p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <BotaoFiltros
            abertos={filtrosAbertos}
            ativos={filtrosAtivos}
            controla={ID_FILTROS}
            onClick={() => setFiltrosAbertos((v) => !v)}
          />
          {filtrando && <BotaoLimparFiltros onClick={limpar} />}
          <label className="relative block min-w-0 flex-1 md:w-80 md:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
              aria-hidden
            />
            <input
              type="search"
              aria-label={t('deParaGrupos.lista.buscar')}
              placeholder={t('deParaGrupos.lista.buscar')}
              value={busca}
              onChange={(e) => filtrar({ busca: e.target.value })}
              className={cn(campo, 'pl-9')}
            />
          </label>
          {filtrosAbertos && (
            <div
              id={ID_FILTROS}
              className="ds-surgir flex w-full flex-wrap gap-2 md:w-auto [&>*]:flex-1 sm:[&>*]:flex-none"
            >
              <FiltroMultiplo
                rotulo={t('deParaGrupos.destino.solucao')}
                opcoes={catalogo.solucoes.map((s) => ({ valor: s.id, rotulo: s.nome }))}
                selecionados={solucoes}
                onChange={(v) => filtrar({ solucoes: v, produtos: [], modulos: [] })}
              />
              <FiltroMultiplo
                rotulo={t('deParaGrupos.destino.produto')}
                opcoes={produtosDoFiltro.map((p) => ({ valor: p.id, rotulo: p.nome }))}
                selecionados={produtos}
                onChange={(v) => filtrar({ produtos: v, modulos: [] })}
              />
              <FiltroMultiplo
                rotulo={t('deParaGrupos.destino.modulo')}
                opcoes={modulosDoFiltro.map((m) => ({
                  valor: m.id,
                  rotulo:
                    produtos.length === 1
                      ? m.nome
                      : `${nome(catalogo.produtos, m.produtoId)} › ${m.nome}`,
                }))}
                selecionados={modulos}
                onChange={(v) => filtrar({ modulos: v })}
              />
              <FiltroMultiplo<ClassificacaoGrupo>
                rotulo={t('fase3Comum.situacao')}
                opcoes={CLASSIFICACOES.map((c) => ({
                  valor: c,
                  rotulo: t(`deParaGrupos.classificacao.${c}`),
                }))}
                selecionados={situacao}
                onChange={(v) => filtrar({ situacao: v })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Atribuição em lote: o mesmo destino para vários grupos */}
      {podeEditar && !erro && !carregando && linhas.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ds-border px-3 py-2.5 md:px-4',
            selecao.length && 'bg-ds-accent-subtle'
          )}
        >
          <span className="flex items-center gap-1">
            <Caixa
              marcado={todosVisiveis}
              parcial={!todosVisiveis && algumVisivel}
              rotulo={t('deParaGrupos.lista.selecionarPagina')}
              onClick={() =>
                setSelecao((s) =>
                  todosVisiveis
                    ? s.filter((id) => !visiveis.some((m) => m.id === id))
                    : [...new Set([...s, ...visiveis.map((m) => m.id)])]
                )
              }
            />
            <span className="text-sm text-ds-fg-secondary">
              {selecao.length
                ? plural(t, 'deParaGrupos.lista.selecionados', selecao.length)
                : t('deParaGrupos.lista.selecionarLote')}
            </span>
          </span>
          {selecao.length > 0 && (
            <>
              <EscolhaDestino
                idBase="lote"
                compacto
                catalogo={catalogo}
                destino={lote}
                onChange={setLote}
              />
              <div className="flex gap-2">
                <Button variante="primario" tamanho="sm" onClick={() => setConfirmarLote(true)}>
                  <ListChecks /> {t('deParaGrupos.lista.atribuir')}
                </Button>
                <Button tamanho="sm" variante="fantasma" onClick={() => setSelecao([])}>
                  {t('deParaGrupos.lista.limparSelecao')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {erro ? (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo={t('deParaGrupos.lista.erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      ) : (
        <DataTable
          rotulo={t('deParaGrupos.lista.rotulo')}
          colunas={colunas}
          linhas={visiveis}
          chaveLinha={(m) => m.id}
          carregando={carregando}
          onLinhaClick={podeEditar ? onEditar : undefined}
          vazio={
            <EmptyState
              icone={<GitMerge />}
              titulo={t('deParaGrupos.lista.nenhum')}
              descricao={filtrando ? t('deParaGrupos.lista.nenhumNoFiltro') : undefined}
              acao={
                filtrando ? (
                  <Button onClick={limpar}>{t('fase3Comum.limparFiltros')}</Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {!erro && !carregando && linhas.length > 0 && (
        <Paginacao
          total={linhas.length}
          pagina={pagina}
          porPagina={porPagina}
          onPagina={setPagina}
          onPorPagina={(q) => {
            setPorPagina(q);
            setPagina(1);
          }}
        />
      )}

      <ConfirmDialog
        aberto={confirmarLote}
        onOpenChange={setConfirmarLote}
        titulo={plural(t, 'deParaGrupos.lote.titulo', selecao.length)}
        descricao={textoDestino(lote)}
        consequencias={[
          t('deParaGrupos.lote.podeMover'),
          afetadas.length
            ? t('deParaGrupos.lote.afetadas', { empresas: afetadas.join(', ') })
            : t('deParaGrupos.lote.nenhumaAfetada'),
          t('deParaGrupos.lote.bookNaoMuda'),
        ]}
        rotuloConfirmar={t('deParaGrupos.lista.atribuir')}
        processando={processando}
        onConfirmar={atribuir}
      />
      <ConfirmDialog
        aberto={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo={t('deParaGrupos.excluir.titulo', { grupo: excluir?.grupoAranda ?? '' })}
        consequencias={[
          t('deParaGrupos.excluir.voltaNaoMapeados'),
          t('deParaGrupos.excluir.horasPadrao'),
          t('deParaGrupos.excluir.bookDeixa'),
        ]}
        rotuloConfirmar={t('deParaGrupos.lista.excluir')}
        tom="perigo"
        processando={processando}
        onConfirmar={confirmarExcluir}
      />
    </section>
  );
}
