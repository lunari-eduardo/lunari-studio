import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CoverVariantProps } from '../types';
import { useCoverVideo } from '../shared/useCoverVideo';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';

export default function CinemaCover({
  sessionName,
  subtitle,
  studioName,
  sessionFont,
  titleCaseMode,
  coverPhoto,
  coverVideo,
  ctaLabel,
  contentPosition = 'bottom-left',
  overlayIntensity = 'medium',
  onEnter,
}: CoverVariantProps) {
  const { desktopKey, mobileKey, posterKey } = coverVideo || {};
  const {
    videoUrl,
    videoRef,
    videoState,
    setVideoState,
    prefersReducedMotion,
    shouldLoadVideo,
    handleCanPlay,
    handleError
  } = useCoverVideo(desktopKey, mobileKey);

  const [hasClicked, setHasClicked] = useState(false);

  // Fallback poster logic
  const cdnBase = import.meta.env.VITE_R2_PUBLIC_URL || 'https://media.lunarihub.com';
  const customPosterUrl = posterKey ? `${cdnBase}/${posterKey}` : null;
  const coverPhotoUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'fullscreen') : undefined;
  const posterUrl = customPosterUrl || coverPhotoUrl;

  const handleCtaClick = () => {
    setHasClicked(true);
    onEnter();
  };

  const getOverlayOpacity = () => {
    switch (overlayIntensity) {
      case 'soft': return 0.7;
      case 'strong': return 1.3;
      case 'medium':
      default: return 1;
    }
  };

  const formattedTitle = applyTitleCase(sessionName, titleCaseMode || 'normal');

  return (
    <section className="relative h-[100svh] w-full overflow-hidden bg-black text-white">
      {/* Poster fallback */}
      {posterUrl && (
        <img
          src={posterUrl}
          alt={sessionName}
          className="absolute inset-0 w-full h-full object-cover"
          onLoad={() => {
            if (videoState === 'idle') setVideoState('posterReady');
          }}
        />
      )}

      {/* Video element */}
      {shouldLoadVideo && videoUrl && !prefersReducedMotion && (
        <video
          ref={videoRef}
          src={videoUrl}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
            videoState === 'videoReady' ? "opacity-100" : "opacity-0"
          )}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterUrl}
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
          onCanPlay={handleCanPlay}
          onError={handleError}
        />
      )}

      {/* Overlay gradient */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          contentPosition === 'bottom-left' ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent" : "bg-black/40"
        )}
        style={{ opacity: getOverlayOpacity() }}
      />
      
      {/* Vinheta lateral se bottom-left */}
      {contentPosition === 'bottom-left' && (
        <div 
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/50 via-transparent to-transparent"
          style={{ opacity: getOverlayOpacity() * 0.5 }}
        />
      )}

      {/* Content wrapper */}
      <div 
        className={cn(
          "relative z-10 h-full w-full max-w-[1440px] mx-auto flex flex-col justify-end transition-opacity duration-400 px-6 pb-14 sm:px-10 sm:pb-16 lg:px-14 lg:pb-20",
          hasClicked && !prefersReducedMotion ? "opacity-0" : "opacity-100",
          contentPosition === 'center' ? "justify-center items-center text-center" : 
          contentPosition === 'bottom-center' ? "items-center text-center" : 
          "items-start text-left"
        )}
      >
        <div className="flex flex-col gap-4 max-w-3xl">
          {studioName && (
            <p className="text-[11px] tracking-[0.32em] uppercase opacity-80 font-medium">
              {studioName}
            </p>
          )}

          <h1 
            className="font-semibold text-balance"
            style={{ 
              fontFamily: sessionFont,
              fontSize: 'clamp(2.4rem, 7vw, 6rem)',
              lineHeight: 1.1,
              textShadow: '0 1px 24px rgba(0,0,0,0.45)'
            }}
          >
            {formattedTitle}
          </h1>

          {subtitle && (
            <p 
              className="opacity-85 max-w-2xl text-balance mt-2"
              style={{ fontSize: 'clamp(0.95rem, 1.6vw, 1.25rem)' }}
            >
              {subtitle}
            </p>
          )}

          <div className={cn("mt-8", contentPosition !== 'bottom-left' && "mx-auto")}>
            <button
              onClick={handleCtaClick}
              className="h-12 px-8 rounded-none border border-white/80 text-xs tracking-[0.2em] uppercase transition-all hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none w-full sm:w-auto min-w-[200px]"
            >
              {ctaLabel || 'Ver galeria'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
