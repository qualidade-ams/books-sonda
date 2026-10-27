// Aparência do menu lateral (Modelagem_Fase3.md, seção 12.1): as cores salvas em Organizar Menu viram
// variáveis CSS do menu, e a cor do selecionado vira o destaque do sistema em cada tema, com o texto
// ajustado para contraste AA. As classes com o ciano escrito (#00D4E8) também passam a usar a cor.
import type { AparenciaMenu, TemaMenu } from '@/types/menuOrganizado';

/* Contraste (WCAG) */

const TEXTO_ESCURO = '#1B1F24';
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const paraHex = (cs: number[]) =>
  `#${cs.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const luminancia = (hex: string) =>
  rgb(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);

export const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** Branco ou grafite, o que contrastar mais com o fundo */
export const textoSobre = (fundo: string) =>
  contraste(fundo, '#FFFFFF') >= contraste(fundo, TEXTO_ESCURO) ? '#FFFFFF' : TEXTO_ESCURO;

/** O logo da Sonda é branco: sobre fundo claro ele fica escuro */
export const logoClaroSobre = (fundo: string) => textoSobre(fundo) === '#FFFFFF';

/** Mistura `cor` com `alvo` na proporção `p` (0 a 1) */
const misturar = (cor: string, alvo: string, p: number) =>
  paraHex(rgb(cor).map((c, i) => c + (rgb(alvo)[i] - c) * p));

/** Clareia ou escurece a cor até ter contraste AA sobre o fundo */
const legivelSobre = (cor: string, fundo: string) => {
  const alvo = luminancia(fundo) > 0.4 ? '#000000' : '#FFFFFF';
  for (let p = 0; p <= 1; p += 0.05) {
    const c = misturar(cor, alvo, p);
    if (contraste(c, fundo) >= 4.5) return c;
  }
  return alvo;
};

/* Variáveis e classes */

/** Fundos de cada tema (ds-v2.css), para o contraste do destaque */
const FUNDOS: Record<TemaMenu, { pagina: string; superficie: string; faixa: string }> = {
  claro: { pagina: '#ECEEF1', superficie: '#FAFBFC', faixa: '#0F1D24' },
  escuro: { pagina: '#121212', superficie: '#1C1C1C', faixa: '#000000' },
};

/** Sombras com o brilho ciano, como estão escritas nas classes */
const SOMBRAS = [
  'shadow-[0_0_0_2px_#00D4E8,0_16px_32px_rgba(0,212,232,0.18)]',
  'shadow-[0_0_0_3px_rgba(0,212,232,0.12)]',
  'shadow-[0_0_0_3px_rgba(0,212,232,0.15)]',
  'shadow-[0_0_0_3px_rgba(0,212,232,0.16),0_10px_24px_-14px_rgba(0,212,232,0.6)]',
  'shadow-[0_10px_24px_-14px_rgba(0,212,232,0.6)]',
  'shadow-[0_4px_16px_rgba(0,212,232,0.4)]',
  'shadow-[0_6px_14px_rgba(0,212,232,0.4)]',
  'shadow-[0_6px_24px_rgba(0,212,232,0.35)]',
  'shadow-[0_8px_18px_rgba(0,212,232,0.45)]',
  'shadow-[0_8px_24px_-14px_rgba(0,212,232,0.6)]',
  'hover:shadow-[0_10px_30px_rgba(0,212,232,0.45)]',
];

function cssDoTema(tema: TemaMenu, a: AparenciaMenu) {
  const escopo = tema === 'claro' ? 'html:not(.dark)' : 'html.dark';
  const f = FUNDOS[tema];
  const cor = a.selecionadoFundo;
  const sobreCor = a.selecionadoTexto;
  const texto = legivelSobre(cor, f.pagina);
  const naFaixa = legivelSobre(cor, f.faixa);
  const naFaixaClaro = misturar(naFaixa, '#FFFFFF', 0.35);
  const hover = misturar(cor, tema === 'claro' ? '#000000' : '#FFFFFF', 0.12);
  const pressionado = misturar(cor, tema === 'claro' ? '#000000' : '#FFFFFF', 0.24);
  const sutil = `color-mix(in srgb, ${cor} 14%, ${f.superficie})`;
  const [r, g, b] = rgb(cor);
  const trocar = (valor: string) =>
    valor
      .replace(/rgba\(0,212,232,/g, `rgba(${r},${g},${b},`)
      .replace(/#00D4E8/gi, cor)
      .replace(/_/g, ' ');

  /** [classe exata, regra CSS, pseudo-classe] */
  const regras: [string, string, string?][] = [
    ['bg-[#00D4E8]', `background-color: ${cor}; color: ${sobreCor};`],
    ['after:bg-[#00D4E8]', `background-color: ${cor};`, '::after'],
    ['hover:bg-[#33DDED]', `background-color: ${hover};`, ':hover'],
    ['border-[#00D4E8]', `border-color: ${cor};`],
    ['hover:border-[#00D4E8]', `border-color: ${cor};`, ':hover'],
    ['border-b-[#00D4E8]', `border-bottom-color: ${cor};`],
    ['border-l-[#00D4E8]', `border-left-color: ${cor};`],
    ['ring-[#00D4E8]', `--tw-ring-color: ${cor};`],
    ['focus-visible:ring-[#00D4E8]', `--tw-ring-color: ${cor};`, ':focus-visible'],
    ['text-[#00D4E8]', `color: ${naFaixa};`],
    ['text-[#006F7D]', `color: ${texto};`],
    ['fill-[#00D4E8]', `fill: ${cor};`],
    ['bg-[#006F7D]', `background-color: ${texto};`],
    ['from-[#00D4E8]', `--tw-gradient-from: ${naFaixa} var(--tw-gradient-from-position);`],
    ['via-[#00D4E8]', `--tw-gradient-via: ${cor} var(--tw-gradient-via-position);`],
    ['to-[#00D4E8]', `--tw-gradient-to: ${cor} var(--tw-gradient-to-position);`],
    ['to-[#7CEBF5]', `--tw-gradient-to: ${naFaixaClaro} var(--tw-gradient-to-position);`],
    ['from-[#00A9B9]', `--tw-gradient-from: ${texto} var(--tw-gradient-from-position);`],
    ['from-[#006F7D]', `--tw-gradient-from: ${texto} var(--tw-gradient-from-position);`],
    ['to-[#006F7D]', `--tw-gradient-to: ${texto} var(--tw-gradient-to-position);`],
  ];
  const sombras = SOMBRAS.map((classe) => {
    const noHover = classe.startsWith('hover:');
    const valor = classe.replace(/^hover:/, '').replace(/^shadow-\[|\]$/g, '');
    return `${escopo} [class~='${classe}']${noHover ? ':hover' : ''} { box-shadow: ${trocar(valor)}; }`;
  });

  return [
    `${escopo} [data-ds='v2'] {
      --ds-shell-bg: ${a.menuFundo};
      --ds-shell-fg: ${a.menuTexto};
      --ds-menu-item-bg: ${a.itemFundo};
      --ds-menu-item-fg: ${a.itemTexto};
      --ds-menu-subitem-bg: ${a.subitemFundo};
      --ds-menu-subitem-fg: ${a.subitemTexto};
      --ds-shell-hover: ${a.hoverFundo};
      --ds-shell-hover-fg: ${a.hoverTexto};
      --ds-menu-selecionado-bg: ${a.selecionadoFundo};
      --ds-menu-selecionado-fg: ${a.selecionadoTexto};
      --ds-accent: ${cor};
      --ds-accent-hover: ${hover};
      --ds-accent-pressed: ${pressionado};
      --ds-accent-subtle: ${sutil};
      --ds-bg-selected: ${sutil};
      --ds-fg-accent: ${texto};
      --ds-fg-on-accent: ${sobreCor};
      --ds-focus: ${cor};
      --ds-shell-active-bg: ${sutil};
      --ds-shell-active-fg: ${texto};
    }`,
    ...regras.map(
      ([classe, regra, pseudo = '']) => `${escopo} [class~='${classe}']${pseudo} { ${regra} }`
    ),
    ...sombras,
  ].join('\n');
}

/** A folha com as variáveis e as classes dos dois temas */
export function cssDaAparencia(aparencia: Record<TemaMenu, AparenciaMenu>): string {
  return `${cssDoTema('claro', aparencia.claro)}\n${cssDoTema('escuro', aparencia.escuro)}`;
}
