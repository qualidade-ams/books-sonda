/**
 * API Route para geração de PDF usando Puppeteer
 * Endpoint: POST /api/pdf/generate
 * 
 * Recebe HTML ou URL e retorna PDF com fidelidade visual total
 * Compatível com Vercel (usa @sparticuz/chromium) e desenvolvimento local
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { existsSync } from 'fs';
import chromium from '@sparticuz/chromium';

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

// Caminhos comuns do Chrome/Edge por sistema operacional (para dev local)
const BROWSER_PATHS = {
  win32: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
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

function findLocalBrowser(): string | null {
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

  return null;
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

    console.log('🚀 Iniciando geração de PDF...');
    console.log('📦 Tamanho do HTML:', body.html?.length || 0, 'caracteres');

    const puppeteer = await import('puppeteer-core');

    // Tentar browser local primeiro (dev), senão usar @sparticuz/chromium (produção/Vercel)
    const localBrowser = findLocalBrowser();

    if (localBrowser) {
      console.log('🔧 Usando browser local:', localBrowser);
      browser = await puppeteer.launch({
        executablePath: localBrowser,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } else {
      console.log('🔧 Usando @sparticuz/chromium (Vercel)...');
      const executablePath = await chromium.executablePath();
      console.log('📍 Chromium path:', executablePath);
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: executablePath,
        headless: true,
      });
    }

    console.log('✅ Browser iniciado');

    const page = await browser.newPage();

    await page.setViewport({
      width: 2200,
      height: 1328,
      deviceScaleFactor: 1
    });
    console.log('✅ Viewport configurado: 2200x1328');

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

    const pdfOptions = {
      width: '2200px',
      height: '1328px',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      },
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
    console.error('📋 Stack trace:', error instanceof Error ? error.stack : 'N/A');

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Erro ao gerar PDF',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }));
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser fechado');
    }
  }
}
