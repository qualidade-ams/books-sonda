// Exportação das telas novas (DS v2) em Excel e PDF: cada aba vira uma planilha no Excel e uma
// tabela no PDF. As telas montam as abas com o que está filtrado; aqui só se gera o arquivo.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type FormatoExportacao = 'xlsx' | 'pdf';
/** O t do i18next, para as telas montarem as abas com os rótulos traduzidos */
export type Traduzir = (chave: string, valores?: Record<string, unknown>) => string;
export type ValorCelula = string | number | null | undefined;

export interface ColunaExportacao<T> {
  rotulo: string;
  valor: (linha: T) => ValorCelula;
}

export interface AbaExportacao<T = unknown> {
  nome: string;
  colunas: ColunaExportacao<T>[];
  linhas: T[];
}

export interface Exportacao {
  /** Nome base do arquivo, sem data nem extensão (ex.: "ramos-de-atividade") */
  arquivo: string;
  titulo: string;
  abas: AbaExportacao<any>[];
}

type Celula = string | number;

export const matrizDaAba = <T>(aba: AbaExportacao<T>): Celula[][] => [
  aba.colunas.map((c) => c.rotulo),
  ...aba.linhas.map((l) => aba.colunas.map((c) => c.valor(l) ?? '')),
];

const dataLocal = (d: Date) =>
  [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');

/** Data e hora em Brasília, como AAAA-MM-DD HH:MM: ordena bem na planilha */
export const dataHoraPlanilha = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : null;

export const nomeDoArquivo = (base: string, formato: FormatoExportacao, hoje = new Date()) =>
  `${base}-${dataLocal(hoje)}.${formato}`;

const LIMITE_ABA = 31;
const PROIBIDOS_ABA = /[\\/?*[\]:]/g;

/** Nomes de aba aceitos pelo Excel: até 31 caracteres, sem \ / ? * [ ] :, sem repetir */
export function nomesDasAbas(nomes: string[]): string[] {
  const usados = new Set<string>();
  return nomes.map((n) => {
    const base = (n.replace(PROIBIDOS_ABA, ' ').trim() || 'Planilha').slice(0, LIMITE_ABA);
    let nome = base;
    for (let i = 2; usados.has(nome.toLowerCase()); i++) {
      const sufixo = ` (${i})`;
      nome = base.slice(0, LIMITE_ABA - sufixo.length) + sufixo;
    }
    usados.add(nome.toLowerCase());
    return nome;
  });
}

const LARGURA_MAXIMA = 60;

export const larguras = (matriz: Celula[][]) =>
  (matriz[0] ?? []).map((_, i) => ({
    wch: Math.min(
      LARGURA_MAXIMA,
      Math.max(...matriz.map((linha) => String(linha[i] ?? '').length)) + 2
    ),
  }));

export async function exportarTabela(
  exportacao: Exportacao,
  formato: FormatoExportacao,
  hoje = new Date()
): Promise<void> {
  const arquivo = nomeDoArquivo(exportacao.arquivo, formato, hoje);
  const nomes = nomesDasAbas(exportacao.abas.map((a) => a.nome));

  if (formato === 'xlsx') {
    const livro = XLSX.utils.book_new();
    exportacao.abas.forEach((aba, i) => {
      const matriz = matrizDaAba(aba);
      const planilha = XLSX.utils.aoa_to_sheet(matriz);
      planilha['!cols'] = larguras(matriz);
      XLSX.utils.book_append_sheet(livro, planilha, nomes[i]);
    });
    XLSX.writeFile(livro, arquivo);
    return;
  }

  const doc = new jsPDF({ orientation: 'landscape' });
  const variasAbas = exportacao.abas.length > 1;
  exportacao.abas.forEach((aba, i) => {
    if (i > 0) doc.addPage();
    doc.setFontSize(14);
    doc.text(exportacao.titulo, 14, 16);
    if (variasAbas) {
      doc.setFontSize(10);
      doc.text(aba.nome, 14, 23);
    }
    const [cabecalho, ...corpo] = matrizDaAba(aba);
    autoTable(doc, {
      head: [cabecalho],
      body: corpo,
      startY: variasAbas ? 28 : 22,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [28, 28, 28] },
    });
  });
  doc.save(arquivo);
}
