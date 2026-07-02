/**
 * Utilitários de exportação do Relatório de Consumo de Horas por Empresa.
 * - Empresas de banco_horas: exibe HH:MM calculado em tempo real
 * - Empresas de ticket: exibe "N tickets" — não entra no total de horas
 */

import * as XLSX from 'xlsx-js-style';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ConsumoHorasEmpresa } from '@/hooks/useConsumoHorasFechados';

const MESES_PT: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

/** Já vem ordenado do hook, mas garante ordem alfabética */
function ordenarAlfabetico(dados: ConsumoHorasEmpresa[]): ConsumoHorasEmpresa[] {
  return [...dados].sort((a, b) =>
    a.empresa.localeCompare(b.empresa, 'pt-BR', { sensitivity: 'base' })
  );
}

/** Converte "HH:MM" para minutos. Retorna 0 para strings de ticket ("N tickets"). */
function hhmmParaMinutos(valor: string): number {
  const match = valor.match(/^(\d+):(\d+)$/);
  if (!match) return 0;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function minutosParaHHMM(totalMinutos: number): string {
  const h = Math.floor(totalMinutos / 60);
  const m = totalMinutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportarConsumoHorasExcel(
  dados: ConsumoHorasEmpresa[],
  mes: number,
  ano: number
): void {
  const periodo = `${MESES_PT[mes]}/${ano}`;
  const dadosOrdenados = ordenarAlfabetico(dados);

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const totalStyle = {
    font: { bold: true, sz: 11 },
    fill: { fgColor: { rgb: 'EFF6FF' } },
    alignment: { horizontal: 'center' },
  };
  const ticketStyle = {
    font: { italic: true, color: { rgb: '6B7280' }, sz: 10 },
    alignment: { horizontal: 'center' },
  };

  const headers = ['#', 'EMPRESA', 'CONSUMO'];

  // Total somente das empresas de horas
  const totalMinutos = dadosOrdenados
    .filter(d => d.tipo_cobranca !== 'ticket')
    .reduce((acc, d) => acc + hhmmParaMinutos(d.consumo_horas), 0);
  const totalHHMM = minutosParaHHMM(totalMinutos);

  const rows = dadosOrdenados.map((d, i) => [i + 1, d.empresa, d.consumo_horas]);

  const sheetData: any[][] = [
    [`RELATÓRIO DE CONSUMO DE HORAS — ${periodo.toUpperCase()}`],
    [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
    [],
    headers,
    ...rows,
    [],
    ['', 'TOTAL HORAS (banco_horas)', totalHHMM],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Título
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (sheet[titleCell]) {
    sheet[titleCell].s = { font: { bold: true, sz: 14, color: { rgb: '1D4ED8' } } };
  }

  // Headers (linha 3)
  headers.forEach((_, col) => {
    const ref = XLSX.utils.encode_cell({ r: 3, c: col });
    if (sheet[ref]) sheet[ref].s = headerStyle;
  });

  // Estilo em linhas de dados
  dadosOrdenados.forEach((d, rowIdx) => {
    if (d.tipo_cobranca === 'ticket') {
      const ref = XLSX.utils.encode_cell({ r: 4 + rowIdx, c: 2 });
      if (sheet[ref]) sheet[ref].s = ticketStyle;
    }
  });

  // Linha de total
  const totalRow = 4 + rows.length + 1;
  [0, 1, 2].forEach(col => {
    const ref = XLSX.utils.encode_cell({ r: totalRow, c: col });
    if (sheet[ref]) sheet[ref].s = totalStyle;
  });

  sheet['!cols'] = [{ width: 5 }, { width: 38 }, { width: 20 }];
  sheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Consumo de Horas');
  XLSX.writeFile(workbook, `consumo-horas-${MESES_PT[mes].toLowerCase()}-${ano}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function exportarConsumoHorasPDF(
  dados: ConsumoHorasEmpresa[],
  mes: number,
  ano: number
): void {
  const periodo = `${MESES_PT[mes]}/${ano}`;
  const dadosOrdenados = ordenarAlfabetico(dados);

  const totalMinutos = dadosOrdenados
    .filter(d => d.tipo_cobranca !== 'ticket')
    .reduce((acc, d) => acc + hhmmParaMinutos(d.consumo_horas), 0);
  const totalHHMM = minutosParaHHMM(totalMinutos);

  const totalHoras  = dadosOrdenados.filter(d => d.tipo_cobranca !== 'ticket').length;
  const totalTicket = dadosOrdenados.filter(d => d.tipo_cobranca === 'ticket').length;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Cabeçalho azul
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE CONSUMO DE HORAS', 14, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período: ${periodo}  |  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 17);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  doc.text(
    `Empresas banco de horas: ${totalHoras}  |  Total horas: ${totalHHMM}  |  Empresas ticket: ${totalTicket}`,
    14, 30
  );

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Empresa', 'Consumo']],
    body: [
      ...dadosOrdenados.map((d, i) => [i + 1, d.empresa, d.consumo_horas]),
      ['', 'TOTAL HORAS (banco_horas)', totalHHMM],
    ],
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left',   cellWidth: 130 },
      2: { halign: 'center', cellWidth: 40 },
    },
    didParseCell(data) {
      const isTotal = data.row.index === dadosOrdenados.length;
      if (isTotal) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [239, 246, 255];
        data.cell.styles.textColor = [29, 78, 216];
        return;
      }
      const item = dadosOrdenados[data.row.index];
      if (item?.tipo_cobranca === 'ticket' && data.column.index === 2) {
        data.cell.styles.fontStyle = 'italic';
        data.cell.styles.textColor = [107, 114, 128]; // gray-500
      } else if (data.row.index % 2 === 1) {
        data.cell.styles.fillColor = [248, 250, 252];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Rodapé paginado
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150);
    doc.text(
      `Books SND  —  Página ${i} de ${pageCount}  —  ${new Date().toLocaleString('pt-BR')}`,
      14, 290
    );
  }

  doc.save(`consumo-horas-${MESES_PT[mes].toLowerCase()}-${ano}.pdf`);
}
