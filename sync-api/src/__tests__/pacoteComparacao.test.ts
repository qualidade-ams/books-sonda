// @vitest-environment node
/**
 * O sync-api roda no servidor sem o código do front, então usa um pacote gerado
 * (vendor/comparacao.cjs) com o modo sombra da Fase 4. Estes testes garantem que o
 * pacote versionado carrega no Node e está atualizado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { gerarPacoteComparacao, CAMINHO_PACOTE } from '../../scripts/build-comparacao.mjs';

const requireNode = createRequire(import.meta.url);

describe('pacote vendor/comparacao.cjs', () => {
  it('carrega no Node e expõe o modo sombra', () => {
    const pacote = requireNode(CAMINHO_PACOTE);

    expect(typeof pacote.rodarModoSombra).toBe('function');
  });

  it('roda sobre o client recebido: falha de leitura vira erro da rodada', async () => {
    const pacote = requireNode(CAMINHO_PACOTE);
    const consulta: any = new Proxy(
      {},
      {
        get: (_a, prop) =>
          prop === 'then'
            ? (ok: any) => ok({ data: null, error: { message: 'sem conexão' } })
            : () => consulta,
      }
    );
    const cliente = { from: () => consulta, rpc: async () => ({ data: null, error: null }) };

    await expect(
      pacote.rodarModoSombra(cliente, { hoje: { mes: 11, ano: 2026 }, fecharDesde: null })
    ).rejects.toThrow('Falha ao ler empresas em Legado: sem conexão');
  });

  it('está atualizado em relação ao código-fonte (rode: npm run build:comparacao)', async () => {
    const gerado = await gerarPacoteComparacao({ gravar: false });
    const versionado = readFileSync(resolve(CAMINHO_PACOTE), 'utf8');

    expect(gerado === versionado).toBe(true);
  }, 60_000);
});
