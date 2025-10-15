/**
 * Mobile utility functions for device detection, keyboard handling, and UX
 */

/**
 * Detect if device is iOS
 */
export const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

/**
 * Detect if device is Android
 */
export const isAndroid = (): boolean => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Detect if running in standalone mode (PWA installed)
 */
export const isStandalone = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
};

/**
 * Detect if device is in landscape mode
 */
export const isLandscape = (): boolean => {
  return window.matchMedia('(orientation: landscape)').matches;
};

/**
 * Scroll element into view with keyboard offset
 */
export const scrollIntoViewWithKeyboard = (element: HTMLElement) => {
  setTimeout(() => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
};

/**
 * Get safe area insets
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0'),
    right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0'),
    bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0'),
    left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0'),
  };
};

/**
 * Prevent double-tap zoom on iOS
 */
export const preventDoubleTapZoom = (event: TouchEvent) => {
  const now = Date.now();
  const DOUBLE_TAP_DELAY = 300;
  
  if ((event.target as any).__lastTap && now - (event.target as any).__lastTap < DOUBLE_TAP_DELAY) {
    event.preventDefault();
  }
  (event.target as any).__lastTap = now;
};

/**
 * Check network quality
 */
export const getNetworkQuality = (): 'fast' | 'slow' | 'offline' => {
  if (!navigator.onLine) return 'offline';
  
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return 'fast';
  
  if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return 'slow';
  }
  
  return 'fast';
};

/**
 * Vibrate device (if supported)
 */
export const vibrate = (pattern: number | number[] = 50) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

/**
 * Check if reduced motion is preferred
 */
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get device pixel ratio for image optimization
 */
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

/**
 * Open external link safely (opens in external browser for PWA)
 */
export const openExternalLink = (url: string) => {
  if (isStandalone()) {
    // In PWA, open in external browser
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Handle keyboard visibility changes (iOS)
 */
export const onKeyboardVisibilityChange = (callback: (visible: boolean) => void) => {
  if (isIOS()) {
    let initialHeight = window.visualViewport?.height || window.innerHeight;
    
    const handler = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const isKeyboardVisible = currentHeight < initialHeight * 0.75;
      callback(isKeyboardVisible);
    };
    
    window.visualViewport?.addEventListener('resize', handler);
    window.addEventListener('resize', handler);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handler);
      window.removeEventListener('resize', handler);
    };
  }
  return () => {};
};
