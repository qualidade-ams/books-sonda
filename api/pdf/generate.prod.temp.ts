/**
 * API Route para geração de PDF usando Puppeteer - VERSÃO PRODUÇÃO
 * Endpoint: POST /api/pdf/generate
 * 
 * Esta versão usa @sparticuz/chromium otimizado para Vercel
 * Funciona tanto em desenvolvimento quanto em produção
 */

import type { IncomingMessage, ServerResponse } from 'http';
import chromium from '@sparticuz/chromium';

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

    console.log('🚀 Iniciando geração de PDF (PROD MODE)...');
    console.log('📦 Tamanho do HTML:', body.html?.length || 0, 'caracteres');
    console.log('🌐 URL:', body.url || 'N/A');

    // Configurar Puppeteer para Vercel
    console.log('🔧 Configurando Puppeteer com @sparticuz/chromium...');
    
    const executablePath = await chromium.executablePath();
    console.log('📍 Chromium path:', executablePath);
    
    const puppeteer = await import('puppeteer-core');
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: executablePath,
      headless: true,
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
          timeout: 8000, // 8 segundos (otimizado para plano Hobby)
          polling: 500
        }
      );
      console.log('✅ Indicador de prontidão confirmado!');
    } catch (error) {
      console.log('⚠️ Timeout aguardando prontidão após 8s, continuando...');
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
            return true;
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
          timeout: 6000, // 6 segundos (otimizado para plano Hobby)
          polling: 500
        }
      );
      console.log('✅ Organogramas renderizados!');
    } catch (error) {
      console.log('⚠️ Timeout aguardando organogramas após 6s, continuando...');
    }
    
    // Aguardar estabilização final dos SVGs
    console.log('⏳ Aguardando estabilização final dos SVGs...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
      preferCSSPageSize: false,
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
    
    let errorMessage = 'Erro ao gerar PDF';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
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
