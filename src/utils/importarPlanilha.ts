// Importação em lote das telas novas (DS v2): lê a planilha (Excel ou CSV), acha as colunas pelo
// cabeçalho e devolve as linhas para cada tela conferir contra o cadastro antes de gravar.
import * as XLSX from 'xlsx';

export interface ColunaImportacao {
  id: string;
  rotulo: string;
  obrigatoria?: boolean;
}

/** Linha da planilha, com os valores pelo id da coluna */
export interface LinhaPlanilha {
  /** Número da linha na planilha (a 1 é o cabeçalho) */
  linha: number;
  valores: Record<string, string>;
}

/**
 * Linha já conferida contra o cadastro. novo: será incluído · atualiza: já existe e muda ·
 * igual: já existe sem mudança · erro: não será importada
 */
export interface LinhaImportacao extends LinhaPlanilha {
  situacao: 'novo' | 'atualiza' | 'igual' | 'erro';
  erros?: string[];
}

const bytes = (arquivo: File): Promise<ArrayBuffer> =>
  typeof arquivo.arrayBuffer === 'function'
    ? arquivo.arrayBuffer()
    : new Promise((resolver, rejeitar) => {
        const leitor = new FileReader();
        leitor.onload = () => resolver(leitor.result as ArrayBuffer);
        leitor.onerror = () => rejeitar(leitor.error);
        leitor.readAsArrayBuffer(arquivo);
      });

/** A primeira aba da planilha, tudo como texto */
export async function lerPlanilha(arquivo: File): Promise<string[][]> {
  // codepage 65001: CSV em UTF-8, com acentos
  const livro = XLSX.read(await bytes(arquivo), { type: 'array', codepage: 65001 });
  const aba = livro.Sheets[livro.SheetNames[0]];
  if (!aba) return [];
  return XLSX.utils
    .sheet_to_json<unknown[]>(aba, { header: 1, raw: false, defval: '', blankrows: true })
    .map((linha) => linha.map((v) => String(v ?? '')));
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\*/g, '')
    .trim()
    .toLowerCase();

/** As linhas com valor, pelas colunas achadas no cabeçalho; e as obrigatórias que faltam nele */
export function linhasDaPlanilha(
  matriz: string[][],
  colunas: ColunaImportacao[]
): { linhas: LinhaPlanilha[]; faltando: string[] } {
  const [cabecalho = [], ...resto] = matriz;
  const posicao = Object.fromEntries(
    colunas.map((c) => [c.id, cabecalho.findIndex((h) => normalizar(h) === normalizar(c.rotulo))])
  );
  const faltando = colunas.filter((c) => c.obrigatoria && posicao[c.id] < 0).map((c) => c.rotulo);
  const linhas = resto
    .map((valores, i) => ({
      linha: i + 2,
      valores: Object.fromEntries(
        colunas.map((c) => [c.id, (posicao[c.id] >= 0 ? valores[posicao[c.id]] : '')?.trim() ?? ''])
      ),
    }))
    .filter((l) => Object.values(l.valores).some(Boolean));
  return { linhas, faltando };
}
