/**
 * API Route para geração de PDF usando Puppeteer - VERSÃO DESENVOLVIMENTO
 * Endpoint: POST /api/pdf/generate
 * 
 * Esta versão usa o Chrome instalado localmente em vez do @sparticuz/chromium
 * Use esta versão para desenvolvimento local
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { existsSync } from 'fs';

interface GeneratePDFRequest {
  html?: string;
  url?: string;
  filename?: string;
  options?: {
    format?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'landscape' | 'portrait';
    printBackground?: boolean;
    margin?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
}

// Caminhos comuns do Chrome/Edge por sistema operacional
const BROWSER_PATHS = {
  win32: [
    // Edge (mais comum no Windows 11)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
  ],
};

function findBrowser(): string {
  const platform = process.platform as keyof typeof BROWSER_PATHS;
  const paths = BROWSER_PATHS[platform] || [];
  
  console.log(`🔍 Procurando navegador no ${platform}...`);
  
  for (const path of paths) {
    try {
      if (path && existsSync(path)) {
        console.log('✅ Navegador encontrado:', path);
        return path;
      }
    } catch (e) {
      // Silenciar erros
    }
  }
  
  throw new Error('Chrome ou Edge não encontrado. Instale um dos navegadores.');
}

export default async function handler(
  req: IncomingMessage & { body: GeneratePDFRequest; method?: string },
  res: ServerResponse
) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let browser;

  try {
    const body: GeneratePDFRequest = req.body;

    if (!body.html && !body.url) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'HTML ou URL é obrigatório' }));
      return;
    }

    console.log('🚀 Iniciando geração de PDF (DEV MODE)...');

    const browserPath = findBrowser();
    
    const puppeteer = await import('puppeteer-core');
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    console.log('✅ Browser iniciado');

    const page = await browser.newPage();

    // Configurar viewport para renderizar conteúdo em alta resolução
    // O conteúdo é desenhado para 2657x1328px
    // O PDF usa scale para encolher para 355.6mm x 177.8mm
    await page.setViewport({
      width: 2657,
      height: 1328,
      deviceScaleFactor: 1
    });
    console.log('✅ Viewport configurado: 2657x1328');

    await page.emulateMediaType('screen');

    if (body.html) {
      await page.setContent(body.html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    } else if (body.url) {
      await page.goto(body.url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }

    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      await page.waitForFunction(
        () => {
          const container = document.getElementById('pdf-ready');
          return container && container.getAttribute('data-ready') === 'true';
        },
        { timeout: 30000, polling: 500 }
      );
      console.log('✅ Indicador de prontidão confirmado!');
    } catch (error) {
      console.log('⚠️ Timeout aguardando prontidão, continuando...');
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📸 Gerando PDF...');

    // Opções de PDF - dimensões em mm para controlar tamanho físico
    // 355.6mm x 177.8mm = 14" x 7" (ratio 2:1)
    // scale: 0.705 encolhe o conteúdo para caber com folga na página
    // 330mm x 165mm = ~13" x 6.5" (ratio 2:1, mais compacto)
    const pdfOptions = {
      width: '330mm',
      height: '165mm',
      scale: 0.704,
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      },
      align:'center',
      preferCSSPageSize: false,
    };

    const pdf = await page.pdf(pdfOptions);

    console.log('✅ PDF gerado com sucesso!');

    const filename = body.filename || `documento_${Date.now()}.pdf`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length.toString());

    res.end(pdf);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Erro ao gerar PDF',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
