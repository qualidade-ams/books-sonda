// Guarda: toda chave de erro que os services lançam existe nos textos (a paridade entre os
// idiomas fica no paridade.test). Sem isto, a tela mostraria a chave crua no aviso.
import { describe, expect, it } from 'vitest';
import fase3 from '@/i18n/locales/fase3/pt-BR';
import { chaveDaFalha } from '@/errors/erroTraduzivel';

const fontes = import.meta.glob('/src/services/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const existe = (chave: string) =>
  chave
    .split('.')
    .reduce<unknown>(
      (no, parte) =>
        no && typeof no === 'object' ? (no as Record<string, unknown>)[parte] : undefined,
      { erros: (fase3 as Record<string, unknown>).erros }
    ) !== undefined;

const servicos = Object.entries(fontes).filter(
  ([arquivo, fonte]) => !arquivo.includes('__tests__') && fonte.includes('@/errors/erroTraduzivel')
);

describe('chaves de erro dos services', () => {
  it('há services usando erros traduzíveis', () => {
    expect(servicos.length).toBeGreaterThan(0);
  });

  it.each(servicos)('%s: toda chave existe em pt-BR', (_arquivo, fonte) => {
    const chaves = [
      ...[...fonte.matchAll(/ErroTraduzivel\(\s*'([^']+)'/g)].map((m) => m[1]),
      ...[...fonte.matchAll(/'(erros\.[\w.]+)'/g)].map((m) => m[1]),
      ...[...fonte.matchAll(/falha\(\s*'([^']+)'/g)].map(
        (m) => `erros.falhas.${chaveDaFalha(m[1])}`
      ),
    ];
    expect(chaves.filter((c) => !existe(c))).toEqual([]);
  });
});
