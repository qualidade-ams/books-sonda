/**
 * Ponto de entrada do pacote vendor/saldoParcial.cjs (gerado por build-saldo-parcial.mjs).
 * Reexporta o envio de Saldo Parcial do front (src/services/saldoParcial) para o sync-api.
 */

// O Excel de consumo é criado como File, global só a partir do Node 20.
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

export { executarEnvioSaldoParcial } from '@/services/saldoParcial/executarSaldoParcial';
export type {
  DependenciasEnvioSaldoParcial,
  PayloadEmailWebhook,
  ResultadoEnvioSaldoParcial
} from '@/services/saldoParcial/executarSaldoParcial';
export { definirClienteSupabase } from './clienteSupabaseServidor';
