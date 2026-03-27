/**
 * Utilitários para exportação de Pesquisa Mensal AMS
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PesquisaMensalAMS, EstatisticasAMS } from '@/types/pesquisaMensalAMS';

interface ExportResult {
  success: boolean;
  message?: string;
  error?: string;
}

function formatarData(data: string | null): string {
  if (!data) return '-';
  try {
    return format(new Date(data), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return data;
  }
}

/**
 * Exportar pesquisas AMS para Excel
 */
export async function exportarAMSExcel(
  pesquisas: PesquisaMensalAMS[],
  estatisticas: EstatisticasAMS
): Promise<ExportResult> {
  try {
    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo
    const resumoData = [
      ['RESUMO ESTATÍSTICO - PESQUISA MENSAL AMS'],
      [''],
      ['Métrica', 'Valor'],
      ['Total de Registros', estatisticas.total],
      ['Completas', estatisticas.completas],
      ['Incompletas', estatisticas.incompletas],
      ['Cliente Foco (SIM)', estatisticas.cliente_foco],
      ['Média das Notas', estatisticas.media_nota],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    wsResumo['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba 2: Dados Completos
    const dadosExport = pesquisas.map(p => ({
      'Identificador Questionário': p.identificador_questionario,
      'Nome Questionário': p.nome_questionario,
      'Mês Referência': p.mes_referencia,
      'Ano Referência': p.ano_referencia || '-',
      'Início Real Questionário': formatarData(p.inicio_real_questionario),
      'Nome Respondente': p.nome_respondente || '-',
      'E-mail Respondente': p.email_respondente || '-',
      'Cliente': p.cliente || '-',
      'Cliente FOCO': p.cliente_foco ? 'SIM' : 'NÃO',
      'Vertical': p.vertical || '-',
      'Unidade de Negócio': p.unidade_negocio || '-',
      'Nota': p.nota ?? '-',
      'Comentário': p.comentario || '-',
      'Início Resposta': formatarData(p.inicio_resposta),
      'Término Resposta': formatarData(p.termino_resposta),
      'Situação Resposta': p.situacao_resposta || '-',
      'Incompleto': p.incompleto ? 'SIM' : 'NÃO',
    }));

    const wsDados = XLSX.utils.json_to_sheet(dadosExport);
    wsDados['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 25 },
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 8 },
      { wch: 50 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDados, 'Pesquisas AMS');

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `pesquisa_mensal_ams_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);

    return { success: true, message: `Arquivo Excel exportado: ${filename}` };
  } catch (error) {
    console.error('Erro ao exportar Excel AMS:', error);
    return { success: false, error: 'Erro ao gerar arquivo Excel' };
  }
}

/**
 * Exportar pesquisas AMS para PDF
 */
export async function exportarAMSPDF(
  pesquisas: PesquisaMensalAMS[],
  estatisticas: EstatisticasAMS
): Promise<ExportResult> {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const corAzulSonda = '#2563eb';

    // Cabeçalho
    doc.setFillColor(corAzulSonda);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Pesquisa Mensal AMS', 148, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 148, 22, { align: 'center' });

    let yPos = 40;

    // Resumo
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.5);
    doc.rect(15, yPos, 267, 25);
    doc.setFillColor(240, 248, 255);
    doc.rect(15.5, yPos + 0.5, 266, 24, 'F');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO ESTATÍSTICO', 20, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Total: ${estatisticas.total} | Completas: ${estatisticas.completas} | Incompletas: ${estatisticas.incompletas} | Cliente Foco: ${estatisticas.cliente_foco} | Média Nota: ${estatisticas.media_nota}`, 20, yPos + 16);

    yPos += 35;

    // Tabela de dados
    const headers = ['Identificador', 'Questionário', 'Mês', 'Respondente', 'Cliente', 'Foco', 'Vertical', 'Nota', 'Situação'];
    const colWidths = [30, 40, 12, 35, 35, 12, 30, 12, 25];

    // Header da tabela
    doc.setFillColor(37, 99, 235);
    let xPos = 15;
    headers.forEach((h, i) => {
      doc.rect(xPos, yPos, colWidths[i], 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(h, xPos + 1, yPos + 5);
      xPos += colWidths[i];
    });
    yPos += 8;

    // Linhas de dados
    doc.setFont('helvetica', 'normal');
    pesquisas.forEach((p, idx) => {
      if (yPos > 190) {
        doc.addPage();
        yPos = 20;
      }

      const bgColor = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      const row = [
        (p.identificador_questionario || '').substring(0, 20),
        (p.nome_questionario || '').substring(0, 25),
        String(p.mes_referencia),
        (p.nome_respondente || '-').substring(0, 22),
        (p.cliente || '-').substring(0, 22),
        p.cliente_foco ? 'SIM' : 'NÃO',
        (p.vertical || '-').substring(0, 18),
        p.nota !== null ? String(p.nota) : '-',
        (p.situacao_resposta || '-').substring(0, 15),
      ];

      xPos = 15;
      row.forEach((val, i) => {
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(xPos, yPos, colWidths[i], 7, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.rect(xPos, yPos, colWidths[i], 7);
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(6);
        doc.text(val, xPos + 1, yPos + 4.5);
        xPos += colWidths[i];
      });
      yPos += 7;
    });

    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, 148, 200, { align: 'center' });
    }

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `pesquisa_mensal_ams_${timestamp}.pdf`;
    doc.save(filename);

    return { success: true, message: `Arquivo PDF exportado: ${filename}` };
  } catch (error) {
    console.error('Erro ao exportar PDF AMS:', error);
    return { success: false, error: 'Erro ao gerar arquivo PDF' };
  }
}

/**
 * Gerar template Excel para importação
 */
export function gerarTemplateImportacaoAMS(): void {
  const wb = XLSX.utils.book_new();
  const headers = [
    'Identificador do questionário',
    'Nome do questionário',
    'Mês de referência',
    'Início real do questionário',
    'Nome do respondente',
    'E-mail do respondente',
    'Cliente',
    'Cliente FOCO',
    'Vertical',
    'Unidade de Negócio',
    'Nota',
    'Comentário',
    'Início da resposta',
    'Término da resposta',
    'Situação da resposta',
    'Incompleto',
  ];

  const exemploData = [
    headers,
    [
      'BR-BPO-01-2026', 'Avaliação Mensal de Serviços - Sonda', '1', '2/6/26',
      'João Silva', 'joao@email.com', 'EMPRESA ABC', 'NÃO',
      'VMI - Multi Industrias', '[BPO] Business Process Outsourcing', '9', 'Ótimo atendimento',
      '2/10/26', '2/10/26', 'Encerrado', 'Não',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(exemploData);
  ws['!cols'] = headers.map(() => ({ wch: 25 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template_pesquisa_mensal_ams.xlsx');
}
