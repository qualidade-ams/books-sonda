/**
 * API Route para geração de PDF usando Puppeteer
 * Endpoint: POST /api/pdf/generate
 * 
 * Recebe HTML ou URL e retorna PDF com fidelidade visual total
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
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
  req: VercelRequest,
  res: VercelResponse
) {
  // Apenas POST é permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let browser;

  try {
    const body: GeneratePDFRequest = req.body;

    // Validação
    if (!body.html && !body.url) {
      return res.status(400).json({ 
        error: 'HTML ou URL é obrigatório' 
      });
    }

    console.log('🚀 Iniciando geração de PDF...');

    // Configurar Puppeteer para Vercel
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

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

    // Aguardar fontes e imagens carregarem
    await page.evaluateHandle('document.fonts.ready');
    
    console.log('📸 Gerando PDF...');

    // Opções padrão
    const pdfOptions = {
      format: body.options?.format || 'A4',
      landscape: body.options?.orientation === 'landscape',
      printBackground: body.options?.printBackground !== false, // true por padrão
      margin: {
        top: body.options?.margin?.top || '10mm',
        bottom: body.options?.margin?.bottom || '10mm',
        left: body.options?.margin?.left || '10mm',
        right: body.options?.margin?.right || '10mm',
      },
      preferCSSPageSize: true, // Respeitar @page CSS
    };

    // Gerar PDF
    const pdf = await page.pdf(pdfOptions);

    console.log('✅ PDF gerado com sucesso!');

    // Configurar headers para download
    const filename = body.filename || `documento_${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdf.length);

    // Retornar PDF
    return res.status(200).send(pdf);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    
    return res.status(500).json({ 
      error: 'Erro ao gerar PDF',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser fechado');
    }
  }
}
