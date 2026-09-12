import { useState, useEffect, useCallback } from 'react';

export interface FittedTitleResult {
  fontSize: number;
  textWidth: number;
  maxWidthRatio: number;
}

export function useFittedTitle(
  line1: string,
  line2: string,
  containerWidthPx: number,
  containerHeightPx: number,
  fontFamily: string,
  maxFontSizeVw = 12,
  minFontSizePx = 30,
  targetSpanPx?: number
): FittedTitleResult {
  const calculate = useCallback(
    (w: number, h: number): FittedTitleResult => {
      const fallback: FittedTitleResult = {
        fontSize: minFontSizePx,
        textWidth: minFontSizePx * 3,
        maxWidthRatio: 3,
      };
      if (w <= 0 || h <= 0) return fallback;

      try {
        if (typeof document === 'undefined') return fallback;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return fallback;

        // We use a high test size for precision
        const testFontSize = 100;
        ctx.font = `normal ${testFontSize}px ${fontFamily || 'serif'}`;

        const metrics1 = ctx.measureText((line1 || '').toUpperCase());
        const metrics2 = line2 ? ctx.measureText(line2.toUpperCase()) : { width: 0 };

        const maxWidthRatio = Math.max(metrics1.width, metrics2.width) / testFontSize;
        if (maxWidthRatio <= 0) return fallback;

        // Total height ratio: (line1 + line2 + spacing)
        // 0.84 is the line-height, 0.05 is the margin
        const totalHeightRatio = line2 ? 0.84 + 0.05 + 0.84 : 0.84;

        // Size calculation: if targetSpanPx is provided (e.g. crossing the photo seam in desktop), fit to target
        let calculatedSize = targetSpanPx && targetSpanPx > 0
          ? targetSpanPx / maxWidthRatio
          : w / maxWidthRatio;

        // Size that fits the height (max 82% of container height for safety)
        const sizeFromHeight = (h * 0.82) / totalHeightRatio;

        calculatedSize = Math.min(calculatedSize, sizeFromHeight);

        // Limit by viewport-based maximum to maintain "Editorial" look
        const winW = typeof window !== 'undefined' ? window.innerWidth : w;
        const maxVwPx = (winW * maxFontSizeVw) / 100;
        const finalSize = Math.max(Math.min(calculatedSize, maxVwPx), minFontSizePx);

        return {
          fontSize: finalSize,
          textWidth: Math.round(maxWidthRatio * finalSize),
          maxWidthRatio,
        };
      } catch {
        return fallback;
      }
    },
    [line1, line2, fontFamily, maxFontSizeVw, minFontSizePx, targetSpanPx]
  );

  const [result, setResult] = useState<FittedTitleResult>(() => calculate(containerWidthPx, containerHeightPx));

  useEffect(() => {
    setResult(calculate(containerWidthPx, containerHeightPx));
  }, [calculate, containerWidthPx, containerHeightPx]);

  return result;
}
