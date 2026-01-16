/**
 * Utilitários para exportação de dados do Histórico de Books
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateTime } from './formatters';
import type { HistoricoDisparoCompleto } from '@/types/clientBooks';

interface ExportResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Exportar histórico para Excel
 */
export function exportarHistoricoExcel(
  historico: HistoricoDisparoCompleto[]
): ExportResult {
  try {
    if (!historico || historico.length === 0) {
      return {
        success: false,
        error: 'Não há dados para exportar'
      };
    }

    // Preparar dados para exportação
    const dadosExportacao = historico.map(item => ({
      'Data/Hora': item.data_disparo 
        ? formatDateTime(item.data_disparo)
        : item.data_agendamento
        ? `Agendado: ${formatDateTime(item.data_agendamento)}`
        : '-',
      'Empresa': item.empresas_clientes?.nome_completo || '-',
      'Nome Abreviado': item.empresas_clientes?.nome_abreviado || '-',
      'Cliente': item.clientes?.nome_completo || 'E-mail Consolidado',
      'E-mail Cliente': item.clientes?.email || '-',
      'Status': item.status,
      'Assunto': item.assunto || '-',
      'E-mails CC': item.emails_cc?.join('; ') || '-',
      'Detalhes': item.erro_detalhes || '-'
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dadosExportacao);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 20 }, // Data/Hora
      { wch: 30 }, // Empresa
      { wch: 15 }, // Nome Abreviado
      { wch: 25 }, // Cliente
      { wch: 30 }, // E-mail Cliente
      { wch: 12 }, // Status
      { wch: 40 }, // Assunto
      { wch: 50 }, // E-mails CC
      { wch: 60 }  // Detalhes
    ];
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico de Books');

    // Gerar nome do arquivo
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `historico-books-${dataAtual}.xlsx`;

    // Salvar arquivo
    XLSX.writeFile(wb, nomeArquivo);

    return {
      success: true,
      message: `Arquivo ${nomeArquivo} exportado com sucesso!`
    };

  } catch (error) {
    console.error('Erro ao exportar para Excel:', error);
    return {
      success: false,
      error: 'Erro ao gerar arquivo Excel'
    };
  }
}

/**
 * Exportar histórico para PDF
 */
export function exportarHistoricoPDF(
  historico: HistoricoDisparoCompleto[]
): ExportResult {
  try {
    if (!historico || historico.length === 0) {
      return {
        success: false,
        error: 'Não há dados para exportar'
      };
    }

    // Criar documento PDF
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Histórico de Disparos de Books', 14, 15);

    // Data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dataGeracao = new Date().toLocaleString('pt-BR');
    doc.text(`Gerado em: ${dataGeracao}`, 14, 22);

    // Estatísticas
    const total = historico.length;
    const enviados = historico.filter(h => h.status === 'enviado').length;
    const falhas = historico.filter(h => h.status === 'falhou').length;
    const agendados = historico.filter(h => h.status === 'agendado').length;

    doc.setFontSize(9);
    doc.text(`Total: ${total} | Enviados: ${enviados} | Falhas: ${falhas} | Agendados: ${agendados}`, 14, 28);

    // Preparar dados da tabela
    const dadosTabela = historico.map(item => [
      item.data_disparo 
        ? formatDateTime(item.data_disparo).split(' ')[0] // Apenas data
        : item.data_agendamento
        ? formatDateTime(item.data_agendamento).split(' ')[0]
        : '-',
      item.empresas_clientes?.nome_abreviado || '-',
      item.clientes?.nome_completo || 'Consolidado',
      item.status,
      item.assunto?.substring(0, 30) || '-'
    ]);

    // Adicionar tabela
    autoTable(doc, {
      startY: 35,
      head: [['Data', 'Empresa', 'Cliente', 'Status', 'Assunto']],
      body: dadosTabela,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [37, 99, 235], // Azul Sonda
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      columnStyles: {
        0: { cellWidth: 25 },  // Data
        1: { cellWidth: 50 },  // Empresa
        2: { cellWidth: 60 },  // Cliente
        3: { cellWidth: 30 },  // Status
        4: { cellWidth: 'auto' } // Assunto
      },
      margin: { left: 14, right: 14 }
    });

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Gerar nome do arquivo
    const dataAtual = new Date().toISOString().split('T')[0];
    const nomeArquivo = `historico-books-${dataAtual}.pdf`;

    // Salvar arquivo
    doc.save(nomeArquivo);

    return {
      success: true,
      message: `Arquivo ${nomeArquivo} exportado com sucesso!`
    };

  } catch (error) {
    console.error('Erro ao exportar para PDF:', error);
    return {
      success: false,
      error: 'Erro ao gerar arquivo PDF'
    };
  }
}
