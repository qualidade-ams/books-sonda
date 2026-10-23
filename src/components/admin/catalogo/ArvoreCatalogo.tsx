// Cartões das soluções à esquerda da tela Produtos e Módulos; cada um abre a lista dos seus
// produtos, que quem edita reordena arrastando.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Boxes, ChevronDown, GripVertical } from 'lucide-react';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { gruposDoModulo, modulosAClassificar } from '@/utils/catalogoTela';
import type { Catalogo, Produto } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

/** O que está escolhido na árvore */
export type SelecaoCatalogo = { tipo: 'solucao'; id: string } | { tipo: 'produto'; id: string };

/** Linha do produto no cartão da solução; com a alça à esquerda, é reordenada arrastando */
function ItemProduto({
  produto,
  modulos,
  semGrupo,
  atual,
  podeEditar,
  onSelecionar,
}: {
  produto: Produto;
  modulos: number;
  semGrupo: number;
  atual: boolean;
  podeEditar: boolean;
  onSelecionar: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: produto.id,
    disabled: !podeEditar,
  });

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
          aria-label={t('fase3Comum.reordenar', { nome: produto.nome })}
          title={t('fase3Comum.arrasteParaOrdenar')}
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
          <span
            className={cn(
              'flex items-center gap-2 truncate text-sm',
              atual ? 'font-semibold' : 'font-medium'
            )}
          >
            {produto.nome}
            {!produto.ativo && <StatusBadge>{t('fase3Comum.inativo')}</StatusBadge>}
          </span>
          <span className={cn('block text-xs', atual ? 'opacity-75' : 'text-ds-fg-muted')}>
            {modulos
              ? plural(t, 'produtosModulos.arvore.modulos', modulos)
              : t('produtosModulos.arvore.semModulos')}
          </span>
        </span>
        {semGrupo > 0 && (
          <AlertTriangle
            className={cn('h-4 w-4 shrink-0', !atual && 'text-ds-warning-fg')}
            aria-label={plural(t, 'produtosModulos.arvore.modulosSemGrupo', semGrupo)}
          />
        )}
      </button>
    </li>
  );
}

export function ArvoreCatalogo({
  catalogo,
  mapeamentos,
  selecao,
  podeEditar,
  carregando,
  onSelecionar,
  onReordenar,
}: {
  catalogo: Catalogo;
  mapeamentos: MapeamentoGrupo[];
  selecao: SelecaoCatalogo;
  podeEditar: boolean;
  carregando: boolean;
  onSelecionar: (s: SelecaoCatalogo) => void;
  /** Novo lugar do produto arrastado, dentro da mesma solução */
  onReordenar: (id: string, sobreId: string) => void;
}) {
  const { t } = useTranslation();
  const { solucoes, produtos, modulos } = catalogo;
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
      <div className="space-y-3" role="status" aria-label={t('produtosModulos.arvore.carregando')}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-xl bg-ds-bg-subtle" />
        ))}
      </div>
    );

  const ativosDo = (produtoId: string) =>
    modulos.filter((m) => m.ativo && m.produtoId === produtoId);
  const semGrupoEm = (lista: typeof modulos) =>
    lista.filter((m) => !gruposDoModulo(mapeamentos, m.id).length).length;

  return (
    <nav aria-label={t('produtosModulos.arvore.navegacao')} className="space-y-3">
      {[...solucoes]
        .sort((a, b) => a.ordem - b.ordem)
        .map((s) => {
          const daSolucao = produtos
            .filter((p) => p.solucaoId === s.id)
            .sort((a, b) => a.ordem - b.ordem);
          const modulosDaSolucao = daSolucao.flatMap((p) => ativosDo(p.id));
          const semGrupo = semGrupoEm(modulosDaSolucao);
          const aClassificar = modulosAClassificar(catalogo, s.id);
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
                    {!s.ativo && <StatusBadge>{t('fase3Comum.inativa')}</StatusBadge>}
                  </span>
                  <span className="block text-xs text-ds-fg-muted">
                    {plural(t, 'produtosModulos.arvore.produtos', daSolucao.length)} ·{' '}
                    {plural(t, 'produtosModulos.arvore.modulos', modulosDaSolucao.length)}
                    {semGrupo > 0 && (
                      <span className="text-ds-warning-fg">
                        {' '}
                        · {t('produtosModulos.arvore.semGrupo', { n: semGrupo })}
                      </span>
                    )}
                    {aClassificar > 0 && (
                      <span className="text-ds-warning-fg">
                        {' '}
                        · {t('produtosModulos.arvore.aClassificar', { n: aClassificar })}
                      </span>
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
                <DndContext
                  sensors={sensores}
                  collisionDetection={closestCenter}
                  onDragEnd={soltar}
                >
                  <SortableContext
                    items={daSolucao.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul
                      className="ds-surgir space-y-1 border-t border-ds-border p-2"
                      aria-label={t('produtosModulos.arvore.produtosDe', { solucao: s.nome })}
                    >
                      {daSolucao.map((p) => {
                        const ativos = ativosDo(p.id);
                        return (
                          <ItemProduto
                            key={p.id}
                            produto={p}
                            modulos={ativos.length}
                            semGrupo={semGrupoEm(ativos)}
                            atual={selecao.tipo === 'produto' && selecao.id === p.id}
                            podeEditar={podeEditar}
                            onSelecionar={() => onSelecionar({ tipo: 'produto', id: p.id })}
                          />
                        );
                      })}
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
