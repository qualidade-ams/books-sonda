import { useState, useEffect, useCallback } from 'react';

/**
 * Breakpoints do Tailwind CSS
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Hook para detectar breakpoints de forma otimizada
 */
export function useBreakpoint(breakpoint: Breakpoint) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window.matchMedia is available (not in SSR or test environment)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINTS[breakpoint]}px)`);
    
    // Set initial value
    setMatches(mediaQuery.matches);

    // Create listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add listener
    mediaQuery.addEventListener('change', listener);

    // Cleanup
    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, [breakpoint]);

  return matches;
}

/**
 * Hook para obter informações detalhadas sobre o viewport
 */
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    currentBreakpoint: 'sm' as Breakpoint
  });

  const updateViewport = useCallback(() => {
    // Check if window is available (not in SSR or test environment)
    if (typeof window === 'undefined') {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Determine current breakpoint
    let currentBreakpoint: Breakpoint = 'sm';
    if (width >= BREAKPOINTS['2xl']) currentBreakpoint = '2xl';
    else if (width >= BREAKPOINTS.xl) currentBreakpoint = 'xl';
    else if (width >= BREAKPOINTS.lg) currentBreakpoint = 'lg';
    else if (width >= BREAKPOINTS.md) currentBreakpoint = 'md';

    setViewport({
      width,
      height,
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      currentBreakpoint
    });
  }, []);

  useEffect(() => {
    // Set initial values
    updateViewport();

    // Add resize listener with debounce
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewport, 100);
    };

    window.addEventListener('resize', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, [updateViewport]);

  return viewport;
}

/**
 * Hook para valores responsivos
 */
export function useResponsiveValue<T>(values: {
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
  default: T;
}) {
  const { currentBreakpoint } = useViewport();

  // Return value for current breakpoint or fallback to smaller breakpoints
  if (values[currentBreakpoint]) {
    return values[currentBreakpoint];
  }

  // Fallback logic
  const breakpointOrder: Breakpoint[] = ['2xl', 'xl', 'lg', 'md', 'sm'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp]) {
      return values[bp];
    }
  }

  return values.default;
}

/**
 * Hook para grid responsivo
 */
export function useResponsiveGrid() {
  const { isMobile, isTablet, isDesktop } = useViewport();

  return {
    columns: isMobile ? 1 : isTablet ? 2 : 4, // 4 colunas no desktop
    gap: isMobile ? 'gap-3' : isTablet ? 'gap-4' : 'gap-4',
    gridClass: isMobile 
      ? 'grid-cols-1' 
      : isTablet 
        ? 'grid-cols-2' 
        : 'grid-cols-4', // 4 colunas fixas no desktop
    containerPadding: isMobile ? 'px-4' : isTablet ? 'px-6' : 'px-8'
  };
}

/**
 * Hook para layout de formulário responsivo
 */
export function useResponsiveForm() {
  const { isMobile, isTablet } = useViewport();

  return {
    fieldLayout: isMobile ? 'grid-cols-1' : 'grid-cols-2',
    modalSize: isMobile ? 'max-w-full' : isTablet ? 'max-w-2xl' : 'max-w-4xl',
    buttonSize: isMobile ? 'sm' : 'default',
    inputSize: isMobile ? 'sm' : 'default',
    spacing: isMobile ? 'space-y-3' : 'space-y-4'
  };
}

/**
 * Hook para tabela responsiva
 */
export function useResponsiveTable() {
  const { isMobile, isTablet } = useViewport();

  return {
    showScrollHint: isMobile || isTablet,
    compactMode: isMobile,
    hideColumns: isMobile ? ['observacao', 'data_aprovacao'] : isTablet ? ['observacao'] : [],
    fontSize: isMobile ? 'text-xs' : 'text-sm',
    padding: isMobile ? 'px-2 py-2' : 'px-4 py-3'
  };
}

/**
 * Hook para navegação responsiva
 */
export function useResponsiveNavigation() {
  const { isMobile, isTablet } = useViewport();

  return {
    showMobileMenu: isMobile,
    collapseSidebar: isMobile || isTablet,
    showBreadcrumbs: !isMobile,
    compactHeader: isMobile,
    stackActions: isMobile
  };
}

/**
 * Hook para cards responsivos
 */
export function useResponsiveCards() {
  const { isMobile, isTablet, isDesktop } = useViewport();

  return {
    cardsPerRow: isMobile ? 1 : isTablet ? 2 : isDesktop ? 3 : 4,
    cardSize: isMobile ? 'compact' : 'normal',
    showFullContent: !isMobile,
    stackContent: isMobile,
    imageSize: isMobile ? 'small' : 'medium'
  };
}

/**
 * Hook para modal responsivo
 */
export function useResponsiveModal() {
  const { isMobile, isTablet } = useViewport();

  return {
    fullScreen: isMobile,
    maxWidth: isMobile ? 'max-w-full' : isTablet ? 'max-w-2xl' : 'max-w-4xl',
    maxHeight: isMobile ? 'max-h-full' : 'max-h-[90vh]',
    padding: isMobile ? 'p-4' : 'p-6',
    margin: isMobile ? 'm-0' : 'm-4'
  };
}

/**
 * Hook para orientação do dispositivo
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

/**
 * Hook para detectar dispositivos touch
 */
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouchDevice();
  }, []);

  return isTouchDevice;
}

/**
 * Hook para preferências de movimento reduzido
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window.matchMedia is available (not in SSR or test environment)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', listener);

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook combinado para todas as informações responsivas
 */
export function useResponsive() {
  const viewport = useViewport();
  const orientation = useOrientation();
  const isTouchDevice = useTouchDevice();
  const prefersReducedMotion = useReducedMotion();
  const grid = useResponsiveGrid();
  const form = useResponsiveForm();
  const table = useResponsiveTable();
  const navigation = useResponsiveNavigation();
  const cards = useResponsiveCards();
  const modal = useResponsiveModal();

  return {
    viewport,
    orientation,
    isTouchDevice,
    prefersReducedMotion,
    grid,
    form,
    table,
    navigation,
    cards,
    modal,
    // Utility functions
    isBreakpoint: (bp: Breakpoint) => viewport.currentBreakpoint === bp,
    isAtLeast: (bp: Breakpoint) => viewport.width >= BREAKPOINTS[bp],
    isBelow: (bp: Breakpoint) => viewport.width < BREAKPOINTS[bp]
  };
}