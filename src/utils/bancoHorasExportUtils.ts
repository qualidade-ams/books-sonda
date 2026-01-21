/**
 * Utilities for exporting Banco de Horas (Hours Bank) reports
 * 
 * Provides functions to export consolidated and segmented views to Excel and PDF formats,
 * following the Sonda design system and branding guidelines.
 * 
 * @module utils/bancoHorasExportUtils
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { BancoHorasCalculo, BancoHorasCalculoSegmentado } from '@/types/bancoHoras';
import { formatarHorasParaExibicao } from '@/utils/horasUtils';

/**
 * Result of an export operation
 */
interface ExportResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Sonda brand colors for PDF reports
 */
const SONDA_COLORS = {
  primary: [37, 99, 235] as const,      // Azul Sonda (#2563eb)
  secondary: [59, 130, 246] as const,   // Azul claro
  success: [16, 185, 129] as const,     // Verde
  warning: [245, 158, 11] as const,     // Amarelo
  danger: [239, 68, 68] as const,       // Vermelho
  light: [243, 244, 246] as const,      // Cinza claro
  dark: [55, 65, 81] as const,          // Cinza escuro
  white: [255, 255, 255] as const       // Branco
} as const;

/**
 * Helper function to format monetary values
 */
const formatarValor = (valor: number | undefined): string => {
  if (!valor) return 'R$ 0,00';
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Helper function to format hours for display
 */
const formatarHoras = (horas: string | undefined): string => {
  if (!horas) return '0:00';
  return formatarHorasParaExibicao(horas, 'completo');
};

/**
 * Exports consolidated view to Excel format
 * 
 * Creates an Excel workbook with detailed calculation data including baseline,
 * consumption, rollovers, adjustments, balance, and overages.
 * 
 * @param calculo - Monthly consolidated calculation
 * @param empresaNome - Company name for the report
 * @param mesNome - Month name (e.g., "Janeiro")
 * @param ano - Year (e.g., 2024)
 * @returns Export result with success status and message
 */
export const exportarConsolidadoExcel = (
  calculo: BancoHorasCalculo,
  empresaNome: string,
  mesNome: string,
  ano: number
): ExportResult => {
  try {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Consolidated Calculation
    const consolidadoData = [
      ['RELATÓRIO DE BANCO DE HORAS - VISÃO CONSOLIDADA'],
      [''],
      ['Empresa:', empresaNome],
      ['Período:', `${mesNome} ${ano}`],
      ['Versão:', calculo.versao],
      ['Gerado em:', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['CÁLCULO MENSAL'],
      ['Campo', 'Horas', 'Tickets', 'Valor (R$)']
    ];

    // Add calculation rows
    const rows = [
      ['Baseline', formatarHoras(calculo.baseline_horas), calculo.baseline_tickets || '-', '-'],
      ['Repasses Mês Anterior', formatarHoras(calculo.repasses_mes_anterior_horas), calculo.repasses_mes_anterior_tickets || '-', '-'],
      ['Saldo a Utilizar', formatarHoras(calculo.saldo_a_utilizar_horas), calculo.saldo_a_utilizar_tickets || '-', '-'],
      ['Consumo', formatarHoras(calculo.consumo_horas), calculo.consumo_tickets || '-', '-'],
      ['Requerimentos', formatarHoras(calculo.requerimentos_horas), calculo.requerimentos_tickets || '-', '-'],
      ['Reajustes', formatarHoras(calculo.reajustes_horas), calculo.reajustes_tickets || '-', '-'],
      ['Consumo Total', formatarHoras(calculo.consumo_total_horas), calculo.consumo_total_tickets || '-', '-'],
      ['Saldo', formatarHoras(calculo.saldo_horas), calculo.saldo_tickets || '-', '-'],
      ['Repasse', formatarHoras(calculo.repasse_horas), calculo.repasse_tickets || '-', '-'],
      ['Excedentes', formatarHoras(calculo.excedentes_horas), calculo.excedentes_tickets || '-', '-'],
      ['Valor Excedentes', '-', '-', formatarValor(calculo.valor_excedentes_horas)],
      ['Valor a Faturar', '-', '-', formatarValor(calculo.valor_a_faturar)]
    ];

    consolidadoData.push(...rows);

    // Add metadata section
    consolidadoData.push(
      [''],
      ['INFORMAÇÕES ADICIONAIS'],
      ['Fim de Período:', calculo.is_fim_periodo ? 'Sim' : 'Não'],
      ['Taxa Hora Utilizada:', calculo.taxa_hora_utilizada ? formatarValor(calculo.taxa_hora_utilizada) : '-'],
      ['Observação Pública:', calculo.observacao_publica || '-']
    );

    const consolidadoSheet = XLSX.utils.aoa_to_sheet(consolidadoData);
    
    // Set column widths
    consolidadoSheet['!cols'] = [
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 20 }
    ];

    XLSX.utils.book_append_sheet(workbook, consolidadoSheet, 'Visão Consolidada');

    // Save file
    const nomeArquivo = `banco_horas_consolidado_${mesNome.toLowerCase()}_${ano}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    return { success: true, message: 'Relatório Excel exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar Excel consolidado:', error);
    return { success: false, error: 'Erro ao gerar arquivo Excel' };
  }
};

/**
 * Exports segmented view to Excel format
 * 
 * Creates an Excel workbook with proportional values for each allocation,
 * showing how the consolidated calculation is distributed across segments.
 * 
 * @param calculosSegmentados - Array of segmented calculations
 * @param empresaNome - Company name for the report
 * @param mesNome - Month name (e.g., "Janeiro")
 * @param ano - Year (e.g., 2024)
 * @returns Export result with success status and message
 */
export const exportarSegmentadoExcel = (
  calculosSegmentados: BancoHorasCalculoSegmentado[],
  empresaNome: string,
  mesNome: string,
  ano: number
): ExportResult => {
  try {
    const workbook = XLSX.utils.book_new();

    // Create a sheet for each allocation
    calculosSegmentados.forEach((segmento, index) => {
      const alocacaoNome = segmento.alocacao?.nome_alocacao || `Alocação ${index + 1}`;
      const percentual = segmento.alocacao?.percentual_baseline || 0;

      const segmentoData = [
        ['RELATÓRIO DE BANCO DE HORAS - VISÃO SEGMENTADA'],
        [''],
        ['Empresa:', empresaNome],
        ['Período:', `${mesNome} ${ano}`],
        ['Alocação:', alocacaoNome],
        ['Percentual:', `${percentual}%`],
        ['Gerado em:', new Date().toLocaleDateString('pt-BR')],
        [''],
        ['CÁLCULO PROPORCIONAL'],
        ['Campo', 'Horas', 'Tickets']
      ];

      // Add calculation rows
      const rows = [
        ['Baseline', formatarHoras(segmento.baseline_horas), segmento.baseline_tickets || '-'],
        ['Repasses Mês Anterior', formatarHoras(segmento.repasses_mes_anterior_horas), segmento.repasses_mes_anterior_tickets || '-'],
        ['Saldo a Utilizar', formatarHoras(segmento.saldo_a_utilizar_horas), segmento.saldo_a_utilizar_tickets || '-'],
        ['Consumo', formatarHoras(segmento.consumo_horas), segmento.consumo_tickets || '-'],
        ['Requerimentos', formatarHoras(segmento.requerimentos_horas), segmento.requerimentos_tickets || '-'],
        ['Reajustes', formatarHoras(segmento.reajustes_horas), segmento.reajustes_tickets || '-'],
        ['Consumo Total', formatarHoras(segmento.consumo_total_horas), segmento.consumo_total_tickets || '-'],
        ['Saldo', formatarHoras(segmento.saldo_horas), segmento.saldo_tickets || '-'],
        ['Repasse', formatarHoras(segmento.repasse_horas), segmento.repasse_tickets || '-']
      ];

      segmentoData.push(...rows);

      const segmentoSheet = XLSX.utils.aoa_to_sheet(segmentoData);
      
      // Set column widths
      segmentoSheet['!cols'] = [
        { width: 25 },
        { width: 15 },
        { width: 15 }
      ];

      // Truncate sheet name to 31 characters (Excel limit)
      const sheetName = alocacaoNome.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, segmentoSheet, sheetName);
    });

    // Save file
    const nomeArquivo = `banco_horas_segmentado_${mesNome.toLowerCase()}_${ano}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    return { success: true, message: 'Relatório Excel segmentado exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar Excel segmentado:', error);
    return { success: false, error: 'Erro ao gerar arquivo Excel segmentado' };
  }
};

/**
 * Exports consolidated view to PDF format
 * 
 * Creates a professionally formatted PDF report with Sonda branding,
 * including all calculation details and visual elements.
 * 
 * @param calculo - Monthly consolidated calculation
 * @param empresaNome - Company name for the report
 * @param mesNome - Month name (e.g., "Janeiro")
 * @param ano - Year (e.g., 2024)
 * @returns Export result with success status and message
 */
export const exportarConsolidadoPDF = (
  calculo: BancoHorasCalculo,
  empresaNome: string,
  mesNome: string,
  ano: number
): ExportResult => {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Configure font
    doc.setFont('helvetica');

    // Draw header with Sonda branding
    const drawHeader = () => {
      // Header background
      doc.setFillColor(...SONDA_COLORS.primary);
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Main title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const titulo = 'Banco de Horas - Visão Consolidada';
      const tituloWidth = doc.getTextWidth(titulo);
      doc.text(titulo, (pageWidth - tituloWidth) / 2, 18);

      // Company name
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      const empresaWidth = doc.getTextWidth(empresaNome);
      doc.text(empresaNome, (pageWidth - empresaWidth) / 2, 26);

      // Period and date
      doc.setFontSize(10);
      const subtitulo = `${mesNome} ${ano} - Versão ${calculo.versao} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
      const subtituloWidth = doc.getTextWidth(subtitulo);
      doc.text(subtitulo, (pageWidth - subtituloWidth) / 2, 34);
    };

    drawHeader();
    let currentY = 50;

    // Summary box
    const drawSummaryBox = (y: number) => {
      const boxHeight = 45;
      
      // Box background
      doc.setFillColor(...SONDA_COLORS.light);
      doc.rect(15, y, pageWidth - 30, boxHeight, 'F');

      // Box border
      doc.setDrawColor(...SONDA_COLORS.primary);
      doc.setLineWidth(0.5);
      doc.rect(15, y, pageWidth - 30, boxHeight, 'S');

      // Title
      doc.setTextColor(...SONDA_COLORS.dark);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo do Período', 20, y + 8);

      // Summary data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const summaryY = y + 16;
      const col1X = 20;
      const col2X = pageWidth / 2 + 5;

      // Column 1
      doc.setFont('helvetica', 'bold');
      doc.text('Baseline:', col1X, summaryY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarHoras(calculo.baseline_horas), col1X + 35, summaryY);

      doc.setFont('helvetica', 'bold');
      doc.text('Consumo Total:', col1X, summaryY + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarHoras(calculo.consumo_total_horas), col1X + 35, summaryY + 7);

      doc.setFont('helvetica', 'bold');
      doc.text('Saldo:', col1X, summaryY + 14);
      doc.setFont('helvetica', 'normal');
      const saldoColor = calculo.saldo_horas && calculo.saldo_horas.startsWith('-') 
        ? SONDA_COLORS.danger 
        : SONDA_COLORS.success;
      doc.setTextColor(...saldoColor);
      doc.text(formatarHoras(calculo.saldo_horas), col1X + 35, summaryY + 14);
      doc.setTextColor(...SONDA_COLORS.dark);

      // Column 2
      doc.setFont('helvetica', 'bold');
      doc.text('Repasse:', col2X, summaryY);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarHoras(calculo.repasse_horas), col2X + 35, summaryY);

      doc.setFont('helvetica', 'bold');
      doc.text('Excedentes:', col2X, summaryY + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(formatarHoras(calculo.excedentes_horas), col2X + 35, summaryY + 7);

      doc.setFont('helvetica', 'bold');
      doc.text('Valor a Faturar:', col2X, summaryY + 14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...SONDA_COLORS.primary);
      doc.text(formatarValor(calculo.valor_a_faturar), col2X + 35, summaryY + 14);
      doc.setTextColor(...SONDA_COLORS.dark);

      return y + boxHeight + 10;
    };

    currentY = drawSummaryBox(currentY);

    // Detailed calculation table
    const drawCalculationTable = (y: number) => {
      // Table title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...SONDA_COLORS.dark);
      doc.text('Detalhamento do Cálculo', 15, y);

      y += 8;

      // Table header
      doc.setFillColor(...SONDA_COLORS.primary);
      doc.rect(15, y, pageWidth - 30, 8, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Campo', 20, y + 5.5);
      doc.text('Horas', 100, y + 5.5);
      doc.text('Tickets', 140, y + 5.5);

      y += 8;

      // Table rows
      const rows = [
        { label: 'Baseline', horas: calculo.baseline_horas, tickets: calculo.baseline_tickets },
        { label: 'Repasses Mês Anterior', horas: calculo.repasses_mes_anterior_horas, tickets: calculo.repasses_mes_anterior_tickets },
        { label: 'Saldo a Utilizar', horas: calculo.saldo_a_utilizar_horas, tickets: calculo.saldo_a_utilizar_tickets },
        { label: 'Consumo', horas: calculo.consumo_horas, tickets: calculo.consumo_tickets },
        { label: 'Requerimentos', horas: calculo.requerimentos_horas, tickets: calculo.requerimentos_tickets },
        { label: 'Reajustes', horas: calculo.reajustes_horas, tickets: calculo.reajustes_tickets },
        { label: 'Consumo Total', horas: calculo.consumo_total_horas, tickets: calculo.consumo_total_tickets },
        { label: 'Saldo', horas: calculo.saldo_horas, tickets: calculo.saldo_tickets },
        { label: 'Repasse', horas: calculo.repasse_horas, tickets: calculo.repasse_tickets },
        { label: 'Excedentes', horas: calculo.excedentes_horas, tickets: calculo.excedentes_tickets }
      ];

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      rows.forEach((row, index) => {
        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(15, y, pageWidth - 30, 7, 'F');
        }

        doc.setTextColor(...SONDA_COLORS.dark);
        doc.text(row.label, 20, y + 5);
        doc.text(formatarHoras(row.horas), 100, y + 5);
        doc.text(row.tickets?.toString() || '-', 140, y + 5);

        y += 7;
      });

      // Table border
      doc.setDrawColor(...SONDA_COLORS.light);
      doc.setLineWidth(0.3);
      doc.rect(15, y - (rows.length * 7) - 8, pageWidth - 30, (rows.length * 7) + 8, 'S');

      return y + 5;
    };

    currentY = drawCalculationTable(currentY);

    // Additional information
    if (calculo.observacao_publica || calculo.is_fim_periodo) {
      currentY += 5;

      doc.setFillColor(...SONDA_COLORS.light);
      doc.rect(15, currentY, pageWidth - 30, 25, 'F');

      doc.setDrawColor(...SONDA_COLORS.primary);
      doc.setLineWidth(0.5);
      doc.rect(15, currentY, pageWidth - 30, 25, 'S');

      doc.setTextColor(...SONDA_COLORS.dark);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Informações Adicionais', 20, currentY + 7);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      if (calculo.is_fim_periodo) {
        doc.text('• Este é o fim do período de apuração', 20, currentY + 14);
      }

      if (calculo.observacao_publica) {
        doc.text('• Observação:', 20, currentY + 20);
        const observacaoLines = doc.splitTextToSize(calculo.observacao_publica, pageWidth - 50);
        doc.text(observacaoLines, 30, currentY + 20);
      }
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Relatório gerado pelo sistema Books SND - ${new Date().toLocaleString('pt-BR')}`, 15, pageHeight - 10);

    // Save file
    const nomeArquivo = `banco_horas_consolidado_${mesNome.toLowerCase()}_${ano}.pdf`;
    doc.save(nomeArquivo);

    return { success: true, message: 'Relatório PDF exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar PDF consolidado:', error);
    return { success: false, error: 'Erro ao gerar arquivo PDF' };
  }
};

