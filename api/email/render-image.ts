/**
 * API Route para renderizar HTML como imagem usando Puppeteer
 * Endpoint: POST /api/email/render-image
 * 
 * Recebe HTML e retorna screenshot PNG em base64
 * Usado para converter templates de elogios em imagem para email
 * 
 * Compatível com Vercel (usa @sparticuz/chromium) e desenvolvimento local
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { existsSync } from 'fs';
import chromium from '@sparticuz/chromium';

interface RenderImageRequest {
  html: string;
  width?: number;
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

  for (const path of paths) {
    try {
      if (path && existsSync(path)) {
        return path;
      }
    } catch (e) {
      // Silenciar erros
    }
  }

  return null;
}

export default async function handler(
  req: IncomingMessage & { body: RenderImageRequest; method?: string },
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
    const body: RenderImageRequest = req.body;

    if (!body.html) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'HTML é obrigatório' }));
      return;
    }

    const viewportWidth = body.width || 1600;

    console.log('🖼️ Iniciando renderização de HTML para imagem...');

    const puppeteer = await import('puppeteer-core');

    // Tentar browser local primeiro (dev), senão usar @sparticuz/chromium (produção/Vercel)
    const localBrowser = findLocalBrowser();

    if (localBrowser) {
      console.log('🔧 Usando browser local:', localBrowser);
      browser = await puppeteer.launch({
        executablePath: localBrowser,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
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

    const page = await browser.newPage();

    // Usar deviceScaleFactor 1 na Vercel para evitar problemas de memória com imagens grandes
    const isVercel = !localBrowser;
    const scaleFactor = isVercel ? 1 : 2;

    // Definir viewport inicial com altura generosa para que todo o conteúdo seja renderizado
    await page.setViewport({
      width: viewportWidth,
      height: 16384,
      deviceScaleFactor: scaleFactor
    });

    // Carregar HTML com espera para fontes e imagens
    await page.setContent(body.html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Aguardar fontes carregarem
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Medir a altura real do conteúdo completo
    const contentDimensions = await page.evaluate(() => {
      // Usar scrollHeight/scrollWidth do body que captura TODO o conteúdo incluindo margins/paddings
      const bodyHeight = document.body.scrollHeight;
      const docHeight = document.documentElement.scrollHeight;
      const bodyWidth = document.body.scrollWidth;
      const docWidth = document.documentElement.scrollWidth;
      return {
        height: Math.ceil(Math.max(bodyHeight, docHeight)),
        width: Math.ceil(Math.max(bodyWidth, docWidth)),
      };
    });

    const contentHeight = contentDimensions.height;
    const contentWidth = Math.max(contentDimensions.width, viewportWidth);

    console.log(`📐 Dimensões do conteúdo: ${contentWidth}x${contentHeight} (scale: ${scaleFactor})`);

    // Redimensionar viewport para a dimensão exata do conteúdo
    await page.setViewport({
      width: contentWidth,
      height: contentHeight,
      deviceScaleFactor: scaleFactor
    });

    // Aguardar re-render após redimensionamento (importante para Vercel/Chromium)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Screenshot fullPage para capturar todo o conteúdo sem depender de clip
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png',
      encoding: 'base64'
    });

    console.log('✅ Imagem gerada com sucesso');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      image: screenshot,
      contentType: 'image/png',
      width: contentWidth
    }));

  } catch (error) {
    console.error('❌ Erro ao renderizar imagem:', error);
    console.error('📋 Stack trace:', error instanceof Error ? error.stack : 'N/A');

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Erro ao renderizar imagem',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
