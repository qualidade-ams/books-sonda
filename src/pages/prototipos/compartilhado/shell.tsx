// Shell EXPLORATÓRIO compartilhado pelos protótipos do DS v2 (fora do glob de /prototipos):
// menu em pílula e faixa escura do topo, aprovados por enquanto no protótipo do Controle (15/10/2026).
// Desenhado só para avaliar a direção; não altera o LayoutAdmin.
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  Building2,
  Clock,
  FileText,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Speech,
  Sun,
  ThumbsUp,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export const vidro = 'border border-white/15 bg-white/[0.06] backdrop-blur-md';
export const botaoVidro = cn(
  'inline-flex h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-white transition hover:bg-white/[0.14] md:h-9',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80',
  vidro
);
export const botaoIconeTopo =
  'grid h-10 w-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80';
export const botaoPrimarioTopo =
  'inline-flex h-11 items-center gap-2 rounded-lg bg-[#00D4E8] px-3.5 text-sm font-semibold text-black shadow-[0_6px_24px_rgba(0,212,232,0.35)] transition hover:-translate-y-px hover:bg-[#33DDED] hover:shadow-[0_10px_30px_rgba(0,212,232,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-9';

/* ------------------------------------------------------------------ */
/* Menu em pílula, com logo e expansível                               */
/* ------------------------------------------------------------------ */

const MENU = [
  { icone: Home, rotulo: 'Dashboard' },
  { icone: Award, rotulo: 'Elogios' },
  { icone: FileText, rotulo: 'Books' },
  { icone: MessageSquare, rotulo: 'Pesquisas' },
  { icone: ThumbsUp, rotulo: 'Planos de ação' },
  { icone: Speech, rotulo: 'Requerimentos' },
  { icone: Clock, rotulo: 'Banco de Horas' },
  { icone: AlertTriangle, rotulo: 'Alertas' },
  { icone: Building2, rotulo: 'Empresas' },
  { icone: Settings, rotulo: 'Configurações' },
];

