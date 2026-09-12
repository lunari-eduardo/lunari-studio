import React, { useMemo, useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getPhotoUrl } from '@/lib/photoUrl';
import { applyTitleCase } from '@/lib/textTransform';
import type { CoverVariantProps } from '../types';
import { resolveEditorialSpec } from '../editorial/composition';
import { splitTitle } from '../editorial/splitTitle';
import { useFittedTitle } from '../editorial/useFittedTitle';
import { useSeamContrast } from '../editorial/useSeamContrast';
import { TitleComposition } from '../editorial/TitleComposition';

import { GALLERY_FONTS } from '@/components/FontSelect';
import { getFallbackCoverUrl } from '../defaultPhotos';

export default function EditorialCover({
  coverPhoto,
  sessionName,
  subtitle,
  sessionDate,
  sessionFont,
  titleCaseMode = 'normal',
  isDark = false,
  textColor,
  ctaLabel,
  onEnter,
}: CoverVariantProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 0);
        const h = containerRef.current.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 0);
        if (w > 0 && h > 0) {
          setSize({ width: w, height: h });
        }
      }
    };
    update();

    let observer: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(containerRef.current);
    }

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const spec = useMemo(() => resolveEditorialSpec(size.width, size.height), [size]);
  const { line1, line2 } = useMemo(() => splitTitle(applyTitleCase(sessionName, titleCaseMode)), [sessionName, titleCaseMode]);
  
  const fontConfig = useMemo(() => {
    if (!sessionFont) return null;
    return GALLERY_FONTS.find(
      (f) => sessionFont.toLowerCase().includes(f.name.toLowerCase()) || f.family.includes(sessionFont)
    );
  }, [sessionFont]);

  const titleWeight = Math.max(500, fontConfig?.weightTitle ?? 600);

  const isSingleLine = !line2;
  const maxFontSizeVw = spec.orientation === 'vertical'
    ? (isSingleLine ? 22 : 15)
    : (isSingleLine ? 24 : 14);

  const rawUrl = coverPhoto ? getPhotoUrl(coverPhoto, 'preview') : null;
  const coverUrl = (rawUrl && rawUrl !== '/placeholder.svg' && !rawUrl.includes('placeholder.svg'))
    ? rawUrl
    : getFallbackCoverUrl(spec.orientation === 'vertical' ? 'vertical' : 'horizontal');
  
  // No desktop, calculamos um span que garante que o texto atravesse a costura da foto e repouse sobre ela
  const desktopTargetSpan = spec.orientation === 'vertical' && size.width > 0
    ? (spec.seamPx - (size.width * 0.05)) + Math.max(160, size.width * 0.20)
    : undefined;

  const { fontSize, textWidth } = useFittedTitle(
    line1,
    line2,
    spec.title.width,
    spec.title.height,
    sessionFont || 'serif',
    maxFontSizeVw,
    spec.orientation === 'vertical' ? 36 : 28,
    desktopTargetSpan
  );

  // Posição horizontal ótica no desktop para que o texto sempre ultrapasse a costura da foto
  const effectiveTitleX = useMemo(() => {
    if (size.width <= 0) return spec.title.x;
    if (spec.orientation === 'vertical') {
      // Queremos que a costura da foto intercepte o texto em torno de 56% a 62% da sua largura total
      const idealLeft = spec.seamPx - (textWidth * 0.58);
      const minLeft = Math.max(28, size.width * 0.04);
      const maxLeft = Math.max(minLeft, size.width * 0.12);
      return Math.max(minLeft, Math.min(maxLeft, idealLeft));
    }
    return spec.title.x;
  }, [size.width, spec.orientation, spec.seamPx, spec.title.x, textWidth]);

  const titleIntersection = useMemo(() => {
    if (size.width === 0) return { x: 0, y: 0, width: 0, height: 0 };
    if (spec.orientation === 'vertical') {
      const intersectX = Math.max(effectiveTitleX, spec.seamPx);
      const intersectWidth = Math.max(0, (effectiveTitleX + textWidth) - intersectX);
      return { 
        x: intersectX, 
        y: spec.title.y - (spec.title.height / 2), 
        width: intersectWidth, 
        height: spec.title.height 
      };
    } else {
      if (line2) {
        return {
          x: spec.title.x,
          y: spec.seamPx + 8,
          width: textWidth,
          height: fontSize
        };
      }
      const intersectY = Math.max(spec.title.y - (spec.title.height / 2), spec.seamPx);
      const intersectHeight = Math.max(0, (spec.title.y + (spec.title.height / 2)) - intersectY);
      return { 
        x: spec.title.x - (spec.title.width / 2), 
        y: intersectY, 
        width: spec.title.width, 
        height: intersectHeight 
      };
    }
  }, [spec, size.width, effectiveTitleX, textWidth, line2, fontSize]);

  const ctaRect = useMemo(() => ({
    x: spec.cta.x - 100,
    y: spec.cta.y,
    width: 100,
    height: 40
  }), [spec]);

  const baseColor = textColor || (isDark ? '#F5F2EC' : '#171513');

  const { titleColor: overlayColor, isLight: isPhotoLight } = useSeamContrast(
    coverUrl,
    spec.photo,
    titleIntersection,
    ctaRect,
    isDark,
    baseColor
  );
  const formattedSubtitle = subtitle?.toUpperCase();

  const formattedDate = useMemo(() => {
    const d = sessionDate ? (typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate) : new Date();
    return format(d, "dd '·' MMMM '·' yyyy", { locale: ptBR }).toUpperCase();
  }, [sessionDate]);

  const handleScroll = () => {
    const el = document.getElementById('deliver-gallery');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
    onEnter?.();
  };

  const clipPhoto = spec.orientation === 'vertical'
    ? `inset(0 0 0 ${spec.seamPx}px)`
    : `inset(${spec.seamPx}px 0 0 0)`;

  const clipTheme = spec.orientation === 'vertical'
    ? `inset(0 ${size.width - spec.seamPx}px 0 0)`
    : `inset(0 0 ${size.height - spec.seamPx}px 0)`;

  // Posicionamento preciso do título sobre a costura da foto
  const titleBoxStyle: React.CSSProperties = spec.orientation === 'vertical' ? {
    left: `${effectiveTitleX}px`,
    top: `${spec.title.y}px`,
    width: `${Math.max(textWidth + 40, spec.title.width)}px`,
    height: `${spec.title.height}px`,
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center'
  } : {
    left: `${spec.title.x}px`,
    top: `${spec.seamPx - (fontSize * 0.45)}px`,
    width: `${spec.title.width}px`,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    textAlign: 'left'
  };

  return (
    <section
      ref={containerRef}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-full min-h-full overflow-hidden antialiased select-none transition-colors duration-700 ${
        isDark ? 'bg-[#12100E]' : 'bg-[#F7F4EE]'
      }`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* 1. PHOTO LAYER - REPOSITIONED TO REAL RECTANGLE */}
      <div
        className="absolute z-10 overflow-hidden pointer-events-none"
        style={{ 
          left: `${spec.photo.x}px`,
          top: `${spec.photo.y}px`,
          width: `${spec.photo.width}px`,
          height: `${spec.photo.height}px`,
        }}
      >
        <img
          src={coverUrl}
          alt={sessionName}
          className={`w-full h-full object-cover transition-transform duration-[2000ms] ease-out scale-100 ${spec.orientation === 'vertical' ? 'hover:scale-105 object-center' : 'object-[center_top_15%]'}`}
          onError={(e) => {
            e.currentTarget.src = getFallbackCoverUrl(spec.orientation === 'vertical' ? 'vertical' : 'horizontal');
          }}
        />
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: spec.orientation === 'vertical'
              ? `linear-gradient(to right, ${isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'}, transparent 20%)`
              : `linear-gradient(to bottom, ${isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'}, transparent 20%)`
          }}
        />
        {/* Vinheta gradiente de proteção de contraste para a Data e CTA no rodapé */}
        <div 
          className="absolute inset-x-0 bottom-0 h-44 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 40%, transparent 100%)'
          }}
        />
      </div>

      {/* 2 & 3. TITLE RENDERING */}
      {size.width > 0 && (
        spec.orientation === 'horizontal' && line2 ? (
          /* MODO SMARTPHONE COM 2 LINHAS: Costura da foto divide o meio das duas palavras (linha 1 fora, linha 2 dentro) */
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* Subtítulo no topo na área do tema */}
            {formattedSubtitle && (
              <div
                className="absolute z-20 flex flex-col gap-1.5"
                style={{
                  left: `${spec.title.x}px`,
                  top: 'max(20px, env(safe-area-inset-top) + 12px)',
                }}
              >
                <span
                  className="tracking-[0.35em] font-sans opacity-60 uppercase text-[11px] sm:text-xs"
                  style={{ color: baseColor }}
                >
                  {formattedSubtitle}
                </span>
                <div className="w-10 h-px bg-current opacity-40" style={{ color: baseColor }} />
              </div>
            )}

            {/* Linha 1: Fora da foto (fundo claro), base ancorada logo acima da costura */}
            <div
              className="absolute z-20 tracking-[-0.03em] leading-none uppercase transition-colors duration-500 whitespace-nowrap"
              style={{
                left: `${spec.title.x}px`,
                bottom: `${size.height - spec.seamPx + 8}px`,
                fontSize: `${fontSize}px`,
                fontWeight: titleWeight,
                color: baseColor,
                fontFamily: sessionFont || 'serif',
                ...(fontSize < 48 ? { WebkitTextStroke: '0.35px currentColor' } : {}),
              }}
            >
              {line1}
            </div>

            {/* Linha 2: Dentro da foto, topo ancorado logo abaixo da costura */}
            <div
              className="absolute z-30 tracking-[-0.03em] leading-none uppercase transition-colors duration-500 whitespace-nowrap drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
              style={{
                left: `${spec.title.x}px`,
                top: `${spec.seamPx + 8}px`,
                fontSize: `${fontSize}px`,
                fontWeight: titleWeight,
                color: overlayColor,
                fontFamily: sessionFont || 'serif',
                ...(fontSize < 48 ? { WebkitTextStroke: '0.35px currentColor' } : {}),
              }}
            >
              {line2}
            </div>
          </div>
        ) : (
          /* MODO DESKTOP / TABLET OU MOBILE DE LINHA ÚNICA: Camadas divididas com clipPath */
          <>
            {/* Camada Base (Lado do Tema) */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ clipPath: clipTheme }}
            >
              {/* Subtítulo no topo no modo mobile linha única */}
              {spec.orientation === 'horizontal' && formattedSubtitle && (
                <div
                  className="absolute z-20 flex flex-col gap-1.5"
                  style={{
                    left: `${spec.title.x}px`,
                    top: 'max(20px, env(safe-area-inset-top) + 12px)',
                  }}
                >
                  <span
                    className="tracking-[0.35em] font-sans opacity-60 uppercase text-[11px] sm:text-xs"
                    style={{ color: baseColor }}
                  >
                    {formattedSubtitle}
                  </span>
                  <div className="w-10 h-px bg-current opacity-40" style={{ color: baseColor }} />
                </div>
              )}

              <div className="absolute" style={titleBoxStyle}>
                <div className="flex flex-col">
                  {/* Subtítulo inline no modo desktop */}
                  {spec.orientation === 'vertical' && formattedSubtitle && (
                    <div
                      className="flex flex-col gap-1.5 mb-[0.6em]"
                      style={{ fontSize: `${fontSize * 0.1}px` }}
                    >
                      <span 
                        className="tracking-[0.35em] font-sans opacity-60 uppercase"
                        style={{ color: baseColor, fontSize: 'inherit' }}
                      >
                        {formattedSubtitle}
                      </span>
                      <div className="w-[20%] h-px bg-current opacity-40" style={{ color: baseColor }} />
                    </div>
                  )}
                  <TitleComposition
                    line1={line1}
                    line2={line2}
                    fontSize={fontSize}
                    color={baseColor}
                    fontFamily={sessionFont}
                    fontWeight={titleWeight}
                  />
                </div>
              </div>
            </div>

            {/* Camada de Sobreposição (Lado da Foto) */}
            <div
              className="absolute inset-0 z-30 pointer-events-none"
              style={{ clipPath: clipPhoto }}
            >
              <div className="absolute" style={titleBoxStyle}>
                <div className="flex flex-col">
                  {/* Subtítulo inline no modo desktop */}
                  {spec.orientation === 'vertical' && formattedSubtitle && (
                    <div
                      className="flex flex-col gap-1.5 mb-[0.6em]"
                      style={{ fontSize: `${fontSize * 0.1}px` }}
                    >
                      <span 
                        className="tracking-[0.35em] font-sans opacity-60 uppercase"
                        style={{ color: overlayColor, fontSize: 'inherit' }}
                      >
                        {formattedSubtitle}
                      </span>
                      <div className="w-[20%] h-px bg-current opacity-40" style={{ color: overlayColor }} />
                    </div>
                  )}
                  <TitleComposition
                    line1={line1}
                    line2={line2}
                    fontSize={fontSize}
                    color={overlayColor}
                    fontFamily={sessionFont}
                    fontWeight={titleWeight}
                  />
                </div>
              </div>
            </div>
          </>
        )
      )}

      {/* 4. DETAILS LAYER (DATE & CTA) */}
      {size.width > 0 && (
        <div className="absolute inset-0 z-40 pointer-events-none select-none">
          {/* Date */}
          <div
            className="absolute"
            style={{ 
              left: `${spec.date.x}px`, 
              top: `${spec.date.y}px`,
              transform: 'translateY(-50%)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingLeft: 'env(safe-area-inset-left)'
            }}
          >
            <span 
              className={`text-[10px] sm:text-xs tracking-[0.25em] font-sans uppercase font-medium ${
                spec.orientation === 'vertical'
                  ? 'opacity-65'
                  : 'text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'
              }`}
              style={spec.orientation === 'vertical' ? { color: baseColor } : undefined}
            >
              {formattedDate}
            </span>
          </div>

          {/* CTA Button */}
          <div
            className="absolute pointer-events-auto"
            style={{ 
              left: `${spec.cta.x}px`, 
              top: `${spec.cta.y}px`,
              transform: 'translate(-100%, -50%)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingRight: 'env(safe-area-inset-right)'
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleScroll();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleScroll();
              }}
              className="group flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/45 hover:bg-black/70 active:scale-95 backdrop-blur-md border border-white/20 text-white text-[10px] sm:text-[11px] tracking-[0.22em] font-sans uppercase transition-all duration-300 shadow-md cursor-pointer"
            >
              <span>{ctaLabel || 'Ver Galeria'}</span>
              <span className="transition-transform group-hover:translate-x-0.5 text-[9px] sm:text-[10px]">→</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}