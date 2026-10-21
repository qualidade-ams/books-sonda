// Protótipo da tela nova de Produtos e Módulos (Especificação v2.0, seção 5.1), na direção visual
// aprovada no protótipo de Empresas (21/10/2026). Mantém o catálogo usado no escopo dos bancos de
// horas (produtos, produto_modulos), os grupos do Aranda ligados a cada módulo (grupos_aranda) e a
// correspondência dos módulos de requerimento (modulos_requerimento_produto).
// Dados fictícios (mocks/produtosModulos.ts). Sem Supabase.
import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Layers,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Unlink,
  Workflow,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { BotaoLimparFiltros, FiltroAlternar, FiltroMultiplo } from './compartilhado/filtros';
import { DicasContext } from './compartilhado/dicas';
import { campo, itemMenu } from './compartilhado/estilos';
import {
  Ajuda,
  BarraRodape,
  CampoTexto,
  ChavePrototipo,
  ChavesPrototipo,
  DicaDoRotulo,
  Indicador,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
  Vazio,
} from './compartilhado/formulario';
import {
  GRUPOS_LIVRES_MOCK,
  GRUPOS_SEM_MODULO_MOCK,
  MODULOS_CATALOGO_MOCK,
  MODULOS_REQUERIMENTO_MOCK,
  PRODUTOS_MOCK,
  type ModuloMock,
  type ModuloRequerimentoMock,
  type ProdutoMock,
} from './mocks/produtosModulos';

type Situacao = 'ativo' | 'inativo';

/** Para que serve cada campo, pelo rótulo exibido (Especificação, seção 5.1, e Modelagem da Fase 1) */
const DICAS: Record<string, string> = {
  // Produto
  Código:
    'Identificador do produto usado pelo sistema. Não muda depois de criado: o FISCAL habilita o Contrato FISCAL e o GALLERY tem taxa própria.',
  'Nome do produto': 'Nome exibido nas telas, nos escopos dos bancos e no Book. Único.',
  'Descrição do produto': 'Texto livre, só para consulta.',
  'Produto ativo':
    'Produto inativo não aparece para escopos novos nem para empresas novas. Os bancos que já o usam não mudam.',
  // Módulo
  Produto: 'Produto ao qual o módulo pertence. Não muda depois de criado.',
  'Nome do módulo':
    'Nome do módulo, como aparece no escopo dos bancos e no Book. Único no produto.',
  'Descrição do módulo': 'Texto livre, só para consulta.',
  'Módulo ativo':
    'Módulo inativo não aparece para escopos novos. Os bancos que já o usam não mudam.',
  'Grupos do Aranda':
    'Grupos de atendimento do Aranda que pertencem a este módulo. É por eles que cada hora apontada chega ao módulo e, daí, ao banco. Um grupo pertence a no máximo um módulo.',
  'Usado nos bancos':
    'Bancos ativos que têm este módulo no escopo, diretamente ou por terem marcado o produto inteiro.',
  // Requerimentos
  'Módulo do requerimento':
    'Valor do campo Módulo na tela de Requerimentos. A lista é fixa e não é editada aqui.',
  'Produto e módulo':
    'Para onde vão os requerimentos de Banco de Horas com este módulo. "Produto inteiro" leva ao banco que cobre o produto; sem banco que cubra, vão para o Banco padrão.',
};

const nomeProduto = (id: string | null) => PRODUTOS_MOCK.find((p) => p.id === id)?.nome ?? '—';
const nomeModulo = (id: string | null) => MODULOS_CATALOGO_MOCK.find((m) => m.id === id)?.nome;

/* ------------------------------------------------------------------ */
/* Peças                                                                */
/* ------------------------------------------------------------------ */

