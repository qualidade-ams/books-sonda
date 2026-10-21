// Protótipo da tela nova de De-para de Grupos (Especificação v2.0, seção 5.2), na direção visual
// aprovada no protótipo de Empresas (21/10/2026). Mantém `grupos_aranda`: o vínculo de cada grupo
// de atendimento do Aranda com o Grupo do Book e com o catálogo Solução › Produto › Módulo, que
// decide o banco de cada hora. Na transição, o Grupo do Book também é gravado na tabela atual (de_para_categoria), lida
// por Book, Elogios, Pesquisas e Dashboard até a religação (Especificação, seção 7.3).
// Dados fictícios (mocks/catalogo.ts). Sem Supabase.
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Filter,
  GitMerge,
  Layers,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2, botaoPrimarioTopo, botaoVidro } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroMultiplo } from './compartilhado/filtros';
import { Paginacao } from './compartilhado/paginacao';
import { DicasContext } from './compartilhado/dicas';
import { campo, itemMenu } from './compartilhado/estilos';
import {
  Ajuda,
  ChavePrototipo,
  ChavesPrototipo,
  Indicador,
  Rotulo,
  Secao,
  TelaEdicao,
} from './compartilhado/formulario';
import {
  GRUPOS_ARANDA_MOCK,
  GRUPOS_BOOK_MOCK,
  MODULOS_MOCK,
  NAO_MAPEADOS_MOCK,
  PRODUTOS_MOCK,
  SOLUCOES_MOCK,
  nomeModulo,
  nomeProduto,
  nomeSolucao,
  type Classificacao,
  type GrupoArandaMock,
  type NaoMapeadoMock,
} from './mocks/catalogo';

/** Onde o grupo fica no catálogo: só a solução (grupo de serviço), o produto ou o módulo */
type Destino = Pick<GrupoArandaMock, 'solucaoId' | 'produtoId' | 'moduloId'>;

/** Para que serve cada campo, pelo rótulo exibido (Especificação, seção 5.2, e Modelagem da Fase 1) */
const DICAS: Record<string, string> = {
  'Grupo do Aranda':
    'Nome do grupo de atendimento exatamente como vem do Aranda. É por ele que cada apontamento e ticket é ligado ao módulo. Único.',
  'Grupo do Book':
    'Nome exibido no Book, em Elogios, em Pesquisas e no Dashboard. Vários grupos do Aranda podem ter o mesmo Grupo do Book.',
  Solução:
    'Solução do grupo. Sem solução, o grupo "não se aplica" (DEDICADOS, T&M…) e as horas vão sempre para o Banco padrão.',
  Produto:
    'Produto do grupo. Só com a solução, sem produto, é um grupo de serviço (DBA, Técnico…): as horas vão sempre para o Banco padrão.',
  Módulo:
    'Módulo do grupo. Sem módulo, as horas vão para o banco que cobre o produto inteiro ou, se não houver, para o Banco padrão.',
  'Para onde vão as horas':
    'Resultado da solução, do produto e do módulo escolhidos: em que banco as horas deste grupo são consumidas nas empresas com bancos múltiplos.',
  Uso: 'Apontamentos e tickets dos últimos 6 meses com este grupo e as empresas com bancos múltiplos que eles alcançam.',
};

const CLASSIFICACAO: Record<Classificacao, string> = {
  modulo: 'Com módulo',
  produto: 'Todos os módulos',
  solucao: 'Grupo de serviço',
  nao_se_aplica: 'Não se aplica',
};

const classificar = (d: Destino): Classificacao =>
  d.moduloId ? 'modulo' : d.produtoId ? 'produto' : d.solucaoId ? 'solucao' : 'nao_se_aplica';

