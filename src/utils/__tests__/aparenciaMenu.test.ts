import { describe, it, expect } from 'vitest';
import { contraste, cssDaAparencia, logoClaroSobre, textoSobre } from '../aparenciaMenu';
import type { AparenciaMenu, TemaMenu } from '@/types/menuOrganizado';

const tema = (extra: Partial<AparenciaMenu> = {}): AparenciaMenu => ({
  menuFundo: '#FAFBFC',
  menuTexto: '#5F6670',
  itemFundo: '#FAFBFC',
  itemTexto: '#5F6670',
  subitemFundo: '#FFFFFF',
  subitemTexto: '#1B1F24',
  hoverFundo: '#EEF1F4',
  hoverTexto: '#1B1F24',
  selecionadoFundo: '#2563EB',
  selecionadoTexto: '#FFFFFF',
  logoPath: null,
  logoRecolhidoPath: null,
  ...extra,
});

const APARENCIA: Record<TemaMenu, AparenciaMenu> = {
  claro: tema(),
  escuro: tema({
    menuFundo: '#1C1C1C',
    menuTexto: '#B1B1B1',
    selecionadoFundo: '#00D4E8',
    selecionadoTexto: '#000000',
  }),
};

/** Valor de uma variável no bloco do tema */
function variavel(css: string, escopo: string, nome: string) {
  const bloco = css.slice(css.indexOf(`${escopo} [data-ds='v2'] {`));
  return bloco.match(new RegExp(`${nome}: ([^;]+);`))?.[1];
}

describe('contraste', () => {
  it('pela fórmula do WCAG', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
    expect(contraste('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('texto e logo sobre um fundo: branco no escuro, grafite no claro', () => {
    expect(textoSobre('#1C1C1C')).toBe('#FFFFFF');
    expect(textoSobre('#FAFBFC')).toBe('#1B1F24');
    expect(logoClaroSobre('#1C1C1C')).toBe(true);
    expect(logoClaroSobre('#FAFBFC')).toBe(false);
  });
});

describe('cssDaAparencia', () => {
  const css = cssDaAparencia(APARENCIA);

  it('cores do menu de cada tema nas variáveis do menu lateral', () => {
    expect(variavel(css, 'html:not(.dark)', '--ds-shell-bg')).toBe('#FAFBFC');
    expect(variavel(css, 'html:not(.dark)', '--ds-menu-subitem-bg')).toBe('#FFFFFF');
    expect(variavel(css, 'html:not(.dark)', '--ds-shell-hover-fg')).toBe('#1B1F24');
    expect(variavel(css, 'html:not(.dark)', '--ds-menu-selecionado-bg')).toBe('#2563EB');
    expect(variavel(css, 'html.dark', '--ds-shell-bg')).toBe('#1C1C1C');
    expect(variavel(css, 'html.dark', '--ds-menu-selecionado-fg')).toBe('#000000');
  });

  it('o selecionado vira o destaque do sistema, com o texto sobre ele', () => {
    expect(variavel(css, 'html:not(.dark)', '--ds-accent')).toBe('#2563EB');
    expect(variavel(css, 'html:not(.dark)', '--ds-fg-on-accent')).toBe('#FFFFFF');
    expect(variavel(css, 'html:not(.dark)', '--ds-focus')).toBe('#2563EB');
    expect(variavel(css, 'html.dark', '--ds-accent')).toBe('#00D4E8');
  });

  it('o texto em destaque é ajustado para contraste AA sobre a página', () => {
    // Amarelo-claro não se lê sobre a página clara: escurece até 4.5:1
    const amarelo = cssDaAparencia({
      ...APARENCIA,
      claro: tema({ selecionadoFundo: '#FFE600', selecionadoTexto: '#000000' }),
    });
    const texto = variavel(amarelo, 'html:not(.dark)', '--ds-fg-accent')!;
    expect(contraste(texto, '#ECEEF1')).toBeGreaterThanOrEqual(4.5);
    expect(variavel(amarelo, 'html:not(.dark)', '--ds-accent')).toBe('#FFE600');
  });

  it('troca o ciano escrito nas classes pela cor do tema', () => {
    expect(css).toContain(`html:not(.dark) [class~='border-[#00D4E8]'] { border-color: #2563EB; }`);
    expect(css).toContain(`html.dark [class~='border-[#00D4E8]'] { border-color: #00D4E8; }`);
    expect(css).toMatch(
      /html:not\(\.dark\) \[class~='bg-\[#00D4E8\]'\] \{ background-color: #2563EB; color: #FFFFFF; \}/
    );
  });
});
