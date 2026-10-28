/**
 * Gera sync-api/vendor/comparacao.cjs: o modo sombra da Fase 4 (motor de bancos de
 * horas, comparador e repositórios do front, em src/services/bancosHoras) empacotado
 * para Node.
 *
 * Precisa rodar na máquina de desenvolvimento (com o repositório inteiro):
 * o servidor do sync-api tem só a pasta sync-api. O pacote é versionado.
 *
 *   cd sync-api && npm run build:comparacao
 *
 * Rode de novo sempre que mudar algo em src/services/bancosHoras — o teste
 * pacoteComparacao.test.ts falha se ficar desatualizado.
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pluginAliasFront } from './build-saldo-parcial.mjs';

const pastaScripts = dirname(fileURLToPath(import.meta.url));
const raizRepositorio = resolve(pastaScripts, '..', '..');

export const CAMINHO_PACOTE = resolve(pastaScripts, '..', 'vendor', 'comparacao.cjs');

export async function gerarPacoteComparacao({ gravar = true } = {}) {
  const resultado = await build({
    absWorkingDir: raizRepositorio,
    entryPoints: [resolve(pastaScripts, 'comparacao', 'entrada.ts')],
    outfile: CAMINHO_PACOTE,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    external: ['@supabase/supabase-js'],
    plugins: [pluginAliasFront],
    legalComments: 'none',
    logLevel: 'silent',
    banner: { js: '// GERADO por sync-api/scripts/build-comparacao.mjs — não editar à mão.' },
    write: gravar
  });

  if (resultado.errors.length > 0) {
    throw new Error(resultado.errors.map(e => e.text).join('\n'));
  }
  return gravar ? null : resultado.outputFiles[0].text;
}

// Execução direta: node scripts/build-comparacao.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  gerarPacoteComparacao()
    .then(() => console.log(`Pacote gerado: ${CAMINHO_PACOTE}`))
    .catch((erro) => {
      console.error(erro.message);
      process.exit(1);
    });
}
