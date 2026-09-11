import { useMemo } from 'react';

export interface UseCoverPaletteInput {
  isDark?: boolean;
  textColor?: string;
  textOverlayColor?: string;
  primaryColor?: string;
}

export interface CoverPalette {
  ink: string;
  inkMuted: string;
  onPhoto: string;
  onPhotoMuted: string;
  line: string;
  accent: string;
  accentContrast: string;
  surface: string;
  surfaceMuted: string;
  isDark: boolean;
}

/**
 * Calcula luminância perceptual (YIQ) para contraste automático sobre cor de destaque.
 */
function getContrastColor(hexColor: string): string {
  const cleanHex = hexColor.replace('#', '').trim();
  let r = 198;
  let g = 163;
  let b = 106; // Fallback para dourado Lunari #C6A36A

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) || r;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) || g;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) || b;
  } else if (cleanHex.length >= 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) || r;
    g = parseInt(cleanHex.substring(2, 4), 16) || g;
    b = parseInt(cleanHex.substring(4, 6), 16) || b;
  }

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 145 ? '#171513' : '#FFFFFF';
}

export function useCoverPalette({
  isDark = true,
  textColor,
  textOverlayColor,
  primaryColor,
}: UseCoverPaletteInput): CoverPalette {
  return useMemo<CoverPalette>(() => {
    const accent = primaryColor || '#C6A36A';
    const accentContrast = getContrastColor(accent);

    const ink = textColor || (isDark ? '#F5F5F4' : '#1C1917');
    const inkMuted = isDark ? 'rgba(245, 245, 244, 0.65)' : 'rgba(28, 25, 23, 0.60)';

    const onPhoto = textOverlayColor || '#FFFFFF';
    const onPhotoMuted = 'rgba(255, 255, 255, 0.72)';

    const line = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
    const surface = isDark ? '#0E0E0E' : '#FAF9F7';
    const surfaceMuted = isDark ? '#171717' : '#F2EFEB';

    return {
      ink,
      inkMuted,
      onPhoto,
      onPhotoMuted,
      line,
      accent,
      accentContrast,
      surface,
      surfaceMuted,
      isDark,
    };
  }, [isDark, textColor, textOverlayColor, primaryColor]);
}
