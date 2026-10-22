// Aparência do menu SÓ DO PROTÓTIPO (22/10/2026): as cores e o logo salvos em Organizar Menu valem
// para o menu em pílula de todos os protótipos, e a cor do item selecionado vira o destaque do
// sistema (título da faixa, avatar, botões principais, abas, foco). Substitui a comparação
// "Ciano | Azul" de 21/10. Na tela real, isso vem de uma tabela e vira variáveis CSS no carregamento.
import { useEffect, useState } from 'react';
import { CORES_PADRAO_MOCK, type CoresMenuMock } from '../mocks/organizarMenu';

export type Tema = 'claro' | 'escuro';
export type AparenciaMenu = Record<Tema, CoresMenuMock>;

/* ------------------------------------------------------------------ */
/* Contraste (WCAG)                                                     */
/* ------------------------------------------------------------------ */

export const TEXTO_ESCURO = '#1B1F24';
export const hexValido = (v: string) => /^#[0-9a-f]{6}$/i.test(v);
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

/* ------------------------------------------------------------------ */
/* Menu em pílula                                                       */
/* ------------------------------------------------------------------ */

/** Cores do menu em pílula, já no formato que o shell usa */
export interface CoresPilula {
  fundo: string;
  texto: string;
  item: string;
  itemTexto: string;
  hover: string;
  hoverTexto: string;
  selecionado: string;
  selecionadoTexto: string;
  /** O logo padrão fica branco sobre fundo escuro */
  logoBranco: boolean;
  /** Logo próprio do menu aberto e do recolhido */
  logo?: string;
  logoRecolhido?: string;
}

export function paraPilula(c: CoresMenuMock): CoresPilula {
  return {
    fundo: c.menu,
    texto: c.menuTexto,
    item: c.item,
    itemTexto: c.itemTexto,
    hover: c.hover,
    hoverTexto: c.hoverTexto,
    selecionado: c.selecionado,
    selecionadoTexto: c.selecionadoTexto,
    logoBranco: textoSobre(c.menu) === '#FFFFFF',
    logo: c.logo,
    logoRecolhido: c.logoRecolhido,
  };
}

/* ------------------------------------------------------------------ */
/* Guardado no navegador: vale entre os protótipos                      */
/* ------------------------------------------------------------------ */

const CHAVE = 'prototipo-aparencia-menu';
const EVENTO = 'prototipo-aparencia-menu';

export function lerAparencia(): AparenciaMenu {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null');
    if (salvo?.claro && salvo?.escuro)
      return {
        claro: { ...CORES_PADRAO_MOCK.claro, ...salvo.claro },
        escuro: { ...CORES_PADRAO_MOCK.escuro, ...salvo.escuro },
      };
  } catch {
    // Sem armazenamento ou valor corrompido: fica o padrão
  }
  return CORES_PADRAO_MOCK;
}

export function gravarAparencia(a: AparenciaMenu) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(a));
  } catch {
    // Sem armazenamento (janela anônima): vale só até recarregar
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: a }));
}

/** A aparência salva, atualizada quando Organizar Menu salva */
export function useAparenciaSalva() {
  const [aparencia, setAparencia] = useState(lerAparencia);
  useEffect(() => {
    const ouvir = (e: Event) => setAparencia((e as CustomEvent<AparenciaMenu>).detail);
    window.addEventListener(EVENTO, ouvir);
    return () => window.removeEventListener(EVENTO, ouvir);
  }, []);
  return aparencia;
}

/* ------------------------------------------------------------------ */
/* Tema da página                                                       */
/* ------------------------------------------------------------------ */

const temaDoDocumento = (): Tema =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
    ? 'escuro'
    : 'claro';

/** Mesma gravação do useTheme ('theme' no localStorage e a classe dark no html) */
export function mudarTema(t: Tema) {
  try {
    localStorage.setItem('theme', t === 'escuro' ? 'dark' : 'light');
  } catch {
    // Sem armazenamento: o tema vale só nesta página
  }
  document.documentElement.classList.toggle('dark', t === 'escuro');
}

/**
 * O tema em uso, lido da classe do html. O useTheme guarda o tema em estado de cada componente, e
 * a troca feita num lugar não chegava aos outros; observar o html deixa todos em sincronia.
 */
export function useTemaDaPagina(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState(temaDoDocumento);
  useEffect(() => {
    const observador = new MutationObserver(() => setTema(temaDoDocumento()));
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observador.disconnect();
  }, []);
  return [tema, mudarTema];
}

/* ------------------------------------------------------------------ */
/* Destaque do sistema a partir do item selecionado                     */
/* ------------------------------------------------------------------ */

/** Fundos de cada tema, para garantir contraste do destaque (ds-v2.css) */
const FUNDOS: Record<Tema, { pagina: string; superficie: string; faixa: string }> = {
  claro: { pagina: '#ECEEF1', superficie: '#FAFBFC', faixa: '#0F1D24' },
  escuro: { pagina: '#121212', superficie: '#1C1C1C', faixa: '#000000' },
};

function cssDoTema(tema: Tema, c: CoresMenuMock) {
  const escopo = tema === 'claro' ? 'html:not(.dark)' : 'html.dark';
  const f = FUNDOS[tema];
  const cor = c.selecionado;
  const sobreCor = c.selecionadoTexto;
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

/** Escreve (ou reescreve) a folha do destaque no <head> */
export function aplicarDestaque(a: AparenciaMenu) {
  if (typeof document === 'undefined') return;
  let estilo = document.getElementById('prototipo-destaque-menu');
  if (!estilo) {
    estilo = document.createElement('style');
    estilo.id = 'prototipo-destaque-menu';
    document.head.appendChild(estilo);
  }
  estilo.textContent = `${cssDoTema('claro', a.claro)}\n${cssDoTema('escuro', a.escuro)}`;
}
