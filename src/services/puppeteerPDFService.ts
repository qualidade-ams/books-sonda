/**
 * Serviço para geração de PDF usando Puppeteer via API
 * Substitui completamente o @react-pdf/renderer
 * 
 * Vantagens:
 * - Fidelidade visual 100% ao HTML
 * - Suporte completo a CSS moderno
 * - Fontes customizadas funcionam perfeitamente
 * - Cores e gradientes preservados
 * - Layout responsivo mantido
 */

interface PDFGenerationOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  printBackground?: boolean;
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
}

interface GeneratePDFFromHTMLParams {
  html: string;
  filename?: string;
  options?: PDFGenerationOptions;
}

interface GeneratePDFFromURLParams {
  url: string;
  filename?: string;
  options?: PDFGenerationOptions;
}

class PuppeteerPDFService {
  private readonly API_ENDPOINT = '/api/pdf/generate';

  /**
   * Gera PDF a partir de HTML
   */
  async gerarPDFDeHTML({
    html,
    filename = `documento_${Date.now()}.pdf`,
    options = {}
  }: GeneratePDFFromHTMLParams): Promise<Blob> {
    try {
      console.log('📄 Gerando PDF a partir de HTML...');

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          filename,
          options: {
            printBackground: true,
            ...options
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar PDF');
      }

      const blob = await response.blob();
      console.log('✅ PDF gerado com sucesso!');
      
      return blob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw new Error('Não foi possível gerar o PDF');
    }
  }

  /**
   * Gera PDF a partir de URL
   */
  async gerarPDFDeURL({
    url,
    filename = `documento_${Date.now()}.pdf`,
    options = {}
  }: GeneratePDFFromURLParams): Promise<Blob> {
    try {
      console.log(`🌐 Gerando PDF a partir de URL: ${url}`);

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          filename,
          options: {
            printBackground: true,
            ...options
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao gerar PDF');
      }

      const blob = await response.blob();
      console.log('✅ PDF gerado com sucesso!');
      
      return blob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw new Error('Não foi possível gerar o PDF');
    }
  }

  /**
   * Baixa PDF gerado
   */
  baixarPDF(blob: Blob, filename: string): void {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL após download
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log(`✅ Download iniciado: ${filename}`);
    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      throw new Error('Não foi possível baixar o PDF');
    }
  }

  /**
   * Abre PDF em nova aba
   */
  abrirPDFNovaAba(blob: Blob): void {
    try {
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      
      if (!newWindow) {
        console.warn('⚠️ Popup bloqueado pelo navegador');
        throw new Error('Popup bloqueado. Permita popups para visualizar o PDF.');
      }
      
      // Limpar URL após um tempo
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      
      console.log('✅ PDF aberto em nova aba');
    } catch (error) {
      console.error('❌ Erro ao abrir PDF:', error);
      throw error;
    }
  }

  /**
   * Gera e baixa PDF em uma única operação
   */
  async gerarEBaixarPDFDeHTML(params: GeneratePDFFromHTMLParams): Promise<void> {
    const blob = await this.gerarPDFDeHTML(params);
    this.baixarPDF(blob, params.filename || `documento_${Date.now()}.pdf`);
  }

  /**
   * Gera e baixa PDF de URL em uma única operação
   */
  async gerarEBaixarPDFDeURL(params: GeneratePDFFromURLParams): Promise<void> {
    const blob = await this.gerarPDFDeURL(params);
    this.baixarPDF(blob, params.filename || `documento_${Date.now()}.pdf`);
  }

  /**
   * Gera e abre PDF em nova aba
   */
  async gerarEAbrirPDFDeHTML(params: GeneratePDFFromHTMLParams): Promise<void> {
    const blob = await this.gerarPDFDeHTML(params);
    this.abrirPDFNovaAba(blob);
  }

  /**
   * Gera e abre PDF de URL em nova aba
   */
  async gerarEAbrirPDFDeURL(params: GeneratePDFFromURLParams): Promise<void> {
    const blob = await this.gerarPDFDeURL(params);
    this.abrirPDFNovaAba(blob);
  }
}

export const puppeteerPDFService = new PuppeteerPDFService();
export default puppeteerPDFService;
