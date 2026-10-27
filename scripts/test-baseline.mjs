/**
 * Trava de testes para o CI.
 *
 * O main tem testes falhando antigos. Em vez de bloquear todo PR por eles, o
 * CI falha só se aparecer teste falhando (ou arquivo de teste que não carrega)
 * fora da lista em test-baseline.json. Ao corrigir um teste da lista, tire-o
 * da lista no mesmo PR para que ele não volte a quebrar.
 *
 * Uso: npm run test:ci                (compara com a lista)
 *      npm run test:ci -- --atualizar (regrava a lista com as falhas atuais)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ARQUIVO_LISTA = 'scripts/test-baseline.json';

function caminhoRelativo(arquivo, raiz) {
  const a = arquivo.replace(/\\/g, '/');
  const r = raiz.replace(/\\/g, '/').replace(/\/$/, '') + '/';
  return a.toLowerCase().startsWith(r.toLowerCase()) ? a.slice(r.length) : a;
}

/** Lista ordenada de falhas ("arquivo > describe > teste") do relatório JSON do Vitest. */
export function extrairFalhas(relatorio, raiz) {
  const falhas = [];
  for (const arquivo of relatorio.testResults) {
    const rel = caminhoRelativo(arquivo.name, raiz);
    const falhados = arquivo.assertionResults.filter((t) => t.status === 'failed');
    if (arquivo.status === 'failed' && falhados.length === 0) {
      falhas.push(`${rel} > (arquivo não carregou)`);
    }
    for (const t of falhados) {
      falhas.push([rel, ...t.ancestorTitles, t.title].join(' > '));
    }
  }
  return [...new Set(falhas)].sort();
}

/** Falhas fora da lista conhecida e falhas da lista que voltaram a passar. */
export function compararFalhas(atuais, conhecidas) {
  const setAtuais = new Set(atuais);
  const setConhecidas = new Set(conhecidas);
  return {
    novas: atuais.filter((f) => !setConhecidas.has(f)),
    corrigidas: conhecidas.filter((f) => !setAtuais.has(f)),
  };
}

function executar() {
  const saida = join(tmpdir(), `vitest-ci-${process.pid}.json`);
  spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${saida}`], {
    stdio: ['ignore', 'ignore', 'inherit'],
    shell: true,
  });
  if (!existsSync(saida)) {
    console.error('Vitest não gerou o relatório (a suíte não terminou).');
    process.exit(1);
  }
  const relatorio = JSON.parse(readFileSync(saida, 'utf8'));
  rmSync(saida);

  const atuais = extrairFalhas(relatorio, process.cwd());
  console.log(
    `Testes: ${relatorio.numTotalTests}, passaram ${relatorio.numPassedTests}, ` +
      `falharam ${relatorio.numFailedTests}.`
  );

  if (process.argv.includes('--atualizar')) {
    writeFileSync(ARQUIVO_LISTA, JSON.stringify({ falhasConhecidas: atuais }, null, 2) + '\n');
    console.log(`${ARQUIVO_LISTA} regravado com ${atuais.length} falhas.`);
    return;
  }

  const { falhasConhecidas } = JSON.parse(readFileSync(ARQUIVO_LISTA, 'utf8'));
  const { novas, corrigidas } = compararFalhas(atuais, falhasConhecidas);

  if (corrigidas.length > 0) {
    console.log(`\n${corrigidas.length} falha(s) conhecida(s) não falham mais. Tire de ${ARQUIVO_LISTA}:`);
    corrigidas.forEach((f) => console.log(`  - ${f}`));
  }
  if (novas.length > 0) {
    console.error(`\n${novas.length} falha(s) nova(s), fora da lista de falhas conhecidas:`);
    novas.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`\nNenhuma falha nova (${falhasConhecidas.length} falhas conhecidas na lista).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  executar();
}
