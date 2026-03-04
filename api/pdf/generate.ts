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
    orientation?: 'portrait' | 'landscape';
    printBackground?: boolean;
    margin?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
}

// ✅ OTIMIZAÇÃO: Cache do caminho do navegador para evitar busca repetida
let cachedBrowserPath: string | null = null;

// Caminhos comuns do Chrome/Edge por sistema operacional
const BROWSER_PATHS = {
  win32: [
    // Edge (mais comum no Windows 11)
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.PROGRAMFILES + '\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Microsoft\\Edge\\Application\\msedge.exe',
    // Chrome
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env.PROGRAMFILES + '\\Google\\Chrome\\Application\\chrome.exe',
    process.env['PROGRAMFILES(X86)'] + '\\Google\\Chrome\\Application\\chrome.exe',
    // Chromium
    process.env.LOCALAPPDATA + '\\Chromium\\Application\\chrome.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
  ],
};

function findBrowser(): string {
  // ✅ OTIMIZAÇÃO: Retornar cache se já encontrou antes
  if (cachedBrowserPath) {
    console.log('⚡ Usando navegador em cache:', cachedBrowserPath);
    return cachedBrowserPath;
  }

  // ✅ OTIMIZAÇÃO: Priorizar variável de ambiente BROWSER_PATH
  if (process.env.BROWSER_PATH && existsSync(process.env.BROWSER_PATH)) {
    console.log('⚡ Usando BROWSER_PATH do .env:', process.env.BROWSER_PATH);
    cachedBrowserPath = process.env.BROWSER_PATH;
    return cachedBrowserPath;
  }

  // ✅ OTIMIZAÇÃO: Fallback para BROWSER_PATH_FALLBACK
  if (process.env.BROWSER_PATH_FALLBACK && existsSync(process.env.BROWSER_PATH_FALLBACK)) {
    console.log('⚡ Usando BROWSER_PATH_FALLBACK do .env:', process.env.BROWSER_PATH_FALLBACK);
    cachedBrowserPath = process.env.BROWSER_PATH_FALLBACK;
    return cachedBrowserPath;
  }

  const platform = process.platform as keyof typeof BROWSER_PATHS;
  const paths = BROWSER_PATHS[platform] || [];
  
  console.log(`🔍 Procurando navegador no ${platform}...`);
  
  for (const path of paths) {
    try {
      if (path && existsSync(path)) {
        console.log('✅ Navegador encontrado:', path);
        cachedBrowserPath = path; // ✅ Salvar no cache
        return cachedBrowserPath;
      }
    } catch (e) {
      // Silenciar erros de verificação
    }
  }
  
  const errorMsg = `Navegador não encontrado. Soluções:\n\n` +
    `1. Defina BROWSER_PATH no .env.local:\n` +
    `   BROWSER_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"\n\n` +
    `2. Ou defina BROWSER_PATH_FALLBACK para navegador alternativo:\n` +
    `   BROWSER_PATH_FALLBACK="C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"\n\n` +
    `3. Ou instale Chrome/Edge:\n` +
    `   - Chrome: https://www.google.com/chrome/\n` +
    `   - Edge: https://www.microsoft.com/edge`;
  
  console.error('❌', errorMsg);
  throw new Error(errorMsg);
}

