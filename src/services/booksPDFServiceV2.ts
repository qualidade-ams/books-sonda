/**
 * Serviço V2 para geração de PDFs de Books usando Puppeteer
 * 
 * MELHORIAS:
 * - Usa rota dedicada /pdf/book/:id (sem modal)
 * - Layout otimizado para impressão
 * - Viewport fixo grande
 * - Media type screen
 * - Aguarda carregamento completo
 */

import { puppeteerPDFService } from './puppeteerPDFService';

class BooksPDFServiceV2 {
  /**
   * Gera PDF do book usando rota dedicada de impressão
   */
  async gerarPDF(bookId: string): Promise<Blob> {
    try {
      // URL da rota dedicada de impressão
      const printUrl = `${window.location.origin}/pdf/book/${bookId}`;
      
      console.log('📄 Gerando PDF da rota:', printUrl);

      // Gerar PDF via Puppeteer usando a URL dedicada
      const blob = await puppeteerPDFService.gerarPDFDeURL({
        url: printUrl,
        filename: `book_${bookId}.pdf`,
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
  async baixarPDF(bookId: string, nomeArquivo?: string): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookId);
      const filename = nomeArquivo || `book_${bookId}.pdf`;
      
      puppeteerPDFService.baixarPDF(blob, filename);
    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      throw error;
    }
  }

  /**
   * Abre PDF em nova aba
   */
  async abrirPDF(bookId: string): Promise<void> {
    try {
      const blob = await this.gerarPDF(bookId);
      puppeteerPDFService.abrirPDFNovaAba(blob);
    } catch (error) {
      console.error('❌ Erro ao abrir PDF:', error);
      throw error;
    }
  }

  /**
   * Abre rota de impressão em nova aba (para debug)
   */
  abrirRotaImpressao(bookId: string): void {
    const printUrl = `${window.location.origin}/pdf/book/${bookId}`;
    window.open(printUrl, '_blank');
  }
}

export const booksPDFServiceV2 = new BooksPDFServiceV2();
export default booksPDFServiceV2;
