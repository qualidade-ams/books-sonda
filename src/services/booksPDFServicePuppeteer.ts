/**
 * Serviço para geração de PDFs de Books usando Puppeteer
 * Substitui completamente o @react-pdf/renderer
 * 
 * Gera HTML completo e envia para API Puppeteer para conversão em PDF
 * Mantém 100% de fidelidade visual ao layout web
 */

import type { BookData } from '@/types/books';
import { puppeteerPDFService } from './puppeteerPDFService';

class BooksPDFServicePuppeteer {
  /**
   * Gera HTML completo do book para conversão em PDF
   */
  private gerarHTMLCompleto(bookData: BookData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book ${bookData.empresa_nome} - ${bookData.mes}/${bookData.ano}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: white;
      color: #111827;
      line-height: 1.5;
    }

    /* Configuração de página para impressão */
    @page {
      size: 395mm 225mm; /* Landscape customizado */
      margin: 0;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* Cores Sonda */
    :root {
      --sonda-blue: #2563eb;
      --sonda-dark-blue: #1d4ed8;
      --sonda-light-blue: #3b82f6;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-600: #4b5563;
      --gray-900: #111827;
    }

    .page {
      width: 395mm;
      height: 225mm;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    .page:last-child {
      page-break-after: auto;
    }

    /* Capa */
    .capa {
      background: linear-gradient(to bottom, var(--sonda-blue) 70%, white 70%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0;
    }

    .capa-superior {
      flex: 0.7;
      position: relative;
      padding: 40px;
      display: flex;
      align-items: flex-end;
    }

    .capa-logo-n {
      position: absolute;
      right: -10px;
      top: 50%;
      transform: translateY(-50%);
      width: 40%;
      height: 102%;
      object-fit: cover;
    }

    .capa-conteudo {
      z-index: 10;
      color: white;
    }

    .capa-empresa {
      font-size: 48pt;
      font-weight: 300;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .capa-titulo {
      font-size: 48pt;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .capa-inferior {
      flex: 0.3;
      background: white;
      padding: 20px 40px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .capa-periodo-box {
      background: var(--sonda-blue);
      color: white;
      padding: 15px 30px;
      border-radius: 8px;
      font-size: 38pt;
      font-weight: 700;
    }

    .capa-fonte {
      color: var(--sonda-blue);
      font-size: 10pt;
      margin-top: 10px;
    }

    .capa-logo-sonda {
      height: 40px;
    }

    /* Páginas internas */
    .page-content {
      padding: 20px 30px;
    }

    .page-header {
      margin-bottom: 20px;
    }

    .page-title {
      font-size: 20pt;
      font-weight: 700;
      color: var(--gray-900);
      margin-bottom: 5px;
    }

    .page-subtitle {
      font-size: 10pt;
      color: var(--gray-600);
    }

    /* Cards de métricas */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: var(--gray-50);
      border: 1px solid var(--gray-200);
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }

    .metric-label {
      font-size: 8pt;
      font-weight: 600;
      color: var(--gray-600);
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    .metric-value {
      font-size: 32pt;
      font-weight: 700;
    }

    .metric-value.blue { color: var(--sonda-blue); }
    .metric-value.orange { color: #ea580c; }
    .metric-value.purple { color: #9333ea; }
    .metric-value.gray { color: var(--gray-900); }
    .metric-value.green { color: #10b981; }
    .metric-value.red { color: #ef4444; }

    /* Tabelas */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10pt;
    }

    thead {
      background: var(--gray-50);
    }

    th {
      padding: 10px;
      text-align: left;
      font-weight: 700;
      color: var(--gray-900);
      border: 1px solid var(--gray-200);
    }

    td {
      padding: 8px 10px;
      border: 1px solid var(--gray-200);
    }

    tbody tr:nth-child(even) {
      background: var(--gray-50);
    }

    tfoot {
      background: var(--sonda-blue);
      color: white;
      font-weight: 700;
    }

    tfoot td {
      border-color: var(--sonda-dark-blue);
    }

    /* Rodapé */
    .page-footer {
      position: absolute;
      bottom: 10px;
      left: 20px;
      right: 20px;
      padding-top: 10px;
      border-top: 1px solid var(--gray-200);
      display: flex;
      justify-content: space-between;
      font-size: 7pt;
      color: var(--gray-600);
    }
  </style>
</head>
<body>
  <!-- CAPA -->
  <div class="page capa">
    <div class="capa-superior">
      <img src="/images/logo-capa-book.png" alt="Logo N" class="capa-logo-n" />
      <div class="capa-conteudo">
        <div class="capa-empresa">${(bookData.capa.empresa_nome_abreviado || bookData.empresa_nome).toUpperCase()}</div>
        <div class="capa-titulo">Book Mensal</div>
      </div>
    </div>
    <div class="capa-inferior">
      <div>
        <div class="capa-periodo-box">${bookData.capa.periodo}</div>
        <div class="capa-fonte">Fonte: Aranda</div>
      </div>
      <img src="/images/sonda-logo.png" alt="Sonda" class="capa-logo-sonda" />
    </div>
  </div>

  <!-- VOLUMETRIA -->
  <div class="page">
    <div class="page-content">
      <div class="page-header">
        <div class="page-title">Volumetria ${bookData.capa.empresa_nome_abreviado || bookData.empresa_nome}</div>
        <div class="page-subtitle">Visão Geral de Chamados e Desempenho Operacional</div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Abertos | Mês</div>
          <div class="metric-value gray">${bookData.volumetria.abertos_mes.solicitacao + bookData.volumetria.abertos_mes.incidente}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Fechados | Mês</div>
          <div class="metric-value blue">${bookData.volumetria.fechados_mes.solicitacao + bookData.volumetria.fechados_mes.incidente}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">SLA Médio</div>
          <div class="metric-value orange">${bookData.volumetria.sla_medio.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Total Backlog</div>
          <div class="metric-value gray">${bookData.volumetria.total_backlog}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>ORIGEM</th>
            <th style="text-align: center;">ABERTOS</th>
            <th style="text-align: center;">FECHADOS</th>
          </tr>
        </thead>
        <tbody>
          ${bookData.volumetria.backlog_por_causa.map(item => `
            <tr>
              <td><strong>${item.origem}</strong></td>
              <td style="text-align: center;">${item.abertos || 0}</td>
              <td style="text-align: center;">${item.fechados || 0}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td><strong>TOTAL</strong></td>
            <td style="text-align: center;">${bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + (item.abertos || 0), 0)}</td>
            <td style="text-align: center;">${bookData.volumetria.backlog_por_causa.reduce((sum, item) => sum + (item.fechados || 0), 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="page-footer">
      <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND</span>
      <span>Página 2 de 6</span>
    </div>
  </div>

  <!-- Adicionar outras páginas aqui: SLA, Backlog, Consumo, Pesquisa -->
  
</body>
</html>
    `.trim();
  }

  /**
   * Gera PDF completo do book
   */
  async gerarPDF(bookData: BookData): Promise<Blob> {
    try {
      console.log('📄 Gerando HTML do book...');
      const html = this.gerarHTMLCompleto(bookData);

      console.log('🚀 Enviando para API Puppeteer...');
      const blob = await puppeteerPDFService.gerarPDFDeHTML({
        html,
        filename: `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`,
        options: {
          format: 'A4',
          orientation: 'landscape',
          printBackground: true,
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
          }
        }
      });

      console.log('✅ PDF gerado com sucesso!');
      return blob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw new Error('Não foi possível gerar o PDF do book');
    }
  }

  /**
   * Baixa PDF localmente
   */
  async baixarPDF(bookData: BookData, nomeArquivo?: string): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookData);
      const filename = nomeArquivo || `book_${bookData.empresa_nome}_${bookData.mes}_${bookData.ano}.pdf`;
      
      puppeteerPDFService.baixarPDF(blob, filename);
    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Abre PDF em nova aba
   */
  async abrirPDF(bookData: BookData): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookData);
      puppeteerPDFService.abrirPDFNovaAba(blob);
    } catch (error) {
      console.error('❌ Erro ao abrir PDF:', error);
      throw error;
    }
  }
}

export const booksPDFServicePuppeteer = new BooksPDFServicePuppeteer();
export default booksPDFServicePuppeteer;
