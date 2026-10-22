// Protótipo da tela Organizar Menu (pedidos de 22/10/2026): ordem dos menus e das telas do menu
// lateral, mudada arrastando, e as cores do menu em cada tema.
// Ordem: a tela pode ir para outro menu ou ficar solta no primeiro nível, como o Dashboard; uma tela
// solta também recebe telas e vira menu. A lista é uma árvore achatada (padrão "sortable tree" do
// dnd-kit): o arrasto vertical escolhe a posição e o horizontal escolhe o nível.
// Cores: fundo e texto do menu, dos itens, dos subitens, do hover e do selecionado, e o logo, por
// tema. A aba de tema troca o tema da página. Salvas, valem para o menu de todos os protótipos, e o
// selecionado vira o destaque do sistema (compartilhado/aparencia.ts).
// A ordem e as cores são as mesmas para todos os usuários. Segue o padrão de salvar de Ramos: tudo
// fica pendente até Salvar, na barra do rodapé. O menu em pílula à esquerda mostra o que está salvo.
// Dados fictícios (mocks/organizarMenu.ts). Sem Supabase.
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ChevronDown,
  GripVertical,
  ListOrdered,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
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
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2 } from './compartilhado/shell';
import {
  contraste,
  gravarAparencia,
  hexValido,
  lerAparencia,
  paraPilula,
  textoSobre,
  useTemaDaPagina,
  type CoresPilula,
  type Tema,
} from './compartilhado/aparencia';
import { DicasContext } from './compartilhado/dicas';
import { campo } from './compartilhado/estilos';
import {
  BarraRodape,
  ChavePrototipo,
  ChavesPrototipo,
  DicaDoRotulo,
  TituloFaixa,
} from './compartilhado/formulario';
import {
  CORES_PADRAO_MOCK,
  MENU_PADRAO_MOCK,
  ULTIMA_ALTERACAO_MOCK,
  type CoresMenuMock,
  type ItemMenuMock,
} from './mocks/organizarMenu';

const DICAS: Record<string, string> = {
  'Ordem do menu':
    'Arraste para mudar a ordem. Para levar uma tela a outro menu, arraste-a para dentro dele. Para deixá-la solta no primeiro nível, como o Dashboard, arraste-a para a esquerda; para colocá-la no item acima, para a direita. Uma tela solta que recebe outra vira menu. A ordem vale para todos os usuários, e cada um vê só as telas que a permissão libera. Menu sem telas não aparece. As alterações só valem depois de salvar.',
  Menu: 'Fundo da barra do menu lateral e texto do botão Recolher.',
  Itens: 'Itens do primeiro nível: os menus e as telas soltas, como o Dashboard.',
  Subitens: 'Telas dentro de um menu, quando ele está aberto.',
  'Ao passar o mouse': 'Item ou subitem quando o mouse passa sobre ele.',
  'Item selecionado':
    'Tela aberta no momento. Depois de salva, esta cor vira o destaque do sistema neste tema: título da faixa, avatar, botões principais, abas e foco. Onde o destaque vira texto sobre a página ou a faixa, o tom é clareado ou escurecido até ter contraste.',
  Logo: 'Aparece no topo do menu. Aberto: até 20 px de altura. Recolhido: espaço quadrado de 24 px, para o símbolo da marca. PNG, SVG, WebP ou JPG, com fundo transparente, até 500 KB. Sem imagem própria, fica o logo da Sonda, em preto ou branco conforme o fundo.',
};

/** Recuo de cada nível; também é o quanto arrastar na horizontal para trocar de nível */
const RECUO = 32;
/** A tela em que se está: na prévia, aparece selecionada */
const TELA_ATUAL = '/admin/organizar-menu';
/** Menu criado ao soltar uma tela dentro de outra tela solta */
const PREFIXO_NOVO_MENU = 'menu:';

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
const lista = (nomes: string[]) =>
  nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
const estrutura = (m: ItemMenuMock[]) =>
  m.map((i) => `${i.chave}:${(i.telas ?? []).map((t) => t.chave).join(',')}`).join('/');
const mesmasCores = (a: CoresMenuMock, b: CoresMenuMock) => JSON.stringify(a) === JSON.stringify(b);

