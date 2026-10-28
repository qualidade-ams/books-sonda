// Classes compartilhadas pelos formulários e pela faixa do topo das telas do DS v2.

/** Campo de texto: 44 px e 16 px no celular (sem zoom do iOS), 36 px e 14 px a partir de md */
export const campo =
  'h-11 w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 text-base text-ds-fg placeholder:text-ds-fg-muted ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:border-ds-border disabled:bg-ds-bg-subtle disabled:text-ds-fg-disabled md:h-9 md:text-sm';

/** Área de texto com a mesma aparência do campo */
export const areaTexto =
  'w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 py-2 text-base text-ds-fg placeholder:text-ds-fg-muted ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:text-sm';

/** Item do menu suspenso "⋯" */
export const itemMenu =
  'flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition focus:bg-ds-bg-subtle md:h-9';

/** Vidro sobre a faixa escura do topo */
export const vidro = 'border border-white/15 bg-white/[0.06] backdrop-blur-md';

/** Botão secundário sobre a faixa do topo */
export const botaoVidro =
  'inline-flex h-11 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-white transition hover:bg-white/[0.14] md:h-9 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ' +
  vidro;

/** Botão principal sobre a faixa do topo */
export const botaoPrimarioTopo =
  'inline-flex h-11 items-center gap-2 rounded-lg bg-[#00D4E8] px-3.5 text-sm font-semibold text-black shadow-[0_6px_24px_rgba(0,212,232,0.35)] transition hover:-translate-y-px hover:bg-[#33DDED] hover:shadow-[0_10px_30px_rgba(0,212,232,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:h-9';

/**
 * Faixa fixa das abas (SegmentedTabs) no alto da lista. O fundo é o mesmo do AdminLayout,
 * que é o que aparece atrás da tela: bg-ds-bg-page só existe dentro do DsPage e pintaria
 * a faixa de outra cor.
 */
export const faixaDasAbas = 'sticky top-0 z-[5] -mx-1 bg-gray-50 px-1 py-1.5 dark:bg-sonda-black';
