// Classes compartilhadas pelos formulários dos protótipos do DS v2.

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
