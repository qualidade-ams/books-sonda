/**
 * Gera sync-api/vendor/geracaoBooks.cjs: o código de geração e envio de books do
 * front (src/services/geracaoBooks + booksService e dependências) empacotado para Node.
 *
 * Precisa rodar na máquina de desenvolvimento (com o repositório inteiro):
 * o servidor do sync-api tem só a pasta sync-api. O pacote é versionado.
 *
 *   cd sync-api && npm run build:geracao-books
 *
 * Rode de novo sempre que mudar algo em src/services/geracaoBooks, booksService,
 * booksDataCollectorService ou gerarExcelDetalhadoBook — o teste
 * pacoteGeracaoBooks.test.ts falha se ficar desatualizado.
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pluginAliasFront } from './build-saldo-parcial.mjs';

const pastaScripts = dirname(fileURLToPath(import.meta.url));
const raizRepositorio = resolve(pastaScripts, '..', '..');

export const CAMINHO_PACOTE = resolve(pastaScripts, '..', 'vendor', 'geracaoBooks.cjs');

export async function gerarPacoteGeracaoBooks({ gravar = true } = {}) {
  const resultado = await build({
    absWorkingDir: raizRepositorio,
    entryPoints: [resolve(pastaScripts, 'geracao-books', 'entrada.ts')],
    outfile: CAMINHO_PACOTE,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node18',
    // O sync-api já tem o supabase-js; o resto (ex.: xlsx-js-style) vai no pacote
    external: ['@supabase/supabase-js'],
    plugins: [pluginAliasFront],
    legalComments: 'none',
    logLevel: 'silent',
    banner: { js: '// GERADO por sync-api/scripts/build-geracao-books.mjs — não editar à mão.' },
    write: gravar
  });

  if (resultado.errors.length > 0) {
    throw new Error(resultado.errors.map(e => e.text).join('\n'));
  }
  return gravar ? null : resultado.outputFiles[0].text;
}

// Execução direta: node scripts/build-geracao-books.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  gerarPacoteGeracaoBooks()
    .then(() => console.log(`Pacote gerado: ${CAMINHO_PACOTE}`))
    .catch((erro) => {
      console.error(erro.message);
      process.exit(1);
    });
}
