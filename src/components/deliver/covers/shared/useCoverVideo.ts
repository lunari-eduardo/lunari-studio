import { useState, useEffect, useRef } from 'react';

export type VideoState = 'idle' | 'posterReady' | 'videoReady' | 'failed';

export function useCoverVideo(desktopKey?: string, mobileKey?: string | null) {
  const [videoState, setVideoState] = useState<VideoState>('idle');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        setShouldLoadVideo(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!desktopKey) {
      setActiveKey(null);
      return;
    }

    const checkOrientation = () => {
      const isMobile = window.matchMedia('(max-width: 767px) and (orientation: portrait)').matches;
      setActiveKey(isMobile && mobileKey ? mobileKey : desktopKey);
    };

    checkOrientation();

    window.addEventListener('orientationchange', checkOrientation);
    return () => window.removeEventListener('orientationchange', checkOrientation);
  }, [desktopKey, mobileKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Safari/iOS requer que a propriedade DOM muted seja explicitamente true
    video.muted = true;
    video.defaultMuted = true;

    // Se o vídeo já carregou (cache do navegador), marca como pronto imediatamente
    if (video.readyState >= 2 && videoState === 'idle') {
      setVideoState('videoReady');
      if (!prefersReducedMotion) {
        video.play().catch(() => {});
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!prefersReducedMotion) {
              video.play().catch(() => {});
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [videoUrl, videoState, prefersReducedMotion]);

  const handleCanPlay = () => {
    setVideoState('videoReady');
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      if (!prefersReducedMotion) {
        video.play().catch(() => {});
      }
    }
  };

  const handleError = () => {
    setVideoState('failed');
  };

  const cdnBase = import.meta.env.VITE_R2_PUBLIC_URL || 'https://media.lunarihub.com';
  const videoUrl = activeKey ? `${cdnBase}/${activeKey}` : null;

  return {
    videoUrl,
    videoRef,
    videoState,
    setVideoState,
    prefersReducedMotion,
    shouldLoadVideo,
    handleCanPlay,
    handleError
  };
}
