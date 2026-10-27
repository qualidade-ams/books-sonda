// Aba Ordem de Organizar Menu: a árvore do menu arrastável (dnd-kit). O arrasto vertical escolhe a
// posição e o horizontal, o nível; pelo teclado, espaço para pegar, setas para mover e espaço para
// soltar. As regras ficam em utils/organizarMenuTela.
import { useMemo, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { iconeDoMenu } from '@/components/admin/iconesMenu';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { RECUO, achatar, projetar, soltar, type Linha } from '@/utils/organizarMenuTela';
import type { NoMenu } from '@/types/menuOrganizado';

function Alca({ rotulo, ...props }: { rotulo: string } & ComponentPropsWithoutRef<'button'>) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      {...props}
      aria-label={t('organizarMenu.ordem.reordenar', { rotulo })}
      title={t('organizarMenu.ordem.arraste')}
      className="grid h-9 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus active:cursor-grabbing"
    >
      <GripVertical className="h-4 w-4" aria-hidden />
    </button>
  );
}

function CorpoLinha({
  linha,
  nivel,
  alca,
  selo,
  destino,
  flutuando,
}: {
  linha: Linha;
  nivel: 0 | 1;
  alca?: ReactNode;
  selo?: boolean;
  /** Enquanto arrasta: para onde a linha vai */
  destino?: string;
  flutuando?: boolean;
}) {
  const { t } = useTranslation();
  const Icone = iconeDoMenu(linha.no.icone);
  const primeiroNivel = nivel === 0;
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2',
        primeiroNivel
          ? 'min-h-14 rounded-xl border border-ds-border bg-ds-bg-surface py-1.5'
          : 'min-h-11 rounded-lg',
        selo && 'bg-ds-accent-subtle/40',
        flutuando &&
          'border border-ds-border-strong bg-ds-bg-raised shadow-[0_12px_32px_-8px_rgba(0,0,0,0.4)]'
      )}
    >
      {alca}
      {primeiroNivel ? (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ds-bg-subtle text-ds-fg-secondary">
          <Icone className="h-4 w-4" aria-hidden />
        </span>
      ) : (
        <Icone className="h-4 w-4 shrink-0 text-ds-fg-muted" aria-hidden />
      )}
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm', primeiroNivel && 'font-semibold')}>
          {t(linha.no.rotuloI18n)}
        </span>
        {linha.tipo === 'menu' && (
          <span
            className={cn('block text-xs', linha.total ? 'text-ds-fg-muted' : 'text-ds-warning-fg')}
          >
            {linha.total
              ? plural(t, 'organizarMenu.ordem.telas', linha.total)
              : t('organizarMenu.ordem.semTelas')}
          </span>
        )}
      </span>
      {destino && <StatusBadge tom="info">{destino}</StatusBadge>}
      {selo && !destino && <StatusBadge tom="info">{t('organizarMenu.ordem.movido')}</StatusBadge>}
    </div>
  );
}

function LinhaOrdenavel({
  linha,
  nivel,
  primeira,
  selo,
  podeEditar,
}: {
  linha: Linha;
  nivel: 0 | 1;
  primeira: boolean;
  selo: boolean;
  podeEditar: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: linha.id,
    disabled: !podeEditar,
  });
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        marginLeft: nivel * RECUO,
      }}
      className={cn(
        // A tela dentro do menu tem a linha-guia à esquerda
        nivel === 0 ? !primeira && 'mt-3' : 'border-l border-ds-border pl-2',
        // O lugar de onde saiu fica marcado, na posição e no nível em que vai cair
        isDragging && 'opacity-40'
      )}
    >
      <CorpoLinha
        linha={linha}
        nivel={nivel}
        selo={selo}
        alca={podeEditar && <Alca rotulo={t(linha.no.rotuloI18n)} {...attributes} {...listeners} />}
      />
    </li>
  );
}

export function OrdemDoMenu({
  arvore,
  movidos,
  podeEditar,
  onMover,
}: {
  arvore: NoMenu[];
  /** Itens arrastados que mudaram de lugar em relação ao salvo: ganham o selo */
  movidos: Set<string>;
  podeEditar: boolean;
  onMover: (arvore: NoMenu[], chave: string) => void;
}) {
  const { t } = useTranslation();
  const [ativo, setAtivo] = useState<Linha | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [deslocamento, setDeslocamento] = useState(0);
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const linhas = useMemo(() => achatar(arvore, ativo?.tipo === 'menu'), [arvore, ativo]);
  const projecao = ativo && sobre ? projetar(linhas, ativo.id, sobre, deslocamento) : null;
  const destino = projecao?.pai
    ? projecao.pai.tipo === 'tela'
      ? t('organizarMenu.ordem.destinoNovoMenu', { nome: t(projecao.pai.no.rotuloI18n) })
      : t('organizarMenu.ordem.destinoEm', { nome: t(projecao.pai.no.rotuloI18n) })
    : ativo?.tipo === 'tela' && projecao
      ? t('organizarMenu.ordem.primeiroNivel')
      : undefined;

  const limpar = () => {
    setAtivo(null);
    setSobre(null);
    setDeslocamento(0);
  };
  const comecar = ({ active }: DragStartEvent) => {
    setAtivo(linhas.find((l) => l.id === active.id) ?? null);
    setSobre(`${active.id}`);
  };
  const terminar = ({ active, over }: DragEndEvent) => {
    const chave = `${active.id}`;
    if (over) onMover(soltar(arvore, chave, `${over.id}`, deslocamento), chave);
    limpar();
  };

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={comecar}
      onDragMove={({ delta }) => setDeslocamento(delta.x)}
      onDragOver={({ over }) => setSobre(over ? `${over.id}` : null)}
      onDragEnd={terminar}
      onDragCancel={limpar}
    >
      <SortableContext items={linhas.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-0.5 p-3" aria-label={t('organizarMenu.ordem.lista')}>
          {linhas.map((l, i) => (
            <LinhaOrdenavel
              key={l.id}
              linha={l}
              // A linha arrastada mostra o nível em que vai cair
              nivel={l.id === ativo?.id && projecao ? projecao.nivel : l.nivel}
              primeira={i === 0}
              selo={movidos.has(l.id)}
              podeEditar={podeEditar}
            />
          ))}
        </ul>
      </SortableContext>
      {/* Portal: a seção tem animação com transform, que prenderia o fixed do overlay */}
      {createPortal(
        <div data-ds="v2" className="font-ds-sans text-ds-fg">
          <DragOverlay>
            {ativo && (
              <CorpoLinha
                linha={ativo}
                nivel={0}
                destino={destino}
                flutuando
                alca={<Alca rotulo={t(ativo.no.rotuloI18n)} tabIndex={-1} />}
              />
            )}
          </DragOverlay>
        </div>,
        document.body
      )}
    </DndContext>
  );
}
