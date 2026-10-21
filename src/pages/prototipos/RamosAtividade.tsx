// Protótipo da tela nova de Ramos de Atividade (Especificação v2.0, seção 5.3: "cadastro simples,
// nome e status"), na direção visual aprovada no protótipo de Empresas. Mantém a lista usada no
// Ramo de atividade e no Ramo secundário das empresas. A tabela nasce vazia (decisão 9.3-9): a
// lista é cadastrada aqui antes de o campo virar obrigatório.
// Dados fictícios (mocks/ramos.ts). Sem Supabase.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  CircleSlash,
  GripVertical,
  ListTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  X,
  XCircle,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2 } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroMultiplo } from './compartilhado/filtros';
import { DicasContext } from './compartilhado/dicas';
import { campo, itemMenu } from './compartilhado/estilos';
import {
  ChavePrototipo,
  ChavesPrototipo,
  DicaDoRotulo,
  Indicador,
} from './compartilhado/formulario';
import { RAMOS_ATIVIDADE_MOCK, TOTAL_EMPRESAS_MOCK, type RamoMock } from './mocks/ramos';

type Situacao = 'ativo' | 'inativo';

/** Para que serve cada campo, pelo rótulo exibido (Especificação, seção 5.3) */
const DICAS: Record<string, string> = {
  'Ramos de atividade':
    'Lista usada no Ramo de atividade (obrigatório) e no Ramo secundário (opcional) das empresas, na ordem desta tela. Arraste para mudar a ordem.',
  'Novo ramo':
    'Nome do segmento do cliente. Não pode repetir outro ramo, sem diferenciar maiúsculas.',
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const normalizar = (t: string) => t.trim().toLowerCase();

/* ------------------------------------------------------------------ */
/* Linha do ramo                                                        */
/* ------------------------------------------------------------------ */

function LinhaRamo({
  ramo,
  podeEditar,
  podeArrastar,
  nomes,
  onRenomear,
  onAlterarStatus,
}: {
  ramo: RamoMock;
  podeEditar: boolean;
  /** Com busca ou filtro a lista está incompleta: a ordem não muda */
  podeArrastar: boolean;
  /** Nomes dos outros ramos, para não repetir */
  nomes: string[];
  onRenomear: (nome: string) => void;
  onAlterarStatus: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: ramo.id,
    disabled: !podeArrastar,
  });
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(ramo.nome);
  const erro = !nome.trim()
    ? 'Obrigatório.'
    : nomes.includes(normalizar(nome))
      ? 'Já existe um ramo com este nome.'
      : null;
  const empresas = ramo.empresasPrincipal + ramo.empresasSecundario;

  const salvar = () => {
    if (erro) return;
    onRenomear(nome.trim());
    setEditando(false);
  };
  const cancelar = () => {
    setNome(ramo.nome);
    setEditando(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 md:px-4',
        isDragging &&
          'relative z-10 rounded-lg bg-ds-bg-raised shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]'
      )}
    >
      {podeEditar && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={!podeArrastar}
          aria-label={`Reordenar ${ramo.nome}`}
          title={
            podeArrastar
              ? 'Arraste para mudar a ordem'
              : 'Limpe a busca e os filtros para reordenar'
          }
          className="grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      )}

      {editando ? (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              aria-label={`Novo nome de ${ramo.nome}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') salvar();
                if (e.key === 'Escape') cancelar();
              }}
              aria-invalid={!!erro}
              className={cn(campo, erro && 'border-ds-danger-fg')}
            />
            <Button
              tamanho="icone"
              variante="primario"
              disabled={!!erro}
              onClick={salvar}
              aria-label="Salvar nome"
            >
              <Check />
            </Button>
            <Button tamanho="icone" onClick={cancelar} aria-label="Cancelar">
              <X />
            </Button>
          </div>
          {erro ? (
            <p className="mt-1.5 text-xs text-ds-danger-fg">{erro}</p>
          ) : (
            empresas > 0 && (
              <p className="mt-1.5 text-xs text-ds-fg-muted">
                O novo nome aparece nas {plural(empresas, 'empresa', 'empresas')} que usam este
                ramo.
              </p>
            )
          )}
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'flex items-center gap-2 text-sm font-medium',
                !ramo.ativo && 'text-ds-fg-muted'
              )}
            >
              <span className="truncate">{ramo.nome}</span>
              {!ramo.ativo && <StatusBadge>Inativo</StatusBadge>}
            </p>
            <p className="text-xs text-ds-fg-muted">
              {empresas
                ? `${plural(ramo.empresasPrincipal, 'empresa', 'empresas')} como principal · ${ramo.empresasSecundario} como secundário`
                : 'Nenhuma empresa usa'}
            </p>
          </div>
          {podeEditar && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button tamanho="icone" variante="fantasma" aria-label={`Ações de ${ramo.nome}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                data-ds="v2"
                align="end"
                className="min-w-44 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
              >
                <DropdownMenuItem className={itemMenu} onSelect={() => setEditando(true)}>
                  <Pencil className="h-4 w-4" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn(itemMenu, ramo.ativo && 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                  onSelect={onAlterarStatus}
                >
                  {ramo.ativo ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {ramo.ativo ? 'Inativar' : 'Reativar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function RamosAtividade({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [ramos, setRamos] = useState(RAMOS_ATIVIDADE_MOCK);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<Situacao[]>([]);
  const [novo, setNovo] = useState('');
  const [tocadoNovo, setTocadoNovo] = useState(false);
  const [alterarStatus, setAlterarStatus] = useState<RamoMock | null>(null);
  const podeEditar = perfil === 'edicao';

  const lista = useMemo(() => (estado === 'vazio' ? [] : ramos), [estado, ramos]);
  const visiveis = useMemo(
    () =>
      lista.filter(
        (r) =>
          (!situacao.length || situacao.includes(r.ativo ? 'ativo' : 'inativo')) &&
          (!busca || normalizar(r.nome).includes(normalizar(busca)))
      ),
    [lista, situacao, busca]
  );
  const filtrando = !!busca || situacao.length > 0;

  const comRamo = lista.reduce((s, r) => s + r.empresasPrincipal, 0);
  const totais = {
    ativos: lista.filter((r) => r.ativo).length,
    inativos: lista.filter((r) => !r.ativo).length,
    comRamo,
    semRamo: TOTAL_EMPRESAS_MOCK - comRamo,
  };

  const erroNovo = !novo.trim()
    ? tocadoNovo
      ? 'Digite o nome do ramo.'
      : null
    : lista.some((r) => normalizar(r.nome) === normalizar(novo))
      ? 'Já existe um ramo com este nome.'
      : null;
  const adicionar = () => {
    setTocadoNovo(true);
    if (!novo.trim() || erroNovo) return;
    setRamos((rs) => [
      ...rs,
      {
        id: `r-novo-${rs.length}`,
        nome: novo.trim(),
        ativo: true,
        empresasPrincipal: 0,
        empresasSecundario: 0,
        alteradoEm: '21/10/2026',
        alteradoPor: 'Usuário Teste',
      },
    ]);
    setNovo('');
    setTocadoNovo(false);
  };

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const soltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    setRamos((rs) =>
      arrayMove(
        rs,
        rs.findIndex((r) => r.id === e.active.id),
        rs.findIndex((r) => r.id === e.over!.id)
      )
    );
  };

  const empresasDoRamo = alterarStatus
    ? alterarStatus.empresasPrincipal + alterarStatus.empresasSecundario
    : 0;

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

        <FaixaTopo>
          <div className="pb-24 pt-3 md:pb-28 md:pt-4">
            <div className="ds-surgir max-w-2xl">
              <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
                <span className="bg-gradient-to-r from-[#00D4E8] to-[#7CEBF5] bg-clip-text text-transparent">
                  Ramos de Atividade
                </span>
              </h1>
              <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                Segmentos dos clientes, usados no ramo de atividade e no ramo secundário das
                empresas.
              </p>
            </div>
          </div>
        </FaixaTopo>

        <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
          <Indicador rotulo="Ramos ativos" valor={totais.ativos} icone={<ListTree />} />
          <Indicador
            rotulo="Inativos"
            valor={totais.inativos}
            icone={<CircleSlash />}
            atrasoMs={60}
            selecionado={situacao.length === 1 && situacao[0] === 'inativo'}
            onClick={() =>
              setSituacao((s) => (s.length === 1 && s[0] === 'inativo' ? [] : ['inativo']))
            }
          />
          <Indicador
            rotulo="Empresas com ramo"
            valor={totais.comRamo}
            icone={<Building2 />}
            tom="success"
            atrasoMs={120}
          />
          <Indicador
            rotulo="Empresas sem ramo"
            valor={totais.semRamo}
            icone={<AlertTriangle />}
            tom="warning"
            atrasoMs={180}
          />
        </div>

        <section
          className="ds-surgir mx-auto mt-6 max-w-3xl overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface"
          style={atraso(240)}
        >
          <header className="flex items-center gap-1.5 border-b border-ds-border px-4 py-4 md:px-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.06em]">Ramos de atividade</h2>
            <DicaDoRotulo rotulo="Ramos de atividade" />
          </header>

          {/* Inclusão direto na lista: o cadastro é só o nome */}
          {podeEditar && estado !== 'erro' && (
            <div className="border-b border-ds-border px-4 py-3 md:px-5">
              <div className="flex gap-2">
                <input
                  aria-label="Novo ramo"
                  placeholder="Novo ramo (ex.: Agronegócio)"
                  value={novo}
                  onChange={(e) => setNovo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && adicionar()}
                  aria-invalid={!!erroNovo}
                  className={cn(campo, erroNovo && 'border-ds-danger-fg')}
                />
                <Button variante="primario" onClick={adicionar} className="shrink-0">
                  <Plus /> Adicionar
                </Button>
              </div>
              {erroNovo && <p className="mt-1.5 text-xs text-ds-danger-fg">{erroNovo}</p>}
            </div>
          )}

          {lista.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-ds-border px-4 py-3 md:px-5">
              {filtrando && (
                <BotaoLimparFiltros
                  onClick={() => {
                    setBusca('');
                    setSituacao([]);
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
                  aria-label="Buscar ramo"
                  placeholder="Buscar ramo"
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
            </div>
          )}

          {estado === 'erro' ? (
            <div className="space-y-3 p-4">
              <Callout tom="danger" titulo="Não foi possível carregar os ramos">
                Verifique a conexão e tente novamente.
              </Callout>
              <Button>Tentar novamente</Button>
            </div>
          ) : estado === 'carregando' ? (
            <div className="space-y-2 p-4" role="status" aria-label="Carregando">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-ds-bg-subtle" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <EmptyState
              icone={<ListTree />}
              titulo="Nenhum ramo cadastrado"
              descricao="Cadastre a lista antes de o ramo de atividade virar obrigatório na edição das empresas."
            />
          ) : visiveis.length === 0 ? (
            <EmptyState
              icone={<Search />}
              titulo="Nenhum ramo encontrado"
              acao={
                <Button
                  onClick={() => {
                    setBusca('');
                    setSituacao([]);
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ) : (
            <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
              <SortableContext
                items={visiveis.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="divide-y divide-ds-border" aria-label="Ramos de atividade">
                  {visiveis.map((r) => (
                    <LinhaRamo
                      key={r.id}
                      ramo={r}
                      podeEditar={podeEditar}
                      podeArrastar={podeEditar && !filtrando}
                      nomes={lista.filter((x) => x.id !== r.id).map((x) => normalizar(x.nome))}
                      onRenomear={(nome) =>
                        setRamos((rs) => rs.map((x) => (x.id === r.id ? { ...x, nome } : x)))
                      }
                      onAlterarStatus={() => setAlterarStatus(r)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <ConfirmDialog
          aberto={!!alterarStatus}
          onOpenChange={(v) => !v && setAlterarStatus(null)}
          titulo={`${alterarStatus?.ativo ? 'Inativar' : 'Reativar'} ${alterarStatus?.nome ?? ''}?`}
          consequencias={
            alterarStatus?.ativo
              ? [
                  'Deixa de aparecer para escolher nas empresas',
                  empresasDoRamo
                    ? `Continua nas ${plural(empresasDoRamo, 'empresa', 'empresas')} que já o usam`
                    : 'Nenhuma empresa usa este ramo',
                  'Pode ser reativado depois',
                ]
              : ['Volta a aparecer para escolher nas empresas']
          }
          rotuloConfirmar={alterarStatus?.ativo ? 'Inativar' : 'Reativar'}
          tom={alterarStatus?.ativo ? 'perigo' : 'padrao'}
          onConfirmar={() => {
            setRamos((rs) =>
              rs.map((x) => (x.id === alterarStatus?.id ? { ...x, ativo: !x.ativo } : x))
            );
            setAlterarStatus(null);
          }}
        />
      </PaginaV2>
    </DicasContext.Provider>
  );
}
