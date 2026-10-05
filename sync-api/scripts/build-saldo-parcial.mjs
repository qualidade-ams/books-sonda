/**
 * Gera sync-api/vendor/saldoParcial.cjs: o código do Saldo Parcial do front
 * (src/services/saldoParcial + services de banco de horas) empacotado para Node.
 *
 * Precisa rodar na máquina de desenvolvimento (com o repositório inteiro):
 * o servidor do sync-api tem só a pasta sync-api. O pacote é versionado.
 *
 *   cd sync-api && npm run build:saldo-parcial
 *
 * Rode de novo sempre que mudar algo em src/services/saldoParcial ou nos services
 * de banco de horas — o teste pacoteSaldoParcial.test.ts falha se ficar desatualizado.
 */
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const pastaScripts = dirname(fileURLToPath(import.meta.url));
const raizRepositorio = resolve(pastaScripts, '..', '..');
const pastaSrcFront = resolve(raizRepositorio, 'src');

export const CAMINHO_PACOTE = resolve(pastaScripts, '..', 'vendor', 'saldoParcial.cjs');

/** Resolve o alias "@/..." do front e troca o client do navegador pelo do servidor */
const pluginAliasFront = {
  name: 'alias-front',
  setup(construcao) {
    construcao.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
      path: resolve(pastaScripts, 'saldo-parcial', 'clienteSupabaseServidor.ts')
    }));
    construcao.onResolve({ filter: /^@\// }, async (args) => {
      const resultado = await construcao.resolve('./' + args.path.slice(2), {
        resolveDir: pastaSrcFront,
        kind: args.kind
      });
      return resultado.errors.length > 0 ? { errors: resultado.errors } : { path: resultado.path };
    });
  }
};

export async function gerarPacoteSaldoParcial({ gravar = true } = {}) {
  const resultado = await build({
    absWorkingDir: raizRepositorio,
    entryPoints: [resolve(pastaScripts, 'saldo-parcial', 'entrada.ts')],
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
    banner: { js: '// GERADO por sync-api/scripts/build-saldo-parcial.mjs — não editar à mão.' },
    write: gravar
  });

  if (resultado.errors.length > 0) {
    throw new Error(resultado.errors.map(e => e.text).join('\n'));
  }
  return gravar ? null : resultado.outputFiles[0].text;
}

// Execução direta: node scripts/build-saldo-parcial.mjs
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  gerarPacoteSaldoParcial()
    .then(() => console.log(`Pacote gerado: ${CAMINHO_PACOTE}`))
    .catch((erro) => {
      console.error(erro.message);
      process.exit(1);
    });
}
