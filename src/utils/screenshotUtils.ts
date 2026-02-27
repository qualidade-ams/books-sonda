/**
 * Utilitários para captura de screenshots de elementos DOM
 */

import html2canvas from 'html2canvas';

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
      scale: options?.scale || 2, // Maior qualidade
      width: options?.width,
      height: options?.height,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return canvas.toDataURL('image/png');
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
