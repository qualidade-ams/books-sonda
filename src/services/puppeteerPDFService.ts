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
  private readonly API_ENDPOINT: string;

  constructor() {
    // Detectar ambiente automaticamente
    const isDev = import.meta.env.DEV;
    const currentPort = window.location.port;
    
    if (isDev) {
      if (currentPort === '8080') {
        // Vite dev server - tentar usar proxy primeiro
        // Se não funcionar, usuário deve usar porta 3000
        this.API_ENDPOINT = '/api/pdf/generate';
        console.log('🔧 Modo: Vite Dev (porta 8080)');
        console.log('⚠️ Se der erro 404, acesse: http://localhost:3000');
      } else if (currentPort === '3000' || currentPort === '3001' || currentPort === '3002' || currentPort === '3003') {
        // Vercel dev server - funciona direto (qualquer porta 3000-3003)
        this.API_ENDPOINT = '/api/pdf/generate';
        console.log(`🔧 Modo: Vercel Dev (porta ${currentPort}) ✅`);
      } else {
        // Outro ambiente de desenvolvimento
        this.API_ENDPOINT = '/api/pdf/generate';
        console.log('🔧 Modo: Dev (porta ' + currentPort + ')');
      }
    } else {
      // Produção
      this.API_ENDPOINT = '/api/pdf/generate';
      console.log('🔧 Modo: Produção');
    }
  }

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
      console.log('🔗 Endpoint:', this.API_ENDPOINT);

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

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        // Clonar response para poder ler múltiplas vezes
        const responseClone = response.clone();
        
        // Tentar ler erro como JSON
        let errorMessage = 'Erro ao gerar PDF';
        let errorDetails = '';
        
        try {
          const error = await response.json();
          console.error('❌ Erro (JSON):', error);
          errorMessage = error.message || error.error || errorMessage;
          errorDetails = JSON.stringify(error, null, 2);
        } catch {
          // Se não for JSON, ler como texto do clone
          try {
            const errorText = await responseClone.text();
            console.error('❌ Erro (texto completo):', errorText);
            errorDetails = errorText;
            
            if (response.status === 404) {
              errorMessage = '⚠️ API de PDF não encontrada.\n\n' +
                'SOLUÇÃO:\n' +
                '1. Pare o Vite (Ctrl+C)\n' +
                '2. Acesse: http://localhost:3000\n' +
                '3. Ou execute: vercel dev\n\n' +
                'O Vercel Dev já está rodando na porta 3000!';
            } else if (response.status === 500) {
              errorMessage = `Erro 500 no servidor.\n\nVerifique os logs do Vercel Dev no terminal para mais detalhes.\n\nErro: ${errorText.substring(0, 200)}`;
            } else {
              errorMessage = `Erro ${response.status}: ${errorText.substring(0, 100)}`;
            }
          } catch {
            errorMessage = `Erro ${response.status}`;
          }
        }
        
        console.error('📋 Detalhes do erro:', errorDetails);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log('✅ PDF gerado com sucesso!');
      
      return blob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      
      // Mensagem mais clara para o usuário
      if (error instanceof Error) {
        throw error;
      }
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
        // Tentar ler como JSON, mas se falhar, usar texto
        let errorMessage = 'Erro ao gerar PDF';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.message || error.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || `Erro ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          console.error('⚠️ Erro ao parsear resposta de erro:', parseError);
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        
        console.error('❌ Erro da API:', errorMessage);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      console.log('✅ PDF gerado com sucesso!');
      
      return blob;
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      
      // Se for erro de rede ou timeout
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão com o servidor. Verifique se o servidor está rodando.');
      }
      
      // Propagar erro original se já tiver mensagem
      if (error instanceof Error) {
        throw error;
      }
      
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