export function MenuPilula({
  expandido,
  onToggle,
  ativo,
}: {
  expandido: boolean;
  onToggle: () => void;
  /** Rótulo do item ativo */
  ativo: string;
}) {
  return (
    <nav
      aria-label="Menu principal"
      className={cn(
        // Acompanha o tema (decisão dos Tokens, seção 2.6): claro no claro, escuro no escuro
        'fixed left-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col rounded-r-3xl bg-ds-shell-bg py-4 text-ds-shell-fg shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-ds-shell-border transition-[width] duration-300 dark:shadow-none lg:flex',
        expandido ? 'w-56' : 'w-[60px]'
      )}
    >
      <div className="flex h-8 items-center justify-center">
        {expandido ? (
          <img
            src="/images/logo-sonda.png"
            alt="Sonda"
            className="h-5 w-auto brightness-0 dark:brightness-100"
          />
        ) : (
          <img
            src="/images/n-sonda-azul.png"
            alt="Sonda"
            className="h-6 w-auto brightness-0 dark:invert"
          />
        )}
      </div>

      <ul className={cn('mt-4 flex flex-col gap-1', expandido ? 'px-3' : 'items-center')}>
        {MENU.map(({ icone: Icone, rotulo }) => {
          const atual = rotulo === ativo;
          return (
            <li key={rotulo} className={expandido ? undefined : 'contents'}>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={expandido ? undefined : rotulo}
                title={expandido ? undefined : rotulo}
                aria-current={atual ? 'page' : undefined}
                className={cn(
                  'flex h-9 items-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4E8]',
                  expandido ? 'w-full gap-2.5 px-2.5' : 'w-9 justify-center',
                  atual
                    ? 'bg-[#00D4E8] text-black shadow-[0_6px_14px_rgba(0,212,232,0.4)]'
                    : 'text-ds-shell-fg-muted hover:bg-ds-shell-hover hover:text-ds-shell-fg'
                )}
              >
                <Icone className="h-4 w-4 shrink-0" />
                {expandido && <span className="truncate text-sm font-medium">{rotulo}</span>}
              </a>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          'mt-3 border-t border-ds-shell-border pt-3',
          expandido ? 'px-3' : 'flex justify-center'
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expandido}
          aria-label={expandido ? 'Recolher menu' : 'Expandir menu'}
          className={cn(
            'flex h-9 items-center rounded-xl text-ds-shell-fg-muted transition hover:bg-ds-shell-hover hover:text-ds-shell-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00D4E8]',
            expandido ? 'w-full gap-2.5 px-2.5' : 'w-9 justify-center'
          )}
        >
          {expandido ? (
            <PanelLeftClose className="h-4 w-4 shrink-0" />
          ) : (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          )}
          {expandido && <span className="text-sm font-medium">Recolher</span>}
        </button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Faixa escura do topo com a foto de marca; o hero vem em children    */
/* ------------------------------------------------------------------ */

export function FaixaTopo({ children }: { children: ReactNode }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const escuro = resolvedTheme === 'dark';
  return (
    // 20 px além dos cartões de cada lado (-mx-5 + px-5): os indicadores ficam flutuando sobre a faixa
    <section className="ds-faixa-topo relative -mx-4 overflow-hidden rounded-2xl bg-[var(--ds-faixa-bg)] text-white md:-mx-5">
      {/* Foto de marca à direita, fundida no fundo da faixa (public/images/login-sonda.jpg, já usada no login) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-full bg-[url('/images/login-sonda.jpg')] bg-cover bg-[center_35%] opacity-70 [mask-image:linear-gradient(to_right,transparent_5%,rgba(0,0,0,0.3)_45%,black_88%)] md:w-[72%]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(to_right,transparent_35%,black_60%,transparent_90%)]"
      />
      <div
        aria-hidden
        className="ds-flutuar pointer-events-none absolute -bottom-36 left-1/4 h-[260px] w-[260px] rounded-full bg-[#006F7D] opacity-30 blur-[90px]"
      />

      <div className="relative px-4 md:px-5">
        <header className="flex h-16 items-center justify-between gap-3">
          <button type="button" aria-label="Abrir menu" className={cn(botaoIconeTopo, 'lg:hidden')}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="hidden lg:block" aria-hidden />
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={escuro ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              className={botaoIconeTopo}
            >
              {escuro ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>
            <button type="button" aria-label="Notificações" className={botaoIconeTopo}>
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              className="flex items-center gap-3 rounded-full py-1 pl-1 pr-1 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:pl-3"
            >
              <span className="hidden text-right sm:block">
                <span className="block text-sm font-semibold leading-4">Usuário Teste</span>
                <span className="block text-xs leading-4 text-white/60">Administradores</span>
              </span>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#00D4E8] text-xs font-bold text-black">
                UT
              </span>
            </button>
            <button type="button" aria-label="Sair" className={botaoIconeTopo}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* Hero recuado 20 px em relação aos cartões (pedido em 15/10/2026) */}
        <div className="md:pl-5">{children}</div>
      </div>
    </section>
  );
}

/** Página no DS v2 com o menu em pílula; o conteúdo vem depois da faixa */
export function PaginaV2({
  menuAtivo,
  menuExpandido,
  onToggleMenu,
  children,
}: {
  menuAtivo: string;
  menuExpandido: boolean;
  onToggleMenu: () => void;
  children: ReactNode;
}) {
  return (
    <div data-ds="v2" className="min-h-screen bg-ds-bg-page font-ds-sans text-ds-fg">
      <MenuPilula expandido={menuExpandido} onToggle={onToggleMenu} ativo={menuAtivo} />
      <div
        className={cn(
          'mx-auto max-w-[1440px] px-4 py-4 pb-24 transition-[padding] duration-300 md:px-6 lg:pr-8',
          menuExpandido ? 'lg:pl-[256px]' : 'lg:pl-[92px]'
        )}
      >
        {children}
      </div>
    </div>
  );
}
