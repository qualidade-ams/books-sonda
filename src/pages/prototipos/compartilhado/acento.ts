// Comparação SÓ DO PROTÓTIPO (21/10/2026): no tema claro, troca o ciano da marca pelo azul #2563EB.
// O tema escuro não muda. Os tokens de ds-v2.css e as classes com o ciano escrito direto
// (bg-[#00D4E8], border-[#00D4E8]…) são sobrescritos por esta folha, ligada pelo atributo
// data-acento="azul" no <html>. Se o azul for aprovado, ele vai para os tokens, as classes fixas
// viram tokens e esta folha sai.

const ESCOPO = "html[data-acento='azul']:not(.dark)";

/** Azul principal (fundos, bordas, chaves, foco) */
const AZUL = '#2563eb';
/** Texto e ícones de destaque sobre o claro: #2563EB dá 4,4 sobre a página, abaixo do AA */
const AZUL_TEXTO = '#1d4ed8';
/** Sobre a faixa escura do topo, onde o #2563EB some no petróleo */
const AZUL_FAIXA = '#60a5fa';
const AZUL_FAIXA_CLARO = '#93c5fd';

const trocarCor = (valor: string) =>
  valor
    .replace(/rgba\(0,212,232,/g, 'rgba(37,99,235,')
    .replace(/#00D4E8/gi, AZUL)
    .replace(/_/g, ' ');

/** [classe exata, regra CSS, pseudo-classe] */
const REGRAS: [string, string, string?][] = [
  ['bg-[#00D4E8]', `background-color: ${AZUL}; color: #fff;`],
  ['after:bg-[#00D4E8]', `background-color: ${AZUL};`, '::after'],
  ['hover:bg-[#33DDED]', `background-color: ${AZUL_TEXTO};`, ':hover'],
  ['border-[#00D4E8]', `border-color: ${AZUL};`],
  ['hover:border-[#00D4E8]', `border-color: ${AZUL};`, ':hover'],
  ['border-b-[#00D4E8]', `border-bottom-color: ${AZUL};`],
  ['border-l-[#00D4E8]', `border-left-color: ${AZUL};`],
  ['ring-[#00D4E8]', `--tw-ring-color: ${AZUL};`],
  ['focus-visible:ring-[#00D4E8]', `--tw-ring-color: ${AZUL};`, ':focus-visible'],
  ['text-[#00D4E8]', `color: ${AZUL_FAIXA};`],
  ['text-[#006F7D]', `color: ${AZUL_TEXTO};`],
  ['fill-[#00D4E8]', `fill: ${AZUL};`],
  ['bg-[#006F7D]', `background-color: ${AZUL_TEXTO};`],
  ['from-[#00D4E8]', `--tw-gradient-from: ${AZUL_FAIXA} var(--tw-gradient-from-position);`],
  ['via-[#00D4E8]', `--tw-gradient-via: ${AZUL} var(--tw-gradient-via-position);`],
  ['to-[#00D4E8]', `--tw-gradient-to: ${AZUL} var(--tw-gradient-to-position);`],
  ['to-[#7CEBF5]', `--tw-gradient-to: ${AZUL_FAIXA_CLARO} var(--tw-gradient-to-position);`],
  ['from-[#00A9B9]', `--tw-gradient-from: ${AZUL_TEXTO} var(--tw-gradient-from-position);`],
  ['from-[#006F7D]', `--tw-gradient-from: ${AZUL_TEXTO} var(--tw-gradient-from-position);`],
  ['to-[#006F7D]', `--tw-gradient-to: ${AZUL_TEXTO} var(--tw-gradient-to-position);`],
];

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

const regraSombra = (classe: string) => {
  const hover = classe.startsWith('hover:');
  const valor = classe.replace(/^hover:/, '').replace(/^shadow-\[|\]$/g, '');
  return `${ESCOPO} [class~='${classe}']${hover ? ':hover' : ''} { box-shadow: ${trocarCor(valor)}; }`;
};

export const CSS_ACENTO_AZUL = [
  `${ESCOPO} [data-ds='v2'] {
    --ds-accent: ${AZUL};
    --ds-accent-hover: ${AZUL_TEXTO};
    --ds-accent-pressed: #1e40af;
    --ds-accent-subtle: #dbeafe;
    --ds-bg-selected: #dbeafe;
    --ds-fg-accent: ${AZUL_TEXTO};
    --ds-fg-on-accent: #ffffff;
    --ds-focus: ${AZUL};
    --ds-info-fg: ${AZUL_TEXTO};
    --ds-info-bg: #eff6ff;
    --ds-info-border: #bfdbfe;
    --ds-shell-active-bg: #dbeafe;
    --ds-shell-active-fg: ${AZUL_TEXTO};
  }`,
  ...REGRAS.map(
    ([classe, regra, pseudo = '']) => `${ESCOPO} [class~='${classe}']${pseudo} { ${regra} }`
  ),
  ...SOMBRAS.map(regraSombra),
].join('\n');

export type Acento = 'ciano' | 'azul';
const CHAVE_ACENTO = 'prototipo-acento';

export function lerAcento(): Acento {
  try {
    return localStorage.getItem(CHAVE_ACENTO) === 'azul' ? 'azul' : 'ciano';
  } catch {
    return 'ciano';
  }
}

export function gravarAcento(a: Acento) {
  try {
    localStorage.setItem(CHAVE_ACENTO, a);
  } catch {
    // Sem armazenamento (janela anônima): a escolha vale só nesta página
  }
}

/** Liga ou desliga a comparação: atributo no <html> e a folha no <head>, uma vez só */
export function aplicarAcento(a: Acento) {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('prototipo-acento-azul')) {
    const estilo = document.createElement('style');
    estilo.id = 'prototipo-acento-azul';
    estilo.textContent = CSS_ACENTO_AZUL;
    document.head.appendChild(estilo);
  }
  if (a === 'azul') document.documentElement.setAttribute('data-acento', 'azul');
  else document.documentElement.removeAttribute('data-acento');
}