const destinoTexto = (d: Destino) =>
  d.moduloId
    ? `Banco que cobre ${nomeProduto(d.produtoId)} › ${nomeModulo(d.moduloId)} ou o produto inteiro; sem banco, o Banco padrão.`
    : d.produtoId
      ? `Banco que cobre ${nomeProduto(d.produtoId)} inteiro; sem banco, o Banco padrão.`
      : d.solucaoId
        ? `Grupo de serviço de ${nomeSolucao(d.solucaoId)}: sempre o Banco padrão.`
        : 'Sempre o Banco padrão.';

const VAZIO: Destino = { solucaoId: null, produtoId: null, moduloId: null };

/* ------------------------------------------------------------------ */
/* Peças                                                                */
/* ------------------------------------------------------------------ */

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
        // Dentro da linha clicável: marcar não abre a edição
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

function DestinoGrupo({ m }: { m: GrupoArandaMock }) {
  if (m.classificacao === 'nao_se_aplica') return <StatusBadge>Não se aplica</StatusBadge>;
  return (
    <span className="min-w-0">
      <span className="text-ds-fg-muted">{nomeSolucao(m.solucaoId)}</span>
      {m.produtoId ? (
        <>
          <span className="text-ds-fg-muted"> › </span>
          <span className="font-medium">{nomeProduto(m.produtoId)}</span>
          {m.moduloId && <span className="text-ds-fg-secondary"> › {nomeModulo(m.moduloId)}</span>}
        </>
      ) : (
        <span className="text-ds-fg-secondary"> · serviço</span>
      )}
    </span>
  );
}