/** Cores do item por variável CSS, para o hover funcionar junto com o fundo escolhido */
const varsItem = (fundo: string, texto: string, c: CoresPilula) =>
  ({
    '--item': fundo,
    '--item-texto': texto,
    '--hover': c.hover,
    '--hover-texto': c.hoverTexto,
  }) as CSSProperties;
const classeItem =
  'bg-[var(--item)] text-[var(--item-texto)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--hover-texto)]';

/* ------------------------------------------------------------------ */
/* Árvore achatada                                                      */
/* ------------------------------------------------------------------ */

interface Linha {
  id: string;
  tipo: 'menu' | 'tela';
  /** 0: primeiro nível; 1: tela dentro de um menu */
  nivel: 0 | 1;
  rotulo: string;
  icone: LucideIcon;
  /** Telas do menu */
  total?: number;
}

/** Arrastando um menu, as telas somem: ele só troca de lugar com o primeiro nível */
function achatar(menu: ItemMenuMock[], soPrimeiroNivel: boolean): Linha[] {
  return menu.flatMap((i) => {
    const linha: Linha = {
      id: i.chave,
      tipo: i.telas ? 'menu' : 'tela',
      nivel: 0,
      rotulo: i.rotulo,
      icone: i.icone,
      total: i.telas?.length,
    };
    if (!i.telas || soPrimeiroNivel) return [linha];
    return [linha, ...i.telas.map<Linha>((t) => ({ ...t, id: t.chave, tipo: 'tela', nivel: 1 }))];
  });
}

/**
 * A tela de nível 1 pertence ao item mais próximo acima dela. Se esse item é uma tela solta, ela
 * vira um menu com o mesmo nome, e a própria tela passa a ser a primeira dele. Se esse menu volta a
 * ter só a tela de origem, ela volta a ser solta.
 */
function montar(linhas: Linha[]): ItemMenuMock[] {
  const menu: ItemMenuMock[] = [];
  for (const l of linhas) {
    const item = { chave: l.id, rotulo: l.rotulo, icone: l.icone };
    const ultimo = menu[menu.length - 1];
    if (l.tipo === 'menu') menu.push({ ...item, telas: [] });
    else if (l.nivel === 0 || !ultimo) menu.push(item);
    else if (ultimo.telas) ultimo.telas.push(item);
    else
      menu[menu.length - 1] = {
        ...ultimo,
        chave: `${PREFIXO_NOVO_MENU}${ultimo.chave}`,
        telas: [{ chave: ultimo.chave, rotulo: ultimo.rotulo, icone: ultimo.icone }, item],
      };
  }
  return menu.map((g) =>
    g.chave.startsWith(PREFIXO_NOVO_MENU) &&
    g.telas?.length === 1 &&
    `${PREFIXO_NOVO_MENU}${g.telas[0].chave}` === g.chave
      ? g.telas[0]
      : g
  );
}

/** Nível em que a linha arrastada cai, pela posição e pelo deslocamento horizontal */
function projetar(linhas: Linha[], ativo: string, sobre: string, deslocamento: number) {
  const de = linhas.findIndex((l) => l.id === ativo);
  const para = linhas.findIndex((l) => l.id === sobre);
  const movidas = arrayMove(linhas, de, para);
  const linha = movidas[para];
  if (linha.tipo === 'menu') return { nivel: 0 as const, pai: null };
  const anterior = movidas[para - 1];
  const seguinte = movidas[para + 1];
  // Dentro de menu (ou junto das telas de um menu) entra direto; numa tela solta, só arrastando
  // para a direita, senão quem só quer deixar a tela ao lado dela criaria um menu sem querer
  const maximo = !anterior
    ? 0
    : anterior.tipo === 'menu' || anterior.nivel === 1
      ? 1
      : deslocamento >= RECUO / 2
        ? 1
        : 0;
  // Não separa um menu das suas telas
  const minimo = seguinte?.nivel === 1 ? 1 : 0;
  const desejado = linha.nivel + Math.round(deslocamento / RECUO);
  const nivel = Math.min(maximo, Math.max(minimo, desejado)) as 0 | 1;
  const pai =
    nivel === 1
      ? (movidas
          .slice(0, para)
          .reverse()
          .find((l) => l.nivel === 0) ?? null)
      : null;
  return { nivel, pai };
}

/* ------------------------------------------------------------------ */
/* Linha da ordem                                                       */
/* ------------------------------------------------------------------ */

