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
    orange: '#ea580c', // Laranja para requerimentos
    purple: '#9333ea' // Roxo para percentuais
  };

  /**
   * Formata horas removendo os segundos (HH:MM:SS -> HH:MM)
   */
  private formatarHorasSemSegundos(horasCompletas: string | undefined | null): string {
    // Validação de entrada
    if (!horasCompletas || horasCompletas === '--' || horasCompletas === '') {
      return '--';
    }
    
    // Garantir que é string
    const horasStr = String(horasCompletas);
    
    // Se já está no formato HH:MM, retorna direto
    if (horasStr.split(':').length === 2) return horasStr;
    
    // Remove os segundos (pega apenas HH:MM)
    const partes = horasStr.split(':');
    if (partes.length >= 2) {
      return `${partes[0]}:${partes[1]}`;
    }
    
    // Fallback se formato inválido
    return '--';
  }

  /**
   * Gera PDF completo do book
   */
  async gerarPDF(bookData: BookData): Promise<Blob> {
    try {
      const doc = new jsPDF({
        orientation: 'landscape', // ✅ HORIZONTAL
        unit: 'mm',
        format: [225, 395] // Tamanho customizado: [altura, largura] em landscape
      });

      // Log para debug
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      console.log(`📄 PDF criado - Orientação: landscape, Dimensões: ${pageWidth}mm x ${pageHeight}mm`);

      // Configurar fonte padrão
      // Web usa Inter (Google Fonts), mas no PDF usamos Helvetica
      // Helvetica é a fonte sans-serif mais próxima da Inter disponível no jsPDF
      // Ambas são fontes modernas, limpas e altamente legíveis
      doc.setFont('helvetica');
      console.log('✅ Usando Helvetica (aproximação visual da Inter do web)');

      // Gerar cada seção
      await this.gerarCapa(doc, bookData);
      
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
   * Gera a capa do book - Layout fiel à capa web com imagens
   */
  private async gerarCapa(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    console.log(`📄 Gerando capa - Dimensões: ${pageWidth}mm x ${pageHeight}mm`);

    // ===== PARTE SUPERIOR: Fundo azul com logo N e informações =====
    // Usar 70% para parte azul, deixando 30% para parte branca
    const alturaSuperior = pageHeight * 0.70;
    
    // Background azul Sonda - SEM MARGENS (vai até as bordas)
    doc.setFillColor(this.COLORS.sondaBlue);
    doc.rect(0, 0, pageWidth, alturaSuperior, 'F');

    // Logo N MAIOR - ocupando mais espaço, sem bordas
    try {
      const logoNImg = await this.carregarImagem('/images/logo-capa-book.png');
      const logoWidth = pageWidth * 0.40; // 40% da largura
      const logoHeight = alturaSuperior * 1.02; // 102% da altura azul
      // Posicionada à direita: -2% para sair um pouco da borda
      const logoX = pageWidth - logoWidth + (pageWidth * -0.005);
      const logoY = (alturaSuperior - logoHeight) / 2;
      
      console.log(`🖼️ Logo N - Tamanho: ${logoWidth}mm x ${logoHeight}mm, Posição: (${logoX}, ${logoY})`);
      
      doc.addImage(logoNImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.warn('Não foi possível carregar logo N, usando texto:', error);
      // Fallback: usar texto "N"
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(200);
      doc.setFont('helvetica', 'bold');
      const logoX = pageWidth * 0.75;
      const logoY = alturaSuperior / 2;
      doc.text('N', logoX, logoY, { align: 'center' });
    }

    // Conteúdo à esquerda - MAIS PARA BAIXO (como no web)
    const margemEsquerda = 20;
    const yInicio = alturaSuperior * 0.60; // Mais para baixo (antes era 0.45)

    // Nome da Empresa Abreviado - FONTE HELVETICA (aproximação da Inter do web)
    // Web: text-6xl (60px) font-light tracking-wider uppercase
    // PDF: 48pt (equivalente a 60px) normal
    // Helvetica é visualmente muito similar à Inter (ambas sans-serif modernas)
    doc.setTextColor(this.COLORS.white);
    doc.setFontSize(48); // text-6xl do web = 60px ≈ 48pt
    doc.setFont('helvetica', 'normal');
    doc.text(
      (bookData.capa.empresa_nome_abreviado || bookData.empresa_nome).toUpperCase(), 
      margemEsquerda, 
      yInicio + 28
    );

    // "Book Mensal" - FONTE HELVETICA BOLD (aproximação da Inter Bold do web)
    // Web: text-6xl (60px) font-bold tracking-tight
    // PDF: 48pt (equivalente a 60px) bold
    doc.setFontSize(48); // text-6xl do web = 60px ≈ 48pt
    doc.setFont('helvetica', 'bold');
    doc.text('Book Mensal', margemEsquerda, yInicio + 48);

    // ===== PARTE INFERIOR: Fundo branco com período e logo =====
    const yBranco = alturaSuperior;
    const alturaInferior = pageHeight - alturaSuperior;
    
    // Background branco - SEM MARGENS (vai até as bordas)
    doc.setFillColor(this.COLORS.white);
    doc.rect(0, yBranco, pageWidth, alturaInferior, 'F');

    // Período em caixa azul (lado esquerdo) - MENOR e SEM SOMBRA
    const periodoBoxWidth = 100; // Reduzido de 120
    const periodoBoxHeight = 25; // Reduzido de 30
    const periodoBoxX = margemEsquerda;
    const periodoBoxY = yBranco + 15;
    
    // Caixa azul SEM SOMBRA
    doc.setFillColor(this.COLORS.sondaBlue);
    doc.roundedRect(periodoBoxX, periodoBoxY, periodoBoxWidth, periodoBoxHeight, 5, 5, 'F');
    
    // Texto do período - FONTE AJUSTADA
    doc.setTextColor(this.COLORS.white);
    doc.setFontSize(38); // Reduzido para caber melhor no card menor
    doc.setFont('helvetica', 'bold');
    doc.text(
      bookData.capa.periodo, 
      periodoBoxX + periodoBoxWidth / 2, 
      periodoBoxY + periodoBoxHeight / 2 + 4, 
      { align: 'center' }
    );

    // Logo Sonda (lado direito) - MAIOR (não comprimir)
    const logoSondaWidth = 38;
    const logoSondaHeight = 13; 
    const logoSondaX = pageWidth - logoSondaWidth - 20; // Alinhado à direita
    const logoSondaY = periodoBoxY + 10;
    
    try {
      const logoSondaImg = await this.carregarImagem('/images/sonda-logo.png');
      doc.addImage(logoSondaImg, 'PNG', logoSondaX, logoSondaY, logoSondaWidth, logoSondaHeight);
    } catch (error) {
      console.warn('Não foi possível carregar logo Sonda, usando texto:', error);
      // Fallback: usar texto
      doc.setTextColor(this.COLORS.sondaBlue);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('SONDA', logoSondaX + logoSondaWidth/2, logoSondaY + 15, { align: 'center' });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('make it easy', logoSondaX + logoSondaWidth/2, logoSondaY + 22, { align: 'center' });
    }

    // Texto "Fonte: Aranda" abaixo do card do período
    doc.setTextColor(this.COLORS.sondaBlue);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Fonte: Aranda', periodoBoxX, periodoBoxY + periodoBoxHeight + 8);

    // REMOVER rodapé da capa (Gerado em... e Página 1 de 6)
    // A capa não terá mais essas informações
  }

  /**
   * Carrega uma imagem e retorna como base64
   */
  private async carregarImagem(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Não foi possível criar contexto do canvas'));
        }
      };
      img.onerror = () => reject(new Error(`Erro ao carregar imagem: ${url}`));
      img.src = url;
    });
  }

  /**
   * Gera página de volumetria - EXATAMENTE igual ao modal web
   */
  private gerarVolumetria(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 15;

    // Título (igual ao web)
    doc.setTextColor('#111827'); // gray-900
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Volumetria ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}`, 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280'); // gray-500
    doc.text('Visão Geral de Chamados e Desempenho Operacional', 20, yPos + 6);

    yPos += 20;

    // ===== 4 CARDS DE MÉTRICAS (EXATAMENTE COMO NO WEB) =====
    const cardWidth = (pageWidth - 70) / 4;
    const cardHeight = 50; // Aumentado para acomodar ícone
    const cardGap = 5;
    
    // Card 1: ABERTOS | MÊS (CINZA - igual ao web)
    let xCard = 20;
    doc.setFillColor('#ffffff'); // white background
    doc.setDrawColor('#e5e7eb'); // gray-200 border
    doc.setLineWidth(0.5);
    doc.roundedRect(xCard, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    // Ícone circular cinza
    doc.setFillColor('#f3f4f6'); // gray-100
    doc.circle(xCard + 10, yPos + 10, 4, 'F');
    
    // Título
    doc.setFontSize(7);
    doc.setTextColor('#4b5563'); // gray-600
    doc.setFont('helvetica', 'bold');
    doc.text('ABERTOS | MÊS', xCard + 18, yPos + 11);
    
    // Linha 1: Valor + Label (alinhados horizontalmente)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#4b5563'); // gray-600
    doc.text(String(bookData.volumetria.abertos_mes.solicitacao), xCard + 8, yPos + 24);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280'); // gray-500
    doc.text('SOLICITAÇÃO', xCard + cardWidth - 8, yPos + 24, { align: 'right' });
    
    // Linha 2: Valor + Label
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#4b5563'); // gray-600
    doc.text(String(bookData.volumetria.abertos_mes.incidente), xCard + 8, yPos + 34);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280'); // gray-500
    doc.text('INCIDENTE', xCard + cardWidth - 8, yPos + 34, { align: 'right' });
    
    // Linha divisória
    doc.setDrawColor('#e5e7eb'); // gray-200
    doc.setLineWidth(0.3);
    doc.line(xCard + 5, yPos + 37, xCard + cardWidth - 5, yPos + 37);
    
    // Total
    const totalAbertos = bookData.volumetria.abertos_mes.solicitacao + bookData.volumetria.abertos_mes.incidente;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111827'); // gray-900
    doc.text(String(totalAbertos), xCard + 8, yPos + 46);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#374151'); // gray-700
    doc.text('TOTAL', xCard + cardWidth - 8, yPos + 46, { align: 'right' });

    // Card 2: FECHADOS | MÊS (AZUL - igual ao web)
    xCard += cardWidth + cardGap;
    doc.setFillColor('#ffffff');
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.5);
    doc.roundedRect(xCard, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    // Ícone circular azul
    doc.setFillColor('#dbeafe'); // blue-100
    doc.circle(xCard + 10, yPos + 10, 4, 'F');
    
    // Título
    doc.setFontSize(7);
    doc.setTextColor('#4b5563'); // gray-600
    doc.setFont('helvetica', 'bold');
    doc.text('FECHADOS | MÊS', xCard + 18, yPos + 11);
    
    // Linha 1: Valor + Label
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#2563eb'); // blue-600
    doc.text(String(bookData.volumetria.fechados_mes.solicitacao), xCard + 8, yPos + 24);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280'); // gray-500
    doc.text('SOLICITAÇÃO', xCard + cardWidth - 8, yPos + 24, { align: 'right' });
    
    // Linha 2: Valor + Label
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#2563eb'); // blue-600
    doc.text(String(bookData.volumetria.fechados_mes.incidente), xCard + 8, yPos + 34);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280'); // gray-500
    doc.text('INCIDENTE', xCard + cardWidth - 8, yPos + 34, { align: 'right' });
    
    // Linha divisória
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.3);
    doc.line(xCard + 5, yPos + 37, xCard + cardWidth - 5, yPos + 37);
    
    // Total
    const totalFechados = bookData.volumetria.fechados_mes.solicitacao + bookData.volumetria.fechados_mes.incidente;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#2563eb'); // blue-600
    doc.text(String(totalFechados), xCard + 8, yPos + 46);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#374151'); // gray-700
    doc.text('TOTAL', xCard + cardWidth - 8, yPos + 46, { align: 'right' });

    // Card 3: SLA MÉDIO (LARANJA - igual ao web)
    xCard += cardWidth + cardGap;
    doc.setFillColor('#ffffff');
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.5);
    doc.roundedRect(xCard, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    // Ícone circular amarelo
    doc.setFillColor('#fef3c7'); // yellow-100
    doc.circle(xCard + 10, yPos + 10, 4, 'F');
    
    // Título
    doc.setFontSize(7);
    doc.setTextColor('#4b5563'); // gray-600
    doc.setFont('helvetica', 'bold');
    doc.text('SLA MÉDIO', xCard + 18, yPos + 11);
    
    // Valor grande centralizado
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ea580c'); // orange-600
    doc.text(`${bookData.volumetria.sla_medio.toFixed(1)}%`, xCard + cardWidth / 2, yPos + 35, { align: 'center' });

    // Card 4: TOTAL BACKLOG (CINZA - igual ao web)
    xCard += cardWidth + cardGap;
    doc.setFillColor('#ffffff');
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.5);
    doc.roundedRect(xCard, yPos, cardWidth, cardHeight, 3, 3, 'FD');
    
    // Ícone circular cinza
    doc.setFillColor('#f3f4f6'); // gray-100
    doc.circle(xCard + 10, yPos + 10, 4, 'F');
    
    // Título
    doc.setFontSize(7);
    doc.setTextColor('#4b5563'); // gray-600
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL BACKLOG', xCard + 18, yPos + 11);
    
    // Valor grande centralizado
    doc.setFontSize(32);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111827'); // gray-900
    doc.text(String(bookData.volumetria.total_backlog), xCard + cardWidth / 2, yPos + 32, { align: 'center' });
    
    // Texto pequeno abaixo
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280'); // gray-500
    doc.text('Pendentes de atuação', xCard + cardWidth / 2, yPos + 40, { align: 'center' });

    yPos += cardHeight + 15;

    // ===== LAYOUT 2 COLUNAS: GRÁFICO + CARD GRUPOS (IGUAL AO WEB) =====
    const graficoWidth = (pageWidth - 50) * 0.62;
    const cardGruposWidth = (pageWidth - 50) * 0.38 - 10;
    const cardGruposX = 20 + graficoWidth + 10;
    const sectionHeight = 90;

    // GRÁFICO: Chamados | Semestre (com borda igual ao web)
    doc.setFillColor('#ffffff');
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, graficoWidth, sectionHeight, 3, 3, 'FD');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111827');
    doc.text('Chamados | Semestre', 25, yPos + 10);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#6b7280');
    doc.text('Monitoramento do volume mensal', 25, yPos + 16);
    
    // Placeholder para gráfico
    doc.setFontSize(10);
    doc.setTextColor('#9ca3af');
    doc.text('[Gráfico de barras será implementado]', 25, yPos + sectionHeight / 2);

    // CARD: Chamados por Grupo (com borda igual ao web)
    doc.setFillColor('#ffffff');
    doc.setDrawColor('#e5e7eb');
    doc.setLineWidth(0.5);
    doc.roundedRect(cardGruposX, yPos, cardGruposWidth, sectionHeight, 3, 3, 'FD');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111827');
    doc.text('CHAMADOS | GRUPO | MÊS', cardGruposX + 5, yPos + 10);
    
    let yGrupo = yPos + 18;
    const grupoItemHeight = 22;
    
    bookData.volumetria.chamados_por_grupo.forEach((grupo, index) => {
      if (index >= 3) return;
      
      // Nome do grupo e Total
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#111827');
      doc.text(grupo.grupo, cardGruposX + 5, yGrupo);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#6b7280');
      doc.text(`Total: ${grupo.total}`, cardGruposX + cardGruposWidth - 20, yGrupo, { align: 'right' });
      
      // Boxes Abertos/Fechados
      const boxWidth = (cardGruposWidth - 15) / 2;
      const boxHeight = 12;
      const boxY = yGrupo + 3;
      
      // Box ABERTOS (cinza claro - igual ao web)
      doc.setFillColor('#f3f4f6'); // gray-100
      doc.roundedRect(cardGruposX + 5, boxY, boxWidth, boxHeight, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#4b5563'); // gray-600
      doc.text(String(grupo.abertos), cardGruposX + 5 + boxWidth / 2, boxY + 6, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#6b7280'); // gray-500
      doc.text('ABERTOS', cardGruposX + 5 + boxWidth / 2, boxY + 10, { align: 'center' });
      
      // Box FECHADOS (azul - igual ao web)
      doc.setFillColor('#2563eb'); // blue-600
      doc.roundedRect(cardGruposX + 10 + boxWidth, boxY, boxWidth, boxHeight, 2, 2, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#ffffff'); // white
      doc.text(String(grupo.fechados), cardGruposX + 10 + boxWidth + boxWidth / 2, boxY + 6, { align: 'center' });
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#dbeafe'); // blue-100
      doc.text('FECHADOS', cardGruposX + 10 + boxWidth + boxWidth / 2, boxY + 10, { align: 'center' });
      
      yGrupo += grupoItemHeight;
    });

    yPos += sectionHeight + 15;

    // ===== TABELA: Chamados X CAUSA (IGUAL AO WEB) =====
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#111827');
    doc.text('Chamados X CAUSA', 20, yPos);
    
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['ORIGEM', 'ABERTOS', 'FECHADOS']],
      body: bookData.volumetria.backlog_por_causa.map(item => [
        item.origem,
        item.abertos || 0,
        item.fechados || 0
      ]),
      foot: [[
        'TOTAL',
        bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + (item.abertos || 0), 0),
        bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + (item.fechados || 0), 0)
      ]],
      theme: 'grid',
      headStyles: {
        fillColor: [249, 250, 251], // gray-50 (igual ao web)
        textColor: [17, 24, 39], // gray-900
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [17, 24, 39]
      },
      footStyles: {
        fillColor: [37, 99, 235], // blue-600 (igual ao web)
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center'
      },
      styles: {
        cellPadding: 4,
        lineColor: [229, 231, 235], // gray-200
        lineWidth: 0.5
      },
      columnStyles: {
        0: { 
          cellWidth: 200, 
          fontStyle: 'bold',
          halign: 'left'
        },
        1: { 
          halign: 'center', 
          cellWidth: 50, 
          fillColor: [243, 244, 246] // gray-100 (igual ao web)
        },
        2: { 
          halign: 'center', 
          cellWidth: 50, 
          fillColor: [219, 234, 254] // blue-50 (igual ao web)
        }
      },
      margin: { left: 20, right: 20 }
    });
  }

  /**
   * Gera página de SLA (HORIZONTAL - Otimizado)
   */
  private gerarSLA(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margemInferior = 20; // Reservar espaço para rodapé
    let yPos = 15; // Reduzir margem superior

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`SLA ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}`, 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Dashboard de Monitoramento de Nível de Serviço', 20, yPos + 6);

    yPos += 18;

    // Layout em 2 colunas: Card SLA + Métricas
    const col1Width = 100;
    const col2X = col1Width + 30;
    
    // Coluna 1: Card de SLA
    const cardHeight = 50;
    
    doc.setFillColor(this.COLORS.gray50);
    doc.roundedRect(20, yPos, col1Width, cardHeight, 3, 3, 'F');
    
    // SLA Percentual
    const slaColor = bookData.sla.status === 'vencido' ? this.COLORS.red : this.COLORS.green;
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slaColor);
    doc.text(`${bookData.sla.sla_percentual}%`, 70, yPos + 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(this.COLORS.gray600);
    doc.text('STATUS ATUAL', 70, yPos + 36, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Meta: ${bookData.sla.meta_percentual}%`, 70, yPos + 45, { align: 'center' });

    // Coluna 2: Cards de métricas (3 cards verticais)
    const metricCardWidth = (pageWidth - col2X - 30) / 3;
    const metricCardHeight = 50;
    
    const metrics = [
      { label: 'FECHADOS', value: bookData.sla.fechados, color: this.COLORS.sondaBlue },
      { label: 'INCIDENTES', value: bookData.sla.incidentes, color: this.COLORS.yellow },
      { label: 'VIOLADOS', value: bookData.sla.violados, color: this.COLORS.red }
    ];

    metrics.forEach((metric, index) => {
      const xPos = col2X + (index * (metricCardWidth + 5));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, metricCardWidth, metricCardHeight, 3, 3, 'F');
      
      doc.setFontSize(9);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'bold');
      doc.text(metric.label, xPos + metricCardWidth / 2, yPos + 12, { align: 'center' });
      
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(metric.color);
      doc.text(String(metric.value), xPos + metricCardWidth / 2, yPos + 35, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 15;

    // Tabela: Chamados Violados - Otimizada para horizontal
    doc.setFontSize(14);
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
          fontSize: 11,
          halign: 'center'
        },
        styles: {
          fontSize: 10,
          cellPadding: 4
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'bold', textColor: this.COLORS.sondaBlue, halign: 'center' },
          1: { cellWidth: 35, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 35, halign: 'center' },
          4: { cellWidth: 60 }
        },
        margin: { left: 20, right: 20 }
      });
    } else {
      doc.setFontSize(11);
      doc.setTextColor(this.COLORS.gray600);
      doc.text('✓ Nenhum chamado violado no período', 20, yPos + 10);
    }
  }

  /**
   * Gera página de backlog (HORIZONTAL - Otimizado)
   */
  private gerarBacklog(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margemInferior = 20; // Reservar espaço para rodapé
    let yPos = 15; // Reduzir margem superior

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Backlog ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}`, 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Visão detalhada de pendências e envelhecimento de chamados', 20, yPos + 6);

    yPos += 18;

    // Cards de métricas (3 cards maiores)
    const cardWidth = (pageWidth - 60) / 3;
    const cardHeight = 40;
    const cards = [
      { label: 'TOTAL', value: bookData.backlog.total, color: this.COLORS.gray900 },
      { label: 'INCIDENTE', value: bookData.backlog.incidente, color: this.COLORS.red },
      { label: 'SOLICITAÇÃO', value: bookData.backlog.solicitacao, color: this.COLORS.green }
    ];

    cards.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 10));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'bold');
      doc.text(card.label, xPos + cardWidth / 2, yPos + 12, { align: 'center' });
      
      doc.setFontSize(36);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + cardWidth / 2, yPos + 32, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 15;

    // Tabela: Aging dos Chamados - Otimizada para horizontal
    doc.setFontSize(14);
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
        fillColor: this.COLORS.sondaBlue,
        textColor: this.COLORS.white,
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { halign: 'center', cellWidth: 45 },
        2: { halign: 'center', cellWidth: 45 },
        3: { halign: 'center', cellWidth: 45, fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 }
    });
  }

  /**
   * Gera página de consumo (HORIZONTAL - Otimizado)
   */
  private gerarConsumo(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margemInferior = 20;
    let yPos = 15;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Consumo ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}`, 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Visão detalhada de utilização de horas e baseline', 20, yPos + 6);

    yPos += 18;

    // Cards de métricas (6 cards em 2 linhas)
    const cardWidth = (pageWidth - 70) / 3;
    const cardHeight = 35;
    
    // Funções auxiliares para cálculos
    const calcularTotalHorasRequerimentos = (): string => {
      if (!bookData.consumo.requerimentos_descontados || bookData.consumo.requerimentos_descontados.length === 0) {
        return '00:00';
      }
      
      let totalMinutos = 0;
      bookData.consumo.requerimentos_descontados.forEach(req => {
        if (req.total_horas && req.total_horas !== '--') {
          const partes = req.total_horas.split(':');
          if (partes.length >= 2) {
            const horas = parseInt(partes[0]) || 0;
            const minutos = parseInt(partes[1]) || 0;
            totalMinutos += (horas * 60) + minutos;
          }
        }
      });
      
      const horas = Math.floor(totalMinutos / 60);
      const minutos = totalMinutos % 60;
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    };

    const calcularConsumoTotal = (): string => {
      const horasConsumo = bookData.consumo.horas_consumo || '00:00';
      const horasRequerimentos = calcularTotalHorasRequerimentos();
      
      const partesConsumo = horasConsumo.split(':');
      const partesReq = horasRequerimentos.split(':');
      
      const hC = parseInt(partesConsumo[0]) || 0;
      const mC = parseInt(partesConsumo[1]) || 0;
      const hR = parseInt(partesReq[0]) || 0;
      const mR = parseInt(partesReq[1]) || 0;
      
      const totalMinutos = (hC * 60 + mC) + (hR * 60 + mR);
      
      const horas = Math.floor(totalMinutos / 60);
      const minutos = totalMinutos % 60;
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    };
    
    // LINHA 1
    const cardsLinha1 = [
      { label: 'CONSUMO TOTAL', value: calcularConsumoTotal(), color: this.COLORS.purple },
      { label: 'HORAS CONSUMO', value: this.formatarHorasSemSegundos(bookData.consumo.horas_consumo), color: this.COLORS.sondaBlue },
      { label: 'HORAS REQUERIMENTOS', value: calcularTotalHorasRequerimentos(), color: this.COLORS.orange }
    ];
    
    // LINHA 2
    const cardsLinha2 = [
      { label: 'BASELINE DE APL', value: this.formatarHorasSemSegundos(bookData.consumo.baseline_apl), color: this.COLORS.purple },
      { label: 'INCIDENTE', value: bookData.consumo.incidente === '--' ? '--' : this.formatarHorasSemSegundos(bookData.consumo.incidente), color: this.COLORS.sondaBlue },
      { label: 'SOLICITAÇÃO', value: this.formatarHorasSemSegundos(bookData.consumo.solicitacao), color: this.COLORS.sondaBlue }
    ];

    // Linha 1
    cardsLinha1.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 10));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'bold');
      doc.text(card.label, xPos + cardWidth / 2, yPos + 10, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + cardWidth / 2, yPos + 26, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 5;

    // Linha 2
    cardsLinha2.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 10));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setFontSize(8);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'bold');
      doc.text(card.label, xPos + cardWidth / 2, yPos + 10, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + cardWidth / 2, yPos + 26, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 15;

    // Tabela: Distribuição de Causa
    doc.setFontSize(14);
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
        fillColor: this.COLORS.sondaBlue,
        textColor: this.COLORS.white,
        fontStyle: 'bold',
        fontSize: 11,
        halign: 'center'
      },
      footStyles: {
        fillColor: this.COLORS.sondaDarkBlue,
        textColor: this.COLORS.white,
        fontStyle: 'bold',
        fontSize: 11
      },
      styles: {
        fontSize: 10,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: 'center', cellWidth: 50 },
        2: { halign: 'center', cellWidth: 50, fontStyle: 'bold' }
      },
      margin: { left: 20, right: 20 }
    });
  }

  /**
   * Gera página de pesquisa (HORIZONTAL - Otimizado)
   */
  private gerarPesquisa(doc: jsPDF, bookData: BookData) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margemInferior = 20;
    let yPos = 15;

    // Título
    doc.setTextColor(this.COLORS.gray900);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pesquisa ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}`, 20, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(this.COLORS.gray600);
    doc.text('Acompanhe as pesquisas de satisfação e aderência dos clientes', 20, yPos + 6);

    yPos += 18;

    // Cards de métricas (3 cards maiores)
    const cardWidth = (pageWidth - 60) / 3;
    const cardHeight = 45;
    const cards = [
      { label: 'RESPONDIDAS', value: bookData.pesquisa.pesquisas_respondidas, color: this.COLORS.gray600 },
      { label: 'NÃO RESPONDIDAS', value: bookData.pesquisa.pesquisas_nao_respondidas, color: this.COLORS.sondaBlue },
      { label: 'ENVIADAS', value: bookData.pesquisa.pesquisas_enviadas, color: this.COLORS.sondaBlue }
    ];

    cards.forEach((card, index) => {
      const xPos = 20 + (index * (cardWidth + 10));
      
      doc.setFillColor(this.COLORS.gray50);
      doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'bold');
      doc.text(card.label, xPos + cardWidth / 2, yPos + 14, { align: 'center' });
      
      doc.setFontSize(40);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(card.color);
      doc.text(String(card.value), xPos + cardWidth / 2, yPos + 36, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 15;

    // Layout em 2 colunas: Aderência + Satisfação
    const col1Width = (pageWidth - 50) / 2;
    const col2X = 20 + col1Width + 10;
    
    // Coluna 1: Aderência
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('% Pesquisa Aderência', 20, yPos);
    
    yPos += 10;
    
    doc.setFillColor(this.COLORS.gray50);
    doc.roundedRect(20, yPos, col1Width, 50, 3, 3, 'F');
    
    doc.setFontSize(48);
    doc.setTextColor(this.COLORS.sondaBlue);
    doc.text(`${bookData.pesquisa.percentual_aderencia.toFixed(1)}%`, 20 + col1Width / 2, yPos + 35, { align: 'center' });

    // Coluna 2: Nível de Satisfação
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.COLORS.gray900);
    doc.text('Nível de Satisfação', col2X, yPos - 10);
    
    doc.setFillColor(this.COLORS.gray50);
    doc.roundedRect(col2X, yPos, col1Width, 50, 3, 3, 'F');

    if (bookData.pesquisa.sem_avaliacoes) {
      doc.setFontSize(12);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'italic');
      doc.text('Sem avaliações recentes', col2X + col1Width / 2, yPos + 30, { align: 'center' });
    } else {
      const satisfacao = [
        { label: 'Insatisfeito', value: bookData.pesquisa.nivel_satisfacao.insatisfeito, color: this.COLORS.red },
        { label: 'Neutro', value: bookData.pesquisa.nivel_satisfacao.neutro, color: this.COLORS.yellow },
        { label: 'Satisfeito', value: bookData.pesquisa.nivel_satisfacao.satisfeito, color: this.COLORS.green }
      ];

      const itemWidth = col1Width / 3;
      satisfacao.forEach((item, index) => {
        const xPos = col2X + (index * itemWidth);
        
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(item.color);
        doc.text(String(item.value), xPos + itemWidth / 2, yPos + 25, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(this.COLORS.gray600);
        doc.setFont('helvetica', 'normal');
        doc.text(item.label, xPos + itemWidth / 2, yPos + 35, { align: 'center' });
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
      
      // Pular capa (página 1)
      if (i === 1) continue;
      
      // Linha separadora
      doc.setDrawColor(this.COLORS.gray200);
      doc.line(15, pageHeight - 12, pageWidth - 15, pageHeight - 12);
      
      // Texto do rodapé
      doc.setFontSize(7);
      doc.setTextColor(this.COLORS.gray600);
      doc.setFont('helvetica', 'normal');
      
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      doc.text(`Gerado em ${dataGeracao} - Sistema Books SND`, 15, pageHeight - 8);
      
      // Número da página
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
    }
  }

  /**
   * Salva PDF localmente (download)
   */
  async baixarPDF(bookData: BookData, nomeArquivo?: string): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookData);
      
      // Criar URL do blob
      const url = URL.createObjectURL(blob);
      
      // Abrir em nova aba PRIMEIRO (para visualização correta)
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        // Aguardar um pouco para garantir que abriu
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Depois fazer o download
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo || `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ PDF aberto em nova aba e download iniciado');
      } else {
        // Se popup bloqueado, apenas baixar
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo || `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ PDF baixado (popup bloqueado)');
      }
      
      // Limpar URL após um tempo
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      throw error;
    }
  }
}

export const booksPDFService = new BooksPDFService();