function ListaNaDica({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return <span className="text-ds-fg-muted">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-default rounded tabular-nums underline decoration-ds-border-strong decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          {itens.length}
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="max-w-xs border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        <p className="mb-1 font-medium">{titulo}</p>
        <ul className="space-y-0.5 text-ds-fg-secondary">
          {itens.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

/** Solução, produto e módulo em três listas, cada uma filtrada pela anterior */
function EscolhaDestino({
  idBase,
  destino,
  onChange,
  compacto,
}: {
  idBase: string;
  destino: Destino;
  onChange: (d: Destino) => void;
  compacto?: boolean;
}) {
  const { solucaoId, produtoId, moduloId } = destino;
  const produtos = PRODUTOS_MOCK.filter((p) => p.solucaoId === solucaoId && p.ativo);
  const modulos = MODULOS_MOCK.filter((m) => m.produtoId === produtoId && m.ativo);
  const listas = [
    {
      rotulo: 'Solução',
      el: (
        <Select
          id={`${idBase}-solucao`}
          aria-label={compacto ? 'Solução' : undefined}
          value={solucaoId ?? ''}
          onChange={(e) => onChange({ ...VAZIO, solucaoId: e.target.value || null })}
          className="w-full"
        >
          <option value="">Nenhuma (não se aplica)</option>
          {SOLUCOES_MOCK.filter((x) => x.ativo).map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </Select>
      ),
    },
    {
      rotulo: 'Produto',
      el: (
        <Select
          id={`${idBase}-produto`}
          aria-label={compacto ? 'Produto' : undefined}
          value={produtoId ?? ''}
          disabled={!solucaoId}
          onChange={(e) =>
            onChange({ solucaoId, produtoId: e.target.value || null, moduloId: null })
          }
          className="w-full"
        >
          <option value="">Nenhum (grupo de serviço)</option>
          {produtos.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </Select>
      ),
    },
    {
      rotulo: 'Módulo',
      el: (
        <Select
          id={`${idBase}-modulo`}
          aria-label={compacto ? 'Módulo' : undefined}
          value={moduloId ?? ''}
          disabled={!produtoId || !modulos.length}
          onChange={(e) => onChange({ solucaoId, produtoId, moduloId: e.target.value || null })}
          className="w-full"
        >
          <option value="">
            {produtoId && !modulos.length ? 'Produto sem módulos' : 'Todos os módulos'}
          </option>
          {modulos.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nome}
            </option>
          ))}
        </Select>
      ),
    },
  ];
  if (compacto)
    return (
      <div className="flex flex-wrap gap-2 [&>*]:w-full sm:[&>*]:w-44">
        {listas.map((l) => (
          <span key={l.rotulo}>{l.el}</span>
        ))}
      </div>
    );
  return (
    <div className="grid items-start gap-4 sm:grid-cols-3">
      {listas.map((l) => (
        <div key={l.rotulo}>
          <Rotulo
            htmlFor={`${idBase}-${l.rotulo === 'Solução' ? 'solucao' : l.rotulo === 'Produto' ? 'produto' : 'modulo'}`}
          >
            {l.rotulo}
          </Rotulo>
          {l.el}
        </div>
      ))}
    </div>
  );
}

function MenuMapeamento({
  m,
  onEditar,
  onExcluir,
}: {
  m: GrupoArandaMock;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  return (
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button tamanho="icone" variante="fantasma" aria-label={`Ações de ${m.grupoAranda}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-ds="v2"
          align="end"
          className="min-w-44 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
        >
          <DropdownMenuItem className={itemMenu} onSelect={onEditar}>
            <Pencil className="h-4 w-4" /> Editar
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
  );
}

/* ------------------------------------------------------------------ */
/* Aba Mapeamentos                                                      */
/* ------------------------------------------------------------------ */

function AbaMapeamentos({
  estado,
  podeEditar,
  situacao,
  onSituacao,
  onEditar,
}: {
  estado: PrototipoProps['estado'];
  podeEditar: boolean;
  situacao: Classificacao[];
  onSituacao: (v: Classificacao[]) => void;
  onEditar: (m: GrupoArandaMock) => void;
}) {
  const [busca, setBusca] = useState('');
  const [solucao, setSolucao] = useState<string[]>([]);
  const [produto, setProduto] = useState<string[]>([]);
  const [modulo, setModulo] = useState<string[]>([]);
  const [filtrosAbertos, setFiltrosAbertos] = useState(situacao.length > 0);
  // O indicador "Sem módulo" filtra de fora: os filtros abrem para mostrar o que está aplicado
  useEffect(() => {
    if (situacao.length) setFiltrosAbertos(true);
    setPagina(1);
  }, [situacao]);
  const [selecao, setSelecao] = useState<string[]>([]);
  const [lote, setLote] = useState<Destino>(VAZIO);
  const [confirmarLote, setConfirmarLote] = useState(false);
  const [excluir, setExcluir] = useState<GrupoArandaMock | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);

  const filtradas = useMemo(
    () =>
      GRUPOS_ARANDA_MOCK.filter(
        (m) =>
          (!busca ||
            `${m.grupoAranda} ${m.grupoBook}`.toLowerCase().includes(busca.toLowerCase())) &&
          (!solucao.length || solucao.includes(m.solucaoId ?? '')) &&
          (!produto.length || produto.includes(m.produtoId ?? '')) &&
          (!modulo.length || modulo.includes(m.moduloId ?? '')) &&
          (!situacao.length || situacao.includes(m.classificacao))
      ),
    [busca, solucao, produto, modulo, situacao]
  );
  const linhas = estado === 'vazio' ? [] : filtradas;
  const visiveis = linhas.slice((pagina - 1) * porPagina, pagina * porPagina);
  const filtrosAtivos = [solucao, produto, modulo, situacao].filter((f) => f.length).length;
  const limpar = () => {
    setBusca('');
    setSolucao([]);
    setProduto([]);
    setModulo([]);
    onSituacao([]);
  };

  const selecionados = GRUPOS_ARANDA_MOCK.filter((m) => selecao.includes(m.id));
  const todosVisiveis = visiveis.length > 0 && visiveis.every((m) => selecao.includes(m.id));
  const algumVisivel = visiveis.some((m) => selecao.includes(m.id));
  const alternar = (id: string) =>
    setSelecao((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const afetadas = [...new Set(selecionados.flatMap((m) => m.empresasMultiplos))];

  const produtosDoFiltro = PRODUTOS_MOCK.filter(
    (p) => !solucao.length || solucao.includes(p.solucaoId)
  );
  const modulosDoFiltro = MODULOS_MOCK.filter((m) =>
    produto.length
      ? produto.includes(m.produtoId)
      : produtosDoFiltro.some((p) => p.id === m.produtoId)
  );

  const colunas: ColunaTabela<GrupoArandaMock>[] = [
    ...(podeEditar
      ? [
          {
            id: 'selecao',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (m: GrupoArandaMock) => (
              <Caixa
                marcado={selecao.includes(m.id)}
                rotulo={`Selecionar ${m.grupoAranda}`}
                onClick={() => alternar(m.id)}
              />
            ),
          },
        ]
      : []),
    {
      id: 'grupo',
      cabecalho: 'Grupo do Aranda',
      mobile: 'titulo',
      celula: (m) => <span className="font-mono text-xs font-medium">{m.grupoAranda}</span>,
    },
    { id: 'book', cabecalho: 'Grupo do Book', celula: (m) => m.grupoBook },
    {
      id: 'destino',
      cabecalho: 'Solução › Produto › Módulo',
      celula: (m) => <DestinoGrupo m={m} />,
    },
    {
      id: 'apontamentos',
      cabecalho: 'Apontamentos (6 meses)',
      alinhar: 'direita',
      celula: (m) => <span className="tabular-nums">{m.apontamentos6m}</span>,
    },
    {
      id: 'alteracao',
      cabecalho: 'Última alteração',
      celula: (m) => (
        <span className="text-xs">
          <span className="tabular-nums">{m.alteradoEm}</span>
          <span className="block text-ds-fg-muted">{m.alteradoPor}</span>
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
          <button
            type="button"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
            aria-controls="filtros-depara"
            aria-label={filtrosAtivos ? `Filtros (${filtrosAtivos} ativos)` : 'Filtros'}
            title="Filtros"
            className={cn(
              'relative grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9 md:w-9',
              filtrosAbertos || filtrosAtivos
                ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
                : 'border-ds-border-strong bg-ds-bg-surface text-ds-fg-secondary hover:text-ds-fg'
            )}
          >
            <Filter className="h-4 w-4" />
            {filtrosAtivos > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ds-accent px-1 text-[11px] font-semibold tabular-nums text-ds-fg-on-accent">
                {filtrosAtivos}
              </span>
            )}
          </button>
          {(filtrosAtivos > 0 || busca) && <BotaoLimparFiltros onClick={limpar} />}
          <label className="relative block min-w-0 flex-1 md:w-80 md:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
              aria-hidden
            />
            <input
              type="search"
              aria-label="Buscar por grupo do Aranda ou do Book"
              placeholder="Buscar por grupo do Aranda ou do Book"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className={cn(campo, 'pl-9')}
            />
          </label>
          {filtrosAbertos && (
            <div
              id="filtros-depara"
              className="ds-surgir flex w-full flex-wrap gap-2 md:w-auto [&>*]:flex-1 sm:[&>*]:flex-none"
            >
              <FiltroMultiplo
                rotulo="Solução"
                opcoes={SOLUCOES_MOCK.map((x) => ({ valor: x.id, rotulo: x.nome }))}
                selecionados={solucao}
                onChange={(v) => {
                  setSolucao(v);
                  setProduto([]);
                  setModulo([]);
                }}
              />
              <FiltroMultiplo
                rotulo="Produto"
                opcoes={produtosDoFiltro.map((p) => ({ valor: p.id, rotulo: p.nome }))}
                selecionados={produto}
                onChange={(v) => {
                  setProduto(v);
                  setModulo([]);
                }}
              />
              <FiltroMultiplo
                rotulo="Módulo"
                opcoes={modulosDoFiltro.map((m) => ({
                  valor: m.id,
                  rotulo: produto.length === 1 ? m.nome : `${nomeProduto(m.produtoId)} › ${m.nome}`,
                }))}
                selecionados={modulo}
                onChange={setModulo}
              />
              <FiltroMultiplo
                rotulo="Situação"
                opcoes={(Object.keys(CLASSIFICACAO) as Classificacao[]).map((c) => ({
                  valor: c,
                  rotulo: CLASSIFICACAO[c],
                }))}
                selecionados={situacao}
                onChange={onSituacao}
              />
            </div>
          )}
        </div>
      </div>

      {/* Ação em lote: atribuir o mesmo produto/módulo a vários grupos */}
      {podeEditar && estado === 'dados' && linhas.length > 0 && (
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
              rotulo="Selecionar os grupos desta página"
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
                ? `${selecao.length} ${selecao.length === 1 ? 'selecionado' : 'selecionados'}`
                : 'Selecionar para atribuir em lote'}
            </span>
          </span>
          {selecao.length > 0 && (
            <>
              <EscolhaDestino idBase="lote" compacto destino={lote} onChange={setLote} />
              <div className="flex gap-2">
                <Button variante="primario" tamanho="sm" onClick={() => setConfirmarLote(true)}>
                  <ListChecks /> Atribuir
                </Button>
                <Button tamanho="sm" variante="fantasma" onClick={() => setSelecao([])}>
                  Limpar seleção
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {estado === 'erro' ? (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo="Não foi possível carregar o de-para">
            Verifique a conexão e tente novamente.
          </Callout>
          <Button>Tentar novamente</Button>
        </div>
      ) : (
        <DataTable
          rotulo="Mapeamentos"
          colunas={colunas}
          linhas={visiveis}
          chaveLinha={(m) => m.id}
          carregando={estado === 'carregando'}
          onLinhaClick={podeEditar ? onEditar : undefined}
          vazio={
            <EmptyState
              icone={<GitMerge />}
              titulo="Nenhum mapeamento encontrado"
              descricao={filtrosAtivos || busca ? 'Nenhum grupo atende aos filtros.' : undefined}
              acao={
                filtrosAtivos || busca ? (
                  <Button onClick={limpar}>Limpar filtros</Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {estado === 'dados' && linhas.length > 0 && (
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
        titulo={`Atribuir a ${selecao.length} ${selecao.length === 1 ? 'grupo' : 'grupos'}?`}
        descricao={destinoTexto(lote)}
        consequencias={[
          'Pode mover horas entre bancos a partir do próximo recálculo; meses fechados não mudam',
          afetadas.length
            ? `Empresas com bancos múltiplos afetadas: ${afetadas.join(', ')}`
            : 'Nenhuma empresa com bancos múltiplos é afetada',
          'O Grupo do Book não muda',
        ]}
        rotuloConfirmar="Atribuir"
        onConfirmar={() => {
          setConfirmarLote(false);
          setSelecao([]);
        }}
      />
      <ConfirmDialog
        aberto={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo={`Excluir ${excluir?.grupoAranda ?? ''}?`}
        consequencias={[
          'O grupo volta para Grupos não mapeados',
          'As horas dele vão para o Banco padrão a partir do próximo recálculo; meses fechados não mudam',
          'Book, Elogios, Pesquisas e Dashboard deixam de mostrar o Grupo do Book para ele',
        ]}
        rotuloConfirmar="Excluir"
        tom="perigo"
        onConfirmar={() => setExcluir(null)}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Grupos não mapeados                                              */
/* ------------------------------------------------------------------ */

function AbaNaoMapeados({
  estado,
  podeEditar,
  onMapear,
}: {
  estado: PrototipoProps['estado'];
  podeEditar: boolean;
  onMapear: (g: NaoMapeadoMock) => void;
}) {
  const colunas: ColunaTabela<NaoMapeadoMock>[] = [
    {
      id: 'grupo',
      cabecalho: 'Grupo do Aranda',
      mobile: 'titulo',
      celula: (g) => <span className="font-mono text-xs font-medium">{g.grupoAranda}</span>,
    },
    {
      id: 'apontamentos',
      cabecalho: 'Apontamentos',
      alinhar: 'direita',
      celula: (g) => <span className="tabular-nums">{g.apontamentos}</span>,
    },
    {
      id: 'empresas',
      cabecalho: 'Empresas afetadas',
      alinhar: 'direita',
      celula: (g) => <ListaNaDica titulo="Empresas com apontamentos" itens={g.empresas} />,
    },
    {
      id: 'primeiro',
      cabecalho: 'Primeiro apontamento',
      celula: (g) => <span className="tabular-nums">{g.primeiroApontamento}</span>,
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (g) =>
        podeEditar ? (
          <div className="flex justify-end">
            <Button
              tamanho="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMapear(g);
              }}
            >
              Mapear
            </Button>
          </div>
        ) : null,
    },
  ];
  return (
    <div className="space-y-4">
      <Callout tom="warning">
        Grupos AMS que aparecem nos apontamentos ou tickets e ainda não estão no de-para. Até serem
        mapeados, as horas deles vão para o Banco padrão.
      </Callout>
      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        {estado === 'erro' ? (
          <div className="space-y-3 p-4">
            <Callout tom="danger" titulo="Não foi possível carregar os grupos não mapeados">
              Verifique a conexão e tente novamente.
            </Callout>
            <Button>Tentar novamente</Button>
          </div>
        ) : (
          <DataTable
            rotulo="Grupos não mapeados"
            colunas={colunas}
            linhas={estado === 'vazio' ? [] : NAO_MAPEADOS_MOCK}
            chaveLinha={(g) => g.grupoAranda}
            carregando={estado === 'carregando'}
            vazio={
              <EmptyState
                icone={<Check />}
                titulo="Todos os grupos com apontamentos estão mapeados"
              />
            }
          />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edição de um mapeamento                                              */
/* ------------------------------------------------------------------ */

function EdicaoMapeamento({
  mapeamento,
  grupoNovo,
  onFechar,
}: {
  /** null = mapeamento novo */
  mapeamento: GrupoArandaMock | null;
  /** Grupo vindo de "Mapear" na aba de não mapeados */
  grupoNovo?: NaoMapeadoMock;
  onFechar: () => void;
}) {
  const novo = mapeamento === null;
  const [grupo, setGrupo] = useState(mapeamento?.grupoAranda ?? grupoNovo?.grupoAranda ?? '');
  const [grupoBook, setGrupoBook] = useState(mapeamento?.grupoBook ?? '');
  const [destino, setDestino] = useState<Destino>(
    mapeamento
      ? {
          solucaoId: mapeamento.solucaoId,
          produtoId: mapeamento.produtoId,
          moduloId: mapeamento.moduloId,
        }
      : VAZIO
  );
  const [confirmar, setConfirmar] = useState(false);

  const repetido =
    novo &&
    GRUPOS_ARANDA_MOCK.some((m) => m.grupoAranda.toLowerCase() === grupo.trim().toLowerCase());
  const erroGrupo = !grupo.trim()
    ? 'Obrigatório.'
    : repetido
      ? 'Este grupo já está mapeado.'
      : null;
  const erroBook = !grupoBook.trim() ? 'Obrigatório.' : null;
  const mudouBook = !novo && grupoBook.trim() !== mapeamento.grupoBook;
  const mudouDestino =
    !novo &&
    (destino.solucaoId !== mapeamento.solucaoId ||
      destino.produtoId !== mapeamento.produtoId ||
      destino.moduloId !== mapeamento.moduloId);
  const afetadas = mapeamento?.empresasMultiplos ?? grupoNovo?.empresas ?? [];
  const apontamentos = mapeamento?.apontamentos6m ?? grupoNovo?.apontamentos ?? 0;

  return (
    <TelaEdicao
      voltarPara="De-para de Grupos"
      titulo={novo ? 'Novo mapeamento' : mapeamento.grupoAranda}
      subtitulo={
        novo
          ? undefined
          : `Última alteração em ${mapeamento.alteradoEm} por ${mapeamento.alteradoPor}`
      }
      podeSalvar={!erroGrupo && !erroBook}
      rotuloSalvar={novo ? 'Mapear grupo' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={() => (mudouBook || mudouDestino ? setConfirmar(true) : onFechar())}
    >
      <Secao titulo="Grupos">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <div>
            <Rotulo obrigatorio htmlFor="grupo-aranda">
              Grupo do Aranda
            </Rotulo>
            <input
              id="grupo-aranda"
              value={grupo}
              disabled={!novo}
              placeholder="Exatamente como vem do Aranda"
              onChange={(e) => setGrupo(e.target.value)}
              aria-invalid={!!(grupo && erroGrupo)}
              className={cn(campo, 'font-mono', grupo && erroGrupo && 'border-ds-danger-fg')}
            />
            {novo && grupo && erroGrupo && (
              <p className="mt-1.5 text-xs text-ds-danger-fg">{erroGrupo}</p>
            )}
            {!novo && <Ajuda>Para outro grupo, crie um mapeamento novo.</Ajuda>}
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="grupo-book">
              Grupo do Book
            </Rotulo>
            <input
              id="grupo-book"
              list="grupos-book"
              value={grupoBook}
              onChange={(e) => setGrupoBook(e.target.value)}
              aria-invalid={!!(grupoBook === '' && !novo)}
              className={campo}
            />
            <datalist id="grupos-book">
              {GRUPOS_BOOK_MOCK.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <Ajuda>
              Também é gravado na tabela atual, lida por Elogios, Pesquisas e Dashboard.
            </Ajuda>
          </div>
        </div>
      </Secao>

      <Secao titulo="Para onde vão as horas">
        <EscolhaDestino idBase="mapeamento" destino={destino} onChange={setDestino} />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tom={classificar(destino) === 'modulo' ? 'info' : 'neutral'}>
            {CLASSIFICACAO[classificar(destino)]}
          </StatusBadge>
          <span className="text-ds-fg-secondary">{destinoTexto(destino)}</span>
        </div>
      </Secao>

      <Secao titulo="Uso">
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{apontamentos}</span> apontamentos e tickets
          nos últimos 6 meses
          {afetadas.length > 0 && (
            <>
              , em <span className="font-semibold">{afetadas.join(', ')}</span>
            </>
          )}
          .
        </p>
        {(mudouBook || mudouDestino) && (
          <Callout tom="warning" titulo="Impacto da alteração">
            <ul className="list-disc space-y-1 pl-4">
              {mudouBook && (
                <li>
                  O novo Grupo do Book muda a exibição em Book, Elogios, Pesquisas e Dashboard.
                </li>
              )}
              {mudouDestino && (
                <li>
                  As horas podem mudar de banco nas empresas com bancos múltiplos, a partir do
                  próximo recálculo. Meses fechados não mudam.
                </li>
              )}
            </ul>
          </Callout>
        )}
      </Secao>

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo="Salvar o mapeamento?"
        consequencias={[
          ...(mudouBook ? ['Muda a exibição em Book, Elogios, Pesquisas e Dashboard'] : []),
          ...(mudouDestino
            ? [
                afetadas.length
                  ? `Pode mover horas entre bancos de ${afetadas.join(', ')} a partir do próximo recálculo`
                  : 'Nenhuma empresa com bancos múltiplos é afetada agora',
                'Meses fechados não mudam',
              ]
            : []),
        ]}
        rotuloConfirmar="Salvar"
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

type Edicao = { mapeamento: GrupoArandaMock | null; grupoNovo?: NaoMapeadoMock } | null;

export default function DeParaGrupos({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [aba, setAba] = useState('mapeamentos');
  const [situacao, setSituacao] = useState<Classificacao[]>([]);
  const [editando, setEditando] = useState<Edicao>(null);
  const podeEditar = perfil === 'edicao';

  const totais = {
    mapeados: GRUPOS_ARANDA_MOCK.length,
    comModulo: GRUPOS_ARANDA_MOCK.filter((m) => m.classificacao === 'modulo').length,
    semModulo: GRUPOS_ARANDA_MOCK.filter((m) => m.classificacao !== 'modulo').length,
    naoMapeados: NAO_MAPEADOS_MOCK.length,
  };
  const soSemModulo = situacao.length === 3 && !situacao.includes('modulo');

  const conteudo = () => {
    if (editando)
      return (
        <EdicaoMapeamento
          key={editando.mapeamento?.id ?? editando.grupoNovo?.grupoAranda ?? 'novo'}
          mapeamento={editando.mapeamento}
          grupoNovo={editando.grupoNovo}
          onFechar={() => setEditando(null)}
        />
      );
    return (
      <>
        <FaixaTopo>
          <div className="pb-24 pt-3 md:pb-28 md:pt-4">
            <div className="ds-surgir max-w-2xl">
              <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
                <span className="bg-gradient-to-r from-[#00D4E8] to-[#7CEBF5] bg-clip-text text-transparent">
                  De-para de Grupos
                </span>
              </h1>
              <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                Liga cada grupo de atendimento do Aranda ao Grupo do Book e ao módulo, que decide o
                banco de cada hora.
              </p>
            </div>
            <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
              <button type="button" className={botaoVidro}>
                <Download className="h-4 w-4" /> Exportar
              </button>
              {podeEditar && (
                <button
                  type="button"
                  className={botaoPrimarioTopo}
                  onClick={() => setEditando({ mapeamento: null })}
                >
                  <Plus className="h-4 w-4" /> Novo mapeamento
                </button>
              )}
            </div>
          </div>
        </FaixaTopo>

        <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
          <Indicador rotulo="Grupos mapeados" valor={totais.mapeados} icone={<GitMerge />} />
          <Indicador
            rotulo="Com módulo"
            valor={totais.comModulo}
            icone={<Layers />}
            tom="success"
            atrasoMs={60}
          />
          <Indicador
            rotulo="Sem módulo"
            valor={totais.semModulo}
            icone={<AlertTriangle />}
            atrasoMs={120}
            selecionado={aba === 'mapeamentos' && soSemModulo}
            onClick={() => {
              setAba('mapeamentos');
              setSituacao(soSemModulo ? [] : ['produto', 'solucao', 'nao_se_aplica']);
            }}
          />
          <Indicador
            rotulo="Não mapeados com apontamentos"
            valor={totais.naoMapeados}
            icone={<AlertTriangle />}
            tom="warning"
            atrasoMs={180}
            selecionado={aba === 'nao-mapeados'}
            onClick={() => setAba('nao-mapeados')}
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
            <SegmentedTabs
              rotulo="Seções"
              itens={[
                { valor: 'mapeamentos', rotulo: 'Mapeamentos' },
                {
                  valor: 'nao-mapeados',
                  rotulo: 'Grupos não mapeados',
                  contador: totais.naoMapeados,
                },
              ]}
              valor={aba}
              onChange={setAba}
            />
          </div>
          <div key={aba} className="ds-surgir" style={atraso(240)}>
            {aba === 'mapeamentos' ? (
              <AbaMapeamentos
                estado={estado}
                podeEditar={podeEditar}
                situacao={situacao}
                onSituacao={setSituacao}
                onEditar={(m) => setEditando({ mapeamento: m })}
              />
            ) : (
              <AbaNaoMapeados
                estado={estado}
                podeEditar={podeEditar}
                onMapear={(g) => setEditando({ mapeamento: null, grupoNovo: g })}
              />
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Empresas"
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
        {conteudo()}
      </PaginaV2>
    </DicasContext.Provider>
  );
}
