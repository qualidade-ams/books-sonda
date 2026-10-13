/**
 * Ponto de entrada do pacote vendor/geracaoBooks.cjs (gerado por build-geracao-books.mjs).
 * Reexporta a geração automática de books do front (src/services/geracaoBooks) para o sync-api.
 */

// O Excel detalhado é criado como File, global só a partir do Node 20.
// No Node 18 (mínimo do guia de deploy) usamos um File mínimo sobre o Blob nativo.
if (typeof (globalThis as any).File === 'undefined') {
  class FileNode extends Blob {
    readonly name: string;
    readonly lastModified: number;
    constructor(partes: BlobPart[], nome: string, opcoes: FilePropertyBag = {}) {
      super(partes, opcoes);
      this.name = nome;
      this.lastModified = opcoes.lastModified ?? Date.now();
    }
  }
  (globalThis as any).File = FileNode;
}

export { executarGeracaoAutomaticaBooks } from '@/services/geracaoBooks/executarGeracaoAutomaticaBooks';
export type {
  DependenciasGeracaoAutomaticaBooks,
  ResumoGeracaoBooks
} from '@/services/geracaoBooks/executarGeracaoAutomaticaBooks';
export { definirClienteSupabase } from '../saldo-parcial/clienteSupabaseServidor';