/**
 * Exports segmented view to PDF format
 * 
 * Creates a professionally formatted PDF report with Sonda branding,
 * showing proportional values for each allocation on separate pages.
 * 
 * @param calculosSegmentados - Array of segmented calculations
 * @param empresaNome - Company name for the report
 * @param mesNome - Month name (e.g., "Janeiro")
 * @param ano - Year (e.g., 2024)
 * @returns Export result with success status and message
 */
export const exportarSegmentadoPDF = (
  calculosSegmentados: BancoHorasCalculoSegmentado[],
  empresaNome: string,
  mesNome: string,
  ano: number
): ExportResult => {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Configure font
    doc.setFont('helvetica');

    calculosSegmentados.forEach((segmento, index) => {
      if (index > 0) {
        doc.addPage();
      }

      const alocacaoNome = segmento.alocacao?.nome_alocacao || `Alocação ${index + 1}`;
      const percentual = segmento.alocacao?.percentual_baseline || 0;

      // Draw header
      const drawHeader = () => {
        // Header background
        doc.setFillColor(...SONDA_COLORS.primary);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Main title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        const titulo = 'Banco de Horas - Visão Segmentada';
        const tituloWidth = doc.getTextWidth(titulo);
        doc.text(titulo, (pageWidth - tituloWidth) / 2, 16);

        // Company name
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const empresaWidth = doc.getTextWidth(empresaNome);
        doc.text(empresaNome, (pageWidth - empresaWidth) / 2, 24);

        // Allocation info
        doc.setFontSize(11);
        const alocacaoInfo = `${alocacaoNome} (${percentual}% do baseline)`;
        const alocacaoWidth = doc.getTextWidth(alocacaoInfo);
        doc.text(alocacaoInfo, (pageWidth - alocacaoWidth) / 2, 32);

        // Period and date
        doc.setFontSize(10);
        const subtitulo = `${mesNome} ${ano} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
        const subtituloWidth = doc.getTextWidth(subtitulo);
        doc.text(subtitulo, (pageWidth - subtituloWidth) / 2, 39);
      };

      drawHeader();
      let currentY = 55;

      // Summary box
      const drawSummaryBox = (y: number) => {
        const boxHeight = 35;
        
        // Box background
        doc.setFillColor(...SONDA_COLORS.light);
        doc.rect(15, y, pageWidth - 30, boxHeight, 'F');

        // Box border
        doc.setDrawColor(...SONDA_COLORS.primary);
        doc.setLineWidth(0.5);
        doc.rect(15, y, pageWidth - 30, boxHeight, 'S');

        // Title
        doc.setTextColor(...SONDA_COLORS.dark);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo Proporcional', 20, y + 8);

        // Summary data
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const summaryY = y + 16;
        const col1X = 20;
        const col2X = pageWidth / 2 + 5;

        // Column 1
        doc.setFont('helvetica', 'bold');
        doc.text('Baseline:', col1X, summaryY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatarHoras(segmento.baseline_horas), col1X + 35, summaryY);

        doc.setFont('helvetica', 'bold');
        doc.text('Consumo Total:', col1X, summaryY + 7);
        doc.setFont('helvetica', 'normal');
        doc.text(formatarHoras(segmento.consumo_total_horas), col1X + 35, summaryY + 7);

        // Column 2
        doc.setFont('helvetica', 'bold');
        doc.text('Saldo:', col2X, summaryY);
        doc.setFont('helvetica', 'normal');
        const saldoColor = segmento.saldo_horas && segmento.saldo_horas.startsWith('-') 
          ? SONDA_COLORS.danger 
          : SONDA_COLORS.success;
        doc.setTextColor(...saldoColor);
        doc.text(formatarHoras(segmento.saldo_horas), col2X + 35, summaryY);
        doc.setTextColor(...SONDA_COLORS.dark);

        doc.setFont('helvetica', 'bold');
        doc.text('Repasse:', col2X, summaryY + 7);
        doc.setFont('helvetica', 'normal');
        doc.text(formatarHoras(segmento.repasse_horas), col2X + 35, summaryY + 7);

        return y + boxHeight + 10;
      };

      currentY = drawSummaryBox(currentY);

      // Detailed calculation table
      const drawCalculationTable = (y: number) => {
        // Table title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...SONDA_COLORS.dark);
        doc.text('Detalhamento Proporcional', 15, y);

        y += 8;

        // Table header
        doc.setFillColor(...SONDA_COLORS.primary);
        doc.rect(15, y, pageWidth - 30, 8, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Campo', 20, y + 5.5);
        doc.text('Horas', 100, y + 5.5);
        doc.text('Tickets', 140, y + 5.5);

        y += 8;

        // Table rows
        const rows = [
          { label: 'Baseline', horas: segmento.baseline_horas, tickets: segmento.baseline_tickets },
          { label: 'Repasses Mês Anterior', horas: segmento.repasses_mes_anterior_horas, tickets: segmento.repasses_mes_anterior_tickets },
          { label: 'Saldo a Utilizar', horas: segmento.saldo_a_utilizar_horas, tickets: segmento.saldo_a_utilizar_tickets },
          { label: 'Consumo', horas: segmento.consumo_horas, tickets: segmento.consumo_tickets },
          { label: 'Requerimentos', horas: segmento.requerimentos_horas, tickets: segmento.requerimentos_tickets },
          { label: 'Reajustes', horas: segmento.reajustes_horas, tickets: segmento.reajustes_tickets },
          { label: 'Consumo Total', horas: segmento.consumo_total_horas, tickets: segmento.consumo_total_tickets },
          { label: 'Saldo', horas: segmento.saldo_horas, tickets: segmento.saldo_tickets },
          { label: 'Repasse', horas: segmento.repasse_horas, tickets: segmento.repasse_tickets }
        ];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        rows.forEach((row, index) => {
          // Alternate row colors
          if (index % 2 === 0) {
            doc.setFillColor(249, 250, 251);
            doc.rect(15, y, pageWidth - 30, 7, 'F');
          }

          doc.setTextColor(...SONDA_COLORS.dark);
          doc.text(row.label, 20, y + 5);
          doc.text(formatarHoras(row.horas), 100, y + 5);
          doc.text(row.tickets?.toString() || '-', 140, y + 5);

          y += 7;
        });

        // Table border
        doc.setDrawColor(...SONDA_COLORS.light);
        doc.setLineWidth(0.3);
        doc.rect(15, y - (rows.length * 7) - 8, pageWidth - 30, (rows.length * 7) + 8, 'S');

        return y + 5;
      };

      currentY = drawCalculationTable(currentY);

      // Note about proportional values
      currentY += 5;
      doc.setFillColor(254, 243, 199); // Light yellow
      doc.rect(15, currentY, pageWidth - 30, 15, 'F');
      doc.setDrawColor(245, 158, 11); // Warning color
      doc.setLineWidth(0.5);
      doc.rect(15, currentY, pageWidth - 30, 15, 'S');

      doc.setTextColor(...SONDA_COLORS.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Nota: Os valores acima são proporcionais ao percentual de alocação.', 20, currentY + 7);
      doc.text('Esta é uma visão somente leitura derivada da visão consolidada.', 20, currentY + 12);

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Relatório gerado pelo sistema Books SND - ${new Date().toLocaleString('pt-BR')}`, 15, pageHeight - 10);
      doc.text(`Página ${index + 1} de ${calculosSegmentados.length}`, pageWidth - 40, pageHeight - 10);
    });

    // Save file
    const nomeArquivo = `banco_horas_segmentado_${mesNome.toLowerCase()}_${ano}.pdf`;
    doc.save(nomeArquivo);

    return { success: true, message: 'Relatório PDF segmentado exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar PDF segmentado:', error);
    return { success: false, error: 'Erro ao gerar arquivo PDF segmentado' };
  }
};
