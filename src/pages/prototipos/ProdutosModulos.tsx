// Protótipo da tela nova de Produtos e Módulos (Especificação v2.0, seção 5.1), na direção visual
// aprovada no protótipo de Empresas. Catálogo em três níveis (decisão de 21/10/2026):
// Solução (o que a empresa contrata) › Produto › Módulo (o que o escopo dos bancos marca). Mantém
// também os grupos do Aranda ligados a cada nível e a correspondência dos módulos de requerimento.
// Dados fictícios (mocks/catalogo.ts). Sem Supabase.
import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layers,
  Link2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Unlink,
  Workflow,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { BotaoImportar, MenuExportar, TelaImportacao } from './compartilhado/importacao';
import { IMPORTACAO_CATALOGO } from './mocks/importacoes';
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
  GRUPOS_ARANDA_MOCK,
  MODULOS_MOCK,
  MODULOS_REQUERIMENTO_MOCK,
  PRODUTOS_MOCK,
  SOLUCOES_MOCK,
  USOS_MOCK,
  gruposDaSolucao,
  gruposDoModulo,
  gruposSoDoProduto,
  nomeModulo,
  nomeProduto,
  nomeSolucao,
  usosDoModulo,
  type ModuloMock,
  type ModuloRequerimentoMock,
  type ProdutoMock,
  type SolucaoMock,
  type UsoEmBancoMock,
} from './mocks/catalogo';

type Situacao = 'ativo' | 'inativo';
/** O que está escolhido na árvore à esquerda */
type Selecao = { tipo: 'solucao'; id: string } | { tipo: 'produto'; id: string };

