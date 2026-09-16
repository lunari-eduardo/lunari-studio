import { useEffect, useState } from 'react';

/**
 * Extrai o primeiro frame utilizável de um vídeo (URL de CDN ou object URL)
 * e retorna um data URL JPEG que pode ser usado como poster estático.
 *
 * Caso o vídeo falhe ou não tenha frame, retorna null.
 */
export function useVideoPoster(videoUrl: string | null | undefined, enabled = true): string | null {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !videoUrl) {
      setPosterUrl(null);
      return;
    }

    let cancelled = false;
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = videoUrl;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
    };

    const drawFrame = () => {
      if (cancelled) return;
      try {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const maxW = 1280;
        const scale = w > maxW ? maxW / w : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setPosterUrl(null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setPosterUrl(dataUrl);
      } catch {
        setPosterUrl(null);
      } finally {
        cleanup();
      }
    };

    const handleLoaded = () => {
      // Tenta puxar um frame logo após ~0.1s (alguns vídeos precisam do primeiro
      // frame para gerar o poster; outros já têm). Fallback para 0.3s.
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      } catch {
        drawFrame();
      }
    };

    video.addEventListener('loadeddata', handleLoaded, { once: true });
    video.addEventListener('seeked', drawFrame, { once: true });
    video.addEventListener('error', () => { if (!cancelled) setPosterUrl(null); }, { once: true });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [videoUrl, enabled]);

  return posterUrl;
}
