import { useEffect, useState } from 'react';

export type ResponsiveMode = 'mobile' | 'tablet-portrait' | 'tablet-landscape' | 'desktop';

function detect(): ResponsiveMode {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  if (width < 768) return 'mobile';
  if (width < 1024) return isLandscape ? 'tablet-landscape' : 'tablet-portrait';
  return 'desktop';
}

/**
 * Returns the current responsive mode based on viewport dimensions.
 * Updates on resize and orientationchange.
 */
export function useResponsiveMode(): ResponsiveMode {
  const [mode, setMode] = useState<ResponsiveMode>(() => detect());

  useEffect(() => {
    const update = () => setMode(detect());
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return mode;
}
