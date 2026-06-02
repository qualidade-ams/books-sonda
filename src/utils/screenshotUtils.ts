/**
 * Utilitários para captura de screenshots de elementos DOM
 */

import html2canvas from 'html2canvas';

/**
 * Verifica se um canvas contém pixels com transparência (alpha < 255).
 * Amostra apenas as bordas do canvas para performance, pois é onde
 * border-radius e bordas circulares criam transparência.
 */
function canvasHasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const { width, height } = canvas;
  // Amostrar os 4 cantos (8x8 pixels cada) — suficiente para detectar border-radius
  const regions = [
    ctx.getImageData(0, 0, 8, 8),
    ctx.getImageData(width - 8, 0, 8, 8),
    ctx.getImageData(0, height - 8, 8, 8),
    ctx.getImageData(width - 8, height - 8, 8, 8),
  ];

  for (const region of regions) {
    for (let i = 3; i < region.data.length; i += 4) {
      if (region.data[i] < 255) return true; // pixel transparente encontrado
    }
  }
  return false;
}

/**
 * Captura screenshot de um elemento DOM e retorna como base64
 */
export async function captureElementScreenshot(
  element: HTMLElement,
  options?: {
    backgroundColor?: string;
    scale?: number;
    width?: number;
    height?: number;
  }
): Promise<string> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: options?.backgroundColor || '#ffffff',
      scale: options?.scale || 1.5, // Reduzido de 2 para 1.5 — menor tamanho, qualidade visual mantida
      width: options?.width,
      height: options?.height,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Verificar se o canvas contém pixels transparentes (ex: bordas circulares com border-radius)
    // Se houver transparência, usar PNG para preservar os cantos arredondados.
    // Caso contrário, usar JPEG 85% que é ~3-5x menor que PNG.
    const hasTransparency = canvasHasTransparency(canvas);
    if (hasTransparency) {
      return canvas.toDataURL('image/png');
    }
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (error) {
    console.error('Erro ao capturar screenshot:', error);
    throw new Error('Falha ao capturar screenshot do elemento');
  }
}

/**
 * Aguarda um elemento estar visível e renderizado
 */
export async function waitForElement(
  selector: string,
  timeout: number = 5000
): Promise<HTMLElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector) as HTMLElement;
    
    if (element && element.offsetParent !== null) {
      // Aguardar um pouco mais para garantir renderização completa
      await new Promise(resolve => setTimeout(resolve, 500));
      return element;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Elemento ${selector} não encontrado após ${timeout}ms`);
}

/**
 * Captura screenshots de múltiplos elementos sequencialmente
 */
export async function captureMultipleScreenshots(
  selectors: string[],
  options?: {
    backgroundColor?: string;
    scale?: number;
    delayBetweenCaptures?: number;
  }
): Promise<Record<string, string>> {
  const screenshots: Record<string, string> = {};

  for (const selector of selectors) {
    try {
      const element = await waitForElement(selector);
      const screenshot = await captureElementScreenshot(element, options);
      screenshots[selector] = screenshot;

      // Delay entre capturas para garantir estabilidade
      if (options?.delayBetweenCaptures) {
        await new Promise(resolve => setTimeout(resolve, options.delayBetweenCaptures));
      }
    } catch (error) {
      console.error(`Erro ao capturar screenshot de ${selector}:`, error);
      screenshots[selector] = '';
    }
  }

  return screenshots;
}