function Alca({ rotulo, ...props }: { rotulo: string } & ComponentPropsWithoutRef<'button'>) {
  return (
    // Pelo teclado: espaço para pegar, setas para mover, espaço para soltar
    <button
      type="button"
      {...props}
      aria-label={`Reordenar ${rotulo}`}
      title="Arraste para mudar a ordem ou o menu"
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
  const Icone = linha.icone;
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
          {linha.rotulo}
        </span>
        {linha.tipo === 'menu' && (
          <span
            className={cn('block text-xs', linha.total ? 'text-ds-fg-muted' : 'text-ds-warning-fg')}
          >
            {linha.total ? plural(linha.total, 'tela', 'telas') : 'Sem telas: não aparece no menu'}
          </span>
        )}
      </span>
      {destino && <StatusBadge tom="info">{destino}</StatusBadge>}
      {selo && !destino && (
        <StatusBadge tom="info">{linha.tipo === 'menu' ? 'Movido' : 'Movida'}</StatusBadge>
      )}
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
        alca={podeEditar && <Alca rotulo={linha.rotulo} {...attributes} {...listeners} />}
      />
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Cores                                                                */
/* ------------------------------------------------------------------ */

type CampoDeCor = 'menu' | 'item' | 'subitem' | 'hover' | 'selecionado';
type CampoDeLogo = 'logo' | 'logoRecolhido';

const CAMPOS_COR: [CampoDeCor, string][] = [
  ['menu', 'Menu'],
  ['item', 'Itens'],
  ['subitem', 'Subitens'],
  ['hover', 'Ao passar o mouse'],
  ['selecionado', 'Item selecionado'],
];

/** Fundo ou texto da parte mudou em relação ao salvo */
const corMudou = (a: CoresMenuMock, b: CoresMenuMock, k: CampoDeCor) =>
  a[k] !== b[k] || a[`${k}Texto`] !== b[`${k}Texto`];

const CAMPOS_LOGO: [CampoDeLogo, string][] = [
  ['logo', 'Menu aberto'],
  ['logoRecolhido', 'Menu recolhido'],
];

/** Sem logo próprio, o da Sonda, em preto ou branco conforme o fundo */
const LOGO_PADRAO: Record<CampoDeLogo, string> = {
  logo: '/images/logo-sonda.png',
  logoRecolhido: '/images/n-sonda-azul.png',
};
const LOGO_TIPOS = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
const LOGO_TAMANHO_MAXIMO = 500 * 1024;

/** Logo próprio aparece como foi enviado; o padrão fica preto ou branco conforme o fundo */
function ImagemLogo({
  src,
  padrao,
  fundo,
  className,
}: {
  src?: string;
  padrao: string;
  fundo: string;
  className?: string;
}) {
  return (
    <img
      src={src ?? padrao}
      alt="Logo do menu"
      className={cn(
        'w-auto object-contain',
        !src && 'brightness-0',
        !src && textoSobre(fundo) === '#FFFFFF' && 'invert',
        className
      )}
    />
  );
}

function CampoLogo({
  rotulo,
  valor,
  padrao,
  fundo,
  quadrado,
  podeEditar,
  onChange,
}: {
  rotulo: string;
  valor?: string;
  padrao: string;
  fundo: string;
  /** Menu recolhido: espaço quadrado de 24 px */
  quadrado?: boolean;
  podeEditar: boolean;
  onChange: (logo: string | undefined) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const id = `logo-${rotulo.replace(/\s+/g, '-').toLowerCase()}`;

  const enviar = (arquivo?: File) => {
    if (!arquivo) return;
    if (!LOGO_TIPOS.includes(arquivo.type)) return setErro('Use PNG, SVG, WebP ou JPG.');
    if (arquivo.size > LOGO_TAMANHO_MAXIMO) return setErro('A imagem passa de 500 KB.');
    setErro(null);
    // No protótipo a imagem fica só na memória; na tela real, vai para o Storage
    const leitor = new FileReader();
    leitor.onload = () => onChange(`${leitor.result}`);
    leitor.readAsDataURL(arquivo);
  };

  return (
    <div className="min-w-0">
      <p className="text-xs text-ds-fg-muted">{rotulo}</p>
      {/* O logo sobre o fundo do menu, como vai aparecer */}
      <div
        className="mt-1 grid h-14 place-items-center rounded-md px-2 ring-1 ring-ds-border-strong"
        style={{ background: fundo }}
      >
        <ImagemLogo
          src={valor}
          padrao={padrao}
          fundo={fundo}
          className={quadrado ? 'h-6 max-w-6' : 'h-5 max-w-full'}
        />
      </div>
      {podeEditar && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <label
            htmlFor={id}
            className="cursor-pointer text-xs font-medium text-ds-fg-accent hover:underline focus-within:underline"
          >
            Enviar imagem
            <input
              id={id}
              type="file"
              aria-label={`Enviar logo do ${rotulo.toLowerCase()}`}
              accept={LOGO_TIPOS.join(',')}
              className="sr-only"
              onChange={(e) => {
                enviar(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {valor && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs font-medium text-ds-fg-secondary hover:underline"
            >
              Usar o padrão
            </button>
          )}
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-ds-danger-fg">{erro}</p>}
    </div>
  );
}

const SUGESTOES: Record<'claro' | 'escuro', string[]> = {
  claro: ['#FAFBFC', '#FFFFFF', '#EEF1F4', '#2563EB', '#1D4ED8', '#00D4E8'],
  escuro: ['#1C1C1C', '#121212', '#262626', '#00D4E8', '#2563EB', '#0D2B2E'],
};

/** Quadrado da cor (abre o seletor do navegador) e o código; a cor só muda com o código completo */
function CampoHex({
  rotulo,
  parte,
  valor,
  podeEditar,
  onChange,
}: {
  rotulo: string;
  parte: 'Fundo' | 'Texto';
  valor: string;
  podeEditar: boolean;
  onChange: (cor: string) => void;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  const invalido = !hexValido(texto);
  return (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-xs text-ds-fg-muted">{parte}</span>
      <span
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-ds-border-strong"
        style={{ background: valor }}
      >
        {podeEditar && (
          <input
            type="color"
            aria-label={`Escolher ${parte.toLowerCase()}: ${rotulo}`}
            value={valor.toLowerCase()}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        )}
      </span>
      <input
        aria-label={`${parte}: ${rotulo}`}
        value={texto}
        readOnly={!podeEditar}
        maxLength={7}
        onChange={(e) => {
          const v = `#${e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6)}`.toUpperCase();
          setTexto(v);
          if (hexValido(v)) onChange(v);
        }}
        onBlur={() => setTexto(valor)}
        aria-invalid={invalido}
        className={cn(campo, 'w-28 font-mono uppercase', invalido && 'border-ds-danger-fg')}
      />
    </div>
  );
}

function CampoCor({
  rotulo,
  fundo,
  texto,
  sugestoes,
  podeEditar,
  alterada,
  onFundo,
  onTexto,
}: {
  rotulo: string;
  fundo: string;
  texto: string;
  /** Sugestões para o fundo */
  sugestoes: string[];
  podeEditar: boolean;
  alterada: boolean;
  onFundo: (cor: string) => void;
  onTexto: (cor: string) => void;
}) {
  const razao = contraste(fundo, texto);

  return (
    <div
      className={cn('rounded-lg border border-ds-border p-3', alterada && 'bg-ds-accent-subtle/40')}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{rotulo}</span>
        <DicaDoRotulo rotulo={rotulo} />
        {alterada && (
          <StatusBadge tom="info" className="ml-auto">
            Alterada
          </StatusBadge>
        )}
      </div>
      <div className="mt-2 flex items-start gap-3">
        <div className="space-y-2">
          <CampoHex
            rotulo={rotulo}
            parte="Fundo"
            valor={fundo}
            podeEditar={podeEditar}
            onChange={onFundo}
          />
          <CampoHex
            rotulo={rotulo}
            parte="Texto"
            valor={texto}
            podeEditar={podeEditar}
            onChange={onTexto}
          />
        </div>
        {/* Amostra do texto sobre o fundo */}
        <span
          aria-hidden
          className="ml-auto hidden h-[80px] min-w-0 flex-1 place-items-center rounded-md text-sm font-medium ring-1 ring-ds-border xl:grid"
          style={{ background: fundo, color: texto }}
        >
          Aa
        </span>
      </div>
      {razao < 4.5 && (
        <p
          className="mt-2 inline-flex items-center gap-1 text-xs text-ds-warning-fg"
          title="O texto fica difícil de ler: aumente a diferença entre o fundo e o texto"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Contraste {razao.toFixed(1).replace('.', ',')}:1, abaixo de 4,5:1
        </p>
      )}
      {podeEditar && (
        <div
          className="mt-2 flex flex-wrap gap-1.5 pl-[52px]"
          role="group"
          aria-label={`Sugestões de fundo: ${rotulo}`}
        >
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onFundo(s)}
              aria-label={s}
              aria-pressed={s === fundo}
              title={s}
              className={cn(
                'h-6 w-6 rounded-md ring-1 ring-ds-border-strong transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
                s === fundo && 'ring-2 ring-ds-focus ring-offset-2 ring-offset-ds-bg-surface'
              )}
              style={{ background: s }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Como o menu lateral fica com a ordem e as cores do rascunho */
function PreviaMenu({ menu, cores }: { menu: ItemMenuMock[]; cores: CoresMenuMock }) {
  const c = paraPilula(cores);
  const subitemTexto = cores.subitemTexto;
  const selecionado = {
    background: c.selecionado,
    color: c.selecionadoTexto,
    boxShadow: `0 6px 14px ${c.selecionado}66`,
  };
  return (
    // No formato do menu em pílula do DS v2
    <div
      className="rounded-3xl px-3 py-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5 dark:ring-white/10"
      style={{ background: c.fundo, color: c.texto }}
    >
      <div className="mb-4 flex h-8 items-center justify-center">
        <ImagemLogo
          src={cores.logo}
          padrao={LOGO_PADRAO.logo}
          fundo={cores.menu}
          className="h-5 max-w-[180px]"
        />
      </div>
      <ul className="space-y-1">
        {menu
          .filter((i) => !i.telas || i.telas.length > 0)
          .map((i) => {
            const Icone = i.icone;
            const aberto = i.telas?.some((t) => t.chave === TELA_ATUAL);
            return (
              <li key={i.chave}>
                <div
                  className={cn(
                    'flex h-9 items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium',
                    i.chave !== TELA_ATUAL && classeItem
                  )}
                  style={i.chave === TELA_ATUAL ? selecionado : varsItem(c.item, c.itemTexto, c)}
                >
                  <Icone className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{i.rotulo}</span>
                  {i.telas && (
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 shrink-0 opacity-70', aberto && 'rotate-180')}
                      aria-hidden
                    />
                  )}
                </div>
                {aberto && (
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {i.telas.map((t) => {
                      const IconeTela = t.icone;
                      return (
                        <li
                          key={t.chave}
                          className={cn(
                            'flex h-8 items-center gap-2 rounded-lg px-2.5 text-[13px]',
                            t.chave !== TELA_ATUAL && classeItem
                          )}
                          style={
                            t.chave === TELA_ATUAL
                              ? selecionado
                              : varsItem(cores.subitem, subitemTexto, c)
                          }
                        >
                          <IconeTela className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{t.rotulo}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function OrganizarMenu({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [aba, setAba] = useState<'ordem' | 'cores'>('ordem');
  // A aba de tema é o próprio tema da página: trocar uma troca a outra
  const [tema, setTema] = useTemaDaPagina();
  /** O que está gravado; `menu` e `cores` são o rascunho */
  const [salvos, setSalvos] = useState(MENU_PADRAO_MOCK);
  const [menu, setMenu] = useState(MENU_PADRAO_MOCK);
  const [coresSalvas, setCoresSalvas] = useState(lerAparencia);
  const [cores, setCores] = useState(lerAparencia);
  /** Itens que o usuário mexeu: só eles ganham o selo, não os que andaram uma casa por tabela */
  const [arrastados, setArrastados] = useState<Set<string>>(new Set());
  const [ativo, setAtivo] = useState<Linha | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const [deslocamento, setDeslocamento] = useState(0);
  const [ultima, setUltima] = useState(ULTIMA_ALTERACAO_MOCK);
  const [confirmar, setConfirmar] = useState(false);
  const podeEditar = perfil === 'edicao';
  const corAlterada = (t: Tema, k: CampoDeCor) => corMudou(cores[t], coresSalvas[t], k);
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itens = useMemo(() => (estado === 'vazio' ? [] : menu), [estado, menu]);
  const linhas = useMemo(() => achatar(itens, ativo?.tipo === 'menu'), [itens, ativo]);
  const projecao = ativo && sobre ? projetar(linhas, ativo.id, sobre, deslocamento) : null;

  // Onde cada item está: menu (ou primeiro nível) e posição
  const posicoes = (m: ItemMenuMock[]) => {
    const p = new Map<string, { pai: string; i: number }>();
    m.forEach((g, i) => {
      p.set(g.chave, { pai: '', i });
      g.telas?.forEach((t, j) => p.set(t.chave, { pai: g.chave, i: j }));
    });
    return p;
  };
  const posSalvas = useMemo(() => posicoes(salvos), [salvos]);
  const posAtuais = useMemo(() => posicoes(menu), [menu]);
  const movido = (chave: string) => {
    const a = posAtuais.get(chave);
    const s = posSalvas.get(chave);
    return arrastados.has(chave) && (a?.pai !== s?.pai || a?.i !== s?.i);
  };

  const mudancas = useMemo(() => {
    const textos: string[] = [];
    const ehMenu = (k: string) => menu.some((g) => g.chave === k && g.telas);
    const telas = [...posAtuais.keys()].filter((k) => !ehMenu(k));
    const trocaram = telas.filter((k) => posAtuais.get(k)?.pai !== posSalvas.get(k)?.pai);
    const novos = menu.filter((g) => g.telas && !posSalvas.has(g.chave)).map((g) => g.rotulo);
    // Ordem relativa entre os que estavam juntos antes e continuam juntos
    const ordem = (pai: string, de: Map<string, { pai: string; i: number }>) =>
      [...de.entries()]
        .filter(([k, v]) => v.pai === pai && posSalvas.get(k)?.pai === posAtuais.get(k)?.pai)
        .sort((a, b) => a[1].i - b[1].i)
        .map(([k]) => k)
        .join('|');
    if (ordem('', posAtuais) !== ordem('', posSalvas)) textos.push('ordem dos menus alterada');
    if (novos.length) textos.push(`${plural(novos.length, 'menu criado', 'menus criados')}`);
    if (trocaram.length)
      textos.push(`${plural(trocaram.length, 'tela mudou', 'telas mudaram')} de lugar no menu`);
    const reordenados = menu
      .filter((g) => g.telas && ordem(g.chave, posAtuais) !== ordem(g.chave, posSalvas))
      .map((g) => g.rotulo);
    if (reordenados.length) textos.push(`ordem das telas alterada em ${lista(reordenados)}`);
    const doTema = (temas: string[]) =>
      temas.length > 1 ? 'tema claro e do escuro' : `tema ${temas[0]}`;
    const temasCores = (['claro', 'escuro'] as const).filter((t) =>
      CAMPOS_COR.some(([k]) => corMudou(cores[t], coresSalvas[t], k))
    );
    const temasLogo = (['claro', 'escuro'] as const).filter((t) =>
      CAMPOS_LOGO.some(([k]) => cores[t][k] !== coresSalvas[t][k])
    );
    if (temasCores.length) textos.push(`cores do ${doTema(temasCores)} alteradas`);
    if (temasLogo.length) textos.push(`logo do ${doTema(temasLogo)} alterado`);
    return textos.join(', ').replace(/^./, (c) => c.toUpperCase());
  }, [menu, posAtuais, posSalvas, cores, coresSalvas]);
  const naOrdemPadrao = estrutura(menu) === estrutura(MENU_PADRAO_MOCK);
  const nasCoresPadrao = mesmasCores(cores[tema], CORES_PADRAO_MOCK[tema]);
  const vazios = menu.filter((g) => g.telas && !g.telas.length).map((g) => g.rotulo);

  const limparArrasto = () => {
    setAtivo(null);
    setSobre(null);
    setDeslocamento(0);
  };
  const comecar = ({ active }: DragStartEvent) => {
    setAtivo(linhas.find((l) => l.id === active.id) ?? null);
    setSobre(`${active.id}`);
  };
  const soltar = ({ active, over }: DragEndEvent) => {
    const id = `${active.id}`;
    if (over && ativo) {
      if (ativo.tipo === 'menu') {
        setMenu((m) =>
          arrayMove(
            m,
            m.findIndex((g) => g.chave === id),
            m.findIndex((g) => g.chave === over.id)
          )
        );
      } else {
        const de = linhas.findIndex((l) => l.id === id);
        const para = linhas.findIndex((l) => l.id === over.id);
        const movidas = arrayMove(linhas, de, para);
        movidas[para] = { ...movidas[para], nivel: projecao?.nivel ?? movidas[para].nivel };
        setMenu(montar(movidas));
      }
      setArrastados((a) => new Set([...a, id]));
    }
    limparArrasto();
  };
  const restaurarOrdem = () => {
    setMenu(MENU_PADRAO_MOCK);
    setArrastados(new Set(posicoes(MENU_PADRAO_MOCK).keys()));
  };
  const descartar = () => {
    setMenu(salvos);
    setCores(coresSalvas);
    setArrastados(new Set());
  };

  const destino = projecao?.pai
    ? projecao.pai.tipo === 'tela'
      ? `Novo menu ${projecao.pai.rotulo}`
      : `Em ${projecao.pai.rotulo}`
    : ativo?.tipo === 'tela' && projecao
      ? 'Primeiro nível'
      : undefined;

  const conteudoOrdem =
    itens.length === 0 ? (
      <EmptyState
        icone={<ListOrdered />}
        titulo="Nenhuma tela no menu"
        descricao="As telas aparecem aqui depois de registradas no sistema."
      />
    ) : (
      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={comecar}
        onDragMove={({ delta }) => setDeslocamento(delta.x)}
        onDragOver={({ over }) => setSobre(over ? `${over.id}` : null)}
        onDragEnd={soltar}
        onDragCancel={limparArrasto}
      >
        <SortableContext items={linhas.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5 p-3" aria-label="Itens do menu">
            {linhas.map((l, i) => (
              <LinhaOrdenavel
                key={l.id}
                linha={l}
                // A linha arrastada mostra o nível em que vai cair
                nivel={l.id === ativo?.id && projecao ? projecao.nivel : l.nivel}
                primeira={i === 0}
                selo={movido(l.id)}
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
                  alca={<Alca rotulo={ativo.rotulo} tabIndex={-1} />}
                />
              )}
            </DragOverlay>
          </div>,
          document.body
        )}
      </DndContext>
    );

  const comPrevia = aba === 'cores' && estado === 'dados';
  const alterar = (campo: keyof CoresMenuMock, valor: string | undefined) =>
    setCores((c) => ({ ...c, [tema]: { ...c[tema], [campo]: valor } }));
  const conteudoCores = (
    <div className="space-y-4 p-4 md:p-5">
      <SegmentedTabs
        rotulo="Tema"
        itens={[
          { valor: 'claro', rotulo: 'Tema claro' },
          { valor: 'escuro', rotulo: 'Tema escuro' },
        ]}
        valor={tema}
        onChange={(v) => setTema(v as Tema)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS_COR.map(([campoCor, rotulo]) => (
          <CampoCor
            key={`${tema}-${campoCor}`}
            rotulo={rotulo}
            fundo={cores[tema][campoCor]}
            texto={cores[tema][`${campoCor}Texto`]}
            sugestoes={SUGESTOES[tema]}
            podeEditar={podeEditar}
            alterada={corAlterada(tema, campoCor)}
            onFundo={(cor) => alterar(campoCor, cor)}
            onTexto={(cor) => alterar(`${campoCor}Texto`, cor)}
          />
        ))}
        <div
          className={cn(
            'rounded-lg border border-ds-border p-3',
            (cores[tema].logo !== coresSalvas[tema].logo ||
              cores[tema].logoRecolhido !== coresSalvas[tema].logoRecolhido) &&
              'bg-ds-accent-subtle/40'
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">Logo</span>
            <DicaDoRotulo rotulo="Logo" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {CAMPOS_LOGO.map(([campoLogo, rotulo]) => (
              <CampoLogo
                key={`${tema}-${campoLogo}`}
                rotulo={rotulo}
                valor={cores[tema][campoLogo]}
                padrao={LOGO_PADRAO[campoLogo]}
                fundo={cores[tema].menu}
                quadrado={campoLogo === 'logoRecolhido'}
                podeEditar={podeEditar}
                onChange={(logo) => alterar(campoLogo, logo)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Administração"
        menuExpandido={menuExpandido}
        onToggleMenu={() => setMenuExpandido((v) => !v)}
        menu={salvos.filter((i) => !i.telas || i.telas.length > 0)}
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
          {/* Mesma altura das outras telas: o espaço da linha de botões (Exportar) que esta não tem */}
          <div className="pb-40 pt-3 md:pb-[168px] md:pt-4">
            <div className="ds-surgir max-w-2xl">
              <TituloFaixa texto="Organizar Menu" />
              <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                Ordem, agrupamento e cores do menu lateral, iguais para todos os usuários.
              </p>
            </div>
          </div>
        </FaixaTopo>

        {/* Sobe sobre a faixa como os indicadores das outras telas */}
        <div className="relative -mt-16 md:-mt-20">
          {/* A prévia só aparece nas cores */}
          <div
            className={cn(
              'ds-surgir mx-auto grid items-start gap-4',
              comPrevia ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_280px]' : 'max-w-3xl'
            )}
            style={atraso(120)}
          >
            <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ds-border px-4 py-3 md:px-5">
                <span className="flex items-center gap-1.5">
                  <SegmentedTabs
                    rotulo="Seções"
                    itens={[
                      { valor: 'ordem', rotulo: 'Ordem' },
                      { valor: 'cores', rotulo: 'Cores' },
                    ]}
                    valor={aba}
                    onChange={(v) => setAba(v as 'ordem' | 'cores')}
                  />
                  {aba === 'ordem' && <DicaDoRotulo rotulo="Ordem do menu" />}
                </span>
                <span className="ml-auto text-xs text-ds-fg-muted">
                  Alterado em {ultima.em} por {ultima.por}
                </span>
                {podeEditar && itens.length > 0 && estado === 'dados' && (
                  <Button
                    tamanho="sm"
                    onClick={
                      aba === 'ordem'
                        ? restaurarOrdem
                        : () => setCores((c) => ({ ...c, [tema]: CORES_PADRAO_MOCK[tema] }))
                    }
                    disabled={aba === 'ordem' ? naOrdemPadrao : nasCoresPadrao}
                  >
                    <RotateCcw /> {aba === 'ordem' ? 'Ordem padrão' : 'Cores padrão'}
                  </Button>
                )}
              </header>

              {estado === 'erro' ? (
                <div className="space-y-3 p-4">
                  <Callout tom="danger" titulo="Não foi possível carregar o menu">
                    Verifique a conexão e tente novamente.
                  </Callout>
                  <Button>Tentar novamente</Button>
                </div>
              ) : estado === 'carregando' ? (
                <div className="space-y-2 p-3" role="status" aria-label="Carregando">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-ds-bg-subtle" />
                  ))}
                </div>
              ) : aba === 'ordem' ? (
                conteudoOrdem
              ) : (
                conteudoCores
              )}
            </section>

            {comPrevia && (
              <aside className="space-y-2 lg:sticky lg:top-16" aria-label="Prévia do menu">
                <p className="px-1 text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-muted lg:text-white/70">
                  Prévia · tema {tema}
                </p>
                <PreviaMenu menu={itens} cores={cores[tema]} />
              </aside>
            )}
          </div>
        </div>

        {podeEditar && mudancas && (
          <BarraRodape>
            <span className="text-sm text-ds-fg-secondary">
              <span className="font-medium text-ds-fg">{mudancas}</span> · ainda não salvo
            </span>
            <div className="flex gap-2">
              <Button onClick={descartar}>Descartar</Button>
              <Button variante="primario" onClick={() => setConfirmar(true)}>
                Salvar
              </Button>
            </div>
          </BarraRodape>
        )}

        <ConfirmDialog
          aberto={confirmar}
          onOpenChange={setConfirmar}
          titulo="Salvar o menu?"
          descricao={`${mudancas}.`}
          consequencias={[
            'Vale para todos os usuários; quem está com o sistema aberto vê ao recarregar a página',
            ...(vazios.length
              ? [
                  `${lista(vazios)} fica${vazios.length > 1 ? 'm' : ''} sem telas e sai${vazios.length > 1 ? 'em' : ''} do menu`,
                ]
              : []),
          ]}
          rotuloConfirmar="Salvar"
          onConfirmar={() => {
            setSalvos(menu);
            setCoresSalvas(cores);
            // Vale para o menu de todos os protótipos e para o destaque do sistema
            gravarAparencia(cores);
            setArrastados(new Set());
            setUltima({ em: '22/10/2026', por: 'Usuário Teste' });
            setConfirmar(false);
          }}
        />
      </PaginaV2>
    </DicasContext.Provider>
  );
}
