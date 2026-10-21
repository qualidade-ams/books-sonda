// Protótipo da tela nova de Ramos de Atividade (Especificação v2.0, seção 5.3: "cadastro simples,
// nome e status"), na direção visual aprovada no protótipo de Empresas. Mantém a lista usada no
// Ramo de atividade e no Ramo secundário das empresas. A tabela nasce vazia (decisão 9.3-9): a
// lista é cadastrada aqui antes de o campo virar obrigatório.
// Padrão de salvar (21/10/2026): incluir, renomear, reordenar, inativar e excluir ficam pendentes
// até Salvar, na barra do rodapé. Dados fictícios (mocks/ramos.ts). Sem Supabase.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleSlash,
  GripVertical,
  ListTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import { BotaoImportar, MenuExportar, TelaImportacao } from './compartilhado/importacao';
import { IMPORTACAO_RAMOS } from './mocks/importacoes';
import { campo, itemMenu } from './compartilhado/estilos';
import {
  BarraRodape,
  ChavePrototipo,
  ChavesPrototipo,
  DicaDoRotulo,
  Indicador,
  TituloFaixa,
} from './compartilhado/formulario';
import { RAMOS_ATIVIDADE_MOCK, TOTAL_EMPRESAS_MOCK, type RamoMock } from './mocks/ramos';

type Situacao = 'ativo' | 'inativo';
/** Como o ramo está em relação ao que foi salvo */
type Pendencia = 'novo' | 'alterado' | 'inativado' | 'reativado' | null;

