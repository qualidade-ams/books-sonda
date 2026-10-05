// @vitest-environment node
/**
 * O sync-api roda no servidor sem o código do front, então usa um pacote gerado
 * (vendor/saldoParcial.cjs) com o código compartilhado do Saldo Parcial.
 * Estes testes garantem que o pacote versionado carrega no Node e está atualizado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { gerarPacoteSaldoParcial, CAMINHO_PACOTE } from '../../scripts/build-saldo-parcial.mjs';

const requireNode = createRequire(import.meta.url);

describe('pacote vendor/saldoParcial.cjs', () => {
  it('carrega no Node e expõe o envio e a injeção do client do Supabase', () => {
    const pacote = requireNode(CAMINHO_PACOTE);

    expect(typeof pacote.executarEnvioSaldoParcial).toBe('function');
    expect(typeof pacote.definirClienteSupabase).toBe('function');
  });

  it('falha com mensagem clara se o client do Supabase não foi definido', async () => {
    const pacote = requireNode(CAMINHO_PACOTE);
    pacote.definirClienteSupabase(null);

    await expect(
      pacote.executarEnvioSaldoParcial('empresa-1', ['a@cliente.com'], [], {
        renderizarImagem: async () => null,
        enviarEmail: async () => undefined
      })
    ).rejects.toThrow(/client do Supabase/);
  });

  it('está atualizado em relação ao código-fonte (rode: npm run build:saldo-parcial)', async () => {
    const gerado = await gerarPacoteSaldoParcial({ gravar: false });
    const versionado = readFileSync(resolve(CAMINHO_PACOTE), 'utf8');

    expect(gerado === versionado).toBe(true);
  }, 60_000);
});