/** Texto com uma lista na dica (grupos do Aranda, bancos que usam) */
function ComLista({
  rotulo,
  itens,
  children,
}: {
  rotulo: string;
  itens: ReactNode[];
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-default rounded underline decoration-ds-border-strong decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="max-w-sm border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        <p className="mb-1 font-medium">{rotulo}</p>
        <ul className="space-y-0.5 text-ds-fg-secondary">
          {itens.map((i, n) => (
            <li key={n}>{i}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}

function GruposDoModulo({ modulo }: { modulo: ModuloMock }) {
  if (!modulo.grupos.length)
    return (
      <span className="inline-flex items-center gap-1.5 text-ds-warning-fg">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Nenhum
      </span>
    );
  return (
    <ComLista rotulo={`Grupos do Aranda em ${modulo.nome}`} itens={modulo.grupos}>
      <span className="font-mono text-xs">{modulo.grupos[0]}</span>
      {modulo.grupos.length > 1 && (
        <span className="ml-1.5 text-xs text-ds-fg-muted">+{modulo.grupos.length - 1}</span>
      )}
    </ComLista>
  );
}

function UsoDoModulo({ modulo }: { modulo: ModuloMock }) {
  if (!modulo.usos.length) return <Vazio />;
  return (
    <ComLista
      rotulo="Bancos ativos que usam"
      itens={modulo.usos.map(
        (u) =>
          `${u.empresa} › ${u.banco}${u.produtoInteiro ? ` (${nomeProduto(modulo.produtoId)} inteiro)` : ''}`
      )}
    >
      <span className="tabular-nums">
        {modulo.usos.length} {modulo.usos.length === 1 ? 'banco' : 'bancos'}
      </span>
    </ComLista>
  );
}

function MenuModulo({
  modulo,
  onEditar,
  onAlterarStatus,
}: {
  modulo: ModuloMock;
  onEditar: () => void;
  onAlterarStatus: () => void;
}) {
  return (
    // O menu fica dentro da linha clicável: o clique nele não pode abrir o módulo
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button tamanho="icone" variante="fantasma" aria-label={`Ações de ${modulo.nome}`}>
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
          <DropdownMenuItem
            className={cn(itemMenu, modulo.ativo && 'text-ds-danger-fg focus:bg-ds-danger-bg')}
            onSelect={onAlterarStatus}
          >
            {modulo.ativo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {modulo.ativo ? 'Inativar' : 'Reativar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Produtos e módulos                                               */
/* ------------------------------------------------------------------ */

function ListaProdutos({
  produtos,
  modulos,
  selecionado,
  podeEditar,
  carregando,
  onSelecionar,
  onMover,
}: {
  produtos: ProdutoMock[];
  modulos: ModuloMock[];
  selecionado: string;
  podeEditar: boolean;
  carregando: boolean;
  onSelecionar: (id: string) => void;
  onMover: (id: string, delta: number) => void;
}) {
  if (carregando)
    return (
      <div className="space-y-2" role="status" aria-label="Carregando produtos">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-ds-bg-subtle" />
        ))}
      </div>
    );
  return (
    <ul className="space-y-2" aria-label="Produtos">
      {produtos.map((p, i) => {
        const deste = modulos.filter((m) => m.produtoId === p.id);
        const semGrupo = deste.filter((m) => m.ativo && !m.grupos.length).length;
        const atual = p.id === selecionado;
        return (
          <li key={p.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelecionar(p.id)}
              aria-current={atual ? 'true' : undefined}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border bg-ds-bg-surface px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
                atual
                  ? 'border-[#00D4E8] shadow-[0_8px_24px_-14px_rgba(0,212,232,0.6)]'
                  : 'border-ds-border hover:border-ds-border-strong',
                podeEditar && 'pr-12'
              )}
            >
              <span
                className={cn(
                  'grid h-9 w-9 shrink-0 place-items-center rounded-lg',
                  atual ? 'bg-ds-accent text-ds-fg-on-accent' : 'bg-ds-bg-subtle text-ds-fg-muted'
                )}
                aria-hidden
              >
                <Boxes className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {p.nome}
                  {!p.ativo && <StatusBadge>Inativo</StatusBadge>}
                </span>
                <span className="block truncate text-xs text-ds-fg-muted">
                  {deste.filter((m) => m.ativo).length} módulos ativos
                  {semGrupo > 0 && (
                    <span className="text-ds-warning-fg"> · {semGrupo} sem grupo</span>
                  )}
                </span>
              </span>
            </button>
            {/* Ordem dos produtos nas telas, nos escopos e no Book */}
            {podeEditar && (
              <span className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => onMover(p.id, -1)}
                  aria-label={`Subir ${p.nome}`}
                  className="grid h-5 w-7 place-items-center rounded text-ds-fg-muted hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={i === produtos.length - 1}
                  onClick={() => onMover(p.id, 1)}
                  aria-label={`Descer ${p.nome}`}
                  className="grid h-5 w-7 place-items-center rounded text-ds-fg-muted hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AbaCatalogo({
  estado,
  produtos,
  modulos,
  produtoId,
  podeEditar,
  soSemGrupo,
  onSoSemGrupo,
  onSelecionarProduto,
  onMoverProduto,
  onEditarProduto,
  onEditarModulo,
  onAlterarStatus,
}: {
  estado: PrototipoProps['estado'];
  produtos: ProdutoMock[];
  modulos: ModuloMock[];
  produtoId: string;
  podeEditar: boolean;
  soSemGrupo: boolean;
  onSoSemGrupo: (v: boolean) => void;
  onSelecionarProduto: (id: string) => void;
  onMoverProduto: (id: string, delta: number) => void;
  /** null = produto novo */
  onEditarProduto: (p: ProdutoMock | null) => void;
  /** null = módulo novo */
  onEditarModulo: (m: ModuloMock | null) => void;
  onAlterarStatus: (m: ModuloMock) => void;
}) {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<Situacao[]>(['ativo']);
  const produto = produtos.find((p) => p.id === produtoId) ?? produtos[0];
  const gruposSoProduto = GRUPOS_SEM_MODULO_MOCK.filter((g) => g.produtoId === produto?.id);

  const linhas = useMemo(
    () =>
      modulos.filter(
        (m) =>
          m.produtoId === produto?.id &&
          (!situacao.length || situacao.includes(m.ativo ? 'ativo' : 'inativo')) &&
          (!soSemGrupo || !m.grupos.length) &&
          (!busca ||
            `${m.nome} ${m.descricao} ${m.grupos.join(' ')}`
              .toLowerCase()
              .includes(busca.toLowerCase()))
      ),
    [modulos, produto, situacao, soSemGrupo, busca]
  );
  const filtrosAtivos =
    (situacao.length !== 1 || situacao[0] !== 'ativo' ? 1 : 0) + (soSemGrupo ? 1 : 0);
  const limpar = () => {
    setBusca('');
    setSituacao(['ativo']);
    onSoSemGrupo(false);
  };

  if (estado === 'vazio')
    return (
      <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
        <EmptyState
          icone={<Boxes />}
          titulo="Nenhum produto cadastrado"
          descricao="Os produtos e módulos definem o que cada banco de horas consome."
          acao={
            podeEditar ? (
              <Button variante="primario" onClick={() => onEditarProduto(null)}>
                <Plus /> Novo produto
              </Button>
            ) : undefined
          }
        />
      </div>
    );

  const colunas: ColunaTabela<ModuloMock>[] = [
    {
      id: 'modulo',
      cabecalho: 'Módulo',
      mobile: 'titulo',
      celula: (m) => (
        <div className="min-w-0">
          <p
            className={cn('flex items-center gap-2 font-semibold', !m.ativo && 'text-ds-fg-muted')}
          >
            {m.nome}
            {!m.ativo && <StatusBadge>Inativo</StatusBadge>}
          </p>
          {m.descricao && <p className="truncate text-xs text-ds-fg-muted">{m.descricao}</p>}
        </div>
      ),
    },
    { id: 'grupos', cabecalho: 'Grupos do Aranda', celula: (m) => <GruposDoModulo modulo={m} /> },
    { id: 'uso', cabecalho: 'Usado nos bancos', celula: (m) => <UsoDoModulo modulo={m} /> },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (m) =>
        podeEditar ? (
          <MenuModulo
            modulo={m}
            onEditar={() => onEditarModulo(m)}
            onAlterarStatus={() => onAlterarStatus(m)}
          />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <ListaProdutos
        produtos={produtos}
        modulos={modulos}
        selecionado={produto?.id}
        podeEditar={podeEditar}
        carregando={estado === 'carregando'}
        onSelecionar={onSelecionarProduto}
        onMover={onMoverProduto}
      />

      <section className="min-w-0 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {produto?.nome}
              {produto && !produto.ativo && <StatusBadge>Inativo</StatusBadge>}
            </h2>
            <p className="text-xs text-ds-fg-muted">
              {produto?.descricao || 'Sem descrição'}
              {gruposSoProduto.length > 0 && (
                <>
                  {' · '}
                  <ComLista
                    rotulo="Grupos ligados só ao produto (sem módulo)"
                    itens={gruposSoProduto.map((g) => g.grupo)}
                  >
                    {gruposSoProduto.length}{' '}
                    {gruposSoProduto.length === 1 ? 'grupo só do produto' : 'grupos só do produto'}
                  </ComLista>
                </>
              )}
            </p>
          </div>
          {podeEditar && produto && (
            <div className="flex flex-wrap gap-2">
              <Button tamanho="sm" variante="fantasma" onClick={() => onEditarProduto(produto)}>
                <Pencil /> Editar produto
              </Button>
              <Button tamanho="sm" variante="primario" onClick={() => onEditarModulo(null)}>
                <Plus /> Novo módulo
              </Button>
            </div>
          )}
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-ds-border p-3 md:px-4">
          {(filtrosAtivos > 0 || busca) && <BotaoLimparFiltros onClick={limpar} />}
          <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
              aria-hidden
            />
            <input
              type="search"
              aria-label="Buscar módulo ou grupo do Aranda"
              placeholder="Buscar módulo ou grupo do Aranda"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={cn(campo, 'pl-9')}
            />
          </label>
          <FiltroMultiplo
            rotulo="Situação"
            opcoes={[
              { valor: 'ativo', rotulo: 'Ativos' },
              { valor: 'inativo', rotulo: 'Inativos' },
            ]}
            selecionados={situacao}
            onChange={setSituacao}
          />
          <FiltroAlternar rotulo="Sem grupo do Aranda" ativo={soSemGrupo} onChange={onSoSemGrupo} />
        </div>

        {estado === 'erro' ? (
          <div className="space-y-3 p-4">
            <Callout tom="danger" titulo="Não foi possível carregar os módulos">
              Verifique a conexão e tente novamente.
            </Callout>
            <Button>Tentar novamente</Button>
          </div>
        ) : (
          <DataTable
            rotulo={`Módulos de ${produto?.nome ?? ''}`}
            colunas={colunas}
            linhas={linhas}
            chaveLinha={(m) => m.id}
            carregando={estado === 'carregando'}
            onLinhaClick={podeEditar ? (m) => onEditarModulo(m) : undefined}
            vazio={
              <EmptyState
                icone={<Layers />}
                titulo="Nenhum módulo encontrado"
                descricao={filtrosAtivos || busca ? 'Nenhum módulo atende aos filtros.' : undefined}
                acao={
                  filtrosAtivos || busca ? (
                    <Button onClick={limpar}>Limpar filtros</Button>
                  ) : undefined
                }
              />
            }
          />
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Módulos de requerimento                                          */
/* ------------------------------------------------------------------ */

function AbaRequerimentos({
  estado,
  podeEditar,
}: {
  estado: PrototipoProps['estado'];
  podeEditar: boolean;
}) {
  const [linhas, setLinhas] = useState(MODULOS_REQUERIMENTO_MOCK);
  const alterado = linhas.some((l, i) => {
    const o = MODULOS_REQUERIMENTO_MOCK[i];
    return l.produtoId !== o.produtoId || l.moduloId !== o.moduloId;
  });
  const alterar = (i: number, mudanca: Partial<ModuloRequerimentoMock>) =>
    setLinhas((ls) => ls.map((l, n) => (n === i ? { ...l, ...mudanca } : l)));

  const colunas: ColunaTabela<ModuloRequerimentoMock & { indice: number }>[] = [
    {
      id: 'modulo-req',
      cabecalho: 'Módulo do requerimento',
      mobile: 'titulo',
      celula: (l) => <span className="font-semibold">{l.moduloRequerimento}</span>,
    },
    {
      id: 'destino',
      cabecalho: 'Produto e módulo',
      celula: (l) =>
        podeEditar ? (
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label={`Produto de ${l.moduloRequerimento}`}
              value={l.produtoId}
              onChange={(e) => alterar(l.indice, { produtoId: e.target.value, moduloId: null })}
              className="w-36"
            >
              {PRODUTOS_MOCK.filter((p) => p.ativo).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            <Select
              aria-label={`Módulo de ${l.moduloRequerimento}`}
              value={l.moduloId ?? ''}
              onChange={(e) => alterar(l.indice, { moduloId: e.target.value || null })}
              className="w-56"
            >
              <option value="">Produto inteiro</option>
              {MODULOS_CATALOGO_MOCK.filter((m) => m.produtoId === l.produtoId && m.ativo).map(
                (m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                )
              )}
            </Select>
          </div>
        ) : (
          <span>
            {nomeProduto(l.produtoId)}
            <span className="text-ds-fg-muted">
              {' '}
              › {nomeModulo(l.moduloId) ?? 'Produto inteiro'}
            </span>
          </span>
        ),
    },
    {
      id: 'qtd',
      cabecalho: 'Requerimentos (6 meses)',
      alinhar: 'direita',
      celula: (l) => <span className="tabular-nums">{l.requerimentos6m}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <Callout tom="info">
        Cada requerimento de Banco de Horas é ligado a um banco pelo campo Módulo. Aqui se define a
        que produto e módulo do catálogo cada valor corresponde. Sem banco que cubra o destino, o
        requerimento vai para o Banco padrão, e o ajuste por requerimento é feito na tela de
        Controle.
      </Callout>
      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex items-center gap-1.5 border-b border-ds-border px-4 py-4 md:px-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em]">Módulos de requerimento</h2>
          <DicaDoRotulo rotulo="Produto e módulo" />
        </header>
        {estado === 'erro' ? (
          <div className="space-y-3 p-4">
            <Callout tom="danger" titulo="Não foi possível carregar a correspondência">
              Verifique a conexão e tente novamente.
            </Callout>
            <Button>Tentar novamente</Button>
          </div>
        ) : (
          <DataTable
            rotulo="Módulos de requerimento"
            colunas={colunas}
            linhas={estado === 'vazio' ? [] : linhas.map((l, indice) => ({ ...l, indice }))}
            chaveLinha={(l) => l.moduloRequerimento}
            carregando={estado === 'carregando'}
            vazio={<EmptyState icone={<Workflow />} titulo="Nenhuma correspondência cadastrada" />}
          />
        )}
      </section>

      {alterado && (
        <BarraRodape>
          <span className="text-sm text-ds-fg-secondary">
            Vale para os meses abertos, a partir do próximo recálculo. Meses fechados não mudam.
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setLinhas(MODULOS_REQUERIMENTO_MOCK)}>Descartar</Button>
            <Button variante="primario" onClick={() => setLinhas(MODULOS_REQUERIMENTO_MOCK)}>
              Salvar
            </Button>
          </div>
        </BarraRodape>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Edição de módulo                                                     */
/* ------------------------------------------------------------------ */

function VincularGrupo({
  modulo,
  vinculados,
  onVincular,
}: {
  modulo: { id: string; produtoId: string };
  vinculados: string[];
  onVincular: (grupo: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  // Candidatos: grupos só do produto, grupos livres e grupos de outros módulos (que serão movidos)
  const candidatos = [
    ...GRUPOS_SEM_MODULO_MOCK.filter((g) => g.produtoId === modulo.produtoId).map((g) => ({
      grupo: g.grupo,
      onde: `${nomeProduto(g.produtoId)}, sem módulo`,
    })),
    ...GRUPOS_LIVRES_MOCK.map((g) => ({ grupo: g.grupo, onde: 'Sem produto' })),
    ...MODULOS_CATALOGO_MOCK.filter((m) => m.id !== modulo.id).flatMap((m) =>
      m.grupos.map((g) => ({ grupo: g, onde: `Em ${nomeProduto(m.produtoId)} › ${m.nome}` }))
    ),
  ].filter(
    (c) =>
      !vinculados.includes(c.grupo) &&
      (!busca || c.grupo.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button tamanho="sm">
          <Link2 /> Vincular grupo
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-ds="v2"
        align="start"
        className="w-[min(92vw,420px)] border-ds-border bg-ds-bg-raised p-2 font-ds-sans text-ds-fg"
      >
        <input
          type="search"
          autoFocus
          aria-label="Buscar grupo do Aranda"
          placeholder="Buscar grupo do Aranda"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={campo}
        />
        <ul className="mt-2 max-h-72 overflow-y-auto" aria-label="Grupos do Aranda">
          {candidatos.slice(0, 40).map((c) => (
            <li key={c.grupo}>
              <button
                type="button"
                onClick={() => {
                  onVincular(c.grupo);
                  setAberto(false);
                  setBusca('');
                }}
                className="flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-ds-bg-subtle focus-visible:bg-ds-bg-subtle focus-visible:outline-none"
              >
                <span className="font-mono text-xs">{c.grupo}</span>
                <span
                  className={cn(
                    'text-xs',
                    c.onde.startsWith('Em ') ? 'text-ds-warning-fg' : 'text-ds-fg-muted'
                  )}
                >
                  {c.onde}
                  {c.onde.startsWith('Em ') && ' · sai de lá e vem para este módulo'}
                </span>
              </button>
            </li>
          ))}
          {!candidatos.length && (
            <li className="px-2.5 py-3 text-sm text-ds-fg-muted">Nenhum grupo encontrado.</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function EdicaoModulo({
  modulo,
  produtoId,
  modulos,
  onFechar,
}: {
  /** null = módulo novo */
  modulo: ModuloMock | null;
  produtoId: string;
  modulos: ModuloMock[];
  onFechar: () => void;
}) {
  const novo = modulo === null;
  const [produto, setProduto] = useState(modulo?.produtoId ?? produtoId);
  const [nome, setNome] = useState(modulo?.nome ?? '');
  const [descricao, setDescricao] = useState(modulo?.descricao ?? '');
  const [ativo, setAtivo] = useState(modulo?.ativo ?? true);
  const [grupos, setGrupos] = useState(modulo?.grupos ?? []);
  const [confirmarInativar, setConfirmarInativar] = useState(false);

  const repetido = modulos.some(
    (m) =>
      m.produtoId === produto &&
      m.id !== modulo?.id &&
      m.nome.toLowerCase() === nome.trim().toLowerCase()
  );
  const erroNome = !nome.trim()
    ? 'Obrigatório.'
    : repetido
      ? `Já existe um módulo ${nome.trim()} em ${nomeProduto(produto)}.`
      : null;
  const gruposMudaram = (modulo?.grupos ?? []).join('|') !== grupos.join('|');
  const usos = modulo?.usos ?? [];
  const inativando = !!modulo?.ativo && !ativo;

  const salvar = () => {
    // Inativar módulo que está no escopo de banco ativo pede confirmação (Especificação 5.1)
    if (inativando && usos.length) setConfirmarInativar(true);
    else onFechar();
  };

  return (
    <TelaEdicao
      voltarPara="Produtos e Módulos"
      titulo={novo ? 'Novo módulo' : `Editar ${modulo.nome}`}
      subtitulo={novo ? undefined : 'Última alteração em 01/07/2026 por Usuário Teste'}
      podeSalvar={!erroNome}
      rotuloSalvar={novo ? 'Criar módulo' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={salvar}
    >
      <Secao titulo="Identificação">
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="produto-modulo">
              Produto
            </Rotulo>
            <Select
              id="produto-modulo"
              value={produto}
              disabled={!novo}
              onChange={(e) => setProduto(e.target.value)}
              className="w-full"
            >
              {PRODUTOS_MOCK.filter((p) => p.ativo || p.id === produto).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </Select>
            {!novo && (
              <Ajuda>Para mudar de produto, crie o módulo no outro e mova os grupos.</Ajuda>
            )}
          </div>
          <CampoTexto
            id="nome-modulo"
            rotulo="Nome do módulo"
            obrigatorio
            valor={nome}
            onChange={setNome}
            erro={nome || !novo ? erroNome : null}
          />
        </div>
        <CampoTexto
          id="descricao-modulo"
          rotulo="Descrição do módulo"
          valor={descricao}
          onChange={setDescricao}
          placeholder="Opcional"
        />
        {!novo && (
          <Interruptor
            ligado={ativo}
            onChange={setAtivo}
            rotulo="Módulo ativo"
            descricao={
              inativando && usos.length
                ? `Está no escopo de ${usos.length} ${usos.length === 1 ? 'banco ativo' : 'bancos ativos'}; você confirma ao salvar.`
                : undefined
            }
          />
        )}
      </Secao>

      <Secao titulo="Grupos do Aranda">
        {grupos.length ? (
          <ul className="divide-y divide-ds-border rounded-lg border border-ds-border">
            {grupos.map((g) => (
              <li key={g} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate font-mono text-xs">{g}</span>
                <Button
                  tamanho="sm"
                  variante="fantasma"
                  onClick={() => setGrupos((l) => l.filter((x) => x !== g))}
                  aria-label={`Desvincular ${g}`}
                >
                  <Unlink /> Desvincular
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Callout tom="warning">
            Sem grupo do Aranda, nenhuma hora apontada chega a este módulo.
          </Callout>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <VincularGrupo
            modulo={{ id: modulo?.id ?? 'novo', produtoId: produto }}
            vinculados={grupos}
            onVincular={(g) => setGrupos((l) => [...l, g])}
          />
          <Ajuda>
            Um grupo pertence a um só módulo. Desvinculado, ele fica no produto, sem módulo.
          </Ajuda>
        </div>
        {gruposMudaram && (
          <Callout tom="warning" titulo="Pode mover horas entre bancos">
            Nas empresas com bancos múltiplos, as horas desses grupos passam para outro banco a
            partir do próximo recálculo. Meses fechados não mudam.
          </Callout>
        )}
      </Secao>

      {!novo && (
        <Secao titulo="Usado nos bancos">
          {usos.length ? (
            <ul className="space-y-1.5 text-sm">
              {usos.map((u) => (
                <li key={`${u.empresa}|${u.banco}`}>
                  <span className="font-medium">{u.empresa}</span>
                  <span className="text-ds-fg-secondary"> › {u.banco}</span>
                  {u.produtoInteiro && (
                    <span className="text-xs text-ds-fg-muted">
                      {' '}
                      · {nomeProduto(modulo.produtoId)} inteiro
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ds-fg-muted">Nenhum banco ativo usa este módulo.</p>
          )}
        </Secao>
      )}

      <ConfirmDialog
        aberto={confirmarInativar}
        onOpenChange={setConfirmarInativar}
        titulo={`Inativar ${modulo?.nome ?? ''}?`}
        descricao={`Está no escopo de ${usos.length} ${usos.length === 1 ? 'banco ativo' : 'bancos ativos'}.`}
        consequencias={[
          'Deixa de aparecer para escopos novos',
          'Os bancos que já o usam não mudam',
          'Os grupos do Aranda continuam ligados a ele',
        ]}
        rotuloConfirmar="Inativar"
        tom="perigo"
        onConfirmar={() => {
          setConfirmarInativar(false);
          onFechar();
        }}
      />
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Edição de produto                                                    */
/* ------------------------------------------------------------------ */

function EdicaoProduto({
  produto,
  produtos,
  modulos,
  onFechar,
}: {
  /** null = produto novo */
  produto: ProdutoMock | null;
  produtos: ProdutoMock[];
  modulos: ModuloMock[];
  onFechar: () => void;
}) {
  const novo = produto === null;
  const [codigo, setCodigo] = useState(produto?.codigo ?? '');
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [confirmar, setConfirmar] = useState(false);

  const outros = produtos.filter((p) => p.id !== produto?.id);
  const erroCodigo = !codigo.trim()
    ? 'Obrigatório.'
    : outros.some((p) => p.codigo === codigo.trim())
      ? 'Já existe um produto com este código.'
      : null;
  const erroNome = !nome.trim()
    ? 'Obrigatório.'
    : outros.some((p) => p.nome.toLowerCase() === nome.trim().toLowerCase())
      ? 'Já existe um produto com este nome.'
      : null;
  const bancos = new Set(
    modulos
      .filter((m) => m.produtoId === produto?.id)
      .flatMap((m) => m.usos.map((u) => `${u.empresa} › ${u.banco}`))
  );
  const inativando = !!produto?.ativo && !ativo;

  return (
    <TelaEdicao
      voltarPara="Produtos e Módulos"
      titulo={novo ? 'Novo produto' : `Editar ${produto.nome}`}
      subtitulo={novo ? undefined : 'Última alteração em 01/07/2026 por Usuário Teste'}
      podeSalvar={!erroCodigo && !erroNome}
      rotuloSalvar={novo ? 'Criar produto' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={() => (inativando && bancos.size ? setConfirmar(true) : onFechar())}
    >
      <Secao titulo="Identificação">
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="codigo-produto">
              Código
            </Rotulo>
            <input
              id="codigo-produto"
              value={codigo}
              disabled={!novo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))}
              aria-invalid={!!(codigo && erroCodigo)}
              className={cn(campo, codigo && erroCodigo && 'border-ds-danger-fg')}
            />
            {novo && codigo && erroCodigo && (
              <p className="mt-1.5 text-xs text-ds-danger-fg">{erroCodigo}</p>
            )}
            {!novo && <Ajuda>O código não muda depois de criado.</Ajuda>}
          </div>
          <CampoTexto
            id="nome-produto"
            rotulo="Nome do produto"
            obrigatorio
            maiusculas
            valor={nome}
            onChange={setNome}
            erro={nome || !novo ? erroNome : null}
          />
        </div>
        <CampoTexto
          id="descricao-produto"
          rotulo="Descrição do produto"
          valor={descricao}
          onChange={setDescricao}
          placeholder="Opcional"
        />
        {!novo && <Interruptor ligado={ativo} onChange={setAtivo} rotulo="Produto ativo" />}
        {novo && (
          <Callout tom="info">
            Depois de criar o produto, cadastre os módulos e vincule os grupos do Aranda. Para as
            empresas poderem usá-lo, ele precisa estar nos produtos contratados.
          </Callout>
        )}
      </Secao>

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo={`Inativar ${produto?.nome ?? ''}?`}
        descricao={`Está no escopo de ${bancos.size} ${bancos.size === 1 ? 'banco ativo' : 'bancos ativos'}.`}
        consequencias={[
          'Deixa de aparecer para escopos novos e para empresas novas',
          'Os bancos e as empresas que já o usam não mudam',
        ]}
        rotuloConfirmar="Inativar"
        tom="perigo"
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

type Edicao =
  | { tipo: 'modulo'; modulo: ModuloMock | null }
  | { tipo: 'produto'; produto: ProdutoMock | null }
  | null;

export default function ProdutosModulos({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [aba, setAba] = useState('catalogo');
  const [produtos, setProdutos] = useState(PRODUTOS_MOCK);
  const [produtoId, setProdutoId] = useState(PRODUTOS_MOCK[0].id);
  const [soSemGrupo, setSoSemGrupo] = useState(false);
  const [editando, setEditando] = useState<Edicao>(null);
  const [alterarStatus, setAlterarStatus] = useState<ModuloMock | null>(null);
  const podeEditar = perfil === 'edicao';
  const modulos = MODULOS_CATALOGO_MOCK;

  const ativos = modulos.filter((m) => m.ativo);
  const totais = {
    produtos: produtos.filter((p) => p.ativo).length,
    modulos: ativos.length,
    grupos: ativos.reduce((s, m) => s + m.grupos.length, 0) + GRUPOS_SEM_MODULO_MOCK.length,
    semGrupo: ativos.filter((m) => !m.grupos.length).length,
  };

  const moverProduto = (id: string, delta: number) =>
    setProdutos((ps) => {
      const i = ps.findIndex((p) => p.id === id);
      const j = i + delta;
      if (j < 0 || j >= ps.length) return ps;
      const novo = [...ps];
      [novo[i], novo[j]] = [novo[j], novo[i]];
      return novo;
    });

  const conteudo = () => {
    if (editando?.tipo === 'modulo')
      return (
        <EdicaoModulo
          key={editando.modulo?.id ?? 'novo'}
          modulo={editando.modulo}
          produtoId={produtoId}
          modulos={modulos}
          onFechar={() => setEditando(null)}
        />
      );
    if (editando?.tipo === 'produto')
      return (
        <EdicaoProduto
          key={editando.produto?.id ?? 'novo'}
          produto={editando.produto}
          produtos={produtos}
          modulos={modulos}
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
                  Produtos e Módulos
                </span>
              </h1>
              <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                Catálogo usado no escopo dos bancos de horas e na classificação das horas.
              </p>
            </div>
            {podeEditar && (
              <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                <button
                  type="button"
                  className={botaoVidro}
                  onClick={() => setEditando({ tipo: 'produto', produto: null })}
                >
                  <Plus className="h-4 w-4" /> Novo produto
                </button>
                <button
                  type="button"
                  className={botaoPrimarioTopo}
                  onClick={() => setEditando({ tipo: 'modulo', modulo: null })}
                >
                  <Plus className="h-4 w-4" /> Novo módulo
                </button>
              </div>
            )}
          </div>
        </FaixaTopo>

        <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
          <Indicador rotulo="Produtos ativos" valor={totais.produtos} icone={<Boxes />} />
          <Indicador
            rotulo="Módulos ativos"
            valor={totais.modulos}
            icone={<Layers />}
            atrasoMs={60}
          />
          <Indicador
            rotulo="Grupos do Aranda ligados"
            valor={totais.grupos}
            icone={<Link2 />}
            atrasoMs={120}
          />
          <Indicador
            rotulo="Módulos sem grupo"
            valor={totais.semGrupo}
            icone={<AlertTriangle />}
            tom="warning"
            atrasoMs={180}
            selecionado={soSemGrupo}
            onClick={() => {
              setAba('catalogo');
              setSoSemGrupo((v) => !v);
            }}
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
            <SegmentedTabs
              rotulo="Seções"
              itens={[
                { valor: 'catalogo', rotulo: 'Produtos e módulos' },
                { valor: 'requerimentos', rotulo: 'Módulos de requerimento' },
              ]}
              valor={aba}
              onChange={setAba}
            />
          </div>
          <div key={aba} className="ds-surgir" style={atraso(240)}>
            {aba === 'catalogo' ? (
              <AbaCatalogo
                estado={estado}
                produtos={produtos}
                modulos={modulos}
                produtoId={produtoId}
                podeEditar={podeEditar}
                soSemGrupo={soSemGrupo}
                onSoSemGrupo={setSoSemGrupo}
                onSelecionarProduto={setProdutoId}
                onMoverProduto={moverProduto}
                onEditarProduto={(p) => setEditando({ tipo: 'produto', produto: p })}
                onEditarModulo={(m) => setEditando({ tipo: 'modulo', modulo: m })}
                onAlterarStatus={setAlterarStatus}
              />
            ) : (
              <AbaRequerimentos estado={estado} podeEditar={podeEditar} />
            )}
          </div>
        </div>

        <ConfirmDialog
          aberto={!!alterarStatus}
          onOpenChange={(v) => !v && setAlterarStatus(null)}
          titulo={`${alterarStatus?.ativo ? 'Inativar' : 'Reativar'} ${alterarStatus?.nome ?? ''}?`}
          descricao={
            alterarStatus?.ativo && alterarStatus.usos.length
              ? `Está no escopo de ${alterarStatus.usos.length} ${alterarStatus.usos.length === 1 ? 'banco ativo' : 'bancos ativos'}.`
              : undefined
          }
          consequencias={
            alterarStatus?.ativo
              ? [
                  'Deixa de aparecer para escopos novos',
                  'Os bancos que já o usam não mudam',
                  'Os grupos do Aranda continuam ligados a ele',
                ]
              : ['Volta a aparecer para escopos novos']
          }
          rotuloConfirmar={alterarStatus?.ativo ? 'Inativar' : 'Reativar'}
          tom={alterarStatus?.ativo ? 'perigo' : 'padrao'}
          onConfirmar={() => setAlterarStatus(null)}
        />
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
