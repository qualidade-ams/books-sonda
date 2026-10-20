import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * O projeto é "type": "module": na Vercel as funções de api/ rodam como ESM no Node,
 * que exige a extensão nos imports relativos ('./_lib/x.js'). Sem ela o build passa
 * (só um aviso de TS2835) mas a função quebra ao ser chamada.
 */
describe('funções serverless em api/', () => {
  it('imports relativos usam extensão .js', () => {
    const raiz = resolve(__dirname, '../..');
    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) {
          if (nome !== '__tests__' && nome !== 'node_modules') varrer(caminho);
        } else if (/\.ts$/.test(nome)) {
          arquivos.push(caminho);
        }
      }
    };
    varrer(raiz);

    const semExtensao = arquivos.flatMap((arquivo) =>
      [...readFileSync(arquivo, 'utf8').matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)]
        .map((m) => m[1])
        .filter((caminho) => !caminho.endsWith('.js'))
        .map((caminho) => `${arquivo.slice(raiz.length + 1)}: ${caminho}`)
    );

    expect(semExtensao).toEqual([]);
  });
});