/** Para que serve cada campo, pelo rótulo exibido (Especificação, seção 5.3) */
const DICAS: Record<string, string> = {
  'Ramos de atividade':
    'Lista usada no Ramo de atividade (obrigatório) e no Ramo secundário (opcional) das empresas, na ordem desta tela. Arraste para mudar a ordem. As alterações só valem depois de salvar.',
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const normalizar = (t: string) => t.trim().toLowerCase();
const usoDoRamo = (r: RamoMock) => r.empresasPrincipal + r.empresasSecundario;

const SELO: Record<Exclude<Pendencia, null>, { rotulo: string; tom: 'info' | 'warning' }> = {
  novo: { rotulo: 'Novo', tom: 'info' },
  alterado: { rotulo: 'Alterado', tom: 'info' },
  inativado: { rotulo: 'Será inativado', tom: 'warning' },
  reativado: { rotulo: 'Será reativado', tom: 'info' },
};

/* ------------------------------------------------------------------ */
/* Linha do ramo                                                        */
/* ------------------------------------------------------------------ */

function LinhaRamo({
  ramo,
  pendencia,
  podeEditar,
  podeArrastar,
  nomes,
  onRenomear,
  onAlterarStatus,
  onExcluir,
}: {
  ramo: RamoMock;
  pendencia: Pendencia;
  podeEditar: boolean;
  /** Com busca ou filtro a lista está incompleta: a ordem não muda */
  podeArrastar: boolean;
  /** Nomes dos outros ramos, para não repetir */
  nomes: string[];
  onRenomear: (nome: string) => void;
  onAlterarStatus: () => void;
  onExcluir: () => void;
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
  const empresas = usoDoRamo(ramo);

  // Enter ou sair do campo aplica o nome na lista (ainda não salvo); Esc desfaz
  const aplicar = () => {
    if (erro) return;
    if (nome.trim() !== ramo.nome) onRenomear(nome.trim());
    setEditando(false);
  };
  const desfazer = () => {
    setNome(ramo.nome);
    setEditando(false);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 md:px-4',
        pendencia && 'bg-ds-accent-subtle/40',
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
          <input
            autoFocus
            aria-label={`Novo nome de ${ramo.nome}`}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onBlur={() => (erro ? desfazer() : aplicar())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') aplicar();
              if (e.key === 'Escape') desfazer();
            }}
            aria-invalid={!!erro}
            className={cn(campo, erro && 'border-ds-danger-fg')}
          />
          <p className={cn('mt-1.5 text-xs', erro ? 'text-ds-danger-fg' : 'text-ds-fg-muted')}>
            {erro ??
              `Enter para aplicar, Esc para desfazer.${
                empresas
                  ? ` Ao salvar, o novo nome aparece nas ${plural(empresas, 'empresa', 'empresas')} que usam este ramo.`
                  : ''
              }`}
          </p>
        </div>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'flex flex-wrap items-center gap-2 text-sm font-medium',
                !ramo.ativo && 'text-ds-fg-muted'
              )}
            >
              <span className="truncate">{ramo.nome}</span>
              {!ramo.ativo && pendencia !== 'inativado' && <StatusBadge>Inativo</StatusBadge>}
              {pendencia && (
                <StatusBadge tom={SELO[pendencia].tom}>{SELO[pendencia].rotulo}</StatusBadge>
              )}
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
                className="min-w-52 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
              >
                <DropdownMenuItem className={itemMenu} onSelect={() => setEditando(true)}>
                  <Pencil className="h-4 w-4" /> Renomear
                </DropdownMenuItem>
                <DropdownMenuItem className={itemMenu} onSelect={onAlterarStatus}>
                  {ramo.ativo ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {ramo.ativo ? 'Inativar' : 'Reativar'}
                </DropdownMenuItem>
                {/* Só ramo sem uso pode ser excluído; o que está em uso é inativado */}
                <DropdownMenuItem
                  className={cn(
                    itemMenu,
                    'text-ds-danger-fg focus:bg-ds-danger-bg data-[disabled]:pointer-events-none data-[disabled]:text-ds-fg-disabled'
                  )}
                  disabled={empresas > 0}
                  onSelect={onExcluir}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="flex flex-col">
                    Excluir
                    {empresas > 0 && (
                      <span className="text-xs font-normal">Em uso: inative em vez de excluir</span>
                    )}
                  </span>
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
  /** O que está gravado; `ramos` é o rascunho com as alterações pendentes */
  const [salvos, setSalvos] = useState(RAMOS_ATIVIDADE_MOCK);
  const [ramos, setRamos] = useState(RAMOS_ATIVIDADE_MOCK);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<Situacao[]>([]);
  const [novo, setNovo] = useState('');
  const [tocadoNovo, setTocadoNovo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [importando, setImportando] = useState(false);
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

  // Diferença entre o rascunho e o que está salvo
  const pendencia = (r: RamoMock): Pendencia => {
    const s = salvos.find((x) => x.id === r.id);
    if (!s) return 'novo';
    if (s.ativo && !r.ativo) return 'inativado';
    if (!s.ativo && r.ativo) return 'reativado';
    return s.nome !== r.nome ? 'alterado' : null;
  };
  const mudancas = useMemo(() => {
    const incluidos = ramos.filter((r) => !salvos.some((s) => s.id === r.id));
    const excluidos = salvos.filter((s) => !ramos.some((r) => r.id === s.id));
    const existentes = ramos.filter((r) => salvos.some((s) => s.id === r.id));
    const renomeados = existentes.filter((r) => salvos.find((s) => s.id === r.id)?.nome !== r.nome);
    const inativados = existentes.filter(
      (r) => salvos.find((s) => s.id === r.id)?.ativo && !r.ativo
    );
    const reativados = existentes.filter(
      (r) => !salvos.find((s) => s.id === r.id)?.ativo && r.ativo
    );
    const ordem =
      existentes.map((r) => r.id).join('|') !==
      salvos
        .filter((s) => ramos.some((r) => r.id === s.id))
        .map((s) => s.id)
        .join('|');
    const itens: string[] = [];
    if (incluidos.length) itens.push(plural(incluidos.length, 'ramo incluído', 'ramos incluídos'));
    if (renomeados.length) itens.push(plural(renomeados.length, 'renomeado', 'renomeados'));
    if (inativados.length) itens.push(plural(inativados.length, 'inativado', 'inativados'));
    if (reativados.length) itens.push(plural(reativados.length, 'reativado', 'reativados'));
    if (excluidos.length) itens.push(plural(excluidos.length, 'excluído', 'excluídos'));
    if (ordem) itens.push('ordem alterada');
    return { itens, renomeados, inativados, excluidos };
  }, [ramos, salvos]);

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
        id: `r-novo-${Date.now()}`,
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

  // Consequências mostradas antes de salvar
  const usoInativados = mudancas.inativados.reduce((s, r) => s + usoDoRamo(r), 0);
  const usoRenomeados = mudancas.renomeados.reduce((s, r) => s + usoDoRamo(r), 0);
  const consequencias = [
    ...(mudancas.inativados.length
      ? [
          `${mudancas.inativados.map((r) => r.nome).join(', ')} deixa${mudancas.inativados.length > 1 ? 'm' : ''} de aparecer para escolher${usoInativados ? `, mas continua${mudancas.inativados.length > 1 ? 'm' : ''} nas ${plural(usoInativados, 'empresa', 'empresas')} que já usam` : ''}`,
        ]
      : []),
    ...(usoRenomeados
      ? [`O novo nome aparece nas ${plural(usoRenomeados, 'empresa', 'empresas')} afetadas`]
      : []),
    ...(mudancas.excluidos.length
      ? [`Excluídos de vez: ${mudancas.excluidos.map((r) => r.nome).join(', ')}`]
      : []),
  ];

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

        {importando ? (
          <TelaImportacao
            voltarPara="Ramos de Atividade"
            titulo="Importar ramos"
            entidade="ramos"
            podeAtualizar={false}
            {...IMPORTACAO_RAMOS}
            onFechar={() => setImportando(false)}
          />
        ) : (
          <>
            <FaixaTopo>
              <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                <div className="ds-surgir max-w-2xl">
                  <TituloFaixa texto="Ramos de Atividade" />
                  <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                    Segmentos dos clientes, usados no ramo de atividade e no ramo secundário das
                    empresas.
                  </p>
                </div>
                <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                  {podeEditar && <BotaoImportar onClick={() => setImportando(true)} />}
                  <MenuExportar total={lista.length} entidade="ramos" />
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
                <h2 className="text-xs font-bold uppercase tracking-[0.06em]">
                  Ramos de atividade
                </h2>
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
                    <Button onClick={adicionar} className="shrink-0">
                      <Plus /> Incluir
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
                <DndContext
                  sensors={sensores}
                  collisionDetection={closestCenter}
                  onDragEnd={soltar}
                >
                  <SortableContext
                    items={visiveis.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="divide-y divide-ds-border" aria-label="Ramos de atividade">
                      {visiveis.map((r) => (
                        <LinhaRamo
                          key={r.id}
                          ramo={r}
                          pendencia={pendencia(r)}
                          podeEditar={podeEditar}
                          podeArrastar={podeEditar && !filtrando}
                          nomes={lista.filter((x) => x.id !== r.id).map((x) => normalizar(x.nome))}
                          onRenomear={(nome) =>
                            setRamos((rs) => rs.map((x) => (x.id === r.id ? { ...x, nome } : x)))
                          }
                          onAlterarStatus={() =>
                            setRamos((rs) =>
                              rs.map((x) => (x.id === r.id ? { ...x, ativo: !x.ativo } : x))
                            )
                          }
                          onExcluir={() => setRamos((rs) => rs.filter((x) => x.id !== r.id))}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              )}
            </section>

            {mudancas.itens.length > 0 && (
              <BarraRodape>
                <span className="text-sm text-ds-fg-secondary">
                  <span className="font-medium text-ds-fg">
                    {mudancas.itens.join(', ').replace(/^./, (c) => c.toUpperCase())}
                  </span>{' '}
                  · ainda não salvo
                </span>
                <div className="flex gap-2">
                  <Button onClick={() => setRamos(salvos)}>Descartar</Button>
                  <Button variante="primario" onClick={() => setConfirmar(true)}>
                    Salvar
                  </Button>
                </div>
              </BarraRodape>
            )}

            <ConfirmDialog
              aberto={confirmar}
              onOpenChange={setConfirmar}
              titulo="Salvar os ramos de atividade?"
              descricao={mudancas.itens.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.'}
              consequencias={consequencias.length ? consequencias : undefined}
              rotuloConfirmar="Salvar"
              onConfirmar={() => {
                setSalvos(ramos);
                setConfirmar(false);
              }}
            />
          </>
        )}
      </PaginaV2>
    </DicasContext.Provider>
  );
}
