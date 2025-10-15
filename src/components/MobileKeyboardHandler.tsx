import { useEffect } from 'react';
import { isIOS, scrollIntoViewWithKeyboard } from '@/lib/mobileUtils';

/**
 * Global keyboard handler for mobile devices
 * Automatically scrolls focused inputs into view and handles keyboard visibility
 */
export const MobileKeyboardHandler = () => {
  useEffect(() => {
    if (!isIOS()) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'
      ) {
        scrollIntoViewWithKeyboard(target);
      }
    };

    // Add focus listener to all inputs
    document.addEventListener('focusin', handleFocus);

    // Prevent viewport zoom on double-tap
    let lastTouchEnd = 0;
    const preventZoom = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchend', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('touchend', preventZoom);
    };
  }, []);

  return null;
};
