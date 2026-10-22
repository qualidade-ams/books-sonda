/**
 * Trava de contagem do typecheck para o CI.
 *
 * O main tem erros de tipo antigos (TypeScript propositalmente relaxado, ver
 * CLAUDE.md). Em vez de bloquear todo PR por eles, o CI falha só se o número
 * de erros passar do limite em typecheck-baseline.json. Ao corrigir erros,
 * baixe o limite no mesmo PR para que eles não voltem.
 *
 * Uso: npm run typecheck:ci
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ARQUIVO_LIMITE = 'scripts/typecheck-baseline.json';

/** Conta os erros na saída do tsc (uma linha "arquivo(l,c): error TSxxxx" por erro). */
export function contarErrosTypecheck(saida) {
  return saida.split(/\r?\n/).filter((linha) => /\(\d+,\d+\): error TS\d+:/.test(linha)).length;
}

/** Compara a contagem com o limite registrado. */
export function avaliarTypecheck(total, limite) {
  if (total > limite) {
    return {
      ok: false,
      mensagem:
        `Typecheck: ${total} erros, acima do limite de ${limite}. ` +
        `Rode "npm run typecheck" e corrija os erros novos.`,
    };
  }
  if (total < limite) {
    return {
      ok: true,
      mensagem:
        `Typecheck: ${total} erros, abaixo do limite de ${limite}. ` +
        `Baixe o limite em ${ARQUIVO_LIMITE} para ${total}.`,
    };
  }
  return { ok: true, mensagem: `Typecheck: ${total} erros, igual ao limite.` };
}

function executar() {
  const require = createRequire(import.meta.url);
  const tsc = require.resolve('typescript/bin/tsc');
  const resultado = spawnSync(process.execPath, [tsc, '--noEmit', '-p', 'tsconfig.app.json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (resultado.error) throw resultado.error;

  const total = contarErrosTypecheck(resultado.stdout);
  if (resultado.status !== 0 && total === 0) {
    // tsc falhou sem erro de tipo (configuração inválida, por exemplo)
    process.stderr.write(resultado.stdout + resultado.stderr);
    process.exit(1);
  }

  const { limite } = JSON.parse(readFileSync(ARQUIVO_LIMITE, 'utf8'));
  const { ok, mensagem } = avaliarTypecheck(total, limite);
  console.log(mensagem);
  process.exit(ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  executar();
}