export default async function handler(
  req: IncomingMessage & { body: GeneratePDFRequest; method?: string },
  res: ServerResponse
) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let browser;

  try {
    const body: GeneratePDFRequest = req.body;

    // Validação
    if (!body.html && !body.url) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'HTML ou URL é obrigatório' }));
      return;
    }

    console.log('🚀 Iniciando geração de PDF (DEV MODE)...');
    console.log('📦 Tamanho do HTML:', body.html?.length || 0, 'caracteres');
    console.log('🌐 URL:', body.url || 'N/A');

    // Encontrar Chrome/Edge instalado
    const browserPath = findBrowser();
    
    // Configurar Puppeteer para desenvolvimento local
    console.log('🔧 Configurando Puppeteer...');
    const puppeteer = await import('puppeteer-core');
    browser = await puppeteer.launch({
      executablePath: browserPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    console.log('✅ Browser iniciado');

    const page = await browser.newPage();
    console.log('✅ Nova página criada');

    // Configurar viewport para gerar PDF de 1754x1240 pixels (A4 landscape em 150 DPI)
    await page.setViewport({
      width: 1754,
      height: 1240,
      deviceScaleFactor: 1
    });

    // Forçar media type screen (não print)
    await page.emulateMediaType('screen');
    console.log('✅ Media type: screen');

    // Carregar conteúdo
    if (body.html) {
      console.log('📄 Carregando HTML...');
      await page.setContent(body.html, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    } else if (body.url) {
      console.log(`🌐 Carregando URL: ${body.url}`);
      await page.goto(body.url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
    }

    // Aguardar fontes carregarem
    console.log('⏳ Aguardando fontes...');
    await page.evaluateHandle('document.fonts.ready');
    
    // Aguardar estabilização inicial do React
    console.log('⏳ Aguardando estabilização inicial do React...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Disparar resize para corrigir SVG/organograma
    console.log('🔄 Disparando evento resize...');
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });
    
    // Aguardar após resize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // CRÍTICO: Aguardar indicador de prontidão (dados carregados)
    console.log('⏳ Aguardando indicador de prontidão (dados carregando)...');
    try {
      await page.waitForFunction(
        () => {
          const container = document.getElementById('pdf-ready');
          const isReady = container && container.getAttribute('data-ready') === 'true';
          console.log('🔍 Verificando prontidão:', { 
            hasContainer: !!container, 
            isReady,
            dataReady: container?.getAttribute('data-ready')
          });
          return isReady;
        },
        { 
          timeout: 40000, // 40 segundos para dados carregarem (aumentado)
          polling: 500 // Verificar a cada 500ms
        }
      );
      console.log('✅ Indicador de prontidão confirmado!');
    } catch (error) {
      console.log('⚠️ Timeout aguardando prontidão após 40s, continuando...');
    }
    
    // CRÍTICO: Aguardar organogramas renderizarem (SVG da biblioteca react-d3-tree)
    console.log('⏳ Aguardando organogramas renderizarem...');
    try {
      await page.waitForFunction(
        () => {
          // Verificar se há seções de organograma
          const orgSections = document.querySelectorAll('[data-section^="organograma-"]');
          if (orgSections.length === 0) {
            console.log('✅ Sem organogramas para aguardar');
            return true; // Sem organogramas, pode continuar
          }
          
          // Verificar se todos os organogramas têm SVG renderizado
          let allRendered = true;
          orgSections.forEach((section, index) => {
            const svg = section.querySelector('svg.rd3t-tree');
            const hasNodes = svg && svg.querySelectorAll('g.rd3t-node').length > 0;
            console.log(`🔍 Organograma ${index + 1}:`, {
              hasSvg: !!svg,
              hasNodes,
              nodeCount: svg?.querySelectorAll('g.rd3t-node').length || 0
            });
            if (!hasNodes) {
              allRendered = false;
            }
          });
          
          return allRendered;
        },
        { 
          timeout: 15000, // 15 segundos para organogramas renderizarem
          polling: 500
        }
      );
      console.log('✅ Organogramas renderizados!');
    } catch (error) {
      console.log('⚠️ Timeout aguardando organogramas após 15s, continuando...');
    }
    
    // Aguardar mais 3 segundos extras para garantir renderização completa dos SVGs
    console.log('⏳ Aguardando estabilização final dos SVGs...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ Página pronta para captura');
    
    console.log('📸 Gerando PDF...');

    // Opções de PDF - dimensões fixas 1754x1240 pixels (A4 landscape em 150 DPI)
    const pdfOptions = {
      width: '1754px',
      height: '1240px',
      printBackground: true,
      margin: {
        top: '0mm',
        bottom: '0mm',
        left: '0mm',
        right: '0mm',
      },
      preferCSSPageSize: false,  // Usar dimensões explícitas em vez de CSS
    };

    // Gerar PDF
    const pdf = await page.pdf(pdfOptions);

    console.log('✅ PDF gerado com sucesso!');

    // Configurar headers para download
    const filename = body.filename || `documento_${Date.now()}.pdf`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length.toString());

    // Retornar PDF
    res.end(pdf);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    console.error('📋 Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    // Mensagem de erro mais detalhada
    let errorMessage = 'Erro ao gerar PDF';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
      
      // Mensagens específicas para erros comuns
      if (errorMessage.includes('Navegador não encontrado')) {
        errorMessage = 'Chrome ou Edge não encontrado. Instale um dos navegadores para gerar PDFs.';
      } else if (errorMessage.includes('Failed to launch')) {
        errorMessage = 'Falha ao iniciar o navegador. Verifique se Chrome ou Edge está instalado corretamente.';
      } else if (errorMessage.includes('Navigation timeout')) {
        errorMessage = 'Timeout ao carregar a página. A página pode estar demorando muito para carregar.';
      }
    }
    
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: errorMessage,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }));
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser fechado');
    }
  }
}
