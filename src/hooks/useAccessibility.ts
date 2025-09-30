import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook para gerenciamento de foco
 */
export function useFocusManagement() {
  const focusableElementsSelector = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(focusableElementsSelector);
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [focusableElementsSelector]);

  const restoreFocus = useCallback((element: HTMLElement | null) => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }, []);

  return { trapFocus, restoreFocus };
}

/**
 * Hook para navegação por teclado
 */
export function useKeyboardNavigation(
  items: any[],
  onSelect?: (index: number) => void,
  options: {
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical';
    disabled?: boolean;
  } = {}
) {
  const { loop = true, orientation = 'vertical', disabled = false } = options;
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled || items.length === 0) return;

    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev + 1;
          return next >= items.length ? (loop ? 0 : prev) : next;
        });
        break;

      case prevKey:
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev - 1;
          return next < 0 ? (loop ? items.length - 1 : prev) : next;
        });
        break;

      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && onSelect) {
          onSelect(activeIndex);
        }
        break;

      case 'Escape':
        setActiveIndex(-1);
        break;
    }
  }, [items.length, activeIndex, onSelect, loop, orientation, disabled]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    activeIndex,
    setActiveIndex,
    isActive: (index: number) => index === activeIndex
  };
}

/**
 * Hook para anúncios de screen reader
 */
export function useScreenReader() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceRef.current) {
      // Criar elemento de anúncio se não existir
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announceRef.current = announcer;
    }

    // Limpar conteúdo anterior
    announceRef.current.textContent = '';
    
    // Adicionar nova mensagem após um pequeno delay
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = message;
      }
    }, 100);
  }, []);

  const announceError = useCallback((message: string) => {
    announce(`Erro: ${message}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message: string) => {
    announce(`Sucesso: ${message}`, 'polite');
  }, [announce]);

  const announceLoading = useCallback((message: string = 'Carregando...') => {
    announce(message, 'polite');
  }, [announce]);

  return {
    announce,
    announceError,
    announceSuccess,
    announceLoading
  };
}

/**
 * Hook para contraste de cores
 */
export function useColorContrast() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    // Check if window.matchMedia is available (not in SSR or test environment)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  const getContrastClass = useCallback((baseClass: string, highContrastClass: string) => {
    return highContrast ? highContrastClass : baseClass;
  }, [highContrast]);

  return { highContrast, getContrastClass };
}

/**
 * Hook para tamanho de fonte
 */
export function useFontSize() {
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    const savedFontSize = localStorage.getItem('fontSize') as 'small' | 'medium' | 'large';
    if (savedFontSize) {
      setFontSize(savedFontSize);
      document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
      document.documentElement.classList.add(
        savedFontSize === 'small' ? 'text-sm' : 
        savedFontSize === 'large' ? 'text-lg' : 'text-base'
      );
    }
  }, []);

  const changeFontSize = useCallback((newSize: 'small' | 'medium' | 'large') => {
    setFontSize(newSize);
    localStorage.setItem('fontSize', newSize);
    
    document.documentElement.classList.remove('text-sm', 'text-base', 'text-lg');
    document.documentElement.classList.add(
      newSize === 'small' ? 'text-sm' : 
      newSize === 'large' ? 'text-lg' : 'text-base'
    );
  }, []);

  return { fontSize, changeFontSize };
}

/**
 * Hook para skip links
 */
export function useSkipLinks() {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main') || document.querySelector('[role="main"]');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      mainContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav') || document.querySelector('[role="navigation"]');
    if (navigation) {
      (navigation as HTMLElement).focus();
      navigation.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return { skipToContent, skipToNavigation };
}

/**
 * Hook para validação de acessibilidade
 */
export function useAccessibilityValidation() {
  const validateElement = useCallback((element: HTMLElement) => {
    const issues: string[] = [];

    // Verificar se imagens têm alt text
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.getAttribute('alt')) {
        issues.push(`Imagem sem texto alternativo: ${img.src}`);
      }
    });

    // Verificar se botões têm labels
    const buttons = element.querySelectorAll('button');
    buttons.forEach(button => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute('aria-label');
      const hasAriaLabelledBy = button.getAttribute('aria-labelledby');
      
      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push('Botão sem label acessível');
      }
    });

    // Verificar se inputs têm labels
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const hasLabel = document.querySelector(`label[for="${input.id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Campo de formulário sem label: ${input.getAttribute('name') || 'sem nome'}`);
      }
    });

    // Verificar contraste de cores (simplificado)
    const elementsWithBackground = element.querySelectorAll('[style*="background"], [class*="bg-"]');
    elementsWithBackground.forEach(el => {
      const styles = window.getComputedStyle(el);
      const backgroundColor = styles.backgroundColor;
      const color = styles.color;
      
      if (backgroundColor && color) {
        // Aqui você poderia implementar uma verificação de contraste mais robusta
        // Por simplicidade, apenas alertamos sobre elementos com cores customizadas
        if (backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
          // Verificação básica - em produção, use uma biblioteca de contraste
          console.log('Verificar contraste:', { backgroundColor, color });
        }
      }
    });

    return issues;
  }, []);

  return { validateElement };
}

/**
 * Hook para preferências de acessibilidade
 */
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false
  });

  useEffect(() => {
    // Check if window.matchMedia is available (not in SSR or test environment)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    // Detectar preferências do sistema
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    
    setPreferences(prev => ({
      ...prev,
      reducedMotion: reducedMotionQuery.matches,
      highContrast: highContrastQuery.matches,
      screenReader: typeof navigator !== 'undefined' ? !!navigator.userAgent.match(/NVDA|JAWS|VoiceOver|ORCA/i) : false
    }));

    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }));
    };

    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }));
    };

    reducedMotionQuery.addEventListener('change', handleReducedMotionChange);
    highContrastQuery.addEventListener('change', handleHighContrastChange);

    return () => {
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange);
      highContrastQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, []);

  const updatePreference = useCallback((key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(`accessibility_${key}`, value.toString());
  }, []);

  return { preferences, updatePreference };
}

/**
 * Hook principal de acessibilidade
 */
export function useAccessibility() {
  const focusManagement = useFocusManagement();
  const screenReader = useScreenReader();
  const colorContrast = useColorContrast();
  const fontSize = useFontSize();
  const skipLinks = useSkipLinks();
  const validation = useAccessibilityValidation();
  const preferences = useAccessibilityPreferences();

  return {
    focusManagement,
    screenReader,
    colorContrast,
    fontSize,
    skipLinks,
    validation,
    preferences
  };
}