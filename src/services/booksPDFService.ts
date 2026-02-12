/**
 * Serviço para geração de PDFs de Books
 * Gera PDFs profissionais com layout similar à visualização
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { BookData } from '@/types/books';

class BooksPDFService {
  private readonly COLORS = {
    sondaBlue: '#2563eb',
    sondaDarkBlue: '#1d4ed8',
    white: '#ffffff',
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray600: '#4b5563',
    gray900: '#111827',
    green: '#10b981',
    red: '#ef4444',
    yellow: '#f59e0b',
    orange: '#f97316'
  };

  /**
   * Gera PDF completo do book
   */
  async gerarPDF(bookData: BookData): Promise<Blob> {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configurar fonte padrão
      doc.setFont('helvetica');

      // Gerar cada seção
      this.gerarCapa(doc, bookData);
      
      doc.addPage();
      this.gerarVolumetria(doc, bookData);
      
      doc.addPage();
      this.gerarSLA(doc, bookData);
      
      doc.addPage();
      this.gerarBacklog(doc, bookData);
      
      doc.addPage();
      this.gerarConsumo(doc, bookData);
      
      doc.addPage();
      this.gerarPesquisa(doc, bookData);

      // Adicionar rodapé em todas as páginas
      this.adicionarRodape(doc);

      // Retornar como Blob
      return doc.output('blob');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Não foi possível gerar o PDF do book');
    }
  }

  /**
   * Gera a capa do book
   */
  private gerarCapa(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Background azul Sonda
    doc.setFillColor(this.COLORS.sondaBlue);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Logo "N" grande
    doc.setTextColor(this.COLORS.white);
    doc.setFontSize(120);
    doc.setFont('helvetica', 'bold');
    doc.text('N', pageWidth / 2, 80, { align: 'center' });

    // Marca SONDA
    doc.setFontSize(24);
    doc.setFont('helvetica', 'normal');
    doc.text('SONDA', pageWidth / 2, 100, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text('make it easy', pageWidth / 2, 108, { align: 'center' });

    // Nome da empresa
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.text(bookData.empresa_nome, pageWidth / 2, 140, { align: 'center' });

    // Book Mensal
    doc.setFontSize(20);
    doc.setFont('helvetica', 'normal');
    doc.text('Book Mensal', pageWidth / 2, 160, { align: 'center' });

    // Período
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(bookData.capa.periodo, pageWidth / 2, 180, { align: 'center' });

    // Data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em ${bookData.capa.data_geracao}`, pageWidth / 2, 260, { align: 'center' });
  }

  /**
   * Gera página de volumetria
   */
  private gerarVolumetria(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Volumetria RAINBOW', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Visão Geral de Chamados e Desempenho Operacional', 20, yPos + 6);

    yPos += 15;

    // Cards de métricas (4 colunas)
    const cardWidth = (pageWidth - 50) / 4;
    const cardHeight = 25;
    const cards = [
      {
        title: 'ABERTOS | MÊS',
        values: [
          { label: 'Solicitação', value: bookData.volumetria.abertos_mes.solicitacao },
          { label: 'Incidente', value: bookData.volumetria.abertos_mes.incidente }
        ],
        color: this.COLORS.sondaBlue
      },
      {
        title: 'FECHADOS | MÊS',
        values: [
          { label: 'Solicitação', value: bookData.volumetria.fechados_mes.solicitacao },
          { label: 'Incidente', value: bookData.volumetria.fechados_mes.incidente }
        ],
        color: this.COLORS.green
      },
      {
        title: 'SLA MÉDIO',
        values: [{ label: '', value: `${bookData.volumetria.sla_medio.toFixed(1)}%` }],
        color: this.COLORS.yellow
      },
      {
        title: 'TOTAL BACKLOG',
        values: [{ label: '', value: bookData.volumetria.total_backlog }],
        color: this.COLORS.gray600
      }
    ];

    cards.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 3));
      
      // Card background
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F');
      
      // Título
      doc.setFontSize(7);
      doc.setTextColor(this.COLORS.gray600);
      doc.text(card.title, xPos + 2, yPos + 5);
      
      // Valores
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      
      card.values.forEach((val, vIndex) => {
        const valueY = yPos + 12 + (vIndex * 6);
        doc.text(String(val.value), xPos + 2, valueY);
        if (val.label) {
          doc.setFontSize(7);
          doc.setTextColor(this.COLORS.gray600);
          doc.text(val.label, xPos + 15, valueY);
          doc.setFontSize(14);
          doc.setTextColor(card.color);
        }
      });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 10;

    // Tabela: Backlog por Causa
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('Backlog Atualizado X CAUSA', 20, yPos);
    
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['ORIGEM', 'INCIDENTE', 'SOLICITAÇÃO', 'TOTAL']],
      body: bookData.volumetria.backlog_por_causa.map(item => [
        item.origem,
        item.incidente || '-',
        item.solicitacao || '-',
        item.total
      ]),
      foot: [[
        'TOTAL',
        bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + item.incidente, 0),
        bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + item.solicitacao, 0),
        bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + item.total, 0)
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: this.COLORS.gray100,
        textColor: this.COLORS.gray900,
        fontStyle: 'bold',
        fontSize: 9
      },
      footStyles: {
        fillColor: this.COLORS.sondaBlue,
        textColor: this.COLORS.white,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 30, fontStyle: 'bold' }
      }
    });
  }

  /**
   * Gera página de SLA
   */
  private gerarSLA(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('SLA RAINBOW', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Dashboard de Monitoramento de Nível de Serviço', 20, yPos + 6);

    yPos += 15;

    // Card de SLA
    const cardWidth = 80;
    const cardHeight = 40;
    
    doc.setFillColor(this.COLORS.gray50);
    doc.roundedRect(20, yPos, cardWidth, cardHeight, 2, 2, 'F');
    
    // SLA Percentual
    const slaColor = bookData.sla.status === 'vencido' ? this.COLORS.red : this.COLORS.green;
    doc.setFontSize(36);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slaColor);
    doc.text(`${bookData.sla.sla_percentual}%`, 60, yPos + 20, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(this.COLORS.gray600);
    doc.text('STATUS ATUAL', 60, yPos + 26, { align: 'center' });
    
    doc.setFontSize(9);
    doc.text(`Meta: ${bookData.sla.meta_percentual}%`, 60, yPos + 35, { align: 'center' });

    // Cards de métricas
    const metricsX = 110;
    const metrics = [
      { label: 'FECHADOS', value: bookData.sla.fechados, color: this.COLORS.sondaBlue },
      { label: 'INCIDENTES', value: bookData.sla.incidentes, color: this.COLORS.yellow },
      { label: 'VIOLADOS', value: bookData.sla.violados, color: this.COLORS.red }
    ];

    metrics.forEach((metric, index) => {
      const metricY = yPos + (index * 13);
      
      doc.setFontSize(7);
      doc.setTextColor(this.COLORS.gray600);
      doc.text(metric.label, metricsX, metricY + 3);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(metric.color);
      doc.text(String(metric.value), metricsX + 40, metricY + 5);
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 10;

    // Tabela: Chamados Violados
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('CHAMADOS VIOLADOS', 20, yPos);
    
    yPos += 5;

    if (bookData.sla.chamados_violados.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['ID CHAMADO', 'TIPO', 'ABERTURA', 'SOLUÇÃO', 'GRUPO']],
        body: bookData.sla.chamados_violados.map(chamado => [
          chamado.id_chamado,
          chamado.tipo,
          chamado.data_abertura,
          chamado.data_solucao,
          chamado.grupo_atendedor
        ]),
        theme: 'grid',
        headStyles: {
          fillColor: this.COLORS.sondaBlue,
          textColor: this.COLORS.white,
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold', textColor: this.COLORS.sondaBlue },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 40 }
        }
      });
    } else {
      doc.setFontSize(10);
      doc.setTextColor(this.COLORS.gray600);
      doc.text('Nenhum chamado violado no período', 20, yPos + 10);
    }
  }

  /**
   * Gera página de backlog
   */
  private gerarBacklog(doc: jsPDF, bookData: BookData) {
    let yPos = 20;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Backlog Analysis', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Visão detalhada de pendências e envelhecimento de chamados', 20, yPos + 6);

    yPos += 15;

    // Cards de métricas
    const cardWidth = 55;
    const cardHeight = 25;
    const cards = [
      { label: 'TOTAL', value: bookData.backlog.total, color: this.COLORS.gray900 },
      { label: 'INCIDENTE', value: bookData.backlog.incidente, color: this.COLORS.red },
      { label: 'SOLICITAÇÃO', value: bookData.backlog.solicitacao, color: this.COLORS.green }
    ];

    cards.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 5));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(this.COLORS.gray600);
      doc.text(card.label, xPos + 2, yPos + 5);
      
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + 2, yPos + 18);
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 10;

    // Tabela: Aging dos Chamados
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('Aging dos Chamados', 20, yPos);
    
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['FAIXA', 'SOLICITAÇÃO', 'INCIDENTE', 'TOTAL']],
      body: bookData.backlog.aging_chamados.map(item => [
        item.faixa,
        item.solicitacao,
        item.incidente,
        item.total
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: this.COLORS.gray100,
        textColor: this.COLORS.gray900,
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { halign: 'center', cellWidth: 35 },
        2: { halign: 'center', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 35, fontStyle: 'bold' }
      }
    });
  }

  /**
   * Gera página de consumo
   */
  private gerarConsumo(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Consumo RAINBOW', 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Visão detalhada de utilização de horas e baseline', 20, yPos + 6);

    yPos += 15;

    // Cards de métricas
    const cardWidth = (pageWidth - 50) / 4;
    const cardHeight = 25;
    const cards = [
      { label: 'HORAS CONSUMO', value: bookData.consumo.horas_consumo, color: this.COLORS.sondaBlue },
      { label: 'BASELINE DE APL', value: bookData.consumo.baseline_apl, color: '#9333ea' },
      { label: 'INCIDENTE', value: bookData.consumo.incidente, color: this.COLORS.gray600 },
      { label: 'SOLICITAÇÃO', value: bookData.consumo.solicitacao, color: this.COLORS.green }
    ];

    cards.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 3));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F');
      
      doc.setFontSize(7);
      doc.setTextColor(this.COLORS.gray600);
      doc.text(card.label, xPos + 2, yPos + 5);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + 2, yPos + 15);
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 10;

    // Barra de progresso
    doc.setFontSize(10);
    doc.setTextColor(this.COLORS.gray900);
    doc.text(`Percentual Consumido: ${bookData.consumo.percentual_consumido}%`, 20, yPos);
    
    yPos += 5;
    
    const barWidth = pageWidth - 40;
    const barHeight = 8;
    
    // Background da barra
    doc.setFillColor(this.COLORS.gray200);
    doc.roundedRect(20, yPos, barWidth, barHeight, 2, 2, 'F');
    
    // Progresso
    const progressWidth = (barWidth * bookData.consumo.percentual_consumido) / 100;
    doc.setFillColor('#9333ea');
    doc.roundedRect(20, yPos, progressWidth, barHeight, 2, 2, 'F');

    yPos += barHeight + 10;

    // Tabela: Distribuição de Causa
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('Distribuição de Causa', 20, yPos);
    
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['CAUSA', 'QUANTIDADE', 'PERCENTUAL']],
      body: bookData.consumo.distribuicao_causa.map(item => [
        item.causa,
        item.quantidade,
        `${item.percentual}%`
      ]),
      foot: [['TOTAL GERAL', bookData.consumo.total_geral, '100%']],
      theme: 'grid',
      headStyles: {
        fillColor: this.COLORS.gray100,
        textColor: this.COLORS.gray900,
        fontStyle: 'bold',
        fontSize: 9
      },
      footStyles: {
        fillColor: this.COLORS.sondaBlue,
        textColor: this.COLORS.white,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 40 },
        2: { halign: 'center', cellWidth: 40, fontStyle: 'bold' }
      }
    });
  }

  /**
   * Gera página de pesquisa
   */
  private gerarPesquisa(doc: jsPDF, bookData: BookData) {
    let yPos = 20;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Pesquisa RAINBOW', 20, yPos);

    yPos += 10;

    // Cards de métricas
    const cardWidth = 55;
    const cardHeight = 30;
    const cards = [
      { label: 'RESPONDIDAS', value: bookData.pesquisa.pesquisas_respondidas, color: this.COLORS.gray600 },
      { label: 'NÃO RESPONDIDAS', value: bookData.pesquisa.pesquisas_nao_respondidas, color: this.COLORS.sondaBlue },
      { label: 'ENVIADAS', value: bookData.pesquisa.pesquisas_enviadas, color: this.COLORS.sondaBlue }
    ];

    cards.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 5));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 2, 2, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(this.COLORS.gray600);
      doc.text(card.label, xPos + cardWidth / 2, yPos + 5, { align: 'center' });
      
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + cardWidth / 2, yPos + 22, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 10;

    // Aderência
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('% Pesquisa Aderência', 20, yPos);
    
    yPos += 5;
    
    doc.setFontSize(36);
    doc.setTextColor(this.COLORS.sondaBlue);
    doc.text(`${bookData.pesquisa.percentual_aderencia.toFixed(1)}%`, 20, yPos + 15);

    yPos += 25;

    // Nível de Satisfação
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('Nível de Satisfação', 20, yPos);
    
    yPos += 10;

    if (bookData.pesquisa.sem_avaliacoes) {
      doc.setFontSize(10);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'italic');
      doc.text('Sem avaliações recentes', 20, yPos);
    } else {
      const satisfacao = [
        { label: 'Insatisfeito', value: bookData.pesquisa.nivel_satisfacao.insatisfeito, color: this.COLORS.red },
        { label: 'Neutro', value: bookData.pesquisa.nivel_satisfacao.neutro, color: this.COLORS.yellow },
        { label: 'Satisfeito', value: bookData.pesquisa.nivel_satisfacao.satisfeito, color: this.COLORS.green }
      ];

      satisfacao.forEach((item, index) => {
        const xPos = 20 + (index * 60);
        
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(item.color);
        doc.text(String(item.value), xPos, yPos);
        
        doc.setFontSize(9);
        doc.setTextColor(this.COLORS.gray600);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, xPos, yPos + 6);
      });
    }
  }

  /**
   * Adiciona rodapé em todas as páginas
   */
  private adicionarRodape(doc: jsPDF) {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Linha separadora
      doc.setDrawColor(this.COLORS.gray200);
      doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
      
      // Texto do rodapé
      doc.setFontSize(8);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'normal');
      
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      doc.text(`Gerado em ${dataGeracao} - Sistema Books SND`, 20, pageHeight - 10);
      
      // Número da página
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }
  }

  /**
   * Salva PDF localmente (download)
   */
  async baixarPDF(bookData: BookData, nomeArquivo?: string): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookData);
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo || `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`;
      link.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      throw error;
    }
  }
}

export const booksPDFService = new BooksPDFService();