/** Para que serve cada campo, pelo rótulo exibido (Especificação, seção 5.1, e decisão de 21/10/2026) */
const DICAS: Record<string, string> = {
  // Solução
  Código:
    'Identificador da solução usado pelo sistema. Não muda depois de criado: FISCAIS habilita o Contrato FISCAL na empresa.',
  'Nome da solução': 'Nome exibido nas telas e no contrato da empresa. Único.',
  'Solução ativa':
    'Solução inativa não aparece para empresas novas. As empresas que já a contratam não mudam.',
  'Grupos de serviço':
    'Grupos do Aranda que atendem a solução toda (DBA, Técnico…), sem ser de um produto. As horas deles vão sempre para o Banco padrão.',
  // Produto
  Solução:
    'A empresa contrata soluções. O produto pertence a uma solução e não muda de solução depois de criado.',
  'Nome do produto': 'Nome exibido no escopo dos bancos e no Book. Único na solução.',
  'Descrição do produto': 'Texto livre, só para consulta.',
  'Produto ativo':
    'Produto inativo não aparece para escopos novos. Os bancos que já o usam não mudam.',
  'Grupos do produto':
    'Grupos do Aranda ligados ao produto inteiro, sem módulo. As horas vão para o banco que cobre o produto inteiro; sem banco, para o Banco padrão.',
  // Módulo
  Produto: 'Produto ao qual o módulo pertence. Não muda depois de criado.',
  'Nome do módulo':
    'Nome do módulo, como aparece no escopo dos bancos e no Book. Único no produto.',
  'Descrição do módulo': 'Texto livre, só para consulta.',
  'Módulo ativo':
    'Módulo inativo não aparece para escopos novos. Os bancos que já o usam não mudam.',
  'Grupos do Aranda':
    'Grupos de atendimento do Aranda que pertencem a este módulo. É por eles que cada hora apontada chega ao módulo e, daí, ao banco. Um grupo fica em um só lugar.',
  'Usado nos bancos':
    'Bancos ativos que têm isto no escopo, diretamente ou por terem marcado o produto inteiro. O escopo marca produtos e módulos; a solução só agrupa.',
  // Requerimentos
  'Módulo do requerimento':
    'Valor do campo Módulo na tela de Requerimentos. A lista é fixa e não é editada aqui.',
  'Produto e módulo':
    'Para onde vão os requerimentos de Banco de Horas com este módulo. "Todos os módulos" leva ao banco que cobre o produto inteiro; sem banco que cubra, vão para o Banco padrão.',
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

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

function ListaGrupos({ titulo, grupos }: { titulo: string; grupos: string[] }) {
  if (!grupos.length)
    return (
      <span className="inline-flex items-center gap-1.5 text-ds-warning-fg">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Nenhum
      </span>
    );
  return (
    <ComLista rotulo={titulo} itens={grupos}>
      <span className="font-mono text-xs">{grupos[0]}</span>
      {grupos.length > 1 && (
        <span className="ml-1.5 text-xs text-ds-fg-muted">+{grupos.length - 1}</span>
      )}
    </ComLista>
  );
}

function ListaUsos({ usos }: { usos: UsoEmBancoMock[] }) {
  if (!usos.length) return <Vazio />;
  return (
    <ComLista
      rotulo="Bancos ativos que usam"
      itens={usos.map(
        (u) => `${u.empresa} › ${u.banco}${u.produtoInteiro ? ' (produto inteiro)' : ''}`
      )}
    >
      <span className="tabular-nums">{plural(usos.length, 'banco', 'bancos')}</span>
    </ComLista>
  );
}

function MenuAcoes({
  nome,
  ativo,
  onEditar,
  onAlterarStatus,
}: {
  nome: string;
  ativo: boolean;
  onEditar: () => void;
  onAlterarStatus: () => void;
}) {
  return (
    // O menu fica dentro da linha clicável: o clique nele não pode abrir a edição
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button tamanho="icone" variante="fantasma" aria-label={`Ações de ${nome}`}>
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
            className={cn(itemMenu, ativo && 'text-ds-danger-fg focus:bg-ds-danger-bg')}
            onSelect={onAlterarStatus}
          >
            {ativo ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {ativo ? 'Inativar' : 'Reativar'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Linha do produto no cartão da solução; com a alça à esquerda, é reordenada arrastando */
function ItemProduto({
  produto,
  atual,
  podeEditar,
  onSelecionar,
}: {
  produto: ProdutoMock;
  atual: boolean;
  podeEditar: boolean;
  onSelecionar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled: !podeEditar,
  });
  const modulos = MODULOS_MOCK.filter((m) => m.produtoId === produto.id && m.ativo);
  const semGrupo = modulos.filter((m) => !gruposDoModulo(m.id).length).length;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-1 rounded-lg',
        isDragging && 'relative z-10 bg-ds-bg-raised shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]'
      )}
    >
      {podeEditar && (
        // Alça de arrastar; pelo teclado: espaço para pegar, setas para mover, espaço para soltar
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${produto.nome}`}
          title="Arraste para mudar a ordem"
          className="grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button
        type="button"
        onClick={onSelecionar}
        aria-current={atual ? 'true' : undefined}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
          atual ? 'bg-ds-accent text-ds-fg-on-accent' : 'hover:bg-ds-bg-subtle'
        )}
      >
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-sm', atual ? 'font-semibold' : 'font-medium')}>
            {produto.nome}
          </span>
          <span className={cn('block text-xs', atual ? 'opacity-75' : 'text-ds-fg-muted')}>
            {modulos.length ? plural(modulos.length, 'módulo', 'módulos') : 'sem módulos'}
          </span>
        </span>
        {semGrupo > 0 && (
          <AlertTriangle
            className={cn('h-4 w-4 shrink-0', !atual && 'text-ds-warning-fg')}
            aria-label={`${plural(semGrupo, 'módulo', 'módulos')} sem grupo`}
          />
        )}
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Cartões das soluções, que abrem a lista de produtos                  */
/* ------------------------------------------------------------------ */

function Arvore({
  solucoes,
  produtos,
  selecao,
  podeEditar,
  carregando,
  onSelecionar,
  onReordenar,
}: {
  solucoes: SolucaoMock[];
  produtos: ProdutoMock[];
  selecao: Selecao;
  podeEditar: boolean;
  carregando: boolean;
  onSelecionar: (s: Selecao) => void;
  /** Novo lugar do produto arrastado, dentro da mesma solução */
  onReordenar: (id: string, sobreId: string) => void;
}) {
  const solucaoDaSelecao =
    selecao.tipo === 'solucao' ? selecao.id : produtos.find((p) => p.id === selecao.id)?.solucaoId;
  const [abertas, setAbertas] = useState<string[]>(solucaoDaSelecao ? [solucaoDaSelecao] : []);
  // Uma distância mínima antes de arrastar, para o clique na alça não virar arrasto sem querer
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const soltar = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) onReordenar(String(e.active.id), String(e.over.id));
  };

  if (carregando)
    return (
      <div className="space-y-3" role="status" aria-label="Carregando o catálogo">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-xl bg-ds-bg-subtle" />
        ))}
      </div>
    );
  return (
    <nav aria-label="Soluções e produtos" className="space-y-3">
      {solucoes.map((s) => {
        const daSolucao = produtos.filter((p) => p.solucaoId === s.id);
        const modulosDaSolucao = MODULOS_MOCK.filter(
          (m) => m.ativo && daSolucao.some((p) => p.id === m.produtoId)
        );
        const semGrupo = modulosDaSolucao.filter((m) => !gruposDoModulo(m.id).length).length;
        const aberta = abertas.includes(s.id);
        const atual = selecao.tipo === 'solucao' && selecao.id === s.id;
        const contem = solucaoDaSelecao === s.id;
        return (
          <section
            key={s.id}
            className={cn(
              'overflow-hidden rounded-xl border bg-ds-bg-surface transition',
              contem
                ? 'border-[#00D4E8] shadow-[0_8px_24px_-14px_rgba(0,212,232,0.6)]'
                : 'border-ds-border hover:border-ds-border-strong'
            )}
          >
            <button
              type="button"
              onClick={() => {
                onSelecionar({ tipo: 'solucao', id: s.id });
                // Clicar de novo na solução já escolhida fecha o cartão
                setAbertas((a) =>
                  a.includes(s.id) && atual
                    ? a.filter((x) => x !== s.id)
                    : [...new Set([...a, s.id])]
                );
              }}
              aria-expanded={aberta}
              aria-current={atual ? 'true' : undefined}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ds-focus"
            >
              <span
                className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-lg',
                  atual
                    ? 'bg-ds-accent text-ds-fg-on-accent'
                    : 'bg-ds-accent-subtle text-ds-fg-accent'
                )}
                aria-hidden
              >
                <Boxes className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-semibold">
                  {s.nome}
                  {!s.ativo && <StatusBadge>Inativa</StatusBadge>}
                </span>
                <span className="block text-xs text-ds-fg-muted">
                  {plural(daSolucao.length, 'produto', 'produtos')} ·{' '}
                  {plural(modulosDaSolucao.length, 'módulo', 'módulos')}
                  {semGrupo > 0 && (
                    <span className="text-ds-warning-fg"> · {semGrupo} sem grupo</span>
                  )}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-ds-fg-muted transition-transform',
                  aberta && 'rotate-180'
                )}
                aria-hidden
              />
            </button>

            {aberta && (
              <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
                <SortableContext
                  items={daSolucao.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul
                    className="ds-surgir space-y-1 border-t border-ds-border p-2"
                    aria-label={`Produtos de ${s.nome}`}
                  >
                    {daSolucao.map((p) => (
                      <ItemProduto
                        key={p.id}
                        produto={p}
                        atual={selecao.tipo === 'produto' && selecao.id === p.id}
                        podeEditar={podeEditar}
                        onSelecionar={() => onSelecionar({ tipo: 'produto', id: p.id })}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </section>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Painel da solução: produtos e grupos de serviço                      */
/* ------------------------------------------------------------------ */

function PainelSolucao({
  solucao,
  produtos,
  podeEditar,
  onAbrirProduto,
  onEditarSolucao,
  onEditarProduto,
  onAlterarStatusProduto,
}: {
  solucao: SolucaoMock;
  produtos: ProdutoMock[];
  podeEditar: boolean;
  onAbrirProduto: (id: string) => void;
  onEditarSolucao: () => void;
  /** null = produto novo nesta solução */
  onEditarProduto: (p: ProdutoMock | null) => void;
  onAlterarStatusProduto: (p: ProdutoMock) => void;
}) {
  const daSolucao = produtos.filter((p) => p.solucaoId === solucao.id);
  const servico = gruposDaSolucao(solucao.id);

  const colunas: ColunaTabela<ProdutoMock>[] = [
    {
      id: 'produto',
      cabecalho: 'Produto',
      mobile: 'titulo',
      celula: (p) => (
        <div className="min-w-0">
          <p
            className={cn('flex items-center gap-2 font-semibold', !p.ativo && 'text-ds-fg-muted')}
          >
            {p.nome}
            {!p.ativo && <StatusBadge>Inativo</StatusBadge>}
          </p>
          {p.descricao && <p className="truncate text-xs text-ds-fg-muted">{p.descricao}</p>}
        </div>
      ),
    },
    {
      id: 'modulos',
      cabecalho: 'Módulos',
      celula: (p) => {
        const n = MODULOS_MOCK.filter((m) => m.produtoId === p.id && m.ativo).length;
        return n ? (
          <span className="tabular-nums">{n}</span>
        ) : (
          <span className="text-ds-fg-muted">Sem módulos</span>
        );
      },
    },
    {
      id: 'grupos',
      cabecalho: 'Grupos do produto',
      celula: (p) => (
        <ListaGrupos
          titulo={`Grupos ligados a ${p.nome} inteiro`}
          grupos={gruposSoDoProduto(p.id)}
        />
      ),
    },
    {
      id: 'uso',
      cabecalho: 'Usado nos bancos',
      celula: (p) => <ListaUsos usos={USOS_MOCK[p.id] ?? []} />,
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: 'acoes',
      celula: (p) =>
        podeEditar ? (
          <MenuAcoes
            nome={p.nome}
            ativo={p.ativo}
            onEditar={() => onEditarProduto(p)}
            onAlterarStatus={() => onAlterarStatusProduto(p)}
          />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="min-w-0 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ds-fg-muted">Solução</p>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {solucao.nome}
              {!solucao.ativo && <StatusBadge>Inativa</StatusBadge>}
            </h2>
          </div>
          {podeEditar && (
            <div className="flex flex-wrap gap-2">
              <Button tamanho="sm" variante="fantasma" onClick={onEditarSolucao}>
                <Pencil /> Editar solução
              </Button>
              <Button tamanho="sm" variante="primario" onClick={() => onEditarProduto(null)}>
                <Plus /> Novo produto
              </Button>
            </div>
          )}
        </header>
        <DataTable
          rotulo={`Produtos de ${solucao.nome}`}
          colunas={colunas}
          linhas={daSolucao}
          chaveLinha={(p) => p.id}
          onLinhaClick={(p) => onAbrirProduto(p.id)}
          vazio={
            <EmptyState
              icone={<Package />}
              titulo="Nenhum produto nesta solução"
              acao={
                podeEditar ? (
                  <Button variante="primario" onClick={() => onEditarProduto(null)}>
                    <Plus /> Novo produto
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-ds-fg-muted" aria-hidden />
            <h2 className="text-xs font-bold uppercase tracking-[0.06em]">Grupos de serviço</h2>
            <DicaDoRotulo rotulo="Grupos de serviço" />
          </div>
          {podeEditar && (
            <VincularGrupo
              alvo={{ tipo: 'solucao', id: solucao.id }}
              vinculados={servico}
              onVincular={() => undefined}
            />
          )}
        </header>
        {servico.length ? (
          <ul className="divide-y divide-ds-border">
            {servico.map((g) => (
              <li key={g} className="flex items-center justify-between gap-3 px-4 py-2 md:px-5">
                <span className="min-w-0 truncate font-mono text-xs">{g}</span>
                {podeEditar && (
                  <Button tamanho="sm" variante="fantasma" aria-label={`Desvincular ${g}`}>
                    <Unlink /> Desvincular
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm text-ds-fg-muted md:px-5">
            Nenhum grupo de serviço nesta solução.
          </p>
        )}
        <p className="border-t border-ds-border px-4 py-2.5 text-xs text-ds-fg-muted md:px-5">
          As horas dos grupos de serviço vão sempre para o Banco padrão da empresa.
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel do produto: módulos                                           */
/* ------------------------------------------------------------------ */

function PainelProduto({
  estado,
  produto,
  modulos,
  podeEditar,
  soSemGrupo,
  onSoSemGrupo,
  onEditarProduto,
  onEditarModulo,
  onAlterarStatus,
}: {
  estado: PrototipoProps['estado'];
  produto: ProdutoMock;
  modulos: ModuloMock[];
  podeEditar: boolean;
  soSemGrupo: boolean;
  onSoSemGrupo: (v: boolean) => void;
  onEditarProduto: () => void;
  /** null = módulo novo */
  onEditarModulo: (m: ModuloMock | null) => void;
  onAlterarStatus: (m: ModuloMock) => void;
}) {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<Situacao[]>(['ativo']);
  const doProduto = modulos.filter((m) => m.produtoId === produto.id);
  const gruposProduto = gruposSoDoProduto(produto.id);

  const linhas = useMemo(
    () =>
      doProduto.filter(
        (m) =>
          (!situacao.length || situacao.includes(m.ativo ? 'ativo' : 'inativo')) &&
          (!soSemGrupo || !gruposDoModulo(m.id).length) &&
          (!busca ||
            `${m.nome} ${m.descricao} ${gruposDoModulo(m.id).join(' ')}`
              .toLowerCase()
              .includes(busca.toLowerCase()))
      ),
    [doProduto, situacao, soSemGrupo, busca]
  );
  const filtrosAtivos =
    (situacao.length !== 1 || situacao[0] !== 'ativo' ? 1 : 0) + (soSemGrupo ? 1 : 0);
  const limpar = () => {
    setBusca('');
    setSituacao(['ativo']);
    onSoSemGrupo(false);
  };

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
    {
      id: 'grupos',
      cabecalho: 'Grupos do Aranda',
      celula: (m) => (
        <ListaGrupos titulo={`Grupos do Aranda em ${m.nome}`} grupos={gruposDoModulo(m.id)} />
      ),
    },
    {
      id: 'uso',
      cabecalho: 'Usado nos bancos',
      celula: (m) => <ListaUsos usos={usosDoModulo(m)} />,
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (m) =>
        podeEditar ? (
          <MenuAcoes
            nome={m.nome}
            ativo={m.ativo}
            onEditar={() => onEditarModulo(m)}
            onAlterarStatus={() => onAlterarStatus(m)}
          />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ds-fg-muted">{nomeSolucao(produto.solucaoId)} ›</p>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {produto.nome}
            {!produto.ativo && <StatusBadge>Inativo</StatusBadge>}
          </h2>
          <p className="text-xs text-ds-fg-muted">
            {produto.descricao || 'Sem descrição'}
            {' · '}
            {gruposProduto.length ? (
              <ComLista rotulo={`Grupos ligados a ${produto.nome} inteiro`} itens={gruposProduto}>
                {plural(gruposProduto.length, 'grupo do produto', 'grupos do produto')}
              </ComLista>
            ) : (
              'nenhum grupo ligado ao produto inteiro'
            )}
            {(USOS_MOCK[produto.id] ?? []).length > 0 && (
              <>
                {' · '}
                <ListaUsos usos={USOS_MOCK[produto.id]} />
              </>
            )}
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button tamanho="sm" variante="fantasma" onClick={onEditarProduto}>
              <Pencil /> Editar produto
            </Button>
            <Button tamanho="sm" variante="primario" onClick={() => onEditarModulo(null)}>
              <Plus /> Novo módulo
            </Button>
          </div>
        )}
      </header>

      {doProduto.length === 0 && estado === 'dados' ? (
        <EmptyState
          icone={<Layers />}
          titulo="Produto sem módulos"
          descricao="Os grupos do Aranda ligam direto no produto, e o escopo dos bancos marca o produto inteiro. Cadastre módulos só se um banco precisar cobrir parte do produto."
          acao={
            podeEditar ? (
              <Button onClick={onEditarProduto}>
                <Link2 /> Ver grupos do produto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
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
            <FiltroAlternar
              rotulo="Sem grupo do Aranda"
              ativo={soSemGrupo}
              onChange={onSoSemGrupo}
            />
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
              rotulo={`Módulos de ${produto.nome}`}
              colunas={colunas}
              linhas={linhas}
              chaveLinha={(m) => m.id}
              carregando={estado === 'carregando'}
              onLinhaClick={podeEditar ? (m) => onEditarModulo(m) : undefined}
              vazio={
                <EmptyState
                  icone={<Layers />}
                  titulo="Nenhum módulo encontrado"
                  descricao={
                    filtrosAtivos || busca ? 'Nenhum módulo atende aos filtros.' : undefined
                  }
                  acao={
                    filtrosAtivos || busca ? (
                      <Button onClick={limpar}>Limpar filtros</Button>
                    ) : undefined
                  }
                />
              }
            />
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Módulos de requerimento                                          */
/* ------------------------------------------------------------------ */

/** Lista de produtos agrupada por solução */
function OpcoesProdutos({ soAtivos = true }: { soAtivos?: boolean }) {
  return (
    <>
      {SOLUCOES_MOCK.map((s) => (
        <optgroup key={s.id} label={s.nome}>
          {PRODUTOS_MOCK.filter((p) => p.solucaoId === s.id && (!soAtivos || p.ativo)).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}

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
      celula: (l) => {
        const modulos = MODULOS_MOCK.filter((m) => m.produtoId === l.produtoId && m.ativo);
        return podeEditar ? (
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label={`Produto de ${l.moduloRequerimento}`}
              value={l.produtoId}
              onChange={(e) => alterar(l.indice, { produtoId: e.target.value, moduloId: null })}
              className="w-52"
            >
              <OpcoesProdutos />
            </Select>
            <Select
              aria-label={`Módulo de ${l.moduloRequerimento}`}
              value={l.moduloId ?? ''}
              disabled={!modulos.length}
              onChange={(e) => alterar(l.indice, { moduloId: e.target.value || null })}
              className="w-56"
            >
              <option value="">Todos os módulos</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <span>
            <span className="text-ds-fg-muted">
              {nomeSolucao(PRODUTOS_MOCK.find((p) => p.id === l.produtoId)?.solucaoId ?? null)}{' '}
              ›{' '}
            </span>
            {nomeProduto(l.produtoId)}
            <span className="text-ds-fg-muted">
              {' '}
              › {nomeModulo(l.moduloId) ?? 'Todos os módulos'}
            </span>
          </span>
        );
      },
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
/* Vincular grupo do Aranda                                             */
/* ------------------------------------------------------------------ */

type Alvo = { tipo: 'solucao' | 'produto' | 'modulo'; id: string };

/** Onde o grupo está hoje, em texto */
const ondeEsta = (g: (typeof GRUPOS_ARANDA_MOCK)[number]) =>
  g.moduloId
    ? `Em ${nomeProduto(g.produtoId)} › ${nomeModulo(g.moduloId)}`
    : g.produtoId
      ? `Em ${nomeProduto(g.produtoId)}, sem módulo`
      : g.solucaoId
        ? `Serviço de ${nomeSolucao(g.solucaoId)}`
        : 'Sem solução (não se aplica)';

function VincularGrupo({
  alvo,
  vinculados,
  onVincular,
}: {
  alvo: Alvo;
  vinculados: string[];
  onVincular: (grupo: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const candidatos = GRUPOS_ARANDA_MOCK.filter(
    (g) =>
      !vinculados.includes(g.grupoAranda) &&
      (!busca || g.grupoAranda.toLowerCase().includes(busca.toLowerCase()))
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
        align="end"
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
          {candidatos.slice(0, 40).map((g) => {
            const ocupado = g.classificacao !== 'nao_se_aplica';
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => {
                    onVincular(g.grupoAranda);
                    setAberto(false);
                    setBusca('');
                  }}
                  className="flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-ds-bg-subtle focus-visible:bg-ds-bg-subtle focus-visible:outline-none"
                >
                  <span className="font-mono text-xs">{g.grupoAranda}</span>
                  <span
                    className={cn('text-xs', ocupado ? 'text-ds-warning-fg' : 'text-ds-fg-muted')}
                  >
                    {ondeEsta(g)}
                    {ocupado &&
                      ` · sai de lá e vem para ${alvo.tipo === 'solucao' ? 'os serviços' : 'cá'}`}
                  </span>
                </button>
              </li>
            );
          })}
          {!candidatos.length && (
            <li className="px-2.5 py-3 text-sm text-ds-fg-muted">Nenhum grupo encontrado.</li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Lista de grupos vinculados, com desvincular e o aviso de impacto */
function EditorGrupos({
  alvo,
  inicial,
  vazioTexto,
  ajuda,
}: {
  alvo: Alvo;
  inicial: string[];
  vazioTexto: string;
  ajuda: string;
}) {
  const [grupos, setGrupos] = useState(inicial);
  const mudaram = inicial.join('|') !== grupos.join('|');
  return (
    <>
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
        <Callout tom="warning">{vazioTexto}</Callout>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <VincularGrupo
          alvo={alvo}
          vinculados={grupos}
          onVincular={(g) => setGrupos((l) => [...l, g])}
        />
        <Ajuda>{ajuda}</Ajuda>
      </div>
      {mudaram && (
        <Callout tom="warning" titulo="Pode mover horas entre bancos">
          Nas empresas com bancos múltiplos, as horas desses grupos passam para outro banco a partir
          do próximo recálculo. Meses fechados não mudam.
        </Callout>
      )}
    </>
  );
}

function UsosNaEdicao({ usos, nenhum }: { usos: UsoEmBancoMock[]; nenhum: string }) {
  return usos.length ? (
    <ul className="space-y-1.5 text-sm">
      {usos.map((u) => (
        <li key={`${u.empresa}|${u.banco}`}>
          <span className="font-medium">{u.empresa}</span>
          <span className="text-ds-fg-secondary"> › {u.banco}</span>
          {u.produtoInteiro && <span className="text-xs text-ds-fg-muted"> · produto inteiro</span>}
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-ds-fg-muted">{nenhum}</p>
  );
}

/* ------------------------------------------------------------------ */
/* Edições                                                              */
/* ------------------------------------------------------------------ */

function EdicaoSolucao({
  solucao,
  solucoes,
  onFechar,
}: {
  solucao: SolucaoMock | null;
  solucoes: SolucaoMock[];
  onFechar: () => void;
}) {
  const novo = solucao === null;
  const [codigo, setCodigo] = useState<string>(solucao?.codigo ?? '');
  const [nome, setNome] = useState(solucao?.nome ?? '');
  const [ativo, setAtivo] = useState(solucao?.ativo ?? true);
  const outras = solucoes.filter((s) => s.id !== solucao?.id);
  const erroCodigo = !codigo.trim()
    ? 'Obrigatório.'
    : outras.some((s) => s.codigo === codigo.trim())
      ? 'Já existe uma solução com este código.'
      : null;
  const erroNome = !nome.trim()
    ? 'Obrigatório.'
    : outras.some((s) => s.nome.toLowerCase() === nome.trim().toLowerCase())
      ? 'Já existe uma solução com este nome.'
      : null;

  return (
    <TelaEdicao
      voltarPara="Produtos e Módulos"
      titulo={novo ? 'Nova solução' : `Editar ${solucao.nome}`}
      subtitulo={novo ? undefined : 'Última alteração em 01/07/2026 por Usuário Teste'}
      podeSalvar={!erroCodigo && !erroNome}
      rotuloSalvar={novo ? 'Criar solução' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={onFechar}
    >
      <Secao titulo="Identificação">
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="codigo-solucao">
              Código
            </Rotulo>
            <input
              id="codigo-solucao"
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
            id="nome-solucao"
            rotulo="Nome da solução"
            obrigatorio
            maiusculas
            valor={nome}
            onChange={setNome}
            erro={nome || !novo ? erroNome : null}
          />
        </div>
        {!novo && <Interruptor ligado={ativo} onChange={setAtivo} rotulo="Solução ativa" />}
      </Secao>
      {!novo && (
        <Secao titulo="Grupos de serviço">
          <EditorGrupos
            alvo={{ tipo: 'solucao', id: solucao.id }}
            inicial={gruposDaSolucao(solucao.id)}
            vazioTexto="Nenhum grupo de serviço nesta solução."
            ajuda="As horas dos grupos de serviço vão sempre para o Banco padrão."
          />
        </Secao>
      )}
    </TelaEdicao>
  );
}

function EdicaoProduto({
  produto,
  solucaoId,
  produtos,
  onFechar,
}: {
  /** null = produto novo */
  produto: ProdutoMock | null;
  solucaoId: string;
  produtos: ProdutoMock[];
  onFechar: () => void;
}) {
  const novo = produto === null;
  const [solucao, setSolucao] = useState(produto?.solucaoId ?? solucaoId);
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [confirmar, setConfirmar] = useState(false);

  const erroNome = !nome.trim()
    ? 'Obrigatório.'
    : produtos.some(
          (p) =>
            p.id !== produto?.id &&
            p.solucaoId === solucao &&
            p.nome.toLowerCase() === nome.trim().toLowerCase()
        )
      ? `Já existe o produto ${nome.trim()} em ${nomeSolucao(solucao)}.`
      : null;
  // Bancos que alcançam o produto: os que o marcaram inteiro e os que marcaram módulos dele
  const usos = produto
    ? [
        ...(USOS_MOCK[produto.id] ?? []),
        ...MODULOS_MOCK.filter((m) => m.produtoId === produto.id).flatMap(
          (m) => USOS_MOCK[m.id] ?? []
        ),
      ]
    : [];
  const inativando = !!produto?.ativo && !ativo;

  return (
    <TelaEdicao
      voltarPara="Produtos e Módulos"
      titulo={novo ? 'Novo produto' : `Editar ${produto.nome}`}
      subtitulo={novo ? undefined : 'Última alteração em 01/07/2026 por Usuário Teste'}
      podeSalvar={!erroNome}
      rotuloSalvar={novo ? 'Criar produto' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={() => (inativando && usos.length ? setConfirmar(true) : onFechar())}
    >
      <Secao titulo="Identificação">
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="solucao-produto">
              Solução
            </Rotulo>
            <Select
              id="solucao-produto"
              value={solucao}
              disabled={!novo}
              onChange={(e) => setSolucao(e.target.value)}
              className="w-full"
            >
              {SOLUCOES_MOCK.filter((s) => s.ativo || s.id === solucao).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </Select>
            {!novo && <Ajuda>A solução do produto não muda depois de criado.</Ajuda>}
          </div>
          <CampoTexto
            id="nome-produto"
            rotulo="Nome do produto"
            obrigatorio
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
        {!novo && (
          <Interruptor
            ligado={ativo}
            onChange={setAtivo}
            rotulo="Produto ativo"
            descricao={
              inativando && usos.length
                ? `Está no escopo de ${plural(usos.length, 'banco ativo', 'bancos ativos')}; você confirma ao salvar.`
                : undefined
            }
          />
        )}
      </Secao>

      <Secao titulo="Grupos do produto">
        <EditorGrupos
          alvo={{ tipo: 'produto', id: produto?.id ?? 'novo' }}
          inicial={produto ? gruposSoDoProduto(produto.id) : []}
          vazioTexto="Nenhum grupo ligado ao produto inteiro. Se o produto não tem módulos, sem grupo nenhuma hora chega a ele."
          ajuda="Use para grupos que atendem o produto todo, sem ser de um módulo."
        />
      </Secao>

      {!novo && (
        <Secao titulo="Usado nos bancos">
          <UsosNaEdicao usos={usos} nenhum="Nenhum banco ativo usa este produto." />
        </Secao>
      )}

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo={`Inativar ${produto?.nome ?? ''}?`}
        descricao={`Está no escopo de ${plural(usos.length, 'banco ativo', 'bancos ativos')}.`}
        consequencias={[
          'Deixa de aparecer para escopos novos',
          'Os bancos que já o usam não mudam',
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
  const usos = modulo ? usosDoModulo(modulo) : [];
  const inativando = !!modulo?.ativo && !ativo;

  return (
    <TelaEdicao
      voltarPara="Produtos e Módulos"
      titulo={novo ? 'Novo módulo' : `Editar ${modulo.nome}`}
      subtitulo={
        novo
          ? undefined
          : `${nomeSolucao(PRODUTOS_MOCK.find((p) => p.id === produto)?.solucaoId ?? null)} › ${nomeProduto(produto)} · Última alteração em 01/07/2026 por Usuário Teste`
      }
      podeSalvar={!erroNome}
      rotuloSalvar={novo ? 'Criar módulo' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={() => (inativando && usos.length ? setConfirmarInativar(true) : onFechar())}
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
              <OpcoesProdutos />
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
                ? `Está no escopo de ${plural(usos.length, 'banco ativo', 'bancos ativos')}; você confirma ao salvar.`
                : undefined
            }
          />
        )}
      </Secao>

      <Secao titulo="Grupos do Aranda">
        <EditorGrupos
          alvo={{ tipo: 'modulo', id: modulo?.id ?? 'novo' }}
          inicial={modulo ? gruposDoModulo(modulo.id) : []}
          vazioTexto="Sem grupo do Aranda, nenhuma hora apontada chega a este módulo."
          ajuda="Um grupo fica em um só lugar. Desvinculado, ele fica no produto, sem módulo."
        />
      </Secao>

      {!novo && (
        <Secao titulo="Usado nos bancos">
          <UsosNaEdicao usos={usos} nenhum="Nenhum banco ativo usa este módulo." />
        </Secao>
      )}

      <ConfirmDialog
        aberto={confirmarInativar}
        onOpenChange={setConfirmarInativar}
        titulo={`Inativar ${modulo?.nome ?? ''}?`}
        descricao={`Está no escopo de ${plural(usos.length, 'banco ativo', 'bancos ativos')}.`}
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
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

type Edicao =
  | { tipo: 'solucao'; solucao: SolucaoMock | null }
  | { tipo: 'produto'; produto: ProdutoMock | null; solucaoId: string }
  | { tipo: 'modulo'; modulo: ModuloMock | null }
  | null;

type AlterarStatus = { tipo: 'produto' | 'modulo'; nome: string; ativo: boolean; usos: number };

export default function ProdutosModulos({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [aba, setAba] = useState('catalogo');
  const [produtos, setProdutos] = useState(PRODUTOS_MOCK);
  const [selecao, setSelecao] = useState<Selecao>({ tipo: 'produto', id: PRODUTOS_MOCK[0].id });
  const [soSemGrupo, setSoSemGrupo] = useState(false);
  const [editando, setEditando] = useState<Edicao>(null);
  const [alterarStatus, setAlterarStatus] = useState<AlterarStatus | null>(null);
  const [importando, setImportando] = useState(false);
  const podeEditar = perfil === 'edicao';
  const modulos = MODULOS_MOCK;

  const produtoAtual =
    selecao.tipo === 'produto' ? produtos.find((p) => p.id === selecao.id) : null;
  const solucaoAtual =
    selecao.tipo === 'solucao'
      ? SOLUCOES_MOCK.find((s) => s.id === selecao.id)
      : SOLUCOES_MOCK.find((s) => s.id === produtoAtual?.solucaoId);

  const modulosAtivos = modulos.filter((m) => m.ativo);
  const totais = {
    produtos: produtos.filter((p) => p.ativo).length,
    modulos: modulosAtivos.length,
    grupos: GRUPOS_ARANDA_MOCK.filter((g) => g.classificacao !== 'nao_se_aplica').length,
    semGrupo: modulosAtivos.filter((m) => !gruposDoModulo(m.id).length).length,
  };

  // A ordem vale dentro da solução: o produto arrastado vai para o lugar do outro
  const reordenarProduto = (id: string, sobreId: string) =>
    setProdutos((ps) => {
      const de = ps.findIndex((p) => p.id === id);
      const para = ps.findIndex((p) => p.id === sobreId);
      if (de < 0 || para < 0 || ps[de].solucaoId !== ps[para].solucaoId) return ps;
      return arrayMove(ps, de, para);
    });

  const conteudo = () => {
    if (importando)
      return (
        <TelaImportacao
          voltarPara="Produtos e Módulos"
          titulo="Importar produtos e módulos"
          entidade="produtos e módulos"
          {...IMPORTACAO_CATALOGO}
          onFechar={() => setImportando(false)}
        />
      );
    if (editando?.tipo === 'solucao')
      return (
        <EdicaoSolucao
          key={editando.solucao?.id ?? 'nova'}
          solucao={editando.solucao}
          solucoes={SOLUCOES_MOCK}
          onFechar={() => setEditando(null)}
        />
      );
    if (editando?.tipo === 'produto')
      return (
        <EdicaoProduto
          key={editando.produto?.id ?? 'novo'}
          produto={editando.produto}
          solucaoId={editando.solucaoId}
          produtos={produtos}
          onFechar={() => setEditando(null)}
        />
      );
    if (editando?.tipo === 'modulo')
      return (
        <EdicaoModulo
          key={editando.modulo?.id ?? 'novo'}
          modulo={editando.modulo}
          produtoId={produtoAtual?.id ?? PRODUTOS_MOCK[0].id}
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
                Soluções contratadas pelas empresas, com seus produtos e módulos.
              </p>
            </div>
            <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
              {podeEditar && <BotaoImportar onClick={() => setImportando(true)} />}
              <MenuExportar entidade="soluções, produtos e módulos" />
              {podeEditar && (
                <>
                  <button
                    type="button"
                    className={botaoVidro}
                    onClick={() => setEditando({ tipo: 'solucao', solucao: null })}
                  >
                    <Plus className="h-4 w-4" /> Nova solução
                  </button>
                  <button
                    type="button"
                    className={botaoVidro}
                    onClick={() =>
                      setEditando({
                        tipo: 'produto',
                        produto: null,
                        solucaoId: solucaoAtual?.id ?? SOLUCOES_MOCK[0].id,
                      })
                    }
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
                </>
              )}
            </div>
          </div>
        </FaixaTopo>

        <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
          <Indicador rotulo="Produtos ativos" valor={totais.produtos} icone={<Package />} />
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
              // Abre o primeiro produto que tem módulo sem grupo
              const alvo = modulosAtivos.find((m) => !gruposDoModulo(m.id).length);
              if (!soSemGrupo && alvo) setSelecao({ tipo: 'produto', id: alvo.produtoId });
            }}
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
            <SegmentedTabs
              rotulo="Seções"
              itens={[
                { valor: 'catalogo', rotulo: 'Soluções, produtos e módulos' },
                { valor: 'requerimentos', rotulo: 'Módulos de requerimento' },
              ]}
              valor={aba}
              onChange={setAba}
            />
          </div>
          <div key={aba} className="ds-surgir" style={atraso(240)}>
            {aba === 'requerimentos' ? (
              <AbaRequerimentos estado={estado} podeEditar={podeEditar} />
            ) : estado === 'vazio' ? (
              <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
                <EmptyState
                  icone={<Boxes />}
                  titulo="Nenhuma solução cadastrada"
                  descricao="As soluções são o que as empresas contratam; os produtos e módulos definem o que cada banco de horas consome."
                  acao={
                    podeEditar ? (
                      <Button
                        variante="primario"
                        onClick={() => setEditando({ tipo: 'solucao', solucao: null })}
                      >
                        <Plus /> Nova solução
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
                <Arvore
                  solucoes={SOLUCOES_MOCK}
                  produtos={produtos}
                  selecao={selecao}
                  podeEditar={podeEditar}
                  carregando={estado === 'carregando'}
                  onSelecionar={setSelecao}
                  onReordenar={reordenarProduto}
                />
                {estado === 'erro' && selecao.tipo === 'solucao' ? (
                  <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
                    <Callout tom="danger" titulo="Não foi possível carregar o catálogo">
                      Verifique a conexão e tente novamente.
                    </Callout>
                    <Button>Tentar novamente</Button>
                  </div>
                ) : selecao.tipo === 'solucao' && solucaoAtual ? (
                  <PainelSolucao
                    solucao={solucaoAtual}
                    produtos={produtos}
                    podeEditar={podeEditar}
                    onAbrirProduto={(id) => setSelecao({ tipo: 'produto', id })}
                    onEditarSolucao={() => setEditando({ tipo: 'solucao', solucao: solucaoAtual })}
                    onEditarProduto={(p) =>
                      setEditando({ tipo: 'produto', produto: p, solucaoId: solucaoAtual.id })
                    }
                    onAlterarStatusProduto={(p) =>
                      setAlterarStatus({
                        tipo: 'produto',
                        nome: p.nome,
                        ativo: p.ativo,
                        usos: (USOS_MOCK[p.id] ?? []).length,
                      })
                    }
                  />
                ) : produtoAtual ? (
                  <PainelProduto
                    key={produtoAtual.id}
                    estado={estado}
                    produto={produtoAtual}
                    modulos={modulos}
                    podeEditar={podeEditar}
                    soSemGrupo={soSemGrupo}
                    onSoSemGrupo={setSoSemGrupo}
                    onEditarProduto={() =>
                      setEditando({
                        tipo: 'produto',
                        produto: produtoAtual,
                        solucaoId: produtoAtual.solucaoId,
                      })
                    }
                    onEditarModulo={(m) => setEditando({ tipo: 'modulo', modulo: m })}
                    onAlterarStatus={(m) =>
                      setAlterarStatus({
                        tipo: 'modulo',
                        nome: m.nome,
                        ativo: m.ativo,
                        usos: usosDoModulo(m).length,
                      })
                    }
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        <ConfirmDialog
          aberto={!!alterarStatus}
          onOpenChange={(v) => !v && setAlterarStatus(null)}
          titulo={`${alterarStatus?.ativo ? 'Inativar' : 'Reativar'} ${alterarStatus?.nome ?? ''}?`}
          descricao={
            alterarStatus?.ativo && alterarStatus.usos
              ? `Está no escopo de ${plural(alterarStatus.usos, 'banco ativo', 'bancos ativos')}.`
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
