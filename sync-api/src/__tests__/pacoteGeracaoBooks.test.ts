// @vitest-environment node
/**
 * O sync-api roda no servidor sem o código do front, então usa um pacote gerado
 * (vendor/geracaoBooks.cjs) com o código compartilhado da geração de books.
 * Estes testes garantem que o pacote versionado carrega no Node e está atualizado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { gerarPacoteGeracaoBooks, CAMINHO_PACOTE } from '../../scripts/build-geracao-books.mjs';

const requireNode = createRequire(import.meta.url);

describe('pacote vendor/geracaoBooks.cjs', () => {
  it('carrega no Node e expõe a geração automática e a injeção do client do Supabase', () => {
    const pacote = requireNode(CAMINHO_PACOTE);

    expect(typeof pacote.executarGeracaoAutomaticaBooks).toBe('function');
    expect(typeof pacote.definirClienteSupabase).toBe('function');
  });

  it('sem o client do Supabase, falha com mensagem clara (nunca processa a lista de exemplo)', async () => {
    const pacote = requireNode(CAMINHO_PACOTE);
    pacote.definirClienteSupabase(null);
    const consoleError = console.error;
    console.error = () => {};

    try {
      await expect(
        pacote.executarGeracaoAutomaticaBooks({
          gerarPdf: async () => new Blob([]),
          enviarEmail: async () => undefined,
        })
      ).rejects.toThrow(/client do Supabase/);
    } finally {
      console.error = consoleError;
    }
  });

  it('está atualizado em relação ao código-fonte (rode: npm run build:geracao-books)', async () => {
    const gerado = await gerarPacoteGeracaoBooks({ gravar: false });
    const versionado = readFileSync(resolve(CAMINHO_PACOTE), 'utf8');

    expect(gerado === versionado).toBe(true);
  }, 60_000);
});
