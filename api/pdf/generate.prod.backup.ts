/**
 * API Route para geração de PDF usando Puppeteer
 * Endpoint: POST /api/pdf/generate
 * 
 * Recebe HTML ou URL e retorna PDF com fidelidade visual total
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

    console.log('🚀 Iniciando geração de PDF...');
    console.log('📦 Tamanho do HTML:', body.html?.length || 0, 'caracteres');

    // Configurar Puppeteer para Vercel
    console.log('🔧 Configurando Puppeteer...');
    
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

    // Configurar viewport para 2657x1328 pixels (2:1)
    // Alinhado com CSS (.page-section) e dimensões do PDF
    await page.setViewport({
      width: 2657,
      height: 1328,
      deviceScaleFactor: 1
    });
    console.log('✅ Viewport configurado: 2657x1328 (2:1, alinhado com CSS)');

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
          timeout: 30000, // 30 segundos para dados carregarem
          polling: 500 // Verificar a cada 500ms
        }
      );
      console.log('✅ Indicador de prontidão confirmado!');
    } catch (error) {
      console.log('⚠️ Timeout aguardando prontidão após 30s, continuando...');
    }
    
    // Aguardar mais 2 segundos extras para garantir renderização completa
    console.log('⏳ Aguardando estabilização final...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Página pronta para captura');
    
    console.log('📸 Gerando PDF...');

    // Opções de PDF - dimensões em mm para controlar tamanho físico
    // 355.6mm x 177.8mm = 14" x 7" (ratio 2:1)
    // scale: 0.44 encolhe o conteúdo para caber com folga na página
    // 330mm x 165mm = ~13" x 6.5" (ratio 2:1, mais compacto)
    const pdfOptions = {
      width: '330mm',
      height: '165mm',
      scale: 0.44,
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
    console.error('📋 Tipo de erro:', error instanceof Error ? error.constructor.name : typeof error);
    
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      error: 'Erro ao gerar PDF',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    }));
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser fechado');
    }
  }
}
